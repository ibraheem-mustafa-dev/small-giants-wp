<?php
/**
 * The basket drawer's panel paints the page's own surface when its `panelBg` is unset or names a palette colour the site
 * does not define, never `currentColor` (F-18): `panelBg` defaults to `base`, which none of the client snapshots defines,
 * and the shared colour helper's fallback for an orphaned slug is `currentColor`, so the panel painted its own dark text
 * colour behind its text.
 *
 * Runs the cart's scoped-CSS partial (src/blocks/cart/render-scoped-css.php) in a child process with the shared helpers
 * loaded, as CartBadgeHoverTest does.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter CartPanelSurfaceTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class CartPanelSurfaceTest extends TestCase {

	/**
	 * The `::after` rule the partial prints for the drawer panel, for these attributes.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 * @param string               $globals    PHP run before the partial (stubs for the global-styles read).
	 */
	private function panel_layer( array $attributes, string $globals = '' ): string {
		$root   = dirname( __DIR__, 2 );
		$script = tempnam( sys_get_temp_dir(), 'sgssurf' );
		$code   = '<?php define( "ABSPATH", "/" ); error_reporting( E_ERROR | E_PARSE );'
			. $globals
			. ' require ' . var_export( $root . '/scripts/qa/lib/wp-stubs.php', true ) . ';'
			. ' require ' . var_export( $root . '/scripts/qa/lib/motion-targets-stubs.php', true ) . ';'
			. ' require ' . var_export( $root . '/includes/render-helpers.php', true ) . ';'
			. ' $attributes = ' . var_export( $attributes, true ) . ';'
			. ' $sel = ".sgs-cart-x"; $uid = "sgs-cart-x"; $has_panel = true; $effective_mode = "drawer"; $badge_colour = ""; $badge_text_colour = ""; $scoped_css = array();'
			. ' $panel_bg_slug = isset( $attributes["panelBg"] ) ? (string) $attributes["panelBg"] : "base";'
			. ' $panel_text_slug = isset( $attributes["panelTextColour"] ) ? (string) $attributes["panelTextColour"] : "contrast";'
			. ' $free_delivery_fill_colour = ""; $free_delivery_track_colour = "";'
			. ' $sgs_cart_tier_keys = array( "desktop", "tablet", "mobile" ); $sgs_cart_tier_media = array( "desktop" => "", "tablet" => "@media (max-width:1023.98px)", "mobile" => "@media (max-width:767.98px)" );'
			. ' $sgs_cart_tier_ranges = array( "desktop" => "(min-width:1024px)", "tablet" => "(min-width:768px) and (max-width:1023.98px)", "mobile" => "(max-width:767.98px)" );'
			. ' $trigger_tiers = array( "lg" => "icon", "md" => "icon", "sm" => "icon" ); $trigger_mixed = false; $trigger_has_pill = false; $trigger_ranges = array( "pill" => array(), "icon" => array() );'
			. ' require ' . var_export( $root . '/src/blocks/cart/render-scoped-css.php', true ) . ';'
			. ' foreach ( $scoped_css as $rule ) { if ( 0 === strpos( (string) $rule, ".sgs-cart-x.sgs-cart__panel::after" ) ) { echo $rule; } }';
		file_put_contents( $script, $code );
		try {
			return (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' 2>&1' );
		} finally {
			@unlink( $script ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
	}

	public function test_the_default_base_slug_falls_back_to_the_surface_not_current_color(): void {
		$layer = $this->panel_layer( array() );
		$this->assertStringContainsString( 'background-color:var(--wp--preset--color--base, var(--wp--preset--color--surface, Canvas))', $layer );
		$this->assertStringNotContainsString( 'currentColor', $layer, 'the panel never paints its own text colour behind its text' );
	}

	public function test_any_palette_slug_keeps_its_colour_and_falls_back_to_the_surface(): void {
		$layer = $this->panel_layer( array( 'panelBg' => 'mm-paper' ) );
		$this->assertStringContainsString( 'background-color:var(--wp--preset--color--mm-paper, var(--wp--preset--color--surface, Canvas))', $layer );
	}

	public function test_an_unset_panel_background_paints_the_surface(): void {
		$layer = $this->panel_layer( array( 'panelBg' => '' ) );
		$this->assertStringContainsString( 'background-color:var(--wp--preset--color--surface, Canvas)', $layer, 'an emptied panelBg still paints a surface, not a see-through panel' );
	}

	public function test_the_surface_is_the_site_page_background_from_global_styles(): void {
		$stub  = ' function wp_get_global_styles( $path = array() ) { return array( "color", "background" ) === $path ? "var:preset|color|paper" : null; }';
		$layer = $this->panel_layer( array(), $stub );
		$this->assertStringContainsString( 'background-color:var(--wp--preset--color--base, var(--wp--preset--color--paper, Canvas))', $layer );
	}

	public function test_a_raw_colour_and_a_gradient_print_as_set(): void {
		$this->assertStringContainsString( 'background-color:#FAFAF5;', $this->panel_layer( array( 'panelBg' => '#FAFAF5' ) ), 'control: a raw colour has no fallback to add' );
		$this->assertStringContainsString( 'background-image:linear-gradient(#fff, #eee)', $this->panel_layer( array( 'panelBgGradient' => 'linear-gradient(#fff, #eee)' ) ), 'control: a gradient wins' );
	}
}
