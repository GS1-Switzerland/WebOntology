import { useTranslation } from "react-i18next";
import clsx from "clsx";

const DOT_COLOR: Record<string, string> = {
  current: "bg-ledger-teal",
  stable: "bg-ledger-teal",
  staging: "bg-signal",
  deprecated: "bg-ink-400",
  reserved: "bg-ledger-rust",
};

export function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation("common");
  const label = t(`status.${status}`, { defaultValue: status });
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm border border-ink-200 bg-white px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-ink-600">
      <span className={clsx("status-dot", DOT_COLOR[status] ?? "bg-ink-400")} aria-hidden />
      {label}
    </span>
  );
}
