<?php
/**
 * Every tier query SGS_Breakpoints can emit matches exactly one of mobile, tablet-only and desktop at 767, 767.5, 768,
 * 1023, 1023.5 and 1024px, so a fractional viewport (browser zoom, a scaled display) never falls between two tiers.
 *
 * The test evaluates the emitted `(min-width:Xpx)` and `(max-width:Ypx)` conditions at each width, so it asserts the
 * rule a browser would apply, not a string.
 *
 * @package SGS\Blocks\Tests
 */

use PHPUnit\Framework\TestCase;

class BreakpointTierExclusivityTest extends TestCase {

	public static function setUpBeforeClass(): void {
		require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-breakpoints.php';
	}

	/**
	 * Whether a media condition such as `(min-width:768px) and (max-width:1023.98px)` matches a viewport width.
	 *
	 * @param string $query Bare media condition built from min-width / max-width terms.
	 * @param float  $width Viewport width in px.
	 */
	private function query_matches( string $query, float $width ): bool {
		preg_match_all( '/\((min|max)-width:\s*([0-9.]+)px\)/', $query, $terms, PREG_SET_ORDER );
		$this->assertNotEmpty( $terms, "query has width terms: $query" );
		foreach ( $terms as $term ) {
			$bound = (float) $term[2];
			if ( 'min' === $term[1] && $width < $bound ) {
				return false;
			}
			if ( 'max' === $term[1] && $width > $bound ) {
				return false;
			}
		}
		return true;
	}

	/** @return array<string,array{0:float}> */
	public static function widths(): array {
		$out = array();
		foreach ( array( 767, 767.5, 768, 1023, 1023.5, 1024 ) as $width ) {
			$out[ (string) $width ] = array( (float) $width );
		}
		return $out;
	}

	#[\PHPUnit\Framework\Attributes\DataProvider( 'widths' )]
	public function test_exactly_one_tier_matches( float $width ): void {
		$tiers   = array( 'mobile', 'tablet-only', 'desktop' );
		$matched = array_values(
			array_filter(
				$tiers,
				fn( $range ) => $this->query_matches( SGS_Breakpoints::query( $range ), $width )
			)
		);
		$this->assertCount( 1, $matched, "exactly one of mobile, tablet-only, desktop matches at {$width}px, got: " . implode( ',', $matched ) );
	}

	#[\PHPUnit\Framework\Attributes\DataProvider( 'widths' )]
	public function test_cumulative_tiers_agree_with_the_exclusive_ones( float $width ): void {
		$mobile      = $this->query_matches( SGS_Breakpoints::query( 'mobile' ), $width );
		$tablet      = $this->query_matches( SGS_Breakpoints::query( 'tablet' ), $width );
		$tablet_up   = $this->query_matches( SGS_Breakpoints::query( 'tablet-up' ), $width );
		$desktop     = $this->query_matches( SGS_Breakpoints::query( 'desktop' ), $width );
		$tablet_only = $this->query_matches( SGS_Breakpoints::query( 'tablet-only' ), $width );
		$this->assertSame( $tablet, $mobile || $tablet_only, "tablet = mobile or tablet-only at {$width}px" );
		$this->assertSame( $tablet_up, $tablet_only || $desktop, "tablet-up = tablet-only or desktop at {$width}px" );
		$this->assertNotSame( $tablet, $desktop, "tablet and desktop are exact complements at {$width}px" );
	}

	public function test_every_helper_entry_point_emits_the_fractional_upper_bound(): void {
		$this->assertSame( '(max-width:767.98px)', SGS_Breakpoints::query( 'mobile' ) );
		$this->assertSame( '(max-width:1023.98px)', SGS_Breakpoints::query_fractional( 'tablet' ) );
		$this->assertSame( '@media(max-width:1023.98px)', SGS_Breakpoints::media( 'tablet' ) );
		$this->assertSame( '(max-width:767.98px)', SGS_Breakpoints::query_width( 'max', 767 ) );
		$this->assertSame( '(max-width:899.98px)', SGS_Breakpoints::query_width( 'max', '899px' ) );
		$this->assertSame( '(min-width:900px)', SGS_Breakpoints::query_width( 'min', 900 ) );
		$this->assertSame( '(max-width:600.5px)', SGS_Breakpoints::query_width( 'max', '600.5px' ) );
		$this->assertSame( array( '@media(max-width:767.98px){', '@container (max-width:479.98px){' ), SGS_Breakpoints::tier_at_rules( 767, true ) );
		$this->assertSame( array( '@media(max-width:1023.98px){' ), SGS_Breakpoints::tier_at_rules( 1023, true ) );
	}
}
