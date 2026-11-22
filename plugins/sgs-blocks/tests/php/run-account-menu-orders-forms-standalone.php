<?php
/**
 * Standalone test: the account block's menu item frame and shadow, order row corners, shadow and spacing, the
 * required-mark switch and the password wording keys (MERGED F-63). Each prints its declarations on the part it names
 * and prints nothing while unset.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-account-menu-orders-forms-standalone.php [path to a plugin copy]
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable
$base = rtrim( $argv[1] ?? dirname( __DIR__, 2 ), '/\\' );
define( 'ABSPATH', $base . '/' );
define( 'SGS_BLOCKS_PATH', ABSPATH );

$GLOBALS['sgs_qa_global_settings'] = array( 'spacing' => array( 'spacingSizes' => array( array( 'slug' => '20' ) ) ) );
require $base . '/scripts/qa/lib/wp-stubs.php';
require $base . '/includes/render-helpers.php';
if ( ! function_exists( 'add_filter' ) ) { function add_filter() {} }
if ( ! function_exists( 'remove_filter' ) ) { function remove_filter() {} }
foreach ( array( 'account/helpers-account-look-css.php', 'account/helpers-account-header.php', 'account/helpers-account-cells-css.php', 'account/class-account-strings.php' ) as $f ) {
	require_once $base . '/includes/' . $f;
}

$failures = 0;
function ok( bool $c, string $label ): void {
	global $failures;
	echo ( $c ? 'PASS ' : 'FAIL ' ) . $label . "\n";
	if ( ! $c ) {
		++$failures;
	}
}

/** True when a rule on exactly this selector holds the declaration (its body may nest a forced-colours rule). */
function has_decl( string $css, string $selector, string $decl ): bool {
	$at = 0;
	while ( false !== ( $at = strpos( $css, $selector . '{', $at ) ) ) {
		$before = $at > 0 ? $css[ $at - 1 ] : '}';
		$body   = substr( $css, $at + strlen( $selector ) + 1 );
		$end    = strpos( $body, ';}' );
		if ( ( '}' === $before || '{' === $before ) && false !== strpos( false === $end ? $body : substr( $body, 0, $end + 1 ), $decl ) ) {
			return true;
		}
		++$at;
	}
	return false;
}

$root = '.x.wp-block-sgs-account';
$item = $root . '.sgs-account nav.woocommerce-MyAccount-navigation li.woocommerce-MyAccount-navigation-link > a';

// 1) Menu item frame and shadow.
$menu = sgs_account_menu_look_css(
	array(
		'menuItemBorderWidth'  => array( 'top' => '1.5px', 'right' => '1.5px', 'bottom' => '1.5px', 'left' => '1.5px' ),
		'menuItemBorderStyle'  => 'solid',
		'menuItemBorderColour' => '#3a2418',
		'menuItemShadow'       => '3px 3px 0 0 #3a2418',
	),
	$root
);
ok( has_decl( $menu, $item, 'border-width:1.5px 1.5px 1.5px 1.5px' ) && has_decl( $menu, $item, 'border-color:#3a2418' ), 'menu items take the border width and colour' );
ok( has_decl( $menu, $item, 'border-style:solid' ), 'menu items take the border style' );
ok( has_decl( $menu, $item, 'box-shadow:3px 3px 0px 0px #3a2418' ), 'menu items take the shadow' );
ok( false === strpos( sgs_account_menu_look_css( array(), $root ), 'woocommerce-MyAccount-navigation-link > a{' ), 'unset: no menu item rule' );

// 2) Order rows: shadow and the gap that turns them into separate cards, for the bordered rows and the row list.
$table = $root . '.sgs-account--orders-rows table.woocommerce-orders-table';
$rows  = sgs_account_orders_look_css(
	array(
		'ordersLook'            => true,
		'ordersRowShadow'       => '0 4px 0 0 #000',
		'ordersRowGap'          => array( 'desktop' => '12px', 'mobile' => '8px' ),
		'ordersRowBorderColour' => '#e0d6c8',
	),
	$root
);
ok( has_decl( $rows, $table . ' .woocommerce-orders-table__row', 'box-shadow:0px 4px 0px 0px #000' ), 'bordered rows take the shadow' );
ok( has_decl( $rows, $table . ' tbody', 'gap:12px' ), 'the gap sits on the row list' );
ok( false !== strpos( $rows, '@media' ) && false !== strpos( $rows, 'gap:8px' ), 'the phone gap prints in its own media rule' );
ok( has_decl( $rows, $table . ' tbody', 'background:none' ) && has_decl( $rows, $table . ' tbody', 'border:0' ), 'with a gap the list drops its hairline fill and frame' );
ok( has_decl( $rows, $table . ' .woocommerce-orders-table__row', 'border:1px solid #e0d6c8' ), 'with a gap each row takes a frame in the rows\' border colour' );
$list = sgs_account_orders_look_css( array( 'ordersRowList' => true, 'ordersRowGap' => array( 'desktop' => '10px' ) ), $root );
ok( has_decl( $list, $root . ' .sgs-account__orders-list', 'gap:10px' ) && has_decl( $list, $root . ' .sgs-account__orders-list .sgs-account__order', 'border:1px solid var(--wp--preset--color--border, #e2e2e2)' ), 'the row list takes the gap, and its rows the theme border colour when no row colour is set' );
$plain = sgs_account_orders_look_css( array( 'ordersLook' => true ), $root );
ok( false === strpos( $plain, 'box-shadow' ) && false === strpos( $plain, 'background:none' ) && false === strpos( $plain, 'gap:' ), 'unset: no shadow, no gap, the joined rows keep their look' );

