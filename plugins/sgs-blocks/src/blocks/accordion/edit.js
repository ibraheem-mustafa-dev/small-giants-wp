import { __ } from "@wordpress/i18n";
import {
  useBlockProps,
  useInnerBlocksProps,
  InspectorControls,
} from "@wordpress/block-editor";
import {
  PanelBody,
  SelectControl,
  ToggleControl,
  RangeControl,
} from "@wordpress/components";
import { DesignTokenPicker, IconPicker, ResponsiveBoxControl } from "../../components";
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
    style: accordionStyle,
    faqSchema,
    headerColour,
    headerBackground,
    iconColour,
    openIcon,
    closeIcon,
  } = attributes;

  const className = [
    "sgs-accordion",
    `sgs-accordion--${accordionStyle}`,
    `sgs-accordion--icon-${iconPosition}`,
  ].join(" ");

  const blockProps = useBlockProps({ className });
  const innerBlocksProps = useInnerBlocksProps(blockProps, {
    allowedBlocks: ["sgs/accordion-item"],
    template: TEMPLATE,
    renderAppender: false,
  });

  return (
    <>
      <InspectorControls>
        <ContainerWrapperControls
          attributes={ attributes }
          setAttributes={ setAttributes }
          kind="layout"
        />
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
        <PanelBody title={__("Accordion Settings", "sgs-blocks")}>
          <SelectControl
            label={__("Style", "sgs-blocks")}
            value={accordionStyle}
            options={STYLE_OPTIONS}
            onChange={(val) => setAttributes({ style: val })}
            __nextHasNoMarginBottom
          />
          <SelectControl
            label={__("Icon position", "sgs-blocks")}
            value={iconPosition}
            options={ICON_POSITION_OPTIONS}
            onChange={(val) => setAttributes({ iconPosition: val })}
            __nextHasNoMarginBottom
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

        <PanelBody title={__("Colours", "sgs-blocks")} initialOpen={false}>
          <DesignTokenPicker
            label={__("Header text colour", "sgs-blocks")}
            value={headerColour}
            onChange={(val) => setAttributes({ headerColour: val })}
          />
          <DesignTokenPicker
            label={__("Header background colour", "sgs-blocks")}
            value={headerBackground}
            onChange={(val) => setAttributes({ headerBackground: val })}
          />
          <DesignTokenPicker
            label={__("Icon colour", "sgs-blocks")}
            value={iconColour}
            onChange={(val) => setAttributes({ iconColour: val })}
          />
        </PanelBody>
      </InspectorControls>

      <div {...innerBlocksProps} />
    </>
  );
}
