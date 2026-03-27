import RowComponent from "./RowComponent.js"

// Define TableComponent as a Vue component
const TableComponent = {
  components: {
    'row-component': RowComponent,
  },
  props: ['rows','prefLang','ontology','col1','showrange','owlunionmap','showdomain','displaymode'],
  emits: ['setTerm'],
  methods: {
    "setTerm" : function(term) {
	    this.$parent.browseCollection="term";
	    this.$parent.searchKeyword="";
	    this.$parent.setTerm(term);
	}

  },
  template: 
    `<table style="max-width: 100%; word-wrap : break-word;">
      <thead>
        <tr class="termList">
          <th><span v-html="col1"></span></th>
          <th v-if="showrange == true">Expected value type</th>
          <th v-if="showdomain == true">Defined within</th>
          <th>Description / Definition</th>
        </tr>
      </thead>
      <tbody>
        <row-component v-for="(term, index) in rows" :key="index" :term="term" :ontology="ontology" :prefLang="prefLang" :showrange="showrange"  :showdomain="showdomain" :owlunionmap="owlunionmap" :displaymode="displaymode" @set-term="setTerm"></row-component>
      </tbody>
    </table>
  `,
};

export default TableComponent