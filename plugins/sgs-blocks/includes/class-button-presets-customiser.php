<?php
/**
 * SGS Button Presets — WordPress Customiser panel (live preview).
 *
 * WHAT THIS CLOSES
 * ----------------
 * `sgs/button` paints its three presets (primary / secondary / outline) from six
 * `--sgs-btn-*` custom properties, which each `.sgs-button--{preset}` rule in
 * `src/blocks/button/style.css` reads from the per-client design tokens
 * `--wp--custom--button-presets--{preset}--{role}`. Those token VALUES lived only in
 * `theme.json` / `sites/<client>/theme-snapshot.json` — i.e. in a file a client can
 * never reach. A client could pick "primary" but could not change what "primary"
 * looks like. This panel exposes exactly those six roles × three presets, with live
 * preview (no reload).
 *
 * WHY THE CUSTOMISER WORKS HERE DESPITE THIS BEING A BLOCK THEME
 * -------------------------------------------------------------
 * WordPress hides the Appearance -> Customize link for block themes, but the gate is
 * conditional, not absolute (`wp-admin/menu.php`, WP 7.0.3):
 *
 *     if ( ! wp_is_block_theme() || has_action( 'customize_register' ) ) { ...add link... }
 *
 * Registering this panel adds a `customize_register` action, so the link returns and
 * `customize.php` renders our panel. Core only suppresses its OWN default sections
 * (and the widgets component) for block themes; third-party panels are untouched.
 *
 * WHERE THE VALUES ARE STORED, AND WHY
 * ------------------------------------
 * Storage = the `wp_global_styles` user layer (`settings.custom.buttonPresets`), the
 * SAME layer Site Editor edits land in and the SAME layer `push-theme-snapshot.py`
 * already writes (FR-26-D2) and already diffs (its `drift_warning()` reports both
 * ORPHANED and CLOBBERED keys before a push).
 *
 *   - REJECTED: `theme_mod`. It would work and be less code, but it is a THIRD
 *     direction the snapshot pipeline cannot see: `push-theme-snapshot.py` reads the
 *     disk `theme.json` and `wp_global_styles` only. A client's Customiser edit would
 *     survive in `theme_mods_sgs-theme` while the tokens around it were replaced, and
 *     no drift warning would ever fire. Silent divergence, invisible to the operator.
 *   - CHOSEN: `wp_global_styles`. The trade-off is honest and visible: a later
 *     `push-theme-snapshot.py` run CAN overwrite a client's Customiser edit — but it
 *     prints a `DRIFT WARNING (CLOBBERED)` naming the exact key and both values
 *     first, so the operator makes a go/no-go decision instead of losing the edit
 *     silently. Same-layer, same warning, same recovery as a Site Editor edit.
 *
 * SPEC 32 COMPLIANCE (FR-32-1 / FR-32-4 as amended 2026-07-18, D345)
 * -----------------------------------------------------------------
 * Nothing here emits an inline `style` attribute — not even a `--var` one.
 *   - Saved output: WordPress itself renders `settings.custom.*` as a `:root{...}`
 *     rule inside `<style id="global-styles-inline-css">`. A stylesheet rule, and not
 *     one this code writes.
 *   - Preview output: a single `<style id="sgs-button-presets-preview">` element
 *     holding one `:root{...}` rule, appended to the preview document's `<head>`.
 *     Also a stylesheet rule, and it exists ONLY inside the Customiser preview iframe
 *     (`customize_preview_init`), never on the public frontend.
 * The rendered `.sgs-button` element is never touched by either path.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Customiser;

defined( 'ABSPATH' ) || exit;

/**
 * The three presets, in the order a client thinks about them.
 *
 * Framework-neutral by construction: these are ROLES ("your main call to action"),
 * not client nouns. The wording reads the same for a restaurant, a wedding planner
 * and a law firm — no brand, sector or colour is named anywhere in this file.
 */
const PRESETS = array(
	'primary'   => array(
		'label'       => 'Main button',
		'description' => 'Your strongest call to action — "Book now", "Get a quote", "Order online". Use it once or twice per page so it keeps its impact.',
	),
	'secondary' => array(
		'label'       => 'Supporting button',
		'description' => 'The second-choice action next to a main button — "Learn more", "See the menu", "Meet the team".',
	),
	'outline'   => array(
		'label'       => 'Quiet button',
		'description' => 'The lightest option, for actions that should not compete for attention — "Back", "Download the brochure".',
	),
);

