/**
 * Ranks the media types a client accepts. This is intentionally small and
 * dependency-free rather than pulling in a full negotiation library — we
 * only need to answer one question: "does this client prefer a Linked
 * Data representation over HTML?"
 */
const RDF_TYPES = ["application/ld+json", "text/turtle", "application/rdf+xml", "application/n-triples"];

function parseAccept(header) {
  if (!header) return [{ type: "text/html", q: 1 }];
  return header
    .split(",")
    .map((part) => {
      const [type, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? parseFloat(qParam.split("=")[1]) : 1;
      return { type: type.trim().toLowerCase(), q: Number.isFinite(q) ? q : 1 };
    })
    .sort((a, b) => b.q - a.q);
}

/** Returns the RDF media type the client prefers, or null if it prefers HTML / anything else. */
function preferredRdfType(acceptHeader) {
  const ranked = parseAccept(acceptHeader);
  for (const { type } of ranked) {
    if (type === "text/html" || type === "application/xhtml+xml") return null;
    if (type === "*/*") return null;
    const match = RDF_TYPES.find((rdf) => rdf === type);
    if (match) return match;
  }
  return null;
}

module.exports = { preferredRdfType, RDF_TYPES };
