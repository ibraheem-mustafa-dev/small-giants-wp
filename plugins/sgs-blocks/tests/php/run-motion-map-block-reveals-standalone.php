<?php
/**
 * Standalone runner for the `block-reveals` motion mapper (Spec 38A §13.2 per-block reveal table, FR-38A-31, FR-38A-32).
 *
 * Loads the REAL mapper, the real migration runner, the real `Sgs_Motion_Document::sanitise` with the shipped
 * `schemas/motion.schema.json`, and the real `Sgs_Motion_Stagger`. WordPress is not loaded, so `parse_blocks` and
 * `serialize_block_attributes` are minimal stand-ins below. One fixture per table row runs through
 * `Sgs_Motion_Migrate_Runner::migrate_content`; every mapped fixture must leave the runner with no flag (no conflict,
 * nothing dropped or changed by the schema).
 *
 *   php plugins/sgs-blocks/tests/php/run-motion-map-block-reveals-standalone.php [path/to/mutated-mapper.php]
 *
 * The optional argument loads a mutated copy of the mapper instead of the shipped file: the planted-fault negative
 * control. Exit 0 all pass, 1 any failure.
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals, WordPress.Security.EscapeOutput.OutputNotEscaped, Squiz.Commenting, WordPress.WP.AlternativeFunctions, WordPress.PHP.DevelopmentFunctions

namespace {

	define( 'ABSPATH', __DIR__ . '/' );

	function wp_json_encode( $data, int $flags = 0 ) {
		return json_encode( $data, $flags );
	}

	/** Attribute JSON the way WordPress serialises it (`serialize_block_attributes`). */
	function wp_attrs_json( array $attrs ): string {
		$json = json_encode( $attrs, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
		return strtr( (string) $json, array( '--' => '\\u002d\\u002d', '<' => '\\u003c', '>' => '\\u003e', '&' => '\\u0026', '\\"' => '\\u0022' ) );
	}

	/** A minimal `parse_blocks`: comment-delimited blocks, nesting, void blocks, raw HTML between them. */
	function parse_blocks( string $content ): array {
		preg_match_all( '/<!--\s+(\/)?wp:([a-z][a-z0-9_-]*(?:\/[a-z][a-z0-9_-]*)?)\s*(\{.*?\})?\s*(\/)?-->/s', $content, $m, PREG_SET_ORDER | PREG_OFFSET_CAPTURE );
		$root  = array( 'blockName' => null, 'attrs' => array(), 'innerBlocks' => array(), 'innerHTML' => '', 'innerContent' => array() );
		$stack = array( &$root );
		$pos   = 0;
		$add_text = static function ( array &$frame, string $text ): void {
			if ( '' === $text ) {
				return;
			}
			$frame['innerHTML']     .= $text;
			$frame['innerContent'][] = $text;
		};
		foreach ( $m as $t ) {
			$top  = &$stack[ count( $stack ) - 1 ];
			$text = substr( $content, $pos, $t[0][1] - $pos );
			$pos  = $t[0][1] + strlen( $t[0][0] );
			$add_text( $top, $text );
			$name = false === strpos( $t[2][0], '/' ) ? 'core/' . $t[2][0] : $t[2][0];
			if ( '/' === $t[1][0] ) {
				$done = array_pop( $stack );
				$par  = &$stack[ count( $stack ) - 1 ];
				$par['innerBlocks'][]  = $done;
				$par['innerContent'][] = null;
				continue;
			}
			$block = array( 'blockName' => $name, 'attrs' => isset( $t[3] ) && '' !== $t[3][0] ? json_decode( $t[3][0], true ) : array(), 'innerBlocks' => array(), 'innerHTML' => '', 'innerContent' => array() );
			if ( isset( $t[4] ) && '/' === $t[4][0] ) {
				$top['innerBlocks'][]  = $block;
				$top['innerContent'][] = null;
			} else {
				$stack[] = $block;
			}
		}
		$add_text( $root, substr( $content, $pos ) );
		$out = array();
		$i   = 0;
		foreach ( $root['innerContent'] as $part ) {
			if ( null !== $part ) {
				if ( '' !== trim( $part ) ) {
					$out[] = array( 'blockName' => null, 'attrs' => array(), 'innerBlocks' => array(), 'innerHTML' => $part, 'innerContent' => array( $part ) );
				}
				continue;
			}
			$out[] = $root['innerBlocks'][ $i++ ];
		}
		return $out;
	}

	function serialize_block_attributes( array $attrs ): string {
		return wp_attrs_json( $attrs );
	}
}

