import { describe, expect, it } from "vitest";
import { extractCodeListArray } from "@/lib/registryClient";

describe("extractCodeListArray", () => {
  it("returns a bare top-level array as-is (the sectors.jsonld convention)", () => {
    const arr = [{ codeValue: "a" }];
    expect(extractCodeListArray(arr, ["domains"])).toBe(arr);
  });

  it("extracts the array from an object wrapper under the first matching preferred key", () => {
    const doc = { $schema: "x", domains: [{ codeValue: "rail" }] };
    expect(extractCodeListArray(doc, ["domains", "sectors"])).toEqual([{ codeValue: "rail" }]);
  });

  it("supports the real hand-authored domains.jsonld shape — array under 'sectors' even though entries are domains", () => {
    const doc = {
      $schema: "domains.schema.json",
      sectors: [
        { codeList: "Gs1Domain", codeValue: "disco", codeName: "Domain Disco – GS1 Discovery Service", order: 0 },
      ],
    };
    const result = extractCodeListArray(doc, ["domains", "sectors"]);
    expect(result).toHaveLength(1);
    expect((result as { codeValue: string }[])[0].codeValue).toBe("disco");
  });

  it("prefers the first matching key when multiple are present", () => {
    const doc = { domains: [{ codeValue: "preferred" }], sectors: [{ codeValue: "fallback" }] };
    const result = extractCodeListArray(doc, ["domains", "sectors"]) as { codeValue: string }[];
    expect(result[0].codeValue).toBe("preferred");
  });

  it("returns undefined for a shape with none of the preferred keys", () => {
    expect(extractCodeListArray({ foo: [] }, ["domains", "sectors"])).toBeUndefined();
  });

  it("returns undefined for non-array, non-object input", () => {
    expect(extractCodeListArray("nope", ["domains"])).toBeUndefined();
    expect(extractCodeListArray(null, ["domains"])).toBeUndefined();
  });
});
