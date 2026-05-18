<?php
/**
 * Tests: sgs/pricing-table render.php contracts.
 *
 * Covers:
 *  - Per-plan icon renders when iconName set
 *  - Ribbon renders when ribbonText set
 *  - Feature with included=false renders cross icon + --excluded class
 *  - Legacy string feature -> treated as included=true with check icon
 *  - billingToggle='yearly-only' -> toggle UI not rendered, yearly prices shown
 *  - billingToggle=true (legacy boolean) -> treated as 'monthly-yearly'
 *  - billingToggle=false (legacy boolean) -> treated as 'none'
 *  - Savings badge rendered (hidden) when savingsBadgeText set + toggle active
 *  - SGS-BEM class presence checks
 *
 * Self-contained -- simulates a minimal WordPress environment so render.php
 * can be included directly without a full WP install.
 *
 * @package SGS\Blocks\Tests
 */

use PHPUnit\Framework\TestCase;

/**
 * Class PricingTableTest
 */
class PricingTableTest extends TestCase {

	// ---- Helpers -------------------------------------------------------------

	/**
	 * Path to the render.php under test.
	 */
	private function render_path(): string {
		return SGS_BLOCKS_PLUGIN_DIR . '/src/blocks/pricing-table/render.php';
	}

	/**
	 * Render the pricing table with the given attributes and return the HTML.
	 *
	 * @param array $attributes Block attributes.
	 * @return string Rendered HTML.
	 */
	private function render( array $attributes ): string {
		$content = ''; // phpcs:ignore VariableAnalysis.CodeAnalysis.VariableAnalysis.UnusedVariable -- required by render.php contract.
		$block   = null; // phpcs:ignore VariableAnalysis.CodeAnalysis.VariableAnalysis.UnusedVariable -- required by render.php contract.

		ob_start();
		try {
			// phpcs:ignore WordPressVIPMinimum.Files.IncludingFile.UsingVariable
			include $this->render_path();
		} catch ( \Throwable $e ) {
			ob_end_clean();
			throw $e;
		}
		return (string) ob_get_clean();
	}

	/**
	 * Define minimal WordPress function stubs needed by render.php.
	 * Idempotent -- only defines functions that don't already exist.
	 */
	private function maybe_define_stubs(): void {
		if ( ! defined( 'ABSPATH' ) ) {
			define( 'ABSPATH', '/' );
		}
	}

	/**
	 * Return minimal plan defaults to keep test cases brief.
	 *
	 * @return array
	 */
	private function base_plan(): array {
		return array(
			'name'             => 'Test Plan',
			'price'            => '9',
			'priceYearly'      => '90',
			'period'           => 'monthly',
			'description'      => 'A test plan.',
			'features'         => array(
				array(
					'text'     => 'Feature A',
					'included' => true,
				),
			),
			'ctaText'          => 'Get started',
			'ctaUrl'           => '',
			'highlighted'      => false,
			'iconName'         => '',
			'ribbonText'       => '',
			'ribbonColour'     => 'accent',
			'savingsBadgeText' => '',
		);
	}

	/**
	 * Return minimal block attribute defaults.
	 *
	 * @param array $override Override specific attributes.
	 * @return array
	 */
	private function base_attrs( array $override = array() ): array {
		return array_merge(
			array(
				'columns'                   => 3,
				'billingToggle'             => 'monthly-yearly',
				'toggleStyle'               => 'text',
				'billingToggleMonthlyLabel' => 'Monthly',
				'billingToggleYearlyLabel'  => 'Yearly',
				'plans'                     => array( $this->base_plan() ),
				'style'                     => 'card',
				'titleColour'               => '',
				'priceColour'               => '',
				'featureColour'             => '',
				'ctaStyle'                  => 'accent',
				'ctaColour'                 => '',
				'ctaBackground'             => '',
				'popularBadgeText'          => 'Popular',
				'popularBadgeColour'        => 'white',
				'popularBadgeBackground'    => 'accent',
			),
			$override
		);
	}

	// ---- Tests ---------------------------------------------------------------

	/**
	 * Per-plan icon renders a .sgs-pricing-table__icon wrapper when iconName set.
	 */
	public function test_icon_renders_when_icon_name_set(): void {
		$plan             = $this->base_plan();
		$plan['iconName'] = 'star';

		$html = $this->render( $this->base_attrs( array( 'plans' => array( $plan ) ) ) );

		$this->assertStringContainsString(
			'class="sgs-pricing-table__icon"',
			$html,
			'Expected .sgs-pricing-table__icon wrapper when iconName is set.'
		);
		$this->assertStringContainsString( '<svg', $html, 'Expected SVG inside the icon wrapper.' );
	}

