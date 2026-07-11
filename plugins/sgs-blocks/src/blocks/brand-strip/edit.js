import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	ToggleControl,
	TextControl,
	Button,
} from '@wordpress/components';
import { DesignTokenPicker, ResponsiveBoxControl, ResponsiveBorderRadiusControl } from '../../components';
import MediaPicker from '../../components/MediaPicker';
import { colourVar } from '../../utils';

const HOVER_EFFECT_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Lift', 'sgs-blocks' ), value: 'lift' },
	{ label: __( 'Scale', 'sgs-blocks' ), value: 'scale' },
	{ label: __( 'Glow', 'sgs-blocks' ), value: 'glow' },
];

const SPEED_OPTIONS = [
	{ label: __( 'Slow', 'sgs-blocks' ), value: 'slow' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Fast', 'sgs-blocks' ), value: 'fast' },
];

const DIRECTION_OPTIONS = [
	{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
	{ label: __( 'Right', 'sgs-blocks' ), value: 'right' },
];

const SPEED_MAP = {
	slow: '40s',
	medium: '25s',
	fast: '15s',
};

function LogoEditor( { logo, index, onChange, onRemove } ) {
	const update = ( key, value ) => {
		onChange( { ...logo, [ key ]: value } );
	};

	return (
		<div
			style={ {
				borderBottom: '1px solid #ddd',
				paddingBottom: '12px',
				marginBottom: '12px',
			} }
		>
			<p style={ { fontWeight: 600, margin: '0 0 8px' } }>
				{ `#${ index + 1 }` }
				{ logo.alt ? ` — ${ logo.alt }` : '' }
			</p>

			<MediaPicker
				value={ logo.media || null }
				onChange={ ( media ) => {
					const next = { ...logo, media };
					if ( ! logo.alt && media && media.alt ) {
						next.alt = media.alt;
					}
					onChange( next );
				} }
				onRemove={ () =>
					onChange( { ...logo, media: null } )
				}
				allowedTypes={ [ 'image' ] }
				label={ __( 'Select logo', 'sgs-blocks' ) }
				instructionsImage={ __(
					'Choose a logo image',
					'sgs-blocks'
				) }
			/>

			<TextControl
				label={ __( 'Alt text', 'sgs-blocks' ) }
				value={ logo.alt || '' }
				onChange={ ( val ) => update( 'alt', val ) }
				__nextHasNoMarginBottom
			/>

			<TextControl
				label={ __( 'Link URL (optional)', 'sgs-blocks' ) }
				value={ logo.linkUrl || '' }
				onChange={ ( val ) => update( 'linkUrl', val ) }
				type="url"
				__nextHasNoMarginBottom
			/>

			<Button
				variant="secondary"
				isDestructive
				onClick={ onRemove }
				size="small"
				style={ { marginTop: '8px' } }
			>
				{ __( 'Remove logo', 'sgs-blocks' ) }
			</Button>
		</div>
	);
}

// Box-object interface contract §1: build an editor-preview shorthand from a
// box object — mirrors render.php's box-shorthand builder so the canvas
// preview matches the frontend (contract §5). Editor-only convenience; the
// frontend render.php emits every declaration scoped, never inline
// (contract §A).
function boxShorthand( box ) {
	if ( ! box || 'object' !== typeof box ) return undefined;
	const { top, right, bottom, left } = box;
	if ( ! top && ! right && ! bottom && ! left ) return undefined;
	return [ top, right, bottom, left ].map( ( v ) => v || '0' ).join( ' ' );
}

/**
 * Build the editor-canvas preview style for the root element (background/
 * padding/margin/border — all WP-native supports, skip-serialised in
 * block.json so WordPress no longer auto-previews them; hand-built here to
 * match render.php's scoped output, mirroring sgs/quote + sgs/media).
 */
function buildWrapperStyle( attributes ) {
	const { style } = attributes;
	const wrapperStyle = {};

	if ( style?.color?.background ) {
		wrapperStyle.backgroundColor = style.color.background;
	}

	const paddingPreview = boxShorthand( style?.spacing?.padding );
	if ( paddingPreview ) {
		wrapperStyle.padding = paddingPreview;
	}
	const marginPreview = boxShorthand( style?.spacing?.margin );
	if ( marginPreview ) {
		wrapperStyle.margin = marginPreview;
	}

	const border = style?.border;
	if ( border?.style && border.style !== 'none' ) {
		const borderWidthPreview = boxShorthand(
			'object' === typeof border.width ? border.width : undefined
		);
		wrapperStyle.borderWidth = borderWidthPreview || border.width || undefined;
		wrapperStyle.borderStyle = border.style;
		if ( border.color ) {
			wrapperStyle.borderColor = border.color;
		}
	} else if ( border?.color || border?.width ) {
		// Colour/width set without an explicit style — WP defaults to solid.
		wrapperStyle.borderWidth = border.width || undefined;
		wrapperStyle.borderStyle = 'solid';
		if ( border.color ) {
			wrapperStyle.borderColor = border.color;
		}
	}
	const radiusPreview = boxShorthand(
		'object' === typeof border?.radius ? border.radius : undefined
	);
	wrapperStyle.borderRadius = radiusPreview || border?.radius || undefined;

	return Object.fromEntries(
		Object.entries( wrapperStyle ).filter( ( [ , v ] ) => v !== undefined )
	);
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		logos,
		style,
		scrolling,
		scrollSpeed,
		scrollDirection,
		fadeEdges,
		fadeWidth,
		greyscale,
		maxHeight,
		backgroundColourHover,
		textColourHover,
		borderColourHover,
		effectHover,
		transitionDuration,
		transitionEasing,
		paddingTablet,
		paddingMobile,
		marginTablet,
		marginMobile,
		borderRadiusTablet,
		borderRadiusMobile,
	} = attributes;

	const updateLogo = ( index, updated ) => {
		const next = [ ...logos ];
		next[ index ] = updated;
		setAttributes( { logos: next } );
	};

	const removeLogo = ( index ) => {
		setAttributes( {
			logos: logos.filter( ( _, i ) => i !== index ),
		} );
	};

	const addLogo = () => {
		setAttributes( {
			logos: [
				...logos,
				{ media: null, alt: '', linkUrl: '' },
			],
		} );
	};

	const className = [
		'sgs-brand-strip',
		greyscale ? 'sgs-brand-strip--greyscale' : '',
		scrolling ? 'sgs-brand-strip--scrolling' : '',
		scrollDirection === 'right' ? 'sgs-brand-strip--reverse' : '',
		fadeEdges ? 'sgs-brand-strip--fade' : '',
	]
		.filter( Boolean )
		.join( ' ' );

	const blockProps = useBlockProps( {
		className,
		style: {
			// WP-native background/spacing/border preview — skip-serialised in
			// block.json, so WordPress no longer auto-previews these; hand-built
			// to mirror render.php's scoped output (contract §A/§E).
			...buildWrapperStyle( attributes ),
			'--sgs-hover-bg': backgroundColourHover ? colourVar( backgroundColourHover ) : undefined,
			'--sgs-hover-text': textColourHover ? colourVar( textColourHover ) : undefined,
			'--sgs-hover-border': borderColourHover ? colourVar( borderColourHover ) : undefined,
			'--sgs-transition-duration': transitionDuration ? `${ transitionDuration }ms` : undefined,
			'--sgs-transition-easing': transitionEasing || undefined,
			'--sgs-fade-width': fadeEdges ? `${ fadeWidth }px` : undefined,
		},
	} );

	const trackStyle = {
		'--sgs-logo-max-height': `${ maxHeight }px`,
		'--sgs-scroll-speed': scrolling ? SPEED_MAP[ scrollSpeed ] : undefined,
	};

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Settings', 'sgs-blocks' ) }>
					<RangeControl
						label={ __( 'Logo max height (px)', 'sgs-blocks' ) }
						value={ maxHeight }
						onChange={ ( val ) =>
							setAttributes( { maxHeight: val } )
						}
						min={ 24 }
						max={ 120 }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Greyscale', 'sgs-blocks' ) }
						help={ __(
							'Display logos in greyscale, colour on hover.',
							'sgs-blocks'
						) }
						checked={ greyscale }
						onChange={ ( val ) =>
							setAttributes( { greyscale: val } )
						}
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __(
							'Infinite scroll animation',
							'sgs-blocks'
						) }
						checked={ scrolling }
						onChange={ ( val ) =>
							setAttributes( { scrolling: val } )
						}
						__nextHasNoMarginBottom
					/>
					{ scrolling && (
						<>
							<SelectControl
								label={ __( 'Scroll speed', 'sgs-blocks' ) }
								value={ scrollSpeed }
								options={ SPEED_OPTIONS }
								onChange={ ( val ) =>
									setAttributes( { scrollSpeed: val } )
								}
								__nextHasNoMarginBottom
							/>
							<SelectControl
								label={ __( 'Scroll direction', 'sgs-blocks' ) }
								value={ scrollDirection }
								options={ DIRECTION_OPTIONS }
								onChange={ ( val ) =>
									setAttributes( { scrollDirection: val } )
								}
								__nextHasNoMarginBottom
							/>
						</>
					) }
					<ToggleControl
						label={ __( 'Fade edges', 'sgs-blocks' ) }
						help={ __(
							'Gradient fade on left and right edges for a polished look.',
							'sgs-blocks'
						) }
						checked={ fadeEdges }
						onChange={ ( val ) =>
							setAttributes( { fadeEdges: val } )
						}
						__nextHasNoMarginBottom
					/>
					{ fadeEdges && (
						<RangeControl
							label={ __( 'Fade width (px)', 'sgs-blocks' ) }
							value={ fadeWidth }
							onChange={ ( val ) =>
								setAttributes( { fadeWidth: val } )
							}
							min={ 20 }
							max={ 200 }
							__nextHasNoMarginBottom
						/>
					) }
				</PanelBody>

				{ /* Box-object interface contract §B/§E: base padding/margin/border-
				   radius route to the WP-native Dimensions/Border panels (colour,
				   spacing, border are still native `supports` — only the FRONTEND
				   serialisation is skipped). Tablet/Mobile tiers are SGS object
				   attrs, edited here (mirrors sgs/quote + sgs/media). */ }
				<PanelBody
					title={ __( 'Box & border (tablet / mobile)', 'sgs-blocks' ) }
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

				<PanelBody
					title={ __( 'Transitions', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextControl
						label={ __( 'Transition duration (ms)', 'sgs-blocks' ) }
						value={ transitionDuration }
						onChange={ ( val ) =>
							setAttributes( { transitionDuration: val } )
						}
						help={ __( 'Duration of the greyscale-to-colour hover transition in milliseconds. Default: 300.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Transition easing', 'sgs-blocks' ) }
						value={ transitionEasing }
						options={ [
							{ label: __( 'Ease', 'sgs-blocks' ), value: 'ease' },
							{ label: __( 'Ease in', 'sgs-blocks' ), value: 'ease-in' },
							{ label: __( 'Ease out', 'sgs-blocks' ), value: 'ease-out' },
							{ label: __( 'Ease in–out', 'sgs-blocks' ), value: 'ease-in-out' },
							{ label: __( 'Linear', 'sgs-blocks' ), value: 'linear' },
						] }
						onChange={ ( val ) =>
							setAttributes( { transitionEasing: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Hover States', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Hover effect', 'sgs-blocks' ) }
						value={ effectHover }
						options={ HOVER_EFFECT_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { effectHover: val } )
						}
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __( 'Hover background colour', 'sgs-blocks' ) }
						value={ backgroundColourHover }
						onChange={ ( val ) =>
							setAttributes( { backgroundColourHover: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Hover text colour', 'sgs-blocks' ) }
						value={ textColourHover }
						onChange={ ( val ) =>
							setAttributes( { textColourHover: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Hover border colour', 'sgs-blocks' ) }
						value={ borderColourHover }
						onChange={ ( val ) =>
							setAttributes( { borderColourHover: val } )
						}
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Logos', 'sgs-blocks' ) }
					initialOpen={ true }
				>
					{ logos.map( ( logo, index ) => (
						<LogoEditor
							key={ index }
							logo={ logo }
							index={ index }
							onChange={ ( updated ) =>
								updateLogo( index, updated )
							}
							onRemove={ () => removeLogo( index ) }
						/>
					) ) }
					<Button variant="secondary" onClick={ addLogo }>
						{ __( 'Add logo', 'sgs-blocks' ) }
					</Button>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ logos.length === 0 ? (
					<p className="sgs-brand-strip__empty">
						{ __(
							'Add logos in the sidebar panel.',
							'sgs-blocks'
						) }
					</p>
				) : (
					<div
						className="sgs-brand-strip__track"
						style={ trackStyle }
					>
						<div className="sgs-brand-strip__set">
							{ logos.map( ( logo, i ) => {
								const mediaUrl =
									logo.media?.url ||
									logo.image?.url ||
									'';
								if ( ! mediaUrl ) {
									return null;
								}
								return (
									<div
										key={ i }
										className="sgs-brand-strip__item"
									>
										<img
											src={ mediaUrl }
											alt={ logo.alt || '' }
											className="sgs-brand-strip__logo"
											style={ {
												maxHeight: `${ maxHeight }px`,
											} }
										/>
									</div>
								);
							} ) }
						</div>
					</div>
				) }
			</div>
		</>
	);
}
