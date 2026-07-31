<?php
/**
 * Auto-generated Spec 38 motion-fx block -> qualifying-effects map — DO NOT EDIT.
 *
 * Generated from block.json (containerKind / fx.draggable / fx.pairedFilter),
 * each block's edit.js (RichText usage), and the `fx_effects` DB table's
 * scope/requires columns by scripts/generate-fx-qualifying-blocks.py. To
 * change these values, edit the relevant block.json / seed-motion-fx-
 * registry.py, then re-run this generator.
 *
 * Blocks with at least one qualifying effect: 25
 *
 * Spec ref: .claude/specs/38-SGS-MOTION-SYSTEM.md §2 + §7.
 *
 * Auto-generated — exempt from the 300-line limit.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

/**
 * Return the Spec 38 fx block -> qualifying-effects map.
 *
 * Keyed by block name (e.g. `sgs/heading`). Each value is the list of
 * `data-sgs-fx` grammar values (Spec 38 §11.2) that block structurally
 * qualifies for — an effect whose `fx_effects.scope` is 'site', 'paired',
 * or 'flavour' NEVER appears here, by construction (see the generator's
 * module docstring "STRUCTURAL SCOPE GATE").
 *
 * Uses a static variable so the array is only built once per request.
 *
 * @return array<string,string[]>
 */
function sgs_get_fx_qualifying_blocks() {
	static $map = null;
	if ( null === $map ) {
		$map = array(
			'sgs/before-after' => array( 'draggable', 'scrub' ),
			'sgs/collapsible-text' => array( 'scramble', 'scrub', 'split-reveal' ),
			'sgs/container' => array( 'horizontal-panel', 'pin-scrub', 'scrub' ),
			'sgs/counter' => array( 'scramble', 'scrub', 'split-reveal' ),
			'sgs/cta-section' => array( 'horizontal-panel', 'pin-scrub', 'scrub' ),
			'sgs/decorative-image' => array( 'draw', 'morph', 'motion-path', 'scrub' ),
			'sgs/gallery' => array( 'draggable', 'scrub' ),
			'sgs/heading' => array( 'scramble', 'scrub', 'split-reveal' ),
			'sgs/hero' => array( 'horizontal-panel', 'pin-scrub', 'scrub' ),
			'sgs/icon' => array( 'draw', 'morph', 'motion-path', 'scrub' ),
			'sgs/info-box' => array( 'scramble', 'scrub', 'split-reveal' ),
			'sgs/label' => array( 'scramble', 'scrub', 'split-reveal' ),
			'sgs/pricing-table' => array( 'scramble', 'scrub', 'split-reveal' ),
			'sgs/product-card' => array( 'scramble', 'scrub', 'split-reveal' ),
			'sgs/product-faq' => array( 'scramble', 'scrub', 'split-reveal' ),
			'sgs/quote' => array( 'scramble', 'scrub', 'split-reveal' ),
			'sgs/responsive-logo' => array( 'morph', 'motion-path', 'scrub' ),
			'sgs/separator' => array( 'draw', 'morph', 'motion-path', 'scrub' ),
			'sgs/team-member' => array( 'scramble', 'scrub', 'split-reveal' ),
			'sgs/testimonial' => array( 'scramble', 'scrub', 'split-reveal' ),
			'sgs/testimonial-slider' => array( 'draggable', 'scrub' ),
			'sgs/text' => array( 'scramble', 'scrub', 'split-reveal' ),
			'sgs/timeline' => array( 'scramble', 'scrub', 'split-reveal' ),
			'sgs/trust-bar' => array( 'horizontal-panel', 'pin-scrub', 'scramble', 'scrub', 'split-reveal' ),
			'sgs/whatsapp-cta' => array( 'scramble', 'scrub', 'split-reveal' ),
		);
	}
	return $map;
}
