<?php
/**
 * Cursor-reactive field render layer — Spec 38 §3.3, FR-38-25.
 *
 * WHAT THIS CLOSES
 * `assets/css/fx-cursor-field.css` paints a field keyed on
 * `[data-sgs-cursor-field="<type>"]`, and lets an instance override the colour
 * and radius through two custom properties. Neither can come from the editor
 * without a render layer:
 *
 *   client picks a field type + colour  ->  data-sgs-fx-field="glow" etc.
 *   THIS FILE turns that into           ->  data-sgs-cursor-field="glow"
 *                                           + a uid-scoped <style> setting
 *                                             --sgs-cursor-field-colour/radius
 *   the CSS then paints                 ->  exactly what it already expected
 *
 * TWO REASONS IT IS A RENDER LAYER RATHER THAN INLINE STYLE.
 *
 * 1. Spec 32: an SGS block never renders an inline `style` property
 *    declaration, and `audit-inline-styling.js` fails the build on one. A
 *    per-instance uid-scoped `<style>` rule is the house pattern (D292-D296).
 * 2. `fx` is an EXTENSION attribute, present on any qualifying block, so there
 *    is no single block's render.php to put this in. One filter covers every
 *    block that can carry the effect.
 *
 * WHY THE TYPE ATTRIBUTE IS WRITTEN HERE AND NOT BY JS — this is the fail-open
 * contract (§1.6), and it is easy to get backwards. For this effect the
 * FINISHED STATE is the static field: with JS blocked, or under reduced motion,
 * the client's configured surface must still paint, simply without following
 * the pointer. If JS applied `data-sgs-cursor-field`, a no-JS visitor would get
 * a blank surface where an effect was configured. So SSR marks the emitter and
 * JS adds only the tracking.
 *
 * PRIORITY 11 matches the sibling route-expanders (`fx-path-routes.php`,
 * `fx-shape-routes.php`): after `fx-attributes.php` (p10) has injected the fx
 * data attributes onto DYNAMIC blocks — static blocks already carry them from
 * save time — and before `SGS_Motion_Registry`'s p99 sniff, which decides
 * whether the module and stylesheet are enqueued at all.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

if ( ! \defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Field types this render layer will honour.
 *
 * A CLOSED list, deliberately. An unrecognised value is skipped with a reason
 * rather than passed through (Spec 38 §11.3 / Rule 4) — passing it through
 * would put an attribute in the markup that no CSS rule matches, producing an
 * effect that is configured, enqueued, and invisible. That is exactly the
 * class of silent failure that let morph ship broken for months (D452).
 *
 * Keep in step with the field-type rules in `assets/css/fx-cursor-field.css`.
 *
 * @var string[]
 */
const SGS_FX_CURSOR_FIELD_TYPES = array( 'glow', 'spotlight-mask', 'hue-shift', 'parallax-pattern', 'brick-reveal' );

/**
 * Pointer-pool SHAPES. The empty default is a circle, declared in the
 * stylesheet, so an instance saved before shapes existed is unchanged. Values
 * here must match the `[data-sgs-cursor-field-shape="…"]` rules in
 * `assets/css/fx-cursor-field.css` — a slug allowlisted with no rule silently
 * renders a circle, which is the "configured and invisible" shape this file's
 * type allowlist already guards against.
 *
 * @var string[]
 */
const SGS_FX_CURSOR_FIELD_SHAPES = array( 'wide', 'tall' );

/**
 * Default field type when an instance names none.
 *
 * `glow` is FR-38-25 as originally signed, so an instance saved before the
 * field-type system existed renders exactly what it always did.
 */
const SGS_FX_CURSOR_FIELD_DEFAULT = 'glow';

