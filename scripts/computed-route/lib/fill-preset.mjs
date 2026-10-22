// The route sets the preset (Spec 48 FR-48-51, the route half of Spec 32 FR-32-8): a draft button whose base and hover looks all
// equal one `buttonPresets` variant of the client's theme snapshot (settings.custom.buttonPresets.<variant>: background, text,
// border, border-width, border-radius, padding, font-size, font-weight, min-height and the hover-* looks) is written as that
// variant (`inheritStyle: <variant>`) and none of the per-instance values the resolver wrote for those properties stay.
// A button that matches no variant, or only some of a variant's values, stays as the resolver wrote it; a block that is not a
// preset button is never touched, so a plain draft link stays a link. Values are compared at every read width within
// FR-48-36's tolerances (lib/fill-confirm.mjs::compareDR); a value the read did not return fails closed (no match).

import { setAttr } from './tree.mjs';
import { compareDR } from './fill-confirm.mjs';
import { READ_WIDTHS } from './fill-read.mjs';

// The preset keys and the CSS they set: [ key, [ CSS properties read from the element ], state ]. Padding is the four sides.
const SIDES = [ 'top', 'right', 'bottom', 'left' ];
export const PRESET_KEYS = [
	[ 'background', [ 'background-color' ], null ], [ 'text', [ 'color' ], null ], [ 'border', [ 'border-top-color' ], null ],
	[ 'border-width', [ 'border-top-width' ], null ], [ 'border-radius', [ 'border-top-left-radius' ], null ],
	[ 'padding', SIDES.map( ( s ) => `padding-${ s }` ), null ], [ 'font-size', [ 'font-size' ], null ], [ 'font-weight', [ 'font-weight' ], null ],
	[ 'min-height', [ 'min-height' ], null ],
	[ 'hover-background', [ 'background-color' ], 'hover' ], [ 'hover-text', [ 'color' ], 'hover' ], [ 'hover-border', [ 'border-top-color' ], 'hover' ],
	[ 'hover-transform', [ 'transform' ], 'hover' ],
];

// The block settings that hold a preset variant, by framework-DB query: { block: attr } for every block with an `inheritStyle`
// setting whose values include the preset slugs.
export function presetBlocks( db, variants ) {
	const rows = db.prepare( "SELECT block_slug, attr_name, enum_values FROM block_attributes WHERE attr_name = 'inheritStyle' AND enum_values IS NOT NULL" ).all();
	return Object.fromEntries( rows.filter( ( r ) => variants.every( ( v ) => JSON.parse( r.enum_values ).includes( v ) ) ).map( ( r ) => [ r.block_slug, r.attr_name ] ) );
}

// A preset value as a plain CSS value: a `var(--wp--preset--color--<slug>)` is the palette colour.
function plain( value, snapshot ) {
	const m = /^var\(--wp--preset--color--([\w-]+)\)$/.exec( String( value ).trim() );
	if ( ! m ) {
		return String( value ).trim();
	}
	const c = snapshot?.palette?.find( ( t ) => t.slug === m[ 1 ] )?.colour;
	return c ? `rgba(${ c.r }, ${ c.g }, ${ c.b }, ${ c.a })` : null;
}

// The draft's value for one preset key at one width: the base value, or for a hover key the hover look's value (the base
// value when the hover look leaves the property alone). Undefined when the read returned none.
function drawn( { reads, width, id, key, props, state } ) {
	const base = reads.widths?.[ width ]?.[ id ]?.styles;
	if ( ! base || reads.widths[ width ][ id ].missing ) {
		return undefined;
	}
	const hover = state ? ( reads.states?.[ width ]?.looks?.[ id ] || [] ).filter( ( l ) => l.states?.length === 1 && l.states[ 0 ] === state ) : [];
	const vals = props.map( ( p ) => hover.map( ( l ) => l.rendered?.[ p ] ?? l.declared?.[ p ] ).find( ( v ) => undefined !== v ) ?? base[ p ] );
	return vals.some( ( v ) => undefined === v ) ? undefined : ( 'padding' === key ? vals.join( ' ' ) : vals[ 0 ] );
}

