import Fuse from "fuse.js";
import type { VocabTerm } from "@/types/registry";

export function buildSearchIndex(terms: VocabTerm[]) {
  return new Fuse(terms, {
    keys: [
      { name: "label", weight: 0.4 },
      { name: "localName", weight: 0.3 },
      { name: "description", weight: 0.2 },
      { name: "types", weight: 0.1 },
    ],
    threshold: 0.32,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });
}

export function flattenTermMap(termsByDomain: Map<string, VocabTerm[]>): VocabTerm[] {
  return Array.from(termsByDomain.values()).flat();
}