/**
 * Resolve a colour token or literal to a CSS value.
 *
 * Accepts a theme palette SLUG (the normal case — the inspector's
 * DesignTokenPicker stores slugs, so a client's palette change follows
 * automatically) or a hex literal. Anything else returns an empty string and
 * the CSS default applies.
 *
 * A slug is mapped to `var(--wp--preset--color--<slug>)` rather than resolved
 * to a hex value here, so the token stays live: re-theming the site re-colours
 * every field with no re-render.
 *
 * @param string $value Stored colour value.
 * @return string A CSS colour value, or '' when unusable.
 */
function sgs_fx_cursor_field_colour( string $value ): string {
	$value = \trim( $value );
	if ( '' === $value ) {
		return '';
	}

	// Hex literal — 3, 4, 6 or 8 digits.
	if ( \preg_match( '/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/', $value ) ) {
		return $value;
	}

	// Palette slug. The character class is the filter: a slug that is not
	// [a-z0-9-] cannot be a WordPress preset slug, and refusing it here is what
	// stops an arbitrary string reaching a CSS custom-property value.
	if ( \preg_match( '/^[a-z0-9-]+$/', $value ) ) {
		return \sprintf( 'var(--wp--preset--color--%s)', $value );
	}

	return '';
}

/**
 * Mark cursor-field emitters and emit their per-instance overrides.
 *
 * @param string $block_content Rendered block HTML.
 * @return string Filtered HTML.
 */