namespace SGS\Blocks\Motion {

	$root = dirname( __DIR__, 2 );
	require_once $root . '/includes/motion/migrate/interface-sgs-motion-mapper.php';
	require_once $root . '/includes/motion/migrate/class-sgs-motion-migrate-runner.php';
	require_once $root . '/includes/motion/class-sgs-motion-stagger.php';
	$mapper_file = isset( $argv[1] ) ? (string) $argv[1] : $root . '/includes/motion/migrate/mappers/class-sgs-motion-map-block-reveals.php';
	require_once $mapper_file;

	$pass = 0;
	$fail = 0;

	function ok( bool $cond, string $label, string $detail = '' ): void {
		global $pass, $fail;
		if ( $cond ) {
			++$pass;
			echo "PASS  $label\n";
		} else {
			++$fail;
			echo "FAIL  $label" . ( '' !== $detail ? "  => $detail" : '' ) . "\n";
		}
	}

	function js( $value ): string {
		return (string) json_encode( $value, JSON_UNESCAPED_SLASHES );
	}

	/**
	 * Run one block through the real runner with only this mapper.
	 *
	 * @return array{changed:bool,flags:array,attrs:array,consumed:array,content:string,source:string}
	 */
	function migrate( string $block, array $attrs ): array {
		$runner  = new Sgs_Motion_Migrate_Runner( array( new Sgs_Motion_Map_Block_Reveals() ) );
		$content = '<!-- wp:' . $block . ' ' . js( $attrs ) . ' /-->';
		$diff    = $runner->migrate_content( $content );
		$parsed  = parse_blocks( $diff['content'] );
		return array(
			'changed'  => $diff['changed'],
			'flags'    => $diff['flags'],
			'attrs'    => $parsed[0]['attrs'] ?? array(),
			'consumed' => $diff['changes'][0]['consumed'] ?? array(),
			'content'  => $diff['content'],
			'source'   => $content,
		);
	}

	function motion_of( array $result ): array {
		return $result['attrs']['sgsMotion'] ?? array();
	}

	/** The old effective delay of the nth item when the observer stopped counting at `$positions`. */
	function old_capped( int $i, int $step, int $positions ): int {
		return min( $i, $positions ) * $step;
	}

	$mapper = new Sgs_Motion_Map_Block_Reveals();

	// 0. Contract and the mapper's constants against the shipped block files.
	ok( 'block-reveals' === $mapper->family(), 'the family slug is the file suffix' );
	ok( 'SGS\\Blocks\\Motion\\Sgs_Motion_Map_Block_Reveals' === Sgs_Motion_Migrate_Runner::mapper_class( 'block-reveals' ) && $mapper instanceof Sgs_Motion_Mapper_Interface, 'the runner finds the class from the family slug' );
	$read = static function ( string $slug ) use ( $root ): array {
		$json = json_decode( (string) file_get_contents( $root . '/src/blocks/' . $slug . '/block.json' ), true );
		return is_array( $json['attributes'] ?? null ) ? $json['attributes'] : array();
	};
	foreach ( Sgs_Motion_Map_Block_Reveals::STAGGER_DELAY_BLOCKS as $block => $rule ) {
		$declared = $read( substr( $block, 4 ) )['staggerDelay']['default'] ?? null;
		ok( $declared === $rule['default'], "{$block} staggerDelay default {$rule['default']} matches block.json", js( $declared ) );
	}
	$timeline = $read( 'timeline' );
	ok( true === $timeline['revealOnScroll']['default'] && Sgs_Motion_Map_Block_Reveals::TIMELINE_DEFAULT_STAGGER === $timeline['revealStagger']['default'] && 'viewport' === $timeline['revealTrigger']['default'], 'timeline reveal defaults match block.json' );
	ok( 'none' === ( $read( 'buybox' )['photoEntrance']['default'] ?? null ) && false === ( $read( 'site-footer-row' )['fxFooterStagger']['default'] ?? null ) && false === ( $read( 'gallery' )['captionReveal']['default'] ?? null ), 'buybox, footer row and gallery defaults match block.json' );
	$roster = (string) file_get_contents( $root . '/src/blocks/extensions/extension-roster.json' );
	ok( 1 === preg_match( '/"sgsStaggerDelay":\s*\{\s*"type":\s*"number",\s*"default":\s*0/', $roster ), 'sgsStaggerDelay default 0 matches the extension roster' );