// Whether the draft's value equals the preset's: 'padding' compares the four sides to the shorthand.
function equal( key, preset, value, fontPx ) {
	if ( 'padding' === key ) {
		const want = String( preset ).trim().split( /\s+/ );
		const have = String( value ).split( ' ' );
		const four = 1 === want.length ? Array( 4 ).fill( want[ 0 ] ) : 2 === want.length ? [ want[ 0 ], want[ 1 ], want[ 0 ], want[ 1 ] ] : 3 === want.length ? [ want[ 0 ], want[ 1 ], want[ 2 ], want[ 1 ] ] : want;
		return four.length === 4 && four.every( ( w, i ) => 'agree' === compareDR( 'padding-top', w, have[ i ], fontPx ).dr );
	}
	const prop = key.replace( /^hover-/, '' );
	return 'agree' === compareDR( { text: 'color', background: 'background-color', border: 'border-top-color', 'border-radius': 'border-top-left-radius', 'border-width': 'border-top-width' }[ prop ] || prop, preset, value, fontPx ).dr;
}

// The preset variant a target matches at every read width, or null. presets: settings.custom.buttonPresets.
export function matchPreset( { presets, reads, id, snapshot } ) {
	for ( const [ variant, preset ] of Object.entries( presets || {} ) ) {
		const keys = PRESET_KEYS.filter( ( [ k ] ) => undefined !== preset[ k ] );
		if ( ! keys.length ) {
			continue;
		}
		const ok = READ_WIDTHS.every( ( width ) => {
			const fontPx = parseFloat( reads.widths?.[ width ]?.[ id ]?.styles?.[ 'font-size' ] ) || 16;
			return keys.every( ( [ key, props, state ] ) => {
				const want = plain( preset[ key ], snapshot );
				const got = drawn( { reads, width, id, key, props, state } );
				return null !== want && undefined !== got && equal( key, want, got, fontPx );
			} );
		} );
		if ( ok ) {
			return { variant, props: [ ...new Set( keys.flatMap( ( [ , props ] ) => props ) ) ], hover: keys.some( ( [ , , s ] ) => s ) };
		}
	}
	return null;
}

// Writes the matched variant onto every preset block whose draft element matches, and drops the per-instance values the
// resolver wrote for the properties the variant sets. nodes: skeletonNodes(); flat: tree nodes by index; refOf: tree node to
// ref; reads: readDraft's result; rawSnapshot/snapshot: the client's theme snapshot (raw, normalised); writes: Fill's writes.
// Returns { writes (the list without the dropped ones, plus the variant writes), notes }.
export function presetWrites( { nodes, flat, refOf, reads, rawSnapshot, snapshot, writes, db } ) {
	const presets = rawSnapshot?.settings?.custom?.buttonPresets;
	const out = { writes, notes: [] };
	if ( ! presets || ! Object.keys( presets ).length ) {
		return out;
	}
	const blocks = presetBlocks( db, Object.keys( presets ).filter( ( v ) => [ 'primary', 'secondary', 'outline' ].includes( v ) ) );
	for ( const n of nodes ) {
		const attr = blocks[ n.name ];
		const target = n.targets.find( ( t ) => '' === t.slot );
		if ( ! attr || ! target ) {
			continue;
		}
		const m = matchPreset( { presets, reads, id: target.id, snapshot } );
		if ( ! m ) {
			continue;
		}
		const node = flat[ n.index ];
		const ref = refOf( node );
		const dropped = out.writes.filter( ( w ) => w.node === ref && '' === String( w.slot ?? '' ) && ( ! w.state || 'hover' === w.state ) && m.props.includes( w.prop ) );
		// Several writes to one attribute each hold the value the one before left as their `before`: undoing them last to first ends on the first `before`.
		for ( const w of [ ...dropped ].reverse() ) {
			null === w.before ? delete node.attributes[ w.attr ] : ( node.attributes[ w.attr ] = w.before );
		}
		const { before, after } = setAttr( node, { attr, value: m.variant } );
		out.writes = [ ...out.writes.filter( ( w ) => ! dropped.includes( w ) ), { node: ref, index: n.index, block: n.name, slot: '', prop: `preset ${ m.variant }`, attr, before, after, widths: [], how: 'preset' } ];
		out.notes.push( `${ ref } ${ n.name }: its base${ m.hover ? ' and hover' : '' } looks equal the ${ m.variant } preset, so ${ attr } is ${ m.variant } and ${ dropped.length } per-instance value${ 1 === dropped.length ? '' : 's' } are not written` );
	}
	return out;
}
