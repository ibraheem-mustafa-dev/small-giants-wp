/**
 * Business Info Block — Editor Component
 *
 * Uses ServerSideRender to display a live preview of what the render.php
 * will produce. Inspector controls choose which type of information to
 * display and configure link / icon behaviour.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl, ToggleControl, Notice } from '@wordpress/components';
import ServerSideRender from '@wordpress/server-side-render';
import { ResponsiveBoxControl } from '../../components';

/** Labels for the type selector drop-down. */
const TYPE_OPTIONS = [
	{ label: __( 'Phone Number', 'sgs-blocks' ),     value: 'phone'       },
	{ label: __( 'Email Address', 'sgs-blocks' ),    value: 'email'       },
	{ label: __( 'Postal Address', 'sgs-blocks' ),   value: 'address'     },
	{ label: __( 'Opening Hours', 'sgs-blocks' ),    value: 'hours'       },
	{ label: __( 'Social Media Links', 'sgs-blocks' ), value: 'socials'   },
	{ label: __( 'Copyright Notice', 'sgs-blocks' ), value: 'copyright'   },
	{ label: __( 'Tagline / Description', 'sgs-blocks' ), value: 'description' },
	{ label: __( 'Google Maps Embed', 'sgs-blocks' ), value: 'map'        },
];

/** Types that support the showIcon toggle. */
const ICON_TYPES = new Set( [ 'phone', 'email', 'address' ] );

/** Types that expose link toggles. */
const LINK_PHONE_TYPES = new Set( [ 'phone' ] );
const LINK_EMAIL_TYPES = new Set( [ 'email' ] );

export default function Edit( { attributes, setAttributes } ) {
	const {
		displayType,
		showIcon,
		linkPhone,
		linkEmail,
		style,
		paddingTablet,
		paddingMobile,
		marginTablet,
		marginMobile,
	} = attributes;

	const blockProps = useBlockProps( {
		className: `sgs-business-info-wrap sgs-business-info-wrap--${ displayType }`,
	} );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Display Type', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'What to display', 'sgs-blocks' ) }
						value={ displayType }
						options={ TYPE_OPTIONS }
						onChange={ ( val ) => setAttributes( { displayType: val } ) }
						__nextHasNoMarginBottom
					/>
					<Notice
						isDismissible={ false }
						status="info"
						style={ { marginTop: '12px' } }
					>
						{ __( 'Edit this site’s business data at Appearance → SGS Site Info.', 'sgs-blocks' ) }
					</Notice>
				</PanelBody>

				{ ICON_TYPES.has( displayType ) && (
					<PanelBody title={ __( 'Display Options', 'sgs-blocks' ) } initialOpen={ false }>
						<ToggleControl
							label={ __( 'Show icon', 'sgs-blocks' ) }
							checked={ showIcon }
							onChange={ ( val ) => setAttributes( { showIcon: val } ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				) }

				{ ( LINK_PHONE_TYPES.has( displayType ) || LINK_EMAIL_TYPES.has( displayType ) ) && (
					<PanelBody title={ __( 'Link Options', 'sgs-blocks' ) } initialOpen={ false }>
						{ LINK_PHONE_TYPES.has( displayType ) && (
							<ToggleControl
								label={ __( 'Make phone number clickable', 'sgs-blocks' ) }
								checked={ linkPhone }
								onChange={ ( val ) => setAttributes( { linkPhone: val } ) }
								__nextHasNoMarginBottom
							/>
						) }
						{ LINK_EMAIL_TYPES.has( displayType ) && (
							<ToggleControl
								label={ __( 'Make email address clickable', 'sgs-blocks' ) }
								checked={ linkEmail }
								onChange={ ( val ) => setAttributes( { linkEmail: val } ) }
								__nextHasNoMarginBottom
							/>
						) }
					</PanelBody>
				) }

				{ /* ── Spacing panel ── Box-object interface contract §B: padding/margin
				   base routes to WP-native style.spacing.* (skip-serialised in block.json
				   so it serialises scoped, not inline — mirrors sgs/heading); tiers are the
				   paddingTablet/paddingMobile + marginTablet/marginMobile object attrs. */ }
				<PanelBody title={ __( 'Spacing', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						values={ {
							base: style?.spacing?.padding ?? {},
							tablet: paddingTablet ?? {},
							mobile: paddingMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( 'base' === tier ) {
								setAttributes( { style: { ...style, spacing: { ...style?.spacing, padding: next } } } );
							} else {
								setAttributes( { [ `padding${ 'tablet' === tier ? 'Tablet' : 'Mobile' }` ]: next } );
							}
						} }
					/>
					<ResponsiveBoxControl
						label={ __( 'Margin', 'sgs-blocks' ) }
						values={ {
							base: style?.spacing?.margin ?? {},
							tablet: marginTablet ?? {},
							mobile: marginMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( 'base' === tier ) {
								setAttributes( { style: { ...style, spacing: { ...style?.spacing, margin: next } } } );
							} else {
								setAttributes( { [ `margin${ 'tablet' === tier ? 'Tablet' : 'Mobile' }` ]: next } );
							}
						} }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<ServerSideRender
					block="sgs/business-info"
					attributes={ attributes }
				/>
			</div>
		</>
	);
}
