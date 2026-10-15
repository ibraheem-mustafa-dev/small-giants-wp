/**
 * From and to property rows for the Tier G scroll effects (Spec 38A, FR-38A-22).
 *
 * `scrub` and `pin-scrub` receive their animated properties as a JSON list on
 * `data-sgs-fx-scrub-rows` / `data-sgs-fx-pin-scrub-rows`: one
 * `{ property, from, to }` object per row, the values typed by the property
 * (`schemas/motion.schema.json::$defs.propertyRow`). This module turns that list
 * into the two variable objects a `gsap.fromTo()` call takes. It reads nothing
 * from the document except a palette custom property for a colour row, and it
 * never writes a style: GSAP owns every write.
 *
 * A row whose property is unknown, or whose value cannot be expressed in a form
 * GSAP tweens, is dropped. A list with no usable row returns `null`, so the
 * caller keeps its own default tween.
 *
 * @package
 */

const LENGTH = /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|em|rem|%|vh|vw|svh|dvh)$/;
const ANGLE = /^(-?(?:\d+(?:\.\d+)?|\.\d+))(deg|turn)$/;
const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const SLUG = /^[a-z0-9][a-z0-9-]*$/;

/**
 * The value a row end takes when the row leaves it out: the property's rest
 * state. Colour and background position have no rest state, so a row missing
 * either end is dropped.
 *
 * @type {Object<string, number>}
 */
const REST = {
	opacity: 1,
	x: 0,
	y: 0,
	scale: 1,
	rotate: 0,
	blur: 0,
	clip: 0,
};

/**
 * A number from a number or a numeric string.
 *
 * @param {*} value Candidate.
 * @return {number|null} The number, or null.
 */
function toNumber( value ) {
	if ( 'number' === typeof value ) {
		return Number.isFinite( value ) ? value : null;
	}
	if ( 'string' === typeof value && '' !== value.trim() ) {
		const parsed = Number( value );
		return Number.isFinite( parsed ) ? parsed : null;
	}
	return null;
}

/**
 * Resolve a `token:<group>.<name>` distance (or its negation, `-token:...`) to
 * pixels, the way `provider.js::resolveEase` resolves an easing token: the token
 * names the theme custom property `--wp--custom--<group>--<name>`, read from the
 * document element. `px` is used as is, `rem` and `em` are multiplied by the
 * root font size.
 *
 * @param {*} value A distance token.
 * @return {number|null} Pixels, or null when the value is not a token or its
 *                       property is missing or not a plain length.
 */
export function resolveDistance( value ) {
	const token =
		'string' === typeof value
			? /^(-?)token:([a-z][a-z0-9-]*)\.([a-z][a-z0-9-]*)$/.exec(
					value.trim()
			  )
			: null;
	if ( ! token || ! document.documentElement ) {
		return null;
	}
	const root = document.documentElement;
	const styles = window.getComputedStyle( root );
	const raw = styles
		.getPropertyValue( `--wp--custom--${ token[ 2 ] }--${ token[ 3 ] }` )
		.trim();
	const length = /^(-?(?:\d+(?:\.\d+)?|\.\d+))(px|rem|em)$/.exec( raw );
	if ( ! length ) {
		if ( 'production' !== process.env.NODE_ENV ) {
			// eslint-disable-next-line no-console
			console.warn(
				`[sgs/scroll-rows] The distance token ${ value } has no pixel value, so its row is dropped.`
			);
		}
		return null;
	}
	const rootSize = parseFloat( styles.fontSize ) || 16;
	const pixels =
		Number( length[ 1 ] ) * ( 'px' === length[ 2 ] ? 1 : rootSize );
	return '-' === token[ 1 ] ? -pixels : pixels;
}

/**
 * A length GSAP accepts: a number (pixels), a string with a CSS unit, or a
 * distance token resolved to pixels.
 *
 * @param {*} value Candidate.
 * @return {number|string|null} The length, or null.
 */
function toLength( value ) {
	const number = toNumber( value );
	if ( null !== number ) {
		return number;
	}
	if ( 'string' === typeof value && value.includes( 'token:' ) ) {
		return resolveDistance( value );
	}
	return 'string' === typeof value && LENGTH.test( value.trim() )
		? value.trim()
		: null;
}

