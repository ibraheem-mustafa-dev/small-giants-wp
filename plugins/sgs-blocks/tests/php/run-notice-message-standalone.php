<?php
/**
 * Standalone runner for U-15 self-changing messages on sgs/notice-banner
 * (`.claude/reports/2026-09-26-u15-notice-message-design.md`).
 *
 * render.php cannot be executed whole outside WordPress here (it pulls in
 * render-helpers.php's ~30-file loader for colour/typography/style-engine
 * emission this task never touches) — same constraint documented in
 * run-close-control-standalone.php and run-scrim-modal-standalone.php. This
 * runner instead:
 *
 *  (a) unit-tests the new PURE functions in notice-banner/helpers.php and
 *      notice-message/helpers.php directly (real files, real requires — only
 *      helpers-tokens.php + helpers-hover-state.php are needed, both
 *      self-contained aside from esc_attr()/wp_get_global_settings(), which
 *      are stubbed below);
 *  (b) extracts the REAL "interior HTML + Interactivity context" span from
 *      the CURRENT (shipped) notice-banner/render.php and eval()s it against
 *      fixtures — a change to the shipped code is a change to what is tested;
 *  (c) proves the static/byte-identical claim (design §3.3) by extracting the
 *      SAME span (by the SAME two markers, unchanged text in both files) from
 *      the OLD render.php via `git show 16e20f873~1:...` (pinned to the commit before U-15, so the reference never moves) and diffing the two eval
 *      results under a static-mode fixture.
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-notice-message-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
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
if ( ! function_exists( 'esc_attr__' ) ) {
	function esc_attr__( $text, $domain = 'default' ): string {
		return esc_attr( $text );
	}
}
if ( ! function_exists( 'esc_html' ) ) {
	function esc_html( $text ): string {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}
if ( ! function_exists( '__' ) ) {
	function __( $text, $domain = 'default' ): string {
		return $text;
	}
}
if ( ! function_exists( 'wp_json_encode' ) ) {
	function wp_json_encode( $data, $options = 0, $depth = 512 ) {
		return json_encode( $data, $options, $depth ); // phpcs:ignore WordPress.WP.AlternativeFunctions.json_encode_json_encode -- CLI stub.
	}
}
if ( ! function_exists( 'wp_get_global_settings' ) ) {
	function wp_get_global_settings( $path = array(), $context = array() ) {
		return array();
	}
}
if ( ! function_exists( 'sanitize_html_class' ) ) {
	function sanitize_html_class( $class, $fallback = '' ) {
		$sanitized = preg_replace( '/[^A-Za-z0-9_-]/', '', (string) $class );
		return '' !== $sanitized ? $sanitized : $fallback;
	}
}
if ( ! function_exists( 'get_block_wrapper_attributes' ) ) {
	function get_block_wrapper_attributes( array $extra_attrs = array() ): string {
		$parts = array();
		foreach ( $extra_attrs as $key => $value ) {
			$parts[] = htmlspecialchars( (string) $key, ENT_QUOTES, 'UTF-8' )
				. '="' . htmlspecialchars( (string) $value, ENT_QUOTES, 'UTF-8' ) . '"';
		}
		return implode( ' ', $parts );
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
 * Cut the text strictly between two markers (start included, end excluded).
 * Same contract as run-close-control-standalone.php's own helper.
 */
function extract_section( string $source, string $start_marker, string $end_marker ): string {
	$start = strpos( $source, $start_marker );
	if ( false === $start ) {
		return '';
	}
	$end = strpos( $source, $end_marker, $start );
	if ( false === $end || $end <= $start ) {
		return '';
	}
	return substr( $source, $start, $end - $start );
}

