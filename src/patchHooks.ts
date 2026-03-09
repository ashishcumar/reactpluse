import { recordStateUpdate } from "./registry";

let React: any = null;
let isPatched = false;
let currentComponent: string | null = null;

export function setCurrentComponent(name: string | null) {
  currentComponent = name;
}

export function patchHooks(react: any) {
  if (isPatched) return;

  React = react;

  const originalUseState = React.useState;
  const originalUseReducer = React.useReducer;

  React.useState = function patchedUseState(initialState: any) {
    const result = originalUseState(initialState);

    if (!currentComponent) return result;

    const componentName = currentComponent;
    const setter = result[1];

    const wrappedSetter = function (value: any) {
      recordStateUpdate(componentName);
      return setter(value);
    };

    return [result[0], wrappedSetter];
  };

  React.useReducer = function patchedUseReducer(
    reducer: any,
    initialArg: any,
    init?: any
  ) {
    const result = originalUseReducer(reducer, initialArg, init);

    if (!currentComponent) return result;

    const componentName = currentComponent;
    const dispatch = result[1];

    const wrappedDispatch = function (action: any) {
      recordStateUpdate(componentName);
      return dispatch(action);
    };

    return [result[0], wrappedDispatch];
  };

  isPatched = true;

  console.log(
    "[ReactPulse] ✅ Hooks patched successfully - now tracking state updates"
  );
}