const GLOBAL_KEY = "__REACTPULSE_REGISTRY__" as const;

export type LoopDetectedCallback = (
  componentName: string,
  count: number,
  stack?: string,
  componentPath?: string[],
  allCounts?: Record<string, number>,
  relationships?: Record<string, string[]>,
  stateUpdateCounts?: Record<string, number>,
) => void;

type RegistryState = {
  reportedComponents: Set<string>;
  onLoopDetected: LoopDetectedCallback | null;
  renderPath: string[];
  renderHistory: Array<{
    timestamp: number;
    component: string;
    path: string[];
    causedByStateUpdate?: string;
  }>;
  stateUpdateOrigins: Map<string, number>;
};

function getRegistry(): RegistryState {
  const g = globalThis as any;

  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = {
      reportedComponents: new Set(),
      onLoopDetected: null,
      renderPath: [],
      renderHistory: [],
      stateUpdateOrigins: new Map(),
    };
  }

  return g[GLOBAL_KEY];
}

export function setOnLoopDetected(cb: LoopDetectedCallback): void {
  getRegistry().onLoopDetected = cb;
}

let renderCounts = new Map<string, number>();
let renderSequences: string[][] = [];
let currentSequence: string[] = [];
let parentChildRelations = new Map<string, Set<string>>();
let scheduledReset = false;

let lastStateUpdateComponent: string | null = null;

export function recordStateUpdate(componentName: string): void {
  const reg = getRegistry();
  const count = reg.stateUpdateOrigins.get(componentName) || 0;

  reg.stateUpdateOrigins.set(componentName, count + 1);
  lastStateUpdateComponent = componentName;

  if (count + 1 === 1) {
    console.debug(`[ReactPulse] 🔄 First state update from: ${componentName}`);
  } else if ((count + 1) % 5 === 0) {
    console.debug(
      `[ReactPulse] 🔄 State update #${count + 1} from: ${componentName}`,
    );
  }
}

function detectLoopRoot(history: Array<{ component: string }>): string | null {
  const counts: Record<string, number> = {};

  for (const entry of history) {
    const name = entry.component;

    if (!name || name === "Anonymous") continue;

    counts[name] = (counts[name] || 0) + 1;
  }

  let root: string | null = null;
  let max = 0;

  for (const [name, count] of Object.entries(counts)) {
    if (count > max && count >= 3) {
      max = count;
      root = name;
    }
  }

  return root;
}

