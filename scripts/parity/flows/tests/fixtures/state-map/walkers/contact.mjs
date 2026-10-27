// A form walker config: its two form states are walked only when the surface's walkStates names them.
export default {
	name: 'contact',
	states: [
		{ name: 'opening', fullPage: true },
		{ name: 'field-focused', fullPage: true },
		{ name: 'form-submitted-empty', fullPage: true },
	],
	pairs: [],
};
