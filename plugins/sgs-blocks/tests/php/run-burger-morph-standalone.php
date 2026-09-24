<?php
/**
 * Standalone runner for Wave 3C U-9/U-11 — burger morph (§4.4), the markup-side
 * interfaces with Builder A (`data-sgs-nav-collapse`, `accordionExclusive`), and
 * the item magnet strength (§4.8). See
 * `.claude/reports/2026-09-24-u9-u11-design.md`.
 *
 * Pattern: `run-nav-drawer-surface-standalone.php` (extract the REAL section
 * from the shipped file, eval it, assert against fixtures — a change to the
 * shipped code is a change to what is tested). `includes/nav-menu-markup.php`
 * contains ONLY function declarations guarded by `function_exists()`, so it is
 * safe to `require_once` wholesale; `src/blocks/nav-bar-menu/render.php` is a
 * real render script with side-effecting top-level code, so its relevant
 * sections are extracted and `eval()`'d instead, exactly like the sibling
 * runner.
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-burger-morph-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedConstantFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing
// phpcs:disable Squiz.PHP.Eval.Discouraged

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}

// ── Minimal WordPress function stubs ────────────────────────────────────────
if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $text ): string {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}
if ( ! function_exists( 'esc_html' ) ) {
	function esc_html( $text ): string {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}
if ( ! function_exists( 'esc_url' ) ) {
	function esc_url( $url ): string {
		$filtered = filter_var( (string) $url, FILTER_SANITIZE_URL );
		return $filtered ? $filtered : '';
	}
}
if ( ! function_exists( 'esc_attr__' ) ) {
	function esc_attr__( $text, $domain = 'default' ): string {
		return esc_attr( $text );
	}
}
if ( ! function_exists( '__' ) ) {
	function __( $text, $domain = 'default' ): string {
		return $text;
	}
}
if ( ! function_exists( 'absint' ) ) {
	function absint( $val ): int {
		return abs( (int) $val );
	}
}
if ( ! function_exists( 'wp_parse_url' ) ) {
	function wp_parse_url( $url, $component = -1 ) {
		return parse_url( $url, $component ); // phpcs:ignore WordPress.WP.AlternativeFunctions.parse_url_parse_url -- CLI stub.
	}
}

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
 * Cut the text strictly between two markers (both excluded).
 * Same contract as run-nav-item-hover-paint-standalone.php's own helper.
 *
 * @param string $source The full file text.
 * @param string $start  Marker text where the section BEGINS.
 * @param string $end    Marker text where the section ENDS.
 * @return string The section text, or '' if either marker is missing.
 */
function cut_between( string $source, string $start, string $end ): string {
	$start_pos = strpos( $source, $start );
	if ( false === $start_pos ) {
		return '';
	}
	$end_pos = strpos( $source, $end, $start_pos );
	if ( false === $end_pos ) {
		return '';
	}
	return substr( $source, $start_pos, $end_pos - $start_pos );
}

// ══════════════════════════════════════════════════════════════════════════
// Load the REAL, current shared markup functions wholesale — this file is
// declarations only (each guarded by function_exists()), so nothing runs on
// require.
// ══════════════════════════════════════════════════════════════════════════
require_once dirname( __DIR__, 2 ) . '/includes/nav-menu-markup.php';

// ══════════════════════════════════════════════════════════════════════════
// Extract the REAL easing-resolution functions from nav-bar-menu/render.php
// (§4.4) — the file itself is a render script with side-effecting top-level
// code, so only this section is pulled out and evaluated.
// ══════════════════════════════════════════════════════════════════════════
$render_source = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/nav-bar-menu/render.php' );

