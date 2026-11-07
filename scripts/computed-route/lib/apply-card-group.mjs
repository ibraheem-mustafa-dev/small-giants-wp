// Applier: card hover groups. A card the draft hovers as one changes its children with it (heading and text turn gold, an icon
// grows and tilts, a row's button inverts). The framework's way is the card's hover group (`hoverAsCard` or a block link, which
// print data-sgs-hover-group) plus, on each child, its own hover setting AND an sgsMotion hover layer whose source is `group`:
// that layer is what makes the child's hover rules also answer the card's hover (includes/helpers-hover-state.php::
// sgs_hover_state_rules). The decision comes from the card read in lib/apply-group-read.mjs, never from a record: a child that
// does not change while only the card is hovered (a button with a hover of its own) is left on its own hover.
import { MOTION_LOOKS, motionClose, motionOf } from './apply-hover.mjs';
import { elementMotion } from './fill-motion-element.mjs';
import { recordsFor } from './apply-records.mjs';
import { differs } from './apply-state-resolve.mjs';
import { stateItemOrParts } from './apply-state-parts.mjs';

const SKIP = [ ...MOTION_LOOKS, 'icon', 'unreached', 'transition-duration', 'transition-timing-function', 'border-top-width' ];
const iou = ( a, b ) => {
	const w = Math.min( a.x + a.w, b.x + b.w ) - Math.max( a.x, b.x );
	const h = Math.min( a.y + a.h, b.y + b.h ) - Math.max( a.y, b.y );
	return w > 0 && h > 0 ? ( w * h ) / ( a.w * a.h + b.w * b.h - w * h ) : 0;
};
const words = ( s ) => new Set( String( s ?? '' ).toLowerCase().match( /[a-z0-9]{3,}/g ) ?? [] );
const share = ( a, b ) => ! words( a ).size || ! words( b ).size || [ ...words( a ) ].some( ( w ) => words( b ).has( w ) );
const same = ( a, b ) => JSON.stringify( a ) === JSON.stringify( b );

// The properties a child's card hover changes on the draft: { prop: value under hover }.
export function changedLooks( child ) {
	if ( ! child?.hover || child.hover.unreached || ! child.rest ) {
		return {};
	}
	const out = {};
	for ( const prop of Object.keys( child.hover ).filter( ( p ) => ! SKIP.includes( p ) ) ) {
		if ( differs( child.hover[ prop ], child.rest[ prop ] ) && ! ( 'border-top-color' === prop && ! ( parseFloat( child.hover[ 'border-top-width' ] ) > 0 ) ) ) {
			out[ prop ] = child.hover[ prop ];
		}
	}
	return out;
}

const poseOf = ( child ) => {
	const hover = motionOf( child?.hover );
	return hover && ! motionClose( hover, motionOf( child.rest ) ) ? hover : null;
};

// Whether the card's own colour is carried by its children: a draft child changes colour while only the card is hovered, so the
// card setting paints nothing and the children's group hover holds the look.
export const cardCarriesColour = ( draftFacts ) => ( draftFacts?.group?.children || [] ).some( ( c ) => 'color' in changedLooks( c ) );

// The live child that is the same block as a draft child: the best match of the boxes, each taken from its own card's corner (a
// page drifts down a few pixels between the two renderings), whose words agree.
function liveMatch( d, liveKids, saved, cards ) {
	const at = ( b, c ) => ( { ...b, x: b.x - c.x, y: b.y - c.y } );
	const score = ( l ) => iou( at( d.box, cards.draft ), at( l.box, cards.live ) );
	return liveKids.filter( ( l ) => saved[ l.key ] && score( l ) >= 0.6 && share( d.text, l.text ) ).sort( ( a, b ) => score( b ) - score( a ) )[ 0 ] ?? null;
}

const msOf = ( v ) => {
	const t = String( v ?? '' ).split( ',' )[ 0 ].trim();
	return /ms$/.test( t ) ? parseFloat( t ) : /s$/.test( t ) ? parseFloat( t ) * 1000 : null;
};

