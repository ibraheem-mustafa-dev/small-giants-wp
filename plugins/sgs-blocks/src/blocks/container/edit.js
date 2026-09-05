import { __ } from "@wordpress/i18n";
import {
  useBlockProps,
  useInnerBlocksProps,
  InspectorControls,
  useSettings,
} from "@wordpress/block-editor";
import {
  PanelBody,
  SelectControl,
  TextControl,
  BoxControl,
} from "@wordpress/components";
import { useSelect } from "@wordpress/data";
import { ResponsiveControl, ResponsiveOverride, ResponsiveBoxControl, ShadowControl, SgsColourPanel, BOX_UNITS, normaliseResponsiveBox, SgsBorderControl, TypographyControls, SgsBoxControl } from "../../components";
import { resolveShadowPreview, resolveShadowPreviewComposed, resolveResponsiveTier, backgroundPaintPreview, textPaintPreview, borderPaintPreview, backgroundPreview, svgBackgroundPreview, boxShorthand, resolveBoxTierPreview, resolveContentWidthPreview, contentBandPreview, applyGridLayoutPreview, colourVar } from "../../utils";
import {
  LayoutPanel,
  WidthPanel,
  BackgroundPanel,
  ShapeDividersPanel,
  GridItemDefaultsPanel,
  MIN_HEIGHT_OPTIONS,
} from "./components/ContainerWrapperControls";

/**
 * Resolve a gap attribute value to a CSS string for editor preview.
 *
 * `gap` is a TIER OBJECT — {desktop,tablet,mobile} in ONE attribute (Spec 35
 * pass 1, 2026-08-10) — so the tier is resolved first, with a blank tier
 * inheriting the one above it. A plain string is still accepted so an
 * un-migrated caller degrades to its old behaviour rather than rendering
 * nothing.
 *
 * Mirrors the FRONTEND emitter (sgs_responsive_format_atom_value):
 *  - Bare number (e.g. "24") → "24px". ⚠ This is a DELIBERATE, Bean-ruled
 *    meaning: a bare number means px everywhere, matching every other
 *    numeric control an operator touches.
 *  - Raw CSS length ("16px", "1.5rem", "clamp(...)") → pass through
 *  - Empty → undefined (so the style key is omitted)
 *
 * ⛔ Keep this in step with the PHP path. If they disagree, the editor lies
 * about what the page will look like — which is the failure this mirror exists
 * to prevent.
 *
 * @param {Object|string} gap  Gap attribute value (tier object, or legacy string).
 * @param {string}        tier Active device tier ('desktop'|'tablet'|'mobile').
 * @returns {string|undefined}
 */
function gapCssValue( gap, tier = 'desktop' ) {
	const raw =
		// resolveResponsiveTier returns { value, inherited } -- NOT a bare string.
		// Without `?.value` this hands React an OBJECT: it survives the `! raw`
		// guard (objects are truthy), String() turns it into "[object Object]"
		// so the numeric-unit branch misses, and React then silently drops the
		// non-string style value. Net effect: the canvas showed NO gap at all
		// while the published page was correct. Line ~321 (minHeight) already
		// does `?.value` -- this was the odd one out.
		gap && typeof gap === 'object' ? resolveResponsiveTier( gap, tier )?.value : gap;

	if ( ! raw ) {
		return undefined;
	}
	// Bare number → px (mirrors the frontend's unit_default).
	if ( /^\d+(\.\d+)?$/.test( String( raw ) ) ) {
		return `${ raw }px`;
	}
	// Raw CSS length — return as-is (already validated by SpacingControl freeInput).
	return raw;
}

// Semantic HTML tag (D344) — ARIA landmarks + sectioning for screen-reader
// landmark navigation (WCAG 2.2) and SEO/document structure. Must match the
// block.json `tagName` enum and the wrapper's allowlist.
const TAG_NAME_OPTIONS = [
  { label: __( "Section (default)", "sgs-blocks" ), value: "section" },
  { label: __( "Div (no semantics)", "sgs-blocks" ), value: "div" },
  { label: __( "Article (self-contained)", "sgs-blocks" ), value: "article" },
  { label: __( "Aside (complementary)", "sgs-blocks" ), value: "aside" },
  { label: __( "Nav (navigation)", "sgs-blocks" ), value: "nav" },
  { label: __( "Header", "sgs-blocks" ), value: "header" },
  { label: __( "Footer", "sgs-blocks" ), value: "footer" },
  { label: __( "Figure", "sgs-blocks" ), value: "figure" },
  { label: __( "Main (page landmark)", "sgs-blocks" ), value: "main" },
];

