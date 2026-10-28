import express, { type RequestHandler, type Response } from "express";
import fs from "node:fs";
import path from "node:path";

const isProduction = process.env.NODE_ENV === "production";

// Matches server.origin in vite.config.ts.
const viteDevServer = "http://localhost:5173";
const clientDir = path.join(import.meta.dirname, "../client");

interface ManifestChunk {
  file: string;
  css?: string[];
  imports?: string[];
}

// Vite's build manifest maps each page entry to its content-hashed output.
// In dev there is no build: the page loads straight from the Vite dev server.
const manifest: Record<string, ManifestChunk> = isProduction
  ? JSON.parse(fs.readFileSync(path.join(clientDir, ".vite/manifest.json"), "utf-8"))
  : {};

const cssFor = (key: string): string[] => {
  const chunk = manifest[key];
  return [...(chunk.css ?? []), ...(chunk.imports ?? []).flatMap(cssFor)];
};

const assetTags = (page: string) => {
  const entry = `src/pages/${page}.tsx`;
  if (!isProduction) {
    return `<script type="module" src="${viteDevServer}/@vite/client"></script>
    <script type="module" src="${viteDevServer}/${entry}"></script>`;
  }
  const css = [...new Set(cssFor(entry))].map((file) => `<link rel="stylesheet" href="/${file}">`);
  return [...css, `<script type="module" src="/${manifest[entry].file}"></script>`].join("\n    ");
};

/** Serves the built client in production. In dev, the Vite dev server serves it instead. */
export const serveClient: RequestHandler = isProduction
  ? express.static(clientDir, { index: false })
  : (_req, _res, next) => next();

/**
 * Renders a page from client/src/pages, handing it `props` as window.pageProps.
 * Its scripts can sit in <head>: module scripts are deferred, so they run after pageProps is set.
 */
export const render = (res: Response, page: string, props: object = {}, title = "Arabella") => {
  // Escape "<" so a prop value can't close the script tag.
  const pageProps = JSON.stringify(props).replace(/</g, "\\u003c");
  res.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    ${assetTags(page)}
  </head>
  <body>
    <div id="root"></div>
    <script>window.pageProps = ${pageProps};</script>
  </body>
</html>`);
};
