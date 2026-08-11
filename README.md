# GS1 Web Ontology & Vocabulary Explorer

A state-of-the-art single-page application that renders GS1 sector/domain
ontologies and vocabularies — published as versioned JSON-LD on GitHub
Pages — as a browsable, searchable, filterable, human-readable website,
and resolves individual term URLs (e.g. `https://gs1-epcis-reg.org/rail/my_term`)
with real HTTP content negotiation.

Stack: React 18 + TypeScript + Vite + Tailwind, React Router, TanStack
Query, i18next, Fuse.js, deployed to **Azure Static Web Apps** with a
companion Azure Function for content negotiation.

---

## 1. Why this isn't "just a React app"

A pure client-side SPA can render JSON-LD beautifully, but it **cannot**
by itself do two things the brief asks for:

1. **HTTP content negotiation** (serve HTML to browsers, JSON-LD/Turtle to
   Linked Data clients from the *same* URL) — negotiation has to happen
   before any HTML is sent, which means at the edge/server, not in
   client-side JavaScript.
2. **Directory discovery** — GitHub Pages is static file hosting with no
   directory-listing API, so the SPA has no way to ask "what domains and
   artifact files exist?" unless something publishes an index.

Both are solved the same way most production Linked Data sites solve
them: a small, stateless resolver in front of the static content. It
handles two distinct request shapes, both driven entirely by the
manifest:

1. **A direct artifact identifier** — a request path that matches one of
   the manifest's own `artifact.url` values, e.g.
   `https://gs1-epcis-reg.org/rail/voc/data/gs1RailVoc.jsonld`. Always
   303-redirects to that artifact's `source` (see §2a below), regardless
   of `Accept` — an explicit file reference names one representation
   directly, there's nothing to negotiate.
2. **A term/domain resolver path** — `/rail` or `/rail/geo` — negotiated
   by `Accept`: RDF media types get a 303 to the domain's vocabulary
   `source` (with a `#localName` fragment for term requests), `text/html`
   gets the SPA app shell.

```
                    ┌─────────────────────────────┐
 Browser  ────────▶ │ Azure Static Web App         │
 (Accept: text/html)│  staticwebapp.config.json    │
                     │  routes "/*" → /api/resolve │
                     └───────────────┬─────────────┘
                                     │
                                     ▼
                        ┌───────────────────────┐
                        │ Azure Function: resolve│
                        │  - reads Accept header │
                        │  - loads manifest.jsonld│──▶ GitHub Pages
                        │  - HTML → app shell    │    (JSON-LD source of truth)
                        │  - RDF  → 303 redirect │
                        └───────────┬────────────┘
                                    │ (HTML case)
                                    ▼
                        React Router takes over client-side,
                        fetches the domain's JSON-LD directly
                        from GitHub Pages, and renders it.
```

See `api/src/functions/resolve.js` for the implementation and
`staticwebapp.config.json` for the routing rules that wire it in.

---

## 2. The manifest: the one piece of required repo-side work

**Automating this:** [`scripts/generate-manifest.mjs`](./scripts/generate-manifest.mjs)
scans a published gh-pages checkout — `current/sectors/<sector>/<domain>/...`
(+ `current/shared/<domain>/...` for cross-sector domains) plus every
historical `versions/<tag>/...` snapshot — and writes
`registry/manifest.jsonld`. Built specifically against
`GS1-Switzerland/WebOntology`'s real `promote-to-prod.yml` and verified
against its actual, already-published manifest. Every past `versions/<tag>/`
becomes a `status: "deprecated"` entry with its own permanent, versioned
URL — this is what makes older versions browsable, per the original brief.
See [`scripts/PROMOTE_TO_PROD.md`](./scripts/PROMOTE_TO_PROD.md) for the
exact diff against the real workflow file. Everything below still applies
if you'd rather hand-maintain the file, or as background for what the
generator produces.

GitHub Pages cannot be directory-listed, so this app (and any other
consumer) needs a published **catalog** to discover what exists. Publish
one JSON-LD/JSON file at:

```
https://gs1-switzerland.github.io/WebOntology/registry/manifest.jsonld
```

Its contract is documented in [`manifest.schema.json`](./manifest.schema.json)
and a fully worked example is in [`public/sample-manifest.json`](./public/sample-manifest.json)
(covers the `rail` and `ind/bearing` domains from the brief, including a
`staging` version). In short: for every domain, list its sector code and
every published artifact (context / ontology / vocabulary / SHACL /
schema) with its URL, media type, version and lifecycle `status`
(`current` / `staging` / `deprecated`).

