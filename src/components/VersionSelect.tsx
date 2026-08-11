import { useTranslation } from "react-i18next";
import { listVersionOptions, type VersionOption } from "@/lib/registryClient";
import type { DomainEntry } from "@/types/registry";

export function optionKey(o: VersionOption): string {
  return o.status === "deprecated" ? `deprecated:${o.versionTag}` : o.status;
}

function optionLabel(o: VersionOption, t: (key: string) => string): string {
  return o.status === "deprecated" ? (o.versionTag ?? "deprecated") : t(`status.${o.status}`);
}

export function versionOptionFromKey(key: string): VersionOption {
  if (key.startsWith("deprecated:")) return { status: "deprecated", versionTag: key.slice("deprecated:".length) };
  return { status: key as VersionOption["status"] };
}

export function VersionSelect({
  domain,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  domain: DomainEntry;
  value: VersionOption;
  onChange: (option: VersionOption) => void;
  ariaLabel: string;
  className?: string;
}) {
  const { t } = useTranslation("common");
  const options = listVersionOptions(domain);

  return (
    <select
      value={optionKey(value)}
      onChange={(e) => onChange(versionOptionFromKey(e.target.value))}
      aria-label={ariaLabel}
      className={className ?? "rounded border border-ink-100 bg-white px-2 py-1.5 text-xs text-ink-700"}
    >
      {options.map((o) => (
        <option key={optionKey(o)} value={optionKey(o)}>
          {optionLabel(o, t)}
        </option>
      ))}
    </select>
  );
}
