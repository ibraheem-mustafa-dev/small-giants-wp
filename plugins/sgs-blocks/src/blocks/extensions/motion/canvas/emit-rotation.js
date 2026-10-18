/**
 * The hover state's rest and hover pairs (the rotate angles and the grayscale), Follow pointer's settle timing and a multi-keyframe entrance's frames for the
 * editor-canvas emitter (Spec 38A §9, §10): the JS twin of `includes/motion/class-sgs-motion-rotation.php` and
 * `includes/motion/class-sgs-motion-keyframes.php`. Field keys, owner properties and channels come from the schema
 * extract through `motion-schema.js`.
 *
 * @package SGS\Blocks
 */

import {
	channelRows,
	fields,
	isNumber,
	ME_PREFIX,
	MH_PREFIX,
	ownerProperties,
	ownerWrites,
	propertyChannels,
	valueCss,
	tokenOr,
} from './motion-schema';

/** Hover field => its rest field: the three rotate angles and the grayscale amount (Grayscale to colour). */
export const PAIRS = Object.freeze( {
	rotate: 'restRotate',
	rotateX: 'restRotateX',
	rotateY: 'restRotateY',
	grayscale: 'restGrayscale',
} );

const FOLLOW = 'followPointer';
const FOLLOW_DURATION = 'resetDuration';
const FOLLOW_EASING = 'resetEasing';
const DEF = 'HoverStateValues';

/**
 * Whether a field key is one of the rest and hover pair fields (a rotate angle or the grayscale, hover or rest).
 *
 * @param {string} key Field key.
 * @return {boolean} True for an angle key.
 */
export function isAngle( key ) {
	return (
		Object.prototype.hasOwnProperty.call( PAIRS, key ) ||
		Object.values( PAIRS ).includes( key )
	);
}

/**
 * Every hover and rest angle key mapped to null.
 *
 * @return {Object<string,null>} Empty holders.
 */
export function emptyAngles() {
	const out = {};
	[ ...Object.keys( PAIRS ), ...Object.values( PAIRS ) ].forEach( ( key ) => {
		out[ key ] = null;
	} );
	return out;
}

/**
 * Write, for each pair this tier touches, the rest angle directly and the hover angle as its to-value (hover minus rest).
 *
 * @param {Object<string,?string>}               angles  Effective CSS angles so far.
 * @param {Object<string,unknown>}               raw     Effective stored angles so far.
 * @param {Object<string,boolean>}               changed The angle keys this tier sets.
 * @param {string}                               tier    Tier.
 * @param {Object<string,Object<string,string>>} decls   Per-tier declarations (mutated).
 * @param {Object<string,boolean>}               owners  Owner properties present (mutated).
 */
export function hoverAngles( angles, raw, changed, tier, decls, owners ) {
	const f = fields( DEF );
	Object.entries( PAIRS ).forEach( ( [ hoverKey, restKey ] ) => {
		if ( ! changed[ hoverKey ] && ! changed[ restKey ] ) {
			return;
		}
		const restProp = String( f[ restKey ]?.css || '' );
		const hoverProp = String( f[ hoverKey ]?.css || '' );
		if ( restProp === '' || hoverProp === '' ) {
			return;
		}
		if ( angles[ restKey ] !== null ) {
			decls[ tier ][ restProp ] = angles[ restKey ];
		}
		if ( angles[ hoverKey ] === null ) {
			return;
		}
		let to = angles[ hoverKey ];
		if ( angles[ restKey ] !== null ) {
			let diff = null;
			if ( isNumber( raw[ hoverKey ] ) && isNumber( raw[ restKey ] ) ) {
				diff = valueCss( DEF, hoverKey, raw[ hoverKey ] - raw[ restKey ] );
			}
			to = diff ?? `calc(${ angles[ hoverKey ] } - ${ angles[ restKey ] })`;
		}
		decls[ tier ][
			MH_PREFIX + 'to-' + hoverProp.slice( MH_PREFIX.length )
		] = to;
		owners[ hoverProp ] = true;
	} );
}

