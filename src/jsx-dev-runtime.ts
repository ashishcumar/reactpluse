import { recordRender } from "./registry";
import {
  jsxDEV as realJsxDEV,
  jsx as realJsx,
  Fragment,
} from "react/jsx-dev-runtime";

function getComponentName(type: any): string {
  if (typeof type === "function") {
    const name = type.displayName || type.name;
    if (!name || name === "Anonymous") return "";
    return name;
  }

  if (typeof type === "object" && type !== null) {
    const name = type.displayName || type.name;
    if (!name || name === "Anonymous") return "";
    return name;
  }

  return "";
}

export function jsxDEV(
  type: any,
  props: any,
  key: any,
  isStaticChildren: boolean,
  source?: any,
  self?: any,
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
