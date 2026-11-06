// The drawer family's other motion: a drawer close button's hover, a decorative ring's scale drift, a form's step and success
// entrances, and a floating menu panel's open entrance. Layers come from lib/fill-motion-element.mjs::elementMotion.
import { elementMotion } from './fill-motion-element.mjs';
import { surfaceFor } from './apply-skeleton.mjs';
import { callsAt } from './apply-motion-calls.mjs';
import { draftId } from './apply-records.mjs';
import { loopOp, ringScale } from './apply-motion-loops.mjs';
import { idsOfRecord, isOpenRecord, isPanelRecord, motionItem, openLayer, sameEntrance, staggerOf } from './apply-drawer-core.mjs';

const stem = ( w ) => w.replace( /(?:ed|es|s|d)$/, '' );
const wordsOf = ( t ) => String( t ?? '' ).replace( /([a-z0-9])([A-Z])/g, '$1 $2' ).toLowerCase().split( /[^a-z0-9]+/ ).filter( Boolean ).map( stem );
const same = ( a, b ) => JSON.stringify( a ) === JSON.stringify( b );

// The hover record a drawer's close button plays, the part it is (the skeleton slot that holds the record's element names the
// part: the one DB part whose name is a word of the slot's label), and its hover layer.
export function closeHover( { c, saved, skeleton, surface, block } ) {
	const { mdb, schema, tctx, recs } = c;
	const names = mdb.targetsOf( block ).map( ( t ) => t.target );
	const sk = surfaceFor( skeleton || [], surface.name );
	const out = { items: [], parts: {}, why: [], ids: [], hoverRecord: null };
	for ( const r of ( recs || [] ).filter( ( x ) => 'hover' === x.trigger?.type && ( x.properties || [] ).some( ( p ) => 'transform' === p.property ) ) ) {
		const node = sk?.nodes.find( ( n ) => n.slot && idsOfRecord( r ).some( ( id ) => n.ids.includes( id ) ) );
		const part = node && names.find( ( n ) => wordsOf( node.slot ).includes( stem( n.toLowerCase() ) ) );
		if ( ! part ) {
			continue;
		}
		const m = elementMotion( [ r ], { mdb, ctx: tctx, sampled: null, target: part, offers: null } );
		const layer = m.element.hover?.state;
		if ( ! layer ) {
			out.items.push( { status: 'no-setting', prop: `${ r.id } hover`, why: m.unmapped.map( ( u ) => u.reason ).join( '; ' ) || `${ r.id } gave no hover layer` } );
		} else if ( same( saved.sgsMotion?.elements?.[ part ]?.hover?.state, layer ) ) {
			out.items.push( { status: 'equal', prop: `${ part } hover`, why: `the saved ${ part } hover holds ${ r.id }` } );
		} else {
			out.parts[ part ] = { hover: { state: layer } };
			out.why.push( `${ part } hover ${ JSON.stringify( layer.values ) }` );
			out.ids.push( r.id );
		}
		out.hoverRecord = r;
	}
	return out;
}

// A ring the draft drifts and scales with a random per run, on a target that holds no ambient-float yet. The draft read runs
// under a fixed random, so the drift is zero there; the record states its reach ("random in ±18px"), which is the travel, and
// the period, phase and scale peak come from the draft's own call (lib/apply-motion-loops.mjs).
const REACH = /±\s*(\d+(?:\.\d+)?)\s*px/;
export function ringItems( { c, saved, animate, target, block } ) {
	const { mdb, schema, recs } = c;
	const myId = Number( draftId( target.tpl )?.id );
	const rings = ( recs || [] ).filter( ( r ) => idsOfRecord( r ).includes( myId ) && 'infinite' === r.iterations && ( r.properties || [] ).some( ( p ) => 'scale' === p.property ) && /random/i.test( JSON.stringify( r.properties ) + r.duration_ms ) );
	if ( ! rings.length || ! mdb.targetsOf( block ).some( ( t ) => 'root' === t.target ) ) {
		return [];
	}
	const el = saved.sgsMotion?.elements?.root ?? {};
	if ( ( el.effects || [] ).some( ( e ) => 'ambient-float' === e.effect ) ) {
		return [];
	}
	const calls = callsAt( animate, target.key ?? target.ref );
	const call = calls[ 1440 ]?.loops[ 0 ] ?? Object.values( calls ).flatMap( ( x ) => x.loops )[ 0 ];
	const drift = Number( REACH.exec( JSON.stringify( rings[ 0 ].properties ) )?.[ 1 ] );
	if ( ! call || ! Number.isFinite( drift ) ) {
		return [ { status: 'no-setting', prop: 'ring', why: `${ rings[ 0 ].id }: ${ call ? 'the record states no drift reach' : 'the draft read recorded no endless animation on this element' }` } ];
	}
	const frames = call.frames.map( ( f, i ) => ( { translate: i ? `${ drift }px ${ drift }px` : '0px 0px', ...( f.offset ? { offset: f.offset } : {} ) } ) );
	const l = loopOp( { call: { ...call, frames }, effects: el.effects ?? [], mdb, trig: { type: 'load' } } );
	if ( l.reason || ! l.effects ) {
		return [ { status: 'no-setting', prop: 'ring', why: l.reason || 'the loop gave no effect' } ];
	}
	const ring = ringScale( { call, effects: l.effects, records: rings } );
	const effects = ring?.effects ?? l.effects;
	return [ motionItem( { saved, parts: { root: { effects } }, schema, prop: 'ring drift', why: `${ target.tpl }: ${ l.why }${ ring?.why ? `; ${ ring.why }` : '' }`, record: rings[ 0 ].id } ) ];
}

