import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { sectorByCode } from "@/config/sectors";
import { useDomain, useDomains, useManifest, useSectors, useTermAtVersion } from "@/hooks/useRegistry";
import { domainDisplayLabel } from "@/config/domains";
import { VersionSelect, versionOptionFromKey } from "@/components/VersionSelect";
import { VersionCompare } from "@/components/VersionCompare";
import type { VersionOption } from "@/lib/registryClient";
import { RESOLVER_HOST } from "@/config/env";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingBlock, ErrorBlock } from "@/components/StateBlocks";

export function TermPage() {
  const { domainSlug = "", termName = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation(["common", "sectors", "errors"]);
  const [showRaw, setShowRaw] = useState(false);

  // If arriving from the domain-level diff view's "Changed" list
  // (?compareA=current&compareB=deprecated:v0.1.2), open the compare panel
  // immediately, pre-filled with those two versions.
  const initialCompareA = searchParams.get("compareA");
  const initialCompareB = searchParams.get("compareB");
  const [showCompare, setShowCompare] = useState(Boolean(initialCompareA && initialCompareB));

  const { domain, isLoading: manifestLoading } = useDomain(domainSlug);
  const manifest = useManifest();
  const sectorsQuery = useSectors();
  const domainsQuery = useDomains();

  // Which version is currently being viewed — reflected in the URL
  // (?status=staging or ?status=deprecated&v=v1.0.0) so links to a
  // specific version are shareable, and defaulting to "current" otherwise.
  const viewedVersion: VersionOption = useMemo(() => {
    const status = (searchParams.get("status") as VersionOption["status"]) || "current";
    const versionTag = searchParams.get("v") ?? undefined;
    return status === "deprecated" ? { status, versionTag } : { status };
  }, [searchParams]);

  const setViewedVersion = (option: VersionOption) => {
    const next = new URLSearchParams(searchParams);
    if (option.status === "current") {
      next.delete("status");
      next.delete("v");
    } else if (option.status === "staging") {
      next.set("status", "staging");
      next.delete("v");
    } else {
      next.set("status", "deprecated");
      if (option.versionTag) next.set("v", option.versionTag);
    }
    setSearchParams(next, { replace: true });
  };

  const termQuery = useTermAtVersion(domain, termName, viewedVersion.status, viewedVersion.versionTag);

  // Compare panel's two sides default to "current vs staging" — the most
  // common "what changed before I promote" question — but are freely
  // switchable, e.g. to current vs. a specific deprecated version. When
  // arriving via a domain-diff link, the two sides come from the URL instead.
  const [compareA, setCompareA] = useState<VersionOption>(
    initialCompareA ? versionOptionFromKey(initialCompareA) : { status: "current" }
  );
  const [compareB, setCompareB] = useState<VersionOption>(
    initialCompareB ? versionOptionFromKey(initialCompareB) : { status: "staging" }
  );

  // Cross-reference: does a term with the same @id (or same local name)
  // also appear in other domains' vocabularies? We only check domains that
  // are already cached by React Query from prior navigation to avoid an
  // eager fan-out fetch of every domain on every term view; a manifest-side
  // "usedIn" hint (see manifest.schema.json extension point) can make this
  // exhaustive without client-side cost once the registry grows.
  const otherDomains = useMemo(
    () => (manifest.data?.domains ?? []).filter((d) => d.slug !== domainSlug),
    [manifest.data, domainSlug]
  );

  if (manifestLoading || termQuery.isLoading) return <LoadingBlock />;
  if (!domain) return <ErrorBlock title={t("domainNotFound", { ns: "errors", slug: domainSlug })} />;

  const term = termQuery.data;
  if (!term) {
    return <ErrorBlock title={t("termNotFound", { ns: "errors", term: termName, domain: domainSlug })} />;
  }

  const sector = domain.sectorCode ? sectorByCode(sectorsQuery.data ?? [], domain.sectorCode) : undefined;
  const domainLabel = domainDisplayLabel(domainsQuery.data ?? [], domain.slug, domain.label);
  const sectorLabel = sector ? t(`sector.${sector.codeValue}`, { ns: "sectors" }) : "";
  const permalink = `${RESOLVER_HOST}/${domain.slug}/${term.localName}`;

  return (
    <div>
      <Helmet>
        <title>{`${term.label} — ${domainLabel} — ${t("app.title")}`}</title>
        <link rel="alternate" type="application/ld+json" href={term.sourceArtifactUrl} />
      </Helmet>
      <Breadcrumbs
        items={[
          { label: t("breadcrumb.home"), to: "/" },
          ...(sector ? [{ label: sectorLabel, to: `/sector/${sector.codeValue.toLowerCase()}` }] : []),
          { label: domainLabel, to: `/${domain.slug}` },
          { label: term.label },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-semibold text-ink-900">{term.label}</h1>
          {term.termStatus && <StatusBadge status={term.termStatus} />}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-ink-400">{t("term.viewingVersion")}</span>
          <VersionSelect
            domain={domain}
            value={viewedVersion}
            onChange={setViewedVersion}
            ariaLabel={t("term.viewingVersion")}
          />
        </div>
      </div>
      <p className="term-id mt-1 break-all text-sm text-ink-400">{term.id}</p>

      {term.types.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-ink-400">{t("term.typeLabel")}</span>
          {term.types.map((ty) => (
            <span
              key={ty}
              className="term-id rounded-sm border border-ink-100 bg-ink-50 px-1.5 py-0.5 text-[11px] text-ink-500"
            >
              {ty}
            </span>
          ))}
        </div>
      )}

      {term.description && (
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-700">{term.description}</p>
      )}

      <dl className="mt-8 grid grid-cols-1 gap-x-8 gap-y-4 rounded border border-ink-100 bg-white p-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">{t("term.definedIn")}</dt>
          <dd className="mt-1 text-sm text-ink-700">{domainLabel}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">{t("term.permalink")}</dt>
          <dd className="term-id mt-1 break-all text-sm text-signal-dim">{permalink}</dd>
        </div>
        {Object.entries(term.relations).map(([pred, values]) => (
          <div key={pred}>
            <dt className="term-id text-xs font-semibold uppercase tracking-wide text-ink-400">{pred}</dt>
            <dd className="term-id mt-1 space-y-0.5 text-sm text-ink-700">
              {values.map((v) => (
                <div key={v} className="break-all">
                  {v}
                </div>
              ))}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 text-xs text-ink-400">{t("term.negotiationHint")}</p>

      {otherDomains.length > 0 && (
        <p className="mt-2 text-xs text-ink-400">
          Checking cross-sector usage across {otherDomains.length} other published domain
          {otherDomains.length === 1 ? "" : "s"} — open a domain page once to include it in the cross-reference index.
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button
          onClick={() => setShowRaw((v) => !v)}
          className="text-xs font-medium text-ink-500 underline decoration-dotted underline-offset-2 hover:text-ink-800"
        >
          {showRaw ? "Hide" : "Show"} {t("term.rawJsonLd")}
        </button>
        <button
          onClick={() => setShowCompare((v) => !v)}
          className="text-xs font-medium text-ink-500 underline decoration-dotted underline-offset-2 hover:text-ink-800"
        >
          {t("term.compare")}
        </button>
      </div>

      {showRaw && (
        <pre className="mt-3 overflow-x-auto rounded border border-ink-100 bg-ink-950 p-4 text-xs text-ink-100">
          {JSON.stringify(term.raw, null, 2)}
        </pre>
      )}

      {showCompare && (
        <VersionCompare
          domain={domain}
          localName={term.localName}
          versionA={compareA}
          versionB={compareB}
          onChangeA={setCompareA}
          onChangeB={setCompareB}
        />
      )}
    </div>
  );
}
