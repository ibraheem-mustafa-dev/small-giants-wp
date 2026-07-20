import { __ } from '@wordpress/i18n';
import ServerSideRender from '@wordpress/server-side-render';
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
import {
	DesignTokenPicker,
	ResponsiveControl,
	ResponsiveBoxControl,
	ResponsiveBorderRadiusControl,
	TypographyControls,
	StateToggleControl,
	ShadowControl,
	SgsLinkControl,
} from '../../components';
import MediaPicker from '../../components/MediaPicker';
import { colourVar } from '../../utils';

const CAPTION_ALIGN_OPTIONS = [
	{ label: __( '— inherit —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'Right', 'sgs-blocks' ), value: 'right' },
	{ label: __( 'Justify', 'sgs-blocks' ), value: 'justify' },
];

const HOVER_EFFECT_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Lift', 'sgs-blocks' ), value: 'lift' },
	{ label: __( 'Scale', 'sgs-blocks' ), value: 'scale' },
	{ label: __( 'Glow', 'sgs-blocks' ), value: 'glow' },
];

const IMAGE_EFFECT_OPTIONS = [
	{ label: __( 'None (full colour)', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Greyscale', 'sgs-blocks' ), value: 'grayscale' },
	{ label: __( 'Sepia', 'sgs-blocks' ), value: 'sepia' },
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
				label={ __( 'Name / label (optional)', 'sgs-blocks' ) }
				help={ __(
					'Shown as a caption under the logo when "Show logo names" is on.',
					'sgs-blocks'
				) }
				value={ logo.name || '' }
				onChange={ ( val ) => update( 'name', val ) }
				__nextHasNoMarginBottom
			/>

			<SgsLinkControl
				label={ __( 'Link (optional)', 'sgs-blocks' ) }
				help={ __(
					'Search your site or paste a URL to make this logo clickable.',
					'sgs-blocks'
				) }
				value={ {
					url: logo.linkUrl || '',
					opensInNewTab: logo.linkTarget === '_blank',
					rel: logo.linkRel || '',
				} }
				onChange={ ( next ) => {
					onChange( {
						...logo,
						linkUrl: next.url || '',
						linkTarget: next.opensInNewTab ? '_blank' : '_self',
						linkRel: next.rel || '',
					} );
				} }
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
		imageEffect,
		maxHeight,
		columnsDesktop,
		columnsTablet,
		columnsMobile,
		showNames,
		pauseOnHover,
		nameColour,
		nameTextAlign,
		logoGap,
		tilePadding,
		tileRadius,
		tileShape,
		logoFit,
		tileBackgroundColour,
		tileBorderWidth,
		tileBorderColour,
		tileShadow,
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
				{ media: null, alt: '', name: '', linkUrl: '', linkTarget: '_self', linkRel: '' },
			],
		} );
	};

	const className = [
		'sgs-brand-strip',
		'none' !== imageEffect ? `sgs-brand-strip--effect-${ imageEffect }` : '',
		scrolling ? 'sgs-brand-strip--scrolling' : '',
		scrollDirection === 'right' ? 'sgs-brand-strip--reverse' : '',
		fadeEdges ? 'sgs-brand-strip--fade' : '',
	]
		.filter( Boolean )
		.join( ' ' );

	const blockProps = useBlockProps();

	const trackStyle = {
		'--sgs-logo-max-height': `${ maxHeight }px`,
		'--sgs-columns-desktop': columnsDesktop ?? 8,
		'--sgs-columns-tablet': columnsTablet ?? 4,
		'--sgs-columns-mobile': columnsMobile ?? 2,
		'--sgs-scroll-speed': scrolling ? SPEED_MAP[ scrollSpeed ] : undefined,
	};

	return (
		<>
			{ /* ── SETTINGS tab — behaviour / configuration ── */ }
			<InspectorControls>
				<PanelBody title={ __( 'Logos', 'sgs-blocks' ) } initialOpen={ true }>
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

				<PanelBody
					title={ __( 'Layout', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ResponsiveControl label={ __( 'Columns', 'sgs-blocks' ) }>
						{ ( bp ) => {
							const cols = {
								desktop: { attr: 'columnsDesktop', value: columnsDesktop ?? 8, max: 12 },
								tablet: { attr: 'columnsTablet', value: columnsTablet ?? 4, max: 10 },
								mobile: { attr: 'columnsMobile', value: columnsMobile ?? 2, max: 6 },
							}[ bp ];
							return (
								<RangeControl
									label={ __( 'Columns', 'sgs-blocks' ) }
									hideLabelFromVision
									help={ __( 'How many logos fill the width on this device. Tiles resize to fit exactly this many.', 'sgs-blocks' ) }
									value={ cols.value }
									onChange={ ( val ) => setAttributes( { [ cols.attr ]: val } ) }
									min={ 1 }
									max={ cols.max }
									__nextHasNoMarginBottom
								/>
							);
						} }
					</ResponsiveControl>
					<RangeControl
						label={ __( 'Logo max height cap (px)', 'sgs-blocks' ) }
						help={ __(
							'Tiles size to fit the columns above and grow with the screen; this caps how big a logo gets so it never pixelates on wide screens.',
							'sgs-blocks'
						) }
						value={ maxHeight }
						onChange={ ( val ) =>
							setAttributes( { maxHeight: val } )
						}
						min={ 24 }
						max={ 260 }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Marquee', 'sgs-blocks' ) }
					initialOpen={ false }
				>
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
							<ToggleControl
								label={ __( 'Pause on hover', 'sgs-blocks' ) }
								help={ __(
									'Stop the marquee while a visitor’s pointer is over it — required for WCAG 2.2.2 (Pause, Stop, Hide) on auto-moving content.',
									'sgs-blocks'
								) }
								checked={ pauseOnHover }
								onChange={ ( val ) =>
									setAttributes( { pauseOnHover: val } )
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
			</InspectorControls>

			{ /* ── STYLES tab — appearance, grouped by block element ── */ }
			<InspectorControls group="styles">
				<PanelBody title={ __( 'Tile', 'sgs-blocks' ) } initialOpen={ true }>
					<SelectControl
						label={ __( 'Tile shape', 'sgs-blocks' ) }
						help={ __(
							'Square keeps the rounded card (use corner radius below); Circle makes each tile round; None removes the card so only the logo shows.',
							'sgs-blocks'
						) }
						value={ tileShape || 'square' }
						options={ [
							{ label: __( 'Square', 'sgs-blocks' ), value: 'square' },
							{ label: __( 'Circle', 'sgs-blocks' ), value: 'circle' },
							{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
						] }
						onChange={ ( val ) => setAttributes( { tileShape: val } ) }
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __( 'Tile padding (px)', 'sgs-blocks' ) }
						help={ __(
							'Space between the logo and the tile edge. Set to 0 so the logo fills the tile edge-to-edge.',
							'sgs-blocks'
						) }
						value={ tilePadding }
						onChange={ ( val ) =>
							setAttributes( { tilePadding: val } )
						}
						min={ 0 }
						max={ 60 }
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __( 'Tile corner radius (px)', 'sgs-blocks' ) }
						value={ tileRadius }
						onChange={ ( val ) =>
							setAttributes( { tileRadius: val } )
						}
						min={ 0 }
						max={ 100 }
						__nextHasNoMarginBottom
					/>
					<ShadowControl
						label={ __( 'Tile shadow', 'sgs-blocks' ) }
						value={ tileShadow }
						onChange={ ( val ) =>
							setAttributes( { tileShadow: val } )
						}
					/>
					<RangeControl
						label={ __( 'Gap between logos (px)', 'sgs-blocks' ) }
						help={ __(
							'0 uses the theme default spacing.',
							'sgs-blocks'
						) }
						value={ logoGap }
						onChange={ ( val ) =>
							setAttributes( { logoGap: val } )
						}
						min={ 0 }
						max={ 200 }
						__nextHasNoMarginBottom
					/>

					{ /* Normal ⇆ Hover colours, one panel-level toggle (Kadence
					   pattern). The persistent swatches keep every state's colour
					   visible so a hover value is never hidden (council mitigation
					   2026-07-18). */ }
					<StateToggleControl
						label={ __( 'Tile colours', 'sgs-blocks' ) }
						swatches={ [
							{ label: __( 'Background', 'sgs-blocks' ), value: tileBackgroundColour },
							{ label: __( 'Hover bg', 'sgs-blocks' ), value: backgroundColourHover },
							{ label: __( 'Border', 'sgs-blocks' ), value: tileBorderColour },
							{ label: __( 'Hover border', 'sgs-blocks' ), value: borderColourHover },
						] }
					>
						{ ( state ) =>
							state === 'normal' ? (
								<>
									<DesignTokenPicker
										label={ __( 'Background colour', 'sgs-blocks' ) }
										value={ tileBackgroundColour }
										onChange={ ( val ) =>
											setAttributes( { tileBackgroundColour: val } )
										}
									/>
									<RangeControl
										label={ __( 'Border width (px)', 'sgs-blocks' ) }
										help={ __(
											'Static border shown on every tile at rest.',
											'sgs-blocks'
										) }
										value={ tileBorderWidth }
										onChange={ ( val ) =>
											setAttributes( { tileBorderWidth: val } )
										}
										min={ 0 }
										max={ 10 }
										__nextHasNoMarginBottom
									/>
									<DesignTokenPicker
										label={ __( 'Border colour', 'sgs-blocks' ) }
										value={ tileBorderColour }
										onChange={ ( val ) =>
											setAttributes( { tileBorderColour: val } )
										}
									/>
								</>
							) : (
								<>
									<DesignTokenPicker
										label={ __( 'Hover background colour', 'sgs-blocks' ) }
										value={ backgroundColourHover }
										onChange={ ( val ) =>
											setAttributes( { backgroundColourHover: val } )
										}
									/>
									<DesignTokenPicker
										label={ __( 'Hover border colour', 'sgs-blocks' ) }
										value={ borderColourHover }
										onChange={ ( val ) =>
											setAttributes( { borderColourHover: val } )
										}
									/>
									<DesignTokenPicker
										label={ __( 'Hover text colour', 'sgs-blocks' ) }
										value={ textColourHover }
										onChange={ ( val ) =>
											setAttributes( { textColourHover: val } )
										}
									/>
								</>
							)
						}
					</StateToggleControl>

					{ /* Hover behaviour — motion + timing (applies on hover
					   regardless of the state toggle above). */ }
					<SelectControl
						label={ __( 'Hover effect', 'sgs-blocks' ) }
						value={ effectHover }
						options={ HOVER_EFFECT_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { effectHover: val } )
						}
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Transition duration (ms)', 'sgs-blocks' ) }
						value={ transitionDuration }
						onChange={ ( val ) =>
							setAttributes( { transitionDuration: val } )
						}
						help={ __( 'Speed of the hover colour/greyscale transition. Default: 300.', 'sgs-blocks' ) }
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
					title={ __( 'Logo image', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Image effect', 'sgs-blocks' ) }
						help={ __(
							'Apply greyscale or sepia to logos, full colour on hover.',
							'sgs-blocks'
						) }
						value={ imageEffect }
						options={ IMAGE_EFFECT_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { imageEffect: val } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Logo fit', 'sgs-blocks' ) }
						help={ __(
							'Cover crops each logo to fill the tile square (matches a cropped-square reference); Contain shows the whole logo, letterboxed.',
							'sgs-blocks'
						) }
						value={ logoFit }
						options={ [
							{ label: __( 'Contain', 'sgs-blocks' ), value: 'contain' },
							{ label: __( 'Cover', 'sgs-blocks' ), value: 'cover' },
						] }
						onChange={ ( val ) =>
							setAttributes( { logoFit: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Caption', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __( 'Show logo names', 'sgs-blocks' ) }
						help={ __(
							'Display each logo’s name as a caption underneath its tile.',
							'sgs-blocks'
						) }
						checked={ showNames }
						onChange={ ( val ) =>
							setAttributes( { showNames: val } )
						}
						__nextHasNoMarginBottom
					/>
					{ showNames && (
						<>
							<TypographyControls
								attributes={ attributes }
								setAttributes={ setAttributes }
								prefix="name"
								showDecoration
								showTransform
								showLetterSpacing
							/>
							<SelectControl
								label={ __(
									'Caption align',
									'sgs-blocks'
								) }
								help={ __(
									'Aligns the caption text within its tile. Leave as inherit unless a caption wraps onto two lines.',
									'sgs-blocks'
								) }
								value={ nameTextAlign }
								options={ CAPTION_ALIGN_OPTIONS }
								onChange={ ( val ) =>
									setAttributes( { nameTextAlign: val } )
								}
								__nextHasNoMarginBottom
							/>
							<DesignTokenPicker
								label={ __( 'Caption colour', 'sgs-blocks' ) }
								value={ nameColour }
								onChange={ ( val ) =>
									setAttributes( { nameColour: val } )
								}
							/>
						</>
					) }
				</PanelBody>

				<PanelBody
					title={ __( 'Strip spacing (responsive)', 'sgs-blocks' ) }
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
			</InspectorControls>

			<div { ...blockProps }>
					{ logos.length === 0 ? (
						<p className="sgs-brand-strip__empty">
							{ __( 'Add logos in the sidebar panel.', 'sgs-blocks' ) }
						</p>
					) : (
						<ServerSideRender
							block="sgs/brand-strip"
							attributes={ attributes }
						/>
					) }
				</div>
			</>
	);
}