Regenerating this file should be part of your existing release CI in the
`WebOntology` / definitions repo — a simple script that walks the
repo's known publish locations and versions is enough; it doesn't need to
be clever, because the SPA never guesses at file locations, it only reads
this index.

**Each artifact carries two URLs, not one** — this trips people up, so to
be explicit:

| Field | Example | Meaning |
|---|---|---|
| `url` | `https://gs1-epcis-reg.org/rail/voc/data/gs1RailVoc.jsonld` | The stable **public identifier** — what other JSON-LD files' `@context`/`@id` point at, what the UI links to, what content negotiation redirects to. A "Cool URI"; it should never need to change. |
| `source` | `https://gs1-switzerland.github.io/WebOntology/current/sectors/tran/rail/vocabularies/gs1RailVoc.jsonld` | Where the bytes **actually live today**. The SPA's own `fetch()` calls and the resolver Function's redirects use this. Free to change (repo reorg, hosting migration) without breaking any external reference to `url`. |

The resolver Function indexes every `artifact.url` from the manifest and
303-redirects matching requests to the corresponding `source` — so
`url` paths never need to correspond to any real file layout on any
host; they're resolved purely through this manifest-driven lookup.

**Everything else in the app is driven entirely by this manifest and the
JSON-LD files it points to.** No sector, domain, term, or file name is
hard-coded anywhere except a bundled fallback snapshot, described next.

### 2b. Sector codelist — also fetched at runtime, not hard-coded

The GS1 Sector list (Section A–U) is published as its own resource,
separately from the domain manifest, since it changes far less often and
may be reused by other GS1 tooling:

```
https://gs1-switzerland.github.io/WebOntology/registry/sectors.jsonld
```

Contract: [`sectors.schema.json`](./sectors.schema.json). Worked example:
[`public/sample-sectors.json`](./public/sample-sectors.json) (the exact
21-sector list from the brief). The SPA fetches this at startup
(`loadSectors()` in `src/lib/registryClient.ts`, via `useSectors()`) and
treats it as the source of truth — **adding, renaming, or reordering a
sector needs no SPA code change or redeploy**, only an update to this file
in the definitions repo.

`src/config/sectors.ts` still exists, but only as a **bundled fallback
snapshot**: if the fetch fails (network hiccup, momentary GitHub Pages
outage, misconfigured `VITE_SECTORS_PATH`), the app quietly falls back to
it so sector navigation never breaks. It's a safety net, not the source
of truth — keep it roughly in sync, but it doesn't need to be perfectly
current.

### 2c. Domain codelist — same pattern, for domain display names

Analogous resource for domain display names (`registry/domains.jsonld`),
since the manifest's own `DomainEntry.label` is auto-generated by
`generate-manifest.mjs` (title-cased slug, or a sidecar override) and a
hand-curated name is often nicer:

```
https://gs1-switzerland.github.io/WebOntology/registry/domains.jsonld
```

Contract: [`domains.schema.json`](./domains.schema.json). Worked example:
[`public/sample-domains.json`](./public/sample-domains.json). Fetched via
`loadDomains()` / `useDomains()`, same resilience pattern (falls back to
`src/config/domains.ts` on failure). Wherever a domain name is shown
(home page, sector page, domain page, term page breadcrumbs), the
preference order is: `domains.jsonld`'s `codeName` first, then the
manifest's own `DomainEntry.label` — except the domain page's own H1
heading, which prefers the vocabulary's own `dc:title` (richer/more
specific, e.g. "GS1 Rail Vocabulary") ahead of both.

**Accepts two JSON shapes**, resolved by `extractCodeListArray()` in
`src/lib/registryClient.ts` (shared with `loadSectors()`): a bare
top-level array, or an object with the array under a `"domains"` key —
**or, for compatibility with an already-published hand-authored file, a
`"sectors"` key** (it was copied from a `sectors.jsonld` template and
kept that key name even though its entries are `Gs1Domain`, not
`Gs1Sector`). New files should prefer `"domains"` as the key name, but
either works with no code change.

---

## 2d. Browsing deprecated versions

The domain page (`src/pages/DomainPage.tsx`) always shows a Current /
Staging toggle (never hidden, even if one side has nothing published
yet — see `domain.artifactsEmpty` / `domain.termsEmpty`), plus a
Deprecated tab once a domain has `status: "deprecated"` artifacts (one
set per historical `versions/<tag>/` snapshot the generator produced),
with a version dropdown built from the distinct `versions/<tag>` segments
found in those artifacts' URLs (`deprecatedVersionTags()` / `versionTagOf()`
in `src/lib/registryClient.ts`). Selecting a version loads and parses only
that snapshot's own vocabulary files — historical versions are never
merged together into one term list.

