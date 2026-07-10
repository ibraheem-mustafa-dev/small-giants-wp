import { __ } from "@wordpress/i18n";
import { useBlockProps, InspectorControls } from "@wordpress/block-editor";
import { PanelBody, SelectControl, TextControl, ToggleControl, Button } from "@wordpress/components";
import {
  DesignTokenPicker,
  IconPicker,
  IconPreview,
  ResponsiveBoxControl,
  ResponsiveBorderRadiusControl,
} from "../../components";
import { colourVar, spacingVar } from "../../utils";

const ICON_SIZE_OPTIONS = [
  { label: __("Small", "sgs-blocks"), value: "small" },
  { label: __("Medium", "sgs-blocks"), value: "medium" },
  { label: __("Large", "sgs-blocks"), value: "large" },
];

const GAP_OPTIONS = [
  { label: __("Tight", "sgs-blocks"), value: "10" },
  { label: __("Normal", "sgs-blocks"), value: "20" },
  { label: __("Relaxed", "sgs-blocks"), value: "30" },
  { label: __("Spacious", "sgs-blocks"), value: "40" },
];

const BORDER_STYLE_OPTIONS = [
  { label: __("None", "sgs-blocks"), value: "none" },
  { label: __("Solid", "sgs-blocks"), value: "solid" },
  { label: __("Dashed", "sgs-blocks"), value: "dashed" },
  { label: __("Dotted", "sgs-blocks"), value: "dotted" },
  { label: __("Double", "sgs-blocks"), value: "double" },
  { label: __("Groove", "sgs-blocks"), value: "groove" },
  { label: __("Ridge", "sgs-blocks"), value: "ridge" },
  { label: __("Inset", "sgs-blocks"), value: "inset" },
  { label: __("Outset", "sgs-blocks"), value: "outset" },
];

// Legacy per-item slug → Lucide name (for items authored before the visual picker).
const LEGACY_ICON_MAP = {
  check: "check",
  "star-filled": "star",
  "arrow-right": "arrow-right",
  shipping: "truck",
  shield: "shield",
  payment: "credit-card",
  globe: "globe",
  people: "users",
};

/**
 * Resolve an item's icon to a { source, name } pair, migrating legacy items.
 *
 * @param {Object} item            List item.
 * @param {Object} fallback        Default { source, name } when the item has none.
 * @return {{source:string,name:string}} Resolved icon.
 */
function resolveItemIcon(item, fallback) {
  if (item.iconSource) {
    return { source: item.iconSource, name: item.iconName || fallback.name };
  }
  if (item.icon) {
    return { source: "lucide", name: LEGACY_ICON_MAP[item.icon] || item.icon };
  }
  return fallback;
}

/**
 * Box-object interface contract §1: build an editor-preview shorthand from a
 * box/corner object — mirrors render.php's hand-built shorthand so the canvas
 * matches the frontend (contract §5). Editor-canvas preview only — the SAVED/
 * RENDERED frontend output is dynamic (render.php) and emits everything
 * scoped, never inline (contract §A).
 */
function boxShorthand(box, keys) {
  if (!box || "object" !== typeof box) return undefined;
  if (!keys.some((key) => box[key])) return undefined;
  return keys.map((key) => box[key] || "0").join(" ");
}

function ItemEditor({ item, fallback, onChange, onRemove }) {
  const resolved = resolveItemIcon(item, fallback);
  return (
    <div
      className="sgs-icon-list-item-editor"
      style={{
        padding: "12px",
        border: "1px solid #ddd",
        borderRadius: "4px",
        marginBottom: "12px",
      }}
    >
      <IconPicker
        label={__("Icon", "sgs-blocks")}
        value={resolved}
        onChange={({ source, name }) =>
          onChange({ ...item, iconSource: source, iconName: name, icon: undefined })
        }
      />
      <TextControl
        label={__("Text", "sgs-blocks")}
        value={item.text || ""}
        onChange={(val) => onChange({ ...item, text: val })}
        __nextHasNoMarginBottom
      />
      <Button
        variant="secondary"
        isDestructive
        onClick={onRemove}
        size="small"
        style={{ marginTop: "8px" }}
      >
        {__("Remove item", "sgs-blocks")}
      </Button>
    </div>
  );
}

