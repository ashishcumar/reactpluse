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

        const wrapped = function (props: any, ...rest: any[]) {
          recordRender(componentName, "component");
          return Original.apply(this, [props, ...rest]);
        };

        wrapped.displayName = componentName;

        wrappedComponents.set(type, wrapped);
      }

      type = wrappedComponents.get(type)!;
    }

    return originalCreateElement.call(React, type, ...args);
  };
}