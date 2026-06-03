const SHELL_HTML = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { overflow: hidden; }
    </style>
  </head>
  <body>
    <script src="/__webppt/ppt-wrapper.iife.js"></script>
    <script>
      let state = "init"; // "init" | "connected" | "disconnected"
      const es = new EventSource("/__sse");
      es.onopen = () => {
        if (state === "disconnected") location.reload();
        state = "connected";
      };
      es.onerror = () => {
        if (state === "connected") state = "disconnected";
      };
      es.onmessage = () => location.reload();
    </script>
  </body>
</html>`;

export function getShellHtml(): string {
  return SHELL_HTML;
}
