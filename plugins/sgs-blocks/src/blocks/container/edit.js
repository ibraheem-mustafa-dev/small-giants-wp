import { __ } from "@wordpress/i18n";
import {
  useBlockProps,
  useInnerBlocksProps,
  InspectorControls,
  MediaUpload,
  MediaUploadCheck,
} from "@wordpress/block-editor";
import {
  PanelBody,
  SelectControl,
  RangeControl,
  Button,
  ToggleControl,
  __experimentalToggleGroupControl as ToggleGroupControl,
  __experimentalToggleGroupControlOption as ToggleGroupControlOption,
  TabPanel,
} from "@wordpress/components";
import {
  ResponsiveControl,
  SpacingControl,
  DesignTokenPicker,
} from "../../components";
import { spacingVar, shadowVar } from "../../utils";

const BG_SIZE_OPTIONS = [
  { label: __("Cover", "sgs-blocks"), value: "cover" },
  { label: __("Contain", "sgs-blocks"), value: "contain" },
  { label: __("Auto", "sgs-blocks"), value: "auto" },
];

const BG_POSITION_OPTIONS = [
  { label: __("Centre centre", "sgs-blocks"), value: "center center" },
  { label: __("Top centre", "sgs-blocks"), value: "top center" },
  { label: __("Bottom centre", "sgs-blocks"), value: "bottom center" },
  { label: __("Centre left", "sgs-blocks"), value: "center left" },
  { label: __("Centre right", "sgs-blocks"), value: "center right" },
  { label: __("Top left", "sgs-blocks"), value: "top left" },
  { label: __("Top right", "sgs-blocks"), value: "top right" },
  { label: __("Bottom left", "sgs-blocks"), value: "bottom left" },
  { label: __("Bottom right", "sgs-blocks"), value: "bottom right" },
];

const BG_REPEAT_OPTIONS = [
  { label: __("No repeat", "sgs-blocks"), value: "no-repeat" },
  { label: __("Repeat", "sgs-blocks"), value: "repeat" },
  { label: __("Repeat X", "sgs-blocks"), value: "repeat-x" },
  { label: __("Repeat Y", "sgs-blocks"), value: "repeat-y" },
];

const BG_ATTACHMENT_OPTIONS = [
  { label: __("Scroll", "sgs-blocks"), value: "scroll" },
  { label: __("Fixed (parallax)", "sgs-blocks"), value: "fixed" },
];

const SHAPE_OPTIONS = [
  { label: __("None", "sgs-blocks"), value: "" },
  { label: __("Wave", "sgs-blocks"), value: "wave" },
  { label: __("Wave (Smooth)", "sgs-blocks"), value: "wave-smooth" },
  { label: __("Triangle", "sgs-blocks"), value: "triangle" },
  {
    label: __("Triangle (Asymmetric)", "sgs-blocks"),
    value: "triangle-asymmetric",
  },
  { label: __("Curve", "sgs-blocks"), value: "curve" },
  {
    label: __("Curve (Asymmetric)", "sgs-blocks"),
    value: "curve-asymmetric",
  },
  { label: __("Zigzag", "sgs-blocks"), value: "zigzag" },
  { label: __("Cloud", "sgs-blocks"), value: "cloud" },
  { label: __("Slant", "sgs-blocks"), value: "slant" },
  { label: __("Slant (Gentle)", "sgs-blocks"), value: "slant-gentle" },
  { label: __("Mountains", "sgs-blocks"), value: "mountains" },
  { label: __("Drops", "sgs-blocks"), value: "drops" },
  { label: __("Tilt", "sgs-blocks"), value: "tilt" },
  { label: __("Arrow", "sgs-blocks"), value: "arrow" },
  { label: __("Split", "sgs-blocks"), value: "split" },
];

const LAYOUT_OPTIONS = [
  { label: __("Stack", "sgs-blocks"), value: "stack" },
  { label: __("Flex", "sgs-blocks"), value: "flex" },
  { label: __("Grid", "sgs-blocks"), value: "grid" },
];