	// 1. staggerDelay.
	$r = migrate( 'sgs/card-grid', array( 'staggerDelay' => 120 ) );
	$m = motion_of( $r );
	ok( array() === $r['flags'] && array( 'staggerDelay' ) === $r['consumed'] && ! isset( $r['attrs']['staggerDelay'] ), 'card-grid staggerDelay 120 migrates and is consumed', js( $r['flags'] ) );
	ok( array(
		'step'   => 120,
		'offset' => 0,
		'order'  => 'row-first',
		'perRow' => false,
		'cap'    => 840,
	) === ( $m['stagger'] ?? null ), 'card-grid staggerDelay 120 becomes step 120 with the 7-position cap', js( $m['stagger'] ?? null ) );
	$expected = array_map( static fn( $i ) => old_capped( $i, 120, 7 ), range( 0, 11 ) );
	ok( $expected === Sgs_Motion_Stagger::compute_delays( array_merge( $m['stagger'] ?? array(), array( 'count' => 12, 'columns' => 3 ) ) ), 'the stored card-grid settings reproduce the old min(index, 7) x step delays', js( $expected ) );

	$r = migrate( 'sgs/card-grid', array( 'staggerDelay' => 80 ) );
	ok( array() === $r['flags'] && array( 'staggerDelay' ) === $r['consumed'] && ! isset( $r['attrs']['sgsMotion'] ) && ! isset( $r['attrs']['staggerDelay'] ), 'card-grid staggerDelay equal to the default is consumed and writes no layer' );

	$r = migrate( 'sgs/card-grid', array( 'staggerDelay' => 120, 'sgsAnimationStaggerMax' => 3 ) );
	ok( ! isset( motion_of( $r )['stagger']['cap'] ) && 120 === ( motion_of( $r )['stagger']['step'] ?? null ), "card-grid leaves the cap to the block's own stagger maximum when it sets one" );

	$r = migrate( 'sgs/card-grid', array( 'staggerDelay' => 1500 ) );
	ok( array( 'staggerDelay' ) === array_keys( Sgs_Motion_Map_Block_Reveals::unmapped( 'sgs/card-grid', array( 'staggerDelay' => 1500 ) ) ) && 1500 === ( $r['attrs']['staggerDelay'] ?? null ) && ! isset( $r['attrs']['sgsMotion'] ), "card-grid staggerDelay above the observer's 1000 clamp stays on the block and is reported" );

	$r = migrate( 'sgs/gallery', array( 'staggerDelay' => 90 ) );
	$m = motion_of( $r );
	ok( array() === $r['flags'] && array( 'staggerDelay' ) === $r['consumed'], 'gallery staggerDelay 90 migrates and is consumed', js( $r['flags'] ) );
	ok( array(
		'step'   => 90,
		'offset' => 0,
		'order'  => 'row-first',
		'perRow' => false,
	) === ( $m['stagger'] ?? null ), 'gallery staggerDelay becomes an uncapped flat step', js( $m['stagger'] ?? null ) );
	$expected = array_map( static fn( $i ) => $i * 90, range( 0, 11 ) );
	ok( $expected === Sgs_Motion_Stagger::compute_delays( array_merge( $m['stagger'] ?? array(), array( 'count' => 12, 'columns' => 4 ) ) ), 'the stored gallery settings reproduce the old step x index delays with no row restart', js( $expected ) );

	$r = migrate( 'sgs/testimonial', array( 'staggerDelay' => 40 ) );
	ok( array() === $r['flags'] && 40 === ( motion_of( $r )['stagger']['step'] ?? null ) && array( 'staggerDelay' ) === $r['consumed'], 'testimonial staggerDelay 40 keeps its step on the helper' );
	$r = migrate( 'sgs/testimonial', array( 'staggerDelay' => 0 ) );
	ok( array( 'staggerDelay' ) === $r['consumed'] && ! isset( $r['attrs']['sgsMotion'] ), 'testimonial staggerDelay 0 (the default) writes no layer' );

