import { Routes, Route } from "react-router-dom";
import { Header } from "@/components/Header";
import { HomePage } from "@/pages/HomePage";
import { SectorPage } from "@/pages/SectorPage";
import { DomainPage } from "@/pages/DomainPage";
import { TermPage } from "@/pages/TermPage";
import { SearchPage } from "@/pages/SearchPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

/**
 * Route shape mirrors the public resolver paths described in the brief:
 *   /rail/my_term  -> domain "rail", term "my_term"
 *   /rail          -> domain overview
 *   /sector/tran   -> sector overview
 * The SPA itself is generally served from a documentation host; the public
 * resolver host (gs1-epcis-reg.org) proxies /{domain}/{term} requests here
 * for the HTML case and to the raw JSON-LD for the machine-readable case —
 * see api/resolve and staticwebapp.config.json for that split.
 */
export function App() {
  return (
    <div className="min-h-screen bg-ink-50">
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/sector/:sectorCode" element={<SectorPage />} />
          <Route path="/:domainSlug" element={<DomainPage />} />
          <Route path="/:domainSlug/:termName" element={<TermPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <footer className="border-t border-ink-100 py-8 text-center text-xs text-ink-400">
        GS1 Switzerland — definitions maintained and versioned on GitHub.
      </footer>
    </div>
  );
}
