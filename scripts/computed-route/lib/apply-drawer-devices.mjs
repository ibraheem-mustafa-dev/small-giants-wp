// Drawer rules on the mega posts' own blocks (surfaces `mega-<name>`): the drawer draws the same post as the header's panel, so the
// drawer's values are per-device values of the children's own motion (Tablet 1023px and below, Mobile 767px and below), read from
// the drawer skeleton's panel node for this post and the draft's records on its ids. No drawer card is a block of its own.
//   - cardHoverDevices: a linked container card (sgsBlockLink with a root hover state) takes the drawer card's hover pose
//     (lift, tilt, timing) as `hover.state.devices` Tablet and Mobile.
//   - entranceDevices: a child whose root entrance opens with the panel takes the drawer's stagger (offset, step, cap, duration)
//     as `entrance.base.devices` Tablet and Mobile. The index counts the panel's animated elements in draft order, a card the
//     live panel gives no entrance of its own (the aside) included, so the first link starts after it, as the draft does.
import { elementMotion } from './fill-motion-element.mjs';
import { hoverTo, settle } from './apply-chrome-records.mjs';
import { delayAt, idsOfRecord, motionTools, staggerOf } from './apply-drawer-core.mjs';
import { MOTION_LOOKS } from './apply-hover.mjs';
import { recordsFor, stateLook } from './apply-records.mjs';
import { validateMotionWrite, verdictProblems } from './motion-validate.mjs';

const section = ( surface ) => /^mega-(.+)$/.exec( surface?.name ?? '' )?.[ 1 ] ?? null;
const drawerNodes = ( skeleton ) => skeleton?.find( ( s ) => s.nodes.some( ( n ) => 'sgs/nav-drawer' === n.b ) )?.nodes ?? null;

// The drawer skeleton's panel node for this mega post, and its descendants in draft order.
function panelOf( { skeleton, surface } ) {
	const nodes = drawerNodes( skeleton );
	const name = section( surface );
	const panel = nodes && name && nodes.find( ( n ) => 'sgs/mega-panel' === n.b && String( n.a?.source ?? '' ).endsWith( `: ${ name }` ) );
	return panel ? { nodes, panel, inside: nodes.slice( panel.index + 1, panel.last + 1 ) } : null;
}

// The panel's animated elements in draft order: an item node repeats `x` times (its parent's count), a lone aside once.
function sequence( { inside, nodes } ) {
	const out = [];
	for ( const n of inside ) {
		if ( n.item ) {
			const times = nodes[ n.parent ]?.x ?? 1;
			for ( let i = 0; i < times; i++ ) {
				out.push( { id: n.lo, aside: false } );
			}
		} else if ( 'sgs/mega-aside' === n.b ) {
			out.push( { id: n.lo, aside: true } );
		}
	}
	return out;
}

const holdsMotion = ( r ) => ( r.properties || [] ).some( ( p ) => MOTION_LOOKS.includes( p.property ) && null !== p.to && undefined !== p.to );
const same = ( a, b ) => JSON.stringify( a ) === JSON.stringify( b );

function devicesWrite( { ctx, path, key, per, prop, why, record } ) {
	const { schema } = motionTools( ctx.db, ctx.rawSnapshot );
	const root = structuredClone( ctx.saved.sgsMotion?.elements?.root ?? {} );
	const layer = path.reduce( ( o, k ) => o?.[ k ], root );
	const next = { ...layer, devices: { ...( layer.devices || {} ), tablet: { ...( layer.devices?.tablet || {} ), ...per }, mobile: { ...( layer.devices?.mobile || {} ), ...per } } };
	if ( same( layer.devices, next.devices ) ) {
		return [ { status: 'equal', prop, state: key, why: `${ why }: already saved` } ];
	}
	const merged = structuredClone( ctx.saved.sgsMotion );
	let at = merged.elements.root;
	path.slice( 0, -1 ).forEach( ( k ) => ( at = at[ k ] ) );
	at[ path[ path.length - 1 ] ] = next;
	const verdict = validateMotionWrite( merged, schema );
	if ( ! verdict.valid ) {
		return [ { status: 'no-setting', prop, state: key, why: `sgsMotion write refused: ${ verdictProblems( verdict ).join( '; ' ).slice( 0, 300 ) }` } ];
	}
	const patch = { v: 1, elements: { root: {} } };
	let cur = patch.elements.root;
	path.slice( 0, -1 ).forEach( ( k ) => ( cur = cur[ k ] = {} ) );
	cur[ path[ path.length - 1 ] ] = { devices: next.devices };
	return [ settle( { prop, why, saved: ctx.saved, writes: [ { attr: 'sgsMotion', value: patch, merge: 'deep' } ], record, state: key } ) ];
}

