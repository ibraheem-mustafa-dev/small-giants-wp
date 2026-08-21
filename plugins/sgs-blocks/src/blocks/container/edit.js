import { __ } from "@wordpress/i18n";
import {
  useBlockProps,
  useInnerBlocksProps,
  InspectorControls,
} from "@wordpress/block-editor";
import {
  PanelBody,
  SelectControl,
  TextControl,
  BoxControl,
} from "@wordpress/components";
import { useSelect } from "@wordpress/data";
import { ResponsiveControl, ResponsiveOverride, ResponsiveBoxControl, ShadowControl, SgsColourPanel, BOX_UNITS, normaliseResponsiveBox } from "../../components";
import { resolveShadowPreview, resolveResponsiveTier } from "../../utils";
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
 *  - Bare number (e.g. "24") → "24px". ⚠ This is a DELIBERATE change of
 *    meaning, Bean-ruled 2026-08-10. It previously resolved to
 *    var(--wp--preset--spacing--24) — a spacing-SCALE slug, where slug 30 is
 *    1rem and slug 20 is 0.5rem, so a bare number meant something quite
 *    unlike its face value. A bare number now means px everywhere, matching
 *    every other numeric control an operator touches. Block defaults that
 *    relied on the old slug meaning were rewritten to explicit lengths in the
 *    same change, so nothing renders differently because of this.
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
		gap && typeof gap === 'object' ? resolveResponsiveTier( gap, tier ) : gap;

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
];

const TEMPLATE_MODE_OPTIONS = [
  { label: __("Free (no restrictions)", "sgs-blocks"), value: "free" },
  { label: __("Grid section", "sgs-blocks"), value: "grid-section" },
  { label: __("Card grid", "sgs-blocks"), value: "card-grid" },
];

/**
 * Editor mirror of `$sgs_resolve_content_width` in class-sgs-container-wrapper.php.
 *
 * Kept token-for-token in step with the PHP: `normal`/`wide` map to the SAME global
 * custom properties the frontend uses, so the canvas band and the rendered band resolve
 * to one number rather than two that merely look alike. `full` and `''` both resolve to
 * NOTHING — they are identical on the frontend (:508-524) and must stay identical here,
 * because "no cap" is what makes `$has_band_props` false and suppresses the band entirely.
 *
 * @param {string} value Raw contentWidth tier value.
 * @return {string} A CSS length, or '' for no cap.
 */
function resolveContentWidthPreview( value ) {
	const v = String( value ?? '' );
	if ( v === 'normal' ) return 'var(--wp--style--global--content-size,1200px)';
	if ( v === 'wide' ) return 'var(--wp--style--global--wide-size,1400px)';
	if ( v === 'full' || v === '' ) return '';
	return v;
}

