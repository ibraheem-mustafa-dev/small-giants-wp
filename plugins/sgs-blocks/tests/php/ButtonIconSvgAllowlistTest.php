<?php
/**
 * A button's custom icon (iconSvg) keeps its presentation attributes. The button re-filters its icon twice (the icon
 * renderer and the inner-markup pass); both read sgs_button_icon_svg_allowed(), which takes each shape's attributes
 * from the shared sgs_svg_kses_allowed_tags(). With the old Lucide-only lists an outline envelope icon
 * (<rect stroke-width fill="none"> plus <polyline stroke>) lost every stroke attribute and painted as a solid square.
 *
 * @package SGS\Blocks\Tests
 */

use PHPUnit\Framework\TestCase;

/**
 * The button icon allowlist matches the shared one per tag and stays narrow in tags.
 */
class ButtonIconSvgAllowlistTest extends TestCase {

	/**
	 * Load the helpers under test.
	 */
	public static function setUpBeforeClass(): void {
		require_once dirname( __DIR__, 2 ) . '/includes/helpers-button-inner-kses.php';
	}

	/**
	 * Every shape keeps the stroke and fill attributes an outline icon draws with.
	 */
	public function test_shapes_keep_stroke_and_fill_attributes(): void {
		$allowed = sgs_button_icon_svg_allowed();
		foreach ( array( 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'g' ) as $shape ) {
			foreach ( array( 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin' ) as $attr ) {
				$this->assertArrayHasKey( $attr, $allowed[ $shape ], "{$shape} keeps {$attr}" );
			}
		}
	}

	/**
	 * Each tag carries exactly the shared helper's attributes for it.
	 */
	public function test_each_tag_matches_the_shared_allowlist(): void {
		$shared = sgs_svg_kses_allowed_tags();
		foreach ( sgs_button_icon_svg_allowed() as $tag => $attrs ) {
			$this->assertSame( $shared[ $tag ], $attrs, "{$tag} matches sgs_svg_kses_allowed_tags()" );
		}
	}

	/**
	 * The tag set stays narrow: nothing that references, filters, masks or animates.
	 */
	public function test_the_tag_set_stays_narrow(): void {
		$allowed = sgs_button_icon_svg_allowed();
		foreach ( array( 'use', 'defs', 'symbol', 'filter', 'mask', 'lineargradient', 'image', 'animate', 'set', 'style', 'script', 'a' ) as $tag ) {
			$this->assertArrayNotHasKey( $tag, $allowed, "{$tag} is not allowed in a button icon" );
		}
	}
}
