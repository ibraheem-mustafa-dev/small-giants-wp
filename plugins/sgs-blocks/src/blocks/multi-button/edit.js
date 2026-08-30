import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	useSettings,
} from '@wordpress/block-editor';
import { useSelect, useDispatch } from '@wordpress/data';
// WS-4: shared sgs/container wrapper editor controls (layout kind).
import ContainerWrapperControls, { BackgroundPanel } from '../container/components/ContainerWrapperControls';
import {
	ResponsiveOverride,
	SpacingControl,
	SgsColourPanel,
	fillRow,
	ResponsiveBoxControl,
	DesignTokenPicker,
	SGS_FONT_WEIGHT_OPTIONS,
	textRow,
} from '../../components';
import { backgroundPreview, spacingPreview } from '../../utils';
import {
	PanelBody,
	SelectControl,
	TextControl,
	Button,
} from '@wordpress/components';
import { BUTTON_PRESETS } from '../button/presets';

const CHILD_PRESET_OPTIONS = [
	{ label: __( 'Primary', 'sgs-blocks' ), value: 'primary' },
	{ label: __( 'Secondary', 'sgs-blocks' ), value: 'secondary' },
	{ label: __( 'Outline', 'sgs-blocks' ), value: 'outline' },
];

const TEMPLATE = [
	[ 'sgs/button', { inheritStyle: 'primary', label: 'Primary Action' } ],
	[ 'sgs/button', { inheritStyle: 'secondary', label: 'Secondary Action' } ],
];

const DIRECTION_OPTIONS = [
	{ label: __( 'Row (horizontal)', 'sgs-blocks' ), value: 'row' },
	{ label: __( 'Column (vertical)', 'sgs-blocks' ), value: 'column' },
];

const DIRECTION_OPTIONS_WITH_INHERIT = [
	{ label: __( '— inherit desktop —', 'sgs-blocks' ), value: '' },
	...DIRECTION_OPTIONS,
];

