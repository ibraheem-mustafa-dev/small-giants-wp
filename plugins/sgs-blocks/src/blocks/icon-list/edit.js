import { __ } from "@wordpress/i18n";
import { useBlockProps, InspectorControls } from "@wordpress/block-editor";
import { PanelBody, SelectControl, TextControl, Button } from "@wordpress/components";
import { DesignTokenPicker, IconPicker, IconPreview } from "../../components";
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
  } = attributes;

  const fallback = {
    source: defaultIconSource || "lucide",
    name: defaultIconName || "check",
  };

  const blockProps = useBlockProps({
    className: `sgs-icon-list sgs-icon-list--icon-${iconSize}`,
  });

  const iconStyle = { color: colourVar(iconColour) || undefined };
  const textStyle = { color: colourVar(textColour) || undefined };
  const listStyle = { gap: spacingVar(gap) || undefined };

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
      </InspectorControls>

      <ul {...blockProps} style={{ ...blockProps.style, ...listStyle }}>
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
