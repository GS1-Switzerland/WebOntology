import { describe, expect, it } from "vitest";
import { buildFieldRows, diffTermSets } from "@/lib/termDiff";
import type { VocabTerm } from "@/types/registry";

function term(overrides: Partial<VocabTerm>): VocabTerm {
  return {
    id: "rail:geo",
    localName: "geo",
    label: "Geo",
    types: ["owl:DatatypeProperty"],
    domainSlug: "rail",
    sourceArtifactUrl: "https://example.org/x.jsonld",
    relations: {},
    raw: {},
    ...overrides,
  };
}

describe("buildFieldRows", () => {
  it("marks unchanged fields as unchanged and changed fields as changed", () => {
    const a = term({ label: "Geo coordinates", description: "Old description" });
    const b = term({ label: "Geo coordinates", description: "New description" });
    const rows = buildFieldRows(a, b);

    const label = rows.find((r) => r.field === "label")!;
    expect(label.changed).toBe(false);

    const description = rows.find((r) => r.field === "description")!;
    expect(description.changed).toBe(true);
    expect(description.a).toBe("Old description");
    expect(description.b).toBe("New description");
  });

  it("shows an em dash for a field missing entirely from one version", () => {
    const rows = buildFieldRows(undefined, term({}));
    const label = rows.find((r) => r.field === "label")!;
    expect(label.a).toBe("—");
    expect(label.changed).toBe(true);
  });

  it("unions relation predicates across both versions, filling gaps with an em dash", () => {
    const a = term({ relations: { "rdfs:domain": ["gs1:Place"] } });
    const b = term({ relations: { "rdfs:range": ["xsd:string"] } });
    const rows = buildFieldRows(a, b);

    const domainRow = rows.find((r) => r.field === "rdfs:domain")!;
    expect(domainRow.a).toBe("gs1:Place");
    expect(domainRow.b).toBe("—");

    const rangeRow = rows.find((r) => r.field === "rdfs:range")!;
    expect(rangeRow.a).toBe("—");
    expect(rangeRow.b).toBe("xsd:string");
  });

  it("sorts multi-valued types before comparing, so reordering alone isn't reported as a change", () => {
    const a = term({ types: ["rdf:Property", "owl:DatatypeProperty"] });
    const b = term({ types: ["owl:DatatypeProperty", "rdf:Property"] });
    const rows = buildFieldRows(a, b);
    const typeRow = rows.find((r) => r.field === "type")!;
    expect(typeRow.changed).toBe(false);
  });
});

describe("diffTermSets", () => {
  const geoA = term({ localName: "geo", label: "Geo coordinates" });
  const geoB = term({ localName: "geo", label: "Geo coordinates" }); // identical -> unchanged
  const speedA = term({ localName: "speed", label: "Speed" });
  const speedBChanged = term({ localName: "speed", label: "Speed (km/h)" }); // changed
  const brandNewB = term({ localName: "brandNew", label: "Brand new term" }); // only in B -> added
  const goneA = term({ localName: "gone", label: "Removed term" }); // only in A -> removed

  const termsA = [geoA, speedA, goneA];
  const termsB = [geoB, speedBChanged, brandNewB];

  it("classifies terms present only in B as added", () => {
    const diff = diffTermSets(termsA, termsB);
    expect(diff.added.map((t) => t.localName)).toEqual(["brandNew"]);
  });

  it("classifies terms present only in A as removed", () => {
    const diff = diffTermSets(termsA, termsB);
    expect(diff.removed.map((t) => t.localName)).toEqual(["gone"]);
  });

  it("classifies terms present in both with a field difference as changed, pairing a and b", () => {
    const diff = diffTermSets(termsA, termsB);
    expect(diff.changed).toHaveLength(1);
    expect(diff.changed[0].a.localName).toBe("speed");
    expect(diff.changed[0].a.label).toBe("Speed");
    expect(diff.changed[0].b.label).toBe("Speed (km/h)");
  });

  it("counts (but doesn't list) terms present in both and identical", () => {
    const diff = diffTermSets(termsA, termsB);
    expect(diff.unchangedCount).toBe(1); // geo
  });

  it("returns everything as added when the first set is empty", () => {
    const diff = diffTermSets([], [geoB, speedBChanged]);
    expect(diff.added).toHaveLength(2);
    expect(diff.removed).toHaveLength(0);
    expect(diff.changed).toHaveLength(0);
  });
});
