import LinkComponent from "./LinkComponent.js"

// Define RowComponent as a Vue component
const RowComponent = {
  components: {
    'link-component': LinkComponent,
  },
  props: ['term','prefLang','ontology','showrange','showdomain','owlunionmap','classtounionmap','displaymode'],
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
	    this.$parent.browseCollection="term";
        this.$parent.setTerm(term);
	},
	"showTerm" : function(term) {
	    return ( (this.displaymode == 'all') || ( (term !== undefined) && (!(term.hasOwnProperty("owl:deprecated"))) ) );
	}

  },
  
  template: `
    <tr class="termList" v-if="showTerm(term)" v-bind:class="{'deprecatedTermView' : ((term !== undefined) && (term.hasOwnProperty('owl:deprecated'))), 'unstableTermView' : (term.hasOwnProperty('sw:term_status') && term['sw:term_status'] == 'unstable'), 'testingTermView' : (term.hasOwnProperty('sw:term_status') && term['sw:term_status'] == 'testing') }">
      <td><span v-html="extractByLanguage(term?.['rdfs:label'],prefLang)"></span><br><link-component :term="term['@id']" :ontology="ontology"></link-component><span v-if="((term !== undefined) && (term.hasOwnProperty('owl:deprecated')))"><br>(DEPRECATED)<br>
      <span v-if="!(Array.isArray(term['owl:deprecated']))">Please use <br><link-component :term="term['owl:deprecated']['@id']" :ontology="ontology"></link-component><br> for all future use.</span>
      <span v-if="(Array.isArray(term['owl:deprecated']))">Please use <br><span v-for="el,idx of term['owl:deprecated']"><link-component :term="el['@id']" :ontology="ontology"></link-component><span v-if="idx < (term['owl:deprecated'].length-1)"><br>OR<br></span></span><br> for all future use.</span>
      </span>
      <span v-if="(term.hasOwnProperty('sw:term_status') && term['sw:term_status'] == 'unstable')"><br>&nbsp;<br>&nbsp;&nbsp;&#x26A0;&nbsp;<span style="font-style: italic;">Status: Under Review</span></span>
      <span v-if="(term.hasOwnProperty('sw:term_status') && term['sw:term_status'] == 'testing')"><br>&nbsp;<br>&nbsp;&nbsp;&#x26A0;&nbsp;<span style="font-style: italic;">Status: Testing</span></span>
      </td>
      <td v-if="((showrange == true) && (owlunionmap !== undefined) && (!(owlunionmap.hasOwnProperty(term?.['rdfs:range']?.['@id']))) )"><link-component :term="term?.['rdfs:range']?.['@id']" :ontology="ontology"></link-component></td>
      <td v-if="((showrange == true) && (owlunionmap !== undefined) && ((owlunionmap.hasOwnProperty(term?.['rdfs:range']?.['@id']))) )"><span v-for="c in owlunionmap[term?.['rdfs:range']?.['@id']]"><link-component :term="c" :ontology="ontology"></link-component><br/></span></td>
      <td v-if="((showdomain == true) && (owlunionmap !== undefined) && (!(owlunionmap.hasOwnProperty(term?.['rdfs:domain']?.['@id']))) )"><link-component :term="term?.['rdfs:domain']?.['@id']" :ontology="ontology"></link-component></td>
      <td v-if="((showdomain == true) && (owlunionmap !== undefined) && ((owlunionmap.hasOwnProperty(term?.['rdfs:domain']?.['@id']))) )"><span v-for="c in owlunionmap[term?.['rdfs:domain']?.['@id']]"><link-component :term="c" :ontology="ontology"></link-component><br/></span></td>
	  <td><div v-html="extractByLanguage(term?.['rdfs:comment'],prefLang)" class="description"></div></td>
    </tr>
  `,
};


function matchLanguage(lang) {
	return function(element) {
		return element?.["@language"] === lang;
	}
}


export default RowComponent