/**
 * The channels the hover state's angles write: a pair with either angle set adds its owner property's channel.
 *
 * @param {Object<string,?string>} angles   Effective CSS angles.
 * @param {Object<string,boolean>} channels Channel set (mutated).
 */
export function angleChannels( angles, channels ) {
	const f = fields( DEF );
	const map = propertyChannels();
	Object.entries( PAIRS ).forEach( ( [ hoverKey, restKey ] ) => {
		const prop = String( f[ hoverKey ]?.css || '' );
		if (
			( angles[ hoverKey ] !== null || angles[ restKey ] !== null ) &&
			map[ prop ]
		) {
			channels[ map[ prop ] ] = true;
		}
	} );
}

/**
 * Whether Follow pointer is on (it is not per device).
 *
 * @param {Object} desktop The hover state's desktop values.
 * @return {boolean} True when on.
 */
export function follows( desktop ) {
	return desktop?.[ FOLLOW ] === true;
}

/**
 * Follow pointer's default settle timing.
 *
 * @return {{duration:string,easing:string}} Timing.
 */
export function followDefaults() {
	return {
		duration: tokenOr( 'token:duration.medium', '300ms' ),
		easing: tokenOr( 'token:easing.spring', 'ease-out' ),
	};
}

/**
 * Apply one tier's settle timing to Follow pointer's running timing.
 *
 * @param {Object}                          values One tier's hover state values.
 * @param {{duration:string,easing:string}} timing Running timing (mutated).
 * @return {boolean} Whether the tier changed it.
 */
export function followTiming( values, timing ) {
	let changed = false;
	[
		[ FOLLOW_DURATION, 'duration' ],
		[ FOLLOW_EASING, 'easing' ],
	].forEach( ( [ key, slot ] ) => {
		if ( ! Object.prototype.hasOwnProperty.call( values, key ) ) {
			return;
		}
		const css = valueCss( DEF, key, values[ key ] );
		if ( css !== null ) {
			timing[ slot ] = css;
			changed = true;
		}
	} );
	return changed;
}

/**
 * Follow pointer's transition entries, its duration scaled by `1 - --sgs-mh-on` so the settle runs only on leave.
 *
 * @param {{duration:string,easing:string}} timing Settle timing.
 * @return {string[]} Entries.
 */
export function followEntries( timing ) {
	const duration = `calc(${ timing.duration } * (1 - var(--sgs-mh-on, 0)))`;
	return ownerProperties( FOLLOW ).map(
		( name ) => `${ name } ${ duration } ${ timing.easing } 0ms`
	);
}

/**
 * The schema's shared default perspective on the desktop rule, first, when an X or Y owner is present and no layer set one.
 *
 * @param {Object<string,Object<string,string>>} decls Per-tier declarations (mutated).
 * @param {boolean}                              hasXy Whether an X or Y angle or Follow pointer is present.
 */
export function defaultPerspective( decls, hasXy ) {
	if ( ! hasXy ) {
		return;
	}
	channelRows().forEach( ( row ) =>
		( row.shared || [] ).forEach( ( prop ) => {
			const name = String( prop?.name || '' );
			if (
				prop?.default !== undefined &&
				prop?.default !== null &&
				name !== '' &&
				! Object.prototype.hasOwnProperty.call( decls.desktop, name )
			) {
				decls.desktop = {
					[ name ]: String( prop.default ),
					...decls.desktop,
				};
			}
		} )
	);
}

/**
 * Whether a hover state puts the element's perspective on its parent.
 *
 * @param {?Object} state The hover state layer.
 * @return {boolean} True for `perspectiveOn: parent`.
 */
export function onParent( state ) {
	return state?.values?.perspectiveOn === 'parent';
}

/**
 * Move the element's perspective to its parent (the twin of `Sgs_Motion_Rotation::parent_perspective`): the element's
 * `--sgs-persp-self` becomes `none` and the values it held are returned as the parent's `perspective` declarations.
 *
 * @param {Object<string,Object<string,string>>} decls Per-tier declarations of the element (mutated).
 * @param {?Object}                              state The hover state layer.
 * @param {boolean}                              owned Whether the element is a block's root placed directly inside another SGS block.
 * @return {Object<string,Object<string,string>>} The parent's per-tier declarations; empty when nothing moved.
 */
