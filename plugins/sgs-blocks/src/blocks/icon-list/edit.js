import { __ } from "@wordpress/i18n";
import { useBlockProps, InspectorControls } from "@wordpress/block-editor";
import { useEntityRecords } from "@wordpress/core-data";
import {
  PanelBody,
  SelectControl,
  TextControl,
  ToggleControl,
  Button,
  Notice,
} from "@wordpress/components";
import {
  IconPicker,
  IconPreview,
  ResponsiveBoxControl,
  TypographyControls,
  SgsColourPanel,
  fillRow,
  textRow,
  SgsBorderControl,
  ResponsiveOverride,
  BOX_UNITS,
  normaliseResponsiveBox,
  SgsBoxControl,
  GradientCapableColourControl,
  SgsLengthControl,
} from "../../components";
import ItemEffectsPanel from "../../shared/nav-menu-panels/ItemEffectsPanel";
import { colourVar, spacingVar } from "../../utils";
import { ToggleGroupControl, ToggleGroupControlOption } from "../../components/primitives";

const ICON_SIZE_OPTIONS = [
  { label: __("Small", "sgs-blocks"), value: "small" },
  { label: __("Medium", "sgs-blocks"), value: "medium" },
  { label: __("Large", "sgs-blocks"), value: "large" },
];

// FR-36-26c — no JSON `enum` on headingLevel/markerType (an out-of-enum
// stored value is otherwise silently coerced to the block.json default), so
// both are validated the same way in render.php; these options are the UI
// side of that same allowlist.
const HEADING_LEVEL_OPTIONS = [
  { label: __("H2", "sgs-blocks"), value: "h2" },
  { label: __("H3", "sgs-blocks"), value: "h3" },
  { label: __("H4", "sgs-blocks"), value: "h4" },
  { label: __("H5", "sgs-blocks"), value: "h5" },
  { label: __("H6", "sgs-blocks"), value: "h6" },
  { label: __("Paragraph", "sgs-blocks"), value: "p" },
];

// FR-36-26c — no JSON `enum` on `source` either (same reason as
// headingLevel/markerType above); render.php validates it the same way.
const SOURCE_OPTIONS = [
  { label: __("Typed items", "sgs-blocks"), value: "typed" },
  { label: __("WordPress menu", "sgs-blocks"), value: "menu" },
];

const MARKER_TYPE_OPTIONS = [
  { label: __("Icon", "sgs-blocks"), value: "icon" },
  { label: __("Emoji", "sgs-blocks"), value: "emoji" },
  { label: __("Bullet", "sgs-blocks"), value: "bullet" },
  { label: __("Numbered", "sgs-blocks"), value: "numbered" },
  { label: __("None", "sgs-blocks"), value: "none" },
];

const GAP_OPTIONS = [
  { label: __("Tight", "sgs-blocks"), value: "10" },
  { label: __("Normal", "sgs-blocks"), value: "20" },
  { label: __("Relaxed", "sgs-blocks"), value: "30" },
  { label: __("Spacious", "sgs-blocks"), value: "40" },
];

