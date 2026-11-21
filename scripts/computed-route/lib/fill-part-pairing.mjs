// Part pairing (Spec 48 FR-48-3, "code first, render confirms"): a setting the framework DB places on a part of a block
// (css_element other than `wrapper`: the burger, a label, a shape) is written only from the draft element paired to
// that part. A read taken from another element lands on the setting only by the accident that calibration also measured
// the setting at that element's slot (a burger height calibrated at the nav root reads the nav root's `height: 100%`).
// A part is paired when the element read is the part's own element (the slot its other settings are calibrated at), when
// calibration measured the read element and the part's element as the same box on this property at every width, or when
// the draft's element is the block's root and the part at once (rootIsPart).
import { attrsFor } from './db.mjs';
import { LOOSE } from './resolve.mjs';
import { defaultPaint, INHERITED } from './fill-prop.mjs';
import { longhands } from './calibrate-props.mjs';
import { reachedBy } from './css-families.mjs';

const WIDTHS = [ 375, 768, 1440 ];

// The framework's name for a block's own background layer: a root pseudo-element that paints only the background.
const BACKGROUND_LAYER = 'background';

// The slot most of a part's resting settings are calibrated at, or null when the part has none. The slot compares
// without its :nth-of-type steps; exactHome keeps them, so each of a block's repeated parts (Bars 1 to 3) has its own.
export function partHome( db, block, cal, element, except, key = LOOSE ) {
	const counts = new Map();
	for ( const r of attrsFor( db, block ) ) {
		const slot = cal?.settings?.[ r.attr_name ]?.slot;
		if ( r.css_element === element && ! r.css_state && r.attr_name !== except && undefined !== slot ) {
			counts.set( key( slot ), ( counts.get( key( slot ) ) || 0 ) + 1 );
		}
	}
	return [ ...counts.entries() ].sort( ( a, b ) => b[ 1 ] - a[ 1 ] )[ 0 ]?.[ 0 ] ?? null;
}

export const exactHome = ( db, block, cal, element ) => partHome( db, block, cal, element, null, String );

// The properties that place an element's children: they belong to the element laying out the children, wherever the
// draft and the block draw it.
const CHILD_LAYOUT = [ 'align-items', 'align-content', 'justify-content', 'justify-items', 'flex-direction', 'flex-wrap', 'gap', 'row-gap', 'column-gap' ];

// Whether the draft element read at `readSlot` lays out the children the block draws inside the part at `home`: the part
// sits inside the read element, the draft has no element of its own for it (no target at `home`), and the node's targets
// directly under `home` are the read element's laid-out children at every width it is read (as many as its
// `layoutChildren`, each box inside its box). targets: the node's skeleton targets; readAt( id, width ): a target's read.
export function laysOutPart( { readSlot, home, targets = [], readAt = () => null } ) {
	const own = LOOSE( readSlot );
	if ( ! String( home ).startsWith( `${ own ? `${ own } > ` : '' }` ) || home === own || targets.some( ( t ) => LOOSE( t.slot ?? '' ) === home ) ) {
		return false;
	}
	const kids = targets.filter( ( t ) => {
		const rest = LOOSE( t.slot ?? '' ).slice( home.length );
		return LOOSE( t.slot ?? '' ).startsWith( `${ home } > ` ) && ! rest.slice( 3 ).includes( ' > ' );
	} );
	const self = targets.find( ( t ) => ( t.slot ?? '' ) === readSlot );
	if ( ! kids.length || ! self ) {
		return false;
	}
	const inside = ( a, b ) => a.x >= b.x - 1 && a.y >= b.y - 1 && a.x + a.w <= b.x + b.w + 1 && a.y + a.h <= b.y + b.h + 1;
	const checked = WIDTHS.filter( ( w ) => {
		const r = readAt( self.id, w );
		return r && ! r.missing && r.rect && Number.isInteger( r.layoutChildren );
	} );
	return checked.length > 0 && checked.every( ( w ) => {
		const box = readAt( self.id, w );
		const shown = kids.map( ( t ) => readAt( t.id, w ) ).filter( ( r ) => r && ! r.missing && r.rect && ( r.rect.w > 0 || r.rect.h > 0 ) );
		return shown.length === box.layoutChildren && shown.every( ( r ) => inside( r.rect, box.rect ) );
	} );
}

