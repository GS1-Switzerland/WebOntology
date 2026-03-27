// Define LinkComponent as a Vue component
const LinkComponent = {
  props: ['term','ontology','showurl'],
  emits: ['setTerm'],
  methods: {
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
	    this.$parent.searchKeyword="";
        this.$parent.setTerm(term,true);
        window.scrollTo(0,0);
	}


  },
  template: `
    <a v-bind:href="expandCURIE(term,ontology)" @click.prevent="setTerm(term)" target="_blank">
       <span v-html="term" class="curie"></span>
    </a><br v-if="showurl==true"><span v-if="showurl==true" class="weburi" v-html="expandCURIE(term,ontology)"></span>
  `,
};


export default LinkComponent