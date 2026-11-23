// The theme's side gutter on a page-level section, which a site-look default paint cannot show.
//
// A banded block (a container with a content width, or any block that prints a content band) takes core's
// `.has-global-padding` and pays the page gutter as its own side padding (class-sgs-container-wrapper.php: the gutter
// goes to a banded block whose side padding is unset; a block with side padding of its own takes `sgs-band-gutter`
// instead). Core zeroes that padding on a gutter-payer nested inside another one. The site look draws every instance
// inside a banded wrapper of its own (lib/calibrate.mjs::buildTree), so the instance is always the nested one and its
// default paint of side padding is 0px at every width. A section placed straight in the page's main shows the gutter
// (40, 32 and 20px on the clone's theme tokens), so a draft whose section has no side padding at all is not "equal to the
// default": the clone's section is wider than the gutter lets it be. This module names the widths where that holds, and
// the baseline for them (the gutter), so the resolver sees a difference and writes the zero as the band's own side padding.

import { attrsFor } from './db.mjs';
import { bandPlan } from './fill-band.mjs';

const TIER_OF = ( w ) => ( w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop' );
const SIDE_PROPS = [ 'padding-left', 'padding-right' ];
const VERTICAL = [ 'padding-top', 'padding-bottom' ];
const isObj = ( v ) => v && 'object' === typeof v && ! Array.isArray( v );
const px = ( v ) => {
	const m = /^(-?\d*\.?\d+)px$/.exec( String( v ?? '' ).trim() );
	return m ? Number( m[ 1 ] ) : null;
};

// The tier values a setting holds: a plain string is the desktop one.
const tiers = ( v ) => ( isObj( v ) ? Object.values( v ) : null == v || '' === v ? [] : [ v ] ).filter( ( x ) => 'string' === typeof x && '' !== x );

// Whether the block declares the content width and the padding that make it a banded block, by the framework database.
function banded( st, block ) {
	const key = `gutter|${ block }`;
	st.gutterBlocks ??= new Map();
	if ( ! st.gutterBlocks.has( key ) ) {
		const names = new Set( attrsFor( st.db, block ).map( ( r ) => r.attr_name ) );
		const row = st.db.prepare( 'SELECT default_value FROM block_attributes WHERE block_slug = ? AND attr_name = ?' ).get( block, 'contentWidth' );
		let dflt = [];
		try {
			dflt = tiers( JSON.parse( row?.default_value ?? '{}' ) );
		} catch {}
		st.gutterBlocks.set( key, names.has( 'contentWidth' ) && names.has( 'padding' ) ? { dflt } : null );
	}
	return st.gutterBlocks.get( key );
}

// Whether a node's attributes make it a block with a content band: a content width other than `full` at some tier (its own,
// else the one Fill's band pass is about to write for it (`pending`), else the block's default), or any padding set on the band.
function hasBand( st, node, name, draftVertical, pending = null ) {
	const b = banded( st, name );
	if ( ! b ) {
		return false;
	}
	const own = tiers( node.attributes?.contentWidth );
	const width = own.length ? own : pending?.length ? pending : b.dflt;
	const padded = tiers( Object.values( isObj( node.attributes?.padding ) ? node.attributes.padding : {} ).flatMap( ( t ) => ( isObj( t ) ? Object.values( t ) : [ t ] ) ) ).length > 0;
	return width.some( ( v ) => 'full' !== v ) || padded || draftVertical;
}

// Whether the draft sets a vertical padding that is not 0 at any width: the vertical padding is written onto the band, so it
// makes a band of its own. `allDrafts` is the node's own element's values; an ancestor's are read from its root element.
const verticalPadded = ( allDrafts ) => VERTICAL.some( ( p ) => Object.values( allDrafts?.[ p ] ?? {} ).some( ( v ) => 0 !== px( v ) ) );
function ancestorVertical( st, index ) {
	const root = st.nodes[ index ].targets?.find( ( t ) => '' === t.slot );
	return !! root && Object.values( st.reads?.widths ?? {} ).some( ( at ) => VERTICAL.some( ( p ) => 0 !== px( at?.[ root.id ]?.styles?.[ p ] ?? '0px' ) ) );
}

// The content width Fill's band pass will write for a node that holds none yet (it runs after the node's own settings): the
// value of lib/fill-band.mjs::bandPlan, or null when the node holds one or the pass writes none.
function pendingWidth( st, rec, cal ) {
	const node = st.flat[ rec.index ];
	if ( undefined !== node.attributes?.contentWidth || ! cal ) {
		return null;
	}
	st.gutterPlans ??= new Map();
	if ( ! st.gutterPlans.has( rec.index ) ) {
		st.gutterPlans.set( rec.index, bandPlan( st, rec, '', cal ).out?.value ?? null );
	}
	return tiers( st.gutterPlans.get( rec.index ) );
}

// The gutter a node's element pays at each tier, from the snapshot's `settings.custom.gutter`, or null when the node does not
// pay one: it has no band, or an ancestor with a band (or side padding of its own) already pays it and core zeroes the nested one.
export function paysGutter( st, rec, allDrafts, cal = null ) {
	const gutter = st.rawSnapshot?.settings?.custom?.gutter;
	const node = st.flat[ rec.index ];
	if ( ! isObj( gutter ) || ! hasBand( st, node, rec.name, verticalPadded( allDrafts ), pendingWidth( st, rec, cal ) ) ) {
		return null;
	}
	for ( let i = rec.parent; null !== i && undefined !== i; i = st.nodes[ i ].parent ) {
		//( "anc", rec.index, "->", i, st.flat[ i ].attributes?.tagName, hasBand( st, st.flat[ i ], st.nodes[ i ].name, false ) );
		if ( hasBand( st, st.flat[ i ], st.nodes[ i ].name, ancestorVertical( st, i ) ) ) {
			return null;
		}
	}
	return gutter;
}

// Whether the draft's side padding is 0 on both sides at every width it was read at. A node with a side padding of its own at any
// width gets one written on its band, so it takes `sgs-band-gutter` and pays no gutter; only a draft with none anywhere leaves
// the gutter in place.
const noSidePadding = ( allDrafts ) => SIDE_PROPS.every( ( p ) => Object.values( allDrafts?.[ p ] ?? {} ).every( ( v ) => 0 === px( v ) ) );

// The baseline of a side padding of the root element: the gutter at a width where the draft's value is 0 and the node pays the
// gutter, else the calibrated default `base` gives. A node with a side padding of its own at any width, and a value other than 0,
// are judged against the default exactly as before: a section whose own side padding equals the gutter is written as its band's
// padding, and that is the content width the draft has.
export function gutterBaseline( st, rec, prop, draft, allDrafts, base, cal = null ) {
	if ( ! SIDE_PROPS.includes( prop ) || ! noSidePadding( allDrafts ) ) {
		return base;
	}
	const gutter = paysGutter( st, rec, allDrafts, cal );
	if ( ! gutter ) {
		return base;
	}
	return ( slot, w ) => {
		const g = '' === slot && 0 === px( draft?.[ w ] ) ? px( gutter[ TIER_OF( w ) ] ) : null;
		return null !== g && 0 !== g ? `${ g }px` : base( slot, w );
	};
}
