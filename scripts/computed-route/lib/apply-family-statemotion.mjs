// Applier family: state motion. Looks the block's sgsMotion holds, which the motion family (entrances, loops, magnets) does not:
// the hover layer (scale, translate, rotate; a lift on a card) and a state entrance (the invalid shake of a form). Both come from
// the handoff's records through lib/fill-motion-element.mjs::elementMotion, are merged into the saved document, and must pass
// lib/motion-validate.mjs::validateMotionWrite. A hover whose pose the live block already shows is `equal`.
import { declaredAttr } from './fill-behaviour.mjs';
import { elementMotion } from './fill-motion-element.mjs';
import { motionDb } from './motion-db.mjs';
import { loadMotionSchema } from './motion-schema.mjs';
import { clientPalette, clientTokens, tokenTypes } from './motion-tokens.mjs';
import { validateMotionWrite, verdictProblems } from './motion-validate.mjs';
import { MOTION_LOOKS, motionClose, motionOf } from './apply-hover.mjs';
import { draftId, recordsFor } from './apply-records.mjs';
import { indentHover } from './apply-state-indent.mjs';
import { cardGroup } from './apply-card-group.mjs';

const shared = new Map();
export function motionTools( db, rawSnapshot ) {
	if ( ! shared.has( db ) ) {
		const schema = loadMotionSchema();
		shared.set( db, { mdb: motionDb( db ), schema, ctx: { types: tokenTypes( schema ), tokens: clientTokens( rawSnapshot ), palette: clientPalette( rawSnapshot ), css: [] } } );
	}
	return shared.get( db );
}

const same = ( a, b ) => JSON.stringify( a ) === JSON.stringify( b );
const holdsMotion = ( r ) => ( r.properties || [] ).some( ( p ) => MOTION_LOOKS.includes( p.property ) && null !== p.to && undefined !== p.to );

// The write for one part of the document: the merged document is validated whole; `merge` is what the op adds.
export function writeOf( { saved, merge, schema, why, record, checks = [] } ) {
	const doc = structuredClone( saved.sgsMotion ?? { v: 1, elements: {} } );
	doc.elements ??= {};
	doc.elements.root = { ...( doc.elements.root || {} ), ...merge };
	const verdict = validateMotionWrite( doc, schema );
	if ( ! verdict.valid ) {
		return { status: 'no-setting', why: `sgsMotion write refused: ${ verdictProblems( verdict ).join( '; ' ).slice( 0, 300 ) }` };
	}
	return { status: 'op', why, writes: [ { attr: 'sgsMotion', value: { v: 1, elements: { root: merge } }, merge: 'deep' } ], checks, ...( record ? { record } : {} ) };
}

const STILL = { scale: 1, x: 0, y: 0, rotate: 0 };

// A draft element that does not move on hover, over a live block whose style lifts or enlarges it: the style's own hover
// movement (builtInHoverLift) is switched off so the live pose is the draft's.
export function stillHover( { block, saved, draft, live, db } ) {
	const want = motionOf( draft[ 1440 ]?.hover );
	const have = motionOf( live[ 1440 ]?.hover );
	if ( ! want || ! have || ! motionClose( want, STILL ) || motionClose( have, STILL ) || ! declaredAttr( block, 'builtInHoverLift', db ) ) {
		return [];
	}
	if ( false === saved.builtInHoverLift ) {
		return [ { status: 'equal', prop: 'hover motion', state: 'hover', why: 'the block already drops its style hover movement' } ];
	}
	return [ { status: 'op', prop: 'hover motion', state: 'hover', why: `the draft does not move on hover; the live ${ block } moves ${ JSON.stringify( have ) }`, writes: [ { attr: 'builtInHoverLift', value: false } ], checks: [ { width: 1440, state: 'hover', prop: 'transform', motion: true, want: STILL } ] } ];
}

