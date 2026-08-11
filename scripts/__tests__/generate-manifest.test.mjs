// Run with: node --test scripts/__tests__/generate-manifest.test.mjs
//
// Builds a throwaway gh-pages-shaped fixture (current/ + versions/<tag>/,
// mirroring GS1-Switzerland/WebOntology's real promote-to-prod.yml output)
// and asserts the generator reproduces the real, already-published
// manifest.jsonld's field shape for "current", plus correct "deprecated"
// entries per historical versions/<tag>/ snapshot.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function git(args, cwd) {
  execFileSync("git", args, { cwd });
}

function writeRailFiles(base, { version, withShacl }) {
  const railDir = path.join(base, "sectors", "tran", "rail");
  mkdirSync(path.join(railDir, "ontologies"), { recursive: true });
  mkdirSync(path.join(railDir, "vocabularies"), { recursive: true });
  writeFileSync(
    path.join(railDir, "ontologies", "rail-context.jsonld"),
    JSON.stringify({ "@context": { rail: "https://gs1-epcis-reg.org/rail/voc/data#" } })
  );
  writeFileSync(
    path.join(railDir, "vocabularies", "gs1RailVoc.jsonld"),
    JSON.stringify({
      "@graph": [
        {
          "@id": "rail:",
          "@type": ["voaf:Vocabulary", "owl:Ontology"],
          "dc:title": "GS1 Rail Vocabulary",
          "dc:description": { "@language": "en", "@value": "Test description." },
          "owl:versionInfo": version,
        },
        { "@id": "rail:geo", "@type": ["owl:DatatypeProperty"], "rdfs:label": "Geo" },
      ],
    })
  );
  if (withShacl) {
    mkdirSync(path.join(railDir, "shacl"), { recursive: true });
    writeFileSync(path.join(railDir, "shacl", "Rail-SHACL.json"), JSON.stringify({ shapes: [] }));
  }
}

/** Builds a two-promotion gh-pages fixture: v1.0.0 (no SHACL) -> v1.1.0 (adds SHACL). */
function makeTwoPromotionFixture() {
  const root = mkdtempSync(path.join(tmpdir(), "gh-pages-fixture-"));
  git(["init", "-q", "."], root);

  // Promotion 1: v1.0.0
  writeRailFiles(path.join(root, "current"), { version: "1.0.0", withShacl: false });
  git(["add", "-A"], root);
  git(["-c", "user.email=t@t.com", "-c", "user.name=t", "commit", "-q", "-m", "v1.0.0"], root);
  writeRailFiles(path.join(root, "versions", "v1.0.0"), { version: "1.0.0", withShacl: false });
  git(["add", "-A"], root);
  git(["-c", "user.email=t@t.com", "-c", "user.name=t", "commit", "-q", "-m", "snapshot v1.0.0"], root);

  // Promotion 2: v1.1.0 — current/ is fully replaced, a new versions/v1.1.0/ appears
  rmSync(path.join(root, "current"), { recursive: true, force: true });
  writeRailFiles(path.join(root, "current"), { version: "1.1.0", withShacl: true });
  writeRailFiles(path.join(root, "versions", "v1.1.0"), { version: "1.1.0", withShacl: true });
  git(["add", "-A"], root);
  git(["-c", "user.email=t@t.com", "-c", "user.name=t", "commit", "-q", "-m", "v1.1.0"], root);

  return root;
}

async function loadGenerator(ghPagesRoot) {
  process.env.GH_PAGES_ROOT = ghPagesRoot;
  return import(path.join(__dirname, "..", "generate-manifest.mjs") + `?t=${Date.now()}`);
}

