import TableComponent from "./TableComponent.js"

// Define TableComponent as a Vue component
const SearchResultsComponent = {
  components: {
    'table-component': TableComponent,
  },
  props: ['rows','prefLang','ontology','col1','collection','title','showrange','owlunionmap','showrange','displaymode'],
  emits: ['setTerm'],
  methods : {
    "setTerm" : function(term) {
	    this.$parent.browseCollection="term";
	    this.$parent.searchKeyword="";
	    this.$parent.setTerm(term);
	}

  },
  template: 
    `<details>
		<summary>Matching <span v-html="title"></span> ({{collection.length}})</summary>
		<table-component v-if="collection.length > 0" :rows="collection" :prefLang="prefLang" :ontology="ontology" :col1="col1"  :owlunionmap="owlunionmap" :showrange="showrange" :displaymode="displaymode"></table-component>
	</details>`
};

export default SearchResultsComponent