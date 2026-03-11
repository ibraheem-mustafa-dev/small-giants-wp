/**
 * SGS Block Extensions
 *
 * Loaded once in the editor via enqueue_block_editor_assets.
 *
 * - Animation: controls for sgs/* blocks only (scroll-triggered animations).
 * - Device visibility: show/hide per breakpoint for ALL blocks (core + SGS).
 * - Hover effects: hover animations for sgs/* blocks.
 * - Custom spacing: enhanced spacing controls for sgs/* blocks.
 * - Custom CSS: per-block scoped CSS textarea in Advanced panel.
 * - Block defaults: save current settings as defaults for new instances.
 */
import './animation';
import './responsive-visibility';
import './hover-effects';
import './custom-spacing';
import './custom-css';
import './block-defaults';
