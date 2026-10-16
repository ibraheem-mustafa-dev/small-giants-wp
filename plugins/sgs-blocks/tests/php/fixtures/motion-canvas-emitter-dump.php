<?php
/**
 * Prints what the PHP motion renderer's per-target path returns for each shared canvas-parity case, for
 * tests/js/motion-canvas-emitter-parity.test.js to compare with the editor-canvas twin
 * (src/blocks/extensions/motion/canvas/).
 *
 * Input: tests/fixtures/motion/canvas-parity-cases.json. Each case runs the renderer's per-target path with the real
 * classes, in the renderer's order (`Sgs_Motion_Document::sanitise`, `Sgs_Motion_Shared_Element::losers` over the
 * case's `html` when it has one, `Sgs_Motion_Targets::resolve`, `Sgs_Motion_Layer_Drops::resolve`,
 * `Sgs_Motion_Shared_Element::strip`, `Sgs_Motion_Emitter::emit` with the open and state trigger filters, and the
 * container entrance a stagger's `apply` moves to the children: `Sgs_Motion_Loop_Inherit::moved_target` for a case
 * with `innerBlocks`, `Sgs_Motion_Delegate::hands_entrance` in a delegating mode, else the declared item part's
 * inherited entrance, `Sgs_Motion_Loop_Inherit::inherited_layer` and `emit_layer`, as one more plan after the stored
 * targets' plans) under the scope the case names, through the WordPress stand-ins in `tests/php/stubs/motion-render-stubs.php` (block types read
 * from the real block.json files).
 *
 * Usage:
 *   php tests/php/fixtures/motion-canvas-emitter-dump.php           print the JSON
 *   php tests/php/fixtures/motion-canvas-emitter-dump.php --write   also write tests/fixtures/motion/canvas-parity.json
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals, WordPress.WP.AlternativeFunctions, WordPress.Security.EscapeOutput.OutputNotEscaped, Generic.Formatting.MultipleStatementAlignment -- CLI test fixture printing JSON, not shipped code.

use SGS\Blocks\Motion\Sgs_Motion_Delegate;
use SGS\Blocks\Motion\Sgs_Motion_Document;
use SGS\Blocks\Motion\Sgs_Motion_Emitter;
use SGS\Blocks\Motion\Sgs_Motion_Layer_Drops;
use SGS\Blocks\Motion\Sgs_Motion_Loop_Inherit;
use SGS\Blocks\Motion\Sgs_Motion_Shared_Element;
use SGS\Blocks\Motion\Sgs_Motion_Targets;

$sgs_plugin_dir = dirname( __DIR__, 3 );
require_once $sgs_plugin_dir . '/tests/php/stubs/motion-render-stubs.php';

$sgs_fixtures = $sgs_plugin_dir . '/tests/fixtures/motion/';
$sgs_input    = json_decode( (string) file_get_contents( $sgs_fixtures . 'canvas-parity-cases.json' ), true );
$sgs_out      = array();

foreach ( is_array( $sgs_input['cases'] ?? null ) ? $sgs_input['cases'] : array() as $sgs_case ) {
	$sgs_motion = $sgs_case['motion'] ?? null;
	if ( isset( $sgs_case['motionFile'] ) ) {
		$sgs_file   = json_decode( (string) file_get_contents( $sgs_fixtures . basename( (string) $sgs_case['motionFile'] ) ), true );
		$sgs_motion = $sgs_file['motion'] ?? null;
	}
	$sgs_name    = (string) $sgs_case['block'];
	$sgs_scope   = ltrim( (string) $sgs_case['root'], '.' );
	$sgs_context = is_array( $sgs_case['context'] ?? null ) ? $sgs_case['context'] : array();
	$sgs_doc     = Sgs_Motion_Document::sanitise( $sgs_motion );
	$sgs_targets = is_array( $sgs_doc['elements'] ?? null ) ? $sgs_doc['elements'] : array();
	$sgs_losers  = isset( $sgs_case['html'] ) ? Sgs_Motion_Shared_Element::losers( (string) $sgs_case['html'], $sgs_name, $sgs_scope, $sgs_targets ) : array();
	$sgs_result  = array(
		'name'      => (string) $sgs_case['name'],
		'css'       => '',
		'plans'     => array(),
		'rootAttrs' => array(),
		'losers'    => (object) $sgs_losers,
	);
	$sgs_uses_root = false;
	$sgs_uses_item = false;
	$sgs_attrs     = is_array( $sgs_case['attributes'] ?? null ) ? $sgs_case['attributes'] : array();
	$sgs_item_plan = null;
	$sgs_item_css  = '';
	$sgs_moved     = null;
	if ( ! empty( $sgs_case['innerBlocks'] ) ) {
		$sgs_moved = Sgs_Motion_Loop_Inherit::moved_target( $sgs_name, $sgs_motion );
	} elseif ( null !== Sgs_Motion_Delegate::active( $sgs_name, $sgs_attrs ) ) {
		$sgs_moved = Sgs_Motion_Delegate::hands_entrance( $sgs_name, array_merge( $sgs_attrs, array( 'sgsMotion' => $sgs_motion ) ) );
	} else {
		$sgs_layer    = Sgs_Motion_Loop_Inherit::inherited_layer( $sgs_name, $sgs_motion );
		$sgs_resolved = null === $sgs_layer ? null : Sgs_Motion_Targets::resolve( $sgs_name, $sgs_scope, $sgs_layer['part'], array() );
		$sgs_emitted  = null === $sgs_resolved ? null : Sgs_Motion_Loop_Inherit::emit_layer( $sgs_name, $sgs_layer, $sgs_resolved['selector'], ! empty( $sgs_context['lcp'] ) );
		if ( null !== $sgs_emitted ) {
			$sgs_moved     = $sgs_layer['from'];
			$sgs_item_css  = $sgs_emitted['css'];
			$sgs_item_plan = array(
				'target'        => $sgs_layer['part'],
				'selector'      => $sgs_resolved['selector'],
				'root'          => $sgs_resolved['match']['root'],
				'attrs'         => (object) $sgs_emitted['attrs'],
				'entrance'      => true,
				'inheritedFrom' => $sgs_layer['from'],
			);
		}
	}
	foreach ( $sgs_targets as $sgs_target => $sgs_element ) {
		$sgs_target = (string) $sgs_target;
		foreach ( array_merge( array( $sgs_element['hover']['state'] ?? array() ), $sgs_element['hover']['effects'] ?? array() ) as $sgs_layer ) {
			$sgs_uses_root = $sgs_uses_root || ( is_array( $sgs_layer ) && 'root' === ( $sgs_layer['source'] ?? null ) );
			$sgs_uses_item = $sgs_uses_item || ( is_array( $sgs_layer ) && 'item' === ( $sgs_layer['source'] ?? null ) );
		}
		$sgs_resolved = Sgs_Motion_Targets::resolve( $sgs_name, $sgs_scope, $sgs_target, (array) $sgs_element );
		if ( null === $sgs_resolved ) {
			continue;
		}
		$sgs_element = Sgs_Motion_Layer_Drops::resolve( (array) $sgs_element )['element'];
		if ( isset( $sgs_losers[ $sgs_target ] ) ) {
			$sgs_element = Sgs_Motion_Shared_Element::strip( $sgs_element, $sgs_name, $sgs_target, $sgs_losers[ $sgs_target ] );
		}
		$sgs_emitted = Sgs_Motion_Emitter::emit(
			$sgs_element,
			$sgs_resolved['selector'],
			array(
				'lcp'               => ! empty( $sgs_context['lcp'] ),
				'suppress_entrance' => ! empty( $sgs_context['suppress_entrance'] ) || $sgs_target === $sgs_moved,
				'no_transition'     => isset( $sgs_losers[ $sgs_target ] ),
				'block'             => $sgs_name,
				'target'            => $sgs_target,
				'attributes'        => is_array( $sgs_case['attributes'] ?? null ) ? $sgs_case['attributes'] : array(),
			)
		);
		$sgs_result['css']    .= $sgs_emitted['css'];
		$sgs_result['plans'][] = array(
			'target'   => $sgs_target,
			'selector' => $sgs_resolved['selector'],
			'root'     => $sgs_resolved['match']['root'],
			'attrs'    => (object) $sgs_emitted['attrs'],
			'entrance' => $sgs_emitted['entrance'],
		);
	}
	if ( null !== $sgs_item_plan ) {
		$sgs_result['css']    .= $sgs_item_css;
		$sgs_result['plans'][] = $sgs_item_plan;
	}
	if ( $sgs_uses_root ) {
		$sgs_result['rootAttrs']['data-sgs-mroot'] = '';
	}
	$sgs_result['rootAttrs'] = (object) $sgs_result['rootAttrs'];
	if ( $sgs_uses_item ) {
		$sgs_result['itemMatches'] = Sgs_Motion_Targets::item_matches( $sgs_name );
	}
	$sgs_out[]               = $sgs_result;
}

$sgs_json = json_encode( $sgs_out, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . "\n";
if ( in_array( '--write', $argv, true ) ) {
	file_put_contents( $sgs_fixtures . 'canvas-parity.json', str_replace( '    ', "\t", $sgs_json ) );
}
echo $sgs_json;
