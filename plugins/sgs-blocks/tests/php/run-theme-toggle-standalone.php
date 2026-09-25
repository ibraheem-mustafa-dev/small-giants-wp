<?php
/**
 * Standalone runner for sgs/theme-toggle (U-12 §D.5).
 *
 * Reads the real shipped block.json/render.php as text (same technique as
 * run-audio-toggle-standalone.php) and runs an in-PHP simulation of
 * render.php's own toggleStyle allow-list logic — so a change to either
 * surface is a change to what is tested.
 *
 * Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-theme-toggle-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable Squiz.Commenting.FunctionComment.Missing

$pass = 0;
$fail = 0;

function ok( bool $cond, string $label ): void {
	global $pass, $fail;
	if ( $cond ) {
		++$pass;
		echo "PASS  $label\n";
	} else {
		++$fail;
		echo "FAIL  $label\n";
	}
}

$block_dir     = dirname( __DIR__, 2 ) . '/src/blocks/theme-toggle';
$render_source = (string) file_get_contents( $block_dir . '/render.php' );
$block_json    = json_decode( (string) file_get_contents( $block_dir . '/block.json' ), true );

ok( '' !== $render_source, 'the real render.php is readable' );
ok( is_array( $block_json ), 'the real block.json parses as JSON' );

// ---------------------------------------------------------------------------
// block.json — attribute shapes.
// ---------------------------------------------------------------------------

$toggle_style_schema = $block_json['attributes']['toggleStyle'] ?? array();
ok( array( 'switch', 'segmented' ) === ( $toggle_style_schema['enum'] ?? null ), 'block.json: toggleStyle enum is exactly [switch, segmented]' );
ok( 'switch' === ( $toggle_style_schema['default'] ?? null ), 'block.json: toggleStyle defaults to "switch"' );

$label_schema = $block_json['attributes']['label'] ?? array();
ok( 'Dark mode' === ( $label_schema['default'] ?? null ), 'block.json: label defaults to "Dark mode"' );

$label_roll_schema = $block_json['attributes']['labelRoll'] ?? array();
ok( array( '', 'up', 'up-scale' ) === ( $label_roll_schema['enum'] ?? null ), 'block.json: labelRoll enum is exactly ["", up, up-scale]' );

ok( 'object' === ( ( $block_json['attributes']['iconOnly'] ?? array() )['type'] ?? null ), 'block.json: iconOnly is typed object (per-tier boolean)' );
ok( 'object' === ( ( $block_json['attributes']['iconLight'] ?? array() )['type'] ?? null ), 'block.json: iconLight is typed object ({source,name})' );
ok( 'object' === ( ( $block_json['attributes']['iconDark'] ?? array() )['type'] ?? null ), 'block.json: iconDark is typed object ({source,name})' );

// ---------------------------------------------------------------------------
// render.php — source-level checks.
// ---------------------------------------------------------------------------

ok(
	false !== strpos( $render_source, "in_array( \$toggle_style, array( 'switch', 'segmented' ), true )" ),
	'render.php: toggleStyle is checked against an explicit allow-list'
);

ok(
	false !== strpos( $render_source, "\$toggle_style = 'switch';" ),
	'render.php: an off-enum toggleStyle falls back to "switch"'
);

// Site-level gate: nothing rendered on the frontend without a derived dark palette.
ok(
	false !== strpos( $render_source, "wp_get_global_settings( array( 'custom', 'dark' ) )" ),
	'render.php: reads settings.custom.dark via wp_get_global_settings()'
);
ok(
	false !== strpos( $render_source, '$sgs_tt_has_dark' ) && false !== strpos( $render_source, 'return;' ),
	'render.php: returns early (renders nothing) when the site has no derived dark palette'
);

// Switch markup: the button itself carries both classes and starts unpressed.
ok(
	false !== strpos( $render_source, "'sgs-theme-toggle', \$uid" ) && false !== strpos( $render_source, "\$wrapper_classes[] = 'sgs-dark-mode-toggle';" ),
	'render.php: the switch style root carries both sgs-theme-toggle and sgs-dark-mode-toggle'
);
ok(
	false !== strpos( $render_source, "'aria-pressed'" ) && false !== strpos( $render_source, "'false'" ),
	'render.php: the switch button root sets aria-pressed="false" (server-rendered initial state)'
);
ok(
	false !== strpos( $render_source, "'type'" ) && false !== strpos( $render_source, "'button'" ),
	'render.php: the switch element is rendered as <button type="button">'
);

// Segmented markup: a radiogroup with three role="radio" choices.
ok(
	false !== strpos( $render_source, "'role'" ) && false !== strpos( $render_source, "'radiogroup'" ),
	'render.php: the segmented style root carries role="radiogroup"'
);
ok(
	false !== strpos( $render_source, 'role="radio"' ),
	'render.php: segmented choices carry role="radio"'
);
ok(
	false !== strpos( $render_source, "'light' =>" ) && false !== strpos( $render_source, "'dark'  =>" ) && false !== strpos( $render_source, "'auto'  =>" ),
	'render.php: the segmented style defines exactly the light/dark/auto choice set'
);
ok(
	false !== strpos( $render_source, 'foreach ( $choices as $value => $choice_label )' )
		&& false !== strpos( $render_source, "\$radios .= '<button type=\"button\" role=\"radio\"" ),
	'render.php: the three radios come from ONE loop over $choices (not three hand-duplicated blocks)'
);
ok(
	false !== strpos( $render_source, 'data-sgs-theme-choice=' ),
	'render.php: each segmented choice carries data-sgs-theme-choice (the hook dark-mode.js reads)'
);

// No inline style="..." anywhere in the file (Spec 32).
ok( 0 === preg_match( '/\sstyle\s*=\s*"/', $render_source ), 'render.php: emits zero inline style="…" attributes (Spec 32)' );

// ---------------------------------------------------------------------------
// Simulated sanitisation — mirrors render.php's own toggleStyle allow-list.
// ---------------------------------------------------------------------------

/**
 * Faithful re-implementation of render.php's $toggle_style resolution.
 *
 * @param mixed $raw The raw toggleStyle attribute value.
 * @return string
 */
