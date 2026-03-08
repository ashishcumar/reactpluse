import { recordRender, setOnLoopDetected } from "./registry";
import { patchCreateElement } from "./patchCreateElement";
import { openDebugPanel } from "./debugPanel";

export { recordRender };

let isEnabled = false;

export function enableReactPulse(options: { React: any }): void {
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") {
    return;
  }

  if (isEnabled) return;

  console.log("[ReactPulse] Initializing…");

  setOnLoopDetected((componentName, count, stack) => {
    console.warn(
      "ReactPulse: possible infinite render —",
      componentName,
      "(" + count + " renders)"
    );

    openDebugPanel(componentName, count);

    if (stack) {
      console.warn("[ReactPulse] stack:", stack);
    }
  });

  patchCreateElement(options.React, recordRender);

  console.log(
    '[ReactPulse] createElement patched. For JSX coverage, set "jsxImportSource": "reactpulse" in tsconfig.'
  );

  isEnabled = true;

  console.log("[ReactPulse] Enabled. Monitoring for excessive re-renders.");
}