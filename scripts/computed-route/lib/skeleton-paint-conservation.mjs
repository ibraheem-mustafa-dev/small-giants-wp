// Paint conservation of a skeleton proposal (Spec 48 section 3.4): every draft element that paints something must be read by
// a block. An element is read when a skeleton node names it (its `draftRef`, a `draftSlots` entry, a band wrapper or any
// other finder the node carries), when a node names a loop copy of it (the same template element at another copy index: a
// loop is filled from its representative), or when another surface of the same client names it (a form, a flow or a
// commerce region built as its own surface). Every other painted element is a row here, with what it paints, the proposal
// row that dropped it (unwrap, absorbed, remove), the rule or the per-site decision that did so, and the host it was
// absorbed into. Pure functions over the saved inventory, proposal and skeleton: no browser, no site, no database.
import { resolvedWidths, renderedWidths, pxOf } from './element-facts.mjs';
import { paintedProps } from './css-families.mjs';
import { PX_TOL } from './css-equivalence/tolerance.mjs';
import { copylessKey, templateKey } from './fact-key.mjs';
import { revealId } from './reveal-merge.mjs';

// The looks a box can carry that a block must read to draw it as the draft does.
export const LOOKS = [ 'background', 'border', 'shadow', 'radius', 'padding', 'width', 'max-width', 'margin-auto', 'text-centre', 'layout', 'glyph', 'height', 'text-decoration' ];

