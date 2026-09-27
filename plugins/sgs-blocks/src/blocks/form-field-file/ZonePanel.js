/**
 * The upload field's drop-zone look: a dashed drop zone (default) or a plain
 * panel holding the help line and a "Choose file" button (render.php,
 * form/style.css `.sgs-form-field__file-zone--panel`).
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl, TextControl } from '@wordpress/components';

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes (zoneStyle, buttonLabel).
 * @param {Function} props.setAttributes Block attribute setter.
 * @return {JSX.Element} The panel.
 */
export default function ZonePanel( { attributes, setAttributes } ) {
	const isPanel = 'panel' === attributes.zoneStyle;
	return (
		<PanelBody title={ __( 'Drop zone', 'sgs-blocks' ) } initialOpen={ false }>
			<SelectControl
				label={ __( 'Look', 'sgs-blocks' ) }
				value={ attributes.zoneStyle || 'dashed' }
				options={ [
					{ label: __( 'Dashed drop zone', 'sgs-blocks' ), value: 'dashed' },
					{ label: __( 'Panel with a Choose file button', 'sgs-blocks' ), value: 'panel' },
				] }
				onChange={ ( zoneStyle ) => setAttributes( { zoneStyle } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ isPanel && (
				<TextControl
					label={ __( 'Button text', 'sgs-blocks' ) }
					value={ attributes.buttonLabel || '' }
					placeholder={ __( 'Choose file', 'sgs-blocks' ) }
					onChange={ ( buttonLabel ) => setAttributes( { buttonLabel } ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
		</PanelBody>
	);
}
