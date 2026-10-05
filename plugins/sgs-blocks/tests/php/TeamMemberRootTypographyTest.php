<?php
/**
 * sgs/team-member root typography reaches the front end.
 *
 * The card root's fontSize / fontWeight / fontStyle / lineHeight are set by the
 * "Card" target of the Typography panel and must land on the card's own scoped
 * selector.
 *
 * Run with: vendor/bin/phpunit --filter TeamMemberRootTypographyTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class TeamMemberRootTypographyTest extends TestCase {

	use BlockHarnessRenderTrait;

	public function test_root_typography_is_emitted_on_the_card_root(): void {
		$out = $this->render_block(
			'sgs/team-member',
			array(
				'name'       => 'Ada',
				'fontSize'   => array( 'desktop' => 22 ),
				'lineHeight' => array( 'desktop' => 1.4 ),
				'fontWeight' => '700',
				'fontStyle'  => 'italic',
			)
		);

		$this->assertSame( 1, preg_match( '/sgs-team-member-[0-9a-f]{8}/', $out['html'], $m ) );
		$root = '.' . $m[0] . '.wp-block-sgs-team-member{';

		$this->assertStringContainsString( $root . 'font-size:22px;line-height:1.4;}', $out['css'] );
		$this->assertStringContainsString( $root . 'font-weight:700;font-style:italic;}', $out['css'] );
	}
}
