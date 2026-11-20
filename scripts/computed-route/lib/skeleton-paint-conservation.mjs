// Paint conservation of a skeleton proposal (Spec 48 section 3.4): every draft element that paints something must be read by
// a block. An element is read when a skeleton node names it (its `draftRef`, a `draftSlots` entry, a band wrapper or any
// other finder the node carries), when a node names a loop copy of it (the same template element at another copy index: a
// loop is filled from its representative), or when another surface of the same client names it (a form, a flow or a
// commerce region built as its own surface). Every other painted element is a row here, with what it paints, the proposal
// row that dropped it (unwrap, absorbed, remove), the rule or the per-site decision that did so, and the host it was
// absorbed into. Pure functions over the saved inventory, proposal and skeleton: no browser, no site, no database.
import { resolvedWidths, renderedWidths, pxOf } from './element-facts.mjs';

// The looks a box can carry that a block must read to draw it as the draft does.
export const LOOKS = [ 'background', 'border', 'shadow', 'radius', 'padding', 'width', 'max-width', 'margin-auto', 'text-centre' ];

const NONE = new Set( [ '', 'none', 'initial', 'unset', 'inherit', 'revert', 'normal' ] );
const NO_COLOUR = new Set( [ '', 'initial', 'unset', 'inherit', 'transparent', 'rgba(0, 0, 0, 0)', 'currentcolor' ] );
const BORDER_STYLE = /\b(?:solid|dashed|dotted|double|groove|ridge|inset|outset)\b/;
const SIDES = [ 'top', 'right', 'bottom', 'left' ];
const CORNERS = [ 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius' ];
const FILLS = new Set( [ '', 'auto', '100%', 'none', 'initial', 'unset', 'inherit' ] );

const low = ( v ) => String( v ?? '' ).trim().toLowerCase();
const zero = ( v ) => NONE.has( low( v ) ) || /^(?:0(?:\.0+)?(?:px|rem|em|%)?\s*)+$/.test( low( v ) );

// A `style` attribute's declarations as { property: value }; a `;` inside brackets (a data url) does not split.
export function styleOf( text ) {
	const out = {};
	let depth = 0;
	let start = 0;
	const src = String( text ?? '' );
	const take = ( end ) => {
		const part = src.slice( start, end );
		const at = part.indexOf( ':' );
		if ( at > 0 ) {
			out[ part.slice( 0, at ).trim().toLowerCase() ] = part.slice( at + 1 ).trim();
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

// The four sides of a margin or padding shorthand, in top, right, bottom, left order.
const boxSides = ( value ) => {
	const p = low( value ).split( /\s+/ ).filter( Boolean );
	return [ p[ 0 ], p[ 1 ] ?? p[ 0 ], p[ 2 ] ?? p[ 0 ], p[ 3 ] ?? p[ 1 ] ?? p[ 0 ] ];
};

// The looks a set of declarations paints ({ property: value }, as declared or as the style attribute renders them).
export function declaredLooks( st ) {
	const has = ( name ) => undefined !== st[ name ] && '' !== low( st[ name ] );
	const looks = new Set();
	if ( ( has( 'background-color' ) && ! NO_COLOUR.has( low( st[ 'background-color' ] ) ) ) || ( has( 'background-image' ) && ! NONE.has( low( st[ 'background-image' ] ) ) ) || ( has( 'background' ) && ! NONE.has( low( st.background ) ) && ! NO_COLOUR.has( low( st.background ) ) ) ) {
		looks.add( 'background' );
	}
	const shorthand = [ 'border', ...SIDES.map( ( s ) => `border-${ s }` ) ].some( ( n ) => has( n ) && BORDER_STYLE.test( low( st[ n ] ) ) && ! /^0(?:px)?\s/.test( low( st[ n ] ) ) );
	const widths = has( 'border-width' ) ? boxSides( st[ 'border-width' ] ) : SIDES.map( ( s ) => st[ `border-${ s }-width` ] );
	const styles = has( 'border-style' ) ? boxSides( st[ 'border-style' ] ) : SIDES.map( ( s ) => st[ `border-${ s }-style` ] );
	if ( shorthand || SIDES.some( ( s, i ) => undefined !== widths[ i ] && ! zero( widths[ i ] ) && BORDER_STYLE.test( low( styles[ i ] ) ) ) ) {
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
	return looks;
}

// The looks an element's computed values show at one width (the inventory's `resolved` read). A value the read does not
// record says nothing. `text-align` is inherited, so it counts only where it differs from the parent's at that width.
export function computedLooks( values, parentValues = null ) {
	const looks = new Set();
	const v = ( n ) => values?.[ n ];
	( ( undefined !== v( 'background-color' ) && ! NO_COLOUR.has( low( v( 'background-color' ) ) ) ) || ( undefined !== v( 'background-image' ) && ! NONE.has( low( v( 'background-image' ) ) ) ) ) && looks.add( 'background' );
	SIDES.some( ( s ) => ( pxOf( v( `border-${ s }-width` ) ) ?? 0 ) > 0 && ! NONE.has( low( v( `border-${ s }-style` ) ?? 'solid' ) ) ) && looks.add( 'border' );
	undefined !== v( 'box-shadow' ) && ! NONE.has( low( v( 'box-shadow' ) ) ) && looks.add( 'shadow' );
	CORNERS.some( ( n ) => undefined !== v( n ) && ! zero( v( n ) ) ) && looks.add( 'radius' );
	SIDES.some( ( s ) => ( pxOf( v( `padding-${ s }` ) ) ?? 0 ) > 0 ) && looks.add( 'padding' );
	undefined !== v( 'max-width' ) && ! FILLS.has( low( v( 'max-width' ) ) ) && looks.add( 'max-width' );
	'center' === low( v( 'text-align' ) ) && 'center' !== low( parentValues?.[ 'text-align' ] ) && looks.add( 'text-centre' );
	return looks;
}

// What an element paints: { look: [ widths ] } over the widths it renders at, empty when it paints nothing or renders at no
// width. Computed values are read per width where the inventory holds them; the declared styles (`declared`, the fact
// record's, lib/skeleton-record.mjs::recordView().declared) and the rendered style attribute hold at every rendered width.
export function paintsBox( element, { declared = {}, parent = null } = {} ) {
	const widths = renderedWidths( element );
	const out = {};
	const add = ( look, w ) => {
		( out[ look ] ??= [] ).includes( w ) || out[ look ].push( w );
	};
	if ( ! widths.length ) {
		return out;
	}
	const stated = new Set( [ ...declaredLooks( declared ), ...declaredLooks( styleOf( element.attrs?.style ) ) ] );
	for ( const w of widths ) {
		stated.forEach( ( look ) => add( look, w ) );
	}
	for ( const w of resolvedWidths( element ) ) {
		computedLooks( element.resolved[ w ], parent?.resolved?.[ w ] ).forEach( ( look ) => add( look, w ) );
	}
	return out;
}

// A key with every copy index removed: the template element it is a copy of, wherever its hosts sit.
export const templateOf = ( key ) => String( key ).replace( /#\d+/g, '' );
// A key with its own copy index removed: the loop it is a copy in, under the same host instances.
export const loopOf = ( key ) => String( key ).replace( /#\d+$/, '' );

// The looks a band wrapper finder reads: Fill reads a dissolved wrapper's box only, as evidence of the content band's width
// (lib/fill-band.mjs), so its cap and centring are conserved and its paint is not.
export const BAND_LOOKS = [ 'width', 'max-width', 'margin-auto' ];
const BAND_KEY = 'draftBandWrappers';

// The draft elements a skeleton tree names, by what the finder reads: Map( key -> 'full' | 'band' ). Every `{ tpl }` finder
// on a node counts, whatever property carries it (the node's own element, its slots, its item template, its width
// alternatives), never a value in its attributes or fingerprint. A finder under `draftBandWrappers` reads the box's width cap
// only (`band`); an element another finder also names is read in full.
export function namedReads( tree ) {
	const out = new Map();
	const find = ( v, kind ) => {
		if ( Array.isArray( v ) ) {
			v.forEach( ( x ) => find( x, kind ) );
		} else if ( v && 'object' === typeof v ) {
			'string' === typeof v.tpl && ( 'full' === kind || ! out.has( v.tpl ) ) && out.set( v.tpl, kind );
			Object.values( v ).forEach( ( x ) => find( x, kind ) );
		}
	};
	const walk = ( nodes ) => {
		for ( const n of nodes || [] ) {
			for ( const [ k, v ] of Object.entries( n ) ) {
				[ 'innerBlocks', 'attributes', 'draftFingerprint', 'name' ].includes( k ) || find( v, BAND_KEY === k ? 'band' : 'full' );
			}
			walk( n.innerBlocks );
		}
	};
	walk( Array.isArray( tree ) ? tree : [ tree ] );
	return out;
}

// The draft element keys a skeleton tree names with any finder.
export const namedKeys = ( tree ) => new Set( namedReads( tree ).keys() );

// An element's identity across the surfaces of one client: its template's component and number. An element of the surface's
// own root template takes the surface's draft file as its component (`component`), since `Root` names a different file on
// each page of a draft that has one file a page.
export const identityOf = ( element, component ) => `${ 'Root' === element.template ? component ?? 'Root' : element.template }/${ element.tpl }`;

// The identities a surface's inventory holds (every element, painted or not).
export const heldIdentities = ( { inventory, component } ) => new Set( ( inventory?.elements || [] ).map( ( e ) => identityOf( e, component ) ) );

// The identities a surface's skeleton names, for the other surfaces of its client to check against.
export function namedIdentities( { inventory, skeleton, component } ) {
	const byKey = new Map( ( inventory?.elements || [] ).map( ( e ) => [ e.key, e ] ) );
	const out = new Set();
	for ( const key of namedKeys( skeleton ) ) {
		const e = byKey.get( key );
		e && out.add( identityOf( e, component ) );
	}
	return out;
}

const SITE_DECISION = /^Bean marked /;
const INSIDE = /^inside a removed element \(([^)]+)\)/;

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
// another host instance, read by another surface, and left to the narrower surface that holds them.
// Row: { key, tag, words, looks, class, action, rule, by, into, host, hostBlock, hostSlots }.
//   class: `unwrapped` (the wrapper went and nothing records where its look goes), `band-only` (the wrapper went and a band
//   finder reads its width cap, so `looks` holds only the paint that finder does not read), `host-unread` (absorbed into a
//   block that draws it, whose slots do not name it), `removed`, `kept-unnamed` (the row kept a block but no node names the
//   element) or `no-row` (the proposal holds no row for it).
export function conservationRows( { inventory, proposal, skeleton, view = null, otherSurfaces = [], ownedElsewhere = new Set(), component = null } ) {
	const elements = inventory?.elements || [];
	const byKey = new Map( elements.map( ( e ) => [ e.key, e ] ) );
	const rows = new Map( ( proposal?.rows || [] ).map( ( r ) => [ r.key, r ] ) );
	const reads = namedReads( skeleton );
	const named = new Set( reads.keys() );
	const full = [ ...named ].filter( ( k ) => 'full' === reads.get( k ) );
	const loops = new Set( full.map( loopOf ) );
	const templates = new Set( full.map( templateOf ) );
	const counts = { painted: 0, exact: 0, loopCopy: 0, instanceCopy: 0, otherSurface: 0, ownedElsewhere: 0, unread: 0 };
	const out = [];
	const hostOf = ( row ) => {
		let r = row;
		for ( let i = 0; i < 8 && r?.into && ! named.has( r.key ); i++ ) {
			r = rows.get( r.into );
		}
		return r && r !== row ? r : null;
	};
	for ( const e of elements ) {
		const painted = paintsBox( e, { declared: view?.declared?.( e ) ?? {}, parent: byKey.get( e.parentKey ) ?? null } );
		if ( ! Object.keys( painted ).length ) {
			continue;
		}
		counts.painted++;
		// A band finder reads the width cap alone: the paint it leaves is still unread.
		const band = 'band' === reads.get( e.key );
		const looks = band ? Object.fromEntries( Object.entries( painted ).filter( ( [ look ] ) => ! BAND_LOOKS.includes( look ) ) ) : painted;
		if ( named.has( e.key ) && ! Object.keys( looks ).length ) {
			counts.exact++;
			continue;
		}
		if ( band ) {
			counts.unread++;
			const row = rows.get( e.key ) ?? null;
			const dropped = droppedBy( row, rows );
			out.push( { key: e.key, tag: e.tag, words: String( e.words ?? '' ).slice( 0, 60 ), looks, class: 'band-only', action: row?.action ?? null, rule: dropped.rule, by: dropped.by, handover: row?.handover?.kind ?? null, into: row?.into ?? null, host: null, hostBlock: null, hostSlots: 0 } );
			continue;
		}
		if ( named.has( e.key ) ) {
			counts.exact++;
			continue;
		}
		if ( loops.has( loopOf( e.key ) ) ) {
			counts.loopCopy++;
			continue;
		}
		if ( templates.has( templateOf( e.key ) ) ) {
			counts.instanceCopy++;
			continue;
		}
		const elsewhere = otherSurfaces.find( ( s ) => s.identities.has( identityOf( e, component ) ) );
		if ( elsewhere ) {
			counts.otherSurface++;
			continue;
		}
		if ( ownedElsewhere.has( identityOf( e, component ) ) ) {
			counts.ownedElsewhere++;
			continue;
		}
		counts.unread++;
		const row = rows.get( e.key ) ?? null;
		const host = hostOf( row );
		const dropped = droppedBy( row, rows );
		const cls = ! row ? 'no-row' : 'unwrap' === row.action ? 'unwrapped' : 'absorbed' === row.action ? 'host-unread' : 'remove' === row.action ? 'removed' : 'kept-unnamed';
		out.push( { key: e.key, tag: e.tag, words: String( e.words ?? '' ).slice( 0, 60 ), looks, class: cls, action: row?.action ?? null, rule: dropped.rule, by: dropped.by, handover: row?.handover?.kind ?? null, into: row?.into ?? null, host: host?.key ?? null, hostBlock: host?.block ?? null, hostSlots: host?.slots ? Object.keys( host.slots ).length : 0 } );
	}
	return { rows: out, counts };
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
