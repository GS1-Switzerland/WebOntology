const DEFINITIONS_BASE_URL = (process.env.DEFINITIONS_BASE_URL || "https://gs1-switzerland.github.io/WebOntology").replace(/\/$/, "");
const MANIFEST_PATH = process.env.MANIFEST_PATH || "registry/manifest.jsonld";

// Cache the manifest for a short time in the Function's warm-instance
// memory. GitHub Pages is already CDN-cached, so this is purely to avoid
// an extra round trip on every single resolver hit.
let cached = null;
let cachedAt = 0;
const TTL_MS = 60_000;

async function loadManifest() {
  const now = Date.now();
  if (cached && now - cachedAt < TTL_MS) return cached;

  const url = `${DEFINITIONS_BASE_URL}/${MANIFEST_PATH.replace(/^\//, "")}`;
  const res = await fetch(url, { headers: { Accept: "application/ld+json, application/json" } });
  if (!res.ok) {
    throw new Error(`manifest fetch failed: ${res.status} ${url}`);
  }
  const json = await res.json();
  cached = json;
  cachedAt = now;
  return json;
}

function findDomain(manifest, slug) {
  return (manifest.domains || []).find((d) => d.slug === slug);
}

/** Picks the best artifact of a kind for a domain: prefers current, falls back to any. */
function pickArtifact(domain, kind, status = "current") {
  return (
    (domain.artifacts || []).find((a) => a.kind === kind && a.status === status) ||
    (domain.artifacts || []).find((a) => a.kind === kind)
  );
}

/**
 * Finds the artifact whose public `url` (e.g.
 * https://gs1-epcis-reg.org/rail/voc/data/gs1RailVoc.jsonld) has the given
 * request pathname, across every domain and status. This is how a direct
 * request for an artifact's own stable identifier — not just the
 * /{domain}/{term} resolver shape — gets mapped back to the physical
 * `source` it should redirect to. Built fresh per manifest load rather
 * than cached separately, since the manifest itself is already cached.
 */
function findArtifactByPublicPath(manifest, pathname) {
  for (const domain of manifest.domains || []) {
    for (const artifact of domain.artifacts || []) {
      try {
        if (new URL(artifact.url).pathname === pathname) return artifact;
      } catch {
        // malformed url in manifest — skip rather than throw for one bad entry
      }
    }
  }
  return undefined;
}

module.exports = { loadManifest, findDomain, pickArtifact, findArtifactByPublicPath, DEFINITIONS_BASE_URL };