/**
 * The SIX token roles behind the six `--sgs-btn-*` custom properties the preset
 * classes set.
 *
 * The mapping is one-to-one and is the whole surface of this panel:
 *
 *   token role          -> custom property set by .sgs-button--{preset}
 *   ------------------------------------------------------------------
 *   text                -> --sgs-btn-color
 *   background          -> --sgs-btn-bg
 *   border              -> --sgs-btn-border
 *   hover-text          -> --sgs-btn-color-hover
 *   hover-background    -> --sgs-btn-bg-hover
 *   hover-border        -> --sgs-btn-border-hover
 *
 * (`hover-transform` is deliberately OUT of scope — it is motion, not colour, and
 * belongs to the Spec 38 motion doctrine rather than this panel.)
 */
const ROLES = array(
	'text'             => array(
		'label'       => 'Text colour',
		'description' => 'The colour of the words on the button.',
	),
	'background'       => array(
		'label'       => 'Background colour',
		'description' => 'The fill behind the words. Choose "Transparent" for an outline-only button.',
	),
	'border'           => array(
		'label'       => 'Border colour',
		'description' => 'The outline around the button. Match it to the background for a solid button.',
	),
	'hover-text'       => array(
		'label'       => 'Text colour when hovered',
		'description' => 'What the words change to when someone points at the button.',
	),
	'hover-background' => array(
		'label'       => 'Background colour when hovered',
		'description' => 'What the fill changes to when someone points at the button.',
	),
	'hover-border'     => array(
		'label'       => 'Border colour when hovered',
		'description' => 'What the outline changes to when someone points at the button.',
	),
);

/**
 * Build the Customiser setting id for one preset/role pair.
 *
 * @param string $preset Preset slug.
 * @param string $role   Role slug.
 * @return string Setting id.
 */
function setting_id( string $preset, string $role ): string {
	return 'sgs_button_preset__' . $preset . '__' . str_replace( '-', '_', $role );
}

/**
 * The CSS custom property WordPress generates for one preset/role pair.
 *
 * WordPress kebab-cases each `settings.custom` path segment when it builds the
 * `--wp--custom--*` variable, so `buttonPresets` becomes `button-presets`. The role
 * keys are already kebab-case, so they pass through unchanged.
 *
 * @param string $preset Preset slug.
 * @param string $role   Role slug.
 * @return string CSS custom property name, including the leading `--`.
 */
function css_var( string $preset, string $role ): string {
	return '--wp--custom--button-presets--' . $preset . '--' . $role;
}

/**
 * Sanitise a colour token value.
 *
 * Deliberately an ALLOWLIST, not a blocklist. The value is written into the
 * `wp_global_styles` post and echoed into a `:root{}` rule in the preview document,
 * so anything that could close a declaration or a `<style>` element must never
 * survive. Four shapes are permitted, which between them cover every value the
 * shipped `theme.json` presets already use:
 *
 *   - `var(--wp--preset--color--{slug})` — a theme palette token (the normal case)
 *   - `#rgb` / `#rrggbb` / `#rrggbbaa`   — a custom colour from the picker
 *   - `transparent`                       — used by the secondary + outline presets
 *   - `''` (empty)                        — "unset", falls back to the theme default
 *
 * @param mixed $value Raw incoming value.
 * @return string Sanitised value, or '' if the value is not a permitted shape.
 */
function sanitise_colour_token( $value ): string {
	if ( ! is_string( $value ) ) {
		return '';
	}

	$value = trim( $value );

	if ( '' === $value || 'transparent' === strtolower( $value ) ) {
		return '' === $value ? '' : 'transparent';
	}

	if ( preg_match( '/^var\(--wp--preset--color--[a-z0-9]+(?:-[a-z0-9]+)*\)$/', $value ) ) {
		return $value;
	}

	if ( preg_match( '/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/', $value ) ) {
		return strtolower( $value );
	}

	return '';
}

/**
 * Return the theme's colour palette as a flat slug => [name, colour] map.
 *
 * Sourced from the resolved global settings so it reflects the ACTIVE per-client
 * `theme-snapshot.json`, not a framework hardcode. Theme + custom origins only —
 * core's default palette is excluded because it is not part of the client's brand
 * and would bury the handful of tokens that are.
 *
 * @return array<string, array{name: string, color: string}>
 */
function palette(): array {
	$palette = \wp_get_global_settings( array( 'color', 'palette' ) );
	$out     = array();

	foreach ( array( 'theme', 'custom' ) as $origin ) {
		if ( empty( $palette[ $origin ] ) || ! is_array( $palette[ $origin ] ) ) {
			continue;
		}
		foreach ( $palette[ $origin ] as $entry ) {
			if ( empty( $entry['slug'] ) ) {
				continue;
			}
			$out[ $entry['slug'] ] = array(
				'name'  => isset( $entry['name'] ) ? (string) $entry['name'] : (string) $entry['slug'],
				'color' => isset( $entry['color'] ) ? (string) $entry['color'] : '',
			);
		}
	}

	return $out;
}