export default function Edit({ attributes, setAttributes }) {
  const {
    items,
    icon: defaultIconName,
    defaultIconSource,
    iconColour,
    iconSize,
    textColour,
    gap,
    style,
    paddingTablet,
    paddingMobile,
    marginTablet,
    marginMobile,
    borderRadiusTablet,
    borderRadiusMobile,
    borderWidth,
    borderColour,
    borderStyle,
  } = attributes;

  const fallback = {
    source: defaultIconSource || "lucide",
    name: defaultIconName || "check",
  };

  // Editor-canvas preview only (contract §A note above) — mirrors render.php's
  // scoped output so the canvas matches the frontend.
  const previewStyle = {};
  const paddingPreview = boxShorthand(style?.spacing?.padding, ["top", "right", "bottom", "left"]);
  if (paddingPreview) previewStyle.padding = paddingPreview;
  const marginPreview = boxShorthand(style?.spacing?.margin, ["top", "right", "bottom", "left"]);
  if (marginPreview) previewStyle.margin = marginPreview;
  const radiusPreview = boxShorthand(style?.border?.radius, ["topLeft", "topRight", "bottomRight", "bottomLeft"]);
  if (radiusPreview) previewStyle.borderRadius = radiusPreview;
  if (style?.color?.text) previewStyle.color = style.color.text;
  if (style?.color?.background) previewStyle.backgroundColor = style.color.background;
  if (borderStyle && borderStyle !== "none") {
    const borderWidthPreview = boxShorthand(borderWidth, ["top", "right", "bottom", "left"]);
    if (borderWidthPreview) previewStyle.borderWidth = borderWidthPreview;
    previewStyle.borderStyle = borderStyle;
    if (borderColour) {
      previewStyle.borderColor = /^#|^rgb|^hsl/.test(borderColour) ? borderColour : colourVar(borderColour);
    }
  }

  const blockProps = useBlockProps({
    className: `sgs-icon-list sgs-icon-list--icon-${iconSize}`,
    style: { ...previewStyle, gap: spacingVar(gap) || undefined },
  });

  const iconStyle = { color: colourVar(iconColour) || undefined };
  const textStyle = { color: colourVar(textColour) || undefined };

  const updateItem = (index, updatedItem) => {
    const updated = [...items];
    updated[index] = updatedItem;
    setAttributes({ items: updated });
  };

  const removeItem = (index) => {
    setAttributes({ items: items.filter((_, i) => i !== index) });
  };

  const addItem = () => {
    setAttributes({
      items: [
        ...items,
        { iconSource: fallback.source, iconName: fallback.name, text: "" },
      ],
    });
  };

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Items", "sgs-blocks")}>
          {items.map((item, index) => (
            <ItemEditor
              key={index}
              item={item}
              fallback={fallback}
              onChange={(updated) => updateItem(index, updated)}
              onRemove={() => removeItem(index)}
            />
          ))}
          <Button variant="secondary" onClick={addItem}>
            {__("Add item", "sgs-blocks")}
          </Button>
        </PanelBody>

        <PanelBody title={__("Appearance", "sgs-blocks")} initialOpen={false}>
          <IconPicker
            label={__("Default icon", "sgs-blocks")}
            value={fallback}
            onChange={({ source, name }) =>
              setAttributes({ defaultIconSource: source, icon: name })
            }
          />
          <SelectControl
            label={__("Icon size", "sgs-blocks")}
            value={iconSize}
            options={ICON_SIZE_OPTIONS}
            onChange={(val) => setAttributes({ iconSize: val })}
            __nextHasNoMarginBottom
          />
          <SelectControl
            label={__("Spacing", "sgs-blocks")}
            value={gap}
            options={GAP_OPTIONS}
            onChange={(val) => setAttributes({ gap: val })}
            __nextHasNoMarginBottom
          />
        </PanelBody>

        <PanelBody title={__("Text Styling", "sgs-blocks")} initialOpen={false}>
          <DesignTokenPicker
            label={__("Icon colour", "sgs-blocks")}
            value={iconColour}
            onChange={(val) => setAttributes({ iconColour: val })}
          />
          <DesignTokenPicker
            label={__("Text colour", "sgs-blocks")}
            value={textColour}
            onChange={(val) => setAttributes({ textColour: val })}
          />
        </PanelBody>

        {/* Box-object interface contract §B/§E: padding/margin base routes to
           WP-native style.spacing.* (skip-serialised → scoped, not inline);
           tiers are the paddingTablet/paddingMobile + marginTablet/
           marginMobile object attrs. */}
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

        {/* Box-object interface contract §1/§5: borderWidth is an SGS custom
           object attr (base only, no tiers — matches the pre-existing
           base-only contract); border-radius routes to WP-native
           style.border.radius + SGS tier objects (skip-serialised → scoped). */}
        <PanelBody title={__("Border", "sgs-blocks")} initialOpen={false}>
          <SelectControl
            label={__("Border style", "sgs-blocks")}
            value={borderStyle}
            options={BORDER_STYLE_OPTIONS}
            onChange={(val) => setAttributes({ borderStyle: val })}
            __nextHasNoMarginBottom
          />
          {borderStyle !== "none" && (
            <>
              <DesignTokenPicker
                label={__("Border colour", "sgs-blocks")}
                value={borderColour}
                onChange={(val) => setAttributes({ borderColour: val ?? "" })}
              />
              <ResponsiveBoxControl
                label={__("Border width", "sgs-blocks")}
                values={{ base: borderWidth ?? {} }}
                showResponsive={false}
                onChange={(tier, next) => setAttributes({ borderWidth: next })}
              />
            </>
          )}
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

      <ul {...blockProps}>
        {items.map((item, index) => {
          const resolved = resolveItemIcon(item, fallback);
          return (
            <li key={index} className="sgs-icon-list__item">
              <span
                className="sgs-icon-list__icon"
                style={iconStyle}
                aria-hidden="true"
              >
                <IconPreview source={resolved.source} name={resolved.name} size={20} />
              </span>
              <span className="sgs-icon-list__text" style={textStyle}>
                {item.text}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
