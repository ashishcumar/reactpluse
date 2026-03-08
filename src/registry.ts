const GLOBAL_KEY = "__REACTPULSE_REGISTRY__" as const;

export type LoopDetectedCallback = (
  componentName: string,
  count: number,
  stack?: string
) => void;

type RegistryState = {
  reportedComponents: Set<string>;
  onLoopDetected: LoopDetectedCallback | null;
};

function getRegistry(): RegistryState {
  const g = globalThis as any;

  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = {
      reportedComponents: new Set(),
      onLoopDetected: null,
    };
  }

  return g[GLOBAL_KEY];
}

export function setOnLoopDetected(cb: LoopDetectedCallback): void {
  getRegistry().onLoopDetected = cb;
}

let renderCounts = new Map<string, number>();
let scheduledReset = false;

export function recordRender(
  componentName: string,
  source: "jsx" | "component"
): void {
  const reg = getRegistry();

  if (reg.reportedComponents.has(componentName)) return;

  const count = (renderCounts.get(componentName) ?? 0) + 1;
  renderCounts.set(componentName, count);

  if (!scheduledReset) {
    scheduledReset = true;

    queueMicrotask(() => {
      renderCounts.clear();
      scheduledReset = false;
    });
  }

  if (count >= 5) {
    reg.reportedComponents.add(componentName);
  
    let stack: string | undefined;
    let realComponent = componentName;
  
    try {
      const err = new Error();
      stack = err.stack;
  
      if (stack) {
        const lines = stack.split("\n");
  
        for (const line of lines) {
          const match = line.match(/at\s+([A-Z][A-Za-z0-9_]+)/);
  
          if (
            match &&
            ![
              "recordRender",
              "jsx",
              "jsxDEV",
              "renderWithHooks",
              "updateFunctionComponent",
              "beginWork",
            ].includes(match[1])
          ) {
            realComponent = match[1];
            break;
          }
        }
      }
    } catch {}
  
    console.warn("[ReactPulse] Infinite render detected:", realComponent);
  
    reg.onLoopDetected?.(realComponent, count, stack);
  }
}