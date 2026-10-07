// Measure a rendered draft's dimension diagram into sgs/diagram-dimension settings (plan
// 2026-10-07-measured-diagram-block.md §C). R-47-4: every number comes from the rendered page in a real browser: path
// points from the SVG geometry API (getTotalLength / getPointAtLength in the svg's own user units, i.e. its viewBox),
// label anchors from getBoundingClientRect against the drawing's box. Draft source text is never parsed. Line
// geometry has no css_property, so a Fill skeleton may carry it (R-47-10); the label position is the declared offset the
// walker reads (GAP-CHECKLIST 27), returned here only so a skeleton can start from it.

// In-page (self-contained, passed to page.evaluate): one dimension's settings.
// in: { svg, line, guides?, ticks?, label?, labelAlign? } — CSS selectors; `line`, `guides` and `ticks` are resolved
// inside the svg (guides and ticks may each be one path holding both ends). labelAlign is 'start' | 'center' | 'end'.
// out: { startX, startY, endX, endY, extReach, extReachEnd, extOvershoot, tickLength, labelX, labelY } — positions in %
// of the drawing (x of its width, y of its height), reach/overshoot/tick in % of its width; or { error }.
export function diagramGeometry( spec ) {
	const svg = document.querySelector( spec.svg );
	if ( ! svg ) {
		return { error: `no svg matches ${ spec.svg }` };
	}
	const vb = svg.viewBox && svg.viewBox.baseVal;
	if ( ! vb || ! vb.width || ! vb.height ) {
		return { error: 'the svg has no viewBox' };
	}
	const round = ( v ) => Math.round( v * 1000 ) / 1000;
	const pathIn = ( sel ) => ( sel ? svg.querySelector( sel ) : null );
	const sample = ( el, steps = 400 ) => {
		const total = el.getTotalLength();
		return Array.from( { length: steps + 1 }, ( _, i ) => el.getPointAtLength( ( total * i ) / steps ) );
	};

	const line = pathIn( spec.line );
	if ( ! line ) {
		return { error: `no line matches ${ spec.line }` };
	}
	const total = line.getTotalLength();
	const a = line.getPointAtLength( 0 );
	const b = line.getPointAtLength( total );
	const len = Math.hypot( b.x - a.x, b.y - a.y );
	if ( ! len ) {
		return { error: 'the line has no length' };
	}
	const ux = ( b.x - a.x ) / len;
	const uy = ( b.y - a.y ) / len;
	const nx = -uy;
	const ny = ux;
	// Points near the start or the end of the line, as their distance along the normal (s).
	const offsets = ( el ) => {
		const near = { start: [], end: [] };
		const tol = Math.max( 2, len * 0.05 );
		for ( const p of sample( el ) ) {
			const t = ( p.x - a.x ) * ux + ( p.y - a.y ) * uy;
			const s = ( p.x - a.x ) * nx + ( p.y - a.y ) * ny;
			if ( Math.abs( t ) <= tol ) {
				near.start.push( s );
			} else if ( Math.abs( t - len ) <= tol ) {
				near.end.push( s );
			}
		}
		return near;
	};
	const pct = 100 / vb.width;
	const out = {
		startX: round( ( ( a.x - vb.x ) / vb.width ) * 100 ),
		startY: round( ( ( a.y - vb.y ) / vb.height ) * 100 ),
		endX: round( ( ( b.x - vb.x ) / vb.width ) * 100 ),
		endY: round( ( ( b.y - vb.y ) / vb.height ) * 100 ),
	};

	const guides = pathIn( spec.guides );
	if ( guides ) {
		const near = offsets( guides );
		// A guide reaching towards -n has negative offsets: reach is how far it goes there, overshoot how far past the line.
		const reachOf = ( list ) => {
			if ( ! list.length ) {
				return 0;
			}
			const min = Math.min( ...list );
			const max = Math.max( ...list );
			return -min >= max ? -min : -max;
		};
		const overOf = ( list ) => ( list.length ? Math.min( Math.abs( Math.min( ...list ) ), Math.abs( Math.max( ...list ) ) ) : 0 );
		const rs = reachOf( near.start );
		const re = reachOf( near.end );
		out.extReach = round( rs * pct );
		out.extReachEnd = Math.abs( re - rs ) < 0.5 ? null : round( re * pct );
		out.extOvershoot = round( Math.max( overOf( near.start ), overOf( near.end ) ) * pct );
	}

	const ticks = pathIn( spec.ticks );
	if ( ticks ) {
		const near = offsets( ticks );
		const span = near.start.length ? Math.max( ...near.start ) - Math.min( ...near.start ) : 0;
		out.tickLength = round( span * pct );
	}

	const label = spec.label ? document.querySelector( spec.label ) : null;
	if ( label ) {
		const box = svg.getBoundingClientRect();
		const r = label.getBoundingClientRect();
		const align = spec.labelAlign || 'center';
		const x = 'start' === align ? r.left : ( 'end' === align ? r.right : ( r.left + r.right ) / 2 );
		out.labelX = round( ( ( x - box.left ) / box.width ) * 100 );
		out.labelY = round( ( ( r.top - box.top ) / box.height ) * 100 );
	}
	return out;
}