export function parentPerspective( decls, state, owned ) {
	if ( ! owned || ! onParent( state ) ) {
		return {};
	}
	const prop = String( fields( DEF ).perspective?.css || '' );
	if ( prop === '' || decls.desktop?.[ prop ] === undefined ) {
		return {};
	}
	const moved = {};
	[ 'desktop', 'tablet', 'mobile' ].forEach( ( tier ) => {
		if ( decls[ tier ]?.[ prop ] !== undefined ) {
			moved[ tier ] = { perspective: decls[ tier ][ prop ] };
			delete decls[ tier ][ prop ];
		}
	} );
	decls.desktop = { [ prop ]: 'none', ...decls.desktop };
	return moved;
}

/**
 * The channels Follow pointer writes.
 *
 * @param {Object<string,boolean>} channels Channel set (mutated).
 */
export function followChannels( channels ) {
	ownerWrites( FOLLOW ).forEach( ( channel ) => {
		channels[ channel ] = true;
	} );
}

/**
 * Stored frames in offset order; a frame without a numeric offset sorts with the frame before it.
 *
 * @param {Array|Object} list Stored frames.
 * @return {Array} Frames.
 */
function sortedFrames( list ) {
	let last = 0;
	const keyed = Object.values( list ).map( ( frame ) => {
		const offset =
			frame && typeof frame === 'object' ? frame.offset : undefined;
		last = isNumber( offset ) ? offset : last;
		return [ last, frame ];
	} );
	keyed.sort( ( a, b ) => {
		if ( a[ 0 ] === b[ 0 ] ) {
			return 0;
		}
		return a[ 0 ] < b[ 0 ] ? -1 : 1;
	} );
	return keyed.map( ( pair ) => pair[ 1 ] );
}

/**
 * The desktop keyframes as JSON for the WAAPI module; the first frame also fills the hidden start state.
 *
 * @param {unknown}                list    Stored keyframe list.
 * @param {Object<string,boolean>} used    Owner properties touched (mutated).
 * @param {boolean}                keepOp  Whether the LCP rule holds opacity at 1.
 * @param {Object<string,string>}  desktop Desktop declarations (mutated).
 * @return {string|null} JSON, or null.
 */
export function keyframesJson( list, used, keepOp, desktop ) {
	if (
		! list ||
		typeof list !== 'object' ||
		Object.keys( list ).length === 0
	) {
		return null;
	}
	const frameFields = fields( 'EntranceKeyframe' );
	const out = sortedFrames( list ).map( ( frame, index ) => {
		const row = {};
		const entries =
			frame && typeof frame === 'object' ? Object.entries( frame ) : [];
		entries.forEach( ( [ key, value ] ) => {
			if ( key === 'offset' ) {
				const css = valueCss( 'EntranceKeyframe', 'offset', value );
				if ( css !== null && isNumber( value ) ) {
					row.offset = value / 100;
				}
				return;
			}
			const prop = frameFields[ key ]?.css ?? null;
			const css = valueCss( 'EntranceKeyframe', key, value );
			if ( prop !== null && css !== null ) {
				row[ prop ] = keepOp && ME_PREFIX + 'op' === prop ? '1' : css;
				used[ prop ] = true;
				const from = ME_PREFIX + 'from-' + prop.slice( ME_PREFIX.length );
				if (
					index === 0 &&
					! Object.prototype.hasOwnProperty.call( desktop, from )
				) {
					desktop[ from ] = css;
				}
			}
		} );
		if ( index === 0 && row.offset !== undefined && row.offset > 0 ) {
			row.offset = 0;
		}
		// PHP encodes an empty frame as a JSON list.
		return Object.keys( row ).length === 0 ? [] : row;
	} );
	return JSON.stringify( out );
}
