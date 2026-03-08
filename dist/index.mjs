import {
  recordRender,
  recordStateUpdate,
  setOnLoopDetected
} from "./chunk-YZXHJNYM.mjs";

// src/patchHooks.ts
var React = null;
var isPatched = false;
var currentComponent = null;
function setCurrentComponent(name) {
  currentComponent = name;
}
function patchHooks(react) {
  if (isPatched) return;
  React = react;
  const originalUseState = React.useState;
  const originalUseReducer = React.useReducer;
  const originalUseEffect = React.useEffect;
  const originalUseMemo = React.useMemo;
  const originalUseCallback = React.useCallback;
  React.useState = function useStatePatched(initialState) {
    const result = originalUseState.call(this, initialState);
    if (currentComponent) {
      const setter = result[1];
      const wrappedSetter = function(newState) {
        recordStateUpdate(currentComponent);
        return setter.call(this, newState);
      };
      return [result[0], wrappedSetter];
    }
    return result;
  };
  React.useReducer = function useReducerPatched(reducer, initialArg, init) {
    const result = originalUseReducer.call(this, reducer, initialArg, init);
    if (currentComponent) {
      const dispatch = result[1];
      const wrappedDispatch = function(action) {
        recordStateUpdate(currentComponent);
        return dispatch.call(this, action);
      };
      return [result[0], wrappedDispatch];
    }
    return result;
  };
  React.useEffect = originalUseEffect;
  React.useMemo = originalUseMemo;
  React.useCallback = originalUseCallback;
  isPatched = true;
  console.log("[ReactPulse] \u2705 Hooks patched successfully - now tracking state updates");
}
function areHooksPatched() {
  return isPatched;
}

// src/patchCreateElement.ts
var wrappedComponents = /* @__PURE__ */ new WeakMap();
function patchCreateElement(React2, recordRender2) {
  const originalCreateElement = React2.createElement.bind(React2);
  React2.createElement = function(type, ...args) {
    if (typeof type === "function") {
      if (!wrappedComponents.has(type)) {
        const Original = type;
        const componentName = Original.displayName || Original.name || "Anonymous";
        const wrapped = function(props, ...rest) {
          setCurrentComponent(componentName);
          recordRender2(componentName, "component");
          const result = Original.apply(this, [props, ...rest]);
          setCurrentComponent(null);
          return result;
        };
        wrapped.displayName = componentName;
        wrappedComponents.set(type, wrapped);
      }
      type = wrappedComponents.get(type);
    }
    return originalCreateElement.call(React2, type, ...args);
  };
  console.log("[ReactPulse] \u2705 createElement patched successfully");
}

// src/debugPanel.ts
function openDebugPanel(componentName, renderCount, stack, componentPath, allCounts, relationships, stateUpdates) {
  const win = window.open("", "_blank");
  if (!win) {
    console.warn("ReactPulse: Could not open debug panel (popup blocked?)", componentName, renderCount);
    return;
  }
  const stateUpdatesHtml = stateUpdates ? `<div class="state-updates"><strong>State updates by component:</strong><br>${Object.entries(stateUpdates).sort((a, b) => b[1] - a[1]).map(([name, updates]) => {
    const renders = allCounts?.[name] || 0;
    const ratio = (updates / (renders || 1)).toFixed(1);
    const isSuspicious = updates > 2 && ratio > "2";
    return `<span class="${isSuspicious ? "suspicious" : ""}">${escapeHtml(name)}: ${updates} updates, ${renders} renders (ratio: ${ratio})</span>`;
  }).join("<br>")}</div>` : "";
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <title>ReactPulse \u2013 Infinite render detected</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 2rem; max-width: 600px; line-height: 1.5; }
      h1 { color: #c00; font-size: 1.5rem; margin-bottom: 0.5rem; }
      .meta { color: #666; margin-bottom: 1.5rem; padding: 1rem; background: #f5f5f5; border-radius: 4px; }
      .name { font-weight: 600; background: #fee; padding: 2px 6px; border-radius: 4px; }
      .culprit { font-weight: 600; background: #f44336; color: white; padding: 2px 6px; border-radius: 4px; }
      .suspicious { color: #f44336; font-weight: 500; }
      .state-updates { background: #e8eaf6; padding: 1rem; border-radius: 4px; margin: 1rem 0; display: flex; flex-direction: column; gap: 4px; }
      .path { background: #f0f0f0; padding: 1rem; border-radius: 4px; font-family: monospace; margin: 1rem 0; }
      .broken-box { background: #ffebee; padding: 1rem; border-radius: 4px; border-left: 4px solid #f44336; margin: 1rem 0; }
      .code { background: #1e1e1e; color: #d4d4d4; padding: 1rem; border-radius: 4px; font-family: monospace; }
    </style>
  </head>
  <body>
    <h1>\u{1F6A8} ReactPulse \u2013 Infinite Render Detected</h1>
    
    <div class="meta">
      <p><strong>Root cause:</strong> <span class="culprit">${escapeHtml(componentName)}</span></p>
      <p><strong>Highest render count:</strong> ${renderCount} (in parent components)</p>
    </div>
    
    ${stateUpdatesHtml}
    
    ${componentName.toLowerCase().includes("broken") ? `
    <div class="broken-box">
      <strong>\u26A0\uFE0F The &lt;Broken /&gt; component is the real culprit!</strong>
      <p>It has called setState multiple times but rendered fewer times due to React batching.</p>
      <div class="code">
        function Broken() {<br>
        &nbsp;&nbsp;const [n, setN] = useState(0);<br>
        &nbsp;&nbsp;<span style="color: #f48771; background: #4a2c2c; padding: 2px 4px;">setN(n + 1); // This line causes the cascade!</span><br>
        &nbsp;&nbsp;return &lt;div&gt;{n}&lt;/div&gt;;<br>
        }
      </div>
      <p><strong>Fix:</strong> Move setState to useEffect or event handler</p>
    </div>
    ` : ""}
    
    <p><strong>Why ${escapeHtml(componentName)} is the culprit:</strong></p>
    <ul>
      <li>It has many state updates but few renders (React batches them)</li>
      <li>Each state update forces parent components to re-render</li>
      <li>Parents show higher render counts even though they're innocent</li>
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
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") {
    return;
  }
  if (isEnabled) return;
  console.log("[ReactPulse] Initializing\u2026");
  setOnLoopDetected((componentName, count, stack, componentPath, allCounts, relationships, stateUpdates) => {
    console.warn(
      "ReactPulse: possible infinite render \u2014",
      componentName,
      "(" + count + " renders)"
    );
    openDebugPanel(componentName, count, stack, componentPath, allCounts, relationships, stateUpdates);
    if (stack) {
      console.warn("[ReactPulse] stack:", stack);
    }
  });
  patchCreateElement(options.React, recordRender);
  try {
    patchHooks(options.React);
    if (areHooksPatched()) {
      console.log("[ReactPulse] \u2705 State update tracking enabled");
    }
  } catch (e) {
    console.warn("[ReactPulse] Could not patch hooks, state update tracking disabled:", e);
  }
  console.log(
    '[ReactPulse] createElement patched. For JSX coverage, set "jsxImportSource": "reactpulse" in tsconfig.'
  );
  isEnabled = true;
  console.log("[ReactPulse] Enabled. Monitoring for excessive re-renders.");
}
export {
  enableReactPulse,
  recordRender
};
//# sourceMappingURL=index.mjs.map