<?php
/**
 * Accessible names and keyboard access: the testimonial slider's bleed, the container's scroll row region, the trust bar's
 * landmark name, the button's empty name and the block-link overlay's lender.
 *
 * Run with: vendor/bin/phpunit --filter AccessibleNamesRoundTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class AccessibleNamesRoundTest extends TestCase {

	use BlockHarnessRenderTrait;

	private function trust_bar( array $attrs ): string {
		return $this->render_block( 'sgs/trust-bar', $attrs + array( 'items' => array( array( 'icon' => 'truck', 'label' => 'Free delivery' ) ) ) )['html'];
	}

	private function open_tag( string $html ): string {
		$this->assertSame( 1, preg_match( '/<(?:section|nav|div|aside|header|footer|article|figure)[^>]*sgs-trust-bar[^>]*>/', $html, $m ), 'trust bar root tag in: ' . $html );
		return $m[0];
	}

	/** Item 3: an unlabelled section is no longer given the one shared name. */
	public function test_trust_bar_section_without_a_label_has_no_landmark_name(): void {
		$this->assertStringNotContainsString( 'aria-label', $this->open_tag( $this->trust_bar( array() ) ) );
	}

	/** Item 3: the setting wins on the default section. */
	public function test_trust_bar_section_honours_the_label(): void {
		$tag = $this->open_tag( $this->trust_bar( array( 'ariaLabel' => 'Delivery promises' ) ) );
		$this->assertStringContainsString( 'aria-label="Delivery promises"', $tag );
		$this->assertStringStartsWith( '<section', $tag );
	}

	/** Item 3: a div cannot carry a name without a role. */
	public function test_trust_bar_div_with_a_label_is_a_region(): void {
		$tag = $this->open_tag( $this->trust_bar( array( 'tagName' => 'div', 'ariaLabel' => 'Accreditations' ) ) );
		$this->assertStringContainsString( 'role="region"', $tag );
		$this->assertStringContainsString( 'aria-label="Accreditations"', $tag );
	}

	/** Item 3 negative control: a nav is a landmark whatever it is called, so it keeps the default name. */
	public function test_trust_bar_nav_keeps_the_default_name(): void {
		$this->assertStringContainsString( 'aria-label="Trust signals"', $this->open_tag( $this->trust_bar( array( 'tagName' => 'nav' ) ) ) );
	}

	/** Item 1a: the bleed prints a real padding and an equal negative margin on the track, per device. */
	public function test_slider_bleed_prints_padding_and_negative_margin(): void {
		$css = $this->render_block( 'sgs/testimonial-slider', array( 'slideBleed' => array( 'desktop' => '16px', 'mobile' => '8px' ) ), array(), array(), '<div class="x"></div>' )['css'];
		$this->assertMatchesRegularExpression( '/__track\{[^}]*padding:16px;margin:calc\(-1 \* 16px\);/', $css );
		$this->assertStringContainsString( 'padding:8px;margin:calc(-1 * 8px);', $css );
	}

	/** Item 1a negative control: unset prints neither. */
	public function test_slider_without_bleed_prints_no_padding_or_margin(): void {
		$css = $this->render_block( 'sgs/testimonial-slider', array(), array(), array(), '<div class="x"></div>' )['css'];
		$this->assertStringNotContainsString( 'calc(-1 *', $css );
		$this->assertDoesNotMatchRegularExpression( '/__track\{[^}]*padding:/', $css );
	}

	private function scroll_row( array $attrs ): string {
		return $this->render_block( 'sgs/container', $attrs, array(), array(), '<p>One</p><p>Two</p>' )['html'];
	}

	/** Item 2: a scroll-sideways row is marked so the view script can make it a focusable, named region. */
	public function test_scroll_row_is_marked_with_its_name(): void {
		$html = $this->scroll_row( array( 'scrollSideways' => array( 'mobile' => 'on' ), 'scrollRegionLabel' => 'Reviews' ) );
		$this->assertStringContainsString( 'data-sgs-scroll-region="Reviews"', $html );
		$this->assertStringContainsString( 'data-sgs-scroll-region-default="Scrolling row"', $html );
	}

	/** Item 2: no name set leaves the value empty, so the browser takes the nearest heading. */
	public function test_scroll_row_without_a_name_defers_to_the_heading(): void {
		$this->assertStringContainsString( 'data-sgs-scroll-region=""', $this->scroll_row( array( 'scrollSideways' => array( 'mobile' => 'on' ) ) ) );
	}

	/** Item 2 negative control: no scroll row, no marker. */
	public function test_a_plain_container_carries_no_scroll_marker(): void {
		$this->assertStringNotContainsString( 'data-sgs-scroll-region', $this->scroll_row( array( 'layout' => 'flex', 'padding' => array( 'desktop' => array( 'top' => '8px' ) ) ) ) );
	}

	/** Item 4: an icon-only link with no name prints no empty aria-label. */
	public function test_button_with_no_name_prints_no_empty_aria_label(): void {
		$html = $this->render_block( 'sgs/button', array( 'label' => '', 'url' => 'https://example.test/x', 'icon' => 'arrow-right', 'iconPosition' => 'only' ) )['html'];
		$this->assertStringNotContainsString( 'aria-label=""', $html );
	}

	/** Item 4 negative control: an aria label still names an icon-only button. */
	public function test_button_with_an_aria_label_keeps_it(): void {
		$html = $this->render_block( 'sgs/button', array( 'label' => '', 'url' => 'https://example.test/x', 'icon' => 'arrow-right', 'iconPosition' => 'only', 'ariaLabel' => 'View the gift box' ) )['html'];
		$this->assertStringContainsString( 'aria-label="View the gift box"', $html );
	}

	private function overlay( string $root, string $label = '' ): string {
		foreach ( array(
			'untrailingslashit' => 'rtrim( $v, "/\\\\" )',
			'esc_url'           => '(string) $v',
			'esc_attr'          => 'htmlspecialchars( (string) $v, ENT_QUOTES )',
			'wp_parse_url'      => 'parse_url( $v, $c )',
			'wp_strip_all_tags' => 'strip_tags( (string) $v )',
			'home_url'          => '"https://example.test" . $v',
		) as $name => $body ) {
			if ( ! function_exists( $name ) ) {
				// phpcs:ignore Squiz.PHP.Eval.Discouraged -- stubs the WordPress helpers the pure string function calls.
				eval( 'function ' . $name . '( $v, $c = -1 ) { return ' . $body . '; }' );
			}
		}
		require_once dirname( __DIR__, 2 ) . '/includes/hover-effects/link-overlay.php';
		return \SGS\Blocks\insert_block_link_overlay( $root, 0, 'https://example.test/x', false, $label );
	}

	/** Item 4: a nameless arrow button is not the card's lender; it is demoted and the overlay carries the card heading. */
	public function test_nameless_button_is_demoted_and_the_overlay_takes_the_heading(): void {
		$out = $this->overlay( '<div class="card"><h3>Gift box</h3><a href="https://example.test/x" class="sgs-button"><span class="sgs-button__label"></span><span class="sgs-button__icon"><svg></svg></span></a></div>' );
		$this->assertStringNotContainsString( 'sgs-block-link-source', $out );
		$this->assertStringContainsString( 'class="sgs-button" tabindex="-1" aria-hidden="true"', $out );
		$this->assertStringContainsString( 'class="sgs-block-link-overlay sgs-focus--inset" href="https://example.test/x" aria-label="Gift box"', $out );
	}

	/** Item 4: an operator label still beats the heading. */
	public function test_operator_label_beats_the_heading(): void {
		$out = $this->overlay( '<div><h3>Gift box</h3><a href="https://example.test/x"><svg></svg></a></div>', 'Open gift box' );
		$this->assertStringContainsString( 'aria-label="Open gift box"', $out );
	}

	/** Item 4 negative control: a named link is still the lender and the overlay stays inert. */
	public function test_named_link_is_still_the_lender(): void {
		$out = $this->overlay( '<div><h3>Gift box</h3><a href="https://example.test/x">Gift box</a></div>' );
		$this->assertStringContainsString( 'sgs-block-link-source', $out );
		$this->assertStringContainsString( 'class="sgs-block-link-overlay" href="https://example.test/x" tabindex="-1" aria-hidden="true"', $out );
	}

	/** Item 4: a nameless button before a named link does not stop the named link being the lender. */
	public function test_named_link_after_a_nameless_one_is_the_lender(): void {
		$out = $this->overlay( '<div><a href="https://example.test/x" class="b"><svg></svg></a><a href="https://example.test/x" class="t">Read more</a></div>' );
		$this->assertStringContainsString( 'class="t sgs-block-link-source"', $out );
		$this->assertStringContainsString( 'class="b" tabindex="-1" aria-hidden="true"', $out );
	}
}
