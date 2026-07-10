import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	RichText,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	TextareaControl,
	ToggleControl,
} from '@wordpress/components';
import {
	DesignTokenPicker,
	TypographyControls,
	ResponsiveBoxControl,
	ResponsiveBorderRadiusControl,
} from '../../components';
import { colourVar } from '../../utils';

const VARIANT_OPTIONS = [
	{ label: __( 'Inline button', 'sgs-blocks' ), value: 'inline' },
	{ label: __( 'Floating button', 'sgs-blocks' ), value: 'floating' },
	{ label: __( 'Banner', 'sgs-blocks' ), value: 'banner' },
];

// Box-object interface contract §1/§5: build an editor-preview shorthand from
// a box object — mirrors render.php's box-shorthand builders so the canvas
// preview matches the frontend (contract §5). Only BASE tier previews here —
// tablet/mobile tiers live in render.php's <style> media queries, which the
// editor canvas never executes for a dynamic block (matches sgs/heading).
function boxShorthand( box, keys ) {
	if ( ! box || 'object' !== typeof box ) return undefined;
	if ( ! keys.some( ( key ) => box[ key ] ) ) return undefined;
	return keys.map( ( key ) => box[ key ] || '0' ).join( ' ' );
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		style,
		phoneNumber,
		message,
		variant,
		label,
		showOnMobile,
		showOnDesktop,
		labelColour,
		backgroundColour,
		paddingTablet,
		paddingMobile,
		marginTablet,
		marginMobile,
		borderRadiusTablet,
		borderRadiusMobile,
	} = attributes;

	// Root-element preview style (contract §B3: the button element IS the
	// block root — no wrapper div). Colour/background mirror the scoped
	// button rule; padding/margin/border-radius mirror the scoped box rule.
	const rootStyle = {
		color: colourVar( labelColour ) || undefined,
		backgroundColor: colourVar( backgroundColour ) || undefined,
	};
	const paddingPreview = boxShorthand( style?.spacing?.padding, [ 'top', 'right', 'bottom', 'left' ] );
	if ( paddingPreview ) {
		rootStyle.padding = paddingPreview;
	}
	const marginPreview = boxShorthand( style?.spacing?.margin, [ 'top', 'right', 'bottom', 'left' ] );
	if ( marginPreview ) {
		rootStyle.margin = marginPreview;
	}
	const radiusPreview = boxShorthand( style?.border?.radius, [ 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' ] );
	if ( radiusPreview ) {
		rootStyle.borderRadius = radiusPreview;
	}

	const rootClassName = [
		'sgs-whatsapp-cta',
		`sgs-whatsapp-cta--${ variant }`,
		'sgs-whatsapp-cta__btn',
	].join( ' ' );

	const blockProps = useBlockProps( {
		className: rootClassName,
		style: rootStyle,
	} );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'WhatsApp Settings', 'sgs-blocks' ) }>
					<TextControl
						label={ __( 'Phone number', 'sgs-blocks' ) }
						help={ __(
							'International format without + or spaces (e.g. 447700900000)',
							'sgs-blocks'
						) }
						value={ phoneNumber || '' }
						onChange={ ( val ) =>
							setAttributes( { phoneNumber: val } )
						}
						type="tel"
						__nextHasNoMarginBottom
					/>
					<TextareaControl
						label={ __(
							'Pre-filled message',
							'sgs-blocks'
						) }
						value={ message || '' }
						onChange={ ( val ) =>
							setAttributes( { message: val } )
						}
						rows={ 2 }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Variant', 'sgs-blocks' ) }
						value={ variant }
						options={ VARIANT_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { variant: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Visibility', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __( 'Show on mobile', 'sgs-blocks' ) }
						checked={ showOnMobile }
						onChange={ ( val ) =>
							setAttributes( { showOnMobile: val } )
						}
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Show on desktop', 'sgs-blocks' ) }
						checked={ showOnDesktop }
						onChange={ ( val ) =>
							setAttributes( { showOnDesktop: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Styling', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Text colour', 'sgs-blocks' ) }
						value={ labelColour }
						onChange={ ( val ) =>
							setAttributes( { labelColour: val } )
						}
					/>
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix="label"
						showLineHeight={ false }
					/>
					<DesignTokenPicker
						label={ __(
							'Background colour',
							'sgs-blocks'
						) }
						value={ backgroundColour }
						onChange={ ( val ) =>
							setAttributes( { backgroundColour: val } )
						}
					/>
				</PanelBody>

				{ /* ── Spacing panel ── Box-object interface contract §B/§E:
				   padding/margin base routes to WP-native style.spacing.*
				   (skip-serialised → scoped, not inline); tiers are the
				   paddingTablet/paddingMobile + marginTablet/marginMobile
				   object attrs. */ }
				<PanelBody
					title={ __( 'Spacing', 'sgs-blocks' ) }
					initialOpen={ false }
				>
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

				{ /* ── Border panel ── border-radius routes to WP-native
				   style.border.radius (base, skip-serialised → scoped) plus
				   the borderRadiusTablet/borderRadiusMobile tier attrs. */ }
				<PanelBody
					title={ __( 'Border', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ResponsiveBorderRadiusControl
						label={ __( 'Border radius', 'sgs-blocks' ) }
						values={ {
							base: style?.border?.radius ?? {},
							tablet: borderRadiusTablet ?? {},
							mobile: borderRadiusMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( 'base' === tier ) {
								setAttributes( { style: { ...style, border: { ...style?.border, radius: next } } } );
							} else {
								setAttributes( { [ `borderRadius${ 'tablet' === tier ? 'Tablet' : 'Mobile' }` ]: next } );
							}
						} }
					/>
				</PanelBody>
			</InspectorControls>

			{ /* ── Canvas ── contract §B3: no wrapper div. The button preview
			   element IS the block root (an <a> on the frontend; a <span>
			   here since the editor canvas must not be a real navigable
			   link). The "no phone number" warning is a sibling — it mirrors
			   render.php's early `return;` (nothing renders on the frontend
			   when unset), so it has no frontend equivalent to match. ── */ }
			<span { ...blockProps }>
				<svg
					className="sgs-whatsapp-cta__icon"
					viewBox="0 0 24 24"
					width="24"
					height="24"
					fill="currentColor"
					aria-hidden="true"
				>
					<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
				</svg>
				{ variant !== 'floating' ? (
					<RichText
						tagName="span"
						className="sgs-whatsapp-cta__label"
						value={ label }
						onChange={ ( val ) =>
							setAttributes( { label: val } )
						}
						placeholder={ __(
							'Chat on WhatsApp',
							'sgs-blocks'
						) }
					/>
				) : (
					<span className="sgs-whatsapp-cta__label sgs-sr-only">
						{ label ||
							__( 'Chat on WhatsApp', 'sgs-blocks' ) }
					</span>
				) }
			</span>

			{ ! phoneNumber && (
				<p className="sgs-whatsapp-cta__warning">
					{ __(
						'Set a phone number in the sidebar.',
						'sgs-blocks'
					) }
				</p>
			) }
		</>
	);
}
