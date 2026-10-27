// A walker config that builds some state names at load time (one state per accordion item), so its source text never
// spells them out: a check must read the config's states, not search its text.
export default {
	name: 'faq',
	states: [
		{ name: 'opening', fullPage: true },
		{ name: 'item2-open', fullPage: true },
		...[ 3, 4 ].map( ( n ) => ( { name: `item${ n }-open`, fullPage: true } ) ),
	],
	pairs: [],
};
