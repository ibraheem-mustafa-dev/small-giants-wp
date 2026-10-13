/**
 * Gallery border and radius control: the grid wrapper's (no prefix) or each item tile's (prefix 'tile').
 * The attribute names are written out per target (never built from the prefix) so the inspector scan and
 * the wiring checks can see which control writes which attribute.
 */
import { __ } from '@wordpress/i18n';
import { SgsBorderControl } from '../../../components';

// Attribute names per target, as render.php (grid) and render-tile.php (tile) read them.
const NAMES = {
	'': {
		BorderWidth: 'borderWidth',
		BorderStyle: 'borderStyle',
		BorderColour: 'borderColour',
		BorderColourGradient: 'borderColourGradient',
		BorderRadius: 'borderRadius',
	},
	tile: {
		BorderWidth: 'tileBorderWidth',
		BorderStyle: 'tileBorderStyle',
		BorderColour: 'tileBorderColour',
		BorderColourGradient: 'tileBorderColourGradient',
		BorderRadius: 'tileBorderRadius',
	},
};

export default function GalleryBorderControl( { attributes, setAttributes, prefix = '' } ) {
	const key = ( part ) => NAMES[ prefix ][ part ];
	const radius = attributes[ key( 'BorderRadius' ) ];

	return (
		<>
					{ /* Border + radius — collapsed into this same Layout family panel
					   (was a standalone "Border" PanelBody further down; border is a
					   box-shape property of the same `grid` wrapper element). */ }
					<SgsBorderControl
						widthValues={ attributes[ key( 'BorderWidth' ) ] ?? {} }
						onWidthChange={ ( next ) => setAttributes( { [ key( 'BorderWidth' ) ]: next } ) }
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ attributes[ key( 'BorderStyle' ) ] }
						onStyleChange={ ( val ) => setAttributes( { [ key( 'BorderStyle' ) ]: val } ) }
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourValue={ attributes[ key( 'BorderColour' ) ] }
						onColourChange={ ( val ) => setAttributes( { [ key( 'BorderColour' ) ]: val ?? '' } ) }
						colourGradientValue={ attributes[ key( 'BorderColourGradient' ) ] }
						onColourGradientChange={ ( val ) => setAttributes( { [ key( 'BorderColourGradient' ) ]: val ?? '' } ) }
						colourLinked={ true }
						radiusValues={ {
								base: radius?.desktop ?? {},
								tablet: radius?.tablet ?? {},
								mobile: radius?.mobile ?? {},
							} }
						onRadiusChange={ ( tier, next ) => {
							const tierKey = tier === 'base' ? 'desktop' : tier;
							setAttributes( { [ key( 'BorderRadius' ) ]: { ...radius, [ tierKey ]: next } } );
						} }
					/>
		</>
	);
}