$easing_fns_section = cut_between(
	$render_source,
	"if ( ! function_exists( 'sgs_nav_bar_menu_valid_cubic_bezier' ) ) {",
	"if ( ! class_exists( 'SGS_Nav_Menu_Bar_Renderer' ) ) {"
);
ok( '' !== $easing_fns_section, 'the easing-resolver functions are found in the real nav-bar-menu/render.php' );
eval( $easing_fns_section ); // phpcs:ignore Squiz.PHP.Eval.Discouraged -- registers sgs_nav_bar_menu_valid_cubic_bezier() + sgs_nav_bar_menu_resolve_burger_morph_easing_css().
ok( function_exists( 'sgs_nav_bar_menu_valid_cubic_bezier' ), 'sgs_nav_bar_menu_valid_cubic_bezier() was registered by the extracted section' );
ok( function_exists( 'sgs_nav_bar_menu_resolve_burger_morph_easing_css' ), 'sgs_nav_bar_menu_resolve_burger_morph_easing_css() was registered by the extracted section' );

$morph_resolve_section = cut_between(
	$render_source,
	"\$sgs_nm_collapse_point = isset(",
	'// wp_interactivity_data_wp_context() is the WP-canonical compact single-quoted'
);
ok( '' !== $morph_resolve_section, 'the collapsePoint/burgerMorph resolution section is found in the real render.php' );

$magnet_section = cut_between(
	$render_source,
	"\$sgs_nm_item_magnet_strength = \$attributes['itemMagnetStrength']",
	"// `sgs-nav-bar-menu__bar` is this block's own BEM root."
);
ok( '' !== $magnet_section, 'the itemMagnetStrength section is found in the real render.php' );

$morph_css_section = cut_between(
	$render_source,
	"\$sgs_nm_morph_duration = isset(",
	"// The item hover-colour default ('primary') is the same on nav-drawer-menu"
);
ok( '' !== $morph_css_section, 'the burger-morph duration/easing custom-property section is found in the real render.php' );

/**
 * Run the collapsePoint/burgerMorph resolution section against fixture attrs.
 *
 * @param string $code       The PHP text of the section.
 * @param array  $attributes Block attributes.
 * @return array{0:int,1:string} [$sgs_nm_collapse_point, $sgs_nm_burger_morph].
 */
function run_morph_resolve( string $code, array $attributes ): array {
	eval( $code ); // phpcs:ignore Squiz.PHP.Eval.Discouraged
	return array( $sgs_nm_collapse_point, $sgs_nm_burger_morph ); // phpcs:ignore WordPress.NamingConventions.ValidVariableName.UsedPropertyNotSnakeCase -- defined by the eval'd section.
}

/**
 * Run the itemMagnetStrength section against fixture attrs.
 *
 * @param string $code            The PHP text of the section.
 * @param array  $attributes      Block attributes.
 * @param bool   $magnet_enabled  Whether `itemMagnetEnabled` resolved true.
 * @return string The resulting $bar_data_attrs fragment this section appends to.
 */
function run_magnet( string $code, array $attributes, bool $magnet_enabled ): string {
	$bar_data_attrs = '';
	eval( $code ); // phpcs:ignore Squiz.PHP.Eval.Discouraged
	return $bar_data_attrs;
}

/**
 * Run the burger-morph duration/easing CSS section against fixture attrs.
 *
 * @param string $code       The PHP text of the section.
 * @param array  $attributes Block attributes.
 * @return string The CSS appended to $css.
 */
function run_morph_css( string $code, array $attributes ): string {
	$css     = '';
	$uid_sel = '.uid';
	eval( $code ); // phpcs:ignore Squiz.PHP.Eval.Discouraged
	return $css;
}

