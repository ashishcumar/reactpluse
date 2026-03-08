export function openDebugPanel(componentName: string, renderCount: number): void {
    const win = window.open("", "_blank");
    if (!win) {
      console.warn("ReactPulse: Could not open debug panel (popup blocked?)", componentName, renderCount);
      return;
    }
  
    const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <title>ReactPulse – Infinite render detected</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 2rem; max-width: 560px; line-height: 1.5; }
      h1 { color: #c00; font-size: 1.25rem; margin-bottom: 0.5rem; }
      .meta { color: #666; margin-bottom: 1.5rem; }
      .name { font-weight: 600; }
      ul { margin: 0; padding-left: 1.25rem; }
      li { margin-bottom: 0.5rem; }
    </style>
  </head>
  <body>
    <h1>ReactPulse – possible infinite render</h1>
    <p class="meta">
      Component: <span class="name">${escapeHtml(componentName)}</span><br>
      Renders in window: <strong>${renderCount}</strong>
    </p>
    <p><strong>Possible causes:</strong></p>
    <ul>
      <li>State updated during render (e.g. setState in the component body)</li>
      <li>useEffect dependency that changes every render (e.g. object/array created inline)</li>
      <li>Unstable props or context from parent</li>
    </ul>
  </body>
  </html>`;
  
    win.document.write(html);
    win.document.close();
  }
  
  function escapeHtml(text: string): string {
    const el = document.createElement("div");
    el.textContent = text;
    return el.innerHTML;
  }