<?php
/**
 * Tests: the built-in button migration's rename and reshape (scripts/lib/builtin-button-sweep.php, which the WP-CLI sweep
 * scripts/sweep-builtin-button-attrs.php runs over saved content).
 *
 * The cases run the real functions in a child process. They pin every row of scripts/data/builtin-button-renames.json for the three
 * migrated blocks (the buy box's Add to Cart, the product card's CTAs, the account's sign-in and register buttons), the values Mama's saved,
 * idempotence, that a block of another name carrying the same attribute names (sgs/pricing-table's `ctaFontSize`) is never touched,
 * and that the bytes of a post outside a block delimiter's attributes stay as they were.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter ButtonMigrationSweepTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

final class ButtonMigrationSweepTest extends TestCase {

	/** @param array<string, array<string, mixed>> $cases @return array<string, mixed> */
	private static function run_cases( array $cases ): array {
		$file = tempnam( sys_get_temp_dir(), 'sgsbm' );
		file_put_contents( $file, json_encode( $cases, JSON_THROW_ON_ERROR ) );
		try {
			$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( __DIR__ . '/run-button-migration-sweep-standalone.php' ) . ' ' . escapeshellarg( $file ) . ' 2>&1' );
		} finally {
			unlink( $file );
		}
		$start   = strpos( $out, '{' );
		$decoded = false === $start ? null : json_decode( substr( $out, $start ), true );
		if ( ! is_array( $decoded ) ) {
			throw new RuntimeException( 'runner failed: ' . $out );
		}
		return $decoded;
	}

	/** @return array<string, mixed> The sweep of one block's attributes. */
	private static function attrs( string $block, array $attrs ): array {
		return self::run_cases( array( 'c' => array( 'fn' => 'attrs', 'block' => $block, 'attrs' => $attrs ) ) )['c'];
	}

	public function test_every_rename_moves_the_value_to_the_kit_name(): void {
		$cases = array(
			'sgs/buybox'  => array( 'addToCartBackgroundColour' => 'mm-yellow', 'addToCartBorderColour' => 'mm-cocoa' ),
			'sgs/account' => array(
				'loginButtonBackground'      => 'a',
				'loginButtonText'            => 'b',
				'loginButtonBackgroundHover' => 'c',
				'loginButtonTextHover'       => 'd',
				'loginButtonBorderColour'    => 'e',
				'loginButtonPreset'          => 'primary',
				'registerButtonPreset'       => 'secondary',
			),
		);
		$this->assertSame( array( 'addToCartColourBackground' => 'mm-yellow', 'addToCartColourBorder' => 'mm-cocoa' ), self::attrs( 'sgs/buybox', $cases['sgs/buybox'] ) );
		$this->assertSame(
			array(
				'loginButtonColourBackground'      => 'a',
				'loginButtonColourText'            => 'b',
				'loginButtonColourBackgroundHover' => 'c',
				'loginButtonColourTextHover'       => 'd',
				'loginButtonColourBorder'          => 'e',
				'loginButtonStyle'                 => 'primary',
				'registerButtonStyle'              => 'secondary',
			),
			self::attrs( 'sgs/account', $cases['sgs/account'] )
		);
	}

	public function test_every_reshape_gives_the_kit_shape(): void {
		$box = array( 'top' => '16px', 'right' => '0px', 'bottom' => '16px', 'left' => '0px' );
		$this->assertSame( array( 'addToCartMinHeight' => array( 'desktop' => '64px' ) ), self::attrs( 'sgs/buybox', array( 'addToCartMinHeight' => '64px' ) ), 'a min height string becomes a desktop value' );
		$this->assertSame( array( 'addToCartPadding' => array( 'desktop' => $box ) ), self::attrs( 'sgs/buybox', array( 'addToCartPadding' => $box ) ), 'a flat padding box becomes a desktop box' );
		$card = self::attrs(
			'sgs/product-card',
			array(
				'ctaFontSize'     => 15,
				'ctaLineHeight'   => '1.6',
				'ctaPadding'      => $box,
				'ctaBorderRadius' => array( 'topLeft' => '999px', 'topRight' => '999px', 'bottomLeft' => '999px', 'bottomRight' => '999px' ),
				'ctaWidthType'    => 'full',
			)
		);
		$this->assertSame( array( 'desktop' => 15 ), $card['ctaFontSize'] );
		$this->assertSame( array( 'desktop' => '1.6' ), $card['ctaLineHeight'] );
		$this->assertSame( array( 'desktop' => $box ), $card['ctaPadding'] );
		$this->assertSame( 'full', $card['ctaWidthType'], 'full stays' );
		$this->assertSame( array( 'desktop' => array( 'topLeft' => '999px', 'topRight' => '999px', 'bottomLeft' => '999px', 'bottomRight' => '999px' ) ), $card['ctaBorderRadius'] );
		$this->assertSame( array(), self::attrs( 'sgs/product-card', array( 'ctaWidthType' => 'fit' ) ), 'a saved fit is dropped: the kit prints fit as fit-content, and fit was the default that printed no width' );
		$this->assertSame( array( 'loginButtonWidthType' => 'full' ), self::attrs( 'sgs/account', array( 'loginButtonFullWidth' => true ) ), 'true becomes full' );
		$this->assertSame( array(), self::attrs( 'sgs/account', array( 'loginButtonFullWidth' => false ) ), 'false is unset' );
	}

	public function test_a_cleared_value_stays_cleared_as_an_empty_object(): void {
		$out = self::run_cases(
			array(
				'c' => array(
					'fn'      => 'content',
					'blocks'  => array( 'sgs/product-card' ),
					'content' => '<!-- wp:sgs/product-card {"ctaLineHeight":"","ctaFontSize":""} /-->',
				),
			)
		)['c'];
		$this->assertSame( '<!-- wp:sgs/product-card {"ctaLineHeight":{},"ctaFontSize":{}} /-->', $out['content'], 'an explicit empty overrides the 1.4 default, so it stays saved, as {} and not []' );
	}

	public function test_the_proof_takes_a_cleared_value_read_back_as_the_rewrite(): void {
		$out = self::run_cases(
			array(
				'cleared' => array( 'fn' => 'same', 'block' => 'sgs/product-card', 'attrs' => array( 'ctaLineHeight' => '', 'ctaFontSize' => '' ) ),
				'set'     => array( 'fn' => 'same', 'block' => 'sgs/product-card', 'attrs' => array( 'ctaLineHeight' => '1.2' ) ),
			)
		);
		$this->assertTrue( $out['cleared'], 'MUST FAIL on c1a832ea6: {} written is [] parsed back, so the proof refused every post with a cleared value and the run ended in an error' );
		$this->assertTrue( $out['set'] );
	}

	public function test_the_proof_still_refuses_a_different_value(): void {
		$file = dirname( __DIR__, 2 ) . '/scripts/lib/builtin-button-sweep.php';
		$this->assertStringContainsString( 'function sgs_builtin_button_sweep_same_attrs', (string) file_get_contents( $file ) );
		require_once $file;
		$this->assertFalse( sgs_builtin_button_sweep_same_attrs( array( 'a' => array( 'desktop' => '1px' ) ), array( 'a' => array( 'desktop' => '2px' ) ) ) );
		$this->assertFalse( sgs_builtin_button_sweep_same_attrs( array( 'a' => 1 ), array( 'a' => 1, 'b' => 2 ) ) );
		$this->assertTrue( sgs_builtin_button_sweep_same_attrs( array( 'b' => 2, 'a' => new stdClass() ), array( 'a' => array(), 'b' => 2 ) ) );
		// MUST FAIL on dda55a2c4: two values json_encode cannot encode (a stray byte) both gave false, and false === false passed.
		$this->assertFalse( sgs_builtin_button_sweep_same_attrs( array( 'a' => "caf\xE9" ), array( 'a' => "caf\xE8" ) ) );
		$this->assertTrue( sgs_builtin_button_sweep_same_attrs( array( 'a' => "caf\xE9" ), array( 'a' => "caf\xE9" ) ) );
	}

	public function test_it_is_idempotent_and_a_value_already_swept_is_left_alone(): void {
		$old = array( 'addToCartBackgroundColour' => 'x', 'addToCartMinHeight' => '64px', 'addToCartPadding' => array( 'top' => '1px' ), 'addToCartStyle' => 'primary' );
		$one = self::attrs( 'sgs/buybox', $old );
		$this->assertSame( $one, self::attrs( 'sgs/buybox', $one ), 'a second pass changes nothing' );
		$both = self::attrs( 'sgs/buybox', array( 'addToCartBackgroundColour' => 'old', 'addToCartColourBackground' => 'new' ) );
		$this->assertSame( array( 'addToCartColourBackground' => 'new' ), $both, 'when both names are saved the new one wins' );
	}

	public function test_a_block_of_another_name_with_the_same_attribute_names_is_never_touched(): void {
		$pricing = array( 'ctaFontSize' => array( 'desktop' => 14 ), 'ctaLineHeight' => '1.2', 'ctaPadding' => array( 'top' => '4px' ) );
		$this->assertSame( $pricing, self::attrs( 'sgs/pricing-table', $pricing ), 'MUST FAIL: sgs/pricing-table declares ctaFontSize, ctaLineHeight and ctaPadding of its own' );
		$content = '<!-- wp:sgs/pricing-table {"ctaLineHeight":"1.2","ctaPadding":{"top":"4px"}} /-->';
		$out     = self::run_cases( array( 'c' => array( 'fn' => 'content', 'blocks' => array( 'sgs/buybox', 'sgs/product-card', 'sgs/account' ), 'content' => $content ) ) )['c'];
		$this->assertSame( $content, $out['content'] );
		$this->assertSame( array(), $out['changed'] );
	}

	public function test_content_changes_only_the_delimiters_of_the_named_blocks_and_nothing_else(): void {
		$content = "<!-- wp:group {\"className\":\"a--b\"} -->\n<div class=\"wp-block-group\"><!-- wp:sgs/buybox {\"addToCartBackgroundColour\":\"mm-yellow\",\"addToCartMinHeight\":\"64px\",\"productId\":5} /-->\n"
			. "<!-- wp:sgs/product-card {\"ctaFontSize\":15,\"ctaPadding\":{\"top\":\"16px\"},\"ctaText\":\"A <b>--</b> & b\"} /-->\n"
			. "<!-- wp:sgs/account {\"loginButtonFullWidth\":true,\"loginButtonScope\":\"all-forms\"} /-->\n"
			. "<!-- wp:sgs/buybox /--><!-- wp:sgs/buybox {\"productId\":6} /--></div>\n<!-- /wp:group -->";
		$out = self::run_cases( array( 'c' => array( 'fn' => 'content', 'blocks' => array( 'sgs/buybox', 'sgs/product-card', 'sgs/account' ), 'content' => $content ) ) )['c'];
		$this->assertSame( array( 'sgs/buybox' => 1, 'sgs/product-card' => 1, 'sgs/account' => 1 ), $out['changed'], 'three delimiters change; a bare delimiter and one with no old name do not' );
		$this->assertSame( 1, $out['attrs']['sgs/buybox::addToCartMinHeight'] );
		$this->assertSame( 1, $out['attrs']['sgs/account::loginButtonFullWidth'] );
		$this->assertStringContainsString( '"addToCartColourBackground":"mm-yellow"', $out['content'] );
		$this->assertStringContainsString( '"addToCartMinHeight":{"desktop":"64px"}', $out['content'] );
		$this->assertStringContainsString( '"ctaFontSize":{"desktop":15}', $out['content'] );
		$this->assertStringContainsString( '"loginButtonWidthType":"full"', $out['content'] );
		$esc = static fn( string $hex ): string => chr( 92 ) . 'u' . $hex;
		$this->assertStringContainsString( '"ctaText":"A ' . $esc( '003c' ) . 'b' . $esc( '003e' ) . $esc( '002d' ) . $esc( '002d' ) . $esc( '003c' ) . '/b' . $esc( '003e' ) . ' ' . $esc( '0026' ) . ' b"', $out['content'], 'the other attributes are written the way WordPress writes them' );
		$this->assertStringContainsString( '<!-- wp:group {"className":"a--b"} -->', $out['content'], 'another block is left byte for byte' );
		$this->assertStringContainsString( '<!-- wp:sgs/buybox /--><!-- wp:sgs/buybox {"productId":6} /-->', $out['content'] );
		$again = self::run_cases( array( 'c' => array( 'fn' => 'content', 'blocks' => array( 'sgs/buybox', 'sgs/product-card', 'sgs/account' ), 'content' => $out['content'] ) ) )['c'];
		$this->assertSame( $out['content'], $again['content'], 'idempotent' );
		$this->assertSame( array(), $again['changed'] );
	}

	public function test_the_choice_flow_back_radius_saved_flat_becomes_per_device(): void {
		// choice-flow's render reads backBorderRadius per device since it joined the kit; a saved flat corner object would
		// otherwise print no radius.
		$flat  = array( 'topLeft' => '4px', 'topRight' => '4px', 'bottomLeft' => '4px', 'bottomRight' => '4px' );
		$swept = self::attrs( 'sgs/choice-flow', array( 'backBorderRadius' => $flat ) );
		$this->assertSame( array( 'backBorderRadius' => array( 'desktop' => $flat ) ), $swept );
		$this->assertSame( $swept, self::attrs( 'sgs/choice-flow', $swept ), 'a second pass changes nothing' );
	}

	/** @param array<string, array<string, mixed>> $cases @return array<string, mixed> The account button kit runner's output. */
	private static function run_kit( array $cases ): array {
		$file = tempnam( sys_get_temp_dir(), 'sgsak' );
		file_put_contents( $file, json_encode( $cases, JSON_THROW_ON_ERROR ) );
		try {
			$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( __DIR__ . '/run-account-button-kit-standalone.php' ) . ' ' . escapeshellarg( $file ) . ' 2>&1' );
		} finally {
			unlink( $file );
		}
		$decoded = json_decode( substr( $out, (int) strpos( $out, '{' ) ), true );
		if ( ! is_array( $decoded ) ) {
			throw new RuntimeException( 'runner failed: ' . $out );
		}
		return $decoded;
	}

	/** @return array<string, array<int, array<string, mixed>>> The account empty button merge map's rows by block. */
	private static function account_merge_map(): array {
		$data = json_decode( (string) file_get_contents( dirname( __DIR__, 2 ) . '/scripts/data/account-empty-button-renames.json' ), true, 512, JSON_THROW_ON_ERROR );
		$by   = array();
		foreach ( $data['renames'] as $row ) {
			$by[ $row['block'] ][] = $row;
		}
		return $by;
	}

	/** @return array<string, mixed> The sweep of one block's attributes through the account empty button merge map. */
	private static function merged( array $attrs ): array {
		return self::run_cases( array( 'c' => array( 'fn' => 'attrs', 'block' => 'sgs/account', 'attrs' => $attrs, 'map' => self::account_merge_map() ) ) )['c'];
	}

	public function test_the_empty_orders_button_settings_fold_into_the_kits_and_the_old_keys_go(): void {
		$old = array(
			'ordersEmptyButtonPadding'   => array( 'desktop' => array( 'left' => '26px', 'right' => '26px' ) ),
			'ordersEmptyButtonMinHeight' => array( 'desktop' => '52px', 'mobile' => '44px' ),
			'ordersEmptyButtonLabel'     => 'Shop',
		);
		$expect = array(
			'emptyStatePadding'      => array( 'desktop' => array( 'left' => '26px', 'right' => '26px' ) ),
			'emptyStateMinHeight'    => array( 'desktop' => '52px', 'mobile' => '44px' ),
			'ordersEmptyButtonLabel' => 'Shop',
		);
		$got    = self::merged( $old );
		ksort( $expect );
		ksort( $got );
		$this->assertSame( $expect, $got, 'the values move to the kit names, the label (a different setting) stays where it was' );
	}

	public function test_a_device_or_side_the_kit_setting_holds_keeps_its_value_and_the_old_one_fills_the_rest(): void {
		$both = self::merged(
			array(
				'ordersEmptyButtonPadding'   => array( 'desktop' => array( 'top' => '4px', 'left' => '26px' ), 'tablet' => array( 'left' => '10px' ) ),
				'emptyStatePadding'          => array( 'desktop' => array( 'top' => '9px' ) ),
				'ordersEmptyButtonMinHeight' => array( 'desktop' => '52px', 'tablet' => '48px' ),
				'emptyStateMinHeight'        => array( 'desktop' => '60px' ),
			)
		);
		$this->assertSame( array( 'desktop' => array( 'top' => '9px', 'left' => '26px' ), 'tablet' => array( 'left' => '10px' ) ), $both['emptyStatePadding'], 'the kit wins side by side (its rule weighs more); the old setting paints the sides the kit leaves' );
		$this->assertSame( array( 'desktop' => '60px' ), $both['emptyStateMinHeight'], 'the kit prints desktop 60px as a base rule, which beats the old tablet 48px at every width (same weight, printed later): no tablet tier is kept' );
		$this->assertArrayNotHasKey( 'ordersEmptyButtonPadding', $both );
		$this->assertArrayNotHasKey( 'ordersEmptyButtonMinHeight', $both );
		$this->assertSame( $both, self::merged( $both ), 'a second pass changes nothing' );
	}

	public function test_the_merged_value_paints_what_the_pair_painted_at_every_width(): void {
		// The kit's rule weighs the same as the old setting's and prints after it, so the kit paints wherever it prints a value (its own
		// tier or one inherited from a wider tier) and the old setting paints only where the kit prints nothing.
		$cases = array(
			'kit desktop beats old tablet and mobile'   => array( array( 'desktop' => '52px', 'tablet' => '48px', 'mobile' => '40px' ), array( 'desktop' => '60px' ), array( 'desktop' => '60px' ) ),
			'kit tablet beats old mobile, old desktop'  => array( array( 'desktop' => '52px', 'mobile' => '40px' ), array( 'tablet' => '44px' ), array( 'desktop' => '52px', 'tablet' => '44px' ) ),
			'kit mobile only, old fills desktop, tablet' => array( array( 'desktop' => '52px', 'tablet' => '48px' ), array( 'mobile' => '40px' ), array( 'desktop' => '52px', 'tablet' => '48px', 'mobile' => '40px' ) ),
			'a tier equal to what it inherits is kept out' => array( array( 'tablet' => '60px' ), array( 'desktop' => '60px' ), array( 'desktop' => '60px' ) ),
			'an empty kit value prints nothing'         => array( array( 'desktop' => '52px', 'tablet' => '48px' ), array( 'desktop' => '' ), array( 'desktop' => '52px', 'tablet' => '48px' ) ),
		);
		foreach ( $cases as $name => list( $old, $kit, $want ) ) {
			$got = self::merged( array( 'ordersEmptyButtonMinHeight' => $old, 'emptyStateMinHeight' => $kit ) );
			$this->assertSame( $want, $got['emptyStateMinHeight'], $name );
		}
		$pad = self::merged(
			array(
				'ordersEmptyButtonPadding' => array( 'desktop' => array( 'top' => '4px', 'left' => '26px' ), 'tablet' => array( 'top' => '2px' ) ),
				'emptyStatePadding'        => array( 'desktop' => array( 'top' => '9px', 'left' => '' ) ),
			)
		);
		$this->assertSame( array( 'desktop' => array( 'top' => '9px', 'left' => '26px' ) ), $pad['emptyStatePadding'], 'the kit wins the top side at every width; its empty left prints nothing, so the old left shows; the old tablet top never showed' );
	}

	public function test_the_merged_kit_value_prints_one_base_rule_where_the_kit_alone_won(): void {
		// Through the real kit printer: old {desktop 52px, tablet 48px} with kit {desktop 60px} used to show 60px at every width.
		$merged = self::merged( array( 'ordersEmptyButtonMinHeight' => array( 'desktop' => '52px', 'tablet' => '48px' ), 'emptyStateMinHeight' => array( 'desktop' => '60px' ) ) );
		$out    = self::run_kit( array( 'css' => array( 'fn' => 'kit_css', 'attrs' => array( 'emptyStateMinHeight' => $merged['emptyStateMinHeight'] ), 'args' => array( '.r' ) ) ) );
		$this->assertStringContainsString( 'min-height:60px', $out['css'] );
		$this->assertStringNotContainsString( '@media', $out['css'], 'no tablet or mobile rule is printed' );
	}

	public function test_a_bare_number_padding_leaf_that_painted_nothing_is_dropped_so_the_kit_does_not_make_it_paint(): void {
		// The old padding row printed `padding-top:16` (no unit: invalid, painted nothing); the kit prints 16px. A unit string and a bare 0 paint.
		$old = array(
			'desktop' => array( 'top' => '16', 'right' => '8px', 'bottom' => 0, 'left' => 12 ),
			'tablet'  => array( 'top' => '4' ),
		);
		$only = self::merged( array( 'ordersEmptyButtonPadding' => $old ) );
		$this->assertSame( array( 'desktop' => array( 'right' => '8px', 'bottom' => 0 ) ), $only['emptyStatePadding'], 'rename path: top and left (bare, painted nothing) and the tablet top are dropped; 8px and a bare 0 stay' );
		$both = self::merged( array( 'ordersEmptyButtonPadding' => $old, 'emptyStatePadding' => array( 'desktop' => array( 'top' => '9px' ) ) ) );
		ksort( $both['emptyStatePadding']['desktop'] );
		$this->assertSame( array( 'desktop' => array( 'bottom' => 0, 'right' => '8px', 'top' => '9px' ) ), $both['emptyStatePadding'], 'merge path: the same leaves are dropped before the fold' );
		$none = self::merged( array( 'ordersEmptyButtonPadding' => array( 'desktop' => array( 'top' => '16' ) ) ) );
		$this->assertArrayNotHasKey( 'emptyStatePadding', $none, 'a padding that painted nothing at all leaves no setting' );
		$this->assertArrayNotHasKey( 'ordersEmptyButtonPadding', $none );
	}

	public function test_the_merge_map_names_the_kit_settings_and_the_block_declares_only_those(): void {
		$json = json_decode( (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/account/block.json' ), true, 512, JSON_THROW_ON_ERROR );
		foreach ( self::account_merge_map()['sgs/account'] as $row ) {
			$this->assertArrayHasKey( $row['new'], $json['attributes'], 'sgs/account declares ' . $row['new'] );
			$this->assertArrayNotHasKey( $row['old'], $json['attributes'], 'sgs/account no longer declares ' . $row['old'] );
		}
	}

	public function test_with_no_map_rows_nothing_changes(): void {
		$content = '<!-- wp:sgs/buybox {"addToCartBackgroundColour":"x"} /-->';
		$out     = self::run_cases( array( 'c' => array( 'fn' => 'content', 'blocks' => array( 'sgs/buybox' ), 'content' => $content, 'map' => array( 'sgs/other' => array() ) ) ) )['c'];
		$this->assertSame( $content, $out['content'], 'MUST FAIL if the sweep renames without a map row: the map is the only source' );
	}

	public function test_the_map_names_only_attributes_the_blocks_declare_after_the_migration(): void {
		$map = json_decode( (string) file_get_contents( dirname( __DIR__, 2 ) . '/scripts/data/builtin-button-renames.json' ), true, 512, JSON_THROW_ON_ERROR );
		foreach ( array( 'sgs/buybox', 'sgs/product-card', 'sgs/account' ) as $block ) {
			$json = json_decode( (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/' . substr( $block, 4 ) . '/block.json' ), true, 512, JSON_THROW_ON_ERROR );
			foreach ( $map['renames'] as $row ) {
				if ( $row['block'] !== $block ) {
					continue;
				}
				$this->assertArrayHasKey( $row['new'], $json['attributes'], $block . ' declares ' . $row['new'] );
				if ( $row['old'] !== $row['new'] ) {
					$this->assertArrayNotHasKey( $row['old'], $json['attributes'], $block . ' no longer declares ' . $row['old'] );
				}
			}
		}
	}
}
