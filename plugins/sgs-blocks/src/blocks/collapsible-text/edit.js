/**
 * SGS Collapsible Text — editor component.
 *
 * Renders a full (uncollapsed) RichText in the editor so the operator can see
 * and edit all copy. Collapse behaviour is frontend-only (render.php).
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	RichText,
	useSettings,
} from '@wordpress/block-editor';
import {
	PanelBody,
	ToggleControl,
	RangeControl,
} from '@wordpress/components';
import { TypographyControls, ResponsiveBoxControl, SgsColourPanel, fillRow } from '../../components';
import { textPaintPreview } from '../../utils';

export default function Edit( { attributes, setAttributes } ) {
	const { text, collapsible, collapsedLines, style, paddingTablet, paddingMobile, marginTablet, marginMobile, backgroundColour, textColour, textColourGradient } = attributes;

	const blockProps = useBlockProps( {
		className: 'sgs-collapsible-text',
	} );

	// D288/D636 pattern (mirrors sgs/container): render.php scopes textColour/
	// textColourGradient to `.sgs-collapsible-text__body` (block.json's `body`
	// element attrMap css:color/css:background-image), not the root wrapper —
	// so the preview belongs on the RichText element below, not on blockProps.
	const [ colourPalette ] = useSettings( 'color.palette' );

	return (
		<>
			<SgsColourPanel
				rows={ [
					fillRow( {
						key: 'background',
						label: __( 'Background colour', 'sgs-blocks' ),
						attrs: {
							base: 'backgroundColour',
							hover: 'backgroundColourHover',
							gradient: 'backgroundColourGradient',
							hoverGradient: 'backgroundColourHoverGradient',
						},
						attributes,
						setAttributes,
					} ),
					{
						key: 'text',
						label: __( 'Text colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: textColour,
								onChange: ( val ) =>
									setAttributes( { textColour: val ?? '' } ),
								linked: true,
								gradientValue: textColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { textColourGradient: val ?? '' } ),
							},
						],
					},
				] }
			/>
			<InspectorControls>
				<PanelBody title={ __( 'Collapsible Text Settings', 'sgs-blocks' ) }>
					<ToggleControl
						label={ __( 'Collapsible', 'sgs-blocks' ) }
						help={ __(
							'Adds a "Read more / Read less" toggle on the frontend. The full text is always in the HTML for search engines.',
							'sgs-blocks'
						) }
						checked={ !! collapsible }
						onChange={ ( val ) => setAttributes( { collapsible: val } ) }
						__nextHasNoMarginBottom
					/>
					{ collapsible && (
						<RangeControl
							label={ __( 'Collapsed line count', 'sgs-blocks' ) }
							help={ __(
								'Number of lines shown before the toggle. Minimum 1.',
								'sgs-blocks'
							) }
							value={ collapsedLines }
							onChange={ ( val ) => setAttributes( { collapsedLines: val } ) }
							min={ 1 }
							max={ 20 }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
				</PanelBody>
			</InspectorControls>

			{ /* ── Styles tab ─────────────────────────────────────────────── */ }
			<InspectorControls group="styles">
				<PanelBody title={ __( 'Typography', 'sgs-blocks' ) } initialOpen={ false }>
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix=""
					/>
				</PanelBody>
				<PanelBody title={ __( 'Spacing', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						presets
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
						presets
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

			{ /*
			 * When collapsible, preview the CSS line-clamp so the operator can see
			 * the effect of "Collapsed line count" — mirrors the frontend's
			 * collapsed state (style.css .is-collapsed, driven by the same
			 * --sgs-collapsible-text-collapsed-lines custom property view.js
			 * applies there). Still fully editable; line-clamp only clips the
			 * box visually, it never hides or locks the RichText.
			 */ }
			<div { ...blockProps }>
				<RichText
					tagName="div"
					className={ [
						'sgs-collapsible-text__body',
						collapsible ? 'is-collapsed' : '',
					]
						.filter( Boolean )
						.join( ' ' ) }
					style={ {
						...( collapsible && {
							'--sgs-collapsible-text-collapsed-lines':
								collapsedLines,
						} ),
						...textPaintPreview( textColour, textColourGradient, colourPalette ),
					} }
					multiline="p"
					value={ text }
					onChange={ ( val ) => setAttributes( { text: val } ) }
					placeholder={ __(
						'Add your copy here — describe the category or shop section for visitors.',
						'sgs-blocks'
					) }
					allowedFormats={ [
						'core/bold',
						'core/italic',
						'core/link',
						'core/strikethrough',
						'core/underline',
					] }
				/>
			</div>
		</>
	);
}