// ══════════════════════════════════════════════════════════════════════════
// Group 1 — easing: every named option, a valid custom curve, rejected junk.
// ══════════════════════════════════════════════════════════════════════════
ok( 'ease' === sgs_nav_bar_menu_resolve_burger_morph_easing_css( array() ), "easing: unset attribute resolves to the literal 'ease' (today's exact value)" );
ok( 'ease' === sgs_nav_bar_menu_resolve_burger_morph_easing_css( array( 'burgerMorphEasing' => 'ease' ) ), "easing: 'ease' resolves to the literal keyword" );
ok( 'linear' === sgs_nav_bar_menu_resolve_burger_morph_easing_css( array( 'burgerMorphEasing' => 'linear' ) ), "easing: 'linear' resolves to the literal keyword" );
ok( 'cubic-bezier(0.165, 0.84, 0.44, 1)' === sgs_nav_bar_menu_resolve_burger_morph_easing_css( array( 'burgerMorphEasing' => 'quart-out' ) ), "easing: 'quart-out' resolves to dogstudio's literal curve, not a theme token" );
foreach ( array( 'default', 'ease-out', 'ease-in', 'spring' ) as $token ) {
	ok(
		'var(--wp--custom--easing--' . $token . ')' === sgs_nav_bar_menu_resolve_burger_morph_easing_css( array( 'burgerMorphEasing' => $token ) ),
		"easing: '$token' resolves to the matching theme motion token"
	);
}
ok( 'ease' === sgs_nav_bar_menu_resolve_burger_morph_easing_css( array( 'burgerMorphEasing' => 'not-a-real-option' ) ), 'easing: an out-of-list stored value falls back to ease' );

// 'custom' + a valid curve.
ok(
	'cubic-bezier(0.34, 1.56, 0.64, 1)' === sgs_nav_bar_menu_resolve_burger_morph_easing_css(
		array( 'burgerMorphEasing' => 'custom', 'burgerMorphEasingCustom' => 'cubic-bezier(0.34, 1.56, 0.64, 1)' )
	),
	'easing: custom + a valid spring-overshoot curve (y > 1 is legal) passes through verbatim'
);
ok(
	'cubic-bezier(0,0,1,1)' === sgs_nav_bar_menu_resolve_burger_morph_easing_css(
		array( 'burgerMorphEasing' => 'custom', 'burgerMorphEasingCustom' => 'cubic-bezier(0,0,1,1)' )
	),
	'easing: custom + a valid curve with no internal spaces passes through'
);

// 'custom' + rejected junk -> falls back to 'ease'.
$hostile_curves = array(
	'a declaration breakout'      => 'cubic-bezier(0,0,1,1);}body{background:red',
	'exponent notation'           => 'cubic-bezier(1e2,0,1,1)',
	'x1 out of range (negative)'  => 'cubic-bezier(-0.5,0,1,1)',
	'x1 out of range (above 1)'   => 'cubic-bezier(1.5,0,1,1)',
	'x2 out of range (above 1)'   => 'cubic-bezier(0,0,1.5,1)',
	'not a cubic-bezier at all'   => 'red;}body{x',
	'missing arguments'           => 'cubic-bezier(0,0)',
);
foreach ( $hostile_curves as $label => $curve ) {
	ok(
		'ease' === sgs_nav_bar_menu_resolve_burger_morph_easing_css( array( 'burgerMorphEasing' => 'custom', 'burgerMorphEasingCustom' => $curve ) ),
		"easing: custom + $label is refused, falls back to ease"
	);
}

// Negative control: bypass the validator — prove the refusal tests above can fail.
$bypass_validator = str_replace(
	'return sgs_nav_bar_menu_valid_cubic_bezier( $custom ) ? $custom : \'ease\';',
	'return $custom;',
	$easing_fns_section
);
ok( $bypass_validator !== $easing_fns_section, 'negative control (easing): the validator bypass was applied to the extracted text' );
eval( str_replace( 'sgs_nav_bar_menu_resolve_burger_morph_easing_css', 'sgs_bypassed_resolve_burger_morph_easing_css', $bypass_validator ) ); // phpcs:ignore Squiz.PHP.Eval.Discouraged
ok(
	'red;}body{x' === sgs_bypassed_resolve_burger_morph_easing_css( array( 'burgerMorphEasing' => 'custom', 'burgerMorphEasingCustom' => 'red;}body{x' ) ),
	'negative control (easing): with the validator bypassed, hostile input IS passed through (so the refusal tests above can fail)'
);

