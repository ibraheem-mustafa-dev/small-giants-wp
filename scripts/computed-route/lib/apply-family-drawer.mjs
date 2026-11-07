// Applier family: drawer. The nav drawer, its menu and the mega panels it and the header open: the draft's records
// (animations.json) become the settings that play them, record to setting rather than computed-style diff.
//   - open entrances (lib/apply-drawer-entrance.mjs): the drawer's slide and its close, the menu's rows and a section body, a
//     pinned bar, the Follow us row, a mega item, a gallery's tiles;
//   - the menu's section settings and the close button's hover fade (lib/apply-drawer-settings.mjs);
//   - the close button's hover, a ring's scale drift, a form's step and success states, a menu panel's entrance
//     (lib/apply-drawer-misc.mjs).
// The motion family leaves an open-triggered entrance, a drift on a target with no ambient-float and a form's states to this one.
import { recordsFor } from './apply-records.mjs';
import { callsAt, recordsOf } from './apply-motion-calls.mjs';
import { auxFor, innerIdsOf, isOpenRecord, motionItem, motionTools, openWordsOf, recordsIn, staggerOf } from './apply-drawer-core.mjs';
import { entranceItems } from './apply-drawer-entrance.mjs';
import { closeFade, menuSettings } from './apply-drawer-settings.mjs';
import { closeHover, formItems, panelItems, ringItems } from './apply-drawer-misc.mjs';
import { cardHoverDevices, entranceDevices, galleryDevices } from './apply-drawer-devices.mjs';

const set = ( list ) => new Set( ( list || [] ).map( Number ) );

// The shared view of a target: the DB's parts, the records it owns and reaches, the open words.
export function viewOf( ctx ) {
	const { mdb, schema, ctx: tctx } = motionTools( ctx.db, ctx.rawSnapshot );
	const owns = set( ctx.target.owns );
	const reach = set( ctx.target.reach );
	return { mdb, schema, tctx, open: openWordsOf( ctx.db ), owns, reach, recs: [ ...new Set( [ ...recordsOf( ctx.recordsIndex, ctx.target ), ...recordsIn( ctx.recordsIndex, [ ...innerIdsOf( callsAt( ctx.animate || {}, ctx.target.key ?? ctx.target.ref ) ) ] ) ] ) ], reachRecs: reach.size ? recordsIn( ctx.recordsIndex, [ ...reach ] ) : [] };
}

// The elements an open record's position needs read: the instances of its earlier templates.
function auxOf( { target, recordsIndex } ) {
	if ( target.slot ) {
		return [];
	}
	const open = new Set( [ 'open' ] );
	return recordsFor( recordsIndex, target.tpl ).filter( ( r ) => isOpenRecord( r, open ) && staggerOf( r ) ).flatMap( ( r ) => auxFor( r, target.tpl ) );
}

export const drawer = {
	name: 'drawer',
	props: [],
	aux: auxOf,
	decide( ctx ) {
		const { target, block, saved, db, animate, aux, skeleton, surface, records } = ctx;
		const c = viewOf( ctx );
		const items = [ ...entranceItems( { c, target, block, saved, aux, records, animate } ) ];
		const direct = ! target.slot && 'position' !== target.via;
		if ( direct && c.reach.size && 'sgs/nav-drawer-menu' === block ) {
			const s = menuSettings( { block, saved, db, tokens: c.tctx.tokens, reachRecs: c.reachRecs } );
			items.push( ...s.items );
			s.writes.length && items.push( { status: 'op', prop: 'section settings', why: `${ target.tpl }: ${ s.whys.join( '; ' ) }`, writes: s.writes, checks: [], record: s.ids[ 0 ] } );
		}
		const hover = direct && c.mdb.targetsOf( block ).some( ( t ) => 'close' === t.target ) ? closeHover( { c, saved, skeleton, surface, block } ) : null;
		if ( hover ) {
			items.push( ...hover.items );
			const fade = closeFade( { block, saved, db, hoverRecord: hover.hoverRecord } );
			fade?.status && items.push( fade );
			const settings = fade?.write ? [ fade.write ] : [];
			if ( Object.keys( hover.parts ).length ) {
				items.push( motionItem( { saved, parts: hover.parts, settings, schema: c.schema, prop: 'close hover', why: `${ target.tpl }: ${ hover.why.join( '; ' ) }${ fade?.write ? `; ${ fade.why }` : '' }`, record: hover.ids[ 0 ] } ) );
			} else if ( settings.length ) {
				items.push( { status: 'op', prop: 'closeHoverOpacity', why: `${ target.tpl }: ${ fade.why }`, writes: settings, checks: [], record: fade.id } );
			}
		}
		items.push( ...cardHoverDevices( ctx ), ...entranceDevices( ctx ), ...galleryDevices( ctx ) );
		items.push( ...ringItems( { c, saved, animate, target, block } ) );
		items.push( ...formItems( { c, saved, target, block, records } ) );
		direct && items.push( ...panelItems( { c, saved, block, reach: c.reach, owns: c.owns, reachRecs: c.reachRecs, records } ) );
		return items;
	},
};
