// Fill's reader of the shop look settings (template-rework Task 4, Spec 48 FR-48-87): the Cart, Checkout, `sgs/account` and
// `sgs/cart` blocks hold a look setting per WooCommerce part (a part is the framework database's `css_element`), and the
// draft's own element for each part carries the value. This module pairs the two and says what to write.
//
// Everything about a setting comes from the framework database rows handed in (FP-1): its attribute name, the part it paints
// (`css_element`), its CSS property, its type, its tier shape. The draft side is `data/part-locators.json`, run in the page by
// lib/fill-part-look-page.mjs::findPartsInPage (re-exported here). Nothing in this module names an attribute.
//
// The rules:
//   - A part with settings and no locator is `noLocator`; a part with a locator the draft has no element for is `unpaired`.
//   - A value is never averaged: when the instances of one part (two basket lines) differ at a width, the part's setting is
//     not written and both values are reported (`conflicts`).
//   - A responsive setting is written per device only where the draft's narrower value differs from the wider one; a setting
//     that holds one value for every width takes the 1440 value and the widths that differ are reported (`widthVaries`).
//   - A value that is the CSS initial of a look that paints nothing (normal, none, transparent) is not written. Every other
//     value is written and flagged `defaultNotRead`: the block's own default is not read here, so a value that equals it is
//     written all the same.
//   - A look the located element carries that no setting of its part holds is `noSetting`, shaped for a Custom CSS writer:
//     block, part, the look table's selector for the part where it has one, the CSS property, the draft value per width.
import { deltaE, parseColour, parseLength, round, snapColour, snapFontFamily, toHex } from './normalise.mjs';
import { PX_TOL, SCALE_TOL } from './css-equivalence/tolerance.mjs';

export { findPartsInPage } from './fill-part-look-page.mjs';

export const WIDTHS = [ 1440, 768, 375 ];
export const TIER_OF = { 1440: 'desktop', 768: 'tablet', 375: 'mobile' };
const SIDES = [ 'top', 'right', 'bottom', 'left' ];
const CORNERS = [ [ 'topLeft', 'top-left' ], [ 'topRight', 'top-right' ], [ 'bottomRight', 'bottom-right' ], [ 'bottomLeft', 'bottom-left' ] ];

// The computed properties the finder reads from each located element.
export const READ_PROPS = [
	'color', 'background-color', 'box-shadow', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-transform', 'text-decoration-line', 'text-align',
	'width', 'height', 'min-width', 'min-height', 'max-width', 'row-gap', 'column-gap', 'display', 'flex-direction', 'flex-grow', 'align-items', 'align-self', 'justify-content',
	...SIDES.flatMap( ( s ) => [ `margin-${ s }`, `padding-${ s }`, `border-${ s }-width`, `border-${ s }-style`, `border-${ s }-color` ] ),
	...CORNERS.map( ( [ , c ] ) => `border-${ c }-radius` ),
];

// What each CSS property a setting can paint is, and how its computed value becomes the setting's value. A property not listed
// is `unsupported` (a boolean switch, a transition, a grid track list): counted, never written.
const FAMILY = {
	color: 'colour', 'background-color': 'colour', 'border-color': 'colour',
	'font-weight': 'keyword', 'font-style': 'keyword', 'text-transform': 'keyword', 'text-decoration': 'keyword', 'text-align': 'keyword', 'border-style': 'keyword', 'font-family': 'font',
	'align-items': 'keyword', 'align-self': 'keyword', 'justify-content': 'keyword', 'flex-grow': 'keyword',
	'font-size': 'number', 'line-height': 'number', 'letter-spacing': 'number',
	width: 'length', height: 'length', 'min-height': 'length', 'min-width': 'length', 'max-width': 'length', gap: 'length', 'column-gap': 'length', 'margin-top': 'length', 'margin-bottom': 'length', 'padding-top': 'length',
	margin: 'box', padding: 'box', 'border-width': 'box', 'padding-inline': 'inline',
	'border-radius': 'radius',
	border: 'border', 'border-top': 'border', 'border-bottom': 'border', 'border-top-style': 'border',
	'box-shadow': 'shadow',
};
const SIZES = new Set( [ 'width', 'height', 'min-width', 'min-height', 'max-width' ] );
const PX = /^-?[\d.]+px$/;
// A max-width the draft states against the viewport (100vw, 92vw, 100%): the element's own width is the size the draft chose.
const VIEWPORT_CAP = /^(\d+(\.\d+)?vw|100%)$/;
// What the draft states for a size setting's property: { text, own } (`own` when the property itself is stated, so the computed value
// is read), or null when the draft states none. Also stated:
//   - a column's width as a flex basis, or as its track of a two-track grid whose declared columns hold a fraction (`1.35fr 1fr`,
//     measured in the page as `track:width` at each width where the grid has two columns);
//   - a min-height as a declared height (a button drawn `height:66px` is at least that tall);
//   - a max-width capped by the viewport as the declared width (`width:440px;max-width:100vw`); a width of the whole viewport is 100%.
export function statedSize( property, s ) {
	const own = s( `decl:${ property }` );
	if ( own && ! ( 'max-width' === property && VIEWPORT_CAP.test( own ) ) ) {
		return { text: own, own: true };
	}
	if ( 'width' === property ) {
		if ( s( 'decl:flex-basis' ) ) {
			return { text: s( 'decl:flex-basis' ), own: true };
		}
		return s( 'track:width' ) ? { text: s( 'track:width' ), own: false } : null;
	}
	if ( 'min-height' === property ) {
		return s( 'decl:height' ) ? { text: s( 'decl:height' ), own: false } : null;
	}
	if ( 'max-width' === property && own ) {
		const width = s( 'decl:width' );
		return width ? { text: '100vw' === width ? '100%' : width, own: false } : { text: own, own: true };
	}
	return null;
}
// The padding the browser gives a button of its own (1px 6px): a draft that states no padding has not chosen it.
const UA_BUTTON_PADDING = { top: 1, right: 6, bottom: 1, left: 6 };
const BORDER_SIDE = { border: 'top', 'border-top': 'top', 'border-bottom': 'bottom', 'border-top-style': 'top' };

