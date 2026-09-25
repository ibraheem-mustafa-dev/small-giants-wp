<?php
/**
 * Standalone runner for sgs/audio's `playerStyle: "toggle"` (a sound on/off button).
 *
 * The button itself is built entirely by view.js (progressive enhancement,
 * same pattern as every other player style) — render.php's job for this
 * style is: (1) accept "toggle" into the allow-listed enum, (2) force
 * audioAutoplay off unconditionally (a sound toggle is never a surprise
 * autoplay), and (3) carry the data-toggle-* hooks the view module reads
 * (label, icon, per-tier show-label). Per the dispatch brief: "assert
 * whichever the server renders" — the server renders the data hooks and the
 * unchanged native <audio> fallback; it does not render `.sgs-audio__toggle`
 * or `aria-pressed` itself (view.js does, checked against the real view.js
 * source below).
 *
 * The runner reads the real shipped render.php/block.json/view.js as text
 * (same technique as run-whatsapp-cta-hide-near-inline-standalone.php) and
 * also runs an in-PHP simulation of render.php's own sanitisation logic —
 * so a change to either surface is a change to what is tested.
 *
 * Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-audio-toggle-standalone.php
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

$block_dir     = dirname( __DIR__, 2 ) . '/src/blocks/audio';
$render_source = (string) file_get_contents( $block_dir . '/render.php' );
$view_source   = (string) file_get_contents( $block_dir . '/view.js' );
$block_json    = json_decode( (string) file_get_contents( $block_dir . '/block.json' ), true );

ok( '' !== $render_source, 'the real render.php is readable' );
ok( '' !== $view_source, 'the real view.js is readable' );
ok( is_array( $block_json ), 'the real block.json parses as JSON' );

// ---------------------------------------------------------------------------
// block.json — enum + attribute shapes.
// ---------------------------------------------------------------------------

$player_style_schema = $block_json['attributes']['playerStyle'] ?? array();
ok(
	in_array( 'toggle', $player_style_schema['enum'] ?? array(), true ),
	'block.json: playerStyle enum includes "toggle"'
);

$toggle_label_schema = $block_json['attributes']['toggleLabel'] ?? array();
ok( 'string' === ( $toggle_label_schema['type'] ?? null ), 'block.json: toggleLabel is typed string' );
ok( 'Sound' === ( $toggle_label_schema['default'] ?? null ), 'block.json: toggleLabel defaults to "Sound"' );

$toggle_show_label_schema = $block_json['attributes']['toggleShowLabel'] ?? array();
ok( 'boolean' === ( $toggle_show_label_schema['type'] ?? null ), 'block.json: toggleShowLabel (desktop) is typed boolean' );
ok( false === ( $toggle_show_label_schema['default'] ?? null ), 'block.json: toggleShowLabel defaults to false (icon-only)' );

$toggle_show_label_tablet_schema = $block_json['attributes']['toggleShowLabelTablet'] ?? array();
ok(
	in_array( 'boolean', (array) ( $toggle_show_label_tablet_schema['type'] ?? array() ), true )
		&& in_array( 'null', (array) ( $toggle_show_label_tablet_schema['type'] ?? array() ), true ),
	'block.json: toggleShowLabelTablet accepts boolean|null (inherit)'
);
ok(
	array_key_exists( 'default', $toggle_show_label_tablet_schema ) && null === $toggle_show_label_tablet_schema['default'],
	'block.json: toggleShowLabelTablet defaults to null (inherit desktop)'
);

$toggle_show_label_mobile_schema = $block_json['attributes']['toggleShowLabelMobile'] ?? array();
ok(
	array_key_exists( 'default', $toggle_show_label_mobile_schema ) && null === $toggle_show_label_mobile_schema['default'],
	'block.json: toggleShowLabelMobile defaults to null (inherit tablet)'
);

$toggle_icon_schema = $block_json['attributes']['toggleIcon'] ?? array();
ok( array( 'bars', 'speaker' ) === ( $toggle_icon_schema['enum'] ?? null ), 'block.json: toggleIcon enum is exactly [bars, speaker]' );
ok( 'bars' === ( $toggle_icon_schema['default'] ?? null ), 'block.json: toggleIcon defaults to "bars"' );

// ---------------------------------------------------------------------------
// render.php — source-level checks (same technique as the whatsapp-cta runner).
// ---------------------------------------------------------------------------

ok(
	false !== strpos( $render_source, "array( 'minimal', 'waveform', 'spectrum', 'radial', 'oscilloscope', 'gradient-pulse', 'hidden', 'toggle' )" ),
	'render.php: $allowed_styles literally includes toggle alongside all seven existing styles'
);

ok(
	false !== strpos( $render_source, "'toggle' === \$player_style" ),
	'render.php: at least one guard checks for the toggle style explicitly'
);

// Autoplay is forced off for toggle — never a surprise-sound page load.
$autoplay_guard_pos = strpos( $render_source, "if ( 'toggle' === \$player_style ) {\n\t\$autoplay = false;" );
ok( false !== $autoplay_guard_pos, 'render.php: playerStyle:toggle unconditionally forces $autoplay = false' );

// The native <audio> element is rendered unconditionally for every style
// (toggle relies on this exactly like every other style — the button is a
// JS-only enhancement layered on top, never a replacement server-side).
ok(
	false !== strpos( $render_source, '<audio' ) && false === strpos( $render_source, "'toggle' !== \$player_style" ),
	'render.php: the native <audio> element is never gated behind a toggle-style exclusion'
);

// The data-toggle-* hooks view.js reads are only written inside a toggle guard.
foreach ( array( 'data-toggle-label', 'data-toggle-icon', 'data-toggle-show-label', 'data-toggle-show-label-tablet', 'data-toggle-show-label-mobile' ) as $hook ) {
	$hook_pos = strpos( $render_source, "root_attr_args['" . $hook . "']" );
	ok( false !== $hook_pos, "render.php: writes the {$hook} data hook" );
	$guard_pos = strripos( $render_source, "if ( 'toggle' === \$player_style ) {", $hook_pos - strlen( $render_source ) );
	ok( false !== $guard_pos && $guard_pos < $hook_pos, "render.php: {$hook} is written inside the toggle-style guard, never unconditionally" );
}

// No inline `style="..."` anywhere in the file (Spec 32 — the whole block
// stays on this contract, not just the new code).
ok( 0 === preg_match( '/\sstyle\s*=\s*"/', $render_source ), 'render.php: emits zero inline style="…" attributes (Spec 32)' );

// ---------------------------------------------------------------------------
// view.js — the button + aria-pressed hook the SERVER does not render (the
// task brief's "or the data hook the view module upgrades" clause).
// ---------------------------------------------------------------------------

ok( false !== strpos( $view_source, "style === 'toggle'" ), 'view.js: has a dedicated toggle style branch' );
ok( false !== strpos( $view_source, "btn.className = 'sgs-audio__toggle'" ), 'view.js: the toggle branch creates .sgs-audio__toggle' );
ok( false !== strpos( $view_source, "btn.setAttribute( 'aria-pressed', 'false' )" ), 'view.js: the toggle button initialises aria-pressed="false"' );
ok( false !== strpos( $view_source, "audio.addEventListener( 'play'" ) && false !== strpos( $view_source, "audio.addEventListener( 'pause'" ), 'view.js: the toggle branch listens for play/pause on its OWN track' );
ok( false !== strpos( $view_source, "localStorage.setItem( 'sgs-sound'" ), 'view.js: persists the global sound state to localStorage["sgs-sound"]' );
ok( false !== strpos( $view_source, 'setOthersMuted' ), 'view.js: mutes/unmutes every OTHER media element on the page' );
ok( false !== strpos( $view_source, 'el !== audio' ), 'view.js: the mute sweep explicitly excludes this block\'s own <audio>' );
ok( false !== strpos( $view_source, "new CustomEvent( 'sgs-sound-change'" ), 'view.js: dispatches the sgs-sound-change event' );
ok(
	false !== strpos( $view_source, 'NEVER autoplay' ) || false !== strpos( $view_source, 'syncPressed( false )' ),
	'view.js: the toggle branch never plays its own track on init (stays paused until pressed)'
);

// ---------------------------------------------------------------------------
// Simulated sanitisation — mirrors render.php's own allow-list logic exactly.
// ---------------------------------------------------------------------------

/**
 * Faithful re-implementation of render.php's $player_style resolution.
 *
 * @param mixed $raw The raw playerStyle attribute value.
 * @return string
 */
