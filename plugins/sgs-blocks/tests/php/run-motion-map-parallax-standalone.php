<?php
/**
 * Standalone runner for the `parallax` motion mapper (Spec 38A FR-38A-43, FR-38A-31, FR-38A-32).
 *
 * Loads the REAL mapper, the real migration runner and the real `Sgs_Motion_Document::sanitise` with the shipped
 * `schemas/motion.schema.json`. WordPress is not loaded, so `parse_blocks` and `serialize_block_attributes` are minimal
 * stand-ins below. One fixture per old attribute runs through `Sgs_Motion_Migrate_Runner::migrate_content`; every
 * mapped fixture must leave the runner with no flag (no conflict, nothing dropped or changed by the schema).
 *
 *   php plugins/sgs-blocks/tests/php/run-motion-map-parallax-standalone.php [path/to/mutated-mapper.php]
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
	$mapper_file = isset( $argv[1] ) ? (string) $argv[1] : $root . '/includes/motion/migrate/mappers/class-sgs-motion-map-parallax.php';
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
	 * @return array{changed:bool,flags:array,reported:array,attrs:array,consumed:array,content:string,source:string}
	 */
	function migrate( string $block, array $attrs ): array {
		$runner  = new Sgs_Motion_Migrate_Runner( array( new Sgs_Motion_Map_Parallax() ) );
		$content = '<!-- wp:' . $block . ' ' . js( $attrs ) . ' /-->';
		$diff    = $runner->migrate_content( $content );
		$parsed  = parse_blocks( $diff['content'] );
		return array(
			'changed'  => $diff['changed'],
			'flags'    => $diff['flags'],
			'reported' => array_values( array_map( static fn( $row ) => array_intersect_key( $row, array_flip( array( 'attr', 'consumed' ) ) ), $diff['reported'] ) ),
			'attrs'    => $parsed[0]['attrs'] ?? array(),
			'consumed' => $diff['changes'][0]['consumed'] ?? array(),
			'content'  => $diff['content'],
			'source'   => $content,
		);
	}

	/** The one parallax layer on a part, or null. */
	function layer( array $result, string $part ): ?array {
		$layers = $result['attrs']['sgsMotion']['elements'][ $part ]['effects'] ?? array();
		return 1 === count( $layers ) && 'parallax' === ( $layers[0]['effect'] ?? '' ) ? $layers[0] : null;
	}

	$mapper = new Sgs_Motion_Map_Parallax();

	// 0. Contract, and the mapper's constants against the shipped block files.
	ok( 'parallax' === $mapper->family(), 'the family slug is the file suffix' );
	ok( 'SGS\\Blocks\\Motion\\Sgs_Motion_Map_Parallax' === Sgs_Motion_Migrate_Runner::mapper_class( 'parallax' ) && $mapper instanceof Sgs_Motion_Mapper_Interface, 'the runner finds the class from the family slug' );
	$read = static function ( string $slug ) use ( $root ): array {
		$json = json_decode( (string) file_get_contents( $root . '/src/blocks/' . $slug . '/block.json' ), true );
		return is_array( $json['attributes'] ?? null ) ? $json['attributes'] : array();
	};
	ok( 0 === ( $read( 'decorative-image' )['parallaxStrength']['default'] ?? null ), 'decorative-image parallaxStrength defaults to 0 in block.json' );
	ok( false !== strpos( (string) file_get_contents( $root . '/src/blocks/extensions/parallax.js' ), "sgsParallaxStrength: { type: 'number', default: 30 }" ), 'sgsParallaxStrength default 30 matches the extension' );
	$swing = Sgs_Motion_Map_Parallax::SPLIT_MEDIA_SWING;
	$css   = (string) file_get_contents( $root . '/src/blocks/hero/style.css' );
	ok( 1 === preg_match( '/translateY\(-' . ( $swing / 2 ) . 'px\)[^}]*\}\s*to\s*\{\s*transform:\s*translateY\(' . ( $swing / 2 ) . 'px\)/s', $css ) || false === strpos( $css, 'sgs-hero-media-parallax' ), 'the hero keyframe swing is -16px to 16px (or the keyframe is already removed)' );

	// 1. sgsParallax with sgsParallaxStrength.
	$r = migrate( 'sgs/text', array( 'sgsParallax' => 'element', 'sgsParallaxStrength' => 30 ) );
	$l = layer( $r, 'root' );
	ok( array() === $r['flags'] && null !== $l && 0.02 === ( $l['values']['speedRatio'] ?? null ) && 'view' === ( $l['values']['basis'] ?? null ), 'sgsParallax element at strength 30 becomes a view-basis layer at ratio 0.02', js( $r['flags'] ) . js( $r['attrs'] ) );
	ok( 2 === count( $r['consumed'] ) && ! isset( $r['attrs']['sgsParallax'] ) && ! isset( $r['attrs']['sgsParallaxStrength'] ), 'both old attributes are consumed and removed', js( $r['consumed'] ) );
	$r = migrate( 'sgs/text', array( 'sgsParallax' => 'element' ) );
	ok( 0.02 === ( layer( $r, 'root' )['values']['speedRatio'] ?? null ), 'a missing strength reads the default 30' );
	$r = migrate( 'sgs/text', array( 'sgsParallax' => 'element', 'sgsParallaxStrength' => 100 ) );
	ok( 0.067 === ( layer( $r, 'root' )['values']['speedRatio'] ?? null ) && array() === $r['flags'], 'strength 100 becomes ratio 0.067', js( $r['flags'] ) );
	$r = migrate( 'sgs/text', array( 'sgsParallax' => 'element', 'sgsParallaxStrength' => 250 ) );
	ok( 0.067 === ( layer( $r, 'root' )['values']['speedRatio'] ?? null ), 'a strength above 100 is clamped to 100 the way parallax.php clamps it' );
	$r = migrate( 'sgs/text', array( 'sgsParallax' => 'element', 'sgsParallaxStrength' => 0 ) );
	ok( null === layer( $r, 'root' ) && 2 === count( $r['consumed'] ) && ! isset( $r['attrs']['sgsMotion'] ), 'strength 0 moved nothing: consumed, no layer' );
	foreach ( array( 'none', 'background' ) as $dead ) {
		$r = migrate( 'sgs/text', array( 'sgsParallax' => $dead, 'sgsParallaxStrength' => 60 ) );
		ok( null === layer( $r, 'root' ) && 2 === count( $r['consumed'] ) && ! isset( $r['attrs']['sgsMotion'] ), "sgsParallax {$dead} never ran: consumed, no layer" );
	}
	$r = migrate( 'sgs/text', array( 'sgsParallax' => 'element', 'sgsParallaxStrength' => 'a lot' ) );
	ok( array() === $r['consumed'] && 'a lot' === ( $r['attrs']['sgsParallaxStrength'] ?? null ) && 'element' === ( $r['attrs']['sgsParallax'] ?? null ) && ! isset( $r['attrs']['sgsMotion'] ) && 'sgsParallaxStrength' === ( $r['reported'][0]['attr'] ?? '' ), 'a non-number strength stays on the block and is reported', js( $r['reported'] ) );

	// 2. bgParallax.
	$r = migrate( 'sgs/container', array( 'bgParallax' => true ) );
	$l = layer( $r, 'root' );
	ok( array() === $r['flags'] && true === ( $l['values']['background'] ?? null ) && 0.5 === ( $l['values']['speedRatio'] ?? null ) && 'view' === ( $l['values']['basis'] ?? null ) && array( 'bgParallax' ) === $r['consumed'], 'bgParallax true becomes a background layer at ratio 0.5 on the view basis', js( $r['flags'] ) . js( $r['attrs'] ) );
	ok( 'bgParallax' === ( $r['reported'][0]['attr'] ?? '' ) && true === ( $r['reported'][0]['consumed'] ?? null ), 'bgParallax reports the spare-edge note' );
	$r = migrate( 'sgs/container', array( 'bgParallax' => false ) );
	ok( array( 'bgParallax' ) === $r['consumed'] && ! isset( $r['attrs']['sgsMotion'] ), 'bgParallax false is consumed and writes no layer' );
	$r = migrate( 'sgs/hero', array( 'sgsParallax' => 'element', 'sgsParallaxStrength' => 30, 'bgParallax' => true ) );
	ok( ! isset( layer( $r, 'root' )['values']['background'] ) && true === ( $r['attrs']['bgParallax'] ?? null ) && 'bgParallax' === ( $r['reported'][0]['attr'] ?? '' ) && false === $r['reported'][0]['consumed'], 'one parallax layer per element: the element parallax wins the root and bgParallax stays, reported', js( $r['reported'] ) );
	ok( false === $mapper->handles( 'sgs/text', array( 'bgParallax' => true ) ), 'bgParallax on a block that does not declare it is left alone' );

	// 3. splitMediaParallax.
	$r = migrate( 'sgs/hero', array( 'splitMediaParallax' => true ) );
	$l = layer( $r, 'media' );
	ok( array() === $r['flags'] && 'page' === ( $l['values']['basis'] ?? null ) && 0.01 === ( $l['values']['speedRatio'] ?? null ) && array( 'splitMediaParallax' ) === $r['consumed'] && null === layer( $r, 'root' ), 'splitMediaParallax becomes a page-basis layer at ratio 0.01 on the media part', js( $r['flags'] ) . js( $r['attrs'] ) );
	$page_range = Sgs_Motion_Map_Parallax::SPLIT_MEDIA_RANGE;
	ok( abs( 0.01 * $page_range - $swing ) < 0.5, 'ratio 0.01 over the reference page range travels the old 32px swing (within half a pixel)', (string) ( 0.01 * $page_range ) );
	$r = migrate( 'sgs/hero', array( 'splitMediaParallax' => false ) );
	ok( array( 'splitMediaParallax' ) === $r['consumed'] && ! isset( $r['attrs']['sgsMotion'] ), 'splitMediaParallax false is consumed and writes no layer' );
	ok( false === $mapper->handles( 'sgs/container', array( 'splitMediaParallax' => true ) ), 'splitMediaParallax on another block is left alone' );

	// 4. parallaxStrength on the decorative image.
	$r = migrate( 'sgs/decorative-image', array( 'parallaxStrength' => 30 ) );
	$l = layer( $r, 'root' );
	ok( array() === $r['flags'] && 0.04 === ( $l['values']['speedRatio'] ?? null ) && array( 'parallaxStrength' ) === $r['consumed'], 'decorative-image parallaxStrength 30 doubles its factor: ratio 0.04', js( $r['flags'] ) . js( $r['attrs'] ) );
	$r = migrate( 'sgs/decorative-image', array( 'parallaxStrength' => 0 ) );
	ok( array( 'parallaxStrength' ) === $r['consumed'] && ! isset( $r['attrs']['sgsMotion'] ), 'decorative-image parallaxStrength 0 is consumed and writes no layer' );
	$r = migrate( 'sgs/decorative-image', array( 'parallaxStrength' => 30, 'sgsParallax' => 'element' ) );
	ok( 'parallaxStrength' === ( $r['reported'][0]['attr'] ?? '' ) && 30 === ( $r['attrs']['parallaxStrength'] ?? null ) && 0.02 === ( layer( $r, 'root' )['values']['speedRatio'] ?? null ), 'a decorative image holding both keeps the element parallax and reports the old strength', js( $r['reported'] ) );
	$r = migrate( 'sgs/decorative-image', array( 'parallaxStrength' => 'x' ) );
	ok( array() === $r['consumed'] && 'x' === ( $r['attrs']['parallaxStrength'] ?? null ), 'a non-number parallaxStrength stays and is reported' );

	// 5. Absent values and idempotency.
	ok( false === $mapper->handles( 'sgs/hero', array( 'columns' => 3 ) ) && false === $mapper->handles( 'sgs/text', array() ), 'a block with none of the attributes is not handled' );
	$r = migrate( 'sgs/hero', array( 'columns' => 3 ) );
	ok( false === $r['changed'] && $r['content'] === $r['source'], 'absent attributes leave the content byte-identical' );
	foreach ( array(
		array( 'sgs/text', array( 'sgsParallax' => 'element', 'sgsParallaxStrength' => 30 ) ),
		array( 'sgs/container', array( 'bgParallax' => true ) ),
		array( 'sgs/hero', array( 'splitMediaParallax' => true ) ),
		array( 'sgs/decorative-image', array( 'parallaxStrength' => 30 ) ),
	) as $case ) {
		$first  = migrate( $case[0], $case[1] );
		$runner = new Sgs_Motion_Migrate_Runner( array( new Sgs_Motion_Map_Parallax() ) );
		$again  = $runner->migrate_content( $first['content'] );
		$label  = $case[0] . ' ' . js( $case[1] );
		ok( $first['changed'] && $again['content'] === $first['content'], "migrating already-migrated {$label} again changes nothing", $again['content'] );
	}

	echo "\n$pass passed, $fail failed\n";
	exit( $fail > 0 ? 1 : 0 );
}