	// 2. sgsStaggerDelay.
	foreach ( Sgs_Motion_Map_Block_Reveals::HOVER_STAGGER_BLOCKS as $block ) {
		$r = migrate( $block, array( 'sgsStaggerDelay' => 150 ) );
		ok( array() === $r['flags'] && array( 'sgsStaggerDelay' ) === $r['consumed'] && 150 === ( motion_of( $r )['stagger']['step'] ?? null ) && ! isset( $r['attrs']['sgsStaggerDelay'] ), "{$block} sgsStaggerDelay 150 becomes the helper step", js( $r['flags'] ) );
	}
	$r = migrate( 'sgs/container', array( 'sgsStaggerDelay' => 0 ) );
	ok( array( 'sgsStaggerDelay' ) === $r['consumed'] && ! isset( $r['attrs']['sgsMotion'] ), 'sgsStaggerDelay 0 writes no layer' );
	ok( false === $mapper->handles( 'sgs/hero', array( 'sgsStaggerDelay' => 150 ) ) && false === $mapper->handles( 'sgs/card-grid', array( 'sgsStaggerDelay' => 150 ) ), 'sgsStaggerDelay on a block that does not declare it is left alone' );

	// 3. Timeline.
	$entry_base = static function ( array $m ): array {
		return $m['elements']['entry']['entrance']['base'] ?? array();
	};
	$r    = migrate( 'sgs/timeline', array( 'revealStagger' => 150 ) );
	$m    = motion_of( $r );
	$base = $entry_base( $m );
	ok( array() === $r['flags'] && array( 'revealStagger' ) === $r['consumed'], 'timeline revealStagger 150 migrates', js( $r['flags'] ) );
	ok( 'scroll' === ( $base['trigger'] ?? null ) && array(
		'from'     => array( 'opacity' => 0, 'translateY' => 20 ),
		'to'       => array( 'opacity' => 1, 'translateY' => 0 ),
		'duration' => 400,
		'easing'   => 'ease-out',
	) === ( $base['values'] ?? null ), 'the timeline entry gets the 20px, 400ms, ease-out scroll fade the stylesheet painted', js( $base ) );
	ok( 150 === ( $m['stagger']['step'] ?? null ) && array_map( static fn( $i ) => $i * 150, range( 0, 5 ) ) === Sgs_Motion_Stagger::compute_delays( array_merge( $m['stagger'] ?? array(), array( 'count' => 6, 'columns' => 1 ) ) ), 'the stored timeline step reproduces index x step' );

	$r    = migrate( 'sgs/timeline', array( 'revealTrigger' => 'connector', 'connectorProgressFill' => true, 'revealStagger' => 250 ) );
	$m    = motion_of( $r );
	$base = $entry_base( $m );
	ok( array() === $r['flags'] && 'scroll' === ( $base['trigger'] ?? null ) && 62 === ( $base['values']['start'] ?? null ), 'timeline revealTrigger connector writes a scroll entrance with the reading-line start (62 above the bottom edge)', js( $base ) );
	ok( array( 'revealStagger', 'revealTrigger' ) === array_values( array_intersect( array( 'revealStagger', 'revealTrigger' ), $r['consumed'] ) ) && 2 === count( $r['consumed'] ) && ! isset( $m['stagger'] ) && true === ( $r['attrs']['connectorProgressFill'] ?? null ), 'a connector reveal ignores the step, consumes both, and leaves connectorProgressFill alone' );

	$r = migrate( 'sgs/timeline', array( 'revealTrigger' => 'connector' ) );
	ok( array() === $r['flags'] && array( 'revealTrigger' ) === $r['consumed'] && ! isset( $r['attrs']['sgsMotion'] ), 'connector without the progress fill behaved as the viewport reveal and writes no layer' );

	$r = migrate( 'sgs/timeline', array( 'revealOnScroll' => false, 'revealStagger' => 250, 'revealTrigger' => 'connector', 'connectorProgressFill' => true ) );
	ok( array() === $r['flags'] && 3 === count( $r['consumed'] ) && ! isset( $r['attrs']['sgsMotion'] ), 'revealOnScroll false writes no entrance layer and consumes the trigger and step' );

	$r = migrate( 'sgs/timeline', array( 'revealStagger' => 150, 'scrollEffect' => 'pinned-journey' ) );
	ok( array( 'revealStagger' ) === $r['consumed'] && ! isset( $r['attrs']['sgsMotion'] ), 'a vertical pinned-journey timeline never ran the reveal, so no layer' );
	$r = migrate( 'sgs/timeline', array( 'revealStagger' => 150, 'scrollEffect' => 'pinned-journey', 'orientation' => 'horizontal' ) );
	ok( isset( motion_of( $r )['stagger'] ), 'pinned-journey on a horizontal timeline falls back to basic and keeps the reveal' );

