import { useQuery } from "@tanstack/react-query";
import { loadDomainMetadata, loadDomainTerms, loadDomains, loadManifest, loadSectors } from "@/lib/registryClient";
import { FALLBACK_GS1_SECTORS } from "@/config/sectors";
import { FALLBACK_GS1_DOMAINS } from "@/config/domains";
import type { Artifact, DomainEntry } from "@/types/registry";

/**
 * Loads the live GS1 Sector codelist from the definitions repo. If that
 * fetch fails for any reason (network hiccup, GitHub Pages outage,
 * misconfigured path), this silently falls back to the bundled snapshot
 * in src/config/sectors.ts rather than propagating an error — sector
 * navigation staying available is more important than surfacing this as
 * a hard failure, since the fallback is a legitimate (if possibly
 * slightly stale) source of the same reference data.
 */
export function useSectors() {
  return useQuery({
    queryKey: ["sectors"],
    queryFn: async () => {
      try {
        return await loadSectors();
      } catch (err) {
        console.warn("[registry] sector codelist fetch failed, using bundled fallback", err);
        return FALLBACK_GS1_SECTORS;
      }
    },
    staleTime: 60 * 60 * 1000,
    // Never surface this as an error state to the UI — see fallback above.
    retry: 1,
  });
}

/** Same resilience pattern as useSectors(), for the domain codelist (registry/domains.jsonld). */
export function useDomains() {
  return useQuery({
    queryKey: ["domains-codelist"],
    queryFn: async () => {
      try {
        return await loadDomains();
      } catch (err) {
        console.warn("[registry] domain codelist fetch failed, using bundled fallback", err);
        return FALLBACK_GS1_DOMAINS;
      }
    },
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
}

export function useManifest() {
  return useQuery({
    queryKey: ["manifest"],
    queryFn: loadManifest,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDomain(slug: string | undefined) {
  const manifest = useManifest();
  const domain = manifest.data?.domains.find((d) => d.slug === slug);
  return { ...manifest, domain };
}

/** Loads a domain's terms at a specific (status, versionTag) — the primitive DomainPage, the term-set diff, and search all build on. */
export function useDomainTermsAtVersion(
  domain: DomainEntry | undefined,
  status: Artifact["status"] = "current",
  versionTag?: string
) {
  return useQuery({
    queryKey: ["domain-terms", domain?.slug, status, versionTag],
    queryFn: () => loadDomainTerms(domain as DomainEntry, status, versionTag),
    enabled: Boolean(domain),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDomainTerms(domain: DomainEntry | undefined) {
  return useDomainTermsAtVersion(domain, "current");
}

export function useDomainMetadata(domain: DomainEntry | undefined) {
  return useQuery({
    queryKey: ["domain-meta", domain?.slug],
    queryFn: () => loadDomainMetadata(domain as DomainEntry),
    enabled: Boolean(domain),
    staleTime: 5 * 60 * 1000,
  });
}

/** Loads one specific term at one specific (status, versionTag) — the primitive both TermPage and the version-compare panel build on. */
export function useTermAtVersion(
  domain: DomainEntry | undefined,
  localName: string,
  status: Artifact["status"],
  versionTag?: string
) {
  return useQuery({
    queryKey: ["term-at-version", domain?.slug, localName, status, versionTag],
    queryFn: async () => {
      const terms = await loadDomainTerms(domain as DomainEntry, status, versionTag);
      return terms.find((t) => t.localName === localName);
    },
    enabled: Boolean(domain),
    staleTime: 5 * 60 * 1000,
  });
}

/** Loads terms for every domain — used for global search and cross-reference badges. */
export function useAllDomainTerms(domains: DomainEntry[] | undefined) {
  return useQuery({
    queryKey: ["all-domain-terms", domains?.map((d) => d.slug).join(",")],
    queryFn: async () => {
      const entries = await Promise.all(
        (domains ?? []).map(async (d) => [d.slug, await loadDomainTerms(d)] as const)
      );
      return new Map(entries);
    },
    enabled: Boolean(domains && domains.length > 0),
    staleTime: 5 * 60 * 1000,
  });
}
