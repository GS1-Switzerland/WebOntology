let cachedHtml = null;
let cachedAt = 0;
const TTL_MS = 5 * 60_000;

/**
 * Fetches the built SPA shell (index.html) from the same Static Web App
 * origin the request came in on, and caches it for a few minutes on the
 * warm Function instance. This lets /resolve return a normal 200 text/html
 * response — with the browser's address bar left on the original resolver
 * URL — instead of round-tripping through a second redirect.
 */
async function fetchAppShell(host) {
  const now = Date.now();
  if (cachedHtml && now - cachedAt < TTL_MS) return cachedHtml;

  const res = await fetch(`https://${host}/index.html`);
  if (!res.ok) {
    throw new Error(`could not load app shell: ${res.status}`);
  }
  const html = await res.text();
  cachedHtml = html;
  cachedAt = now;
  return html;
}

module.exports = { fetchAppShell };
