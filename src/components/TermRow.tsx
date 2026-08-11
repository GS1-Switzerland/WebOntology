import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { VocabTerm } from "@/types/registry";
import { StatusBadge } from "./StatusBadge";

export function TermRow({
  term,
  crossReferencedDomains,
}: {
  term: VocabTerm;
  crossReferencedDomains?: string[];
}) {
  const { t } = useTranslation("common");
  const primaryType = term.types.find((ty) => !ty.startsWith("owl:")) ?? term.types[0];

  return (
    <Link
      to={`/${term.domainSlug}/${term.localName}`}
      className="group block rounded border border-ink-100 bg-white px-4 py-3 shadow-card transition hover:border-signal/50"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-display text-[15px] font-medium text-ink-900 group-hover:text-signal-dim">
              {term.label}
            </h3>
            {term.termStatus === "deprecated" && <StatusBadge status="deprecated" />}
          </div>
          <p className="term-id mt-0.5 truncate text-xs text-ink-400">{term.localName}</p>
          {term.description && (
            <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-ink-500">{term.description}</p>
          )}
        </div>
        {primaryType && (
          <span className="shrink-0 rounded-sm border border-ink-100 bg-ink-50 px-1.5 py-0.5 text-[11px] text-ink-500">
            {primaryType.replace(/^[a-z]+:/, "")}
          </span>
        )}
      </div>
      {crossReferencedDomains && crossReferencedDomains.length > 1 && (
        <p className="mt-2 text-[11px] text-signal-dim">
          {t("domain.usedInOtherDomains", { domains: crossReferencedDomains.join(", ") })}
        </p>
      )}
    </Link>
  );
}
