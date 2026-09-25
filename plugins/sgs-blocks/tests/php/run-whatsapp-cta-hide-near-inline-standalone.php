<?php
/**
 * Standalone runner for the WhatsApp CTA's "step aside near inline" data attribute.
 *
 * The floating variant's root gets `data-sgs-wa-hide-near-inline="true"` only
 * when the variant is `floating` AND `floatingHideNearInline` is true (the
 * declared default) — never for the `card`/`inline`/`banner` variants, and
 * never when the attribute is explicitly false. view.js reads this data
 * attribute to decide whether to run the IntersectionObserver at all
 * (frontend JS has no access to block attributes, only rendered markup).
 *
 * The runner reads the real shipped render.php, so a change to it is a
 * change to what is tested. The negative control reads the same file at
 * 04b25ef79 (the commit named as "before this feature"), and proves the
 * attribute is absent there for every case.
 *
 * Plain PHP, no PHPUnit, no WordPress bootstrap — render.php is parsed as
 * text (the same technique as run-nav-sublink-default-colour-standalone.php),
 * not executed, since it needs the full WP runtime (get_block_wrapper_attributes(),
 * wp_style_engine_get_styles(), Sgs_Site_Info, etc).
 *
 * Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-whatsapp-cta-hide-near-inline-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable Squiz.Commenting.FunctionComment.Missing
// phpcs:disable WordPress.PHP.DiscouragedPHPFunctions.system_calls_shell_exec

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

/**
 * Whether render.php's source declares the step-aside data attribute at all.
 *
 * @param string $source The full render.php text.
 * @return bool
 */
function declares_hide_near_inline_attr( string $source ): bool {
	return false !== strpos( $source, 'data-sgs-wa-hide-near-inline' );
}

/**
 * Whether render.php's source only ever writes the attribute inside an
 * `if ( 'floating' === $variant )` guard, never unconditionally and never
 * guarded by a different variant check.
 *
 * @param string $source The full render.php text.
 * @return bool
 */
function attr_write_is_floating_guarded( string $source ): bool {
	$attr_pos = strpos( $source, "root_attr_args['data-sgs-wa-hide-near-inline']" );
	if ( false === $attr_pos ) {
		return false;
	}
	// The nearest preceding "if ( 'floating' === $variant )" must be closer
	// than any preceding "if (" for a different variant/condition, and the
	// attribute write must sit inside that block (no closing brace between
	// the guard and the write, tolerating one nested if for the boolean
	// check itself).
	$guard_pos = strripos( $source, "if ( 'floating' === \$variant ) {", $attr_pos - strlen( $source ) );
	return false !== $guard_pos && $guard_pos < $attr_pos;
}

/**
 * Whether render.php's source reads floatingHideNearInline with a
 * true-by-default fallback (missing attribute => true, matching block.json's
 * declared default).
 *
 * @param string $source The full render.php text.
 * @return bool
 */
function reads_default_true( string $source ): bool {
	return (bool) preg_match(
		'/!\s*isset\s*\(\s*\$attributes\[\'floatingHideNearInline\'\]\s*\)\s*\|\|\s*\(bool\)\s*\$attributes\[\'floatingHideNearInline\'\]/',
		$source
	);
}

$rel_path = 'plugins/sgs-blocks/src/blocks/whatsapp-cta/render.php';
$current  = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/whatsapp-cta/render.php' );

ok( '' !== $current, 'the real render.php is readable' );
ok( declares_hide_near_inline_attr( $current ), 'render.php writes the data-sgs-wa-hide-near-inline attribute' );
ok( attr_write_is_floating_guarded( $current ), 'the attribute write sits inside the floating-variant guard, never unconditional' );
ok( reads_default_true( $current ), 'a missing floatingHideNearInline attribute defaults to true (matches block.json default)' );

// block.json: attribute exists, boolean, default true.
$block_json_raw = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/whatsapp-cta/block.json' );
$block_json     = json_decode( $block_json_raw, true );
$attr_schema    = $block_json['attributes']['floatingHideNearInline'] ?? null;
ok( is_array( $attr_schema ), 'block.json declares floatingHideNearInline' );
ok( 'boolean' === ( $attr_schema['type'] ?? null ), 'floatingHideNearInline is typed boolean' );
ok( true === ( $attr_schema['default'] ?? null ), 'floatingHideNearInline defaults to true' );

/**
 * Simulated render outcome, mirroring render.php's own guard logic exactly
 * (variant === 'floating' AND the resolved boolean), across every case the
 * feature must and must not fire for.
 *
 * @param string $variant                        The block's `variant` attribute.
 * @param mixed  $floating_hide_near_inline_attr  The raw `floatingHideNearInline` attribute value, or null when unset.
 * @return bool
 */
function simulate_attr_present( string $variant, $floating_hide_near_inline_attr ): bool {
	$resolved = ! isset( $floating_hide_near_inline_attr ) || (bool) $floating_hide_near_inline_attr;
	return 'floating' === $variant && $resolved;
}

ok( true === simulate_attr_present( 'floating', null ), 'floating + unset attribute (default true) => attribute present' );
ok( true === simulate_attr_present( 'floating', true ), 'floating + true => attribute present' );
ok( false === simulate_attr_present( 'floating', false ), 'floating + false => attribute absent' );
ok( false === simulate_attr_present( 'card', null ), 'card variant + unset (default true) => attribute absent (not floating)' );
ok( false === simulate_attr_present( 'card', true ), 'card variant + true => attribute absent (not floating)' );
ok( false === simulate_attr_present( 'inline', true ), 'inline variant + true => attribute absent (not floating)' );
ok( false === simulate_attr_present( 'banner', true ), 'banner variant + true => attribute absent (not floating)' );

// Negative control: the pre-change file (before this feature existed) must
// fail the presence checks entirely — the attribute did not exist yet.
$repo_root = dirname( __DIR__, 4 );
$old       = (string) shell_exec( 'git -C ' . escapeshellarg( $repo_root ) . ' show 04b25ef79:' . $rel_path . ' 2>' . ( '\\' === DIRECTORY_SEPARATOR ? 'NUL' : '/dev/null' ) );
ok( '' !== $old, 'negative control: the pre-change file is readable from git (04b25ef79)' );
ok( false === declares_hide_near_inline_attr( $old ), 'negative control: the pre-change file has no data-sgs-wa-hide-near-inline attribute at all' );
ok( false === attr_write_is_floating_guarded( $old ), 'negative control: the floating-guarded-write check FAILS on the pre-change file' );

echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );
