import { setCurrentComponent } from "./patchHooks";

const wrappedComponents = new WeakMap<Function, Function>();

export function patchCreateElement(
  React: { createElement: typeof import("react").createElement },
  recordRender: (componentName: string, source: "component") => void
): void {
  const originalCreateElement = React.createElement.bind(React);

  React.createElement = function (type: any, ...args: any[]) {
    if (typeof type === "function") {
      if (!wrappedComponents.has(type)) {
        const Original = type;
        const componentName =
          Original.displayName || Original.name || "Anonymous";

        // 👇 REPLACE THIS ENTIRE wrapped FUNCTION
        const wrapped = function (this: any, props: any, ...rest: any[]) {
          // Set current component for hooks
          setCurrentComponent(componentName);
          
          // Record the render
          recordRender(componentName, "component");
          
          // Call the original component
          const result = Original.apply(this, [props, ...rest]);
          
          // Clear synchronously - component has finished rendering
          setCurrentComponent(null);
          
          return result;
        };
        // 👆 REPLACE UP TO HERE

        wrapped.displayName = componentName;

        wrappedComponents.set(type, wrapped);
      }

      type = wrappedComponents.get(type)!;
    }

    return originalCreateElement.call(React, type, ...args);
  };
  
  console.log("[ReactPulse] ✅ createElement patched successfully");
}