import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { sectorByCode } from "@/config/sectors";
import { useDomain, useDomainMetadata, useDomainTermsAtVersion, useDomains, useSectors } from "@/hooks/useRegistry";
import { domainDisplayLabel } from "@/config/domains";
import { deprecatedVersionTags, versionTagOf, type VersionOption } from "@/lib/registryClient";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ArtifactList } from "@/components/ArtifactList";
import { TermRow } from "@/components/TermRow";
import { DomainVersionDiff } from "@/components/DomainVersionDiff";
import { LoadingBlock, ErrorBlock } from "@/components/StateBlocks";
import type { Artifact } from "@/types/registry";

export function DomainPage() {
  const { domainSlug = "" } = useParams();
  const { t } = useTranslation(["common", "sectors", "errors"]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Artifact["status"]>("current");
  const [versionTag, setVersionTag] = useState<string | undefined>(undefined);
  const [showDiff, setShowDiff] = useState(false);
  const [diffA, setDiffA] = useState<VersionOption>({ status: "current" });
  const [diffB, setDiffB] = useState<VersionOption>({ status: "staging" });

  const { data: manifest, isLoading, isError, domain } = useDomain(domainSlug);
  const meta = useDomainMetadata(domain);
  const sectorsQuery = useSectors();
  const domainsQuery = useDomains();
  const versionTags = domain ? deprecatedVersionTags(domain) : [];
  const effectiveVersionTag = status === "deprecated" ? versionTag ?? versionTags[0] : undefined;
  const termsQuery = useDomainTermsAtVersion(domain, status, effectiveVersionTag);

  const filtered = useMemo(() => {
    const list = termsQuery.data ?? [];
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter(
      (term) =>
        term.label.toLowerCase().includes(q) ||
        term.localName.toLowerCase().includes(q) ||
        term.description?.toLowerCase().includes(q)
    );
  }, [termsQuery.data, query]);

  if (isLoading) return <LoadingBlock />;
  if (isError) return <ErrorBlock title={t("manifestLoadFailed", { ns: "errors" })} />;
  if (!manifest || !domain) {
    return <ErrorBlock title={t("domainNotFound", { ns: "errors", slug: domainSlug })} />;
  }

  const sector = domain.sectorCode ? sectorByCode(sectorsQuery.data ?? [], domain.sectorCode) : undefined;
  const domainLabel = domainDisplayLabel(domainsQuery.data ?? [], domain.slug, domain.label);
  const sectorLabel = sector ? t(`sector.${sector.codeValue}`, { ns: "sectors" }) : "";
  // "current" and "staging" are always offered, even if this particular
  // domain has no artifacts under one of them yet — so switching between
  // them is never hidden depending on what happens to be published right
  // now. "deprecated" only appears once there's actual history to browse.
  const availableStatuses: Artifact["status"][] = ["current", "staging"];
  if (domain.artifacts.some((a) => a.status === "deprecated")) availableStatuses.push("deprecated");

  const artifactsForStatus = domain.artifacts.filter(
    (a) => a.status === status && (status !== "deprecated" || versionTagOf(a) === effectiveVersionTag)
  );

  return (
    <div>
      <Helmet>
        <title>{`${domainLabel} — ${t("app.title")}`}</title>
      </Helmet>
      <Breadcrumbs
        items={[
          { label: t("breadcrumb.home"), to: "/" },
          ...(sector ? [{ label: sectorLabel, to: `/sector/${sector.codeValue.toLowerCase()}` }] : []),
          { label: domainLabel },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">
            {meta.data?.title ?? domainLabel}
          </h1>
          <p className="term-id mt-1 text-xs text-ink-400">/{domain.slug}</p>
          {(meta.data?.description ?? domain.description) && (
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-500">
              {meta.data?.description ?? domain.description}
            </p>
          )}
          {meta.data?.version && (
            <p className="mt-2 text-xs text-ink-400">
              v{meta.data.version}
              {meta.data.lastModified && <> · updated {meta.data.lastModified}</>}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded border border-ink-100 bg-white p-1 text-xs">
            {availableStatuses.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatus(s);
                  if (s !== "deprecated") setVersionTag(undefined);
                }}
                className={`rounded-sm px-2.5 py-1 font-medium ${
                  status === s ? "bg-ink-900 text-ink-50" : "text-ink-500 hover:bg-ink-50"
                }`}
              >
                {t(`status.${s}`)}
              </button>
            ))}
          </div>
          {status === "deprecated" && versionTags.length > 1 && (
            <select
              value={effectiveVersionTag}
              onChange={(e) => setVersionTag(e.target.value)}
              aria-label="Version"
              className="rounded border border-ink-100 bg-white px-2 py-1.5 text-xs text-ink-700"
            >
              {versionTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-ink-400">
          {t("domain.artifacts")}
        </h2>
        {artifactsForStatus.length > 0 ? (
          <ArtifactList artifacts={artifactsForStatus} />
        ) : (
          <p className="rounded border border-dashed border-ink-200 px-4 py-6 text-sm text-ink-400">
            {t("domain.artifactsEmpty", { status: t(`status.${status}`) })}
          </p>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink-400">
            {t("domain.terms")}
            {termsQuery.data && (
              <span className="ml-2 text-ink-300">
                {t("domain.termCount", { count: termsQuery.data.length })}
              </span>
            )}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowDiff((v) => !v)}
              className="text-xs font-medium text-ink-500 underline decoration-dotted underline-offset-2 hover:text-ink-800"
            >
              {t("diff.compareVersions")}
            </button>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search.placeholder") ?? ""}
              aria-label={t("search.placeholder") ?? ""}
              className="w-64 max-w-full rounded border border-ink-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-signal"
            />
          </div>
        </div>

        {showDiff && (
          <DomainVersionDiff
            domain={domain}
            versionA={diffA}
            versionB={diffB}
            onChangeA={setDiffA}
            onChangeB={setDiffB}
          />
        )}

        <div className="mt-6">
          {termsQuery.isLoading && <LoadingBlock />}
          {termsQuery.isError && <ErrorBlock title={t("domainLoadFailed", { ns: "errors" })} />}
          {termsQuery.data && termsQuery.data.length === 0 && (
            <p className="rounded border border-dashed border-ink-200 px-4 py-6 text-sm text-ink-400">
              {t("domain.termsEmpty", { status: t(`status.${status}`) })}
            </p>
          )}
          {termsQuery.data && termsQuery.data.length > 0 && query.trim() && filtered.length === 0 && (
            <p className="text-sm text-ink-400">{t("search.empty", { query })}</p>
          )}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {filtered.map((term) => (
              <TermRow key={term.id} term={term} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