const TAG_OPTIONS = [
  { label: "section", value: "section" },
  { label: "div", value: "div" },
  { label: "article", value: "article" },
  { label: "aside", value: "aside" },
  { label: "main", value: "main" },
];

const WIDTH_OPTIONS = [
  { label: __("Content", "sgs-blocks"), value: "content" },
  { label: __("Wide", "sgs-blocks"), value: "wide" },
  { label: __("Full", "sgs-blocks"), value: "full" },
];

const WIDTH_MODE_OPTIONS = [
  { label: __("Default", "sgs-blocks"), value: "default" },
  { label: __("Wide (alignwide)", "sgs-blocks"), value: "wide" },
  { label: __("Full (alignfull)", "sgs-blocks"), value: "full" },
  { label: __("Custom", "sgs-blocks"), value: "custom" },
];

const WIDTH_MODE_INHERIT_OPTIONS = [
  { label: __("Inherit", "sgs-blocks"), value: "" },
  ...WIDTH_MODE_OPTIONS,
];

const CUSTOM_WIDTH_UNIT_OPTIONS = [
  { label: "px", value: "px" },
  { label: "em", value: "em" },
  { label: "rem", value: "rem" },
  { label: "%", value: "%" },
  { label: "vw", value: "vw" },
];

const CUSTOM_WIDTH_UNIT_VALUES = CUSTOM_WIDTH_UNIT_OPTIONS.map((o) => o.value);

const ALIGN_OPTIONS = [
  { label: __("Top", "sgs-blocks"), value: "start" },
  { label: __("Centre", "sgs-blocks"), value: "center" },
  { label: __("Bottom", "sgs-blocks"), value: "end" },
  { label: __("Stretch", "sgs-blocks"), value: "stretch" },
];

