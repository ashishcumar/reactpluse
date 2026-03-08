import { recordStateUpdate } from "./registry";

let originalDispatcher: any = null;
let isPatched = false;

// Store component names for the current render
let currentComponentName: string | null = null;

// This will be called from patchCreateElement to set the current component
export function setCurrentComponentForDispatcher(name: string | null): void {
  currentComponentName = name;
}

export function patchDispatcher(React: any): void {
  if (isPatched) return;
  
  try {
    // Try to access React internals (this is the standard way for React 16.8+)
    const reactInternals = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
    
    if (!reactInternals) {
      console.warn("[ReactPulse] Could not access React internals to patch dispatcher");
      return;
    }

    // Store the original ReactCurrentDispatcher
    const ReactCurrentDispatcher = reactInternals.ReactCurrentDispatcher;
    
    if (!ReactCurrentDispatcher) {
      console.warn("[ReactPulse] ReactCurrentDispatcher not found");
      return;
    }

    originalDispatcher = ReactCurrentDispatcher.current;

    // Create a new dispatcher that wraps the original
    const createWrappedDispatcher = (dispatcher: any) => {
      return new Proxy(dispatcher, {
        get(target: any, prop: string | symbol) {
          const original = target[prop];
          
          // Only patch state-setting hooks
          if (prop === 'useState') {
            return function useStateProxy(initialState: any) {
              const result = original.call(this, initialState);
              
              // Get the setter
              const setter = result[1];
              
              // If we have a current component name, wrap the setter
              if (typeof setter === 'function' && currentComponentName) {
                const wrappedSetter = function(newState: any) {
                  // Record the state update
                  recordStateUpdate(currentComponentName!);
                  // Call the original setter
                  return setter.call(this, newState);
                };
                
                // Return the state and wrapped setter
                return [result[0], wrappedSetter];
              }
              
              return result;
            };
          }
          
          if (prop === 'useReducer') {
            return function useReducerProxy(reducer: any, initialArg: any, init?: any) {
              const result = original.call(this, reducer, initialArg, init);
              
              // Get the dispatch
              const dispatch = result[1];
              
              // If we have a current component name, wrap the dispatch
              if (typeof dispatch === 'function' && currentComponentName) {
                const wrappedDispatch = function(action: any) {
                  // Record the state update
                  recordStateUpdate(currentComponentName!);
                  // Call the original dispatch
                  return dispatch.call(this, action);
                };
                
                // Return the state and wrapped dispatch
                return [result[0], wrappedDispatch];
              }
              
              return result;
            };
          }
          
          return original;
        }
      });
    };

    // Override the current dispatcher
    Object.defineProperty(ReactCurrentDispatcher, 'current', {
      get: () => {
        const current = originalDispatcher;
        return createWrappedDispatcher(current);
      },
      set: (value) => {
        originalDispatcher = value;
      },
      configurable: true
    });

    isPatched = true;
    console.log("[ReactPulse] ✅ Dispatcher patched successfully - now tracking state updates");
  } catch (error) {
    console.warn("[ReactPulse] Failed to patch dispatcher:", error);
  }
}

// Helper to check if dispatcher is patched
export function isDispatcherPatched(): boolean {
  return isPatched;
}