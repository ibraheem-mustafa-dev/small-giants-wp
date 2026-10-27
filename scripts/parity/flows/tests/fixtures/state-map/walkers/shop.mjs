// A hand-written walker config whose states are listed in a different order from the surface map.
export default {
	name: 'shop',
	states: [
		{ name: 'opening', fullPage: true },
		{ name: 'price-moved', fullPage: true },
		{ name: 'brand-picked', fullPage: true },
		{ name: 'panel-open', fullPage: true },
	],
	pairs: [],
};
