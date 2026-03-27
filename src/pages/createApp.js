import RowComponent from "./RowComponent.js";
import TableComponent from "./TableComponent.js";
import TermComponent from "./TermComponent.js";
import SearchResultsComponent from "./SearchResultsComponent.js";
import PropertyDiagramComponent from "./PropertyDiagramComponent.js";

let url = window.location.href;

let urlParams = new URLSearchParams(window.location.search);
let show = urlParams.get("show") || "";
let searchKeyword = urlParams.get("search") || "";
let term;

const reURI = /^.+?\/([A-Za-z0-9_-]+)(\?.+)*$/;
if (reURI.test(url)) {
  let matches = url.match(reURI);
  term = matches[1];
} else {
  term = "";
}

if (term !== "") {
  show = "term";
}

if (show == "typecodes") {
  show = "codelists";
}

let displayMode = window.sessionStorage.getItem("displayMode") || "current";

const app1 = Vue.createApp({
  data() {
    return {
      url: url,
      show: show,
      term: term,
      ontologyJSONLD: ontologyJSONLD,
      prefLang: prefLang,
      ontology: null,
      selectedCodeList: "",
      searchKeyword: searchKeyword,
      selectedDomain: "",
      selectedRange: "",
      displayMode: displayMode,
      browseCollection: show,
      aboutContent: "",
    };
  },
  computed: {
    ontologyCURIEprefix: function () {
      if (this.ontology !== null) {
        return this.preferredNamespace(this.ontology);
      } else {
        return null;
      }
    },

    blankNodes: function () {
      if (this.ontology !== null) {
        return this.ontology["@graph"].filter(isBlankNode);
      } else {
        return null;
      }
    },

    blankNodeMap: function () {
      let rv = {};
      if (this.blankNodes !== null) {
        for (let el of this.blankNodes) {
          if (el !== null && el.hasOwnProperty("@id")) {
            rv[el["@id"]] = el;
          }
        }
      }
      return rv;
    },

    owlUnionMap: function () {
      let rv = {};
      if (this.blankNodes !== null) {
        for (let el of this.blankNodes) {
          if (el !== null && el.hasOwnProperty("@id")) {
            rv[el["@id"]] = el["owl:unionOf"]["@list"].map((x) => x["@id"]);
          }
        }
      }
      return rv;
    },

    propertiesWithRangeMap: function () {
      let rv = {};
      let properties = this.properties(this.ontology);
      for (let p of properties) {
        let r = p["rdfs:range"]["@id"];
        if (this.owlUnionMap.hasOwnProperty(r)) {
          for (let el of this.owlUnionMap[r]) {
            if (rv.hasOwnProperty(el)) {
              rv[el].push(p);
            } else {
              rv[el] = [p];
            }
          }
        } else {
          if (rv.hasOwnProperty(r)) {
            rv[r].push(p);
          } else {
            rv[r] = [p];
          }
        }
      }
      return rv;
    },

    propertiesWithDomainMap: function () {
      let rv = {};
      let properties = this.properties(this.ontology);
      for (let p of properties) {
        let d = p["rdfs:domain"]["@id"];
        if (this.owlUnionMap.hasOwnProperty(d)) {
          for (let el of this.owlUnionMap[d]) {
            if (rv.hasOwnProperty(el)) {
              rv[el].push(p);
            } else {
              rv[el] = [p];
            }
          }
        } else {
          if (rv.hasOwnProperty(d)) {
            rv[d].push(p);
          } else {
            rv[d] = [p];
          }
        }
      }
      return rv;
    },

    classToUnionMap: function () {
      let rv = {};
      if (this.blankNodes !== null && Object.keys(this.owlUnionMap).length > 0) {
        for (let el of this.blankNodes) {
          if (el !== null && el.hasOwnProperty("@id")) {
            let classes = el["owl:unionOf"]["@list"].map((x) => x["@id"]);
            let union = el["@id"];
            for (let c of classes) {
              if (rv.hasOwnProperty(c)) {
                rv[c].push(union);
              } else {
                rv[c] = [union];
              }
            }
          }
        }
      }
      return rv;
    },

    superClassMap: function () {
      let result_map = {};
      let subclass_candidates = this.classes(this.ontology).filter(expressesSubClassOf);
      if (subclass_candidates !== null) {
        for (let candidate of subclass_candidates) {
          result_map[candidate["@id"]] = this.ontology["@graph"].filter(
            getByID([candidate["rdfs:subClassOf"]["@id"], ""])
          );
        }
      }

      return result_map;
    },

    subClassMap: function () {
      let rv = {};
      let candidates = this.classes(this.ontology).filter(expressesSubClassOf);
      if (candidates !== null) {
        for (let c of candidates) {
          if (rv.hasOwnProperty(c["rdfs:subClassOf"]["@id"])) {
            rv[c["rdfs:subClassOf"]["@id"]].push(c);
          } else {
            rv[c["rdfs:subClassOf"]["@id"]] = [c];
          }
        }
      }
      return rv;
    },

    ascendingSuperClassMap: function () {
      let result_map = {};
      let candidate_classes = this.classes(this.ontology).filter(
        expressesSubClassOf
      );
      if (candidate_classes !== null) {
        for (let candidate of candidate_classes) {
          let current_id = candidate["@id"];
          let class_hierarchy = [candidate];

          while (this.superClassMap.hasOwnProperty(current_id) && this.superClassMap[current_id].length > 0) {
            class_hierarchy.push(this.superClassMap[current_id][0]);
            current_id = this.superClassMap[current_id][0]["@id"];
          }

          result_map[candidate["@id"]] = class_hierarchy;
        }
      }

      return result_map;
    },

    termCURIE: function () {
      if (this.term !== "") {
        return this.preferredNamespace(this.ontology) + ":" + this.term;
      } else {
        return "";
      }
    },
    termURI: function () {
      if (this.term !== "" && this.ontology !== null) {
        return this.expandCURIE(
          this.preferredNamespace(this.ontology) + ":" + this.term,
          this.ontology
        );
      } else {
        return "";
      }
    },
    termData: function () {
      if (this.term !== "" && this.ontology !== null) {
        return this.termDataArray[0];
      } else {
        return {};
      }
    },
    termDataArray: function () {
      if (this.term !== "" && this.ontology !== null) {
        return this.ontology["@graph"].filter(
          getByID([this.termCURIE, this.termURI])
        );
      } else {
        return {};
      }
    },
    displayAll: function () {
      return this.term == "" && this.show == "" && this.searchKeyword == "";
    },
    displayClasses: function () {
      return this.show == "classes";
    },
    displayProperties: function () {
      return this.show == "properties";
    },
    displayCodeLists: function () {
      return this.show == "codelists" || this.show == "typecodes";
    },
    displayCodeValues: function () {
      return this.show == "codevalues";
    },
    displayLinkTypes: function () {
      return this.show == "linktypes";
    },
    displaySearchResults: function () {
      return this.searchKeyword !== "";
    },
    termType: function () {
      if (Object.keys(this.termData).length > 0 && this.ontology !== null) {
        if (this.classes(this.ontology).includes(this.termData)) {
          return "class";
        }
        if (this.linkTypes(this.ontology).includes(this.termData)) {
          return "linktype";
        }
        if (this.properties(this.ontology).includes(this.termData)) {
          return "property";
        }
        if (this.codeLists(this.ontology).includes(this.termData)) {
          return "codelist";
        }
        if (this.codevalues(this.ontology).includes(this.termData)) {
          return "codevalue";
        }
      } else {
        return (
          "nothing for term " +
          this.term +
          " with termData=" +
          JSON.stringify(this.termData)
        );
      }
    },
    ontologyRootElement: function () {
      if (this.ontology !== null) {
        return this.ontology["@graph"].filter(rootElement)[0];
      } else {
        return {};
      }
    },
    licenceHTML: function () {
      if (this.ontology !== null) {
        let l = this.ontologyRootElement?.["schema:license"];
        return l.replace("data:text/html;charset=UTF-8,", "");
      } else {
        return "";
      }
    },
  },
  methods: {
    changedKeyword: function () {
      if (this.searchKeyword !== "") {
        this.browseCollection = "";
        this.setTerm("", false);
        this.term = "";

        if (window.location.href.indexOf("search=") > -1) {
          let index = window.location.href.indexOf("search=");
          let existingKeywordFragment = window.location.href.substr(7 + index);

          if (this.searchKeyword.indexOf(existingKeywordFragment) == 0) {
            history.replaceState(null, null, "./?search=" + this.searchKeyword);
          } else {
            history.pushState(null, null, "./?search=" + this.searchKeyword);
          }
        } else {
          history.pushState(null, null, "./?search=" + this.searchKeyword);
        }
      }
    },

    changedCollection: function () {
      this.searchKeyword = "";
      this.setTerm("", false);
      this.term = "";
      if (this.browseCollection !== "") {
        history.pushState(null, null, "./?show=" + this.browseCollection);
      } else {
        history.pushState(null, null, "");
      }
    },

    rememberMode: function () {
      window.sessionStorage.setItem("displayMode", this.displayMode);
    },

    setTerm: function (term, clearOthers) {
      if (clearOthers) {
        this.searchKeyword = "";
        this.browseCollection = "";
      }
      let curiePrefix = this.preferredNamespace(this.ontology) + ":";
      if (term.indexOf(curiePrefix) == 0) {
        // window.location.href=term.substr(1+term.indexOf(":"));
        history.pushState(null, null, term.substr(1 + term.indexOf(":")));
        this.term = term.substr(1 + term.indexOf(":"));
        //                            this.term=term;
      } else {
        if (term !== "") {
          // alert("External link for "+term+" expands to "+this.expandCURIE(term, this.ontology));
          window.open(this.expandCURIE(term, this.ontology, "_blank"));
        }
      }
    },

    preferredNamespace: function (ontology) {
      if (ontology !== null) {
        let rootEl = ontology["@graph"].filter(rootElement);
        if (rootEl.length == 1) {
          return rootEl[0]["vann:preferredNamespacePrefix"];
        } else {
          return null;
        }
      } else {
        return null;
      }
    },
    curieExpansion: function (val, context) {
      return context[val];
    },
    expandCURIE: function (curie, ontology) {
      if (ontology !== null) {
        let context = ontology?.["@context"];
        let i = curie.indexOf(":");
        let curiePrefix = curie.substr(0, i);
        let curieSuffix = curie.substr(i + 1);
        return this.curieExpansion(curiePrefix, context) + curieSuffix;
      } else {
        return "";
      }
    },
    codeLists: function (ontology) {
      return (
        (ontology !== null &&
          this.codeListsFromValues(ontology, this.codevalues(ontology)).sort(
            byURI
          )) ||
        []
      );
    },
    properties: function (ontology) {
      return (
        (ontology !== null &&
          ontology["@graph"].filter(isProperty).sort(byURI)) ||
        []
      );
    },
    linkTypes: function (ontology) {
      return (
        (ontology !== null &&
          ontology["@graph"]
            .filter(isProperty)
            .filter(isSubPropertyOf(["gs1:linkType"]))
            .sort(byURI)) ||
        []
      );
    },

    classes: function (ontology) {
      return (
        (ontology !== null && ontology["@graph"].filter(isClass).sort(byURI)) ||
        []
      );
    },

    filteredClasses: function (ontology, keyword) {
      if (ontology !== undefined && this.classes(ontology) !== undefined) {
        return this.classes(ontology)
          .filter(matchKeyword(keyword.toLowerCase()))
          .sort(byURI);
      } else {
        return [];
      }
    },

    filteredProperties: function (ontology, keyword) {
      if (ontology !== undefined && this.properties(ontology) !== undefined) {
        return this.properties(ontology)
          .filter(matchKeyword(keyword.toLowerCase()))
          .sort(byURI);
      } else {
        return [];
      }
    },

    filteredCodeLists: function (ontology, keyword) {
      if (ontology !== undefined && this.codeLists(ontology) !== undefined) {
        return this.codeLists(ontology)
          .filter(matchKeyword(keyword.toLowerCase()))
          .sort(byURI);
      } else {
        return [];
      }
    },

    filteredCodeValues: function (ontology, keyword) {
      if (ontology !== undefined && this.codevalues(ontology) !== undefined) {
        return this.codevalues(ontology)
          .filter(matchKeyword(keyword.toLowerCase()))
          .sort(byURI);
      } else {
        return [];
      }
    },

    filteredLinkTypes: function (ontology, keyword) {
      if (ontology !== undefined && this.linkTypes(ontology) !== undefined) {
        return this.linkTypes(ontology)
          .filter(matchKeyword(keyword.toLowerCase()))
          .sort(byURI);
      } else {
        return [];
      }
    },

    codeValuesInList: function (ontology, codeList) {
      return this.codevalues(ontology)
        .filter(getByType([codeList]))
        .sort(byURI);
    },

    codeListsFromValues: function (ontology, codevalues) {
      let codelists = [];
      for (let cv of codevalues) {
        if (!codelists.includes(cv["@type"])) {
          codelists.push(cv["@type"]);
        }
      }
      return ontology?.["@graph"]?.filter(getByID(codelists)).sort(byURI);
    },

    codevalues: function (ontology) {
      return (
        (ontology !== null &&
          ontology["@graph"]
            .filter(isCodeValue(this.preferredNamespace(ontology)))
            .sort(byURI)) ||
        []
      );
    },

    extractByLanguage: function (val, lang) {
      if (Array.isArray(val)) {
        return val.filter(matchLanguage(lang));
      } else {
        return val?.["@value"] || val;
      }
    },
    fetchOntologyData: function (ontologyURL) {
      // Using fetch to load a JSON file
      fetch(ontologyURL)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          this.ontology = data;
        })
        .catch((error) => {
          console.error("Error during fetch:", error);
        });
    },

    fetchReadmeContent: function () {
      const readmeURL = "https://cdn.jsdelivr.net/gh/gs1-germany/gs1GermanyWebVoc@main/README.md";
      
      fetch(readmeURL)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status}`);
          }
          return response.text();
        })
        .then((markdownContent) => {
          // Extract the section with flexible regex matching "What is.*Web Vocabulary"
          const sectionRegex = /^##.*What is.*Web Vocabulary.*$/m;
          const sectionMatch = markdownContent.match(sectionRegex);
          if (!sectionMatch) {
            throw new Error("Could not find the 'What is...Web Vocabulary' section in README");
          }
          const sectionStart = sectionMatch.index + sectionMatch[0].length;
          
          // Find the next section (starts with ##)
          const nextSectionStart = markdownContent.indexOf("##", sectionStart + 1);
          const sectionContent = nextSectionStart === -1 
            ? markdownContent.substring(sectionStart)
            : markdownContent.substring(sectionStart, nextSectionStart);
          
          // Convert markdown to HTML
          const htmlContent = marked.parse(sectionContent);
          
          // Sanitize the HTML
          this.aboutContent = DOMPurify.sanitize(htmlContent);
        })
        .catch((error) => {
          console.error("Error fetching README content:", error);
          console.error("Error type:", error.name, "Error message:", error.message);
          
          // Fallback content with more detailed error information
          this.aboutContent = `
            <h2>What is the GS1 (Germany) Web Vocabulary?</h2>
            <p>The GS1 Web Vocabulary (WebVoc), an official extension to schema.org, is a method for describing trade items, companies, locations, and more using linked data concepts. This structured data, often in the form of JSON-LD documents, enables IT applications to understand the contained information semantically.</p>
            <p><em>Content could not be loaded from GitHub (Error: ${error.message}). This is likely due to CORS restrictions when running locally.</em></p>
          `;
        });
    },
  },
  mounted() {
    this.fetchOntologyData(this.ontologyJSONLD);
    this.fetchReadmeContent();

    // Attach onpopstate event handler
    window.onpopstate = () => {
      let newLoc = document.location.toString();
      let lastForwardSlash = newLoc.lastIndexOf("/");
      let lastPathFragment = newLoc.substr(1 + lastForwardSlash);
      if (lastPathFragment !== undefined) {
        this.term = lastPathFragment;
      }
    };

    window.onpushstate = () => {
      let newLoc = document.location.toString();
      let lastForwardSlash = newLoc.lastIndexOf("/");
      let lastPathFragment = newLoc.substr(1 + lastForwardSlash);
      if (lastPathFragment !== undefined) {
        this.term = lastPathFragment;
      }
    };
  },
});
app1.component("table-component", TableComponent);
app1.component("term-component", TermComponent);
app1.component("row-component", RowComponent);
app1.component("search-results-component", SearchResultsComponent);
app1.component("property-diagram-component", PropertyDiagramComponent);
app1.mount("#app1");

function byURI(a, b) {
  if (a["@id"] < b["@id"]) {
    return -1;
  }
  if (a["@id"] > b["@id"]) {
    return 1;
  }
  return 0;
}

function isProperty(element) {
  return (
    element !== undefined &&
    element.hasOwnProperty("@id") &&
    element.hasOwnProperty("@type") &&
    Array.isArray(element["@type"]) &&
    (element["@type"].includes("rdf:Property") ||
      element["@type"].includes("owl:DatatypeProperty") ||
      element["@type"].includes("owl:ObjectProperty"))
  );
}

function isClass(element) {
  return (
    element !== undefined &&
    element !== null &&
    element.hasOwnProperty("@id") &&
    element.hasOwnProperty("@type") &&
    Array.isArray(element["@type"]) &&
    (element["@type"].includes("rdfs:Class") ||
      element["@type"].includes("owl:Class"))
  );
}

function isCodeValue(namespaceID) {
  // returns an array of elements whose "@type" is defined by the ontology
  return function (element) {
    return (
      element !== undefined &&
      element !== null &&
      element.hasOwnProperty("@id") &&
      element.hasOwnProperty("@type") &&
      element["@type"].indexOf(namespaceID) == 0
    );
  };
}

function matchKeyword(keyword) {
  return function (element) {
    return (
      element !== undefined &&
      element !== null &&
      ((element.hasOwnProperty("@id") &&
        element["@id"].toLowerCase().indexOf(keyword) > -1) ||
        (element.hasOwnProperty("rdfs:label") &&
          element["rdfs:label"].hasOwnProperty("@value") &&
          element["rdfs:label"]["@value"].toLowerCase().indexOf(keyword) >
            -1) ||
        (element.hasOwnProperty("rdfs:comment") &&
          element["rdfs:comment"].hasOwnProperty("@value") &&
          element["rdfs:comment"]["@value"].toLowerCase().indexOf(keyword) >
            -1))
    );
  };
}

function expressesSubClassOf(element) {
  return (
    element !== undefined &&
    element !== null &&
    element.hasOwnProperty("rdfs:subClassOf") &&
    element["rdfs:subClassOf"].hasOwnProperty("@id") &&
    element["rdfs:subClassOf"]["@id"].indexOf("owl:Thing") !== 0
  );
}

function isBlankNode(element) {
  return (
    element !== undefined &&
    element !== null &&
    element.hasOwnProperty("@id") &&
    element["@id"].indexOf("_:") == 0
  );
}

function matchDomain(domain) {
  // returns an array of ontology terms whose rdfs:domain matches the specified domain
  return function (element) {
    return (
      element !== undefined &&
      element !== null &&
      element.hasOwnProperty("rdfs:domain") &&
      element["rdfs:domain"]["@id"] == domain
    );
  };
}

function matchRange(range) {
  // returns an array of ontology terms whose rdfs:range matches the specified range
  return function (element) {
    return (
      element !== undefined &&
      element !== null &&
      element.hasOwnProperty("rdfs:range") &&
      element["rdfs:range"]["@id"] == range
    );
  };
}

function getByID(list) {
  // returns an array of ontology terms whose ID is contained within the provided list of IDs
  return function (element) {
    return (
      element !== undefined &&
      element !== null &&
      element.hasOwnProperty("@id") &&
      list.includes(element["@id"])
    );
  };
}

function getByType(list) {
  // returns an array of ontology terms whose type is contained within the provided list of types
  return function (element) {
    return (
      element !== undefined &&
      element !== null &&
      element.hasOwnProperty("@type") &&
      list.includes(element["@type"])
    );
  };
}

function isSubPropertyOf(list) {
  // returns an array of ontology terms whose type is contained within the provided list of types (as CURIEs)
  return function (element) {
    return (
      element !== undefined &&
      element !== null &&
      element.hasOwnProperty("rdfs:subPropertyOf") &&
      list.includes(element["rdfs:subPropertyOf"]["@id"])
    );
  };
}

function rootElement(element) {
  return (
    element !== undefined &&
    element !== null &&
    element.hasOwnProperty("@type") &&
    ((Array.isArray(element["@type"]) &&
      element["@type"].includes("owl:Ontology")) ||
      element["@type"] == "owl:Ontology")
  );
}

function matchLanguage(lang) {
  return function (element) {
    return element?.["@language"] === lang;
  };
}

function inCodeList(codeList) {
  return function (element) {
    return element?.["@type"] === codeList;
  };
}
