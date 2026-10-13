<?php
/**
 * Standalone tests for the sgs/button and sgs/form submit-button additions:
 *   1. The shared hover lift (includes/helpers-hover-lift.php) prints byte-for-byte what
 *      sgs/button's render.php printed before the lift moved into it. A literal copy of the
 *      pre-move code runs beside the helper over every input.
 *   2. sgs/form's submit button: resting shadow, hover shadow, preset hover shadow, automatic
 *      lift and hover lift paint the expected CSS; the lift-attribute prefix reads the
 *      `submit*` names and leaves the block-root names alone; every default prints nothing.
 *   3. sgs/button `labelFromSiteInfo`: the Site Info value becomes the label for a phone, email
 *      or WhatsApp link source; an empty field, another link source, or the switch off keeps
 *      the typed label; the value is escaped.
 *   4. sgs/button `iconBackground` / `iconBackgroundHover` / `iconShapeSize`: the circle paints,
 *      and an untouched icon prints no circle rule.
 *
 * Render-level cases run the real render.php in a child PHP process through
 * scripts/qa/lib/render-css-harness.php (Site Info is seeded with SGS_QA_OPTIONS).
 *
 *   php plugins/sgs-blocks/tests/php/run-button-form-motion-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing
// phpcs:disable WordPress.WP.AlternativeFunctions
// phpcs:disable WordPress.PHP.DiscouragedPHP

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}
if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $text ): string {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}
if ( ! function_exists( 'wp_get_global_settings' ) ) {
	function wp_get_global_settings( array $path ) {
		return null;
	}
}

require_once dirname( __DIR__, 2 ) . '/includes/helpers-hover-lift.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-shadow-hover.php';

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
 * Render a real block in a child process.
 *
 * @param string               $slug    Block slug.
 * @param array<string, mixed> $attrs   Block attributes.
 * @param array<string, mixed> $options Seeded WordPress options (Site Info lives in `sgs_site_info`).
 * @return array{html:string,css:string}
 */
function render_block_child( string $slug, array $attrs, array $options = array() ): array {
	$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
	$attrs_f = tempnam( sys_get_temp_dir(), 'sgsat' );
	$ctx_f   = tempnam( sys_get_temp_dir(), 'sgsct' );
	file_put_contents( $attrs_f, json_encode( (object) $attrs ) );
	file_put_contents( $ctx_f, '{}' );
	putenv( $options ? 'SGS_QA_OPTIONS=' . json_encode( $options ) : 'SGS_QA_OPTIONS' );
	$out = (string) shell_exec(
		escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $harness ) . ' --slug ' . escapeshellarg( $slug )
		. ' --attrs-file ' . escapeshellarg( $attrs_f ) . ' --context-file ' . escapeshellarg( $ctx_f ) . ' 2>&1'
	);
	putenv( 'SGS_QA_OPTIONS' );
	unlink( $attrs_f );
	unlink( $ctx_f );
	$decoded = json_decode( $out, true );
	if ( ! is_array( $decoded ) || empty( $decoded['ok'] ) ) {
		echo "FAIL  harness did not render $slug: " . substr( $out, 0, 300 ) . "\n";
		exit( 1 );
	}
	return array(
		'html' => (string) $decoded['html'],
		'css'  => (string) $decoded['css'],
	);
}

/** The button's rendered label text (the span's inner HTML). */
function label_of( string $html ): string {
	return 1 === preg_match( '#<span class="sgs-button__label">(.*?)</span>#s', $html, $m ) ? $m[1] : '';
}

/** Blank the content-hash classes, which depend on the attribute set, so two renders compare. */
function normalise_uid( string $text ): string {
	return (string) preg_replace( '/sgs-(btn|form|container)-[0-9a-f]{6,}/', 'sgs-$1-UID', $text );
}

// =====================================================================
// 1. The shared lift is byte-identical to the pre-move sgs/button code.
// =====================================================================

