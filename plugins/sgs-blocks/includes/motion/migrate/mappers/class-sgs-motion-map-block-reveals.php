<?php
/**
 * The `block-reveals` migration mapper (Spec 38A §13.2 per-block reveal table, FR-38A-31, FR-38A-32): the reveal and
 * stagger inputs that belong to one block each.
 *
 * One rule per table row. Every rule reproduces what the old attribute did in that block's own code, not the
 * attribute's name:
 *
 * - `staggerDelay` (card-grid, gallery, testimonial): the step between items. card-grid fed it to the entrance
 *   observer as the children step, whose positions stop growing at 7 (`includes/animation-stagger.php::
 *   inject_entrance_stagger_attributes`, default max 7); gallery wrote `--sgs-stagger` and `--sgs-item-index` so each tile's
 *   `animation-delay` was step x index with no cap (`src/blocks/gallery/style.css::.sgs-has-stagger`); testimonial wrote
 *   `--sgs-stagger` that no stylesheet reads. They become the stagger helper's settings, which
 *   `Sgs_Motion_Stagger::compute_delays` turns into the same per-item delays (the standalone test proves it).
 * - `sgsStaggerDelay` (eight blocks): `includes/hover-effects/vars.php` wrote `--sgs-stagger` and `classes.php` the class
 *   `sgs-has-stagger`; nothing but the gallery stylesheet reads them, so the value only moves to the helper's step.
 * - `revealOnScroll`, `revealStagger`, `revealTrigger` (timeline): each entry faded in (opacity 0 and 20px down to rest,
 *   400ms ease-out, `src/blocks/timeline/style.scss::.sgs-timeline__entry`) when 15 percent of it was visible, after
 *   index x step milliseconds (`view.js::initScrollReveal`). `connector` revealed it as the progress fill reached its dot
 *   instead and ignored the step, and only when `connectorProgressFill` was on (`render.php` fell back to the viewport
 *   reveal otherwise). Off, or `scrollEffect: pinned-journey` on a vertical timeline, rendered every entry revealed.
 * - `photoEntrance` (buybox): `fade` and `rise` played the shared entrance tokens once at load on the main photo
 *   (`src/blocks/buybox/style.css::sgs-buybox-photo-in`), which are the `entrance-fade-in` and `entrance-fade-up` presets.
 * - `fxFooterStagger` (site-footer-row): a `scrub` reveal of the row root (opacity 0 and 40px down to rest over start
 *   `top 90%` to end `top 55%`, ease `power2.out`, one second of smoothing), written only when no `fxEffect` paint effect
 *   was set (`render.php`).
 * - `captionReveal` (gallery) is not handled: it is the gallery's display option, outside the motion model (Bean,
 *   2026-10-15), and stays on the block.
 *
 * An attribute is consumed only when the fragment carries it. A value with no faithful destination (out of range, wrong
 * type, off-enum) stays on the block and `unmapped()` gives the reason.
 *
 * The rules for the timeline, the buybox photo and the footer row live in
 * `Sgs_Motion_Reveal_Plans`; this class owns the table of blocks, `handles()`, `map()` and the two stagger rules.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/interface-sgs-motion-mapper.php';
require_once dirname( __DIR__ ) . '/class-sgs-motion-migrate-merge.php';
require_once dirname( __DIR__ ) . '/class-sgs-motion-reveal-plans.php';

/**
 * Class Sgs_Motion_Map_Block_Reveals
 */
final class Sgs_Motion_Map_Block_Reveals implements Sgs_Motion_Mapper_Interface {

