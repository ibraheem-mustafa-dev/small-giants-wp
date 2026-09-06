export { default as ResponsiveControl } from './ResponsiveControl';
export { default as BooleanResponsiveControl } from './BooleanResponsiveControl';
export { default as ResponsiveOverride } from './ResponsiveOverride';
export { default as ResponsiveTriStateControl } from './ResponsiveTriStateControl';
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
// Colour-variant row helpers (the five-variant family: 3 rows + 2 controls).
export { default as fillRow } from './colour-variants/fillRow';
export { default as textRow } from './colour-variants/textRow';
export { default as MediaElementPanel } from './MediaElementPanel';
export { default as MediaPanelLayout } from './media/MediaPanelLayout';
export { default as MediaGalleryPicker } from './MediaGalleryPicker';
export {
	elementScopeClass as mediaElementScopeClass,
	elementCustomProperties as mediaElementCustomProperties,
	requiresBox as mediaElementRequiresBox,
} from './media/canvasStyle';
// `parseLinearGradient` / `buildGradientCss` were deleted by 837f7c97 (D636 storage
// collapse) but stayed listed here, so the barrel advertised two bindings that resolve
// to `undefined` at runtime — a webpack WARNING, not an error, which is why a green
// build never caught it. Removed 2026-08-16 (D643).
export { default as GradientOverlayControl, gradientOverlayAttrName, gradientOverlayAttrKeys } from './GradientOverlayControl';
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
export { default as FocalPositionField } from './FocalPositionField';
export {
	default as LinkPopoverField,
	LinkPopoverContent,
	TARGET_ENUM_OPTIONS,
} from './LinkPopoverControl';
export { default as DateTimePickerField } from './DateTimePickerField';
export { default as SgsBooleanField } from './SgsBooleanField';
export { default as SgsFreeTextField } from './SgsFreeTextField';
export { default as SgsMultiSelectField } from './SgsMultiSelectField';
export { default as ColumnShapePicker } from './ColumnShapePicker';
export { activeShapeKey, weightsToTrack } from './ColumnShapePicker';
export { default as ScaleAxisControl } from './ScaleAxisControl';
export { default as ShadowControl, shadowAttrName, shadowAttrKeys } from './ShadowControl';
export { default as SpacingControl } from './SpacingControl';
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
// Three new shared components, 2026-08-19 (Bean-directed box-4value/border/
// length-unit rebuild — see each file's own docblock for the evidence).
export { default as SgsBoxControl } from './SgsBoxControl';
export { default as BorderStyleControl } from './BorderStyleControl';
export { default as SgsBorderControl } from './SgsBorderControl';
export { default as SgsLengthControl } from './SgsLengthControl';
// Shared media size & crop panel (C19, 2026-08-27) — piloted on sgs/media only.
// See the component's own docblock for the mode picker + grey-out contract.
export { default as MediaSizingPanel, RATIO_OPTIONS as MEDIA_SIZING_RATIO_OPTIONS } from './MediaSizingPanel';
