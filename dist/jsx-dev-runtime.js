"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

var _chunkRVAZQOH7js = require('./chunk-RVAZQOH7.js');

// src/jsx-dev-runtime.ts
var _jsxdevruntime = require('react/jsx-dev-runtime');
function getComponentName(type) {
  if (typeof type === "function") {
    return type.displayName || type.name || "Anonymous";
  }
  if (typeof type === "object" && type !== null) {
    return type.displayName || _optionalChain([type, 'access', _ => _.render, 'optionalAccess', _2 => _2.name]) || "Anonymous";
  }
  return "";
}
function jsxDEV(type, props, key, isStaticChildren, source, self) {
  const name = getComponentName(type);
  if (name) {
    _chunkRVAZQOH7js.recordRender.call(void 0, name, "jsx");
  }
  return _jsxdevruntime.jsxDEV.call(void 0, type, props, key, isStaticChildren, source, self);
}
function jsx(type, props, key) {
  const name = getComponentName(type);
  if (name) {
    _chunkRVAZQOH7js.recordRender.call(void 0, name, "jsx");
  }
  return _jsxdevruntime.jsx.call(void 0, type, props, key);
}




exports.Fragment = _jsxdevruntime.Fragment; exports.jsx = jsx; exports.jsxDEV = jsxDEV;
//# sourceMappingURL=jsx-dev-runtime.js.map