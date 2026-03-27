import LinkComponent from "./LinkComponent.js";
import TableComponent from "./TableComponent.js";
import PropertyDiagramComponent from "./PropertyDiagramComponent.js";

// Define TermComponent as a Vue component
const TermComponent = {
  components: {
    "link-component": LinkComponent,
    "table-component": TableComponent,
  },
  props: [
    "term",
    "prefLang",
    "ontology",
    "type",
    "owlunionmap",
    "classtounionmap",
    "subclassmap",
    "superclassmap",
    "ascendingsuperclassmap",
    "propertieswithrangemap",
    "propertieswithdomainmap",
    "displaymode",
  ],
  emits: ["setTerm"],
  data() {
    return {
      annotations: [
        { prop: "sw:term_status", label: "Status:" },
        { prop: "rdfs:subPropertyOf", label: "Sub-property of:" },
        { prop: "rdfs:subClassOf", label: "Sub-class of:" },
        { prop: "skos:exactMatch", label: "Exact match:" },
        { prop: "skos:closeMatch", label: "Close match:" },
        { prop: "skos:broadMatch", label: "Broad match:" },
        { prop: "skos:relatedMatch", label: "Related match:" },
        { prop: "skos:related", label: "Related term:" },
        { prop: "skos:broader", label: "Broader term:" },
        { prop: "skos:narrower", label: "Narrower term:" },
        { prop: "skos:prefLabel", label: "Preferred label:" },
        { prop: "skos:altLabel", label: "Alternative label:" },
        { prop: "skos:hiddenLabel", label: "Hidden label:" },
        { prop: "skos:notation", label: "Notation:" },
        { prop: "rdfs:seeAlso", label: "See also:" },
        { prop: "owl:deprecated", label: "Deprecated - replaced by:" },
      ],
    };
  },
  methods: {
    extractByLanguage: function (val, lang) {
      if (Array.isArray(val)) {
        return val.filter(matchLanguage(lang));
      } else {
        return val?.["@value"] || val;
      }
    },
    expandCURIE: function (curie, ontology) {
      if (curie !== undefined) {
        let context = ontology?.["@context"];
        let i = curie.indexOf(":");
        let curiePrefix = curie.substr(0, i);
        let curieSuffix = curie.substr(i + 1);
        return this.curieExpansion(curiePrefix, context) + curieSuffix;
      } else {
        return "";
      }
    },
    curieExpansion: function (val, context) {
      return context[val];
    },
    setTerm: function (term) {
      this.$parent.browseCollection = "term";
      this.$parent.setTerm(term);
    },
    pluralCollection: function (term) {
      return {
        class: "classes",
        property: "properties",
        codelist: "codelists",
        linktype: "linktypes",
      }[term];
    },
  },
  template: `
    <div style="margin-top: 0; margin-bottom: 0;">
      <h2 style="margin-top: 0; margin-bottom: 0;"><span v-html="extractByLanguage(term?.['rdfs:label'],prefLang)"></span></h2>
      <h3 style="margin-top: 4px; margin-bottom: 4px;"><link-component :term="term['@id']" :ontology="ontology" @set-term="setTerm" :showurl="true"></link-component></h3>
	  <p><span v-html="extractByLanguage(term?.['rdfs:comment'],prefLang)"></span></p>
	  <p>Type: <span v-html="type"></span><span v-if="['class','property','codelist','linktype'].includes(type)"><br><a :href="'./?show='+pluralCollection(type)">Show all <span v-html="pluralCollection(type)"</span></a></span></p>
	  <div class="deprecatedTermView" v-if="term.hasOwnProperty('owl:deprecated')">&#x26A0;&nbsp;<strong>DEPRECATED!</strong><br>  
	  <span v-if="!(Array.isArray(term['owl:deprecated']))">Please use <br><link-component :term="term['owl:deprecated']['@id']" :ontology="ontology"></link-component><br> instead for all future use.</span>
      <span v-if="(Array.isArray(term['owl:deprecated']))">Please use <br><span v-for="el,idx of term['owl:deprecated']"><link-component :term="el['@id']" :ontology="ontology"></link-component><span v-if="idx < (term['owl:deprecated'].length-1)"><br>OR<br></span></span><br> instead for all future use.</span>
      <br>Details provided here are for the former term <span v-html="term?.['@id']"></span> that is now deprecated.</div>

	  <div class="testingTermView" v-if="term.hasOwnProperty('sw:term_status') && term['sw:term_status'] == 'testing'">&#x26A0;&nbsp;<strong>Testing!</strong> - this term is still under test</div>
	  <div class="unstableTermView" v-if="term.hasOwnProperty('sw:term_status') && term['sw:term_status'] == 'unstable'">&#x26A0;&nbsp;<strong>Under review!</strong> - this term is under review and may be changed in future</div>


	    <div v-if="type == 'class'">

            
            <h4 v-if="superclassmap.hasOwnProperty(term['@id'])">&#x21E7; Superclasses: 
            <span v-for="sup of superclassmap[term['@id']]"><link-component :term="sup['@id']" :ontology="ontology" @set-term="setTerm"></link-component>&nbsp;</span></h4>
            

            <h4 v-if="subclassmap.hasOwnProperty(term['@id'])">&#x21E9; Subclasses:
            <span v-for="sub of subclassmap[term['@id']]"><link-component :term="sub['@id']" :ontology="ontology" @set-term="setTerm"></link-component>&nbsp;</span></h4>

            <details open v-if="!(ascendingsuperclassmap.hasOwnProperty(term['@id']))">
            <summary title="Click to expand and show details">Properties defined within <span v-html="term['@id']"></span></summary>
 	        <table-component v-if="(propertieswithdomainmap !== undefined) && (propertieswithdomainmap.hasOwnProperty(term['@id'])) && (propertieswithdomainmap[term['@id']].length > 0)" :rows="propertieswithdomainmap[term['@id']].sort()" :prefLang="prefLang" :ontology="ontology" :col1="'Property (CURIE)'" :showrange="true" :owlunionmap="owlunionmap" :displaymode="displaymode"></table-component>
            </details>

            <details open v-if="(ascendingsuperclassmap.hasOwnProperty(term['@id']))" v-for="el in ascendingsuperclassmap[term['@id']]">
            <summary title="Click to expand and show details">Properties defined within <span v-html="el['@id']"></span></summary>
 	        <table-component v-if="(propertieswithdomainmap !== undefined) && (propertieswithdomainmap.hasOwnProperty(el['@id'])) && (propertieswithdomainmap[el['@id']].length > 0)" :rows="propertieswithdomainmap[el['@id']].sort()" :prefLang="prefLang" :ontology="ontology" :col1="'Property (CURIE)'" :showrange="true" :owlunionmap="owlunionmap" :displaymode="displaymode"></table-component>
            </details>

            <details open v-if="(propertieswithrangemap !== undefined) && (propertieswithrangemap.hasOwnProperty(term['@id'])) && (propertieswithrangemap[term['@id']].length > 0)">
            <summary title="Click to expand and show details">Properties expecting a value of <span v-html="term['@id']"></span></summary>
 	        <table-component v-if="(propertieswithrangemap !== undefined) && (propertieswithrangemap.hasOwnProperty(term['@id'])) && (propertieswithrangemap[term['@id']].length > 0)" :rows="propertieswithrangemap[term['@id']].sort()" :prefLang="prefLang" :ontology="ontology" :col1="'Property (CURIE)'" :showdomain="true" :owlunionmap="owlunionmap" :displaymode="displaymode"></table-component>
            </details>

	    </div>

	    <div v-if="type == 'codelist'">
            <h4>Code values defined within <span v-html="term['@id']"></span></h4>
            <table-component :rows="this.$parent.codeValuesInList(ontology,term['@id'])" :prefLang="prefLang" :ontology="ontology" :col1="'Code Value (CURIE)'" :owlunionmap="owlunionmap" @set-term="setTerm" :displaymode="displaymode"></table-component>
            <h4>Properties expecting a value from <span v-html="term['@id']"></span></h4>
            <table-component v-if="(propertieswithrangemap !== undefined) && (propertieswithrangemap.hasOwnProperty(term['@id'])) && (propertieswithrangemap[term['@id']].length > 0)" :rows="propertieswithrangemap[term['@id']].sort()" :prefLang="prefLang" :ontology="ontology" :col1="'Property (CURIE)'" :owlunionmap="owlunionmap" :showdomain="true" :displaymode="displaymode"></table-component>
         </div>
        
        
        <div v-if="type == 'property'">
            <property-diagram-component :term="term" :prefLang="prefLang" :ontology="ontology" :type="termType" :owlunionmap="owlunionmap" :classtounionmap="classtounionmap" ></property-diagram-component>
            <h4>Expects value of type:</h4>
            <p v-if="!(owlunionmap.hasOwnProperty(term?.['rdfs:range']['@id']))"><link-component :term="term?.['rdfs:range']['@id']" :ontology="ontology" @set-term="setTerm"></link-component></p>
            <p v-if="(owlunionmap.hasOwnProperty(term?.['rdfs:range']['@id']))"><span v-for="c of owlunionmap[term?.['rdfs:range']['@id']]"><link-component :term="c" :ontology="ontology" @set-term="setTerm"></link-component><br/></span></p>
            
            <h4>Classes having this property:</h4>
            <p v-if="((!Array.isArray(term?.['rdfs:domain'])) && !(owlunionmap.hasOwnProperty(term?.['rdfs:domain']['@id'])))"><link-component :term="term?.['rdfs:domain']['@id']" :ontology="ontology" @set-term="setTerm"></link-component></p>
            <p v-if="((!Array.isArray(term?.['rdfs:domain'])) && (owlunionmap.hasOwnProperty(term?.['rdfs:domain']['@id'])))"><span v-for="c of owlunionmap[term?.['rdfs:domain']['@id']]"><link-component :term="c" :ontology="ontology" @set-term="setTerm"></link-component><br/></span></p>
            <p v-if="((Array.isArray(term?.['rdfs:domain'])))"><span v-for="c of term?.['rdfs:domain']"><link-component :term="c['@id']" :ontology="ontology" @set-term="setTerm"></link-component><br/></span></p>
        </div>
        
        <div v-if="type == 'codevalue'">
            <h4>All <span v-if="displaymode == 'current'">current </span>code values defined within <link-component :term="term?.['@type']" :ontology="ontology" @set-term="setTerm"></link-component> <span v-if="displaymode == 'all'">(may show deprecated terms with highlighting)</span></h4>
            <table-component :rows="this.$parent.codeValuesInList(ontology,term['@type'])" :prefLang="prefLang" :ontology="ontology" :col1="'Code Value (CURIE)'" @set-term="setTerm" :displaymode="displaymode"></table-component>
            <h4>Properties that might express a code value <span v-html="term['@id']"></span> from code list <link-component :term="term?.['@type']" :ontology="ontology" :owlunionmap="owlunionmap" @set-term="setTerm"></link-component></h4>
            <table-component v-if="(propertieswithrangemap !== undefined) && (propertieswithrangemap.hasOwnProperty(term['@type'])) && (propertieswithrangemap[term['@type']].length > 0)" :rows="propertieswithrangemap[term['@type']].sort()" :prefLang="prefLang" :ontology="ontology" :owlunionmap="owlunionmap" :col1="'Property (CURIE)'" :showdomain="true" :displaymode="displaymode"></table-component>
        </div>

      <details open>
      <summary>Status, annotations and relationships to other terms (including terms within schema.org):</summary>
      <table>
      <tr v-for="ann of annotations"><td v-if="term.hasOwnProperty(ann.prop)"><span v-html="ann.label" :title="ann.prop"></span></td><td v-if="term.hasOwnProperty(ann.prop)">
      <span v-if="Array.isArray(term?.[ann.prop])" v-for="el of term?.[ann.prop]"><link-component :term="el?.['@id']" :ontology="ontology" :owlunionmap="owlunionmap" @set-term="setTerm"></link-component>&nbsp;&nbsp;
      </span>
      <span v-if="(!(Array.isArray(term?.[ann.prop])) && (typeof term?.[ann.prop] === 'string'))">
      <link-component v-if="term?.[ann.prop].hasOwnProperty('@id')" :term="term?.[ann.prop]?.['@id']" :ontology="ontology" :owlunionmap="owlunionmap" @set-term="setTerm"></link-component>&nbsp;&nbsp;
      <span v-if="(!(term?.[ann.prop].hasOwnProperty('@id')))" v-html="term?.[ann.prop]"></span>
      </span>
      <span v-if="(!(Array.isArray(term?.[ann.prop])) && (typeof term?.[ann.prop] !== 'string') && (Object.keys(term?.[ann.prop]).length == 2) && (term?.[ann.prop].hasOwnProperty('@type')) && (term?.[ann.prop].hasOwnProperty('@value')) )">
      <link-component v-if="term?.[ann.prop].hasOwnProperty('@id')" :term="term?.[ann.prop]?.['@id']" :ontology="ontology" :owlunionmap="owlunionmap" @set-term="setTerm"></link-component>&nbsp;&nbsp;
      <span v-if="(!(term?.[ann.prop].hasOwnProperty('@id')))" v-html="'&quot;'+term?.[ann.prop]['@value']+'&quot;'+'^^'+term?.[ann.prop]['@type']"></span>
      </span>
      <span v-if="(!(Array.isArray(term?.[ann.prop])) && (typeof term?.[ann.prop] !== 'string') && (!((Object.keys(term?.[ann.prop]).length == 2) && (term?.[ann.prop].hasOwnProperty('@type')) && (term?.[ann.prop].hasOwnProperty('@value')))) )">
      <link-component v-if="term?.[ann.prop].hasOwnProperty('@id')" :term="term?.[ann.prop]?.['@id']" :ontology="ontology" :owlunionmap="owlunionmap" @set-term="setTerm"></link-component>&nbsp;&nbsp;
      <span v-if="(!(term?.[ann.prop].hasOwnProperty('@id')))" v-html="JSON.stringify(term?.[ann.prop])"></span>
      </span>
      </td></tr>
      </table>
      </details>

        
    </div>
  `,
};

function matchLanguage(lang) {
  return function (element) {
    return element?.["@language"] === lang;
  };
}

export default TermComponent;
