/**
 * SGS Block Extensions
 *
 * Loaded once in the editor via enqueue_block_editor_assets.
 *
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
import './animation';
import './hover-effects';
import './custom-css';
import './block-defaults';
import './parallax';
import './image-controls';
import './fx';
import './responsive-visibility';
import './conditional-visibility';
