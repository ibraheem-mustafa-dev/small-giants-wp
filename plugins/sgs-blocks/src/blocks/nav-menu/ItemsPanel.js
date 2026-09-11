import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl, ToggleControl } from '@wordpress/components';
import { TypographyControls } from '../../components';

/**
 * SGS Nav Menu (sgs/nav-menu) — Styles tab: "Items" PanelBody (per-property
 * hover treatments, item typography, magnetic hover pull).
 *
 * Split out of edit.js (Spec 41 step 7, pure refactor) to keep the file under
 * the project's 250-line JS budget. Colours (text/background, Normal + Hover)
 * live in the top-level SgsColourPanel (D618/D609), unchanged and untouched
 * by this split.
 *
 * 2026-09-11: the old single `hoverStyle` picker (pill / underline / text)
 * and the `itemRadius`/`itemRadiusHover` controls were deleted with no
 * deprecation as part of the Spec 41 manifest rewrite (bb9df82dc, D270) —
 * replaced by three independent per-property mode-selectors
 * (itemColourHoverTreatment/itemBgHoverTreatment/itemBorderHoverTreatment),
 * each PHP-validated against a closed enum (none/swap/sweep, or
 * none/swap/highlight for background). That rewrite shipped the render-side
 * mechanism and the block.json declarations but never built the matching
 * editor controls, leaving the whole 3-state hover system unreachable by any
 * client — this panel closes that gap rather than leaving it a silent no-op.
 *
 * @param {Object}   root0                          Props.
 * @param {string}   root0.itemColourHoverTreatment  The block's `itemColourHoverTreatment` attribute.
 * @param {string}   root0.itemBgHoverTreatment      The block's `itemBgHoverTreatment` attribute.
 * @param {string}   root0.itemBorderHoverTreatment  The block's `itemBorderHoverTreatment` attribute.
 * @param {string}   root0.borderHoverAnimationDirection The block's `borderHoverAnimationDirection` attribute.
 * @param {Function} root0.setAttributes             The block's attribute setter.
 * @param {Object}   root0.attributes                The block's full attributes object
 *                                                     (TypographyControls reads/writes
 *                                                     the `item*` prefixed keys itself).
 * @param {boolean}  root0.itemMagnetEnabled         The block's `itemMagnetEnabled` attribute.
 */
export default function ItemsPanel( {
	itemColourHoverTreatment,
	itemBgHoverTreatment,
	itemBorderHoverTreatment,
	borderHoverAnimationDirection,
	setAttributes,
	attributes,
	itemMagnetEnabled,
} ) {
	return (
		<PanelBody title={ __( 'Items', 'sgs-blocks' ) }>
			<SelectControl
				label={ __( 'Text colour on hover', 'sgs-blocks' ) }
				value={ itemColourHoverTreatment || 'swap' }
				options={ [
					{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
					{ label: __( 'Swap colour', 'sgs-blocks' ), value: 'swap' },
					{ label: __( 'Sweep', 'sgs-blocks' ), value: 'sweep' },
				] }
				onChange={ ( val ) =>
					setAttributes( { itemColourHoverTreatment: val } )
				}
				help={ __(
					'How the item TEXT colour changes on hover. Sweep is only offered/applied when it can be painted cleanly against this item’s current colours.',
					'sgs-blocks'
				) }
				__next40pxDefaultSize
			/>

			<SelectControl
				label={ __( 'Background on hover', 'sgs-blocks' ) }
				value={ itemBgHoverTreatment || 'swap' }
				options={ [
					{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
					{ label: __( 'Swap colour', 'sgs-blocks' ), value: 'swap' },
					{ label: __( 'Sliding pill', 'sgs-blocks' ), value: 'highlight' },
				] }
				onChange={ ( val ) =>
					setAttributes( { itemBgHoverTreatment: val } )
				}
				help={ __(
					'Sliding pill paints from this item’s own Background Hover colour and animates behind the hovered/current item.',
					'sgs-blocks'
				) }
				__next40pxDefaultSize
			/>

			<SelectControl
				label={ __( 'Border on hover', 'sgs-blocks' ) }
				value={ itemBorderHoverTreatment || 'swap' }
				options={ [
					{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
					{ label: __( 'Swap colour', 'sgs-blocks' ), value: 'swap' },
					{ label: __( 'Sweep', 'sgs-blocks' ), value: 'sweep' },
				] }
				onChange={ ( val ) =>
					setAttributes( { itemBorderHoverTreatment: val } )
				}
				__next40pxDefaultSize
			/>

			{ 'sweep' === itemBorderHoverTreatment && (
				<SelectControl
					label={ __( 'Sweep direction', 'sgs-blocks' ) }
					value={ borderHoverAnimationDirection || 'left-to-right' }
					options={ [
						{
							label: __( 'Left to right', 'sgs-blocks' ),
							value: 'left-to-right',
						},
						{
							label: __( 'Right to left', 'sgs-blocks' ),
							value: 'right-to-left',
						},
					] }
					onChange={ ( val ) =>
						setAttributes( { borderHoverAnimationDirection: val } )
					}
					__next40pxDefaultSize
				/>
			) }

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
