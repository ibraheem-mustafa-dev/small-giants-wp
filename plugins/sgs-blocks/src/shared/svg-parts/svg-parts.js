/**
 * SGS SVG part animation: animates named parts of an inlined SVG.
 *
 * An element carrying `data-sgs-svg-parts` (a JSON document written by `sgs_svg_parts_data()` in
 * includes/helpers-svg-parts.php) holds an inline `<svg>`. The document lists parts; each part names an element of the
 * SVG by id (or by a CSS selector starting with `.`, `[` or `:`) and says how it behaves:
 *
 * - an entrance: the part starts from an opacity, scale, offset, rotation, colour, clip wipe and/or an undrawn stroke and
 *   settles into its own resting look (`fromOpacity`, `fromScale`, `fromX`, `fromY`, `fromRotate`, `fromFill`, `fromClip`,
 *   `draw`, `duration`, `delay`, `easing`, `easingCustom`, `origin`); `eachChild` animates every child of the named
 *   element, `stagger` staggers the matches. A staged entrance adds `settleAt` (offset where the resting look is reached),
 *   `holdUntil` (offset where it leaves that look) and the end look `toScale` / `toFill`, which stays after the entrance
 *   and is applied at once under reduced motion; `copyShapeFrom` copies the path data of another element into a matching
 *   element that has none;
 * - a continuous loop: `loopRotate` turns the part by that many degrees every `loopDuration` ms;
 * - a hover: `hoverReplay` plays the entrance again, `hoverRate` runs the loop at that speed for `hoverRateDuration` ms
 *   (0 or unset: for as long as the element is hovered or a finger is held on it),
 *   and `hoverScale` / `hoverX` / `hoverY` / `hoverRotate` play one bob (out and back over `hoverDuration`, each match
 *   `hoverStagger` later than the last, with `hoverEasing` / `hoverEasingCustom`).
 *
 * The document's `trigger` is when the entrance plays: `load`, `visible` (the first time the element is on screen) or
 * `every-visible` (each time it comes on screen, as a drawer logo does when the drawer opens). `hoverCooldown` is the
 * least time between two hover replays. Under `prefers-reduced-motion: reduce` nothing animates: the SVG shows its resting
 * look, or each part's end look where it has one.
 *
 * The scoped ids the server gives an inlined SVG (`<instance>-<id>`) are matched by their suffix, so the ids written in
 * the document are the ids of the SVG file itself.
 *
 * @package
 */

import { isTouchInput, prefersReducedMotion } from '../effects/motion-utils';
import {
	applyEndLook,
	easingFor,
	entranceFrames,
	hasEndLook,
	hoverFrames,
} from './frames';

const SELECTOR = '[data-sgs-svg-parts]';
const BOOTED_ATTR = 'data-sgs-svg-parts-booted';
const ARMED_ATTR = 'data-sgs-svg-armed';
const ORIGINS = {
	center: 'center',
	top: 'center top',
	bottom: 'center bottom',
	left: 'left center',
	right: 'right center',
};

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
 * Copies the path data of `source` into every element that has none (a glow or highlight layer of a drawn line).
 *
 * @param {Element}   svg    The inline SVG.
 * @param {Element[]} els    The part's elements.
 * @param {string}    source Id of the element to copy from.
 */