// Why a write of `attr` read from the element at `readSlot` does not belong to the part the setting paints, or null when
// it does. prop: the property written; value: the written text (named in the reason); targets and readAt: the node's
// targets and their reads, for a property that places children (laysOutPart).
export function unpairedPart( { db, block, cal, attr, readSlot, prop, value, targets = [], readAt = () => null } ) {
	const row = attrsFor( db, block ).find( ( r ) => r.attr_name === attr );
	const element = row?.css_element;
	if ( ! element || 'wrapper' === element ) {
		return null;
	}
	const home = partHome( db, block, cal, element, attr );
	if ( null === home || LOOSE( readSlot ) === home ) {
		return null;
	}
	// Calibration measured the setting itself painting the read element, a part below the root (its own slot; a part setting
	// calibrated at the root stays rootIsPart's to judge): the element is the setting's part,
	// whatever the other settings the DB ties to the same part name paint (an icon trigger's corners on the trigger button,
	// where the icon's colour paints its glyph layer).
	const own = cal?.settings?.[ attr ];
	if ( '' !== LOOSE( readSlot ) && own?.property && ( own.property === prop || reachedBy( prop ).includes( own.property ) ) && [ ...( own.slots || [] ), own.slot ].some( ( s ) => 'string' === typeof s && LOOSE( s ) === LOOSE( readSlot ) ) ) {
		return null;
	}
	// An inherited property the setting's own value reached the read element with (calibration's `reaches`, the elements that
	// carried the marker) is the same value on both.
	if ( INHERITED.includes( prop ) && ( cal?.settings?.[ attr ]?.reaches || [] ).includes( readSlot ) ) {
		return null;
	}
	// A property placing children, read from the draft element that lays out the children the part holds.
	if ( CHILD_LAYOUT.includes( prop ) && laysOutPart( { readSlot, home, targets, readAt } ) ) {
		return null;
	}
	// The draft's one element is the block's root and this part at once.
	if ( rootIsPart( { db, block, cal, attr, readSlot, prop, value, home, targets } ) ) {
		return null;
	}
	// The same box: equal default paint at every width where both elements render. At a width where either element, or an
	// ancestor in the block, is display:none, its computed value is the declared one (a bar's `100%`), not a measurement.
	const at = ( slot ) => Object.fromEntries( WIDTHS.map( ( w ) => [ w, defaultPaint( cal, slot, w, prop ) ] ) );
	const here = at( readSlot );
	const part = at( home );
	const shown = WIDTHS.filter( ( w ) => rendered( cal, readSlot, w ) && rendered( cal, home, w ) );
	if ( shown.length && shown.every( ( w ) => undefined !== here[ w ] && here[ w ] === part[ w ] ) ) {
		return null;
	}
	return `unpaired-part: ${ attr } paints the ${ element } part (calibrated at "${ home }"), but ${ prop } ${ value } was read from "${ readSlot }", an element the draft does not pair to that part (calibration measured a different ${ prop } on each); a value from another box, a percentage included, is never written`;
}

// A slot path's steps, each without a pseudo-element (an element's ::after lies in that element).
const stepsOf = ( slot ) => LOOSE( slot ).split( ' > ' ).map( ( s ) => s.replace( /::[a-z-]+$/, '' ) );

