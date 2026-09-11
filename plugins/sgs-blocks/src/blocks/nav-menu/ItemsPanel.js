import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl, ToggleControl } from '@wordpress/components';
import { SgsLengthControl, TypographyControls } from '../../components';

/**
 * SGS Nav Menu (sgs/nav-menu) — Styles tab: "Items" PanelBody (hover style,
 * corner radius, item typography, magnetic hover pull).
 *
 * Split out of edit.js (Spec 41 step 7, pure refactor) to keep the file under
 * the project's 250-line JS budget. No behaviour change — verbatim JSX.
 * Colours (text/background, Normal + Hover) live in the top-level
 * SgsColourPanel (D618/D609), unchanged and untouched by this split.
 *
 * @param {Object}   root0                   Props.
 * @param {string}   root0.hoverStyle        The block's `hoverStyle` attribute.
 * @param {Function} root0.setAttributes     The block's attribute setter.
 * @param {number}   root0.itemRadius        The block's `itemRadius` attribute.
 * @param {number}   root0.itemRadiusHover   The block's `itemRadiusHover` attribute.
 * @param {Object}   root0.attributes        The block's full attributes object
 *                                            (TypographyControls reads/writes
 *                                            the `item*` prefixed keys itself).
 * @param {boolean}  root0.itemMagnetEnabled The block's `itemMagnetEnabled` attribute.
 */
export default function ItemsPanel( {
	hoverStyle,
	setAttributes,
	itemRadius,
	itemRadiusHover,
	attributes,
	itemMagnetEnabled,
} ) {
	return (
		<PanelBody title={ __( 'Items', 'sgs-blocks' ) }>
			<SelectControl
				label={ __( 'Hover style', 'sgs-blocks' ) }
				value={ hoverStyle }
				options={ [
					{
						label: __( 'Filled pill', 'sgs-blocks' ),
						value: 'pill',
					},
					{
						label: __( 'Underline', 'sgs-blocks' ),
						value: 'underline',
					},
					{
						label: __(
							'Text colour only',
							'sgs-blocks'
						),
						value: 'text',
					},
				] }
				onChange={ ( val ) =>
					setAttributes( { hoverStyle: val } )
				}
				help={ __(
					'How an item reacts on hover — and how the current page is marked. Underline draws a bar beneath the item.',
					'sgs-blocks'
				) }
				__next40pxDefaultSize
			/>

			{ /* Colours (text/background, Normal + Hover) moved to the
			   top-level SgsColourPanel (D618/D609). Radius is not a
			   colour, so it stays here as a plain Normal/Hover pair. */ }
			<SgsLengthControl
				label={ __( 'Corner radius', 'sgs-blocks' ) }
				value={ `${ itemRadius }px` }
				units={ [ { value: 'px', label: 'px', default: 8 } ] }
				onChange={ ( val ) =>
					setAttributes( { itemRadius: parseFloat( val ) || 0 } )
				}
				presets={ false }
			/>
			<SgsLengthControl
				label={ __( 'Corner radius on hover', 'sgs-blocks' ) }
				value={ `${ itemRadiusHover ?? itemRadius }px` }
				units={ [ { value: 'px', label: 'px', default: 8 } ] }
				onChange={ ( val ) =>
					setAttributes( { itemRadiusHover: parseFloat( val ) || 0 } )
				}
				help={ __(
					'Leave matching Normal for a pill that keeps its shape on hover.',
					'sgs-blocks'
				) }
				presets={ false }
			/>

			<TypographyControls fontSizePresets showFontFamily showDecoration showTransform showLetterSpacing showTextAlign showTextWrap showTextColumns showTextIndent showWritingMode
				prefix="item"
				attributes={ attributes }
				setAttributes={ setAttributes }
			/>

			<ToggleControl
				label={ __( 'Magnetic hover pull', 'sgs-blocks' ) }
				checked={ !! itemMagnetEnabled }
				onChange={ ( val ) =>
					setAttributes( { itemMagnetEnabled: val } )
				}
				help={ __(
					'Nudges each item label a few pixels toward the cursor on hover. Off automatically when the visitor is using touch, and when reduced motion is requested.',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
			/>
		</PanelBody>
	);
}