/**
 * A length as CSS text, for a function argument.
 *
 * @param {number|string} length A length from `toLength`.
 * @return {string} CSS text.
 */
function lengthText( length ) {
	return 'number' === typeof length ? `${ length }px` : length;
}

/**
 * An angle in degrees from a number, `Ndeg` or `Nturn`.
 *
 * @param {*} value Candidate.
 * @return {number|null} Degrees, or null.
 */
function toDegrees( value ) {
	const number = toNumber( value );
	if ( null !== number ) {
		return number;
	}
	const match = 'string' === typeof value ? ANGLE.exec( value.trim() ) : null;
	if ( ! match ) {
		return null;
	}
	return 'turn' === match[ 2 ]
		? Number( match[ 1 ] ) * 360
		: Number( match[ 1 ] );
}

/**
 * A colour as CSS text from a palette slug (read from the theme's
 * `--wp--preset--color--<slug>` custom property) or a hex value.
 *
 * @param {*} value Candidate.
 * @return {string|null} A colour GSAP can tween, or null.
 */
function toColour( value ) {
	if ( 'string' !== typeof value ) {
		return null;
	}
	const text = value.trim();
	if ( HEX.test( text ) ) {
		return text;
	}
	if ( ! SLUG.test( text ) || ! document.documentElement ) {
		return null;
	}
	const resolved = window
		.getComputedStyle( document.documentElement )
		.getPropertyValue( `--wp--preset--color--${ text }` )
		.trim();
	return '' === resolved ? null : resolved;
}

/**
 * One row end as `[ gsapProperty, gsapValue ]`, or null when it has no form.
 *
 * @param {string} property The row's property.
 * @param {*}      value    The row end (already defaulted to rest where it has one).
 * @return {Array|null} The GSAP property and value.
 */
function toTween( property, value ) {
	switch ( property ) {
		case 'opacity':
		case 'scale': {
			const number = toNumber( value );
			return null === number ? null : [ property, number ];
		}
		case 'x':
		case 'y': {
			const length = toLength( value );
			return null === length ? null : [ property, length ];
		}
		case 'rotate': {
			const degrees = toDegrees( value );
			return null === degrees ? null : [ 'rotation', degrees ];
		}
		case 'blur': {
			const length = toLength( value );
			return null === length
				? null
				: [ 'filter', `blur(${ lengthText( length ) })` ];
		}
		case 'clip': {
			const amount = toNumber( value );
			return null === amount
				? null
				: [ 'clipPath', `inset(${ amount }%)` ];
		}
		case 'colour': {
			const colour = toColour( value );
			return null === colour ? null : [ 'color', colour ];
		}
		case 'backgroundPosition': {
			const amount = toNumber( value );
			return null === amount
				? null
				: [ 'backgroundPositionY', `${ amount }%` ];
		}
		default:
			return null;
	}
}

/**
 * The rows stored on an element's rows attribute.
 *
 * @param {HTMLElement} el   Element carrying the attribute.
 * @param {string}      attr Attribute name.
 * @return {Object[]} The rows (objects with a `property`), empty when unset or malformed.
 */
export function readRows( el, attr ) {
	const raw = el.getAttribute( attr );
	if ( null === raw || '' === raw.trim() ) {
		return [];
	}
	try {
		const rows = JSON.parse( raw );
		return Array.isArray( rows )
			? rows.filter(
					( row ) =>
						row &&
						'object' === typeof row &&
						'string' === typeof row.property
			  )
			: [];
	} catch ( err ) {
		return [];
	}
}

/**
 * The `gsap.fromTo()` variable objects for a rows attribute.
 *
 * @param {HTMLElement} el   Element carrying the attribute.
 * @param {string}      attr Attribute name.
 * @return {{from: Object, to: Object}|null} Variables, or null when no row is usable.
 */
export function readRowVars( el, attr ) {
	const from = {};
	const to = {};
	readRows( el, attr ).forEach( ( row ) => {
		const rest = REST[ row.property ];
		const start = toTween(
			row.property,
			undefined === row.from ? rest : row.from
		);
		const end = toTween(
			row.property,
			undefined === row.to ? rest : row.to
		);
		if ( start && end ) {
			from[ start[ 0 ] ] = start[ 1 ];
			to[ end[ 0 ] ] = end[ 1 ];
		}
	} );
	return Object.keys( to ).length > 0 ? { from, to } : null;
}

