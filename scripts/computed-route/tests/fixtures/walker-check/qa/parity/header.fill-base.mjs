export default {
	name: "header",
	states: [ { name: "top" }, { name: "scrolled", from: "rest", draft: async () => {}, live: async () => {} } ],
	unwalked: [ { state: "rail-moved", reason: "no usable state key and no setState call in its how_to_reach" } ],
	pairs: [],
};
