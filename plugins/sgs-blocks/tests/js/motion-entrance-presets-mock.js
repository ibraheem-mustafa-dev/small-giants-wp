/**
 * The generated-presets mock for the Entrance writes tests: the real preset rows plus Intensity rows for the Fade up
 * family. Use it as `jest.mock( '../../src/components/motion/generated-motion-presets.json', () => require( './motion-entrance-presets-mock' )() )`.
 */
module.exports = () => {
	const real = jest.requireActual(
		'../../src/components/motion/generated-motion-presets.json'
	);
	// Intensity rows for the Fade up family exist in no seed yet; a mocked set proves the panel shows the picker as
	// soon as rows exist.
	const row = ( intensity, translateY ) => ( {
		devices: {},
		effect: null,
		family: 'entrance-fade-up',
		intensity,
		kind: 'intensity',
		label: `Fade up: ${ intensity }`,
		panel: 'entrance',
		slug: `entrance-fade-up-${ intensity }`,
		target: 'part',
		trigger: 'scroll',
		values: { from: { opacity: 0, translateY } },
	} );
	return {
		...real,
		presets: [
			...real.presets,
			row( 'subtle', 8 ),
			row( 'standard', 24 ),
			row( 'bold', 64 ),
		],
	};
};