	/**
	 * Blocks that declare `staggerDelay`: default step, the entrance observer's position cap (null = uncapped), the
	 * largest step the old code honoured and the part that carries the helper's settings. The schema requires a motion
	 * document to hold at least one element, so a stagger with no entrance of its own sits on an empty element: the
	 * repeated item part where the block has one, else the root. Defaults mirror `block.json` (the test compares them).
	 */
	const STAGGER_DELAY_BLOCKS = array(
		'sgs/card-grid'   => array(
			'default'   => 80,
			'positions' => 7,
			'max'       => 1000,
			'carrier'   => 'item',
		),
		'sgs/gallery'     => array(
			'default'   => 60,
			'positions' => null,
			'max'       => 2000,
			'carrier'   => 'item',
		),
		'sgs/testimonial' => array(
			'default'   => 0,
			'positions' => null,
			'max'       => 2000,
			'carrier'   => 'root',
		),
	);

	/** Blocks that declare `sgsStaggerDelay` through the hover-effects extension (default 0 on each). */
	const HOVER_STAGGER_BLOCKS = array(
		'sgs/container',
		'sgs/google-reviews',
		'sgs/info-box',
		'sgs/media',
		'sgs/pricing-table',
		'sgs/product-card',
		'sgs/team-member',
		'sgs/whatsapp-cta',
	);

	/** The timeline stagger default, mirroring `src/blocks/timeline/block.json`. */
	const TIMELINE_DEFAULT_STAGGER = Sgs_Motion_Reveal_Plans::TIMELINE_DEFAULT_STAGGER;

	/** The buybox main photo part the `photoEntrance` layer lands on. */
	const BUYBOX_PHOTO_PART = Sgs_Motion_Reveal_Plans::BUYBOX_PHOTO_PART;

	/**
	 * The mapper's family slug.
	 *
	 * @return string
	 */
	public function family(): string {
		return 'block-reveals';
	}