	$r = migrate( 'sgs/timeline', array( 'revealOnScroll' => true, 'revealStagger' => 100, 'revealTrigger' => 'viewport' ) );
	ok( 3 === count( $r['consumed'] ) && ! isset( $r['attrs']['sgsMotion'] ), 'timeline values equal to the defaults are consumed and write no layer' );

	$r = migrate( 'sgs/timeline', array( 'revealStagger' => 5000, 'revealTrigger' => 'connector', 'connectorProgressFill' => true ) );
	ok( array( 'revealStagger' ) === array_keys( Sgs_Motion_Map_Block_Reveals::unmapped( 'sgs/timeline', array( 'revealStagger' => 5000 ) ) ) && array() === $r['consumed'] && 5000 === ( $r['attrs']['revealStagger'] ?? null ) && ! isset( $r['attrs']['sgsMotion'] ), 'an unrepresentable timeline step keeps the whole reveal on the old attributes' );
	ok( array( 'revealTrigger' ) === array_keys( Sgs_Motion_Map_Block_Reveals::unmapped( 'sgs/timeline', array( 'revealTrigger' => 'sideways' ) ) ), 'an off-enum revealTrigger is reported, not coerced' );

	// 4. photoEntrance.
	$photo = static function ( array $m ): array {
		return $m['elements'][ Sgs_Motion_Map_Block_Reveals::BUYBOX_PHOTO_PART ]['entrance']['base'] ?? array();
	};
	$r    = migrate( 'sgs/buybox', array( 'photoEntrance' => 'fade' ) );
	$base = $photo( motion_of( $r ) );
	ok( array() === $r['flags'] && array( 'photoEntrance' ) === $r['consumed'] && 'entrance-fade-in' === ( $base['preset'] ?? null ) && 'load' === ( $base['trigger'] ?? null ), 'buybox photoEntrance fade stamps the fade-in preset on load', js( $r['flags'] ) );
	ok( array(
		'from'     => array( 'opacity' => 0 ),
		'to'       => array( 'opacity' => 1 ),
		'duration' => 'token:entrance.duration',
		'easing'   => 'token:entrance.easing',
	) === ( $base['values'] ?? null ), 'fade points at the entrance tokens like the old stylesheet', js( $base ) );
	$r    = migrate( 'sgs/buybox', array( 'photoEntrance' => 'rise' ) );
	$base = $photo( motion_of( $r ) );
	ok( array() === $r['flags'] && 'entrance-fade-up' === ( $base['preset'] ?? null ) && 'token:entrance.distance' === ( $base['values']['from']['translateY'] ?? null ) && 0 === ( $base['values']['to']['translateY'] ?? null ), 'buybox photoEntrance rise stamps fade-up on the entrance distance token', js( $base ) );
	$r = migrate( 'sgs/buybox', array( 'photoEntrance' => 'none' ) );
	ok( array( 'photoEntrance' ) === $r['consumed'] && ! isset( $r['attrs']['sgsMotion'] ), 'photoEntrance none writes no layer' );
	$r = migrate( 'sgs/buybox', array( 'photoEntrance' => 'zoom' ) );
	ok( array( 'photoEntrance' ) === array_keys( Sgs_Motion_Map_Block_Reveals::unmapped( 'sgs/buybox', array( 'photoEntrance' => 'zoom' ) ) ) && 'zoom' === ( $r['attrs']['photoEntrance'] ?? null ), 'an off-enum photoEntrance stays on the block and is reported' );

