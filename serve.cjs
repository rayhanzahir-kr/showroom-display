// Lokaler Vorschau-Server mit Unterstützung für Video-Bereichsanfragen.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = __dirname;
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};
const server = http.createServer((request, response) => {
  if (!["GET", "HEAD"].includes(request.method)) {
    response.writeHead(405, { Allow: "GET, HEAD" });
    return response.end();
  }
  let file;
  try {
    const pathname = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
    file = path.resolve(
      root,
      "." + (pathname === "/" ? "/index.html" : pathname),
    );
    const relative = path.relative(root, file);
    if (
      relative.startsWith("..") ||
      path.isAbsolute(relative) ||
      relative.split(path.sep).some((part) => part.startsWith("."))
    )
      throw Error();
  } catch {
    response.writeHead(400);
    return response.end("Ungültiger Dateipfad.");
  }
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) {
      response.writeHead(404);
      return response.end("Datei nicht gefunden.");
    }
    let start = 0,
      end = stat.size - 1,
      status = 200;
    const headers = {
      "Content-Type": mime[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
      "Accept-Ranges": "bytes",
    };
    if (request.headers.range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
      if (match && (match[1] || match[2])) {
        start = match[1]
          ? Number(match[1])
          : Math.max(0, stat.size - Number(match[2]));
        end = match[1] && match[2] ? Math.min(Number(match[2]), end) : end;
      } else start = -1;
      if (
        !Number.isSafeInteger(start) ||
        start < 0 ||
        start > end ||
        end >= stat.size
      ) {
        response.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
        return response.end();
      }
      status = 206;
      headers["Content-Range"] = `bytes ${start}-${end}/${stat.size}`;
    }
    headers["Content-Length"] = stat.size ? end - start + 1 : 0;
    response.writeHead(status, headers);
    if (request.method === "HEAD" || !stat.size) return response.end();
    const stream = fs.createReadStream(file, { start, end });
    stream.on("error", () => response.destroy());
    response.on("close", () => stream.destroy());
    stream.pipe(response);
  });
});
server.on("error", (error) => {
  console.error(`Vorschau konnte nicht gestartet werden: ${error.message}`);
  process.exitCode = 1;
});
server.listen(8000, "127.0.0.1", () =>
  console.log("Vorschau: http://localhost:8000 — Beenden mit Strg+C"),
);
