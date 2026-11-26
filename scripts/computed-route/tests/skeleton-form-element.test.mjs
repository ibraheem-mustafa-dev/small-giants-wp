// RC11 (Spec 48 §3.4): the draft element a form block stands on. A trade application drawn as a grid of a form card and a
// side aside is the page's layout around the form: the form is the card, so the linked form holds the card and the page builds
// the grid and the aside (lib/skeleton-form-element.mjs::formElement). Synthetic inventories in the reader's shape.
import test from 'node:test';
import assert from 'node:assert/strict';
import { inventoryModel } from '../lib/skeleton-model.mjs';
import { formElement } from '../lib/skeleton-form-element.mjs';

const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const el = ( key, parentKey, tag, words = '', attrs = {} ) => ( { key, parentKey, depth: parentKey ? 1 : 0, tag, template: 'Root', tpl: num( key ), attrs, words, allText: words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: { 375: { x: 0, y: 0, w: 300, h: 100 }, 768: { x: 0, y: 0, w: 300, h: 100 }, 1440: { x: 0, y: 0, w: 300, h: 100 } }, visible: { 375: true, 768: true, 1440: true }, display: 'block', flexDirection: 'row', screenshots: {} } );
// The same element placed at (x, y) at every width.
const at = ( e, x, y, w = 300, h = 100 ) => ( { ...e, box: Object.fromEntries( [ 375, 768, 1440 ].map( ( k ) => [ k, { x, y, w, h } ] ) ) } );
const model = ( elements ) => inventoryModel( { generated: 'test', source: 'test', root: 'div', keyFormat: 'tpl', checks: { duplicateKeys: 0 }, elements } );

test( 'MUST FAIL: the grid holding a form card and an aside is the page\'s layout, the form is the card', () => {
	const m = model( [
		el( 'Root/1#0', null, 'div' ), at( el( 'Root/2#0', 'Root/1#0', 'div' ), 0, 0, 600, 400 ), at( el( 'Root/3#0', 'Root/1#0', 'aside', 'Call us on 0121 000 0000' ), 640, 0, 340, 200 ),
		el( 'Root/4#0', 'Root/2#0', 'input', '', { type: 'text' } ), el( 'Root/5#0', 'Root/2#0', 'button', 'Apply', { type: 'submit' } ),
	] );
	assert.equal( formElement( m, m.byKey[ 'Root/1#0' ] ).key, 'Root/2#0' );
	// The aside beside the card at 1440 only (it stacks below at 375 and 768) still makes the grid the page's layout.
	const stacked = ( k ) => ( 1440 === k ? { x: 640, y: 0, w: 340, h: 200 } : { x: 0, y: 420, w: 300, h: 200 } );
	const wide = model( m.els.map( ( e ) => ( 'Root/3#0' === e.key ? { ...e, box: Object.fromEntries( [ 375, 768, 1440 ].map( ( k ) => [ k, stacked( k ) ] ) ) } : e ) ) );
	assert.equal( formElement( wide, wide.byKey[ 'Root/1#0' ] ).key, 'Root/2#0' );
} );

test( 'MUST FAIL: a card whose title and intro stack above the fields is the form, so the saved form keeps its title', () => {
	const m = model( [
		el( 'Root/1#0', null, 'div' ), at( el( 'Root/2#0', 'Root/1#0', 'h2', 'Apply for a trade account' ), 0, 0, 600, 40 ), at( el( 'Root/3#0', 'Root/1#0', 'p', 'It takes two minutes.' ), 0, 50, 600, 30 ),
		at( el( 'Root/6#0', 'Root/1#0', 'div' ), 0, 100, 600, 300 ), el( 'Root/4#0', 'Root/6#0', 'input', '', { type: 'text' } ), el( 'Root/5#0', 'Root/6#0', 'button', 'Apply', { type: 'submit' } ),
	] );
	assert.equal( formElement( m, m.byKey[ 'Root/1#0' ] ).key, 'Root/1#0' );
	// Negative controls, each with one child moved: the intro beside the fields only at a width it is hidden at, laid over the fields
	// (a background layer: same row, same column), or below and to the right of them (another row, another column).
	const moved = ( box, visible = { 375: true, 768: true, 1440: true } ) => {
		const x = model( [ ...m.els.filter( ( e ) => 'Root/3#0' !== e.key ), { ...m.byKey[ 'Root/3#0' ], visible, box: Object.fromEntries( [ 375, 768, 1440 ].map( ( k ) => [ k, box( k ) ] ) ) } ] );
		return formElement( x, x.byKey[ 'Root/1#0' ] ).key;
	};
	assert.equal( moved( ( k ) => ( 375 === k ? { x: 640, y: 100, w: 300, h: 30 } : { x: 0, y: 50, w: 600, h: 30 } ), { 375: false, 768: true, 1440: true } ), 'Root/1#0', 'beside only where hidden' );
	assert.equal( moved( () => ( { x: 0, y: 150, w: 600, h: 30 } ) ), 'Root/1#0', 'laid over the fields' );
	assert.equal( moved( () => ( { x: 640, y: 450, w: 300, h: 30 } ) ), 'Root/1#0', 'below and to the right' );
	assert.equal( moved( () => ( { x: 640, y: 100, w: 300, h: 30 } ) ), 'Root/6#0', 'positive control: beside the fields at every width' );
} );

