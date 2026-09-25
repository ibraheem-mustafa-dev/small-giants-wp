<?php
/**
 * Standalone runner for the dropdown sublink's default text colour.
 *
 * The base `.{bem}__sublink` rule in includes/nav-menu-submenu-css.php paints
 * the palette's `text` token, shared by the bar's dropdown and the drawer's
 * nested submenu. A brand `primary` there fails 4.5:1 on light-brand palettes
 * (Mama's Munches #e68a95 on #fbf3dc measures 2.24:1); the brand colour
 * belongs to the Hover row fill (`submenuLinkBgHover`).
 *
 * The runner reads the real shipped file, so a change to it is a change to
 * what is tested. The negative control reads the same file at 7a633476c, the
 * last commit that still defaulted to `primary`, and proves the check fails
 * there.
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-nav-sublink-default-colour-standalone.php
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
 * The PHP source text of the base sublink rule (from its selector to the
 * statement end), or '' when the rule is missing.
 *
 * @param string $source The full nav-menu-submenu-css.php text.
 * @return string
 */
function base_sublink_rule( string $source ): string {
	$start = strpos( $source, "__sublink{display:flex;align-items:center;min-height:44px;" );
	if ( false === $start ) {
		return '';
	}
	$end = strpos( $source, "}';", $start );
	return false === $end ? '' : substr( $source, $start, $end - $start );
}

/**
 * Every `__sublink{color:…}` default rule the file emits for the base state
 * (no pseudo-class, no attribute selector), as PHP source fragments.
 *
 * @param string $source The full nav-menu-submenu-css.php text.
 * @return string[]
 */
function sublink_primary_text_defaults( string $source ): array {
	preg_match_all( "/__sublink\\{[^}]*\\bcolor:var\\(--wp--preset--color--primary/", $source, $m );
	return $m[0];
}

$rel_path = 'plugins/sgs-blocks/includes/nav-menu-submenu-css.php';
$current  = (string) file_get_contents( dirname( __DIR__, 2 ) . '/includes/nav-menu-submenu-css.php' );

$rule = base_sublink_rule( $current );
ok( '' !== $rule, 'the base __sublink rule is found in the real nav-menu-submenu-css.php' );
ok( false !== strpos( $rule, 'color:var(--wp--preset--color--text, currentColor)' ), 'base sublink text defaults to the palette `text` token' );
ok( false === strpos( $rule, 'color--primary' ), 'base sublink text never defaults to `primary`' );
ok( array() === sublink_primary_text_defaults( $current ), 'no other resting __sublink rule paints `primary` text' );

// Negative control: the pre-change file must fail the same checks.
$repo_root = dirname( __DIR__, 4 );
$old       = (string) shell_exec( 'git -C ' . escapeshellarg( $repo_root ) . ' show 7a633476c:' . $rel_path . ' 2>' . ( '\\' === DIRECTORY_SEPARATOR ? 'NUL' : '/dev/null' ) );
ok( '' !== $old, 'negative control: the pre-change file is readable from git (7a633476c)' );
$old_rule = base_sublink_rule( $old );
ok( '' !== $old_rule, 'negative control: the base rule is found in the pre-change file' );
ok( false === strpos( $old_rule, 'color:var(--wp--preset--color--text, currentColor)' ), 'negative control: the `text` check FAILS on the pre-change file' );
ok( array() !== sublink_primary_text_defaults( $old ), 'negative control: the no-`primary` scan FAILS on the pre-change file' );

echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );
