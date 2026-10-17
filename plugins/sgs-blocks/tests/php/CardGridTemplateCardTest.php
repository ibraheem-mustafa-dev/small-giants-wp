<?php
/**
 * Tests: a products-mode sgs/card-grid renders every product through the one template sgs/product-card it holds
 * (the Query Loop post-template model), so the card's own controls reach every card the grid prints.
 *
 *   (a) The template never prints itself: the grid registers with `skip_inner_blocks`, and its render ignores any
 *       `$content` it is handed.
 *   (b) A template-only setting reaches every card: the CTA button's resting and hover colours.
 *   (c) Each card keeps its own product: the template's productId and sourceMode never reach a card.
 *   The page ItemList never counts the template as a product.
 *
 * The grid renders through the REAL render.php in the QA harness (a child process) with `--render-children`, so each
 * card is the real sgs/product-card render.php, over a two-product catalogue (wc-product-stub.php).
 *
 * Run with:
 *   vendor/bin/phpunit --filter CardGridTemplateCardTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class CardGridTemplateCardTest extends TestCase {

	private const PRODUCTS = array(
		array( 'id' => 52, 'name' => 'Oak table', 'price_html' => '£120', 'price' => '120', 'type' => 'simple', 'image_id' => 0, 'short_description' => 'Solid oak.', 'in_stock' => true ),
		array( 'id' => 53, 'name' => 'Ash chair', 'price_html' => '£60', 'price' => '60', 'type' => 'simple', 'image_id' => 0, 'short_description' => 'Ash.', 'in_stock' => true ),
	);

	/** What core would hand the grid as `$content` had it rendered the template. */
	private const TEMPLATE_MARK = 'sgs-qa-template-card-printed';

	private const TEMPLATE = array(
		'sourceMode'                 => 'typed',
		'productId'                  => 999,
		'anchor'                     => 'template-card',
		'ctaColourBackground'        => '#123456',
		'ctaColourBackgroundHover'   => '#abcdef',
		'ctaColourText'              => '#fedcba',
		'ctaColourTextHover'         => '#0f0f0f',
	);

	/**
	 * The grid's real render with its template card and the two-product catalogue.
	 *
	 * @param array<string,mixed> $template The template card's saved attributes.
	 * @return array{html:string,css:string}
	 */
	private function render_grid( array $template ): array {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$files   = array();
		foreach ( array(
			'attrs'   => array( 'source' => 'wc-product' ),
			'product' => self::PRODUCTS,
			'inner'   => array( array( 'name' => 'sgs/product-card', 'attributes' => (object) $template, 'html' => '<div class="' . self::TEMPLATE_MARK . '"></div>' ) ),
		) as $key => $tree ) {
			$files[ $key ] = tempnam( sys_get_temp_dir(), 'sgscg' );
			file_put_contents( $files[ $key ], json_encode( $tree, JSON_THROW_ON_ERROR ) );
		}
		try {
			$cmd = escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $harness )
				. ' --slug sgs/card-grid --attrs-file ' . escapeshellarg( $files['attrs'] )
				. ' --product-file ' . escapeshellarg( $files['product'] )
				. ' --inner-blocks-file ' . escapeshellarg( $files['inner'] )
				. ' --content ' . escapeshellarg( '<div class="' . self::TEMPLATE_MARK . '"></div>' )
				. ' --render-children 2>&1';
			$out = (string) shell_exec( $cmd );
		} finally {
			foreach ( $files as $file ) {
				@unlink( $file );
			}
		}
		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'harness did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render.php failed: ' . ( $decoded['error'] ?? $out ) );
		return array( 'html' => (string) $decoded['html'], 'css' => (string) $decoded['css'] );
	}

	/**
	 * Each printed card root's scope class, in document order (the harness prints no wp-block-* wrapper class, so the
	 * root is the element carrying the card's own `product-card` class).
	 *
	 * @return string[]
	 */
	private static function card_uids( string $html ): array {
		preg_match_all( '/<[a-z]+\b[^>]*\bclass="(?:[^"]*\s)?product-card\s(?:[^"]*\s)?(sgs-pc-[a-z0-9]+)(?:\s[^"]*)?"/', $html, $m );
		return $m[1];
	}

	/**
	 * The declarations of every rule whose selector names the card's CTA under one scope class, in one state: the
	 * text (the CTA itself) or the background (its ::after layer), at rest or on hover.
	 */
	private static function cta_decls( string $css, string $uid, string $state, string $layer ): string {
		$decls = '';
		preg_match_all( '/([^{}]+)\{([^{}]*)\}/', $css, $rules, PREG_SET_ORDER );
		foreach ( $rules as $rule ) {
			foreach ( explode( ',', $rule[1] ) as $selector ) {
				if ( ! str_contains( $selector, '.' . $uid . ' .product-card__view' ) ) {
					continue;
				}
				if ( ( 'hover' === $state ) === str_contains( $selector, ':hover' ) && ( 'background' === $layer ) === str_contains( $selector, '::after' ) ) {
					$decls .= $rule[2] . ';';
				}
			}
		}
		return strtolower( $decls );
	}

	public function test_the_template_card_never_prints(): void {
		$out = $this->render_grid( self::TEMPLATE );
		$this->assertSame( 0, substr_count( $out['html'], self::TEMPLATE_MARK ), 'the grid ignores the $content core would hand it' );
		$this->assertCount( 2, self::card_uids( $out['html'] ), 'one card per product, none for the template' );
	}

	public function test_the_grid_registers_with_skip_inner_blocks(): void {
		if ( ! function_exists( 'add_filter' ) ) {
			function add_filter( ...$args ) { return true; }
		}
		require_once dirname( __DIR__, 2 ) . '/includes/class-card-grid-template.php';
		$settings = \SGS\Blocks\Card_Grid_Template::metadata_settings( array(), array( 'name' => 'sgs/card-grid' ) );
		$this->assertTrue( $settings['skip_inner_blocks'] ?? false, 'core never renders the template before the grid render' );
		$other = \SGS\Blocks\Card_Grid_Template::metadata_settings( array(), array( 'name' => 'sgs/product-card' ) );
		$this->assertArrayNotHasKey( 'skip_inner_blocks', $other, 'only the grid skips its inner blocks' );
		$this->assertStringContainsString( 'class-card-grid-template.php', (string) file_get_contents( dirname( __DIR__, 2 ) . '/includes/class-sgs-blocks.php' ), 'the filter loads before the blocks register' );
	}

	public function test_every_card_carries_the_template_cta_colours_in_both_states(): void {
		$out  = $this->render_grid( self::TEMPLATE );
		$uids = self::card_uids( $out['html'] );
		$this->assertCount( 2, $uids );
		foreach ( $uids as $uid ) {
			$this->assertStringContainsString( 'color:#fedcba', self::cta_decls( $out['css'], $uid, 'rest', 'text' ), $uid . ' resting text colour' );
			$this->assertStringContainsString( 'color:#0f0f0f', self::cta_decls( $out['css'], $uid, 'hover', 'text' ), $uid . ' hover text colour' );
			$this->assertStringContainsString( 'background-color:#123456', self::cta_decls( $out['css'], $uid, 'rest', 'background' ), $uid . ' resting background colour' );
			$this->assertStringContainsString( 'background-color:#abcdef', self::cta_decls( $out['css'], $uid, 'hover', 'background' ), $uid . ' hover background colour' );
		}
	}

	public function test_each_card_keeps_its_own_product(): void {
		$out = $this->render_grid( self::TEMPLATE );
		$this->assertSame( 1, substr_count( $out['html'], '>Oak table<' ), 'product 52 prints its title once' );
		$this->assertSame( 1, substr_count( $out['html'], '>Ash chair<' ), 'product 53 prints its title once' );
		$this->assertSame( 1, substr_count( $out['html'], '"productId":"52"' ), 'one card binds to product 52' );
		$this->assertSame( 1, substr_count( $out['html'], '"productId":"53"' ), 'one card binds to product 53' );
		$this->assertStringNotContainsString( 'id="template-card"', $out['html'], 'the template anchor never repeats on the cards' );
		$this->assertStringNotContainsString( '999', $out['html'], 'no card binds to the template productId' );
	}

	public function test_the_card_attrs_merge_order(): void {
		if ( ! function_exists( 'add_filter' ) ) {
			function add_filter( ...$args ) { return true; }
		}
		require_once dirname( __DIR__, 2 ) . '/includes/class-card-grid-template.php';
		$template = new \stdClass();
		$template->parsed_block = array( 'innerBlocks' => array( array( 'blockName' => 'sgs/product-card', 'attrs' => self::TEMPLATE + array( 'showLadder' => true ) ) ) );
		$attrs = \SGS\Blocks\Card_Grid_Template::card_attrs(
			\SGS\Blocks\Card_Grid_Template::template_attrs( $template ),
			array( 'sourceMode' => 'wc-product', 'productId' => 52 )
		);
		$this->assertSame( 52, $attrs['productId'] );
		$this->assertSame( 'wc-product', $attrs['sourceMode'] );
		$this->assertTrue( $attrs['showLadder'], 'the template setting reaches the card' );
		$this->assertArrayNotHasKey( 'ctaBehaviour', $attrs, 'the grid adds no card setting of its own: an unset template setting keeps the card default' );
		$this->assertArrayNotHasKey( 'anchor', $attrs );
	}

	/** The grid-level card settings the template card's own attributes replace. */
	private const RETIRED = array( 'showLadder', 'showPickers', 'ctaBehaviour', 'productShowLadder' );

	public function test_the_grid_forwards_no_card_settings_of_its_own(): void {
		$dir  = dirname( __DIR__, 2 ) . '/src/blocks/card-grid';
		$json = json_decode( (string) file_get_contents( $dir . '/block.json' ), true );
		foreach ( self::RETIRED as $name ) {
			$this->assertArrayNotHasKey( $name, $json['attributes'], "sgs/card-grid declares no $name: the template card's own attribute governs it" );
		}
		foreach ( glob( $dir . '/*.php' ) as $file ) {
			$this->assertDoesNotMatchRegularExpression( '/\$attributes\[\s*\'(' . implode( '|', self::RETIRED ) . ')\'/', (string) file_get_contents( $file ), basename( $file ) . ' reads no retired grid card setting' );
		}
		foreach ( array( 'edit.js', 'template-preview.js', 'components/collection-panel.js', 'components/ProductsToolsPanel.js' ) as $file ) {
			$this->assertDoesNotMatchRegularExpression( '/setAttributes\(\s*\{\s*(' . implode( '|', self::RETIRED ) . ')\s*:/', (string) file_get_contents( $dir . '/' . $file ), "$file writes no retired grid card setting" );
		}
	}

	/** Two SGS product posts, what a cpt-collection grid renders without WooCommerce. */
	private const POSTS = array(
		array( 'ID' => 41, 'post_type' => 'sgs_product', 'post_title' => 'Oak table', 'post_excerpt' => 'Solid oak.', 'post_status' => 'publish', 'meta' => array( 'sgs_price' => '120' ) ),
		array( 'ID' => 42, 'post_type' => 'sgs_product', 'post_title' => 'Ash chair', 'post_excerpt' => 'Ash.', 'post_status' => 'publish', 'meta' => array( 'sgs_price' => '60' ) ),
	);

	public function test_a_collection_grid_renders_each_post_through_the_template(): void {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$files   = array();
		foreach ( array(
			'attrs' => array( 'source' => 'cpt-collection', 'contentType' => 'sgs_product' ),
			'post'  => self::POSTS,
			'inner' => array( array( 'name' => 'sgs/product-card', 'attributes' => (object) ( array( 'sourceMode' => 'sgs-cpt' ) + self::TEMPLATE ), 'html' => '' ) ),
		) as $key => $tree ) {
			$files[ $key ] = tempnam( sys_get_temp_dir(), 'sgscg' );
			file_put_contents( $files[ $key ], json_encode( $tree, JSON_THROW_ON_ERROR ) );
		}
		try {
			$out = (string) shell_exec(
				escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $harness )
				. ' --slug sgs/card-grid --attrs-file ' . escapeshellarg( $files['attrs'] )
				. ' --post-file ' . escapeshellarg( $files['post'] )
				. ' --inner-blocks-file ' . escapeshellarg( $files['inner'] )
				. ' --content ' . escapeshellarg( '<div class="' . self::TEMPLATE_MARK . '"></div>' )
				. ' --render-children 2>&1'
			);
		} finally {
			foreach ( $files as $file ) {
				@unlink( $file );
			}
		}
		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'harness did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render.php failed: ' . ( $decoded['error'] ?? $out ) );
		$html = (string) $decoded['html'];
		$uids = self::card_uids( $html );
		$this->assertCount( 2, $uids, 'one card per post, none for the template: ' . $html );
		$this->assertSame( 0, substr_count( $html, self::TEMPLATE_MARK ), 'the template never prints' );
		// The harness has no title store (get_the_title() is ''), so each card's own post shows in its excerpt and price.
		$this->assertSame( 1, substr_count( $html, 'Solid oak.' ), 'post 41 prints its own excerpt once' );
		$this->assertSame( 1, substr_count( $html, '>120.00<' ), 'post 41 prints its own price once' );
		$this->assertSame( 1, substr_count( $html, '>60.00<' ), 'post 42 prints its own price once' );
		$this->assertStringNotContainsString( 'id="template-card"', $html );
		foreach ( $uids as $uid ) {
			$this->assertStringContainsString( 'color:#fedcba', self::cta_decls( (string) $decoded['css'], $uid, 'rest', 'text' ), $uid . ' resting text colour' );
			$this->assertStringContainsString( 'color:#0f0f0f', self::cta_decls( (string) $decoded['css'], $uid, 'hover', 'text' ), $uid . ' hover text colour' );
		}
	}

	/** Load the shared results helper with the WordPress functions Grid_Pagination calls. */
	private static function load_results(): void {
		foreach ( array( '__', 'esc_attr', 'esc_html', 'esc_url', 'sanitize_html_class', 'wp_unslash', 'sanitize_text_field' ) as $fn ) {
			if ( ! function_exists( $fn ) ) {
				eval( 'function ' . $fn . '( $v, ...$r ) { return is_string( $v ) ? trim( $v ) : $v; }' );
			}
		}
		if ( ! function_exists( 'absint' ) ) {
			function absint( $v ) { return abs( (int) $v ); }
		}
		if ( ! function_exists( 'sanitize_key' ) ) {
			function sanitize_key( $v ) { return strtolower( (string) preg_replace( '/[^a-z0-9_\-]/i', '', (string) $v ) ); }
		}
		if ( ! defined( 'ABSPATH' ) ) {
			define( 'ABSPATH', __DIR__ );
		}
		require_once dirname( __DIR__, 2 ) . '/includes/class-grid-pagination.php';
		require_once dirname( __DIR__, 2 ) . '/includes/class-card-grid-results.php';
	}

	public function test_the_empty_state_message_is_the_one_the_page_prints(): void {
		self::load_results();
		$results = \SGS\Blocks\Card_Grid_Results::class;
		$this->assertSame( 'Back soon', $results::empty_message( array( 'source' => 'cpt-collection', 'emptyMessage' => ' Back soon ' ), true ) );
		$this->assertSame( 'Sold out', $results::empty_message( array( 'source' => 'wc-product', 'productEmptyMessage' => 'Sold out', 'emptyMessage' => 'x' ), true ), 'products mode reads its own message' );
		$this->assertSame( '', $results::empty_message( array( 'source' => 'wc-product' ), true ), 'with none set, visitors see nothing' );
		$this->assertStringContainsString( 'Nothing to show yet', $results::empty_message( array( 'source' => 'wc-product' ), false ), 'with none set, the editor says so' );
		$this->assertSame( 'Sold out', $results::empty_message( array( 'source' => 'wc-product', 'productEmptyMessage' => 'Sold out' ), false ), 'the editor shows the client message when one is set' );
	}

	public function test_the_editor_pagination_preview_is_the_page_markup_without_links(): void {
		self::load_results();
		$results = \SGS\Blocks\Card_Grid_Results::class;
		$html    = $results::pagination( array( 'source' => 'cpt-collection', 'pagination' => 'standard' ), 'sgs-cg-x', 3, 1, \SGS\Blocks\Grid_Pagination::MODE_AJAX );
		$this->assertSame( 3, preg_match_all( '/class="sgs-card-grid__page-btn[ "]/', $html ), 'one button per page: ' . $html );
		$this->assertStringContainsString( 'sgs-card-grid__page-btn--current', $html );
		$this->assertStringNotContainsString( '<a ', $html, 'the editor preview never navigates away' );
		$this->assertSame( '', $results::pagination( array( 'source' => 'cpt-collection', 'pagination' => 'none' ), 'sgs-cg-x', 3, 1, \SGS\Blocks\Grid_Pagination::MODE_AJAX ), 'negative control: no pagination set' );
		$this->assertSame( '', $results::pagination( array( 'source' => 'wc-product', 'pagination' => 'standard' ), 'sgs-cg-x', 3, 1, \SGS\Blocks\Grid_Pagination::MODE_AJAX ), 'products mode never paginates' );
		$this->assertSame( '', $results::pagination( array( 'source' => 'cpt-collection', 'pagination' => 'standard' ), 'sgs-cg-x', 1, 1, \SGS\Blocks\Grid_Pagination::MODE_AJAX ), 'one page needs no pagination' );
	}

	public function test_the_item_list_never_counts_the_template(): void {
		if ( ! function_exists( 'SGS\Blocksdd_filter' ) && ! function_exists( 'add_filter' ) ) {
			function add_filter( ...$args ) { return true; }
		}
		if ( ! function_exists( 'get_post_status' ) ) {
			function get_post_status( $id ) { return 'publish'; }
		}
		require_once dirname( __DIR__, 2 ) . '/includes/class-product-item-list.php';
		$blocks = array(
			array(
				'blockName'   => 'sgs/card-grid',
				'attrs'       => array( 'source' => 'cpt-collection' ),
				'innerBlocks' => array( array( 'blockName' => 'sgs/product-card', 'attrs' => array( 'sourceMode' => 'wc-product', 'productId' => 77 ), 'innerBlocks' => array() ) ),
			),
		);
		$ids         = array();
		$contributed = false;
		$collect     = new \ReflectionMethod( \SGS\Blocks\Product_Item_List::class, 'collect' );
		$collect->invokeArgs( null, array( $blocks, &$ids, &$contributed ) );
		$this->assertSame( array(), $ids, 'the template card inside a products-mode grid is not a page product' );
	}
}