function copyShape( svg, els, source ) {
	const from = resolveTargets( svg, {}, source )[ 0 ];
	const d = from && from.getAttribute( 'd' );
	if ( ! d ) {
		return;
	}
	els.forEach( ( el ) => {
		if ( ! el.getAttribute( 'd' ) ) {
			el.setAttribute( 'd', d );
		}
	} );
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
			// A pivot on an element that carries its own `transform` attribute would shift that matrix, so only
			// an element without one gets the fill-box pivot.
			if ( ! el.hasAttribute( 'transform' ) ) {
				el.style.transformBox = 'fill-box';
				el.style.transformOrigin =
					ORIGINS[ part.origin ] || ORIGINS.center;
			}
			if ( part.draw ) {
				el.setAttribute( 'pathLength', '1' );
			}
		} );
		if ( part.copyShapeFrom ) {
			copyShape( svg, els, part.copyShapeFrom );
		}
	};
	resolved.forEach( prepare );

	const playEntrance = ( onlyHover ) => {
		// The server holds a gated SVG hidden until this attribute is set, in the same tick the from-states apply.
		root.setAttribute( ARMED_ATTR, '' );
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
						easing: easingFor( el, part.easing, part.easingCustom ),
						fill:
							part.draw || hasEndLook( part )
								? 'both'
								: 'backwards',
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

	const playHover = () => {
		resolved.forEach( ( { part, els } ) => {
			const frames = hoverFrames( part );
			if ( ! frames ) {
				return;
			}
			els.forEach( ( el, index ) =>
				el.animate( frames, {
					duration: Math.max( 1, part.hoverDuration || 600 ),
					delay: index * ( part.hoverStagger || 0 ),
					easing: easingFor(
						el,
						part.hoverEasing,
						part.hoverEasingCustom
					),
				} )
			);
		} );
	};

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
	// "Desktop only" (`data-sgs-touch-hover="desktop"` on <html>) turns hover effects off while the last pointer was
	// a touch, so a tap's emulated mouseenter does not replay; reduced motion is read live.
	const hoverOff = ( touch ) =>
		prefersReducedMotion() ||
		( touch &&
			'desktop' ===
				document.documentElement.getAttribute( 'data-sgs-touch-hover' ) );
	root.addEventListener( 'mouseenter', () => {
		if ( hoverOff( isTouchInput() ) ) {
			return;
		}
		const now = window.performance.now();
		if ( now - lastHover < cooldown ) {
			return;
		}
		lastHover = now;
		playEntrance( true );
		playHover();
	} );

	// The loop speed-up: `hoverRateDuration` above 0 is a burst of that many ms; 0 or unset holds the speed for as
	// long as the pointer is over the element or a finger is held on it (a touch fires pointerleave on release, and
	// on pointercancel when the gesture turns into a scroll or the long-press menu).
	const rated = loops.filter( ( { part } ) => part.hoverRate > 1 );
	if ( ! rated.length ) {
		return;
	}
	const rateTimers = new Map();
	root.addEventListener( 'pointerenter', ( event ) => {
		if ( hoverOff( 'touch' === event.pointerType ) ) {
			return;
		}
		rated.forEach( ( { part, animation } ) => {
			animation.updatePlaybackRate( part.hoverRate );
			window.clearTimeout( rateTimers.get( animation ) );
			if ( part.hoverRateDuration > 0 ) {
				rateTimers.set(
					animation,
					window.setTimeout(
						() => animation.updatePlaybackRate( 1 ),
						part.hoverRateDuration
					)
				);
			}
		} );
	} );
	root.addEventListener( 'pointerleave', () => {
		rated.forEach( ( { part, animation } ) => {
			if ( ! ( part.hoverRateDuration > 0 ) ) {
				animation.updatePlaybackRate( 1 );
			}
		} );
	} );
}

/**
 * Reduced motion: shows each part's end look and copies shared path data, with no animation.
 *
 * @param {Element} root The element carrying `data-sgs-svg-parts`.
 */
function settle( root ) {
	const cfg = readConfig( root );
	const svg = root.querySelector( 'svg' );
	if ( ! cfg || ! svg ) {
		return;
	}
	cfg.parts.forEach( ( part ) => {
		const els = resolveTargets( svg, part, part.target );
		if ( part.copyShapeFrom ) {
			copyShape( svg, els, part.copyShapeFrom );
		}
		applyEndLook( els, part );
	} );
}

/**
 * Boots every element carrying `data-sgs-svg-parts` that is not booted yet. Under reduced motion it only shows each part's end look.
 *
 * @param {Document|Element} scope Where to look; the document by default.
 */
export function bootSvgParts( scope = document ) {
	const reduced =
		window.matchMedia &&
		window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
	scope.querySelectorAll( SELECTOR ).forEach( ( root ) => {
		// Each block's view script bundles its own copy of this module, so the flag lives on the element.
		if ( root.hasAttribute( BOOTED_ATTR ) ) {
			return;
		}
		root.setAttribute( BOOTED_ATTR, '' );
		if ( reduced ) {
			settle( root );
			return;
		}
		boot( root );
	} );
}
