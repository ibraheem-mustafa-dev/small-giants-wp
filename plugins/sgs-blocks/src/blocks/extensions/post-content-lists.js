/**
 * "Lists" extension for the core Post Content block.
 *
 * Adds three attributes to `core/post-content` ONLY, so the lists inside a product (or page)
 * description can be sized, coloured and spaced from the inspector:
 * - `sgsListFontSize` ({desktop,tablet,mobile} lengths): the font size of each list item.
 * - `sgsListTextColour` (a palette slug or any CSS colour): the text colour of each list item.
 * - `sgsListGap` ({desktop,tablet,mobile} lengths): the space between list items, read by the
 *   theme's "Plain lists" block style through `--sgs-plain-list-gap`.
 * Every default is empty, which changes nothing; set values are painted on the frontend by
 * includes/post-content-lists.php as scoped rules.
 *
 * @package SGS\Blocks
 */
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { InspectorControls, useSettings } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import ResponsiveOverride from '../../components/ResponsiveOverride';
import SgsLengthControl from '../../components/SgsLengthControl';
import DesignTokenPicker, { resolveColourToken } from '../../components/DesignTokenPicker';
import { resolveResponsiveTier } from '../../utils/responsive';
import { usePreviewTier } from '../../utils/usePreviewTier';
import './post-content-lists.scss';

/** Only the core Post Content block carries these controls. */
const TARGET_BLOCK_NAME = 'core/post-content';

const LIST_UNITS = [
	{ value: 'px', label: 'px' },
	{ value: 'rem', label: 'rem' },
	{ value: 'em', label: 'em' },
];

/** Guard against double registration (a CJS + ESM double-load would register every filter twice). */
if ( ! window.__sgsPostContentListsRegistered ) {
	window.__sgsPostContentListsRegistered = true;

	addFilter(
		'blocks.registerBlockType',
		'sgs/post-content-lists/attributes',
		( settings, name ) => {
			if ( TARGET_BLOCK_NAME !== name ) {
				return settings;
			}
			return {
				...settings,
				attributes: {
					...settings.attributes,
					sgsListFontSize: { type: 'object', default: {} },
					sgsListTextColour: { type: 'string', default: '' },
					sgsListGap: { type: 'object', default: {} },
				},
			};
		}
	);

	const withListsControl = createHigherOrderComponent(
		( BlockEdit ) => ( props ) => {
			if ( TARGET_BLOCK_NAME !== props.name ) {
				return <BlockEdit { ...props } />;
			}
			const { attributes, setAttributes } = props;
			return (
				<>
					<BlockEdit { ...props } />
					<InspectorControls group="styles">
						<PanelBody title={ __( 'Lists', 'sgs-blocks' ) } initialOpen={ false }>
							<ResponsiveOverride
								label={ __( 'List text size', 'sgs-blocks' ) }
								value={ attributes.sgsListFontSize }
								onChange={ ( obj ) => setAttributes( { sgsListFontSize: obj } ) }
							>
								{ ( { tier, ownValue, setOwnValue } ) => (
									<SgsLengthControl
										label={ __( 'List text size', 'sgs-blocks' ) }
										hideLabelFromVision
										scale="font-size"
										value={ ownValue }
										placeholder={
											ownValue
												? undefined
												: resolveResponsiveTier( attributes.sgsListFontSize || {}, tier ).value || ''
										}
										units={ LIST_UNITS }
										onChange={ setOwnValue }
										help={ __( 'The text size of each list item. Leave empty to keep the theme size. Clear a value to reset it.', 'sgs-blocks' ) }
									/>
								) }
							</ResponsiveOverride>
							<DesignTokenPicker
								linked
								clearable
								label={ __( 'List text colour', 'sgs-blocks' ) }
								help={ __( 'The text colour of each list item. Leave empty to keep the theme colour.', 'sgs-blocks' ) }
								states={ [
									{
										key: 'normal',
										label: __( 'Normal', 'sgs-blocks' ),
										value: attributes.sgsListTextColour || '',
										onChange: ( picked ) => setAttributes( { sgsListTextColour: picked || '' } ),
										linked: true,
									},
								] }
							/>
							<ResponsiveOverride
								label={ __( 'Space between list items', 'sgs-blocks' ) }
								value={ attributes.sgsListGap }
								onChange={ ( obj ) => setAttributes( { sgsListGap: obj } ) }
							>
								{ ( { tier, ownValue, setOwnValue } ) => (
									<SgsLengthControl
										label={ __( 'Space between list items', 'sgs-blocks' ) }
										hideLabelFromVision
										value={ ownValue }
										placeholder={
											ownValue
												? undefined
												: resolveResponsiveTier( attributes.sgsListGap || {}, tier ).value || ''
										}
										units={ LIST_UNITS }
										onChange={ setOwnValue }
										help={ __( 'Only applies when the "Plain lists" block style is chosen. Leave empty to keep the theme spacing. Clear a value to reset it.', 'sgs-blocks' ) }
									/>
								) }
							</ResponsiveOverride>
						</PanelBody>
					</InspectorControls>
				</>
			);
		},
		'withListsControl'
	);

	addFilter( 'editor.BlockEdit', 'sgs/post-content-lists/controls', withListsControl );

	/**
	 * Editor preview: the three values for the tier the canvas previews, as the custom properties
	 * post-content-lists.scss reads (custom properties only: Spec 32 forbids inline declarations;
	 * the front end gets its scoped rules from includes/post-content-lists.php).
	 */
	const withListsPreview = createHigherOrderComponent( ( BlockListBlock ) => ( props ) => {
		const tier = usePreviewTier();
		const [ palette ] = useSettings( 'color.palette' );
		const { attributes, name } = props;
		if ( TARGET_BLOCK_NAME !== name || ! attributes ) {
			return <BlockListBlock { ...props } />;
		}
		const size = resolveResponsiveTier( attributes.sgsListFontSize || {}, tier ).value;
		const gap = resolveResponsiveTier( attributes.sgsListGap || {}, tier ).value;
		const colour = resolveColourToken( attributes.sgsListTextColour, palette );
		if ( ! size && ! gap && ! colour ) {
			return <BlockListBlock { ...props } />;
		}
		const vars = {};
		if ( size ) {
			vars[ '--sgs-list-preview-size' ] = size;
		}
		if ( colour ) {
			vars[ '--sgs-list-preview-colour' ] = colour;
		}
		if ( gap ) {
			vars[ '--sgs-plain-list-gap' ] = gap;
		}
		const wrapperProps = {
			...( props.wrapperProps || {} ),
			className: [ props.wrapperProps?.className, 'sgs-post-content-lists-preview' ].filter( Boolean ).join( ' ' ),
			style: { ...( props.wrapperProps?.style || {} ), ...vars },
		};
		return <BlockListBlock { ...props } wrapperProps={ wrapperProps } />;
	}, 'withListsPreview' );

	addFilter( 'editor.BlockListBlock', 'sgs/post-content-lists/preview', withListsPreview );
} // end guard: window.__sgsPostContentListsRegistered
