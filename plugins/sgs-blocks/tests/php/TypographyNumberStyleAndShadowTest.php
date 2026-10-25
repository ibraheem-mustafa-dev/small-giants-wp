<?php
/**
 * Number style (`font-variant-numeric`) and text shadow (`text-shadow`) on the shared typography rule
 * (includes/helpers-typography.php::sgs_typography_css_rule), as adopted by sgs/text, sgs/heading and sgs/label.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter TypographyNumberStyleAndShadowTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class TypographyNumberStyleAndShadowTest extends TestCase {

	use BlockHarnessRenderTrait;

	/**
	 * Each adopting block with the attributes that make it render something.
	 *
	 * @return array<string,array{0:string,1:array<string,mixed>}>
	 */
	public static function adopters(): array {
		return array(
			'sgs/text'    => array( 'sgs/text', array( 'text' => '01 / 6' ) ),
			'sgs/heading' => array( 'sgs/heading', array( 'content' => '01 / 6' ) ),
			'sgs/label'   => array( 'sgs/label', array( 'text' => '01 / 6' ) ),
		);
	}

	/**
	 * @dataProvider adopters
	 */
	public function test_number_style_prints_in_the_typography_rule( string $slug, array $base ): void {
		$out = $this->render_block( $slug, array_merge( $base, array( 'fontVariantNumeric' => 'tabular-nums' ) ) );

		$this->assertStringContainsString( '01 / 6', $out['html'], 'positive control: the block rendered' );
		$this->assertMatchesRegularExpression( '/\{[^}]*font-variant-numeric:tabular-nums;[^}]*\}/', $out['css'] );
	}

	/**
	 * @dataProvider adopters
	 */
	public function test_a_value_off_the_allowlist_prints_nothing( string $slug, array $base ): void {
		$out = $this->render_block( $slug, array_merge( $base, array( 'fontVariantNumeric' => 'tabular-nums;} body{display:none' ) ) );

		$this->assertStringContainsString( '01 / 6', $out['html'], 'positive control: the block rendered' );
		$this->assertStringNotContainsString( 'font-variant-numeric', $out['css'] );
		$this->assertStringNotContainsString( 'display:none', $out['css'] );
	}

	/**
	 * @dataProvider adopters
	 */
	public function test_text_shadow_prints_one_layer_with_its_colour( string $slug, array $base ): void {
		$out = $this->render_block(
			$slug,
			array_merge(
				$base,
				array(
					'textShadow'       => '0px 4px 12px',
					'textShadowColour' => '#FFFFFFCB',
				)
			)
		);

		$this->assertMatchesRegularExpression( '/\{[^}]*text-shadow:0px 4px 12px #FFFFFFCB;[^}]*\}/', $out['css'] );
	}

	/**
	 * @dataProvider adopters
	 */
	public function test_text_shadow_with_no_colour_takes_the_text_colour( string $slug, array $base ): void {
		$out = $this->render_block( $slug, array_merge( $base, array( 'textShadow' => '1px 2px 3px' ) ) );

		$this->assertMatchesRegularExpression( '/\{[^}]*text-shadow:1px 2px 3px;[^}]*\}/', $out['css'] );
	}

	public function test_a_colour_slug_resolves_through_the_shadow_colour_helper(): void {
		$css = $this->render_block( 'sgs/text', array( 'text' => 'x', 'textShadow' => '0 2px 4px', 'textShadowColour' => 'primary' ) )['css'];

		$this->assertStringContainsString( 'text-shadow:0px 2px 4px var(--wp--preset--color--primary', $css );
	}

	public function test_a_draft_style_value_with_its_colour_inline_is_kept(): void {
		$css = $this->render_block( 'sgs/text', array( 'text' => 'x', 'textShadow' => '0px 4px 12px #FFFFFFCB' ) )['css'];

		$this->assertStringContainsString( 'text-shadow:0px 4px 12px #FFFFFFCB', $css );
	}

	public function test_text_shadow_takes_no_spread_and_no_inset(): void {
		$css = $this->render_block( 'sgs/text', array( 'text' => 'x', 'textShadow' => 'inset 1px 2px 3px 4px' ) )['css'];

		$this->assertStringNotContainsString( 'text-shadow', $css, 'inset is a box-shadow keyword; the layer is refused' );

		$css = $this->render_block( 'sgs/text', array( 'text' => 'x', 'textShadow' => '1px 2px 3px 4px' ) )['css'];
		$this->assertMatchesRegularExpression( '/text-shadow:1px 2px 3px;/', $css, 'the spread is dropped' );
	}

	public function test_a_hostile_shadow_cannot_break_out_of_the_declaration(): void {
		$css = $this->render_block( 'sgs/text', array( 'text' => 'x', 'textShadow' => '0 4px 12px', 'textShadowColour' => 'red;} body{display:none' ) )['css'];

		$this->assertStringNotContainsString( 'display:none', $css );
		$this->assertStringNotContainsString( 'body{', $css );
	}

	public function test_nothing_set_prints_neither_property(): void {
		$out = $this->render_block( 'sgs/text', array( 'text' => 'x', 'fontWeight' => '700' ) );

		$this->assertStringContainsString( 'font-weight:700', $out['css'], 'positive control: the typography rule printed' );
		$this->assertStringNotContainsString( 'font-variant-numeric', $out['css'] );
		$this->assertStringNotContainsString( 'text-shadow', $out['css'] );
	}

	/**
	 * WordPress drops an attribute a block never declared before render, so a block that does not adopt the rows
	 * prints neither property: the contract is the declaration, and only the three adopters carry it.
	 */
	public function test_only_the_adopters_declare_the_attributes(): void {
		$declared = array();
		foreach ( glob( dirname( __DIR__, 2 ) . '/src/blocks/*/block.json' ) ?: array() as $file ) {
			$json  = json_decode( (string) file_get_contents( $file ), true );
			$attrs = is_array( $json['attributes'] ?? null ) ? $json['attributes'] : array();
			foreach ( array( 'fontVariantNumeric', 'textShadow', 'textShadowColour' ) as $name ) {
				if ( isset( $attrs[ $name ] ) ) {
					$declared[ $json['name'] ][] = $name;
					$this->assertSame( '', $attrs[ $name ]['default'], $json['name'] . ' ' . $name . ' defaults to nothing' );
				}
			}
		}
		ksort( $declared );
		$this->assertSame(
			array( 'sgs/heading', 'sgs/label', 'sgs/text' ),
			array_keys( $declared )
		);
		foreach ( $declared as $names ) {
			$this->assertSame( array( 'fontVariantNumeric', 'textShadow', 'textShadowColour' ), $names );
		}
	}
}