/** A literal copy of the pre-move code in button/render.php (clamp, declaration, rule). */
function reference_button_lift( $raw, string $uid, float $hover_scale, string $target ): string {
	$hover_lift = null !== $raw ? min( 24, max( 0, (int) $raw ) ) : 0;
	if ( $hover_lift > 0 ) {
		$lift_decls = "translate:0 -{$hover_lift}px";
		if ( abs( $hover_scale - 1.0 ) <= 0.001 || 'face' === $target ) {
			$lift_decls .= ';transform:none';
		}
		return sgs_hover_state_rules( ".{$uid}.sgs-button", $lift_decls );
	}
	return '';
}

function current_button_lift( $raw, string $uid, float $hover_scale, string $target ): string {
	$hover_lift = null !== $raw ? sgs_hover_lift_px( $raw ) : 0;
	if ( $hover_lift > 0 ) {
		return sgs_hover_lift_rule( ".{$uid}.sgs-button", $hover_lift, abs( $hover_scale - 1.0 ) <= 0.001 || 'face' === $target );
	}
	return '';
}

$identical = 0;
$cases     = 0;
foreach ( array( null, 0, -3, 1, 6, 24, 25, 99, '7', '7.9', 'abc', 3.9, true ) as $raw ) {
	foreach ( array( 1.0, 1.1 ) as $scale ) {
		foreach ( array( 'whole', 'face' ) as $target ) {
			++$cases;
			if ( reference_button_lift( $raw, 'sgs-btn-x', $scale, $target ) === current_button_lift( $raw, 'sgs-btn-x', $scale, $target ) ) {
				++$identical;
			}
		}
	}
}
ok( $cases === $identical, "1. lift output byte-identical to the pre-move button code ($identical of $cases input combinations)" );
ok( '' === sgs_hover_lift_rule( '.x', 0 ) && '' === sgs_hover_lift_rule( '.x', -4 ), '1. a lift of 0 or less prints nothing' );
ok( false !== strpos( sgs_hover_lift_rule( '.x', 99 ), 'translate:0 -24px' ), '1. a lift is clamped to 24px' );

// =====================================================================
// 2. The lift-attribute prefix.
// =====================================================================

ok( array( 'lift' => 'shadowLiftOnHover', 'hover' => 'sgsHoverShadow' ) === sgs_shadow_lift_attr_names(), '2. no prefix = the block-root attribute names' );
ok( array( 'lift' => 'submitShadowLiftOnHover', 'hover' => 'submitSgsHoverShadow' ) === sgs_shadow_lift_attr_names( 'submit' ), '2. prefix submit = submit* attribute names' );
ok( false === sgs_shadow_lift_enabled( array( 'submitShadowLiftOnHover' => false ), '', 'submit' ), '2. submitShadowLiftOnHover:false turns the prefixed lift off' );
ok( true === sgs_shadow_lift_enabled( array( 'shadowLiftOnHover' => false ), '', 'submit' ), '2. the block-root switch does not govern the prefixed lift' );
ok( false === sgs_shadow_lift_enabled( array( 'shadowLiftOnHover' => false ) ), '2. the block-root switch still governs the unprefixed lift' );
ok( false === sgs_shadow_lift_enabled( array( 'submitSgsHoverShadow' => 'lg' ), '', 'submit' ), '2. a chosen prefixed hover preset replaces the lift' );
ok( true === sgs_shadow_lift_enabled( array( 'sgsHoverShadow' => 'lg' ), '', 'submit' ), '2. the block-root hover preset does not replace the prefixed lift' );

// =====================================================================
// 3. sgs/form submit button.
// =====================================================================

$form_default_attrs = array( 'submitLabel' => 'Send' );
$form_default       = render_block_child( 'sgs/form', $form_default_attrs );
$form_defaults_set  = render_block_child(
	'sgs/form',
	$form_default_attrs + array(
		'submitLiftHover'         => 0,
		'submitShadow'            => '',
		'submitShadowColour'      => '',
		'submitShadowHover'       => '',
		'submitShadowColourHover' => '',
		'submitShadowLiftOnHover' => true,
		'submitSgsHoverShadow'    => '',
	)
);
ok( normalise_uid( $form_default['html'] ) === normalise_uid( $form_defaults_set['html'] ), '3. NEGATIVE CONTROL: every new form attribute at its default renders exactly as a form without them' );
ok( false === strpos( $form_default['css'], 'translate' ) && false === strpos( $form_default['css'], 'prefers-reduced-motion:reduce){.sgs-form' ), '3. a default form prints no submit lift or motion rule' );

