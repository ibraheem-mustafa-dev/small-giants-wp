/**
 * SVG part animation: the curves and keyframes a part's stored fields describe (used by svg-parts.js).
 *
 * @package
 */

// Named curves (the nav vocabulary of src/components/motion/easing-master-list.js). `default` and `emphasised` are
// theme tokens read from the site's `--wp--custom--easing--*` custom properties; the second value is their fallback.
const EASINGS = {
	linear: 'linear',
	ease: 'ease',
	'ease-in': 'ease-in',
	'ease-out': 'ease-out',
	'ease-in-out': 'ease-in-out',
	spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
	standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
	drafts: 'cubic-bezier(0.16, 0.84, 0.32, 1)',
	'quart-out': 'cubic-bezier(0.165, 0.84, 0.44, 1)',
};
const EASING_TOKENS = {
	default: 'cubic-bezier(0.4, 0, 0.2, 1)',
	emphasised: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
};
const BEZIER =
	/^cubic-bezier\(\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*\)$/;
// Wipe directions: the clip the part starts from, revealing towards the named edge.
const CLIPS = {
	up: 'inset(100% 0 0 0)',
	down: 'inset(0 0 100% 0)',
	left: 'inset(0 0 0 100%)',
	right: 'inset(0 100% 0 0)',
};
const NO_CLIP = 'inset(0 0 0 0)';

/**
 * A valid `cubic-bezier()` literal, or '' when the text is anything else (so free text never reaches the animation).
 *
 * @param {string} text Candidate curve.
 * @return {string} The curve, or ''.
 */
export function validBezier( text ) {
	const found = BEZIER.exec( String( text || '' ) );
	if ( ! found ) {
		return '';
	}
	const [ x1, y1, x2, y2 ] = found.slice( 1 ).map( Number );
	return x1 >= 0 && x1 <= 1 && x2 >= 0 && x2 <= 1
		? `cubic-bezier(${ x1 }, ${ y1 }, ${ x2 }, ${ y2 })`
		: '';
}

/**
 * The CSS easing for a named curve: a keyword, a named curve, a theme token or a custom `cubic-bezier()`.
 *
 * @param {Element} el     An element of the SVG (token values are read from its computed style).
 * @param {string}  name   The stored name.
 * @param {string}  custom The stored custom curve, read only for `custom`.
 * @return {string} A CSS easing function; `ease-out` for an unknown name.
 */
export function easingFor( el, name, custom ) {
	if ( EASINGS[ name ] ) {
		return EASINGS[ name ];
	}
	if ( 'custom' === name ) {
		return validBezier( custom ) || EASINGS[ 'ease-out' ];
	}
	if ( EASING_TOKENS[ name ] ) {
		const token = window
			.getComputedStyle( el )
			.getPropertyValue( '--wp--custom--easing--' + name );
		return validBezier( token ) || EASING_TOKENS[ name ];
	}
	return EASINGS[ 'ease-out' ];
}

/**
 * Whether a part ends in a look of its own (kept after the entrance, applied at once under reduced motion).
 *
 * @param {Object} part One part of the document.
 * @return {boolean} True when `toScale` or `toFill` is set.
 */
export function hasEndLook( part ) {
	return Number.isFinite( part.toScale ) || !! part.toFill;
}

/**
 * Shows a part's end look without animating: the final state under reduced motion.
 *
 * @param {Element[]} els  The part's elements.
 * @param {Object}    part One part of the document.
 */
export function applyEndLook( els, part ) {
	els.forEach( ( el ) => {
		if ( Number.isFinite( part.toScale ) ) {
			el.style.scale = String( part.toScale );
		}
		if ( part.toFill ) {
			el.style.fill = part.toFill;
		}
		if ( part.draw ) {
			el.style.strokeDashoffset = '0';
		}
	} );
}

/**
 * The entrance keyframes of a part, or null when the part has no entrance.
 *
 * @param {Object} part One part of the document.
 * @return {Object[]|null} The WAAPI keyframes.
 */
export function entranceFrames( part ) {
	const from = {};
	if ( Number.isFinite( part.fromOpacity ) ) {
		from.opacity = part.fromOpacity;
	}
	// The individual `translate`, `rotate` and `scale` properties compose with the group's own `transform`
	// attribute; a `transform` keyframe would replace it.
	if ( part.fromX || part.fromY ) {
		from.translate = `${ part.fromX || 0 }px ${ part.fromY || 0 }px`;
	}
	if ( part.fromRotate ) {
		from.rotate = `${ part.fromRotate }deg`;
	}
	if ( Number.isFinite( part.fromScale ) && 1 !== part.fromScale ) {
		from.scale = String( part.fromScale );
	}
	if ( CLIPS[ part.fromClip ] ) {
		from.clipPath = CLIPS[ part.fromClip ];
	}
	if ( part.fromFill ) {
		from.fill = part.fromFill;
	}
	if ( part.draw ) {
		return [
			{ ...from, strokeDasharray: 1, strokeDashoffset: 1 },
			{ strokeDasharray: 1, strokeDashoffset: 0 },
		];
	}
	if ( hasEndLook( part ) || Number.isFinite( part.holdUntil ) ) {
		return stagedFrames( part, from );
	}
	// A single keyframe is the END state of a WAAPI animation; the second keyframe makes `from` the start and the
	// element's own look the end.
	if ( ! Object.keys( from ).length ) {
		return null;
	}
	// A clip wipe ends on an explicit shape: a shape does not interpolate to `none`.
	return [ from, from.clipPath ? { clipPath: NO_CLIP } : {} ];
}

/**
 * The keyframes of a staged entrance: the start look, then (at `settleAt`) the resting look, held until `holdUntil`,
 * then the end look (`toScale`, `toFill`) at the end.
 *
 * @param {Object} part One part of the document.
 * @param {Object} from The start look.
 * @return {Object[]} The WAAPI keyframes, offsets ascending.
 */
export function stagedFrames( part, from ) {
	const rest = {};
	if ( 'opacity' in from ) {
		rest.opacity = 1;
	}
	if ( 'translate' in from ) {
		rest.translate = '0px 0px';
	}
	if ( 'rotate' in from ) {
		rest.rotate = '0deg';
	}
	if ( 'scale' in from ) {
		rest.scale = '1';
	}
	if ( 'clipPath' in from ) {
		rest.clipPath = NO_CLIP;
	}
	if ( 'fill' in from ) {
		rest.fill = from.fill;
	}
	const end = { ...rest };
	if ( Number.isFinite( part.toScale ) ) {
		end.scale = String( part.toScale );
	}
	if ( part.toFill ) {
		end.fill = part.toFill;
	}
	const frames = [ { ...from, offset: 0 } ];
	[ part.settleAt, part.holdUntil ].forEach( ( offset ) => {
		const last = frames[ frames.length - 1 ].offset;
		if ( Number.isFinite( offset ) && offset > last && offset < 1 ) {
			frames.push( { ...rest, offset } );
		}
	} );
	frames.push( { ...end, offset: 1 } );
	return frames;
}

/**
 * The hover bob of a part: out to the peak look and back, or null when the part has none.
 *
 * @param {Object} part One part of the document.
 * @return {Object[]|null} The WAAPI keyframes.
 */
export function hoverFrames( part ) {
	const peak = {};
	if ( Number.isFinite( part.hoverScale ) && 1 !== part.hoverScale ) {
		peak.scale = String( part.hoverScale );
	}
	if ( part.hoverX || part.hoverY ) {
		peak.translate = `${ part.hoverX || 0 }px ${ part.hoverY || 0 }px`;
	}
	if ( part.hoverRotate ) {
		peak.rotate = `${ part.hoverRotate }deg`;
	}
	return Object.keys( peak ).length
		? [ {}, { ...peak, offset: 0.5 }, {} ]
		: null;
}
