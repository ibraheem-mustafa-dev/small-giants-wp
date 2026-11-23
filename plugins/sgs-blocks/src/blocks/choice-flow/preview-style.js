/**
 * Editor-canvas preview values for sgs/choice-flow's root. Each value is the
 * one the front end paints: the same custom property that
 * `includes/choice-flow-showcase.php` and `render.php` set, read by the same
 * `style.css` rules. Editor-only React style objects; the front end renders no
 * inline style (Spec 32).
 *
 * @package SGS\Blocks
 */
import { getBlockType } from '@wordpress/blocks';
import {
	colourVar,
	sgsBorderPreview,
	tierBoxLonghands,
	tierValueOf,
} from '../../utils';
import buttonKitStyle from '../../components/button-kit/button-kit-style';
import { presetNames } from '../button/preset-names';

/**
 * @param {Object} attributes Block attributes.
 * @param {string} tier       The previewed device ('desktop' | 'tablet' | 'mobile').
 * @return {Object} Style object for the flow's wrapper element.
 */
export function buildWrapperStyle( attributes, tier = 'desktop' ) {
	const { padding, maxWidth, flowLayout, optionMediaSize, headerLogoHeight } =
		attributes;
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
	setGradient(
		'--sgs-choice-flow-stage-gradient',
		attributes.stageColourGradient
	);
	setColour( '--sgs-choice-flow-note-icon', attributes.stageNoteIconColour );
	setGradient(
		'--sgs-choice-flow-note-icon-gradient',
		attributes.stageNoteIconColourGradient
	);
	setColour(
		'--sgs-choice-flow-note-border',
		attributes.stageNoteBorderColour
	);
	setColour(
		'--sgs-choice-flow-note-hover',
		attributes.stageNoteHoverColour
	);
	setGradient(
		'--sgs-choice-flow-note-hover-gradient',
		attributes.stageNoteHoverColourGradient
	);
	setColour( '--sgs-choice-flow-eyebrow', attributes.headerEyebrowColour );
	setColour( '--sgs-choice-flow-toggle', attributes.infoToggleColour );
	setColour(
		'--sgs-choice-flow-toggle-border',
		attributes.infoToggleBorderColour
	);
	setColour( '--sgs-choice-flow-stepper', attributes.stepperColour );
	setColour(
		'--sgs-choice-flow-stepper-active',
		attributes.stepperActiveColour
	);
	setColour(
		'--sgs-choice-flow-badge-colour',
		attributes.progressBadgeColour
	);
	setColour( '--sgs-choice-flow-note-colour', attributes.summaryNoteColour );

	// choice-flow-showcase.php: 12 to 80 px, 32 is the stylesheet's own default.
	const logoHeight = Number( headerLogoHeight );
	if (
		Number.isInteger( logoHeight ) &&
		32 !== logoHeight &&
		logoHeight >= 12 &&
		logoHeight <= 80
	) {
		style[ '--sgs-choice-flow-logo-height' ] = `${ logoHeight }px`;
	}

	// choice-flow-showcase.php: 10 to 300 %, the picture keeps its own proportions.
	return { ...style, ...mediaSizePreviewStyle( optionMediaSize, tier ) };
}

/**
 * The option-picture size custom properties for one device (the flow's or a
 * question's own `optionMediaSize`), the front end's 10 to 300 % range.
 *
 * @param {Object} optionMediaSize {desktop, tablet, mobile} percentages.
 * @param {string} tier            The previewed device.
 * @return {Object} Style object; empty when no size is set.
 */
export function mediaSizePreviewStyle( optionMediaSize, tier = 'desktop' ) {
	const mediaSize = tierValueOf( optionMediaSize, tier, ( raw ) => {
		const value = Number( raw );
		return Number.isFinite( value ) && value >= 10 && value <= 300
			? value
			: undefined;
	} );
	if ( undefined === mediaSize ) {
		return {};
	}
	return {
		'--sgs-choice-flow-media-size': `${
			Math.round( mediaSize * 100 ) / 100
		}%`,
		'--sgs-choice-flow-media-height': 'auto',
	};
}

/**
 * The preset class a built-in button wears in the canvas: the page gives the button the preset's shared rule, the canvas gives
 * it `sgs-button sgs-button--<slug>` (as sgs/product-card's CTA does). '' when `{prefix}Style` names no preset.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} prefix     The button's attribute prefix.
 * @return {string} Class names.
 */
export function buttonPresetClass( attributes, prefix ) {
	const slug = attributes?.[ `${ prefix }Style` ];
	return presetNames().includes( slug )
		? `sgs-button sgs-button--${ slug }`
		: '';
}

/**
 * A button's kit look as the canvas paints it (`buttonKitStyle()`, the twin of `sgs_button_kit_css()`). With a preset chosen
 * every attribute of the prefix still equal to its declared default is dropped first, as `includes/choice-flow-buttons.php::
 * sgs_choice_flow_button_attrs()` does, so the preset paints in place of Back's default ink-and-paper pair.
 *
 * @param {Object} attributes        Block attributes.
 * @param {string} prefix            The button's attribute prefix.
 * @param {Object} [options]
 * @param {string} [options.tier]    Previewed device tier.
 * @param {Array}  [options.palette] Theme colour palette.
 * @return {Object} React style fragment.
 */
export function buttonKitPreview(
	attributes,
	prefix,
	{ tier = 'desktop', palette } = {}
) {
	let own = attributes;
	if ( buttonPresetClass( attributes, prefix ) ) {
		const declared = getBlockType( 'sgs/choice-flow' )?.attributes || {};
		own = { ...attributes };
		for ( const name of Object.keys( own ) ) {
			if (
				name.startsWith( prefix ) &&
				'default' in ( declared[ name ] || {} ) &&
				JSON.stringify( own[ name ] ) ===
					JSON.stringify( declared[ name ].default )
			) {
				delete own[ name ];
			}
		}
	}
	return buttonKitStyle( own, prefix, { tier, palette } );
}

/**
 * Editor canvas preview of the Back button: its kit look (colour, border and per-device radius, padding, type, shadow), over
 * the preview pill's own stylesheet. With no preset chosen the pill keeps the front end's transparent resting background and
 * 2px border (`defaultBorder`); with one, the preset's class paints them (`buttonPresetClass()`).
 *
 * @param {Object} attributes Block attributes.
 * @param {string} [tier]     Previewed device tier.
 * @param {Array}  [palette]  Theme colour palette.
 * @return {Object} Inline style object for the preview `<span>`.
 */
export function buildBackButtonPreviewStyle(
	attributes,
	tier = 'desktop',
	palette
) {
	const kit = buttonKitPreview( attributes, 'back', { tier, palette } );
	if ( buttonPresetClass( attributes, 'back' ) ) {
		return kit;
	}
	const {
		backColourBackground,
		backColourText,
		backColourBorder,
		backBorderStyle,
		backBorderWidth,
		backBorderRadius,
	} = attributes;
	return {
		...kit,
		backgroundColor: backColourBackground
			? colourVar( backColourBackground )
			: 'transparent',
		color: backColourText ? colourVar( backColourText ) : undefined,
		...sgsBorderPreview(
			{
				widthValues: backBorderWidth ?? {},
				styleValue: backBorderStyle,
				colourValue: backColourBorder,
				radiusValues: backBorderRadius,
			},
			tier,
			palette,
			{ defaultBorder: true }
		),
	};
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
