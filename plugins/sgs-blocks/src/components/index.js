export { default as ResponsiveControl } from './ResponsiveControl';
export { default as ResponsiveOverride } from './ResponsiveOverride';
export { default as ResponsiveTriStateControl } from './ResponsiveTriStateControl';
export { default as DeviceTabs } from './DeviceTabs';
export {
	default as ResponsiveBoxControl,
	ResponsiveBorderRadiusControl,
	BOX_UNITS,
	normaliseResponsiveBox,
} from './ResponsiveBoxControl';
export { default as ResponsiveBoxControls } from './ResponsiveBoxControls';
export {
	default as DesignTokenPicker,
	resolveColourToken,
} from './DesignTokenPicker';
export { default as SgsColourPanel } from './SgsColourPanel';
export { default as MediaGalleryPicker } from './MediaGalleryPicker';
// `parseLinearGradient` / `buildGradientCss` were deleted by 837f7c97 (D636 storage
// collapse) but stayed listed here, so the barrel advertised two bindings that resolve
// to `undefined` at runtime — a webpack WARNING, not an error, which is why a green
// build never caught it. Removed 2026-08-16 (D643).
export { default as GradientOverlayControl } from './GradientOverlayControl';
// Exported 2026-08-16 (D643). Previously reachable only via a deep import from
// GradientOverlayControl; the universal gradient rollout needs it as a first-class
// control (Spec 35 control-type contract field 8 — SgsGradientPicker REPLACES the
// native GradientPicker, it is not an internal detail of the overlay control).
export { default as SgsGradientPicker } from './gradient-picker';
// D636 Task 1b "text" builder — gradient-capable sibling to DesignTokenPicker
// for colour rows whose CSS mechanism is text-colour (background-clip:text).
// See the file's own docblock for why this is a new component, not an edit
// to DesignTokenPicker (which needs no changes per the rollout's own notes).
export {
	default as GradientCapableColourControl,
	isGradientValue,
} from './GradientCapableColourControl';
export { default as SgsLinkControl } from './SgsLinkControl';
export {
	default as LinkPopoverField,
	LinkPopoverContent,
	TARGET_ENUM_OPTIONS,
} from './LinkPopoverControl';
export { default as DateTimePickerField } from './DateTimePickerField';
export { default as ScaleAxisControl } from './ScaleAxisControl';
export { default as ShadowControl } from './ShadowControl';
export { default as SpacingControl } from './SpacingControl';
export { default as StateToggleControl } from './StateToggleControl';
export { default as AnimationControl } from './AnimationControl';
export { IconPicker, IconPreview } from './IconPicker';
export { default as RowQuickInsertAppender } from './RowQuickInsertAppender';
export { default as RowScrollBehaviourControls } from './RowScrollBehaviourControls';
export {
	default as TypographyControls,
	typographyAttrName,
	typographyAttrKeys,
	SGS_FONT_WEIGHT_OPTIONS,
	SGS_FONT_STYLE_OPTIONS,
} from './TypographyControls';
