<?php
/**
 * Sgs/form-field-tiles: the chosen tile's border width and offset come from the tile's own settings.
 *
 * Empty settings print nothing (the stylesheet's 3px stays the default); set ones print into the chosen-tile rule.
 *
 * Run with: vendor/bin/phpunit --filter FormFieldTilesChosenLookTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

/**
 * Chosen tile width and offset.
 */
final class FormFieldTilesChosenLookTest extends TestCase {

	use BlockHarnessRenderTrait;

	/**
	 * Attributes for a two-tile field.
	 *
	 * @param array<string, mixed> $extra Further block attributes.
	 * @return array<string, mixed>
	 */
	private function attrs( array $extra = array() ): array {
		return array_merge(
			array(
				'fieldName' => 'topic',
				'label'     => 'Topic',
				'tiles'     => array(
					array(
						'value' => 'a',
						'label' => 'A',
					),
					array(
						'value' => 'b',
						'label' => 'B',
					),
				),
			),
			$extra
		);
	}

	public function test_width_and_offset_print_in_the_chosen_tile_rule(): void {
		$out = $this->render_block(
			'sgs/form-field-tiles',
			$this->attrs(
				array(
					'tileSelectedBorderWidth' => '2px',
					'tileSelectedOffset'      => array(
						'x' => '-2px',
						'y' => '-2px',
					),
				)
			)
		);
		$this->assertMatchesRegularExpression( '/\.sgs-form-tile--selected,[^{]*:has\(input:checked\)\{[^}]*border-width:2px;[^}]*transform:translate\(-2px,-2px\);/', $out['html'] );
	}

	public function test_unsafe_values_print_nothing(): void {
		$out = $this->render_block(
			'sgs/form-field-tiles',
			$this->attrs(
				array(
					'tileSelectedBorderWidth' => '2px;}x{y:z',
					'tileSelectedOffset'      => array(
						'x' => '-2px 4px',
						'y' => '-calc(1px)',
					),
				)
			)
		);
		$this->assertStringNotContainsString( 'border-width:2px', $out['html'] );
		$this->assertStringNotContainsString( 'translate(', $out['html'] );
	}

	public function test_unset_settings_leave_the_chosen_rule_alone(): void {
		$out = $this->render_block( 'sgs/form-field-tiles', $this->attrs() );
		$this->assertStringNotContainsString( 'translate(', $out['html'] );
		$this->assertDoesNotMatchRegularExpression( '/sgs-form-tile--selected,[^{]*:has\(input:checked\)\{[^}]*border-width/', $out['html'] );
	}
}
