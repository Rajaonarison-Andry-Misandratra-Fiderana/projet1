const http = require("http");
const fs = require("fs");
const path = require("path");

const port = Number(process.env.PORT || 3000);
const distDir = path.join(__dirname, "dist", "shopping-mall", "browser");
const indexPath = path.join(distDir, "index.html");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

const sendFile = (filePath, res) => {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[extension] || "application/octet-stream";

  fs.readFile(filePath, (error, fileBuffer) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    res.writeHead(200, { "Content-Type": contentType });
    res.end(fileBuffer);
  });
};

const sendIndex = (res) => {
  fs.readFile(indexPath, "utf8", (error, html) => {
    if (error) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("index.html not found. Run npm run build before npm start.");
      return;
    }

    const apiBaseUrl = process.env.API_BASE_URL || "";
    const renderedHtml = html.replace("__API_BASE_URL__", apiBaseUrl);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderedHtml);
  });
};

const server = http.createServer((req, res) => {
  const requestPath = (req.url || "/").split("?")[0];
  const normalizedPath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
  const safePath = normalizedPath.replace(/^[/\\]+/, "");
  const resolvedPath = path.join(distDir, safePath);

  if (
    safePath !== "" &&
    fs.existsSync(resolvedPath) &&
    fs.statSync(resolvedPath).isFile()
  ) {
    sendFile(resolvedPath, res);
    return;
  }

  sendIndex(res);
});

server.listen(port, () => {
  console.log(`Frontend server listening on port ${port}`);
});
