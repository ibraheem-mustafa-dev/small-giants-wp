/**
 * The paint a Floating layer adds to its own box beyond the media panels: the fill colour or gradient, and a gradient
 * ring for the border. Border width, style, colour, corners, shape and shadow are the media panels' (`layerBorder*`,
 * `layerRadius`, `layerShape`, `layerBoxShadow*`). render.php reads the fill and the ring through the shared fill and
 * border assemblers, and `layer-preview.js::layerBoxPreview` reads them in the canvas.
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import { Button, PanelBody } from '@wordpress/components';
import { SgsColourPanel, fillRow, SgsGradientPicker } from '../../components';

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block `setAttributes`.
 * @return {JSX.Element} The fill row and the Border gradient panel.
 */
export default function LayerBoxPanels( { attributes, setAttributes } ) {
	const ring = attributes.layerBorderColourGradient || '';

	return (
		<>
			<SgsColourPanel
				rows={ [
					fillRow( {
						key: 'background',
						label: __( 'Fill colour', 'sgs-blocks' ),
						attrs: {
							base: 'layerBackground',
							gradient: 'backgroundColourGradient',
						},
						attributes,
						setAttributes,
					} ),
				] }
			/>
			<InspectorControls group="styles">
				<PanelBody title={ __( 'Border gradient', 'sgs-blocks' ) } initialOpen={ false }>
					<p className="components-base-control__help">
						{ __( 'Draws the border as a gradient ring. Set a border width first. It paints on a layer that holds blocks or has no picture; on a picture alone, the Border colour applies.', 'sgs-blocks' ) }
					</p>
					<SgsGradientPicker
						value={ ring || undefined }
						onChange={ ( value ) => setAttributes( { layerBorderColourGradient: value || '' } ) }
					/>
					{ '' !== ring && (
						<Button
							variant="link"
							isDestructive
							onClick={ () => setAttributes( { layerBorderColourGradient: '' } ) }
						>
							{ __( 'Clear the gradient', 'sgs-blocks' ) }
						</Button>
					) }
				</PanelBody>
			</InspectorControls>
		</>
	);
}
