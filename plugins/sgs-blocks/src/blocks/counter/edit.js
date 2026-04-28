import { __ } from "@wordpress/i18n";
import {
  useBlockProps,
  InspectorControls,
  RichText,
} from "@wordpress/block-editor";
import {
  PanelBody,
  SelectControl,
  TextControl,
  RangeControl,
  ToggleControl,
} from "@wordpress/components";
import { DesignTokenPicker } from "../../components";
import { colourVar, fontSizeVar } from "../../utils";

const FONT_SIZE_OPTIONS = [
  { label: __("Default", "sgs-blocks"), value: "" },
  { label: __("Small", "sgs-blocks"), value: "small" },
  { label: __("Medium", "sgs-blocks"), value: "medium" },
  { label: __("Large", "sgs-blocks"), value: "large" },
  { label: __("XL", "sgs-blocks"), value: "x-large" },
  { label: __("XXL", "sgs-blocks"), value: "xx-large" },
];

function formatNumber(num, separator) {
  if (separator) {
    return num.toLocaleString("en-GB");
  }
  return String(num);
}

export default function Edit({ attributes, setAttributes }) {
  const {
    number,
    prefix,
    suffix,
    label,
    duration,
    separator,
    numberColour,
    labelColour,
    labelFontSize,
    icon,
    accentStroke,
  } = attributes;

  const className = [
    "sgs-counter",
    accentStroke ? "sgs-counter--accent-stroke" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const blockProps = useBlockProps({ className });

  const numberStyle = {
    color: colourVar(numberColour) || undefined,
  };

  const labelStyle = {
    color: colourVar(labelColour) || undefined,
    fontSize: fontSizeVar(labelFontSize) || undefined,
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
          <TextControl
            label={__("Lucide icon name", "sgs-blocks")}
            help={__(
              'Enter a Lucide icon slug (e.g. "star", "users", "bar-chart"). Icon renders on the frontend — not previewed in the editor.',
              "sgs-blocks",
            )}
            value={icon}
            onChange={(val) => setAttributes({ icon: val })}
            placeholder="e.g. star"
            __nextHasNoMarginBottom
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
          <SelectControl
            label={__("Label font size", "sgs-blocks")}
            value={labelFontSize || ""}
            options={FONT_SIZE_OPTIONS}
            onChange={(val) => setAttributes({ labelFontSize: val })}
            __nextHasNoMarginBottom
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
      </InspectorControls>

      <div {...blockProps}>
        {icon && (
          <span
            className="sgs-counter__icon-placeholder"
            aria-hidden="true"
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "0.75rem",
              color: "var(--wp--preset--color--text-muted)",
            }}
          >
            {`[ Icon: ${icon} ]`}
          </span>
        )}
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
