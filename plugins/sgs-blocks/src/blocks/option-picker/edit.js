/**
 * SGS Option Picker — editor component.
 *
 * NO-INLINE + NO-WRAPPER (per-block no-inline contract §A/§B/§B3;
 * content-KIND pattern, mirrors sgs/quote):
 * the <fieldset> IS the block root — no SGS_Container_Wrapper delegation,
 * no ContainerWrapperControls. This panel hand-rolls its own width/spacing/
 * border controls, the same shape as sgs/quote's.
 *
 * Renders a live pill preview in the canvas + full InspectorControls:
 * label text, showLabel toggle, option repeater (add/remove/reorder),
 * defaultSelected, pillStyle/pillSize, colour preset, resting + selected
 * pill colours/border/radius, selected-tick toggle, pill padding (box
 * object + tiers), root width/spacing/border, and typography controls.
 */
import { __ } from '@wordpress/i18n';
import { composeShadow } from '../../utils/shadow-layers';
import ItemSlotFields from '../../components/media/ItemSlotFields.js';
import {
	useBlockProps,
	InspectorControls,
	useSettings,
} from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	ToggleControl,
	SelectControl,
	Button,
	Flex,
	FlexItem,
	FlexBlock,
	Notice,
} from '@wordpress/components';
import {
	TypographyControls,
	ResponsiveBoxControl,
	SgsColourPanel,
	textRow,
	SgsLengthControl,
	SgsBorderControl,
	MediaElementPanel,
	ResponsiveOverride,
	BOX_UNITS,
	normaliseResponsiveBox,
	SgsBoxControl,
	FlexWrapControl,
	ShadowControl,
} from '../../components';
import {
	colourVar,
	resolveTextColourPreviewStyle,
	borderPaintPreview,
	typographyPreviewStyle,
	usePreviewTier,
	boxPreview,
	tierBoxLonghands,
	gapVar,
} from '../../utils';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';
import SubLabelPanel from './sub-label-panel';

import SgsFreeTextField from '../../components/SgsFreeTextField';
/* ── Options ─────────────────────────────────────────────────────────────── */

const PILL_STYLE_OPTIONS = [
	{ label: __( 'Outlined (default)', 'sgs-blocks' ), value: 'outlined' },
	{ label: __( 'Filled', 'sgs-blocks' ), value: 'filled' },
	{ label: __( 'Ghost', 'sgs-blocks' ), value: 'ghost' },
	{ label: __( 'Tile (image + caption)', 'sgs-blocks' ), value: 'tile' },
];