// ════════════════════════════════════════════════════════════════════════════
// (a) Pure-function unit tests — notice-banner/helpers.php + notice-message/helpers.php.
// Real files, real requires (only the two dependency files they actually call into).
// ════════════════════════════════════════════════════════════════════════════
require_once dirname( __DIR__, 2 ) . '/includes/helpers-tokens.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-hover-state.php';
require_once dirname( __DIR__, 2 ) . '/src/blocks/notice-banner/helpers.php';
require_once dirname( __DIR__, 2 ) . '/src/blocks/notice-message/helpers.php';

// messageMode allow-list — off-enum coerces to 'static'.
ok( 'static' === sgs_notice_banner_resolve_message_mode( 'static' ), 'resolve_message_mode: static stays static' );
ok( 'rotate' === sgs_notice_banner_resolve_message_mode( 'rotate' ), 'resolve_message_mode: rotate stays rotate' );
ok( 'random' === sgs_notice_banner_resolve_message_mode( 'random' ), 'resolve_message_mode: random stays random' );
ok( 'static' === sgs_notice_banner_resolve_message_mode( 'literally-anything-else' ), 'resolve_message_mode: an off-enum value coerces to static, never fatals' );
ok( 'static' === sgs_notice_banner_resolve_message_mode( null ), 'resolve_message_mode: null coerces to static' );
ok( 'static' === sgs_notice_banner_resolve_message_mode( array( 'not', 'a', 'string' ) ), 'resolve_message_mode: a non-scalar value coerces to static' );

// messageTransition allow-list.
ok( 'fade' === sgs_notice_banner_resolve_transition( 'fade' ), 'resolve_transition: fade stays fade' );
ok( 'fade' === sgs_notice_banner_resolve_transition( 'nonsense' ), 'resolve_transition: an off-enum value coerces to fade (the block.json default)' );

// rotateInterval clamp (2-30).
ok( 5 === sgs_notice_banner_clamp_interval( 5 ), 'clamp_interval: an in-range value passes through' );
ok( 30 === sgs_notice_banner_clamp_interval( 999 ), 'clamp_interval: a too-large value clamps to 30' );
ok( 2 === sgs_notice_banner_clamp_interval( -5 ), 'clamp_interval: a too-small/negative value clamps to 2' );
ok( 5 === sgs_notice_banner_clamp_interval( 'not-a-number' ), 'clamp_interval: a non-numeric value falls back to the 5s default' );

// Message counting — only sgs/notice-message children are counted.
ok( 2 === sgs_notice_banner_message_count( array( 'innerBlocks' => array(
	array( 'blockName' => 'sgs/notice-message' ),
	array( 'blockName' => 'sgs/text' ),
	array( 'blockName' => 'sgs/notice-message' ),
) ) ), 'message_count: counts only sgs/notice-message children, not siblings of another type' );
ok( 0 === sgs_notice_banner_message_count( array() ), 'message_count: no innerBlocks key returns 0, never fatals' );

// Arrow colour CSS.
ok( '' === sgs_notice_banner_arrow_colour_css( '.x', '', '' ), 'arrow_colour_css: no colour set emits nothing' );
$arrow_css = sgs_notice_banner_arrow_colour_css( '.sgs-notice-banner-test', '#ff0000', '#00ff00' );
ok( false !== strpos( $arrow_css, '.sgs-notice-banner-test .sgs-notice-banner__prev, .sgs-notice-banner-test .sgs-notice-banner__next{color:#ff0000;}' ), 'arrow_colour_css: base colour scoped to both prev+next selectors' );
ok( false !== strpos( $arrow_css, ':hover' ) && false !== strpos( $arrow_css, '#00ff00' ), 'arrow_colour_css: hover colour emitted via the shared touch-safe hover helper' );