$draft = render_block_child(
	'sgs/form',
	$form_default_attrs + array(
		'submitLiftHover'         => 2,
		'submitShadow'            => '0 4px 14px -6px',
		'submitShadowColour'      => '#0a7ea880',
		'submitShadowHover'       => '0 12px 26px -8px',
		'submitShadowColourHover' => '#0a7ea899',
	)
);
ok( 1 === preg_match( '/\.sgs-form-[0-9a-f]+ \.sgs-form__button--submit\{box-shadow:0px 4px 14px -6px #0a7ea880;/', $draft['css'] ), '3. the resting submit shadow paints' );
ok( 1 === preg_match( '/\.sgs-form__button--submit:hover\{box-shadow:0px 12px 26px -8px #0a7ea899\}/', $draft['css'] ), '3. the hover submit shadow paints' );
ok( 1 === preg_match( '/\.sgs-form__button--submit:hover\{translate:0 -2px\}/', $draft['css'] ), '3. the hover lift paints translate:0 -2px' );
ok( false !== strpos( $draft['css'], 'translate .2s,box-shadow .2s' ), '3. the lift and shadow animate' );

$auto = render_block_child( 'sgs/form', $form_default_attrs + array( 'submitShadow' => '0 4px 14px -6px', 'submitShadowColour' => '#0a7ea880' ) );
ok( 1 === preg_match( '/\.sgs-form__button--submit:hover\{box-shadow:0px 5px 18px -6px #0a7ea880\}/', $auto['css'] ), '3. a resting shadow alone lifts automatically on hover' );
$auto_off = render_block_child( 'sgs/form', $form_default_attrs + array( 'submitShadow' => '0 4px 14px -6px', 'submitShadowColour' => '#0a7ea880', 'submitShadowLiftOnHover' => false ) );
ok( false === strpos( $auto_off['css'], '.sgs-form__button--submit:hover{box-shadow' ), '3. submitShadowLiftOnHover:false prints no automatic hover shadow' );
$preset = render_block_child( 'sgs/form', $form_default_attrs + array( 'submitShadow' => '0 4px 14px -6px', 'submitShadowColour' => '#0a7ea880', 'submitSgsHoverShadow' => 'lg' ) );
ok( false !== strpos( $preset['css'], '.sgs-form__button--submit:hover{box-shadow:var(--wp--preset--shadow--lg)}' ), '3. a chosen hover preset paints on hover' );
$lift_only = render_block_child( 'sgs/form', $form_default_attrs + array( 'submitLiftHover' => 99 ) );
ok( false !== strpos( $lift_only['css'], 'translate:0 -24px' ), '3. a lift alone paints, clamped to 24px' );

// =====================================================================
// 4. sgs/button label from Site Info.
// =====================================================================

$info = array(
	'sgs_site_info' => array(
		'phone'   => '020 7946 0958',
		'email'   => 'hello@example.test',
		'socials' => array( 'whatsapp' => 'https://wa.me/447700900123' ),
	),
);
$typed = array( 'label' => 'Call us' );

