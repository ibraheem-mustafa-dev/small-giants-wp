<?php
/**
 * Button preset names: which names a button, a product card, a buy box and a form can carry, and the CSS a name needs.
 *
 * A site's button presets are the keys of its snapshot's `settings.custom.buttonPresets` (Spec 32 FR-32-2). The framework
 * ships three starter names (primary, secondary, outline) whose rules live in `src/blocks/button/style.css`; every renderer
 * asks this file for the names instead of keeping a list of its own (`scripts/check-button-preset-names.py`).
 *
 * The switch: a site opts in to names beyond the starters by setting `settings.custom.namedButtonPresets` to `true` in its
 * snapshot (the theme extractor writes it whenever a draft's button component names a version beyond the starters). With the
 * switch off, the starters are the only names and nothing here prints: every page renders as it did before. With it on:
 *   - every snapshot key other than `default`, `link` and `custom` is a name a block accepts;
 *   - a name beyond the starters gets its rule printed from the snapshot's keys (`sgs_button_named_preset_css`);
 *   - a preset's resting and hover `shadow` tokens paint on the button, for the starters too.
 *
 * A name is stored as written in the snapshot and resolved to a slug the way WordPress names the custom property
 * (`_wp_to_kebab_case`: `Gold` and `gold` both print `--wp--custom--button-presets--gold--*`).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-global-settings.php';
require_once __DIR__ . '/helpers-shadow-hover.php';
require_once __DIR__ . '/helpers-hover-state.php';

/** The framework's starter preset names: the rules `src/blocks/button/style.css` ships. The one list of them in PHP. */
const SGS_BUTTON_STARTER_PRESETS = array( 'primary', 'secondary', 'outline' );

/** Keys of `buttonPresets` (or values of a style setting) that are not preset names: the site-wide look and the block's own styles. */
const SGS_BUTTON_RESERVED_STYLES = array( 'default', 'link', 'custom' );

if ( ! function_exists( 'sgs_button_presets_open' ) ) {
	/**
	 * Whether the site opted in to preset names beyond the starters (`settings.custom.namedButtonPresets` is `true`).
	 *
	 * @return bool
	 */
	function sgs_button_presets_open(): bool {
		return true === sgs_global_custom_setting( 'namedButtonPresets' );
	}
}

if ( ! function_exists( 'sgs_button_preset_slug' ) ) {
	/**
	 * A preset key as WordPress prints it in a custom property name and as a class modifier.
	 *
	 * @param string $name A snapshot key or a stored style value.
	 * @return string The slug; '' when nothing usable is left.
	 */
	function sgs_button_preset_slug( string $name ): string {
		$name = trim( $name );
		$slug = function_exists( '_wp_to_kebab_case' ) ? (string) _wp_to_kebab_case( $name ) : strtolower( (string) preg_replace( '/([a-z0-9])([A-Z])/', '$1-$2', $name ) );
		$slug = strtolower( (string) preg_replace( '/[^a-z0-9]+/i', '-', $slug ) );
		return trim( $slug, '-' );
	}
}