// ══════════════════════════════════════════════════════════════════════════
// Group 2 — morph enum allow-list parity with block.json.
// ══════════════════════════════════════════════════════════════════════════
$block_json = json_decode( (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/nav-bar-menu/block.json' ), true );
ok( is_array( $block_json ), 'block.json parses as JSON' );

$morph_enum  = $block_json['attributes']['burgerMorph']['enum'] ?? null;
$easing_enum = $block_json['attributes']['burgerMorphEasing']['enum'] ?? null;

ok( is_array( $morph_enum ), 'block.json declares an enum for burgerMorph' );
sort( $morph_enum );
$expected_morph = array( 'line', 'none', 'x', 'x-rotate' );
sort( $expected_morph );
ok( $morph_enum === $expected_morph, 'burgerMorph enum matches the PHP allow-list (x, x-rotate, line, none)' );

ok( is_array( $easing_enum ), 'block.json declares an enum for burgerMorphEasing' );
sort( $easing_enum );
$expected_easing = array( 'ease', 'default', 'ease-out', 'ease-in', 'spring', 'linear', 'quart-out', 'custom' );
sort( $expected_easing );
ok( $easing_enum === $expected_easing, 'burgerMorphEasing enum matches the resolver\'s named options + custom' );

// Every named easing option in block.json resolves to SOMETHING via the real resolver (no dead enum value).
foreach ( $morph_enum as $morph_value ) {
	ok(
		in_array( $morph_value, array( 'x', 'x-rotate', 'line', 'none' ), true ),
		"burgerMorph enum value '$morph_value' is one the render-side allow-list also accepts"
	);
}

// ══════════════════════════════════════════════════════════════════════════
// Group 3 — collapsePoint / burgerMorph resolution + duration clamp.
// (`eval()` here is the established CLI-test-harness idiom in this file's own
// sibling runners — it evaluates a section extracted VERBATIM from the
// shipped render.php, never arbitrary/untrusted input; see the file docblock.)
// ══════════════════════════════════════════════════════════════════════════
ok( array( 768, 'x' ) === run_morph_resolve( $morph_resolve_section, array() ), 'resolve: no attributes -> collapsePoint 768, burgerMorph x (today\'s exact defaults)' );
ok( array( 900, 'line' ) === run_morph_resolve( $morph_resolve_section, array( 'collapsePoint' => 900, 'burgerMorph' => 'line' ) ), 'resolve: an explicit collapsePoint + burgerMorph pass through' );
ok( array( 1, 'x' ) === run_morph_resolve( $morph_resolve_section, array( 'collapsePoint' => 0 ) ), 'resolve: collapsePoint 0 clamps to a floor of 1, matching nav-menu-submenu-css.php\'s own sanitisation' );
ok( array( 768, 'x' ) === run_morph_resolve( $morph_resolve_section, array( 'burgerMorph' => 'not-a-real-value' ) ), 'resolve: an out-of-allow-list burgerMorph coerces to x' );

// Duration clamp — via the morph-CSS section, which reads burgerMorphDuration
// and clamps it 0..1200 before deciding whether to emit the custom property.
ok( '' === run_morph_css( $morph_css_section, array() ), 'duration: no attributes -> nothing emitted (200/ease both match their var() fallback)' );
ok( '' === run_morph_css( $morph_css_section, array( 'burgerMorphDuration' => 200, 'burgerMorphEasing' => 'ease' ) ), 'duration: explicit defaults (200/ease) still emit nothing' );
$fast = run_morph_css( $morph_css_section, array( 'burgerMorphDuration' => 50 ) );
ok( false !== strpos( $fast, '--sgs-nbm-burger-morph-duration:50ms;' ), 'duration: a non-default value (50) is emitted verbatim' );
$over = run_morph_css( $morph_css_section, array( 'burgerMorphDuration' => 5000 ) );
ok( false !== strpos( $over, '--sgs-nbm-burger-morph-duration:1200ms;' ), 'duration: an out-of-range value (5000) clamps to the 1200 ceiling' );
$under = run_morph_css( $morph_css_section, array( 'burgerMorphDuration' => -50 ) );
ok( false !== strpos( $under, '--sgs-nbm-burger-morph-duration:0ms;' ), 'duration: a negative value clamps to the 0 floor' );
$named = run_morph_css( $morph_css_section, array( 'burgerMorphEasing' => 'spring' ) );
ok( false !== strpos( $named, '--sgs-nbm-burger-morph-easing:var(--wp--custom--easing--spring);' ), 'duration/easing: a named easing option is written as its resolved CSS value' );

// Negative control: bypass the duration clamp.
$bypass_duration_clamp = str_replace(
	'$sgs_nm_morph_duration = max( 0, min( 1200, $sgs_nm_morph_duration ) );',
	'',
	$morph_css_section
);
ok( $bypass_duration_clamp !== $morph_css_section, 'negative control (duration): the clamp bypass was applied to the extracted text' );
$bypassed_over = run_morph_css( $bypass_duration_clamp, array( 'burgerMorphDuration' => 5000 ) );
ok( false !== strpos( $bypassed_over, '--sgs-nbm-burger-morph-duration:5000ms;' ), 'negative control (duration): with the clamp bypassed, 5000 IS emitted raw (so the ceiling test above can fail)' );

// ══════════════════════════════════════════════════════════════════════════
// Group 4 — the collapse data attribute on the burger (real code, via
// sgs_nav_bar_menu_burger_toggle_markup(), loaded wholesale above).
// ══════════════════════════════════════════════════════════════════════════
$toggle_default = sgs_nav_bar_menu_burger_toggle_markup( '', 'sgs-nav-drawer', '<svg></svg>', 'icon', '', '', '', true );
ok( false !== strpos( $toggle_default, 'data-sgs-nav-collapse="768"' ), 'collapse attr: default burger emits data-sgs-nav-collapse="768" (the default collapsePoint)' );
ok( false !== strpos( $toggle_default, 'data-wp-on--click="actions.toggleDrawer"' ), 'collapse attr: it rides on the SAME element that carries the toggleDrawer click handler' );

$toggle_custom = sgs_nav_bar_menu_burger_toggle_markup( '', 'sgs-nav-drawer', '<svg></svg>', 'icon', '', '', '', true, 1024, 'x' );
ok( false !== strpos( $toggle_custom, 'data-sgs-nav-collapse="1024"' ), 'collapse attr: a custom collapsePoint (1024) is emitted verbatim' );

// It rides regardless of icon default/custom (unlike the morph attribute below).
$toggle_custom_icon = sgs_nav_bar_menu_burger_toggle_markup( '', 'sgs-nav-drawer', '<svg></svg>', 'icon', '', '', '', false, 500, 'line' );
ok( false !== strpos( $toggle_custom_icon, 'data-sgs-nav-collapse="500"' ), 'collapse attr: still emitted with a CUSTOM triggerIcon (is_default_icon=false)' );
ok( false === strpos( $toggle_custom_icon, 'data-sgs-nav-burger-morph' ), 'morph attr: OMITTED entirely with a custom triggerIcon (no bars markup to select on)' );

$toggle_morph = sgs_nav_bar_menu_burger_toggle_markup( '', 'sgs-nav-drawer', '<svg></svg>', 'icon', '', '', '', true, 768, 'x-rotate' );
ok( false !== strpos( $toggle_morph, 'data-sgs-nav-burger-morph="x-rotate"' ), 'morph attr: emitted with the default icon' );

// Negative control: prove BOTH attributes are new, via the OLD (pre-this-
// task) function from git HEAD — same call, extra new-signature args simply
// ignored by PHP, so this is the exact call shape used above.
// No stderr redirect — the redirect syntax differs between cmd.exe (Windows)
// and a POSIX shell, and shell_exec() runs under whichever is this system's
// default. A failed `git show` simply returns null/empty here, which the
// checks immediately below already handle.
$old_markup_source = shell_exec( 'git show HEAD:plugins/sgs-blocks/includes/nav-menu-markup.php' );
ok( is_string( $old_markup_source ) && '' !== trim( (string) $old_markup_source ), 'negative control (collapse/morph): the pre-task nav-menu-markup.php was read from git HEAD' );
if ( is_string( $old_markup_source ) && '' !== trim( $old_markup_source ) ) {
	// This block is the LAST one in the pre-task file (confirmed against git
	// HEAD), so there is no "next section" end marker to cut_between() — the
	// tail of the file IS the end of the function.
	$old_start = strpos( $old_markup_source, "if ( ! function_exists( 'sgs_nav_bar_menu_burger_toggle_markup' ) ) {" );
	ok( false !== $old_start, 'negative control (collapse/morph): the OLD burger_toggle_markup block is found in the HEAD source' );
	$old_toggle_section = substr( $old_markup_source, $old_start );
	$old_toggle_section = str_replace( 'sgs_nav_bar_menu_burger_toggle_markup', 'sgs_old_nav_bar_menu_burger_toggle_markup', $old_toggle_section );
	eval( $old_toggle_section ); // phpcs:ignore Squiz.PHP.Eval.Discouraged -- the OLD (pre-task) shipped function, from git HEAD, renamed to avoid redeclaration.
	ok( function_exists( 'sgs_old_nav_bar_menu_burger_toggle_markup' ), 'negative control (collapse/morph): the OLD function was registered under its renamed identifier' );
	$old_toggle_html = sgs_old_nav_bar_menu_burger_toggle_markup( '', 'sgs-nav-drawer', '<svg></svg>', 'icon', '', '', '', true, 1024, 'x-rotate' );
	ok(
		false === strpos( $old_toggle_html, 'data-sgs-nav-collapse' ) && false === strpos( $old_toggle_html, 'data-sgs-nav-burger-morph' ),
		'negative control (collapse/morph): the OLD function ignores the new trailing args entirely — neither attribute is emitted (so the tests above can fail)'
	);
}

// ══════════════════════════════════════════════════════════════════════════
// Group 5 — accordion name= present when exclusive, absent when false (real
// code, via sgs_nav_drawer_menu_render_items(), loaded wholesale above).
// ══════════════════════════════════════════════════════════════════════════
$has_submenu_items = array(
	array(
		'identifier' => 'label:Parent',
		'url'        => '#',
		'has_url'    => false,
		'label'      => 'Parent',
		'type'       => '',
		'object_id'  => 0,
		'badge'      => '',
		'children'   => array(
			array(
				'identifier' => 'label:Parent>label:Child',
				'url'        => '/child/',
				'has_url'    => true,
				'label'      => 'Child',
			),
		),
	),
);

$exclusive_html = sgs_nav_drawer_menu_render_items( $has_submenu_items, 'accordion', 'testuid', array(), '', array(), true );
ok( false !== strpos( $exclusive_html, 'name="sgs-nav-drawer-menu-accordion-testuid"' ), 'accordion: exclusive=true (default) emits the shared name= that enforces one-open-at-a-time' );

$non_exclusive_html = sgs_nav_drawer_menu_render_items( $has_submenu_items, 'accordion', 'testuid', array(), '', array(), false );
ok( false === strpos( $non_exclusive_html, 'name=' ), 'accordion: exclusive=false OMITS the name= attribute entirely (away\'s reference — two panels open at once)' );
ok( false !== strpos( $non_exclusive_html, '<details class="sgs-nav-drawer-menu__accordion"' ), 'accordion: the <details> element itself still renders without name=' );

// Negative control: the OLD (pre-task) function, from git HEAD, always
// emitted name= — proving $exclusive is genuinely new behaviour, not a no-op
// parameter.
if ( is_string( $old_markup_source ) && '' !== trim( $old_markup_source ) ) {
	$old_items_start = strpos( $old_markup_source, "if ( ! function_exists( 'sgs_nav_drawer_menu_render_items' ) ) {" );
	$old_items_end   = strpos( $old_markup_source, "if ( ! function_exists( 'sgs_nav_bar_menu_burger_toggle_markup' ) ) {" );
	ok( false !== $old_items_start && false !== $old_items_end, 'negative control (accordion): the OLD sgs_nav_drawer_menu_render_items block is found in the HEAD source' );
	$old_items_section = substr( $old_markup_source, $old_items_start, $old_items_end - $old_items_start );
	$old_items_section = str_replace( 'sgs_nav_drawer_menu_render_items', 'sgs_old_nav_drawer_menu_render_items', $old_items_section );
	eval( $old_items_section ); // phpcs:ignore Squiz.PHP.Eval.Discouraged -- the OLD (pre-task) shipped function, from git HEAD, renamed to avoid redeclaration.
	ok( function_exists( 'sgs_old_nav_drawer_menu_render_items' ), 'negative control (accordion): the OLD function was registered under its renamed identifier' );
	$old_non_exclusive = sgs_old_nav_drawer_menu_render_items( $has_submenu_items, 'accordion', 'testuid', array(), '', array(), false );
	ok(
		false !== strpos( $old_non_exclusive, 'name=' ),
		'negative control (accordion): the OLD function ignores the extra $exclusive=false arg and STILL emits name= (so the omission test above can fail)'
	);
}

// ══════════════════════════════════════════════════════════════════════════
// Group 6 — magnet: unset emits nothing / set emits the attribute (§4.8).
// ══════════════════════════════════════════════════════════════════════════
ok( '' === run_magnet( $magnet_section, array(), true ), 'magnet: itemMagnetStrength unset -> nothing emitted, even with the effect enabled' );
ok( '' === run_magnet( $magnet_section, array( 'itemMagnetStrength' => 0.2 ), false ), 'magnet: itemMagnetEnabled false -> nothing emitted even with a strength set' );
ok( ' data-magnet-strength="0.2"' === run_magnet( $magnet_section, array( 'itemMagnetStrength' => 0.2 ), true ), 'magnet: enabled + a value set -> the attribute is emitted' );
ok( ' data-magnet-strength="0.5"' === run_magnet( $magnet_section, array( 'itemMagnetStrength' => 5 ), true ), 'magnet: an out-of-range value (5) clamps to the 0.5 ceiling' );
ok( ' data-magnet-strength="0.02"' === run_magnet( $magnet_section, array( 'itemMagnetStrength' => -1 ), true ), 'magnet: an out-of-range value (-1) clamps to the 0.02 floor' );
ok( '' === run_magnet( $magnet_section, array( 'itemMagnetStrength' => 'not-a-number' ), true ), 'magnet: a non-numeric (hostile) value emits nothing' );

// Negative control: bypass the clamp.
$bypass_magnet_clamp = str_replace(
	"max( 0.02, min( 0.5, (float) \$sgs_nm_item_magnet_strength ) )",
	'(float) $sgs_nm_item_magnet_strength',
	$magnet_section
);
ok( $bypass_magnet_clamp !== $magnet_section, 'negative control (magnet): the clamp bypass was applied to the extracted text' );
ok(
	' data-magnet-strength="5"' === run_magnet( $bypass_magnet_clamp, array( 'itemMagnetStrength' => 5 ), true ),
	'negative control (magnet): with the clamp bypassed, 5 IS emitted raw (so the ceiling test above can fail)'
);

echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );
