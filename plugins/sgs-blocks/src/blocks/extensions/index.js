/**
 * SGS Block Extensions
 *
 * Loaded once in the editor via enqueue_block_editor_assets.
 *
 * - Responsive device toggle: ONE global Desktop/Tablet/Mobile control portalled
 *   to the top of the block inspector, plus a persistent cue when the client is
 *   editing a non-desktop tier. Imported FIRST so it is registered before any
 *   panel-rendering extension. It registers a plugin (not a BlockEdit filter),
 *   so its position in this list does not affect panel order.
 * - Animation: controls for sgs/* blocks only (scroll-triggered animations).
 * - Hover effects: hover animations for sgs/* blocks.
 * - Custom CSS: per-block scoped CSS textarea in Advanced panel (also
 *   disables WP core's native `customCSS` support so only one CSS control
 *   shows — see custom-css.js).
 * - Block defaults: save current settings as defaults for new instances.
 * - Device visibility + Conditional visibility: responsive-visibility.js
 *   registers the sgsHideOnMobile/Tablet/Desktop attributes + classes/editor
 *   indicator only (no inspector UI); conditional-visibility.js renders the
 *   single collapsible "Visibility conditions" PanelBody (device toggles on
 *   top, conditional rules below) in the default InspectorControls group.
 *   conditional-visibility.js is imported LAST so its panel is the last
 *   default-group panel registered, landing it directly above WordPress
 *   core's structurally-last "Advanced" panel — see that file's header for
 *   the proof.
 */
import './responsive-device-toggle';
import './animation';
import './hover-effects';
import './custom-css';
import './block-defaults';
import './parallax';
import './image-controls';
import './fx';
import './responsive-visibility';
import './media-elements';

// The two colour-picker fork stylesheets that carry genuinely NEW SGS
// classnames (not core's own `.components-*` names, which `wp-components`
// already ships globally) — a `styled()`/emotion→plain-class conversion
// this fork needed since the project has no @emotion/styled dependency.
// Imported here, not from the component files themselves, because this is
// the ONE entry already loaded once in the editor (see file docblock);
// importing from a component shared across 36 block edit.js files let
// webpack's per-entry CSS extraction attribute the compiled CSS to an
// arbitrary block's FRONTEND style.css bundle instead (caught live by the
// Spec-31 F5 anti-cheat gate on sgs/accordion).
import '../../components/colour-picker/color-picker/editor.scss';
import '../../components/colour-picker/dropdown/editor.scss';
// "Scroll & effects" panel — the motion-budget Notice spans both ToolsPanel
// grid columns. Imported HERE rather than from fx.js for the reason the comment
// above gives: an editor stylesheet imported from a non-entry module gets
// attributed to an arbitrary block's FRONTEND bundle by webpack's per-entry CSS
// extraction, which the F5 anti-cheat gate catches on sgs/accordion.
import './fx-panel.scss';
import './conditional-visibility';