// Per-item slug → Lucide name, for items that store `{icon: slug}`.
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
 * Resolve an item's icon to a { source, name } pair (items may store `{icon: slug}`).
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
      	__next40pxDefaultSize
      />
      <TextControl
        label={__("Description (optional)", "sgs-blocks")}
        help={__("A smaller second line under the text.", "sgs-blocks")}
        value={item.description || ""}
        onChange={(val) => onChange({ ...item, description: val })}
        __nextHasNoMarginBottom
        __next40pxDefaultSize
      />
      <GradientCapableColourControl
        label={__("Icon colour (this item)", "sgs-blocks")}
        states={[
          {
            key: "normal",
            label: __("Normal", "sgs-blocks"),
            value: item.iconColour || "",
            onChange: (val) => onChange({ ...item, iconColour: val ?? "" }),
            linked: true,
            gradientValue: item.iconColourGradient || "",
            onGradientChange: (val) =>
              onChange({ ...item, iconColourGradient: val ?? "" }),
          },
          {
            key: "hover",
            label: __("Hover", "sgs-blocks"),
            value: item.iconColourHover || "",
            onChange: (val) => onChange({ ...item, iconColourHover: val ?? "" }),
            linked: true,
            gradientValue: item.iconColourGradientHover || "",
            onGradientChange: (val) =>
              onChange({ ...item, iconColourGradientHover: val ?? "" }),
          },
        ]}
        clearable
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
  const { padding, margin,
    items,
    icon: defaultIconName,
    defaultIconSource,
    backgroundColour,
    backgroundColourGradient,
    iconColour,
    iconColourHover,
    iconColourGradient,
    iconColourHoverGradient,
    iconSize,
    iconBackgroundColour,
    iconBoxSize,
    dividers,
    dividerColour,
    dividerEdges,
    itemPaddingBlock,
    textColour,
    gap,
    borderWidth,
    borderColour,
    borderColourGradient,
    borderStyle,
    heading,
    headingLevel,
    markerType,
    source,
    menuRef,
    renderLandmark,
    siblingDimOpacity,
    labelRoll,
    itemMotionDuration,
    itemMotionEasing,
    itemMotionEasingCustom,
    numberFormat,
    numberFontSize,
    numberFontWeight,
  } = attributes;

  // Contrast check for border — warn if border fails WCAG contrast against
  // the block's own background. When there's no background set or a gradient
  // is active, skip the check entirely.
  const iconListContrastAgainst =
    attributes.backgroundColour && ! attributes.backgroundColourGradient
      ? attributes.backgroundColour
      : '';


  const resolvedSource = source || "typed";

  // FR-36-26c — classic menus (Appearance → Menus, `nav_menu`
  // terms) are the primary menu source (Spec 36 FR-36-1); `menuRef` is a
  // `nav_menu` term id, listed via useEntityRecords( 'taxonomy', 'nav_menu', ... ).
  const { records: classicMenus, isResolving: isResolvingMenus } = useEntityRecords(
    "taxonomy",
    "nav_menu",
    { per_page: -1 },
    { enabled: "menu" === resolvedSource }
  );

  const selectedMenu = (classicMenus || []).find((menu) => menu.id === menuRef);
  const selectedMenuName = selectedMenu?.name || "";

  const menuOptions = [
    { label: __("Select a menu…", "sgs-blocks"), value: 0 },
    ...(classicMenus || []).map((menu) => ({
      label: menu.name || __("(untitled menu)", "sgs-blocks"),
      value: menu.id,
    })),
  ];

  const fallback = {
    source: defaultIconSource || "lucide",
    name: defaultIconName || "check",
  };

  // Editor-canvas preview only (contract §A note above) — mirrors render.php's
  // scoped output so the canvas matches the frontend.
  const previewStyle = {};
  // Numbered-list numbers (Wave 3C U-7): the canvas mirrors render.php's
  // `::marker` rule through custom properties (a marker cannot take an inline
  // style); style.css's `--marker-numbered` rule reads them.
  if ("numbered" === markerType) {
    if ("decimal-leading-zero" === numberFormat) previewStyle.listStyleType = "decimal-leading-zero";
    if (attributes.numberColour) previewStyle["--sgs-ilist-num-colour"] = colourVar(attributes.numberColour);
    if (numberFontSize) previewStyle["--sgs-ilist-num-size"] = numberFontSize;
    if (numberFontWeight) previewStyle["--sgs-ilist-num-weight"] = numberFontWeight;
  }
  // Divider colour override — a custom-property VALUE (matches render.php's
  // scoped rule); style.css's divider rules read it via a var() fallback.
  if (dividers && dividerColour) {
    previewStyle["--sgs-icon-list-divider-colour"] = colourVar(dividerColour);
  }
  const paddingPreview = boxShorthand(padding?.desktop, ["top", "right", "bottom", "left"]);
  if (paddingPreview) previewStyle.padding = paddingPreview;
  const marginPreview = boxShorthand(margin?.desktop, ["top", "right", "bottom", "left"]);
  if (marginPreview) previewStyle.margin = marginPreview;
  if (borderStyle && borderStyle !== "none") {
    const borderWidthPreview = boxShorthand(borderWidth, ["top", "right", "bottom", "left"]);
    if (borderWidthPreview) previewStyle.borderWidth = borderWidthPreview;
    previewStyle.borderStyle = borderStyle;
    if (borderColour) {
      previewStyle.borderColor = /^#|^rgb|^hsl/.test(borderColour) ? borderColour : colourVar(borderColour);
    }
    // A gradient border renders frontend as a masked ::before ring, which cannot
    // be reproduced in a plain inline style — approximate it with the gradient as
    // a border-image so the canvas at least shows that a gradient is applied.
    if (borderColourGradient && /^(repeating-)?(linear|radial|conic)-gradient\(/i.test(borderColourGradient)) {
      previewStyle.borderImage = `${borderColourGradient} 1`;
    }
  }

  const resolvedMarkerType = markerType || "icon";
  // FR-36-26c: `numbered` MUST be a real <ol> in both editor and frontend —
  // CSS counters reach neither assistive tech nor crawlers.
  const ListTag = "numbered" === resolvedMarkerType ? "ol" : "ul";
  const HeadingTag = headingLevel || "h3";

  const blockProps = useBlockProps({
    className: [
      "sgs-icon-list",
      `sgs-icon-list--icon-${iconSize}`,
      `sgs-icon-list--marker-${resolvedMarkerType}`,
      dividers && "sgs-icon-list--dividers",
      dividers && dividerEdges && "sgs-icon-list--divider-edges",
    ]
      .filter(Boolean)
      .join(" "),
    style: { ...previewStyle, gap: spacingVar(gap) || undefined },
  });

  const iconStyle = {
    color: colourVar(iconColour) || undefined,
    // Icon background circle — empty colour keeps today's output (no
    // circle); a set colour also sizes the span into a circle, matching
    // render.php's scoped rule.
    ...(iconBackgroundColour
      ? {
          backgroundColor: colourVar(iconBackgroundColour),
          borderRadius: "50%",
          width: iconBoxSize || "26px",
          height: iconBoxSize || "26px",
        }
      : {}),
  };
  const textStyle = { color: colourVar(textColour) || undefined };
  const descriptionStyle = {
    color: colourVar(attributes.descriptionColour) || undefined,
  };
  const itemStyle = itemPaddingBlock ? { paddingBlock: itemPaddingBlock } : undefined;

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

  // FR-36-26c: marker types other than icon/emoji render no icon span at
  // all — `bullet`/`numbered` get their marker from the list element itself
  // (CSS list-style / native <ol> numbering), `none` gets none.
  const showMarkerIcon = ["icon", "emoji"].includes(resolvedMarkerType);
  const listItemNodes = items.map((item, index) => {
    const resolved = resolveItemIcon(item, fallback);
    return (
      <li key={index} className="sgs-icon-list__item" style={itemStyle}>
        {showMarkerIcon && (
          <span
            className="sgs-icon-list__icon"
            style={iconStyle}
            aria-hidden="true"
          >
            <IconPreview source={resolved.source} name={resolved.name} size={20} gradient={iconColourGradient} />
          </span>
        )}
        <span className="sgs-icon-list__text" style={textStyle}>
          {item.text}
          {item.description && (
            <span className="sgs-icon-list__description" style={descriptionStyle}>
              {item.description}
            </span>
          )}
        </span>
      </li>
    );
  });

  // FR-36-26a rule 3: the `<nav>` landmark is opt-in for typed lists, and
  // NEVER offered for a url-less typed list — a list nobody can navigate
  // through is not a navigation landmark.
  const itemsHaveUrls = (items || []).some((item) => item.url);

  // FR-36-26c editor-canvas preview: heading blank = no heading element
  // (matches render.php exactly); marker types other than icon/emoji render
  // no icon span; `numbered` previews as a real <ol>.
  // A menu-bound list's actual links resolve server-side only
  // (render.php calls SGS_Nav_Menu_Source) — the `items` attribute is unused
  // in `source: menu`, so the typed-item preview would show stale/default
  // placeholder rows. Show a lightweight placeholder instead; the real links
  // render correctly on the frontend.
  let canvasPreview;
  if ("typed" !== resolvedSource) {
    canvasPreview = (
      <div {...blockProps}>
        {(heading || selectedMenuName) && (
          <HeadingTag className="sgs-icon-list__heading">
            {heading || selectedMenuName}
          </HeadingTag>
        )}
        <p style={{ opacity: 0.6, fontStyle: "italic" }}>
          {menuRef
            ? __("This list renders the selected menu's links on the frontend.", "sgs-blocks")
            : __("Select a menu in the sidebar to populate this list.", "sgs-blocks")}
        </p>
      </div>
    );
  } else if (heading) {
    canvasPreview = (
      <div>
        <HeadingTag className="sgs-icon-list__heading">{heading}</HeadingTag>
        <ListTag {...blockProps}>{listItemNodes}</ListTag>
      </div>
    );
  } else {
    canvasPreview = <ListTag {...blockProps}>{listItemNodes}</ListTag>;
  }

  const showIconColourRow = ["icon", "emoji"].includes(resolvedMarkerType);

  return (
    <>
      {/* ONE grouped, SGS-OWNED colour panel, rendered FIRST. Icon colour
         only applies when the marker renders an icon/emoji glyph; border
         colour only applies when a border style is selected — both rows are
         OMITTED (not disabled) when they don't apply. Every state links to
         the theme palette. */}
      <SgsColourPanel
        rows={[
          fillRow({
            key: "background",
            label: __("Background colour", "sgs-blocks"),
            attrs: {
              base: "backgroundColour",
              hover: "backgroundColourHover",
              gradient: "backgroundColourGradient",
              hoverGradient: "backgroundColourHoverGradient",
            },
            attributes,
            setAttributes,
          }),
          showIconColourRow && {
            key: "icon",
            label: __("Icon colour", "sgs-blocks"),
            states: [
              {
                key: "normal",
                label: __("Normal", "sgs-blocks"),
                value: iconColour,
                onChange: (val) => setAttributes({ iconColour: val ?? "" }),
                linked: true,
                gradientValue: iconColourGradient,
                onGradientChange: (val) =>
                  setAttributes({ iconColourGradient: val ?? "" }),
              },
              {
                key: "hover",
                label: __("Hover", "sgs-blocks"),
                value: iconColourHover,
                onChange: (val) => setAttributes({ iconColourHover: val ?? "" }),
                linked: true,
                gradientValue: iconColourHoverGradient,
                onGradientChange: (val) =>
                  setAttributes({ iconColourHoverGradient: val ?? "" }),
              },
            ],
          },
          showIconColourRow &&
            fillRow({
              key: "icon-background",
              label: __("Icon background circle", "sgs-blocks"),
              attrs: { base: "iconBackgroundColour" },
              attributes,
              setAttributes,
            }),
          textRow({
            key: "text",
            label: __("Text colour", "sgs-blocks"),
            attrs: {
              base: "textColour",
              hover: "textColourHover",
              gradient: "textColourGradient",
              hoverGradient: "textColourHoverGradient",
            },
            attributes,
            setAttributes,
          }),
          textRow({
            key: "description",
            label: __("Description colour", "sgs-blocks"),
            attrs: { base: "descriptionColour" },
            attributes,
            setAttributes,
          }),
          // Colour of the lines drawn between items (omitted when dividers are off).
          dividers &&
            fillRow({
              key: "divider",
              label: __("Divider colour", "sgs-blocks"),
              attrs: { base: "dividerColour" },
              attributes,
              setAttributes,
            }),
          // Wave 3C U-7: numbers of a numbered list (omitted otherwise).
          "numbered" === markerType &&
            textRow({
              key: "number",
              label: __("Number colour", "sgs-blocks"),
              attrs: { base: "numberColour" },
              attributes,
              setAttributes,
            }),
          // Wave 3C U-6 (M-24): the colour the other items take while one is hovered.
          textRow({
            key: "sibling-dim",
            label: __("Dimmed items (while another is hovered)", "sgs-blocks"),
            attrs: { base: "siblingDimColour", gradient: "siblingDimColourGradient" },
            attributes,
            setAttributes,
          }),
        ]}
      />
      <InspectorControls>
        {/* FR-36-26c — typed items vs a bound WordPress menu. */}
        <PanelBody title={__("Source", "sgs-blocks")} initialOpen={true}>
          {/* Spec 35 Part B: 2–5 short options → ToggleGroupControl, not a Select. */}
          <ToggleGroupControl
            label={__("List content", "sgs-blocks")}
            value={resolvedSource}
            isBlock
            onChange={(val) => {
              const next = { source: val };
              // FR-36-26a rule 3: menu-bound defaults ON.
              if ("menu" === val) {
                next.renderLandmark = true;
              }
              setAttributes(next);
            }}
            __nextHasNoMarginBottom
          	__next40pxDefaultSize
          >
            {SOURCE_OPTIONS.map((opt) => (
              <ToggleGroupControlOption
                key={opt.value}
                value={opt.value}
                label={opt.label}
              />
            ))}
          </ToggleGroupControl>
          {"menu" === resolvedSource && (
            <>
              <SelectControl
                label={__("Menu", "sgs-blocks")}
                value={menuRef || 0}
                options={menuOptions}
                onChange={(val) => setAttributes({ menuRef: Number(val) || 0 })}
                disabled={isResolvingMenus}
                help={__("Manage menus in Appearance → Menus.", "sgs-blocks")}
                __nextHasNoMarginBottom
              	__next40pxDefaultSize
              />
              {!menuRef && (
                <Notice status="info" isDismissible={false}>
                  {__("Choose a menu to render its links as this list.", "sgs-blocks")}
                </Notice>
              )}
            </>
          )}
        </PanelBody>

        {/* FR-36-26c — the list title. Blank renders no heading element at
           all when there is also no landmark; the level is a free-text-
           validated string (no JSON `enum` — render.php validates it the
           same way, blockjson-enum-coerces-invalid-to-default). For a
           menu-bound list a blank heading falls back to the MENU'S OWN NAME
           at render time (sticky — an entered heading always overrides). */}
        <PanelBody title={__("Heading", "sgs-blocks")} initialOpen={false}>
          <TextControl
            label={__("Heading text", "sgs-blocks")}
            help={
              "menu" === resolvedSource
                ? __("Leave blank to use the menu's own name.", "sgs-blocks")
                : __("Leave blank for no heading above the list.", "sgs-blocks")
            }
            placeholder={"menu" === resolvedSource ? selectedMenuName : ""}
            value={heading || ""}
            onChange={(val) => setAttributes({ heading: val })}
            __nextHasNoMarginBottom
          	__next40pxDefaultSize
          />
          {(heading || ("menu" === resolvedSource && selectedMenuName)) && (
            <>
              <SelectControl
                label={__("Heading level", "sgs-blocks")}
                value={headingLevel || "h3"}
                options={HEADING_LEVEL_OPTIONS}
                onChange={(val) => setAttributes({ headingLevel: val })}
                __nextHasNoMarginBottom
              	__next40pxDefaultSize
              />
            </>
          )}
        </PanelBody>

        {/* FR-36-26a rule 3 — opt-in <nav> landmark. Menu-bound lists are
           ALWAYS a landmark (forced on, not shown here — see the Source
           panel above); typed lists offer the toggle only once they have at
           least one item with a url, since a url-less list has nothing to
           navigate through. */}
        {"typed" === resolvedSource && itemsHaveUrls && (
          <PanelBody title={__("Navigation", "sgs-blocks")} initialOpen={false}>
            <ToggleControl
              label={__("Render as a navigation landmark", "sgs-blocks")}
              help={__(
                "Wraps the list in a <nav> element. Needs a heading — the heading becomes the landmark's name. Only turn this on for a genuine navigation menu; too many landmarks makes screen-reader landmark navigation noisier, not richer.",
                "sgs-blocks"
              )}
              checked={!!renderLandmark}
              onChange={(val) => setAttributes({ renderLandmark: val })}
              __nextHasNoMarginBottom
            />
            {renderLandmark && !heading && (
              <Notice status="warning" isDismissible={false}>
                {__(
                  "Add a heading above to name this landmark. Without one, the list renders as a plain list (not a <nav>), so it stays accessible.",
                  "sgs-blocks"
                )}
              </Notice>
            )}
          </PanelBody>
        )}

        <PanelBody title={__("Appearance", "sgs-blocks")} initialOpen={false}>
          {/* Spec 35 Part B: 2–5 short options → ToggleGroupControl, not a Select. */}
          <ToggleGroupControl
            label={__("Marker type", "sgs-blocks")}
            help={__(
              "Numbered renders a real ordered list, so order reaches assistive tech and search crawlers — not just CSS.",
              "sgs-blocks"
            )}
            value={markerType || "icon"}
            isBlock
            onChange={(val) => setAttributes({ markerType: val })}
            __nextHasNoMarginBottom
          	__next40pxDefaultSize
          >
            {MARKER_TYPE_OPTIONS.map((opt) => (
              <ToggleGroupControlOption
                key={opt.value}
                value={opt.value}
                label={opt.label}
              />
            ))}
          </ToggleGroupControl>
          {"numbered" === markerType && (
            <>
              <ToggleGroupControl
                label={__("Number style", "sgs-blocks")}
                value={numberFormat || "decimal"}
                isBlock
                onChange={(val) => setAttributes({ numberFormat: val || "decimal" })}
                __nextHasNoMarginBottom
                __next40pxDefaultSize
              >
                <ToggleGroupControlOption value="decimal" label="1, 2, 3" />
                <ToggleGroupControlOption value="decimal-leading-zero" label="01, 02, 03" />
              </ToggleGroupControl>
              <SgsLengthControl
                label={__("Number size", "sgs-blocks")}
                value={numberFontSize || ""}
                onChange={(val) => setAttributes({ numberFontSize: val || "" })}
                presets={false}
              />
              <SelectControl
                label={__("Number weight", "sgs-blocks")}
                value={numberFontWeight || ""}
                options={[
                  { value: "", label: __("Default", "sgs-blocks") },
                  { value: "400", label: __("Regular (400)", "sgs-blocks") },
                  { value: "500", label: __("Medium (500)", "sgs-blocks") },
                  { value: "600", label: __("Semibold (600)", "sgs-blocks") },
                  { value: "700", label: __("Bold (700)", "sgs-blocks") },
                  { value: "800", label: __("Extra bold (800)", "sgs-blocks") },
                ]}
                onChange={(val) => setAttributes({ numberFontWeight: val })}
                __nextHasNoMarginBottom
                __next40pxDefaultSize
              />
            </>
          )}
          {["icon", "emoji"].includes(markerType || "icon") && (
            <IconPicker
              label={__("Default icon", "sgs-blocks")}
              value={fallback}
              onChange={({ source: iconSource, name: iconName }) =>
                setAttributes({ defaultIconSource: iconSource, icon: iconName })
              }
            />
          )}
          <SelectControl
            label={__("Icon size", "sgs-blocks")}
            value={iconSize}
            options={ICON_SIZE_OPTIONS}
            onChange={(val) => setAttributes({ iconSize: val })}
            __nextHasNoMarginBottom
          	__next40pxDefaultSize
          />
          {showIconColourRow && !!iconBackgroundColour && (
            <SgsLengthControl
              label={__("Icon circle size", "sgs-blocks")}
              help={__("Diameter of the icon background circle. Empty uses 26px.", "sgs-blocks")}
              value={iconBoxSize || ""}
              onChange={(val) => setAttributes({ iconBoxSize: val || "" })}
              presets={false}
            />
          )}
          <SelectControl
            label={__("Spacing", "sgs-blocks")}
            value={gap}
            options={GAP_OPTIONS}
            onChange={(val) => setAttributes({ gap: val })}
            __nextHasNoMarginBottom
          	__next40pxDefaultSize
          />
          <ToggleControl
            label={__("Dividers between items", "sgs-blocks")}
            checked={!!dividers}
            onChange={(val) => setAttributes({ dividers: val })}
            __nextHasNoMarginBottom
          />
          {dividers && (
            <ToggleControl
              label={__("Also box the list (line above first, below last)", "sgs-blocks")}
              checked={!!dividerEdges}
              onChange={(val) => setAttributes({ dividerEdges: val })}
              __nextHasNoMarginBottom
            />
          )}
        </PanelBody>

      </InspectorControls>

      {/* ── Styles tab ─────────────────────────────────────────────── */}
      <InspectorControls group="styles">
        {"typed" === resolvedSource && (
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
        )}

        <PanelBody title={__("Text Styling", "sgs-blocks")} initialOpen={false}>
          <TypographyControls
            attributes={attributes}
            setAttributes={setAttributes}
            targets={[
              {
                key: "heading",
                label: __("Heading", "sgs-blocks"),
                prefix: "heading",
                fontSizePresets: true,
                showFontFamily: true,
                showDecoration: true,
                showTransform: true,
                showLetterSpacing: true,
                showTextAlign: true,
                showTextWrap: true,
                showTextColumns: true,
                showTextIndent: true,
                showWritingMode: true,
              },
              {
                key: "item",
                label: __("Item text (row)", "sgs-blocks"),
                prefix: "item",
                fontSizePresets: true,
                showFontFamily: true,
                showDecoration: true,
                showTransform: true,
                showLetterSpacing: true,
                showTextAlign: true,
                showTextWrap: true,
                showTextColumns: true,
                showTextIndent: true,
                showWritingMode: true,
              },
              {
                key: "text",
                label: __("Item text (span)", "sgs-blocks"),
                prefix: "textEl",
                fontSizePresets: true,
                showFontFamily: true,
                showDecoration: true,
                showTransform: true,
                showLetterSpacing: true,
                showTextAlign: true,
                showTextWrap: true,
                showTextColumns: true,
                showTextIndent: true,
                showWritingMode: true,
              },
              {
                key: "description",
                label: __("Item description", "sgs-blocks"),
                prefix: "description",
                fontSizePresets: true,
                showFontFamily: true,
                showDecoration: true,
                showTransform: true,
                showLetterSpacing: true,
                showTextAlign: true,
                showTextWrap: true,
                showTextColumns: true,
                showTextIndent: true,
                showWritingMode: true,
              },
            ]}
          />
        </PanelBody>

        {/* padding/margin are each a single block-owned tier-object attr
           { desktop, tablet, mobile }, written via ResponsiveOverride +
           SgsBoxControl; read directly by this block's render.php. */}
        <PanelBody title={__("Spacing", "sgs-blocks")} initialOpen={false}>
          <ResponsiveOverride
          	value={ attributes.padding }
          	onChange={ ( obj ) => setAttributes( { padding: obj } ) }
          >
          	{ ( { ownValue, setOwnValue } ) => (
          		<SgsBoxControl
          			label={ __( 'Padding', 'sgs-blocks' ) }
          			values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
          			units={ BOX_UNITS }
          			presets
          			onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
          		/>
          	) }
          </ResponsiveOverride>
          <ResponsiveOverride
          	value={ attributes.margin }
          	onChange={ ( obj ) => setAttributes( { margin: obj } ) }
          >
          	{ ( { ownValue, setOwnValue } ) => (
          		<SgsBoxControl
          			label={ __( 'Margin', 'sgs-blocks' ) }
          			values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
          			units={ BOX_UNITS }
          			presets
          			onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
          		/>
          	) }
          </ResponsiveOverride>
          <SgsLengthControl
            label={__("Item vertical padding", "sgs-blocks")}
            help={__("Top and bottom padding inside each item row — useful breathing room on a divided list.", "sgs-blocks")}
            value={itemPaddingBlock || ""}
            onChange={(val) => setAttributes({ itemPaddingBlock: val || "" })}
            presets={false}
          />
        </PanelBody>

        {/* Box-object interface contract §1/§5: borderWidth is an SGS custom
           object attr (base only, no tiers); border-radius routes to WP-native
           style.border.radius + SGS tier objects (skip-serialised → scoped). */}
        <PanelBody title={__("Border", "sgs-blocks")} initialOpen={false}>
          {/* One composite Width/Style/Colour row, mirroring native's
              BorderBoxControl layout, mounted unconditionally. Picking "none"
              still paints nothing — CSS suppresses a border with no style — so
              every control stays reachable and a client can always find the
              control to switch a border back on.
              Border radius stays WP-native, below. */}
          <SgsBorderControl
            widthValues={borderWidth ?? {}}
            onWidthChange={(next) => setAttributes({ borderWidth: next })}
            widthPresets={ [ '10', '20', '30' ] }
            styleValue={borderStyle}
            onStyleChange={(val) => setAttributes({ borderStyle: val })}
            colourLabel={__("Border colour", "sgs-blocks")}
            colourValue={borderColour}
            onColourChange={(val) => setAttributes({ borderColour: val ?? "" })}
            colourGradientValue={borderColourGradient}
            onColourGradientChange={(val) =>
              setAttributes({ borderColourGradient: val ?? "" })
            }
            colourLinked={true}
            contrastAgainst={ iconListContrastAgainst }
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

        <ItemEffectsPanel
          siblingDimOpacity={siblingDimOpacity}
          labelRoll={labelRoll}
          itemMotionDuration={itemMotionDuration}
          itemMotionEasing={itemMotionEasing}
          itemMotionEasingCustom={itemMotionEasingCustom}
          setAttributes={setAttributes}
        />
      </InspectorControls>

      {canvasPreview}
    </>
  );
}