export function recordRender(
  componentName: string,
  source: "jsx" | "component",
): void {
  if (source === "jsx") return;

  const reg = getRegistry();
  const causedBy = lastStateUpdateComponent;

  currentSequence.push(componentName);

  reg.renderPath.push(componentName);

  if (reg.renderPath.length > 1) {
    const parent = reg.renderPath[reg.renderPath.length - 2];

    if (!parentChildRelations.has(parent)) {
      parentChildRelations.set(parent, new Set());
    }

    parentChildRelations.get(parent)!.add(componentName);
  }

  reg.renderHistory.push({
    timestamp: Date.now(),
    component: componentName,
    path: [...reg.renderPath],
    causedByStateUpdate: causedBy || undefined,
  });

  if (reg.renderHistory.length > 50) {
    reg.renderHistory.shift();
  }

  const count = (renderCounts.get(componentName) ?? 0) + 1;
  renderCounts.set(componentName, count);

  if (!scheduledReset) {
    scheduledReset = true;

    queueMicrotask(() => {
      if (currentSequence.length > 0) {
        renderSequences.push([...currentSequence]);
        currentSequence = [];
      }

      if (renderSequences.length > 5) {
        renderSequences.shift();
      }

      renderCounts.clear();
      parentChildRelations.clear();
      scheduledReset = false;
    });
  }

  /**
   * 🚨 EARLY LOOP INTERCEPTION
   * stop before React throws "Too many re-renders"
   */
  if (count >= 25) {
    console.warn("[ReactPulse] 🚨 Infinite render loop detected early");

    setTimeout(() => {
      reg.onLoopDetected?.(
        componentName,
        count,
        undefined,
        [...reg.renderPath],
        Object.fromEntries(renderCounts),
        {},
        Object.fromEntries(reg.stateUpdateOrigins),
      );
    }, 0);

    throw new Error(
      `[ReactPulse] Stopped infinite render loop in ${componentName}`,
    );
  }

  if (reg.reportedComponents.has(componentName)) {
    reg.renderPath.pop();
    return;
  }

  if (count >= 5 && !reg.reportedComponents.has(componentName)) {
    reg.reportedComponents.add(componentName);

    const allCounts: Record<string, number> = Object.fromEntries(renderCounts);
    const stateUpdates: Record<string, number> = Object.fromEntries(
      reg.stateUpdateOrigins,
    );

    const componentPath = [...reg.renderPath];

    let culprit = componentName;
    let reason = "High render count detected";

    /**
     * STRATEGY 1: Most state updates
     */
    let topStateUpdater: string | null = null;
    let maxUpdates = 0;

    for (const [comp, updates] of reg.stateUpdateOrigins.entries()) {
      if (updates > maxUpdates) {
        maxUpdates = updates;
        topStateUpdater = comp;
      }
    }

    if (topStateUpdater && maxUpdates >= 2) {
      culprit = topStateUpdater;
      reason = `⚡ Component triggered ${maxUpdates} state updates`;
    } else {
      /**
       * STRATEGY 2: Deepest component
       */
      const deepestComponent = componentPath[componentPath.length - 1];

      if (deepestComponent) {
        culprit = deepestComponent;
        reason = "🔁 Deepest component in render path likely triggered loop";
      } else {
        /**
         * STRATEGY 3: Lowest render count
         */
        let minCount = Infinity;
        let minComponent: string | null = null;

        for (const [name, c] of renderCounts) {
          if (name === "Anonymous") continue;

          if (c >= 2 && c < minCount) {
            minCount = c;
            minComponent = name;
          }
        }

        if (minComponent && minCount < count) {
          culprit = minComponent;
          reason = `🌿 Likely source (lowest render count): ${minCount}`;
        }
      }
    }

    const relationships: Record<string, string[]> = {};

    for (const [parent, children] of parentChildRelations) {
      relationships[parent] = Array.from(children);
    }

    const suspicionRatios: Record<string, string> = {};

    for (const [comp, updates] of reg.stateUpdateOrigins.entries()) {
      const renders = renderCounts.get(comp) || 1;
      suspicionRatios[comp] = (updates / renders).toFixed(2);
    }

    console.warn("[ReactPulse] 🎯 REAL CULPRIT IDENTIFIED:", culprit);
    console.warn("[ReactPulse] 🔍 Reason:", reason);
    console.warn("[ReactPulse] 📊 Render counts:", allCounts);
    console.warn("[ReactPulse] 🔄 State updates:", stateUpdates);
    console.warn(
      "[ReactPulse] 📈 Suspicion ratio (updates/renders):",
      suspicionRatios,
    );

    let stack: string | undefined;

    try {
      throw new Error(`Infinite loop caused by ${culprit}`);
    } catch (e: any) {
      stack = e.stack;
    }

    reg.onLoopDetected?.(
      culprit,
      count,
      stack,
      componentPath,
      allCounts,
      relationships,
      stateUpdates,
    );
  }

  reg.renderPath.pop();

  queueMicrotask(() => {
    lastStateUpdateComponent = null;
  });
}
export function getStateUpdateCounts(): Record<string, number> {
  return Object.fromEntries(getRegistry().stateUpdateOrigins);
}

export function resetStateUpdateCounts(): void {
  getRegistry().stateUpdateOrigins.clear();
}

export function isComponentSuspicious(componentName: string): boolean {
  const reg = getRegistry();

  const updates = reg.stateUpdateOrigins.get(componentName) || 0;
  const renders = renderCounts.get(componentName) || 1;

  const ratio = updates / renders;

  return updates >= 3 && ratio > 1.5;
}
