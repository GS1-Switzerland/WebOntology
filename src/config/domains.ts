/**
 * Fallback snapshot of the GS1 Domain code list.
 *
 * Same resilience pattern as src/config/sectors.ts: this is NOT the
 * source of truth. The app fetches the current domain codelist at
 * runtime from the definitions repo (see loadDomains() in
 * src/lib/registryClient.ts and DOMAINS_PATH in src/config/env.ts) and
 * uses its `codeName` as the canonical display name for a domain
 * wherever one is shown (home page, sector page, domain page,
 * breadcrumbs) — ahead of the manifest's own auto-generated
 * `DomainEntry.label`, but behind a domain's own ontology `dc:title`
 * where that's already being shown (the domain page's own heading).
 *
 * This array only exists as a fallback if that fetch fails, so a
 * transient outage never breaks navigation. Keep it roughly in sync, but
 * it does not need to be perfectly current.
 */
export interface Gs1Domain {
  codeList: "Gs1Domain";
  /** Matches DomainEntry.slug from the manifest. */
  codeValue: string;
  codeName: string;
  order: number;
}

export const FALLBACK_GS1_DOMAINS: Gs1Domain[] = [
  { codeList: "Gs1Domain", codeValue: "disco", codeName: "Domain Disco – GS1 Discovery Service", order: 0 },
  { codeList: "Gs1Domain", codeValue: "rail", codeName: "Domain Rail – Railway", order: 1 },
  { codeList: "Gs1Domain", codeValue: "bearing", codeName: "Domain Bearing – Bearing", order: 2 },
];

/** Looks up a domain's codelist entry by slug in any loaded list (fallback or fetched). */
export const domainByCode = (domains: Gs1Domain[], code: string): Gs1Domain | undefined =>
  domains.find((d) => d.codeValue.toLowerCase() === code.toLowerCase());

/** The name to display for a domain: codelist codeName if known, otherwise the given fallback (typically the manifest's own DomainEntry.label). */
export const domainDisplayLabel = (domains: Gs1Domain[], slug: string, fallback: string): string =>
  domainByCode(domains, slug)?.codeName ?? fallback;
