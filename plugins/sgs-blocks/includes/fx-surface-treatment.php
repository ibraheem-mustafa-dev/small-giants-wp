<?php
/**
 * Surface-treatment (Tier W / WebGL) render layer — Spec 38 Tier W, D479.
 *
 * WHAT THIS CLOSES
 * The Tier W boot module (`src/shared/effects/fx-surface-treatment.js`) reads
 * `el.dataset.sgsFxTreatment` to choose which WebGL preset to draw over a
 * `<img>`, and reads `--sgs-fx-tint` (grain), `--sgs-fx-ink` (halftone), or
 * `--sgs-fx-shadow` / `--sgs-fx-highlight` (duotone) plus
 * `data-sgs-fx-treatment-*` scalar overrides for the float uniforms. None of
 * that can come from the editor's stored attributes without a render layer:
 *
 *   client picks a treatment + palette colour(s) ->  fxTreatment="duotone" etc.
 *   THIS FILE turns that into                    ->  data-sgs-fx="surface-treatment"
 *                                                     + data-sgs-fx-treatment="duotone"
 *                                                     + a uid-scoped <style> setting
 *                                                       --sgs-fx-tint / --sgs-fx-ink /
 *                                                       --sgs-fx-shadow / --sgs-fx-highlight
 *                                                     + data-sgs-fx-treatment-intensity
 *   the JS boot module then reads                 ->  exactly what it already expects
 *
 * Every treatment carries colour control (owner request: halftone's black
 * diagonal pattern needed one too, and every finish should default to the
 * site palette while staying changeable through the framework's own colour
 * controls). All four colours are OPTIONAL: when the client leaves one
 * unset, the corresponding custom property is never emitted, and the boot
 * module's own `paletteFallback`/`paletteTransform` resolution
 * (`src/shared/effects/surface-treatments/presets.js`) supplies the default
 * straight from the site palette.
 *
 * TWO REASONS IT IS A RENDER LAYER RATHER THAN INLINE STYLE.
 *
 * 1. Spec 32: an SGS block never renders an inline `style` property
 *    declaration, and `audit-inline-styling.js` fails the build on one. A
 *    per-instance uid-scoped `<style>` rule is the house pattern (D292-D296),
 *    mirroring `fx-cursor-field.php`.
 * 2. `fx` is an EXTENSION attribute, present on any qualifying block, so there
 *    is no single block's render.php to put this in. One filter covers every
 *    block that can carry the effect.
 *
 * NO BESPOKE SNIFF NEEDED. `surface-treatment` is a real `fx_effects` DB row,
 * so it rides the standard enqueue path: `SGS_Motion_Registry::extract_effects()`
 * already finds `data-sgs-fx="surface-treatment"` in the rendered markup and
 * `enqueue_effect()` maps it to module id `@sgs/fx-surface-treatment`. This
 * file's only job is to stamp the data attributes and uniform overrides onto
 * the block's root element — it does not need its own registry entry point.
 *
 * PRIORITY 11 — same slot as `fx-cursor-field.php` / `fx-path-routes.php` /
 * `fx-shape-routes.php` (sibling p11 expanders): AFTER `fx-attributes.php`
 * (p10) has injected the fx data attributes onto DYNAMIC blocks — static
 * blocks already carry them from save time — and BEFORE `SGS_Motion_Registry`'s
 * p99 sniff, which decides whether the module and stylesheet are enqueued at
 * all. This ordering is invisible without a comment: if this filter ran at or
 * after p99, the attribute the registry looks for would not exist yet on a
 * dynamic block, and the effect would be configured, enqueued nowhere, and
 * silently dead.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

if ( ! \defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Surface treatments this render layer will honour.
 *
 * A CLOSED list, deliberately. An unrecognised value is skipped with a reason
 * rather than passed through (Spec 38 §11.3 / Rule 4) — passing it through
 * would put an attribute in the markup that no WebGL preset matches,
 * producing an effect that is configured, enqueued, and invisible.
 *
 * Keep in step with the preset roster in
 * `src/shared/effects/surface-treatments/`.
 *
 * @var string[]
 */
const SGS_FX_TREATMENTS = array( 'grain', 'halftone', 'duotone' );

/**
 * Default treatment when an instance names none.
 */
const SGS_FX_TREATMENT_DEFAULT = 'grain';

/**
 * Mark surface-treatment emitters and emit their per-instance overrides.
 *
 * @param string $block_content Rendered block HTML.
 * @return string Filtered HTML.
 */
