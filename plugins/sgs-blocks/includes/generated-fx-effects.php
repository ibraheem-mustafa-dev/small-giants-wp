<?php
/**
 * Auto-generated Spec 38 motion-fx effect->plugin-set map — DO NOT EDIT.
 *
 * Generated from the `fx_effects` DB table (a LOCAL DEV knowledge base only —
 * never deployed; verified no PHP in this project opens SQLite) by
 * scripts/generate-fx-effects-php.py. The DB table itself is populated by
 * scripts/seed-motion-fx-registry.py. To change these values, edit FX_EFFECTS
 * in seed-motion-fx-registry.py, re-run it, then re-run this generator.
 *
 * Effects: 21
 *
 * Spec ref: .claude/specs/38-SGS-MOTION-SYSTEM.md §4.4 + §6.1/§11.2.
 *
 * Auto-generated — exempt from the 300-line limit.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

/**
 * Return the Spec 38 motion-fx effect registry.
 *
 * Keyed by the `data-sgs-fx` grammar value (Spec 38 §11.2). Each entry carries
 * ONLY plugin_set (GSAP plugin names the SGS_Motion_Registry must enqueue for
 * that effect, on top of gsap core which loads for any Tier G effect present)
 * and owns_scroll_transform (drives the Spec 38 §4.3 entrance-exclusion rule —
 * 1 when the effect owns an element's transform/opacity across a scroll range).
 *
 * Uses a static variable so the array is only built once per request.
 *
 * @return array<string,array{plugin_set:string[],owns_scroll_transform:bool}>
 */
function sgs_get_motion_fx_effects() {
	static $effects = null;
	if ( null === $effects ) {
		$effects = array(
			'carousel-loop' => array(
				'plugin_set'            => array(),
				'owns_scroll_transform' => false,
				'pins'                  => false,
				'triggers'              => array( 'load' ),
			),
			'cursor-field' => array(
				'plugin_set'            => array(),
				'owns_scroll_transform' => false,
				'pins'                  => false,
				'triggers'              => array( 'hover' ),
			),
			'draggable' => array(
				'plugin_set'            => array( 'Inertia' ),
				'owns_scroll_transform' => false,
				'pins'                  => false,
				'triggers'              => array( 'load' ),
			),
			'draw' => array(
				'plugin_set'            => array( 'DrawSVG', 'ScrollTrigger' ),
				'owns_scroll_transform' => false,
				'pins'                  => false,
				'triggers'              => array( 'scroll', 'load', 'hover' ),
			),
			'flip' => array(
				'plugin_set'            => array( 'Flip' ),
				'owns_scroll_transform' => false,
				'pins'                  => false,
				'triggers'              => array( 'scroll' ),
			),
			'generative-background' => array(
				'plugin_set'            => array(),
				'owns_scroll_transform' => false,
				'pins'                  => false,
				'triggers'              => array( 'load' ),
			),
			'grid-dots' => array(
				'plugin_set'            => array(),
				'owns_scroll_transform' => false,
				'pins'                  => false,
				'triggers'              => array( 'hover' ),
			),
			'horizontal-panel' => array(
				'plugin_set'            => array( 'ScrollTrigger' ),
				'owns_scroll_transform' => true,
				'pins'                  => true,
				'triggers'              => array( 'scroll' ),
			),
			'image-sequence' => array(
				'plugin_set'            => array( 'ScrollTrigger' ),
				'owns_scroll_transform' => false,
				'pins'                  => false,
				'triggers'              => array( 'scroll' ),
			),
			'magnet' => array(
				'plugin_set'            => array(),
				'owns_scroll_transform' => false,
				'pins'                  => false,
				'triggers'              => array( 'hover' ),
			),
			'morph' => array(
				'plugin_set'            => array( 'MorphSVG' ),
				'owns_scroll_transform' => false,
				'pins'                  => false,
				'triggers'              => array( 'scroll', 'load', 'hover' ),
			),
			'motion-path' => array(
				'plugin_set'            => array( 'MotionPath', 'ScrollTrigger' ),
				'owns_scroll_transform' => true,
				'pins'                  => false,
				'triggers'              => array( 'scroll' ),
			),
			'page-transitions' => array(
				'plugin_set'            => array(),
				'owns_scroll_transform' => false,
				'pins'                  => false,
				'triggers'              => array( 'load' ),
			),
			'particles' => array(
				'plugin_set'            => array(),
				'owns_scroll_transform' => false,
				'pins'                  => false,
				'triggers'              => array( 'hover' ),
			),
			'pin-scrub' => array(
				'plugin_set'            => array( 'ScrollTrigger' ),
				'owns_scroll_transform' => true,
				'pins'                  => true,
				'triggers'              => array( 'scroll' ),
			),
			'scramble' => array(
				'plugin_set'            => array( 'ScrambleText', 'ScrollTrigger' ),
				'owns_scroll_transform' => false,
				'pins'                  => false,
				'triggers'              => array( 'scroll', 'load', 'hover' ),
			),
			'scroll-smoother' => array(
				'plugin_set'            => array(),
				'owns_scroll_transform' => false,
				'pins'                  => false,
				'triggers'              => array( 'scroll' ),
			),
			'scrub' => array(
				'plugin_set'            => array( 'ScrollTrigger' ),
				'owns_scroll_transform' => true,
				'pins'                  => false,
				'triggers'              => array( 'scroll', 'load', 'hover' ),
			),
			'split-reveal' => array(
				'plugin_set'            => array( 'SplitText', 'ScrollTrigger' ),
				'owns_scroll_transform' => true,
				'pins'                  => false,
				'triggers'              => array( 'scroll', 'load', 'hover' ),
			),
			'surface-treatment' => array(
				'plugin_set'            => array(),
				'owns_scroll_transform' => false,
				'pins'                  => false,
				'triggers'              => array( 'load' ),
			),
			'wave-gradient' => array(
				'plugin_set'            => array(),
				'owns_scroll_transform' => false,
				'pins'                  => false,
				'triggers'              => array( 'load' ),
			),
		);
	}
	return $effects;
}
