<?php
/**
 * Standalone runner for sgs/gallery's lightbox adoption of the shared viewport
 * scrim (Wave 3C U-2 Addendum A).
 *
 * render.php cannot be executed standalone here without stubbing a large slice
 * of WordPress (SGS_Container_Wrapper::render(), SGS_Media_Element, the
 * Interactivity API context builder, wp_style_engine_get_styles(), and every
 * sgs_* helper render-helpers.php pulls in) — the fixture-execution approach
 * used by run-scrim-standalone.php (which tests the shared helper directly)
 * does not reach this file's own call site. So this runner asserts on the REAL
 * source text of block.json/render.php/edit.js/style.css instead, per the U-2
 * task's own fallback allowance. Each positive assertion carries a negative
 * control that mutates the extracted text and proves the assertion CAN fail.
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-scrim-gallery-standalone.php
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

$has = static fn( string $hay, string $needle ): bool => false !== strpos( $hay, $needle );

$block_dir  = dirname( __DIR__, 2 ) . '/src/blocks/gallery';
$block_json = (string) file_get_contents( $block_dir . '/block.json' );
$render_php = (string) file_get_contents( $block_dir . '/render.php' );
$edit_js    = (string) file_get_contents( $block_dir . '/edit.js' );
$style_css  = (string) file_get_contents( $block_dir . '/style.css' );
$decoded    = json_decode( $block_json, true );

// ── block.json: supports.sgs.scrim.owner + .open ─────────────────────────────
ok(
	is_array( $decoded ) && '.sgs-gallery__lightbox' === ( $decoded['supports']['sgs']['scrim']['owner'] ?? null ),
	'block.json declares supports.sgs.scrim.owner === ".sgs-gallery__lightbox"'
);
ok(
	':modal' === ( $decoded['supports']['sgs']['scrim']['open'] ?? null ),
	'block.json declares supports.sgs.scrim.open === ":modal"'
);

$bad_owner = str_replace( '".sgs-gallery__lightbox"', '".sgs-gallery__grid"', $block_json );
$bad_decoded = json_decode( $bad_owner, true );
ok( $bad_owner !== $block_json, 'negative control: the owner-selector mutation was applied' );
ok(
	'.sgs-gallery__lightbox' !== ( $bad_decoded['supports']['sgs']['scrim']['owner'] ?? null ),
	'negative control: a wrong-owner mutation fails the lightbox-owner check'
);

// ── block.json: the four scrim attributes exist with the documented defaults ──
foreach ( array( 'scrimColour', 'scrimColourGradient', 'scrimOpacity', 'scrimBlur' ) as $attr ) {
	ok( isset( $decoded['attributes'][ $attr ] ), "block.json declares the {$attr} attribute" );
}
ok(
	'#000000' === ( $decoded['attributes']['scrimColour']['default'] ?? null ),
	'scrimColour default is black (Bean 2026-09-24: never a brand tint)'
);
ok(
	0.9 === ( $decoded['attributes']['scrimOpacity']['default']['desktop'] ?? null ),
	'scrimOpacity default is desktop 0.9 (the old hardcoded 90% mix, so the look is unchanged)'
);

// gallery's own image-overlay attributes (a DIFFERENT capability — hover-reveal
// tint on each grid image) must be untouched by this migration.
foreach ( array( 'overlayColourHover', 'overlayColourHoverGradient' ) as $attr ) {
	ok( isset( $decoded['attributes'][ $attr ] ), "block.json still declares the pre-existing image-overlay attribute {$attr} (untouched)" );
}

// ── render.php: the scrim call is gated on enableLightbox + uses the lightbox uid selector ──
$expected_call = "sgs_scrim_render( \$attributes, \$uid, array( 'open' => '.' . \$uid . '.sgs-gallery__lightbox:modal' ) )";
ok( $has( $render_php, $expected_call ), 'render.php calls sgs_scrim_render() with the uid-scoped :modal open selector' );
ok(
	(bool) preg_match( '/if \( \$enable_lightbox \) \{\s*\$gallery_responsive_css \.= sgs_scrim_render/', $render_php ),
	'the scrim call is gated on $enable_lightbox (no dialog exists when the lightbox is off)'
);

$bypass_call = str_replace( $expected_call, "sgs_scrim_render( \$attributes, \$uid, array( 'open' => '.' . \$uid . ':modal' ) )", $render_php );
ok( $bypass_call !== $render_php, 'negative control: the compounded-selector bypass was applied to render.php' );
ok( ! $has( $bypass_call, $expected_call ), 'negative control: the bypassed call text no longer matches the required call' );

// ── render.php: the uid class is on the lightbox <dialog> ───────────────────
$dialog_uid_pattern = '/<dialog\s+class="sgs-gallery__lightbox <\?php echo esc_attr\( \$uid \); \?>"/';
ok( preg_match( $dialog_uid_pattern, $render_php ) === 1, 'render.php prints $uid inside the lightbox <dialog>\'s own class attribute' );

$no_uid_dialog = str_replace(
	'class="sgs-gallery__lightbox <?php echo esc_attr( $uid ); ?>"',
	'class="sgs-gallery__lightbox"',
	$render_php
);
ok( $no_uid_dialog !== $render_php, 'negative control: the uid-on-dialog mutation was applied' );
ok( preg_match( $dialog_uid_pattern, $no_uid_dialog ) !== 1, 'negative control: with the uid stripped, the check above fails' );

// ── style.css: the lightbox's own hardcoded dimmer paint is gone ────────────
// Scoped to the 90% mix specifically — the arrow-nav hover states legitimately
// keep their OWN 50%/80% primary-dark color-mix rules, untouched by this
// migration; only the lightbox's own former 90% dimmer paint must be gone.
ok(
	! $has( $style_css, 'color-mix( in srgb, var( --wp--preset--color--primary-dark, #0A5B5D ) 90%, transparent )' ),
	'style.css no longer hardcodes the primary-dark 90% colour-mix background on the lightbox'
);
ok(
	(bool) preg_match( '/\.sgs-gallery__lightbox\s*\{[^}]*background:\s*transparent;/s', $style_css ),
	'style.css: .sgs-gallery__lightbox itself is transparent'
);
ok(
	(bool) preg_match( '/\.sgs-gallery__lightbox::backdrop\s*\{\s*background:\s*transparent;?\s*\}/', $style_css ),
	'style.css: .sgs-gallery__lightbox::backdrop is a bare transparent rule'
);

$reinject_paint = str_replace(
	'background:      transparent;',
	'background:      color-mix( in srgb, var( --wp--preset--color--primary-dark, #0A5B5D ) 90%, transparent );',
	$style_css
);
ok( $reinject_paint !== $style_css, 'negative control: the hardcoded-paint mutation was applied' );
ok(
	$has( $reinject_paint, 'color-mix( in srgb, var( --wp--preset--color--primary-dark' ),
	'negative control: a reinjected hardcoded paint IS found by the same scan'
);

// ── edit.js: the scrim controls are wired and gated on enableLightbox ───────
ok( $has( $edit_js, 'scrimColourRow' ), 'edit.js imports/uses scrimColourRow' );
ok( $has( $edit_js, 'ScrimControls' ), 'edit.js imports/uses <ScrimControls>' );
ok(
	(bool) preg_match( '/enableLightbox &&\s*scrimColourRow\(/', $edit_js ),
	'the colour row is gated on enableLightbox'
);
ok(
	(bool) preg_match( '/\{ enableLightbox && \(\s*<ToolsPanel/', $edit_js ),
	'the strength/blur ToolsPanel is gated on enableLightbox'
);

// image-overlay controls (a different, pre-existing capability) must still be present.
ok( $has( $edit_js, 'overlayColourHover' ), 'edit.js still wires the pre-existing image-overlay hover control (untouched)' );

// ── Backdrop dismiss (Bean, 2026-09-24): a click on the lightbox outside the
// image, caption, counter and controls closes it, through the native close().
$view_js = (string) file_get_contents( $block_dir . '/view.js' );
ok(
	(bool) preg_match( '/<dialog(?:(?!<button).)*?data-wp-on--click="actions\.closeOnBackdrop"/s', $render_php ),
	'the lightbox <dialog> itself carries the backdrop-click handler'
);
ok(
	$has( $view_js, 'closeOnBackdrop( event )' )
		&& $has( $view_js, "target.closest( '.sgs-gallery__lightbox-img, .sgs-gallery__lightbox-caption, .sgs-gallery__lightbox-counter, button' )" )
		&& $has( $view_js, 'dialogEl.close();' ),
	'view.js closes only when the click missed the image, caption, counter and every button, via dialog.close()'
);
ok(
	! (bool) preg_match( '/<button[^>]*data-wp-on--click="actions\.closeOnBackdrop"/s', $render_php ),
	'NEGATIVE CONTROL shape: the handler is not on a button (the dialog check above can tell the two apart)'
);

echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );
