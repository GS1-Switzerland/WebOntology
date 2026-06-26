We need a web page with the human readable interpretation (HRI) of our ontologies and vocabularies in JSON-LD.
Analogue to the pages here: https://ref.gs1.org/voc/ or https://voc.gs1.de/.

This generic HRI-Page should be generated and updated completely from Ontology- and Voc-JSON-LD (Context) stored ans managed here in the GitHub and a few configs like base url, etc.

This generic HRI-Page should resolve requests for distinct terms like https://ref.gs1.org/voc/certificationSubject with a HRI representation of that term.

This generic HRI-Page should support multiple contexts (Rail, Industry, T&L,…) with their specific Ontology- and Voc-JSON-LD files.

This generic HRI page should comply with current best practice for secure public webpages. 

##Content Negotiation (Machine vs Human Readable)##

To follow Linked Data best practices, your server should support:
✔ HTTP content negotiation

    Accept: text/html → return HRI webpage

    Accept: application/ld+json → return JSON‑LD definition

    Accept: text/turtle → optional, return TTL

    Accept: application/rdf+xml → optional

This allows:
https://gs1-epcis-reg.org/[Context]/myTerm

to serve:

    a human‑readable HTML page in browsers

    a machine‑readable JSON‑LD file for crawlers and semantic tools

✔ 303 redirects (optional but recommended)

For strict Linked Data compliance:

    Term IRIs redirect to HTML or JSON‑LD representations.

Wir benötigen einen Webserver der Ontologien und Contexts in JSON-LD als Webressource unter einer stabilen URL bereitstellt.
Des weitern sollen die Pfade / Url's der einzelnen Begriffe dynamisch aufgelöst werden und je nach content negociation auf eine human readable oder JSON ressource zeigen.
Dies soll dynamisch auf einzelnen definitionsfiles basieren.
Ontologie- und Contexts-Files werden in github versioniert ud entsprechend verwaltet. 
Es gibt immer nur eine aktuelle Version die unter dem standard, nicht versionierten, Pfad erreichbar ist.
Die Vergangenen sind aber unter einem versionierten Pfad immer noch ereichbar.

Baue mir eine SPA hier in gutHub-Pages die oben genanntes umsetzt.