export default function Edit({ attributes, setAttributes }) {
  const {
    layout,
    columns,
    gap,
    backgroundImage,
    backgroundImageTablet,
    backgroundImageMobile,
    backgroundSize = "cover",
    backgroundPosition = "center center",
    backgroundRepeat = "no-repeat",
    backgroundAttachment = "scroll",
    backgroundOverlayColour,
    backgroundOverlayOpacity,
    overlayGradient = false,
    overlayGradientAngle = 180,
    overlayGradientFrom = "",
    overlayGradientTo = "",
    bgVideo,
    bgVideoMobile,
    bgParallax = false,
    bgKenBurns = false,
    bgAnimationDuration = 20,
    shadow,
    maxWidth,
    minHeight,
    verticalAlign,
    widthMode = "default",
    widthModeMobile = "",
    widthModeTablet = "",
    widthModeDesktop = "",
    customWidth = 0,
    customWidthUnit = "px",
  } = attributes;

  const anyCustom =
    widthMode === "custom" ||
    widthModeMobile === "custom" ||
    widthModeTablet === "custom" ||
    widthModeDesktop === "custom";

  const safeCustomUnit = CUSTOM_WIDTH_UNIT_VALUES.includes(customWidthUnit)
    ? customWidthUnit
    : "px";

  // Editor preview: show bg-image if set (video not previewed inline — too complex for editor).
  const hasBgImage = !!backgroundImage?.url;
  const hasBgVideo = !!bgVideo?.url;

  const style = {
    gap: spacingVar(gap),
    minHeight: minHeight || undefined,
    ...(shadow && { boxShadow: shadowVar(shadow) }),
    ...(hasBgImage && !hasBgVideo && {
      backgroundImage: `url(${backgroundImage.url})`,
      backgroundSize,
      backgroundPosition,
      backgroundRepeat,
      ...(backgroundAttachment === "fixed" && { backgroundAttachment: "fixed" }),
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
    style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    style.alignItems = verticalAlign;
  } else if (layout === "flex") {
    style.display = "flex";
    style.flexWrap = "wrap";
    style.alignItems = verticalAlign;
  }

  if (widthMode === "custom" && customWidth > 0) {
    style.maxWidth = `${customWidth}${safeCustomUnit}`;
  }

  const className = [
    "sgs-container",
    `sgs-container--${layout}`,
    `sgs-container--width-${maxWidth}`,
    widthMode === "wide" && "alignwide",
    widthMode === "full" && "alignfull",
  ]
    .filter(Boolean)
    .join(" ");

  const blockProps = useBlockProps({ className, style });
  const innerBlocksProps = useInnerBlocksProps(blockProps, {
    orientation: layout === "stack" ? "vertical" : undefined,
  });

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Layout", "sgs-blocks")}>
          <SelectControl
            label={__("Layout type", "sgs-blocks")}
            value={layout}
            options={LAYOUT_OPTIONS}
            onChange={(val) => setAttributes({ layout: val })}
            __nextHasNoMarginBottom
          />

          {layout === "grid" && (
            <ResponsiveControl label={__("Columns", "sgs-blocks")}>
              {(breakpoint) => {
                const attrMap = {
                  desktop: "columns",
                  tablet: "columnsTablet",
                  mobile: "columnsMobile",
                };
                const attr = attrMap[breakpoint];
                return (
                  <RangeControl
                    value={attributes[attr]}
                    onChange={(val) =>
                      setAttributes({
                        [attr]: val,
                      })
                    }
                    min={1}
                    max={breakpoint === "mobile" ? 3 : 6}
                    __nextHasNoMarginBottom
                  />
                );
              }}
            </ResponsiveControl>
          )}

          <ResponsiveControl label={__("Gap", "sgs-blocks")}>
            {(breakpoint) => {
              const attrMap = {
                desktop: "gap",
                tablet: "gapTablet",
                mobile: "gapMobile",
              };
              const attr = attrMap[breakpoint];
              return (
                <SpacingControl
                  value={attributes[attr]}
                  onChange={(val) =>
                    setAttributes({
                      [attr]: val,
                    })
                  }
                />
              );
            }}
          </ResponsiveControl>

          <ToggleGroupControl
            label={__("Max width", "sgs-blocks")}
            value={maxWidth}
            onChange={(val) => setAttributes({ maxWidth: val })}
            isBlock
            __nextHasNoMarginBottom
          >
            {WIDTH_OPTIONS.map((opt) => (
              <ToggleGroupControlOption
                key={opt.value}
                value={opt.value}
                label={opt.label}
              />
            ))}
          </ToggleGroupControl>

          <ToggleGroupControl
            label={__("Width mode", "sgs-blocks")}
            value={widthMode}
            onChange={(val) => setAttributes({ widthMode: val })}
            isBlock
            __nextHasNoMarginBottom
          >
            {WIDTH_MODE_OPTIONS.map((opt) => (
              <ToggleGroupControlOption
                key={opt.value}
                value={opt.value}
                label={opt.label}
              />
            ))}
          </ToggleGroupControl>
          <p className="components-base-control__help">
            {__(
              "Composes with WP-native alignment. Per-viewport overrides below.",
              "sgs-blocks"
            )}
          </p>

          <ResponsiveControl label={__("Width mode by viewport", "sgs-blocks")}>
            {(breakpoint) => {
              const attrMap = {
                desktop: "widthModeDesktop",
                tablet: "widthModeTablet",
                mobile: "widthModeMobile",
              };
              const attr = attrMap[breakpoint];
              return (
                <SelectControl
                  value={attributes[attr] || ""}
                  options={WIDTH_MODE_INHERIT_OPTIONS}
                  onChange={(val) => setAttributes({ [attr]: val })}
                  __nextHasNoMarginBottom
                />
              );
            }}
          </ResponsiveControl>

          {anyCustom && (
            <>
              <RangeControl
                label={__("Custom width", "sgs-blocks")}
                value={customWidth}
                onChange={(val) =>
                  setAttributes({ customWidth: val || 0 })
                }
                min={0}
                max={2000}
                step={10}
                __nextHasNoMarginBottom
              />
              <SelectControl
                label={__("Unit", "sgs-blocks")}
                value={safeCustomUnit}
                options={CUSTOM_WIDTH_UNIT_OPTIONS}
                onChange={(val) => setAttributes({ customWidthUnit: val })}
                __nextHasNoMarginBottom
              />
            </>
          )}

          {(layout === "flex" || layout === "grid") && (
            <SelectControl
              label={__("Vertical alignment", "sgs-blocks")}
              value={verticalAlign}
              options={ALIGN_OPTIONS}
              onChange={(val) => setAttributes({ verticalAlign: val })}
              __nextHasNoMarginBottom
            />
          )}

          <SelectControl
            label={__("Min height", "sgs-blocks")}
            value={minHeight || ""}
            options={[
              { label: __("Auto", "sgs-blocks"), value: "" },
              { label: "50vh", value: "50vh" },
              { label: "75vh", value: "75vh" },
              { label: "100vh", value: "100vh" },
              { label: "200px", value: "200px" },
              { label: "400px", value: "400px" },
              { label: "600px", value: "600px" },
            ]}
            onChange={(val) => setAttributes({ minHeight: val })}
            __nextHasNoMarginBottom
          />

          <SelectControl
            label={__("HTML tag", "sgs-blocks")}
            value={attributes.htmlTag}
            options={TAG_OPTIONS}
            onChange={(val) => setAttributes({ htmlTag: val })}
            __nextHasNoMarginBottom
          />
        </PanelBody>

        <PanelBody
          title={__("Background", "sgs-blocks")}
          initialOpen={false}
        >
          <TabPanel
            tabs={[
              { name: "image", title: __("Image", "sgs-blocks") },
              { name: "video", title: __("Video", "sgs-blocks") },
              { name: "animation", title: __("Animation", "sgs-blocks") },
              { name: "overlay", title: __("Overlay", "sgs-blocks") },
            ]}
          >
            {(tab) => {
              if (tab.name === "image") {
                return (
                  <>
                    <p
                      className="components-base-control__label"
                      style={{ fontWeight: 600, marginBottom: "4px" }}
                    >
                      {__("Desktop image", "sgs-blocks")}
                    </p>
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
                          <div style={{ marginBottom: "8px" }}>
                            {backgroundImage?.url ? (
                              <>
                                <img
                                  src={backgroundImage.url}
                                  alt=""
                                  style={{ maxWidth: "100%", marginBottom: "8px" }}
                                />
                                <Button
                                  variant="secondary"
                                  onClick={() =>
                                    setAttributes({ backgroundImage: undefined })
                                  }
                                  isDestructive
                                >
                                  {__("Remove image", "sgs-blocks")}
                                </Button>
                              </>
                            ) : (
                              <Button variant="secondary" onClick={open}>
                                {__("Select image", "sgs-blocks")}
                              </Button>
                            )}
                          </div>
                        )}
                      />
                    </MediaUploadCheck>

                    <p
                      className="components-base-control__label"
                      style={{ fontWeight: 600, marginBottom: "4px", marginTop: "8px" }}
                    >
                      {__("Tablet image (optional)", "sgs-blocks")}
                    </p>
                    <MediaUploadCheck>
                      <MediaUpload
                        onSelect={(media) =>
                          setAttributes({
                            backgroundImageTablet: {
                              id: media.id,
                              url: media.url,
                              alt: media.alt,
                            },
                          })
                        }
                        allowedTypes={["image"]}
                        value={backgroundImageTablet?.id}
                        render={({ open }) => (
                          <div style={{ marginBottom: "8px" }}>
                            {backgroundImageTablet?.url ? (
                              <Button
                                variant="secondary"
                                onClick={() =>
                                  setAttributes({ backgroundImageTablet: undefined })
                                }
                                isDestructive
                              >
                                {__("Remove tablet image", "sgs-blocks")}
                              </Button>
                            ) : (
                              <Button variant="secondary" onClick={open}>
                                {__("Select tablet image", "sgs-blocks")}
                              </Button>
                            )}
                          </div>
                        )}
                      />
                    </MediaUploadCheck>

                    <p
                      className="components-base-control__label"
                      style={{ fontWeight: 600, marginBottom: "4px", marginTop: "8px" }}
                    >
                      {__("Mobile image (optional)", "sgs-blocks")}
                    </p>
                    <MediaUploadCheck>
                      <MediaUpload
                        onSelect={(media) =>
                          setAttributes({
                            backgroundImageMobile: {
                              id: media.id,
                              url: media.url,
                              alt: media.alt,
                            },
                          })
                        }
                        allowedTypes={["image"]}
                        value={backgroundImageMobile?.id}
                        render={({ open }) => (
                          <div style={{ marginBottom: "8px" }}>
                            {backgroundImageMobile?.url ? (
                              <Button
                                variant="secondary"
                                onClick={() =>
                                  setAttributes({ backgroundImageMobile: undefined })
                                }
                                isDestructive
                              >
                                {__("Remove mobile image", "sgs-blocks")}
                              </Button>
                            ) : (
                              <Button variant="secondary" onClick={open}>
                                {__("Select mobile image", "sgs-blocks")}
                              </Button>
                            )}
                          </div>
                        )}
                      />
                    </MediaUploadCheck>

                    {hasBgImage && (
                      <>
                        <SelectControl
                          label={__("Size", "sgs-blocks")}
                          value={backgroundSize}
                          options={BG_SIZE_OPTIONS}
                          onChange={(val) => setAttributes({ backgroundSize: val })}
                          __nextHasNoMarginBottom
                        />
                        <SelectControl
                          label={__("Position", "sgs-blocks")}
                          value={backgroundPosition}
                          options={BG_POSITION_OPTIONS}
                          onChange={(val) =>
                            setAttributes({ backgroundPosition: val })
                          }
                          __nextHasNoMarginBottom
                        />
                        <SelectControl
                          label={__("Repeat", "sgs-blocks")}
                          value={backgroundRepeat}
                          options={BG_REPEAT_OPTIONS}
                          onChange={(val) => setAttributes({ backgroundRepeat: val })}
                          __nextHasNoMarginBottom
                        />
                        <SelectControl
                          label={__("Attachment", "sgs-blocks")}
                          value={backgroundAttachment}
                          options={BG_ATTACHMENT_OPTIONS}
                          onChange={(val) =>
                            setAttributes({ backgroundAttachment: val })
                          }
                          __nextHasNoMarginBottom
                        />
                      </>
                    )}
                  </>
                );
              }

              if (tab.name === "video") {
                return (
                  <>
                    <p className="components-base-control__help">
                      {__(
                        "Video replaces the background image. Add an image as fallback for browsers that block autoplay.",
                        "sgs-blocks"
                      )}
                    </p>
                    <p
                      className="components-base-control__label"
                      style={{ fontWeight: 600, marginBottom: "4px" }}
                    >
                      {__("Desktop video", "sgs-blocks")}
                    </p>
                    <MediaUploadCheck>
                      <MediaUpload
                        onSelect={(media) =>
                          setAttributes({
                            bgVideo: { id: media.id, url: media.url },
                          })
                        }
                        allowedTypes={["video"]}
                        value={bgVideo?.id}
                        render={({ open }) => (
                          <div style={{ marginBottom: "8px" }}>
                            {bgVideo?.url ? (
                              <>
                                <p style={{ fontSize: "12px", marginBottom: "4px" }}>
                                  {bgVideo.url.split("/").pop()}
                                </p>
                                <Button
                                  variant="secondary"
                                  onClick={() => setAttributes({ bgVideo: undefined })}
                                  isDestructive
                                >
                                  {__("Remove video", "sgs-blocks")}
                                </Button>
                              </>
                            ) : (
                              <Button variant="secondary" onClick={open}>
                                {__("Select video", "sgs-blocks")}
                              </Button>
                            )}
                          </div>
                        )}
                      />
                    </MediaUploadCheck>

                    <p
                      className="components-base-control__label"
                      style={{ fontWeight: 600, marginBottom: "4px", marginTop: "8px" }}
                    >
                      {__("Mobile video (optional)", "sgs-blocks")}
                    </p>
                    <MediaUploadCheck>
                      <MediaUpload
                        onSelect={(media) =>
                          setAttributes({
                            bgVideoMobile: { id: media.id, url: media.url },
                          })
                        }
                        allowedTypes={["video"]}
                        value={bgVideoMobile?.id}
                        render={({ open }) => (
                          <div style={{ marginBottom: "8px" }}>
                            {bgVideoMobile?.url ? (
                              <Button
                                variant="secondary"
                                onClick={() =>
                                  setAttributes({ bgVideoMobile: undefined })
                                }
                                isDestructive
                              >
                                {__("Remove mobile video", "sgs-blocks")}
                              </Button>
                            ) : (
                              <Button variant="secondary" onClick={open}>
                                {__("Select mobile video", "sgs-blocks")}
                              </Button>
                            )}
                          </div>
                        )}
                      />
                    </MediaUploadCheck>
                  </>
                );
              }

              if (tab.name === "animation") {
                return (
                  <>
                    <p className="components-base-control__help">
                      {__(
                        "Requires a background image to be set. Ken-burns and parallax are mutually exclusive — ken-burns takes priority.",
                        "sgs-blocks"
                      )}
                    </p>
                    <ToggleControl
                      label={__("Ken-burns zoom", "sgs-blocks")}
                      help={__(
                        "Slow zoom animation on the background image.",
                        "sgs-blocks"
                      )}
                      checked={bgKenBurns}
                      onChange={(val) =>
                        setAttributes({ bgKenBurns: val, bgParallax: val ? false : bgParallax })
                      }
                      __nextHasNoMarginBottom
                    />
                    <ToggleControl
                      label={__("Parallax scroll", "sgs-blocks")}
                      help={__(
                        "Fixed background-attachment parallax effect. Disabled on touch devices.",
                        "sgs-blocks"
                      )}
                      checked={bgParallax}
                      onChange={(val) =>
                        setAttributes({ bgParallax: val, bgKenBurns: val ? false : bgKenBurns })
                      }
                      __nextHasNoMarginBottom
                    />
                    {bgKenBurns && (
                      <RangeControl
                        label={__("Animation duration (seconds)", "sgs-blocks")}
                        value={bgAnimationDuration}
                        onChange={(val) =>
                          setAttributes({ bgAnimationDuration: val })
                        }
                        min={5}
                        max={60}
                        step={1}
                        __nextHasNoMarginBottom
                      />
                    )}
                  </>
                );
              }

              if (tab.name === "overlay") {
                return (
                  <>
                    <p className="components-base-control__help">
                      {__(
                        "Overlay sits on top of the background image or video.",
                        "sgs-blocks"
                      )}
                    </p>
                    <ToggleControl
                      label={__("Gradient overlay", "sgs-blocks")}
                      checked={overlayGradient}
                      onChange={(val) => setAttributes({ overlayGradient: val })}
                      __nextHasNoMarginBottom
                    />
                    {overlayGradient ? (
                      <>
                        <RangeControl
                          label={__("Angle (degrees)", "sgs-blocks")}
                          value={overlayGradientAngle}
                          onChange={(val) =>
                            setAttributes({ overlayGradientAngle: val })
                          }
                          min={0}
                          max={360}
                          __nextHasNoMarginBottom
                        />
                        <DesignTokenPicker
                          label={__("Gradient from", "sgs-blocks")}
                          value={overlayGradientFrom}
                          onChange={(val) =>
                            setAttributes({ overlayGradientFrom: val })
                          }
                        />
                        <DesignTokenPicker
                          label={__("Gradient to (leave empty for transparent)", "sgs-blocks")}
                          value={overlayGradientTo}
                          onChange={(val) =>
                            setAttributes({ overlayGradientTo: val })
                          }
                        />
                      </>
                    ) : (
                      <DesignTokenPicker
                        label={__("Overlay colour", "sgs-blocks")}
                        value={backgroundOverlayColour}
                        onChange={(val) =>
                          setAttributes({ backgroundOverlayColour: val })
                        }
                      />
                    )}
                    <RangeControl
                      label={__("Overlay opacity (%)", "sgs-blocks")}
                      value={backgroundOverlayOpacity}
                      onChange={(val) =>
                        setAttributes({ backgroundOverlayOpacity: val })
                      }
                      min={0}
                      max={100}
                      __nextHasNoMarginBottom
                    />
                  </>
                );
              }

              return null;
            }}
          </TabPanel>
        </PanelBody>

        <PanelBody title={__("Shadow", "sgs-blocks")} initialOpen={false}>
          <SelectControl
            label={__("Shadow", "sgs-blocks")}
            value={shadow || ""}
            options={[
              {
                label: __("None", "sgs-blocks"),
                value: "",
              },
              { label: "Small", value: "sm" },
              { label: "Medium", value: "md" },
              { label: "Large", value: "lg" },
              { label: "Glow", value: "glow" },
            ]}
            onChange={(val) => setAttributes({ shadow: val })}
            __nextHasNoMarginBottom
          />
        </PanelBody>

        <PanelBody
          title={__("Shape Dividers", "sgs-blocks")}
          initialOpen={false}
        >
          <p
            className="components-base-control__label"
            style={{ fontWeight: 600, marginBottom: "8px" }}
          >
            {__("Top Divider", "sgs-blocks")}
          </p>
          <SelectControl
            label={__("Shape", "sgs-blocks")}
            value={attributes.shapeDividerTop || ""}
            options={SHAPE_OPTIONS}
            onChange={(val) => setAttributes({ shapeDividerTop: val })}
            __nextHasNoMarginBottom
          />
          {attributes.shapeDividerTop && (
            <>
              <DesignTokenPicker
                label={__("Colour", "sgs-blocks")}
                value={attributes.shapeDividerTopColour}
                onChange={(val) =>
                  setAttributes({
                    shapeDividerTopColour: val,
                  })
                }
              />
              <RangeControl
                label={__("Height (px)", "sgs-blocks")}
                value={attributes.shapeDividerTopHeight}
                onChange={(val) =>
                  setAttributes({
                    shapeDividerTopHeight: val,
                  })
                }
                min={20}
                max={300}
                __nextHasNoMarginBottom
              />
              <ToggleControl
                label={__("Flip horizontally", "sgs-blocks")}
                checked={attributes.shapeDividerTopFlip}
                onChange={(val) =>
                  setAttributes({
                    shapeDividerTopFlip: val,
                  })
                }
                __nextHasNoMarginBottom
              />
              <ToggleControl
                label={__("Invert vertically", "sgs-blocks")}
                checked={attributes.shapeDividerTopInvert}
                onChange={(val) =>
                  setAttributes({
                    shapeDividerTopInvert: val,
                  })
                }
                __nextHasNoMarginBottom
              />
            </>
          )}

          <hr style={{ margin: "16px 0" }} />

          <p
            className="components-base-control__label"
            style={{ fontWeight: 600, marginBottom: "8px" }}
          >
            {__("Bottom Divider", "sgs-blocks")}
          </p>
          <SelectControl
            label={__("Shape", "sgs-blocks")}
            value={attributes.shapeDividerBottom || ""}
            options={SHAPE_OPTIONS}
            onChange={(val) => setAttributes({ shapeDividerBottom: val })}
            __nextHasNoMarginBottom
          />
          {attributes.shapeDividerBottom && (
            <>
              <DesignTokenPicker
                label={__("Colour", "sgs-blocks")}
                value={attributes.shapeDividerBottomColour}
                onChange={(val) =>
                  setAttributes({
                    shapeDividerBottomColour: val,
                  })
                }
              />
              <RangeControl
                label={__("Height (px)", "sgs-blocks")}
                value={attributes.shapeDividerBottomHeight}
                onChange={(val) =>
                  setAttributes({
                    shapeDividerBottomHeight: val,
                  })
                }
                min={20}
                max={300}
                __nextHasNoMarginBottom
              />
              <ToggleControl
                label={__("Flip horizontally", "sgs-blocks")}
                checked={attributes.shapeDividerBottomFlip}
                onChange={(val) =>
                  setAttributes({
                    shapeDividerBottomFlip: val,
                  })
                }
                __nextHasNoMarginBottom
              />
              <ToggleControl
                label={__("Invert vertically", "sgs-blocks")}
                checked={attributes.shapeDividerBottomInvert}
                onChange={(val) =>
                  setAttributes({
                    shapeDividerBottomInvert: val,
                  })
                }
                __nextHasNoMarginBottom
              />
            </>
          )}
        </PanelBody>
      </InspectorControls>

      <div {...innerBlocksProps} />
    </>
  );
}
