# Wiring `generate-manifest.mjs` into `promote-to-prod.yml`

This is written against your actual, real `promote-to-prod.yml`. Two
changes, both additive — nothing existing is removed or reordered.

## 1. Add `scripts/generate-manifest.mjs` to the repo

Copy [`scripts/generate-manifest.mjs`](./generate-manifest.mjs) from
`gs1-ontology-explorer` into `WebOntology` at the same path,
`scripts/generate-manifest.mjs`. No dependencies (only Node's built-in
`fs`/`path`/`child_process`), so no `npm install` step is needed for it.

Also copy [`manifest.schema.json`](../manifest.schema.json) (from the repo
root of `gs1-ontology-explorer`) into `WebOntology` at `registry/manifest.schema.json`
— the generated manifest's `"$schema": "manifest.schema.json"` field
resolves relative to itself, so it should sit right next to
`registry/manifest.jsonld`.

## 2. Add a Node setup step + the generator call

```diff
 jobs:
   promote:
     runs-on: ubuntu-latest
     steps:
       - name: Checkout source
         uses: actions/checkout@v4
         with:
           fetch-depth: 0
       - name: Prepare public (copy src)
         run: |
           rm -rf public
           mkdir -p public
           # Copy all files from src into public (no build step)
           cp -a src/. public/ || true
       - name: Create tag (optional)
         env:
           GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
           VERSION: ${{ github.event.inputs.version }}
         run: |
           set -e
           # Create annotated tag and push (skip if tag already exists)
           if git ls-remote --tags origin | grep "refs/tags/${VERSION}" >/dev/null; then
             echo "Tag ${VERSION} already exists, skipping tag creation."
           else
             git tag -a "${VERSION}" -m "Release ${VERSION}"
             git push origin "${VERSION}"
           fi
+      - name: Setup Node
+        uses: actions/setup-node@v4
+        with:
+          node-version: 20
       - name: Deploy to gh-pages (versions + current)
         env:
           GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
           REPO: ${{ github.repository }}
           VERSION: ${{ github.event.inputs.version }}
         run: |
           set -e
           git config --global user.name "github-actions[bot]"
           git config --global user.email "41898282+github-actions[bot]@users.noreply.github.com"
           if git ls-remote --exit-code --heads "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO}.git" gh-pages; then
             git clone --branch gh-pages "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO}.git" gh-pages
           else
             git clone "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO}.git" gh-pages
             cd gh-pages
             git checkout --orphan gh-pages
             git rm -rf . || true
             git commit --allow-empty -m "Initialize gh-pages"
             git push origin gh-pages
             cd ..
             git clone --branch gh-pages "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO}.git" gh-pages
           fi
           # Preserve CNAME if exists in repository root
           cp -n CNAME gh-pages/ 2>/dev/null || true
           # Write versioned folder
           rm -rf "gh-pages/versions/${VERSION}"
           mkdir -p "gh-pages/versions/${VERSION}"
           cp -a public/. "gh-pages/versions/${VERSION}/"
           # Update current
           rm -rf "gh-pages/current"
           mkdir -p "gh-pages/current"
           cp -a public/. "gh-pages/current/"
+          # Regenerate the registry manifest from the final gh-pages content
+          # (current/ + every versions/<tag>/ snapshot) before committing.
+          GH_PAGES_ROOT="$(pwd)/gh-pages" \
+          RELEASE_VERSION="${VERSION}" \
+          PUBLIC_BASE_URL="https://gs1-epcis-reg.org" \
+          GH_PAGES_BASE="https://gs1-switzerland.github.io/WebOntology" \
+          node "$(pwd)/scripts/generate-manifest.mjs"
           cd gh-pages
           git add -A
           if git diff --cached --quiet; then
             echo "No changes to deploy to gh-pages for ${VERSION}"
           else
             git commit -m "Promote ${VERSION} to production"
             git push origin gh-pages
           fi
```

That's it — nothing else changes. `fetch-depth: 0` is already set on your
checkout, and the generator's own `git clone` of `gh-pages` (done by your
existing step, without `--depth`) gets full history too, so the
`git log`-based `publishedAt` dates resolve correctly out of the box.

## 3. Same patch for `deploy-stage.yml`

You also sent `deploy-stage.yml` (triggered on push to the `stage`
branch) — it writes straight to `gh-pages/stage/`, flat, no version
history, no manifest regeneration today. Same shape of patch:

```diff
       - name: Prepare public (copy src)
         run: |
           rm -rf public
           mkdir -p public
           # Copy all files from src into public (no build step)
           cp -a src/. public/ || true
+      - name: Setup Node
+        uses: actions/setup-node@v4
+        with:
+          node-version: 20
       - name: Deploy to gh-pages/stage
         env:
           GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
           REPO: ${{ github.repository }}
           SHA: ${{ github.sha }}
         run: |
           set -e
           git config --global user.name "github-actions[bot]"
           git config --global user.email "41898282+github-actions[bot]@users.noreply.github.com"
           if git ls-remote --exit-code --heads "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO}.git" gh-pages; then
             git clone --branch gh-pages "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO}.git" gh-pages
           else
             git clone "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO}.git" gh-pages
             cd gh-pages
             git checkout --orphan gh-pages
             git rm -rf . || true
             git commit --allow-empty -m "Initialize gh-pages"
             git push origin gh-pages
             cd ..
             git clone --branch gh-pages "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO}.git" gh-pages
           fi
           cp -n CNAME gh-pages/ 2>/dev/null || true
           rm -rf gh-pages/stage
           mkdir -p gh-pages/stage
           cp -a public/. gh-pages/stage/
+          # Regenerate the registry manifest so staging changes are
+          # reflected immediately, not just on the next prod promotion.
+          GH_PAGES_ROOT="$(pwd)/gh-pages" \
+          PUBLIC_BASE_URL="https://gs1-epcis-reg.org" \
+          GH_PAGES_BASE="https://gs1-switzerland.github.io/WebOntology" \
+          node "$(pwd)/scripts/generate-manifest.mjs"
           cd gh-pages
           git add -A
           if git diff --cached --quiet; then
             echo "No changes to deploy to gh-pages/stage"
           else
             git commit -m "Deploy staging: ${SHA}"
             git push origin gh-pages
           fi
```

