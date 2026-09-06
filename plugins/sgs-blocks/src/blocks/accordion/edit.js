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
  ToggleControl,
  RangeControl,
} from "@wordpress/components";
import {
  SgsColourPanel,
  DesignTokenPicker,
  IconPicker,
  ResponsiveBoxControl,
  SgsBorderControl,
  TypographyControls,
  resolveColourToken,
} from "../../components";
import ContainerWrapperControls from "../container/components/ContainerWrapperControls";

const STYLE_OPTIONS = [
  { label: __("Bordered", "sgs-blocks"), value: "bordered" },
  { label: __("Flush", "sgs-blocks"), value: "flush" },
  { label: __("Card", "sgs-blocks"), value: "card" },
];

const ICON_POSITION_OPTIONS = [
  { label: __("Right", "sgs-blocks"), value: "right" },
  { label: __("Left", "sgs-blocks"), value: "left" },
];

const TEMPLATE = [
  ["sgs/accordion-item", { title: __("Question or heading", "sgs-blocks") }],
  ["sgs/accordion-item", { title: __("Another question", "sgs-blocks") }],
];

export default function Edit({ attributes, setAttributes }) {
  const {
    allowMultiple,
    defaultOpen,
    iconPosition,
    accordionStyle,
    borderWidth,
    borderStyle,
    borderColour,
    borderColourGradient,
    faqSchema,
    headerColour,
    headerBackground,
    headerBackgroundGradient,
    headerBackgroundHover,
    headerBackgroundHoverGradient,
    iconColour,
    iconColourGradient,
    iconColourHover,
    iconColourHoverGradient,
    openIcon,
    closeIcon,
  } = attributes;

  const className = [
    "sgs-accordion",
    `sgs-accordion--${accordionStyle}`,
    `sgs-accordion--icon-${iconPosition}`,
  ].join(" ");

  // `templateMode` (grid-section/card-grid presets) was removed from
  // block.json — this composite already restricts children to its own
  // structural child block (`sgs/accordion-item`) below; a generic preset
  // would only conflict with that fixed relationship.
  // Editor-canvas preview for the block-private border legs (Shape B).
  // Mirrors sgs/button's pattern: colours are stored as theme token SLUGS, which
  // are invalid CSS, so the preview MUST resolve them against the live palette or
  // picking a palette colour looks like a no-op. render.php resolves the same
  // slugs via sgs_colour_value(). Editor-only — the frontend contract (Spec 32,
  // no inline styling) governs render.php's output, not the canvas.
  const [ palette ] = useSettings( "color.palette" );

  const borderWidthPreview = ( () => {
    if ( ! borderWidth || "object" !== typeof borderWidth ) return undefined;
    const sides = [ "top", "right", "bottom", "left" ];
    if ( ! sides.some( ( side ) => borderWidth[ side ] ) ) return undefined;
    return sides.map( ( side ) => borderWidth[ side ] || "0" ).join( " " );
  } )();

  const previewStyle = {};
  if ( borderStyle && "none" !== borderStyle ) {
    // G5 (Bean, 2026-08-26): a style with no width means NO border — never fall
    // through to the browser's initial `medium`. Same gate as render.php.
    if ( borderWidthPreview ) {
      previewStyle.borderStyle = borderStyle;
      previewStyle.borderWidth = borderWidthPreview;
    }
    if ( borderColour ) {
      previewStyle.borderColor = resolveColourToken( borderColour, palette );
    }
    // A gradient border renders frontend as a masked ::before ring, which cannot
    // be reproduced in a plain inline style — approximate it with the gradient as
    // a border-image so the canvas at least shows that a gradient is applied.
    if ( borderColourGradient ) {
      previewStyle.borderImage = `${ borderColourGradient } 1`;
    }
  }

  const blockProps = useBlockProps({ className, style: previewStyle });
  const innerBlocksProps = useInnerBlocksProps(blockProps, {
    allowedBlocks: ["sgs/accordion-item"],
    template: TEMPLATE,
    renderAppender: false,
  });

  return (
    <>
      {/* D609/D618 uniformity rollout — ONE grouped, SGS-owned colour panel
          (own PanelBody, default InspectorControls group), rendered FIRST so
          it sits at the top of the inspector. Replaces the old scattered
          "Colours" PanelBody below. No hover siblings exist for these three
          attrs, so each row is single-state. */}
      <SgsColourPanel
        rows={ [
          {
            key: "headerText",
            label: __("Header text colour", "sgs-blocks"),
            states: [
              {
                key: "normal",
                label: __("Normal", "sgs-blocks"),
                value: headerColour,
                onChange: (val) => setAttributes({ headerColour: val }),
              },
            ],
          },
          {
            key: "headerBackground",
            label: __("Header background colour", "sgs-blocks"),
            gradientCapable: true,
            states: [
              {
                key: "normal",
                label: __("Normal", "sgs-blocks"),
                value: headerBackground,
                onChange: (val) => setAttributes({ headerBackground: val }),
                gradientValue: headerBackgroundGradient,
                onGradientChange: (val) =>
                  setAttributes({ headerBackgroundGradient: val ?? "" }),
              },
              {
                key: "hover",
                label: __("Hover", "sgs-blocks"),
                value: headerBackgroundHover,
                onChange: (val) =>
                  setAttributes({ headerBackgroundHover: val ?? "" }),
                gradientValue: headerBackgroundHoverGradient,
                onGradientChange: (val) =>
                  setAttributes({ headerBackgroundHoverGradient: val ?? "" }),
              },
            ],
          },
        ] }
      />
      <InspectorControls>
        <ContainerWrapperControls
          attributes={ attributes }
          setAttributes={ setAttributes }
          kind="layout"
        />
        <PanelBody title={__("Accordion Settings", "sgs-blocks")}>
          <SelectControl
            label={__("Style", "sgs-blocks")}
            value={accordionStyle}
            options={STYLE_OPTIONS}
            onChange={(val) => setAttributes({ accordionStyle: val })}
            __nextHasNoMarginBottom
          	__next40pxDefaultSize
          />
          <SelectControl
            label={__("Icon position", "sgs-blocks")}
            value={iconPosition}
            options={ICON_POSITION_OPTIONS}
            onChange={(val) => setAttributes({ iconPosition: val })}
            __nextHasNoMarginBottom
          	__next40pxDefaultSize
          />
          <DesignTokenPicker
            label={__("Icon colour", "sgs-blocks")}
            states={[
              {
                key: "normal",
                label: __("Normal", "sgs-blocks"),
                value: iconColour,
                onChange: (val) => setAttributes({ iconColour: val }),
                gradientValue: iconColourGradient,
                onGradientChange: (val) =>
                  setAttributes({ iconColourGradient: val ?? "" }),
              },
              {
                key: "hover",
                label: __("Hover", "sgs-blocks"),
                value: iconColourHover,
                onChange: (val) => setAttributes({ iconColourHover: val }),
                gradientValue: iconColourHoverGradient,
                onGradientChange: (val) =>
                  setAttributes({ iconColourHoverGradient: val ?? "" }),
              },
            ]}
          />
          <IconPicker
            label={__("Open icon", "sgs-blocks")}
            value={{ source: "lucide", name: openIcon }}
            onChange={( { name } ) => setAttributes({ openIcon: name })}
            sources={ [ 'lucide' ] }
          />
          <IconPicker
            label={__("Close icon", "sgs-blocks")}
            value={{ source: "lucide", name: closeIcon }}
            onChange={( { name } ) => setAttributes({ closeIcon: name })}
            sources={ [ 'lucide' ] }
          />
          <ToggleControl
            label={__("Allow multiple open", "sgs-blocks")}
            help={__(
              "Allow more than one item to be expanded at the same time.",
              "sgs-blocks",
            )}
            checked={allowMultiple}
            onChange={(val) => setAttributes({ allowMultiple: val })}
            __nextHasNoMarginBottom
          />
          <RangeControl
            label={__("Default open item", "sgs-blocks")}
            help={__(
              "-1 = all closed, 0 = first item, 1 = second, etc.",
              "sgs-blocks",
            )}
            value={defaultOpen}
            onChange={(val) => setAttributes({ defaultOpen: val })}
            min={-1}
            max={20}
            step={1}
            __nextHasNoMarginBottom
          	__next40pxDefaultSize
          />
        </PanelBody>

        <PanelBody
          title={__("FAQ structured data (AI search & Bing)", "sgs-blocks")}
          initialOpen={false}
        >
          <ToggleControl
            label={__("Enable FAQ Schema", "sgs-blocks")}
            help={__(
              "Outputs schema.org FAQPage JSON-LD. Google removed the FAQ rich result (May 2026), but AI search engines (ChatGPT, Perplexity, Google AI Overviews) and Bing still use it to cite your Q&A. Only enable when items contain genuine Q&A content.",
              "sgs-blocks",
            )}
            checked={faqSchema}
            onChange={(val) => setAttributes({ faqSchema: val })}
            __nextHasNoMarginBottom
          />
        </PanelBody>

      </InspectorControls>

      {/* ── Styles tab ─────────────────────────────────────────────── */}
      <InspectorControls group="styles">
        {/* Typography — replaces the old WP-native supports.typography
            (fontSize/lineHeight only) with the shared TypographyControls
            component + sgs_typography_css_rule() render.php helper (D971/D972
            full-replacement track). Root prefix "" since this is a
            single-target block; defaults also expose weight/style, which
            native typography never offered here. */}
        <PanelBody title={ __( "Typography", "sgs-blocks" ) } initialOpen={ false }>
          <TypographyControls
            attributes={ attributes }
            setAttributes={ setAttributes }
            prefix=""
          />
        </PanelBody>
        {/* Responsive spacing (padding + margin) — box-object interface contract
            (.claude/plans/2026-07-09-box-object-interface-contract.md §5). Base tier
            writes to the WP-native style.spacing object (also visible in the Styles >
            Dimensions panel); tablet/mobile write to the paddingTablet/paddingMobile
            and marginTablet/marginMobile object attrs read by the wrapper's @media tiers. */}
        <PanelBody title={ __( "Padding & margin", "sgs-blocks" ) } initialOpen={ false }>
          <ResponsiveBoxControl
            label={ __( "Padding", "sgs-blocks" ) }
            presets
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
            presets
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
        {/* Border — block-private width/style/colour attrs (Shape B, 2026-08-30).
            Radius is deliberately NOT mounted here: it stays a WP-native support
            (`__experimentalBorder.radius`) with its own control in the Styles >
            Border panel, and accordion had no radius control of its own to move.
            Pairing radius into this control across all 10 migrated blocks is its
            own decision — see Task 2. */}
        <PanelBody title={ __( "Border", "sgs-blocks" ) } initialOpen={ false }>
          <SgsBorderControl
            widthValues={ borderWidth ?? {} }
            onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
            widthPresets={ [ "10", "20", "30" ] }
            styleValue={ borderStyle }
            onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
            colourLabel={ __( "Border colour", "sgs-blocks" ) }
            colourValue={ borderColour }
            onColourChange={ ( val ) => setAttributes( { borderColour: val ?? "" } ) }
            colourGradientValue={ borderColourGradient }
            onColourGradientChange={ ( val ) =>
              setAttributes( { borderColourGradient: val ?? "" } )
            }
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

      <div {...innerBlocksProps} />
    </>
  );
}
