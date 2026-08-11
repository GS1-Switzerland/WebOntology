import { useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { useDomainTermsAtVersion } from "@/hooks/useRegistry";
import { VersionSelect, optionKey } from "./VersionSelect";
import { LoadingBlock } from "./StateBlocks";
import { diffTermSets } from "@/lib/termDiff";
import type { DomainEntry } from "@/types/registry";
import type { VersionOption } from "@/lib/registryClient";

export function DomainVersionDiff({
  domain,
  versionA,
  versionB,
  onChangeA,
  onChangeB,
}: {
  domain: DomainEntry;
  versionA: VersionOption;
  versionB: VersionOption;
  onChangeA: (o: VersionOption) => void;
  onChangeB: (o: VersionOption) => void;
}) {
  const { t } = useTranslation("common");
  const termsA = useDomainTermsAtVersion(domain, versionA.status, versionA.versionTag);
  const termsB = useDomainTermsAtVersion(domain, versionB.status, versionB.versionTag);

  const diff = useMemo(
    () => (termsA.data && termsB.data ? diffTermSets(termsA.data, termsB.data) : undefined),
    [termsA.data, termsB.data]
  );

  const compareLink = (localName: string) =>
    `/${domain.slug}/${localName}?compareA=${optionKey(versionA)}&compareB=${optionKey(versionB)}`;

  return (
    <div className="mt-4 rounded border border-ink-100 bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <VersionSelect domain={domain} value={versionA} onChange={onChangeA} ariaLabel={t("compare.versionA") ?? "Version A"} />
        <span className="text-ink-300" aria-hidden>
          ⇄
        </span>
        <VersionSelect domain={domain} value={versionB} onChange={onChangeB} ariaLabel={t("compare.versionB") ?? "Version B"} />
      </div>

      {(termsA.isLoading || termsB.isLoading) && (
        <div className="mt-4">
          <LoadingBlock />
        </div>
      )}

      {diff && (
        <>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <span className="text-ledger-teal">
              +{diff.added.length} {t("diff.added")}
            </span>
            <span className="text-signal-dim">
              ~{diff.changed.length} {t("diff.changed")}
            </span>
            <span className="text-ledger-rust">
              −{diff.removed.length} {t("diff.removed")}
            </span>
            <span className="text-ink-400">
              {diff.unchangedCount} {t("diff.unchanged")}
            </span>
          </div>

          {diff.added.length === 0 && diff.changed.length === 0 && diff.removed.length === 0 && (
            <p className="mt-4 text-sm text-ink-400">{t("diff.noDifferences")}</p>
          )}

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <DiffColumn title={t("diff.added")} tone="teal" empty={diff.added.length === 0}>
              {diff.added.map((term) => (
                <li key={term.id} className="term-id truncate text-ink-700">
                  {term.label}
                </li>
              ))}
            </DiffColumn>

            <DiffColumn title={t("diff.changed")} tone="signal" empty={diff.changed.length === 0}>
              {diff.changed.map(({ a, b }) => (
                <li key={a.id}>
                  <Link to={compareLink(a.localName)} className="term-id block truncate text-signal-dim hover:underline">
                    {b.label}
                  </Link>
                </li>
              ))}
            </DiffColumn>

            <DiffColumn title={t("diff.removed")} tone="rust" empty={diff.removed.length === 0}>
              {diff.removed.map((term) => (
                <li key={term.id} className="term-id truncate text-ink-400 line-through decoration-1">
                  {term.label}
                </li>
              ))}
            </DiffColumn>
          </div>
        </>
      )}
    </div>
  );
}

function DiffColumn({
  title,
  tone,
  empty,
  children,
}: {
  title: string;
  tone: "teal" | "signal" | "rust";
  empty: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <h3
        className={clsx(
          "term-id mb-2 text-xs font-semibold uppercase tracking-wide",
          tone === "teal" && "text-ledger-teal",
          tone === "signal" && "text-signal-dim",
          tone === "rust" && "text-ledger-rust"
        )}
      >
        {title}
      </h3>
      {empty ? (
        <p className="text-xs text-ink-300">—</p>
      ) : (
        <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">{children}</ul>
      )}
    </div>
  );
}
