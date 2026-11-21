<?php
/**
 * Tests: includes/helpers-tokens.php::sgs_css_gradient_value accepts one gradient and a comma-separated stack of
 * gradients (several background layers in one `background-image`), and refuses a value, stacked or not, that holds a
 * URL fetch or a declaration breakout.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../includes/helpers-tokens.php';

final class CssGradientValueTest extends TestCase {

	public function test_one_gradient_is_accepted(): void {
		$one = 'linear-gradient(180deg, rgba(10,20,60,0.9) 0%, rgb(200 40 40 / 20%) 100%)';
		$this->assertSame( $one, sgs_css_gradient_value( $one ) );
		$this->assertSame( 'radial-gradient(circle at 30% 30%, #fff, #000)', sgs_css_gradient_value( '  radial-gradient(circle at 30% 30%, #fff, #000) ' ) );
	}

	public function test_a_stack_of_gradients_is_accepted(): void {
		$two = 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 40%), radial-gradient(ellipse at 50% 0%, var(--wp--preset--color--primary) 0%, transparent 70%)';
		$this->assertSame( $two, sgs_css_gradient_value( $two ) );
		$three = 'repeating-linear-gradient(45deg, #000 0 2px, transparent 2px 8px), conic-gradient(from 90deg, red, blue), linear-gradient(#fff, #eee)';
		$this->assertSame( $three, sgs_css_gradient_value( $three ) );
	}

	public function test_a_stack_holding_a_url_is_refused(): void {
		$this->assertSame( '', sgs_css_gradient_value( 'linear-gradient(#000, #fff), url(https://example.com/x.png)' ) );
		$this->assertSame( '', sgs_css_gradient_value( 'linear-gradient(#000, #fff), linear-gradient(url(x), #fff)' ) );
		$this->assertSame( '', sgs_css_gradient_value( 'linear-gradient(#000, #fff), URL (x)' ) );
	}

	public function test_a_stack_holding_a_breakout_is_refused(): void {
		$this->assertSame( '', sgs_css_gradient_value( 'linear-gradient(#000, #fff), linear-gradient(#fff, #000);position:fixed' ) );
		$this->assertSame( '', sgs_css_gradient_value( 'linear-gradient(#000, #fff)}body{display:none}, linear-gradient(#fff, #000)' ) );
		$this->assertSame( '', sgs_css_gradient_value( 'linear-gradient(#000, #fff), linear-gradient(#fff, #000){' ) );
	}

	public function test_a_value_not_opening_with_a_gradient_is_refused(): void {
		$this->assertSame( '', sgs_css_gradient_value( '#000, linear-gradient(#fff, #000)' ) );
		$this->assertSame( '', sgs_css_gradient_value( '' ) );
		$this->assertSame( '', sgs_css_gradient_value( null ) );
	}
}
