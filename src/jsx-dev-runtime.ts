import { recordRender } from "./registry";
import { jsxDEV as realJsxDEV, jsx as realJsx, Fragment } from "react/jsx-dev-runtime";

function getComponentName(type: any): string {
  if (typeof type === "function") {
    return type.displayName || type.name || "Anonymous";
  }

  if (typeof type === "object" && type !== null) {
    return type.displayName || type.render?.name || "Anonymous";
  }

  return "";
}

export function jsxDEV(
  type: any,
  props: any,
  key: any,
  isStaticChildren: boolean,
  source?: any,
  self?: any
) {
  const name = getComponentName(type);

  if (name) {
    recordRender(name, "jsx");
  }

  return realJsxDEV(type, props, key, isStaticChildren, source, self);
}

export function jsx(type: any, props: any, key?: any) {
  const name = getComponentName(type);

  if (name) {
    recordRender(name, "jsx");
  }

  return realJsx(type, props, key);
}

export { Fragment };