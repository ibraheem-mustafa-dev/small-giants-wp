#!/usr/bin/env node
/**
 * The layered shadow model (src/utils/shadow-model.js): stored text <-> layers, the elevation
 * builder and its recogniser, against the shared composer.
 *
 *   node scripts/tests/test-shadow-model.mjs
 */
import { composeShadow } from '../../src/utils/shadow-layers.js';
import { parseStored, serialise, parseCss, generate, recognise, LOOKS, problemOf } from '../../src/utils/shadow-model.js';

let failed = 0;
const eq = ( actual, expected, label ) => {
	if ( JSON.stringify( actual ) !== JSON.stringify( expected ) ) {
		failed++;
		console.error( `FAIL ${ label }\n  expected: ${ JSON.stringify( expected ) }\n  actual:   ${ JSON.stringify( actual ) }` );
	}
};
const fields = ( layers ) => layers.map( ( { x, y, blur, spread, inset, colour, alpha, raw } ) => ( { x, y, blur, spread, inset, colour, alpha, raw } ) );

// Every builder output survives store -> read -> recognise, and recognition re-creates the same layers.
let combos = 0;
for ( let n = 1; n <= 6; n++ ) {
	for ( const look of LOOKS ) {
		for ( const colour of [ 'site', 'primary', '#FF8800' ] ) {
			const layers = generate( n, look, 0.5, colour );
			const stored = serialise( layers );
			const back = parseStored( stored.shape, stored.colour );
			eq( fields( back.layers ), fields( layers ), `round trip ${ n } ${ look } ${ colour }` );
			const found = recognise( back.layers );
			const again = found && generate( found.n, found.look, found.intensity, found.colour );
			eq( again && fields( again ), fields( layers ), `recognise ${ n } ${ look } ${ colour }` );
			if ( '' === composeShadow( stored.shape, stored.colour ) ) {
				failed++;
				console.error( `FAIL the composer drew nothing for ${ n } ${ look } ${ colour }` );
			}
			combos++;
		}
	}
}

// Negative control: a hand-edited layer must NOT be recognised as a builder output.
const edited = generate( 3, 'soft', 0.5, 'site' );
edited[ 0 ].blur += 1;
eq( recognise( edited ), null, 'a hand-edited stack is custom, not an elevation' );

// Old single-layer values keep reading as one layer with the colour they had.
eq(
	fields( parseStored( '0px 4px 12px 0px', 'rgba(0,0,0,0.1)' ).layers ),
	[ { x: 0, y: 4, blur: 12, spread: 0, inset: false, colour: '#000000', alpha: 10, raw: '' } ],
	'an old single layer and rgba colour'
);
eq( parseStored( '', '#000' ).kind, 'default', 'empty shape is the block default' );
eq( parseStored( 'none', '' ).kind, 'none', 'none is explicit' );
eq( parseStored( 'Soft', '' ), { kind: 'preset', slug: 'soft', layers: [] }, 'a bare slug is a preset link' );

// Pasted CSS (Halcyon mega panel) becomes two exact layers and composes back to the same look.
const halcyon = parseCss( 'box-shadow: 0 30px 80px -30px rgba(0,0,0,.28), 0 2px 8px -2px rgba(0,0,0,.08);' );
eq( fields( halcyon ), [
	{ x: 0, y: 30, blur: 80, spread: -30, inset: false, colour: '#000000', alpha: 28, raw: '' },
	{ x: 0, y: 2, blur: 8, spread: -2, inset: false, colour: '#000000', alpha: 8, raw: '' },
], 'two-layer paste' );
const halcyonStored = serialise( halcyon );
eq( halcyonStored.colour, '#000000 28%, #000000 8%', 'a colour list keeps each layer\'s opacity' );

// A colour the model cannot read is kept verbatim, not reset.
const kept = parseCss( '0 12px 24px -6px rgba(0,0,0,.2), inset 0 1px 2px oklch(0.7 0.1 250 / .3)' );
eq( kept[ 1 ].raw, 'inset 0 1px 2px oklch(0.7 0.1 250 / .3)', 'unreadable colour stays as written' );
eq( serialise( kept ).shape.endsWith( 'oklch(0.7 0.1 250 / .3)' ), true, 'and is written back unchanged' );

// Hostile text never becomes a readable field.
const hostile = parseCss( '0 0 0 red;}body{display:none}' );
eq( hostile.every( ( l ) => l.raw ), true, 'a breakout stays raw' );
eq( composeShadow( serialise( hostile ).shape, null ).includes( '}' ), false, 'and the composer emits no brace' );

// Warnings.
eq( problemOf( '0 0 0 0, 0 0 0 0, 0 0 0 0, 0 0 0 0, 0 0 0 0, 0 0 0 0, 0 0 0 0, 0 0 0 0, 0 0 0 0' ) !== '', true, 'nine layers warn' );
eq( problemOf( '0 4px 12px 0' ), '', 'a normal shadow has no warning' );

console.log( `Shadow model: ${ combos } builder combinations round-tripped, ${ failed } failures` );
process.exit( failed > 0 ? 1 : 0 );