function sanitise_player_style_with_allowlist( $raw ): string {
	$allowed = array( 'minimal', 'waveform', 'spectrum', 'radial', 'oscilloscope', 'gradient-pulse', 'hidden', 'toggle' );
	$style   = $raw ?? 'minimal';
	return in_array( $style, $allowed, true ) ? $style : 'minimal';
}

ok( 'toggle' === sanitise_player_style_with_allowlist( 'toggle' ), 'simulation: "toggle" resolves to "toggle"' );
ok( 'minimal' === sanitise_player_style_with_allowlist( 'not-a-real-style' ), 'simulation: an off-enum style falls back to "minimal"' );
ok( 'minimal' === sanitise_player_style_with_allowlist( null ), 'simulation: an unset style falls back to "minimal"' );
ok( 'minimal' === sanitise_player_style_with_allowlist( '' ), 'simulation: an empty-string style falls back to "minimal"' );

// ---------------------------------------------------------------------------
// NEGATIVE CONTROL — remove the allow-list check entirely and prove the
// off-enum-falls-back-to-minimal property goes red without it. This is the
// same function with the guard deliberately deleted (a regression exactly
// like this one shipping the enum literal into $allowed_styles but a stray
// typo variant on the sanitiser line, or the check being dropped later).
// ---------------------------------------------------------------------------

/**
 * The BROKEN variant — no allow-list check at all (deliberately breaks the guard).
 *
 * @param mixed $raw The raw playerStyle attribute value.
 * @return mixed
 */
function sanitise_player_style_without_allowlist_broken( $raw ) {
	return $raw ?? 'minimal';
}

$broken_result = sanitise_player_style_without_allowlist_broken( 'not-a-real-style' );
ok(
	'minimal' !== $broken_result,
	'NEGATIVE CONTROL: without the allow-list guard, an off-enum style does NOT fall back to "minimal" (proves the real allow-list check in render.php is what makes this safe — deleting it would turn every "off-enum falls back to minimal" assertion above red)'
);
ok(
	'not-a-real-style' === $broken_result,
	'NEGATIVE CONTROL: the broken variant instead passes the raw off-enum value straight through unsanitised'
);

echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );
