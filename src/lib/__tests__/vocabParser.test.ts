import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { extractOntologyMetadata, parseVocabularyDocument } from "../vocabParser";

const fixturePath = fileURLToPath(new URL("./fixtures/gs1RailVoc.jsonld", import.meta.url));
const railVoc = JSON.parse(readFileSync(fixturePath, "utf-8"));

describe("parseVocabularyDocument (real GS1 Rail vocabulary)", () => {
  const terms = parseVocabularyDocument(railVoc, {
    domainSlug: "rail",
    sourceArtifactUrl: "https://gs1-epcis-reg.org/rail/voc/data/gs1RailVoc.jsonld",
  });

  it("extracts every term node but excludes the ontology header node", () => {
    // 7 term-like nodes in the fixture (europeanTrackLocation, geo,
    // NominalValueSet, DynamicCoefficient, typeWtms-WILD, railRunDistance)
    // plus the "rail:" ontology header, which must be excluded.
    expect(terms.find((t) => t.id === "rail:")).toBeUndefined();
    expect(terms.length).toBeGreaterThanOrEqual(6);
  });

  it("resolves rdfs:label from the {@language,@value} object form", () => {
    const geo = terms.find((t) => t.localName === "geo");
    expect(geo?.label).toBe("Geo coordinates, Lat, Long");
    expect(geo?.description).toContain("geo-coordinates");
  });

  it("falls back to the local name when no label predicate is present", () => {
    const wtms = terms.find((t) => t.localName === "typeWtms-WILD");
    expect(wtms?.label).toBe("Wheel impact load detection");
  });

  it("captures rdfs:domain / rdfs:range as relation IRIs", () => {
    const geo = terms.find((t) => t.localName === "geo");
    expect(geo?.relations["rdfs:domain"]).toEqual(["gs1:Place"]);
  });

  it("captures the GS1-specific sw:term_status extension as termStatus", () => {
    const deprecated = terms.find((t) => t.localName === "DynamicCoefficient");
    expect(deprecated?.termStatus).toBe("deprecated");

    const stable = terms.find((t) => t.localName === "geo");
    expect(stable?.termStatus).toBe("stable");
  });

  it("normalises @type whether it is a string or an array", () => {
    const singleType = terms.find((t) => t.localName === "railRunDistance");
    expect(singleType?.types).toEqual(["gs1:MeasurementType"]);

    const arrayType = terms.find((t) => t.localName === "geo");
    expect(arrayType?.types).toEqual(expect.arrayContaining(["owl:DatatypeProperty", "rdf:Property"]));
  });
});

describe("extractOntologyMetadata", () => {
  it("reads title, version and dates off the voaf:Vocabulary/owl:Ontology header node", () => {
    const meta = extractOntologyMetadata(railVoc);
    expect(meta?.title).toBe("GS1 Rail Vocabulary");
    expect(meta?.version).toBe("2.2");
    expect(meta?.preferredPrefix).toBe("rail");
  });
});