test( 'negative controls: a control straight in the root, or controls spread over several children, keep the root as the form', () => {
	const straight = model( [ el( 'Root/1#0', null, 'div' ), el( 'Root/2#0', 'Root/1#0', 'input', '', { type: 'text' } ), el( 'Root/3#0', 'Root/1#0', 'aside', 'Beside' ) ] );
	assert.equal( formElement( straight, straight.byKey[ 'Root/1#0' ] ).key, 'Root/1#0' );
	const spread = model( [ el( 'Root/1#0', null, 'div' ), el( 'Root/2#0', 'Root/1#0', 'div' ), el( 'Root/3#0', 'Root/1#0', 'div' ), el( 'Root/4#0', 'Root/2#0', 'input', '', { type: 'text' } ), el( 'Root/5#0', 'Root/3#0', 'input', '', { type: 'email' } ) ] );
	assert.equal( formElement( spread, spread.byKey[ 'Root/1#0' ] ).key, 'Root/1#0' );
	// Controls spread over two children side by side: neither child is the form, though each sits beside the other.
	const pair = model( spread.els.map( ( e ) => ( 'Root/3#0' === e.key ? at( e, 640, 0 ) : 'Root/2#0' === e.key ? at( e, 0, 0 ) : e ) ) );
	assert.equal( formElement( pair, pair.byKey[ 'Root/1#0' ] ).key, 'Root/1#0' );
} );

// A form captured inside a closed modal or drawer: every box is empty or zero-sized at every width, so nothing says whether the
// aside sits beside the card or the title stacks above it; the one child holding every control is the form, as before boxes were read.
test( 'MUST FAIL: a form whose draft boxes are empty or zero-sized at every width keeps the card as the form, so the aside stays out of the saved form', () => {
	const els = [
		el( 'Root/1#0', null, 'div' ), el( 'Root/2#0', 'Root/1#0', 'div' ), el( 'Root/3#0', 'Root/1#0', 'aside', 'Call us on 0121 000 0000' ),
		el( 'Root/4#0', 'Root/2#0', 'input', '', { type: 'text' } ), el( 'Root/5#0', 'Root/2#0', 'button', 'Apply', { type: 'submit' } ),
	];
	const zero = model( els.map( ( e ) => at( e, 0, 0, 0, 0 ) ) );
	assert.equal( formElement( zero, zero.byKey[ 'Root/1#0' ] ).key, 'Root/2#0', 'zero-sized boxes' );
	const none = model( els.map( ( e ) => ( { ...e, box: {} } ) ) );
	assert.equal( formElement( none, none.byKey[ 'Root/1#0' ] ).key, 'Root/2#0', 'no boxes' );
	// Negative control: measurable boxes with the aside stacked below the card keep the root as the form.
	const stacked = model( [ els[ 0 ], at( els[ 1 ], 0, 0, 600, 400 ), at( els[ 2 ], 0, 420, 600, 200 ), els[ 3 ], els[ 4 ] ] );
	assert.equal( formElement( stacked, stacked.byKey[ 'Root/1#0' ] ).key, 'Root/1#0', 'a measured aside below the card is the form\'s own' );
} );