const NONE = new Set( [ '', 'none', 'initial', 'unset', 'inherit', 'revert', 'normal' ] );
const NO_COLOUR = new Set( [ '', 'initial', 'unset', 'inherit', 'transparent', 'rgba(0, 0, 0, 0)', 'currentcolor' ] );
const BORDER_STYLE = /\b(?:solid|dashed|dotted|double|groove|ridge|inset|outset)\b/;
const SIDES = [ 'top', 'right', 'bottom', 'left' ];
const CORNERS = [ 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius' ];
const FILLS = new Set( [ '', 'auto', '100%', 'none', 'initial', 'unset', 'inherit' ] );
const TRANSPARENT = /\btransparent\b|rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/;
// The elements whose own height is their picture's size (a logo's declared height sizes it).
const REPLACED = new Set( [ 'img', 'svg', 'video', 'canvas', 'picture' ] );
// The display values that lay children out as a row, column or grid.
const LAYS_OUT = new Set( [ 'flex', 'inline-flex', 'grid', 'inline-grid' ] );
// The computed properties that, all recorded at a width, decide a look there over what a declaration states.
const COMPUTED_DECIDES = { padding: SIDES.map( ( s ) => `padding-${ s }` ), radius: CORNERS };

const low = ( v ) => String( v ?? '' ).trim().toLowerCase();
const zero = ( v ) => NONE.has( low( v ) ) || /^(?:0(?:\.0+)?(?:px|rem|em|%)?\s*)+$/.test( low( v ) );

// A declaration's `!important` flag, which says how it wins the cascade and nothing about what it paints.
const IMPORTANT = /\s*!\s*important\s*$/i;

// A `style` attribute's declarations as { property: value }, each value without its `!important` flag; a `;` inside brackets
// (a data url) does not split.
export function styleOf( text ) {
	const out = {};
	let depth = 0;
	let start = 0;
	const src = String( text ?? '' );
	const take = ( end ) => {
		const part = src.slice( start, end );
		const at = part.indexOf( ':' );
		if ( at > 0 ) {
			out[ part.slice( 0, at ).trim().toLowerCase() ] = part.slice( at + 1 ).replace( IMPORTANT, '' ).trim();
		}
		start = end + 1;
	};
	for ( let i = 0; i < src.length; i++ ) {
		const c = src[ i ];
		depth += '(' === c ? 1 : ')' === c ? -1 : 0;
		';' === c && 0 === depth && take( i );
	}
	take( src.length );
	return out;
}

// The space-separated parts of a value, a bracketed part (a calc(), a var()) kept whole.
const partsOf = ( value ) => {
	const out = [];
	let depth = 0;
	let cur = '';
	for ( const c of low( value ) ) {
		depth += { '(': 1, ')': -1 }[ c ] ?? 0;
		if ( /\s/.test( c ) && 0 === depth ) {
			cur && out.push( cur );
			cur = '';
		} else {
			cur += c;
		}
	}
	cur && out.push( cur );
	return out;
};

// The four sides of a margin or padding shorthand, in top, right, bottom, left order.
const boxSides = ( value ) => {
	const p = partsOf( value );
	return [ p[ 0 ], p[ 1 ] ?? p[ 0 ], p[ 2 ] ?? p[ 0 ], p[ 3 ] ?? p[ 1 ] ?? p[ 0 ] ];
};

// The looks a set of declarations paints ({ property: value }, as declared or as the style attribute renders them). `tag` is
// the element's: a replaced element's declared height sizes it, an svg with a stroke or fill is a drawn glyph, and a link's
// `text-decoration: none` is a look (a link is underlined unless told otherwise).
export function declaredLooks( st, tag = '' ) {
	const has = ( name ) => undefined !== st[ name ] && '' !== low( st[ name ] );
	const looks = new Set();
	if ( ( has( 'background-color' ) && ! NO_COLOUR.has( low( st[ 'background-color' ] ) ) ) || ( has( 'background-image' ) && ! NONE.has( low( st[ 'background-image' ] ) ) ) || ( has( 'background' ) && ! NONE.has( low( st.background ) ) && ! NO_COLOUR.has( low( st.background ) ) ) ) {
		looks.add( 'background' );
	}
	const shorthand = [ 'border', ...SIDES.map( ( s ) => `border-${ s }` ) ].some( ( n ) => has( n ) && BORDER_STYLE.test( low( st[ n ] ) ) && ! /^0(?:px)?\s/.test( low( st[ n ] ) ) && ! TRANSPARENT.test( low( st[ n ] ) ) );
	const widths = has( 'border-width' ) ? boxSides( st[ 'border-width' ] ) : SIDES.map( ( s ) => st[ `border-${ s }-width` ] );
	const styles = has( 'border-style' ) ? boxSides( st[ 'border-style' ] ) : SIDES.map( ( s ) => st[ `border-${ s }-style` ] );
	if ( shorthand || ( ! TRANSPARENT.test( low( st[ 'border-color' ] ) ) && SIDES.some( ( s, i ) => undefined !== widths[ i ] && ! zero( widths[ i ] ) && BORDER_STYLE.test( low( styles[ i ] ) ) ) ) ) {
		looks.add( 'border' );
	}
	has( 'box-shadow' ) && ! NONE.has( low( st[ 'box-shadow' ] ) ) && looks.add( 'shadow' );
	[ 'border-radius', ...CORNERS ].some( ( n ) => has( n ) && ! zero( st[ n ] ) ) && looks.add( 'radius' );
	[ 'padding', 'padding-block', 'padding-inline', ...SIDES.map( ( s ) => `padding-${ s }` ) ].some( ( n ) => has( n ) && ! zero( st[ n ] ) ) && looks.add( 'padding' );
	has( 'width' ) && ! FILLS.has( low( st.width ) ) && looks.add( 'width' );
	has( 'max-width' ) && ! FILLS.has( low( st[ 'max-width' ] ) ) && looks.add( 'max-width' );
	const margin = has( 'margin' ) ? boxSides( st.margin ) : [];
	if ( 'auto' === margin[ 1 ] || 'auto' === margin[ 3 ] || [ 'margin-left', 'margin-right', 'margin-inline' ].some( ( n ) => /\bauto\b/.test( low( st[ n ] ) ) ) ) {
		looks.add( 'margin-auto' );
	}
	'center' === low( st[ 'text-align' ] ) && looks.add( 'text-centre' );
	REPLACED.has( tag ) && has( 'height' ) && ! FILLS.has( low( st.height ) ) && looks.add( 'height' );
	'svg' === tag && [ 'stroke', 'fill' ].some( ( n ) => has( n ) && ! NONE.has( low( st[ n ] ) ) ) && looks.add( 'glyph' );
	const line = low( st[ 'text-decoration-line' ] ?? st[ 'text-decoration' ] );
	'' !== line && ( 'a' === tag || ! /^none\b/.test( line ) ) && looks.add( 'text-decoration' );
	return looks;
}

// The key the browser's own padding of an element is measured under (lib/skeleton-inventory.mjs::uaPaddingOf): its tag, and
// an input's type, which changes the padding the browser gives it.
export const uaKeyOf = ( e ) => ( 'input' === e?.tag && e.attrs?.type ? `input[type=${ low( e.attrs.type ) }]` : String( e?.tag ?? '' ) );

// The looks an element's computed values show at one width (the inventory's `resolved` read). A value the read does not
// record says nothing. `text-align` is inherited, so it counts only where it differs from the parent's at that width. A border
// side counts where its width is drawn, its style (where recorded) draws, and its colour (where recorded) is not transparent.
// `paddingBase` is the browser's own padding of the element's tag ({ 'padding-top': '1px', ... }): computed padding counts
// where a side is above zero and differs from it; null (no baseline for the tag) counts no computed padding, so a caller must
// not read its absence as zero padding (paintsBox's refutation reads the sides themselves there); undefined counts any side
// above zero.
export function computedLooks( values, parentValues = null, paddingBase = undefined ) {
	const looks = new Set();
	const v = ( n ) => values?.[ n ];
	( ( undefined !== v( 'background-color' ) && ! NO_COLOUR.has( low( v( 'background-color' ) ) ) ) || ( undefined !== v( 'background-image' ) && ! NONE.has( low( v( 'background-image' ) ) ) ) ) && looks.add( 'background' );
	SIDES.some( ( s ) => ( pxOf( v( `border-${ s }-width` ) ) ?? 0 ) > 0 && ! [ ...NONE, 'hidden' ].includes( low( v( `border-${ s }-style` ) ?? 'solid' ) ) && ! TRANSPARENT.test( low( v( `border-${ s }-color` ) ) ) ) && looks.add( 'border' );
	undefined !== v( 'box-shadow' ) && ! NONE.has( low( v( 'box-shadow' ) ) ) && looks.add( 'shadow' );
	CORNERS.some( ( n ) => undefined !== v( n ) && ! zero( v( n ) ) ) && looks.add( 'radius' );
	null !== paddingBase && SIDES.some( ( s ) => ( pxOf( v( `padding-${ s }` ) ) ?? 0 ) > 0 && ( undefined === paddingBase || v( `padding-${ s }` ) !== paddingBase[ `padding-${ s }` ] ) ) && looks.add( 'padding' );
	undefined !== v( 'max-width' ) && ! FILLS.has( low( v( 'max-width' ) ) ) && looks.add( 'max-width' );
	'center' === low( v( 'text-align' ) ) && 'center' !== low( parentValues?.[ 'text-align' ] ) && looks.add( 'text-centre' );
	return looks;
}

// What an element paints: { look: [ widths ] } over the widths it renders at, empty when it paints nothing or renders at no
// width. Computed values are read per width where the inventory holds them; the declared styles (`declared`, the fact
// record's, lib/skeleton-record.mjs::recordView().declared) and the rendered style attribute hold at every rendered width.
// `children` is how many elements it directly holds: a flex or grid box holding two or more lays them out, and dissolving it
// loses their grouping (`layout`), at the widths where its display (the inventory's `displayAt`) is flex or grid; an inventory
// without `displayAt` has its one `display` stand for every width.
// `uaPadding` is the inventory's measurement of the browser's own padding per tag (its `uaPadding`): computed padding counts
// only where it differs from the element's tag's; null (a saved inventory read before the measurement, or a tag it lacks) adds
// no computed padding, and a declared padding stands unless every recorded side computes to zero; undefined (a caller that
// passes none: the skeleton rules on a saved inventory) counts any computed padding.
export function paintsBox( element, { declared = {}, parent = null, children = 0, uaPadding = undefined } = {} ) {
	const widths = renderedWidths( element );
	const out = {};
	const add = ( look, w ) => {
		( out[ look ] ??= [] ).includes( w ) || out[ look ].push( w );
	};
	if ( ! widths.length ) {
		return out;
	}
	const stated = new Set( [ ...declaredLooks( declared, element.tag ), ...declaredLooks( styleOf( element.attrs?.style ), element.tag ) ] );
	const displayAt = ( w ) => ( element.displayAt ? element.displayAt[ w ] : element.display );
	const paddingBase = undefined === uaPadding ? undefined : uaPadding?.[ uaKeyOf( element ) ] ?? null;
	const computed = new Map( resolvedWidths( element ).map( ( w ) => [ w, computedLooks( element.resolved[ w ], parent?.resolved?.[ w ], paddingBase ) ] ) );
	// A width whose computed read holds every side of a look decides that look there: a declared token or binding that
	// resolves to nothing (`padding: var(--section) 0` computing 0px on every side) paints nothing. With no browser baseline
	// for the tag (null) the computed read reports no padding at all, so it refutes a declared padding only where every
	// recorded side is zero.
	const decides = null === paddingBase ? new Map( resolvedWidths( element ).map( ( w ) => [ w, computedLooks( element.resolved[ w ], parent?.resolved?.[ w ] ) ] ) ) : computed;
	const refuted = ( look, w ) => decides.has( w ) && ! decides.get( w ).has( look ) && ( COMPUTED_DECIDES[ look ] ?? [] ).length > 0 && COMPUTED_DECIDES[ look ].every( ( n ) => undefined !== element.resolved[ w ][ n ] );
	for ( const w of widths ) {
		stated.forEach( ( look ) => refuted( look, w ) || add( look, w ) );
		children >= 2 && LAYS_OUT.has( low( displayAt( w ) ) ) && add( 'layout', w );
	}
	computed.forEach( ( looks, w ) => looks.forEach( ( look ) => add( look, w ) ) );
	return out;
}

// A key with every copy index removed: the template element it is a copy of, wherever its hosts sit.
export const templateOf = ( key ) => copylessKey( String( key ) ) ?? String( key );
// A key with its own copy index removed: the loop it is a copy in, under the same host instances.
export const loopOf = ( key ) => String( key ).replace( /#\d+$/, '' );

// The looks a band wrapper finder reads: Fill reads a dissolved wrapper's box only, as evidence of the content band's width
// (lib/fill-band.mjs), so its cap and centring are conserved and its paint is not.
export const BAND_LOOKS = [ 'width', 'max-width', 'margin-auto' ];
const BAND_KEY = 'draftBandWrappers';

// The draft elements a skeleton tree names, by what the finder reads: Map( key -> 'full' | 'band' ). Every `{ tpl }` finder
// on a node counts, whatever property carries it (the node's own element, its slots, its item template), and so does a
// width alternative's `{ key, shown }` (the element the node is read at on other widths), never a value in its attributes
// or fingerprint. A finder under `draftBandWrappers` reads the box's width cap
// only (`band`); an element another finder also names is read in full.
// The first svg element under `item` in document order, or null.
const firstSvgUnder = ( item, elements ) => {
	const kids = new Map();
	elements.forEach( ( e ) => e.parentKey && ( kids.get( e.parentKey ) ?? kids.set( e.parentKey, [] ).get( e.parentKey ) ).push( e ) );
	const walk = ( e ) => {
		for ( const k of kids.get( e.key ) || [] ) {
			const hit = 'svg' === k.tag ? k : walk( k );
			if ( hit ) {
				return hit;
			}
		}
		return null;
	};
	return walk( item );
};

export function namedReads( tree, elements = [] ) {
	const out = new Map();
	const select = selectorFinder( elements );
	const find = ( v, kind ) => {
		if ( Array.isArray( v ) ) {
			v.forEach( ( x ) => find( x, kind ) );
		} else if ( v && 'object' === typeof v ) {
			const named = 'string' === typeof v.tpl ? v.tpl : 'string' === typeof v.key && Array.isArray( v.shown ) ? v.key : null;
			null !== named && ( 'full' === kind || ! out.has( named ) ) && out.set( named, kind );
			Object.values( v ).forEach( ( x ) => find( x, kind ) );
		}
	};
	const walk = ( nodes ) => {
		for ( const n of nodes || [] ) {
			for ( const [ k, v ] of Object.entries( n ) ) {
				[ 'innerBlocks', 'attributes', 'draftFingerprint', 'name' ].includes( k ) || find( v, BAND_KEY === k ? 'band' : 'full' );
			}
			// A Site Info row names its element with a selector (lib/skeleton-write-units.mjs, `siteInfoRow`), and its items with selectors inside it (`childRefs`).
			const row = 'string' === typeof n.draftRef ? select( n.draftRef ) : null;
			row && out.set( row.key, 'full' );
			row && Object.values( n.childRefs || {} ).forEach( ( s ) => {
				const item = 'string' === typeof s ? select( s, row ) : null;
				item && out.set( item.key, 'full' );
				// Fill reads each generated icon's glyph at the first svg inside its item (lib/fill-skeleton.mjs::expandSiteInfoRows,
				// ROW_GLYPH_SLOT), so that svg is named too.
				const glyph = item ? firstSvgUnder( item, elements ) : null;
				glyph && out.set( glyph.key, 'full' );
			} );
			walk( n.innerBlocks );
		}
	};
	walk( Array.isArray( tree ) ? tree : [ tree ] );
	return out;
}

const DC_TPL = /\[data-dc-tpl="(\d+)"\]/g;

// The inventory element a selector finder names (`footer[data-dc-tpl="2"] [data-dc-tpl="44"]`): the one element whose template
// number is the selector's last, inside an element of the same template whose number is the selector's first (and inside
// `within`, when given). Null when the selector names no number or the draft holds no one such element.
export function selectorFinder( elements = [] ) {
	const byKey = new Map( elements.map( ( e ) => [ e.key, e ] ) );
	const inside = ( e, test ) => {
		for ( let p = byKey.get( e.parentKey ); p; p = byKey.get( p.parentKey ) ) {
			if ( test( p ) ) {
				return true;
			}
		}
		return false;
	};
	return ( selector, within = null ) => {
		const tpls = [ ...String( selector ).matchAll( DC_TPL ) ].map( ( m ) => Number( m[ 1 ] ) );
		const last = tpls.at( -1 );
		const hits = elements.filter( ( e ) => Number( e.tpl ) === last && ( ! within || inside( e, ( p ) => p === within ) ) && ( tpls.length < 2 || inside( e, ( p ) => Number( p.tpl ) === tpls[ 0 ] && p.template === e.template ) ) );
		return 1 === hits.length ? hits[ 0 ] : null;
	};
}

// The draft element keys a skeleton tree names with any finder (`elements`: the inventory's, to read selector finders).
export const namedKeys = ( tree, elements = [] ) => new Set( namedReads( tree, elements ).keys() );

// An element's identity across the surfaces of one client: its template's component and number. An element of the surface's
// own root template takes the surface's draft file as its component (`component`), since `Root` names a different file on
// each page of a draft that has one file a page.
export const identityOf = ( element, component ) => templateKey( { dc: 'Root' === element.template ? component ?? 'Root' : element.template, tpl: element.tpl } );

// The identities a surface's inventory holds (every element, painted or not).
export const heldIdentities = ( { inventory, component } ) => new Set( ( inventory?.elements || [] ).map( ( e ) => identityOf( e, component ) ) );

// The identities a surface's skeleton names, for the other surfaces of its client to check against.
export function namedIdentities( { inventory, skeleton, component } ) {
	const byKey = new Map( ( inventory?.elements || [] ).map( ( e ) => [ e.key, e ] ) );
	const out = new Set();
	for ( const key of namedKeys( skeleton, inventory?.elements || [] ) ) {
		const e = byKey.get( key );
		e && out.add( identityOf( e, component ) );
	}
	return out;
}

// The looks a calibrated setting's entry paints: one per property it paints (lib/css-families.mjs::paintedProps), `height,width` sizing two.
export const looksOfEntry = ( entry, tag = '' ) => [ ...new Set( paintedProps( entry ).map( ( p ) => lookOfProperty( p, tag ) ).filter( Boolean ) ) ];

// The CSS property a calibrated setting paints, as the look it is (null for a property that paints none of LOOKS).
export function lookOfProperty( property, tag = '' ) {
	const p = low( property );
	if ( /^background(?:-color|-image)?$/.test( p ) ) {
		return 'background';
	}
	if ( /radius$/.test( p ) ) {
		return 'radius';
	}
	if ( /^border(?:-(?:top|right|bottom|left))?(?:-(?:width|style|color))?$/.test( p ) ) {
		return 'border';
	}
	const direct = { 'box-shadow': 'shadow', width: 'width', 'max-width': 'max-width', 'text-align': 'text-centre', fill: 'glyph', stroke: 'glyph', height: 'height' };
	if ( direct[ p ] ) {
		return direct[ p ];
	}
	if ( /^padding/.test( p ) ) {
		return 'padding';
	}
	if ( /^margin/.test( p ) ) {
		return 'margin-auto';
	}
	if ( /^text-decoration|^text-underline/.test( p ) ) {
		return 'text-decoration';
	}
	if ( [ 'display', 'flex-direction', 'flex-wrap', 'gap', 'row-gap', 'column-gap', 'grid-template-columns', 'justify-content', 'align-items' ].includes( p ) ) {
		return 'layout';
	}
	return 'svg' === low( tag ) && 'color' === p ? 'glyph' : null;
}

// The looks inherited by the elements inside: a dissolved wrapper's centred text is read at each node inside it, whose own
// computed text-align is the wrapper's.
export const INHERITED_LOOKS = [ 'text-centre' ];

// Where a painted element's look goes when no node names it: the closed list of records a proposal row carries as `conserve`
// (a list of { kind, ... }), each with the fields it must name. A record that `delivers` takes the looks it names off the row
// once the check can verify it; the others keep the element listed in a class of its own, counted apart and never failing
// tools/paint-conservation.mjs --check. Any other painted element no node reads is a proposal problem.
//   setting       a setting of the node at `node` (an element key) carries `looks` (a label's cap is the field's maxWidth):
//                 verified when that node is in the skeleton and holds `setting` among its attributes or its decided settings.
//   inherited     `looks` are inherited (INHERITED_LOOKS) and a node inside the element reads them from its own computed values.
//   host-layout   the block at `node` lays the element's children out itself (a hero's split columns): `looks` is layout only.
//   host-band     the block at `node` draws its columns within its own content width, so the width cap and auto side margins of
//                 the wrapper that held those columns (`looks`: BAND_LOOKS only) are that width (rules.heroInner.hostBand). Verified when
//                 that node is in the skeleton and a content-width setting it already holds is the wrapper's cap (`width`, px).
//   absorbed      the parent block at `node` absorbed the element (lib/skeleton-absorb-wrapper.mjs): it is that node's draft
//                 element at the part `slot`, whose `settings` carry `looks`. Verified when that node is in the skeleton and its
//                 draftSlots names a finder at `slot`.
//   link-slot     the block at `node` draws the dissolved element as its own part at `slot`, which reads `looks` (a logo's
//                 link part: lib/skeleton-wrapper-link-slot.mjs). Verified when that node is in the skeleton and its
//                 draftSlots names a finder at `slot`.
//   overlay       the block at `node` took the element in as its overlay (lib/skeleton-overlay-layer.mjs): the element is one of
//                 the layers of that node's `draftOverlay` at `slot`, whose `setting` carries `looks` (with `settings`, the
//                 overlay's others). Verified when that node is in the skeleton and its draftOverlay at `slot` lists `layer`.
//   format        the text block at `node` holds the element's words in its rich text inside the format `format` (`s`, a
//                 strikethrough), which draws `looks` (lib/skeleton-write-content.mjs::makeContent). Verified when that node is in
//                 the skeleton and a text attribute holds `<format>`.
//   no-part      the host block `block` draws the element as a part with a fixed look: a missing block setting. The check
//                 verifies it against the block's settings (`calibration( block )`: the setting record in the client's site
//                 look, named in `checked`): no setting at any slot paints any of `looks`, or the record is refused.
//   not-calibrated the host block `block` has no calibration to check, so whether a part paints the look is unknown.
//   unpaired      the host block `block` absorbed the element and the proposal's part pairing
//                 (lib/skeleton-part-pairing.mjs) refused it: several of the block's measured parts fit it (`candidates`), or
//                 none of the part's positions holds it, so no slot reads its looks.
//   handover      `delivers` names the block effect or site setting that paints it (a pointer glare, a reading progress bar).
//   own-surface   the element is built and read on a surface of its own (`rule`: a linked form, a commerce region).
//   site-decision a per-site decision dropped it (`source`); a new draft never has one.
export const RECORD_KINDS = {
	setting: { needs: [ 'node', 'setting', 'looks' ], delivers: true },
	inherited: { needs: [ 'looks' ], delivers: true },
	'host-layout': { needs: [ 'node', 'looks' ], delivers: true },
	'host-band': { needs: [ 'node', 'looks' ], delivers: true },
	absorbed: { needs: [ 'node', 'slot', 'settings', 'looks' ], delivers: true },
	'link-slot': { needs: [ 'node', 'slot', 'looks' ], delivers: true },
	overlay: { needs: [ 'node', 'slot', 'setting', 'layer', 'looks' ], delivers: true },
	format: { needs: [ 'node', 'format', 'looks' ], delivers: true },
	'no-part': { needs: [ 'block', 'looks', 'checked' ], delivers: false },
	'not-calibrated': { needs: [ 'block' ], delivers: false },
	unpaired: { needs: [ 'block', 'candidates' ], delivers: false },
	handover: { needs: [ 'delivers' ], delivers: false },
	'own-surface': { needs: [ 'rule' ], delivers: false },
	'site-decision': { needs: [ 'source' ], delivers: false },
};

// Whether a row a record lists apart (it delivers nothing to the clone: RECORDED-UNREAD) fails the proposal and --check. Off: a
// page whose block lacks a setting still clones, and the proposal names what it does not show (paintUnread). On is the rule as
// written: a painted element is read by a block or the proposal fails.
export const STRICT_DEFAULT = false;

// The looks the settings of a calibration paint at any slot and in any state (lookOfProperty).
export const calibratedLooks = ( settings = {} ) => new Set( Object.values( settings || {} ).flatMap( ( x ) => looksOfEntry( x ) ) );

// The classes of a row that carries a valid record which delivers nothing (RECORDED-UNREAD): listed apart, failing only in strict mode.
export const RECORDED_CLASSES = Object.keys( RECORD_KINDS ).filter( ( k ) => ! RECORD_KINDS[ k ].delivers );

// The skeleton node of each draft element named as a node's own element (its draftRef): Map( key -> node ).
export function nodesByRef( tree ) {
	const out = new Map();
	const walk = ( list ) => ( list || [] ).forEach( ( n ) => {
		'string' === typeof n.draftRef?.tpl && ! out.has( n.draftRef.tpl ) && out.set( n.draftRef.tpl, n );
		walk( n.innerBlocks );
	} );
	walk( Array.isArray( tree ) ? tree : [ tree ] );
	return out;
}

// Why a host-band record cannot stand, or null: the width the host node already holds in a content-width setting (a max-width setting
// that paints a part other than its root, or the record's own `setting`) is not the cap the record names (`width`, px). A node that holds
// none is not judged here: its band is the one Fill writes (lib/fill-band.mjs), and a block whose record places no such setting has no
// reader for it at all (the proposal's own `unread` list).
function bandProblem( rec, node, settings ) {
	const cap = Number( rec.width );
	if ( ! Number.isFinite( cap ) ) {
		return null;
	}
	const attrs = [ ...Object.entries( settings || {} ).filter( ( [ , e ] ) => ! e?.state && paintedProps( e ).includes( 'max-width' ) && 'string' === typeof e?.slot && '' !== e.slot ).map( ( [ name ] ) => name ), ...( rec.setting ? [ rec.setting ] : [] ) ];
	for ( const attr of attrs ) {
		const held = node.attributes?.[ attr ] ?? node.decided?.[ attr ];
		const values = held && 'object' === typeof held ? Object.values( held ) : [ held ];
		const off = values.map( ( v ) => pxOf( v ) ).find( ( px ) => null !== px && undefined !== px && Math.abs( px - cap ) > PX_TOL );
		if ( undefined !== off ) {
			return `host-band ${ rec.node }: ${ node.name } holds ${ attr } ${ off }px but the wrapper it replaces caps at ${ cap }px`;
		}
	}
	return null;
}

// What a row's records do for the looks left unread: { delivered: [ looks ], listed: record | null, bad: [ text ] }.
// `nodes`: nodesByRef of the skeleton; `below`: whether a node reads an element inside this one.
// `calibration( block )`: the block's calibrated settings, or null where it has none (a no-part record is refused without it).
export function checkRecords( records, { looks, nodes, below = false, calibration = () => null } ) {
	const out = { delivered: [], listed: null, bad: [] };
	for ( const rec of [].concat( records || [] ) ) {
		const kind = RECORD_KINDS[ rec?.kind ];
		const missing = kind ? kind.needs.filter( ( f ) => null == rec[ f ] || '' === rec[ f ] || ( Array.isArray( rec[ f ] ) && ! rec[ f ].length ) ) : [];
		if ( ! kind || missing.length ) {
			out.bad.push( kind ? `${ rec.kind } names no ${ missing.join( ', ' ) }` : `no record kind ${ rec?.kind }` );
			continue;
		}
		if ( 'no-part' === rec.kind || 'not-calibrated' === rec.kind ) {
			const settings = calibration( rec.block );
			const has = settings && Object.keys( settings ).length;
			const painted = has ? [].concat( rec.looks || looks ).filter( ( l ) => looks.includes( l ) && calibratedLooks( settings ).has( l ) ) : [];
			const why = 'no-part' === rec.kind ? ( ! has ? `no-part for ${ rec.block }: the block has no calibration, so it is not calibrated, not no-part` : painted.length ? `no-part for ${ rec.block }: its calibration paints ${ painted.join( ', ' ) } at a slot` : null ) : has ? `not-calibrated for ${ rec.block }: the block has a calibration` : null;
			if ( why ) {
				out.bad.push( why );
				continue;
			}
		}
		if ( ! kind.delivers ) {
			out.listed ??= rec;
			continue;
		}
		const named = [].concat( rec.looks ).filter( ( l ) => looks.includes( l ) );
		const node = rec.node ? nodes.get( rec.node ) : null;
		const bandWhy = 'host-band' === rec.kind && node ? bandProblem( rec, node, calibration( node.name ) ) : null;
		if ( bandWhy ) {
			out.bad.push( bandWhy );
			continue;
		}
		const ok = 'setting' === rec.kind ? !! node && ( undefined !== node.attributes?.[ rec.setting ] || undefined !== node.decided?.[ rec.setting ] ) : 'absorbed' === rec.kind || 'link-slot' === rec.kind ? !! node?.draftSlots?.[ rec.slot ] : 'overlay' === rec.kind ? rec.slot === node?.draftOverlay?.slot && !! node.draftSlots?.[ rec.slot ] && ( node.draftOverlay.layers || [] ).some( ( f ) => rec.layer === f?.tpl ) : 'format' === rec.kind ? !! node && Object.values( node.attributes || {} ).some( ( v ) => 'string' === typeof v && v.includes( `<${ rec.format }>` ) ) : 'inherited' === rec.kind ? below && named.every( ( l ) => INHERITED_LOOKS.includes( l ) ) : 'host-band' === rec.kind ? !! node && named.every( ( l ) => BAND_LOOKS.includes( l ) ) : !! node && named.every( ( l ) => 'layout' === l );
		ok ? out.delivered.push( ...named ) : out.bad.push( `${ rec.kind } ${ rec.node ?? '' } ${ rec.setting ?? '' } cannot be verified` );
	}
	return out;
}

const SITE_DECISION = /^Bean marked /;
const INSIDE = /^inside a removed element \(([^)]+)\)/;

// A row's records: its own `conserve`, or the record of the element whose removal took it.
export function recordsOf( row, rows, depth = 0 ) {
	if ( ! row ) {
		return [];
	}
	if ( row.conserve ) {
		return [].concat( row.conserve );
	}
	const inside = INSIDE.exec( row.reason ?? '' );
	return inside && depth < 8 ? recordsOf( rows.get( inside[ 1 ] ), rows, depth + 1 ) : [];
}

// Who dropped a proposal row: `site-decision` (a per-site intake decision, which a new draft does not have), `rule` (a
// standing rule, named in `rule`), or `none`. A row inside a removed element takes its remover's answer.
export function droppedBy( row, rows, depth = 0 ) {
	if ( ! row ) {
		return { by: 'none', rule: null };
	}
	const inside = INSIDE.exec( row.reason ?? '' );
	if ( inside && depth < 8 && rows.get( inside[ 1 ] ) ) {
		return droppedBy( rows.get( inside[ 1 ] ), rows, depth + 1 );
	}
	if ( 'client decision' === row.source || SITE_DECISION.test( row.reason ?? '' ) || /^decisions /.test( row.source ?? '' ) ) {
		return { by: 'site-decision', rule: row.rule ?? null };
	}
	return row.rule ? { by: 'rule', rule: row.rule } : { by: 'none', rule: null };
}

// The conservation rows of one surface: one per painted element no node reads. `otherSurfaces` is [ { surface, identities } ]
// (namedIdentities of the client's other surfaces); `ownedElsewhere` is the identities a narrower surface of the client
// holds in its own inventory (a form's fields on the page that shows the form: the form's surface lists them, once);
// `component` is this surface's draft file name without its extension; `view` is a fact record view (optional). Returns
// { rows, counts } where counts holds the elements painted, read exactly, read through a loop copy, read through a copy under
// another host instance, read through a sibling of the same tag and style that a node names (a static list whose first
// link is the slot), read by another surface, and left to the narrower surface that holds them.
// The elements only a state shows (the inventory's `revealed`, each with the `reveal` state that shows it) are checked the same
// way and counted in `painted` and in `statePainted`; one element read in several states is checked once. The proposal gives
// them no rows, so one no node reads is class `state-only`, with the state in `shownIn`.
// Row: { key, tag, words, looks, class, action, rule, by, into, host, hostBlock, hostSlots, shownIn? }.
//   class: `unwrapped` (the wrapper went and nothing records where its look goes), `band-only` (the wrapper went and a band
//   finder reads its width cap, so `looks` holds only the paint that finder does not read), `host-unread` (absorbed into a
//   block that draws it, whose slots do not name it), `removed`, `unresolved` (no block fits it: a proposal problem of its own),
//   `kept-unnamed` (the row kept a block but no node names the element), `no-row` (the proposal holds no row for it, and no row lists it among its `parts`: a part a row lists is `host-unread` in the block of that row) or `state-only` (only a state shows it).
export function conservationRows( { inventory, proposal, skeleton, view = null, otherSurfaces = [], ownedElsewhere = new Set(), component = null, calibration = () => null } ) {
	const elements = inventory?.elements || [];
	const byKey = new Map( elements.map( ( e ) => [ e.key, e ] ) );
	const rows = new Map( ( proposal?.rows || [] ).map( ( r ) => [ r.key, r ] ) );
	const reads = namedReads( skeleton, elements );
	const named = new Set( reads.keys() );
	const full = [ ...named ].filter( ( k ) => 'full' === reads.get( k ) );
	const banded = [ ...named ].filter( ( k ) => 'band' === reads.get( k ) );
	const counts = { painted: 0, statePainted: 0, exact: 0, loopCopy: 0, instanceCopy: 0, siblingCopy: 0, otherSurface: 0, ownedElsewhere: 0, recorded: 0, listedApart: 0, unread: 0 };
	const nodes = nodesByRef( skeleton );
	// The elements that hold an element a node reads in full.
	const holdsRead = new Set();
	full.forEach( ( k ) => {
		for ( let p = byKey.get( byKey.get( k )?.parentKey ); p && ! holdsRead.has( p.key ); p = byKey.get( p.parentKey ) ) {
			holdsRead.add( p.key );
		}
	} );
	// The row of an unread element, or nothing when its records deliver every look left: { ...row, state } where state is
	// `recorded` (a record that delivers nothing, or a per-site decision: listed in the record's class) or `unrecorded`.
	// `shownIn`: the state that shows the element, whose key names no proposal row of its own.
	const listRow = ( e, looks, cls, host = null, shownIn = null ) => {
		const row = shownIn ? null : rows.get( e.key ) ?? null;
		const dropped = droppedBy( row, rows );
		const rec = checkRecords( recordsOf( row, rows ), { looks: Object.keys( looks ), nodes, below: holdsRead.has( e.key ), calibration } );
		const left = Object.fromEntries( Object.entries( looks ).filter( ( [ l ] ) => ! rec.delivered.includes( l ) ) );
		if ( ! Object.keys( left ).length ) {
			counts.recorded++;
			return;
		}
		const listed = rec.listed ?? ( 'site-decision' === dropped.by ? { kind: 'site-decision', source: row?.source ?? null } : null );
		listed && ! rec.bad.length ? counts.listedApart++ : counts.unread++;
		out.push( { key: e.key, tag: e.tag, words: String( e.words ?? '' ).slice( 0, 60 ), looks: left, class: rec.bad.length ? 'record-unverified' : listed ? listed.kind : cls, was: cls, state: listed && ! rec.bad.length ? 'recorded' : 'unrecorded', record: listed, ...( rec.bad.length ? { recordProblems: rec.bad } : {} ), action: row?.action ?? null, rule: dropped.rule, by: dropped.by, handover: row?.handover?.kind ?? null, into: row?.into ?? null, host: host?.key ?? null, hostBlock: host?.block ?? null, hostSlots: host?.slots ? Object.keys( host.slots ).length : 0, ...( shownIn ? { shownIn } : {} ) } );
	};
	const kids = new Map();
	elements.forEach( ( e ) => kids.set( e.parentKey, ( kids.get( e.parentKey ) ?? 0 ) + 1 ) );
	// A state's elements by state and key, and how many each holds in that state: a state element's parent and children are
	// first its own state's (a key an opening element also carries names another element there).
	const revealed = inventory?.revealed || [];
	const inState = ( e, key ) => `${ revealId( e.reveal ) }|${ key }`;
	const stateRecs = new Map( revealed.map( ( e ) => [ inState( e, e.key ), e ] ) );
	const stateKids = new Map();
	revealed.forEach( ( e ) => stateKids.set( inState( e, e.parentKey ), ( stateKids.get( inState( e, e.parentKey ) ) ?? 0 ) + 1 ) );
	const parentOf = ( e ) => ( e.reveal ? stateRecs.get( inState( e, e.parentKey ) ) : null ) ?? byKey.get( e.parentKey ) ?? null;
	const childrenOf = ( e ) => ( e.reveal ? ( stateKids.get( inState( e, e.key ) ) ?? 0 ) + ( byKey.has( e.key ) ? 0 : kids.get( e.key ) ?? 0 ) : kids.get( e.key ) ?? 0 );
	// A sibling's signature: its parent, tag and style attribute. An element with no style attribute has none.
	const signature = ( e ) => ( e.attrs?.style ? JSON.stringify( [ e.parentKey, e.tag, e.attrs.style ] ) : null );
	// The copies a set of named keys represents: the loops, the templates and the like siblings they stand for.
	const copiesOf = ( keys ) => ( { loopCopy: new Set( keys.map( loopOf ) ), instanceCopy: new Set( keys.map( templateOf ) ), siblingCopy: new Set( keys.map( ( k ) => byKey.get( k ) ).filter( Boolean ).map( signature ).filter( Boolean ) ) } );
	const copyId = { loopCopy: ( e ) => loopOf( e.key ), instanceCopy: ( e ) => templateOf( e.key ), siblingCopy: signature };
	const fullCopies = copiesOf( full );
	const bandCopies = copiesOf( banded );
	// How an element no node names is read through a copy: { via (the count it adds to), kind ('full' or 'band') }, or null. A
	// copy takes its representative's read, a copy of a fully read element first; a band wrapper's copy has its cap read only.
	const copyRead = ( e ) => {
		for ( const [ kind, copies ] of [ [ 'full', fullCopies ], [ 'band', bandCopies ] ] ) {
			const via = Object.keys( copyId ).find( ( k ) => {
				const id = copyId[ k ]( e );
				return null !== id && copies[ k ].has( id );
			} );
			if ( via ) {
				return { via, kind };
			}
		}
		return null;
	};
	const out = [];
	const partOf = new Map( ( proposal?.rows || [] ).flatMap( ( r ) => ( r.parts || [] ).map( ( k ) => [ k, r ] ) ) );
	const hostOf = ( row ) => {
		let r = row;
		for ( let i = 0; i < 8 && r?.into && ! named.has( r.key ); i++ ) {
			r = rows.get( r.into );
		}
		return r && r !== row ? r : null;
	};
	// One element: counted as read, or a row. `shownIn`: the state that shows it, for an element of `revealed`.
	const check = ( e, shownIn = null ) => {
		const painted = paintsBox( e, { declared: view?.declared?.( e ) ?? {}, parent: parentOf( e ), children: childrenOf( e ), uaPadding: inventory?.uaPadding ?? null } );
		if ( ! Object.keys( painted ).length ) {
			return;
		}
		counts.painted++;
		shownIn && counts.statePainted++;
		// A band finder reads the width cap alone: the paint it leaves is still unread.
		const band = 'band' === reads.get( e.key );
		const looks = band ? Object.fromEntries( Object.entries( painted ).filter( ( [ look ] ) => ! BAND_LOOKS.includes( look ) ) ) : painted;
		if ( named.has( e.key ) && ! Object.keys( looks ).length ) {
			counts.exact++;
			return;
		}
		if ( band ) {
			listRow( e, looks, 'band-only', null, shownIn );
			return;
		}
		if ( named.has( e.key ) ) {
			counts.exact++;
			return;
		}
		const copy = copyRead( e );
		const copyLooks = 'band' === copy?.kind ? Object.fromEntries( Object.entries( painted ).filter( ( [ look ] ) => ! BAND_LOOKS.includes( look ) ) ) : {};
		if ( copy && ! Object.keys( copyLooks ).length ) {
			counts[ copy.via ]++;
			return;
		}
		if ( copy ) {
			listRow( e, copyLooks, 'band-only', null, shownIn );
			return;
		}
		const elsewhere = otherSurfaces.find( ( s ) => s.identities.has( identityOf( e, component ) ) );
		if ( elsewhere ) {
			counts.otherSurface++;
			return;
		}
		if ( ownedElsewhere.has( identityOf( e, component ) ) ) {
			counts.ownedElsewhere++;
			return;
		}
		if ( shownIn ) {
			listRow( e, looks, 'state-only', null, shownIn );
			return;
		}
		const row = rows.get( e.key ) ?? null;
		// A part (a drawn svg a row lists in its `parts`) has no row of its own: the block of the row that lists it draws it.
		const owner = row ? null : partOf.get( e.key ) ?? null;
		if ( owner ) {
			listRow( e, looks, 'host-unread', named.has( owner.key ) ? owner : hostOf( owner ) );
			return;
		}
		const cls = ! row ? 'no-row' : 'unwrap' === row.action ? 'unwrapped' : 'absorbed' === row.action ? 'host-unread' : 'remove' === row.action ? 'removed' : 'unresolved' === row.action ? 'unresolved' : 'kept-unnamed';
		listRow( e, looks, cls, hostOf( row ) );
	};
	elements.forEach( ( e ) => check( e ) );
	// An element several states show is one element: checked once, in the first state that shows it.
	const seen = new Set();
	for ( const e of revealed ) {
		const id = JSON.stringify( [ e.key, e.tag, e.words ?? '', e.attrs?.style ?? '' ] );
		seen.has( id ) || ( seen.add( id ), check( e, e.reveal ?? {} ) );
	}
	return { rows: out, counts };
}

// The proposal problems of one surface's paint conservation (the propose-time check): one line per class and rule, naming each
// painted element that is neither read nor validly recorded. Takes the same arguments as conservationRows.
// With `strict` (STRICT_DEFAULT when not given) a row a record lists apart (RECORDED-UNREAD) is a problem too.
export function paintProblems( { strict = STRICT_DEFAULT, ...args } ) {
	const groups = new Map();
	for ( const r of conservationRows( args ).rows.filter( ( x ) => 'unrecorded' === x.state || strict ) ) {
		const id = JSON.stringify( [ r.class, r.rule, r.hostBlock, r.state ] );
		( groups.get( id ) ?? groups.set( id, [] ).get( id ) ).push( r );
	}
	return [ ...groups.values() ].map( ( list ) => {
		const [ r ] = list;
		const where = [ r.rule ? `rule ${ r.rule }` : 'no rule', r.hostBlock ? `host ${ r.hostBlock }` : null ].filter( Boolean ).join( ', ' );
		const what = 'recorded' === r.state ? 'is recorded, and no block reads it' : 'no node reads and no record carries';
		return `paint conservation: ${ list.length } painted element${ 1 === list.length ? '' : 's' } ${ r.class } (${ where }) ${ what }: ${ list.slice( 0, 6 ).map( ( x ) => `${ x.key } ${ Object.keys( x.looks ).join( '/' ) }` ).join( '; ' ) }${ list.length > 6 ? `; and ${ list.length - 6 } more` : '' }${ r.recordProblems ? ` (${ r.recordProblems.join( '; ' ) })` : '' }`;
	} );
}

// Rows grouped by who dropped them: [ { class, by, rule, count, surfaces, looks: { look: count }, examples } ], largest first.
export function groupRows( rows, { examples = 3 } = {} ) {
	const groups = new Map();
	for ( const r of rows ) {
		const id = `${ r.class }|${ r.by }|${ r.rule ?? '' }`;
		const g = groups.get( id ) ?? groups.set( id, { class: r.class, by: r.by, rule: r.rule, count: 0, surfaces: new Set(), looks: {}, examples: [] } ).get( id );
		g.count++;
		g.surfaces.add( `${ r.client ?? '' }/${ r.surface ?? '' }` );
		Object.keys( r.looks ).forEach( ( l ) => ( g.looks[ l ] = ( g.looks[ l ] ?? 0 ) + 1 ) );
		g.examples.length < examples && g.examples.push( `${ r.client ?? '' }/${ r.surface ?? '' } ${ r.key } <${ r.tag }> ${ Object.keys( r.looks ).join( ',' ) }` );
	}
	return [ ...groups.values() ].map( ( g ) => ( { ...g, surfaces: [ ...g.surfaces ].sort() } ) ).sort( ( a, b ) => b.count - a.count );
}

// The rows a record lists apart (RECORDED-UNREAD: looks the clone does not show), as the proposal names them for the run's
// report: [ { key, block, kind, looks } ].
export const unreadList = ( args ) => conservationRows( args ).rows.filter( ( r ) => 'recorded' === r.state ).map( ( r ) => ( { key: r.key, block: r.record?.block ?? r.hostBlock ?? null, kind: r.record?.kind ?? r.class, looks: Object.keys( r.looks ) } ) );
