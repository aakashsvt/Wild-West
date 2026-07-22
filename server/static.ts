import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "../dist/public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(
    express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (/-[\w-]{8}\.(js|css)$/.test(filePath)) {
          // Vite content-hashes these filenames, so the content behind a
          // given URL never changes — safe to cache forever.
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else if (/\/models\//.test(filePath)) {
          // Not content-hashed, so cap the cache lifetime in case a model
          // gets swapped out under the same filename.
          res.setHeader("Cache-Control", "public, max-age=604800");
        }
      },
    }),
  );

  // fall through to index.html if the file doesn't exist
  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
