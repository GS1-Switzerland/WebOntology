import LinkComponent from "./LinkComponent.js"

// Define PropertyDiagramComponent as a Vue component
const PropertyDiagramComponent = {
  components: {
    'link-component': LinkComponent,
  },
  props: ['term','prefLang','ontology','showrange','showdomain','owlunionmap','classtounionmap'],
  emits: ['setTerm'],
  methods: {
	"extractByLanguage": function(val, lang) {
		if (Array.isArray(val)) {
			return val.filter(matchLanguage(lang));
		} else {
			return val?.["@value"] || val;
		}
	},
	"expandCURIE": function(curie, ontology) {
	    if (curie !== undefined) {
    		let context=ontology?.["@context"];
    		let i = curie.indexOf(":");
    		let curiePrefix = curie.substr(0, i);
    		let curieSuffix = curie.substr(i + 1);
    		return this.curieExpansion(curiePrefix, context) + curieSuffix;
	        
	    } else {
	        return "";
	    }
	},
	"curieExpansion": function(val, context) {
		return context[val];
	},
	"setTerm" : function(term) {
        this.$parent.setTerm(term);
        this.$parent.browseCollection="term";
	},
	"rangeShape" : function(term) {
        return (term?.['@type'].includes('owl:ObjectProperty')) ? 'oval' : 'rect';
	},

  },
  template: `
	<div class="propertyDiagram">
	<span class="oval" v-if="((!Array.isArray(term?.['rdfs:domain'])) && !(owlunionmap.hasOwnProperty(term?.['rdfs:domain']['@id'])))"><link-component :term="term?.['rdfs:domain']['@id']" :ontology="ontology" @set-term="setTerm"></link-component></span>
	<span class="oval" v-if="((!Array.isArray(term?.['rdfs:domain'])) && (owlunionmap.hasOwnProperty(term?.['rdfs:domain']['@id'])))"><span v-for="c of owlunionmap[term?.['rdfs:domain']['@id']]"><link-component :term="c" :ontology="ontology" @set-term="setTerm"></link-component><br/></span></span>
	<span class="oval" v-if="((Array.isArray(term?.['rdfs:domain'])) )"><span v-for="c of term?.['rdfs:domain']"><link-component :term="c['@id']" :ontology="ontology" @set-term="setTerm"></link-component><br/></span></span>
	<span class="propertyStack">
	<span class="property" v-html="term['@id']"></span>
	<span class="arrowContainer">
	<span class="lineH">&nbsp;</span>
	<span class="arrowHead" style="width: 28px; height: 28px;">&nbsp;</span>
	</span>
	<span class="property">&nbsp;</span>
	</span>
	<span :class="rangeShape(term)" v-if="((!Array.isArray(term?.['rdfs:range'])) && !(owlunionmap.hasOwnProperty(term?.['rdfs:range']['@id'])))"><link-component :term="term?.['rdfs:range']['@id']" :ontology="ontology" @set-term="setTerm"></link-component></span>
	<span :class="rangeShape(term)" v-if="((!Array.isArray(term?.['rdfs:range'])) && (owlunionmap.hasOwnProperty(term?.['rdfs:range']['@id'])))"><span v-for="c of owlunionmap[term?.['rdfs:range']['@id']]"><link-component :term="c" :ontology="ontology" @set-term="setTerm"></link-component><br/></span></span>
	<span :class="rangeShape(term)" v-if="((Array.isArray(term?.['rdfs:range'])) )"><span v-for="c of term?.['rdfs:range']"><link-component :term="c['@id']" :ontology="ontology" @set-term="setTerm"></link-component><br/></span></span>
	</div>
  `,
};


function matchLanguage(lang) {
	return function(element) {
		return element?.["@language"] === lang;
	}
}


export default PropertyDiagramComponent