	/**
	 * Whether the block stores any attribute this mapper owns.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return bool
	 */
	public function handles( string $block_name, array $attrs ): bool {
		foreach ( self::owned_attributes( $block_name ) as $attr ) {
			if ( array_key_exists( $attr, $attrs ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * The attributes this mapper reads on a block.
	 *
	 * @param string $block_name Block name.
	 * @return string[]
	 */
	public static function owned_attributes( string $block_name ): array {
		$owned = array();
		if ( isset( self::STAGGER_DELAY_BLOCKS[ $block_name ] ) ) {
			$owned[] = 'staggerDelay';
		}
		if ( in_array( $block_name, self::HOVER_STAGGER_BLOCKS, true ) ) {
			$owned[] = 'sgsStaggerDelay';
		}
		if ( 'sgs/timeline' === $block_name ) {
			array_push( $owned, 'revealOnScroll', 'revealStagger', 'revealTrigger' );
		}
		if ( 'sgs/buybox' === $block_name ) {
			$owned[] = 'photoEntrance';
		}
		if ( 'sgs/site-footer-row' === $block_name ) {
			$owned[] = 'fxFooterStagger';
		}
		return $owned;
	}

	/**
	 * Map the block's reveal inputs.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return array{motion: array<string,mixed>, consumed: string[]}
	 */
	public function map( string $block_name, array $attrs ): array {
		$plan = self::plan( $block_name, $attrs );
		return array(
			'motion'   => $plan['motion'],
			'consumed' => $plan['consumed'],
		);
	}

	/**
	 * The stored values this mapper leaves on the block, with why.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return array<string,string> Attribute name => reason.
	 */
	public static function unmapped( string $block_name, array $attrs ): array {
		return self::plan( $block_name, $attrs )['unmapped'];
	}

	/**
	 * Work out the fragment, the consumed attributes and the values left alone.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return array{motion: array<string,mixed>, consumed: string[], unmapped: array<string,string>}
	 */
	private static function plan( string $block_name, array $attrs ): array {
		$parts = array();
		if ( isset( self::STAGGER_DELAY_BLOCKS[ $block_name ] ) ) {
			$parts[] = self::plan_stagger_delay( $block_name, $attrs );
		}
		if ( in_array( $block_name, self::HOVER_STAGGER_BLOCKS, true ) ) {
			$parts[] = self::plan_hover_stagger( $attrs );
		}
		if ( 'sgs/timeline' === $block_name ) {
			$parts[] = Sgs_Motion_Reveal_Plans::timeline( $attrs );
		}
		if ( 'sgs/buybox' === $block_name ) {
			$parts[] = Sgs_Motion_Reveal_Plans::photo_entrance( $attrs );
		}
		if ( 'sgs/site-footer-row' === $block_name ) {
			$parts[] = Sgs_Motion_Reveal_Plans::footer_scrub( $attrs );
		}
		$out = array(
			'motion'   => array(),
			'consumed' => array(),
			'unmapped' => array(),
		);
		foreach ( $parts as $part ) {
			$out['motion']   = Sgs_Motion_Migrate_Merge::merge( $out['motion'], $part['motion'] );
			$out['consumed'] = array_merge( $out['consumed'], $part['consumed'] );
			$out['unmapped'] = array_merge( $out['unmapped'], $part['unmapped'] );
		}
		if ( array() !== $out['motion'] ) {
			$out['motion'] = array_merge( array( 'v' => 1 ), $out['motion'] );
		}
		return $out;
	}


	/**
	 * `staggerDelay` on card-grid, gallery and testimonial.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return array{motion: array<string,mixed>, consumed: string[], unmapped: array<string,string>}
	 */
	private static function plan_stagger_delay( string $block_name, array $attrs ): array {
		$out = Sgs_Motion_Reveal_Plans::nothing();
		if ( ! array_key_exists( 'staggerDelay', $attrs ) ) {
			return $out;
		}
		$rule = self::STAGGER_DELAY_BLOCKS[ $block_name ];
		$step = Sgs_Motion_Reveal_Plans::whole_ms( $attrs['staggerDelay'], $rule['max'] );
		if ( null === $step ) {
			$out['unmapped']['staggerDelay'] = 'not a whole number of milliseconds from 0 to ' . $rule['max'] . ' (the range the old code honoured)';
			return $out;
		}
		$out['consumed'][] = 'staggerDelay';
		if ( $step === $rule['default'] ) {
			return $out;
		}
		$stagger = array(
			'step'   => $step,
			'offset' => 0,
			'order'  => 'row-first',
			'perRow' => false,
		);
		// card-grid's observer stopped counting at 7 positions unless the block sets its own maximum (another mapper's).
		if ( null !== $rule['positions'] && ! array_key_exists( 'sgsAnimationStaggerMax', $attrs ) ) {
			$stagger['cap'] = $rule['positions'] * $step;
		}
		$out['motion'] = array(
			'elements' => array( self::STAGGER_DELAY_BLOCKS[ $block_name ]['carrier'] => array() ),
			'stagger'  => $stagger,
		);
		return $out;
	}

	/**
	 * `sgsStaggerDelay` on the hover-effects blocks.
	 *
	 * @param array<string,mixed> $attrs Stored attributes.
	 * @return array{motion: array<string,mixed>, consumed: string[], unmapped: array<string,string>}
	 */
	private static function plan_hover_stagger( array $attrs ): array {
		$out = Sgs_Motion_Reveal_Plans::nothing();
		if ( ! array_key_exists( 'sgsStaggerDelay', $attrs ) ) {
			return $out;
		}
		$step = Sgs_Motion_Reveal_Plans::whole_ms( $attrs['sgsStaggerDelay'], Sgs_Motion_Reveal_Plans::HELPER_STEP_MAX );
		if ( null === $step ) {
			$out['unmapped']['sgsStaggerDelay'] = 'not a whole number of milliseconds from 0 to ' . Sgs_Motion_Reveal_Plans::HELPER_STEP_MAX;
			return $out;
		}
		$out['consumed'][] = 'sgsStaggerDelay';
		if ( 0 !== $step ) {
			$out['motion'] = array(
				'elements' => array( 'root' => array() ),
				'stagger'  => array( 'step' => $step ),
			);
		}
		return $out;
	}
}
