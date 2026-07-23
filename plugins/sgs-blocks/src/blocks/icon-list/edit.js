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
  __experimentalToggleGroupControl as ToggleGroupControl,
  __experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from "@wordpress/components";
import {
  DesignTokenPicker,
  IconPicker,
  IconPreview,
  ResponsiveBoxControl,
  ResponsiveBorderRadiusControl,
  TypographyControls,
} from "../../components";
import { colourVar, spacingVar } from "../../utils";

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

// FR-36-26c Dispatch B — no JSON `enum` on `source` either (same reason as
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
    heading,
    headingLevel,
    markerType,
    source,
    menuRef,
    renderLandmark,
  } = attributes;

  const resolvedSource = source || "typed";

  // FR-36-26c Dispatch B — classic menus (Appearance → Menus, `nav_menu`
  // terms) are the primary menu source (Spec 36 FR-36-1); `menuRef` is a
  // `nav_menu` term id. Mirrors sgs/nav-menu/edit.js's own classic-menu
  // lookup (useEntityRecords( 'taxonomy', 'nav_menu', ... )).
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

  const resolvedMarkerType = markerType || "icon";
  // FR-36-26c: `numbered` MUST be a real <ol> in both editor and frontend —
  // CSS counters reach neither assistive tech nor crawlers.
  const ListTag = "numbered" === resolvedMarkerType ? "ol" : "ul";
  const HeadingTag = headingLevel || "h3";

  const blockProps = useBlockProps({
    className: `sgs-icon-list sgs-icon-list--icon-${iconSize} sgs-icon-list--marker-${resolvedMarkerType}`,
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

  // FR-36-26c: marker types other than icon/emoji render no icon span at
  // all — `bullet`/`numbered` get their marker from the list element itself
  // (CSS list-style / native <ol> numbering), `none` gets none.
  const showMarkerIcon = ["icon", "emoji"].includes(resolvedMarkerType);
  const listItemNodes = items.map((item, index) => {
    const resolved = resolveItemIcon(item, fallback);
    return (
      <li key={index} className="sgs-icon-list__item">
        {showMarkerIcon && (
          <span
            className="sgs-icon-list__icon"
            style={iconStyle}
            aria-hidden="true"
          >
            <IconPreview source={resolved.source} name={resolved.name} size={20} />
          </span>
        )}
        <span className="sgs-icon-list__text" style={textStyle}>
          {item.text}
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
  // Dispatch B: a menu-bound list's actual links resolve server-side only
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

  return (
    <>
      <InspectorControls>
        {/* FR-36-26c Dispatch B — typed items vs a bound WordPress menu. */}
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
          />
          {(heading || ("menu" === resolvedSource && selectedMenuName)) && (
            <>
              <SelectControl
                label={__("Heading level", "sgs-blocks")}
                value={headingLevel || "h3"}
                options={HEADING_LEVEL_OPTIONS}
                onChange={(val) => setAttributes({ headingLevel: val })}
                __nextHasNoMarginBottom
              />
              <TypographyControls
                attributes={attributes}
                setAttributes={setAttributes}
                prefix="heading"
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
          >
            {MARKER_TYPE_OPTIONS.map((opt) => (
              <ToggleGroupControlOption
                key={opt.value}
                value={opt.value}
                label={opt.label}
              />
            ))}
          </ToggleGroupControl>
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
          {["icon", "emoji"].includes(markerType || "icon") && (
            <DesignTokenPicker
              label={__("Icon colour", "sgs-blocks")}
              value={iconColour}
              onChange={(val) => setAttributes({ iconColour: val })}
            />
          )}
          <DesignTokenPicker
            label={__("Text colour", "sgs-blocks")}
            value={textColour}
            onChange={(val) => setAttributes({ textColour: val })}
          />
          <TypographyControls
            attributes={attributes}
            setAttributes={setAttributes}
            prefix="item"
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

      {canvasPreview}
    </>
  );
}
