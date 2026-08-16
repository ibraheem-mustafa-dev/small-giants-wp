import { __ } from "@wordpress/i18n";
import {
  useBlockProps,
  useInnerBlocksProps,
  InspectorControls,
} from "@wordpress/block-editor";
import {
  PanelBody,
  SelectControl,
  BoxControl,
} from "@wordpress/components";
import { useSelect } from "@wordpress/data";
import { ResponsiveControl, ResponsiveOverride, ResponsiveBoxControl, ShadowControl, BOX_UNITS, normaliseResponsiveBox } from "../../components";
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
  { label: __( "Main (page main content)", "sgs-blocks" ), value: "main" },
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
  const innerBlocksProps = useInnerBlocksProps(blockProps, {
    orientation: layout === "stack" ? "vertical" : undefined,
    allowedBlocks,
  });

  return (
    <>
      <InspectorControls>

        {/* Background (image/video/svg tabs + ken-burns/parallax) — root-level
            appearance, kept first so it isn't buried under content-scoped
            panels (container has no separate Styles tab yet). */}
        <BackgroundPanel attributes={ attributes } setAttributes={ setAttributes } name={ name } />

        {/* Layout panel — shared LayoutPanel + WidthPanel + container-specific controls
            (HTML tag, min-height ×3). Kept as a single "Layout" PanelBody to preserve
            the pre-refactor inspector order and label for container users. */}
        <PanelBody title={ __( "Layout", "sgs-blocks" ) }>
          <SelectControl
            label={ __( "HTML tag", "sgs-blocks" ) }
            value={ attributes.tagName || "section" }
            options={ TAG_NAME_OPTIONS }
            onChange={ ( val ) => setAttributes( { tagName: val } ) }
            help={ __( "Semantic tag for accessibility landmarks and SEO. Use Main / Nav / Aside / Article for their meaning; Div for a plain wrapper.", "sgs-blocks" ) }
            __nextHasNoMarginBottom
          	__next40pxDefaultSize
          />
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

        {/* Responsive spacing (padding + margin) — box-object interface contract
            (.claude/plans/2026-07-09-box-object-interface-contract.md §5). Base tier
            writes to the WP-native style.spacing object (also visible in the Styles >
            Dimensions panel); tablet/mobile write to the paddingTablet/paddingMobile
            and marginTablet/marginMobile object attrs read by the wrapper's @media tiers. */}
        <PanelBody title={ __( "Padding & margin", "sgs-blocks" ) } initialOpen={ false }>
          <ResponsiveBoxControl
            label={ __( "Padding", "sgs-blocks" ) }
            values={ {
              base: attributes.style?.spacing?.padding ?? {},
              tablet: attributes.paddingTablet ?? {},
              mobile: attributes.paddingMobile ?? {},
            } }
            onChange={ ( tier, next ) => {
              if ( tier === "base" ) {
                setAttributes( {
                  style: {
                    ...attributes.style,
                    spacing: { ...attributes.style?.spacing, padding: next },
                  },
                } );
              } else {
                setAttributes( {
                  [ tier === "tablet" ? "paddingTablet" : "paddingMobile" ]: next,
                } );
              }
            } }
          />
          <hr style={ { margin: "16px 0" } } />
          <ResponsiveBoxControl
            label={ __( "Margin", "sgs-blocks" ) }
            values={ {
              base: attributes.style?.spacing?.margin ?? {},
              tablet: attributes.marginTablet ?? {},
              mobile: attributes.marginMobile ?? {},
            } }
            onChange={ ( tier, next ) => {
              if ( tier === "base" ) {
                setAttributes( {
                  style: {
                    ...attributes.style,
                    spacing: { ...attributes.style?.spacing, margin: next },
                  },
                } );
              } else {
                setAttributes( {
                  [ tier === "tablet" ? "marginTablet" : "marginMobile" ]: next,
                } );
              }
            } }
          />
        </PanelBody>

        {/* Content band (Layer 2 __inner) padding — per-area object attr (contract §2),
            not a WP-native attr since the band is an SGS-only inner element. Background +
            responsive width controls stay on GridItemDefaultsPanel's neighbour BackgroundPanel
            / WidthPanel; this panel is scoped to band padding only. */}
        <PanelBody title={ __( "Content band", "sgs-blocks" ) } initialOpen={ false }>
          <p className="components-base-control__help">
            { __( "Styles the inner content band (the max-width wrapper set by Content width). Only active when Content width is set.", "sgs-blocks" ) }
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
          />
        </PanelBody>

        {/* Shape Dividers (top + bottom). */}
        <ShapeDividersPanel attributes={ attributes } setAttributes={ setAttributes } />

      </InspectorControls>

      <div { ...innerBlocksProps } />
    </>
  );
}
