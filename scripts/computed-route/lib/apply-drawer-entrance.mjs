// The drawer family's open entrances: an animation the draft starts when a disclosure opens (a drawer, a menu panel, an
// accordion section) becomes an `open` entrance layer on the block part that plays it.
//   - the element itself (a drawer panel, a pinned bar, a row, a mega item): the root's entrance, its delay the record's
//     stagger at the element's position among the elements the record names;
//   - the items a list block draws (a menu's rows, a gallery's tiles): the root's entrance plus the document's stagger;
//   - the content of an opened section (a menu's mega body): the block's `*-body` part;
//   - the close the draft plays when the same drawer closes: the saved layer's `close` values.
// Every layer comes from lib/fill-motion-element.mjs::elementMotion, as a build writes it.
import { elementMotion } from './fill-motion-element.mjs';
import { LIMITS } from './fill-motion-stagger.mjs';
import { draftId } from './apply-records.mjs';
import { callsAt } from './apply-motion-calls.mjs';
import { delayAt, idsOfRecord, innerIdsOf, isOpenRecord, isPanelRecord, motionItem, neutralise, openLayer, positionOf, recordsIn, sameEntrance, staggerOf } from './apply-drawer-core.mjs';

const BODY = /-body$/;

// The close an entrance's host plays: the draft's slide-out as the saved layer's `close` values.
function closeOf( rec, { part, mdb, ctx, open } ) {
	const back = { ...rec, trigger: { ...rec.trigger, type: 'state', detail: 'state.open false → true' }, properties: ( rec.properties || [] ).map( ( p ) => ( { ...p, from: p.to, to: p.from } ) ) };
	const m = elementMotion( [ back ], { mdb, ctx, sampled: null, target: part, offers: { names: [], opens: [ part ], openWords: open } } );
	const l = m.element.entrance?.base;
	if ( ! l ) {
		return { reason: m.unmapped.map( ( u ) => u.reason ).join( '; ' ) || `${ rec.id } gave no close values` };
	}
	const { opacity, ...to } = l.values.from || {};
	return { close: { to: { ...to, ...( undefined === opacity ? {} : { opacity } ) }, closeDuration: l.values.duration, closeEasing: l.values.easing, ...( l.values.delay ? { closeDelay: l.values.delay } : {} ) } };
}

// The draft's delay is `offset + step * index` over the items in document order: one run across the whole list, so a grid does not restart it per row (`perRow: false`).
const stagerOf = ( st ) => ( { apply: true, offset: st.offset, step: st.step, cap: st.cap ?? LIMITS.cap, perRow: false } );

export function entranceItems( { c, target, block, saved, aux, records, animate } ) {
	const { mdb, schema, tctx, open, owns, reach, reachRecs, recs } = c;
	const inner = innerIdsOf( callsAt( animate || {}, target.key ?? target.ref ) );
	const isOpen = ( x ) => isOpenRecord( x, open, records || [] );
	const inside = ( ids ) => ids.some( ( id ) => owns.has( id ) || inner.has( id ) );
	const names = new Set( mdb.targetsOf( block ).map( ( t ) => t.target ) );
	const myId = Number( draftId( target.tpl )?.id );
	const direct = ! target.slot && 'position' !== target.via;
	const held = ( part ) => {
		const { close, ...rest } = saved.sgsMotion?.elements?.[ part ]?.entrance?.base ?? {};
		return saved.sgsMotion?.elements?.[ part ]?.entrance?.base ? rest : undefined;
	};
	const items = [];
	const parts = {};
	let stagger = null;
	const whys = [];
	const ids = [];
	const place = ( part, layer, why, rec ) => {
		if ( sameEntrance( held( part ), layer ) && ( ! stagger || JSON.stringify( saved.sgsMotion?.stagger ) === JSON.stringify( stagger ) ) ) {
			items.push( { status: 'equal', prop: `${ part } open entrance`, why: `the saved ${ part } entrance holds ${ rec.id }` } );
			return;
		}
		parts[ part ] = { entrance: { base: neutralise( held( part ), layer ) } };
		whys.push( `${ part } ${ why }` );
		ids.push( rec.id );
	};
	for ( const r of ( recs || [] ).filter( isOpen ) ) {
		const rids = idsOfRecord( r );
		const st = staggerOf( r );
		const res = ( part ) => openLayer( r, { part, mdb, ctx: tctx, open } );
		if ( rids.includes( myId ) && ! isPanelRecord( r ) ) {
			const o = res( 'root' );
			if ( o.reason ) {
				items.push( { status: 'no-setting', prop: r.id, why: o.reason } );
				continue;
			}
			if ( st && ! st.refused ) {
				const at = positionOf( r, target.tpl, aux );
				const d = null === at ? 0 : delayAt( st, at );
				d ? ( o.layer.values.delay = d ) : delete o.layer.values.delay;
			}
			place( 'root', o.layer, `opens: ${ JSON.stringify( o.layer.values.from ) }, ${ o.layer.values.duration }ms, delay ${ o.layer.values.delay ?? 0 }`, r );
		} else if ( st && ! st.refused && direct && names.has( 'item' ) && inside( rids ) ) {
			const o = res( 'root' );
			if ( o.reason ) {
				items.push( { status: 'no-setting', prop: r.id, why: o.reason } );
				continue;
			}
			delete o.layer.values.delay;
			stagger = stagerOf( st );
			place( 'root', o.layer, `opens its items: ${ JSON.stringify( o.layer.values.from ) }, ${ o.layer.values.duration }ms, stagger ${ st.offset } + ${ st.step } per item`, r );
		} else if ( st?.refused && direct && names.has( 'item' ) && inside( rids ) ) {
			items.push( { status: 'no-setting', prop: r.id, why: st.refused } );
		}
	}
	const bodyPart = [ ...names ].find( ( n ) => BODY.test( n ) );
	for ( const r of direct && bodyPart ? ( reachRecs || [] ).filter( ( x ) => isOpen( x ) && idsOfRecord( x ).some( ( id ) => reach.has( id ) && ! owns.has( id ) ) ) : [] ) {
		const o = openLayer( r, { part: bodyPart, mdb, ctx: tctx, open } );
		if ( o.reason ) {
			items.push( { status: 'no-setting', prop: r.id, why: o.reason } );
			continue;
		}
		const st = staggerOf( r );
		st && ! st.refused && st.offset ? ( o.layer.values.delay = st.offset ) : delete o.layer.values.delay;
		place( bodyPart, o.layer, `opens the section body: ${ JSON.stringify( o.layer.values.from ) }, ${ o.layer.values.duration }ms, delay ${ o.layer.values.delay ?? 0 } (the per-item step of ${ r.id } has no home: the stagger helper staggers the menu's own rows)`, r );
	}
	for ( const r of ( recs || [] ).filter( ( x ) => 'press' === x.trigger?.type && 'waapi' === x.mechanism && idsOfRecord( x ).includes( myId ) && ( x.trigger.state_keys || [] ).length ) ) {
		const base = held( 'root' );
		if ( ! base || 'open' !== base.trigger ) {
			continue;
		}
		const k = closeOf( r, { part: 'root', mdb, ctx: tctx, open } );
		if ( k.reason ) {
			items.push( { status: 'no-setting', prop: r.id, why: k.reason } );
		} else if ( JSON.stringify( saved.sgsMotion?.elements?.root?.entrance?.base?.close ) === JSON.stringify( k.close ) ) {
			items.push( { status: 'equal', prop: `${ r.id } close`, why: 'the saved close values hold the draft slide-out' } );
		} else {
			parts.root = { entrance: { base: { ...( parts.root?.entrance?.base || base ), close: k.close } } };
			whys.push( `root closes ${ JSON.stringify( k.close ) }` );
			ids.push( r.id );
		}
	}
	if ( whys.length ) {
		items.push( motionItem( { saved, parts, stagger, schema, prop: 'open entrance', why: `${ target.tpl }: ${ whys.join( '; ' ) }`, record: ids[ 0 ] } ) );
	}
	return items;
}

export { recordsIn };