export function cardHoverDevices( ctx ) {
	const { saved, target, db, rawSnapshot } = ctx;
	const home = panelOf( ctx );
	const hover = saved.sgsMotion?.elements?.root?.hover?.state;
	if ( ! home || target.slot || 'sgs/container' !== ctx.block || ! saved.sgsBlockLink || ! hover ) {
		return [];
	}
	const card = home.inside.find( ( n ) => n.item && 'card' === n.slot );
	const records = card ? recordsFor( ctx.recordsIndex, `Root/${ card.lo }#0` ).filter( ( r ) => 'hover' === r.trigger?.type && stateLook( r ) && holdsMotion( r ) ) : [];
	if ( ! records.length ) {
		return [];
	}
	const { mdb, ctx: mctx } = motionTools( db, rawSnapshot );
	const m = elementMotion( records, { mdb, ctx: mctx, sampled: null, target: 'root', offers: { names: [], opens: [], openWords: new Set() } } );
	const want = m.element.hover?.state?.values;
	if ( ! want ) {
		return [ { status: 'no-setting', prop: 'drawer hover devices', state: 'hover', why: m.unmapped.map( ( u ) => u.reason ).join( '; ' ) || 'no hover pose came from the drawer card record' } ];
	}
	const per = Object.fromEntries( Object.entries( want ).filter( ( [ k ] ) => [ 'translateX', 'translateY', 'scale', 'rotate', 'duration' ].includes( k ) ) );
	const shadow = hoverTo( records, 'box-shadow' );
	const items = devicesWrite( { ctx, path: [ 'hover', 'state' ], key: 'hover', per, prop: 'drawer hover devices', why: `${ target.tpl } the drawer card hovers ${ JSON.stringify( per ) } on Tablet and Mobile (${ records[ 0 ].id })`, record: records[ 0 ].id } );
	want.easing && JSON.stringify( want.easing ) !== JSON.stringify( hover.values?.easing ) && items.push( { status: 'no-setting', prop: 'drawer hover easing', state: 'hover', why: `${ records[ 0 ].id } eases with ${ want.easing } in the drawer; a hover's easing has no per-device setting (HoverStateValuesDevice holds duration, not easing)` } );
	shadow && items.push( { status: 'no-setting', prop: 'drawer hover shadow', state: 'hover', why: `${ records[ 0 ].id } casts ${ shadow.value } in the drawer; shadowHover is one value for every device, so the drawer shadow has no per-device setting` } );
	return items;
}

