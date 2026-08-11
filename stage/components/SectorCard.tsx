import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Gs1Sector } from "@/config/sectors";
import type { DomainEntry } from "@/types/registry";

export function SectorCard({ sector, domains }: { sector: Gs1Sector; domains: DomainEntry[] }) {
  const { t } = useTranslation(["common", "sectors"]);
  const label = t(`sector.${sector.codeValue}`, { ns: "sectors" });
  const [heading, ...rest] = label.split(" – ");

  return (
    <Link
      to={`/sector/${sector.codeValue.toLowerCase()}`}
      className="group flex flex-col justify-between rounded border border-ink-100 bg-white p-4 shadow-card transition hover:border-signal/50"
    >
      <div>
        <p className="term-id text-[11px] text-ink-400">{sector.codeValue}</p>
        <h3 className="mt-1 font-display text-[15px] font-medium leading-snug text-ink-900 group-hover:text-signal-dim">
          {heading}
        </h3>
        {rest.length > 0 && <p className="mt-1 text-[13px] leading-snug text-ink-500">{rest.join(" – ")}</p>}
      </div>
      <p className="mt-3 text-xs text-ink-400">
        {domains.length === 0
          ? t("sector.empty")
          : t("sector.domainCount", { count: domains.length })}
      </p>
    </Link>
  );
}
