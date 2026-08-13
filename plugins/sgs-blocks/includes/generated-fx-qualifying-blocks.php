<?php
/**
 * Auto-generated Spec 38 motion-fx block -> qualifying-effects map — DO NOT EDIT.
 *
 * Generated from block.json (containerKind / bgSvgContent / fx.draggable /
 * fx.pairedFilter / fx.providesNatively), each block's edit.js (RichText
 * usage), each block's style.css|style.scss (desktop-reachable
 * `overflow-x: auto|scroll`), and the `fx_effects` DB table's scope/requires
 * columns by scripts/generate-fx-qualifying-blocks.py. To change these
 * values, edit the relevant block.json / stylesheet / seed-motion-fx-
 * registry.py, then re-run this generator.
 *
 * Blocks with at least one qualifying effect: 31
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
			'sgs/before-after' => array( 'carousel-loop', 'draggable', 'morph', 'motion-path', 'scrub' ),
			'sgs/button' => array( 'morph', 'motion-path', 'scramble', 'scrub', 'split-reveal' ),
			'sgs/buybox' => array( 'carousel-loop', 'morph', 'motion-path', 'scrub' ),
			'sgs/collapsible-text' => array( 'morph', 'motion-path', 'scramble', 'scrub', 'split-reveal' ),
			'sgs/container' => array( 'cursor-field', 'draw', 'horizontal-panel', 'morph', 'motion-path', 'pin-scrub', 'scrub' ),
			'sgs/counter' => array( 'morph', 'motion-path', 'scramble', 'scrub', 'split-reveal' ),
			'sgs/cta-section' => array( 'cursor-field', 'draw', 'horizontal-panel', 'morph', 'motion-path', 'pin-scrub', 'scrub' ),
			'sgs/decorative-image' => array( 'morph', 'motion-path', 'scrub' ),
			'sgs/gallery' => array( 'carousel-loop', 'morph', 'motion-path', 'scrub' ),
			'sgs/google-reviews' => array( 'carousel-loop', 'morph', 'motion-path', 'scrub' ),
			'sgs/heading' => array( 'morph', 'motion-path', 'scramble', 'scrub', 'split-reveal' ),
			'sgs/hero' => array( 'cursor-field', 'draw', 'horizontal-panel', 'morph', 'motion-path', 'pin-scrub', 'scrub' ),
			'sgs/icon' => array( 'draw', 'morph', 'motion-path', 'scrub' ),
			'sgs/image-sequence' => array( 'image-sequence', 'morph', 'motion-path', 'scrub' ),
			'sgs/info-box' => array( 'cursor-field', 'morph', 'motion-path', 'scramble', 'scrub', 'split-reveal' ),
			'sgs/label' => array( 'morph', 'motion-path', 'scramble', 'scrub', 'split-reveal' ),
			'sgs/physics-canvas' => array( 'cursor-field', 'horizontal-panel', 'morph', 'motion-path', 'pin-scrub', 'scrub' ),
			'sgs/post-grid' => array( 'carousel-loop', 'morph', 'motion-path', 'scrub' ),
			'sgs/pricing-table' => array( 'morph', 'motion-path', 'scramble', 'scrub', 'split-reveal' ),
			'sgs/product-card' => array( 'morph', 'motion-path', 'scramble', 'scrub', 'split-reveal' ),
			'sgs/product-faq' => array( 'cursor-field', 'morph', 'motion-path', 'scramble', 'scrub', 'split-reveal' ),
			'sgs/quote' => array( 'morph', 'motion-path', 'scramble', 'scrub', 'split-reveal' ),
			'sgs/responsive-logo' => array( 'morph', 'motion-path', 'scrub' ),
			'sgs/separator' => array( 'draw', 'morph', 'motion-path', 'scrub' ),
			'sgs/team-member' => array( 'morph', 'motion-path', 'scramble', 'scrub', 'split-reveal' ),
			'sgs/testimonial' => array( 'cursor-field', 'morph', 'motion-path', 'scramble', 'scrub', 'split-reveal' ),
			'sgs/text' => array( 'morph', 'motion-path', 'scramble', 'scrub', 'split-reveal' ),
			'sgs/timeline' => array( 'carousel-loop', 'draggable', 'morph', 'motion-path', 'scramble', 'scrub', 'split-reveal' ),
			'sgs/trust-bar' => array( 'cursor-field', 'draw', 'horizontal-panel', 'morph', 'motion-path', 'pin-scrub', 'scramble', 'scrub', 'split-reveal' ),
			'sgs/trustpilot-reviews' => array( 'carousel-loop', 'morph', 'motion-path', 'scrub' ),
			'sgs/whatsapp-cta' => array( 'morph', 'motion-path', 'scramble', 'scrub', 'split-reveal' ),
		);
	}
	return $map;
}