// A value that paints nothing (the CSS initial of a look): never written.
const INITIAL = { 'font-style': 'normal', 'text-transform': 'none', 'text-decoration': 'none', 'text-align': 'left', 'box-shadow': 'none' };

const px = ( v ) => {
	const l = parseLength( v );
	return l && ( 'px' === l.unit || ( '' === l.unit && 0 === l.n ) ) ? l.n : null;
};
const pxText = ( n ) => `${ round( n ) }px`;
const isZero = ( n ) => null === n || Math.abs( n ) < 0.01;
const clean = ( v ) => String( v ?? '' ).trim();

// One computed-style reading of a part's element as the plain value its setting's property holds, or null when the look paints
// nothing, or undefined when it cannot be read. `row` carries css_property and attr_type.
export function primitive( property, styles, row = {}, keep = false ) {
	const s = ( p ) => clean( styles[ p ] );
	switch ( FAMILY[ property ] ) {
		case 'colour': {
			const side = 'border-color' === property ? s( 'border-top-style' ) : 'drawn';
			if ( 'none' === side || 'hidden' === side || ( 'border-color' === property && isZero( px( s( 'border-top-width' ) ) ) ) ) {
				return keep ? 'transparent' : null;
			}
			const c = parseColour( s( 'border-color' === property ? 'border-top-color' : property ) );
			return c && c.a > 0 ? toHex( c ) : ( keep && c ? 'transparent' : null );
		}
		case 'keyword': {
			if ( 'text-decoration' === property ) {
				const v = s( 'text-decoration-line' );
				return 'none' === v && ! keep ? null : v;
			}
			if ( 'border-style' === property ) {
				return s( 'border-top-style' ) || undefined;
			}
			let v = s( property );
			if ( 'text-align' === property ) {
				v = { start: 'left', end: 'right' }[ v ] || v;
			}
			if ( keep ) {
				return '' === v ? undefined : v;
			}
			return '' === v || INITIAL[ property ] === v || 'normal' === v || ( 'auto' === v && 'align-self' === property ) || ( '0' === v && 'flex-grow' === property ) ? null : v;
		}
		case 'font': {
			// A control's browser font (the page read's ua:font: no family stated for it) is no look of the draft's: nothing to write.
			if ( '1' === s( 'ua:font' ) ) {
				return null;
			}
			// The first family of the stack: the fallbacks after it differ between a draft and a theme without changing the look.
			const v = s( 'font-family' ).split( ',' )[ 0 ].trim().replace( /^["']|["']$/g, '' );
			return v || undefined;
		}
		case 'number': {
			if ( 'font-size' === property ) {
				return px( s( 'font-size' ) ) ?? undefined;
			}
			if ( 'line-height' === property ) {
				const size = px( s( 'font-size' ) );
				const lh = px( s( 'line-height' ) );
				return null === lh || ! size ? ( keep ? 'normal' : null ) : round( lh / size );
			}
			const ls = px( s( 'letter-spacing' ) );
			return keep ? ( null === ls ? 0 : ls ) : ( null === ls || 0 === ls ? null : ls );
		}
		case 'length': {
			// A size is the draft's look only where the draft states it: an undeclared width or height is the layout's.
			if ( SIZES.has( property ) ) {
				const stated = statedSize( property, s );
				if ( ! stated ) {
					return null;
				}
				if ( '100%' === stated.text && ! stated.own && 'max-width' === property ) {
					return '100%';
				}
				if ( ! PX.test( stated.text ) ) {
					return undefined;
				}
				if ( ! stated.own ) {
					return px( stated.text );
				}
			}
			let v;
			if ( 'gap' === property ) {
				const flex = /flex|grid/.test( s( 'display' ) );
				v = flex ? px( s( 'column' === s( 'flex-direction' ) ? 'row-gap' : 'column-gap' ) ) : null;
			} else {
				v = px( s( property ) );
			}
			// The space below a copy that a stack draws with its gap (a column of cards 16px apart) is that gap.
			if ( 'margin-bottom' === property && isZero( v ) && px( s( 'stack:gap' ) ) ) {
				v = px( s( 'stack:gap' ) );
			}
			return null === v || ( isZero( v ) && /^(min-|max-)/.test( property ) ) ? null : v;
		}
		case 'box': {
			const side = ( n ) => px( s( 'border-width' === property ? `border-${ n }-width` : `${ property }-${ n }` ) );
			const box = Object.fromEntries( SIDES.map( ( n ) => [ n, side( n ) ] ) );
			if ( SIDES.some( ( n ) => null === box[ n ] ) ) {
				return undefined;
			}
			// A choice tile that draws its mark in flow (a dot, then the words): WooCommerce draws its own mark inside the left padding,
			// so the tile's left padding is where the draft's words start.
			if ( 'padding' === property && px( s( 'mark:text-left' ) ) ) {
				box.left = px( s( 'mark:text-left' ) );
			}
			// A padding the draft never states that equals a button's own browser padding is the browser's, not the draft's look.
			const undeclared = 'padding' === property && SIDES.every( ( n ) => ! s( `decl:padding-${ n }` ) );
			return undeclared && SIDES.every( ( n ) => box[ n ] === UA_BUTTON_PADDING[ n ] ) ? null : box;
		}
		case 'inline': {
			// The left and right padding as one length (a select's padding-inline): none where the two differ, nothing at zero (a
			// browser select's own padding).
			const [ l, r ] = [ px( s( 'padding-left' ) ), px( s( 'padding-right' ) ) ];
			if ( null === l || null === r || Math.abs( l - r ) > PX_TOL ) {
				return undefined;
			}
			return isZero( l ) ? null : l;
		}
		case 'radius': {
			const corners = Object.fromEntries( CORNERS.map( ( [ k, c ] ) => [ k, s( `border-${ c }-radius` ) ] ) );
			if ( Object.values( corners ).some( ( v ) => /\s/.test( v ) || null === px( v ) ) ) {
				return undefined;
			}
			return Object.fromEntries( Object.entries( corners ).map( ( [ k, v ] ) => [ k, px( v ) ] ) );
		}
		case 'border': {
			const side = BORDER_SIDE[ property ];
			const width = px( s( `border-${ side }-width` ) );
			const style = s( `border-${ side }-style` );
			const colour = parseColour( s( `border-${ side }-color` ) );
			return undefined === width || null === width || ! colour ? undefined : { width, style, colour: toHex( colour ) };
		}
		case 'shadow': {
			const v = s( 'box-shadow' );
			if ( ! v || 'none' === v ) {
				return null;
			}
			if ( /\),\s*\S/.test( v ) ) {
				return undefined;
			}
			const colour = v.match( /rgba?\([^)]+\)/ )?.[ 0 ];
			const nums = v.replace( colour || '', '' ).trim().split( /\s+/ ).filter( ( t ) => 'inset' !== t );
			const c = parseColour( colour || '' );
			return /inset/.test( v ) || nums.length < 2 || ! c ? undefined : { x: px( nums[ 0 ] ), y: px( nums[ 1 ] ), blur: px( nums[ 2 ] ?? '0px' ), spread: px( nums[ 3 ] ?? '0px' ), colour: toHex( c ) };
		}
		default:
			return undefined;
	}
}

