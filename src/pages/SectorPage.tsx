import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { sectorByCode } from "@/config/sectors";
import { domainDisplayLabel } from "@/config/domains";
import { useDomains, useManifest, useSectors } from "@/hooks/useRegistry";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LoadingBlock, ErrorBlock } from "@/components/StateBlocks";
import { NotFoundPage } from "./NotFoundPage";

export function SectorPage() {
  const { sectorCode = "" } = useParams();
  const { t } = useTranslation(["common", "sectors"]);
  const manifest = useManifest();
  const sectorsQuery = useSectors();
  const domainsQuery = useDomains();
  const domainNames = domainsQuery.data ?? [];

  if (sectorsQuery.isLoading) return <LoadingBlock />;

  const sector = sectorByCode(sectorsQuery.data ?? [], sectorCode);
  if (!sector) return <NotFoundPage />;

  const label = t(`sector.${sector.codeValue}`, { ns: "sectors" });
  const domains = manifest.data?.domains.filter((d) => d.sectorCode === sector.codeValue) ?? [];

  return (
    <div>
      <Helmet>
        <title>{`${label} — ${t("app.title")}`}</title>
      </Helmet>
      <Breadcrumbs items={[{ label: t("breadcrumb.home"), to: "/" }, { label }]} />

      <h1 className="font-display text-2xl font-semibold text-ink-900">{label}</h1>
      <p className="term-id mt-1 text-xs text-ink-400">{sector.codeValue}</p>

      <div className="mt-8">
        {manifest.isLoading && <LoadingBlock />}
        {manifest.isError && <ErrorBlock title={t("manifestLoadFailed", { ns: "errors" })} />}
        {manifest.data && domains.length === 0 && (
          <p className="text-sm text-ink-400">{t("sector.empty")}</p>
        )}
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {domains.map((d) => (
            <li key={d.slug}>
              <Link
                to={`/${d.slug}`}
                className="group block rounded border border-ink-100 bg-white p-4 shadow-card transition hover:border-signal/50"
              >
                <h2 className="font-display text-[15px] font-medium text-ink-900 group-hover:text-signal-dim">
                  {domainDisplayLabel(domainNames, d.slug, d.label)}
                </h2>
                <p className="term-id mt-0.5 text-xs text-ink-400">/{d.slug}</p>
                {d.description && <p className="mt-1.5 text-[13px] text-ink-500">{d.description}</p>}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
