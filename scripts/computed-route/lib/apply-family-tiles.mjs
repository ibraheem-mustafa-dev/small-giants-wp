// Applier family: tiles. The first tile of an sgs/form-field-tiles block read at rest, hovered and selected (a click;
// lib/apply-probes.mjs) in the draft and the live block: the selected look (ground, border, label colour), the check mark (colour,
// ground, size, inset, corner or inline position, and whether it shows at all) and the resting look go through the resolver at the
// tile's parts. A hover border is the form's tile hover border setting (the form holds it for every tile field), a hover lift or
// shadow is the tile element's hover layer of sgsMotion, and a field whose second click keeps the first tile chosen is multiSelect.
import { colourValue, partItems } from './apply-probe-items.mjs';
import { elementMotion } from './fill-motion-element.mjs';
import { motionTools } from './apply-family-statemotion.mjs';
import { MOTION_LOOKS, motionOf } from './apply-hover.mjs';
import { recordsFor } from './apply-records.mjs';
import { validateMotionWrite, verdictProblems } from './motion-validate.mjs';
import { matches } from './apply-ops.mjs';

const SELECTED = [ 'background-color', 'border-top-color', 'border-top-width', 'box-shadow', 'color' ];
const CHECK = [ 'color', 'background-color', 'width', 'top' ];
const REST = [ 'background-color', 'border-top-color', 'border-top-width' ];
const HOVERED = [ 'background-color', 'box-shadow' ];

// The tick as a visitor sees it: shown, and either a corner badge (absolute) or in line with the text.
const shown = ( check ) => ( check && 'none' !== check.display ? ( 'absolute' === check.position ? 'corner' : 'inline-start' ) : null );

// The form's own setting for the hover border of its tile fields: the form's attribute whose name is a tile border colour on hover.
function hoverBorder( { ctx, d, l } ) {
	const want = d.hover.tile[ 'border-top-color' ];
	const have = l.hover.tile[ 'border-top-color' ];
	if ( ! want || matches( have, want ) ) {
		return [];
	}
	const attr = ctx.db.prepare( "SELECT attr_name FROM block_attributes WHERE block_slug = 'sgs/form' AND attr_name LIKE 'tileBorderColour%Hover' AND attr_name NOT LIKE '%Gradient%'" ).get();
	const form = Object.entries( ctx.all?.blocks ?? {} ).find( ( [ , b ] ) => 'sgs/form' === b.block );
	if ( ! attr || ! form ) {
		return [ { status: 'no-setting', prop: 'tile hover border', state: 'hover', why: `${ attr ? 'the post has no sgs/form block' : 'sgs/form has no tile hover border setting' } for the draft's ${ want }` } ];
	}
	const value = colourValue( want, ctx.snapshot );
	if ( String( form[ 1 ].attrs[ attr.attr_name ] ?? '' ) === value ) {
		return [ { status: 'no-setting', prop: attr.attr_name, state: 'hover', why: `${ attr.attr_name } already holds ${ value } on ${ form[ 0 ] }, yet the live hover border is ${ have }, not the draft's ${ want }: another rule wins` } ];
	}
	return [ { status: 'op', ref: form[ 0 ], block: 'sgs/form', prop: attr.attr_name, state: 'hover', why: `tile hover border ${ value } on the form (${ form[ 0 ] }), read on the tile`, writes: [ { attr: attr.attr_name, value } ], checks: [] } ];
}

// Two poses within half a pixel: a lift of two pixels is the whole of a tile's hover, so the looser comparison the other families use would read it as still.
const poseClose = ( a, b ) => Boolean( a && b ) && Math.abs( a.scale - b.scale ) <= 0.011 && Math.abs( a.x - b.x ) <= 0.5 && Math.abs( a.y - b.y ) <= 0.5 && Math.abs( a.rotate - b.rotate ) <= 1;