	/**
	 * No icon wrapper rendered when iconName is empty.
	 */
	public function test_icon_not_rendered_when_icon_name_empty(): void {
		$html = $this->render( $this->base_attrs() );

		$this->assertStringNotContainsString(
			'sgs-pricing-table__icon',
			$html,
			'Icon wrapper should not appear when iconName is empty.'
		);
	}

	/**
	 * Ribbon renders when ribbonText is set.
	 */
	public function test_ribbon_renders_when_ribbon_text_set(): void {
		$plan                 = $this->base_plan();
		$plan['ribbonText']   = 'Best value';
		$plan['ribbonColour'] = 'primary';

		$html = $this->render( $this->base_attrs( array( 'plans' => array( $plan ) ) ) );

		$this->assertStringContainsString(
			'class="sgs-pricing-table__ribbon"',
			$html,
			'Expected .sgs-pricing-table__ribbon when ribbonText is set.'
		);
		$this->assertStringContainsString( 'Best value', $html, 'Ribbon text should appear.' );
	}

	/**
	 * No ribbon when ribbonText is empty.
	 */
	public function test_ribbon_not_rendered_when_ribbon_text_empty(): void {
		$html = $this->render( $this->base_attrs() );

		$this->assertStringNotContainsString(
			'sgs-pricing-table__ribbon',
			$html,
			'Ribbon element should not appear when ribbonText is empty.'
		);
	}

	/**
	 * Feature with included=false renders cross icon and --excluded class.
	 */
	public function test_excluded_feature_renders_cross_icon_and_class(): void {
		$plan             = $this->base_plan();
		$plan['features'] = array(
			array(
				'text'     => 'Not included',
				'included' => false,
			),
		);

		$html = $this->render( $this->base_attrs( array( 'plans' => array( $plan ) ) ) );

		$this->assertStringContainsString(
			'sgs-pricing-table__feature--excluded',
			$html,
			'Expected --excluded modifier on the feature list item.'
		);
		$this->assertStringContainsString(
			'sgs-pricing-table__feature-icon--cross',
			$html,
			'Expected cross icon class on the SVG element.'
		);
	}

	/**
	 * Feature with included=true renders check icon and --included class.
	 */
	public function test_included_feature_renders_check_icon_and_class(): void {
		$plan             = $this->base_plan();
		$plan['features'] = array(
			array(
				'text'     => 'Feature A',
				'included' => true,
			),
		);

		$html = $this->render( $this->base_attrs( array( 'plans' => array( $plan ) ) ) );

		$this->assertStringContainsString(
			'sgs-pricing-table__feature--included',
			$html,
			'Expected --included modifier on the feature list item.'
		);
		$this->assertStringContainsString(
			'sgs-pricing-table__feature-icon--check',
			$html,
			'Expected check icon class on the SVG element.'
		);
	}

	/**
	 * Legacy string features are treated as included=true.
	 */
	public function test_legacy_string_feature_treated_as_included(): void {
		$plan             = $this->base_plan();
		$plan['features'] = array( 'Legacy feature' );

		$html = $this->render( $this->base_attrs( array( 'plans' => array( $plan ) ) ) );

		$this->assertStringContainsString(
			'sgs-pricing-table__feature--included',
			$html,
			'Legacy string feature must be treated as included=true.'
		);
		$this->assertStringContainsString( 'Legacy feature', $html );
		$this->assertStringNotContainsString(
			'sgs-pricing-table__feature--excluded',
			$html,
			'No --excluded class when feature is a legacy string.'
		);
	}

	/**
	 * BillingToggle='yearly-only' does not render the toggle UI and hides monthly prices.
	 */
	public function test_yearly_only_hides_toggle_and_monthly_price(): void {
		$plan                = $this->base_plan();
		$plan['priceYearly'] = '90';

		$html = $this->render(
			$this->base_attrs(
				array(
					'billingToggle' => 'yearly-only',
					'plans'         => array( $plan ),
				)
			)
		);

		$this->assertStringNotContainsString(
			'sgs-pricing-table__billing-toggle',
			$html,
			'Toggle UI must not render when billingToggle=yearly-only.'
		);
		$this->assertStringNotContainsString(
			'sgs-pricing-table--has-toggle',
			$html,
			'has-toggle modifier must not appear when billingToggle=yearly-only.'
		);
		$this->assertStringContainsString(
			'price--monthly" hidden',
			$html,
			'Monthly price must have hidden attribute when billingToggle=yearly-only.'
		);
	}

