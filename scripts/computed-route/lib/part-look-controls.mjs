// The buy box's controls by what they do, never by their words (Spec 43 FR-43-25, the button kit's flow opener). A product page
// draws a control that opens the choice flow the page opens and, beside it, one that adds to the basket. The part-look reader
// finds a part by a locator (data/part-locators.json); the flow opener has no structure of its own, so its element comes from the
// draft's code: lib/template-piece-buybox-flow.mjs::keepsAddToCart reads each control's click handler and names the controls whose
// handler makes the flow's opening writes. This module turns those controls into
//   - part locations ({ dc, tpl }, the form of a client's shop parts record) the locator `shopPart` match finds in the page, and
//   - the opener's words (lib/part-look-modes.mjs::labelOf of its first text), which the choice flow's `openerLabel` holds, and its
//     note (every text after the first, ::noteOf), which the flow's `openerNote` holds.
// Nothing here is read from prose: a surface whose draft logic names no opener, or opens more than one flow, gives no part and says why.
import fs from 'node:fs';
import path from 'node:path';
import { pieceContext } from './template-pieces-context.mjs';
import { loadPieces, piecesFor } from './template-pieces.mjs';
import { locateRun } from './template-piece-buybox.mjs';
import { keepsAddToCart } from './template-piece-buybox-flow.mjs';
import { labelOf } from './part-look-modes.mjs';

// The shop-part id the flow opener's locator names (data/part-locators.json, group buybox).
export const OPENER_PART = 'buybox-flow-opener';

// The words an element shows as its own: its own text, else the first descendant (document order) that has some. The inventory's
// `words` of an element is the text it holds directly, so a button whose label sits in a span reads the span's.
export function wordsOf( index, key ) {
	const own = String( index.byKey.get( key )?.words ?? '' ).trim();
	if ( own ) {
		return own;
	}
	for ( const child of index.children( key ) ) {
		const w = wordsOf( index, child );
		if ( w ) {
			return w;
		}
	}
	return '';
}

// Every text an element shows, in document order: its own words, then each descendant's, depth first.
function textsOf( index, key ) {
	const own = String( index.byKey.get( key )?.words || '' ).trim();
	return [ ...( own ? [ own ] : [] ), ...index.children( key ).flatMap( ( child ) => textsOf( index, child ) ) ];
}

// The note a control carries after its words (a second line, "from +£59"): every text after the first, joined; '' when it shows
// one text only. The choice flow's `openerNote` holds it.
export function noteOf( index, key ) {
	return textsOf( index, key ).slice( 1 ).join( ' ' );
}

// The controls of a client's product-template buy box: { openers: [ { key, dc, tpl, label, note } ], adds: [ key ], flow, keep, openerFirst,
// why? } (`keep` and `openerFirst` as lib/template-piece-buybox-flow.mjs::keepsAddToCart decides them). `entry` is
// the surface's surfaces.json record, `inventory` its skeleton inventory (read from build/skeleton/<surface>.inventory.json when not
// given), `template` the template key the page map names for the row; `contextOf` builds what the buy box reader needs from the client's
// files (lib/template-pieces-context.mjs::pieceContext; a test passes a planted one). `why` is set when the controls cannot be named.
export function flowControls( { repo, client, entry, surface = 'product', template = 'single-product', inventory = null, data = loadPieces(), contextOf = pieceContext } ) {
	const file = path.join( repo, 'sites', client, 'build', 'skeleton', `${ surface }.inventory.json` );
	const inv = inventory ?? ( fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : null );
	if ( ! inv ) {
		return { openers: [], adds: [], why: `no inventory at ${ path.relative( repo, file ).split( path.sep ).join( '/' ) }` };
	}
	const piece = piecesFor( template, data ).find( ( p ) => 'buybox' === p.kind );
	if ( ! piece ) {
		return { openers: [], adds: [], why: `the template ${ template } has no buy box piece` };
	}
	const ctx = { ...contextOf( { repo, client, entry, inventory: inv, pieces: [ piece ] } ), key: surface };
	const found = locateRun( ctx, piece.find.surface, piece.block );
	if ( found.why ) {
		return { openers: [], adds: [], why: found.why };
	}
	const keep = keepsAddToCart( ctx, found );
	// An element's `snippet` holds its descendants' markup, so a wrapper of the opener reads the opener's handler too
	// (lib/draft-link.mjs::elementHandler): the control is the innermost element that names it.
	const named = keep.openers || [];
	const openers = named.filter( ( key ) => ! named.some( ( other ) => other !== key && found.index.within( other, key ) ) ).map( ( key ) => {
		const el = found.index.byKey.get( key );
		return { key, dc: 'Root' === el?.template ? ctx.rootComponent : el?.template, tpl: el?.tpl, label: labelOf( wordsOf( found.index, key ) ), note: noteOf( found.index, key ) };
	} );
	return { openers, adds: keep.adds || [], flow: keep.flow ?? null, keep: !! keep.keep, openerFirst: !! keep.openerFirst, ...( openers.length ? {} : { why: keep.why || 'no control in the buy box opens a flow' } ) };
}

// The buy box's order write for a template already built: `openerBeforeAddToCart` from the draft's order of its opener and its
// add-to-basket control, where the buy box keeps Add to Cart beside the opener; null otherwise. The decision is keepsAddToCart's,
// the one lib/template-piece-buybox.mjs::place writes when it builds the template, so the two writers cannot disagree.
export function orderWrite( controls ) {
	if ( ! controls?.keep ) {
		return null;
	}
	const value = !! controls.openerFirst;
	return { attr: 'openerBeforeAddToCart', value, part: null, property: '(order)', mode: true, evidence: `the draft draws the flow's opener ${ value ? 'before' : 'after' } its add-to-basket control`, draft: { 1440: value } };
}

// The shop-parts entries the page locator reads for the opener: { [OPENER_PART]: [ { dc, tpl } ] } (empty when no opener is named).
export const openerShopParts = ( controls ) => ( controls.openers.length ? { [ OPENER_PART ]: controls.openers.map( ( o ) => ( { dc: o.dc, tpl: String( o.tpl ) } ) ) } : {} );