// ── notice-message: the scoped colour CSS carries EXACTLY one :has( ──────────
$msg_css = sgs_notice_message_bar_css( 'sgs-notice-message-abc', '#111111', '', '#ffffff', '' );
ok( 1 === substr_count( $msg_css, ':has(' ), 'notice-message CSS: exactly one :has( when colours are set (§3.1 — a nested :has() is invalid CSS)' );
ok( false !== strpos( $msg_css, '.wp-block-sgs-notice-banner:has(.sgs-notice-message-abc.is-active){background-color:#111111;color:#ffffff;}' ), 'notice-message CSS: the :has() rule paints the WHOLE bar (background + text) while this message is active' );
ok( false !== strpos( $msg_css, '.sgs-notice-message-abc{color:#ffffff;}' ), 'notice-message CSS: the own-uid rule keeps a stacked no-JS message\'s own text colour' );

$msg_css_empty = sgs_notice_message_bar_css( 'sgs-notice-message-xyz', '', '', '', '' );
ok( '' === $msg_css_empty, 'notice-message CSS: no colours set emits nothing at all (inherits the banner\'s own paint)' );
ok( 0 === substr_count( $msg_css_empty, ':has(' ), 'notice-message CSS: zero :has( when no colours are set' );

// ════════════════════════════════════════════════════════════════════════════
// (b) + (c) Extract the REAL "interior HTML + Interactivity context" span from
// the CURRENT (shipped) render.php and eval() it against fixtures.
// ════════════════════════════════════════════════════════════════════════════
$render_path    = dirname( __DIR__, 2 ) . '/src/blocks/notice-banner/render.php';
$current_source = (string) file_get_contents( $render_path );

$start_marker = "\$sgs_inner_html = '';\n";
$end_marker   = "// -------------------------------------------------------------------------\n// NO-WRAPPER: notice-banner builds its own root <div> via";

$current_section = extract_section( $current_source, $start_marker, $end_marker );
ok( '' !== $current_section, 'the interior-HTML + Interactivity-context span is found in the CURRENT notice-banner/render.php' );
if ( '' === $current_section ) {
	echo "\n==== $pass passed, $fail failed ====\n";
	exit( 1 );
}

/**
 * Run the extracted section against a fixture and return the two things it
 * produces: the interior HTML and the root's extra attributes.
 *
 * @return array{sgs_inner_html:string,extra_attrs:array}
 */
function run_section( string $code, array $fixture ): array {
	// Inputs the extracted span reads (mirrors the real render.php's own
	// variable names exactly, so the eval'd code writes into them for real).
	$icon_html                 = $fixture['icon_html'] ?? '';
	// Set by render.php before this span (the icon badge's modifier class).
	$sgs_nb_icon_classes       = $fixture['icon_classes'] ?? 'sgs-notice-banner__icon';
	$content                   = $fixture['content'] ?? '<p>Hello</p>';
	$is_announcement           = $fixture['is_announcement'] ?? false;
	$dismissible               = $fixture['dismissible'] ?? false;
	$dismiss_behaviour         = $fixture['dismiss_behaviour'] ?? 'session';
	$anchor                    = $fixture['anchor'] ?? '';
	$variant                   = $fixture['variant'] ?? 'info';
	$sgs_nb_enhanced           = $fixture['sgs_nb_enhanced'] ?? false;
	$sgs_nb_message_mode       = $fixture['sgs_nb_message_mode'] ?? 'static';
	$sgs_nb_show_arrows        = $fixture['sgs_nb_show_arrows'] ?? false;
	$sgs_nb_rotate_interval    = $fixture['sgs_nb_rotate_interval'] ?? 5;
	$sgs_nb_transition         = $fixture['sgs_nb_transition'] ?? 'fade';
	$sgs_nb_pause_on_hover     = $fixture['sgs_nb_pause_on_hover'] ?? true;
	$sgs_nb_message_count      = $fixture['sgs_nb_message_count'] ?? 0;

	eval( $code ); // phpcs:ignore Squiz.PHP.Eval.Discouraged -- CLI harness evaluating the extracted render.php span (structural test only).

	return array(
		'sgs_inner_html' => $sgs_inner_html ?? '',
		'extra_attrs'    => $extra_attrs ?? array(),
	);
}

