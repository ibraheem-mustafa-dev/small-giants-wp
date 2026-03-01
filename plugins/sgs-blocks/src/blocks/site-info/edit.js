/**
 * SGS Site Info — Block Editor UI.
 *
 * Shows a live server-side preview of the selected info type.
 * All data comes from Appearance → Customise → SGS Site Info, so the
 * preview reflects whatever the site admin has entered there.
 *
 * @package SGS\Blocks
 *
 * @since 1.0.0
 */

import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	ToggleControl,
} from '@wordpress/components';
import ServerSideRender from '@wordpress/server-side-render';

/** Human-readable labels for each info type. */
const TYPE_OPTIONS = [
	{ label: __( 'Phone Number', 'sgs-blocks' ),   value: 'phone'     },
	{ label: __( 'Email Address', 'sgs-blocks' ),  value: 'email'     },
	{ label: __( 'Postal Address', 'sgs-blocks' ), value: 'address'   },
	{ label: __( 'Social Links', 'sgs-blocks' ),   value: 'social'    },
	{ label: __( 'Copyright Notice', 'sgs-blocks' ), value: 'copyright' },
	{ label: __( 'Map Embed', 'sgs-blocks' ),      value: 'map'       },
];

const ICON_SIZE_OPTIONS = [
	{ label: __( 'Small', 'sgs-blocks' ),  value: 'small'  },
	{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Large', 'sgs-blocks' ),  value: 'large'  },
];

/**
 * Edit component.
 *
 * @param {Object}   props               Block props provided by the editor.
 * @param {Object}   props.attributes    Block attribute values.
 * @param {Function} props.setAttributes Setter for block attributes.
 *
 * @return {JSX.Element} Editor UI.
 */
export default function Edit( { attributes, setAttributes } ) {
	const { type, showIcon, iconSize, linkPhone, linkEmail } = attributes;
	const blockProps = useBlockProps();

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Info Type', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Display', 'sgs-blocks' ) }
						help={ __(
							'Choose which piece of site info to output. Values come from Appearance → Customise → SGS Site Info.',
							'sgs-blocks'
						) }
						value={ type }
						options={ TYPE_OPTIONS }
						onChange={ ( val ) => setAttributes( { type: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ ( 'phone' === type || 'email' === type || 'address' === type ) && (
					<PanelBody title={ __( 'Display Options', 'sgs-blocks' ) } initialOpen={ false }>
						<ToggleControl
							label={ __( 'Show Icon', 'sgs-blocks' ) }
							checked={ showIcon }
							onChange={ ( val ) => setAttributes( { showIcon: val } ) }
						/>
						{ showIcon && (
							<SelectControl
								label={ __( 'Icon Size', 'sgs-blocks' ) }
								value={ iconSize }
								options={ ICON_SIZE_OPTIONS }
								onChange={ ( val ) => setAttributes( { iconSize: val } ) }
								__nextHasNoMarginBottom
							/>
						) }
						{ 'phone' === type && (
							<ToggleControl
								label={ __( 'Link Phone Number (tel:)', 'sgs-blocks' ) }
								checked={ linkPhone }
								onChange={ ( val ) => setAttributes( { linkPhone: val } ) }
							/>
						) }
						{ 'email' === type && (
							<ToggleControl
								label={ __( 'Link Email Address (mailto:)', 'sgs-blocks' ) }
								checked={ linkEmail }
								onChange={ ( val ) => setAttributes( { linkEmail: val } ) }
							/>
						) }
					</PanelBody>
				) }
			</InspectorControls>

			<div { ...blockProps }>
				<ServerSideRender
					block="sgs/site-info"
					attributes={ attributes }
				/>
			</div>
		</>
	);
}
