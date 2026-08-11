import { DEFINITIONS_BASE_URL, DOMAINS_PATH, MANIFEST_PATH, SECTORS_PATH } from "@/config/env";
import type { Artifact, DomainEntry, RegistryManifest, VocabTerm } from "@/types/registry";
import { extractOntologyMetadata, parseVocabularyDocument, type OntologyMetadata } from "./vocabParser";
import type { Gs1Sector } from "@/config/sectors";
import type { Gs1Domain } from "@/config/domains";

export class RegistryFetchError extends Error {
  constructor(message: string, public readonly url: string, public readonly cause?: unknown) {
    super(message);
    this.name = "RegistryFetchError";
  }
}

async function fetchJson(url: string, attempt = 0): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: "application/ld+json, application/json;q=0.9" },
    // GitHub Pages serves static, CDN-cached content — safe to let the
    // browser HTTP cache do its job rather than forcing no-store.
  });
  if (!res.ok) {
    // GitHub Pages occasionally returns a transient 5xx (and, on an error
    // response, often omits CORS headers too — which shows up in the
    // browser console as a misleading "CORS blocked" message even though
    // the real cause is the 5xx). A couple of short, cheap retries clears
    // most of these without the person ever noticing.
    if (res.status >= 500 && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt));
      return fetchJson(url, attempt + 1);
    }
    throw new RegistryFetchError(`Request to ${url} failed with ${res.status}`, url);
  }
  return res.json();
}

/** Loads and validates the top-level registry manifest. */
export async function loadManifest(): Promise<RegistryManifest> {
  const url = `${DEFINITIONS_BASE_URL}/${MANIFEST_PATH.replace(/^\//, "")}`;
  try {
    const json = (await fetchJson(url)) as RegistryManifest;
    if (!json || !Array.isArray(json.domains)) {
      throw new RegistryFetchError("Manifest is missing a 'domains' array", url);
    }
    return json;
  } catch (err) {
    if (err instanceof RegistryFetchError) throw err;
    throw new RegistryFetchError("Could not load or parse the registry manifest", url, err);
  }
}

/**
 * Extracts the entries array from a codelist JSON document, tolerating
 * either shape: a bare top-level array (the convention sectors.jsonld
 * uses today), or an object wrapping the array under one of
 * `preferredKeys` (the shape a hand-authored domains.jsonld arrived in —
 * `{ "$schema": "...", "sectors": [...] }`, using "sectors" as the array
 * key even though the entries are `Gs1Domain`s). Accepting both means
 * neither file breaks the app if it's re-exported in the other shape
 * later.
 */
export function extractCodeListArray(json: unknown, preferredKeys: string[]): unknown[] | undefined {
  if (Array.isArray(json)) return json;
  if (json && typeof json === "object") {
    for (const key of preferredKeys) {
      const value = (json as Record<string, unknown>)[key];
      if (Array.isArray(value)) return value;
    }
  }
  return undefined;
}

function isValidCodeListEntry(entry: unknown): entry is { codeValue: string; codeName: string; order: number } {
  const e = entry as Record<string, unknown>;
  return typeof e?.codeValue === "string" && typeof e?.codeName === "string" && typeof e?.order === "number";
}

/**
 * Loads the GS1 Sector codelist from the definitions repo
 * (registry/sectors.jsonld — see /sectors.schema.json for the contract).
 * This is the runtime source of truth; src/config/sectors.ts only holds a
 * bundled fallback snapshot used when this fetch fails. Callers should
 * catch and fall back — see useSectors() in src/hooks/useRegistry.ts.
 */
export async function loadSectors(): Promise<Gs1Sector[]> {
  const url = `${DEFINITIONS_BASE_URL}/${SECTORS_PATH.replace(/^\//, "")}`;
  const json = await fetchJson(url);
  const entries = extractCodeListArray(json, ["sectors"]);
  if (!entries) {
    throw new RegistryFetchError("Sector codelist is not an array (or {sectors:[...]} object)", url);
  }
  if (!entries.every(isValidCodeListEntry)) {
    throw new RegistryFetchError("Sector codelist entries are missing required fields", url);
  }
  const sectors = entries as unknown as Gs1Sector[];
  return [...sectors].sort((a, b) => a.order - b.order);
}

/**
 * Loads the GS1 Domain codelist from the definitions repo
 * (registry/domains.jsonld — see /domains.schema.json for the contract),
 * analogous to loadSectors() above. Provides the canonical display name
 * for a domain slug, used ahead of the manifest's own auto-generated
 * `DomainEntry.label` wherever a domain name is shown. Hand-maintained,
 * like sectors.jsonld — generate-manifest.mjs never writes this file.
 */
