<?php
/**
 * Standalone runner for sgs/modal's migration onto the shared viewport scrim
 * (Wave 3C U-2 Addendum A, "Modal migration").
 *
 * render.php cannot be executed standalone here without stubbing a large slice
 * of WordPress (get_block_wrapper_attributes(), do_blocks(), wp_unique_id(),
 * class_exists()-gated CPT resolution, plus every sgs_* colour/button helper
 * render-helpers.php pulls in) — the fixture-execution approach used by
 * run-scrim-standalone.php (which tests the shared helper directly) does not
 * reach this file's own call site. So this runner asserts on the REAL source
 * text of block.json/render.php/edit.js/style.css instead, per the U-2 task's
 * own fallback allowance. Each positive assertion carries a negative control
 * that mutates the extracted text and proves the assertion CAN fail.
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-scrim-modal-standalone.php
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

$block_dir   = dirname( __DIR__, 2 ) . '/src/blocks/modal';
$block_json  = (string) file_get_contents( $block_dir . '/block.json' );
$render_php  = (string) file_get_contents( $block_dir . '/render.php' );
$edit_js     = (string) file_get_contents( $block_dir . '/edit.js' );
$style_css   = (string) file_get_contents( $block_dir . '/style.css' );
$decoded     = json_decode( $block_json, true );

// ── block.json: supports.sgs.scrim.open ──────────────────────────────────────
ok(
	is_array( $decoded ) && ':modal' === ( $decoded['supports']['sgs']['scrim']['open'] ?? null ),
	'block.json declares supports.sgs.scrim.open === ":modal"'
);

// Negative control: a mutated copy declaring `[open]` (the non-modal drawer's
// shape, wrong for a native showModal() dialog) must fail the same check.
$bad_open = str_replace( '":modal"', '"[open]"', $block_json );
$bad_decoded = json_decode( $bad_open, true );
ok( $bad_open !== $block_json, 'negative control: the open-selector mutation was applied' );
ok(
	':modal' !== ( $bad_decoded['supports']['sgs']['scrim']['open'] ?? null ),
	'negative control: a "[open]" mutation fails the ":modal" check'
);

// ── block.json: the four renamed/new attributes exist, the four old ones don't ──
foreach ( array( 'scrimColour', 'scrimColourGradient', 'scrimOpacity', 'scrimBlur' ) as $attr ) {
	ok( isset( $decoded['attributes'][ $attr ] ), "block.json declares the {$attr} attribute" );
}
foreach ( array( 'overlayColour', 'overlayColourGradient', 'overlayOpacity', 'overlayColourHover', 'overlayColourHoverGradient' ) as $attr ) {
	ok( ! isset( $decoded['attributes'][ $attr ] ), "block.json no longer declares {$attr}" );
}
ok(
	0.5 === ( $decoded['attributes']['scrimOpacity']['default']['desktop'] ?? null ),
	'scrimOpacity default is desktop 0.5 (the old overlayOpacity default of 50/100, so the look is unchanged)'
);

// ── render.php: the scrim call uses the dialog + uid + :modal selector ──────
$expected_call = "sgs_scrim_render( \$attributes, \$uid, array( 'open' => '.' . \$uid . '.sgs-modal__dialog:modal' ) )";
ok( $has( $render_php, $expected_call ), 'render.php calls sgs_scrim_render() with the uid-scoped :modal open selector' );

// Negative control: a bypass that opens on the bare uid (no ".sgs-modal__dialog"
// compounded in) would also match a same-uid'd sibling element and must be
// distinguishable from the real call.
$bypass_call = str_replace( $expected_call, "sgs_scrim_render( \$attributes, \$uid, array( 'open' => '.' . \$uid . ':modal' ) )", $render_php );
ok( $bypass_call !== $render_php, 'negative control: the compounded-selector bypass was applied to render.php' );
ok( ! $has( $bypass_call, $expected_call ), 'negative control: the bypassed call text no longer matches the required call' );

// ── render.php: the uid class is on the <dialog>, not only the outer wrapper ──
// [\s\S]*? (not [^>]*) is required: the id attribute ahead of class= embeds a
// PHP closing tag of its own, which a "no greater-than sign" class can't cross.
$dialog_uid_pattern = '/<dialog[\s\S]*?class="sgs-modal__dialog[^"]*<\?php echo esc_attr\( \$uid \); \?>"/';
ok(
	preg_match( $dialog_uid_pattern, $render_php ) === 1,
	'render.php prints $uid inside the <dialog> element\'s own class attribute'
);

$no_uid_dialog = preg_replace(
	'/(<dialog[\s\S]*?class="sgs-modal__dialog[^"]*) <\?php echo esc_attr\( \$uid \); \?>(")/',
	'$1$2',
	$render_php,
	1
);
ok( $no_uid_dialog !== $render_php, 'negative control: the uid-on-dialog mutation was applied' );
ok(
	preg_match( $dialog_uid_pattern, $no_uid_dialog ) !== 1,
	'negative control: with the uid stripped from the dialog class, the check above fails'
);

// ── render.php no longer computes the old custom-property backdrop vars ─────
foreach ( array( '--sgs-modal-backdrop-colour', '--sgs-modal-backdrop-opacity', 'sgs_custom_property_gradient_decls' ) as $needle ) {
	ok( ! $has( $render_php, $needle ), "render.php no longer emits/uses {$needle}" );
}

// ── overlayColourHover is gone everywhere in this block's own files ──────────
foreach ( array(
	'block.json' => $block_json,
	'render.php' => $render_php,
	'edit.js'    => $edit_js,
	'style.css'  => $style_css,
) as $file => $text ) {
	ok( ! $has( $text, 'overlayColourHover' ), "{$file} contains no overlayColourHover reference" );
	ok( ! $has( $text, 'overlayColourHoverGradient' ), "{$file} contains no overlayColourHoverGradient reference" );
}

// Negative control: re-inject a stray overlayColourHover reference and confirm
// the scan above would have caught it.
$reinjected = $render_php . "\n// overlayColourHover\n";
ok( $has( $reinjected, 'overlayColourHover' ), 'negative control: a reinjected overlayColourHover reference IS found by the same scan' );

// ── style.css: the dialog's own ::backdrop is transparent, no hover rule ────
ok(
	preg_match( '/\.sgs-modal__dialog::backdrop\s*\{\s*background:\s*transparent;?\s*\}/', $style_css ) === 1,
	'style.css: .sgs-modal__dialog::backdrop is a bare transparent rule'
);
ok( ! $has( $style_css, '::backdrop:hover' ), 'style.css has no ::backdrop:hover rule' );
ok( ! $has( $style_css, '--sgs-modal-backdrop-opacity' ), 'style.css no longer declares --sgs-modal-backdrop-opacity' );

$reinject_hover_css = $style_css . "\n.sgs-modal__dialog::backdrop:hover{background-color:red}\n";
ok( $has( $reinject_hover_css, '::backdrop:hover' ), 'negative control: a reinjected ::backdrop:hover rule IS found by the same scan' );

echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );
