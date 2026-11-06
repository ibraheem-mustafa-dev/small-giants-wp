// The applier's behaviour decisions: a draft record the writer recognises as a script behaviour (lib/motion-behaviours.mjs::
// recogniseBehaviour: magnet, sheen, ripple, tilt and its reset, parallax, the nav label magnet, the exit of an open entrance)
// against what the block's sgsMotion saves. An effect is finished as a build finishes it (lib/fill-motion.mjs::finishedEffect:
// placed, preset-named, token-snapped) and overlays the saved layer of its kind; a setting is compared with the saved attribute.
import { carriesHook } from './apply-records.mjs';
import { finishedEffect } from './fill-motion.mjs';
import { recogniseBehaviour } from './motion-behaviours.mjs';
import { declaredAttr } from './fill-behaviour.mjs';
import { loadEffectOffers } from './motion-effects.mjs';

const canon = ( v ) => JSON.stringify( v, ( k, x ) => ( x && 'object' === typeof x && ! Array.isArray( x ) ? Object.fromEntries( Object.entries( x ).sort( ( a, b ) => a[ 0 ].localeCompare( b[ 0 ] ) ) ) : x ) );
const differs = ( have, want ) => Object.entries( want ).filter( ( [ k, v ] ) => canon( have?.[ k ] ) !== canon( v ) ).map( ( [ k ] ) => k );
let offered = null;

// Draws one effect onto doc.elements[at]: true when the document changed, false when the saved layer already gives it.
function overlay( doc, at, w ) {
	const el = ( doc.elements[ at ] ||= {} );
	const hover = 'hover.effects' === w.list;
	const list = structuredClone( ( hover ? el.hover?.effects : el.effects ) || [] );
	const i = list.findIndex( ( l ) => l.effect === w.layer.effect );
	if ( i > -1 && ! differs( list[ i ].values, w.layer.values ).length && list[ i ].trigger === w.layer.trigger ) {
		return false;
	}
	if ( i > -1 ) {
		list[ i ] = { ...list[ i ], trigger: w.layer.trigger, values: { ...list[ i ].values, ...w.layer.values } };
	} else {
		list.push( { ...w.layer, id: `${ w.layer.effect }-${ list.length + 1 }` } );
	}
	if ( hover ) {
		el.hover = { ...( el.hover || {} ), effects: list };
	} else {
		el.effects = list;
	}
	return true;
}

function addSettings( { out, r, mine, saved, block, db, row } ) {
	const missing = mine.filter( ( s ) => ! declaredAttr( block, s.attr, db ) );
	if ( missing.length ) {
		row( 'no-setting', `${ block } declares no ${ missing.map( ( s ) => s.attr ).join( ', ' ) } setting` );
		return;
	}
	const todo = mine.filter( ( s ) => canon( saved[ s.attr ] ) !== canon( s.value ) );
	if ( ! todo.length ) {
		row( 'equal', `${ r.id }: the saved ${ mine.map( ( s ) => s.attr ).join( ', ' ) } give the draft` );
		return;
	}
	out.settings.push( ...todo.map( ( s ) => ( { attr: s.attr, value: s.value } ) ) );
	out.whys.push( `${ r.id } ${ todo.map( ( s ) => `${ s.attr } ${ JSON.stringify( s.value ) }` ).join( ', ' ) }` );
	out.ids.push( r.id );
}

// { whys, items, settings, ids, fx }: the document is changed in place; `settings` are block attributes to write beside it and
// `fx` the effect names written (the live marker data-sgs-fx names each).
export function behaviourWrites( { recs, allRecords, block, part, doc, saved, mdb, schema, ctx, db, facts = null } ) {
	offered ??= loadEffectOffers();
	const out = { whys: [], items: [], settings: [], ids: [], fx: [] };
	const done = new Set();
	for ( const r of recs.filter( ( x ) => carriesHook( x, facts ) ) ) {
		const b = done.has( r.id ) ? null : recogniseBehaviour( r, { records: allRecords } );
		if ( ! b ) {
			continue;
		}
		done.add( r.id );
		const row = ( status, why, prop = r.id ) => out.items.push( { status, prop, why } );
		if ( 'unmapped' === b.kind ) {
			row( 'no-setting', b.reason );
		} else if ( 'close' === b.kind ) {
			const base = doc.elements[ part ]?.entrance?.base;
			if ( ! base || ! [ 'open', 'state' ].includes( base.trigger ) ) {
				row( 'no-setting', `${ r.id } is the exit of an open entrance, and ${ part } of ${ block } has no open entrance to close` );
				continue;
			}
			const close = Object.fromEntries( Object.entries( { to: b.to, closeDuration: b.duration, closeEasing: b.easing, closeDelay: b.delay } ).filter( ( [ , v ] ) => null !== v && undefined !== v ) );
			if ( ! differs( base.close, close ).length ) {
				row( 'equal', `${ r.id }: the saved exit gives the draft exit` );
			} else {
				base.close = { ...( base.close || {} ), ...close };
				out.whys.push( `${ r.id } exit ${ JSON.stringify( close ) }` );
				out.ids.push( r.id );
			}
		} else if ( 'settings' === b.kind ) {
			const mine = b.blocks?.[ block ];
			if ( mine ) {
				addSettings( { out, r, mine, saved, block, db, row } );
			} else {
				row( 'no-setting', `${ r.id } maps onto settings of ${ Object.keys( b.blocks || {} ).join( ' or ' ) }, not ${ block }` );
			}
		} else if ( 'effect' === b.kind ) {
			if ( b.alt?.settings?.length && b.alt.settings.every( ( s ) => declaredAttr( block, s.attr, db ) ) ) {
				addSettings( { out, r, mine: b.alt.settings, saved, block, db, row } );
				continue;
			}
			( b.unread || [] ).forEach( ( u ) => row( 'no-setting', `${ u.field }: ${ u.reason }` ) );
			for ( const e of b.effects ) {
				const w = finishedEffect( e, { block, target: part, mdb, schema, offers: offered, ctx, id: `${ e.effect }-1` } );
				if ( w.refused ) {
					row( 'no-setting', `${ e.effect }: ${ w.refused }`, `${ r.id } ${ e.effect }` );
				} else if ( overlay( doc, w.target, w ) ) {
					out.whys.push( `${ r.id } ${ e.effect } ${ JSON.stringify( w.layer.values ) }` );
					out.ids.push( r.id );
					out.fx.push( e.effect );
				} else {
					row( 'equal', `${ r.id }: the saved ${ e.effect } gives the draft values`, `${ r.id } ${ e.effect }` );
				}
			}
			if ( b.hoverState ) {
				const kept = Object.fromEntries( Object.entries( b.hoverState ).filter( ( [ k ] ) => mdb.field( 'hover.state', `values.${ k }` ) ) );
				const el = ( doc.elements[ part ] ||= {} );
				if ( Object.keys( kept ).length && differs( el.hover?.state?.values, kept ).length ) {
					el.hover = { ...( el.hover || {} ), state: { ...( el.hover?.state || {} ), values: { ...( el.hover?.state?.values || {} ), ...kept } } };
					out.whys.push( `${ r.id } hover ${ JSON.stringify( kept ) }` );
					out.ids.push( r.id );
				} else if ( Object.keys( kept ).length ) {
					row( 'equal', `${ r.id }: the saved hover state gives the draft ${ Object.keys( kept ).join( ', ' ) }`, `${ r.id } hover` );
				}
			}
		}
	}
	return out;
}
