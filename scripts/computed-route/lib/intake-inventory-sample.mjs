// Timer- and frame-written styles sampled per width (Spec 48 FR-48-25, FR-48-28 sample mode, motion row 11). A J
// record whose trigger is an interval or a frame loop and whose target is a template element is read under the
// determinism harness at each tested width: the page is opened (lib/intake-harness.mjs::openHarness), fonts are
// settled, and the clock is advanced to each sample time (sampleTimes: 0, the midpoint and the end of the interval, or
// of the harness's frame-loop length) with sampleAt's clock kind; at each time the target's inline and computed value
// of every property the record writes is read. A target that is not rendered on the page is a gap row. A K record whose
// animation declaration is bound to script values is read the same way, once per width, for the animation it renders.
import { openHarness, sampleAt, sampleTimes, HARNESS_DEFAULTS } from './intake-harness.mjs';

export const SAMPLE_WIDTHS = [ 375, 768, 1440 ];

// The animation longhands a bound animation declaration is read through (lib/intake-inventory-bound.mjs::resolveBound).
export const ANIMATION_LONGHANDS = Object.freeze( [ 'animation-name', 'animation-duration', 'animation-timing-function', 'animation-delay', 'animation-iteration-count', 'animation-direction', 'animation-fill-mode' ] );

// The records to sample. Each: { id, comp, n, properties, duration, times? } (duration: the interval in ms, else
// rafFrames × stepMs; `times`: the sample times when they are not sampleTimes( duration )).
//  - J records: interval or frame-loop writers with a template target, read at 0, the midpoint and the end.
//  - K records whose declaration is bound to script values (meta `bound`, lib/intake-inventory-tpl.mjs::animationRecord)
//    with a template target: the animation longhands the element renders, read once after the frame-loop length, when the
//    logic has rendered at the page's width.
export function sampleTargets( records, meta ) {
	const settle = HARNESS_DEFAULTS.rafFrames * HARNESS_DEFAULTS.stepMs;
	const target = ( r ) => ( { id: r.id, comp: ( meta.get( r.id ).tpl[ 0 ] || '' ).split( ':' ).slice( 0, -1 ).join( ':' ) || r.element.dc, n: [ r.element.template_tpl_id ].flat()[ 0 ] } );
	const writers = records.filter( ( r ) => 'J' === meta.get( r.id )?.prefix && [ 'interval', 'loop' ].includes( r.trigger.type ) && 'active' === r.status && null !== r.element.template_tpl_id )
		.map( ( r ) => {
			const delay = meta.get( r.id ).trigger?.delay;
			return {
				...target( r ), properties: r.properties.map( ( p ) => p.property ),
				duration: 'interval' === r.trigger.type && Number.isFinite( delay ) && delay > 0 ? delay : settle,
			};
		} );
	const bound = records.filter( ( r ) => 'K' === meta.get( r.id )?.prefix && meta.get( r.id ).bound?.length && null != r.element.template_tpl_id )
		.map( ( r ) => ( { ...target( r ), properties: [ ...ANIMATION_LONGHANDS ], duration: settle, times: [ settle ] } ) );
	return [ ...writers, ...bound ];
}

// In-page: the inline and computed values of `props` on the first rendered copy of comp:n, or null.
function readTarget( { comp, n, props } ) {
	const host = ( x ) => ( x.parentElement ? x.parentElement.closest( '.sc-host' ) : null );
	const el = [ ...document.querySelectorAll( `[data-dc-tpl="${ n }"]` ) ].find( ( e ) => host( e )?.dataset.scName === comp );
	if ( ! el ) {
		return null;
	}
	const cs = getComputedStyle( el );
	return Object.fromEntries( props.map( ( p ) => [ p, { inline: /^text|^inner/.test( p ) ? el[ p ] ?? null : el.style.getPropertyValue( p ) || null, computed: /^text|^inner/.test( p ) ? null : cs.getPropertyValue( p ) || null } ] ) );
}

// Samples every target at each width on one page (`file`, `hash`). Returns { samples: [ { recordId, width, t, values } ],
// gaps }. One harness run per width; all targets share it, each read at its own three times.
export async function sampleWriters( { folder, index, harPath, file = index, hash = '', targets, widths = SAMPLE_WIDTHS, harness = {}, timeout = 60000 } ) {
	const samples = [];
	const gaps = [];
	if ( ! targets.length ) {
		return { samples, gaps };
	}
	const timesOf = new Map( targets.map( ( t ) => [ t.id, t.times ?? sampleTimes( t.duration ) ] ) );
	const all = [ ...new Set( [ ...timesOf.values() ].flat() ) ].sort( ( a, b ) => a - b );
	for ( const width of widths ) {
		let h = null;
		try {
			h = await openHarness( { folder, index, harPath, file, hash, width, timeout, ...harness } );
			const missing = new Set();
			await sampleAt( h.page, {
				kind: 'clock', times: all, ...harness,
				read: async ( t ) => {
					for ( const x of targets.filter( ( y ) => timesOf.get( y.id ).includes( t ) ) ) {
						const values = await h.page.evaluate( readTarget, { comp: x.comp, n: x.n, props: x.properties } );
						if ( null === values ) {
							missing.add( x.id );
						} else {
							samples.push( { recordId: x.id, width, t, values } );
						}
					}
					return [];
				},
			} );
			missing.forEach( ( id ) => gaps.push( { construct: 'inventory-sample', draftId: id, error: `${ width }px: the target is not rendered on ${ file }${ hash ? `#${ hash }` : '' }` } ) );
		} catch ( e ) {
			gaps.push( { construct: 'inventory-sample', draftId: `${ file }${ hash ? `#${ hash }` : '' }`, error: `${ width }px: ${ e.message.split( '\n' )[ 0 ] }` } );
		} finally {
			await h?.close();
		}
	}
	return { samples, gaps };
}
