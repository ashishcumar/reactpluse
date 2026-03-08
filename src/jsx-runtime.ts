import { recordRender } from "./registry";
import { jsx as realJsx, Fragment } from "react/jsx-runtime";

function getComponentName(type: any): string {
  if (typeof type === "function") {
    return type.displayName || type.name || "Anonymous";
  }

  if (typeof type === "object" && type !== null) {
    return type.displayName || type.render?.name || "Anonymous";
  }

  return "";
}

export function jsx(type: any, props: any, key?: any) {
  const name = getComponentName(type);

  if (name) {
    recordRender(name, "jsx");
  }

  return realJsx(type, props, key);
}

export { Fragment };