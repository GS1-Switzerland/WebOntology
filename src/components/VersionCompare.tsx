import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { diffLines } from "diff";
import clsx from "clsx";
import { useTermAtVersion } from "@/hooks/useRegistry";
import { VersionSelect } from "./VersionSelect";
import { LoadingBlock } from "./StateBlocks";
import { buildFieldRows } from "@/lib/termDiff";
import type { DomainEntry } from "@/types/registry";
import type { VersionOption } from "@/lib/registryClient";

function versionLabel(o: VersionOption, t: (key: string) => string): string {
  return o.status === "deprecated" ? (o.versionTag ?? "deprecated") : t(`status.${o.status}`);
}

function optionsEqual(a: VersionOption, b: VersionOption): boolean {
  return a.status === b.status && a.versionTag === b.versionTag;
}

export function VersionCompare({
  domain,
  localName,
  versionA,
  versionB,
  onChangeA,
  onChangeB,
}: {
  domain: DomainEntry;
  localName: string;
  versionA: VersionOption;
  versionB: VersionOption;
  onChangeA: (o: VersionOption) => void;
  onChangeB: (o: VersionOption) => void;
}) {
  const { t } = useTranslation("common");
  const termA = useTermAtVersion(domain, localName, versionA.status, versionA.versionTag);
  const termB = useTermAtVersion(domain, localName, versionB.status, versionB.versionTag);

  const rows = useMemo(() => buildFieldRows(termA.data, termB.data), [termA.data, termB.data]);

  const rawDiff = useMemo(() => {
    if (!termA.data && !termB.data) return [];
    const textA = termA.data ? JSON.stringify(termA.data.raw, null, 2) : "";
    const textB = termB.data ? JSON.stringify(termB.data.raw, null, 2) : "";
    return diffLines(textA, textB);
  }, [termA.data, termB.data]);

  return (
    <div className="mt-4 rounded border border-ink-100 bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <VersionSelect
          domain={domain}
          value={versionA}
          onChange={onChangeA}
          ariaLabel={t("compare.versionA") ?? "Version A"}
        />
        <span className="text-ink-300" aria-hidden>
          ⇄
        </span>
        <VersionSelect
          domain={domain}
          value={versionB}
          onChange={onChangeB}
          ariaLabel={t("compare.versionB") ?? "Version B"}
        />
        {optionsEqual(versionA, versionB) && (
          <span className="text-xs text-ink-400">{t("compare.samePicked")}</span>
        )}
      </div>

      {(termA.isLoading || termB.isLoading) && (
        <div className="mt-4">
          <LoadingBlock />
        </div>
      )}

      {!termA.isLoading && !termB.isLoading && (
        <>
          {!termA.data && (
            <p className="mt-4 text-sm text-ink-400">
              {t("compare.notFoundIn", { version: versionLabel(versionA, t) })}
            </p>
          )}
          {!termB.data && (
            <p className="mt-1 text-sm text-ink-400">
              {t("compare.notFoundIn", { version: versionLabel(versionB, t) })}
            </p>
          )}

          {(termA.data || termB.data) && (
            <>
              <table className="mt-4 w-full table-fixed border-collapse text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400">
                    <th className="w-1/5 py-2 pr-2">{t("compare.field")}</th>
                    <th className="w-2/5 py-2 pr-2">{versionLabel(versionA, t)}</th>
                    <th className="w-2/5 py-2">{versionLabel(versionB, t)}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.field}
                      className={clsx("border-b border-ink-50 align-top", row.changed && "bg-signal/5")}
                    >
                      <td className="term-id py-2 pr-2 text-xs text-ink-500">{row.field}</td>
                      <td className={clsx("py-2 pr-2 text-ink-700", row.changed && "text-ledger-rust")}>{row.a}</td>
                      <td className={clsx("py-2 text-ink-700", row.changed && "text-ledger-teal")}>{row.b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <details className="mt-4">
                <summary className="cursor-pointer select-none text-xs font-medium text-ink-500 hover:text-ink-800">
                  {t("compare.rawDiff")}
                </summary>
                <pre className="mt-2 overflow-x-auto rounded border border-ink-100 bg-ink-950 p-3 text-xs leading-relaxed">
                  {rawDiff.map((part, i) => (
                    <span
                      key={i}
                      className={clsx(
                        part.added && "bg-ledger-teal/20 text-ledger-teal",
                        part.removed && "bg-ledger-rust/20 text-ledger-rust",
                        !part.added && !part.removed && "text-ink-100"
                      )}
                    >
                      {part.value}
                    </span>
                  ))}
                </pre>
              </details>
            </>
          )}
        </>
      )}
    </div>
  );
}
