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
	SgsColourPanel,
	ResponsiveControl,
	ResponsiveBoxControl,
	ResponsiveBorderRadiusControl,
	TypographyControls,
	ShadowControl,
	LinkPopoverField,
} from '../../components';
import MediaPicker from '../../components/MediaPicker';
import { colourVar } from '../../utils';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';

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
				__next40pxDefaultSize
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
				__next40pxDefaultSize
			/>

			{ /* Spec 35 §2 LINK standard (promoted from `sgs/button`'s
			   Bean-approved popover 2026-08-13) — replaces the old
			   `SgsLinkControl` inline mount. `logo.linkTarget` is a
			   boolean-shaped enum ('_self'/'_blank' only), so
			   targetMode="boolean" matches the declared schema exactly. */ }
			<LinkPopoverField
				label={ __( 'Link (optional)', 'sgs-blocks' ) }
				help={ __(
					'Search your site or paste a URL to make this logo clickable.',
					'sgs-blocks'
				) }
				value={ {
					url: logo.linkUrl || '',
					linkTarget: logo.linkTarget || '_self',
					rel: logo.linkRel || '',
				} }
				targetMode="boolean"
				onChange={ ( next ) => {
					const patch = { ...logo };
					if ( undefined !== next.url ) patch.linkUrl = next.url;
					if ( undefined !== next.linkTarget ) patch.linkTarget = next.linkTarget;
					if ( undefined !== next.rel ) patch.linkRel = next.rel;
					onChange( patch );
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
		tileBorderColourGradient,
		tileShadow,
		tileShadowColour,
		itemBackgroundColourHover,
		itemTextColourHover,
		itemBorderColourHover,
		itemBorderColourHoverGradient,
		backgroundColour,
		backgroundColourGradient,
		backgroundColourHover,
		backgroundColourHoverGradient,
		textColour,
		textColourGradient,
		textColourHover,
		textColourHoverGradient,
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
			{ /* D609/D618 uniformity rollout — ONE grouped, SGS-owned colour
			   panel, rendered FIRST. Replaces the scattered DesignTokenPicker
			   rows previously inline inside the Styles-tab "Tile colours"
			   StateToggleControl and the Caption panel below. Hover pairs:
			   tileBackgroundColour⇆itemBackgroundColourHover,
			   tileBorderColour⇆itemBorderColourHover,
			   nameColour⇆itemTextColourHover (verified via render.php/style.css —
			   itemTextColourHover feeds --sgs-tile-hover-text, the hover
			   counterpart of the caption's nameColour). */ }
			<SgsColourPanel
				rows={ [
					{
						key: 'rootBackground',
						label: __( 'Block background colour (root)', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: backgroundColour,
								onChange: ( val ) => setAttributes( { backgroundColour: val ?? '' } ),
								gradientValue: backgroundColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { backgroundColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: backgroundColourHover,
								onChange: ( val ) => setAttributes( { backgroundColourHover: val ?? '' } ),
								gradientValue: backgroundColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { backgroundColourHoverGradient: val ?? '' } ),
							},
						],
					},
					{
						key: 'rootText',
						label: __( 'Block text colour (root)', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: textColour,
								onChange: ( val ) => setAttributes( { textColour: val ?? '' } ),
								linked: true,
								gradientValue: textColourGradient,
								onGradientChange: ( val ) => setAttributes( { textColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: textColourHover,
								onChange: ( val ) => setAttributes( { textColourHover: val ?? '' } ),
								linked: true,
								onGradientChange: ( val ) => setAttributes( { textColourHoverGradient: val ?? '' } ),
								gradientValue: textColourHoverGradient,
							},
						],
					},
					{
						key: 'tileBackground',
						label: __( 'Tile background colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: tileBackgroundColour,
								onChange: ( val ) => setAttributes( { tileBackgroundColour: val } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: itemBackgroundColourHover,
								onChange: ( val ) => setAttributes( { itemBackgroundColourHover: val } ),
							},
						],
					},
					{
						key: 'tileBorder',
						label: __( 'Tile border colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: tileBorderColour,
								onChange: ( val ) => setAttributes( { tileBorderColour: val } ),
								gradientValue: tileBorderColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { tileBorderColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: itemBorderColourHover,
								onChange: ( val ) => setAttributes( { itemBorderColourHover: val } ),
								gradientValue: itemBorderColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { itemBorderColourHoverGradient: val ?? '' } ),
							},
						],
					},
					{
						key: 'caption',
						label: __( 'Caption colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: nameColour,
								onChange: ( val ) => setAttributes( { nameColour: val } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: itemTextColourHover,
								onChange: ( val ) => setAttributes( { itemTextColourHover: val } ),
							},
						],
					},
					tileShadow && {
						key: 'tileShadow',
						label: __( 'Tile shadow colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: tileShadowColour,
								onChange: ( val ) => setAttributes( { tileShadowColour: val ?? '' } ),
								linked: true,
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: attributes.tileShadowColourHover,
								onChange: ( val ) => setAttributes( { tileShadowColourHover: val ?? '' } ),
								linked: true,
							},
						],
					},
				] }
			/>
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
									__next40pxDefaultSize
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
						__next40pxDefaultSize
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
								__next40pxDefaultSize
							/>
							<SelectControl
								label={ __( 'Scroll direction', 'sgs-blocks' ) }
								value={ scrollDirection }
								options={ DIRECTION_OPTIONS }
								onChange={ ( val ) =>
									setAttributes( { scrollDirection: val } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
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
							__next40pxDefaultSize
						/>
					) }
				</PanelBody>
			</InspectorControls>

			{ /* ── STYLES tab — appearance, grouped by block element ── */ }
			<InspectorControls group="styles">
				<ToolsPanel
					label={ __( 'Tile', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( {
							tileShape: 'square',
							tilePadding: 10,
							tileRadius: 16,
							tileShadow: '',
							logoGap: 0,
							tileBackgroundColour: '',
							tileBorderWidth: 0,
							tileBorderColour: '',
							tileBorderColourGradient: '',
							itemBackgroundColourHover: '',
							itemBorderColourHover: '',
							itemBorderColourHoverGradient: '',
							itemTextColourHover: '',
							effectHover: 'none',
							transitionDuration: '300',
							transitionEasing: 'ease-in-out',
						} )
					}
				>
					<ToolsPanelItem
						label={ __( 'Tile shape', 'sgs-blocks' ) }
						hasValue={ () => ( tileShape || 'square' ) !== 'square' }
						onDeselect={ () => setAttributes( { tileShape: 'square' } ) }
						isShownByDefault
					>
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
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Tile padding', 'sgs-blocks' ) }
						hasValue={ () => tilePadding !== 10 }
						onDeselect={ () => setAttributes( { tilePadding: 10 } ) }
					>
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
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Tile corner radius', 'sgs-blocks' ) }
						hasValue={ () => tileRadius !== 16 }
						onDeselect={ () => setAttributes( { tileRadius: 16 } ) }
					>
						<RangeControl
							label={ __( 'Tile corner radius (px)', 'sgs-blocks' ) }
							value={ tileRadius }
							onChange={ ( val ) =>
								setAttributes( { tileRadius: val } )
							}
							min={ 0 }
							max={ 100 }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Tile shadow', 'sgs-blocks' ) }
						hasValue={ () => !! tileShadow }
						onDeselect={ () => setAttributes( { tileShadow: '' } ) }
					>
						<ShadowControl
							label={ __( 'Tile shadow', 'sgs-blocks' ) }
							attributes={ attributes }
							setAttributes={ setAttributes }
							attrNames={ {
								base: 'tileShadow',
								colour: 'tileShadowColour',
								hoverColour: 'tileShadowColourHover',
							} }
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Gap between logos', 'sgs-blocks' ) }
						hasValue={ () => logoGap !== 0 }
						onDeselect={ () => setAttributes( { logoGap: 0 } ) }
					>
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
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>

					{ /* Border width — a non-colour numeric control, kept here
					   (the colour rows themselves moved into the shared
					   SgsColourPanel at the top of the inspector, D609/D618). */ }
					<ToolsPanelItem
						label={ __( 'Tile border width', 'sgs-blocks' ) }
						hasValue={ () => tileBorderWidth !== 0 }
						onDeselect={ () => setAttributes( { tileBorderWidth: 0 } ) }
						isShownByDefault
					>
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
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>

					{ /* Hover behaviour — motion + timing (applies on hover
					   regardless of the colour states above). */ }
					<ToolsPanelItem
						label={ __( 'Hover effect', 'sgs-blocks' ) }
						hasValue={ () => effectHover !== 'none' }
						onDeselect={ () => setAttributes( { effectHover: 'none' } ) }
					>
						<SelectControl
							label={ __( 'Hover effect', 'sgs-blocks' ) }
							value={ effectHover }
							options={ HOVER_EFFECT_OPTIONS }
							onChange={ ( val ) =>
								setAttributes( { effectHover: val } )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Transition duration', 'sgs-blocks' ) }
						hasValue={ () => transitionDuration !== '300' }
						onDeselect={ () => setAttributes( { transitionDuration: '300' } ) }
					>
						<TextControl
							label={ __( 'Transition duration (ms)', 'sgs-blocks' ) }
							value={ transitionDuration }
							onChange={ ( val ) =>
								setAttributes( { transitionDuration: val } )
							}
							help={ __( 'Speed of the hover colour/greyscale transition. Default: 300.', 'sgs-blocks' ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Transition easing', 'sgs-blocks' ) }
						hasValue={ () => transitionEasing !== 'ease-in-out' }
						onDeselect={ () => setAttributes( { transitionEasing: 'ease-in-out' } ) }
					>
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
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>
				</ToolsPanel>

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
						__next40pxDefaultSize
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
						__next40pxDefaultSize
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
								__next40pxDefaultSize
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
