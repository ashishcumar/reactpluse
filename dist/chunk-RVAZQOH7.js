"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }// src/registry.ts
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
  const count = (_nullishCoalesce(renderCounts.get(componentName), () => ( 0))) + 1;
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
    } catch (e) {
    }
    console.warn("[ReactPulse] Infinite render detected:", realComponent);
    _optionalChain([reg, 'access', _ => _.onLoopDetected, 'optionalCall', _2 => _2(realComponent, count, stack)]);
  }
}




exports.setOnLoopDetected = setOnLoopDetected; exports.recordRender = recordRender;
//# sourceMappingURL=chunk-RVAZQOH7.js.map