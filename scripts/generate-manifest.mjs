#!/usr/bin/env node
/**
 * generate-manifest.mjs
 *
 * Scans an already-published gh-pages checkout and writes
 * registry/manifest.jsonld — the catalog gs1-ontology-explorer reads at
 * runtime (see manifest.schema.json).
 *
 * Built against GS1-Switzerland/WebOntology's two real workflows, both of
 * which do the same thing — no build step, just a flat copy:
 *
 *   promote-to-prod.yml (workflow_dispatch, "version" input):
 *     cp -a src/. public/
 *     cp -a public/. gh-pages/current/            # becomes the "current" tree
 *     cp -a public/. gh-pages/versions/$VERSION/  # becomes an immutable snapshot
 *
 *   deploy-stage.yml (push to the "stage" branch):
 *     cp -a src/. public/
 *     cp -a public/. gh-pages/stage/              # always overwritten, no history kept
 *
 * So by the time this script runs (at the end of either workflow, right
 * after its cp's and before `git add -A`), the gh-pages checkout looks
 * like:
 *
 *   gh-pages/
 *     current/sectors/<sectorCode-lowercase>/<domainSlug>/{ontologies,vocabularies,ttl,shacl}/*
 *     current/shared/<domainSlug>/{...}                    (no sector — cross-sector domains)
 *     versions/<tag>/sectors/...                            (one such tree per past promotion)
 *     versions/<tag>/shared/...
 *     stage/sectors/...                                     (only present after a stage push)
 *     stage/shared/...
 *
 * "stage/" is scanned defensively (skipped if absent) since deploy-stage.yml
 * doesn't itself call this script yet — see PROMOTE_TO_PROD.md for the
 * patch that adds it there too, so staging content in the manifest stays
 * fresh on every stage push, not just on the next prod promotion.
 *
 * ── Every historical "versions/<tag>/" folder becomes status "deprecated" ──
 * This directly satisfies the original brief ("es gibt aber noch ... die
 * veralteten versionen") — each old release gets its own permanently
 * resolvable, versioned public URL (…/rail/versions/v1.1.0/…), separate
 * from the "current" alias. Capped at MAX_DEPRECATED_VERSIONS (most
 * recent by commit date) so the manifest doesn't grow unboundedly forever
 * — raise/remove the cap if you want full history exposed.
 *
 * ── Per-domain / per-file overrides ─────────────────────────────────────
 * Drop an optional `manifest.meta.json` next to a domain folder *in the
 * source repo* under src/sectors/<sector>/<domain>/ (it travels along
 * automatically via the plain `cp -a`, no extra step needed):
 *   {
 *     "label": "Rail",
 *     "description": "Vocabulary and SHACL shapes for rail logistics EPCIS events.",
 *     "artifacts": {
 *       "Rail-EPCIS-SHACL-Generic.json": { "label": "SHACL shapes — generic EPCIS profile" },
 *       "Rail-SHACL.json": { "label": "SHACL shapes — rail profile" }
 *     }
 *   }
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// ── Configuration ─────────────────────────────────────────────────────────
// Root of the gh-pages checkout (the directory containing current/, versions/).
const GH_PAGES_ROOT = process.env.GH_PAGES_ROOT ? path.resolve(process.env.GH_PAGES_ROOT) : process.cwd();
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || "https://gs1-epcis-reg.org").replace(/\/$/, "");
// Must match the SPA's DEFINITIONS_BASE_URL (src/config/env.ts) — where
// GitHub Pages actually serves this checkout's files from.
const GH_PAGES_BASE = (process.env.GH_PAGES_BASE || "https://gs1-switzerland.github.io/WebOntology").replace(/\/$/, "");
// The workflow_dispatch "version" input, e.g. "v1.2.0" — used only as a
// last-resort version fallback for files that declare no owl:versionInfo
// of their own; each vocabulary's own semantic version (read from the
// file) always wins when present.
const RELEASE_VERSION = process.env.RELEASE_VERSION;
const MAX_DEPRECATED_VERSIONS = Number(process.env.MAX_DEPRECATED_VERSIONS ?? 5);
const OUTPUT_PATH = path.join(GH_PAGES_ROOT, "registry", "manifest.jsonld");

const SUBFOLDER_KIND = {
  ontologies: "ontology-or-context",
  vocabularies: "vocabulary",
  ttl: "vocabulary",
  shacl: "shacl",
  schema: "schema",
};
const MEDIA_TYPE_BY_EXT = {
  ".jsonld": "application/ld+json",
  ".ttl": "text/turtle",
  ".json": "application/schema+json",
};

// ── Small helpers ─────────────────────────────────────────────────────────

function listDirs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => statSync(path.join(dir, name)).isDirectory());
}

function listFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => statSync(path.join(dir, name)).isFile());
}

function relPosix(from, to) {
  return path.relative(from, to).split(path.sep).join("/");
}

function gitLastCommitDate(fsPath) {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cI", "--", fsPath], {
      cwd: GH_PAGES_ROOT,
      encoding: "utf-8",
    }).trim();
    return out || new Date().toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/** Minimal ontology-header reader — same predicates as the SPA's vocabParser.ts extractOntologyMetadata(). */