	/**
	 * Legacy billingToggle=true is treated as 'monthly-yearly'.
	 */
	public function test_legacy_boolean_true_renders_toggle_ui(): void {
		$html = $this->render( $this->base_attrs( array( 'billingToggle' => true ) ) );

		$this->assertStringContainsString(
			'sgs-pricing-table--has-toggle',
			$html,
			'billingToggle=true (legacy) must render the toggle UI.'
		);
		$this->assertStringContainsString( 'sgs-pricing-table__billing-toggle', $html );
	}

	/**
	 * Legacy billingToggle=false is treated as 'none'.
	 */
	public function test_legacy_boolean_false_hides_toggle_ui(): void {
		$html = $this->render( $this->base_attrs( array( 'billingToggle' => false ) ) );

		$this->assertStringNotContainsString(
			'sgs-pricing-table--has-toggle',
			$html,
			'billingToggle=false (legacy) must not render the toggle UI.'
		);
		$this->assertStringNotContainsString( 'sgs-pricing-table__billing-toggle', $html );
	}

	/**
	 * Savings badge is rendered (hidden) when savingsBadgeText is set and yearly is shown.
	 */
	public function test_savings_badge_renders_hidden_when_set_and_yearly_active(): void {
		$plan                     = $this->base_plan();
		$plan['savingsBadgeText'] = 'Save 17%';
		$plan['priceYearly']      = '290';

		$html = $this->render(
			$this->base_attrs(
				array(
					'billingToggle' => 'monthly-yearly',
					'plans'         => array( $plan ),
				)
			)
		);

		$this->assertStringContainsString(
			'class="sgs-pricing-table__savings-badge" hidden',
			$html,
			'Savings badge must be present and hidden by default.'
		);
		$this->assertStringContainsString( 'Save 17%', $html );
	}

	/**
	 * Savings badge is NOT rendered when billingToggle excludes yearly.
	 */
	public function test_savings_badge_not_rendered_when_yearly_excluded(): void {
		$plan                     = $this->base_plan();
		$plan['savingsBadgeText'] = 'Save 17%';

		$html = $this->render(
			$this->base_attrs(
				array(
					'billingToggle' => 'monthly-only',
					'plans'         => array( $plan ),
				)
			)
		);

		$this->assertStringNotContainsString(
			'sgs-pricing-table__savings-badge',
			$html,
			'Savings badge must not appear when billingToggle excludes yearly.'
		);
	}

	/**
	 * SGS-BEM plan--highlighted modifier is present on a highlighted plan.
	 */
	public function test_sgs_bem_plan_highlighted_modifier(): void {
		$plan                = $this->base_plan();
		$plan['highlighted'] = true;

		$html = $this->render( $this->base_attrs( array( 'plans' => array( $plan ) ) ) );

		$this->assertStringContainsString( 'sgs-pricing-table__plan--highlighted', $html );
	}

	/**
	 * PHP lint: render.php must have no syntax errors.
	 */
	public function test_render_php_has_no_syntax_errors(): void {
		$php  = PHP_BINARY;
		$path = $this->render_path();
		$args = array( '-l', $path );

		// Use proc_open to avoid shell injection (no shell_exec).
		// phpcs:disable WordPress.PHP.DiscouragedPHPFunctions.system_calls_proc_open
		// phpcs:disable WordPress.WP.AlternativeFunctions.file_system_operations_fclose
		$descriptors = array(
			0 => array( 'pipe', 'r' ),
			1 => array( 'pipe', 'w' ),
			2 => array( 'pipe', 'w' ),
		);
		$process     = proc_open( array( $php, ...$args ), $descriptors, $pipes );
		fclose( $pipes[0] );
		$output = stream_get_contents( $pipes[1] ) . stream_get_contents( $pipes[2] );
		fclose( $pipes[1] );
		fclose( $pipes[2] );
		proc_close( $process );
		// phpcs:enable WordPress.PHP.DiscouragedPHPFunctions.system_calls_proc_open
		// phpcs:enable WordPress.WP.AlternativeFunctions.file_system_operations_fclose

		$this->assertStringContainsString( 'No syntax errors', $output );
	}
}
