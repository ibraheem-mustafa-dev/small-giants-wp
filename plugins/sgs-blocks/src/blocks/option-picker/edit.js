/**
 * SGS Option Picker — editor component.
 *
 * NO-INLINE + NO-WRAPPER (LOCKED per-block no-inline migration contract
 * §A/§B/§B3, 2026-07-09 — D294 content-KIND pattern, mirrors sgs/quote):
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
import { useBlockProps, InspectorControls, useSettings } from '@wordpress/block-editor';
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
	ResponsiveControl,
	ResponsiveBoxControl,
	SgsColourPanel,
	SgsLengthControl,
	SgsBorderControl,
	MediaElementPanel,
} from '../../components';
import { colourVar, resolveTextColourPreviewStyle, borderPaintPreview } from '../../utils';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';

/* ── Options ─────────────────────────────────────────────────────────────── */

const PILL_STYLE_OPTIONS = [
	{ label: __( 'Outlined (default)', 'sgs-blocks' ), value: 'outlined' },
	{ label: __( 'Filled', 'sgs-blocks' ),            value: 'filled'   },
	{ label: __( 'Ghost', 'sgs-blocks' ),             value: 'ghost'    },
];

const PILL_SIZE_OPTIONS = [
	{ label: __( 'Small', 'sgs-blocks' ),           value: 'small'  },
	{ label: __( 'Medium (default)', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Large', 'sgs-blocks' ),            value: 'large'  },
];

const COLOUR_PRESET_OPTIONS = [
	{ label: __( '— Framework default —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Soft (pale-tint fill, outline, no tick)', 'sgs-blocks' ), value: 'soft' },
	{ label: __( 'Solid (filled selected, tick)', 'sgs-blocks' ), value: 'solid' },
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

// Box-object interface contract §1: build an editor-preview shorthand from a
// box object — mirrors render.php's box-shorthand builder (contract §5).
function boxShorthand( box, keys ) {
	if ( ! box || 'object' !== typeof box ) return undefined;
	if ( ! keys.some( ( key ) => box[ key ] ) ) return undefined;
	return keys.map( ( key ) => box[ key ] || '0' ).join( ' ' );
}

function buildRootPreviewStyle( attributes ) {
	const {
		style,
		borderWidth,
		borderStyle,
		borderColour,
		borderColourGradient,
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
		pillSelectedBorderRadius,
	} = attributes;

	const rootStyle = {};

	const radiusPreview = boxShorthand( style?.border?.radius, [ 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' ] );
	if ( radiusPreview ) {
		rootStyle.borderRadius = radiusPreview;
	}

	const borderWidthPreview = boxShorthand( borderWidth, [ 'top', 'right', 'bottom', 'left' ] );
	if ( borderStyle && borderStyle !== 'none' ) {
		if ( borderWidthPreview ) {
			rootStyle.borderWidth = borderWidthPreview;
		}
		rootStyle.borderStyle = borderStyle;
		if ( borderColour ) {
			rootStyle.borderColor = /^#|^rgb|^hsl/.test( borderColour )
				? borderColour
				: colourVar( borderColour );
		}
		// A gradient border renders frontend as a masked ::before ring, which cannot
		// be reproduced in a plain inline style — approximate it with the gradient as
		// a border-image so the canvas at least shows that a gradient is applied.
		if ( borderColourGradient && /^(repeating-)?(linear|radial|conic)-gradient\(/i.test( borderColourGradient ) ) {
			rootStyle.borderImage = `${ borderColourGradient } 1`;
		}
	}

	const paddingPreview = boxShorthand( style?.spacing?.padding, [ 'top', 'right', 'bottom', 'left' ] );
	if ( paddingPreview ) {
		rootStyle.padding = paddingPreview;
	}
	const marginPreview = boxShorthand( style?.spacing?.margin, [ 'top', 'right', 'bottom', 'left' ] );
	if ( marginPreview ) {
		rootStyle.margin = marginPreview;
	}

	if ( maxWidth ) {
		rootStyle.maxWidth = maxWidth;
	}
	if ( width ) {
		rootStyle.width = width;
	}

	// Pill colour/radius vars — CSS custom-property VALUES only (Spec 32
	// FR-32-4), same channel render.php emits on the root element's style.
	if ( pillBgColour )               rootStyle[ '--sgs-op-bg' ]              = colourVar( pillBgColour );
	if ( pillBgColourGradient )       rootStyle[ '--sgs-op-bg-gradient' ]      = pillBgColourGradient;
	if ( pillTextColour )             rootStyle[ '--sgs-op-text' ]            = colourVar( pillTextColour );
	if ( pillBgColourHover )          rootStyle[ '--sgs-op-bg-hover' ]        = colourVar( pillBgColourHover );
	if ( pillBgColourHoverGradient )  rootStyle[ '--sgs-op-bg-hover-gradient' ] = pillBgColourHoverGradient;
	if ( pillTextColourHover )        rootStyle[ '--sgs-op-text-hover' ]      = colourVar( pillTextColourHover );
	if ( pillBorderColour )           rootStyle[ '--sgs-op-border' ]          = colourVar( pillBorderColour );
	if ( pillSelectedBgColour )       rootStyle[ '--sgs-op-sel-bg' ]          = colourVar( pillSelectedBgColour );
	if ( pillSelectedTextColour )     rootStyle[ '--sgs-op-sel-text' ]        = colourVar( pillSelectedTextColour );
	if ( pillSelectedBorderColour )   rootStyle[ '--sgs-op-sel-border' ]      = colourVar( pillSelectedBorderColour );
	if ( pillBorderRadius )           rootStyle[ '--sgs-op-pill-radius' ]     = pillBorderRadius + 'px';
	if ( pillSelectedBorderRadius )   rootStyle[ '--sgs-op-sel-pill-radius' ] = pillSelectedBorderRadius + 'px';

	return rootStyle;
}

/* ── Component ──────────────────────────────────────────────────────────── */

export default function Edit( { attributes, setAttributes } ) {
	const {
		style,
		label,
		showLabel,
		labelColour,
		labelColourGradient,
		labelMarginBottom,
		optionItems,
		defaultSelected,
		pillStyle,
		pillSize,
		colourPreset,
		showSelectedTick,
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
		pillSelectedBorderRadius,
		borderRadiusTablet,
		borderRadiusMobile,
		// pillPadding is a TIER-OF-BOXES OBJECT {desktop,tablet,mobile} (Spec 35
		// box-tier migration) — the pillPaddingTablet/pillPaddingMobile sibling
		// attrs no longer exist in this block's schema.
		pillPadding,
		borderWidth,
		borderStyle,
		borderColour,
		borderColourGradient,
		paddingTablet,
		paddingMobile,
		marginTablet,
		marginMobile,
		width,
		maxWidth,
	} = attributes;

	// Contract §B3: NO wrapper <div> — the <fieldset> IS the block root
	// (matches render.php). Same DOM shape/classes untouched view.js/editor.css
	// depend on: .sgs-option-picker, .sgs-option-picker__options.
	const blockProps = useBlockProps( {
		as: 'fieldset',
		className: [
			'sgs-option-picker',
			`sgs-option-picker--${ pillStyle }`,
			`sgs-option-picker--${ pillSize }`,
			colourPreset ? `sgs-option-picker--${ colourPreset }` : '',
			showSelectedTick ? '' : 'sgs-option-picker--no-tick',
		].filter( Boolean ).join( ' ' ),
		style: buildRootPreviewStyle( attributes ),
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
		if ( toIndex < 0 || toIndex >= optionItems.length ) return;
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
	const pillPaddingPreview = boxShorthand( pillPadding?.desktop, [ 'top', 'right', 'bottom', 'left' ] );

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
	const [ optionPickerPalette ] = useSettings( 'color.palette' );
	const pillBorderGradientPreview = borderPaintPreview( '', pillBorderColourGradient, optionPickerPalette );
	const pillSelectedBorderGradientPreview = borderPaintPreview( '', pillSelectedBorderColourGradient, optionPickerPalette );

	/* ── Canvas preview pills ── */
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
							...( pillPaddingPreview ? { padding: pillPaddingPreview } : {} ),
							...pillTextPreviewStyle,
							...pillBorderGradientPreview,
							...( isSelected ? pillSelectedBorderGradientPreview : {} ),
						} }
					>
						{ item.label || item.key || `Option ${ index + 1 }` }
					</span>
				</span>
			);
		} );
	};

	return (
		<>
			{ /* D619 — ONE grouped, SGS-owned colour panel, mounted FIRST so it
			   sits at the top of the inspector (mirrors sgs/button). Replaces
			   the scattered DesignTokenPicker rows that used to live in the
			   "Colours" ToolsPanel + the Label/Border panels below.
			   GROUND-TRUTH (style.css:186-289 base+:hover+:checked rules;
			   block.json pill-element note, FR-35-5): pillBgColour/
			   pillTextColour/pillBorderColour are the RESTING state.
			   UPDATE (2026-09-03, block owner reversal): the pill's :hover
			   USED TO reuse the resting vars with no distinct hover-only
			   attribute — that FR-35-5 exception has been reversed, so
			   pillBgColourHover/pillTextColourHover now exist as real
			   attributes (mirroring sgs/nav-menu's item-bg/item-text
			   normal+hover rows) and are wired as a genuine "Hover" state
			   below, between Normal and Current. pillBorderColour has no
			   hover sibling (out of scope for this reversal). The
			   remaining second state is "current" (pillSelected*Colour,
			   driven by :checked). Grouped here as Normal/Hover/Current
			   triples per pill property, all `linked: true`. */ }
			<SgsColourPanel
				rows={ [
					{
						key: 'label',
						label: __( 'Label colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: labelColour,
								onChange: ( val ) => setAttributes( { labelColour: val ?? '' } ),
								linked: true,
								gradientValue: labelColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { labelColourGradient: val ?? '' } ),
							},
						],
					},
					{
						key: 'pillBackground',
						label: __( 'Pill background', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: pillBgColour,
								onChange: ( val ) => setAttributes( { pillBgColour: val ?? '' } ),
								linked: true,
								gradientValue: pillBgColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { pillBgColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: pillBgColourHover,
								onChange: ( val ) => setAttributes( { pillBgColourHover: val ?? '' } ),
								linked: true,
								gradientValue: pillBgColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { pillBgColourHoverGradient: val ?? '' } ),
							},
							{
								key: 'current',
								label: __( 'Current', 'sgs-blocks' ),
								value: pillSelectedBgColour,
								onChange: ( val ) => setAttributes( { pillSelectedBgColour: val ?? '' } ),
								linked: true,
								// No pillSelectedBgColourGradient attribute exists (out of
								// scope for this rollout, same reasoning as pillText's
								// 'current' state below) — a required no-op, not a missing
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
								onChange: ( val ) => setAttributes( { pillTextColour: val ?? '' } ),
								linked: true,
								gradientValue: pillTextColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { pillTextColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: pillTextColourHover,
								onChange: ( val ) => setAttributes( { pillTextColourHover: val ?? '' } ),
								linked: true,
								// No pillTextColourHoverGradient attribute exists (out of
								// scope for this rollout — see block.json pill-element
								// note). GradientCapableColourControl's Solid picker calls
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
								onChange: ( val ) => setAttributes( { pillSelectedTextColour: val ?? '' } ),
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
								onChange: ( val ) => setAttributes( { pillBorderColour: val ?? '' } ),
								linked: true,
								gradientValue: pillBorderColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { pillBorderColourGradient: val ?? '' } ),
							},
							{
								key: 'current',
								label: __( 'Current', 'sgs-blocks' ),
								value: pillSelectedBorderColour,
								onChange: ( val ) => setAttributes( { pillSelectedBorderColour: val ?? '' } ),
								linked: true,
								gradientValue: pillSelectedBorderColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { pillSelectedBorderColourGradient: val ?? '' } ),
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
				<PanelBody title={ __( 'Label', 'sgs-blocks' ) } initialOpen={ false }>
					<TextControl
						label={ __( 'Label text', 'sgs-blocks' ) }
						value={ label }
						onChange={ ( val ) =>
							setAttributes( { label: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
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
						<Notice
							status="warning"
							isDismissible={ false }
						>
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
										label={ __(
											'Label',
											'sgs-blocks'
										) }
										value={ item.label }
										onChange={ ( val ) =>
											updateOption(
												index,
												'label',
												val
											)
										}
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
									<TextControl
										label={ __( 'Key (unique ID)', 'sgs-blocks' ) }
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
											index ===
											optionItems.length - 1
										}
										onClick={ () =>
											moveOption( index, 1 )
										}
									/>
									<Button
										icon="trash"
										label={ __(
											'Remove option',
											'sgs-blocks'
										) }
										isSmall
										isDestructive
										onClick={ () =>
											removeOption( index )
										}
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
						value={ ( attributes.contentImpact || [] ).join( ', ' ) }
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
			</InspectorControls>

			{ /* ── Inspector — Styles tab (appearance: label look, pill style,
			   colours, width/spacing, border) ────────────────────────────── */ }
			<InspectorControls group="styles">

				{ /* Label style — typography/margin/colour only surface when the
				   label is actually shown (showLabel lives in the Settings tab). */ }
				<PanelBody title={ __( 'Label', 'sgs-blocks' ) } initialOpen={ false }>
					{ showLabel && (
						<>
							<TypographyControls
								attributes={ attributes }
								setAttributes={ setAttributes }
								prefix="label"
								showLineHeight={ false }
							/>
							<TextControl
								label={ __( 'Label margin bottom', 'sgs-blocks' ) }
								help={ __(
									'CSS value, e.g. 8px or 0.5rem. Empty = default.',
									'sgs-blocks'
								) }
								value={ labelMarginBottom }
								onChange={ ( val ) =>
									setAttributes( { labelMarginBottom: val } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
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
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix="pill"
						showLineHeight={ false }
						showStyle={ false }
					/>
					{ /* Border-radius is a CSS-length STRING (number+unit), so the
					   styling-lift's generic string value lands directly and an
					   explicit "0"/"0px" is distinct from empty (= CSS default). */ }
					<SgsLengthControl
						label={ __( 'Pill border radius', 'sgs-blocks' ) }
						value={ pillBorderRadius || '' }
						units={ LENGTH_UNITS }
						onChange={ ( val ) =>
							setAttributes( { pillBorderRadius: val ?? '' } )
						}
						help={ __( 'Leave blank for the default. Set 0 for square corners.', 'sgs-blocks' ) }
						presets={ false }
					/>
					{ /* Pill padding — SGS custom TIER-OF-BOXES object family
					   {desktop,tablet,mobile} (Spec 35 box-tier migration) — the
					   pill is a content CHILD, not the block root, so there is no
					   WP-native spacing support to route through. Empty object =
					   the per-size default padding in style.css governs unchanged. */ }
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
								pillPadding: { ...pillPadding, [ tierKey ]: next },
							} );
						} }
					/>
				</PanelBody>

				{ /* Swatch image — the image-swatch <img> (render.php §"Swatch
				   rendering") is a fixed 2rem crop of a WooCommerce attribute
				   term's image, not a picker this block's own attributes drive —
				   but the fit MODE is still a legitimate client choice, so this
				   panel is always available (which options actually carry an
				   image swatch depends on WC term-meta, invisible to the editor
				   ahead of render). */ }
				<PanelBody title={ __( 'Swatch image', 'sgs-blocks' ) } initialOpen={ false }>
					<MediaElementPanel
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix="swatch"
						blockSlug="sgs/option-picker"
						insertion="element"
						atoms={ [ 'object-fit' ] }
						mediaType="image"
						scope="element"
					/>
				</PanelBody>

				{ /* Selection appearance — colours moved to the top-level
				   SgsColourPanel (D619, Normal/Current states per swatch).
				   This ToolsPanel now holds only the non-colour selection
				   behaviour: selected pill radius + the tick toggle. */ }
				<PanelBody
					title={ __( 'Selection appearance', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToolsPanel
						className="sgs-nested-tools-panel"
						label={ __( 'Selection appearance', 'sgs-blocks' ) }
						resetAll={ () =>
							setAttributes( {
								pillSelectedBorderRadius: '',
								showSelectedTick: true,
							} )
						}
					>
						{ /* CSS-length STRING (see Pill border radius above). */ }
						<ToolsPanelItem
							label={ __( 'Selected pill border radius', 'sgs-blocks' ) }
							hasValue={ () => !! pillSelectedBorderRadius }
							onDeselect={ () => setAttributes( { pillSelectedBorderRadius: '' } ) }
						>
							<SgsLengthControl
								label={ __( 'Selected pill border radius', 'sgs-blocks' ) }
								help={ __( 'Leave blank to match the resting pill radius above. Set 0 for square corners.', 'sgs-blocks' ) }
								value={ pillSelectedBorderRadius || '' }
								units={ LENGTH_UNITS }
								onChange={ ( val ) =>
									setAttributes( { pillSelectedBorderRadius: val ?? '' } )
								}
								presets={ false }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Show selection tick', 'sgs-blocks' ) }
							hasValue={ () => showSelectedTick !== true }
							onDeselect={ () => setAttributes( { showSelectedTick: true } ) }
							isShownByDefault
						>
							<ToggleControl
								label={ __( 'Show selection tick', 'sgs-blocks' ) }
								help={ __(
									'Off = no visible checkmark on the selected pill (matches a neutral outline-only selected look).',
									'sgs-blocks'
								) }
								checked={ showSelectedTick }
								onChange={ ( val ) =>
									setAttributes( { showSelectedTick: val } )
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
					<SgsLengthControl
						label={ __( 'Width', 'sgs-blocks' ) }
						value={ width || '' }
						units={ LENGTH_UNITS }
						onChange={ ( val ) => setAttributes( { width: val ?? '' } ) }
						help={ __( 'Exact CSS length, e.g. 400px. Leave blank for natural width.', 'sgs-blocks' ) }
						presets={ false }
					/>
					<SgsLengthControl
						label={ __( 'Max-width', 'sgs-blocks' ) }
						value={ maxWidth || '' }
						units={ LENGTH_UNITS }
						onChange={ ( val ) => setAttributes( { maxWidth: val ?? '' } ) }
						help={ __( 'Leave blank for no cap.', 'sgs-blocks' ) }
						presets={ false }
					/>
				</PanelBody>

				{ /* Border — box-object interface contract §1/§5: borderWidth is an
				   SGS custom object attr (base only); border-radius routes to
				   WP-native style.border.radius (skip-serialised → scoped). */ }
				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
										{ /* Task 0 codemod (migrate-border-control.js) -- one composite row
					   (width/style/colour) mirroring native's BorderBoxControl layout,
					   matching sgs/product-card + sgs/quote. Border-radius is unchanged
					   (stays WP-native). */ }
					<SgsBorderControl
						widthValues={ borderWidth ?? {} }
						onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ borderStyle }
						onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
						colourLabel={ __( 'Wrapper border colour', 'sgs-blocks' ) }
						colourValue={ borderColour }
						onColourChange={ ( val ) => setAttributes( { borderColour: val ?? '' } ) }
						colourGradientValue={ borderColourGradient }
						onColourGradientChange={ ( val ) =>
									setAttributes( { borderColourGradient: val ?? '' } ) }
						colourLinked={ true }
						radiusValues={ {
								base: attributes.borderRadius?.desktop ?? {},
								tablet: attributes.borderRadius?.tablet ?? {},
								mobile: attributes.borderRadius?.mobile ?? {},
							} }
						onRadiusChange={ ( tier, next ) => {
							const key = tier === 'base' ? 'desktop' : tier;
							setAttributes( { borderRadius: { ...attributes.borderRadius, [ key ]: next } } );
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
							...resolveTextColourPreviewStyle( labelColour, labelColourGradient, colourVar ),
							...( labelMarginBottom ? { marginBottom: labelMarginBottom }         : {} ),
						} }
					>
						{ label || __( 'Choose an option', 'sgs-blocks' ) }
					</legend>
				) : (
					<legend className="sgs-sr-only">
						{ label || __( 'Choose an option', 'sgs-blocks' ) }
					</legend>
				) }
				<div className="sgs-option-picker__options" role="group">
					{ renderPills() }
				</div>
			</fieldset>
		</>
	);
}