	// 5. fxFooterStagger.
	$r      = migrate( 'sgs/site-footer-row', array( 'fxFooterStagger' => true ) );
	$layers = motion_of( $r )['elements']['root']['effects'] ?? array();
	$v      = $layers[0]['values'] ?? array();
	ok( array() === $r['flags'] && array( 'fxFooterStagger' ) === $r['consumed'] && 1 === count( $layers ) && 'scrub' === ( $layers[0]['effect'] ?? null ), 'fxFooterStagger true writes one scrub layer on the root', js( $r['flags'] ) );
	ok( 'top 90%' === ( $v['startElement'] ?? '' ) . ' ' . ( $v['startViewport'] ?? '' ) . '%' && 'top 55%' === ( $v['endElement'] ?? '' ) . ' ' . ( $v['endViewport'] ?? '' ) . '%', 'the scrub layer starts at top 90% and ends at top 55%', js( $v ) );
	ok( 'cubic-bezier(0.215, 0.61, 0.355, 1)' === ( $v['easing'] ?? null ), 'the scrub easing is power2.out as its cubic-bezier', js( $v['easing'] ?? null ) );
	ok( array(
		array( 'property' => 'opacity', 'from' => 0, 'to' => 1 ),
		array( 'property' => 'y', 'from' => 40, 'to' => 0 ),
	) === ( $v['rows'] ?? null ) && 1000 === ( $v['smoothing'] ?? null ) && 'scroll' === ( $layers[0]['trigger'] ?? null ), "the layer carries the old runtime's opacity and 40px rise and one second of smoothing", js( $v ) );
	$r = migrate( 'sgs/site-footer-row', array( 'fxFooterStagger' => true, 'fxEffect' => 'particles' ) );
	ok( array( 'fxFooterStagger' ) === $r['consumed'] && ! isset( motion_of( $r )['elements']['root']['effects'] ), 'a paint effect on the row meant the reveal never ran, so no scrub layer' );
	$r = migrate( 'sgs/site-footer-row', array( 'fxFooterStagger' => false ) );
	ok( array( 'fxFooterStagger' ) === $r['consumed'] && ! isset( $r['attrs']['sgsMotion'] ), 'fxFooterStagger false writes no layer' );

	// 6. captionReveal is the gallery's display option, outside the motion model (Bean, 2026-10-15): never handled.
	ok( false === $mapper->handles( 'sgs/gallery', array( 'captionReveal' => true ) ) && array() === Sgs_Motion_Map_Block_Reveals::unmapped( 'sgs/gallery', array( 'captionReveal' => true ) ), 'captionReveal alone is not handled and not reported' );
	$r = migrate( 'sgs/gallery', array( 'staggerDelay' => 90, 'captionReveal' => true ) );
	ok( array( 'staggerDelay' ) === $r['consumed'] && true === ( $r['attrs']['captionReveal'] ?? null ) && 90 === ( motion_of( $r )['stagger']['step'] ?? null ), 'a gallery with both migrates the step and keeps captionReveal' );
	$r = migrate( 'sgs/gallery', array( 'staggerDelay' => 90, 'captionReveal' => false ) );
	ok( false === ( $r['attrs']['captionReveal'] ?? null ), 'captionReveal false also stays on the block' );

	// 7. Absent values and idempotency.
	ok( false === $mapper->handles( 'sgs/gallery', array( 'columns' => 3 ) ) && false === $mapper->handles( 'sgs/timeline', array() ) && false === $mapper->handles( 'sgs/hero', array( 'staggerDelay' => 50 ) ), 'a block with none of its attributes is not handled' );
	$r = migrate( 'sgs/timeline', array( 'columns' => 2 ) );
	ok( false === $r['changed'] && $r['content'] === $r['source'], 'absent attributes leave the content byte-identical' );
	foreach ( array(
		array( 'sgs/card-grid', array( 'staggerDelay' => 120 ) ),
		array( 'sgs/timeline', array( 'revealStagger' => 150 ) ),
		array( 'sgs/timeline', array( 'revealTrigger' => 'connector', 'connectorProgressFill' => true ) ),
		array( 'sgs/buybox', array( 'photoEntrance' => 'rise' ) ),
		array( 'sgs/site-footer-row', array( 'fxFooterStagger' => true ) ),
		array( 'sgs/gallery', array( 'staggerDelay' => 90, 'captionReveal' => true ) ),
	) as $case ) {
		$first  = migrate( $case[0], $case[1] );
		$runner = new Sgs_Motion_Migrate_Runner( array( new Sgs_Motion_Map_Block_Reveals() ) );
		$again  = $runner->migrate_content( $first['content'] );
		$label  = $case[0] . ' ' . js( $case[1] );
		ok( $first['changed'] && $again['content'] === $first['content'], "migrating already-migrated {$label} again changes nothing", $again['content'] );
	}

	echo "\n$pass passed, $fail failed\n";
	exit( $fail > 0 ? 1 : 0 );
}
