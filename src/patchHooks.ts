import { recordStateUpdate } from "./registry";

// Store original React
let React: any = null;
let isPatched = false;

// Track current component being rendered
let currentComponent: string | null = null;

// Export this to be called from patchCreateElement
export function setCurrentComponent(name: string | null): void {
  currentComponent = name;
}

export function patchHooks(react: any): void {
  if (isPatched) return;
  
  React = react;
  
  // Store original hooks
  const originalUseState = React.useState;
  const originalUseReducer = React.useReducer;
  const originalUseEffect = React.useEffect;
  const originalUseMemo = React.useMemo;
  const originalUseCallback = React.useCallback;
  
  // Patch useState
  React.useState = function useStatePatched(initialState: any) {
    // Call original useState
    const result = originalUseState.call(this, initialState);
    
    // If we have a current component, patch the setter
    if (currentComponent) {
      const setter = result[1];
      const wrappedSetter = function(newState: any) {
        // Record that this component is updating state
        recordStateUpdate(currentComponent!);
        // Call original setter
        return setter.call(this, newState);
      };
      
      // Return state with patched setter
      return [result[0], wrappedSetter];
    }
    
    return result;
  };
  
  // Patch useReducer
  React.useReducer = function useReducerPatched(reducer: any, initialArg: any, init?: any) {
    const result = originalUseReducer.call(this, reducer, initialArg, init);
    
    if (currentComponent) {
      const dispatch = result[1];
      const wrappedDispatch = function(action: any) {
        recordStateUpdate(currentComponent!);
        return dispatch.call(this, action);
      };
      
      return [result[0], wrappedDispatch];
    }
    
    return result;
  };
  
  // Keep other hooks as is
  React.useEffect = originalUseEffect;
  React.useMemo = originalUseMemo;
  React.useCallback = originalUseCallback;
  
  isPatched = true;
  console.log("[ReactPulse] ✅ Hooks patched successfully - now tracking state updates");
}

// Helper to check if hooks are patched
export function areHooksPatched(): boolean {
  return isPatched;
}