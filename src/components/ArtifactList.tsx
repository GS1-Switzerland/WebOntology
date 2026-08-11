import { useTranslation } from "react-i18next";
import type { Artifact } from "@/types/registry";
import { StatusBadge } from "./StatusBadge";

export function ArtifactList({ artifacts }: { artifacts: Artifact[] }) {
  const { t } = useTranslation(["common", "registry"]);

  return (
    <ul className="divide-y divide-ink-100 rounded border border-ink-100 bg-white">
      {artifacts.map((a) => (
        <li key={a.url} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink-800">{a.label}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-400">
              <span>{t(`artifact.kind.${a.kind}`, { ns: "registry", defaultValue: a.kind })}</span>
              <span aria-hidden>·</span>
              <span className="term-id">{a.mediaType}</span>
              <span aria-hidden>·</span>
              <span>v{a.version}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={a.status} />
            <a
              href={a.url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-xs font-medium text-signal-dim hover:underline"
            >
              {t("domain.download")} ↗
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}