const PILL_SIZE_OPTIONS = [
	{ label: __( 'Small', 'sgs-blocks' ), value: 'small' },
	{ label: __( 'Medium (default)', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Large', 'sgs-blocks' ), value: 'large' },
];

const COLOUR_PRESET_OPTIONS = [
	{ label: __( '— Framework default —', 'sgs-blocks' ), value: '' },
	{
		label: __( 'Soft (pale-tint fill, outline, no tick)', 'sgs-blocks' ),
		value: 'soft',
	},
	{
		label: __( 'Solid (filled selected, tick)', 'sgs-blocks' ),
		value: 'solid',
	},
];

const LENGTH_UNITS = [
	{ value: 'px', label: 'px', default: 0 },
	{ value: 'rem', label: 'rem', default: 0 },
	{ value: 'em', label: 'em', default: 0 },
	{ value: '%', label: '%', default: 0 },
];

/* ── Helpers ────────────────────────────────────────────────────────────── */

function hasDuplicateKeys( items ) {
	const keys = items.map( ( it ) => it.key ).filter( Boolean );
	return new Set( keys ).size !== keys.length;
}

function buildRootPreviewStyle( attributes, tier, palette ) {
	const {
		maxWidth,
		width,
		pillBgColour,
		pillBgColourGradient,
		pillTextColour,
		pillBgColourHover,
		pillBgColourHoverGradient,
		pillTextColourHover,
		pillBorderColour,
		pillSelectedBgColour,
		pillSelectedTextColour,
		pillSelectedBorderColour,
		pillBorderRadius,
		pillBorderWidth,
		pillSelectedBorderRadius,
		pillShadow,
		pillShadowColour,
		pillSelectedShadow,
		pillSelectedShadowColour,
		pillSelectedOffsetX,
		pillSelectedOffsetY,
		tileGap,
	} = attributes;

	// Padding, margin, border and radius at the previewed device tier.
	const rootStyle = boxPreview( attributes, tier, palette );

	if ( maxWidth ) {
		rootStyle.maxWidth = maxWidth;
	}
	if ( width ) {
		rootStyle.width = width;
	}

	// Pill colour/radius vars — CSS custom-property VALUES only (Spec 32
	// FR-32-4), same channel render.php emits on the root element's style.
	if ( pillBgColour ) {
		rootStyle[ '--sgs-op-bg' ] = colourVar( pillBgColour );
	}
	if ( pillBgColourGradient ) {
		rootStyle[ '--sgs-op-bg-gradient' ] = pillBgColourGradient;
	}
	if ( pillTextColour ) {
		rootStyle[ '--sgs-op-text' ] = colourVar( pillTextColour );
	}
	if ( pillBgColourHover ) {
		rootStyle[ '--sgs-op-bg-hover' ] = colourVar( pillBgColourHover );
	}
	if ( pillBgColourHoverGradient ) {
		rootStyle[ '--sgs-op-bg-hover-gradient' ] = pillBgColourHoverGradient;
	}
	if ( pillTextColourHover ) {
		rootStyle[ '--sgs-op-text-hover' ] = colourVar( pillTextColourHover );
	}
	if ( pillBorderColour ) {
		rootStyle[ '--sgs-op-border' ] = colourVar( pillBorderColour );
	}
	if ( pillSelectedBgColour ) {
		rootStyle[ '--sgs-op-sel-bg' ] = colourVar( pillSelectedBgColour );
	}
	if ( pillSelectedTextColour ) {
		rootStyle[ '--sgs-op-sel-text' ] = colourVar( pillSelectedTextColour );
	}
	if ( pillSelectedBorderColour ) {
		rootStyle[ '--sgs-op-sel-border' ] = colourVar(
			pillSelectedBorderColour
		);
	}
	if ( pillBorderWidth ) {
		rootStyle[ '--sgs-op-border-width' ] = pillBorderWidth;
	}
	if ( pillBorderRadius ) {
		rootStyle[ '--sgs-op-pill-radius' ] = pillBorderRadius + 'px';
	}
	if ( pillSelectedBorderRadius ) {
		rootStyle[ '--sgs-op-sel-pill-radius' ] =
			pillSelectedBorderRadius + 'px';
	}
	if ( tileGap ) {
		rootStyle[ '--sgs-option-picker-tile-gap' ] = tileGap;
	}
	if ( attributes.swatchTickInside && attributes.swatchTickColour ) {
		rootStyle[ '--sgs-op-swatch-tick' ] = colourVar( attributes.swatchTickColour );
	}
	// Resting and selected shadow and the selected shift, read by style.css (same channel as the colours above).
	const restShadow = composeShadow( pillShadow, pillShadowColour );
	if ( restShadow ) {
		rootStyle[ '--sgs-op-shadow' ] = restShadow;
	}
	const selShadow = composeShadow( pillSelectedShadow, pillSelectedShadowColour );
	if ( selShadow ) {
		rootStyle[ '--sgs-op-sel-shadow' ] = selShadow;
	}
	if ( pillSelectedOffsetX || pillSelectedOffsetY ) {
		rootStyle[ '--sgs-op-sel-translate' ] = ( pillSelectedOffsetX || '0' ) + ' ' + ( pillSelectedOffsetY || '0' );
	}

	return rootStyle;
}

/**
 * The sample colour dot's look at the canvas: the same shape, size and ring render.php prints on
 * `.sgs-option-picker__swatch--colour`, or null while none of them is set (a tile keeps its colour block).
 *
 * @param {Object} attributes The block's attributes.
 * @return {Object|null} Style for the sample dot.
 */
function swatchDotPreviewStyle( attributes ) {
	const { pillStyle, swatchShape, swatchSize, swatchRingWidth, swatchRingColour, swatchTickInside } = attributes;
	if ( 'tile' === pillStyle ) {
		return null;
	}
	// The dot's shape is the swatch slot's Shape on desktop: circle rounds it, none squares it.
	const shapeKind = swatchShape?.desktop?.shape || '';
	if ( ! shapeKind && ! swatchSize && ! swatchRingWidth && ! swatchRingColour && ! swatchTickInside ) {
		return null;
	}
	const dot = {};
	if ( 'circle' === shapeKind ) {
		dot.borderRadius = '50%';
	} else if ( 'none' === shapeKind ) {
		dot.borderRadius = 0;
	}
	if ( swatchSize ) {
		dot.width = swatchSize;
		dot.height = swatchSize;
	}
	if ( swatchRingWidth ) {
		dot.borderWidth = swatchRingWidth;
	}
	if ( swatchRingColour ) {
		dot.borderColor = colourVar( swatchRingColour );
	}
	dot[ '--sgs-op-swatch-bg' ] = 'var(--sgs-op-text, currentColor)';
	return dot;
}

/** The block's one media slot: each option's swatch picture (Spec 49 §10.4: Source, Fit, Width, Shape). */
const SWATCH_SLOT = { prefix: 'swatch', kinds: [ 'image' ], context: 'item' };

/* ── Component ──────────────────────────────────────────────────────────── */

export default function Edit( { attributes, setAttributes } ) {
	const {
		label,
		showLabel,
		labelColour,
		labelColourGradient,
		labelMarginBottom,
		optionItems,
		defaultSelected,
		pillStyle,
		pillSize,
		tileGap,
		flexWrap,
		colourPreset,
		showSelectedTick,
		showTermDetails,
		requireChoice,
		pillBgColour,
		pillBgColourGradient,
		pillBgColourHover,
		pillBgColourHoverGradient,
		pillTextColour,
		pillTextColourGradient,
		pillTextColourHover,
		pillBorderColour,
		pillBorderColourGradient,
		pillSelectedBgColour,
		pillSelectedTextColour,
		pillSelectedBorderColour,
		pillSelectedBorderColourGradient,
		pillBorderRadius,
		pillBorderWidth,
		pillSelectedBorderRadius,
		// pillPadding is a TIER-OF-BOXES OBJECT {desktop,tablet,mobile} (Spec 35
		// box-tier); there are no pillPaddingTablet/pillPaddingMobile siblings.
		pillPadding,
		borderWidth,
		borderStyle,
		borderColour,
		borderColourGradient,
		width,
		maxWidth,
	} = attributes;

	// Contract §B3: NO wrapper <div> — the <fieldset> IS the block root
	// (matches render.php). Same DOM shape/classes untouched view.js/editor.css
	// depend on: .sgs-option-picker, .sgs-option-picker__options.
	const previewTier = usePreviewTier();
	const [ optionPickerPalette ] = useSettings( 'color.palette' );
	const blockProps = useBlockProps( {
		as: 'fieldset',
		className: [
			'sgs-option-picker',
			`sgs-option-picker--${ pillStyle }`,
			`sgs-option-picker--${ pillSize }`,
			colourPreset ? `sgs-option-picker--${ colourPreset }` : '',
			true === showSelectedTick ? '' : 'sgs-option-picker--no-tick',
			attributes.swatchTickInside ? 'sgs-option-picker--swatch-tick' : '',
			showTermDetails ? '' : 'sgs-option-picker--no-term-details',
			requireChoice ? 'sgs-option-picker--require-choice' : '',
		]
			.filter( Boolean )
			.join( ' ' ),
		style: buildRootPreviewStyle(
			attributes,
			previewTier,
			optionPickerPalette
		),
	} );

	/* ── Effective default: first option if defaultSelected is missing ── */
	const effectiveDefault =
		defaultSelected ||
		( optionItems.length > 0 ? optionItems[ 0 ].key : '' );

	/* ── Option-repeater handlers ── */

	function addOption() {
		const newKey = `option-${ Date.now() }`;
		setAttributes( {
			optionItems: [
				...optionItems,
				{ key: newKey, label: __( 'New option', 'sgs-blocks' ) },
			],
		} );
	}

	function updateOption( index, field, value ) {
		const updated = optionItems.map( ( item, i ) =>
			i === index ? { ...item, [ field ]: value } : item
		);
		setAttributes( { optionItems: updated } );

		if ( field === 'key' && optionItems[ index ].key === defaultSelected ) {
			setAttributes( { defaultSelected: value } );
		}
	}

	function removeOption( index ) {
		const updated = optionItems.filter( ( _, i ) => i !== index );
		setAttributes( { optionItems: updated } );
		if ( optionItems[ index ].key === defaultSelected ) {
			setAttributes( {
				defaultSelected: updated.length > 0 ? updated[ 0 ].key : '',
			} );
		}
	}

	function moveOption( fromIndex, direction ) {
		const toIndex = fromIndex + direction;
		if ( toIndex < 0 || toIndex >= optionItems.length ) {
			return;
		}
		const updated = [ ...optionItems ];
		[ updated[ fromIndex ], updated[ toIndex ] ] = [
			updated[ toIndex ],
			updated[ fromIndex ],
		];
		setAttributes( { optionItems: updated } );
	}

	const duplicateKeysExist = hasDuplicateKeys( optionItems );

	const defaultOptions = [
		{
			label: __( '— First option (auto) —', 'sgs-blocks' ),
			value: '',
		},
		...optionItems
			.filter( ( it ) => it.key )
			.map( ( it ) => ( { label: it.label || it.key, value: it.key } ) ),
	];

	// Pill padding — box-object interface contract §1: mirrors render.php's
	// desktop-tier `.sgs-option-picker__pill{padding:…}` scoped rule (§7).
	// pillPadding is a TIER-OF-BOXES object {desktop,tablet,mobile}; the canvas
	// preview always shows the desktop tier, same as every other tier-object
	// preview in this component.
	const pillPaddingLonghands = tierBoxLonghands(
		pillPadding,
		previewTier,
		'padding'
	);

	// Pill TEXT colour/gradient preview — flat pillTextColour already renders
	// in-canvas via the --sgs-op-text custom-property VALUE set on the root
	// (buildRootPreviewStyle() above, consumed by style.css's existing
	// `color:var(--sgs-op-text,…)` rules), so this is additive: empty for a
	// flat/unset value (resolveTextColourPreviewStyle() returns `{}`, no
	// duplicate declaration), and the MANDATORY inline preview only for a
	// gradient — a CSS custom property cannot carry a gradient value, so the
	// var() mechanism alone cannot preview it (same reasoning as the root
	// border-gradient preview at buildRootPreviewStyle() above). Same recipe
	// as labelColour/labelColourGradient's preview further down this file.
	const pillTextPreviewStyle = resolveTextColourPreviewStyle(
		pillTextColour,
		pillTextColourGradient,
		colourVar
	);

	// CHECK A: pillBorderColourGradient / pillSelectedBorderColourGradient have
	// no existing canvas mirror — the flat pillBorderColour/pillSelectedBorderColour
	// siblings already paint live via the --sgs-op-border/--sgs-op-sel-border
	// custom properties set on the root by buildRootPreviewStyle() above, which
	// style.css's `.sgs-option-picker__pill`/`:checked ~ .pill` border rules
	// already consume — so only the GRADIENT branch is needed here (colour arg
	// passed as '' to avoid a duplicate/conflicting borderColor declaration).
	// Mirrors render.php's masked-ring approximation used elsewhere this
	// session: a real gradient border is a masked ::before ring server-side,
	// which a plain inline style can't reproduce — border-image is the same
	// documented approximation.
	const pillBorderGradientPreview = borderPaintPreview(
		'',
		pillBorderColourGradient,
		optionPickerPalette
	);
	const pillSelectedBorderGradientPreview = borderPaintPreview(
		'',
		pillSelectedBorderColourGradient,
		optionPickerPalette
	);

	/* ── Canvas preview pills ── */
	const swatchDotStyle = swatchDotPreviewStyle( attributes );
	const renderPills = () => {
		if ( optionItems.length === 0 ) {
			return (
				<p className="sgs-option-picker__empty-notice">
					{ __(
						'Add options in the sidebar to preview pills.',
						'sgs-blocks'
					) }
				</p>
			);
		}

		return optionItems.map( ( item, index ) => {
			const isSelected = item.key === effectiveDefault;
			const pillClass = [
				'sgs-option-picker__option',
				isSelected ? 'sgs-option-picker__option--selected' : '',
			]
				.filter( Boolean )
				.join( ' ' );

			return (
				<span key={ index } className={ pillClass }>
					<span
						className="sgs-option-picker__pill"
						style={ {
							...typographyPreviewStyle(
								attributes,
								'pill',
								previewTier
							),
							...pillPaddingLonghands,
							...pillTextPreviewStyle,
							...pillBorderGradientPreview,
							...( isSelected
								? pillSelectedBorderGradientPreview
								: {} ),
						} }
					>
						{ /* Matches render.php's pill-text wrapper shape so the tile
						   style's column CSS (style.css) applies identically here.
						   The sub-label itself lives on WooCommerce term-meta, so
						   (like the swatch image/colour) it can't be previewed live
						   in the editor -- see the Sub-label panel's help text. */ }
						{ swatchDotStyle && (
							<span
								className="sgs-option-picker__swatch sgs-option-picker__swatch--colour"
								style={ swatchDotStyle }
								aria-hidden="true"
							/>
						) }
						<span className="sgs-option-picker__pill-text">
							<span className="sgs-option-picker__pill-label">
								{ item.label ||
									item.key ||
									`Option ${ index + 1 }` }
							</span>
						</span>
					</span>
				</span>
			);
		} );
	};

	return (
		<>
			{ /* ONE grouped, SGS-owned colour panel, mounted FIRST so it
			   sits at the top of the inspector (mirrors sgs/button).
			   Ground truth: style.css base+:hover+:checked rules;
			   block.json pill-element note, FR-35-5: pillBgColour/
			   pillTextColour/pillBorderColour are the RESTING state.
			   pillBgColourHover/pillTextColourHover are real
			   attributes (mirroring sgs/nav-bar-menu's item-bg/item-text
			   normal+hover rows) wired as a "Hover" state
			   between Normal and Current. pillBorderColour has no
			   hover sibling. The other state is "current"
			   (pillSelected*Colour, driven by :checked). Grouped here as
			   Normal/Hover/Current triples per pill property, all
			   `linked: true`. */ }
			<SgsColourPanel
				rows={ [
					textRow( {
						key: 'label',
						label: __( 'Label colour', 'sgs-blocks' ),
						attrs: {
							base: 'labelColour',
							hover: 'labelColourHover',
							gradient: 'labelColourGradient',
							hoverGradient: 'labelColourHoverGradient',
						},
						attributes,
						setAttributes,
					} ),
					textRow( {
						key: 'swatchRing',
						label: __( 'Colour dot ring colour', 'sgs-blocks' ),
						attrs: { base: 'swatchRingColour' },
						attributes,
						setAttributes,
					} ),
					textRow( {
						key: 'swatchTick',
						label: __( 'Tick colour inside the colour dot', 'sgs-blocks' ),
						attrs: { base: 'swatchTickColour' },
						attributes,
						setAttributes,
					} ),
					{
						key: 'pillBackground',
						label: __( 'Pill background', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: pillBgColour,
								onChange: ( val ) =>
									setAttributes( {
										pillBgColour: val ?? '',
									} ),
								linked: true,
								gradientValue: pillBgColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( {
										pillBgColourGradient: val ?? '',
									} ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: pillBgColourHover,
								onChange: ( val ) =>
									setAttributes( {
										pillBgColourHover: val ?? '',
									} ),
								linked: true,
								gradientValue: pillBgColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( {
										pillBgColourHoverGradient: val ?? '',
									} ),
							},
							{
								key: 'current',
								label: __( 'Current', 'sgs-blocks' ),
								value: pillSelectedBgColour,
								onChange: ( val ) =>
									setAttributes( {
										pillSelectedBgColour: val ?? '',
									} ),
								linked: true,
								// No pillSelectedBgColourGradient attribute exists (same
								// reasoning as pillText's 'current' state below) — a
								// required no-op, not a missing
								// feature (GradientCapableColourControl calls
								// onGradientChange('') on every pick for every state in a
								// gradientCapable row).
								onGradientChange: () => {},
							},
						],
					},
					{
						key: 'pillText',
						label: __( 'Pill text', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: pillTextColour,
								onChange: ( val ) =>
									setAttributes( {
										pillTextColour: val ?? '',
									} ),
								linked: true,
								gradientValue: pillTextColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( {
										pillTextColourGradient: val ?? '',
									} ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: pillTextColourHover,
								onChange: ( val ) =>
									setAttributes( {
										pillTextColourHover: val ?? '',
									} ),
								linked: true,
								// No pillTextColourHoverGradient attribute exists (see
								// block.json pill-element note). GradientCapableColourControl's Solid picker calls
								// state.onGradientChange('') unconditionally on every pick
								// regardless of which state tab is active, so every state
								// in a gradientCapable row needs a handler even when it has
								// nothing to persist — a no-op here, not a missing feature.
								onGradientChange: () => {},
							},
							{
								key: 'current',
								label: __( 'Current', 'sgs-blocks' ),
								value: pillSelectedTextColour,
								onChange: ( val ) =>
									setAttributes( {
										pillSelectedTextColour: val ?? '',
									} ),
								linked: true,
								// Same reasoning as 'hover' above — no
								// pillSelectedTextColourGradient attribute exists.
								onGradientChange: () => {},
							},
						],
					},
					{
						key: 'pillBorder',
						label: __( 'Pill border', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: pillBorderColour,
								onChange: ( val ) =>
									setAttributes( {
										pillBorderColour: val ?? '',
									} ),
								linked: true,
								gradientValue: pillBorderColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( {
										pillBorderColourGradient: val ?? '',
									} ),
							},
							{
								key: 'current',
								label: __( 'Current', 'sgs-blocks' ),
								value: pillSelectedBorderColour,
								onChange: ( val ) =>
									setAttributes( {
										pillSelectedBorderColour: val ?? '',
									} ),
								linked: true,
								gradientValue: pillSelectedBorderColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( {
										pillSelectedBorderColourGradient:
											val ?? '',
									} ),
							},
						],
					},
				] }
			/>
			{ /* ── Inspector — Settings tab (default InspectorControls group,
			   behaviour/content: label text, options data, default selection,
			   converter metadata) ─────────────────────────────────────── */ }
			<InspectorControls>
				{ /* Label panel — text content + visibility toggle only; the
				   typography/margin/colour looks live in the Styles tab below. */ }
				<PanelBody
					title={ __( 'Label', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SgsFreeTextField type="rich" noLink
						label={ __( 'Label text', 'sgs-blocks' ) }
						value={ label }
						onChange={ ( val ) => setAttributes( { label: val } ) }
					/>
					<ToggleControl
						label={ __( 'Show label', 'sgs-blocks' ) }
						checked={ showLabel }
						onChange={ ( val ) =>
							setAttributes( { showLabel: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ /* Options repeater */ }
				<PanelBody
					title={ __( 'Options', 'sgs-blocks' ) }
					initialOpen={ true }
				>
					{ duplicateKeysExist && (
						<Notice status="warning" isDismissible={ false }>
							{ __(
								'Duplicate option keys detected. Each option must have a unique key.',
								'sgs-blocks'
							) }
						</Notice>
					) }

					{ optionItems.map( ( item, index ) => (
						<div
							key={ index }
							className="sgs-option-picker-editor__option-row"
						>
							<Flex align="flex-start" gap={ 1 }>
								<FlexBlock>
									<TextControl
										label={ __( 'Label', 'sgs-blocks' ) }
										value={ item.label }
										onChange={ ( val ) =>
											updateOption( index, 'label', val )
										}
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
									<TextControl
										label={ __(
											'Key (unique ID)',
											'sgs-blocks'
										) }
										help={ __(
											'Used in the event payload. Lowercase letters, digits, hyphens only.',
											'sgs-blocks'
										) }
										value={ item.key }
										onChange={ ( val ) =>
											updateOption(
												index,
												'key',
												val
													.toLowerCase()
													.replace(
														/[^a-z0-9-]/g,
														'-'
													)
											)
										}
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
									{ /* The option's own picture, drawn ahead of the term-meta swatch by the shared media renderer (Spec 49 §8.3). Fit is the option's own; Width and Shape are the picker's (Swatch images panel). */ }
									<ItemSlotFields
										item={ item }
										prefix="swatch"
										slot={ SWATCH_SLOT }
										label={ __( 'Image', 'sgs-blocks' ) }
										onChange={ ( next ) => {
											const next_items = [ ...optionItems ];
											next_items[ index ] = next;
											setAttributes( { optionItems: next_items } );
										} }
									/>
								</FlexBlock>
								<FlexItem>
									<Button
										icon="arrow-up"
										label={ __( 'Move up', 'sgs-blocks' ) }
										isSmall
										disabled={ index === 0 }
										onClick={ () =>
											moveOption( index, -1 )
										}
									/>
									<Button
										icon="arrow-down"
										label={ __(
											'Move down',
											'sgs-blocks'
										) }
										isSmall
										disabled={
											index === optionItems.length - 1
										}
										onClick={ () => moveOption( index, 1 ) }
									/>
									<Button
										icon="trash"
										label={ __(
											'Remove option',
											'sgs-blocks'
										) }
										isSmall
										isDestructive
										onClick={ () => removeOption( index ) }
									/>
								</FlexItem>
							</Flex>
						</div>
					) ) }

					<Button
						variant="secondary"
						onClick={ addOption }
						style={ { marginTop: '8px' } }
					>
						{ __( '+ Add option', 'sgs-blocks' ) }
					</Button>
				</PanelBody>

				{ /* Default selection */ }
				<PanelBody
					title={ __( 'Default selection', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Pre-selected option', 'sgs-blocks' ) }
						help={ __(
							'Which pill is selected on page load. Defaults to the first option.',
							'sgs-blocks'
						) }
						value={ defaultSelected }
						options={ defaultOptions }
						onChange={ ( val ) =>
							setAttributes( { defaultSelected: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				{ /* Converter metadata — machine-readable identifiers consumed by
				   the event payload / parent blocks, not a visual concern. */ }
				<PanelBody
					title={ __( 'Converter metadata', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextControl
						label={ __( 'Type key', 'sgs-blocks' ) }
						help={ __(
							'Machine-readable identifier for the picker type (e.g. pack-size, flavour, colour). Included in the sgs:option-selected event detail.',
							'sgs-blocks'
						) }
						value={ attributes.typeKey }
						onChange={ ( val ) =>
							setAttributes( { typeKey: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __( 'Content-impact slots', 'sgs-blocks' ) }
						help={ __(
							'Comma-separated card slot names this picker controls (e.g. price,description). Included in the event detail for parent blocks.',
							'sgs-blocks'
						) }
						value={ ( attributes.contentImpact || [] ).join(
							', '
						) }
						onChange={ ( val ) =>
							setAttributes( {
								contentImpact: val
									.split( ',' )
									.map( ( s ) => s.trim() )
									.filter( Boolean ),
							} )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				<SubLabelPanel
					attributes={ attributes }
					setAttributes={ setAttributes }
				/>
			</InspectorControls>

			{ /* ── Inspector — Styles tab (appearance: label look, pill style,
			   colours, width/spacing, border) ────────────────────────────── */ }
			{ /* What every swatch picture shares (Spec 49 §10.4): Fit, Width and Shape. The Shape also rounds the colour dot. */ }
			<MediaElementPanel
				attributes={ attributes }
				setAttributes={ setAttributes }
				prefix="swatch"
				blockSlug="sgs/option-picker"
				blockName="sgs/option-picker"
				atoms={ [ 'object-fit', 'sizing', 'shape' ] }
				context="item"
			/>
			<InspectorControls group="styles">
				{ /* Label style — typography/margin/colour only surface when the
				   label is actually shown (showLabel lives in the Settings tab). */ }
				<PanelBody
					title={ __( 'Label', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					{ showLabel && (
						<>
							<TypographyControls
								attributes={ attributes }
								setAttributes={ setAttributes }
								targets={ [
									{
										key: 'label',
										label: __(
											'Group label',
											'sgs-blocks'
										),
										prefix: 'label',
										fontSizePresets: true,
										showFontFamily: true,
										showDecoration: true,
										showTransform: true,
										showLetterSpacing: true,
										showTextAlign: true,
										showTextWrap: true,
										showTextStroke: true,
										showTextColumns: true,
										showWritingMode: true,
									},
									{
										key: 'pill',
										label: __( 'Pill text', 'sgs-blocks' ),
										prefix: 'pill',
										fontSizePresets: true,
										showFontFamily: true,
										showDecoration: true,
										showTransform: true,
										showLetterSpacing: true,
										showTextAlign: true,
										showTextWrap: true,
										showTextStroke: true,
										showTextColumns: true,
										showWritingMode: true,
									},
								] }
							/>
							<SgsLengthControl
								presets
								label={ __(
									'Label margin bottom',
									'sgs-blocks'
								) }
								value={ labelMarginBottom }
								onChange={ ( val ) =>
									setAttributes( { labelMarginBottom: val } )
								}
							/>
						</>
					) }
					{ ! showLabel && (
						<p className="sgs-option-picker-editor__hint">
							{ __(
								'Turn on "Show label" in the Settings tab to reveal label styling controls.',
								'sgs-blocks'
							) }
						</p>
					) }
				</PanelBody>

				{ /* Appearance */ }
				<PanelBody
					title={ __( 'Appearance', 'sgs-blocks' ) }
					initialOpen={ true }
				>
					<SelectControl
						label={ __( 'Pill style', 'sgs-blocks' ) }
						value={ pillStyle }
						options={ PILL_STYLE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { pillStyle: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SelectControl
						label={ __( 'Pill size', 'sgs-blocks' ) }
						value={ pillSize }
						options={ PILL_SIZE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { pillSize: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ 'tile' !== pillStyle && (
						<FlexWrapControl
							label={ __( 'Wrap options', 'sgs-blocks' ) }
							help={ __( 'Applies to the pill layouts only; tiles sit on a grid that fits as many columns as the width allows. Default keeps the pills wrapping.', 'sgs-blocks' ) }
							value={ flexWrap }
							onChange={ ( val ) => setAttributes( { flexWrap: val } ) }
						/>
					) }
					{ 'tile' === pillStyle && (
						<SgsLengthControl
							label={ __( 'Tile gap', 'sgs-blocks' ) }
							value={ tileGap }
							units={ [
								{ value: 'px', label: 'px', default: 8 },
								{ value: 'rem', label: 'rem', default: 0.5 },
							] }
							onChange={ ( val ) =>
								setAttributes( { tileGap: val ?? '' } )
							}
							help={ __(
								'Space between tiles. Empty uses the framework default (8px).',
								'sgs-blocks'
							) }
						/>
					) }
					<SelectControl
						label={ __( 'Colour preset', 'sgs-blocks' ) }
						help={ __(
							'Soft = pale-tint fill + outline, no tick (matches a neutral draft look). Solid = filled selected pill with a tick (the previous default look). Leave on framework default to keep the neutral resting/selected colours below.',
							'sgs-blocks'
						) }
						value={ colourPreset }
						options={ COLOUR_PRESET_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { colourPreset: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ /* Typography controls (label + pill) are unified in the Label
					   panel's targets-based TypographyControls above — search for
					   "Group label" target to adjust both text surfaces from one call. */ }
					{ /* Border-radius is a CSS-length STRING (number+unit), so the
					   styling-lift's generic string value lands directly and an
					   explicit "0"/"0px" is distinct from empty (= CSS default). */ }
					<SgsLengthControl
						label={ __( 'Pill border width', 'sgs-blocks' ) }
						value={ pillBorderWidth || '' }
						units={ LENGTH_UNITS }
						onChange={ ( val ) =>
							setAttributes( { pillBorderWidth: val ?? '' } )
						}
						help={ __(
							'Leave blank for the default (2px).',
							'sgs-blocks'
						) }
						presets={ false }
					/>
					<SgsLengthControl
						label={ __( 'Pill border radius', 'sgs-blocks' ) }
						value={ pillBorderRadius || '' }
						units={ LENGTH_UNITS }
						onChange={ ( val ) =>
							setAttributes( { pillBorderRadius: val ?? '' } )
						}
						help={ __(
							'Leave blank for the default. Set 0 for square corners.',
							'sgs-blocks'
						) }
						presets={ false }
					/>
					{ /* Pill padding — SGS custom TIER-OF-BOXES object family
					   {desktop,tablet,mobile} (Spec 35 box-tier) — the
					   pill is a content CHILD, not the block root, so there is no
					   WP-native spacing support to route through. Empty object =
					   the per-size default padding in style.css governs. */ }
					<ResponsiveBoxControl
						label={ __( 'Pill padding', 'sgs-blocks' ) }
						presets
						values={ {
							base: pillPadding?.desktop ?? {},
							tablet: pillPadding?.tablet ?? {},
							mobile: pillPadding?.mobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							const tierKey = {
								base: 'desktop',
								tablet: 'tablet',
								mobile: 'mobile',
							}[ tier ];
							setAttributes( {
								pillPadding: {
									...pillPadding,
									[ tierKey ]: next,
								},
							} );
						} }
					/>

					<ToolsPanel
						className="sgs-nested-tools-panel"
						label={ __( 'Hover', 'sgs-blocks' ) }
						resetAll={ () =>
							setAttributes( { pillHoverOffsetX: '', pillHoverOffsetY: '', pillHoverStill: false } )
						}
					>
						<ToolsPanelItem
							label={ __( 'Hover shift (across)', 'sgs-blocks' ) }
							hasValue={ () => !! attributes.pillHoverOffsetX }
							onDeselect={ () => setAttributes( { pillHoverOffsetX: '' } ) }
						>
							<SgsLengthControl
								label={ __( 'Hover shift (across)', 'sgs-blocks' ) }
								scale="spacing"
								value={ attributes.pillHoverOffsetX || '' }
								units={ LENGTH_UNITS }
								onChange={ ( val ) => setAttributes( { pillHoverOffsetX: val ?? '' } ) }
								presets={ false }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Hover shift (down)', 'sgs-blocks' ) }
							hasValue={ () => !! attributes.pillHoverOffsetY }
							onDeselect={ () => setAttributes( { pillHoverOffsetY: '' } ) }
						>
							<SgsLengthControl
								label={ __( 'Hover shift (down)', 'sgs-blocks' ) }
								scale="spacing"
								value={ attributes.pillHoverOffsetY || '' }
								units={ LENGTH_UNITS }
								onChange={ ( val ) => setAttributes( { pillHoverOffsetY: val ?? '' } ) }
								presets={ false }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'No brightening on hover', 'sgs-blocks' ) }
							hasValue={ () => true === attributes.pillHoverStill }
							onDeselect={ () => setAttributes( { pillHoverStill: false } ) }
							isShownByDefault
						>
							<ToggleControl
								label={ __( 'No brightening on hover', 'sgs-blocks' ) }
								help={ __( 'Keeps the fill and text colour on hover; only the hover shift moves the option.', 'sgs-blocks' ) }
								checked={ true === attributes.pillHoverStill }
								onChange={ ( val ) => setAttributes( { pillHoverStill: val } ) }
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
					</ToolsPanel>

					<ToolsPanel
						className="sgs-nested-tools-panel"
						label={ __( 'Colour dot', 'sgs-blocks' ) }
						resetAll={ () =>
							setAttributes( {
								swatchSize: '',
								swatchRingWidth: '',
								swatchTickInside: false,
							} )
						}
					>
						<ToolsPanelItem
							label={ __( 'Colour dot size', 'sgs-blocks' ) }
							hasValue={ () => !! attributes.swatchSize }
							onDeselect={ () => setAttributes( { swatchSize: '' } ) }
						>
							<SgsLengthControl
								label={ __( 'Colour dot size', 'sgs-blocks' ) }
								scale="spacing"
								value={ attributes.swatchSize || '' }
								units={ LENGTH_UNITS }
								onChange={ ( val ) => setAttributes( { swatchSize: val ?? '' } ) }
								presets={ false }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Colour dot ring width', 'sgs-blocks' ) }
							hasValue={ () => !! attributes.swatchRingWidth }
							onDeselect={ () => setAttributes( { swatchRingWidth: '' } ) }
						>
							<SgsLengthControl
								label={ __( 'Colour dot ring width', 'sgs-blocks' ) }
								scale="spacing"
								value={ attributes.swatchRingWidth || '' }
								units={ LENGTH_UNITS }
								onChange={ ( val ) => setAttributes( { swatchRingWidth: val ?? '' } ) }
								presets={ false }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Tick inside the colour dot', 'sgs-blocks' ) }
							hasValue={ () => true === attributes.swatchTickInside }
							onDeselect={ () => setAttributes( { swatchTickInside: false } ) }
							isShownByDefault
						>
							<ToggleControl
								label={ __( 'Tick inside the colour dot', 'sgs-blocks' ) }
								help={ __( 'The selected tick sits inside the dot instead of before the label.', 'sgs-blocks' ) }
								checked={ true === attributes.swatchTickInside }
								onChange={ ( val ) => setAttributes( { swatchTickInside: val } ) }
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
					</ToolsPanel>

					{ /* Selection appearance — colours live in the top-level
					   SgsColourPanel (Normal/Current states per swatch).
					   This ToolsPanel holds only the non-colour selection
					   behaviour: selected pill radius + the tick toggle. */ }
					<ToolsPanel
						className="sgs-nested-tools-panel"
						label={ __( 'Selection appearance', 'sgs-blocks' ) }
						resetAll={ () =>
							setAttributes( {
								pillSelectedBorderRadius: '',
								pillSelectedShadow: '',
								pillSelectedShadowColour: '',
								pillSelectedOffsetX: '',
								pillSelectedOffsetY: '',
								showSelectedTick: false,
							} )
						}
					>
						{ /* CSS-length STRING (see Pill border radius above). */ }
						<ToolsPanelItem
							label={ __(
								'Selected pill border radius',
								'sgs-blocks'
							) }
							hasValue={ () => !! pillSelectedBorderRadius }
							onDeselect={ () =>
								setAttributes( {
									pillSelectedBorderRadius: '',
								} )
							}
						>
							<SgsLengthControl
								label={ __(
									'Selected pill border radius',
									'sgs-blocks'
								) }
								help={ __(
									'Leave blank to match the resting pill radius above. Set 0 for square corners.',
									'sgs-blocks'
								) }
								value={ pillSelectedBorderRadius || '' }
								units={ LENGTH_UNITS }
								onChange={ ( val ) =>
									setAttributes( {
										pillSelectedBorderRadius: val ?? '',
									} )
								}
								presets={ false }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Pill shadow', 'sgs-blocks' ) }
							hasValue={ () =>
								!! attributes.pillShadow ||
								!! attributes.pillShadowColour
							}
							onDeselect={ () =>
								setAttributes( {
									pillShadow: '',
									pillShadowColour: '',
								} )
							}
						>
							<ShadowControl
								label={ __( 'Pill shadow', 'sgs-blocks' ) }
								attributes={ attributes }
								setAttributes={ setAttributes }
								attrNames={ {
									base: 'pillShadow',
									colour: 'pillShadowColour',
								} }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Selected pill shadow', 'sgs-blocks' ) }
							hasValue={ () =>
								!! attributes.pillSelectedShadow ||
								!! attributes.pillSelectedShadowColour
							}
							onDeselect={ () =>
								setAttributes( {
									pillSelectedShadow: '',
									pillSelectedShadowColour: '',
								} )
							}
						>
							<ShadowControl
								label={ __( 'Selected pill shadow', 'sgs-blocks' ) }
								attributes={ attributes }
								setAttributes={ setAttributes }
								attrNames={ {
									base: 'pillSelectedShadow',
									colour: 'pillSelectedShadowColour',
								} }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Selected pill shift (across)', 'sgs-blocks' ) }
							hasValue={ () => !! attributes.pillSelectedOffsetX }
							onDeselect={ () =>
								setAttributes( { pillSelectedOffsetX: '' } )
							}
						>
							<SgsLengthControl
								label={ __( 'Selected pill shift (across)', 'sgs-blocks' ) }
								help={ __( 'Moves the selected pill sideways. Negative moves it left.', 'sgs-blocks' ) }
								value={ attributes.pillSelectedOffsetX || '' }
								units={ LENGTH_UNITS }
								onChange={ ( val ) =>
									setAttributes( { pillSelectedOffsetX: val ?? '' } )
								}
								presets={ false }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Selected pill shift (down)', 'sgs-blocks' ) }
							hasValue={ () => !! attributes.pillSelectedOffsetY }
							onDeselect={ () =>
								setAttributes( { pillSelectedOffsetY: '' } )
							}
						>
							<SgsLengthControl
								label={ __( 'Selected pill shift (down)', 'sgs-blocks' ) }
								help={ __( 'Moves the selected pill up or down. Negative moves it up.', 'sgs-blocks' ) }
								value={ attributes.pillSelectedOffsetY || '' }
								units={ LENGTH_UNITS }
								onChange={ ( val ) =>
									setAttributes( { pillSelectedOffsetY: val ?? '' } )
								}
								presets={ false }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Show selection tick', 'sgs-blocks' ) }
							hasValue={ () => showSelectedTick !== false }
							onDeselect={ () =>
								setAttributes( { showSelectedTick: false } )
							}
							isShownByDefault
						>
							<ToggleControl
								label={ __(
									'Show selection tick',
									'sgs-blocks'
								) }
								help={ __(
									'Off = no visible checkmark on the selected pill (matches a neutral outline-only selected look).',
									'sgs-blocks'
								) }
								checked={ true === showSelectedTick }
								onChange={ ( val ) =>
									setAttributes( { showSelectedTick: val } )
								}
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __(
								'Show option badge and description',
								'sgs-blocks'
							) }
							hasValue={ () => showTermDetails !== true }
							onDeselect={ () =>
								setAttributes( { showTermDetails: true } )
							}
							isShownByDefault
						>
							<ToggleControl
								label={ __(
									'Show option badge and description',
									'sgs-blocks'
								) }
								help={ __(
									'Shows each option’s badge and short description when its attribute term has them.',
									'sgs-blocks'
								) }
								checked={ showTermDetails }
								onChange={ ( val ) =>
									setAttributes( { showTermDetails: val } )
								}
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __(
								'Start with nothing selected',
								'sgs-blocks'
							) }
							hasValue={ () => requireChoice === true }
							onDeselect={ () =>
								setAttributes( { requireChoice: false } )
							}
						>
							<ToggleControl
								label={ __(
									'Start with nothing selected',
									'sgs-blocks'
								) }
								help={ __(
									'Off selects the default (or the first option) on load. On leaves the choice to the shopper.',
									'sgs-blocks'
								) }
								checked={ !! requireChoice }
								onChange={ ( val ) =>
									setAttributes( { requireChoice: val } )
								}
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
					</ToolsPanel>
				</PanelBody>

				{ /* Width / spacing — hand-rolled (no shared wrapper, contract §B3
				   content-KIND block-private pattern, mirrors sgs/quote). */ }
				<PanelBody
					title={ __( 'Width / spacing', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ResponsiveOverride
						value={ attributes.padding }
						onChange={ ( obj ) =>
							setAttributes( { padding: obj } )
						}
					>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsBoxControl
								label={ __( 'Padding', 'sgs-blocks' ) }
								values={
									ownValue && typeof ownValue === 'object'
										? ownValue
										: {}
								}
								units={ BOX_UNITS }
								presets
								onChange={ ( next ) =>
									setOwnValue(
										normaliseResponsiveBox( next )
									)
								}
							/>
						) }
					</ResponsiveOverride>
					<ResponsiveOverride
						value={ attributes.margin }
						onChange={ ( obj ) => setAttributes( { margin: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsBoxControl
								label={ __( 'Margin', 'sgs-blocks' ) }
								values={
									ownValue && typeof ownValue === 'object'
										? ownValue
										: {}
								}
								units={ BOX_UNITS }
								presets
								onChange={ ( next ) =>
									setOwnValue(
										normaliseResponsiveBox( next )
									)
								}
							/>
						) }
					</ResponsiveOverride>
					<SgsLengthControl
						label={ __( 'Width', 'sgs-blocks' ) }
						value={ width || '' }
						units={ LENGTH_UNITS }
						onChange={ ( val ) =>
							setAttributes( { width: val ?? '' } )
						}
						help={ __(
							'Exact CSS length, e.g. 400px. Leave blank for natural width.',
							'sgs-blocks'
						) }
						presets={ false }
					/>
					<SgsLengthControl
						label={ __( 'Max-width', 'sgs-blocks' ) }
						value={ maxWidth || '' }
						units={ LENGTH_UNITS }
						onChange={ ( val ) =>
							setAttributes( { maxWidth: val ?? '' } )
						}
						help={ __( 'Leave blank for no cap.', 'sgs-blocks' ) }
						presets={ false }
					/>
				</PanelBody>

				{ /* Border — box-object interface contract §1/§5: borderWidth is an
				   SGS custom object attr (base only); border-radius routes to
				   WP-native style.border.radius (skip-serialised → scoped). */ }
				<PanelBody
					title={ __( 'Border', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					{ /* One composite row
					   (width/style/colour) mirroring native's BorderBoxControl layout,
					   matching sgs/product-card + sgs/quote. Border-radius stays
					   WP-native. */ }
					<SgsBorderControl
						widthValues={ borderWidth ?? {} }
						onWidthChange={ ( next ) =>
							setAttributes( { borderWidth: next } )
						}
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ borderStyle }
						onStyleChange={ ( val ) =>
							setAttributes( { borderStyle: val } )
						}
						colourLabel={ __(
							'Wrapper border colour',
							'sgs-blocks'
						) }
						colourValue={ borderColour }
						onColourChange={ ( val ) =>
							setAttributes( { borderColour: val ?? '' } )
						}
						colourGradientValue={ borderColourGradient }
						onColourGradientChange={ ( val ) =>
							setAttributes( { borderColourGradient: val ?? '' } )
						}
						colourLinked={ true }
						radiusValues={ {
							base: attributes.borderRadius?.desktop ?? {},
							tablet: attributes.borderRadius?.tablet ?? {},
							mobile: attributes.borderRadius?.mobile ?? {},
						} }
						onRadiusChange={ ( tier, next ) => {
							const key = tier === 'base' ? 'desktop' : tier;
							setAttributes( {
								borderRadius: {
									...attributes.borderRadius,
									[ key ]: next,
								},
							} );
						} }
					/>
				</PanelBody>
			</InspectorControls>

			{ /* ── Canvas preview — <fieldset> IS the block root (§B3) ─────── */ }
			<fieldset { ...blockProps }>
				{ showLabel ? (
					<legend
						className="sgs-option-picker__label"
						style={ {
							...typographyPreviewStyle(
								attributes,
								'label',
								previewTier
							),
							...resolveTextColourPreviewStyle(
								labelColour,
								labelColourGradient,
								colourVar
							),
							...( labelMarginBottom
								? { marginBottom: gapVar( labelMarginBottom ) }
								: {} ),
						} }
					>
						{ label || __( 'Choose an option', 'sgs-blocks' ) }
					</legend>
				) : (
					<legend className="sgs-sr-only">
						{ label || __( 'Choose an option', 'sgs-blocks' ) }
					</legend>
				) }
				<div className="sgs-option-picker__options" role="group" style={ flexWrap && 'tile' !== pillStyle ? { flexWrap } : undefined }>
					{ renderPills() }
				</div>
			</fieldset>
		</>
	);
}
