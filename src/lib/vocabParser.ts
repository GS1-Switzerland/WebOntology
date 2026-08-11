import type { VocabTerm } from "@/types/registry";

/**
 * Generic, schema-agnostic extraction of human-readable terms from a
 * JSON-LD document (OWL ontology, SKOS vocabulary, or plain RDFS vocab).
 * We deliberately avoid hard-coding any GS1-specific vocabulary shape:
 * the SPA must render *any* JSON-LD published under the manifest, in the
 * spirit of how schema.org's term pages work off a single generic template.
 *
 * Strategy: flatten @graph (or treat the root as a single node / array of
 * nodes), then for every node that looks like a class/property/concept
 * (has an @id and a recognisable @type, or carries rdfs:label /
 * skos:prefLabel), build a VocabTerm. Label/description resolution checks
 * a prioritised list of common predicates so it works across OWL, RDFS
 * and SKOS vocabularies without per-file configuration.
 */

const LABEL_PREDICATES = ["rdfs:label", "skos:prefLabel", "dc:title", "dcterms:title", "label", "name"];
const DESCRIPTION_PREDICATES = [
  "rdfs:comment",
  "skos:definition",
  "dc:description",
  "dcterms:description",
  "description",
  "comment",
];
const TYPE_LIKE_KEYS = ["@type", "type"];
const RELATION_PREDICATES = [
  "rdfs:domain",
  "rdfs:range",
  "rdfs:subClassOf",
  "rdfs:subPropertyOf",
  "owl:equivalentClass",
  "owl:equivalentProperty",
  "skos:broader",
  "skos:narrower",
  "skos:related",
];

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Builds a prefix -> IRI map from a JSON-LD @context (which may be an
 * object, an array mixing remote context URLs and an inline object, or
 * absent entirely). Only simple string-valued prefix definitions are
 * collected — e.g. {"rail": "https://.../data#"} — since that's all a
 * compact-IRI ("CURIE") expansion needs; term definitions with expanded
 * @id/@type mappings are left to the (optional, network-dependent) full
 * JSON-LD processor and are not required for human-readable rendering.
 * We deliberately never fetch remote @context URLs here: GS1's contexts
 * chain to external hosts that may be unreachable or rate-limited, and
 * this app must keep working (with un-expanded CURIEs as a fallback) even
 * when they are.
 */
function buildPrefixMap(doc: unknown): Record<string, string> {
  const prefixes: Record<string, string> = {};
  const contexts = Array.isArray(doc) ? [] : asArray((doc as Record<string, unknown> | undefined)?.["@context"]);
  for (const ctx of contexts) {
    if (!ctx || typeof ctx !== "object") continue; // skip remote context URL strings
    for (const [key, value] of Object.entries(ctx as Record<string, unknown>)) {
      if (key.startsWith("@")) continue;
      if (typeof value === "string" && !value.startsWith("@")) {
        prefixes[key] = value;
      } else if (value && typeof value === "object" && typeof (value as Record<string, unknown>)["@id"] === "string") {
        prefixes[key] = (value as Record<string, unknown>)["@id"] as string;
      }
    }
  }
  return prefixes;
}

/** Expands a compact IRI ("rail:geo") to a full IRI using the document's @context prefix map, if possible. */
function expandCurie(value: string, prefixMap: Record<string, string>): string {
  if (value.startsWith("_:") || /^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return value; // already absolute or a blank node
  const colonIdx = value.indexOf(":");
  if (colonIdx < 0) return value;
  const prefix = value.slice(0, colonIdx);
  const local = value.slice(colonIdx + 1);
  const base = prefixMap[prefix];
  return base ? `${base}${local}` : value;
}

function extractString(node: Record<string, unknown>, predicates: string[]): string | undefined {
  for (const pred of predicates) {
    const raw = node[pred];
    if (raw === undefined) continue;
    const values = asArray(raw);
    for (const v of values) {
      if (typeof v === "string") return v;
      if (v && typeof v === "object" && "@value" in (v as Record<string, unknown>)) {
        const val = (v as Record<string, unknown>)["@value"];
        if (typeof val === "string") return val;
      }
    }
  }
  return undefined;
}

function extractRelations(node: Record<string, unknown>, prefixMap: Record<string, string>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const pred of RELATION_PREDICATES) {
    const raw = node[pred];
    if (raw === undefined) continue;
    const ids = asArray(raw)
      .map((v) => {
        if (typeof v === "string") return expandCurie(v, prefixMap);
        if (v && typeof v === "object" && "@id" in (v as Record<string, unknown>)) {
          return expandCurie(String((v as Record<string, unknown>)["@id"]), prefixMap);
        }
        return undefined;
      })
      .filter((v): v is string => Boolean(v));
    if (ids.length) out[pred] = ids;
  }
  return out;
}

