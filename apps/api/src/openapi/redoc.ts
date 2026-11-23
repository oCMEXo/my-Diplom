export const REDOC_SCRIPT = "https://cdn.jsdelivr.net/npm/redoc@2.4.0/bundles/redoc.standalone.js";

export function redocPage(specUrl: string) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Collab API reference</title>
<style>body { margin: 0; }</style>
</head>
<body>
<redoc spec-url="${specUrl}" hide-download-button="false" expand-responses="200,201,202"></redoc>
<script src="${REDOC_SCRIPT}"></script>
</body>
</html>
`;
}
