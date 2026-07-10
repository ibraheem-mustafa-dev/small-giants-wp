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
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
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
	__experimentalUnitControl as UnitControl,
} from '@wordpress/components';
import {
	DesignTokenPicker,
	TypographyControls,
	ResponsiveControl,
	ResponsiveBoxControl,
	ResponsiveBorderRadiusControl,
} from '../../components';
import { colourVar } from '../../utils';

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

const BORDER_STYLE_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Solid', 'sgs-blocks' ), value: 'solid' },
	{ label: __( 'Dashed', 'sgs-blocks' ), value: 'dashed' },
	{ label: __( 'Dotted', 'sgs-blocks' ), value: 'dotted' },
	{ label: __( 'Double', 'sgs-blocks' ), value: 'double' },
	{ label: __( 'Groove', 'sgs-blocks' ), value: 'groove' },
	{ label: __( 'Ridge', 'sgs-blocks' ), value: 'ridge' },
	{ label: __( 'Inset', 'sgs-blocks' ), value: 'inset' },
	{ label: __( 'Outset', 'sgs-blocks' ), value: 'outset' },
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
		maxWidth,
		contentWidth,
		pillBgColour,
		pillTextColour,
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
	if ( contentWidth ) {
		rootStyle.width = contentWidth;
	}

	// Pill colour/radius vars — CSS custom-property VALUES only (Spec 32
	// FR-32-4), same channel render.php emits on the root element's style.
	if ( pillBgColour )               rootStyle[ '--sgs-op-bg' ]              = colourVar( pillBgColour );
	if ( pillTextColour )             rootStyle[ '--sgs-op-text' ]            = colourVar( pillTextColour );
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
		labelMarginBottom,
		optionItems,
		defaultSelected,
		pillStyle,
		pillSize,
		colourPreset,
		showSelectedTick,
		pillBgColour,
		pillTextColour,
		pillBorderColour,
		pillSelectedBgColour,
		pillSelectedTextColour,
		pillSelectedBorderColour,
		pillBorderRadius,
		pillSelectedBorderRadius,
		pillPadding,
		pillPaddingTablet,
		pillPaddingMobile,
		borderWidth,
		borderStyle,
		borderColour,
		paddingTablet,
		paddingMobile,
		marginTablet,
		marginMobile,
		contentWidth,
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
					<span className="sgs-option-picker__pill">
						{ item.label || item.key || `Option ${ index + 1 }` }
					</span>
				</span>
			);
		} );
	};

	return (
		<>
			{ /* ── Inspector ────────────────────────────────────────── */ }
			<InspectorControls>

				{ /* Label panel */ }
				<PanelBody title={ __( 'Label', 'sgs-blocks' ) }>
					<TextControl
						label={ __( 'Label text', 'sgs-blocks' ) }
						value={ label }
						onChange={ ( val ) =>
							setAttributes( { label: val } )
						}
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Show label', 'sgs-blocks' ) }
						checked={ showLabel }
						onChange={ ( val ) =>
							setAttributes( { showLabel: val } )
						}
						__nextHasNoMarginBottom
					/>
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
							/>
							<DesignTokenPicker
								label={ __( 'Label colour', 'sgs-blocks' ) }
								value={ labelColour }
								onChange={ ( val ) =>
									setAttributes( { labelColour: val } )
								}
							/>
						</>
					) }
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
					/>
				</PanelBody>

				{ /* Appearance */ }
				<PanelBody
					title={ __( 'Appearance', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Pill style', 'sgs-blocks' ) }
						value={ pillStyle }
						options={ PILL_STYLE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { pillStyle: val } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Pill size', 'sgs-blocks' ) }
						value={ pillSize }
						options={ PILL_SIZE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { pillSize: val } )
						}
						__nextHasNoMarginBottom
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
					<UnitControl
						label={ __( 'Pill border radius', 'sgs-blocks' ) }
						value={ pillBorderRadius || '' }
						units={ LENGTH_UNITS }
						onChange={ ( val ) =>
							setAttributes( { pillBorderRadius: val ?? '' } )
						}
						help={ __( 'Leave blank for the default. Set 0 for square corners.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
					/>
					{ /* Pill padding — SGS custom box-object family (base + tiers) —
					   the pill is a content CHILD, not the block root, so there is
					   no WP-native spacing support to route through. Empty object =
					   the per-size default padding in style.css governs unchanged. */ }
					<ResponsiveBoxControl
						label={ __( 'Pill padding', 'sgs-blocks' ) }
						values={ {
							base: pillPadding ?? {},
							tablet: pillPaddingTablet ?? {},
							mobile: pillPaddingMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( 'base' === tier ) {
								setAttributes( { pillPadding: next } );
							} else {
								setAttributes( { [ `pillPadding${ 'tablet' === tier ? 'Tablet' : 'Mobile' }` ]: next } );
							}
						} }
					/>
				</PanelBody>

				{ /* Colours */ }
				<PanelBody
					title={ __( 'Colours', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Resting pill background', 'sgs-blocks' ) }
						value={ pillBgColour }
						onChange={ ( val ) =>
							setAttributes( { pillBgColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Resting pill text', 'sgs-blocks' ) }
						value={ pillTextColour }
						onChange={ ( val ) =>
							setAttributes( { pillTextColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Resting pill border', 'sgs-blocks' ) }
						value={ pillBorderColour }
						onChange={ ( val ) =>
							setAttributes( { pillBorderColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __(
							'Selected pill background',
							'sgs-blocks'
						) }
						value={ pillSelectedBgColour }
						onChange={ ( val ) =>
							setAttributes( { pillSelectedBgColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Selected pill text', 'sgs-blocks' ) }
						value={ pillSelectedTextColour }
						onChange={ ( val ) =>
							setAttributes( {
								pillSelectedTextColour: val,
							} )
						}
					/>
					<DesignTokenPicker
						label={ __(
							'Selected pill border',
							'sgs-blocks'
						) }
						help={ __(
							'Independent of the selected fill colour — set this to reproduce a decoupled "pale fill + coloured outline" selected pill. Leave empty to match the fill (previous behaviour).',
							'sgs-blocks'
						) }
						value={ pillSelectedBorderColour }
						onChange={ ( val ) =>
							setAttributes( { pillSelectedBorderColour: val } )
						}
					/>
					{ /* CSS-length STRING (see Pill border radius above). */ }
					<UnitControl
						label={ __( 'Selected pill border radius', 'sgs-blocks' ) }
						help={ __( 'Leave blank to match the resting pill radius above. Set 0 for square corners.', 'sgs-blocks' ) }
						value={ pillSelectedBorderRadius || '' }
						units={ LENGTH_UNITS }
						onChange={ ( val ) =>
							setAttributes( { pillSelectedBorderRadius: val ?? '' } )
						}
						__nextHasNoMarginBottom
					/>
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
				</PanelBody>

				{ /* Width / spacing — hand-rolled (no shared wrapper, contract §B3
				   content-KIND block-private pattern, mirrors sgs/quote). */ }
				<PanelBody
					title={ __( 'Width / spacing', 'sgs-blocks' ) }
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
					<UnitControl
						label={ __( 'Content width', 'sgs-blocks' ) }
						value={ contentWidth || '' }
						units={ LENGTH_UNITS }
						onChange={ ( val ) => setAttributes( { contentWidth: val ?? '' } ) }
						help={ __( 'Exact CSS length, e.g. 400px. Leave blank for natural width.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
					/>
					<UnitControl
						label={ __( 'Max-width', 'sgs-blocks' ) }
						value={ maxWidth || '' }
						units={ LENGTH_UNITS }
						onChange={ ( val ) => setAttributes( { maxWidth: val ?? '' } ) }
						help={ __( 'Leave blank for no cap.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ /* Border — box-object interface contract §1/§5: borderWidth is an
				   SGS custom object attr (base only); border-radius routes to
				   WP-native style.border.radius (skip-serialised → scoped). */ }
				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Border style', 'sgs-blocks' ) }
						value={ borderStyle }
						options={ BORDER_STYLE_OPTIONS }
						onChange={ ( val ) => setAttributes( { borderStyle: val } ) }
						__nextHasNoMarginBottom
					/>
					{ borderStyle !== 'none' && (
						<DesignTokenPicker
							label={ __( 'Border colour', 'sgs-blocks' ) }
							value={ borderColour }
							onChange={ ( val ) => setAttributes( { borderColour: val ?? '' } ) }
						/>
					) }
					<ResponsiveBoxControl
						label={ __( 'Border width', 'sgs-blocks' ) }
						values={ { base: borderWidth ?? {} } }
						showResponsive={ false }
						onChange={ ( tier, next ) => setAttributes( { borderWidth: next } ) }
					/>
					<ResponsiveBorderRadiusControl
						label={ __( 'Root border radius', 'sgs-blocks' ) }
						values={ { base: style?.border?.radius ?? {} } }
						showResponsive={ false }
						onChange={ ( tier, next ) => setAttributes( { style: { ...style, border: { ...style?.border, radius: next } } } ) }
					/>
				</PanelBody>

				{ /* Converter metadata */ }
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
					/>
				</PanelBody>
			</InspectorControls>

			{ /* ── Canvas preview — <fieldset> IS the block root (§B3) ─────── */ }
			<fieldset { ...blockProps }>
				{ showLabel ? (
					<legend
						className="sgs-option-picker__label"
						style={ {
							...( labelColour       ? { color:        colourVar( labelColour ) }  : {} ),
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
