<?php
/**
 * sgs_css_single_length_value(): a negative length is refused by default and allowed only with the opt-in.
 *
 * Run with: vendor/bin/phpunit --filter CssSingleLengthNegativeTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}
require_once dirname( __DIR__, 2 ) . '/includes/helpers-css-safety.php';

/**
 * Negative single lengths.
 */
final class CssSingleLengthNegativeTest extends TestCase {

	public function test_negative_is_refused_by_default(): void {
		$this->assertSame( '', sgs_css_single_length_value( '-2px' ) );
		$this->assertSame( '', sgs_css_single_length_value( '-0.5rem', false ) );
	}

	public function test_negative_is_allowed_with_the_opt_in(): void {
		$this->assertSame( '-2px', sgs_css_single_length_value( '-2px', true ) );
		$this->assertSame( '-0.5rem', sgs_css_single_length_value( ' -0.5rem', true ) );
	}

	public function test_opt_in_still_refuses_lists_functions_and_junk(): void {
		$this->assertSame( '', sgs_css_single_length_value( '-2px 4px', true ) );
		$this->assertSame( '', sgs_css_single_length_value( '-calc(1px)', true ) );
		$this->assertSame( '', sgs_css_single_length_value( '-2px;}x{y:z', true ) );
	}

	public function test_positive_values_are_unchanged_either_way(): void {
		$this->assertSame( '2px', sgs_css_single_length_value( '2px' ) );
		$this->assertSame( '2px', sgs_css_single_length_value( '2px', true ) );
		$this->assertSame( 'calc(1px + 2px)', sgs_css_single_length_value( 'calc(1px + 2px)', true ) );
	}
}