export function entranceDevices( ctx ) {
	const { saved, target, records, recordsIndex } = ctx;
	const home = panelOf( ctx );
	const base = saved.sgsMotion?.elements?.root?.entrance?.base;
	if ( ! home || target.slot || 'open' !== base?.trigger ) {
		return [];
	}
	if ( saved.sgsMotion?.stagger?.apply ) {
		return [ { status: 'no-setting', prop: 'drawer entrance devices', state: 'open', why: `${ target.tpl } hands its entrance to its items through the stagger helper, which holds one offset, step and cap for every device; the drawer's own offset, step and cap have no per-device setting` } ];
	}
	const seq = sequence( home );
	const ids = new Set( seq.map( ( e ) => e.id ) );
	const rec = ( records || [] ).find( ( r ) => idsOfRecord( r ).some( ( id ) => ids.has( id ) ) && staggerOf( r ) && ! staggerOf( r ).refused );
	const stagger = rec && staggerOf( rec );
	if ( ! stagger ) {
		return [];
	}
	const mine = ( ctx.all?.blocks ? Object.entries( ctx.all.blocks ) : [] ).filter( ( [ , b ] ) => 'open' === b.attrs?.sgsMotion?.elements?.root?.entrance?.base?.trigger ).map( ( [ ref ] ) => ref ).sort( ( a, b ) => Number( /-(\d+)$/.exec( a )?.[ 1 ] ) - Number( /-(\d+)$/.exec( b )?.[ 1 ] ) );
	const own = mine.indexOf( target.ref );
	const slots = seq.map( ( e, i ) => ( { ...e, i } ) ).filter( ( e ) => ! e.aside );
	const place = slots[ own ];
	if ( own < 0 || ! place ) {
		return [ { status: 'no-setting', prop: 'drawer entrance devices', state: 'open', why: `${ target.tpl } is block ${ own + 1 } of ${ mine.length } with an open entrance; the drawer panel draws ${ slots.length } such elements` } ];
	}
	const per = { duration: Math.round( rec.duration_ms ?? base.values?.duration ?? 0 ) || base.values?.duration, delay: delayAt( stagger, place.i ) };
	return devicesWrite( { ctx, path: [ 'entrance', 'base' ], key: 'open', per, prop: 'drawer entrance devices', why: `${ target.tpl } item ${ place.i } of the drawer panel opens ${ per.delay }ms after the panel (${ rec.id }: ${ stagger.offset } + ${ stagger.step } per item, cap ${ stagger.cap })`, record: rec.id } );
}

// A gallery in the panel: the drawer's tile height and column count, per device, from the draft's drawer elements (the client's
// element inventory: each element's box at 768 and 375, and the grid's declared columns). The gallery's own aspect ratio is one
// value for every device, so the tile takes its drawer height as a per-device minimum height; a column count equal to the saved
// one is left.
export function galleryDevices( ctx ) {
	const { saved, target, clientData } = ctx;
	const home = panelOf( ctx );
	if ( ! home || target.slot || 'sgs/gallery' !== ctx.block || ! clientData?.inventory?.length ) {
		return [];
	}
	const grid = home.inside.find( ( n ) => 'sgs/gallery' === n.b );
	const tile = home.inside.find( ( n ) => n.item );
	const tileEl = tile && clientData.inventory.find( ( e ) => e.tpl === tile.lo && String( e.key ).endsWith( '#0' ) );
	const gridEl = grid && clientData.inventory.find( ( e ) => e.tpl === grid.lo && String( e.key ).endsWith( '#0' ) );
	if ( ! tileEl?.box ) {
		return [ { status: 'no-setting', prop: 'drawer tile devices', why: `${ target.tpl } the client's element inventory holds no drawer tile box` } ];
	}
	const px = ( v ) => `${ Math.round( v * 2 ) / 2 }px`;
	const height = { tablet: px( tileEl.box[ 768 ]?.h ), mobile: px( tileEl.box[ 375 ]?.h ) };
	const items = [];
	const wanted = Object.fromEntries( Object.entries( height ).filter( ( [ , v ] ) => 'NaNpx' !== v ) );
	items.push( settle( { prop: 'tileMinHeight', why: `${ target.tpl } the draft's drawer tiles are ${ wanted.tablet } tall at 768 and ${ wanted.mobile } at 375 (${ tileEl.key })`, saved, writes: [ { attr: 'tileMinHeight', value: { ...( saved.tileMinHeight ?? {} ), ...wanted } } ], state: 'drawer' } ) );
	const count = Number( /repeat\(\s*(\d+)\s*,/.exec( gridEl?.attrs?.style ?? '' )?.[ 1 ] ?? NaN );
	if ( Number.isFinite( count ) ) {
		items.push( settle( { prop: 'columns', why: `${ target.tpl } the draft's drawer grid has ${ count } columns (${ gridEl.key })`, saved, writes: [ { attr: 'columns', value: { ...( saved.columns ?? {} ), tablet: count, mobile: count } } ], state: 'drawer' } ) );
	}
	return items;
}
