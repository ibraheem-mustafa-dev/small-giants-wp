<?php
/**
 * Condensed opening hours: sgs/business-info (`hoursLayout: condensed`) and the sgs/icon-list `hours` item both read
 * includes/helpers-site-info-items.php, so grouped day ranges, the Closed label and the show-closed switch print the
 * same text in both. The icon-list item never lists a closed day, so it matches business-info with show-closed off.
 *
 * Run with: vendor/bin/phpunit --filter SiteInfoCondensedHoursTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class SiteInfoCondensedHoursTest extends TestCase {

	use BlockHarnessRenderTrait;

	private const EN_DASH = "\u{2013}";

	/** Mon-Wed share hours, Thu differs, Fri-Sat are closed, Sun differs: a range, singles and a closed run. */
	private const HOURS = array(
		'mon' => '9.30-17.30',
		'tue' => '9.30-17.30',
		'wed' => '9.30-17.30',
		'thu' => '9.30-14',
		'fri' => '',
		'sat' => '',
		'sun' => '10-14',
	);

	protected function tearDown(): void {
		putenv( 'SGS_QA_OPTIONS' );
	}

	private function site_info( array $hours ): void {
		putenv( 'SGS_QA_OPTIONS=' . json_encode( array( 'sgs_site_info' => array( 'opening_hours' => $hours ) ) ) );
	}

	/**
	 * The rows sgs/business-info prints, as "Day value" strings.
	 *
	 * @param array<string,mixed> $attributes Extra block attributes.
	 * @return string[]
	 */
	private function business_info_rows( array $attributes = array() ): array {
		$html = $this->render_block( 'sgs/business-info', array_merge( array( 'displayType' => 'hours', 'hoursLayout' => 'condensed' ), $attributes ) )['html'];
		preg_match_all( '#<dt class="sgs-business-hours__day">(.*?)</dt><dd class="sgs-business-hours__time">(.*?)</dd>#', $html, $m, PREG_SET_ORDER );
		return array_map( static fn( array $row ): string => html_entity_decode( $row[1] . ' ' . $row[2] ), $m );
	}

	private function icon_list_hours_text(): string {
		$html = $this->render_block( 'sgs/icon-list', array( 'items' => array( array( 'siteInfoSource' => 'hours' ) ) ) )['html'];
		$this->assertMatchesRegularExpression( '#<span class="sgs-icon-list__text">(.*?)</span>#s', $html, 'positive control: the hours item rendered' );
		preg_match( '#<span class="sgs-icon-list__text">(.*?)</span>#s', $html, $m );
		return html_entity_decode( strip_tags( $m[1] ) );
	}

	public function test_grouped_day_ranges_and_hidden_closed_days(): void {
		$this->site_info( self::HOURS );
		$this->assertSame(
			array( 'Mon' . self::EN_DASH . 'Wed 9.30-17.30', 'Thu 9.30-14', 'Sun 10-14' ),
			$this->business_info_rows(),
			'consecutive equal days fold into a range and closed days are left out'
		);
	}

	public function test_show_closed_lists_closed_days_and_folds_runs_of_them(): void {
		$this->site_info( self::HOURS );
		$this->assertSame(
			array( 'Mon' . self::EN_DASH . 'Wed 9.30-17.30', 'Thu 9.30-14', 'Fri' . self::EN_DASH . 'Sat Closed', 'Sun 10-14' ),
			$this->business_info_rows( array( 'hoursShowClosed' => true ) )
		);
	}

	public function test_a_custom_closed_label_replaces_the_default(): void {
		$this->site_info( self::HOURS );
		$rows = $this->business_info_rows( array( 'hoursShowClosed' => true, 'hoursClosedLabel' => 'Shut' ) );
		$this->assertContains( 'Fri' . self::EN_DASH . 'Sat Shut', $rows );
		$this->assertNotContains( 'Fri' . self::EN_DASH . 'Sat Closed', $rows );
	}

	public function test_the_icon_list_hours_item_prints_the_same_text_as_business_info(): void {
		$this->site_info( self::HOURS );
		$expected = implode( '; ', $this->business_info_rows() );
		$this->assertSame( 'Mon' . self::EN_DASH . 'Wed 9.30-17.30; Thu 9.30-14; Sun 10-14', $expected );
		$this->assertSame( $expected, $this->icon_list_hours_text() );
	}

	public function test_the_icon_list_item_never_lists_closed_days_even_when_business_info_does(): void {
		$this->site_info( self::HOURS );
		$this->assertStringContainsString( 'Closed', implode( '; ', $this->business_info_rows( array( 'hoursShowClosed' => true ) ) ), 'positive control' );
		$this->assertStringNotContainsString( 'Closed', $this->icon_list_hours_text() );
	}

	public function test_all_days_equal_is_one_range_and_no_hours_prints_nothing(): void {
		$this->site_info( array_fill_keys( array_keys( self::HOURS ), '10-16' ) );
		$this->assertSame( array( 'Mon' . self::EN_DASH . 'Sun 10-16' ), $this->business_info_rows() );
		$this->site_info( array() );
		$this->assertSame( array(), $this->business_info_rows() );
	}

	public function test_a_hidden_closed_day_breaks_a_run_so_it_never_reads_as_open(): void {
		$this->site_info( array( 'mon' => '9-17', 'tue' => '9-17', 'wed' => '9-17', 'thu' => '', 'fri' => '9-17', 'sat' => '', 'sun' => '' ) );
		$this->assertSame( array( 'Mon' . self::EN_DASH . 'Wed 9-17', 'Fri 9-17' ), $this->business_info_rows() );
		$this->assertSame( 'Mon' . self::EN_DASH . 'Wed 9-17; Fri 9-17', $this->icon_list_hours_text() );
	}
}
