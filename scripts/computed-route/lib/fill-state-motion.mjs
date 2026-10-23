// A hover (or state) transform read from the draft's state looks, as the hover record the motion writer takes
// (lib/fill-motion.mjs::motionWrites). A block whose motion support is declared (`supports.motion`) holds a hover
// transform as its sgsMotion hover layer, never as a per-property setting, so one path writes it for every such block
// whether the draft's animation inventory names the element or only the state read finds it (a generated Site Info icon
// has no template identity of its own, so no inventory record reaches it).
import { READ_WIDTHS } from './fill-read.mjs';

export const MOTION_STATE_PROPS = [ 'transform' ];

// A comma list split outside parentheses ("cubic-bezier(.34, 1.56, .64, 1), ease" is two entries).
export function splitList( text ) {
	const out = [];
	let depth = 0;
	let cur = '';
	for ( const ch of String( text ?? '' ) ) {
		if ( '(' === ch ) {
			depth++;
		} else if ( ')' === ch ) {
			depth--;
		}
		if ( ',' === ch && 0 === depth ) {
			out.push( cur.trim() );
			cur = '';
		} else {
			cur += ch;
		}
	}
	cur.trim() && out.push( cur.trim() );
	return out;
}

const ms = ( t ) => ( /ms$/.test( t ) ? parseFloat( t ) : /s$/.test( t ) ? Math.round( parseFloat( t ) * 1000 ) : NaN );

// The entry of a transition list that times `prop`: the one at the property's place in transition-property, else the
// first (a list of one is every property's). The list wraps when shorter than the property list, as CSS does.
function timed( list, props, prop ) {
	const at = props.findIndex( ( p ) => p === prop || 'all' === p );
	const i = at < 0 ? 0 : at;
	return list.length ? list[ i % list.length ] : undefined;
}

// The hover transform one width's state looks give a target: { record } (the hover record the motion writer takes),
// { gap } (a hover transform the motion layer cannot hold, with the reason) or {} (no hover transform at that width).
function hoverAt( reads, target, w ) {
	for ( const look of reads.states?.[ w ]?.looks?.[ target.id ] || [] ) {
		const states = [ ...look.states ].sort().join( '+' );
		const declared = look.declared?.transform;
		if ( 'hover' !== states || look.pseudo || ! declared ) {
			continue;
		}
		if ( /var\(|calc\(/.test( declared ) ) {
			return { gap: `the hover transform at ${ w }px (${ declared }) holds a var() or calc(), and the motion hover layer takes a literal transform` };
		}
		const rest = reads.declared?.[ w ]?.[ target.id ] || {};
		const rendered = reads.widths?.[ w ]?.[ target.id ]?.styles || {};
		const props = splitList( rest[ 'transition-property' ] ?? rendered[ 'transition-property' ] ?? '' );
		const dur = ms( timed( splitList( rest[ 'transition-duration' ] ?? rendered[ 'transition-duration' ] ), props, 'transform' ) );
		const del = ms( timed( splitList( rest[ 'transition-delay' ] ?? rendered[ 'transition-delay' ] ?? '0s' ), props, 'transform' ) );
		const ease = timed( splitList( rest[ 'transition-timing-function' ] ?? rendered[ 'transition-timing-function' ] ), props, 'transform' );
		return {
			record: {
				id: `STATE-${ target.id }`,
				name: `Hover transform read from the state look of ${ target.id }`,
				mechanism: 'css-transition',
				status: 'active',
				group: 'hover',
				trigger: { type: 'hover', detail: 'the draft\'s :hover look (state read)' },
				element: { template_tpl_id: null },
				properties: [ { property: 'transform', from: null, to: declared, duration_ms: Number.isNaN( dur ) ? 0 : dur, delay_ms: Number.isNaN( del ) ? 0 : del, easing: ease || 'ease' } ],
			},
		};
	}
	return {};
}

const sameHover = ( a, b ) => JSON.stringify( a?.properties ) === JSON.stringify( b?.properties );
const TIER_WIDTHS = { tablet: 768, mobile: 375 };

// A target's hover transform held per width: { base (the widest width's record), tiers ({ tablet, mobile }: a record,
// or null where the draft has no hover transform at that width; only a tier that differs from the base), gaps (reasons
// a width's hover transform cannot be held) }. A width where the element is not drawn is left out.
export function stateHover( reads, target ) {
	const at = {};
	const gaps = [];
	for ( const w of READ_WIDTHS ) {
		if ( true === reads.widths?.[ w ]?.[ target.id ]?.missing ) {
			continue;
		}
		const h = hoverAt( reads, target, w );
		if ( h.gap ) {
			gaps.push( h.gap );
			continue;
		}
		at[ w ] = h.record || null;
	}
	const wide = Object.keys( at ).map( Number ).sort( ( a, b ) => b - a );
	const baseW = wide.find( ( w ) => at[ w ] );
	const base = undefined === baseW ? null : at[ baseW ];
	if ( base && baseW !== wide[ 0 ] ) {
		gaps.push( `the draft has a hover transform at ${ baseW }px and none at ${ wide[ 0 ] }px, and the motion hover layer's base is the widest width` );
	}
	const tiers = {};
	for ( const [ tier, w ] of Object.entries( TIER_WIDTHS ) ) {
		if ( base && w in at && w < baseW && ! sameHover( at[ w ], base ) ) {
			tiers[ tier ] = at[ w ];
		}
	}
	return { base, tiers, gaps };
}

// The hover records a target's state looks make: [ record ] with one transform property, or []. The record carries the
// tablet and mobile looks that differ from the widest look as `tiers`.
// reads: readDraft's result; target: { id }.
export function stateMotionRecords( reads, target ) {
	const { base, tiers } = stateHover( reads, target );
	return base ? [ { ...base, tiers } ] : [];
}

// The hover layer's tablet and mobile overrides for a record with `tiers`: { devices, unmapped }. baseLayer is the layer
// hoverLayer made for the record; `layerOf(record)` makes one tier's layer; `perDevice(field)` says whether the layer
// holds the field per device. A tier with no hover transform takes the neutral pose; an easing or other field the layer
// holds for all devices only, and that differs, is returned in `unmapped`.
export function hoverDevices( record, baseLayer, layerOf, perDevice ) {
	const devices = {};
	const unmapped = [];
	const neutral = ( k ) => ( 'scale' === k ? 1 : 0 );
	for ( const [ tier, rec ] of Object.entries( record.tiers || {} ) ) {
		const got = rec ? layerOf( rec )?.values || {} : {};
		for ( const k of new Set( [ ...Object.keys( baseLayer.values ), ...Object.keys( got ) ] ) ) {
			const want = k in got ? got[ k ] : ( 'easing' === k ? baseLayer.values[ k ] : neutral( k ) );
			if ( JSON.stringify( want ) === JSON.stringify( baseLayer.values[ k ] ) ) {
				continue;
			}
			if ( perDevice( k ) ) {
				( devices[ tier ] ??= {} )[ k ] = want;
			} else {
				unmapped.push( `the ${ tier } hover ${ k } (${ JSON.stringify( want ) }) differs from the widest (${ JSON.stringify( baseLayer.values[ k ] ) }), and the hover layer holds ${ k } for all devices at once` );
			}
		}
	}
	return { devices, unmapped };
}