export default function Edit({ attributes, setAttributes, name }) {
  const {
    layout,
    gap,
    backgroundImage,
    bgVideo,
    bgKenBurns = false,
    bgAnimationDuration = 20,
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
    templateMode = "free",
    backgroundColour,
    backgroundColourGradient,
    backgroundColourHover,
    backgroundColourHoverGradient,
    textColour,
    textColourGradient,
    textColourHover,
    textColourHoverGradient,
  } = attributes;

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

  // Editor preview: show bg-image if set (video not previewed inline — too complex for editor).
  const hasBgImage = !!backgroundImage?.url;
  const hasBgVideo = !!bgVideo?.url;

  const style = {
    gap: gapCssValue( gap, previewTier ),
    minHeight: resolveResponsiveTier( attributes.minHeight, previewTier )?.value || undefined,
    ...(shadow && { boxShadow: resolveShadowPreview( shadow ) }),
    // Media is handed to a ::before layer via custom properties rather than
    // painted on the element, MIRRORING the frontend (Phase 1, 2026-08-08).
    // The editor is the surface clients actually work in, so it has to agree.
    ...(hasBgImage && !hasBgVideo && {
      "--sgs-ed-bg-image": `url(${backgroundImage.url})`,
      "--sgs-ed-bg-size": attributes.backgroundSize || "cover",
      "--sgs-ed-bg-position": attributes.backgroundPosition || "center center",
      "--sgs-ed-bg-repeat": attributes.backgroundRepeat || "no-repeat",
      "--sgs-ed-bg-attachment":
        attributes.backgroundAttachment === "fixed" ? "fixed" : "scroll",
    }),
    ...(hasBgVideo && {
      // Show a teal placeholder in editor when video is set
      backgroundColor: "var(--wp--preset--color--primary, #0F7E80)",
    }),
    ...(bgKenBurns && hasBgImage && {
      "--sgs-ken-burns-duration": `${bgAnimationDuration}s`,
    }),
  };

  if (layout === "grid") {
    style.display = "grid";
    // SB-2: use the gridTemplateColumns string attr when set so the editor preview
    // matches render.php output for asymmetric grids (e.g. "5fr 3fr", "60% 40%").
    // gridTemplateColumns is a TIER OBJECT (Spec 35 pass 3a) — calling .trim()
    // on it threw `p?.trim is not a function` and CRASHED the editor canvas.
    // The canvas preview represents the DESKTOP tier, so resolve that tier.
    // ⛔ Found only by opening the editor: no static gate in this repo can see
    // a type error inside an edit component (D567, same class).
    const gtcDesktop = resolveResponsiveTier( gridTemplateColumns, 'desktop' )?.value;
    // columns is also a TIER OBJECT (Spec 35 pass 4) — resolve the desktop
    // tier the same way, or this renders "repeat([object Object], 1fr)" and
    // silently breaks the editor grid preview (same D567 class as above).
    const columnsDesktop = resolveResponsiveTier( attributes.columns, 'desktop' )?.value;
    style.gridTemplateColumns = String( gtcDesktop ?? '' ).trim()
      ? String( gtcDesktop ).trim()
      : `repeat(${ columnsDesktop || 2 }, 1fr)`;
    style.alignItems = alignItems;
    if ( justifyItems && justifyItems !== "stretch" ) {
      style.justifyItems = justifyItems;
    }
    if ( alignContent && alignContent !== "stretch" ) {
      style.alignContent = alignContent;
    }
  } else if (layout === "flex") {
    style.display = "flex";
    style.flexWrap = "wrap";
    style.alignItems = alignItems;
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
  const hasBandPadding = [ "top", "right", "bottom", "left" ].some( ( side ) => !! bandPad[ side ] );
  const hasBandProps = bandMaxWidth !== "" || hasBandPadding;

  const bandStyle = {};
  if ( bandMaxWidth ) {
    bandStyle.maxWidth = bandMaxWidth;
    bandStyle.marginInline = "auto";
  }
  if ( bandPad.top ) bandStyle.paddingTop = bandPad.top;
  if ( bandPad.right ) bandStyle.paddingRight = bandPad.right;
  if ( bandPad.bottom ) bandStyle.paddingBottom = bandPad.bottom;
  if ( bandPad.left ) bandStyle.paddingLeft = bandPad.left;

  // GRID-ON-INNER. The frontend moves the grid ONTO the band whenever a band exists
  // (`$grid_on_inner`, ~:902) — which is why commit a28a1121 had to delete the
  // `.sgs-cols-*` classes: they addressed the wrapper after the grid had moved. The
  // canvas has to make the same move, or a grid container previews its columns on the
  // full-bleed outer while rendering them on the capped band.
  const gridOnInner = ( layout === "grid" || layout === "flex" ) && hasBandProps;
  if ( gridOnInner ) {
    for ( const key of [ "display", "gridTemplateColumns", "gap", "alignItems",
                         "justifyItems", "alignContent", "flexWrap" ] ) {
      if ( style[ key ] !== undefined ) {
        bandStyle[ key ] = style[ key ];
        delete style[ key ];
      }
    }
  }

  const className = [
    "sgs-container",
    `sgs-container--${layout}`,
  ]
    .filter(Boolean)
    .join(" ");

  // QB-3: allowedBlocks per templateMode — only restrict when operator explicitly
  // opts into a structured mode. "free" (default) imposes no restrictions.
  const TEMPLATE_MODE_ALLOWED = {
    "grid-section": [
      "sgs/container",
      "sgs/heading",
      "sgs/text",
      "sgs/button",
      "sgs/media",
    ],
    "card-grid": [
      "sgs/info-box",
      "sgs/card-grid",
      "sgs/container",
    ],
  };
  const allowedBlocks = templateMode !== "free"
    ? TEMPLATE_MODE_ALLOWED[templateMode] ?? undefined
    : undefined;

  // Gate the editor's ::before media layer on a class so the pseudo-element
  // exists ONLY on containers that actually have a background image — every
  // other container in the canvas is untouched (mirrors the frontend, where the
  // layer's box properties are only emitted when there is media to paint).
  const editorClassName = [ className, hasBgImage && !hasBgVideo ? "sgs-container--has-bg-media" : "" ]
    .filter( Boolean )
    .join( " " );

  const blockProps = useBlockProps({ className: editorClassName, style });
  // The children belong to the BAND when one renders, and to the root when one does not.
  // useInnerBlocksProps is called exactly once either way — branching the ARGUMENT, never
  // the hook, so this cannot trip the rules of hooks.
  const innerBlocksProps = useInnerBlocksProps(
    hasBandProps ? { className: "sgs-container__inner", style: bandStyle } : blockProps,
    {
      orientation: layout === "stack" ? "vertical" : undefined,
      allowedBlocks,
    }
  );

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
          <LayoutPanel attributes={ attributes } setAttributes={ setAttributes } />
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
          <ResponsiveBoxControl
            label={ __( "Padding", "sgs-blocks" ) }
            values={ {
              base: attributes.padding ?? {},
              tablet: attributes.paddingTablet ?? {},
              mobile: attributes.paddingMobile ?? {},
            } }
            onChange={ ( tier, next ) => {
              /* Breakpoint -> attr map, not a ternary. This is the CANONICAL
                 idiom in this codebase and check-control-ux.js recognises it
                 explicitly (its "COMPLIANT IDIOM EXEMPTION", ~:330): a variant
                 appearing as the VALUE of a `tablet:`/`mobile:` key is the
                 wrapped-and-delegated shape, whereas a bare computed ternary
                 reads to the gate as an unwrapped direct write and fails the
                 build with RESPONSIVE-FAMILY-WITHOUT-SWITCHER. It is also
                 simply less code: one setAttributes, no branch. */
              const attrFor = { base: "padding", tablet: "paddingTablet", mobile: "paddingMobile" };
              setAttributes( { [ attrFor[ tier ] ]: next } );
            } }
          />
          <hr style={ { margin: "16px 0" } } />
          <ResponsiveBoxControl
            label={ __( "Margin", "sgs-blocks" ) }
            values={ {
              base: attributes.margin ?? {},
              tablet: attributes.marginTablet ?? {},
              mobile: attributes.marginMobile ?? {},
            } }
            onChange={ ( tier, next ) => {
              /* Same canonical breakpoint -> attr map as Padding above. */
              const attrFor = { base: "margin", tablet: "marginTablet", mobile: "marginMobile" };
              setAttributes( { [ attrFor[ tier ] ]: next } );
            } }
          />
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

        {/* QB-3: Template mode — allowed children restriction. Container-specific. */}
        <PanelBody
          title={ __( "Template mode", "sgs-blocks" ) }
          initialOpen={ false }
        >
          <SelectControl
            label={ __( "Allowed children", "sgs-blocks" ) }
            value={ templateMode }
            options={ TEMPLATE_MODE_OPTIONS }
            onChange={ ( val ) => setAttributes( { templateMode: val } ) }
            help={ __(
              "Grid section and Card grid restrict which block types can be inserted directly inside this container. Free (default) imposes no restrictions.",
              "sgs-blocks"
            ) }
            __nextHasNoMarginBottom
          	__next40pxDefaultSize
          />
        </PanelBody>

        {/* Shadow — legacy string token attr (sm/md/lg/glow OR a raw box-shadow
          CSS string built by ShadowControl), resolved by sgs_shadow_value()
          (Spec 35 T2.2b). */}
        <PanelBody title={ __( "Shadow", "sgs-blocks" ) } initialOpen={ false }>
          <ShadowControl
            label={ __( "Shadow", "sgs-blocks" ) }
            value={ shadow || "" }
            onChange={ ( val ) => setAttributes( { shadow: val } ) }
            colour={ attributes.shadowColour }
            onColourChange={ ( val ) => setAttributes( { shadowColour: val } ) }
          />
        </PanelBody>

        {/* Shape Dividers (top + bottom). */}
        <ShapeDividersPanel attributes={ attributes } setAttributes={ setAttributes } />

      </InspectorControls>

      { hasBandProps ? (
        <div { ...blockProps }>
          <div { ...innerBlocksProps } />
        </div>
      ) : (
        <div { ...innerBlocksProps } />
      ) }
    </>
  );
}