// A form's step and success one-shots as the form's named states, each on a part of its own: the form's root holds the invalid
// shake and the document keeps one entrance layer per part. The step plays on the fields (`formField`), the success on the
// content band the container wrapper prints around the form and its messages.
const FORM_PARTS = { step: 'formField', success: 'content-band' };
export function formItems( { c, saved, target, block, records } ) {
	const { mdb, schema, tctx, open } = c;
	if ( 'sgs/form' !== block ) {
		return [];
	}
	const dc = /^(?:Root>)?(\w+)/.exec( target.tpl )?.[ 1 ];
	const states = mdb.statesOf( block );
	const mine = ( records || [] ).filter( ( r ) => 'state' === r.trigger?.type && 'waapi' === r.mechanism && 'active' === ( r.status ?? 'active' ) && dc && 'Root' !== dc && r.element?.dc === dc );
	const items = [];
	const parts = {};
	const whys = [];
	const ids = [];
	for ( const r of mine ) {
		const hay = new Set( wordsOf( `${ r.name } ${ ( r.trigger.state_keys || [] ).join( ' ' ) } ${ r.trigger.detail }` ) );
		const named = states.map( ( s ) => ( { s, hit: wordsOf( s ).filter( ( w ) => hay.has( w ) ).length / wordsOf( s ).length } ) ).filter( ( x ) => x.hit > 0 ).sort( ( a, b ) => b.hit - a.hit )[ 0 ];
		const part = named && ( /step/.test( named.s ) ? FORM_PARTS.step : /success|done/.test( named.s ) ? FORM_PARTS.success : null );
		if ( ! named || ! part || ! mdb.targetsOf( block ).some( ( t ) => t.target === part ) ) {
			items.push( { status: 'no-setting', prop: r.id, why: `${ r.id } names no form state with a part of its own to hold it (${ states.join( ', ' ) })` } );
			continue;
		}
		const m = elementMotion( [ { ...r, trigger: { type: 'state', state_keys: [], detail: named.s } } ], { mdb, ctx: tctx, sampled: null, target: part, offers: { names: states, opens: [], openWords: open } } );
		const layer = m.element.entrance?.base;
		const held = saved.sgsMotion?.elements?.[ part ]?.entrance?.base;
		if ( ! layer ) {
			items.push( { status: 'no-setting', prop: r.id, why: m.unmapped.map( ( u ) => u.reason ).join( '; ' ) || `${ r.id } gave no entrance layer` } );
		} else if ( held && sameEntrance( held, layer ) ) {
			items.push( { status: 'equal', prop: r.id, why: `the saved ${ part } ${ named.s } entrance holds ${ r.id }` } );
		} else {
			parts[ part ] = { entrance: { base: layer } };
			whys.push( `${ r.id } plays on the ${ part } part as the ${ named.s } state` );
			ids.push( r.id );
		}
	}
	whys.length && items.push( motionItem( { saved, parts, schema, prop: 'form states', why: `${ target.tpl }: ${ whys.join( '; ' ) }`, record: ids[ 0 ] } ) );
	return items;
}

// A floating menu panel's open entrance: the one-shot the draft plays on the panel itself (no stagger, an element described as
// the panel) on the block's `panel` part.
export function panelItems( { c, saved, block, reach, owns, reachRecs, records } ) {
	const { mdb, schema, tctx, open } = c;
	if ( ! mdb.opensOf( block ).includes( 'panel' ) ) {
		return [];
	}
	const items = [];
	for ( const r of ( reachRecs || [] ).filter( ( x ) => isOpenRecord( x, open, records || [] ) && ! staggerOf( x ) && isPanelRecord( x ) && idsOfRecord( x ).some( ( id ) => reach.has( id ) || owns.has( id ) ) ) ) {
		const o = openLayer( r, { part: 'panel', mdb, ctx: tctx, open } );
		const held = saved.sgsMotion?.elements?.panel?.entrance?.base;
		if ( o.reason ) {
			items.push( { status: 'no-setting', prop: r.id, why: o.reason } );
		} else if ( held && sameEntrance( held, o.layer ) ) {
			items.push( { status: 'equal', prop: `${ r.id } panel`, why: 'the saved panel entrance holds the record' } );
		} else {
			items.push( motionItem( { saved, parts: { panel: { entrance: { base: o.layer } } }, schema, prop: 'panel entrance', why: `panel opens ${ JSON.stringify( o.layer.values.from ) }, ${ o.layer.values.duration }ms`, record: r.id } ) );
		}
	}
	return items;
}
