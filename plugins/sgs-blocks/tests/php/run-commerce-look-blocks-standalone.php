<?php
/**
 * Standalone test: the look settings of sgs/gift-order, sgs/commerce-note and sgs/free-delivery-bar
 * (Spec 27, FR-30-20 to FR-30-22), and the account sign-in tab link rule.
 *
 * Each setting prints its CSS when set; with none set the block's output carries no look rule (negative control).
 * The two server-rendered blocks run their real render.php through scripts/qa/lib/render-css-harness.php.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-commerce-look-blocks-standalone.php
 *
 * @package SGS\Blocks
 */

// phpcs:disable
define( 'ABSPATH', __DIR__ );

require dirname( __DIR__, 2 ) . '/scripts/qa/lib/wp-stubs.php';
require dirname( __DIR__, 2 ) . '/includes/render-helpers.php';
require dirname( __DIR__, 2 ) . '/includes/gift-order/helpers-gift-order-look.php';

$failures = 0;
function ok( bool $cond, string $label ): void {
	global $failures;
	echo ( $cond ? 'PASS  ' : 'FAIL  ' ) . $label . "\n";
	if ( ! $cond ) {
		++$failures;
	}
}
/**
 * Run a block's real render.php through the CSS harness.
 *
 * @return array{html: string, css: string}
 */
function harness( string $slug, array $attrs ): array {
	$file = tempnam( sys_get_temp_dir(), 'sgsattrs' );
	file_put_contents( $file, json_encode( $attrs ) );
	$cmd = escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php' )
		. ' --slug ' . escapeshellarg( $slug ) . ' --attrs-file ' . escapeshellarg( $file );
	$out = json_decode( (string) shell_exec( $cmd ), true );
	unlink( $file );
	return array(
		'html' => (string) ( $out['html'] ?? '' ),
		'css'  => (string) ( $out['css'] ?? '' ),
	);
}

$box = static fn( string $v ): array => array( 'top' => $v, 'right' => $v, 'bottom' => $v, 'left' => $v );

// sgs/gift-order: panel, tile, field.
ok( '' === sgs_gift_order_look_css( array() ), 'gift: no look settings print nothing' );
$gift = sgs_gift_order_look_css(
	array(
		'giftPanelBackground'          => '#fff7ee',
		'giftPanelBorderWidth'         => $box( '2px' ),
		'giftPanelBorderColour'        => '#112233',
		'giftPanelBorderRadius'        => array( 'desktop' => array( 'topLeft' => '26px', 'topRight' => '26px', 'bottomRight' => '26px', 'bottomLeft' => '26px' ) ),
		'giftPanelPadding'             => array( 'desktop' => $box( '20' ) ),
		'giftTileSelectedBackground'   => '#ffeedd',
		'giftTileSelectedBorderColour' => '#445566',
		'giftTileSelectedShadow'       => '4px 4px 0 #3a2a22',
		'giftTileMinHeight'            => array( 'desktop' => '76px', 'mobile' => 60 ),
		'fieldBackground'              => '#ffffff',
		'fieldBorderColour'            => '#aabbcc',
	)
);
ok( str_contains( $gift, '.sgs-gift-order{background' ) && str_contains( $gift, 'border-color:#112233' ), 'gift: panel fill and border' );
ok( str_contains( $gift, 'border-top-left-radius:26px;' ), 'gift: panel radius' );
ok( str_contains( $gift, 'padding-top:20px;padding-right:20px;' ), 'gift: panel padding' );
ok( str_contains( $gift, '.sgs-gift-order__tile--selected{background' ) && str_contains( $gift, 'border-color:#445566' ), 'gift: chosen tile' );
ok( str_contains( $gift, '.sgs-gift-order__input,.sgs-gift-order .sgs-gift-order__textarea{background' ), 'gift: field fill through the form writer' );
ok( str_contains( $gift, '.sgs-gift-order .sgs-gift-order__input,.sgs-gift-order .sgs-gift-order__textarea{border-color:#aabbcc;}' ), 'gift: field border colour' );