No `RELEASE_VERSION` here — this workflow has no version input, and
doesn't need one: staging artifacts get their version from each file's
own `owl:versionInfo` (e.g. `"1.4.0-rc1"`), same as everywhere else.

**Important interaction between the two workflows:** both
`promote-to-prod.yml` and `deploy-stage.yml` clone and push to the same
`gh-pages` branch independently. If someone promotes to prod at the same
moment someone else pushes to `stage`, whichever `git push` lands second
will fail (non-fast-forward) and that job's manifest regeneration is
lost until the next run of either workflow — not a regression this patch
introduces (your existing `versions`/`current` writes have the same race
today), just worth knowing since it now also affects manifest freshness.
If that turns out to matter in practice, the fix is a `git pull --rebase`
retry loop around each `git push origin gh-pages`, not a manifest-script
change.

## 4. What this produces, concretely

Given your real layout (`src/sectors/tran/rail/...`,
`src/sectors/manu/bearing/...`, verified against your already-published
`registry/manifest.jsonld`) plus a `src/shared/<domain>/...` folder for
cross-sector ontologies (confirmed — no `sectorCode` at all for those; the
SPA groups them under a "Cross-Sector" section instead of a GS1 sector):

- **`current/`** → `status: "current"` artifacts, at the exact same public
  URLs your hand-written example already used
  (`https://gs1-epcis-reg.org/rail/rail-context.jsonld`, etc.) — **one
  correction**: `source` now points at `.../WebOntology/current/sectors/...`,
  not `.../WebOntology/src/sectors/...` — the `src/` folder is never
  published as-is, it gets flattened into `current/` by your own
  "Prepare public" step, so `src/` was never actually a live URL. If you
  want that fixed in the manifest that's already live in `gh-pages` today,
  just re-run promote-to-prod once this is wired in and it'll overwrite it
  correctly.
- **Every existing `versions/<tag>/`** (all of them, not just the one just
  promoted — the deploy script never deletes old version folders) →
  `status: "deprecated"`, each with its own distinct, permanently
  resolvable public URL: `https://gs1-epcis-reg.org/rail/versions/v1.1.0/voc/data/gs1RailVoc.jsonld`.
  This is exactly the "veraltete Versionen" browsing the original brief
  asked for — the SPA's domain page now has a version dropdown for these.
  Capped at the 5 most recent by commit date (`MAX_DEPRECATED_VERSIONS`
  env var) so the manifest doesn't grow forever — raise it if you want
  full history.
- **`gh-pages/stage/`** (written by `deploy-stage.yml` on every push to the
  `stage` branch) → `status: "staging"`, public URL
  `https://gs1-epcis-reg.org/rail/staging/voc/data/gs1RailVoc.jsonld`
  (the "staging" word in the *public* URL is just a naming choice for
  readability — it doesn't have to match the real folder name `stage/` on
  disk, and doesn't; `source` correctly points at `.../gh-pages/stage/...`).
  Only reflects whatever's currently in `stage/` — apply the patch in
  section 3 above to `deploy-stage.yml` too, or staging entries will only
  refresh whenever `promote-to-prod` next happens to run.

## Sidecar overrides

Version/description are inferred automatically from each vocabulary's own
`owl:versionInfo` / `dc:description`. For labels that can't be reliably
inferred from a filename (like your hand-written `"SHACL shapes — generic
EPCIS profile"`), drop a `manifest.meta.json` next to the domain folder
**in `src/`** (it travels along automatically via the existing `cp -a`,
into both `current/` and every `versions/<tag>/`):

```json
// src/sectors/tran/rail/manifest.meta.json
{
  "label": "Rail",
  "description": "Vocabulary and SHACL shapes for rail logistics EPCIS events.",
  "artifacts": {
    "Rail-EPCIS-SHACL-Generic.json": { "label": "SHACL shapes — generic EPCIS profile" },
    "Rail-SHACL.json": { "label": "SHACL shapes — rail profile" }
  }
}
```

This file is only read by the generator — it's never linked to or fetched
by the SPA itself.

## Verified before delivery

The generator was tested against a fixture that reproduces two real
promotions (`v1.0.0` without SHACL, `v1.1.0` adding SHACL — mirroring your
actual rail domain's history) and asserts:
- `current/` output matches your real, already-published
  `registry/manifest.jsonld` field-for-field on `url`, `mediaType`,
  `kind`, and version (labels match once the sidecar override above is in
  place).
- Each `versions/<tag>/` becomes a distinct `deprecated` entry with a
  unique public URL (no collisions even when a version happens to be
  content-identical to `current`).
- `gh-pages/stage/` becomes `staging` entries with `source` correctly
  pointing at `stage/`, independent of and never mixed up with `current/`.
- `src/shared/<domain>/` domains never get a `sectorCode` key.

Run `npm run test:scripts` in `gs1-ontology-explorer` to re-run this
yourself, or after copying the script into `WebOntology`.