// Whether two plain values are the same look: colours within delta E 2, lengths within half a pixel, everything else equal.
export function samePrimitive( a, b ) {
	if ( a === b ) {
		return true;
	}
	if ( null === a || null === b || undefined === a || undefined === b ) {
		return false;
	}
	if ( 'object' === typeof a && 'object' === typeof b ) {
		const keys = new Set( [ ...Object.keys( a ), ...Object.keys( b ) ] );
		return [ ...keys ].every( ( k ) => samePrimitive( a[ k ], b[ k ] ) );
	}
	if ( 'number' === typeof a && 'number' === typeof b ) {
		return Math.abs( a - b ) <= PX_TOL || Math.abs( a - b ) <= SCALE_TOL;
	}
	const [ ca, cb ] = [ parseColour( a ), parseColour( b ) ];
	if ( ca && cb && /^(#|rgb)/i.test( String( a ) ) && /^(#|rgb)/i.test( String( b ) ) ) {
		return Math.abs( ca.a - cb.a ) < 0.02 && deltaE( ca, cb ) <= 2;
	}
	return String( a ) === String( b );
}

// A part's reading at each width as { 1440: value, 768: value, 375: value } plus the instance conflicts:
// `instances` is { width: [ { key, styles } ] }. A width with no element gives undefined for the part.
// `policy` 'majority' (a surface whose block holds one value for every instance, a card template): the value most instances hold is
// the part's, when exactly one value has the most, and the instances that differ are reported as `minority`, never averaged in.
export function readPart( property, instances, row, keep = false, policy = null ) {
	const perWidth = {};
	const conflicts = [];
	const minority = [];
	for ( const w of WIDTHS ) {
		const list = instances[ w ] || [];
		if ( ! list.length ) {
			perWidth[ w ] = undefined;
			continue;
		}
		const values = list.map( ( i ) => primitive( property, i.styles, row, keep ) );
		const first = values[ 0 ];
		if ( values.every( ( v ) => samePrimitive( v, first ) ) ) {
			perWidth[ w ] = first;
		} else {
			const groups = [];
			values.forEach( ( v, n ) => {
				const g = groups.find( ( x ) => samePrimitive( x.value, v ) );
				g ? g.at.push( n ) : groups.push( { value: v, at: [ n ] } );
			} );
			groups.sort( ( a, b ) => b.at.length - a.at.length );
			if ( 'majority' === policy && groups[ 0 ].at.length > groups[ 1 ].at.length && undefined !== groups[ 0 ].value ) {
				perWidth[ w ] = groups[ 0 ].value;
				groups.slice( 1 ).forEach( ( g ) => g.at.forEach( ( n ) => minority.push( { width: w, instance: list[ n ].text || list[ n ].key, value: g.value } ) ) );
			} else {
				perWidth[ w ] = undefined;
				conflicts.push( { width: w, values: list.map( ( i, n ) => ( { instance: i.text || i.key, value: values[ n ] } ) ) } );
			}
		}
	}
	return { perWidth, conflicts, minority };
}

const unitCompanion = ( attr, names ) => ( names.has( `${ attr }Unit` ) ? `${ attr }Unit` : null );

// The setting's value for one plain value. Returns { value, extra: { companion: value } } or { why }.
export function toSetting( row, value, ctx ) {
	const fam = FAMILY[ row.css_property ];
	const names = ctx.names;
	const log = ctx.log || [];
	const slug = ( c, where ) => {
		const hit = ctx.snapshot ? snapColour( c, ctx.snapshot, { log, where } ) : null;
		return hit ? hit.value : c;
	};
	if ( row.enum_values && 'keyword' !== fam && 'font' !== fam && 'string' === row.attr_type ) {
		return { why: `${ row.attr_name } takes named values (${ String( row.enum_values ).replace( /[\[\]"]/g, '' ) }) and the route has no rule to name the draft's ${ row.css_property }` };
	}
	switch ( fam ) {
		case 'colour':
			return { value: slug( value, row.attr_name ) };
		case 'keyword':
			if ( row.enum_values ) {
				const allowed = String( row.enum_values ).replace( /^\[|\]$/g, '' ).split( /[,|]/ ).map( ( t ) => t.trim().replace( /^["']|["']$/g, '' ) );
				if ( allowed.length > 1 && ! allowed.includes( value ) ) {
					return { why: `${ value } is not one of ${ allowed.join( ', ' ) }` };
				}
			}
			return { value: String( value ) };
		case 'font': {
			const preset = ctx.snapshot ? snapFontFamily( value, ctx.snapshot, { log, where: row.attr_name } ) : null;
			return { value: preset || String( value ).split( ',' )[ 0 ].trim().replace( /^["']|["']$/g, '' ) };
		}
		case 'number': {
			if ( 'number' !== typeof value ) {
				return { why: `the draft's ${ row.css_property } is ${ value }, which no number holds` };
			}
			const unit = unitCompanion( row.attr_name, names );
			// A text setting with no unit beside it holds the CSS length itself (`12px`); a bare number there is read as a spacing
			// preset or dropped by the block's length sanitiser. A line height stays unitless.
			if ( ! unit && 'string' === row.attr_type ) {
				return { value: 'line-height' === row.css_property ? String( round( value ) ) : pxText( value ) };
			}
			const extra = unit ? { [ unit ]: 'line-height' === row.css_property ? '' : 'px' } : {};
			return { value: round( value ), extra };
		}
		case 'length':
			// A width of the whole viewport is held as 100% (statedSize); every other length is a number of pixels.
			return { value: 'string' === typeof value ? value : pxText( value ) };
		case 'box':
			// A text setting holds one length for every side (`2px`): the four sides are written as one where they agree.
			if ( 'string' === row.attr_type ) {
				const sides = SIDES.map( ( s ) => value[ s ] );
				return sides.every( ( v ) => Math.abs( v - sides[ 0 ] ) <= PX_TOL ) ? { value: pxText( sides[ 0 ] ) } : { why: `${ row.attr_name } holds one ${ row.css_property } for every side and the draft's sides differ (${ sides.map( pxText ).join( ' ' ) })` };
			}
			return { value: Object.fromEntries( SIDES.map( ( s ) => [ s, pxText( value[ s ] ) ] ) ) };
		case 'inline':
			return { value: pxText( value ) };
		case 'radius': {
			if ( 'object' === row.attr_type ) {
				return { value: Object.fromEntries( Object.entries( value ).map( ( [ k, v ] ) => [ k, pxText( v ) ] ) ) };
			}
			const all = Object.values( value );
			return all.every( ( v ) => Math.abs( v - all[ 0 ] ) <= PX_TOL ) ? { value: pxText( all[ 0 ] ) } : { why: `${ row.attr_name } holds one radius and the draft's corners differ (${ all.map( pxText ).join( ' ' ) })` };
		}
		case 'border':
			return { value: { width: pxText( value.width ), style: value.style, colour: slug( value.colour, row.attr_name ) } };
		case 'shadow': {
			const colourAttr = [ `${ row.attr_name }Colour`, `${ row.attr_name }Color` ].find( ( n ) => names.has( n ) );
			const text = [ value.x, value.y, value.blur, value.spread ].map( ( n ) => ( isZero( n ) ? '0' : pxText( n ) ) ).join( ' ' );
			return colourAttr ? { value: text, extra: { [ colourAttr ]: slug( value.colour, colourAttr ) } } : { value: `${ text } ${ value.colour }` };
		}
		default:
			return { why: `no way to write a ${ row.css_property } value` };
	}
}

// A look-table row's attribute names, by the writer's own naming (prefix plus the column's attribute suffixes): the set of
// settings a row paints, for the rows with no selector on a block.
export function tableAttrs( table ) {
	const out = {};
	const pascal = ( id ) => id.split( '_' ).map( ( p ) => p.charAt( 0 ).toUpperCase() + p.slice( 1 ) ).join( '' );
	for ( const [ id, row ] of Object.entries( table.rows || {} ) ) {
		for ( const col of row.columns || [] ) {
			for ( const [ suffix ] of table.columns?.[ col ]?.attrs || [] ) {
				out[ `${ row.prefix || `sgs${ pascal( id ) }` }${ suffix }` ] = { row: id, column: col };
			}
		}
	}
	return out;
}

// The look table's selector for a part (a row id is the part's css_element with hyphens for underscores), or null.
export function tableSelector( table, part, blockKey ) {
	const row = table.rows?.[ part.replace( /-/g, '_' ) ];
	return row ? ( row[ blockKey ] ?? null ) : null;
}

const same = ( a, b ) => samePrimitive( a, b );

// The tiers one setting holds from its three width readings. `shape` is 'tiers' (a per-device object), 'flat' (one value) or
// 'tier-attr' (a sibling attribute that holds one device's value, row.css_tier). Returns { tiers: { desktop, tablet?, mobile? },
// widthVaries } or { skip: reason }.
function tiersFor( row, perWidth ) {
	const [ d, t, m ] = [ perWidth[ 1440 ], perWidth[ 768 ], perWidth[ 375 ] ];
	if ( 'tablet' === row.css_tier || 'mobile' === row.css_tier ) {
		const wide = 'mobile' === row.css_tier && undefined !== t && null !== t && ! same( t, d ) ? t : d;
		const own = 'tablet' === row.css_tier ? t : m;
		if ( undefined === own || null === own || undefined === wide || null === wide ) {
			return { skip: 'no draft difference' };
		}
		return same( own, wide ) ? { skip: 'no draft difference' } : { tiers: { only: own } };
	}
	if ( undefined === d ) {
		// A part the draft shows only on a narrower device (an icon-only basket button) is written for those devices alone.
		const narrow = 'tier_object' === row.tier_shape ? { ...( undefined !== t && null !== t ? { tablet: t } : {} ), ...( undefined !== m && null !== m && ! same( m, t ) ? { mobile: m } : {} ) } : {};
		return Object.keys( narrow ).length ? { tiers: narrow } : { skip: 'the draft shows no element at 1440' };
	}
	if ( null === d ) {
		return { skip: 'initial value' };
	}
	const tiered = 'tier_object' === row.tier_shape;
	const tiers = { desktop: d };
	let widthVaries = false;
	if ( undefined !== t && null !== t && ! same( t, d ) ) {
		tiers.tablet = t;
	}
	const eff = tiers.tablet ?? d;
	if ( undefined !== m && null !== m && ! same( m, eff ) ) {
		tiers.mobile = m;
	}
	if ( ! tiered ) {
		widthVaries = undefined !== tiers.tablet || undefined !== tiers.mobile;
		return { tiers: { desktop: d }, widthVaries, flat: true };
	}
	return { tiers };
}

// Why a value the draft's element carries at 1440 is not read: a size names what the draft states (`50%`, `100vw`, `3em`), anything else
// the computed value the setting cannot take.
export function unreadWhy( property, styles ) {
	const s = ( p ) => clean( styles?.[ p ] );
	if ( SIZES.has( property ) ) {
		return `the draft states ${ property } as ${ statedSize( property, s )?.text || s( property ) || 'nothing' } at 1440, not a length in px the setting takes`;
	}
	return `the draft's ${ property } at 1440${ s( property ) ? ` (${ s( property ) })` : '' } is not a value the route reads for this setting`;
}

// Whether a part's own locator finds only the current element (a menu's item marked aria-current): its rest read IS the current look.
// A locator that names another (sameAs) is followed to the one it names.
export function readsCurrent( locators, part ) {
	let loc = locators?.parts?.[ part ];
	for ( let guard = 0; loc?.sameAs && guard < 8; guard++ ) {
		loc = locators.parts?.[ loc.sameAs ] ?? locators.anchors?.[ loc.sameAs ];
	}
	return true === loc?.match?.ariaCurrent;
}

// The look rows the reader pairs: every rest-state row with a part and a property, and every current-state row whose part's locator
// finds the current element itself (readsCurrent), read from that element as the hover reader reads a hovered one.
export const lookRowsOf = ( rows, locators ) => rows.filter( ( r ) => r.css_element && r.css_property && ( ! r.css_state || ( 'current' === r.css_state && readsCurrent( locators, r.css_element ) ) ) );

// Pairs the draft with the settings. Inputs:
//   block, rows (the block's settings: attr_name, attr_type, css_property, css_element, css_state, css_tier, is_responsive,
//   tier_shape, enum_values), names (every attribute name of the block, for companions), locators ({ anchors, parts }),
//   reads ({ part: { width: [ instance ] } }), snapshot, selectorOf( part ) (the look table's selector or null),
//   faultOf( attr ) (a known-fault reason or null), partRows (the look table's parts present on this block).
// Returns { writes, settings, unpaired, noLocator, noSetting, conflicts, unsupported, widthVaries, counts }.
export function buildLook( { block, rows, names, locators, reads, snapshot = null, selectorOf = () => null, faultOf = () => null, tableParts = [], switches = null, force = null, policy = null } ) {
	const out = { block, writes: [], settings: {}, unpaired: [], noLocator: [], noSetting: [], conflicts: [], minority: [], gaps: [], unsupported: {}, widthVaries: [], atInitial: [], log: [] };
	const nameSet = names instanceof Set ? names : new Set( names );
	const look = lookRowsOf( rows, locators );
	const stateful = rows.filter( ( r ) => r.css_element && r.css_property && r.css_state && ! look.includes( r ) );
	const parts = [ ...new Set( look.map( ( r ) => r.css_element ) ) ].sort();
	const mark = ( row, status, reason, extra = {} ) => {
		out.settings[ row.attr_name ] = { status, reason, part: row.css_element, ...extra };
	};
	for ( const r of stateful ) {
		mark( r, 'not-written', `a state setting (${ r.css_state }) the route does not read`, { code: 'state' } );
	}
	for ( const part of parts ) {
		const partRows = look.filter( ( r ) => r.css_element === part );
		const loc = locators.parts[ part ];
		const onlyBlocks = loc?.blocks;
		if ( ! loc || ( onlyBlocks && ! onlyBlocks.includes( block ) ) ) {
			out.noLocator.push( { part, settings: partRows.length, tableRow: tableParts.includes( part ) } );
			partRows.forEach( ( r ) => mark( r, 'not-written', 'no locator', { code: 'noLocator' } ) );
			continue;
		}
		const instances = reads[ part ] || {};
		const found = ( name ) => WIDTHS.some( ( w ) => ( ( 'string' === typeof name ? reads[ name ] : instances )?.[ w ] || [] ).length );
		// A visibility switch hides its part when the draft draws no such element at any width, and only where the part's
		// neighbours are found (a failed read never hides anything). Which value hides comes from the data file, never the name.
		const isSwitch = ( r ) => 'boolean' === r.attr_type && ( 'boolean-visibility' === r.role || undefined !== switches?.roles?.[ r.role ]?.[ r.css_property ]?.setWhenDrawn );
		for ( const row of partRows.filter( isSwitch ) ) {
			const hides = switches?.roles?.[ row.role ]?.[ row.css_property ];
			const draft = Object.fromEntries( WIDTHS.map( ( w ) => [ w, ( instances[ w ] || [] ).length ? 'drawn' : 'absent' ] ) );
			if ( ! hides ) {
				mark( row, 'not-written', 'the database does not say which value hides this part and the switches data names none', { code: 'switchDirection' } );
			} else if ( hides.setWhenDrawn ) {
				if ( found() && ( loc.neighbours || [] ).every( found ) ) {
					const fault = faultOf( row.attr_name );
					out.writes.push( { attr: row.attr_name, value: true, part, property: row.css_property, draft, visibility: false, structure: true, ...( fault ? { knownFault: fault } : {} ) } );
					mark( row, 'written', null, { code: 'drawn' } );
				} else {
					mark( row, 'not-written', 'the draft does not draw this part (or its neighbours are not found), so the switch stays off', { code: 'notDrawn' } );
				}
			} else if ( found() ) {
				mark( row, 'not-written', 'the draft draws this part, so it stays', { code: 'drawn' } );
			} else if ( ! ( loc.neighbours || [] ).length || ! loc.neighbours.every( found ) ) {
				mark( row, 'not-written', 'the neighbours of the part are not found in the draft, so nothing is hidden', { code: 'neighboursNotFound' } );
			} else {
				const fault = faultOf( row.attr_name );
				out.writes.push( { attr: row.attr_name, value: hides.hideWhen, part, property: row.css_property, draft, visibility: true, ...( fault ? { knownFault: fault } : {} ) } );
				mark( row, 'written', null, { code: 'hidden' } );
			}
		}
		const partLook = partRows.filter( ( r ) => ! isSwitch( r ) );
		if ( ! found() ) {
			if ( partLook.length ) {
				out.unpaired.push( { part, settings: partLook.length, tableRow: tableParts.includes( part ) } );
				partLook.forEach( ( r ) => mark( r, 'not-written', 'the draft has no element for this part', { code: 'unpaired' } ) );
			}
			continue;
		}
		for ( const row of partLook ) {
			const fam = FAMILY[ row.css_property ];
			if ( ! fam || 'boolean' === row.attr_type ) {
				out.unsupported[ row.css_property ] = ( out.unsupported[ row.css_property ] || 0 ) + 1;
				mark( row, 'not-written', `${ row.css_property } is not a look the route reads`, { code: 'unsupported' } );
				continue;
			}
			const { perWidth, conflicts, minority } = readPart( row.css_property, instances, row, !! force?.has( row.attr_name ), policy );
			minority.length && out.minority.push( { part, attr: row.attr_name, property: row.css_property, minority } );
			if ( conflicts.length ) {
				out.conflicts.push( { part, attr: row.attr_name, property: row.css_property, conflicts } );
				mark( row, 'not-written', 'the part\'s instances differ', { code: 'conflict' } );
				continue;
			}
			const t = tiersFor( row, perWidth );
			if ( t.skip ) {
				if ( 'initial value' === t.skip ) {
					out.atInitial.push( { part, attr: row.attr_name } );
				}
				const size = SIZES.has( row.css_property );
				// An element the draft does draw at 1440 whose value the route cannot read is not an absent element: say what it states.
				const shown = t.skip.startsWith( 'the draft shows' ) && ( instances[ 1440 ] || [] ).length;
				if ( shown ) {
					mark( row, 'not-written', unreadWhy( row.css_property, instances[ 1440 ][ 0 ].styles ), { code: 'unreadable' } );
					continue;
				}
				mark( row, 'not-written', t.skip, { code: 'initial value' === t.skip ? ( size ? 'undeclared' : 'initial' ) : ( t.skip.startsWith( 'the draft shows' ) ? 'absent' : 'noDifference' ) } );
				continue;
			}
			const shaped = {};
			let failed = null;
			const entries = 'only' in t.tiers ? [ [ 'only', t.tiers.only ] ] : Object.entries( t.tiers );
			for ( const [ tier, v ] of entries ) {
				const s = toSetting( row, v, { names: nameSet, snapshot, log: out.log } );
				if ( s.why ) {
					failed = s.why;
					break;
				}
				shaped[ tier ] = s;
			}
			if ( failed ) {
				mark( row, 'not-written', failed, { code: 'shape' } );
				continue;
			}
			const tierObject = 'tier_object' === row.tier_shape && ! ( 'only' in shaped );
			const value = 'only' in shaped ? shaped.only.value : ( tierObject ? Object.fromEntries( Object.entries( shaped ).map( ( [ k, s ] ) => [ k, s.value ] ) ) : shaped.desktop.value );
			const extra = Object.assign( {}, ...Object.values( shaped ).map( ( s ) => s.extra || {} ) );
			const fault = faultOf( row.attr_name );
			const pairedColour = 'shadow' === fam ? Object.keys( extra )[ 0 ] : undefined;
			const draft = Object.fromEntries( WIDTHS.map( ( w ) => [ w, perWidth[ w ] ] ) );
			out.writes.push( { attr: row.attr_name, value, part, property: row.css_property, draft, defaultNotRead: true, ...( pairedColour ? { pairedColour } : {} ), ...( fault ? { knownFault: fault } : {} ), ...( t.widthVaries ? { widthVaries: true } : {} ) } );
			for ( const [ attr, v ] of Object.entries( extra ) ) {
				out.writes.push( { attr, value: v, part, property: `${ row.css_property } (companion of ${ row.attr_name })`, draft, companionOf: row.attr_name, defaultNotRead: true } );
			}
			t.widthVaries && out.widthVaries.push( { part, attr: row.attr_name, draft } );
			mark( row, 'written', null, { ...( fault ? { knownFault: fault } : {} ) } );
		}
		// A current-state part's other looks are its menu item's, held by that part's rest settings: no Custom CSS row for them.
		partRows.some( ( r ) => ! r.css_state ) && out.noSetting.push( ...noSettingFor( { block, part, partRows, instances, selector: selectorOf( part ) } ) );
	}
	out.counts = {
		parts: parts.length,
		written: out.writes.filter( ( w ) => ! w.companionOf ).length,
		companions: out.writes.filter( ( w ) => w.companionOf ).length,
		unpaired: out.unpaired.length,
		noLocator: out.noLocator.length,
		noSetting: out.noSetting.length,
		conflicts: out.conflicts.length,
		unsupported: Object.values( out.unsupported ).reduce( ( a, b ) => a + b, 0 ),
		knownFaults: out.writes.filter( ( w ) => w.knownFault ).length,
	};
	return out;
}

// The looks a located element carries that no rest-state setting of its part holds. Each is { block, part, selector, property,
// draft: { width: value }, state: 'rest' }, the draft's computed value at each width, for a Custom CSS writer that does not
// re-read the draft. A look that paints nothing (the CSS initial) is left out; so are sizes the layout decides (width, height).
export const LOOKS = [
	[ 'color', 'colour' ], [ 'background-color', 'colour' ], [ 'font-family', 'font' ], [ 'font-size', 'number' ], [ 'font-weight', 'keyword' ], [ 'font-style', 'keyword' ], [ 'line-height', 'number' ],
	[ 'letter-spacing', 'number' ], [ 'text-transform', 'keyword' ], [ 'text-decoration', 'keyword' ], [ 'text-align', 'keyword' ], [ 'border-radius', 'radius' ], [ 'border-width', 'box' ],
	[ 'border-style', 'keyword' ], [ 'border-color', 'colour' ], [ 'box-shadow', 'shadow' ], [ 'padding', 'box' ], [ 'margin', 'box' ],
];
export const COVERS = { 'border-width': [ 'border-width', 'border', 'border-top', 'border-bottom', 'border-top-style' ], 'border-style': [ 'border-style', 'border', 'border-top', 'border-bottom', 'border-top-style' ], 'border-color': [ 'border-color', 'border', 'border-top', 'border-bottom', 'border-top-style' ], padding: [ 'padding', 'padding-top' ], margin: [ 'margin', 'margin-top', 'margin-bottom' ] };
const ZERO_BOX = ( v ) => v && 'object' === typeof v && SIDES.every( ( s ) => isZero( v[ s ] ) );

export function noSettingFor( { block, part, partRows, instances, selector } ) {
	// (verify.mjs reads the live page for each of these and drops the ones that already match)
	const held = new Set( partRows.flatMap( ( r ) => String( r.css_property ).split( ',' ) ) );
	const out = [];
	for ( const [ property ] of LOOKS ) {
		if ( ( COVERS[ property ] || [ property ] ).some( ( p ) => held.has( p ) ) ) {
			continue;
		}
		const { perWidth, conflicts } = readPart( property, instances, { css_property: property } );
		const shown = WIDTHS.filter( ( w ) => undefined !== perWidth[ w ] && null !== perWidth[ w ] && ! ZERO_BOX( perWidth[ w ] ) );
		if ( ! shown.length && ! conflicts.length ) {
			continue;
		}
		if ( 'border-radius' === property && shown.every( ( w ) => Object.values( perWidth[ w ] ).every( isZero ) ) && ! conflicts.length ) {
			continue;
		}
		if ( 'border-width' === property && ( instances[ 1440 ] || [] ).every( ( i ) => /^(none|hidden)$/.test( clean( i.styles[ 'border-top-style' ] ) ) ) ) {
			continue;
		}
		out.push( { block, part, selector, property, draft: Object.fromEntries( WIDTHS.map( ( w ) => [ w, perWidth[ w ] ?? null ] ) ), ...( conflicts.length ? { conflicts } : {} ), state: 'rest' } );
	}
	return out;
}
