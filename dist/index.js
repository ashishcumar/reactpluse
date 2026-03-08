"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }


var _chunkRVAZQOH7js = require('./chunk-RVAZQOH7.js');

// src/patchCreateElement.ts
var wrappedComponents = /* @__PURE__ */ new WeakMap();
function patchCreateElement(React, recordRender2) {
  const originalCreateElement = React.createElement.bind(React);
  React.createElement = function(type, ...args) {
    if (typeof type === "function") {
      if (!wrappedComponents.has(type)) {
        const Original = type;
        const componentName = Original.displayName || Original.name || "Anonymous";
        const wrapped = function(props, ...rest) {
          recordRender2(componentName, "component");
          return Original.apply(this, [props, ...rest]);
        };
        wrapped.displayName = componentName;
        wrappedComponents.set(type, wrapped);
      }
      type = wrappedComponents.get(type);
    }
    return originalCreateElement.call(React, type, ...args);
  };
}

// src/debugPanel.ts
function openDebugPanel(componentName, renderCount) {
  const win = window.open("", "_blank");
  if (!win) {
    console.warn("ReactPulse: Could not open debug panel (popup blocked?)", componentName, renderCount);
    return;
  }
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <title>ReactPulse \u2013 Infinite render detected</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 2rem; max-width: 560px; line-height: 1.5; }
      h1 { color: #c00; font-size: 1.25rem; margin-bottom: 0.5rem; }
      .meta { color: #666; margin-bottom: 1.5rem; }
      .name { font-weight: 600; }
      ul { margin: 0; padding-left: 1.25rem; }
      li { margin-bottom: 0.5rem; }
    </style>
  </head>
  <body>
    <h1>ReactPulse \u2013 possible infinite render</h1>
    <p class="meta">
      Component: <span class="name">${escapeHtml(componentName)}</span><br>
      Renders in window: <strong>${renderCount}</strong>
    </p>
    <p><strong>Possible causes:</strong></p>
    <ul>
      <li>State updated during render (e.g. setState in the component body)</li>
      <li>useEffect dependency that changes every render (e.g. object/array created inline)</li>
      <li>Unstable props or context from parent</li>
    </ul>
  </body>
  </html>`;
  win.document.write(html);
  win.document.close();
}
function escapeHtml(text) {
  const el = document.createElement("div");
  el.textContent = text;
  return el.innerHTML;
}

// src/index.ts
var isEnabled = false;
function enableReactPulse(options) {
  if (typeof process !== "undefined" && _optionalChain([process, 'access', _ => _.env, 'optionalAccess', _2 => _2.NODE_ENV]) === "production") {
    return;
  }
  if (isEnabled) return;
  console.log("[ReactPulse] Initializing\u2026");
  _chunkRVAZQOH7js.setOnLoopDetected.call(void 0, (componentName, count, stack) => {
    console.warn(
      "ReactPulse: possible infinite render \u2014",
      componentName,
      "(" + count + " renders)"
    );
    openDebugPanel(componentName, count);
    if (stack) {
      console.warn("[ReactPulse] stack:", stack);
    }
  });
  patchCreateElement(options.React, _chunkRVAZQOH7js.recordRender);
  console.log(
    '[ReactPulse] createElement patched. For JSX coverage, set "jsxImportSource": "reactpulse" in tsconfig.'
  );
  isEnabled = true;
  console.log("[ReactPulse] Enabled. Monitoring for excessive re-renders.");
}



exports.enableReactPulse = enableReactPulse; exports.recordRender = _chunkRVAZQOH7js.recordRender;
//# sourceMappingURL=index.js.map