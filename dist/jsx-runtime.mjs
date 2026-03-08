import {
  recordRender
} from "./chunk-GLC7FXDV.mjs";

// src/jsx-runtime.ts
import { jsx as realJsx, Fragment } from "react/jsx-runtime";
function getComponentName(type) {
  if (typeof type === "function") {
    return type.displayName || type.name || "Anonymous";
  }
  if (typeof type === "object" && type !== null) {
    return type.displayName || type.render?.name || "Anonymous";
  }
  return "";
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
  jsx
};
//# sourceMappingURL=jsx-runtime.mjs.map