// The applier's entrance decision: a target's draft entrance (its Element.animate call per width) against the entrance saved
// in its sgsMotion. The layer comes from the writer's own path (lib/fill-motion-element.mjs::elementMotion), token-snapped and
// preset-named as a build writes it, so an equal entrance compares equal.
import { elementMotion } from './fill-motion-element.mjs';
import { callRecord, TIER } from './apply-motion-calls.mjs';

const WIDTHS = [ 1440, 768, 375 ];
const canon = ( v ) => JSON.stringify( v, ( k, x ) => ( x && 'object' === typeof x && ! Array.isArray( x ) ? Object.fromEntries( Object.entries( x ).sort( ( a, b ) => a[ 0 ].localeCompare( b[ 0 ] ) ) ) : x ) );
const bare = ( layer ) => {
	const { preset, ...rest } = layer ?? {};
	return rest;
};

// { layer, why } or { reason }: the entrance layer the draft plays, with a device override where a narrower width times it
// differently, and allowLcpFade where the first screen fades in from transparent.
export function draftEntrance( { calls, trig, draft, mdb, ctx, target, offers = null, held = null } ) {
	const layers = {};
	for ( const w of WIDTHS ) {
		const call = calls[ w ]?.one[ 0 ];
		if ( ! call ) {
			continue;
		}
		const record = callRecord( call, trig, `animate@${ w }` );
		if ( ! record.properties.length ) {
			return { reason: `the call at ${ w } has no keyframe list the entrance layer can read` };
		}
		let m = elementMotion( [ record ], { mdb, ctx, sampled: null, target, offers } );
		// A state the block publishes no open or named state for: the values are still the draft's, played on the trigger the
		// block's entrance already has (scroll where it has none).
		if ( ! m.element.entrance && 'state' === trig.type ) {
			m = elementMotion( [ { ...record, trigger: { type: 'scroll-into-view' } } ], { mdb, ctx, sampled: null, target, offers } );
			m.element.entrance && ( m.element.entrance.base.trigger = held?.trigger ?? 'scroll' );
		}
		const layer = m.element.entrance?.base;
		if ( ! layer ) {
			return { reason: m.unmapped.map( ( u ) => u.reason ).join( '; ' ) || 'no entrance layer' };
		}
		layers[ w ] = layer;
	}
	const base = WIDTHS.find( ( w ) => layers[ w ] );
	if ( ! base ) {
		return { reason: 'no entrance call' };
	}
	const layer = structuredClone( layers[ base ] );
	for ( const w of WIDTHS.filter( ( x ) => x !== base && layers[ x ] && TIER[ x ] && x < base ) ) {
		for ( const k of [ 'duration', 'delay' ] ) {
			if ( ( layers[ w ].values[ k ] ?? 0 ) !== ( layer.values[ k ] ?? 0 ) ) {
				layer.devices = { ...( layer.devices || {} ), [ TIER[ w ] ]: { ...( layer.devices?.[ TIER[ w ] ] || {} ), [ k ]: layers[ w ].values[ k ] ?? 0 } };
			}
		}
	}
	// The draft's start line, from its observer's bottom margin, so an element low in the first screen reveals as it does there.
	const margin = /rootMargin\s+\S+\s+\S+\s+-([\d.]+)%/.exec( trig.detail ?? '' );
	if ( 'scroll' === layer.trigger && margin ) {
		layer.values.start = Number( margin[ 1 ] );
	}
	const opacity = layer.values.from?.opacity;
	if ( 'load' === layer.trigger && 0 === opacity && ( draft[ 1440 ]?.box?.y ?? 9999 ) < 900 ) {
		layer.values.allowLcpFade = true;
	}
	return { layer, why: `draft plays on ${ layer.trigger }, duration ${ JSON.stringify( layer.values.duration ) }, delay ${ layer.values.delay ?? 0 }` };
}

export const sameEntrance = ( a, b ) => canon( bare( a ) ) === canon( bare( b ) );