const JUSTIFY_OPTIONS = [
	{ label: __( 'Start', 'sgs-blocks' ), value: 'flex-start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'End', 'sgs-blocks' ), value: 'flex-end' },
	{ label: __( 'Space Between', 'sgs-blocks' ), value: 'space-between' },
];

const JUSTIFY_OPTIONS_WITH_INHERIT = [
	{ label: __( '— inherit desktop —', 'sgs-blocks' ), value: '' },
	...JUSTIFY_OPTIONS,
];

const WRAP_OPTIONS = [
	{ label: __( 'Wrap', 'sgs-blocks' ), value: 'wrap' },
	{ label: __( 'No Wrap', 'sgs-blocks' ), value: 'nowrap' },
];

const WRAP_OPTIONS_WITH_INHERIT = [
	{ label: __( '— inherit desktop —', 'sgs-blocks' ), value: '' },
	...WRAP_OPTIONS,
];

const ALIGN_ITEMS_OPTIONS = [
	{ label: __( 'Start', 'sgs-blocks' ), value: 'flex-start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'End', 'sgs-blocks' ), value: 'flex-end' },
	{ label: __( 'Stretch', 'sgs-blocks' ), value: 'stretch' },
];

const ALIGN_ITEMS_OPTIONS_WITH_INHERIT = [
	{ label: __( 'Inherit', 'sgs-blocks' ), value: '' },
	...ALIGN_ITEMS_OPTIONS,
];

export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		// `flexDirection`/`flexWrap`/`justifyContent`/`alignItems` are now TIER
		// OBJECTS (Spec 35 pass, {desktop,tablet,mobile}) — the legacy
		// `direction`/`wrap` names and the flat `…Tablet`/`…Mobile` siblings are
		// no longer declared by block.json (folded into the object).
		flexDirection,
		gap,
		justifyContent,
		flexWrap,
		alignItems,
		textColour,
		childBtnBackground,
		childBtnTextColour,
		childBtnBorderColour,
		childBtnBorderRadius,
		childBtnFontSize,
		childBtnFontWeight,
	} = attributes;

	// Only the DESKTOP tier is read here (the editorStyle preview below). The
	// tier controls read/write the object directly via ResponsiveOverride.
	const direction = flexDirection?.desktop || 'row';
	const wrap      = flexWrap?.desktop || 'nowrap';
	const justify   = justifyContent?.desktop || 'flex-start';
	const align     = alignItems?.desktop || 'center';

	// "Apply to all buttons" — bulk preset-as-seed for every sgs/button child.
	const [ groupPreset, setGroupPreset ] = useState( 'primary' );
	const childButtons = useSelect(
		( select ) =>
			( select( 'core/block-editor' ).getBlock( clientId )?.innerBlocks || [] ).filter(
				( block ) => 'sgs/button' === block.name
			),
		[ clientId ]
	);
	const { updateBlockAttributes } = useDispatch( 'core/block-editor' );

	const applyPresetToAllButtons = () => {
		const presetValues = BUTTON_PRESETS[ groupPreset ];
		childButtons.forEach( ( child ) => {
			updateBlockAttributes( child.clientId, { ...presetValues, inheritStyle: groupPreset } );
		} );
	};

	// D717/background-preview: BackgroundPanel (mounted below) writes image/
	// video/overlay/ken-burns/parallax attrs this block never previewed on
	// canvas — the shared mirror (src/utils/background-preview.js, 2026-08-26)
	// fixes that the same way sgs/container already did.
	const [ colourPalette ] = useSettings( 'color.palette' );
	const bgPreview = backgroundPreview( {
		backgroundImage: attributes.backgroundImage,
		bgVideo: attributes.bgVideo,
		backgroundSize: attributes.backgroundSize,
		backgroundPosition: attributes.backgroundPosition,
		backgroundRepeat: attributes.backgroundRepeat,
		backgroundAttachment: attributes.backgroundAttachment,
		bgKenBurns: attributes.bgKenBurns,
		bgAnimationDuration: attributes.bgAnimationDuration,
		bgParallax: attributes.bgParallax,
		backgroundOverlayColour: attributes.backgroundOverlayColour,
		overlayGradient: attributes.overlayGradient,
		backgroundOverlayOpacity: attributes.backgroundOverlayOpacity,
		backgroundOverlayBlendMode: attributes.backgroundOverlayBlendMode,
	}, colourPalette );

	// Active device tier for the padding/margin preview below, read from the
	// SAME source sgs/container's editor mirror reads (`core/editor`
	// getDeviceType) — this block had no previewTier mechanism of its own
	// (its layout preview above only ever shows the desktop tier), so this
	// follows container's exactly rather than inventing a second convention.
	const previewTier = useSelect( ( select ) => {
		const ed = select( 'core/editor' );
		const device =
			ed && typeof ed.getDeviceType === 'function' ? ed.getDeviceType() : null;
		return { Tablet: 'tablet', Mobile: 'mobile' }[ device ] || 'desktop';
	}, [] );

	// Padding/margin canvas preview (measured live 2026-08-26: this block
	// showed 0px on canvas against a real 120px/80px page). Base padding AND
	// margin are now block-OWNED `padding`/`margin` object attrs, migrated off
	// WP-native supports.spacing on 2026-08-27 to match sgs/container (D555).
	// Bean ruled FULL parity for this block in that pass, so margin gained its
	// own marginTablet/marginMobile tier attrs too — the previous note here that
	// they "resolve to undefined" is no longer true.
	const spacePreview = spacingPreview( {
		basePadding: attributes.padding,
		paddingTablet: attributes.paddingTablet,
		paddingMobile: attributes.paddingMobile,
		baseMargin: attributes.margin,
		marginTablet: attributes.marginTablet,
		marginMobile: attributes.marginMobile,
	}, previewTier );

	// Preview the desktop layout in the editor.
	// Gap comes from the block's own Layout panel Gap control (raw CSS string).
	const editorStyle = {
		display: 'flex',
		flexDirection: direction,
		flexWrap: wrap,
		gap: gap?.desktop || undefined,
		justifyContent: justify,
		alignItems: align,
		...bgPreview.style,
		...spacePreview,
	};

	// A button group's children are always sgs/button (that IS the block's
	// purpose) — a stray non-button block dropped here would break the flex
	// row this block renders, so this roster is never relaxed.
	const allowedBlocks = [ 'sgs/button' ];

	const blockProps = useBlockProps( { className: bgPreview.className, style: editorStyle } );
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		allowedBlocks,
		template: TEMPLATE,
		templateLock: false,
	} );

	return (
		<>
			{ /* D635-pattern migration: native Text/Background colour panel replaced by
			    flat backgroundColour/textColour attrs surfaced via the shared SgsColourPanel
			    (matches testimonial-slider/process-steps/quote/heading/card-grid/text).
			    Background row is now the FILL variant (fillRow) — gradient + hover moved
			    off the native panel (supports.color.gradients was true, competing with
			    this SGS panel) onto block-private backgroundColour{Hover,Gradient,
			    HoverGradient} attrs, so capability is moved rather than lost. */ }
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
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: textColour,
								onChange: ( val ) =>
									setAttributes( { textColour: val ?? '' } ),
								linked: true,
							},
						],
					},
					fillRow( {
						key: 'child-btn-background',
						label: __( 'Button background colour', 'sgs-blocks' ),
						attrs: { base: 'childBtnBackground' },
						attributes,
						setAttributes,
					} ),
					textRow( {
						key: 'child-btn-text-colour',
						label: __( 'Button text colour', 'sgs-blocks' ),
						attrs: { base: 'childBtnTextColour' },
						attributes,
						setAttributes,
					} ),
				] }
			/>
			<InspectorControls>
				{ /* H6 fix (2026-07-05, STOP-43): kind='content' only (width/contentWidth +
				    padding/spacing). The block owns its own responsive flex layout
				    (direction/gap/wrap/justify/align, rendered via its own scoped <style>
				    in render.php at SGS_Container_Wrapper::render(..., 'content', ...)) —
				    kind='layout' would additionally make the shared wrapper emit its own
				    non-responsive grid/flex + inline style, which always beats this
				    block's @media-scoped rules. See render.php for the full note. */ }
				<ContainerWrapperControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					kind="content"
				/>

				{ /* ── Padding & margin (A1, D638 — sgs/container parity) ──
				    kind="content" only mounts WidthPanel (see the aggregator's
				    KIND_PANELS.content registry), so this block owns its own
				    spacing panel, the same gap cta-section/hero solve locally.
				    Base tier writes the block's OWN `padding`/`margin` object
				    attrs — this block no longer declares supports.spacing, so
				    there is no duplicate Styles > Dimensions panel for the
				    client to confuse with this one. Tablet/mobile write the
				    paddingTablet/paddingMobile and marginTablet/marginMobile
				    attrs the shared wrapper already reads at every kind
				    (all-kinds "Responsive padding" block in
				    class-sgs-container-wrapper.php).
				    ⚠ The margin half is NEW (2026-08-27). This block previously
				    had NO margin control at all — margin was reachable only
				    through WordPress's native Dimensions panel, which the
				    migration removes. Bean ruled full parity rather than a
				    padding-only carve-out (Rule 3), so it is built here. */ }
				<PanelBody title={ __( 'Padding & margin', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						presets
						values={ {
							base: attributes.padding ?? {},
							tablet: attributes.paddingTablet ?? {},
							mobile: attributes.paddingMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							// Breakpoint -> attr map, not a computed ternary key. This is
							// the canonical idiom (mirrors sgs/container's edit.js) that
							// check-control-ux.js recognises as delegated-to-shared-
							// component; a ternary inside a computed property key reads
							// to the gate as an unwrapped direct write.
							const attrFor = { base: 'padding', tablet: 'paddingTablet', mobile: 'paddingMobile' };
							setAttributes( { [ attrFor[ tier ] ]: next } );
						} }
					/>
					<hr style={ { margin: '16px 0' } } />
					<ResponsiveBoxControl
						label={ __( 'Margin', 'sgs-blocks' ) }
						presets
						values={ {
							base: attributes.margin ?? {},
							tablet: attributes.marginTablet ?? {},
							mobile: attributes.marginMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							// Same canonical breakpoint -> attr map as Padding above.
							const attrFor = { base: 'margin', tablet: 'marginTablet', mobile: 'marginMobile' };
							setAttributes( { [ attrFor[ tier ] ]: next } );
						} }
					/>
				</PanelBody>

				{ /* ── Background (A1, D638) — image/video/SVG + overlay colour/
				    gradient, full parity with sgs/container's own panel. Renders
				    through the shared SGS_Container_Wrapper — background/overlay
				    emission is universal regardless of `kind` (D6), so this needs
				    no render.php change beyond declaring the attrs. Border colour/
				    width/style/radius is native `__experimentalBorder` support
				    (already declared) — WordPress renders its own native Border
				    panel in the block's Styles tab with no custom code needed. */ }
				<BackgroundPanel attributes={ attributes } setAttributes={ setAttributes } />

				{ /* ── Bulk style preset ── */ }
				<PanelBody
					title={ __( 'Button styles', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Style preset', 'sgs-blocks' ) }
						value={ groupPreset }
						options={ CHILD_PRESET_OPTIONS }
						onChange={ setGroupPreset }
						help={ __( 'Apply a preset style to every button in this group at once.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<Button
						variant="secondary"
						style={ { marginTop: '8px' } }
						onClick={ applyPresetToAllButtons }
						disabled={ ! childButtons.length }
					>
						{ __( 'Apply to all buttons', 'sgs-blocks' ) }
					</Button>
				</PanelBody>

				{ /* ── Layout panel ── */ }
				<PanelBody
					title={ __( 'Layout', 'sgs-blocks' ) }
					initialOpen={ true }
				>
					{ /*
						  `flexDirection` is a TIER OBJECT — ONE attr holding
						  {desktop,tablet,mobile} (Spec 35 pass), same shape as
						  `gap` below. `flexDirectionTablet`/`…Mobile` are no
						  longer declared in block.json.
					*/ }
					<ResponsiveOverride
						label={ __( 'Direction', 'sgs-blocks' ) }
						value={ flexDirection }
						onChange={ ( obj ) => setAttributes( { flexDirection: obj } ) }
					>
						{ ( { tier, ownValue, setOwnValue } ) => (
							<SelectControl
								value={ ownValue || '' }
								options={ tier === 'desktop' ? DIRECTION_OPTIONS : DIRECTION_OPTIONS_WITH_INHERIT }
								onChange={ ( val ) => setOwnValue( val ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>

					<hr style={ { margin: '12px 0' } } />

					{ /*
						  Gap is a TIER OBJECT — ONE attr holding
						  {desktop,tablet,mobile} (Spec 35 pass 1, 2026-08-10).
						  ⛔ Do NOT revert to `ResponsiveControl` + an attrMap of
						  `gap`/`gapTablet`/`gapMobile`: the latter two are no
						  longer declared in block.json and WordPress silently
						  discards an undeclared attribute (D338), while the
						  desktop branch wrote a STRING into an object-typed
						  attr, which coerces to the default and loses the lot.
					*/ }
					<ResponsiveOverride
						label={ __( 'Gap', 'sgs-blocks' ) }
						value={ attributes.gap }
						onChange={ ( obj ) => setAttributes( { gap: obj } ) }
					>
						{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
							<SpacingControl
								freeInput
								value={ ownValue }
								placeholder={ inherited ? effectiveValue : '' }
								onChange={ setOwnValue }
							/>
						) }
					</ResponsiveOverride>

					<hr style={ { margin: '12px 0' } } />

					{ /*
						  `flexWrap` is a TIER OBJECT — same shape as `flexDirection`
						  above. `flexWrapTablet`/`…Mobile` are no longer declared
						  in block.json.
					*/ }
					<ResponsiveOverride
						label={ __( 'Wrap', 'sgs-blocks' ) }
						value={ flexWrap }
						onChange={ ( obj ) => setAttributes( { flexWrap: obj } ) }
					>
						{ ( { tier, ownValue, setOwnValue } ) => (
							<SelectControl
								value={ ownValue || '' }
								options={ tier === 'desktop' ? WRAP_OPTIONS : WRAP_OPTIONS_WITH_INHERIT }
								onChange={ ( val ) => setOwnValue( val ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>

				{ /* ── Alignment panel ── */ }
				<PanelBody
					title={ __( 'Alignment', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					{ /*
						  `justifyContent` is a TIER OBJECT — same shape as
						  `flexDirection` above. `justifyContentTablet`/`…Mobile`
						  are no longer declared in block.json.
					*/ }
					<ResponsiveOverride
						label={ __( 'Button spacing', 'sgs-blocks' ) }
						value={ justifyContent }
						onChange={ ( obj ) => setAttributes( { justifyContent: obj } ) }
					>
						{ ( { tier, ownValue, setOwnValue } ) => (
							<SelectControl
								value={ ownValue || '' }
								options={ tier === 'desktop' ? JUSTIFY_OPTIONS : JUSTIFY_OPTIONS_WITH_INHERIT }
								onChange={ ( val ) => setOwnValue( val ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>

					<hr style={ { margin: '12px 0' } } />

					{ /*
						  `alignItems` is a TIER OBJECT — same shape as
						  `flexDirection` above. `alignItemsTablet`/`…Mobile` are
						  no longer declared in block.json.
					*/ }
					<ResponsiveOverride
						label={ __( 'Button alignment', 'sgs-blocks' ) }
						value={ alignItems }
						onChange={ ( obj ) => setAttributes( { alignItems: obj } ) }
					>
						{ ( { tier, ownValue, setOwnValue } ) => (
							<SelectControl
								value={ ownValue || '' }
								options={ tier === 'desktop' ? ALIGN_ITEMS_OPTIONS : ALIGN_ITEMS_OPTIONS_WITH_INHERIT }
								onChange={ ( val ) => setOwnValue( val ) }
								help={ tier === 'mobile' ? __( 'Mobile stacks buttons full-width by default (stretch).', 'sgs-blocks' ) : undefined }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>

				{ /* ── Button group defaults (A2, D638 §4/§5) ──
				    Live CSS custom-property fallback, NOT the Block Context
				    API and NOT editor-time copy-on-insert (both rejected —
				    see decisions.md D638 §4). A child sgs/button with no
				    explicit value of its own picks up whatever is set here,
				    LIVE — change a default and every unset child follows it
				    immediately; a child with its own explicit value keeps it.
				    Inherit is IMPLICIT (empty = inherit), no visual indicator
				    — Bean's explicit, knowingly-accepted call (D638 §5); do
				    not add an indicator here.
				    Scope is deliberately the ~6 core properties Bean ruled,
				    not sgs/button's full ~35 style attrs — see the parking
				    lot note in the Stage 1 plan before adding more. */ }
				<PanelBody title={ __( 'Button group defaults', 'sgs-blocks' ) } initialOpen={ false }>
					<p className="components-base-control__help" style={ { marginTop: 0 } }>
						{ __(
							'Sets a default for every button in this group that does not already have its own value set. A button with its own colour, radius, size or weight keeps that value.',
							'sgs-blocks'
						) }
					</p>
					<DesignTokenPicker
						label={ __( 'Button border colour', 'sgs-blocks' ) }
						value={ childBtnBorderColour }
						onChange={ ( val ) => setAttributes( { childBtnBorderColour: val ?? '' } ) }
					/>
					<TextControl
						label={ __( 'Button border radius', 'sgs-blocks' ) }
						help={ __( 'A CSS length, e.g. 8px or 999px for a pill shape. Leave blank to use the framework default.', 'sgs-blocks' ) }
						value={ childBtnBorderRadius }
						onChange={ ( val ) => setAttributes( { childBtnBorderRadius: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __( 'Button font size', 'sgs-blocks' ) }
						help={ __( 'A CSS length, e.g. 16px. Leave blank to use the framework default.', 'sgs-blocks' ) }
						value={ childBtnFontSize }
						onChange={ ( val ) => setAttributes( { childBtnFontSize: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SelectControl
						label={ __( 'Button font weight', 'sgs-blocks' ) }
						value={ childBtnFontWeight || '' }
						options={ SGS_FONT_WEIGHT_OPTIONS }
						onChange={ ( val ) => setAttributes( { childBtnFontWeight: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...innerBlocksProps } />
		</>
	);
}
