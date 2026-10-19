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
 * - Block link: the whole-block link panel for sgs/* blocks that opt in (hover-effects/).
 * - Child sizing: fit / fill / fixed width inside a flex row, per device, for
 *   blocks that opt in with supports.sgs.enabledExtensions ["childSizing"].
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
 * - CPT default panel: adds a Document sidebar "Default" toggle on the
 *   sgs_modal post-type screen only (renders null everywhere else) — see
 *   cpt-default-panel.js. sgs_header/sgs_footer were removed 2026-09-17,
 *   same day as added, once confirmed duplicate of Sgs_Active_Layout's
 *   existing "Active" admin mechanism for those two CPTs.
 * - Product Collection "same term" extension: adds a `sgsSameTermAs`
 *   taxonomy-picker panel to WooCommerce's `woocommerce/product-collection`
 *   block only — see product-collection-same-term.js. The frontend query
 *   change is server-side (includes/product-collection-same-term.php).
 * - Filter chips "Gap between chips": adds a per-device `sgsChipGap` length control
 *   to WooCommerce's `woocommerce/product-filter-chips` block only — see
 *   product-filter-chips-gap.js (frontend rule: includes/product-filter-chips-gap.php).
 */
import './responsive-device-toggle';
import './hover-effects';
import './child-sizing';
import './custom-css';
import './block-defaults';
import './image-controls';
import './responsive-visibility';
import './media-elements';
import './cpt-default-panel';
import './product-collection-same-term';
import './product-filter-chips-gap';
import './motion';
// The "Highlight" and "Inline photo" rich-text formats, offered by every SGS RichText whose `allowedFormats` lists them (Spec 02 FR-2-4, FR-2-5).
import './inline-formats';

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
// Child sizing's editor-canvas preview rules (an editor stylesheet imported from a non-entry module is attributed to an arbitrary block's frontend bundle, so it is imported here).
import './child-sizing.scss';
import './conditional-visibility';
