/**
 * Sizing vocabulary and the one-line summary for the Spec 49 Size and crop panel (§7.2, §9.2).
 *
 * @package
 */
import { __, sprintf } from '@wordpress/i18n';
import { deviceName, resolveTierSource } from './deviceValues.js';

/** The ratio a slot offers by default, `w / h`, spaced as the stored value is. */
export const BASE_RATIOS = [ '1 / 1', '4 / 3', '3 / 2', '16 / 9', '4 / 5', '3 / 4', '9 / 16', '21 / 9' ];

/** The only ratios an embed offers. */
export const EMBED_RATIOS = [ '16 / 9', '4 / 3', '21 / 9', '9 / 16' ];

/** Stored value for "Photo's own". */
export const NATURAL = 'natural';

/** Stored value for "Match its space". */
export const FILL = 'fill';

/**
 * @param {string} ratio A ratio such as "16/9" or "16 / 9".
 * @return {string} The spaced form; a value that is not `w/h` is returned trimmed.
 */
export function normaliseRatio( ratio ) {
	const text = String( ratio ?? '' ).trim();
	const match = text.match( /^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/ );
	if ( match ) {
		return `${ match[ 1 ] } / ${ match[ 2 ] }`;
	}
	// Core writes a square as the bare number "1": the same ratio as "1 / 1".
	return /^\d+(?:\.\d+)?$/.test( text ) && Number( text ) > 0 ? `${ text } / 1` : text;
}

/**
 * The ratio chips a slot offers: the built-in list merged with the theme's `dimensions.aspectRatios`.
 *
 * @param {Array}  themeRatios Entries of `{ ratio, name }` from `useSettings( 'dimensions.aspectRatios' )`.
 * @param {string} kind        The slot's active kind; an embed offers its four ratios only.
 * @return {Array<{value: string, label: string}>} Chips, with Photo's own first.
 */
export function ratioOptions( themeRatios, kind = 'image' ) {
	const out = [];
	const add = ( value, label ) => {
		if ( value && ! out.some( ( item ) => item.value === value ) ) {
			out.push( { value, label } );
		}
	};
	if ( 'embed' !== kind ) {
		add( NATURAL, 'video' === kind ? __( "Video's own", 'sgs-blocks' ) : __( "Photo's own", 'sgs-blocks' ) );
	}
	( 'embed' === kind ? EMBED_RATIOS : BASE_RATIOS ).forEach( ( ratio ) => add( ratio, ratio.replace( / /g, '' ).replace( '/', ':' ) ) );
	if ( 'embed' !== kind ) {
		( Array.isArray( themeRatios ) ? themeRatios : [] ).forEach( ( entry ) => {
			const value = normaliseRatio( entry?.ratio );
			if ( value && 'string' === typeof entry?.name ) {
				add( value, entry.name );
			}
		} );
	}
	return out;
}

/**
 * @param {string} value A stored length or keyword.
 * @return {boolean} True for a real length (not blank, auto, none, fill, natural).
 */
export function isLength( value ) {
	return !! value && ! [ 'auto', 'none', FILL, NATURAL, 'inherit' ].includes( value );
}

/**
 * The sizing values a device resolves to.
 *
 * @param {Function} read   Maps a base name (`Ratio`, `Width`...) to the stored attribute.
 * @param {string}   device The device.
 * @return {Object} `{ ratio, width, height, fit, minWidth, maxWidth, minHeight, maxHeight }`, each a string or ''.
 */
export function resolveSizing( read, device ) {
	// A stored value that is not a string (an empty array or object a save left behind) is no value.
	const pick = ( base ) => {
		const value = resolveTierSource( read( base ), device ).value;
		return 'string' === typeof value ? value.trim() : '';
	};
	return {
		ratio: pick( 'Ratio' ),
		width: pick( 'Width' ),
		height: pick( 'Height' ),
		fit: pick( 'Fit' ),
		minWidth: pick( 'MinWidth' ),
		maxWidth: pick( 'MaxWidth' ),
		minHeight: pick( 'MinHeight' ),
		maxHeight: pick( 'MaxHeight' ),
	};
}

