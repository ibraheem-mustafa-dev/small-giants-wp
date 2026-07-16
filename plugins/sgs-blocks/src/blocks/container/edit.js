import { __ } from "@wordpress/i18n";
import {
  useBlockProps,
  useInnerBlocksProps,
  InspectorControls,
} from "@wordpress/block-editor";
import {
  PanelBody,
  SelectControl,
} from "@wordpress/components";
import { shadowVar } from "../../utils";
import { ResponsiveControl, ResponsiveBoxControl, DesignTokenPicker } from "../../components";
import {
  LayoutPanel,
  WidthPanel,
  BackgroundPanel,
  ShapeDividersPanel,
  GridItemDefaultsPanel,
  MIN_HEIGHT_OPTIONS,
  SHADOW_OPTIONS,
} from "./components/ContainerWrapperControls";

/**
 * Resolve a gap attribute value to a CSS string for editor preview.
 *
 * Mirrors PHP sgs_container_gap_value():
 *  - Bare slug (digits only, e.g. "40") → var(--wp--preset--spacing--40)
 *  - Raw CSS length (contains a letter or %, e.g. "16px", "1.5rem") → pass through
 *  - Empty → undefined (so the style key is omitted)
 *
 * @param {string} gap Gap attribute value.
 * @returns {string|undefined}
 */
function gapCssValue( gap ) {
	if ( ! gap ) {
		return undefined;
	}
	// Bare numeric slug → WP spacing preset var.
	if ( /^\d+$/.test( gap ) ) {
		return `var(--wp--preset--spacing--${ gap })`;
	}
	// Raw CSS length — return as-is (already validated by SpacingControl freeInput).
	return gap;
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

export default function Edit({ attributes, setAttributes }) {
  const {
    layout,
    gap,
    backgroundImage,
    bgVideo,
    bgKenBurns = false,
    bgAnimationDuration = 20,
    shadow,
    maxWidth,
    minHeight,
    gridTemplateColumns = "",
    verticalAlign,
    justifyItems = "stretch",
    alignContent = "stretch",
    templateMode = "free",
  } = attributes;

  // Editor preview: show bg-image if set (video not previewed inline — too complex for editor).
  const hasBgImage = !!backgroundImage?.url;
  const hasBgVideo = !!bgVideo?.url;

  const style = {
    gap: gapCssValue( gap ),
    minHeight: minHeight || undefined,
    ...(shadow && { boxShadow: shadowVar( shadow ) }),
    ...(hasBgImage && !hasBgVideo && {
      backgroundImage: `url(${backgroundImage.url})`,
      backgroundSize: attributes.backgroundSize || "cover",
      backgroundPosition: attributes.backgroundPosition || "center center",
      backgroundRepeat: attributes.backgroundRepeat || "no-repeat",
      ...(attributes.backgroundAttachment === "fixed" && { backgroundAttachment: "fixed" }),
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
    style.gridTemplateColumns = gridTemplateColumns?.trim()
      ? gridTemplateColumns.trim()
      : `repeat(${attributes.columns}, 1fr)`;
    style.alignItems = verticalAlign;
    if ( justifyItems && justifyItems !== "stretch" ) {
      style.justifyItems = justifyItems;
    }
    if ( alignContent && alignContent !== "stretch" ) {
      style.alignContent = alignContent;
    }
  } else if (layout === "flex") {
    style.display = "flex";
    style.flexWrap = "wrap";
    style.alignItems = verticalAlign;
  }

  // Editor preview: when a literal maxWidth is set, apply it as inline max-width.
  // Breakout (alignwide / alignfull) is driven by WP-native align attr — no inline style needed.
  if ( maxWidth ) {
    style.maxWidth = maxWidth;
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

  const blockProps = useBlockProps({ className, style });
  const innerBlocksProps = useInnerBlocksProps(blockProps, {
    orientation: layout === "stack" ? "vertical" : undefined,
    allowedBlocks,
  });

  return (
    <>
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
            help={ __( "Semantic tag for accessibility landmarks and SEO. Use Main / Nav / Aside / Article for their meaning; Div for a plain wrapper.", "sgs-blocks" ) }
            __nextHasNoMarginBottom
          />
          <hr style={ { margin: "16px 0" } } />
          <LayoutPanel attributes={ attributes } setAttributes={ setAttributes } />
          <hr style={ { margin: "16px 0" } } />
          <WidthPanel attributes={ attributes } setAttributes={ setAttributes } />
          <ResponsiveControl label={ __( "Min height", "sgs-blocks" ) }>
            { ( breakpoint ) => {
              const attrMap = {
                desktop: "minHeight",
                tablet:  "minHeightTablet",
                mobile:  "minHeightMobile",
              };
              return (
                <SelectControl
                  value={ attributes[ attrMap[ breakpoint ] ] || "" }
                  options={ MIN_HEIGHT_OPTIONS }
                  onChange={ ( val ) => setAttributes( { [ attrMap[ breakpoint ] ]: val } ) }
                  help={ breakpoint === "desktop"
                    ? __( "Desktop / base. Tablet and mobile override it at narrower widths.", "sgs-blocks" )
                    : undefined }
                  __nextHasNoMarginBottom
                />
              );
            } }
          </ResponsiveControl>
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
          <DesignTokenPicker
            label={ __( "Band background colour", "sgs-blocks" ) }
            value={ attributes.contentBandBackground || "" }
            onChange={ ( val ) => setAttributes( { contentBandBackground: val } ) }
          />
          <ResponsiveBoxControl
            label={ __( "Band padding", "sgs-blocks" ) }
            values={ {
              base: attributes.contentBandPadding ?? {},
              tablet: attributes.contentBandPaddingTablet ?? {},
              mobile: attributes.contentBandPaddingMobile ?? {},
            } }
            onChange={ ( tier, next ) => {
              // Explicit tablet:/mobile: literal map (matches the canonical
              // ResponsiveControl idiom used elsewhere in this file — see the
              // Min height attrMap above) so the control-ux static gate
              // recognises this as a compliant responsive-family write.
              const attrMap = {
                base: "contentBandPadding",
                tablet: "contentBandPaddingTablet",
                mobile: "contentBandPaddingMobile",
              };
              setAttributes( { [ attrMap[ tier ] ]: next } );
            } }
          />
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
          />
        </PanelBody>

        {/* Background (image/video/overlay/svg/animation tabs). */}
        <BackgroundPanel attributes={ attributes } setAttributes={ setAttributes } />

        {/* Shadow. */}
        <PanelBody title={ __( "Shadow", "sgs-blocks" ) } initialOpen={ false }>
          <SelectControl
            label={ __( "Shadow", "sgs-blocks" ) }
            value={ shadow || "" }
            options={ SHADOW_OPTIONS }
            onChange={ ( val ) => setAttributes( { shadow: val } ) }
            __nextHasNoMarginBottom
          />
        </PanelBody>

        {/* Shape Dividers (top + bottom). */}
        <ShapeDividersPanel attributes={ attributes } setAttributes={ setAttributes } />

      </InspectorControls>

      <div { ...innerBlocksProps } />
    </>
  );
}