// ── Static mode — the byte-identical claim (§3.3) ────────────────────────────
$git_head_source = shell_exec( 'git show 16e20f873~1:plugins/sgs-blocks/src/blocks/notice-banner/render.php 2>&1' );
$old_section      = is_string( $git_head_source )
	? extract_section( $git_head_source, $start_marker, $end_marker )
	: '';

if ( '' === $old_section ) {
	ok( false, 'byte-identity setup: could not extract the OLD (pre-U-15) span via `git show HEAD:...` — git unavailable, byte-identity comparison skipped, review manually' );
} else {
	ok( false === strpos( $old_section, 'sgs_nb_enhanced' ), 'byte-identity baseline: the OLD render.php genuinely has no U-15 code (proves the fixture is really the pre-change file)' );

	$static_fixture = array(
		'icon_html'       => '<svg data-icon="info"></svg>',
		'content'         => '<p>A brief supporting statement.</p>',
		'is_announcement' => false,
		'dismissible'     => false,
		'sgs_nb_enhanced' => false, // static mode / fewer than two children never sets this true.
	);

	$old_result = run_section( $old_section, $static_fixture );
	$new_result = run_section( $current_section, $static_fixture );

	ok(
		$old_result['sgs_inner_html'] === $new_result['sgs_inner_html'],
		'STATIC MODE: interior HTML is byte-identical to the pre-U-15 render (icon + $content, no messages wrapper, no pause/arrow buttons)'
	);
	ok(
		$old_result['extra_attrs'] === $new_result['extra_attrs'],
		'STATIC MODE: root extra attributes are byte-identical to the pre-U-15 render (role/aria-label only, no Interactivity context)'
	);
	ok( false === strpos( $new_result['sgs_inner_html'], 'sgs-notice-banner__messages' ), 'STATIC MODE: no messages wrapper is emitted at all' );
	ok( ! isset( $new_result['extra_attrs']['data-wp-interactive'] ), 'STATIC MODE: no Interactivity context is attached to the root' );

	// A dismissible announcement (the pre-existing feature) must ALSO stay
	// byte-identical when static/few children — proves the U-15 amendment
	// (appended strictly AFTER the dismiss branch, never reordering its keys)
	// really does leave that existing path untouched too.
	$announcement_fixture = array_merge( $static_fixture, array(
		'is_announcement' => true,
		'dismissible'     => true,
		'content'         => '<p>Free delivery over £50.</p>',
		'variant'         => 'accent',
	) );
	$old_announcement = run_section( $old_section, $announcement_fixture );
	$new_announcement = run_section( $current_section, $announcement_fixture );
	ok(
		$old_announcement['sgs_inner_html'] === $new_announcement['sgs_inner_html']
			&& $old_announcement['extra_attrs'] === $new_announcement['extra_attrs'],
		'STATIC MODE + dismissible announcement: also byte-identical to the pre-U-15 render (the dismiss context is untouched by an unrelated, disabled U-15 branch)'
	);
}

