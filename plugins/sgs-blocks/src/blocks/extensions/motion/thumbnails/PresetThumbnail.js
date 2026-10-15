/**
 * A small looping demo of one Hover state or Entrance preset (Spec 38A §11, FR-38A-28). The demo's channel and direction
 * are read from the preset row's own values (`thumbnailSpec`), never from a per-preset table: a new preset row with a
 * `translateY`, `scale`, `rotate`, `followPointer`, `indent`, `blur` or `clip` value gets the matching demo for free.
 * The motion is pure CSS (`assets/css/motion-thumbnails.css`, keyed on the classes below) and is static under
 * `prefers-reduced-motion`; the markup carries no inline style.
 *
 * Both panels read the same direction rule: the box moves between its resting position and the preset's "away" state
 * (a Hover state's peak, an Entrance's start). The away state's sign is the sign of the channel's value, so a lift
 * (`translateY` negative) shifts up and an entrance that starts below (`translateY` positive) shifts down.
 *
 * @package
 */

import { presetBySlug } from '../layers/stamp';

/** Channels in the order the demo picks one: the first channel a preset carries is the one drawn. */
const MOVEMENTS = [
	'translateY',
	'translateX',
	'indent',
	'followPointer',
	'scale',
	'rotate',
	'blur',
	'clip',
];

/**
 * The sign of a preset value: a number's own sign, `-token:…` negative, any other string positive.
 *
 * @param {unknown} value A preset value.
 * @return {number} -1, 0 or 1.
 */
export function signOf( value ) {
	if ( typeof value === 'number' ) {
		return Math.sign( value );
	}
	if ( typeof value === 'string' ) {
		return value.startsWith( '-' ) ? -1 : 1;
	}
	return 0;
}

/**
 * Whether a channel value is away from rest: scale rests at 1, every other channel at 0.
 *
 * @param {string}  key   The channel.
 * @param {unknown} value Its value.
 * @return {boolean} True when the value moves the channel.
 */
function moves( key, value ) {
	return key === 'scale'
		? typeof value === 'number' && value !== 1
		: signOf( value ) !== 0;
}

/**
 * The "away" state of a preset: for each channel, the first non-zero value among the entrance's `from`, its `to` and its
 * keyframes (a hover state's own values count as the away state). Opacity is kept apart, because its resting value is 1.
 *
 * @param {Object} values The preset row's `values`.
 * @param {string} panel  `hover` or `entrance`.
 * @return {{away: Object, fades: boolean, fadesOut: boolean}} The away values, whether opacity moves, and whether an
 *                                                              entrance ends with less opacity than it starts with.
 */
function awayState( values, panel ) {
	const frames =
		panel === 'entrance'
			? [ values.from, values.to, ...( values.keyframes || [] ) ]
			: [ values ];
	const away = {};
	let fades = false;
	frames.filter( Boolean ).forEach( ( frame ) => {
		if ( typeof frame.opacity === 'number' && frame.opacity !== 1 ) {
			fades = true;
		}
		MOVEMENTS.forEach( ( key ) => {
			if (
				away[ key ] === undefined &&
				frame[ key ] !== undefined &&
				moves( key, frame[ key ] )
			) {
				away[ key ] = frame[ key ];
			}
		} );
	} );
	if ( panel === 'hover' && values.followPointer === true ) {
		away.followPointer = true;
	}
	const from = panel === 'entrance' ? values.from?.opacity : undefined;
	const to = panel === 'entrance' ? values.to?.opacity : undefined;
	const fadesOut =
		fades &&
		typeof from === 'number' &&
		typeof to === 'number' &&
		to < from;
	return { away, fades, fadesOut };
}

/**
 * The demo a preset row draws.
 *
 * @param {Object|null} row A preset row (`panel`, `values`).
 * @return {{kind: string, movement: string, fades: boolean, fadesOut: boolean, animated: boolean}} `kind` is the panel,
 *         `movement` the modifier of the channel and direction (`still` when nothing moves), `fadesOut` an entrance that
 *         leaves with less opacity than it starts with, `animated` whether anything moves or fades.
 */
export function thumbnailSpec( row ) {
	const panel = row?.panel === 'entrance' ? 'entrance' : 'hover';
	const { away, fades, fadesOut } = awayState( row?.values || {}, panel );
	const key = MOVEMENTS.find( ( name ) => away[ name ] !== undefined );
	let movement = 'still';
	if ( key === 'translateY' ) {
		movement = signOf( away.translateY ) < 0 ? 'shift-up' : 'shift-down';
	} else if ( key === 'translateX' ) {
		movement = signOf( away.translateX ) < 0 ? 'shift-left' : 'shift-right';
	} else if ( key === 'indent' ) {
		movement = 'shift-right';
	} else if ( key === 'followPointer' ) {
		movement = 'tilt';
	} else if ( key === 'scale' ) {
		movement = away.scale > 1 ? 'grow' : 'shrink';
	} else if ( key === 'rotate' ) {
		movement = signOf( away.rotate ) < 0 ? 'turn-ccw' : 'turn-cw';
	} else if ( key === 'blur' ) {
		movement = 'blur';
	} else if ( key === 'clip' ) {
		movement = 'wipe';
	}
	return {
		kind: panel,
		movement,
		fades,
		fadesOut,
		animated: movement !== 'still' || fades,
	};
}

/**
 * The class list for a preset row's thumbnail.
 *
 * @param {Object|null} row A preset row.
 * @return {string} The class attribute.
 */
export function thumbnailClasses( row ) {
	const { kind, movement, fades, fadesOut, animated } = thumbnailSpec( row );
	return [
		'sgs-motion-thumb',
		`sgs-motion-thumb--${ kind }`,
		movement === 'still' ? '' : `sgs-motion-thumb--${ movement }`,
		animated ? '' : 'sgs-motion-thumb--still',
		fades ? 'sgs-motion-thumb--fade' : '',
		fadesOut ? 'sgs-motion-thumb--fade-out' : '',
	]
		.filter( Boolean )
		.join( ' ' );
}

/**
 * @param {Object}      props
 * @param {string}      [props.slug] The preset slug (looked up in the preset file).
 * @param {Object|null} [props.row]  A preset row, when the caller already holds it.
 * @return {Element} The decorative demo (hidden from assistive technology; the choice beside it carries the name).
 */
export default function PresetThumbnail( { slug, row } ) {
	const preset = row || presetBySlug( slug );
	return (
		<span className={ thumbnailClasses( preset ) } aria-hidden="true">
			<span className="sgs-motion-thumb__box" />
		</span>
	);
}