/**
 * A scroll parameter that can differ per device: the element's computed custom
 * property when it is non-empty (the per-device value), else the data attribute
 * (the desktop value, also the flat legacy path), else null.
 *
 * @param {HTMLElement}      el             Element carrying the parameter.
 * @param {string|undefined} customProperty Custom property name, if the parameter has one.
 * @param {string|undefined} attr           Data attribute name, if the parameter has one.
 * @return {string|null} The trimmed value, or null when neither is set.
 */
export function readResponsive( el, customProperty, attr ) {
	if ( customProperty ) {
		const custom = window
			.getComputedStyle( el )
			.getPropertyValue( customProperty )
			.trim();
		if ( '' !== custom ) {
			return custom;
		}
	}
	const raw = attr ? el.getAttribute( attr ) : null;
	return raw && raw.trim() ? raw.trim() : null;
}

/**
 * Seconds from a number, `Ns` or `Nms`.
 *
 * @param {string|null} raw Value text.
 * @return {number} Seconds, or NaN when unreadable.
 */
function toSeconds( raw ) {
	const match =
		null === raw
			? null
			: /^(-?(?:\d+(?:\.\d+)?|\.\d+))(ms|s)?$/.exec( raw );
	if ( ! match ) {
		return NaN;
	}
	return 'ms' === match[ 2 ] ? Number( match[ 1 ] ) / 1000 : Number( match[ 1 ] );
}

/**
 * Seconds of scroll smoothing as ScrollTrigger's `scrub` value: a positive
 * number of seconds, or `true` (locked to the scrollbar) for 0. The per-device
 * custom property wins over the attribute; an unset or unreadable value takes
 * the fallback.
 *
 * @param {HTMLElement}      el             Element carrying the parameter.
 * @param {string}           attr           Attribute name.
 * @param {string|undefined} customProperty Custom property name.
 * @param {number}           fallback       Seconds when unset.
 * @return {number|boolean} The `scrub` value.
 */
export function readSmoothing( el, attr, customProperty, fallback = 1 ) {
	const parsed = toSeconds( readResponsive( el, customProperty, attr ) );
	const seconds = Number.isFinite( parsed ) ? parsed : fallback;
	return seconds > 0 ? seconds : true;
}

const TIER_QUERIES = [ '(max-width: 1023px)', '(max-width: 767px)' ];

/**
 * Build an effect now, and rebuild it whenever the breakpoint tier changes
 * (the tablet or mobile query starts or stops matching), so per-device scroll
 * parameters are re-read. The previous build is torn down first, so one
 * ScrollTrigger exists at a time.
 *
 * @param {Function} build Builds the effect and returns its cleanup (or undefined).
 * @return {Function} Cleanup that detaches the listeners and tears the build down.
 */
export function rebuildOnTierChange( build ) {
	let teardown = build();
	const queries =
		'function' === typeof window.matchMedia
			? TIER_QUERIES.map( ( query ) => window.matchMedia( query ) )
			: [];
	const signature = () => queries.map( ( query ) => query.matches ).join();
	let tier = signature();
	const rebuild = () => {
		// Both queries flip when a resize jumps two tiers: rebuild once.
		if ( signature() === tier ) {
			return;
		}
		tier = signature();
		if ( 'function' === typeof teardown ) {
			teardown();
		}
		teardown = build();
	};
	queries.forEach( ( query ) => query.addEventListener( 'change', rebuild ) );
	return () => {
		queries.forEach( ( query ) =>
			query.removeEventListener( 'change', rebuild )
		);
		if ( 'function' === typeof teardown ) {
			teardown();
		}
		teardown = undefined;
	};
}

/**
 * A number from a `css`-unit attribute (`40`, `40px`), in pixels. A unit other
 * than `px` has no pixel value outside the page and reads as unset.
 *
 * @param {HTMLElement} el   Element carrying the attribute.
 * @param {string}      attr Attribute name.
 * @return {number|null} Pixels, or null when unset or not in pixels.
 */
export function readPixels( el, attr ) {
	const raw = el.getAttribute( attr );
	if ( null === raw ) {
		return null;
	}
	const match = /^\s*(-?(?:\d+(?:\.\d+)?|\.\d+))(?:px)?\s*$/.exec( raw );
	return match ? Number( match[ 1 ] ) : null;
}
