/**
 * SGS Option Picker — sub-label term-meta control.
 *
 * A second caption line under each option's name (e.g. a frame size's
 * "52 ▫ 18  140" eye/bridge/temple measurement) is sourced from a
 * client-chosen WooCommerce attribute term-meta key, read at render time by
 * render.php via sgs_option_picker_resolve_sub_label() (sub-label-support.php).
 * Default '' = off, so every existing site renders unchanged.
 *
 * Kept in its own file: edit.js is already well past this block's 250-line
 * JS budget, so new logic goes in a new file rather than growing it further
 * (Wave B shared brief rule 13).
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl } from '@wordpress/components';

export default function SubLabelPanel( { attributes, setAttributes } ) {
	return (
		<PanelBody title={ __( 'Sub-label', 'sgs-blocks' ) } initialOpen={ false }>
			<TextControl
				label={ __( 'Sub-label term-meta key', 'sgs-blocks' ) }
				help={ __(
					'Optional. The name of a WooCommerce attribute term-meta field (e.g. a size term’s frame measurements) shown as a second line under each option’s label. Leave blank to show only the label. The values live on the term and are invisible here in the editor — check the frontend after saving.',
					'sgs-blocks'
				) }
				value={ attributes.subLabelMetaKey || '' }
				onChange={ ( val ) => setAttributes( { subLabelMetaKey: val } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
		</PanelBody>
	);
}