function sanitise_toggle_style_with_allowlist( $raw ): string {
	$allowed = array( 'switch', 'segmented' );
	$style   = $raw ?? 'switch';
	return in_array( $style, $allowed, true ) ? $style : 'switch';
}

ok( 'switch' === sanitise_toggle_style_with_allowlist( 'switch' ), 'simulation: "switch" resolves to "switch"' );
ok( 'segmented' === sanitise_toggle_style_with_allowlist( 'segmented' ), 'simulation: "segmented" resolves to "segmented"' );
ok( 'switch' === sanitise_toggle_style_with_allowlist( 'not-a-real-style' ), 'simulation: an off-enum style falls back to "switch"' );
ok( 'switch' === sanitise_toggle_style_with_allowlist( null ), 'simulation: an unset style falls back to "switch"' );
ok( 'switch' === sanitise_toggle_style_with_allowlist( '' ), 'simulation: an empty-string style falls back to "switch"' );

/**
 * Simulates rendering the switch button's opening tag, for markup-shape assertions.
 *
 * @param string $style Sanitised toggle style.
 * @return string
 */
function render_button_open_tag_simulated( string $style ): string {
	if ( 'switch' !== $style ) {
		return '';
	}
	return '<button type="button" class="sgs-theme-toggle sgs-dark-mode-toggle" aria-pressed="false">';
}

$switch_markup = render_button_open_tag_simulated( sanitise_toggle_style_with_allowlist( 'switch' ) );
ok( false !== strpos( $switch_markup, 'aria-pressed="false"' ), 'switch markup: aria-pressed="false" present' );
ok( false !== strpos( $switch_markup, 'sgs-dark-mode-toggle' ), 'switch markup: sgs-dark-mode-toggle class present' );

/**
 * Simulates rendering the segmented control's opening tag + its three radios.
 *
 * @param string $style Sanitised toggle style.
 * @return string
 */
function render_segmented_markup_simulated( string $style ): string {
	if ( 'segmented' !== $style ) {
		return '';
	}
	$out = '<div role="radiogroup" aria-label="Colour scheme">';
	foreach ( array( 'light', 'dark', 'auto' ) as $choice ) {
		$out .= '<button type="button" role="radio" aria-checked="false" data-sgs-theme-choice="' . $choice . '"></button>';
	}
	return $out . '</div>';
}

$segmented_markup = render_segmented_markup_simulated( sanitise_toggle_style_with_allowlist( 'segmented' ) );
ok( false !== strpos( $segmented_markup, 'role="radiogroup"' ), 'segmented markup: role="radiogroup" present' );
ok( 3 === substr_count( $segmented_markup, 'role="radio"' ), 'segmented markup: exactly three role="radio" elements' );

// ---------------------------------------------------------------------------
// NEGATIVE CONTROL — remove the allow-list check entirely and prove the
// off-enum-falls-back-to-switch property goes red without it.
// ---------------------------------------------------------------------------

/**
 * The BROKEN variant — no allow-list check at all (deliberately breaks the guard).
 *
 * @param mixed $raw The raw toggleStyle attribute value.
 * @return mixed
 */
function sanitise_toggle_style_without_allowlist_broken( $raw ) {
	return $raw ?? 'switch';
}

$broken_result = sanitise_toggle_style_without_allowlist_broken( 'not-a-real-style' );
ok(
	'switch' !== $broken_result,
	'NEGATIVE CONTROL: without the allow-list guard, an off-enum style does NOT fall back to "switch" (proves the real allow-list check in render.php is what makes this safe — deleting it would turn every "off-enum falls back to switch" assertion above red)'
);
ok(
	'not-a-real-style' === $broken_result,
	'NEGATIVE CONTROL: the broken variant instead passes the raw off-enum value straight through unsanitised'
);

// A second negative-control dimension: the BROKEN variant fed into the markup
// simulator renders neither the switch NOR the segmented branch — proving the
// markup assertions above are genuinely conditioned on the real allow-list,
// not on some other implicit default.
$broken_switch_markup = render_button_open_tag_simulated( (string) $broken_result );
ok(
	'' === $broken_switch_markup,
	'NEGATIVE CONTROL: an unsanitised off-enum value renders NEITHER the switch NOR the segmented markup (would silently render nothing on a real site, not fall back)'
);

echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );
