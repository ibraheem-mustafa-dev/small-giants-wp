<?php
/**
 * Tests: the universal rich-text formats' server half (Spec 02 FR-2-4 highlight, FR-2-5 inline photo).
 *
 * `includes/helpers-inline-formats.php` is called directly:
 *   - sgs_rich_text_kses() hands wp_kses() the post allowlist with `style` removed from every tag and `img` limited to
 *     the photo's attributes, so pasted inline style never reaches the page;
 *   - sgs_inline_format_palette_css() writes one `.sgs-highlight--{slug}` rule per palette slug that is safe in a
 *     selector, and nothing for any other slug;
 *   - sgs_inline_formats_maybe_enqueue() (a render_block filter) loads the shared stylesheet only for markup holding a
 *     highlight or an inline photo, and returns the markup unchanged.
 * The button's label keeps its own allowlist, which carries no `style`.
 *
 * The WordPress stand-ins are recording fakes: wp_kses_allowed_html( 'post' ) returns core's shape for the four tags
 * under test (each carrying `style` and `class`, as core's global attributes do) and wp_kses() applies the allowlist
 * it is handed with DOMDocument, so the assertions read what the allowlist lets through.
 *
 * Run with:
 *   php vendor/phpunit/phpunit/phpunit --filter InlineFormatsTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

// The stand-ins define global WordPress functions, so every test runs in its own process.
#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class InlineFormatsTest extends TestCase {

	protected function setUp(): void {
		$GLOBALS['sgs_test_enqueued_styles'] = array();
		$GLOBALS['sgs_test_inline_styles']   = array();
		$GLOBALS['sgs_test_kses_allowed']    = null;
		$GLOBALS['sgs_test_global_settings'] = array();

		if ( ! function_exists( 'wp_kses_allowed_html' ) ) {
			function wp_kses_allowed_html( $context = '' ) {
				$global = array(
					'class' => true,
					'id'    => true,
					'style' => true,
					'title' => true,
					'role'  => true,
				);
				return array(
					'p'    => array_merge( array( 'align' => true, 'dir' => true ), $global ),
					'span' => array_merge( array( 'align' => true, 'dir' => true ), $global ),
					'a'    => array_merge( array( 'href' => true, 'rel' => true, 'target' => true ), $global ),
					'img'  => array_merge(
						array( 'alt' => true, 'align' => true, 'border' => true, 'height' => true, 'loading' => true, 'longdesc' => true, 'src' => true, 'width' => true ),
						$global
					),
					'br'   => array(),
				);
			}
		}
		if ( ! function_exists( 'wp_kses' ) ) {
			function wp_kses( $content, $allowed_html, $allowed_protocols = array() ) {
				$GLOBALS['sgs_test_kses_allowed'] = $allowed_html;
				$doc = new \DOMDocument();
				libxml_use_internal_errors( true );
				$doc->loadHTML( '<?xml encoding="utf-8"?><div id="sgs-kses-root">' . $content . '</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD );
				libxml_clear_errors();
				$root = $doc->getElementById( 'sgs-kses-root' );
				$walk = static function ( \DOMNode $node ) use ( &$walk, $allowed_html ): void {
					foreach ( iterator_to_array( $node->childNodes ) as $child ) {
						if ( ! $child instanceof \DOMElement ) {
							continue;
						}
						$tag = strtolower( $child->tagName );
						if ( ! isset( $allowed_html[ $tag ] ) ) {
							while ( $child->firstChild ) {
								$node->insertBefore( $child->firstChild, $child );
							}
							$node->removeChild( $child );
							continue;
						}
						foreach ( iterator_to_array( $child->attributes ) as $attr ) {
							if ( empty( $allowed_html[ $tag ][ strtolower( $attr->name ) ] ) ) {
								$child->removeAttribute( $attr->name );
							}
						}
						$walk( $child );
					}
				};
				$walk( $root );
				$out = '';
				foreach ( $root->childNodes as $child ) {
					$out .= $doc->saveHTML( $child );
				}
				return $out;
			}
		}
		if ( ! function_exists( 'wp_get_global_settings' ) ) {
			function wp_get_global_settings( $path = array(), $options = array() ) {
				$settings = $GLOBALS['sgs_test_global_settings'];
				foreach ( $path as $segment ) {
					if ( ! is_array( $settings ) || ! array_key_exists( $segment, $settings ) ) {
						return array();
					}
					$settings = $settings[ $segment ];
				}
				return $settings;
			}
		}
		if ( ! function_exists( 'wp_add_inline_style' ) ) {
			function wp_add_inline_style( $handle, $css ) {
				$GLOBALS['sgs_test_inline_styles'][ $handle ][] = $css;
				return true;
			}
		}

		require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/helpers-inline-formats.php';
	}

	public function test_happy_style_is_stripped_from_span_img_a_and_p_while_class_src_and_alt_stay(): void {
		$html = '<p style="color:red" class="lead">Made for the mum '
			. '<img style="width:40px" class="sgs-inline-photo wp-image-7" src="https://example.test/a.jpg" alt="Two biscuits"> who needs it '
			. '<span style="background:yellow" class="sgs-highlight sgs-highlight--accent">most</span> '
			. '<a style="color:blue" class="cta" href="https://example.test/">shop</a></p>';

		$out = sgs_rich_text_kses( $html );

		$this->assertStringNotContainsStringIgnoringCase( 'style=', $out, 'no tag keeps a style attribute' );
		$this->assertStringContainsString( 'class="lead"', $out );
		$this->assertStringContainsString( 'class="sgs-inline-photo wp-image-7"', $out );
		$this->assertStringContainsString( 'src="https://example.test/a.jpg"', $out );
		$this->assertStringContainsString( 'alt="Two biscuits"', $out );
		$this->assertStringContainsString( 'class="sgs-highlight sgs-highlight--accent"', $out );
		$this->assertStringContainsString( 'href="https://example.test/"', $out );
	}

	public function test_happy_the_allowlist_has_no_style_anywhere_and_img_keeps_only_the_photo_attributes(): void {
		sgs_rich_text_kses( '<span>x</span>' );
		$allowed = $GLOBALS['sgs_test_kses_allowed'];

		$this->assertIsArray( $allowed );
		foreach ( $allowed as $tag => $attrs ) {
			$this->assertArrayNotHasKey( 'style', (array) $attrs, "{$tag} must not allow style" );
		}
		$img = array_keys( $allowed['img'] );
		sort( $img );
		$this->assertSame( array( 'alt', 'class', 'decoding', 'height', 'loading', 'sizes', 'src', 'srcset', 'width' ), $img );
		$this->assertArrayHasKey( 'class', $allowed['span'], 'the highlight class survives' );
	}

	public function test_edge_pasted_inline_colour_span_loses_its_style(): void {
		$this->assertSame( '<span>red</span>', sgs_rich_text_kses( '<span style="color:red">red</span>' ) );
	}

	public function test_happy_palette_css_writes_one_rule_per_safe_slug(): void {
		$GLOBALS['sgs_test_global_settings'] = array(
			'color' => array(
				'palette' => array(
					'theme' => array(
						array( 'slug' => 'accent', 'color' => '#ffd400' ),
						array( 'slug' => 'bad slug!', 'color' => '#00ff00' ),
					),
				),
			),
		);

		$this->assertSame(
			'.sgs-highlight--accent{--sgs-highlight-colour:var(--wp--preset--color--accent)}',
			sgs_inline_format_palette_css()
		);
	}

	public function test_edge_palette_css_reads_every_origin_once_and_a_flat_list(): void {
		$GLOBALS['sgs_test_global_settings'] = array(
			'color' => array(
				'palette' => array(
					'default' => array( array( 'slug' => 'black', 'color' => '#000' ) ),
					'theme'   => array( array( 'slug' => 'accent', 'color' => '#ffd400' ), array( 'slug' => 'black', 'color' => '#111' ) ),
					'custom'  => array( array( 'slug' => 'brand-2', 'color' => '#123456' ) ),
				),
			),
		);
		$this->assertSame(
			'.sgs-highlight--black{--sgs-highlight-colour:var(--wp--preset--color--black)}'
			. '.sgs-highlight--accent{--sgs-highlight-colour:var(--wp--preset--color--accent)}'
			. '.sgs-highlight--brand-2{--sgs-highlight-colour:var(--wp--preset--color--brand-2)}',
			sgs_inline_format_palette_css()
		);

		$GLOBALS['sgs_test_global_settings'] = array( 'color' => array( 'palette' => array( array( 'slug' => 'primary', 'color' => '#0a7ea8' ) ) ) );
		$this->assertSame( '.sgs-highlight--primary{--sgs-highlight-colour:var(--wp--preset--color--primary)}', sgs_inline_format_palette_css() );
	}

	public function test_fail_no_palette_writes_nothing(): void {
		$this->assertSame( '', sgs_inline_format_palette_css() );
	}

	public function test_negative_control_markup_without_a_format_class_enqueues_nothing(): void {
		$html = '<p class="wp-block-sgs-text">Plain words, a <strong>bold</strong> one.</p>';
		$this->assertSame( $html, sgs_inline_formats_maybe_enqueue( $html, array( 'blockName' => 'sgs/text' ) ) );
		$this->assertNotContains( 'sgs-inline-formats', $GLOBALS['sgs_test_enqueued_styles'] );
		$this->assertSame( array(), $GLOBALS['sgs_test_inline_styles'] );
	}

	public function test_happy_a_highlight_enqueues_the_stylesheet_and_its_palette_rules_once(): void {
		$GLOBALS['sgs_test_global_settings'] = array( 'color' => array( 'palette' => array( 'theme' => array( array( 'slug' => 'accent', 'color' => '#ffd400' ) ) ) ) );
		$html = '<h1 class="wp-block-sgs-heading">who needs it <span class="sgs-highlight">most</span></h1>';

		$this->assertSame( $html, sgs_inline_formats_maybe_enqueue( $html, array( 'blockName' => 'sgs/heading' ) ) );
		sgs_inline_formats_maybe_enqueue( $html, array( 'blockName' => 'sgs/heading' ) );

		$this->assertSame( array( 'sgs-inline-formats' ), array_values( array_unique( $GLOBALS['sgs_test_enqueued_styles'] ) ) );
		$this->assertSame(
			array( '.sgs-highlight--accent{--sgs-highlight-colour:var(--wp--preset--color--accent)}' ),
			$GLOBALS['sgs_test_inline_styles']['sgs-inline-formats'] ?? null,
			'the palette rules are added once per request'
		);
	}

	public function test_happy_an_inline_photo_enqueues_the_stylesheet(): void {
		$html = '<p>a <img class="sgs-inline-photo wp-image-7" src="a.jpg" alt=""> photo</p>';
		sgs_inline_formats_maybe_enqueue( $html, array( 'blockName' => 'sgs/text' ) );
		$this->assertContains( 'sgs-inline-formats', $GLOBALS['sgs_test_enqueued_styles'] );
	}

	public function test_edge_a_non_string_block_content_passes_through(): void {
		$this->assertNull( sgs_inline_formats_maybe_enqueue( null, array() ) );
		$this->assertSame( array(), $GLOBALS['sgs_test_enqueued_styles'] );
	}

	public function test_happy_the_button_label_keeps_its_own_allowlist_with_no_style(): void {
		$src   = (string) file_get_contents( SGS_BLOCKS_PLUGIN_DIR . '/src/blocks/button/render.php' );
		$start = strpos( $src, "\$label_html = '<span class=\"sgs-button__label\">' . wp_kses(" );
		$this->assertNotFalse( $start, 'the button label is sanitised by its own wp_kses() call' );
		$end   = strpos( $src, ") . '</span>'", $start );
		$this->assertNotFalse( $end );
		$allowlist = substr( $src, $start, $end - $start );

		$this->assertStringNotContainsString( 'wp_kses_allowed_html', $allowlist, 'the label allowlist is its own, not the post one' );
		$this->assertStringNotContainsString( 'sgs_rich_text_kses', $allowlist );
		$this->assertDoesNotMatchRegularExpression( "/'style'\\s*=>/", $allowlist, 'the label allowlist carries no style' );
		$this->assertMatchesRegularExpression( "/'span'\\s*=>\\s*array\\(/", $allowlist, 'the control: the slice read is the allowlist' );
	}
}
