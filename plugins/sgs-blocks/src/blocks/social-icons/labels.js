/**
 * sgs/social-icons: the Icon labels panel (the group visible-label switch, position and typography; the label colours
 * are a row of the block's Colour panel) and the canvas twin of render.php's group label rules.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl, ToggleControl } from '@wordpress/components';
import { TypographyControls } from '../../components';
import { isCssGradient, typographyPreviewCss } from '../../utils';

const LABEL_POSITIONS = [
	{ label: __( "Each icon's own", 'sgs-blocks' ), value: '' },
	{ label: __( 'After the icon', 'sgs-blocks' ), value: 'end' },
	{ label: __( 'Before the icon', 'sgs-blocks' ), value: 'start' },
	{ label: __( 'Below the icon', 'sgs-blocks' ), value: 'below' },
];

/**
 * The group label gradient and typography on the canvas: render.php's scoped label rules, scoped to this row. The
 * gradient skips a label with a colour of its own; an icon's own label typography is an inline style and wins.
 *
 * @param {string} scope      The row's canvas class.
 * @param {Object} attributes Block attributes.
 * @param {string} tier       Previewed device.
 * @return {string} CSS rules, or ''.
 */
export function rowLabelPreviewCss( scope, attributes, tier ) {
	const label = `.${ scope } .sgs-icon:not(.sgs-icon--own-label-colour)`;
	const safe = ( value ) => isCssGradient( value ) && ! /[{}<>;]/.test( value );
	let css = typographyPreviewCss( attributes, 'childIconLabel', `.${ scope } .sgs-icon__label-text`, tier );
	if ( safe( attributes.childIconLabelColourGradient ) ) {
		css += `${ label } .sgs-icon__label-text{background-image:${ attributes.childIconLabelColourGradient };-webkit-background-clip:text;background-clip:text;color:transparent;}`;
	}
	if ( safe( attributes.childIconLabelColourHoverGradient ) ) {
		css += `${ label } .sgs-icon__link:hover .sgs-icon__label-text{background-image:${ attributes.childIconLabelColourHoverGradient };-webkit-background-clip:text;background-clip:text;color:transparent;}`;
	}
	return css;
}

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block setAttributes.
 * @return {JSX.Element} The Icon labels panel.
 */
export function SocialIconLabelsPanel( { attributes, setAttributes } ) {
	const { childIconShowLabel, childIconLabelPosition = '' } = attributes;
	return (
		<PanelBody title={ __( 'Icon labels', 'sgs-blocks' ) } initialOpen={ false }>
			<ToggleControl
				label={ __( 'Show labels', 'sgs-blocks' ) }
				help={ __( 'Shows each icon\'s name beside it. An icon can also switch on its own label.', 'sgs-blocks' ) }
				checked={ !! childIconShowLabel }
				onChange={ ( value ) => setAttributes( { childIconShowLabel: value } ) }
				__nextHasNoMarginBottom
			/>
			<SelectControl
				label={ __( 'Label position', 'sgs-blocks' ) }
				help={ __( 'For icons left on After the icon.', 'sgs-blocks' ) }
				value={ childIconLabelPosition }
				options={ LABEL_POSITIONS }
				onChange={ ( value ) => setAttributes( { childIconLabelPosition: value } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<TypographyControls
				attributes={ attributes }
				setAttributes={ setAttributes }
				prefix="childIconLabel"
				fontSizePresets
				showFontFamily
				showDecoration
				showTransform
				showLetterSpacing
				showTextWrap
			/>
		</PanelBody>
	);
}
