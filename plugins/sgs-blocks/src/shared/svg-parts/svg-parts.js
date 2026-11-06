/**
 * SGS SVG part animation: animates named parts of an inlined SVG.
 *
 * An element carrying `data-sgs-svg-parts` (a JSON document written by `sgs_svg_parts_data()` in
 * includes/helpers-svg-parts.php) holds an inline `<svg>`. The document lists parts; each part names an element of the
 * SVG by id (or by a CSS selector starting with `.`, `[` or `:`) and says how it behaves:
 *
 * - an entrance: the part starts from an opacity, scale, offset, rotation and/or an undrawn stroke and settles into its
 *   own resting look (`fromOpacity`, `fromScale`, `fromX`, `fromY`, `fromRotate`, `draw`, `duration`, `delay`,
 *   `easing`, `origin`); `eachChild` animates every child of the named element, `stagger` staggers the matches;
 * - a continuous loop: `loopRotate` turns the part by that many degrees every `loopDuration` ms;
 * - a hover: `hoverReplay` plays the entrance again, `hoverRate` runs the loop at that speed for `hoverRateDuration` ms.
 *
 * The document's `trigger` is when the entrance plays: `load`, `visible` (the first time the element is on screen) or
 * `every-visible` (each time it comes on screen, as a drawer logo does when the drawer opens). `hoverCooldown` is the
 * least time between two hover replays. Under `prefers-reduced-motion: reduce` nothing runs and the SVG keeps its
 * resting look.
 *
 * The scoped ids the server gives an inlined SVG (`<instance>-<id>`) are matched by their suffix, so the ids written in
 * the document are the ids of the SVG file itself.
 *
 * @package
 */

const SELECTOR = '[data-sgs-svg-parts]';
const EASINGS = {
	linear: 'linear',
	ease: 'ease',
	'ease-in': 'ease-in',
	'ease-out': 'ease-out',
	'ease-in-out': 'ease-in-out',
	spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
};
const ORIGINS = {
	center: 'center',
	top: 'center top',
	bottom: 'center bottom',
	left: 'left center',
	right: 'right center',
};
const booted = new WeakSet();

/**
 * The document stored on an element, or null when it is not valid JSON with a parts list.
 *
 * @param {Element} el The element carrying `data-sgs-svg-parts`.
 * @return {Object|null} The parsed document.
 */
function readConfig( el ) {
	try {
		const cfg = JSON.parse( el.getAttribute( 'data-sgs-svg-parts' ) );
		return cfg && Array.isArray( cfg.parts ) && cfg.parts.length
			? cfg
			: null;
	} catch ( e ) {
		return null;
	}
}

/**
 * The elements of the SVG a part names.
 *
 * @param {Element} svg    The inline SVG.
 * @param {Object}  part   One part of the document.
 * @param {string}  target The part's `target`.
 * @return {Element[]} The matches, in document order.
 */
function resolveTargets( svg, part, target ) {
	const text = String( target || '' ).trim();
	if ( ! text ) {
		return [];
	}
	let found = [];
	if ( /^[.[:]/.test( text ) ) {
		try {
			found = Array.from( svg.querySelectorAll( text ) );
		} catch ( e ) {
			found = [];
		}
	} else {
		const id = text.replace( /^#/, '' );
		found = Array.from( svg.querySelectorAll( '[id]' ) ).filter(
			( node ) => node.id === id || node.id.endsWith( '-' + id )
		);
	}
	if ( part.eachChild ) {
		found = found.flatMap( ( node ) => Array.from( node.children ) );
	}
	return found;
}

/**
 * The entrance keyframes of a part, or null when the part has no entrance.
 *
 * @param {Object} part One part of the document.
 * @return {Object[]|null} The WAAPI keyframes.
 */
function entranceFrames( part ) {
	const from = {};
	if ( Number.isFinite( part.fromOpacity ) ) {
		from.opacity = part.fromOpacity;
	}
	const transforms = [];
	if ( part.fromX || part.fromY ) {
		transforms.push(
			`translate(${ part.fromX || 0 }px, ${ part.fromY || 0 }px)`
		);
	}
	if ( part.fromRotate ) {
		transforms.push( `rotate(${ part.fromRotate }deg)` );
	}
	if ( Number.isFinite( part.fromScale ) && 1 !== part.fromScale ) {
		transforms.push( `scale(${ part.fromScale })` );
	}
	if ( transforms.length ) {
		from.transform = transforms.join( ' ' );
	}
	if ( part.draw ) {
		return [
			{ ...from, strokeDasharray: 1, strokeDashoffset: 1 },
			{ strokeDasharray: 1, strokeDashoffset: 0 },
		];
	}
	return Object.keys( from ).length ? [ from ] : null;
}

/**
 * Boots one element's parts.
 *
 * @param {Element} root The element carrying `data-sgs-svg-parts`.
 */
function boot( root ) {
	const cfg = readConfig( root );
	const svg = root.querySelector( 'svg' );
	if ( ! cfg || ! svg ) {
		return;
	}
	const resolved = cfg.parts.map( ( part ) => ( {
		part,
		els: resolveTargets( svg, part, part.target ),
	} ) );
	const entrance = new Map();
	const loops = [];

	const prepare = ( { part, els } ) => {
		els.forEach( ( el ) => {
			el.style.transformBox = 'fill-box';
			el.style.transformOrigin = ORIGINS[ part.origin ] || ORIGINS.center;
			if ( part.draw ) {
				el.setAttribute( 'pathLength', '1' );
			}
		} );
	};
	resolved.forEach( prepare );

	const playEntrance = ( onlyHover ) => {
		resolved.forEach( ( { part, els } ) => {
			if ( onlyHover && ! part.hoverReplay ) {
				return;
			}
			const frames = entranceFrames( part );
			if ( ! frames ) {
				return;
			}
			( entrance.get( part ) || [] ).forEach( ( animation ) =>
				animation.cancel()
			);
			entrance.set(
				part,
				els.map( ( el, index ) =>
					el.animate( frames, {
						duration: Math.max( 1, part.duration || 600 ),
						delay:
							( part.delay || 0 ) + index * ( part.stagger || 0 ),
						easing: EASINGS[ part.easing ] || EASINGS[ 'ease-out' ],
						fill: 'backwards',
					} )
				)
			);
		} );
	};

	resolved.forEach( ( { part, els } ) => {
		if ( ! part.loopRotate ) {
			return;
		}
		els.forEach( ( el ) => {
			loops.push( {
				part,
				animation: el.animate(
					[
						{ rotate: '0deg' },
						{ rotate: `${ part.loopRotate }deg` },
					],
					{
						duration: Math.max( 1, part.loopDuration || 10000 ),
						iterations: Infinity,
						easing: 'linear',
					}
				),
			} );
		} );
	} );

	const trigger = cfg.trigger || 'visible';
	if ( 'load' === trigger || ! ( 'IntersectionObserver' in window ) ) {
		playEntrance( false );
	} else {
		const observer = new window.IntersectionObserver( ( records ) => {
			records.forEach( ( record ) => {
				if ( ! record.isIntersecting ) {
					return;
				}
				playEntrance( false );
				if ( 'visible' === trigger ) {
					observer.disconnect();
				}
			} );
		} );
		observer.observe( root );
	}

	const cooldown = Number.isFinite( cfg.hoverCooldown )
		? cfg.hoverCooldown
		: 1400;
	let lastHover = -Infinity;
	root.addEventListener( 'mouseenter', () => {
		const now = window.performance.now();
		if ( now - lastHover < cooldown ) {
			return;
		}
		lastHover = now;
		playEntrance( true );
		loops.forEach( ( { part, animation } ) => {
			if ( ! ( part.hoverRate > 1 ) ) {
				return;
			}
			animation.updatePlaybackRate( part.hoverRate );
			window.setTimeout(
				() => animation.updatePlaybackRate( 1 ),
				part.hoverRateDuration || 900
			);
		} );
	} );
}

/**
 * Boots every element carrying `data-sgs-svg-parts` that is not booted yet. Does nothing under reduced motion.
 *
 * @param {Document|Element} scope Where to look; the document by default.
 */
export function bootSvgParts( scope = document ) {
	if (
		window.matchMedia &&
		window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches
	) {
		return;
	}
	scope.querySelectorAll( SELECTOR ).forEach( ( root ) => {
		if ( booted.has( root ) ) {
			return;
		}
		booted.add( root );
		boot( root );
	} );
}