if ( ! function_exists( 'sgs_button_snapshot_presets' ) ) {
	/**
	 * The snapshot's presets by slug, each a role => value map; the starters' names when the switch is off.
	 *
	 * @return array<string, array<string, mixed>> Slug => roles (empty when the site holds none or the switch is off).
	 */
	function sgs_button_snapshot_presets(): array {
		if ( ! sgs_button_presets_open() ) {
			return array();
		}
		$all = sgs_global_custom_setting( 'buttonPresets' );
		if ( ! is_array( $all ) ) {
			return array();
		}
		$out = array();
		foreach ( $all as $key => $roles ) {
			$slug = sgs_button_preset_slug( (string) $key );
			if ( '' !== $slug && ! in_array( $slug, SGS_BUTTON_RESERVED_STYLES, true ) && is_array( $roles ) ) {
				$out[ $slug ] = $roles;
			}
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_button_preset_names' ) ) {
	/**
	 * Every preset name a block accepts: the starters, then (switch on) the snapshot's other names, as slugs.
	 *
	 * @return string[]
	 */
	function sgs_button_preset_names(): array {
		return array_values( array_unique( array_merge( SGS_BUTTON_STARTER_PRESETS, array_keys( sgs_button_snapshot_presets() ) ) ) );
	}
}

if ( ! function_exists( 'sgs_button_preset_resolve' ) ) {
	/**
	 * A stored style value as the preset slug it names, or '' when no preset has that name.
	 *
	 * @param string $name Stored value (`inheritStyle`, `ctaStyle`, `addToCartStyle`, `submitStyle`).
	 * @return string
	 */
	function sgs_button_preset_resolve( string $name ): string {
		if ( in_array( $name, SGS_BUTTON_STARTER_PRESETS, true ) ) {
			return $name;
		}
		$slug = sgs_button_preset_slug( $name );
		return '' !== $slug && in_array( $slug, sgs_button_preset_names(), true ) ? $slug : '';
	}
}

if ( ! function_exists( 'sgs_button_preset_has_role' ) ) {
	/**
	 * Whether the snapshot's preset (by slug) sets one role to a non-empty string.
	 *
	 * @param string $slug Preset slug.
	 * @param string $role Role key (`shadow`, `hover-shadow`, ...).
	 * @return bool
	 */
	function sgs_button_preset_has_role( string $slug, string $role ): bool {
		$value = sgs_button_snapshot_presets()[ $slug ][ $role ] ?? null;
		return is_string( $value ) && '' !== trim( $value );
	}
}

if ( ! function_exists( 'sgs_button_preset_sets' ) ) {
	/**
	 * Whether the site's `buttonPresets` sets one role of one preset to a non-empty string, whether or not the site opted in
	 * to named presets (the starters' tokens come from the framework or the client snapshot alike). The built-in button kit
	 * prints a preset's padding, font size and the like only where the token exists, so a button keeps its own value when the
	 * preset leaves one unset. `sgs_button_preset_has_role()` is the stricter reading the WooCommerce callers use.
	 *
	 * @param string $slug Preset slug.
	 * @param string $role Role key (`padding`, `font-size`, `min-height`, `shadow`, ...).
	 * @return bool
	 */
	function sgs_button_preset_sets( string $slug, string $role ): bool {
		$all = sgs_global_custom_setting( 'buttonPresets' );
		foreach ( is_array( $all ) ? $all : array() as $key => $roles ) {
			if ( sgs_button_preset_slug( (string) $key ) === $slug && is_array( $roles ) ) {
				$value = $roles[ $role ] ?? null;
				return is_string( $value ) && '' !== trim( $value );
			}
		}
		return false;
	}
}

if ( ! function_exists( 'sgs_button_named_preset_css' ) ) {
	/**
	 * The CSS an opted-in site needs for its presets: a rule per name beyond the starters (the starters' own rules are in
	 * `src/blocks/button/style.css`), and each preset's shadow tokens as resting and hover shadows. '' when the switch is off.
	 *
	 * A rule reads the same tokens and falls back the way a starter's does; a name beyond the starters falls back to the
	 * primary look for a token the snapshot leaves out. Doubling the class (`.sgs-button.sgs-button--gold`) keeps the rule
	 * ahead of the base `.sgs-button` rule wherever the two stylesheets sit, while a button's own scoped rule (printed after
	 * it, same specificity) still wins.
	 *
	 * @return string
	 */
	function sgs_button_named_preset_css(): string {
		$presets = sgs_button_snapshot_presets();
		if ( array() === $presets ) {
			return '';
		}
		$css = '';
		foreach ( array_keys( $presets ) as $slug ) {
			$v = '--wp--custom--button-presets--' . $slug . '--';
			$d = '--wp--custom--button-presets--default--';
			if ( ! in_array( $slug, SGS_BUTTON_STARTER_PRESETS, true ) ) {
				$css .= '.sgs-button.sgs-button--' . $slug . '{'
					. 'border-width:var(' . $v . 'border-width,2px);border-style:solid;'
					. 'border-radius:var(' . $v . 'border-radius,10px);'
					. 'font-weight:var(' . $v . 'font-weight,var(--sgs-mb-btn-font-weight-default,600));'
					. 'font-size:var(' . $v . 'font-size,var(--sgs-mb-btn-font-size-default,15px));'
					. 'letter-spacing:var(' . $v . 'letter-spacing,);text-transform:var(' . $v . 'text-transform,);'
					. 'padding:var(' . $v . 'padding,14px 24px);min-height:var(' . $v . 'min-height,48px);'
					. '--sgs-btn-color:var(' . $v . 'text,var(--wp--preset--color--text-inverse));'
					. '--sgs-btn-bg:var(' . $v . 'background,var(--wp--preset--color--primary));'
					. '--sgs-btn-border:var(' . $v . 'border,var(--wp--preset--color--primary));'
					. '--sgs-btn-color-hover:var(' . $v . 'hover-text,var(--wp--preset--color--text-inverse));'
					. '--sgs-btn-bg-hover:var(' . $v . 'hover-background,var(--wp--preset--color--text));'
					. '--sgs-btn-border-hover:var(' . $v . 'hover-border,var(--wp--preset--color--text));'
					. '--sgs-btn-lift-hover:var(' . $v . 'hover-lift,var(' . $d . 'hover-lift,));'
					. '--sgs-btn-scale-hover:var(' . $v . 'hover-scale,var(' . $d . 'hover-scale,));'
					. '--sgs-btn-rotate-hover:var(' . $v . 'hover-rotate,var(' . $d . 'hover-rotate,));'
					. '--sgs-btn-transition-duration:var(' . $v . 'hover-transition,var(' . $d . 'hover-transition,0.18s));'
					. '--sgs-btn-transition-easing:var(' . $v . 'hover-easing,var(' . $d . 'hover-easing,var(--wp--custom--easing--ease,ease)));'
					. '--sgs-btn-transition-easing-colour:var(' . $v . 'hover-easing-colour,var(' . $d . 'hover-easing-colour,var(--sgs-btn-transition-easing)));'
					. '--sgs-btn-transition-easing-shadow:var(' . $v . 'hover-easing-shadow,var(' . $d . 'hover-easing-shadow,var(--sgs-btn-transition-easing)));'
					. '}';
			}
			if ( sgs_button_preset_has_role( $slug, 'shadow' ) ) {
				// sgs-shadow-fallback: the token is only read where the snapshot sets it, so no fallback shadow exists to print.
				$rest = sgs_focus_under_decls( array( 'box-shadow:var(' . $v . 'shadow)' ) );
				$css .= '.sgs-button.sgs-button--' . $slug . '{' . implode( ';', $rest ) . ';}';
			}
			if ( sgs_button_preset_has_role( $slug, 'hover-shadow' ) ) {
				$fallback = sgs_button_preset_has_role( $slug, 'shadow' ) ? 'var(' . $v . 'shadow)' : 'none';
				// sgs-shadow-fallback: the hover token is only read where the snapshot sets it; the resting shadow is its fallback.
				$hover = sgs_focus_under_decls( array( 'box-shadow:var(' . $v . 'hover-shadow,' . $fallback . ')' ) );
				$css  .= sgs_hover_guarded_rule( '.sgs-button.sgs-button--' . $slug . ':hover', implode( ';', $hover ) . ';' );
			}
		}
		return $css;
	}
}

if ( ! function_exists( 'sgs_buybox_named_preset_css' ) ) {
	/**
	 * The buy box's add-to-cart rules for each preset name beyond the starters (`.buybox__add-to-cart--{name}`), shaped like
	 * the starters' rules in `src/blocks/buybox/style.css`. '' when the switch is off or the site names none.
	 *
	 * @return string
	 */
	function sgs_buybox_named_preset_css(): string {
		$css = '';
		foreach ( array_keys( sgs_button_snapshot_presets() ) as $slug ) {
			if ( in_array( $slug, SGS_BUTTON_STARTER_PRESETS, true ) ) {
				continue;
			}
			$v    = '--wp--custom--button-presets--' . $slug . '--';
			$d    = '--wp--custom--button-presets--default--';
			$sel  = '.sgs-buybox .buybox__add-to-cart--' . $slug;
			$css .= $sel . '{'
				. '--sgs-btn-transition-duration:var(' . $v . 'hover-transition,var(' . $d . 'hover-transition,200ms));'
				. '--sgs-btn-transition-easing:var(' . $v . 'hover-easing,var(' . $d . 'hover-easing,var(--wp--custom--easing--ease,ease)));'
				. '--sgs-btn-transition-easing-colour:var(' . $v . 'hover-easing-colour,var(' . $d . 'hover-easing-colour,var(--sgs-btn-transition-easing)));'
				. '--sgs-btn-transition-easing-shadow:var(' . $v . 'hover-easing-shadow,var(' . $d . 'hover-easing-shadow,var(--sgs-btn-transition-easing)));'
				. 'border:var(' . $v . 'border-width,2px) solid var(' . $v . 'border,var(--wp--preset--color--primary));'
				. 'border-radius:var(' . $v . 'border-radius,8px);'
				. 'background:var(' . $v . 'background,var(--wp--preset--color--primary));'
				. 'color:var(' . $v . 'text,var(--wp--preset--color--text-inverse,#fff));'
				. '}'
				. sgs_hover_guarded_rule(
					$sel . ':hover:not([disabled])',
					'background:var(' . $v . 'hover-background,var(--wp--preset--color--text));'
					. 'border-color:var(' . $v . 'hover-border,var(--wp--preset--color--text));'
					. 'color:var(' . $v . 'hover-text,var(--wp--preset--color--text-inverse,#fff));'
				);
		}
		return $css;
	}
}

if ( ! function_exists( 'sgs_button_named_presets_print' ) ) {
	/**
	 * Print the opted-in site's preset CSS as one inline stylesheet, on the page and in the editor canvas
	 * (`enqueue_block_assets` runs in both). Prints nothing when the switch is off.
	 *
	 * @return void
	 */
	function sgs_button_named_presets_print(): void {
		$css = sgs_button_named_preset_css() . sgs_buybox_named_preset_css();
		if ( '' === $css ) {
			return;
		}
		wp_register_style( 'sgs-button-named-presets', false, array(), SGS_BLOCKS_VERSION );
		wp_enqueue_style( 'sgs-button-named-presets' );
		wp_add_inline_style( 'sgs-button-named-presets', $css );
	}
	add_action( 'enqueue_block_assets', 'sgs_button_named_presets_print', 20 );
}

if ( ! function_exists( 'sgs_button_preset_names_editor_data' ) ) {
	/**
	 * Publish the preset names beyond the starters to the editor as `window.sgsButtonPresetNames`
	 * (`src/blocks/button/preset-names.js`). Prints nothing when the switch is off or the site names none.
	 *
	 * @return void
	 */
	function sgs_button_preset_names_editor_data(): void {
		$extra = array_values( array_diff( sgs_button_preset_names(), SGS_BUTTON_STARTER_PRESETS ) );
		if ( array() === $extra ) {
			return;
		}
		wp_add_inline_script( 'wp-blocks', 'window.sgsButtonPresetNames=' . wp_json_encode( $extra ) . ';', 'before' );
	}
	add_action( 'enqueue_block_editor_assets', 'sgs_button_preset_names_editor_data', 5 );
}
