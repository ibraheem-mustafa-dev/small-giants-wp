/**
 * Editor-canvas preview values for sgs/choice-flow's root. Each value is the
 * one the front end paints: the same custom property that
 * `includes/choice-flow-showcase.php` and `render.php` set, read by the same
 * `style.css` rules. Editor-only React style objects; the front end renders no
 * inline style (Spec 32).
 *
 * @package SGS\Blocks
 */
import { colourVar, sgsBorderPreview, tierBoxLonghands, tierValueOf } from '../../utils';

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
		Object.assign( style, tierBoxLonghands( padding, tier, 'padding' ) );
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
	const setGradient = ( property, value ) => {
		if ( value && 'string' === typeof value ) {
			style[ property ] = value;
		}
	};
	setColour( '--sgs-choice-flow-stage', attributes.stageColour );
	setGradient( '--sgs-choice-flow-stage-gradient', attributes.stageColourGradient );
	setColour( '--sgs-choice-flow-note-icon', attributes.stageNoteIconColour );
	setGradient( '--sgs-choice-flow-note-icon-gradient', attributes.stageNoteIconColourGradient );
	setColour( '--sgs-choice-flow-note-border', attributes.stageNoteBorderColour );
	setColour( '--sgs-choice-flow-note-hover', attributes.stageNoteHoverColour );
	setGradient( '--sgs-choice-flow-note-hover-gradient', attributes.stageNoteHoverColourGradient );
	setColour( '--sgs-choice-flow-eyebrow', attributes.headerEyebrowColour );
	setColour( '--sgs-choice-flow-toggle', attributes.infoToggleColour );
	setColour( '--sgs-choice-flow-toggle-border', attributes.infoToggleBorderColour );
	setColour( '--sgs-choice-flow-stepper', attributes.stepperColour );
	setColour( '--sgs-choice-flow-stepper-active', attributes.stepperActiveColour );
	setColour( '--sgs-choice-flow-badge-colour', attributes.progressBadgeColour );
	setColour( '--sgs-choice-flow-note-colour', attributes.summaryNoteColour );

	// choice-flow-showcase.php: 12 to 80 px, 32 is the stylesheet's own default.
	const logoHeight = Number( headerLogoHeight );
	if ( Number.isInteger( logoHeight ) && 32 !== logoHeight && logoHeight >= 12 && logoHeight <= 80 ) {
		style[ '--sgs-choice-flow-logo-height' ] = `${ logoHeight }px`;
	}

	// choice-flow-showcase.php: 10 to 300 %, the picture keeps its own proportions.
	const mediaSize = tierValueOf( optionMediaSize, tier, ( raw ) => {
		const value = Number( raw );
		return Number.isFinite( value ) && value >= 10 && value <= 300 ? value : undefined;
	} );
	if ( undefined !== mediaSize ) {
		style[ '--sgs-choice-flow-media-size' ] = `${ Math.round( mediaSize * 100 ) / 100 }%`;
		style[ '--sgs-choice-flow-media-height' ] = 'auto';
	}

	return style;
}

/**
 * Editor canvas preview of the Back button's colour/border styling. The border
 * is the `SgsBorderControl` panel's own values through its twin
 * `sgsBorderPreview()`; the preview pill's stylesheet already paints a 2px
 * solid border (as the front-end `<button>` paints its own), so each chosen
 * part applies on its own.
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
	};

	return Object.assign(
		style,
		sgsBorderPreview( { widthValues: backBorderWidth ?? {}, styleValue: backBorderStyle, colourValue: backColourBorder, radiusValues: { base: backBorderRadius ?? {} } }, 'desktop', undefined, { defaultBorder: true } )
	);
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
