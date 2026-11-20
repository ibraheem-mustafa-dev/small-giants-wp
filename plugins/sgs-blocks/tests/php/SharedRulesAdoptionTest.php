<?php
/**
 * Tests: the blocks that print a shared rule (sgs/text hover look, sgs/container hover colour and content width).
 * Two blocks with the same hover settings (or the same content width) carry the same shared class and the shared rule's
 * text is the same; blocks with different settings get different classes; the shared rule does not hold the
 * instance's own uid; the block's own rules stay under its own class.
 *
 * Runs the real render.php of each block in a child process (BlockHarnessRenderTrait).
 *
 * Run with: vendor/bin/phpunit --filter SharedRulesAdoptionTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class SharedRulesAdoptionTest extends TestCase {

	use BlockHarnessRenderTrait;

	/** The shared classes of one prefix on a rendered block's root. */
	private static function shared_classes( string $html, string $prefix ): array {
		preg_match_all( '/\b' . preg_quote( $prefix, '/' ) . '-[0-9a-f]{8}\b/', $html, $m );
		return array_values( array_unique( $m[0] ) );
	}

	/** The rules whose selector holds a class. */
	private static function rules_for( string $css, string $class ): string {
		preg_match_all( '/[^{}]*\.' . preg_quote( $class, '/' ) . '[^{}]*\{[^}]*\}/', $css, $m );
		return implode( '', $m[0] );
	}

	private function text( array $attrs ): array {
		return $this->render_block( 'sgs/text', array_merge( array( 'text' => 'Fresh bread' ), $attrs ) );
	}

	public function test_text_blocks_with_the_same_hover_colour_share_one_class_and_one_rule_text(): void {
		$a = $this->text( array( 'textColourHover' => 'primary', 'textColour' => 'accent' ) );
		$b = $this->text( array( 'textColourHover' => 'primary', 'textColour' => 'secondary' ) );

		$class_a = self::shared_classes( $a['html'], 'sgs-text-hover' );
		$class_b = self::shared_classes( $b['html'], 'sgs-text-hover' );
		$this->assertCount( 1, $class_a );
		$this->assertSame( $class_a, $class_b, 'same hover settings, same shared class' );

		$rules_a = self::rules_for( $a['css'], $class_a[0] );
		$this->assertStringContainsString( ':hover{color:', $rules_a );
		$this->assertStringContainsString( ':focus-visible{color:', $rules_a );
		$this->assertStringContainsString( '{transition:none !important;', $rules_a, 'the reduced-motion rule is part of the group' );
		$this->assertSame( $rules_a, self::rules_for( $b['css'], $class_b[0] ), 'the shared rules are the same text' );
	}

	public function test_text_blocks_with_different_hover_colours_get_different_classes(): void {
		$a = self::shared_classes( $this->text( array( 'textColourHover' => 'primary' ) )['html'], 'sgs-text-hover' );
		$b = self::shared_classes( $this->text( array( 'textColourHover' => 'secondary' ) )['html'], 'sgs-text-hover' );
		$this->assertCount( 1, $a );
		$this->assertCount( 1, $b );
		$this->assertNotSame( $a, $b );
	}

	public function test_a_text_block_without_a_hover_look_gets_no_shared_class(): void {
		$this->assertSame( array(), self::shared_classes( $this->text( array( 'textColour' => 'accent' ) )['html'], 'sgs-text-hover' ) );
	}

	public function test_the_shared_rule_does_not_name_the_blocks_own_uid(): void {
		$out = $this->text( array( 'textColourHover' => 'primary', 'textColour' => 'accent' ) );
		preg_match( '/\bsgs-text-[0-9a-f]{8}\b/', $out['html'], $uid );
		$class = self::shared_classes( $out['html'], 'sgs-text-hover' )[0];
		$this->assertNotEmpty( $uid, 'the block keeps its own uid class' );
		$this->assertStringNotContainsString( $uid[0], self::rules_for( $out['css'], $class ) );
		$this->assertStringContainsString( $uid[0], $out['css'], 'the block\'s own rules stay under its own class' );
	}

	public function test_containers_with_the_same_hover_colour_share_one_class(): void {
		$a = $this->render_block( 'sgs/container', array( 'textColourHover' => 'primary', 'textColour' => 'accent' ) );
		$b = $this->render_block( 'sgs/container', array( 'textColourHover' => 'primary', 'textColour' => 'secondary' ) );
		$class_a = self::shared_classes( $a['html'], 'sgs-state-colour' );
		$this->assertCount( 1, $class_a );
		$this->assertSame( $class_a, self::shared_classes( $b['html'], 'sgs-state-colour' ) );
		$this->assertSame( self::rules_for( $a['css'], $class_a[0] ), self::rules_for( $b['css'], $class_a[0] ) );
		$this->assertStringContainsString( ':hover{color:', self::rules_for( $a['css'], $class_a[0] ) );
	}

	public function test_containers_with_the_same_content_width_share_one_band_class(): void {
		$tier = array( 'desktop' => 'wide', 'tablet' => 'normal' );
		$a    = $this->render_block( 'sgs/container', array( 'contentWidth' => $tier, 'gap' => array( 'desktop' => '8px' ) ) );
		$b    = $this->render_block( 'sgs/container', array( 'contentWidth' => $tier, 'gap' => array( 'desktop' => '16px' ) ) );
		$c    = $this->render_block( 'sgs/container', array( 'contentWidth' => array( 'desktop' => 'normal' ), 'gap' => array( 'desktop' => '8px' ) ) );

		// The flat base rule (max-width and centring) and the width tiers each have a shared class.
		foreach ( array( 'sgs-band-width', 'sgs-band-cap' ) as $prefix ) {
			$class_a = self::shared_classes( $a['html'], $prefix );
			$this->assertCount( 1, $class_a, $prefix );
			$this->assertSame( $class_a, self::shared_classes( $b['html'], $prefix ), $prefix . ': same width, same class' );
			$this->assertSame( self::rules_for( $a['css'], $class_a[0] ), self::rules_for( $b['css'], $class_a[0] ), $prefix . ': same rule text' );
			$this->assertNotSame( $class_a, self::shared_classes( $c['html'], $prefix ), $prefix . ': a different width, a different class' );
		}
		$flat = self::shared_classes( $a['html'], 'sgs-band-width' )[0];
		$this->assertStringContainsString( 'max-width:', self::rules_for( $a['css'], $flat ) );
		$this->assertStringContainsString( 'margin-inline:auto', self::rules_for( $a['css'], $flat ) );
		$this->assertStringContainsString( '>.sgs-container__inner{', self::rules_for( $a['css'], $flat ) );
	}

	public function test_the_flat_rule_prints_before_the_width_tiers_it_precedes(): void {
		$out  = $this->render_block( 'sgs/container', array( 'contentWidth' => array( 'desktop' => 'wide', 'tablet' => 'normal' ) ) );
		$flat = self::shared_classes( $out['html'], 'sgs-band-width' )[0];
		$cap  = self::shared_classes( $out['html'], 'sgs-band-cap' )[0];
		$this->assertLessThan( strpos( $out['css'], '.' . $cap ), strpos( $out['css'], '.' . $flat ), 'the flat rule prints before the tier group, as it did before sharing' );
	}

	public function test_the_blocks_print_no_inline_style_attribute_for_the_shared_rules(): void {
		$out = $this->text( array( 'textColourHover' => 'primary' ) );
		$this->assertDoesNotMatchRegularExpression( '/<[a-z0-9]+ [^>]*style="[^"]*(transition|:hover)/', $out['html'] );
	}
}
