/** Lifecycle state of a published artifact/version. */
export type ArtifactStatus = "current" | "staging" | "deprecated";

/** A single distributable file for a domain (ontology, vocab, SHACL, context, ...). */
export interface Artifact {
  /**
   * Stable, public, dereferenceable identifier under the resolver host,
   * e.g. https://gs1-epcis-reg.org/rail/voc/data/gs1RailVoc.jsonld. This is
   * the URL other JSON-LD files' @context/@id entries point at, the URL
   * shown/linked to in the UI, and the URL RDF-negotiation redirects to.
   * It never has to correspond to a real path on any physical host — the
   * resolver Function maps it to `source` — so it can stay stable even if
   * the underlying storage/repo layout changes.
   */
  url: string;
  /**
   * Actual physical location the bytes are fetched from today (typically
   * a GitHub Pages URL under the definitions repo). The SPA's own
   * fetch()/CORS calls use this; the resolver Function 303-redirects
   * requests for `url` to this address. Kept separate from `url` on
   * purpose — see the note above.
   */
  source: string;
  /** Media type used for content negotiation, e.g. application/ld+json */
  mediaType: string;
  /** Role of the file within the domain's artifact set. */
  kind: "context" | "ontology" | "vocabulary" | "shacl" | "schema" | "other";
  /** Human label, e.g. "SHACL shapes (generic EPCIS profile)". */
  label: string;
  /** Semver or date-based version identifier. */
  version: string;
  status: ArtifactStatus;
  /** ISO 8601 publication date. */
  publishedAt?: string;
}

/** A domain within a sector, e.g. "rail" within sector TRAN. */
export interface DomainEntry {
  /** URL slug used in resolver paths, e.g. "rail" -> /rail/{term}. */
  slug: string;
  /** i18n key suffix; label text lives in locale files. */
  labelKey: string;
  /** Fallback human label if no i18n resource is loaded yet. */
  label: string;
  description?: string;
  /** Omitted for cross-sector domains published under a "shared" location. */
  sectorCode?: string;
  artifacts: Artifact[];
}

/** Top-level manifest published by the GitHub repository maintainers. */
export interface RegistryManifest {
  "@context"?: unknown;
  generatedAt: string;
  domains: DomainEntry[];
}

/** A single term/class/property extracted from a domain's vocabulary file. */
export interface VocabTerm {
  /** Full IRI of the term. */
  id: string;
  /** Compact local name, e.g. "wagonNumber". */
  localName: string;
  label: string;
  description?: string;
  /** rdf:type values, e.g. ["rdfs:Class"] or ["rdf:Property"]. */
  types: string[];
  domainSlug: string;
  sourceArtifactUrl: string;
  /** IRIs of rdfs:domain / rdfs:range / owl:equivalentClass etc, kept generic. */
  relations: Record<string, string[]>;
  /** Optional lifecycle marker some GS1 vocabularies carry per-term (sw:term_status). */
  termStatus?: "stable" | "deprecated" | "reserved" | string;
  /** Raw JSON-LD node, kept for a "view source" panel. */
  raw: Record<string, unknown>;
}
