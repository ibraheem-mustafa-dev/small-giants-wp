// In-page functions for the C1 (extra effect) and C2 (hover trigger region) detectors. Each export is passed to
// page.evaluate as source, so every function is self-contained (no module-scope references). They work on elements
// carrying `data-det-id="<ref>"`, the marker c12-session.mjs::markPairs puts on both sides' paired elements.

// Marks the paired elements of one side. live: the element carrying class `<ref>`; draft: the data-dc-tpl path the
// pairs file names, resolved by collect.mjs::resolveFinder (passed as source). Returns { id: found }.
export function markPairs( [ side, pairs, resolveSrc ] ) {
	// eslint-disable-next-line no-new-func
	const resolve = 'draft' === side ? new Function( `return (${ resolveSrc });` )() : null;
	for ( const old of document.querySelectorAll( '[data-det-id]' ) ) {
		old.removeAttribute( 'data-det-id' );
	}
	const out = {};
	for ( const [ ref, tpl ] of Object.entries( pairs ) ) {
		let el = null;
		try {
			el = 'draft' === side ? ( tpl ? resolve( { tpl } ) : null ) : document.querySelector( `.${ ref }` );
		} catch ( e ) {
			el = null;
		}
		if ( el ) {
			el.setAttribute( 'data-det-id', ref );
		}
		out[ ref ] = Boolean( el );
	}
	return out;
}

// One reading of every marked element: box, own effective transform, paint properties and running infinite animations.
export function samplePairs() {
	const num = ( v ) => ( Number.isFinite( v ) ? v : 0 );
	const pose = ( cs ) => {
		let tx = 0;
		let ty = 0;
		let sx = 1;
		let sy = 1;
		let rot = 0;
		const m = /^matrix(3d)?\(([^)]*)\)$/.exec( cs.transform );
		if ( m ) {
			const v = m[ 2 ].split( ',' ).map( parseFloat );
			const d3 = Boolean( m[ 1 ] );
			const a = v[ 0 ];
			const b = v[ 1 ];
			tx = d3 ? v[ 12 ] : v[ 4 ];
			ty = d3 ? v[ 13 ] : v[ 5 ];
			sx = Math.hypot( a, b );
			sy = d3 ? Math.hypot( v[ 4 ], v[ 5 ] ) : Math.hypot( v[ 2 ], v[ 3 ] );
			rot = ( Math.atan2( b, a ) * 180 ) / Math.PI;
		}
		const t = String( cs.translate ).split( ' ' );
		if ( 'none' !== cs.translate && t.length ) {
			tx += num( parseFloat( t[ 0 ] ) );
			ty += num( parseFloat( t[ 1 ] ) );
		}
		if ( 'none' !== cs.scale ) {
			const s = String( cs.scale ).split( ' ' ).map( parseFloat );
			sx *= num( s[ 0 ] );
			sy *= num( s[ 1 ] ?? s[ 0 ] );
		}
		if ( 'none' !== cs.rotate ) {
			rot += num( parseFloat( cs.rotate ) );
		}
		return [ tx, ty, sx, sy, rot ].map( ( n ) => Math.round( n * 1000 ) / 1000 );
	};
	const out = {};
	for ( const el of document.querySelectorAll( '[data-det-id]' ) ) {
		const cs = getComputedStyle( el );
		const r = el.getBoundingClientRect();
		const vis = r.width > 0 && r.height > 0 && 'none' !== cs.display && 'hidden' !== cs.visibility;
		const owner = el.parentElement ? el.parentElement.closest( '[data-det-id]' ) : null;
		out[ el.dataset.detId ] = {
			up: owner ? owner.dataset.detId : null,
			vis,
			inView: vis && r.bottom > -240 && r.top < innerHeight + 240 && r.right > 0 && r.left < innerWidth,
			x: Math.round( r.left * 10 ) / 10,
			y: Math.round( ( r.top + scrollY ) * 10 ) / 10,
			w: Math.round( r.width * 10 ) / 10,
			h: Math.round( r.height * 10 ) / 10,
			tf: pose( cs ),
			color: cs.color,
			bg: cs.backgroundColor,
			bc: cs.borderTopColor,
			sh: cs.boxShadow,
			op: cs.opacity,
			fl: cs.filter,
			td: cs.textDecorationLine,
			anim: el.getAnimations().filter( ( a ) => 'running' === a.playState && Infinity === a.effect?.getComputedTiming().iterations )
				.map( ( a ) => a.animationName || a.transitionProperty || 'script' ),
		};
	}
	return out;
}

// Where the pointer goes for one marked element: its visible centre, a point inside its left padding (when it has any),
// and a point just beside it (right, else left, else below). Also the quietest spot to rest the pointer between reads.
export function pointsFor( id ) {
	const el = document.querySelector( `[data-det-id="${ id }"]` );
	if ( ! el ) {
		return null;
	}
	el.scrollIntoView( { block: 'center', inline: 'center', behavior: 'instant' } );
	const r = el.getBoundingClientRect();
	const cs = getComputedStyle( el );
	const clampX = ( x ) => Math.min( Math.max( x, 1 ), innerWidth - 2 );
	const clampY = ( y ) => Math.min( Math.max( y, 1 ), innerHeight - 2 );
	const cy = clampY( r.top + r.height / 2 );
	const pts = { text: { x: clampX( r.left + r.width / 2 ), y: cy } };
	const padL = parseFloat( cs.paddingLeft ) || 0;
	if ( padL >= 6 ) {
		pts.pad = { x: r.left + Math.min( padL / 2, 8 ), y: cy };
	}
	if ( r.right + 6 < innerWidth - 1 ) {
		pts.gap = { x: r.right + 5, y: cy };
	} else if ( r.left - 6 > 1 ) {
		pts.gap = { x: r.left - 5, y: cy };
	} else if ( r.bottom + 6 < innerHeight - 1 ) {
		pts.gap = { x: clampX( r.left + r.width / 2 ), y: r.bottom + 5 };
	}
	const chainAt = ( x, y ) => {
		const ids = [];
		for ( let e = document.elementFromPoint( x, y ); e; e = e.parentElement ) {
			if ( e.dataset && e.dataset.detId ) {
				ids.push( e.dataset.detId );
			}
		}
		return ids;
	};
	const spots = [ [ innerWidth - 3, innerHeight - 3 ], [ 3, innerHeight - 3 ], [ innerWidth - 3, innerHeight / 2 ], [ 3, innerHeight / 2 ], [ innerWidth / 2, innerHeight - 3 ] ];
	const rest = spots.find( ( [ x, y ] ) => 0 === chainAt( x, y ).length ) || [ 1, 1 ];
	return { pts, rest: { x: rest[ 0 ], y: rest[ 1 ] }, chain: chainAt( pts.text.x, pts.text.y ), box: { w: r.width, h: r.height } };
}

// The marked elements inside the smallest ancestor of `id` that holds at least two other marked elements (at most four
// levels up; the parent when none does): what a hover on `id` could change around it.
export function scopeOf( id ) {
	const el = document.querySelector( `[data-det-id="${ id }"]` );
	if ( ! el ) {
		return [];
	}
	let root = el.parentElement || el;
	for ( let up = root, n = 0; up && n < 4; up = up.parentElement, n++ ) {
		root = up;
		if ( up.querySelectorAll( '[data-det-id]' ).length >= 3 ) {
			break;
		}
	}
	return [ ...root.querySelectorAll( '[data-det-id]' ) ].map( ( e ) => e.dataset.detId ).concat( root.dataset?.detId ? [ root.dataset.detId ] : [] );
}

// The ancestor-or-self of the marked element `id`, `depth` levels up, flagged with a data-det-x marker (cleared first).
// Returns its box relative to the element and the nearest marked ancestor, or null past the body.
export function markAncestor( [ id, depth ] ) {
	for ( const old of document.querySelectorAll( '[data-det-x]' ) ) {
		old.removeAttribute( 'data-det-x' );
	}
	const el = document.querySelector( `[data-det-id="${ id }"]` );
	let x = el;
	for ( let i = 0; x && i < depth; i++ ) {
		x = x.parentElement;
	}
	if ( ! x || x === document.body || x === document.documentElement ) {
		return null;
	}
	x.setAttribute( 'data-det-x', '1' );
	const r = x.getBoundingClientRect();
	const e = el.getBoundingClientRect();
	const owner = x.closest( '[data-det-id]' );
	return {
		depth,
		tag: x.tagName.toLowerCase(),
		cls: String( x.className?.baseVal ?? x.className ).split( ' ' ).filter( Boolean ).slice( 0, 2 ).join( '.' ),
		ref: owner ? owner.dataset.detId : null,
		exact: x === owner,
		rel: [ r.left - e.left, r.top - e.top, r.width, r.height ].map( ( n ) => Math.round( n * 10 ) / 10 ),
	};
}

// The paint-relevant own style of one marked element (what a forced :hover on some ancestor could change).
export function readOwn( id ) {
	const el = document.querySelector( `[data-det-id="${ id }"]` );
	if ( ! el ) {
		return null;
	}
	const cs = getComputedStyle( el );
	return [ 'color', 'backgroundColor', 'borderTopColor', 'boxShadow', 'transform', 'translate', 'scale', 'rotate', 'opacity', 'filter', 'textDecorationLine', 'backgroundImage', 'outlineColor' ]
		.reduce( ( o, k ) => ( { ...o, [ k ]: cs[ k ] } ), {} );
}

// The :hover rules of the style sheets that style the marked element `id` once the :hover words are taken out of the
// selector (the rules a forced hover could fire), as selector text; at most four.
export function hoverRulesFor( id ) {
	const el = document.querySelector( `[data-det-id="${ id }"]` );
	const found = [];
	const walk = ( rules ) => {
		for ( const rule of rules ) {
			if ( rule.cssRules && ! rule.selectorText ) {
				walk( rule.cssRules );
			} else if ( rule.selectorText && rule.selectorText.includes( ':hover' ) ) {
				for ( const sel of rule.selectorText.split( /,(?![^(]*\))/ ) ) {
					const plain = sel.replace( /:hover/g, '' ).trim();
					let hit = false;
					try {
						hit = sel.includes( ':hover' ) && plain && el.matches( plain );
					} catch ( e ) {
						hit = false;
					}
					if ( hit && found.length < 4 ) {
						found.push( sel.trim().slice( 0, 150 ) );
					}
				}
			}
		}
	};
	for ( const sheet of document.styleSheets ) {
		try {
			walk( sheet.cssRules );
		} catch ( e ) {
			// A cross-origin sheet cannot be read.
		}
	}
	return el ? found : [];
}

// A viewport point with no marked element under it, to rest the real pointer on (so it hovers nothing that matters).
export function quietSpot() {
	const spots = [ [ innerWidth - 3, innerHeight - 3 ], [ 3, innerHeight - 3 ], [ innerWidth - 3, innerHeight / 2 ], [ 3, innerHeight / 2 ], [ innerWidth / 2, innerHeight - 3 ], [ 1, 1 ] ];
	const clear = ( [ x, y ] ) => {
		for ( let e = document.elementFromPoint( x, y ); e; e = e.parentElement ) {
			if ( e.dataset && e.dataset.detId ) {
				return false;
			}
		}
		return true;
	};
	const hit = spots.find( clear ) || spots[ 0 ];
	return { x: hit[ 0 ], y: hit[ 1 ] };
}