/**
 * Read the effective (theme + user) value for one preset/role pair.
 *
 * @param string $preset Preset slug.
 * @param string $role   Role slug.
 * @return string Current value, or '' when unset.
 */
function effective_value( string $preset, string $role ): string {
	$presets = \wp_get_global_settings( array( 'custom', 'buttonPresets' ) );

	if ( is_array( $presets ) && isset( $presets[ $preset ][ $role ] ) && is_string( $presets[ $preset ][ $role ] ) ) {
		return $presets[ $preset ][ $role ];
	}

	return '';
}

require_once __DIR__ . '/class-button-preset-setting.php';
require_once __DIR__ . '/class-button-preset-control.php';

/**
 * Register the panel, its three sections and its eighteen settings/controls.
 *
 * @param \WP_Customize_Manager $wp_customize Customiser manager.
 * @return void
 */
function register( \WP_Customize_Manager $wp_customize ): void {
	$wp_customize->register_control_type( __NAMESPACE__ . '\\Button_Preset_Control' );

	$wp_customize->add_panel(
		'sgs_button_presets',
		array(
			'title'       => __( 'Button styles', 'sgs-blocks' ),
			'description' => __( 'Change how each kind of button looks across the whole site. Every button using a style updates at once — you never have to edit them one by one. Changes preview instantly here and only go live when you press Publish.', 'sgs-blocks' ),
			'priority'    => 40,
			'capability'  => 'edit_theme_options',
		)
	);

	foreach ( PRESETS as $preset => $preset_meta ) {
		$section_id = 'sgs_button_preset_' . $preset;

		$wp_customize->add_section(
			$section_id,
			array(
				'title'       => $preset_meta['label'],
				'description' => $preset_meta['description'],
				'panel'       => 'sgs_button_presets',
				'capability'  => 'edit_theme_options',
			)
		);

		foreach ( ROLES as $role => $role_meta ) {
			$id = setting_id( $preset, $role );

			$wp_customize->add_setting(
				new Button_Preset_Setting(
					$wp_customize,
					$id,
					array(
						'preset'            => $preset,
						'role'              => $role,
						'transport'         => 'postMessage',
						'capability'        => 'edit_theme_options',
						'sanitize_callback' => __NAMESPACE__ . '\\sanitise_colour_token',
					)
				)
			);

			$wp_customize->add_control(
				new Button_Preset_Control(
					$wp_customize,
					$id,
					array(
						'section'     => $section_id,
						'label'       => $role_meta['label'],
						'description' => $role_meta['description'],
						'settings'    => $id,
					)
				)
			);
		}
	}
}
add_action( 'customize_register', __NAMESPACE__ . '\\register' );

/**
 * Enqueue the controls-side script (wires the swatch picker to the setting).
 *
 * @return void
 */
function enqueue_controls(): void {
	\wp_enqueue_script(
		'sgs-button-presets-customiser-controls',
		SGS_BLOCKS_URL . 'assets/js/customiser-button-presets-controls.js',
		array( 'customize-controls', 'jquery' ),
		SGS_BLOCKS_VERSION,
		true
	);

	\wp_enqueue_style(
		'sgs-button-presets-customiser',
		SGS_BLOCKS_URL . 'assets/admin/customiser-button-presets.css',
		array(),
		SGS_BLOCKS_VERSION
	);
}
add_action( 'customize_controls_enqueue_scripts', __NAMESPACE__ . '\\enqueue_controls' );

/**
 * Enqueue the preview-side script and hand it the setting -> CSS-variable map.
 *
 * Runs only inside the Customiser preview iframe.
 *
 * @return void
 */
function enqueue_preview(): void {
	\wp_enqueue_script(
		'sgs-button-presets-customiser-preview',
		SGS_BLOCKS_URL . 'assets/js/customiser-button-presets-preview.js',
		array( 'customize-preview' ),
		SGS_BLOCKS_VERSION,
		true
	);

	$map = array();
	foreach ( PRESETS as $preset => $unused_preset_meta ) {
		foreach ( ROLES as $role => $unused_role_meta ) {
			$map[ setting_id( $preset, $role ) ] = css_var( $preset, $role );
		}
	}

	\wp_add_inline_script(
		'sgs-button-presets-customiser-preview',
		'window.sgsButtonPresetVars = ' . \wp_json_encode( $map ) . ';',
		'before'
	);
}
add_action( 'customize_preview_init', __NAMESPACE__ . '\\enqueue_preview' );