// The child's hover layer for the card's hover: the draft pose it reads (when it has one) and `source: group`.
function groupLayer( { child, pose, existing, card, records, tools } ) {
	const { mdb, ctx } = tools;
	const named = records.flatMap( ( r ) => r.properties || [] ).filter( ( p ) => Number.isFinite( p.duration_ms ) );
	const timed = named.find( ( p ) => ( pose ? 'transform' : 'color' ) === p.property ) ?? named[ 0 ];
	const own = msOf( child.hover[ 'transition-duration' ] );
	const duration = own > 0 ? own : timed?.duration_ms ?? 0;
	const easing = ( own > 0 ? child.hover[ 'transition-timing-function' ]?.split( /,(?![^(]*\))/ )[ 0 ].trim() : null ) || timed?.easing || 'ease';
	let made = null;
	if ( pose ) {
		const r = ( n, d ) => Number( n.toFixed( d ) );
		const to = `translate(${ r( pose.x, 1 ) }px, ${ r( pose.y, 1 ) }px) rotate(${ r( pose.rotate, 1 ) }deg) scale(${ r( pose.scale, 2 ) })`;
		const rec = { id: `group-${ card }`, status: 'active', mechanism: 'css-transition', trigger: { type: 'hover' }, properties: [ { property: 'transform', from: null, to, duration_ms: duration, delay_ms: 0, easing } ] };
		made = elementMotion( [ rec ], { mdb, ctx, sampled: null, target: 'root', offers: { names: [], opens: [], openWords: new Set() } } ).element.hover?.state ?? null;
	}
	const base = existing ?? {};
	const values = { ...( base.values ?? {} ), ...( made?.values ?? {} ) };
	return { ...base, ...( made ?? {} ), values: Object.keys( values ).length ? values : { duration }, source: 'group' };
}

// One card's items: for each draft child that changes under the card's hover, the child's own hover settings and its group layer.
export function cardGroup( ctx ) {
	const { target, draft, live, all, recordsIndex, tools, writeOf } = ctx;
	const dGroup = draft[ 1440 ]?.group;
	const lGroup = live[ 1440 ]?.group;
	if ( ! dGroup || ! lGroup ) {
		return [];
	}
	if ( dGroup.unreached || lGroup.unreached ) {
		return [ { status: 'no-setting', prop: 'card hover', state: 'hover', why: `no pointer can reach the card's own padding on the ${ dGroup.unreached ? 'draft' : 'live' } page${ ( dGroup.unreached ? dGroup.why : lGroup.why ) ? ` (${ dGroup.unreached ? dGroup.why : lGroup.why })` : '' }` } ];
	}
	const items = [];
	const card = recordsFor( recordsIndex, target.tpl );
	for ( const d of dGroup.children ) {
		const looks = changedLooks( d );
		const turn = poseOf( d );
		if ( ! Object.keys( looks ).length && ! turn ) {
			continue;
		}
		const l = liveMatch( d, lGroup.children, all.blocks, { draft: dGroup.card, live: lGroup.card } );
		if ( ! l ) {
			items.push( { status: 'unpaired', prop: 'card hover', state: 'hover', why: `${ d.key } changes while only the card is hovered and no live block inside the card matches it` } );
			continue;
		}
		const ref = l.key;
		const { block, attrs } = all.blocks[ ref ];
		const base = { ref, block, state: 'hover' };
		const child = { ...ctx, block, saved: attrs, target: { ...target, ref, tpl: d.key } };
		// An icon's own rotation is a setting of its glyph, so the hover layer carries only the turn the hover adds.
		const pose = turn && attrs.iconRotate ? { ...turn, rotate: turn.rotate - attrs.iconRotate } : turn;
		const own = Object.entries( looks ).filter( ( [ p, v ] ) => differs( v, l.hover?.[ p ] ) )
			.map( ( [ prop, value ] ) => ( { ...base, ...stateItemOrParts( { ctx: child, prop, value, state: 'hover', slot: '', extra: { hoverHost: target.ref } } ) } ) );
		const poseWrong = Boolean( pose ) && ! motionClose( pose, motionOf( l.hover ) );
		const reached = own.some( ( i ) => 'no-setting' !== i.status ) || poseWrong;
		items.push( ...own.filter( ( i ) => 'equal' !== i.status || reached ) );
		if ( ! reached ) {
			continue;
		}
		if ( ! tools.mdb.targetsOf( block ).length ) {
			items.push( { ...base, status: 'no-setting', prop: 'hover group', why: `${ block } declares no motion support, so its hover cannot answer the card's hover` } );
			continue;
		}
		const held = attrs.sgsMotion?.elements?.root?.hover;
		const layer = groupLayer( { child: d, pose: poseWrong ? pose : null, existing: held?.state, card: target.ref, records: card, tools } );
		if ( same( held?.state, layer ) ) {
			items.push( { ...base, status: 'equal', prop: 'hover group', why: 'the saved hover layer already answers the card hover' } );
			continue;
		}
		const checks = poseWrong ? [ { width: 1440, state: 'hover', prop: 'transform', motion: true, want: pose, hoverHost: target.ref } ] : [];
		const op = writeOf( { saved: attrs, merge: { hover: { ...( held ?? {} ), state: layer } }, schema: tools.schema, why: `${ ref } answers the hover of ${ target.ref }${ poseWrong ? ` with pose ${ JSON.stringify( pose ) }` : '' }`, checks } );
		items.push( { ...base, prop: 'hover group', ...op } );
	}
	return items;
}
