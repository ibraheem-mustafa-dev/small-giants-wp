/**
 * SGS WhatsApp CTA — "floating" variant editor fields.
 *
 * Extracted out of edit.js to keep that file under the 250-line JS budget
 * (Spec 32 / CLAUDE.md file-length rule).
 *
 * Draft precedent (Eye Care Birmingham.dc.html `.sgs-whatsapp-fab`): a fixed
 * pill that appears after scroll and hides its visible label on narrow
 * viewports (`hideOnMobile`), keeping the icon-only circle. Both settings are
 * OFF by default (0) so an existing floating button renders unchanged.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl, ToggleControl } from '@wordpress/components';

function toNonNegativeInt( raw ) {
	const parsed = parseInt( raw, 10 );
	return Number.isNaN( parsed ) || parsed < 0 ? 0 : parsed;
}

export function FloatingPanel( { attributes, setAttributes } ) {
	const {
		floatingScrollThreshold,
		floatingHideLabelBelow,
		floatingHideNearInline,
	} = attributes;

	return (
		<PanelBody title={ __( 'Floating button', 'sgs-blocks' ) } initialOpen={ false }>
			<TextControl
				label={ __( 'Show after scrolling (px)', 'sgs-blocks' ) }
				help={ __( '0 = always visible.', 'sgs-blocks' ) }
				type="number"
				min={ 0 }
				value={ floatingScrollThreshold ?? 0 }
				onChange={ ( val ) =>
					setAttributes( { floatingScrollThreshold: toNonNegativeInt( val ) } )
				}
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<TextControl
				label={ __( 'Hide label below (px)', 'sgs-blocks' ) }
				help={ __(
					'Viewport width below which only the icon shows. 0 = never hide.',
					'sgs-blocks'
				) }
				type="number"
				min={ 0 }
				value={ floatingHideLabelBelow ?? 0 }
				onChange={ ( val ) =>
					setAttributes( { floatingHideLabelBelow: toNonNegativeInt( val ) } )
				}
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<ToggleControl
				label={ __( 'Step aside when a WhatsApp button is on screen', 'sgs-blocks' ) }
				help={ __(
					'Hides the floating button while any other WhatsApp button on the page is visible, so the same CTA never shows twice at once.',
					'sgs-blocks'
				) }
				checked={ floatingHideNearInline ?? true }
				onChange={ ( val ) =>
					setAttributes( { floatingHideNearInline: val } )
				}
				__nextHasNoMarginBottom
			/>
		</PanelBody>
	);
}
