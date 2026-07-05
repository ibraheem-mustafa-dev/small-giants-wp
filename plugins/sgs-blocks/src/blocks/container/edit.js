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
import { ResponsiveControl } from "../../components";
import {
  ResponsiveSpacingPanel,
  ContentBandPanel,
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

        {/* Responsive spacing overrides (tablet / mobile padding + margin).
            Desktop base is handled by WP-native supports.spacing (Dimensions panel). */}
        <ResponsiveSpacingPanel
          attributes={ attributes }
          setAttributes={ setAttributes }
        />

        {/* Content band (Layer 2 __inner) — background, padding, responsive width. */}
        <ContentBandPanel
          attributes={ attributes }
          setAttributes={ setAttributes }
        />

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