export function hoverMotion( { target, block, saved, draft, live, recordsIndex, db, rawSnapshot } ) {
	const records = recordsFor( recordsIndex, target.tpl ).filter( ( r ) => 'hover' === r.trigger?.type );
	if ( ! records.some( holdsMotion ) ) {
		return stillHover( { block, saved, draft, live, db } );
	}
	const want = motionOf( draft[ 1440 ]?.hover );
	if ( ! want ) {
		return [ { status: 'no-setting', prop: 'hover motion', state: 'hover', why: 'the draft element could not be hovered, so its pose was not read' } ];
	}
	if ( motionClose( want, motionOf( live[ 1440 ]?.hover ) ) ) {
		return [ { status: 'equal', prop: 'hover motion', state: 'hover', why: 'the live hover pose gives the draft pose' } ];
	}
	const { mdb, schema, ctx } = motionTools( db, rawSnapshot );
	const m = elementMotion( records, { mdb, ctx, sampled: null, target: 'root', offers: { names: [], opens: [], openWords: new Set() } } );
	const items = m.unmapped.filter( ( u ) => records.some( ( r ) => r.id === u.record || String( u.record ).split( ',' ).includes( r.id ) ) ).map( ( u ) => ( { status: 'no-setting', prop: 'hover motion', state: 'hover', why: u.reason } ) );
	if ( ! m.element.hover ) {
		return items.length ? items : [ { status: 'no-setting', prop: 'hover motion', state: 'hover', why: 'no hover layer came from the records' } ];
	}
	if ( same( saved.sgsMotion?.elements?.root?.hover, m.element.hover ) ) {
		return [ ...items, { status: 'equal', prop: 'hover motion', state: 'hover', why: 'the saved hover layer already holds the records' } ];
	}
	if ( ! mdb.targetsOf( block ).length ) {
		return [ ...items, { status: 'no-setting', prop: 'hover motion', state: 'hover', why: `${ block } declares no motion support` } ];
	}
	const rec = records.find( holdsMotion );
	const op = writeOf( { saved, merge: { hover: m.element.hover }, schema, why: `hover pose ${ JSON.stringify( want ) } from ${ rec.id }`, record: rec.id, checks: [ { width: 1440, state: 'hover', prop: 'transform', motion: true, want } ] } );
	// A built-in hover movement (a button style's scale) paints under the motion layer, so a pose without it turns the block's own off.
	const scaled = motionOf( live[ 1440 ]?.hover )?.scale > want.scale + 0.011;
	if ( scaled && 'writes' in op && declaredAttr( block, 'builtInHoverLift', db ) && false !== saved.builtInHoverLift ) {
		op.writes = [ ...op.writes, { attr: 'builtInHoverLift', value: false } ];
	}
	return [ ...items, { prop: 'hover motion', state: 'hover', ...op } ];
}

// The invalid shake: a validation-fail record on the form's own draft component, played as the form's `invalid` state.
export function invalidShake( { target, block, saved, recordsIndex, records, db, rawSnapshot } ) {
	if ( 'sgs/form' !== block ) {
		return [];
	}
	const dc = draftId( target.tpl )?.dc;
	const rec = ( records || [] ).find( ( r ) => 'validation-fail' === r.trigger?.type && 'waapi' === r.mechanism && ( 'Root' === dc ? false : r.element?.dc === dc ) );
	if ( ! rec ) {
		return [];
	}
	const { mdb, schema, ctx } = motionTools( db, rawSnapshot );
	const states = mdb.statesOf( block );
	const asState = { ...rec, trigger: { ...rec.trigger, type: 'state' } };
	const m = elementMotion( [ asState ], { mdb, ctx, sampled: null, target: 'root', offers: { names: states, opens: [], openWords: new Set() } } );
	const layer = m.element.entrance?.base;
	if ( ! layer ) {
		return [ { status: 'no-setting', prop: 'invalid shake', why: m.unmapped.map( ( u ) => u.reason ).join( '; ' ) || `${ rec.id } named no state of ${ block } (${ states.join( ', ' ) })` } ];
	}
	const held = saved.sgsMotion?.elements?.root?.entrance?.base;
	if ( same( held, layer ) ) {
		return [ { status: 'equal', prop: 'invalid shake', why: `the saved ${ layer.state } state holds ${ rec.id }` } ];
	}
	if ( held && ! ( 'state' === held.trigger && held.state === layer.state ) ) {
		return [ { status: 'no-setting', prop: 'invalid shake', why: `the form root already holds a ${ held.trigger } entrance and the motion document keeps one entrance layer per element` } ];
	}
	return [ { prop: 'invalid shake', ...writeOf( { saved, merge: { entrance: { base: layer } }, schema, why: `${ rec.id } plays as the ${ layer.state } state`, record: rec.id } ) } ];
}

export const statemotion = {
	name: 'statemotion',
	// padding-left: the resting start padding the hover Indent is measured from.
	props: [ 'padding-left' ],
	decide( ctx ) {
		const tools = motionTools( ctx.db, ctx.rawSnapshot );
		return [ ...hoverMotion( ctx ), ...indentHover( { ...ctx, tools } ), ...invalidShake( ctx ), ...cardGroup( { ...ctx, tools, writeOf } ) ];
	},
};
