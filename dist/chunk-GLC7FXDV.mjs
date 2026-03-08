// src/registry.ts
var GLOBAL_KEY = "__REACTPULSE_REGISTRY__";
function getRegistry() {
  const g = globalThis;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = {
      reportedComponents: /* @__PURE__ */ new Set(),
      onLoopDetected: null
    };
  }
  return g[GLOBAL_KEY];
}
function setOnLoopDetected(cb) {
  getRegistry().onLoopDetected = cb;
}
var renderCounts = /* @__PURE__ */ new Map();
var scheduledReset = false;
function recordRender(componentName, source) {
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
    let stack;
    let realComponent = componentName;
    try {
      const err = new Error();
      stack = err.stack;
      if (stack) {
        const lines = stack.split("\n");
        for (const line of lines) {
          const match = line.match(/at\s+([A-Z][A-Za-z0-9_]+)/);
          if (match && ![
            "recordRender",
            "jsx",
            "jsxDEV",
            "renderWithHooks",
            "updateFunctionComponent",
            "beginWork"
          ].includes(match[1])) {
            realComponent = match[1];
            break;
          }
        }
      }
    } catch {
    }
    console.warn("[ReactPulse] Infinite render detected:", realComponent);
    reg.onLoopDetected?.(realComponent, count, stack);
  }
}

export {
  setOnLoopDetected,
  recordRender
};
//# sourceMappingURL=chunk-GLC7FXDV.mjs.map