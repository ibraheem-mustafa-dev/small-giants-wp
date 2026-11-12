<?php
/**
 * Tests: the small item images print through the shared media renderer (Spec 49 §8.3, §10.4, Appendix A).
 *
 * - Choice-flow option, form tile, option-picker swatch and trust-bar badge: each item's picture is one item of the
 *   block's slot, in a `.sgs-media-group` scoped `{uid}-media-i{index}` and `{uid}-media`; the old hand-built `<img>` is gone.
 * - An item with no source prints no picture; the block-level rules print once.
 * - The trust bar prints Fit contain and a 60px Width when none is set, and a Width the client sets is the renderer's.
 * - The option picker's group is the swatch box, and Shape circle rounds the colour dot.
 * - The fixed thumbnails print their own Fit per device with `sgs_emit_responsive_css`, and nothing when none is set.
 *
 * Run with:
 *   vendor/bin/phpunit --no-configuration --bootstrap tests/php/bootstrap.php tests/php/SmallItemImagesMediaTest.php
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class SmallItemImagesMediaTest extends TestCase {

	use BlockHarnessRenderTrait;

	/**
	 * @param string $key Name of the picture.
	 * @return array<string,mixed> A source object.
	 */
	private function source( string $key ): array {
		return array(
			'desktop' => array(
				'kind'   => 'image',
				'url'    => "https://example.com/$key.jpg",
				'width'  => 800,
				'height' => 600,
			),
		);
	}

	public function test_a_choice_flow_option_prints_its_picture_through_the_renderer(): void {
		$out = $this->render_block(
			'sgs/choice-flow-question',
			array(
				'question'    => 'Pick',
				'options'     => array(
					array(
						'label'  => 'One',
						'value'  => 'one',
						'source' => $this->source( 'one' ),
						'alt'    => 'The first',
						'fit'    => array( 'desktop' => 'contain' ),
					),
					array(
						'label' => 'Two',
						'value' => 'two',
					),
					array(
						'label'  => 'Three',
						'value'  => 'three',
						'source' => $this->source( 'three' ),
					),
				),
				'optionFit'   => array( 'desktop' => 'cover' ),
				'optionWidth' => array( 'desktop' => '60%' ),
			)
		);
		$this->assertSame( 2, substr_count( $out['html'], 'sgs-choice-flow-question__option-media' ), 'a picture-less option has no media zone' );
		$this->assertSame( 2, substr_count( $out['html'], 'class="sgs-media-group' ) );
		$this->assertMatchesRegularExpression( '/-media-i0 [^"]*-media"/', $out['html'] );
		$this->assertStringContainsString( 'alt="The first"', $out['html'] );
		$this->assertStringContainsString( 'object-fit:contain', $out['css'], 'the option\'s own fit' );
		$this->assertStringContainsString( 'object-fit:cover', $out['css'], 'the block\'s fit for an option with none of its own' );
		$this->assertSame( 1, substr_count( $out['css'], 'width:60%' ), 'the block-level Width prints once' );
		$this->assertStringNotContainsString( 'loading="lazy" />' . '</span>', $out['html'], 'no hand-built img' );
	}

	public function test_a_form_tile_prints_its_picture_through_the_renderer(): void {
		$out = $this->render_block(
			'sgs/form-field-tiles',
			array(
				'fieldName' => 'f',
				'label'     => 'Tiles',
				'tiles'     => array(
					array(
						'label'  => 'A',
						'value'  => 'a',
						'source' => $this->source( 'a' ),
					),
					array(
						'label' => 'B',
						'value' => 'b',
					),
				),
				'tileWidth' => array( 'desktop' => '80px' ),
			)
		);
		$this->assertSame( 1, substr_count( $out['html'], 'class="sgs-media-group' ) );
		$this->assertStringContainsString( 'sgs-media-el', $out['html'] );
		$this->assertStringNotContainsString( 'sgs-form-tile__image', $out['html'] );
		$this->assertStringContainsString( 'width:80px', $out['css'] );
	}

	public function test_an_option_picker_swatch_group_is_the_swatch_box(): void {
		$out = $this->render_block(
			'sgs/option-picker',
			array(
				'optionItems' => array(
					array(
						'key'    => 'a',
						'label'  => 'A',
						'source' => $this->source( 'a' ),
					),
					array(
						'key'   => 'b',
						'label' => 'B',
					),
				),
				'swatchFit'   => array( 'desktop' => 'contain' ),
			)
		);
		$this->assertMatchesRegularExpression( '/<span class="sgs-media-group[^"]*sgs-option-picker__swatch sgs-option-picker__swatch--image"/', $out['html'] );
		$this->assertSame( 1, substr_count( $out['html'], 'sgs-option-picker__swatch--image' ) );
		$this->assertStringContainsString( 'sgs-option-picker__pill--has-image', $out['html'] );
		$this->assertStringContainsString( 'object-fit:contain', $out['css'] );
		$this->assertStringNotContainsString( 'aria-hidden="true" />', $out['html'], 'no hand-built img' );
	}

	public function test_the_swatch_shape_rounds_the_colour_dot(): void {
		$items = array(
			array(
				'key'   => 'a',
				'label' => 'A',
			),
		);
		$round = $this->render_block(
			'sgs/option-picker',
			array(
				'optionItems' => $items,
				'swatchShape' => array( 'desktop' => array( 'shape' => 'circle' ) ),
			)
		);
		$this->assertStringContainsString( 'sgs-option-picker__swatch--colour{border-radius:50%;}', $round['css'] );
		$none = $this->render_block(
			'sgs/option-picker',
			array(
				'optionItems' => $items,
				'swatchShape' => array( 'desktop' => array( 'shape' => 'none' ) ),
			)
		);
		$this->assertStringContainsString( 'sgs-option-picker__swatch--colour{border-radius:0;}', $none['css'] );
	}

	public function test_a_trust_bar_badge_prints_contain_and_sixty_pixels_unless_set(): void {
		$items = array(
			array(
				'label'  => 'Certified',
				'_key'   => 'k1',
				'source' => $this->source( 'cert' ),
				'alt'    => '',
			),
			array(
				'label' => 'No picture',
				'_key'  => 'k2',
			),
		);
		$base  = $this->render_block(
			'sgs/trust-bar',
			array(
				'badgeStyle' => 'image-badge',
				'items'      => $items,
			)
		);
		$this->assertSame( 1, substr_count( $base['html'], 'class="sgs-media-group' ), 'an item with no source has no picture' );
		$this->assertStringContainsString( 'alt="Certified"', $base['html'], 'an item with no alt is named by its label' );
		$this->assertStringContainsString( 'object-fit:contain', $base['css'] );
		$this->assertStringContainsString( '.sgs-trust-bar__badge-img{width:60px}', $base['css'] );
		$set = $this->render_block(
			'sgs/trust-bar',
			array(
				'badgeStyle' => 'image-badge',
				'items'      => $items,
				'badgeWidth' => array( 'desktop' => '90px' ),
				'badgeFit'   => array( 'desktop' => 'cover' ),
			)
		);
		$this->assertStringNotContainsString( 'badge-img{width:60px}', $set['css'] );
		$this->assertStringContainsString( 'width:90px', $set['css'] );
		$this->assertStringContainsString( 'object-fit:cover', $set['css'] );
		$this->assertStringNotContainsString( 'object-fit:contain', $set['css'] );
	}

	public function test_a_fixed_thumbnail_prints_its_own_fit_per_device_and_nothing_when_unset(): void {
		require_once dirname( __DIR__, 2 ) . '/includes/media/fixed-thumb-fit.php';
		$this->assertSame( '', sgs_fixed_thumb_fit_css( array(), 'sgs/cart', '.x .t' ) );
		$this->assertSame( '', sgs_fixed_thumb_fit_css( array( 'objectFit' => 'bogus' ), 'sgs/cart', '.x .t' ), 'a value outside the vocabulary prints nothing' );
		$css = sgs_fixed_thumb_fit_css(
			array(
				'objectFit'       => 'contain',
				'objectFitMobile' => 'cover',
			),
			'sgs/cart',
			'.x .t'
		);
		$this->assertStringContainsString( '.x .t{object-fit:contain;}', $css );
		$this->assertSame( 1, preg_match( '/@media[^{]*\{\.x \.t\{object-fit:cover;\}\}/', $css ), 'mobile differs from tablet: one rule' );
		$this->assertStringNotContainsString( '--sgs-media-object-fit', $css, 'a value, not a custom property' );
	}
}