## 2e. Comparing two versions of a term

The term detail page (`src/pages/TermPage.tsx`) has its own version
switcher (top right, next to the term title — shows which of
Current/Staging/a specific deprecated version is being viewed, reflected
in the URL as `?status=staging` or `?status=deprecated&v=v1.0.0` so a
specific version is linkable/shareable) plus a "Compare versions" toggle
that reveals `src/components/VersionCompare.tsx`: pick any two versions
(e.g. Current vs. Staging, or Current vs. a specific deprecated
`v0.1.2`) and get a field-by-field diff table (label, description, type,
`sw:term_status`, every relation predicate — union of both sides, changed
rows highlighted) plus a collapsible raw JSON-LD line diff (via `diff`/jsdiff).
Both sides load independently through `useTermAtVersion()`, so a term
that doesn't exist yet in one of the two versions is reported clearly
rather than erroring.

## 2f. What changed across a whole domain

The domain page's Terms section has its own "Compare versions" toggle,
revealing `src/components/DomainVersionDiff.tsx` — same two version
pickers, but diffs the *entire* term list at once (`diffTermSets()` in
`src/lib/termDiff.ts`, matched by `localName`) into three columns:
**Added** (only in the newer side), **Removed** (only in the older side),
**Changed** (present in both, at least one field differs — reusing the
same `buildFieldRows()` the single-term compare uses, so "changed" here
means exactly what it means there). Unchanged terms are counted but not
listed, to keep the panel focused. Clicking any "Changed" term links
straight into that term's own compare view
(`/{domain}/{term}?compareA=current&compareB=deprecated:v0.1.2`) with
both sides already selected — `TermPage.tsx` reads `compareA`/`compareB`
from the URL, seeds the compare panel from them, and opens it
automatically.

## 3. Generic JSON-LD rendering, like schema.org's term pages

`src/lib/vocabParser.ts` renders **any** JSON-LD vocabulary/ontology file
without per-vocabulary configuration — the same way schema.org's term
pages work off one generic template. It was written against, and unit
tested against (`src/lib/__tests__/vocabParser.test.ts`), the **real**
`gs1RailVoc.jsonld` payload, and correctly handles:

- `@graph`-wrapped documents
- multi-language literal objects (`{"@language":"en","@value":"…"}`)
- both array and single-value `@type`
- compact IRIs / CURIEs (`"rail:geo"`) expanded to full IRIs using the
  document's own inline `@context` prefix definitions — **without**
  fetching any remote `@context` URL, so the app keeps working even if
  `ref.gs1.org` or another upstream context host is slow or unreachable
- the GS1-specific `sw:term_status` extension (`stable` / `deprecated` / …),
  surfaced as a badge on term cards and detail pages
