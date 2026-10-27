// A hand-written walker config: the states a page walker opens.
export default {
	name: 'home',
	states: [
		{ name: 'opening', fullPage: true },
		{ name: 'reviews-next', fullPage: true },
		{ name: 'filter-open', fullPage: true },
	],
	pairs: [],
};
