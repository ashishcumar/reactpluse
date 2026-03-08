import {
  recordRender
} from "./chunk-YZXHJNYM.mjs";

// src/jsx-dev-runtime.ts
import { jsxDEV as realJsxDEV, jsx as realJsx, Fragment } from "react/jsx-dev-runtime";
function getComponentName(type) {
  if (typeof type === "function") {
    return type.displayName || type.name || "Anonymous";
  }
  if (typeof type === "object" && type !== null) {
    return type.displayName || type.render?.name || "Anonymous";
  }
  return "";
}
function jsxDEV(type, props, key, isStaticChildren, source, self) {
  const name = getComponentName(type);
  if (name) {
    recordRender(name, "jsx");
  }
  return realJsxDEV(type, props, key, isStaticChildren, source, self);
}
function jsx(type, props, key) {
  const name = getComponentName(type);
  if (name) {
    recordRender(name, "jsx");
  }
  return realJsx(type, props, key);
}
export {
  Fragment,
  jsx,
  jsxDEV
};
//# sourceMappingURL=jsx-dev-runtime.mjs.map