// ── Rotate mode ───────────────────────────────────────────────────────────────
$rotate_fixture = array(
	'content'                => '<div class="sgs-notice-message">A</div><div class="sgs-notice-message">B</div>',
	'sgs_nb_enhanced'        => true,
	'sgs_nb_message_mode'    => 'rotate',
	'sgs_nb_show_arrows'     => false,
	'sgs_nb_rotate_interval' => 5,
	'sgs_nb_transition'      => 'fade',
	'sgs_nb_pause_on_hover'  => true,
	'sgs_nb_message_count'   => 2,
);
$rotate_result = run_section( $current_section, $rotate_fixture );
ok( false !== strpos( $rotate_result['sgs_inner_html'], 'sgs-notice-banner__messages' ) && false !== strpos( $rotate_result['sgs_inner_html'], 'aria-live="off"' ), 'ROTATE MODE: the messages wrapper renders with aria-live="off"' );
ok( false !== strpos( $rotate_result['sgs_inner_html'], 'sgs-notice-banner__pause' ) && false !== strpos( $rotate_result['sgs_inner_html'], 'aria-pressed="false"' ), 'ROTATE MODE: the pause button renders with aria-pressed="false"' );
ok( false === strpos( $rotate_result['sgs_inner_html'], 'sgs-notice-banner__prev' ) && false === strpos( $rotate_result['sgs_inner_html'], 'sgs-notice-banner__next' ), 'ROTATE MODE without showMessageArrows: no arrow buttons render' );
ok( isset( $rotate_result['extra_attrs']['data-wp-interactive'] ) && 'sgs/notice-banner' === $rotate_result['extra_attrs']['data-wp-interactive'], 'ROTATE MODE: the root carries data-wp-interactive="sgs/notice-banner"' );
ok( isset( $rotate_result['extra_attrs']['data-wp-class--is-enhanced'] ), 'ROTATE MODE: the root carries the is-enhanced class directive' );
$rotate_context = json_decode( $rotate_result['extra_attrs']['data-wp-context'] ?? '{}', true );
ok( 'rotate' === ( $rotate_context['messageMode'] ?? null ) && 2 === ( $rotate_context['messageCount'] ?? null ), 'ROTATE MODE: the Interactivity context carries messageMode + messageCount' );

$rotate_arrows_fixture = array_merge( $rotate_fixture, array( 'sgs_nb_show_arrows' => true ) );
$rotate_arrows_result  = run_section( $current_section, $rotate_arrows_fixture );
ok( false !== strpos( $rotate_arrows_result['sgs_inner_html'], 'sgs-notice-banner__prev' ) && false !== strpos( $rotate_arrows_result['sgs_inner_html'], 'sgs-notice-banner__next' ), 'ROTATE MODE with showMessageArrows: both arrow buttons render' );

// ── Random mode — no pause button at all ─────────────────────────────────────
$random_fixture = array_merge( $rotate_fixture, array( 'sgs_nb_message_mode' => 'random' ) );
$random_result  = run_section( $current_section, $random_fixture );
ok( false !== strpos( $random_result['sgs_inner_html'], 'sgs-notice-banner__messages' ), 'RANDOM MODE: the messages wrapper still renders' );
ok( false === strpos( $random_result['sgs_inner_html'], 'sgs-notice-banner__pause' ), 'RANDOM MODE: no pause button renders' );
ok( false === strpos( $random_result['sgs_inner_html'], 'sgs-notice-banner__prev' ), 'RANDOM MODE: no arrow buttons render (rotate-only, even if showMessageArrows were true)' );

// ════════════════════════════════════════════════════════════════════════════
// NEGATIVE CONTROL — with the pause button removed from the render, the
// rotate assertion above must go red.
// ════════════════════════════════════════════════════════════════════════════
$mutated_section = str_replace(
	"\t\t\$sgs_inner_html .= '<button class=\"sgs-notice-banner__pause\" type=\"button\" aria-pressed=\"false\" aria-label=\"' . esc_attr__( 'Pause announcements', 'sgs-blocks' ) . '\" data-wp-on--click=\"actions.togglePause\" data-wp-bind--aria-pressed=\"context.pausedByButton\"><span class=\"sgs-notice-banner__pause-icon\" aria-hidden=\"true\"></span></button>';\n",
	'',
	$current_section
);
ok( $mutated_section !== $current_section, 'negative control setup: the pause-button mutation was actually applied to a copy of the section' );

$mutated_result = run_section( $mutated_section, $rotate_fixture );
ok(
	false === strpos( $mutated_result['sgs_inner_html'], 'sgs-notice-banner__pause' ),
	'NEGATIVE CONTROL: with the pause button removed from the render, "ROTATE MODE: the pause button renders" goes RED — proving that assertion watches real, removable code'
);

echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );
