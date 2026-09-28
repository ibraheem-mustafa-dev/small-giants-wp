<?php
/**
 * Hover Effects — extra-class list.
 *
 * Split out of the former includes/hover-effects.php (the orchestrator now
 * lives in hover-effects.php in this same folder). Verbatim move of the
 * "Build extra classes" stage; no behaviour change.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Build the extra classes to add to a block's root element.
 *
 * PER-PROPERTY hover classes (2026-08-10). Each exists so extensions.css can
 * gate that ONE declaration on real evidence that the operator set it.
 *
 * WHY THIS WAS NEEDED. The hover rules in extensions.css were gated on
 * `[style*="--sgs-hover-bg"]`, which can NEVER match — this file emits its
 * custom properties inside a scoped <style> and never writes a style=""
 * attribute (Spec 32 / FR-32-11, see sgs_append_scoped_var_style). Every
 * hover colour/shadow rule was therefore DEAD on the frontend.
 *
 * Un-gating alone would have been a REGRESSION, not a fix. The early bail in
 * inject_hover_effects() is per-BLOCK, not per-PROPERTY: a block that set
 * only a hover SCALE still carries `sgs-has-hover`, so an unconditional
 * `box-shadow: var(--sgs-hover-shadow, none)` would strip a resting shadow
 * on hover. CSS cannot express "declare this only if the var exists" —
 * var() ALWAYS declares, and no fallback value means "don't declare me".
 * So the gate has to come from the class list, which is what the
 * pre-existing `sgs-has-hover-scale` already did for scale. This extends
 * that same proven pattern to the shadow property.
 *
 * Each condition MIRRORS its `$css_vars[]` guard in build_hover_vars()
 * exactly — if a var is emitted, its class is emitted, and neither without
 * the other.
 *
 * sgs-has-hover-bg/text/border were REMOVED 2026-08-20: sgsHoverBgColour/
 * TextColour/BorderColour were dead attrs (Bean, D-pending) — gated behind
 * the 'hover' opt-in extension that zero blocks declare, and duplicative
 * of each block's own element-owned backgroundColourHover/textColourHover/
 * borderColourHover controls. See src/blocks/extensions/hover-effects/ for
 * the full removal.
 *
 * @param string $sgs_scope_class  Scoping class for the scoped <style> rule, or ''.
 * @param bool   $has_hover        Whether any hover scale/shadow effect is active.
 * @param string $hover_shadow     Hover shadow slug, or ''.
 * @param int    $hover_lift       Lift in px (0 = off).
 * @param int    $hover_scale      Fine-grained scale (0-120).
 * @param string $hover_scale_preset Named scale preset, or ''.
 * @param bool   $hover_img_zoom   Whether image zoom on hover is active.
 * @param bool   $hover_grayscale  Whether grayscale-to-colour is active.
 * @param bool   $hover_border_acc Whether the border accent line is active.
 * @param bool   $hover_tilt_3d    Whether the 3D tilt effect is active.
 * @param int    $stagger_delay    Stagger delay in ms (0 = off).
 * @param bool   $focus_ring       Whether the focus ring is active.
 * @param string $block_link       Block-link URL, or ''.
 * @param bool   $has_ripple       Whether the click-ripple effect is active.
 * @param float  $hover_opacity    Fade-to opacity on hover (0-1; 0 = off).
 * @param string $hover_indent     Additive hover-only inline-start padding growth, or '' = off.
 * @param string $hover_shadow_custom Pre-sanitised raw box-shadow string, read only when $hover_shadow is 'custom'.
 * @return string[] Extra classes to add to the block's root element.
 */
function build_hover_classes(
	string $sgs_scope_class,
	bool $has_hover,
	string $hover_shadow,
	int $hover_lift,
	int $hover_scale,
	string $hover_scale_preset,
	bool $hover_img_zoom,
	bool $hover_grayscale,
	bool $hover_border_acc,
	bool $hover_tilt_3d,
	int $stagger_delay,
	bool $focus_ring,
	string $block_link,
	bool $has_ripple,
	float $hover_opacity = 0.0,
	string $hover_indent = '',
	string $hover_shadow_custom = ''
): array {
	$add_classes = array();

	if ( $sgs_scope_class ) {
		$add_classes[] = $sgs_scope_class;
	}
	if ( $has_hover ) {
		$add_classes[] = 'sgs-has-hover';
	}
	$hover_shadow_active = 'custom' === $hover_shadow
		? ( '' !== $hover_shadow_custom )
		: ( $hover_shadow && is_hover_shadow_slug( $hover_shadow ) );
	if ( $hover_shadow_active ) {
		// Mirrors the shadow branch's guard in build_hover_vars() exactly: a
		// value that emits NO var (out-of-list slug, or 'custom' with nothing
		// surviving sanitising) must emit no class either.
		$add_classes[] = 'sgs-has-hover-shadow';
	}
	// ⛔ THE ALLOW-LIST MUST BE MIRRORED HERE — it was not, and the comment on the
	// shadow branch directly above ("out-of-list value emits NO var, so it must
	// emit no class either") described a rule its own neighbour broke.
	//
	// The var guard in build_hover_vars() only emits `--sgs-hover-scale` for a
	// preset in ('1.02','1.05','1.1'). This condition had NO allow-list, so an
	// out-of-list preset emitted the CLASS WITHOUT THE VAR. Both consumers then
	// fell back to their own defaults — and they differ: the generic root rule
	// (`extensions.css`) falls back to `scale(1)` (no-op), while a block-owned
	// item rule such as `card-grid/style.css:237` falls back to `scale(1.05)`.
	// One operator setting, two different behaviours, decided by which stylesheet
	// happened to match. Found 2026-08-26 by the WP-core seat of the hover council.
	$sgs_scale_allowed = array( '1.02', '1.05', '1.1' );
	if ( $hover_scale || ( $hover_scale_preset && in_array( $hover_scale_preset, $sgs_scale_allowed, true ) ) ) {
		$add_classes[] = 'sgs-has-hover-scale';
	}
	if ( $hover_lift > 0 ) {
		// Mirrors the --sgs-hover-lift var guard in build_hover_vars().
		$add_classes[] = 'sgs-has-hover-lift';
	}
	if ( $hover_img_zoom ) {
		$add_classes[] = 'sgs-has-img-zoom';
	}
	if ( $hover_grayscale ) {
		$add_classes[] = 'sgs-has-grayscale';
	}
	if ( $hover_border_acc ) {
		$add_classes[] = 'sgs-has-border-accent';
	}
	if ( $hover_tilt_3d ) {
		$add_classes[] = 'sgs-has-tilt-3d';
	}
	if ( $stagger_delay > 0 ) {
		$add_classes[] = 'sgs-has-stagger';
	}
	if ( $focus_ring ) {
		$add_classes[] = 'sgs-has-focus-ring';
	}
	if ( $block_link ) {
		$add_classes[] = 'sgs-has-block-link';
	}
	if ( $has_ripple ) {
		$add_classes[] = 'sgs-has-click-ripple';
	}
	if ( $hover_opacity > 0 ) {
		// Mirrors the --sgs-hover-opacity var guard in build_hover_vars().
		$add_classes[] = 'sgs-has-hover-opacity';
	}
	if ( '' !== $hover_indent ) {
		// Mirrors the --sgs-hover-indent var guard in build_hover_vars().
		$add_classes[] = 'sgs-has-hover-indent';
	}

	return $add_classes;
}
