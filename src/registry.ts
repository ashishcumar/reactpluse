const GLOBAL_KEY = "__REACTPULSE_REGISTRY__" as const;

export type LoopDetectedCallback = (
  componentName: string,
  count: number,
  stack?: string,
  componentPath?: string[],
  allCounts?: Record<string, number>,
  relationships?: Record<string, string[]>,
  stateUpdateCounts?: Record<string, number>
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
  stateUpdateOrigins: Map<string, number>; // Track who called setState
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

// Track render counts per batch
let renderCounts = new Map<string, number>();
let renderSequences: string[][] = [];
let currentSequence: string[] = [];
let parentChildRelations = new Map<string, Set<string>>();
let scheduledReset = false;

// Track which component last called setState
let lastStateUpdateComponent: string | null = null;

// Function to be called from patched setState
export function recordStateUpdate(componentName: string): void {
  const reg = getRegistry();
  const count = reg.stateUpdateOrigins.get(componentName) || 0;
  reg.stateUpdateOrigins.set(componentName, count + 1);
  lastStateUpdateComponent = componentName;
  
  // Debug logging for state updates
  if (count + 1 === 1) {
    console.debug(`[ReactPulse] 🔄 First state update from: ${componentName}`);
  } else if ((count + 1) % 5 === 0) {
    console.debug(`[ReactPulse] 🔄 State update #${count + 1} from: ${componentName}`);
  }
}

export function recordRender(
  componentName: string,
  source: "jsx" | "component"
): void {
  const reg = getRegistry();
  
  // Track what caused this render (if it was from a state update)
  const causedBy = lastStateUpdateComponent;
  
  // Track render sequence
  currentSequence.push(componentName);
  
  // Track the render path for this specific render
  reg.renderPath.push(componentName);
  
  // Record parent-child relationship for this render cycle
  if (reg.renderPath.length > 1) {
    const parent = reg.renderPath[reg.renderPath.length - 2];
    if (!parentChildRelations.has(parent)) {
      parentChildRelations.set(parent, new Set());
    }
    parentChildRelations.get(parent)!.add(componentName);
  }

  // Store in history with timestamp and cause
  reg.renderHistory.push({
    timestamp: Date.now(),
    component: componentName,
    path: [...reg.renderPath],
    causedByStateUpdate: causedBy || undefined
  });

  // Keep history manageable (last 50 renders for more focused analysis)
  if (reg.renderHistory.length > 50) {
    reg.renderHistory.shift();
  }

  if (reg.reportedComponents.has(componentName)) {
    reg.renderPath.pop();
    return;
  }

  // Increment render count
  const count = (renderCounts.get(componentName) ?? 0) + 1;
  renderCounts.set(componentName, count);

  // Schedule reset at the end of the event loop
  if (!scheduledReset) {
    scheduledReset = true;
    
    queueMicrotask(() => {
      // Save the current sequence
      if (currentSequence.length > 0) {
        renderSequences.push([...currentSequence]);
        currentSequence = [];
      }
      
      // Keep last 5 sequences for analysis
      if (renderSequences.length > 5) {
        renderSequences.shift();
      }
      
      // Clear for next batch (but keep state update counts)
      renderCounts.clear();
      parentChildRelations.clear();
      scheduledReset = false;
    });
  }

  // SMARTER DETECTION: Look for the real culprit
  if (count >= 5 && !reg.reportedComponents.has(componentName)) {
    reg.reportedComponents.add(componentName);
    
    // Get all data for analysis
    const allCounts: Record<string, number> = Object.fromEntries(renderCounts);
    const stateUpdates: Record<string, number> = Object.fromEntries(reg.stateUpdateOrigins);
    const recentHistory: RegistryState["renderHistory"] = reg.renderHistory.slice(-20);
    
    console.warn(`[ReactPulse] ⚠️ High render count detected in ${componentName}: ${count}`);
    console.warn("[ReactPulse] 🔍 Analyzing to find real culprit...");
    
    // Log state updates for debugging
    console.warn("[ReactPulse] 🔄 State updates tracked:", stateUpdates);
    
    // STRATEGY 1: Find component with most state updates (PRIMARY CULPRIT)
    let topStateUpdater = '';
    let maxStateUpdates = 0;
    for (const [comp, updates] of reg.stateUpdateOrigins.entries()) {
      if (updates > maxStateUpdates) {
        maxStateUpdates = updates;
        topStateUpdater = comp;
      }
    }
    
    // STRATEGY 2: Find component with high state updates but low renders (suspicious ratio)
    let suspiciousComponent = '';
    let highestSuspicionRatio = 0;
    
    for (const [comp, updates] of reg.stateUpdateOrigins.entries()) {
      const renders = renderCounts.get(comp) || 1; // Avoid division by zero
      const ratio = updates / renders;
      
      // If a component has many state updates but few renders, it's VERY suspicious
      if (updates >= 3 && ratio > 1.5) {
        if (ratio > highestSuspicionRatio) {
          highestSuspicionRatio = ratio;
          suspiciousComponent = comp;
        }
      }
    }
    
    // STRATEGY 3: Find component that appears most in render paths (cascade starter)
    const pathAppearances: Record<string, number> = {};
    recentHistory.forEach(render => {
      if (render.causedByStateUpdate) {
        pathAppearances[render.causedByStateUpdate] = (pathAppearances[render.causedByStateUpdate] || 0) + 1;
      }
    });
    
    let topCascadeStarter = '';
    let maxAppearances = 0;
    for (const [comp, apps] of Object.entries(pathAppearances)) {
      if (apps > maxAppearances) {
        maxAppearances = apps;
        topCascadeStarter = comp;
      }
    }
    
    // STRATEGY 4: Look for "Broken" by name pattern
    const brokenNamedComponents = Array.from(reg.stateUpdateOrigins.keys()).filter(
      name => name.toLowerCase().includes('broken') || name === 'Broken'
    );

    // Build component path for culprit logic (before we might change it)
    const componentPath = [...reg.renderPath];
    const pathSet = new Set(componentPath);

    // Priority 0: When we have no state-update data, the real trigger (e.g. setState during render)
    // is often batched so it shows fewer renders; parents re-render more. Prefer the component
    // with the LOWEST render count (min 2 to avoid noise). Tie-break: in current path, then name "Broken".
    let globalMinCount = Infinity;
    for (const c of renderCounts.values()) {
      if (c >= 2 && c < globalMinCount) globalMinCount = c;
    }
    let globalMinComponent: string | null = null;
    for (const [name, c] of renderCounts) {
      if (c !== globalMinCount) continue;
      if (!globalMinComponent) {
        globalMinComponent = name;
        continue;
      }
      const inPath = pathSet.has(name);
      const otherInPath = pathSet.has(globalMinComponent);
      if ((inPath && !otherInPath) || (inPath === otherInPath && /broken/i.test(name))) {
        globalMinComponent = name;
      }
    }

    // Determine the real culprit with priority order
    let culprit = componentName; // Default to the high count component
    let reason = "High render count (no state updates detected)";

    if (globalMinComponent && globalMinCount < count) {
      culprit = globalMinComponent;
      reason = `🌿 Likely source (lowest count, React batches): ${globalMinCount} renders — parents show more.`;
    }
    // Priority 1: Suspicious component (high state updates, low renders)
    else if (suspiciousComponent) {
      culprit = suspiciousComponent;
      const updates = reg.stateUpdateOrigins.get(suspiciousComponent) || 0;
      const renders = renderCounts.get(suspiciousComponent) || 1;
      reason = `⚡ COMPONENT CAUSING LOOP: ${updates} state updates but only ${renders} renders (ratio: ${highestSuspicionRatio.toFixed(1)})`;
    }
    // Priority 2: Broken by name
    else if (brokenNamedComponents.length > 0) {
      culprit = brokenNamedComponents[0];
      const updates = reg.stateUpdateOrigins.get(culprit) || 0;
      reason = `🔨 BROKEN COMPONENT DETECTED: ${updates} state updates causing parent re-renders`;
    }
    // Priority 3: Top state updater
    else if (topStateUpdater && maxStateUpdates >= 3) {
      culprit = topStateUpdater;
      reason = `🔄 Component called setState ${maxStateUpdates} times (most of any component)`;
    }
    // Priority 4: Cascade starter
    else if (topCascadeStarter && maxAppearances >= 3) {
      culprit = topCascadeStarter;
      reason = `📈 Component started ${maxAppearances} render cascades`;
    }

    // Build relationships
    const relationships: Record<string, string[]> = {};
    for (const [parent, children] of parentChildRelations) {
      relationships[parent] = Array.from(children);
    }
    
    // Calculate suspicion ratios for all components
    const suspicionRatios: Record<string, string> = {};
    for (const [comp, updates] of reg.stateUpdateOrigins.entries()) {
      const renders = renderCounts.get(comp) || 1;
      suspicionRatios[comp] = (updates / renders).toFixed(2);
    }
    
    console.warn("[ReactPulse] 🎯 REAL CULPRIT IDENTIFIED:", culprit);
    console.warn("[ReactPulse] 🔍 Reason:", reason);
    console.warn("[ReactPulse] 📊 Render counts:", allCounts);
    console.warn("[ReactPulse] 🔄 State updates:", stateUpdates);
    console.warn("[ReactPulse] 📈 Suspicion ratio (updates/renders):", suspicionRatios);
    
    // Generate stack
    let stack: string | undefined;
    try {
      throw new Error(`Infinite loop caused by ${culprit}`);
    } catch (e: any) {
      stack = e.stack;
    }
    
    reg.onLoopDetected?.(culprit, count, stack, componentPath, allCounts, relationships, stateUpdates);
  }
  
  // Pop the render path
  reg.renderPath.pop();
  
  // Reset lastStateUpdateComponent after render is complete
  // This ensures we don't incorrectly attribute subsequent renders
  queueMicrotask(() => {
    lastStateUpdateComponent = null;
  });
}

// Helper function to get current state update counts (useful for debugging)
export function getStateUpdateCounts(): Record<string, number> {
  return Object.fromEntries(getRegistry().stateUpdateOrigins);
}

// Helper function to reset state update counts
export function resetStateUpdateCounts(): void {
  getRegistry().stateUpdateOrigins.clear();
}

// Helper function to check if a component is likely causing infinite renders
export function isComponentSuspicious(componentName: string): boolean {
  const reg = getRegistry();
  const updates = reg.stateUpdateOrigins.get(componentName) || 0;
  const renders = renderCounts.get(componentName) || 1;
  const ratio = updates / renders;
  
  return updates >= 3 && ratio > 1.5;
}