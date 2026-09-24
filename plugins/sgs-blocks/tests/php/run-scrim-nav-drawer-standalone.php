<?php
/**
 * Standalone runner for sgs/nav-drawer's scrim WIRING (Wave 3C U-2, family M-14).
 *
 * This does NOT re-test the shared emitter (that is run-scrim-standalone.php's job).
 * It proves the ADOPTER side: that render.php's own text calls sgs_scrim_render()
 * with an `open` selector built from the block's own `$uid` + `[open]`, passes
 * `sgs-nav-scrim` keyed to the drawer's ref, and that the OLD hardcoded scrim gate
 * ($sgs_nd_needs_scrim / the `sgs-nav-drawer__scrim` div) is gone.
 *
 * render.php cannot be included whole outside WordPress (it needs the block
 * context and dozens of helpers), so — same idiom as
 * run-nav-drawer-surface-standalone.php — this asserts on the REAL SOURCE TEXT of
 * the file. A change to the shipped code is therefore a change to what is tested.
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-scrim-nav-drawer-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
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

$render_path = dirname( __DIR__, 2 ) . '/src/blocks/nav-drawer/render.php';
$source      = (string) file_get_contents( $render_path );

// ── The real call: sgs_scrim_render() appended to $css, built from $uid + '[open]',
// passing the drawer ref under the 'sgs-nav-scrim' data key. ─────────────────────
ok( false !== strpos( $source, '$css .= sgs_scrim_render(' ), 'render.php calls sgs_scrim_render() and appends its return to $css' );
ok( false !== strpos( $source, "'open'    => '.' . \$uid . '[open]'," ), "the open selector is built from \$uid + '[open]'" );
ok( false !== strpos( $source, "'data'    => array( 'sgs-nav-scrim' => \$drawer_ref )," ), "the drawer ref rides as the 'sgs-nav-scrim' data attribute" );

// ── Old scrim gate is gone. ──────────────────────────────────────────────────────
ok( false === strpos( $source, 'sgs_nd_needs_scrim' ), 'the old $sgs_nd_needs_scrim gate is gone' );
ok( false === strpos( $source, 'sgs_nd_scrim_html' ), 'the old $sgs_nd_scrim_html sprintf/echo is gone' );
ok( false === strpos( $source, 'sgs-nav-drawer__scrim' ), 'the old sgs-nav-drawer__scrim div markup is gone from render.php' );

// ── The dialog still carries $uid as a class (the open selector depends on it). ──
ok( false !== strpos( $source, "\$classes = array(\n\t'sgs-nav-drawer',\n\t\$uid," ), '$uid still rides as a class on the dialog root' );

// ── block.json declares the four scrim attributes + supports.sgs.scrim. ──────────
$block_json_path = dirname( __DIR__, 2 ) . '/src/blocks/nav-drawer/block.json';
$block_json      = json_decode( (string) file_get_contents( $block_json_path ), true );
ok( is_array( $block_json ), 'block.json parses as valid JSON' );
ok( isset( $block_json['supports']['sgs']['scrim']['open'] ) && '[open]' === $block_json['supports']['sgs']['scrim']['open'], 'supports.sgs.scrim.open is declared as "[open]"' );
foreach ( array( 'scrimColour', 'scrimColourGradient', 'scrimOpacity', 'scrimBlur' ) as $attr ) {
	ok( isset( $block_json['attributes'][ $attr ] ), "block.json declares the $attr attribute" );
}
ok( '#000000' === ( $block_json['attributes']['scrimColour']['default'] ?? null ), 'scrimColour default is #000000 (reproduces the old hardcoded rgba(0,0,0,0.55) colour)' );
ok( 0.55 === ( $block_json['attributes']['scrimOpacity']['default']['desktop'] ?? null ), 'scrimOpacity default is 0.55 (reproduces the old hardcoded opacity)' );

// ── style.css: no hardcoded dimmer paint remains. ─────────────────────────────────
$style_css_path = dirname( __DIR__, 2 ) . '/src/blocks/nav-drawer/style.css';
$style_css      = (string) file_get_contents( $style_css_path );
ok( false === strpos( $style_css, 'sgs-nav-drawer__scrim' ), 'style.css no longer declares .sgs-nav-drawer__scrim rules' );
ok( false !== strpos( $style_css, '::backdrop {' ) && false !== strpos( $style_css, 'background-color: transparent;' ), '::backdrop is set to transparent' );
ok( false === strpos( $style_css, 'rgba(0, 0, 0, 0.55)' ), 'no hardcoded rgba(0, 0, 0, 0.55) dimmer paint remains in style.css' );

// ── store.js: the old .is-open class toggling on the scrim is gone; the click
// listener + resolveScrim/reparentToBody/freezeBackground skipping remain. ───────
$store_path = dirname( __DIR__, 2 ) . '/src/shared/nav-interactivity/store.js';
$store      = (string) file_get_contents( $store_path );
ok( false === strpos( $store, "scrim.classList.add( 'is-open' )" ), "store.js no longer adds 'is-open' to the scrim" );
ok( false === strpos( $store, "scrim.classList.remove( 'is-open' )" ), "store.js no longer removes 'is-open' from the scrim" );
ok( false !== strpos( $store, 'function resolveScrim(' ), 'resolveScrim() is still present' );
ok( false !== strpos( $store, 'function reparentToBody(' ), 'reparentToBody() is still present' );
ok( false !== strpos( $store, 'function freezeBackground(' ), 'freezeBackground() (with scrim skipping) is still present' );
ok( false !== strpos( $store, 'el === scrim' ), 'freezeBackground still skips the scrim element' );
ok( false !== strpos( $store, 'onScrimClick' ), "the scrim's own click-to-close listener is still wired" );

// ── NEGATIVE CONTROL: prove the assertion actually fails against a mutated copy —
// re-introduce the removed old markup and confirm the "is gone" checks would FAIL. ──
$mutated = $source . "\n\$sgs_nd_scrim_html = sprintf( '<div class=\"sgs-nav-drawer__scrim\" data-sgs-nav-scrim=\"%s\"></div>', esc_attr( \$drawer_ref ) );\n\$sgs_nd_needs_scrim = true;\n";
ok( $mutated !== $source, 'negative control: the mutated copy differs from the real source' );
ok( false !== strpos( $mutated, 'sgs_nd_needs_scrim' ), 'negative control: with the old gate re-introduced, the "is gone" assertion for it WOULD fail (proving that assertion is not vacuous)' );
ok( false !== strpos( $mutated, 'sgs-nav-drawer__scrim' ), 'negative control: with the old div re-introduced, the "is gone" assertion for it WOULD fail (proving that assertion is not vacuous)' );

echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );
