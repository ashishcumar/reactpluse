/**
 * Patches the automatic JSX runtime (jsx / jsxDEV) so we can count
 * function component renders. Without this, apps using "jsx": "react-jsx"
 * never go through createElement, so we'd never see the loop.
 */
export function patchJsxRuntime(
  jsxRuntime: { jsx?: Function; jsxDEV?: Function },
  recordRender: (componentName: string) => void,
): void {
  function getComponentName(type: any): string {
    if (typeof type !== "function") return "";
    return (type.displayName || type.name || "Unknown") as string;
  }

  if (typeof jsxRuntime.jsx === "function") {
    const originalJsx = jsxRuntime.jsx.bind(jsxRuntime);
    jsxRuntime.jsx = function (type: any, props: any, key?: any) {
      const name = getComponentName(type);
      if (name) recordRender(name);
      return originalJsx(type, props, key);
    };
  }

  if (typeof jsxRuntime.jsxDEV === "function") {
    const originalJsxDEV = jsxRuntime.jsxDEV.bind(jsxRuntime);
    jsxRuntime.jsxDEV = function (
      type: any,
      props: any,
      key: any,
      isStaticChildren: boolean,
      source?: any,
      self?: any,
    ) {
      const name = getComponentName(type);
      if (name) recordRender(name);
      return originalJsxDEV(type, props, key, isStaticChildren, source, self);
    };
  }
}
