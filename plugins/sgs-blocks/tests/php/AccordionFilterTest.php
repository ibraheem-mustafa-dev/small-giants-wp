<?php
/**
 * sgs/accordion filter (B4): the bar prints only with `filterEnabled`, and an accordion with the filter off renders
 * byte-identical HTML and FAQ JSON-LD to what it rendered before the filter existed.
 *
 * Fixtures are real accordions exported from a local mirror's pages (tests/fixtures/accordion-filter/); the goldens
 * are what the accordion and item render.php files printed for them before the filter existed. To regenerate the goldens
 * from an older checkout: SGS_ACCORDION_GOLDEN_FROM=<that checkout's plugins/sgs-blocks> vendor/bin/phpunit --filter AccordionFilterTest.
 *
 * Run with: vendor/bin/phpunit --filter AccordionFilterTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class AccordionFilterTest extends TestCase {

	private const FIXTURES = array( 'indus', 'eye-care' );

	/**
	 * Render a block through the QA harness of a plugin checkout, with the registered block type (block.json defaults applied).
	 *
	 * @param string $root    The plugins/sgs-blocks directory to render from.
	 * @param string $slug    Block slug.
	 * @param array  $attrs   Attributes.
	 * @param array  $context Block context.
	 * @param string $content Rendered inner blocks.
	 * @param array  $rows    Inner block rows for $block->inner_blocks.
	 * @return string Rendered HTML.
	 */
	private function render( string $root, string $slug, array $attrs, array $context = array(), string $content = '', array $rows = array() ): string {
		$files = array();
		foreach ( array(
			'attrs'   => (object) $attrs,
			'context' => (object) $context,
			'inner'   => $rows,
		) as $key => $value ) {
			$files[ $key ] = tempnam( sys_get_temp_dir(), 'sgsaf' );
			file_put_contents( $files[ $key ], json_encode( $value, JSON_THROW_ON_ERROR ) );
		}
		$files['content'] = tempnam( sys_get_temp_dir(), 'sgsaf' );
		file_put_contents( $files['content'], $content );
		try {
			$cmd = escapeshellarg( PHP_BINARY )
				. ' ' . escapeshellarg( $root . '/scripts/qa/lib/render-css-harness.php' )
				. ' --slug ' . escapeshellarg( $slug )
				. ' --motion-targets'
				. ' --attrs-file ' . escapeshellarg( $files['attrs'] )
				. ' --context-file ' . escapeshellarg( $files['context'] )
				. ' --inner-blocks-file ' . escapeshellarg( $files['inner'] )
				. ' --content-file ' . escapeshellarg( $files['content'] ) . ' 2>&1';
			$out = (string) shell_exec( $cmd );
		} finally {
			foreach ( $files as $file ) {
				@unlink( $file ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
			}
		}
		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'harness did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render.php failed: ' . ( $decoded['error'] ?? $out ) );
		return (string) $decoded['html'];
	}

	/**
	 * The context an item receives from its accordion: every providesContext key read from the accordion's attributes.
	 *
	 * @param string $root  Plugin root.
	 * @param array  $attrs Accordion attributes (block.json defaults applied by the caller's harness run are not visible here, so unset keys are omitted).
	 * @return array Context.
	 */
	private function item_context( string $root, array $attrs ): array {
		$block = json_decode( (string) file_get_contents( $root . '/src/blocks/accordion/block.json' ), true );
		$out   = array();
		foreach ( $block['providesContext'] as $key => $attr ) {
			if ( array_key_exists( $attr, $attrs ) ) {
				$out[ $key ] = $attrs[ $attr ];
			}
		}
		return $out;
	}

	/**
	 * Render a fixture accordion the way a page would: each item through its render.php, then the accordion.
	 *
	 * @param string $root    Plugin root.
	 * @param string $name    Fixture name.
	 * @param array  $overlay Attributes layered over the fixture's (and over `faqSchema` true).
	 * @param array  $item_overlay Attributes layered over every item's.
	 * @return string Accordion HTML including its FAQ JSON-LD.
	 */
	private function render_fixture( string $root, string $name, array $overlay = array(), array $item_overlay = array() ): string {
		$fixture = json_decode( (string) file_get_contents( __DIR__ . '/../fixtures/accordion-filter/' . $name . '.json' ), true );
		$attrs   = array_merge( $fixture['attributes'], array( 'faqSchema' => true ), $overlay );
		$context = $this->item_context( $root, $attrs );
		$content = '';
		$rows    = array();
		foreach ( $fixture['innerBlocks'] as $item ) {
			$answers      = '';
			$answer_rows  = array();
			foreach ( $item['innerBlocks'] ?? array() as $answer ) {
				$html          = '<p>' . ( $answer['attributes']['text'] ?? '' ) . '</p>';
				$answers      .= $html;
				$answer_rows[] = array( 'name' => $answer['name'], 'attributes' => $answer['attributes'], 'html' => $html );
			}
			$item_attrs = array_merge( $item['attributes'], $item_overlay );
			$content   .= $this->render( $root, 'sgs/accordion-item', $item_attrs, $context, $answers );
			$rows[]     = array( 'name' => 'sgs/accordion-item', 'attributes' => $item_attrs, 'innerBlocks' => $answer_rows );
		}
		return $this->render( $root, 'sgs/accordion', $attrs, array(), $content, $rows );
	}

	/**
	 * @return array<string, array{0: string}>
	 */
	public static function fixtures(): array {
		return array_combine( self::FIXTURES, array_map( static fn ( $n ) => array( $n ), self::FIXTURES ) );
	}

	private function golden_path( string $name ): string {
		return __DIR__ . '/../fixtures/accordion-filter/golden-' . $name . '.html';
	}

	/**
	 * @dataProvider fixtures
	 */
	public function test_filter_off_is_byte_identical_to_before_the_filter_existed( string $name ): void {
		$root = dirname( __DIR__, 2 );
		$from = getenv( 'SGS_ACCORDION_GOLDEN_FROM' );
		if ( false !== $from && '' !== $from ) {
			file_put_contents( $this->golden_path( $name ), $this->render_fixture( $from, $name ) );
			$this->markTestSkipped( 'golden written from ' . $from );
		}
		$golden = (string) file_get_contents( $this->golden_path( $name ) );
		$this->assertStringContainsString( 'application/ld+json', $golden, 'the golden carries the FAQ JSON-LD' );
		$this->assertSame( $golden, $this->render_fixture( $root, $name ), 'filter unset' );
		// WordPress passes every block.json default: the new filter attributes at their defaults change nothing.
		$this->assertSame(
			$golden,
			$this->render_fixture( $root, $name, array( 'filterEnabled' => false, 'filterSearch' => true, 'filterChips' => true, 'filterAllLabel' => 'All' ), array( 'category' => '', 'showCategoryEyebrow' => false ) ),
			'filter attributes at their defaults'
		);
		// Filter settings left over with the filter off print nothing.
		$this->assertSame(
			$golden,
			$this->render_fixture( $root, $name, array( 'filterEnabled' => false, 'filterEmptyMessage' => 'Nope', 'filterChipColour' => 'primary' ) ),
			'filter settings with the filter off'
		);
	}

	/**
	 * @dataProvider fixtures
	 */
	public function test_json_ld_is_identical_with_the_filter_on_and_off( string $name ): void {
		$root = dirname( __DIR__, 2 );
		$pick = static function ( string $html ): string {
			preg_match_all( '#<script type="application/ld\+json">.*?</script>#s', $html, $m );
			return implode( '', $m[0] );
		};
		$off = $pick( $this->render_fixture( $root, $name ) );
		$on  = $pick( $this->render_fixture( $root, $name, array( 'filterEnabled' => true ), array( 'category' => 'Topic', 'showCategoryEyebrow' => true ) ) );
		$this->assertNotSame( '', $off );
		$this->assertSame( $off, $on );
	}

	public function test_filter_on_prints_the_bar_the_status_node_and_item_categories(): void {
		$root = dirname( __DIR__, 2 );
		$html = $this->render_fixture( $root, 'indus', array( 'filterEnabled' => true ), array( 'category' => 'Trade' ) );
		$this->assertStringContainsString( 'data-filter="true"', $html );
		$this->assertStringContainsString( 'class="sgs-accordion__filter" data-sgs-accordion-filter hidden', $html );
		$this->assertStringContainsString( 'role="group" aria-label="Filter by topic"', $html );
		$this->assertStringContainsString( 'aria-pressed="true" data-category="">All</button>', $html );
		$this->assertStringContainsString( 'aria-pressed="false" data-category="Trade">Trade</button>', $html );
		$this->assertStringContainsString( 'role="status" aria-live="polite" data-sgs-accordion-live></span>', $html );
		$this->assertStringContainsString( '3 answers', $html );
		$this->assertStringContainsString( 'data-category="Trade"', $html );
		$this->assertStringContainsString( 'type="search"', $html );
		$this->assertStringContainsString( 'Nothing matches that yet.', $html );
	}

	public function test_the_empty_link_label_is_escaped_and_the_message_and_url_go_through_the_core_sanitisers(): void {
		$root = dirname( __DIR__, 2 );
		$html = $this->render_fixture( $root, 'eye-care', array( 'filterEnabled' => true, 'filterEmptyLink' => array( 'url' => 'https://example.test/ask', 'label' => 'Ask <b>us</b>' ) ) );
		$this->assertStringContainsString( 'href="https://example.test/ask">Ask &lt;b&gt;us&lt;/b&gt;</a>', $html );
		// The harness stubs wp_kses_post() and esc_url() as pass-throughs, so the sanitising itself is pinned at the source.
		$source = (string) file_get_contents( $root . '/includes/accordion-filter.php' );
		$this->assertStringContainsString( 'wp_kses_post( $message )', $source );
		$this->assertStringContainsString( "esc_url( \$typed )", $source );
	}

	public function test_the_item_eyebrow_needs_the_filter_the_category_and_its_own_setting(): void {
		$root    = dirname( __DIR__, 2 );
		$item    = array( 'title' => 'Q' );
		$context = array( 'sgs/accordionFilterEnabled' => true );
		$on      = $this->render( $root, 'sgs/accordion-item', $item + array( 'category' => 'Delivery', 'showCategoryEyebrow' => true ), $context, '<p>A</p>' );
		$this->assertStringContainsString( '<span class="sgs-accordion-item__heading"><span class="sgs-accordion-item__eyebrow">Delivery</span>', $on );
		foreach ( array(
			array( array( 'category' => 'Delivery', 'showCategoryEyebrow' => false ), $context ),
			array( array( 'category' => '', 'showCategoryEyebrow' => true ), $context ),
			array( array( 'category' => 'Delivery', 'showCategoryEyebrow' => true ), array( 'sgs/accordionFilterEnabled' => false ) ),
		) as $case ) {
			$off = $this->render( $root, 'sgs/accordion-item', $item + $case[0], $case[1], '<p>A</p>' );
			$this->assertStringNotContainsString( 'sgs-accordion-item__eyebrow', $off );
		}
	}
}
