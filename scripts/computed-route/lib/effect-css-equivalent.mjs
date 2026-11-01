// The CSS equivalent of a script-driven effect no SGS effect expresses (Bean 2026-11-01, Spec 48 FR-48-17 and the Custom CSS
// route, Spec 32 FR-32-20): such an effect is written into the block's Custom CSS as its CSS, never recorded as a difference.
// Today one kind has an equivalent: a hover that raises the playback rate of the draft's one endless animation
// (`updatePlaybackRate(14)` on mouseenter), which is that animation's duration divided by the rate while hovered.
// Every function here is pure: no DOM, no file reads.

const isLoop = ( r ) => 'waapi' === r.mechanism && ( 'infinite' === r.iterations || Infinity === r.iterations ) && 'active' === ( r.status ?? 'active' ) && Number( r.duration_ms ) > 0;

// { kind: 'playback-rate-hover', rate, loop } for a hover Web Animations control that sets a playback rate above 1 when
// the same source file runs exactly one endless animation (the control's target; the record names the call's element, not
// the animation it controls), else null: no CSS equivalent, so the effect stays a difference. `records` is the inventory's list.
export function cssEquivalentOf( record, records ) {
	const p = ( record?.properties || [] ).find( ( q ) => /^playback-?rate$/i.test( String( q.property ?? '' ) ) );
	const rate = Number( p?.to );
	if ( 'waapi-control' !== record?.mechanism || 'hover' !== record.trigger?.type || ! Number.isFinite( rate ) || rate <= 1 ) {
		return null;
	}
	const loops = ( Array.isArray( records ) ? records : [] ).filter( ( r ) => r !== record && isLoop( r ) && r.source?.file && r.source.file === record.source?.file );
	return 1 === loops.length ? { kind: 'playback-rate-hover', rate, loop: loops[ 0 ].id } : null;
}

const seconds = ( ms ) => `${ Number( ( ms / 1000 ).toFixed( 3 ) ) }s`;

// The scoped CSS of an equivalent: the animation's resting duration over the rate, on the part the loop's rule animates
// while the block is hovered. `selector` is what follows `&` in the loop's own rule ('' for the block itself, `#id` for a
// part); `loop` is the loop record. Returns { css, label }.
export function hoverRateCss( equivalent, loop, selector ) {
	const duration = seconds( Number( loop.duration_ms ) / equivalent.rate );
	const target = selector ? `&:hover ${ selector }` : '&:hover';
	return {
		css: `@media (prefers-reduced-motion: no-preference){ ${ target } { animation-duration: ${ duration }; } }`,
		label: `Hover playback rate ${ equivalent.rate }x of loop ${ loop.id }: ${ target } animation-duration ${ duration }`,
	};
}

// The record IDs of the effect rows Bean marked `custom-css` (intake.json `review`, rowId `effect:<record>`).
export const customCssEffectIds = ( intake ) => new Set( ( intake?.review || [] ).filter( ( r ) => 'effect' === r.rowType && 'custom-css' === r.mark ).map( ( r ) => String( r.rowId ).replace( /^effect:/, '' ).split( ':' )[ 0 ] ) );

// The selector a loop's rule animates, read from the CSS Fill wrote for it (`& #id {` -> '#id', `& {` -> '').
export const selectorOfLoopCss = ( css ) => /&\s*([^{@]*?)\s*\{\s*animation:/.exec( String( css ) )?.[ 1 ] ?? null;

// The hover rules for the marked records, over the loop items Fill is about to write ([ { record, css } ]): { items
// ([ { record, css, label } ] for the same box) and used (record IDs written) }. A marked record writes on the block whose
// box holds its loop's rule; every other block, and every surface that does not draw the loop, skips it.
export function effectCssItems( { marked, records, items } ) {
	const out = { items: [], used: [] };
	for ( const id of marked ) {
		const record = ( records || [] ).find( ( r ) => r.id === id );
		const eq = record ? cssEquivalentOf( record, records ) : null;
		const base = eq ? items.find( ( i ) => i.record.id === eq.loop ) : null;
		const selector = base ? selectorOfLoopCss( base.css ) : null;
		if ( ! base || null === selector ) {
			continue;
		}
		const loop = ( records || [] ).find( ( r ) => r.id === eq.loop );
		const w = hoverRateCss( eq, loop, selector );
		out.items.push( { record: { id, name: record.name }, css: w.css, label: w.label } );
		out.used.push( id );
	}
	return out;
}
