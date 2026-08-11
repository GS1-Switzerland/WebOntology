import { useTranslation } from "react-i18next";

export function LoadingBlock({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 rounded border border-ink-100 bg-white px-4 py-6 text-sm text-ink-500">
      <span
        className="h-3 w-3 animate-pulse rounded-full bg-signal"
        aria-hidden
      />
      {label ?? "Loading…"}
    </div>
  );
}

export function ErrorBlock({ title, detail }: { title: string; detail?: string }) {
  const { t } = useTranslation("errors");
  return (
    <div role="alert" className="rounded border border-ledger-rust/40 bg-ledger-rust/5 px-4 py-4 text-sm text-ink-800">
      <p className="font-medium text-ledger-rust">{title}</p>
      {detail && <p className="mt-1 text-ink-500">{detail}</p>}
      <p className="mt-2 text-xs text-ink-400">{t("retryHint", { defaultValue: "Try reloading the page. If the problem persists, the upstream GitHub Pages source may be unreachable." })}</p>
    </div>
  );
}
