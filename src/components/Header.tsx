import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function Header() {
  const { t } = useTranslation("common");
  const location = useLocation();

  return (
    <header className="border-b border-ink-700 bg-ink-900 text-ink-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link to="/" className="group flex items-center gap-3">
          <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden className="shrink-0">
            <rect x="1" y="1" width="26" height="26" rx="3" fill="none" stroke="#C97A2B" strokeWidth="1.5" />
            <path d="M6 20 L14 8 L22 20" fill="none" stroke="#C97A2B" strokeWidth="1.5" strokeLinejoin="round" />
            <circle cx="14" cy="8" r="1.6" fill="#C97A2B" />
          </svg>
          <span className="font-display text-[15px] font-semibold leading-tight tracking-tight">
            {t("app.title")}
          </span>
        </Link>

        <nav className="flex items-center gap-5 text-sm">
          <Link
            to="/"
            className={location.pathname === "/" ? "text-signal-light" : "text-ink-200 hover:text-ink-50"}
          >
            {t("nav.home")}
          </Link>
          <Link
            to="/search"
            className={location.pathname.startsWith("/search") ? "text-signal-light" : "text-ink-200 hover:text-ink-50"}
          >
            {t("nav.search")}
          </Link>
        </nav>
      </div>
    </header>
  );
}
