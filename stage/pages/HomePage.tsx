import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { useDomains, useManifest, useSectors } from "@/hooks/useRegistry";
import { domainDisplayLabel } from "@/config/domains";
import { SectorCard } from "@/components/SectorCard";
import { LoadingBlock, ErrorBlock } from "@/components/StateBlocks";

export function HomePage() {
  const { t } = useTranslation("common");
  const manifest = useManifest();
  const sectorsQuery = useSectors();
  const domainsQuery = useDomains();
  const sectors = sectorsQuery.data ?? [];
  const domainNames = domainsQuery.data ?? [];

  const domainsBySector = new Map<string, number>();
  manifest.data?.domains.forEach((d) => {
    if (!d.sectorCode) return;
    domainsBySector.set(d.sectorCode, (domainsBySector.get(d.sectorCode) ?? 0) + 1);
  });

  const populated = sectors.filter((s) => (domainsBySector.get(s.codeValue) ?? 0) > 0);
  const empty = sectors.filter((s) => (domainsBySector.get(s.codeValue) ?? 0) === 0);
  const crossSectorDomains = manifest.data?.domains.filter((d) => !d.sectorCode) ?? [];

  return (
    <div>
      <Helmet>
        <title>{t("app.title")}</title>
      </Helmet>

      <section className="mb-10 border-b border-ink-100 pb-8">
        <h1 className="max-w-2xl font-display text-3xl font-semibold text-ink-900">{t("app.title")}</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-500">{t("app.tagline")}</p>
      </section>

      {(manifest.isLoading || sectorsQuery.isLoading) && <LoadingBlock />}
      {manifest.isError && <ErrorBlock title={t("manifestLoadFailed", { ns: "errors" })} />}

      {manifest.data && sectorsQuery.data && (
        <>
          <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-ink-400">
            {t("sector.heading")}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {populated.map((sector) => (
              <SectorCard
                key={sector.codeValue}
                sector={sector}
                domains={manifest.data.domains.filter((d) => d.sectorCode === sector.codeValue)}
              />
            ))}
          </div>

          {empty.length > 0 && (
            <details className="mt-8 text-sm text-ink-400">
              <summary className="cursor-pointer select-none">
                {empty.length} {empty.length === 1 ? "sector" : "sectors"} without published domains yet
              </summary>
              <div className="mt-3 grid grid-cols-1 gap-3 opacity-60 sm:grid-cols-2 lg:grid-cols-3">
                {empty.map((sector) => (
                  <SectorCard key={sector.codeValue} sector={sector} domains={[]} />
                ))}
              </div>
            </details>
          )}

          {crossSectorDomains.length > 0 && (
            <>
              <h2 className="mb-4 mt-10 font-display text-sm font-semibold uppercase tracking-wide text-ink-400">
                {t("crossSector.heading")}
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {crossSectorDomains.map((d) => (
                  <Link
                    key={d.slug}
                    to={`/${d.slug}`}
                    className="group block rounded border border-ink-100 bg-white p-4 shadow-card transition hover:border-signal/50"
                  >
                    <h3 className="font-display text-[15px] font-medium text-ink-900 group-hover:text-signal-dim">
                      {domainDisplayLabel(domainNames, d.slug, d.label)}
                    </h3>
                    <p className="term-id mt-0.5 text-xs text-ink-400">/{d.slug}</p>
                    {d.description && <p className="mt-1.5 text-[13px] text-ink-500">{d.description}</p>}
                  </Link>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
