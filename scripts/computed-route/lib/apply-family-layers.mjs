// Applier family: decorative layers. A bare layer the draft paints (a glow, a gradient stripe, a gold bar, a shadow blob) that the
// skeleton found and the live post lacks is inserted as an `sgs/decorative-image` block at the draft's child position, with
// the layer's box and fill from the draft's computed styles at 375, 768 and 1440 (lib/apply-layer-targets.mjs builds the targets,
// one per layer). The attributes come through the framework's resolver (lib/fill-prop.mjs::resolveProperty), so every setting
// is the one the database ties to the property. An item is an `insert` op: { insert: { block, attrs }, anchor, writes: [], checks }.
// Outcomes: the block is on the post (`equal`), the layer cannot be placed (`unpaired`, with the reason), a property no setting
// holds (`no-setting`), else `op`.
import { resolveProperty } from './fill-prop.mjs';
import { setAttr } from './tree.mjs';
import { LAYER_BLOCK as BLOCK, directWrite, stretchedSize, zValue } from './layer-box.mjs';

const SIDES = [ 'top', 'right', 'bottom', 'left' ];
const px = ( v ) => ( /^-?[\d.]+px$/.test( String( v ?? '' ).trim() ) ? parseFloat( v ) : null );

export const LAYER_PROPS = [ 'position', ...SIDES, 'width', 'height', 'border-radius', 'background-image', 'background-color', 'opacity', 'z-index' ];

// What each property of the layer is, per width: { prop: { width: value } }, only where it paints something. A side the draft's
// inline style places the layer by is a length; an axis placed by both of its sides is sized by them, so its size is 100% when
// the sides are flush and a calc() of the two offsets otherwise.
function measured( draft, sides, widths ) {
	const at = ( w, prop ) => draft[ w ]?.styles?.[ prop ];
	const out = {};
	const put = ( prop, fn ) => {
		for ( const w of widths ) {
			const v = draft[ w ] ? fn( w ) : undefined;
			if ( undefined !== v && null !== v ) {
				( out[ prop ] ||= {} )[ w ] = v;
			}
		}
	};
	const placed = { ...sides };
	// A layer with no edge on an axis is placed where it sits: its top or left, as measured.
	if ( ! placed.top && ! placed.bottom ) {
		placed.top = true;
	}
	if ( ! placed.left && ! placed.right ) {
		placed.left = true;
	}
	SIDES.filter( ( s ) => placed[ s ] ).forEach( ( s ) => put( s, ( w ) => at( w, s ) ) );
	for ( const [ prop, a, b ] of [ [ 'width', 'left', 'right' ], [ 'height', 'top', 'bottom' ] ] ) {
		put( prop, ( w ) => {
			return stretchedSize( placed, [ a, b ], at( w, a ), at( w, b ) ) ?? ( px( at( w, prop ) ) ? at( w, prop ) : null );
		} );
	}
	put( 'border-radius', ( w ) => ( /[1-9]/.test( at( w, 'border-radius' ) ?? '' ) ? at( w, 'border-radius' ) : null ) );
	put( 'background-image', ( w ) => ( 'none' === ( at( w, 'background-image' ) ?? 'none' ) ? null : at( w, 'background-image' ) ) );
	put( 'background-color', ( w ) => ( /^rgba\(0, 0, 0, 0\)$|^transparent$/.test( at( w, 'background-color' ) ?? 'transparent' ) ? null : at( w, 'background-color' ) ) );
	put( 'z-index', ( w ) => zValue( at( w, 'z-index' ) ) );
	put( 'opacity', ( w ) => ( 1 === Number( at( w, 'opacity' ) ?? 1 ) ? null : at( w, 'opacity' ) ) );
	return out;
}

// The attribute writes for one property: a size held as % or calc() goes straight to the setting the database names (the
// resolver measures lengths in px); every other property goes through the resolver.
function writesFor( { ctx, node, prop, byWidth } ) {
	const { db, calFor, snapshot } = ctx;
	if ( 'z-index' === prop || ( [ 'width', 'height' ].includes( prop ) && Object.values( byWidth ).some( ( v ) => ! px( v ) ) ) ) {
		return directWrite( db, prop, byWidth );
	}
	const res = resolveProperty( { node, block: BLOCK, prop, draft: byWidth, baseline: () => undefined, slots: [ '' ], calibration: calFor( BLOCK ), db, snapshot, log: [], siblings: {} } );
	if ( 'written' === res.status ) {
		return { writes: res.writes };
	}
	return 'equal' === res.status ? { writes: [] } : { gap: `${ res.gap }${ res.detail ? `: ${ res.detail }` : '' }` };
}