function localNameOf(iri: string): string {
  const hashIdx = iri.lastIndexOf("#");
  const slashIdx = iri.lastIndexOf("/");
  const cut = Math.max(hashIdx, slashIdx);
  if (cut >= 0) return iri.slice(cut + 1);
  // Compact IRIs (CURIEs) like "rail:geo" have no '/' or '#' — fall back to
  // the segment after the last ':' (but not for full "scheme://" URLs,
  // which are already handled by the slash check above).
  const colonIdx = iri.lastIndexOf(":");
  return colonIdx >= 0 ? iri.slice(colonIdx + 1) : iri;
}

function collectNodes(doc: unknown): Record<string, unknown>[] {
  if (Array.isArray(doc)) return doc.flatMap(collectNodes);
  if (doc && typeof doc === "object") {
    const obj = doc as Record<string, unknown>;
    if (Array.isArray(obj["@graph"])) {
      return (obj["@graph"] as unknown[]).flatMap(collectNodes);
    }
    if ("@id" in obj || "@type" in obj) return [obj];
  }
  return [];
}

const ONTOLOGY_HEADER_TYPES = ["voaf:Vocabulary", "owl:Ontology", "http://www.w3.org/2002/07/owl#Ontology"];

/** True for the single node that describes the vocabulary/ontology itself (title, license, version…), not a term. */
function isOntologyHeaderNode(types: string[]): boolean {
  return types.some((t) => ONTOLOGY_HEADER_TYPES.includes(t));
}

export interface OntologyMetadata {
  id: string;
  title?: string;
  description?: string;
  version?: string;
  issued?: string;
  lastModified?: string;
  preferredPrefix?: string;
}

/** Extracts the single ontology/vocabulary header node (title, version, license…) if present. */
export function extractOntologyMetadata(doc: unknown): OntologyMetadata | undefined {
  const nodes = collectNodes(doc);
  const prefixMap = buildPrefixMap(doc);
  for (const node of nodes) {
    const id = node["@id"];
    if (typeof id !== "string") continue;
    const types = TYPE_LIKE_KEYS.flatMap((k) => asArray(node[k] as string | string[]).map(String));
    if (!isOntologyHeaderNode(types)) continue;
    return {
      id: expandCurie(id, prefixMap),
      title: extractString(node, ["dc:title", "dcterms:title"]),
      description: extractString(node, DESCRIPTION_PREDICATES),
      version: extractString(node, ["owl:versionInfo"]),
      issued: extractString(node, ["dc:issued", "dcterms:issued"]),
      lastModified: extractString(node, ["dc:lastModified", "dcterms:modified"]),
      preferredPrefix: extractString(node, ["vann:preferredNamespacePrefix"]),
    };
  }
  return undefined;
}

export function parseVocabularyDocument(
  doc: unknown,
  opts: { domainSlug: string; sourceArtifactUrl: string }
): VocabTerm[] {
  const nodes = collectNodes(doc);
  const prefixMap = buildPrefixMap(doc);
  const terms: VocabTerm[] = [];

  for (const node of nodes) {
    const rawId = node["@id"];
    if (typeof rawId !== "string") continue;
    // Skip blank nodes.
    if (rawId.startsWith("_:")) continue;

    const rawTypes = TYPE_LIKE_KEYS.flatMap((k) => asArray(node[k] as string | string[]).map(String));
    // The ontology header node (e.g. "rail:" typed voaf:Vocabulary/owl:Ontology)
    // describes the vocabulary as a whole, not a browsable term — it's
    // surfaced separately via extractOntologyMetadata() below.
    if (isOntologyHeaderNode(rawTypes)) continue;
    const types = rawTypes.map((ty) => expandCurie(ty, prefixMap));

    const id = expandCurie(rawId, prefixMap);
    // localName is derived from the original (possibly compact) id so URL
    // slugs stay short and stable, e.g. "rail:geo" -> "geo", regardless of
    // whether the prefix could be expanded.
    const label = extractString(node, LABEL_PREDICATES) ?? localNameOf(rawId);
    const description = extractString(node, DESCRIPTION_PREDICATES);
    const relations = extractRelations(node, prefixMap);
    const termStatus = extractString(node, ["sw:term_status"]);

    terms.push({
      id,
      localName: localNameOf(rawId),
      label,
      description,
      types,
      domainSlug: opts.domainSlug,
      sourceArtifactUrl: opts.sourceArtifactUrl,
      relations,
      termStatus,
      raw: node,
    });
  }

  // De-duplicate by @id (a term can legitimately appear more than once
  // across @graph entries, e.g. once in the context and once in the vocab).
  const byId = new Map<string, VocabTerm>();
  for (const t of terms) {
    const existing = byId.get(t.id);
    if (!existing) {
      byId.set(t.id, t);
    } else {
      byId.set(t.id, {
        ...existing,
        description: existing.description ?? t.description,
        types: Array.from(new Set([...existing.types, ...t.types])),
        relations: { ...t.relations, ...existing.relations },
      });
    }
  }
  return Array.from(byId.values());
}