function sgs_apply_fx_surface_treatment( string $block_content ): string {
	// Cheap bail before constructing a tag processor for every block on the
	// page — this filter runs on ALL of them.
	if ( false === \strpos( $block_content, 'data-sgs-fx="surface-treatment"' ) ) {
		return $block_content;
	}

	// Editor parity: never stamp during a ServerSideRender/REST render — the
	// block-renderer REST route has no wp_footer and no module graph to boot
	// the WebGL canvas against, so stamping there would leave a dead
	// attribute in the editor preview markup for no benefit. Reuses the
	// css-registry predicate verbatim, the same guard
	// `class-sgs-motion-registry.php::sniff_block()` uses before enqueueing.
	if ( \function_exists( __NAMESPACE__ . '\\sgs_is_frontend_render' )
		&& ! sgs_is_frontend_render() ) {
		return $block_content;
	}

	/*
	 * Skip a leading `<style>` before looking for the block root — the same
	 * guard `fx-cursor-field.php:138`, `fx-path-routes.php:289` and
	 * `fx-shape-routes.php:291` use, via the shared helper in
	 * `fx-attributes.php`.
	 *
	 * NOT optional and NOT defensive padding: `sgs/container` (a qualifying
	 * block) prepends its own scoped `<style>` whenever the instance has any
	 * native WP supports styling set. Without the offset, `next_tag()` lands
	 * on that `<style>` element, `get_attribute('data-sgs-fx')` returns null,
	 * and this filter returns the content untouched — so the treatment never
	 * paints, while the p99 registry sniff (a raw regex over the whole
	 * string) still finds the attribute and ships the JS and CSS for nothing.
	 */
	$offset = sgs_fx_root_offset( $block_content );
	$head   = \substr( $block_content, 0, $offset );
	$rest   = \substr( $block_content, $offset );

	$processor = new \WP_HTML_Tag_Processor( $rest );
	if ( ! $processor->next_tag() ) {
		return $block_content;
	}

	if ( 'surface-treatment' !== $processor->get_attribute( 'data-sgs-fx' ) ) {
		return $block_content;
	}

	$treatment = (string) $processor->get_attribute( 'data-sgs-fx-treatment' );
	if ( '' === $treatment ) {
		$treatment = SGS_FX_TREATMENT_DEFAULT;
	}

	// Skip-with-reason, never a silent coercion to the default: a typo'd or
	// stale treatment id is a defect to surface, and painting `grain` instead
	// would hide it behind something that looks deliberate.
	if ( ! \in_array( $treatment, SGS_FX_TREATMENTS, true ) ) {
		if ( \defined( 'WP_DEBUG' ) && \WP_DEBUG ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			\error_log(
				\sprintf(
					'SGS motion: skipped surface treatment "%s" — not a known treatment.',
					$treatment
				)
			);
		}
		return $block_content;
	}

	$processor->set_attribute( 'data-sgs-fx-treatment', $treatment );

	// Site-wide colour source (D-treatment-palette-base). Read directly off
	// the raw option rather than through `SGS_Motion_Registry::settings()` —
	// that method's return array is a fixed whitelist of keys and does not
	// carry this one (out of scope for this change; see
	// `class-sgs-motion-settings.php`). Re-validated here with the same
	// `[a-z0-9-]+` slug rule `Sgs_Motion_Settings::sanitise()` applies at
	// save time, so a hand-edited option can never reach a CSS custom-
	// property name unchecked.
	//
	// The JS boot module already defaults every uniform to the `primary`
	// palette slug when no override reaches it (`paletteFallback` in
	// `src/shared/effects/surface-treatments/presets.js`), so stamping
	// `primary` here would be a no-op attribute on every treated block in the
	// DOM. Only a genuinely non-default source is worth publishing — same
	// "don't emit a default" discipline this file already applies to
	// `--sgs-fx-tint`/`--sgs-fx-ink`/`--sgs-fx-shadow`/`--sgs-fx-highlight`
	// above.
	// ONE read path. This deliberately goes through the registry rather than
	// reading the raw option: `SGS_Motion_Registry::settings()` returns a
	// hard-coded whitelist and applies the same slug validation, so reading
	// around it would leave two places that decide what this setting means —
	// exactly the divergence that produces a setting which saves fine and then
	// silently does nothing. (The first implementation of this feature DID
	// bypass the registry, because the key was missing from that whitelist;
	// the key was added there instead.)
	$treatment_palette_base = SGS_Motion_Registry::settings()['treatment_palette_base'] ?? 'primary';

	if ( 'primary' !== $treatment_palette_base ) {
		$processor->set_attribute( 'data-sgs-fx-treatment-palette', $treatment_palette_base );
	}

	$declarations = array();

	// Per-treatment palette overrides. Resolved via `sgs_fx_cursor_field_colour()`
	// (`includes/fx-cursor-field.php`) rather than a new resolver — it already
	// accepts a theme palette SLUG (mapped to `var(--wp--preset--color--<slug>)`
	// so re-theming follows with no re-render) or a hex literal, and rejects
	// anything else. Reused as-is; not duplicated.
	//
	// A colour is published ONLY when the client actually set one — an unset
	// value is deliberately left unpublished so the runtime's own
	// palette-derived default (`paletteFallback`/`paletteTransform` in
	// `presets.js`) resolves it instead. Emitting a default here would freeze
	// the finish against future re-theming, which is exactly what the
	// resolution-order contract this file's own docblock names is built to
	// avoid.
	if ( 'grain' === $treatment ) {
		$tint = sgs_fx_cursor_field_colour(
			(string) $processor->get_attribute( 'data-sgs-fx-treatment-tint' )
		);
		if ( '' !== $tint ) {
			$declarations[] = \sprintf( '--sgs-fx-tint:%s', $tint );
		}
	}

	if ( 'halftone' === $treatment ) {
		$ink = sgs_fx_cursor_field_colour(
			(string) $processor->get_attribute( 'data-sgs-fx-treatment-ink' )
		);
		if ( '' !== $ink ) {
			$declarations[] = \sprintf( '--sgs-fx-ink:%s', $ink );
		}
	}

	if ( 'duotone' === $treatment ) {
		$shadow = sgs_fx_cursor_field_colour(
			(string) $processor->get_attribute( 'data-sgs-fx-treatment-shadow' )
		);
		if ( '' !== $shadow ) {
			$declarations[] = \sprintf( '--sgs-fx-shadow:%s', $shadow );
		}

		$highlight = sgs_fx_cursor_field_colour(
			(string) $processor->get_attribute( 'data-sgs-fx-treatment-highlight' )
		);
		if ( '' !== $highlight ) {
			$declarations[] = \sprintf( '--sgs-fx-highlight:%s', $highlight );
		}
	}

	// Optional float override, published as a data attribute (a scalar
	// uniform override, not a paint property, so it does not belong in the
	// custom-property declaration block above). Bounded rather than trusted:
	// zero or negative reads as "unset" and the runtime's own default stands.
	$intensity_raw = $processor->get_attribute( 'data-sgs-fx-treatment-intensity' );
	if ( null !== $intensity_raw && '' !== $intensity_raw ) {
		$intensity = (float) $intensity_raw;
		if ( $intensity > 0 ) {
			$processor->set_attribute(
				'data-sgs-fx-treatment-intensity',
				(string) \max( 0.0, \min( 1.0, $intensity ) )
			);
		} else {
			$processor->remove_attribute( 'data-sgs-fx-treatment-intensity' );
		}
	}

	// Reveal-on-scroll (D-reveal, FR-38-29 extension). Closed set — same
	// skip-with-reason discipline as `$treatment` above, not a coercion.
	// The default ('' — attribute simply absent, since `fx-attributes.php`
	// never injects an empty value) means reveal-ON: the treatment develops
	// in as the element scrolls into view. 'off' is the only other legal
	// value, and it IS stamped, because its ABSENCE is exactly what the boot
	// module (`src/shared/effects/fx-surface-treatment.js`) reads as "on" —
	// see this file's class doc. An unrecognised value is dropped rather than
	// passed through, so a typo never silently disables the reveal.
	$reveal = (string) $processor->get_attribute( 'data-sgs-fx-treatment-reveal' );
	if ( 'off' === $reveal ) {
		$processor->set_attribute( 'data-sgs-fx-treatment-reveal', 'off' );
	} else {
		if ( '' !== $reveal && \defined( 'WP_DEBUG' ) && \WP_DEBUG ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			\error_log(
				\sprintf(
					'SGS motion: skipped surface treatment reveal value "%s" — not a known value.',
					$reveal
				)
			);
		}
		$processor->remove_attribute( 'data-sgs-fx-treatment-reveal' );
	}

	// `$head` is re-prepended on EVERY return path that rebuilds the markup —
	// the processor only ever saw `$rest`, so returning its output alone
	// would silently drop the block's own leading <style> and with it every
	// native supports declaration the style engine emitted.
	if ( empty( $declarations ) ) {
		return $head . $processor->get_updated_html();
	}

	// A per-instance id scopes the rule to THIS block. Derived from the
	// declarations themselves so two instances configured identically share
	// one rule rather than emitting a near-duplicate each.
	$uid = 'sgs-st-' . \substr( \md5( \implode( ';', $declarations ) ), 0, 8 );

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

\add_filter( 'render_block', __NAMESPACE__ . '\\sgs_apply_fx_surface_treatment', 11, 1 );