ok( str_contains( $gift, 'box-shadow:4px 4px 0px 0px #3a2a22' ), 'gift: chosen tile shadow' );

ok( str_contains( $gift, '--sgs-gift-tile-min-height:76px;' ) && str_contains( $gift, '--sgs-gift-tile-min-height:60px;' ), 'gift: tile minimum height per device' );
ok( ! str_contains( sgs_gift_order_look_css( array() ), 'min-height' ), 'gift: tile height unset prints nothing' );

// sgs/commerce-note.
$base = array( 'text' => 'Hello', 'linkLabel' => 'Go', 'linkUrl' => 'https://example.test' );
$off  = harness( 'sgs/commerce-note', $base );
ok( '' === $off['css'] && str_contains( $off['html'], '<p class="sgs-commerce-note">' ), 'note: nothing set, markup unchanged' );
$on = harness(
	'sgs/commerce-note',
	$base + array(
		'commerceNoteFontSize'        => array( 'desktop' => 13 ),
		'commerceNoteTextAlign'       => array( 'desktop' => 'center', 'mobile' => 'left' ),
		'commerceNoteLinkColour'      => '#ff0000',
		'commerceNoteLinkColourHover' => '#00ff00',
	)
);
ok( str_contains( $on['css'], 'font-size:13px' ) && str_contains( $on['css'], 'text-align:center' ), 'note: typography and alignment' );
$wt = harness( 'sgs/commerce-note', $base + array( 'commerceNoteLinkFontWeight' => '700' ) );
ok( str_contains( $wt['css'], 'a{font-weight:700;}' ), 'note: link weight' );
ok( ! str_contains( $on['css'], 'font-weight' ), 'note: link weight unset prints nothing' );
ok( str_contains( $on['css'], '.sgs-commerce-note__link{color:#ff0000}' ) && str_contains( $on['css'], 'color:#00ff00' ), 'note: link colour and hover' );

// sgs/free-delivery-bar: track border.
$fd_off = harness( 'sgs/free-delivery-bar', array( 'freeDeliveryThresholdOverride' => '35' ) );
ok( ! str_contains( $fd_off['css'], '__track{border' ), 'bar: no track border while unset' );
$fd_on = harness(
	'sgs/free-delivery-bar',
	array(
		'freeDeliveryThresholdOverride' => '35',
		'freeDeliveryTrackBorderWidth'  => $box( '1px' ),
		'freeDeliveryTrackBorderColour' => '#ff0000',
	)
);
ok( str_contains( $fd_on['css'], '.sgs-free-delivery-bar__track{border-style:solid;border-width:1px 1px 1px 1px;border-color:#ff0000;}' ), 'bar: track border' );

// sgs/hero: content stack gap.
$hero_off = harness( 'sgs/hero', array() );
ok( ! str_contains( $hero_off['css'], 'sgs-hero__content{gap' ), 'hero: content gap unset prints nothing' );
$hero_on = harness( 'sgs/hero', array( 'contentGap' => array( 'desktop' => '12px', 'mobile' => 8 ) ) );
ok( str_contains( $hero_on['css'], '.sgs-hero__content{gap:12px;}' ) && str_contains( $hero_on['css'], '.sgs-hero__content{gap:8px;}' ), 'hero: content gap per device' );

// sgs/account: the content-link rule no longer reaches the sign-in tabs.
$css = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/account/style.css' );
ok( str_contains( $css, '.sgs-account__quick-card, .sgs-account__auth-tab))' ), 'account: tabs excluded from the content-link rule' );
$php = (string) file_get_contents( dirname( __DIR__, 2 ) . '/includes/account/helpers-account-render-css.php' );
ok( str_contains( $php, '.sgs-account__quick-card, .sgs-account__auth-tab))' ), 'account: content-link colour excludes the tabs' );

echo $failures ? "\n$failures FAILED\n" : "\nAll passed\n";
exit( $failures ? 1 : 0 );
