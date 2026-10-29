// A scroll reveal the draft's own script plays (Spec 48 FR-48-77, register row C5): the script hides each `[data-reveal]`
// element, then an IntersectionObserver calls a tween that eases its opacity and a short rise over a duration, each item
// delayed by its index. The inventory (lib/intake-inventory-tween.mjs) records one style-write record per property and
// caller, with the tween's duration, curve and stagger; this module reads the opacity and the rise of one tween back
// together as the scroll entrance they are (`normaliseReveals`), and recognises the writes that only hide the element
// before its reveal (`hiddenStartOf`).
import { props, nameOf } from './motion-record-text.mjs';

// The CSS curve of each easing name the inventory reads from a tween.
export const EASING_CSS = {
	linear: 'linear',
	easeInQuad: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
	easeInCubic: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
	easeOutQuad: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
	easeOutCubic: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
	easeOutQuart: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
	easeOutQuint: 'cubic-bezier(0.23, 1, 0.32, 1)',
};

// The eased value written as the opacity itself: `String( e )` or `e`.
const OPACITY = /^(?:String\([A-Za-z_$][\w$]*\)|[A-Za-z_$][\w$]*)$/;
// A rise that closes as the eased value reaches 1: `'translateY(' + ( 26 * ( 1 - e ) ).toFixed( 2 ) + 'px)'`.
const RISE = /^'translate([XY])\('\+\((\d+(?:\.\d+)?)\*\(1-[A-Za-z_$][\w$]*\)\)(?:\.toFixed\(\d+\))?\+'px\)'$/;

const compactFormula = ( p ) => String( p?.formula ?? '' ).replace( /\s+/g, '' );
const memberOf = ( r ) => {
	const list = props( r );
	if ( 'js-style-write' !== r.mechanism || 1 !== list.length || ! ( r.duration_ms > 0 ) || ! Object.hasOwn( EASING_CSS, r.easing ?? '' ) ) {
		return null;
	}
	const [ p ] = list;
	if ( 'opacity' === nameOf( p ) && OPACITY.test( compactFormula( p ) ) ) {
		return { kind: 'opacity' };
	}
	const rise = 'transform' === nameOf( p ) ? RISE.exec( compactFormula( p ) ) : null;
	return rise ? { kind: 'rise', axis: rise[ 1 ], px: Number( rise[ 2 ] ) } : null;
};

// The records with each scroll reveal's opacity and rise written by one function replaced by a single entrance record the
// entrance writer reads like a Web Animation the code starts (`mechanism: 'waapi'`): opacity from 0 to 1 and the rise from
// its distance to none, over the tween's duration and curve, delayed by the index times the stagger step. The inventory
// records the tween once per caller (the observer, the mount, a state change), so the callers' records are one reveal: the
// merged record takes the scroll-started opacity record's id, element and trigger (else the first's) and names every
// member in `mergedFrom`; it carries `reveal` ({ axis, px }) for the writes that hide the element beforehand. A tween with
// no opacity write, or a curve the inventory could not name, is left as the separate records it was.
export function normaliseReveals( records ) {
	const list = Array.isArray( records ) ? records : [];
	const groups = new Map();
	for ( const r of list ) {
		const m = 'active' === ( r.status ?? 'active' ) ? memberOf( r ) : null;
		if ( m ) {
			const key = [ r.element?.dc, r.source?.function, r.duration_ms, r.easing, JSON.stringify( r.stagger ?? null ) ].join( '|' );
			groups.set( key, [ ...( groups.get( key ) || [] ), { r, m } ] );
		}
	}
	const drop = new Set();
	const merged = new Map();
	for ( const members of groups.values() ) {
		const opacities = members.filter( ( x ) => 'opacity' === x.m.kind );
		if ( ! opacities.length ) {
			continue;
		}
		const lead = opacities.find( ( x ) => 'scroll-into-view' === x.r.trigger?.type ) ?? opacities[ 0 ];
		const rises = members.filter( ( x ) => 'rise' === x.m.kind );
		const rise = ( rises.find( ( x ) => x.r.trigger?.type === lead.r.trigger?.type ) ?? rises[ 0 ] )?.m;
		const first = lead.r;
		const step = first.stagger?.ms;
		merged.set( first, {
			...first,
			name: `Scroll reveal in ${ first.source?.function }`,
			mechanism: 'waapi',
			properties: [ { property: 'opacity', from: 0, to: 1 }, ...( rise ? [ { property: 'transform', from: `translate${ rise.axis }(${ rise.px }px)`, to: 'none' } ] : [] ) ],
			easing: EASING_CSS[ first.easing ],
			delay_ms: Number.isFinite( step ) ? `i * ${ step }` : first.delay_ms,
			iterations: 1,
			direction: 'normal',
			mergedFrom: members.map( ( x ) => x.r.id ),
			reveal: rise ? { axis: rise.axis, px: rise.px } : { axis: null, px: 0 },
		} );
		members.filter( ( x ) => x.r !== first ).forEach( ( x ) => drop.add( x.r ) );
	}
	return list.filter( ( r ) => ! drop.has( r ) ).map( ( r ) => merged.get( r ) ?? r );
}

// The id of the reveal a write that only hides the element belongs to, or null: a style write of opacity 0 and/or the
// reveal's rise distance on a template element (`el.style.opacity = '0'`), in a draft that has a reveal of that pose.
export function hiddenStartOf( r, records ) {
	const list = props( r );
	if ( 'js-style-write' !== r.mechanism || ! list.length || null == r.element?.template_tpl_id ) {
		return null;
	}
	const reveals = ( records || [] ).filter( ( x ) => x.reveal && x.element?.dc === r.element.dc );
	const poseOf = ( p ) => {
		const to = String( p.to ?? '' ).replace( /\s+/g, '' );
		if ( 'opacity' === nameOf( p ) && /^0(?:\.0+)?$/.test( to ) ) {
			return { opacity: true };
		}
		const rise = 'transform' === nameOf( p ) ? /^translate([XY])\((-?\d+(?:\.\d+)?)px\)$/.exec( to ) : null;
		return rise ? { axis: rise[ 1 ], px: Number( rise[ 2 ] ) } : null;
	};
	const poses = list.map( poseOf );
	if ( poses.some( ( x ) => ! x ) ) {
		return null;
	}
	const hit = reveals.find( ( x ) => poses.every( ( q ) => q.opacity || ( x.reveal.axis === q.axis && x.reveal.px === q.px ) ) );
	return hit?.id ?? null;
}
