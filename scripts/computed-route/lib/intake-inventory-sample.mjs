// Timer- and frame-written styles sampled per width (Spec 48 FR-48-25, FR-48-28 sample mode, motion row 11). A J
// record whose trigger is an interval or a frame loop and whose target is a template element is read under the
// determinism harness at each tested width: the page is opened (lib/intake-harness.mjs::openHarness), fonts are
// settled, and the clock is advanced to each sample time (sampleTimes: 0, the midpoint and the end of the interval, or
// of the harness's frame-loop length) with sampleAt's clock kind; at each time the target's inline and computed value
// of every property the record writes is read. A target that is not rendered on the page is a gap row.
import { openHarness, sampleAt, sampleTimes, HARNESS_DEFAULTS } from './intake-harness.mjs';

export const SAMPLE_WIDTHS = [ 375, 768, 1440 ];

// The J records to sample: interval or frame-loop writers with a template target. Each: { id, comp, n, properties,
// duration } (duration: the interval in ms, else rafFrames × stepMs).
export function sampleTargets( records, meta ) {
	return records.filter( ( r ) => 'J' === meta.get( r.id )?.prefix && [ 'interval', 'loop' ].includes( r.trigger.type ) && 'active' === r.status && null !== r.element.template_tpl_id )
		.map( ( r ) => {
			const delay = meta.get( r.id ).trigger?.delay;
			return {
				id: r.id, comp: ( meta.get( r.id ).tpl[ 0 ] || '' ).split( ':' ).slice( 0, -1 ).join( ':' ) || r.element.dc,
				n: [ r.element.template_tpl_id ].flat()[ 0 ], properties: r.properties.map( ( p ) => p.property ),
				duration: 'interval' === r.trigger.type && Number.isFinite( delay ) && delay > 0 ? delay : HARNESS_DEFAULTS.rafFrames * HARNESS_DEFAULTS.stepMs,
			};
		} );
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
	const timesOf = new Map( targets.map( ( t ) => [ t.id, sampleTimes( t.duration ) ] ) );
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
