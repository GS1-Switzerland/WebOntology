import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { useManifest, useAllDomainTerms } from "@/hooks/useRegistry";
import { buildSearchIndex, flattenTermMap } from "@/lib/search";
import { buildCrossReferenceIndex } from "@/lib/registryClient";
import { TermRow } from "@/components/TermRow";
import { LoadingBlock, ErrorBlock } from "@/components/StateBlocks";

export function SearchPage() {
  const { t } = useTranslation(["common", "errors"]);
  const [query, setQuery] = useState("");
  const manifest = useManifest();
  const allTerms = useAllDomainTerms(manifest.data?.domains);

  const crossRefIndex = useMemo(
    () => (allTerms.data ? buildCrossReferenceIndex(allTerms.data) : new Map<string, Set<string>>()),
    [allTerms.data]
  );

  const fuse = useMemo(() => {
    if (!allTerms.data) return undefined;
    return buildSearchIndex(flattenTermMap(allTerms.data));
  }, [allTerms.data]);

  const results = useMemo(() => {
    if (!fuse || !query.trim()) return [];
    return fuse.search(query, { limit: 50 }).map((r) => r.item);
  }, [fuse, query]);

  return (
    <div>
      <Helmet>
        <title>{`${t("nav.search")} — ${t("app.title")}`}</title>
      </Helmet>

      <h1 className="font-display text-2xl font-semibold text-ink-900">{t("nav.search")}</h1>

      <input
        autoFocus
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("search.placeholder") ?? ""}
        aria-label={t("search.placeholder") ?? ""}
        className="mt-4 w-full max-w-xl rounded border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-signal"
      />

      <div className="mt-6">
        {(manifest.isLoading || allTerms.isLoading) && <LoadingBlock label="Loading vocabularies across all published domains…" />}
        {(manifest.isError || allTerms.isError) && <ErrorBlock title={t("manifestLoadFailed", { ns: "errors" })} />}

        {!query.trim() && !manifest.isLoading && <p className="text-sm text-ink-400">{t("search.noQuery")}</p>}

        {query.trim() && (
          <>
            <p className="mb-3 text-xs text-ink-400">{t("search.results", { count: results.length })}</p>
            {results.length === 0 && <p className="text-sm text-ink-400">{t("search.empty", { query })}</p>}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {results.map((term) => (
                <TermRow
                  key={`${term.domainSlug}:${term.id}`}
                  term={term}
                  crossReferencedDomains={Array.from(crossRefIndex.get(term.id) ?? [])}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