foreach ( array(
	'phone'    => '020 7946 0958',
	'email'    => 'hello@example.test',
	'whatsapp' => '+447700900123',
) as $source => $expected ) {
	$on = render_block_child( 'sgs/button', $typed + array( 'linkSource' => $source, 'labelFromSiteInfo' => true ), $info );
	ok( $expected === label_of( $on['html'] ), "4. $source: the label prints the Site Info value ($expected)" );
}
$off = render_block_child( 'sgs/button', $typed + array( 'linkSource' => 'phone', 'labelFromSiteInfo' => false ), $info );
ok( 'Call us' === label_of( $off['html'] ), '4. NEGATIVE CONTROL: switch off keeps the typed label' );
$unset = render_block_child( 'sgs/button', $typed + array( 'linkSource' => 'phone' ), $info );
ok( 'Call us' === label_of( $unset['html'] ), '4. NEGATIVE CONTROL: attribute absent keeps the typed label' );
$url_source = render_block_child( 'sgs/button', $typed + array( 'linkSource' => 'url', 'labelFromSiteInfo' => true ), $info );
ok( 'Call us' === label_of( $url_source['html'] ), '4. a URL link source keeps the typed label' );
$empty_field = render_block_child( 'sgs/button', $typed + array( 'linkSource' => 'phone', 'labelFromSiteInfo' => true ), array( 'sgs_site_info' => array() ) );
ok( 'Call us' === label_of( $empty_field['html'] ), '4. an empty Site Info field falls back to the typed label' );
$bad_email = render_block_child( 'sgs/button', $typed + array( 'linkSource' => 'email', 'labelFromSiteInfo' => true ), array( 'sgs_site_info' => array( 'email' => 'not-an-email' ) ) );
ok( 'Call us' === label_of( $bad_email['html'] ), '4. an invalid email falls back to the typed label' );
$hostile = render_block_child( 'sgs/button', $typed + array( 'linkSource' => 'phone', 'labelFromSiteInfo' => true ), array( 'sgs_site_info' => array( 'phone' => '<script>alert(1)</script>0207 & 1' ) ) );
ok( false === strpos( label_of( $hostile['html'] ), '<script' ), '4. markup in the Site Info value is not printed' );
ok( false !== strpos( label_of( $hostile['html'] ), '&amp; 1' ), '4. an ampersand in the value is escaped' );

// =====================================================================
// 5. sgs/button circle behind the icon.
// =====================================================================

$icon_attrs = array( 'label' => 'Go', 'icon' => 'arrow-right', 'iconSize' => array( 'desktop' => 18 ) );
$plain_icon = render_block_child( 'sgs/button', $icon_attrs );
$with_none  = render_block_child( 'sgs/button', $icon_attrs + array( 'iconBackground' => '', 'iconBackgroundHover' => '', 'iconShapeSize' => array() ) );
ok( normalise_uid( $plain_icon['html'] ) === normalise_uid( $with_none['html'] ), '5. NEGATIVE CONTROL: empty circle attributes render exactly as an icon without them' );
ok( false === strpos( $plain_icon['css'], 'border-radius:50%' ), '5. an icon without a circle fill prints no circle rule' );
$circle = render_block_child( 'sgs/button', $icon_attrs + array( 'iconBackground' => '#00aa00', 'iconBackgroundHover' => '#ff0000', 'iconShapeSize' => array( 'desktop' => 40, 'mobile' => 32 ) ) );
ok( false !== strpos( $circle['css'], '.sgs-button__icon{display:inline-flex;align-items:center;justify-content:center;flex:none;box-sizing:border-box;border-radius:50%;' ), '5. the circle rule paints' );
ok( false !== strpos( $circle['css'], 'background-color:#00aa00' ), '5. the resting circle fill paints' );
ok( false !== strpos( $circle['css'], '--sgs-btn-icon-shape-size:40px' ) && false !== strpos( $circle['css'], '--sgs-btn-icon-shape-size:32px' ), '5. the diameter prints per device' );
ok( 1 === preg_match( '/\.sgs-button:hover \.sgs-button__icon\{background-color:#ff0000\}/', $circle['css'] ), '5. the hover fill paints on button hover' );
$default_size = render_block_child( 'sgs/button', $icon_attrs + array( 'iconBackground' => '#00aa00' ) );
ok( false !== strpos( $default_size['css'], 'calc(var(--sgs-btn-icon-size,1em)*1.8)' ) && false === strpos( $default_size['css'], '--sgs-btn-icon-shape-size:' ), '5. no diameter = 1.8 times the icon size' );

// =====================================================================
// 6. Existing button output is unchanged (lift + icon colour fixtures).
// =====================================================================

$lift_render = render_block_child( 'sgs/button', array( 'label' => 'Go', 'liftHover' => 6 ) );
ok( 1 === preg_match( '/:hover\{translate:0 -6px;transform:none\}/', $lift_render['css'] ), '6. sgs/button lift renders translate:0 -6px;transform:none on hover' );

echo "\n$pass passed, $fail failed\n";
exit( $fail > 0 ? 1 : 0 );
