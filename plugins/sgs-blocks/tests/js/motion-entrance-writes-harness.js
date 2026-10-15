/**
 * Shared setup for the Entrance writes tests: the entrance harness, the layer, stamp, edit, facts and stagger modules,
 * the generated presets and the small DOM helpers. A test file registers the presets mock first
 * (`motion-entrance-presets-mock.js`), then requires this file before anything under `src/`.
 */
const H = require( './motion-entrance-harness' );
const L = require( '../../src/blocks/extensions/motion/layers/use-motion-layers' );
const S = require( '../../src/blocks/extensions/motion/layers/stamp' );
const E = require( '../../src/blocks/extensions/motion/entrance/layer-edit' );
const F = require( '../../src/blocks/extensions/motion/entrance/entrance-facts' );
const W = require( '../../src/blocks/extensions/motion/entrance/stagger-write' );
const presets = require( '../../src/components/motion/generated-motion-presets.json' ).presets;

const type = ( label, value ) =>
	H.act( () => H.Simulate.change( H.byLabel( label ), { target: { value } } ) );
const layerOf = ( target = 'root' ) =>
	H.latest().layers.layersOf( target, 'entrance.base' )[ 0 ];
const fade = () => L.addLayer( undefined, 'root', 'entrance.base', { preset: 'entrance-fade-up' } );

module.exports = { H, L, S, E, F, W, presets, type, layerOf, fade };