test("current/ artifacts match the real published manifest.jsonld's URL/source convention", async () => {
  const root = makeTwoPromotionFixture();
  try {
    const { scanDomainInPass, publicUrlFor } = await loadGenerator(root);

    // Verified against https://github.com/GS1-Switzerland/WebOntology/blob/gh-pages/registry/manifest.jsonld
    assert.equal(publicUrlFor("rail", "context", "rail-context.jsonld"), "https://gs1-epcis-reg.org/rail/rail-context.jsonld");
    assert.equal(
      publicUrlFor("rail", "vocabulary", "gs1RailVoc.jsonld"),
      "https://gs1-epcis-reg.org/rail/voc/data/gs1RailVoc.jsonld"
    );
    assert.equal(
      publicUrlFor("rail", "vocabulary", "gs1RailVoc.jsonld", "versions/v1.0.0"),
      "https://gs1-epcis-reg.org/rail/versions/v1.0.0/voc/data/gs1RailVoc.jsonld"
    );

    const pass = {
      base: path.join(root, "current"),
      status: "current",
      urlPrefixSegment: undefined,
      sourcePrefixSegment: "current",
      labelSuffix: "",
    };
    const domain = scanDomainInPass(path.join(root, "current", "sectors", "tran", "rail"), "rail", "TRAN", pass);

    assert.equal(domain.sectorCode, "TRAN");
    assert.equal(domain.description, "Test description.");
    assert.equal(domain.artifacts.length, 3, "context + vocabulary + shacl (v1.1.0 current has SHACL)");

    const ctx = domain.artifacts.find((a) => a.kind === "context");
    assert.equal(ctx.url, "https://gs1-epcis-reg.org/rail/rail-context.jsonld");
    assert.equal(ctx.version, "1.1.0", "version comes from the vocabulary's own owl:versionInfo");
    assert.equal(ctx.status, "current");
    assert.equal(
      ctx.source,
      "https://gs1-switzerland.github.io/WebOntology/current/sectors/tran/rail/ontologies/rail-context.jsonld"
    );

    const shacl = domain.artifacts.find((a) => a.kind === "shacl");
    assert.equal(shacl.url, "https://gs1-epcis-reg.org/rail/voc/data/Rail-SHACL.json");
    assert.equal(shacl.mediaType, "application/schema+json");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("each versions/<tag>/ snapshot becomes its own 'deprecated' entry with a distinct, versioned public url", async () => {
  const root = makeTwoPromotionFixture();
  try {
    const { selectDeprecatedVersionTags } = await loadGenerator(root);
    const tags = selectDeprecatedVersionTags();
    assert.deepEqual(new Set(tags), new Set(["v1.0.0", "v1.1.0"]), "both historical snapshots are found");

    // Run the full generator end-to-end and inspect the written file.
    const { execFileSync: run } = await import("node:child_process");
    run("node", [path.join(__dirname, "..", "generate-manifest.mjs")], {
      cwd: root,
      env: { ...process.env, GH_PAGES_ROOT: root },
    });

    const manifest = JSON.parse(
      (await import("node:fs")).readFileSync(path.join(root, "registry", "manifest.jsonld"), "utf-8")
    );
    const rail = manifest.domains.find((d) => d.slug === "rail");

    const byStatusAndTag = rail.artifacts.filter((a) => a.status === "deprecated" && a.kind === "vocabulary");
    // v1.0.0 had no SHACL and version 1.0.0; v1.1.0 (deprecated copy of the
    // just-promoted release) has version 1.1.0 — both must be distinct URLs.
    const urls = new Set(byStatusAndTag.map((a) => a.url));
    assert.equal(urls.size, byStatusAndTag.length, "no two deprecated artifacts share the same public url");

    const v100 = rail.artifacts.find((a) => a.status === "deprecated" && a.version === "1.0.0" && a.kind === "vocabulary");
    assert.ok(v100.url.includes("/versions/v1.0.0/"));
    const shaclCountForV100 = rail.artifacts.filter(
      (a) => a.status === "deprecated" && a.source.includes("/versions/v1.0.0/") && a.kind === "shacl"
    ).length;
    assert.equal(shaclCountForV100, 0, "v1.0.0 never had a SHACL file, so none should be fabricated for it");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("gh-pages/stage/ (from deploy-stage.yml) becomes 'staging' entries under a /staging/ public url", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "gh-pages-fixture-stage-"));
  try {
    writeRailFiles(path.join(root, "current"), { version: "1.3.0", withShacl: true });
    writeRailFiles(path.join(root, "stage"), { version: "1.4.0-rc1", withShacl: true });
    git(["init", "-q", "."], root);
    git(["add", "-A"], root);
    git(["-c", "user.email=t@t.com", "-c", "user.name=t", "commit", "-q", "-m", "fixture"], root);

    const { execFileSync: run } = await import("node:child_process");
    run("node", [path.join(__dirname, "..", "generate-manifest.mjs")], {
      cwd: root,
      env: { ...process.env, GH_PAGES_ROOT: root },
    });

    const manifest = JSON.parse(
      (await import("node:fs")).readFileSync(path.join(root, "registry", "manifest.jsonld"), "utf-8")
    );
    const rail = manifest.domains.find((d) => d.slug === "rail");
    const staging = rail.artifacts.filter((a) => a.status === "staging" && a.kind === "vocabulary");

    assert.equal(staging.length, 1);
    assert.equal(staging[0].version, "1.4.0-rc1");
    assert.equal(staging[0].url, "https://gs1-epcis-reg.org/rail/staging/voc/data/gs1RailVoc.jsonld");
    assert.equal(
      staging[0].source,
      "https://gs1-switzerland.github.io/WebOntology/stage/sectors/tran/rail/vocabularies/gs1RailVoc.jsonld",
      "source must point at the real gh-pages/stage/ folder, not a 'staging' folder that doesn't exist"
    );

    const current = rail.artifacts.find((a) => a.status === "current" && a.kind === "vocabulary");
    assert.equal(current.version, "1.3.0", "current and staging are scanned independently, no cross-contamination");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("sectorless (shared) domains omit sectorCode entirely", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "gh-pages-fixture-shared-"));
  try {
    const dir = path.join(root, "current", "shared", "epcis-core", "ontologies");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      path.join(dir, "epcis-core.jsonld"),
      JSON.stringify({ "@graph": [{ "@id": "core:", "@type": ["owl:Ontology"], "owl:versionInfo": "1.0.0" }] })
    );
    git(["init", "-q", "."], root);
    git(["add", "-A"], root);
    git(["-c", "user.email=t@t.com", "-c", "user.name=t", "commit", "-q", "-m", "fixture"], root);

    const { scanDomainInPass } = await loadGenerator(root);
    const pass = {
      base: path.join(root, "current"),
      status: "current",
      urlPrefixSegment: undefined,
      sourcePrefixSegment: "current",
      labelSuffix: "",
    };
    const domain = scanDomainInPass(path.join(root, "current", "shared", "epcis-core"), "epcis-core", undefined, pass);
    assert.equal("sectorCode" in domain, false, "sectorless domains must not have a sectorCode key at all");
    assert.equal(domain.artifacts[0].url, "https://gs1-epcis-reg.org/epcis-core/epcis-core.jsonld");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
