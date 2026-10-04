/**
 * Editor-canvas preview values for sgs/choice-flow's root. Each value is the
 * one the front end paints: the same custom property that
 * `includes/choice-flow-showcase.php` and `render.php` set, read by the same
 * `style.css` rules. Editor-only React style objects; the front end renders no
 * inline style (Spec 32).
 *
 * @package SGS\Blocks
 */
import { colourVar } from '../../utils';

/** Narrower tiers fall back to the wider one, as the front end's media queries do. */
const TIER_FALLBACK = {
	desktop: [ 'desktop' ],
	tablet: [ 'tablet', 'desktop' ],
	mobile: [ 'mobile', 'tablet', 'desktop' ],
};

/**
 * @param {Object|undefined} box  {top,right,bottom,left}.
 * @param {string[]}         keys Side keys, in CSS order.
 * @return {string|undefined} CSS shorthand, or undefined when no side is set.
 */
export function boxShorthand( box, keys ) {
	if ( ! box || 'object' !== typeof box ) {
		return undefined;
	}
	if ( ! keys.some( ( key ) => box[ key ] ) ) {
		return undefined;
	}
	return keys.map( ( key ) => box[ key ] || '0' ).join( ' ' );
}

/**
 * @param {Object}   tiers {desktop,tablet,mobile}.
 * @param {string}   tier  The previewed device.
 * @param {Function} read  Maps a tier's stored value to a usable value or undefined.
 * @return {*} The first usable value from the previewed tier outwards.
 */
function valueAtTier( tiers, tier, read ) {
	if ( ! tiers || 'object' !== typeof tiers ) {
		return undefined;
	}
	for ( const key of TIER_FALLBACK[ tier ] || TIER_FALLBACK.desktop ) {
		const value = read( tiers[ key ] );
		if ( undefined !== value ) {
			return value;
		}
	}
	return undefined;
}

/**
 * @param {Object} attributes Block attributes.
 * @param {string} tier       The previewed device ('desktop' | 'tablet' | 'mobile').
 * @return {Object} Style object for the flow's wrapper element.
 */
export function buildWrapperStyle( attributes, tier = 'desktop' ) {
	const { padding, maxWidth, flowLayout, optionMediaSize, headerLogoHeight } = attributes;
	const style = {};

	// Showcase fills its full-screen frame, so render.php skips the compact box.
	if ( 'showcase' !== flowLayout ) {
		const paddingPreview = valueAtTier( padding, tier, ( box ) =>
			boxShorthand( box, [ 'top', 'right', 'bottom', 'left' ] )
		);
		if ( paddingPreview ) {
			style.padding = paddingPreview;
		}
		if ( maxWidth ) {
			style.maxWidth = maxWidth;
			style.marginLeft = 'auto';
			style.marginRight = 'auto';
		}
	}

	// choice-flow-showcase.php::sgs_choice_flow_showcase_css(): each colour is one custom property on the root.
	const setColour = ( property, value ) => {
		const resolved = colourVar( value );
		if ( resolved ) {
			style[ property ] = resolved;
		}
	};
	setColour( '--sgs-choice-flow-stage', attributes.stageColour );
	setColour( '--sgs-choice-flow-note-icon', attributes.stageNoteIconColour );
	setColour( '--sgs-choice-flow-note-border', attributes.stageNoteBorderColour );
	setColour( '--sgs-choice-flow-note-hover', attributes.stageNoteHoverColour );
	setColour( '--sgs-choice-flow-eyebrow', attributes.headerEyebrowColour );
	setColour( '--sgs-choice-flow-toggle', attributes.infoToggleColour );
	setColour( '--sgs-choice-flow-toggle-border', attributes.infoToggleBorderColour );

	// choice-flow-showcase.php: 12 to 80 px, 32 is the stylesheet's own default.
	const logoHeight = Number( headerLogoHeight );
	if ( Number.isInteger( logoHeight ) && 32 !== logoHeight && logoHeight >= 12 && logoHeight <= 80 ) {
		style[ '--sgs-choice-flow-logo-height' ] = `${ logoHeight }px`;
	}

	// choice-flow-showcase.php: 10 to 300 %, the picture keeps its own proportions.
	const mediaSize = valueAtTier( optionMediaSize, tier, ( raw ) => {
		const value = '' === raw || null === raw || undefined === raw ? NaN : Number( raw );
		return Number.isFinite( value ) && value >= 10 && value <= 300 ? value : undefined;
	} );
	if ( undefined !== mediaSize ) {
		style[ '--sgs-choice-flow-media-size' ] = `${ Math.round( mediaSize * 100 ) / 100 }%`;
		style[ '--sgs-choice-flow-media-height' ] = 'auto';
	}

	return style;
}

/**
 * Editor canvas preview of the Back button's colour/border styling.
 *
 * @param {Object} attributes Block attributes.
 * @return {Object} Inline style object for the preview `<span>`.
 */
export function buildBackButtonPreviewStyle( attributes ) {
	const {
		backColourBackground,
		backColourText,
		backColourBorder,
		backBorderStyle,
		backBorderWidth,
		backBorderRadius,
	} = attributes;

	const style = {
		backgroundColor: backColourBackground ? colourVar( backColourBackground ) : 'transparent',
		color: backColourText ? colourVar( backColourText ) : undefined,
		borderStyle: backBorderStyle || 'solid',
		borderColor: backColourBorder ? colourVar( backColourBorder ) : undefined,
	};

	const widthShorthand = boxShorthand( backBorderWidth, [ 'top', 'right', 'bottom', 'left' ] );
	if ( widthShorthand ) {
		style.borderWidth = widthShorthand;
	}

	const radiusShorthand = boxShorthand( backBorderRadius, [
		'topLeft',
		'topRight',
		'bottomRight',
		'bottomLeft',
	] );
	if ( radiusShorthand ) {
		style.borderRadius = radiusShorthand;
	}

	return style;
}

/**
 * The flow's progress at question 1, as flow-progress.js::updateStepPosition()
 * computes it: 'current' counts the question being shown, 'finished' counts
 * answered ones (none yet).
 *
 * @param {Object} attributes    Block attributes.
 * @param {number} questionTotal Question steps in the flow.
 * @return {number} 0 to 1.
 */
export function firstQuestionProgress( attributes, questionTotal ) {
	if ( questionTotal <= 0 ) {
		return 0;
	}
	return 'current' === attributes.progressCounts ? 1 / questionTotal : 0;
}