// The checks of the inserted block on the live page: it is positioned, the box is the draft's, and the fill and radius read back.
function checksFor( draft, sides, widths ) {
	const checks = [];
	for ( const w of widths.filter( ( x ) => draft[ x ]?.layout && ( draft[ x ].layout.w > 0 || draft[ x ].layout.h > 0 ) ) ) {
		const s = draft[ w ].styles;
		checks.push( { width: Number( w ), prop: 'position', want: 'absolute' }, { width: Number( w ), prop: 'z-index', want: String( zValue( s[ 'z-index' ] ) ) }, { width: Number( w ), box: 'w', want: draft[ w ].layout.w }, { width: Number( w ), box: 'h', want: draft[ w ].layout.h } );
		SIDES.filter( ( side ) => sides[ side ] ).forEach( ( side ) => checks.push( { width: Number( w ), prop: side, want: s[ side ] } ) );
		'none' !== ( s[ 'background-image' ] ?? 'none' ) && checks.push( { width: Number( w ), prop: 'background-image', want: s[ 'background-image' ] } );
		/[1-9]/.test( s[ 'border-radius' ] ?? '' ) && checks.push( { width: Number( w ), prop: 'border-radius', want: s[ 'border-radius' ] } );
	}
	return checks;
}

function decide( ctx ) {
	const { target, block, draft } = ctx;
	const L = target.layer;
	if ( ! L ) {
		return [];
	}
	if ( block ) {
		return [ { status: 'equal', prop: 'layer', why: `${ target.ref } is on the post` } ];
	}
	if ( L.unpaired ) {
		return [ { status: 'unpaired', prop: 'layer', why: L.unpaired } ];
	}
	const widths = Object.keys( draft ).filter( ( w ) => draft[ w ] );
	if ( ! widths.length ) {
		return [ { status: 'unpaired', prop: 'layer', why: `the draft element ${ target.tpl } is not on the draft page at any width` } ];
	}
	const node = { attributes: { className: target.ref, ...( L.anchorTo ? { anchorTo: L.anchorTo } : {} ) } };
	const gaps = [];
	for ( const [ prop, byWidth ] of Object.entries( measured( draft, L.sides, widths ) ) ) {
		const out = writesFor( { ctx, node, prop, byWidth } );
		if ( out.gap ) {
			gaps.push( { status: 'no-setting', prop, why: out.gap } );
			continue;
		}
		out.writes.forEach( ( w ) => setAttr( node, w ) );
	}
	const attrs = node.attributes;
	return [
		{ status: 'op', prop: 'layer', why: `insert ${ target.tpl } ${ L.anchor.position } ${ L.anchor.match }`, insert: { block: BLOCK, attrs }, anchor: L.anchor, writes: [], checks: checksFor( draft, L.sides, widths ) },
		...gaps,
	];
}

export const layers = { name: 'layers', layers: true, props: LAYER_PROPS, decide };

// Stacking of a layer already on the post: an sgs/decorative-image paired with a draft element takes the draft's z-index (`auto` is
// 0: the tree-order layer, so later positioned content paints above it). Checks re-read the computed value.
function decideStack( ctx ) {
	const { target, block, draft, saved, db } = ctx;
	if ( BLOCK !== block || target.layer || target.slot ) {
		return [];
	}
	const widths = Object.keys( draft ).filter( ( w ) => draft[ w ]?.styles );
	if ( ! widths.length ) {
		return [];
	}
	const out = directWrite( db, 'z-index', Object.fromEntries( widths.map( ( w ) => [ w, draft[ w ].styles[ 'z-index' ] ] ) ) );
	if ( out.gap ) {
		return [ { status: 'no-setting', prop: 'z-index', why: out.gap } ];
	}
	const { attr, value } = out.writes[ 0 ];
	// A layer that never states the setting paints at the block's default (1), so only a different saved number is an op.
	if ( ( saved[ attr ] ?? 1 ) === value ) {
		return [ { status: 'equal', prop: 'z-index', why: `${ attr } already ${ value }` } ];
	}
	return [ { status: 'op', prop: 'z-index', why: `${ target.tpl } z-index ${ draft[ widths[ 0 ] ].styles[ 'z-index' ] } is ${ attr } ${ value }`, writes: out.writes, checks: widths.map( ( w ) => ( { width: Number( w ), prop: 'z-index', want: String( value ) } ) ) } ];
}

export const layerStack = { name: 'layerstack', props: [ 'z-index' ], decide: decideStack };
