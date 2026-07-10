import { __ } from "@wordpress/i18n";
import {
  useBlockProps,
  InspectorControls,
  RichText,
} from "@wordpress/block-editor";
import {
  PanelBody,
  TextControl,
  RangeControl,
  ToggleControl,
} from "@wordpress/components";
import {
  DesignTokenPicker,
  IconPicker,
  IconPreview,
  TypographyControls,
  ResponsiveBoxControl,
  ResponsiveBorderRadiusControl,
} from "../../components";
import { colourVar } from "../../utils";


function formatNumber(num, separator) {
  if (separator) {
    return num.toLocaleString("en-GB");
  }
  return String(num);
}

// Box-object interface contract §1: build an editor-preview shorthand from a
// box object — mirrors render.php's box-shorthand builder so the canvas
// preview matches the frontend (contract §5).
function boxShorthand(box, keys) {
  if (!box || "object" !== typeof box) return undefined;
  if (!keys.some((key) => box[key])) return undefined;
  return keys.map((key) => box[key] || "0").join(" ");
}

export default function Edit({ attributes, setAttributes }) {
  const {
    style,
    number,
    prefix,
    suffix,
    label,
    duration,
    separator,
    numberColour,
    labelColour,
    icon,
    accentStroke,
    paddingTablet,
    paddingMobile,
    marginTablet,
    marginMobile,
    borderRadiusTablet,
    borderRadiusMobile,
  } = attributes;

  const className = [
    "sgs-counter",
    accentStroke ? "sgs-counter--accent-stroke" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Base padding/margin/border-radius preview — WP-native style.spacing.* /
  // style.border.radius objects (contract §B; box-model order top/right/
  // bottom/left, radius order top-left/top-right/bottom-right/bottom-left).
  const wrapperPreviewStyle = {};
  const paddingPreview = boxShorthand(style?.spacing?.padding, ["top", "right", "bottom", "left"]);
  if (paddingPreview) wrapperPreviewStyle.padding = paddingPreview;
  const marginPreview = boxShorthand(style?.spacing?.margin, ["top", "right", "bottom", "left"]);
  if (marginPreview) wrapperPreviewStyle.margin = marginPreview;
  const radiusPreview = boxShorthand(style?.border?.radius, ["topLeft", "topRight", "bottomRight", "bottomLeft"]);
  if (radiusPreview) wrapperPreviewStyle.borderRadius = radiusPreview;

  const blockProps = useBlockProps({ className, style: wrapperPreviewStyle });

  const numberStyle = {
    color: colourVar(numberColour) || undefined,
  };

  const labelStyle = {
    color: colourVar(labelColour) || undefined,
  };

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Counter Settings", "sgs-blocks")}>
          <TextControl
            label={__("Target number", "sgs-blocks")}
            value={String(number)}
            onChange={(val) => {
              const parsed = parseInt(val, 10);
              setAttributes({
                number: isNaN(parsed) ? 0 : parsed,
              });
            }}
            type="number"
            __nextHasNoMarginBottom
          />
          <TextControl
            label={__("Prefix", "sgs-blocks")}
            value={prefix}
            onChange={(val) => setAttributes({ prefix: val })}
            placeholder={__("e.g. £", "sgs-blocks")}
            __nextHasNoMarginBottom
          />
          <TextControl
            label={__("Suffix", "sgs-blocks")}
            value={suffix}
            onChange={(val) => setAttributes({ suffix: val })}
            placeholder={__("e.g. +, %, M", "sgs-blocks")}
            __nextHasNoMarginBottom
          />
          <ToggleControl
            label={__("Thousand separator", "sgs-blocks")}
            checked={separator}
            onChange={(val) => setAttributes({ separator: val })}
            __nextHasNoMarginBottom
          />
          <RangeControl
            label={__("Animation duration (ms)", "sgs-blocks")}
            value={duration}
            onChange={(val) => setAttributes({ duration: val })}
            min={500}
            max={5000}
            step={100}
            __nextHasNoMarginBottom
          />
        </PanelBody>

        <PanelBody title={__("Icon", "sgs-blocks")} initialOpen={false}>
          <IconPicker
            label={__("Icon", "sgs-blocks")}
            value={ icon ? { source: "lucide", name: icon } : null }
            onChange={ ( val ) => setAttributes({ icon: val ? val.name : "" }) }
          />
        </PanelBody>

        <PanelBody title={__("Text Styling", "sgs-blocks")} initialOpen={false}>
          <DesignTokenPicker
            label={__("Number colour", "sgs-blocks")}
            value={numberColour}
            onChange={(val) => setAttributes({ numberColour: val })}
          />
          <DesignTokenPicker
            label={__("Label colour", "sgs-blocks")}
            value={labelColour}
            onChange={(val) => setAttributes({ labelColour: val })}
          />
          <TypographyControls
            attributes={attributes}
            setAttributes={setAttributes}
            prefix="label"
            showLineHeight={true}
          />
        </PanelBody>

        <PanelBody title={__("Decoration", "sgs-blocks")} initialOpen={false}>
          <ToggleControl
            label={__("Accent underline stroke", "sgs-blocks")}
            help={__(
              "Adds a short coloured line beneath the number.",
              "sgs-blocks",
            )}
            checked={accentStroke}
            onChange={(val) => setAttributes({ accentStroke: val })}
            __nextHasNoMarginBottom
          />
        </PanelBody>

        {/* Spacing — Box-object interface contract §B/§E: padding/margin base
            routes to WP-native style.spacing.* (skip-serialised → scoped, not
            inline); tiers are the paddingTablet/paddingMobile +
            marginTablet/marginMobile object attrs. */}
        <PanelBody title={__("Spacing", "sgs-blocks")} initialOpen={false}>
          <ResponsiveBoxControl
            label={__("Padding", "sgs-blocks")}
            values={{
              base: style?.spacing?.padding ?? {},
              tablet: paddingTablet ?? {},
              mobile: paddingMobile ?? {},
            }}
            onChange={(tier, next) => {
              if ("base" === tier) {
                setAttributes({ style: { ...style, spacing: { ...style?.spacing, padding: next } } });
              } else {
                setAttributes({ [`padding${"tablet" === tier ? "Tablet" : "Mobile"}`]: next });
              }
            }}
          />
          <ResponsiveBoxControl
            label={__("Margin", "sgs-blocks")}
            values={{
              base: style?.spacing?.margin ?? {},
              tablet: marginTablet ?? {},
              mobile: marginMobile ?? {},
            }}
            onChange={(tier, next) => {
              if ("base" === tier) {
                setAttributes({ style: { ...style, spacing: { ...style?.spacing, margin: next } } });
              } else {
                setAttributes({ [`margin${"tablet" === tier ? "Tablet" : "Mobile"}`]: next });
              }
            }}
          />
        </PanelBody>

        {/* Border radius — base routes to WP-native style.border.radius
            (skip-serialised → scoped, not inline; border width/style/colour
            stay on the native WP Border panel in the Styles tab); tiers are
            the borderRadiusTablet/borderRadiusMobile object attrs. */}
        <PanelBody title={__("Border radius", "sgs-blocks")} initialOpen={false}>
          <ResponsiveBorderRadiusControl
            label={__("Border radius", "sgs-blocks")}
            values={{
              base: style?.border?.radius ?? {},
              tablet: borderRadiusTablet ?? {},
              mobile: borderRadiusMobile ?? {},
            }}
            onChange={(tier, next) => {
              if ("base" === tier) {
                setAttributes({ style: { ...style, border: { ...style?.border, radius: next } } });
              } else {
                setAttributes({ [`borderRadius${"tablet" === tier ? "Tablet" : "Mobile"}`]: next });
              }
            }}
          />
        </PanelBody>
      </InspectorControls>

      <div {...blockProps}>
        { icon && (
          <span className="sgs-counter__icon" aria-hidden="true">
            <IconPreview source="lucide" name={ icon } size={ 24 } />
          </span>
        ) }
        <span className="sgs-counter__number" style={numberStyle}>
          {prefix}
          {formatNumber(number, separator)}
          {suffix}
        </span>
        <RichText
          tagName="p"
          className="sgs-counter__label"
          value={label}
          onChange={(val) => setAttributes({ label: val })}
          placeholder={__("Label text…", "sgs-blocks")}
          style={labelStyle}
        />
      </div>
    </>
  );
}