export async function loadDomains(): Promise<Gs1Domain[]> {
  const url = `${DEFINITIONS_BASE_URL}/${DOMAINS_PATH.replace(/^\//, "")}`;
  const json = await fetchJson(url);
  const entries = extractCodeListArray(json, ["domains", "sectors"]);
  if (!entries) {
    throw new RegistryFetchError("Domain codelist is not an array (or {domains:[...]} object)", url);
  }
  if (!entries.every(isValidCodeListEntry)) {
    throw new RegistryFetchError("Domain codelist entries are missing required fields", url);
  }
  const domains = entries as unknown as Gs1Domain[];
  return [...domains].sort((a, b) => a.order - b.order);
}

/** Picks the current (or, failing that, the newest staging) artifact of a given kind. */
export function pickArtifact(
  domain: DomainEntry,
  kind: Artifact["kind"],
  status: Artifact["status"] = "current"
): Artifact | undefined {
  return (
    domain.artifacts.find((a) => a.kind === kind && a.status === status) ??
    domain.artifacts.find((a) => a.kind === kind)
  );
}

/** Extracts the "versions/&lt;tag&gt;" segment from an artifact's public url, if present. */
export function versionTagOf(artifact: Artifact): string | undefined {
  return artifact.url.match(/\/versions\/([^/]+)\//)?.[1];
}

/** Every distinct deprecated version tag present in a domain's artifacts, most recent first (as ordered by the generator). */
export function deprecatedVersionTags(domain: DomainEntry): string[] {
  const tags = new Set<string>();
  for (const a of domain.artifacts) {
    if (a.status === "deprecated") {
      const tag = versionTagOf(a);
      if (tag) tags.add(tag);
    }
  }
  return Array.from(tags);
}

export interface VersionOption {
  status: Artifact["status"];
  /** Only set when status === "deprecated". */
  versionTag?: string;
}

/**
 * Every browsable (status, versionTag) combination for a domain: Current
 * and Staging always (consistent with the domain page — always selectable
 * even when empty), plus one entry per historical deprecated version.
 */
export function listVersionOptions(domain: DomainEntry): VersionOption[] {
  const options: VersionOption[] = [{ status: "current" }, { status: "staging" }];
  for (const tag of deprecatedVersionTags(domain)) {
    options.push({ status: "deprecated", versionTag: tag });
  }
  return options;
}

/** Loads and parses every JSON-LD vocabulary/ontology artifact for a domain (current version only, by default). */
export async function loadDomainTerms(
  domain: DomainEntry,
  status: Artifact["status"] = "current",
  versionTag?: string
): Promise<VocabTerm[]> {
  const jsonldArtifacts = domain.artifacts.filter(
    (a) =>
      a.status === status &&
      a.mediaType === "application/ld+json" &&
      (a.kind === "vocabulary" || a.kind === "ontology") &&
      // When browsing a specific deprecated snapshot, only that snapshot's
      // files — otherwise every historical version's vocabulary would be
      // parsed and merged together, which reads as duplicated/conflicting terms.
      (status !== "deprecated" || versionTagOf(a) === versionTag)
  );

  const results = await Promise.allSettled(
    jsonldArtifacts.map(async (artifact) => {
      // Fetch the actual bytes from `source` (e.g. GitHub Pages). `url` is
      // the public canonical identifier — shown/linked to in the UI and
      // used in citations — which may not itself serve raw bytes directly
      // without going through the resolver Function; see README §2c.
      const doc = await fetchJson(artifact.source);
      return parseVocabularyDocument(doc, { domainSlug: domain.slug, sourceArtifactUrl: artifact.url });
    })
  );

  const terms: VocabTerm[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") terms.push(...r.value);
    // A single unreachable artifact shouldn't break the whole domain page;
    // surface it via console so it's visible in monitoring/telemetry.
    else console.warn("[registry] failed to load vocabulary artifact", r.reason);
  }
  return terms;
}

/** Loads the header metadata (title, version, issued date…) from a domain's primary ontology/vocabulary artifact. */
export async function loadDomainMetadata(
  domain: DomainEntry,
  status: Artifact["status"] = "current"
): Promise<OntologyMetadata | undefined> {
  const primary =
    pickArtifact(domain, "ontology", status) ?? pickArtifact(domain, "vocabulary", status);
  if (!primary) return undefined;
  try {
    const doc = await fetchJson(primary.source);
    return extractOntologyMetadata(doc);
  } catch (err) {
    console.warn("[registry] failed to load ontology metadata", err);
    return undefined;
  }
}

/** Builds a cross-domain usage index: term local name/IRI -> domains that define or reference it. */
export function buildCrossReferenceIndex(termsByDomain: Map<string, VocabTerm[]>): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();
  for (const [domainSlug, terms] of termsByDomain) {
    for (const term of terms) {
      const key = term.id;
      if (!index.has(key)) index.set(key, new Set());
      index.get(key)!.add(domainSlug);
    }
  }
  return index;
}
