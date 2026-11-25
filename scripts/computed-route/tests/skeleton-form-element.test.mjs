// RC11 (Spec 48 §3.4): the draft element a form block stands on. A trade application drawn as a grid of a form card and a
// side aside is the page's layout around the form: the form is the card, so the linked form holds the card and the page builds
// the grid and the aside (lib/skeleton-form-element.mjs::formElement). Synthetic inventories in the reader's shape.
import test from 'node:test';
import assert from 'node:assert/strict';
import { inventoryModel } from '../lib/skeleton-model.mjs';
import { formElement } from '../lib/skeleton-form-element.mjs';

const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const el = ( key, parentKey, tag, words = '', attrs = {} ) => ( { key, parentKey, depth: parentKey ? 1 : 0, tag, template: 'Root', tpl: num( key ), attrs, words, allText: words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: { 375: { x: 0, y: 0, w: 300, h: 100 }, 768: { x: 0, y: 0, w: 300, h: 100 }, 1440: { x: 0, y: 0, w: 300, h: 100 } }, visible: { 375: true, 768: true, 1440: true }, display: 'block', flexDirection: 'row', screenshots: {} } );
const model = ( elements ) => inventoryModel( { generated: 'test', source: 'test', root: 'div', keyFormat: 'tpl', checks: { duplicateKeys: 0 }, elements } );

test( 'MUST FAIL: the grid holding a form card and an aside is the page\'s layout, the form is the card', () => {
	const m = model( [
		el( 'Root/1#0', null, 'div' ), el( 'Root/2#0', 'Root/1#0', 'div' ), el( 'Root/3#0', 'Root/1#0', 'aside', 'Call us on 0121 000 0000' ),
		el( 'Root/4#0', 'Root/2#0', 'input', '', { type: 'text' } ), el( 'Root/5#0', 'Root/2#0', 'button', 'Apply', { type: 'submit' } ),
	] );
	assert.equal( formElement( m, m.byKey[ 'Root/1#0' ] ).key, 'Root/2#0' );
} );

test( 'negative controls: a control straight in the root, or controls spread over several children, keep the root as the form', () => {
	const straight = model( [ el( 'Root/1#0', null, 'div' ), el( 'Root/2#0', 'Root/1#0', 'input', '', { type: 'text' } ), el( 'Root/3#0', 'Root/1#0', 'aside', 'Beside' ) ] );
	assert.equal( formElement( straight, straight.byKey[ 'Root/1#0' ] ).key, 'Root/1#0' );
	const spread = model( [ el( 'Root/1#0', null, 'div' ), el( 'Root/2#0', 'Root/1#0', 'div' ), el( 'Root/3#0', 'Root/1#0', 'div' ), el( 'Root/4#0', 'Root/2#0', 'input', '', { type: 'text' } ), el( 'Root/5#0', 'Root/3#0', 'input', '', { type: 'email' } ) ] );
	assert.equal( formElement( spread, spread.byKey[ 'Root/1#0' ] ).key, 'Root/1#0' );
} );