/**
 * The one line at the top of Size and crop (§9.2): what the active device ends up with, from §7.2's table.
 *
 * @param {string} device The active device.
 * @param {Object} sized  `resolveSizing` output.
 * @return {string} For example "Mobile: full width, square (1:1), cropped to fill".
 */
export function describeSizing( device, sized ) {
	const { ratio, width, height, fit } = sized;
	const widthSet = isLength( width );
	const heightSet = isLength( height );
	// Ratio is not used while Width and Height are both set, nor while Height is Fill (§7.2).
	const hasRatio = !! ratio && NATURAL !== ratio && FILL !== height && ! ( widthSet && heightSet );
	const hasHeight = !! height && 'auto' !== height;
	const parts = [];

	if ( widthSet ) {
		parts.push( sprintf( /* translators: %s: a CSS length. */ __( '%s wide', 'sgs-blocks' ), width ) );
	} else if ( 'auto' === width || ( hasRatio && hasHeight ) ) {
		parts.push( __( 'width follows the height', 'sgs-blocks' ) );
	} else if ( hasRatio || hasHeight ) {
		parts.push( __( 'full width', 'sgs-blocks' ) );
	} else {
		parts.push( __( "the photo's own size", 'sgs-blocks' ) );
	}

	if ( FILL === height ) {
		parts.push( __( 'as tall as its space', 'sgs-blocks' ) );
	} else if ( heightSet ) {
		parts.push( sprintf( /* translators: %s: a CSS length. */ __( '%s tall', 'sgs-blocks' ), height ) );
	}
	if ( hasRatio ) {
		parts.push(
			'1 / 1' === ratio
				? __( 'square (1:1)', 'sgs-blocks' )
				: sprintf( /* translators: %s: a ratio such as 16:9. */ __( 'ratio %s', 'sgs-blocks' ), ratio.replace( / /g, '' ).replace( '/', ':' ) )
		);
	}
	// Width auto with a Height and no Ratio keeps the file's proportions, so nothing is cropped (§7.2).
	const keepsProportions = 'auto' === width && ! hasRatio && heightSet;
	if ( ! keepsProportions && ( hasRatio || heightSet || FILL === height ) ) {
		if ( 'contain' === fit ) {
			parts.push( __( 'showing all of the photo', 'sgs-blocks' ) );
		} else if ( 'fill' === fit ) {
			parts.push( __( 'stretched to fit', 'sgs-blocks' ) );
		} else if ( 'none' === fit ) {
			parts.push( __( 'at actual size', 'sgs-blocks' ) );
		} else {
			parts.push( __( 'cropped to fill', 'sgs-blocks' ) );
		}
	}
	const limits = [
		[ sized.minWidth, __( 'min width %s', 'sgs-blocks' ) ],
		[ sized.maxWidth, __( 'max width %s', 'sgs-blocks' ) ],
		[ sized.minHeight, __( 'min height %s', 'sgs-blocks' ) ],
		[ sized.maxHeight, __( 'max height %s', 'sgs-blocks' ) ],
	]
		.filter( ( [ value ] ) => isLength( value ) )
		.map( ( [ value, template ] ) => sprintf( template, value ) );
	if ( limits.length ) {
		parts.push( sprintf( /* translators: %s: a list such as "max height 300px". */ __( 'limited to %s', 'sgs-blocks' ), limits.join( ', ' ) ) );
	}
	return sprintf( /* translators: 1: device name, 2: the result. */ __( '%1$s: %2$s', 'sgs-blocks' ), deviceName( device ), parts.join( ', ' ) );
}

/**
 * @param {Object} sized `resolveSizing` output.
 * @return {boolean} True when the box crops, so Fit and Focal have something to act on (§9.2 hint).
 */
export function boxCrops( sized ) {
	return ( !! sized.ratio && NATURAL !== sized.ratio ) || isLength( sized.height ) || FILL === sized.height;
}