// Whether the draft element read at `readSlot` is the block's root and the part at `home` (the slot the part's other
// settings are calibrated at) at once, so a value read there is the part's. All of:
//   - the element read is the block's root, and the draft has no element of its own at the part (no target at `home`);
//   - no other setting of the block paints `prop` on the root (its css_property covers it, lib/calibrate-props.mjs::longhands):
//     none calibration measured at the root, and none of the root's own DB rows (no css_element, or `wrapper`) that
//     calibration did not measure (one it measured elsewhere, a gradient on the root's ::before ring, paints that box), so
//     the root's value has no other owner;
//   - the value holds no percentage (it resolves against another containing block on each box);
//   - calibration shows the part as the root's own box or the box holding its content: it measured `attr` itself painting
//     the root (a part the block renders only in some modes leaves the setting on the root in the others), or every
//     element it measured in the block (the default paint's elements and each resting setting's slot) lies in a copy of
//     the part or on the path from the root to one, so nothing the block draws sits beside the part. A pseudo-element
//     layer of the root is not shown by nesting: calibration records no box for it; the block's own background layer is the
//     one exception (BACKGROUND_LAYER).
export function rootIsPart( { db, block, cal, attr, readSlot, prop, value, home, targets = [] } ) {
	if ( '' !== LOOSE( readSlot ) || ! home || /%/.test( String( value ?? '' ) ) || targets.some( ( t ) => LOOSE( t.slot ?? '' ) === home ) ) {
		return false;
	}
	const rows = attrsFor( db, block ).filter( ( r ) => ! r.css_state );
	const slotOf = ( name ) => ( 'string' === typeof cal?.settings?.[ name ]?.slot ? LOOSE( cal.settings[ name ].slot ) : null );
	const paints = ( r ) => !! r.css_property && ( r.css_property.split( ',' ).map( ( p ) => p.trim() ).includes( prop ) || longhands( r.css_property ).includes( prop ) );
	const onRoot = ( r ) => ( null === slotOf( r.attr_name ) ? ! r.css_element || 'wrapper' === r.css_element : '' === slotOf( r.attr_name ) );
	if ( rows.some( ( r ) => r.attr_name !== attr && paints( r ) && onRoot( r ) ) ) {
		return false;
	}
	if ( '' === slotOf( attr ) ) {
		return true;
	}
	const measured = [ ...Object.keys( cal?.elements || {} ).map( LOOSE ), ...rows.map( ( r ) => slotOf( r.attr_name ) ).filter( ( s ) => null !== s ) ].filter( ( s ) => '' !== s );
	// A pseudo-element of the root is a layer of the root's box, not a box holding its content: nesting cannot show what it covers.
	// The block's own background layer is the one layer known to cover the root: the framework names it `background`
	// (includes/helpers-tokens.php::sgs_block_background_layer_css paints it as the root's `::after` at inset 0 behind its
	// content, so a text gradient on the root cannot clip it), and calibration measured the layer's size when the setting was set.
	const part = stepsOf( home );
	if ( '' === part.join( '' ) ) {
		const effects = ( cal?.settings?.[ attr ]?.effects || [] ).map( String );
		return BACKGROUND_LAYER === attrsFor( db, block ).find( ( r ) => r.attr_name === attr )?.css_element && [ 'width', 'height' ].every( ( d ) => effects.includes( `${ home }|${ d }` ) );
	}
	const inPart = ( s ) => {
		const steps = stepsOf( s );
		return steps.some( ( _, i ) => part.every( ( step, j ) => steps[ i + j ] === step ) );
	};
	return measured.length > 0 && measured.every( ( s ) => inPart( s ) || measured.some( ( d ) => d.startsWith( `${ s } > ` ) && inPart( d ) ) );
}

// Whether the element at `slot` renders at width `w` on the calibration page: neither it nor an ancestor in the block is
// display:none in calibration's default paint (an unread display counts as rendered).
export function rendered( cal, slot, w ) {
	const steps = String( slot ).split( ' > ' );
	const paths = [ '', ...steps.map( ( _, i ) => steps.slice( 0, i + 1 ).join( ' > ' ) ) ].filter( ( x, i, all ) => all.indexOf( x ) === i );
	return paths.every( ( p ) => 'none' !== defaultPaint( cal, p, w, 'display' ) );
}
