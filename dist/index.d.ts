declare function recordRender(componentName: string, source: "jsx" | "component"): void;

declare function enableReactPulse(options: {
    React: any;
}): void;

export { enableReactPulse, recordRender };
