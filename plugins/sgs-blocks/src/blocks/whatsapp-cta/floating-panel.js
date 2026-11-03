/**
 * SGS WhatsApp CTA — "floating" variant editor fields.
 *
 * Extracted out of edit.js to keep that file under the 250-line JS budget
 * (Spec 32 / CLAUDE.md file-length rule).
 *
 * Draft precedent (`.sgs-whatsapp-fab`): a fixed
 * pill that appears after scroll and hides its visible label on narrow
 * viewports (`hideOnMobile`), keeping the pill shape around the icon. Both settings are
 * OFF by default (0) so an existing floating button renders unchanged.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl, ToggleControl } from '@wordpress/components';
import { SgsLengthControl } from '../../components';

function toNonNegativeInt( raw ) {
	const parsed = parseInt( raw, 10 );
	return Number.isNaN( parsed ) || parsed < 0 ? 0 : parsed;
}

export function FloatingPanel( { attributes, setAttributes } ) {
	const {
		floatingScrollThreshold,
		floatingHideLabelBelow,
		floatingHideNearInline,
		floatingOffset,
	} = attributes;
	const offset = floatingOffset && 'object' === typeof floatingOffset ? floatingOffset : {};
	const setOffset = ( side, val ) =>
		setAttributes( { floatingOffset: { ...offset, [ side ]: val || '' } } );

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
			<SgsLengthControl
				label={ __( 'Distance from the right edge', 'sgs-blocks' ) }
				help={ __( 'Empty keeps the default (24px).', 'sgs-blocks' ) }
				value={ offset.right || '' }
				onChange={ ( val ) => setOffset( 'right', val ) }
				presets={ false }
			/>
			<SgsLengthControl
				label={ __( 'Distance from the bottom edge', 'sgs-blocks' ) }
				help={ __( 'Empty keeps the default (24px).', 'sgs-blocks' ) }
				value={ offset.bottom || '' }
				onChange={ ( val ) => setOffset( 'bottom', val ) }
				presets={ false }
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