// 3) Cells: order row corners and the required-mark switch.
$cells = sgs_account_cells_css( array( 'ordersRowRadius' => array( 'desktop' => '14px' ), 'hideRequiredMarks' => true ), $root );
ok( false !== strpos( $cells, '.woocommerce-orders-table__row,' ) && false !== strpos( $cells, '.sgs-account__orders-list .sgs-account__order{border-radius:14px;}' ), 'order rows of either kind take the corner radius' );
ok( has_decl( $cells, $root . '.sgs-account form .required', 'display:none' ), 'hideRequiredMarks hides the required marks in the block\'s forms' );
$none = sgs_account_cells_css( array( 'hideRequiredMarks' => false ), $root );
ok( false === strpos( $none, '.required' ) && false === strpos( $none, 'border-radius' ), 'unset or off: neither prints' );

// 4) Password wording: the two labels apart, the placeholder, the required mark kept.
$wc = '<form class="woocommerce-form woocommerce-form-login login"><p class="form-row"><label for="username">Username or email address&nbsp;<span class="required" aria-hidden="true">*</span></label><input type="text" name="username" id="username" /></p>'
	. '<p class="form-row"><label for="password">Password&nbsp;<span class="required" aria-hidden="true">*</span><span class="screen-reader-text">Required</span></label><input class="input-text" type="password" name="password" id="password" autocomplete="current-password" required aria-required="true" /></p></form>'
	. '<div class="u-column2 col-2"><h2>Register</h2><form class="woocommerce-form woocommerce-form-register register"><p class="form-row"><label for="reg_password">Password&nbsp;<span class="required" aria-hidden="true">*</span></label><input type="password" class="input-text" name="password" id="reg_password" autocomplete="new-password" required /></p></form></div>';
\SGS\Blocks\Account_Strings::begin( array( 'strings' => array( 'passwordLabel' => 'Your password', 'registerPasswordLabel' => 'Choose a password', 'registerPasswordPlaceholder' => 'At least 8 characters & a number' ) ) );
$out = \SGS\Blocks\Account_Strings::password_fields( $wc );
ok( false !== strpos( $out, '<label for="password">Your password&nbsp;<span class="required" aria-hidden="true">*</span><span class="screen-reader-text">Required</span></label>' ), 'the sign-in password label takes its wording and keeps the required mark' );
ok( false !== strpos( $out, '<label for="reg_password">Choose a password&nbsp;<span class="required"' ), 'the create-account password label takes its own wording' );
ok( 1 === preg_match( '#<input placeholder="At least 8 characters &amp; a number" type="password" class="input-text" name="password" id="reg_password"#', $out ), 'the create-account password field takes the placeholder, escaped' );
ok( 1 === substr_count( $out, 'placeholder=' ) && false !== strpos( $out, '<label for="username">Username or email address&nbsp;' ), 'nothing else changes' );
ok( 'Password' === \SGS\Blocks\Account_Strings::filter( 'Password', 'Password', 'woocommerce' ), 'the shared "Password" text is not rewritten through gettext' );
\SGS\Blocks\Account_Strings::end();
\SGS\Blocks\Account_Strings::begin( array( 'strings' => array( 'registerPasswordLabel' => 'Choose a password' ) ) );
$one = \SGS\Blocks\Account_Strings::password_fields( $wc );
ok( false !== strpos( $one, '<label for="password">Password&nbsp;' ) && false !== strpos( $one, '<label for="reg_password">Choose a password&nbsp;' ) && false === strpos( $one, 'placeholder=' ), 'a key left empty leaves its part as WooCommerce printed it' );
\SGS\Blocks\Account_Strings::end();
ok( $wc === \SGS\Blocks\Account_Strings::password_fields( $wc ), 'outside the block render, the markup is untouched' );
$keys = \SGS\Blocks\Account_Strings::supported();
ok( isset( $keys['passwordLabel'], $keys['registerPasswordLabel'], $keys['registerPasswordPlaceholder'] ), 'the three keys are supported (so they survive sanitising)' );
$panel = (string) file_get_contents( $base . '/src/blocks/account/ExtraPanels.js' );
ok( false !== strpos( $panel, "'passwordLabel'" ) && false !== strpos( $panel, "'registerPasswordLabel'" ) && false !== strpos( $panel, "'registerPasswordPlaceholder'" ), 'the Wording panel offers each key' );

// 5) Every new setting is declared on a part and has no default.
$json  = json_decode( (string) file_get_contents( $base . '/src/blocks/account/block.json' ), true );
$attrs = $json['attributes'];
$parts = array();
foreach ( $json['supports']['sgs']['elements'] as $el ) {
	foreach ( (array) ( $el['attrMap'] ?? array() ) as $attr ) {
		$parts[ $attr ] = true;
	}
}
foreach ( array( 'menuItemBorderWidth', 'menuItemBorderStyle', 'menuItemBorderColour', 'menuItemShadow', 'menuItemShadowColour', 'ordersRowRadius', 'ordersRowGap', 'ordersRowShadow', 'ordersRowShadowColour', 'hideRequiredMarks' ) as $name ) {
	ok( isset( $attrs[ $name ] ) && ! array_key_exists( 'default', $attrs[ $name ] ) && isset( $parts[ $name ] ), "$name exists, has no default and is on a part" );
}

echo $failures ? "\n$failures FAILED\n" : "\nALL PASSED\n";
exit( $failures ? 1 : 0 );