function readOntologyMeta(fsPath) {
  try {
    const doc = JSON.parse(readFileSync(fsPath, "utf-8"));
    const nodes = Array.isArray(doc?.["@graph"]) ? doc["@graph"] : Array.isArray(doc) ? doc : [doc];
    for (const node of nodes) {
      const types = [].concat(node?.["@type"] ?? []);
      if (!types.includes("voaf:Vocabulary") && !types.includes("owl:Ontology")) continue;
      const title = literal(node["dc:title"]);
      const description = literal(node["dc:description"]);
      const version = literal(node["owl:versionInfo"]);
      if (title || description || version) return { title, description, version };
    }
  } catch {
    // not JSON, or no ontology header — caller falls back gracefully
  }
  return undefined;
}

function literal(value) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof value["@value"] === "string") return value["@value"];
  return undefined;
}

function titleCase(slug) {
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function humanizeFilename(filename) {
  return path
    .basename(filename, path.extname(filename))
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .trim();
}

function readSidecarMeta(domainDir) {
  const p = path.join(domainDir, "manifest.meta.json");
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch (err) {
    console.warn(`[generate-manifest] could not parse ${p}: ${err.message}`);
    return {};
  }
}

/**
 * Public identifier path convention, verified against the real published
 * manifest.jsonld for the "current" case. `urlPrefixSegment` is undefined
 * for current, "staging" for staging, or "versions/<tag>" for a
 * deprecated historical snapshot.
 */
function publicUrlFor(domainSlug, kind, filename, urlPrefixSegment) {
  const prefix = urlPrefixSegment ? `${urlPrefixSegment}/` : "";
  if (kind === "context" || kind === "ontology") {
    return `${PUBLIC_BASE_URL}/${domainSlug}/${prefix}${filename}`;
  }
  // vocabulary + shacl + schema all live under voc/data/, matching the
  // existing manifest.jsonld (SHACL files sit alongside the vocab files).
  return `${PUBLIC_BASE_URL}/${domainSlug}/${prefix}voc/data/${filename}`;
}

function kindFor(subfolder, filename) {
  if (subfolder === "ontologies") {
    return /context/i.test(filename) ? "context" : "ontology";
  }
  return SUBFOLDER_KIND[subfolder] ?? "other";
}

function defaultLabel(kind, mediaType, filename, domainSlug, variantSuffix) {
  const domainLabel = titleCase(domainSlug);
  switch (kind) {
    case "context":
      return "JSON-LD @context";
    case "ontology":
      return `${domainLabel} ontology`;
    case "vocabulary":
      return mediaType === "text/turtle"
        ? `${domainLabel} vocabulary (Turtle${variantSuffix})`
        : `${domainLabel} vocabulary (JSON-LD${variantSuffix})`;
    case "shacl":
      return `SHACL shapes (${humanizeFilename(filename)})`;
    default:
      return humanizeFilename(filename);
  }
}

// ── Core scan ─────────────────────────────────────────────────────────────

/**
 * Scans one domain folder within one pass (current / staging / a specific
 * deprecated version) and returns a partial DomainEntry with just that
 * pass's artifacts, or undefined if the folder has no recognised files.
 */
function scanDomainInPass(domainDir, domainSlug, sectorCode, pass) {
  const sidecar = readSidecarMeta(domainDir);
  const artifacts = [];

  for (const subfolder of Object.keys(SUBFOLDER_KIND)) {
    const subDir = path.join(domainDir, subfolder);
    for (const filename of listFiles(subDir)) {
      const fsPath = path.join(subDir, filename);
      const ext = path.extname(filename);
      const kind = kindFor(subfolder, filename);
      const mediaType = MEDIA_TYPE_BY_EXT[ext] ?? "application/octet-stream";
      const override = sidecar.artifacts?.[filename] ?? {};

      artifacts.push({
        url: publicUrlFor(domainSlug, kind, filename, pass.urlPrefixSegment),
        mediaType,
        kind,
        label: override.label ?? defaultLabel(kind, mediaType, filename, domainSlug, pass.labelSuffix),
        _fsPath: fsPath,
      });
    }
  }

  if (artifacts.length === 0) return undefined;

  // Prefer an "ontology" header, then a jsonld "vocabulary", then "context" —
  // context files are usually a bare @context map with no owl:Ontology node.
  const metaSourceOrder = ["ontology", "vocabulary", "context"];
  let ontologyMeta;
  for (const preferredKind of metaSourceOrder) {
    const candidate = artifacts.find((a) => a.kind === preferredKind && a.mediaType === "application/ld+json");
    if (candidate) {
      ontologyMeta = readOntologyMeta(candidate._fsPath);
      if (ontologyMeta) break;
    }
  }

  const version = ontologyMeta?.version ?? sidecar.version ?? pass.versionTag ?? RELEASE_VERSION ?? "0.0.0";
  const publishedAt = gitLastCommitDate(domainDir);

  for (const a of artifacts) {
    a.version = version;
    a.status = pass.status;
    a.publishedAt = publishedAt;
    a.source = `${GH_PAGES_BASE}/${pass.sourcePrefixSegment}/${relPosix(pass.base, a._fsPath)}`;
    delete a._fsPath;
  }

  return {
    slug: domainSlug,
    labelKey: sidecar.labelKey ?? `domain.${domainSlug}`,
    label: sidecar.label ?? titleCase(domainSlug),
    description: sidecar.description ?? ontologyMeta?.description ?? "",
    ...(sectorCode ? { sectorCode } : {}),
    artifacts,
  };
}

function scanPass(pass, domainsBySlug) {
  const sectorsDir = path.join(pass.base, "sectors");
  for (const sectorDir of listDirs(sectorsDir)) {
    const sectorCode = sectorDir.toUpperCase();
    for (const domainSlug of listDirs(path.join(sectorsDir, sectorDir))) {
      mergeDomain(
        domainsBySlug,
        scanDomainInPass(path.join(sectorsDir, sectorDir, domainSlug), domainSlug, sectorCode, pass)
      );
    }
  }
  const sharedDir = path.join(pass.base, "shared");
  for (const domainSlug of listDirs(sharedDir)) {
    mergeDomain(domainsBySlug, scanDomainInPass(path.join(sharedDir, domainSlug), domainSlug, undefined, pass));
  }
}

function mergeDomain(domainsBySlug, domain) {
  if (!domain) return;
  const existing = domainsBySlug.get(domain.slug);
  if (!existing) {
    domainsBySlug.set(domain.slug, domain);
    return;
  }
  // Domain already seen in an earlier pass (e.g. exists in "current" and
  // in several "versions/<tag>" snapshots) — merge artifact lists in,
  // prefer the first pass's descriptive fields (passes run current-first).
  existing.artifacts.push(...domain.artifacts);
  existing.description = existing.description || domain.description;
}

/** Picks up to MAX_DEPRECATED_VERSIONS version tags, most recent first, by commit date. */
function selectDeprecatedVersionTags() {
  const versionsDir = path.join(GH_PAGES_ROOT, "versions");
  const tags = listDirs(versionsDir);
  const withDates = tags.map((tag) => ({ tag, date: gitLastCommitDate(path.join(versionsDir, tag)) }));
  withDates.sort((a, b) => new Date(b.date) - new Date(a.date));
  return withDates.slice(0, MAX_DEPRECATED_VERSIONS).map((x) => x.tag);
}

function buildPasses() {
  const passes = [
    {
      base: path.join(GH_PAGES_ROOT, "current"),
      status: "current",
      urlPrefixSegment: undefined,
      sourcePrefixSegment: "current",
      labelSuffix: "",
    },
  ];

  // Populated by deploy-stage.yml (push to the "stage" branch) — a single,
  // always-overwritten tree at gh-pages/stage/, no version history kept.
  // The GH Pages folder is named "stage"; the public URL segment stays
  // "staging" for readability (these are independent, unlike current/versions
  // where url and source share the same prefix).
  if (existsSync(path.join(GH_PAGES_ROOT, "stage"))) {
    passes.push({
      base: path.join(GH_PAGES_ROOT, "stage"),
      status: "staging",
      urlPrefixSegment: "staging",
      sourcePrefixSegment: "stage",
      labelSuffix: ", staging",
    });
  }

  for (const tag of selectDeprecatedVersionTags()) {
    passes.push({
      base: path.join(GH_PAGES_ROOT, "versions", tag),
      status: "deprecated",
      urlPrefixSegment: `versions/${tag}`,
      sourcePrefixSegment: `versions/${tag}`,
      labelSuffix: `, ${tag}`,
      versionTag: tag,
    });
  }

  return passes;
}

function main() {
  const domainsBySlug = new Map();
  for (const pass of buildPasses()) {
    if (!existsSync(pass.base)) {
      if (pass.status === "current") {
        console.error(`[generate-manifest] "current" root not found at ${pass.base} — check GH_PAGES_ROOT.`);
      }
      continue;
    }
    scanPass(pass, domainsBySlug);
  }

  const manifest = {
    $schema: "manifest.schema.json",
    generatedAt: new Date().toISOString(),
    domains: Array.from(domainsBySlug.values()).sort((a, b) => a.slug.localeCompare(b.slug)),
  };

  mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf-8");
  console.log(`[generate-manifest] wrote ${OUTPUT_PATH} (${manifest.domains.length} domain(s))`);
}

// Only run when executed directly (so this file can also be `import`ed by tests).
if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main();
}

export { scanDomainInPass, publicUrlFor, kindFor, readOntologyMeta, defaultLabel, selectDeprecatedVersionTags };
