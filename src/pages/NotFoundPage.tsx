import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function NotFoundPage() {
  const { t } = useTranslation("common");
  return (
    <div className="py-16 text-center">
      <p className="term-id text-6xl text-ink-200">404</p>
      <p className="mt-3 text-sm text-ink-500">This page, sector or term couldn't be found.</p>
      <Link to="/" className="mt-4 inline-block text-sm font-medium text-signal-dim hover:underline">
        {t("nav.home")}
      </Link>
    </div>
  );
}