- separating the ontology/vocabulary header node (`voaf:Vocabulary` /
  `owl:Ontology`, i.e. the file's own title/version/license) from the
  browsable terms it contains

Run the parser tests any time you point the app at a new/unfamiliar
vocabulary shape:

```bash
npm run test
```

---

## 4. Cross-sector / cross-domain term usage

`buildCrossReferenceIndex()` in `src/lib/registryClient.ts` indexes every
loaded term by its expanded IRI across domains; `SearchPage` and
`TermRow` use it to show "Also used in rail, bearing" badges. This is
exhaustive once a domain's vocabulary has been loaded during the current
session (search loads everything up front); the single-term detail page
only checks domains already warmed in the query cache, to avoid an eager
fan-out fetch of every published vocabulary on every term view. If your
registry grows large, the cheapest fix is to add an optional `usedIn:
string[]` field per term to the manifest (or to the vocab files
themselves) so this becomes free — that's a natural extension point, not
a redesign.

---

## 5. i18n — ready to translate, English-only today

Every user-facing string goes through `useTranslation()` — there is no
hard-coded UI text in JSX. Namespaces:

| Namespace  | Contents                                             |
|------------|-------------------------------------------------------|
| `common`   | chrome, navigation, actions, term/domain/sector labels |
| `sectors`  | all 21 GS1 Section A–U labels                         |
| `registry` | artifact-kind labels, example domain names             |
| `errors`   | fetch/negotiation/not-found messaging                 |

Adding a language later is: drop `public/locales/<lng>/*.json` files with
the same keys, add the code to `SUPPORTED_LANGUAGES` in `src/config/env.ts`.
No component changes required. Vocabulary *content* itself (labels/
descriptions from the JSON-LD) is rendered as-is in whatever language the
source file provides — if you want localized vocabulary content, publish
`rdfs:label`/`rdfs:comment` as language-tagged arrays
(`[{"@language":"en",...},{"@language":"de",...}]`); the parser already
resolves the first available literal and is a natural place to add
`i18n.language`-aware selection later.

---

## 6. Security

- Strict `Content-Security-Policy` (script-src 'self', no inline scripts,
  `connect-src` scoped to `self` + the GitHub Pages definitions host),
  `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`,
  cross-origin isolation headers — see `globalHeaders` in
  `staticwebapp.config.json` (and the `<meta http-equiv>` fallback in
  `index.html` for direct file previews).
- No secrets, tokens, or write access anywhere in the client or the
  resolver Function — everything is read-only `fetch()` of public JSON-LD.
- The resolver Function validates and only ever redirects to URLs it read
  out of the manifest itself (never out of user-controlled input), so it
  can't be used as an open redirect.
- Dependencies are pinned to current major versions of actively
  maintained, widely used libraries (React, Vite, TanStack Query,
  i18next, react-router, Fuse.js) with no build step running third-party
  code beyond the standard Vite/TS toolchain.

---

## 7. Local development

```bash
npm install
cp .env.example .env.local   # point at your manifest, or leave the defaults
npm run dev
```

By default `VITE_DEFINITIONS_BASE_URL` points at
`https://gs1-switzerland.github.io/WebOntology`, so once `registry/manifest.jsonld`
is published there, `npm run dev` renders the live registry with no
further configuration. Until then, point `VITE_MANIFEST_PATH` at
`/sample-manifest.json` (served from this app's own `public/` folder) to
develop against the worked example.

```bash
npm run build     # production build (tsc -b && vite build) → dist/
npm run test      # vitest — includes the real-vocabulary parser tests
npm run lint       # eslint
```

To run the resolver Function locally (requires the Azure Functions Core
Tools and the Static Web Apps CLI):

```bash
cd api && npm install && npm start        # func start, http://localhost:7071
# in another terminal, from the project root:
npx @azure/static-web-apps-cli start dist --api-location api
```

---

## 8. Deploying to Azure

1. Create an **Azure Static Web Apps** resource (Standard or higher plan
   if you need a Function backend, which this does).
2. Connect it to your GitHub repo — Azure will offer to commit a workflow
   file; replace it with (or diff it against)
   `.github/workflows/azure-static-web-apps.yml`, which already points
   `app_location` at the repo root, `api_location` at `api/`, and
   `output_location` at `dist/`.
3. In the Static Web App's **Configuration**, set application settings
   (used by the Function at runtime):
   - `DEFINITIONS_BASE_URL` — e.g. `https://gs1-switzerland.github.io/WebOntology`
   - `MANIFEST_PATH` — e.g. `registry/manifest.jsonld`
4. In the repo's **Actions variables** (`vars`), set the matching
   `VITE_*` build-time variables so the client build and the Function
   agree on the same source. In GitHub: *Settings → Secrets and
   variables → Actions → Variables*.
5. Add a custom domain (e.g. `gs1-epcis-reg.org`) to the Static Web App
   and point its DNS per Azure's instructions. Content negotiation and
   303 redirects work identically on the custom domain, since the
   resolver Function reads the request's `Host` header rather than
   assuming the `*.azurestaticapps.net` hostname.
6. Push to `main`. The included staging-slot pattern in the workflow
   (pull-request preview environments) mirrors the JSON-LD "staging vs
   current" distinction described in the brief, so you can preview a
   registry UI change and a staging vocabulary version side by side
   before promoting either.

---

## 9. What's deliberately out of scope / next steps

- **Per-term dereferencing**: the resolver currently redirects RDF
  clients to `<vocabulary-artifact-url>#<term>`. If your repository
  instead publishes one file per term, swap that one line in
  `api/src/functions/resolve.js` (`MEDIA_TYPE_TO_KIND` / the `location`
  computation) for a manifest-driven per-term URL lookup.
- **Full JSON-LD expansion** (via `jsonld.js` and remote `@context`
  fetching) was deliberately avoided at runtime in favour of a small,
  dependency-free inline-`@context` prefix expander — it's faster, has no
  network dependency on third-party context hosts, and is sufficient for
  human-readable rendering. If you later need fully spec-compliant
  expansion (e.g. to validate SHACL shapes client-side), add `jsonld.js`
  back as a dependency and call it only where exact RDF semantics matter.
- **SSR/prerendering** for SEO of individual term pages isn't included;
  the resolver's app-shell response already gives crawlers a stable
  `200 text/html` at the canonical URL, and a static prerender pass (e.g.
  via `vite-plugin-ssg` reading the same manifest) is a reasonable
  follow-up once the term count is large enough to matter for indexing.
