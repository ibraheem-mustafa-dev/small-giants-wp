import { __ } from "@wordpress/i18n";
import {
  useBlockProps,
  InspectorControls,
  InnerBlocks,
  RichText,
  MediaUpload,
  MediaUploadCheck,
} from "@wordpress/block-editor";
import {
  PanelBody,
  SelectControl,
  TextControl,
  Button,
  RangeControl,
  Notice,
} from "@wordpress/components";
import { DesignTokenPicker, ResponsiveControl } from "../../components";
import { colourVar, fontSizeVar } from "../../utils";

const CTA_TEMPLATE = [
  [ "sgs/multi-button", {}, [
    [ "sgs/button", { inheritStyle: "primary", label: "Primary Action" } ],
    [ "sgs/button", { inheritStyle: "secondary", label: "Secondary Action" } ],
  ] ],
];

const LAYOUT_OPTIONS = [
  { label: __("Centred", "sgs-blocks"), value: "centred" },
  { label: __("Left-aligned", "sgs-blocks"), value: "left" },
  { label: __("Split", "sgs-blocks"), value: "split" },
];

const FONT_SIZE_OPTIONS = [
  { label: __("Default", "sgs-blocks"), value: "" },
  { label: __("Small", "sgs-blocks"), value: "small" },
  { label: __("Medium", "sgs-blocks"), value: "medium" },
  { label: __("Large", "sgs-blocks"), value: "large" },
  { label: __("XL", "sgs-blocks"), value: "x-large" },
];

