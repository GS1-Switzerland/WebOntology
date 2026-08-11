import type { VocabTerm } from "@/types/registry";

export interface FieldRow {
  field: string;
  a: string;
  b: string;
  changed: boolean;
}

/** Rows for the structured, field-by-field comparison table between two versions of the *same* term. */
export function buildFieldRows(a: VocabTerm | undefined, b: VocabTerm | undefined): FieldRow[] {
  const rows: FieldRow[] = [];
  const push = (field: string, av: string, bv: string) => rows.push({ field, a: av, b: bv, changed: av !== bv });

  push("label", a?.label ?? "—", b?.label ?? "—");
  push("description", a?.description ?? "—", b?.description ?? "—");
  push("type", (a?.types ?? []).slice().sort().join(", ") || "—", (b?.types ?? []).slice().sort().join(", ") || "—");
  push("termStatus", a?.termStatus ?? "—", b?.termStatus ?? "—");

  const predicates = new Set([...Object.keys(a?.relations ?? {}), ...Object.keys(b?.relations ?? {})]);
  for (const pred of Array.from(predicates).sort()) {
    push(pred, (a?.relations[pred] ?? []).join(", ") || "—", (b?.relations[pred] ?? []).join(", ") || "—");
  }
  return rows;
}

/** True if any field differs between two versions of the same term. */
export function termsDiffer(a: VocabTerm, b: VocabTerm): boolean {
  return buildFieldRows(a, b).some((row) => row.changed);
}

export interface DomainTermDiff {
  /** Present in B, not in A. */
  added: VocabTerm[];
  /** Present in A, not in B. */
  removed: VocabTerm[];
  /** Present in both, but at least one field differs. */
  changed: { a: VocabTerm; b: VocabTerm }[];
  /** Present in both and identical — counted, not listed. */
  unchangedCount: number;
}

/**
 * Diffs two whole term sets (e.g. a domain's Current vs. Staging vocabulary)
 * by localName — the natural stable key within one domain, since the full
 * @id can legitimately change if a term is renamed within the same slot.
 */
export function diffTermSets(termsA: VocabTerm[], termsB: VocabTerm[]): DomainTermDiff {
  const byNameA = new Map(termsA.map((t) => [t.localName, t]));
  const byNameB = new Map(termsB.map((t) => [t.localName, t]));

  const added: VocabTerm[] = [];
  const changed: { a: VocabTerm; b: VocabTerm }[] = [];
  let unchangedCount = 0;

  for (const [name, b] of byNameB) {
    const a = byNameA.get(name);
    if (!a) {
      added.push(b);
    } else if (termsDiffer(a, b)) {
      changed.push({ a, b });
    } else {
      unchangedCount++;
    }
  }

  const removed: VocabTerm[] = [];
  for (const [name, a] of byNameA) {
    if (!byNameB.has(name)) removed.push(a);
  }

  return { added, removed, changed, unchangedCount };
}