// Mirrors sgs/icon and sgs/info-box, which hoist the identical list. "" is the
// INHERIT option deliberately: an unset container emits no text-align, so the
// value cascades from its own parent — that inheritance is the whole reason
// this attribute exists (the draft carries alignment on the section, not on
// each child).
const TEXT_ALIGN_OPTIONS = [
  { label: __( "— inherit —", "sgs-blocks" ), value: "" },
  { label: __( "Left", "sgs-blocks" ), value: "left" },
  { label: __( "Centre", "sgs-blocks" ), value: "center" },
  { label: __( "Right", "sgs-blocks" ), value: "right" },
  { label: __( "Justify", "sgs-blocks" ), value: "justify" },
];

export default function Edit({ attributes, setAttributes, name, clientId }) {
  const {
    layout,
    gap,
    shadow,
    // maxWidth and minHeight are both TIER OBJECTS — read via
    // `attributes.maxWidth`/`attributes.minHeight` below, not destructured
    // bare (a bare destructure was a real live bug for maxWidth's editor
    // preview, fixed below, same class as gridTemplateColumns already
    // resolving via resolveResponsiveTier rather than being used bare).
    gridTemplateColumns = "",
    alignItems,
    justifyItems = "stretch",
    alignContent = "stretch",
    backgroundColour,
    backgroundColourGradient,
    backgroundColourHover,
    backgroundColourHoverGradient,
    textColour,
    textColourGradient,
    textColourHover,
    textColourHoverGradient,
    gridAutoRows = "",
    flexDirection = "",
    flexWrap = "wrap",
    justifyContent = "",
    borderColour,
    borderColourGradient,
    borderColourHover,
    borderColourHoverGradient,
    borderWidth,
    borderStyle,
    gridItemBackground,
    gridItemBackgroundGradient,
    gridItemShadow,
    gridItemShadowColour,
    gridItemBorderGradient,
    gridItemTextColourGradient,
  } = attributes;

  // D288/D636: colours are stored as theme-token SLUGS or a custom hex, and
  // gradients as a raw CSS gradient string — resolved the same way the
  // button block's editor preview does (resolveColourToken against the live
  // palette), so a preset applied in the inspector actually shows on canvas
  // rather than looking like a no-op.
  const [ colourPalette ] = useSettings( "color.palette" );

  // Active device tier for the preview, read from the SAME source the inspector's
  // global device toggle writes (`core/editor` getDeviceType) — mirrors
  // ResponsiveControl.js:103. Without this the preview would always show desktop
  // while the operator is editing the mobile tier.
  const previewTier = useSelect( ( select ) => {
    const ed = select( "core/editor" );
    const device =
      ed && typeof ed.getDeviceType === "function" ? ed.getDeviceType() : null;
    return { Tablet: "tablet", Mobile: "mobile" }[ device ] || "desktop";
  }, [] );

  // Editor preview: media (image/video), overlay, ken-burns and parallax —
  // extracted to the shared `backgroundPreview()` (`src/utils/background-preview.js`,
  // 2026-08-26) so the same mirror serves every other block mounting
  // `BackgroundPanel` (composite-mirror rule, CLAUDE.md). `bgPreview.style`
  // carries the same custom-property set this block used to build inline.
  // Decorative SVG background layer — editor mirror (2026-09-05). Deliberately
  // NOT folded into backgroundPreview()'s return: that helper paints via
  // `--sgs-ed-bg-*` custom properties on a ::before, whereas the SVG layer is a
  // real element whose painting rules already ship in style.css (loaded in the
  // canvas via block.json `style`). See svgBackgroundPreview()'s own docblock.
  // Attributes enumerated EXPLICITLY rather than passing `attributes` wholesale
  // — the same convention backgroundPreview()'s call site below already uses.
  // Two reasons, both real: it documents exactly which attrs this mirror reads,
  // and check-editor-render-parity.js (CHECK A) resolves an attribute as
  // canvas-reflected only when its NAME appears outside the Inspector panels. A
  // whole-object hand-off renders correctly but reads to that gate as a desync,
  // which is precisely the false-negative shape its own header documents.
  const svgPreview = svgBackgroundPreview( {
    bgSvgContent: attributes.bgSvgContent,
    bgSvgPosition: attributes.bgSvgPosition,
    bgSvgAnimation: attributes.bgSvgAnimation,
    bgSvgAnimationSpeed: attributes.bgSvgAnimationSpeed,
    bgSvgOpacity: attributes.bgSvgOpacity,
    bgSvgMinHeight: attributes.bgSvgMinHeight,
    bgSvgTextShadow: attributes.bgSvgTextShadow,
  } );

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

  const style = {
    gap: gapCssValue( gap, previewTier ),
    minHeight: resolveResponsiveTier( attributes.minHeight, previewTier )?.value || undefined,
    ...(shadow && { boxShadow: resolveShadowPreview( shadow ) }),
    ...bgPreview.style,
    ...svgPreview.style,
    // Base (SGS-owned) background paint — the OUTER-most layer, below the
    // media ::before and the overlay span. Text paint is applied AFTER
    // background so it wins the shared `backgroundImage` key exactly as the
    // frontend's decl order does when BOTH a background gradient and a text
    // gradient are set (helpers-tokens.php's $sgs_container_resting_decls:
    // background pushed first, text pushed second — same last-wins result).
    ...backgroundPaintPreview( backgroundColour, backgroundColourGradient, colourPalette ),
    ...textPaintPreview( textColour, textColourGradient, colourPalette ),
  };

  // Responsive padding/margin (Spec 35 / D555) — a flat trio of OWNED box
  // attrs, not a single tier-object attribute (unlike gap/minHeight/maxWidth
  // above), so it resolves via resolveBoxTierPreview() rather than
  // resolveResponsiveTier(). Previously never applied to the canvas at all —
  // the inspector's ResponsiveBoxControl wrote the attrs correctly but
  // nothing here read them back.
  const paddingPreview = boxShorthand(
    resolveBoxTierPreview( attributes.padding, attributes.paddingTablet, attributes.paddingMobile, previewTier )
  );
  if ( paddingPreview ) style.padding = paddingPreview;
  const marginPreview = boxShorthand(
    resolveBoxTierPreview( attributes.margin, attributes.marginTablet, attributes.marginMobile, previewTier )
  );
  if ( marginPreview ) style.margin = marginPreview;

  // Border preview — previously entirely absent from the canvas (only wired
  // into SgsBorderControl's InspectorControls binding, never applied to the
  // wrapper style), same gap as sgs/hero. borderWidth is a box object
  // (base-only, no tiers, matching the SgsBorderControl pair standard).
  if ( borderStyle && borderStyle !== "none" ) {
    const borderWidthPreview = boxShorthand( borderWidth );
    if ( borderWidthPreview ) style.borderWidth = borderWidthPreview;
    style.borderStyle = borderStyle;
    Object.assign( style, borderPaintPreview( borderColour, borderColourGradient, colourPalette ) );
  }

  // Grid/flex/stack layout preview — shared with every other block routed through
  // SGS_Container_Wrapper::render() via `applyGridLayoutPreview()`
  // (`src/utils/grid-layout-preview.js`, extracted 2026-09-05 from this block, the
  // only one that had built it). Mutates `style` in place.
  applyGridLayoutPreview( style, {
    layout,
    alignItems,
    justifyItems,
    alignContent,
    gridAutoRows,
    gridTemplateColumns,
    columns: attributes.columns,
    flexDirection,
    flexWrap,
    justifyContent,
  } );

  // CHECK A finding — grid-item defaults (SB-1), gradient/shadow-colour subset
  // only. `GridItemDefaultsPanel` writes these onto THIS container (the grid
  // parent); `SGS_Container_Wrapper::render()` consumes them as `--sgs-gi-*`
  // CUSTOM PROPERTIES on the parent, inherited by any DIRECT CHILD carrying
  // `.sgs-container` via the unscoped global rule in style.css
  // (`.sgs-container--grid > .sgs-container{ background:var(--sgs-gi-bg); …;
  // box-shadow:var(--sgs-gi-shadow); }`). Setting the SAME two custom
  // properties here on this wrapper is purely additive and reaches nested
  // sgs/container children automatically via ordinary CSS inheritance — no
  // per-child edit needed, matching the multi-button childBtn* mechanism.
  //
  // Only `gridItemBackgroundGradient` and `gridItemShadowColour` are wired
  // here (the two CHECK A findings this custom-property mechanism can
  // actually express):
  //  - `--sgs-gi-bg` feeds the `background` SHORTHAND, which accepts either a
  //    colour or a gradient function — so preferring the gradient over the
  //    flat colour (mirrors `sgs_background_paint_decl()`'s precedence)
  //    reaches the exact same custom property the flat `gridItemBackground`
  //    already targets. No new mechanism required.
  //  - `--sgs-gi-shadow` already carries a COMPOSED shape+colour value
  //    server-side (`sgs_shadow_value_composed()`); `resolveShadowPreviewComposed()`
  //    is its existing JS mirror (`src/utils/tokens.js`), so this needed no new
  //    resolver either.
  //
  // `gridItemBorderGradient` and `gridItemTextColourGradient` cannot be
  // expressed through the existing `--sgs-gi-border` (a `border` shorthand
  // var, which cannot hold a gradient) or `--sgs-gi-color` (a `color` var,
  // which cannot hold a gradient) custom properties — the real frontend
  // renders those via a masked `::before` ring (border) and
  // `background-clip:text` (text) on a per-instance SCOPED rule
  // (class-sgs-container-wrapper.php ~2147-2201), which a plain inline style
  // cannot reach on a CHILD element either way. Closed 2026-09-05 via a
  // `clientId`-scoped `<style>` tag (same escape hatch this session's
  // `sgs/form` fix used for its own child-block colour mirrors) rather than a
  // fake custom property, which would have silently emitted invalid CSS.
  //  - Border gradient: approximated via `border-image` (the SAME
  //    approximation `borderPaintPreview()` already uses for this block's own
  //    ROOT border gradient — not a pixel-faithful masked ring, but
  //    consistent with this codebase's established canvas-preview
  //    convention).
  //  - Text gradient: the real `background-clip:text` technique directly, no
  //    `@supports` fallback (this is an editor preview in a real evergreen
  //    browser, not static CSS for unknown public visitors — same reasoning
  //    `textPaintPreview()`'s own docblock documents).
  //  - Selector uses a DESCENDANT combinator (`[data-block="clientId"] .sgs-container`)
  //    rather than PHP's direct-child selector, because WP's block-list
  //    wrapper DOM sits between a parent block's element and a child block's
  //    element in the editor — an approximation, not pixel-faithful, but the
  //    canvas at least shows a gradient is applied instead of nothing.
  let gridItemScopedCss = "";
  if ( layout === "grid" ) {
    const giBg = gridItemBackgroundGradient || colourVar( gridItemBackground );
    if ( giBg ) {
      style[ "--sgs-gi-bg" ] = giBg;
    }
    const giShadow = resolveShadowPreviewComposed( gridItemShadow, gridItemShadowColour );
    if ( giShadow ) {
      style[ "--sgs-gi-shadow" ] = giShadow;
    }
    if ( clientId ) {
      const giSel = `[data-block="${ clientId }"] .sgs-container`;
      if ( gridItemBorderGradient && /^(repeating-)?(linear|radial|conic)-gradient\(/i.test( gridItemBorderGradient ) ) {
        gridItemScopedCss += `${ giSel }{border-image:${ gridItemBorderGradient } 1;}`;
      }
      if ( gridItemTextColourGradient ) {
        gridItemScopedCss += `${ giSel }{background-image:${ gridItemTextColourGradient };-webkit-background-clip:text;background-clip:text;color:transparent;}`;
      }
    }
  }

  // Editor preview: when a literal maxWidth is set, apply it as inline max-width.
  // Breakout (alignwide / alignfull) is driven by WP-native align attr — no inline style needed.
  // maxWidth is a TIER OBJECT — was destructured and used BARE here (a real live
  // bug: an object handed to `style.maxWidth` renders nothing useful in the
  // editor preview), found and fixed alongside minHeight's own migration.
  const previewMaxWidth = resolveResponsiveTier( attributes.maxWidth, previewTier )?.value;
  if ( previewMaxWidth ) {
    style.maxWidth = previewMaxWidth;
  }

  // ── CONTENT BAND (L2) — the editor rendered ONE layer until 2026-08-21 ─────
  // `edit.js` never emitted `.sgs-container__inner`, while `editor.css:13` styled it:
  // a rule waiting for an element that was never created. So "Content band width" and
  // "Band padding" wrote to something the canvas did not contain — the client changed
  // a setting, nothing moved, and the only way to see the result was to publish.
  //
  // The gate MUST match the wrapper's `$has_band_props` (~:894): a resolved contentWidth
  // OR any band-padding side. Not "is contentWidth set" — `full` resolves to '' and must
  // NOT produce a band, or the canvas would grow a layer the frontend does not have.
  const bandMaxWidth = resolveContentWidthPreview(
    resolveResponsiveTier( attributes.contentWidth, previewTier )?.value
  );
  const bandPadTier = resolveResponsiveTier( attributes.contentBandPadding, previewTier )?.value;
  const bandPad = bandPadTier && typeof bandPadTier === "object" ? bandPadTier : {};

  // Content band (Layer 2 / `.sgs-container__inner`) + grid-on-inner migration —
  // shared with every other block routed through SGS_Container_Wrapper::render() via
  // `contentBandPreview()` (`src/utils/content-band-preview.js`, extracted 2026-09-05
  // from this block, the only one that had built it). Mutates `style` in place when a
  // band exists (grid-on-inner: the frontend moves grid/flex declarations onto the
  // band, so the canvas must too — a grid container would otherwise preview its
  // columns on the full-bleed outer while rendering them on the capped band).
  const { hasBandProps, bandStyle } = contentBandPreview( {
    contentWidth: bandMaxWidth,
    bandPadding: bandPad,
    style,
    layout,
  } );

  const className = [
    "sgs-container",
    layout && `sgs-container--${layout}`,
  ]
    .filter(Boolean)
    .join(" ");

  // Gate the editor's ::before media / ::after overlay layers + the parallax
  // class on marker classes so the pseudo-elements exist ONLY on containers
  // that actually have something to paint — every other container in the
  // canvas is untouched (mirrors the frontend, where the layer's box
  // properties are only emitted when there is media/overlay to paint).
  // bgParallax: mirrors the frontend's `sgs-container--parallax` class
  // (class-sgs-container-wrapper.php ~:1455) — full scroll-driven playback
  // isn't previewed in a static canvas, but the class itself IS what the
  // frontend gates its `background-attachment:fixed` styling on, so applying
  // it here at least shows the state took effect instead of looking silent.
  // `bgPreview.className` is the shared marker set (`src/utils/background-preview.js`,
  // 2026-08-26) — the same one every other adopting block now applies.
  // NOTE the SPREAD on svgPreview.className. `backgroundPreview()` returns its
  // className as a STRING, but `svgBackgroundPreview()` returns a string ARRAY
  // (see its @return). Passing the array to `.join(' ')` unspread stringifies it
  // with COMMAS — `[ 'a', [ 'x', 'y' ] ].join(' ')` is `"a x,y"` — which emits
  // one unusable comma-joined token and silently drops all four SVG classes
  // (has-bg-svg / svg-<position> / svg-anim-<n> / svg-speed-<n>), so position,
  // animation and speed do nothing on the canvas. Caught 2026-09-05 while
  // wiring site-header; CHECK A still passed throughout, because it verifies an
  // attribute NAME is referenced outside the Inspector, not that the CSS it
  // produces is correct.
  const editorClassName = [ className, bgPreview.className, ...svgPreview.className ]
    .filter( Boolean )
    .join( " " );

  // Contrast check for border colour against the container's own background.
  // When the background has a gradient sibling, skip the check (flat colour would be inaccurate).
  const containerContrastAgainst =
    backgroundColour && ! backgroundColourGradient
      ? backgroundColour
      : '';

  const blockProps = useBlockProps({ className: editorClassName, style });
  // The children belong to the BAND when one renders, and to the root when one does not.
  // useInnerBlocksProps is called exactly once either way — branching the ARGUMENT, never
  // the hook, so this cannot trip the rules of hooks.
  const innerBlocksProps = useInnerBlocksProps(
    hasBandProps ? { className: "sgs-container__inner", style: bandStyle } : blockProps,
    {
      orientation: layout === "stack" ? "vertical" : undefined,
      templateLock: attributes.templateLock || undefined,
    }
  );

  // Mirrors class-sgs-container-wrapper.php:2794-2798. `aria-hidden` matches the
  // server; `pointer-events:none` is editor-only insurance so the decorative
  // layer can never swallow a click meant for the block or its children.
  const svgLayer = svgPreview.hasSvg ? (
    <div
      className="sgs-container__svg-bg"
      aria-hidden="true"
      style={ { pointerEvents: 'none' } }
      dangerouslySetInnerHTML={ { __html: svgPreview.markup } }
    />
  ) : null;

  return (
    <>
      {/* Background (image/video/svg tabs + ken-burns/parallax) — the STYLES
          tab, not Settings. A background image/video/overlay is appearance, so
          it belongs beside colour, which D621/D622 already placed in Styles.
          Standardised 2026-08-16 (Bean-ruled): this panel previously rendered
          in Settings on container/site-header/site-footer/physics-canvas and in
          Styles on cta-section/hero — the same panel in two different tabs
          depending on which block the client had selected. */}
      <InspectorControls group="styles">
        {/* Base background colour — the OUTER-most paint layer, BELOW the
            background image/video/SVG (::before), the overlay colour/gradient
            (backgroundOverlayColour/overlayGradient, painted on the
            .sgs-container__overlay span) and content. Deliberately a
            SEPARATE attribute + control from the overlay pair below — the
            overlay tints/covers media, this paints when there is none.
            Mirrors sgs/site-header's SgsColourPanel pattern (D294/D684):
            its own panel, not nested inside BackgroundPanel's PanelBody. */}
        <SgsColourPanel
          rows={ [
            {
              key: 'background',
              label: __( 'Background colour', 'sgs-blocks' ),
              states: [
                {
                  key: 'normal',
                  label: __( 'Normal', 'sgs-blocks' ),
                  value: backgroundColour,
                  onChange: ( val ) => setAttributes( { backgroundColour: val ?? '' } ),
                  linked: true,
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
              /* Root TEXT colour. A section-KIND block can parent any non-section
                 block without a forced parent, so this is the INHERITABLE cascade
                 default for whatever the client nests inside — NOT a duplicate of a
                 child's own text control (Bean's ruling, 2026-08-21). It replaces a
                 DEAD binding: the wrapper manifest mapped css:color to
                 `native:color.text` while supports.color is false on this block, so
                 there was no reachable text control at all. */
              key: 'text',
              label: __( 'Text colour', 'sgs-blocks' ),
              gradientCapable: true,
              states: [
                {
                  key: 'normal',
                  label: __( 'Normal', 'sgs-blocks' ),
                  value: textColour,
                  onChange: ( val ) => setAttributes( { textColour: val ?? '' } ),
                  linked: true,
                  gradientValue: textColourGradient,
                  onGradientChange: ( val ) =>
                    setAttributes( { textColourGradient: val ?? '' } ),
                },
                {
                  key: 'hover',
                  label: __( 'Hover', 'sgs-blocks' ),
                  value: textColourHover,
                  onChange: ( val ) => setAttributes( { textColourHover: val ?? '' } ),
                  gradientValue: textColourHoverGradient,
                  onGradientChange: ( val ) =>
                    setAttributes( { textColourHoverGradient: val ?? '' } ),
                },
              ],
            },
          ] }
        />
        {/* Typography — replaces the old WP-native supports.typography
            (fontSize/lineHeight/textAlign/letterSpacing/textTransform/
            fontWeight/fontStyle only) with the shared TypographyControls
            component + sgs_typography_css_rule() render.php helper
            (D971/D972 full-replacement track, mirrors sgs/accordion). Root
            prefix "" since this control targets the wrapper element. */}
        <PanelBody title={ __( "Typography", "sgs-blocks" ) } initialOpen={ false }>
          <TypographyControls
            attributes={ attributes }
            setAttributes={ setAttributes }
            prefix=""
          />
        </PanelBody>
        <BackgroundPanel attributes={ attributes } setAttributes={ setAttributes } name={ name } />
      </InspectorControls>

      <InspectorControls>

        {/* Layout panel — shared LayoutPanel + WidthPanel + container-specific controls
            (HTML tag, min-height ×3). Kept as a single "Layout" PanelBody to preserve
            the pre-refactor inspector order and label for container users. */}
        <PanelBody title={ __( "Layout", "sgs-blocks" ) }>
          <SelectControl
            label={ __( "HTML tag", "sgs-blocks" ) }
            value={ attributes.tagName || "section" }
            options={ TAG_NAME_OPTIONS }
            onChange={ ( val ) => setAttributes( { tagName: val } ) }
            help={ __( "Semantic tag for accessibility landmarks and SEO. Use Nav / Aside / Article for their meaning; Div for a plain wrapper.", "sgs-blocks" ) }
            __nextHasNoMarginBottom
          	__next40pxDefaultSize
          />
          { [ 'nav', 'aside' ].includes( attributes.tagName ) && (
            <TextControl
              label={ __( "Landmark label", "sgs-blocks" ) }
              value={ attributes.ariaLabel || "" }
              onChange={ ( val ) => setAttributes( { ariaLabel: val } ) }
              help={ __( "Required when a page has more than one Nav or Aside — lets screen readers tell them apart (e.g. \"Primary\", \"Footer links\", \"Related articles\").", "sgs-blocks" ) }
              __nextHasNoMarginBottom
              __next40pxDefaultSize
            />
          ) }
          <hr style={ { margin: "16px 0" } } />
          <LayoutPanel
            attributes={ attributes }
            setAttributes={ setAttributes }
            enableIntrinsicColumns
            enableColumnShapePicker
          />
          <hr style={ { margin: "16px 0" } } />
          <WidthPanel attributes={ attributes } setAttributes={ setAttributes } />
          { /* `minHeight` is a TIER OBJECT — {desktop,tablet,mobile} — so it uses
               ResponsiveOverride. */ }
          <ResponsiveOverride
            label={ __( "Min height", "sgs-blocks" ) }
            value={ attributes.minHeight }
            onChange={ ( obj ) => setAttributes( { minHeight: obj } ) }
          >
            { ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
              <SelectControl
                value={ ownValue || "" }
                options={ MIN_HEIGHT_OPTIONS }
                onChange={ ( val ) => setOwnValue( val || undefined ) }
                help={ ! inherited
                  ? __( "Desktop / base. Tablet and mobile override it at narrower widths.", "sgs-blocks" )
                  : __( "Leave empty to use the tier above.", "sgs-blocks" ) }
                __nextHasNoMarginBottom
              	__next40pxDefaultSize
              />
            ) }
          </ResponsiveOverride>
          <SelectControl
            label={ __( "Text align", "sgs-blocks" ) }
            value={ attributes.textAlign || "" }
            options={ TEXT_ALIGN_OPTIONS }
            onChange={ ( val ) => setAttributes( { textAlign: val } ) }
            __nextHasNoMarginBottom
            __next40pxDefaultSize
          />
        </PanelBody>

        {/* Responsive spacing (padding + margin) — Spec 35 / D555 gutter-default
            migration. `padding`/`margin` are now block-OWNED object attrs (no
            `supports.spacing` — a WP-native support cannot carry a framework
            default, which is exactly why `sgs/container` had no horizontal
            gutter and rendered flush to the viewport edge; see D555). Base tier
            now writes to the owned `padding`/`margin` attrs directly, matching
            the tablet/mobile legs' already-owned `paddingTablet`/`paddingMobile`
            and `marginTablet`/`marginMobile` — one system, not a native+SGS
            split. Mirrors the D548 `sgs/gallery` precedent (its own base tier
            is likewise owned, not native). */}
        <PanelBody title={ __( "Padding & margin", "sgs-blocks" ) } initialOpen={ false }>
          {/* padding/margin are now TIER-of-BOXES object attrs — ONE attribute
              holding {desktop,tablet,mobile}, each tier a {top,right,bottom,left}
              box (Phase 2 tier-object migration, 2026-09-06) — matching the
              shape already shipped on sgs/site-header-row / sgs/site-footer-row /
              sgs/gallery (Spec 37 FR-37-16). Uses ResponsiveOverride, which reads
              and writes the object directly, NOT the flat-sibling
              ResponsiveBoxControl. Do NOT revert to an attrMap of
              {base:'padding', tablet:'paddingTablet', mobile:'paddingMobile'} —
              those two siblings are no longer declared by block.json, and
              WordPress SILENTLY DISCARDS an attribute a block does not declare
              (D338).
              presets — C16 pilot (2026-08-27). sgs/container is the ONE block
              piloting spacing presets on the shared SgsBoxControl before the
              other mounts see them (default stays OFF everywhere else).
              See .claude/scratch/2026-08-27-c16-spacing-presets-design.md §7. */}
          <ResponsiveOverride
            value={ attributes.padding }
            onChange={ ( obj ) => setAttributes( { padding: obj } ) }
          >
            { ( { ownValue, setOwnValue } ) => (
              <SgsBoxControl
                label={ __( "Padding", "sgs-blocks" ) }
                values={ ownValue && typeof ownValue === "object" ? ownValue : {} }
                units={ BOX_UNITS }
                presets
                onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
              />
            ) }
          </ResponsiveOverride>
          <hr style={ { margin: "16px 0" } } />
          <ResponsiveOverride
            value={ attributes.margin }
            onChange={ ( obj ) => setAttributes( { margin: obj } ) }
          >
            { ( { ownValue, setOwnValue } ) => (
              <SgsBoxControl
                label={ __( "Margin", "sgs-blocks" ) }
                values={ ownValue && typeof ownValue === "object" ? ownValue : {} }
                units={ BOX_UNITS }
                presets
                onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
              />
            ) }
          </ResponsiveOverride>
        </PanelBody>

        {/* Content band (Layer 2 __inner) padding — per-area object attr (contract §2),
            not a WP-native attr since the band is an SGS-only inner element. Background +
            responsive width controls stay on GridItemDefaultsPanel's neighbour BackgroundPanel
            / WidthPanel; this panel is scoped to band padding only. */}
        <PanelBody title={ __( "Content band", "sgs-blocks" ) } initialOpen={ false }>
          <p className="components-base-control__help">
            { __( "Styles the inner content band (the max-width wrapper set by Content width). The band exists by default — set Content width to Full to remove it.", "sgs-blocks" ) }
          </p>
          {/* ⛔ "Band background colour" (contentBandBackground) was REMOVED
              2026-08-12, and the attribute retired framework-wide. Bean's rule:
              a background colour or media fills the max-width of its CONTAINER
              and is never clipped to the inner content layer, so a band-scoped
              background was a design error rather than a capability. Set the
              background on the block itself (BackgroundPanel) instead. Zero
              stored instances existed on the canary at deletion. Do NOT re-add
              a band-scoped background control here or on any composite. */}
          {/* contentBandPadding is a TIER OBJECT — ONE attr holding
              {desktop,tablet,mobile}, each tier itself a {top,right,bottom,left}
              box (Spec 35 box-shaped pass, 2026-08-11). It therefore uses
              ResponsiveOverride, which reads and writes the object, NOT the
              flat-sibling ResponsiveBoxControl. Do NOT revert to an attrMap of
              {base:'contentBandPadding', tablet:'contentBandPaddingTablet',
              mobile:'contentBandPaddingMobile'} — those two siblings are no
              longer declared by any block.json, and WordPress SILENTLY
              DISCARDS an attribute a block does not declare (D338), so both
              tiers would save nothing while the desktop branch wrote a plain
              object into the SAME shape as before by coincidence only — the
              real risk is a stale flat write landing on a deleted attr.
              Mirrors ResponsiveBoxControls.js's Padding block exactly. */}
          {/* ⛔ NO `label` on the wrapper, and NO `hideLabelFromVision` on the
              BoxControl — core's BoxControl ignores that prop and always renders its
              own label, so both painted (sentence case + WP's uppercase). Keep
              BoxControl's; BaseControl associates it with the inputs. Full reasoning
              at components/ResponsiveBoxControls.js. */}
          <ResponsiveOverride
            value={ attributes.contentBandPadding }
            onChange={ ( obj ) => setAttributes( { contentBandPadding: obj } ) }
          >
            { ( { ownValue, setOwnValue } ) => (
              <BoxControl
                label={ __( "Band padding", "sgs-blocks" ) }
                values={ ownValue && typeof ownValue === "object" ? ownValue : {} }
                units={ BOX_UNITS }
                splitOnAxis={ false }
                onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
              	__next40pxDefaultSize
              />
            ) }
          </ResponsiveOverride>
        </PanelBody>

        {/* Grid item defaults — only shown when layout is grid. */}
        <GridItemDefaultsPanel attributes={ attributes } setAttributes={ setAttributes } />

        {/* Wrapper border — R2c pattern (mirrors sgs/product-card's "Card
          border" panel): borderWidth is a block-private base-only box object;
          border colour + style live on the "Wrapper border colour" row in the
          SgsColourPanel above (borderStyle/onBorderStyleChange wired to the
          SAME attribute, one source of truth); border-radius stays WP-native
          (style.border.radius) — the block declares
          __experimentalBorder.__experimentalSkipSerialization so it
          serialises scoped, not inline. */}
        <PanelBody title={ __( "Wrapper border", "sgs-blocks" ) } initialOpen={ false }>
          {/* presets={ [ '10', '20', '30' ] } — restricted to a small end-of-scale
              subset (Bean's explicit call, 2026-08-27 rollout): the full
              XXS-XXXL spacing ladder is nonsensical for a border stroke width,
              unlike Padding/Margin above which offer the unrestricted scale. */}
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
          	colourStates={ [
          		{
          			key: "normal",
          			label: __( 'Normal', 'sgs-blocks' ),
          			value: borderColour,
          			onChange: ( val ) => setAttributes( { borderColour: val ?? '' } ),
          			linked: true,
          			gradientValue: borderColourGradient,
          			onGradientChange: ( val ) => setAttributes( { borderColourGradient: val ?? '' } ),
          		},
          		{
          			key: "hover",
          			label: __( 'Hover', 'sgs-blocks' ),
          			value: borderColourHover,
          			onChange: ( val ) => setAttributes( { borderColourHover: val ?? '' } ),
          			linked: true,
          			gradientValue: borderColourHoverGradient,
          			onGradientChange: ( val ) => setAttributes( { borderColourHoverGradient: val ?? '' } ),
          		},
          	] }
          	contrastAgainst={ containerContrastAgainst }
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

        {/* Shadow — legacy string token attr (sm/md/lg/glow OR a raw box-shadow
          CSS string built by ShadowControl), resolved by sgs_shadow_value()
          (Spec 35 T2.2b). */}
        <PanelBody title={ __( "Shadow", "sgs-blocks" ) } initialOpen={ false }>
          <ShadowControl
            label={ __( "Shadow", "sgs-blocks" ) }
            attributes={ attributes }
            setAttributes={ setAttributes }
            attrNames={ {
            	base: 'shadow',
            	colour: 'shadowColour',
            	hoverColour: 'shadowColourHover',
            } }
           />
        </PanelBody>

        {/* Shape Dividers (top + bottom). */}
        <ShapeDividersPanel attributes={ attributes } setAttributes={ setAttributes } />

      </InspectorControls>

      { hasBandProps ? (
        <div { ...blockProps }>
          { svgLayer }
          { gridItemScopedCss && <style>{ gridItemScopedCss }</style> }
          <div { ...innerBlocksProps } />
        </div>
      ) : (
        // Spread first, then state children explicitly: innerBlocksProps
        // CARRIES a `children` prop, so the SVG layer has to be composed with
        // it rather than added alongside the spread (which React would
        // silently discard).
        <div { ...innerBlocksProps }>
          { svgLayer }
          { gridItemScopedCss && <style>{ gridItemScopedCss }</style> }
          { innerBlocksProps.children }
        </div>
      ) }
    </>
  );
}