export default function Edit({ attributes, setAttributes }) {
  const {
    headline,
    body,
    ribbon,
    layout,
    headlineColour,
    bodyColour,
    bodyFontSize,
    backgroundImage,
    backgroundImageOpacity,
    gradientPreset,
    stats,
  } = attributes;

  const className = [
    "sgs-cta-section",
    `sgs-cta-section--${layout}`,
    gradientPreset ? `sgs-cta-section--gradient-${gradientPreset}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const wrapperStyle = {};
  if (backgroundImage?.url) {
    wrapperStyle.backgroundImage = `url(${backgroundImage.url})`;
    wrapperStyle.backgroundSize = "cover";
    wrapperStyle.backgroundPosition = "center";
  }

  const blockProps = useBlockProps({
    className,
    style: wrapperStyle,
  });

  const headlineStyle = {
    color: colourVar(headlineColour) || undefined,
  };

  const bodyStyle = {
    color: colourVar(bodyColour) || undefined,
    fontSize: fontSizeVar(bodyFontSize) || undefined,
  };

  const addStat = () => {
    setAttributes({
      stats: [...stats, { text: "" }],
    });
  };

  const updateStat = (index, text) => {
    const updated = [...stats];
    updated[index] = { text };
    setAttributes({ stats: updated });
  };

  const removeStat = (index) => {
    setAttributes({
      stats: stats.filter((_, i) => i !== index),
    });
  };

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Layout", "sgs-blocks")}>
          <SelectControl
            label={__("Layout", "sgs-blocks")}
            value={layout}
            options={LAYOUT_OPTIONS}
            onChange={(val) => setAttributes({ layout: val })}
            __nextHasNoMarginBottom
          />
          <TextControl
            label={__("Ribbon label", "sgs-blocks")}
            help={__(
              "Optional floating badge shown top-right of the CTA box. Leave blank to hide.",
              "sgs-blocks",
            )}
            value={ribbon || ""}
            onChange={(val) => setAttributes({ ribbon: val })}
            __nextHasNoMarginBottom
          />
        </PanelBody>

        <PanelBody title={__("Buttons", "sgs-blocks")} initialOpen={false}>
          <Notice status="info" isDismissible={false}>
            {__("Buttons are now managed using the SGS Button Group block inside the CTA section. Click on a button in the editor to configure its style, colour, and link.", "sgs-blocks")}
          </Notice>
        </PanelBody>

        <PanelBody
          title={__("Background", "sgs-blocks")}
          initialOpen={false}
        >
          <SelectControl
            label={__("Gradient preset", "sgs-blocks")}
            value={gradientPreset || ""}
            options={[
              { label: __("None", "sgs-blocks"), value: "" },
              { label: __("Primary fade", "sgs-blocks"), value: "primary-fade" },
              { label: __("Accent glow", "sgs-blocks"), value: "accent-glow" },
              { label: __("Dark radial", "sgs-blocks"), value: "dark-radial" },
              { label: __("Mesh soft", "sgs-blocks"), value: "mesh-soft" },
            ]}
            onChange={(val) => setAttributes({ gradientPreset: val })}
            help={__(
              "Gradient overrides the solid background colour when set.",
              "sgs-blocks",
            )}
            __nextHasNoMarginBottom
          />
          <MediaUploadCheck>
            <MediaUpload
              onSelect={(media) =>
                setAttributes({
                  backgroundImage: {
                    id: media.id,
                    url: media.url,
                    alt: media.alt,
                  },
                })
              }
              allowedTypes={["image"]}
              value={backgroundImage?.id}
              render={({ open }) => (
                <div>
                  {backgroundImage?.url ? (
                    <>
                      <img
                        src={backgroundImage.url}
                        alt=""
                        style={{
                          maxWidth: "100%",
                          marginBottom: "8px",
                        }}
                      />
                      <Button
                        variant="secondary"
                        onClick={() =>
                          setAttributes({
                            backgroundImage: undefined,
                          })
                        }
                        isDestructive
                      >
                        {__("Remove image", "sgs-blocks")}
                      </Button>
                    </>
                  ) : (
                    <Button variant="secondary" onClick={open}>
                      {__("Select background image", "sgs-blocks")}
                    </Button>
                  )}
                </div>
              )}
            />
          </MediaUploadCheck>
          <RangeControl
            label={__("Image opacity (%)", "sgs-blocks")}
            value={backgroundImageOpacity}
            onChange={(val) =>
              setAttributes({
                backgroundImageOpacity: val,
              })
            }
            min={0}
            max={100}
            __nextHasNoMarginBottom
          />
        </PanelBody>

        <PanelBody
          title={__("Stats / Social Proof", "sgs-blocks")}
          initialOpen={false}
        >
          {stats.map((stat, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <TextControl
                value={stat.text || ""}
                onChange={(val) => updateStat(index, val)}
                placeholder={__(
                  "e.g., Trusted by 5,000+ businesses",
                  "sgs-blocks",
                )}
                __nextHasNoMarginBottom
              />
              <Button
                icon="trash"
                isDestructive
                onClick={() => removeStat(index)}
                size="small"
              />
            </div>
          ))}
          <Button variant="secondary" onClick={addStat}>
            {__("Add stat", "sgs-blocks")}
          </Button>
        </PanelBody>

        <PanelBody title={__("Text Styling", "sgs-blocks")} initialOpen={false}>
          <DesignTokenPicker
            label={__("Headline colour", "sgs-blocks")}
            value={headlineColour}
            onChange={(val) => setAttributes({ headlineColour: val })}
          />
          <DesignTokenPicker
            label={__("Body colour", "sgs-blocks")}
            value={bodyColour}
            onChange={(val) => setAttributes({ bodyColour: val })}
          />
          <ResponsiveControl label={__("Body font size", "sgs-blocks")}>
            {(breakpoint) => {
              const attrMap = {
                desktop: "bodyFontSize",
                tablet: "bodyFontSizeTablet",
                mobile: "bodyFontSizeMobile",
              };
              return (
                <SelectControl
                  value={attributes[attrMap[breakpoint]] || ""}
                  options={
                    breakpoint === "desktop"
                      ? FONT_SIZE_OPTIONS
                      : [
                          {
                            label: __("Same as desktop", "sgs-blocks"),
                            value: "",
                          },
                          ...FONT_SIZE_OPTIONS.filter(
                            (opt) => opt.value !== "",
                          ),
                        ]
                  }
                  onChange={(val) =>
                    setAttributes({
                      [attrMap[breakpoint]]: val,
                    })
                  }
                  __nextHasNoMarginBottom
                />
              );
            }}
          </ResponsiveControl>
        </PanelBody>
      </InspectorControls>

      <div {...blockProps}>
        {backgroundImage?.url && (
          <span
            className="sgs-cta-section__overlay"
            style={{
              opacity: backgroundImageOpacity / 100,
            }}
            aria-hidden="true"
          />
        )}

        {ribbon && (
          <span className="sgs-cta-section__ribbon" aria-hidden="true">
            {ribbon}
          </span>
        )}

        <div className="sgs-cta-section__content">
          <RichText
            tagName="h2"
            className="sgs-cta-section__headline"
            value={headline}
            onChange={(val) => setAttributes({ headline: val })}
            placeholder={__("Call-to-action headline…", "sgs-blocks")}
            style={headlineStyle}
          />
          <RichText
            tagName="p"
            className="sgs-cta-section__body"
            value={body}
            onChange={(val) => setAttributes({ body: val })}
            placeholder={__("Supporting text…", "sgs-blocks")}
            style={bodyStyle}
          />
        </div>
        {stats.length > 0 && (
          <div className="sgs-cta-section__stats">
            {stats.map((stat, index) =>
              stat.text ? (
                <span key={index} className="sgs-cta-section__stat">
                  {stat.text}
                </span>
              ) : null,
            )}
          </div>
        )}

        <div className="sgs-cta-section__buttons">
          <InnerBlocks
            template={CTA_TEMPLATE}
            templateLock={false}
            allowedBlocks={["sgs/multi-button"]}
          />
        </div>
      </div>
    </>
  );
}