function sgs_apply_fx_cursor_field( string $block_content ): string {
	// Cheap bail before constructing a tag processor for every block on the
	// page — this filter runs on ALL of them.
	if ( false === \strpos( $block_content, 'data-sgs-fx="cursor-field"' ) ) {
		return $block_content;
	}

	/*
	 * Skip a leading `<style>` before looking for the block root — the same
	 * guard `fx-path-routes.php:289` and `fx-shape-routes.php:291` use, via the
	 * shared helper in `fx-attributes.php`.
	 *
	 * NOT optional and NOT defensive padding: `sgs/container` (a qualifying
	 * block) prepends its own scoped `<style>` whenever the instance has any
	 * native WP supports styling set. Without the offset, `next_tag()` lands on
	 * that `<style>` element, `get_attribute('data-sgs-fx')` returns null, and
	 * this filter returns the content untouched — so the field never paints,
	 * while the p99 registry sniff (a raw regex over the whole string) still
	 * finds the attribute and ships the JS and CSS for nothing.
	 *
	 * This exact bug has shipped on this project before, which is why the
	 * helper exists at all. Caught here by a qc-council code-path trace before
	 * deploy, not after.
	 */
	$offset = sgs_fx_root_offset( $block_content );
	$head   = \substr( $block_content, 0, $offset );
	$rest   = \substr( $block_content, $offset );

	$processor = new \WP_HTML_Tag_Processor( $rest );
	if ( ! $processor->next_tag() ) {
		return $block_content;
	}

	if ( 'cursor-field' !== $processor->get_attribute( 'data-sgs-fx' ) ) {
		return $block_content;
	}

	$type = (string) $processor->get_attribute( 'data-sgs-fx-field' );
	if ( '' === $type ) {
		$type = SGS_FX_CURSOR_FIELD_DEFAULT;
	}

	// Skip-with-reason, never a silent coercion to the default: a typo'd or
	// stale field type is a defect to surface, and painting `glow` instead
	// would hide it behind something that looks deliberate.
	if ( ! \in_array( $type, SGS_FX_CURSOR_FIELD_TYPES, true ) ) {
		if ( \defined( 'WP_DEBUG' ) && \WP_DEBUG ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			\error_log(
				\sprintf(
					'SGS motion: skipped cursor field type "%s" — not a known field type.',
					$type
				)
			);
		}
		return $block_content;
	}

	$processor->set_attribute( 'data-sgs-cursor-field', $type );

	$colour = sgs_fx_cursor_field_colour(
		(string) $processor->get_attribute( 'data-sgs-fx-field-colour' )
	);
	$radius = (int) $processor->get_attribute( 'data-sgs-fx-field-radius' );

	$declarations = array();
	if ( '' !== $colour ) {
		$declarations[] = \sprintf( '--sgs-cursor-field-colour:%s', $colour );
	}
	// Bounded rather than trusted. A radius of 0 paints nothing and a huge one
	// floods the viewport, so both ends are clamped to a range that still
	// renders as a field. An unset attribute reads as 0 and simply emits
	// nothing, letting the stylesheet default stand.
	// SHAPE is passed through as a marked attribute rather than a declaration:
	// the stylesheet owns the geometry, so the render layer never hardcodes a
	// gradient. An unrecognised slug is dropped and the circle default stands.
	$shape = (string) $processor->get_attribute( 'data-sgs-fx-field-shape' );
	if ( \in_array( $shape, SGS_FX_CURSOR_FIELD_SHAPES, true ) ) {
		$processor->set_attribute( 'data-sgs-cursor-field-shape', $shape );
	}

	// DRAG WEIGHT is read by the emitter module, not by CSS — it eases the
	// published pointer position so the pool lags behind the cursor. Bounded to
	// 0-100 and dropped when absent, so JS falls back to its own default.
	// ⚠ Renamed from "trail" 2026-08-24: this is a lerp follower and produces
	// NO fading tail. It was named for an effect it does not have, which is the
	// same defect class as D767's dead "Field size" control. A real trail is
	// the particle engine's job.
	$trail = $processor->get_attribute( 'data-sgs-fx-field-trail' );
	if ( null !== $trail && '' !== $trail ) {
		$processor->set_attribute(
			'data-sgs-cursor-field-trail',
			(string) \max( 0, \min( 100, (int) $trail ) )
		);
	}

	// COLOUR BLEND (hue-shift only): how far the mesh's three hues depart from
	// the client's own colour. Replaces the hardcoded 65% base share deleted
	// 2026-08-24 — that was OUR rule, not the mesh technique's, and it was the
	// direct cause of "the teal is very faint".
	// ⚠ Read with an explicit null/'' test rather than an (int) cast, because
	// 0 is a MEANINGFUL value here (single hue) — unlike $radius, where 0 means
	// "unset, let the stylesheet default stand". Casting would make a client's
	// deliberate 0 indistinguishable from never having touched the control.
	$blend = $processor->get_attribute( 'data-sgs-fx-field-blend' );
	if ( null !== $blend && '' !== $blend && \is_numeric( $blend ) ) {
		$declarations[] = \sprintf(
			'--sgs-cursor-field-blend:%d',
			\max( 0, \min( 100, (int) $blend ) )
		);
	}

	if ( $radius > 0 ) {
		$declarations[] = \sprintf(
			'--sgs-cursor-field-radius:%dpx',
			\max( 40, \min( 1200, $radius ) )
		);
	}

	// `$head` is re-prepended on EVERY return path that rebuilds the markup —
	// the processor only ever saw `$rest`, so returning its output alone would
	// silently drop the block's own leading <style> and with it every native
	// supports declaration the style engine emitted.
	if ( empty( $declarations ) ) {
		return $head . $processor->get_updated_html();
	}

	// A per-instance id scopes the rule to THIS block. Derived from the
	// declarations themselves so two instances configured identically share one
	// rule rather than emitting a near-duplicate each.
	$uid = 'sgs-cf-' . \substr( \md5( \implode( ';', $declarations ) ), 0, 8 );

	$existing = (string) $processor->get_attribute( 'class' );
	$processor->set_attribute( 'class', \trim( $existing . ' ' . $uid ) );

	return \sprintf(
		'%1$s<style>.%2$s{%3$s}</style>%4$s',
		$head,
		$uid,
		\esc_html( \implode( ';', $declarations ) ),
		$processor->get_updated_html()
	);
}

\add_filter( 'render_block', __NAMESPACE__ . '\\sgs_apply_fx_cursor_field', 11, 1 );
