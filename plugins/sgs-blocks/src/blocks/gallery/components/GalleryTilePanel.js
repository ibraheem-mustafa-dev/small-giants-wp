/**
 * Gallery Styles-tab "Item tile" panel: each item's box (border, radius, height, padding, fit).
 * The tile fill lives in the block's colour panel (tile-preview.js::tileColourRow).
 */
import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';
import { ResponsiveBoxControl, ResponsiveLengthControl } from '../../../components';
import { patchTier } from '../../../utils';
import GalleryBorderControl from './GalleryBorderControl';

export default function GalleryTilePanel( { attributes, setAttributes } ) {
	const { tileMinHeight, tilePadding } = attributes;

	return (
		<PanelBody title={ __( 'Item tile', 'sgs-blocks' ) } initialOpen={ false }>
			<ResponsiveLengthControl
				label={ __( 'Tile height', 'sgs-blocks' ) }
				help={ __(
					'Gives every tile this height in place of the aspect ratio, with the image laid inside it. Leave empty to keep the aspect ratio.',
					'sgs-blocks'
				) }
				value={ tileMinHeight }
				onChange={ ( next ) => setAttributes( { tileMinHeight: next } ) }
			/>
			<ResponsiveBoxControl
				label={ __( 'Tile padding', 'sgs-blocks' ) }
				presets
				values={ {
					base: tilePadding?.desktop ?? {},
					tablet: tilePadding?.tablet ?? {},
					mobile: tilePadding?.mobile ?? {},
				} }
				onChange={ ( tier, next ) => {
					const tierMap = { base: 'desktop', tablet: 'tablet', mobile: 'mobile' };
					patchTier( attributes, setAttributes, 'tilePadding', tierMap[ tier ], next );
				} }
			/>
			<GalleryBorderControl attributes={ attributes } setAttributes={ setAttributes } prefix="tile" />
		</PanelBody>
	);
}