// The draft's tile hover pose and shadow as the tile element's hover layer of sgsMotion, from the hover records of the draft's tile.
function hoverLayer( { ctx, d, l } ) {
	const want = motionOf( d.hover.tile );
	const have = motionOf( l.hover.tile );
	if ( ! want || poseClose( want, { scale: 1, x: 0, y: 0, rotate: 0 } ) || poseClose( want, have ) ) {
		return [];
	}
	const { tplId, dc } = d.rest ?? {};
	const records = ( tplId && dc ? recordsFor( ctx.recordsIndex, `${ dc }/${ tplId }#0` ) : [] ).filter( ( r ) => 'hover' === r.trigger?.type && ( r.properties || [] ).some( ( p ) => MOTION_LOOKS.includes( p.property ) && null !== p.to ) );
	if ( ! records.length ) {
		return [ { status: 'no-setting', prop: 'tile hover motion', state: 'hover', why: `the draft's tile lifts (${ JSON.stringify( want ) }) but the handoff holds no hover record for its element` } ];
	}
	const { mdb, schema, ctx: mctx } = motionTools( ctx.db, ctx.rawSnapshot );
	if ( ! mdb.targetsOf( ctx.block ).some( ( t ) => 'tile' === t.target ) ) {
		return [ { status: 'no-setting', prop: 'tile hover motion', state: 'hover', why: `${ ctx.block } declares no tile motion target` } ];
	}
	const m = elementMotion( records, { mdb, ctx: mctx, sampled: null, target: 'tile', offers: { names: [], opens: [], openWords: new Set() } } );
	if ( ! m.element.hover ) {
		return [ { status: 'no-setting', prop: 'tile hover motion', state: 'hover', why: m.unmapped.map( ( u ) => u.reason ).join( '; ' ) || 'no hover layer came from the records' } ];
	}
	if ( JSON.stringify( ctx.saved.sgsMotion?.elements?.tile?.hover ) === JSON.stringify( m.element.hover ) ) {
		return [ { status: 'no-setting', prop: 'tile hover motion', state: 'hover', why: 'the saved tile hover layer already holds the records, yet the live tile does not move like the draft' } ];
	}
	const doc = structuredClone( ctx.saved.sgsMotion ?? { v: 1, elements: {} } );
	doc.elements = { ...( doc.elements || {} ), tile: { ...( doc.elements?.tile || {} ), hover: m.element.hover } };
	const verdict = validateMotionWrite( doc, schema );
	if ( ! verdict.valid ) {
		return [ { status: 'no-setting', prop: 'tile hover motion', state: 'hover', why: `sgsMotion write refused: ${ verdictProblems( verdict ).join( '; ' ).slice( 0, 300 ) }` } ];
	}
	return [ { status: 'op', prop: 'tile hover motion', state: 'hover', why: `tile hover pose ${ JSON.stringify( want ) } from ${ records.map( ( r ) => r.id ).join( ', ' ) }`, writes: [ { attr: 'sgsMotion', value: { v: 1, elements: { tile: { hover: m.element.hover } } }, merge: 'deep' } ], record: records[ 0 ].id, checks: [ { width: 1440, prop: 'transform', want: d.hover.tile.transform, probe: [ 'hover', 'tile' ] } ] } ];
}

function multiSelect( { ctx, d, l } ) {
	if ( true !== d.multi || false !== l.multi ) {
		return [];
	}
	return [ { status: 'op', prop: 'multiSelect', why: 'a second click leaves the draft\'s first tile chosen, and moves the live choice', writes: [ { attr: 'multiSelect', value: true } ], checks: [] } ];
}

export const tiles = {
	name: 'tiles',
	props: [],
	decide( ctx ) {
		const { draft, live, block } = ctx;
		const d = draft[ 1440 ]?.probes;
		const l = live[ 1440 ]?.probes;
		if ( 'sgs/form-field-tiles' !== block || ! d?.selected || ! l?.selected ) {
			return [];
		}
		const items = [];
		const of = ( element, state, key, part, props ) => props.forEach( ( prop ) => items.push( ...partItems( { ctx, element, prop, state, drafts: [ d[ key ]?.[ part ]?.[ prop ] ], lives: [ l[ key ]?.[ part ]?.[ prop ] ], check: { probe: [ key, part ] } } ) ) );
		of( 'tile', null, 'rest', 'tile', REST );
		of( 'tile-selected', null, 'selected', 'tile', SELECTED );
		const want = shown( d.selected.check );
		const have = shown( l.selected.check );
		if ( want && want === have ) {
			of( 'tile-check', null, 'selected', 'check', CHECK );
		}
		if ( want && want !== have ) {
			items.push( { status: 'op', prop: 'selectedCheckPosition', why: `the draft's tick is ${ 'corner' === want ? 'a corner badge' : 'in line with the text' }; the live tile ${ have ? `shows it as ${ have }` : 'shows none' }`, writes: [ { attr: 'selectedCheckPosition', value: want } ], checks: [ { width: 1440, prop: 'position', want: 'corner' === want ? 'absolute' : 'static', probe: [ 'selected', 'check' ] } ] } );
		}
		if ( d.hover && l.hover ) {
			of( 'tile', 'hover', 'hover', 'tile', HOVERED );
			items.push( ...hoverBorder( { ctx, d, l } ), ...hoverLayer( { ctx, d, l } ) );
		}
		return [ ...items, ...multiSelect( { ctx, d, l } ) ];
	},
};
