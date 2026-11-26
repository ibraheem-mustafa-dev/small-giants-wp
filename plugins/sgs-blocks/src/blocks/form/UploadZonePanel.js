/**
 * The upload zone's box and icon holder: border width, style and corners, padding, the gap between its parts, and the
 * icon holder's size, drawing size and corners. The zone's and the icon's colours are rows in the form's Colours
 * panel. render.php prints these on every upload field of the form.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';

import {
	ResponsiveLengthControl,
	ResponsiveBoxControl,
	ResponsiveBorderRadiusControl,
	SgsBorderControl,
} from '../../components';
import SgsResetPanel from '../../components/SgsResetPanel';

const hasKeys = ( value ) => Object.keys( value ?? {} ).length > 0;

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Form attributes (fileLabel* and fileIcon* settings).
 * @param {Function} props.setAttributes Form attribute setter.
 * @return {JSX.Element} The panel.
 */
export default function UploadZonePanel( { attributes, setAttributes } ) {
	const writeTier = ( name ) => ( tier, next ) => {
		const key = 'base' === tier ? 'desktop' : tier;
		setAttributes( {
			[ name ]: { ...( attributes[ name ] ?? {} ), [ key ]: next },
		} );
	};
	const tiers = ( value ) => ( {
		base: value?.desktop ?? {},
		tablet: value?.tablet ?? {},
		mobile: value?.mobile ?? {},
	} );
	return (
		<PanelBody
			title={ __( 'Upload zone', 'sgs-blocks' ) }
			initialOpen={ false }
		>
			<SgsBorderControl
				showColour={ false }
				widthValues={ attributes.fileLabelBorderWidth ?? {} }
				onWidthChange={ ( next ) =>
					setAttributes( { fileLabelBorderWidth: next } )
				}
				widthPresets={ [ '10', '20', '30' ] }
				styleValue={ attributes.fileLabelBorderStyle }
				onStyleChange={ ( val ) =>
					setAttributes( { fileLabelBorderStyle: val } )
				}
				radiusValues={ tiers( attributes.fileLabelBorderRadius ) }
				onRadiusChange={ writeTier( 'fileLabelBorderRadius' ) }
			/>
			<SgsResetPanel
				title={ __( 'Upload zone spacing', 'sgs-blocks' ) }
				items={ [
					{
						hasValue: () =>
							hasKeys( attributes.fileLabelPadding?.desktop ) ||
							hasKeys( attributes.fileLabelPadding?.tablet ) ||
							hasKeys( attributes.fileLabelPadding?.mobile ),
						onDeselect: () =>
							setAttributes( {
								fileLabelPadding: { desktop: {} },
							} ),
					},
					{
						hasValue: () => hasKeys( attributes.fileLabelGap ),
						onDeselect: () => setAttributes( { fileLabelGap: {} } ),
					},
				] }
				resetAll={ () =>
					setAttributes( {
						fileLabelPadding: { desktop: {} },
						fileLabelGap: {},
					} )
				}
				nested
			>
				<ResponsiveBoxControl
					label={ __( 'Zone padding', 'sgs-blocks' ) }
					presets
					values={ tiers( attributes.fileLabelPadding ) }
					onChange={ writeTier( 'fileLabelPadding' ) }
				/>

				<ResponsiveLengthControl
					label={ __( 'Space between parts', 'sgs-blocks' ) }
					value={ attributes.fileLabelGap }
					onChange={ ( next ) =>
						setAttributes( { fileLabelGap: next } )
					}
				/>
			</SgsResetPanel>
			<SgsResetPanel
				title={ __( 'Upload zone icon holder', 'sgs-blocks' ) }
				items={ [
					{
						hasValue: () => hasKeys( attributes.fileIconBoxSize ),
						onDeselect: () =>
							setAttributes( { fileIconBoxSize: {} } ),
					},
					{
						hasValue: () => hasKeys( attributes.fileIconSize ),
						onDeselect: () => setAttributes( { fileIconSize: {} } ),
					},
					{
						hasValue: () =>
							hasKeys( attributes.fileIconRadius?.desktop ) ||
							hasKeys( attributes.fileIconRadius?.tablet ) ||
							hasKeys( attributes.fileIconRadius?.mobile ),
						onDeselect: () =>
							setAttributes( {
								fileIconRadius: { desktop: {} },
							} ),
					},
				] }
				resetAll={ () =>
					setAttributes( {
						fileIconBoxSize: {},
						fileIconSize: {},
						fileIconRadius: { desktop: {} },
					} )
				}
				nested
			>
				<ResponsiveLengthControl
					label={ __( 'Holder size', 'sgs-blocks' ) }
					value={ attributes.fileIconBoxSize }
					onChange={ ( next ) =>
						setAttributes( { fileIconBoxSize: next } )
					}
				/>

				<ResponsiveLengthControl
					label={ __( 'Icon size', 'sgs-blocks' ) }
					value={ attributes.fileIconSize }
					onChange={ ( next ) =>
						setAttributes( { fileIconSize: next } )
					}
				/>

				<ResponsiveBorderRadiusControl
					label={ __( 'Holder corners', 'sgs-blocks' ) }
					values={ tiers( attributes.fileIconRadius ) }
					onChange={ writeTier( 'fileIconRadius' ) }
				/>
			</SgsResetPanel>
		</PanelBody>
	);
}
