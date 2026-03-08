import { recordRender, setOnLoopDetected } from "./registry";
import { patchCreateElement } from "./patchCreateElement";
import { patchHooks, areHooksPatched } from "./patchHooks";
import { openDebugPanel } from "./debugPanel";

export { recordRender };

let isEnabled = false;

export function enableReactPulse(options: { React: any }): void {
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") {
    return;
  }

  if (isEnabled) return;

  console.log("[ReactPulse] Initializing…");

  setOnLoopDetected((componentName, count, stack, componentPath, allCounts, relationships, stateUpdates) => {
    console.warn(
      "ReactPulse: possible infinite render —",
      componentName,
      "(" + count + " renders)"
    );

    openDebugPanel(componentName, count, stack, componentPath, allCounts, relationships, stateUpdates);

    if (stack) {
      console.warn("[ReactPulse] stack:", stack);
    }
  });

  // First patch createElement to track renders and set current component
  patchCreateElement(options.React, recordRender);
  
  // Then patch hooks to track state updates
  try {
    patchHooks(options.React);
    if (areHooksPatched()) {
      console.log("[ReactPulse] ✅ State update tracking enabled");
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