<?php
/**
 * Standalone runner for the motion migration core (Spec 38A FR-38A-31, FR-38A-32): the mapper interface, the runner,
 * the backup and the family listing.
 *
 * Loads the REAL runner, backup and mapper interface, and the real `Sgs_Motion_Document::sanitise` with the shipped
 * `schemas/motion.schema.json`. WordPress is not loaded, so `parse_blocks`, `serialize_blocks`, `wp_json_encode` and
 * `$wpdb` are minimal stand-ins below. A fixture-only mapper is registered here; the shipped mappers folder is untouched.
 *
 *   php plugins/sgs-blocks/tests/php/run-motion-migrate-standalone.php
 *
 * Planted faults (each must turn the run red; the run then exits 1). The merge fault is planted by hand: edit
 * `Sgs_Motion_Migrate_Merge::merge` to `return array_replace_recursive( $b, $a );` and run.
 *   SGS_MOTION_MIGRATE_PLANT=consumed   the fixture mapper forgets to report the attribute it consumed
 *   SGS_MOTION_MIGRATE_PLANT=lock       wp_check_post_lock reports every post as free
 *   SGS_MOTION_MIGRATE_PLANT=backup     the only backup candidate is inside the fake ABSPATH
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals, WordPress.Security.EscapeOutput.OutputNotEscaped, Squiz.Commenting, WordPress.WP.AlternativeFunctions, WordPress.PHP.DevelopmentFunctions

namespace {

	$fake_wp = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'sgs-motion-migrate-test-' . bin2hex( random_bytes( 4 ) );
	mkdir( $fake_wp . DIRECTORY_SEPARATOR . 'public_html' . DIRECTORY_SEPARATOR . 'inside', 0777, true );
	mkdir( $fake_wp . DIRECTORY_SEPARATOR . 'above', 0777, true );
	define( 'ABSPATH', $fake_wp . DIRECTORY_SEPARATOR . 'public_html' . DIRECTORY_SEPARATOR );

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

	/** Editor locks by post ID => user ID. */
	$GLOBALS['locks'] = array();
	function wp_check_post_lock( $post_id ) {
		return 'lock' === getenv( 'SGS_MOTION_MIGRATE_PLANT' ) ? false : ( $GLOBALS['locks'][ $post_id ] ?? false );
	}

	/** Records `update` calls. */
	final class Fake_Wpdb {
		public $posts   = 'wp_posts';
		public $updates = array();
		public function update( $table, $data, $where, $f = null, $wf = null ) {
			$this->updates[] = array( $table, $data, $where );
			return 1;
		}
	}
	$wpdb = new Fake_Wpdb();
	function clean_post_cache( $id ): void {
		$GLOBALS['cleaned'][] = $id;
	}
}

namespace SGS\Blocks\Motion {

	$root = dirname( __DIR__, 2 );
	require_once $root . '/includes/motion/migrate/interface-sgs-motion-mapper.php';
	require_once $root . '/includes/motion/migrate/class-sgs-motion-migrate-backup.php';
	require_once $root . '/includes/motion/migrate/class-sgs-motion-migrate-lock.php';
	require_once $root . '/includes/motion/migrate/class-sgs-motion-migrate-runner.php';
	require_once $root . '/includes/motion/migrate/interface-sgs-motion-group-mapper.php';
	require_once $root . '/includes/motion/migrate/mappers/class-sgs-motion-map-entrance.php';
	require_once $root . '/includes/motion/migrate/mappers/class-sgs-motion-map-block-reveals.php';

	$plant = (string) getenv( 'SGS_MOTION_MIGRATE_PLANT' );
	$pass  = 0;
	$fail  = 0;

	function ok( bool $cond, string $label, string $detail = '' ): void {
		global $pass, $fail;
		if ( $cond ) {
			++$pass;
			echo "PASS  $label\n";
		} else {
			++$fail;
			echo "FAIL  $label" . ( '' === $detail ? '' : "  [$detail]" ) . "\n";
		}
	}

	/** Fixture-only mapper: `sgsFixtureStep` -> `stagger.step`, `sgsFixtureOffset` -> `stagger.offset`. */
	class Fixture_Mapper implements Sgs_Motion_Mapper_Interface {
		public function family(): string {
			return 'fixture';
		}
		public function handles( string $block_name, array $attrs ): bool {
			return isset( $attrs['sgsFixtureStep'] ) || isset( $attrs['sgsFixtureOffset'] ) || isset( $attrs['sgsFixtureScale'] );
		}
		public function map( string $block_name, array $attrs ): array {
			$stagger  = array();
			$consumed = array();
			if ( isset( $attrs['sgsFixtureStep'] ) ) {
				$stagger['step'] = $attrs['sgsFixtureStep'];
				$consumed[]      = 'sgsFixtureStep';
			}
			if ( isset( $attrs['sgsFixtureOffset'] ) ) {
				$stagger['offset'] = $attrs['sgsFixtureOffset'];
				$consumed[]        = 'sgsFixtureOffset';
			}
			$scale = $attrs['sgsFixtureScale'] ?? 1.05;
			if ( isset( $attrs['sgsFixtureScale'] ) ) {
				$consumed[] = 'sgsFixtureScale';
			}
			$motion = array(
				'v'        => 1,
				'elements' => array( 'root' => array( 'hover' => array( 'state' => array( 'values' => array( 'scale' => $scale ) ) ) ) ),
			);
			if ( array() !== $stagger ) {
				$motion['stagger'] = $stagger;
			}
			return array(
				'motion'   => $motion,
				'consumed' => 'consumed' === getenv( 'SGS_MOTION_MIGRATE_PLANT' ) ? array() : $consumed,
			);
		}
	}

	/** A real-shaped mapper class for the family-loading check (file `class-sgs-motion-map-fixture.php`). */
	final class Sgs_Motion_Map_Fixture extends Fixture_Mapper {
	}

	/** Fixture-only mapper that only reports: `sgsFixtureStuck` has no destination, so nothing is consumed or mapped. */
	class Reporting_Mapper implements Sgs_Motion_Mapper_Interface {
		public function family(): string {
			return 'reporting';
		}
		public function handles( string $block_name, array $attrs ): bool {
			return isset( $attrs['sgsFixtureStuck'] );
		}
		public function map( string $block_name, array $attrs ): array {
			return array(
				'motion'   => array(),
				'consumed' => array(),
				'reported' => array( array( 'attr' => 'sgsFixtureStuck', 'value' => $attrs['sgsFixtureStuck'], 'reason' => 'no destination', 'consumed' => false ) ),
			);
		}
	}

	/** Wraps the real entrance mapper and records every block the per-block pass hands it (the double-apply probe). */
	final class Spy_Entrance implements Sgs_Motion_Mapper_Interface, Sgs_Motion_Group_Mapper_Interface {
		public $mapped = array();
		private $inner;
		public function __construct() {
			$this->inner = new Sgs_Motion_Map_Entrance();
		}
		public function family(): string {
			return $this->inner->family();
		}
		public function handles( string $block_name, array $attrs ): bool {
			return $this->inner->handles( $block_name, $attrs );
		}
		public function map( string $block_name, array $attrs ): array {
			$this->mapped[] = $block_name . ':' . implode( ',', array_keys( $attrs ) );
			return $this->inner->map( $block_name, $attrs );
		}
		public function map_groups( array $blocks ): array {
			return $this->inner->map_groups( $blocks );
		}
	}

	$runner = new Sgs_Motion_Migrate_Runner( array( new Fixture_Mapper() ) );

	// 1. Post types: every registered type minus the non-block list.
	$types = Sgs_Motion_Migrate_Runner::post_types( array( 'post', 'page', 'product', 'sgs_header', 'wp_template', 'attachment', 'revision', 'nav_menu_item' ) );
	ok( in_array( 'sgs_header', $types, true ) && in_array( 'product', $types, true ) && in_array( 'wp_template', $types, true ), 'the sweep covers sgs_header, product and wp_template' );
	ok( ! in_array( 'attachment', $types, true ) && ! in_array( 'revision', $types, true ) && ! in_array( 'nav_menu_item', $types, true ), 'the sweep skips attachment, revision and nav_menu_item' );
	$deploy = (string) file_get_contents( $root . '/scripts/deploy_common.py' );
	preg_match( '/NON_BLOCK_POST_TYPES = \((.*?)\)/s', $deploy, $dm );
	preg_match_all( '/"([a-z_]+)"/', (string) ( $dm[1] ?? '' ), $dn );
	$php_list = Sgs_Motion_Migrate_Runner::NON_BLOCK_POST_TYPES;
	sort( $php_list );
	$py_list = $dn[1];
	sort( $py_list );
	ok( $php_list === $py_list && array() !== $py_list, 'the PHP non-block list equals deploy_common.py NON_BLOCK_POST_TYPES (build-deploy.py imports it)' );

	// 2. An sgs_header-type post with an old attribute on a nested block.
	$header = '<!-- wp:sgs/site-header {"className":"x"} -->' . "\n"
		. '<!-- wp:sgs/container {"sgsFixtureStep":120,"align":"wide"} /-->' . "\n"
		. '<!-- /wp:sgs/site-header -->';
	$diff   = $runner->migrate_content( $header );
	ok( $diff['changed'] && 1 === count( $diff['changes'] ), 'an old attribute in an sgs_header post produces one change' );
	ok( '0/0' === ( $diff['changes'][0]['path'] ?? '' ) && 'sgs/container' === ( $diff['changes'][0]['block'] ?? '' ), 'the change names the nested block and its path' );
	ok( array( 'sgsFixtureStep' ) === ( $diff['changes'][0]['consumed'] ?? null ), 'the consumed attribute is reported' );
	ok( false === strpos( $diff['content'], 'sgsFixtureStep' ), 'the old attribute is gone from the migrated content' );
	ok( false !== strpos( $diff['content'], '"sgsMotion":{"v":1,"elements":{"root":{"hover":{"state":{"values":{"scale":1.05}}}}},"stagger":{"step":120}}' ), 'sgsMotion carries the mapped value' );
	ok( false !== strpos( $diff['content'], '"align":"wide"' ) && false !== strpos( $diff['content'], '"className":"x"' ), 'unrelated attributes survive' );
	ok( array() === $diff['flags'], 'a valid value raises no flag' );
	$expected = str_replace( '{"sgsFixtureStep":120,"align":"wide"}', '{"align":"wide","sgsMotion":{"v":1,"elements":{"root":{"hover":{"state":{"values":{"scale":1.05}}}}},"stagger":{"step":120}}}', $header );
	ok( $diff['content'] === $expected, 'an exact post: only the migrated comment changes, every other byte is identical' );

	// 2b. A post the parser would not re-serialise byte-for-byte keeps every unrelated byte.
	$odd      = "  \n\n<p>raw  html </p>\n\n\n" . '<!-- wp:paragraph   {"a":1}   --><p>x</p><!-- /wp:paragraph -->' . "\n\n\n" . '<!--   wp:sgs/container   {"sgsFixtureStep":120}   /-->' . "\n  trailing  ";
	$odd_diff = $runner->migrate_content( $odd );
	$odd_want = str_replace( '<!--   wp:sgs/container   {"sgsFixtureStep":120}   /-->', '<!-- wp:sgs/container {"sgsMotion":{"v":1,"elements":{"root":{"hover":{"state":{"values":{"scale":1.05}}}}},"stagger":{"step":120}}} /-->', $odd );
	ok( $odd_diff['changed'] && $odd_diff['content'] === $odd_want, 'a non-exact post: odd whitespace, raw HTML and an unrelated comment survive byte-for-byte' );

	// 3. A value the schema refuses is flagged.
	$bad  = '<!-- wp:sgs/container {"sgsFixtureStep":120,"sgsFixtureOffset":99999,"sgsFixtureScale":99} /-->';
	$flag = $runner->migrate_content( $bad );
	$keys = array_column( $flag['flags'], 'key' );
	ok( in_array( 'stagger.offset', $keys, true ), 'an out-of-range value sanitise refuses is flagged by key' );
	ok( in_array( 'elements.root.hover.state.values.scale', $keys, true ), 'an out-of-range hover scale is flagged by its full key' );
	$by_key = array_column( $flag['flags'], null, 'key' );
	ok( 99999 === ( $by_key['stagger.offset']['before'] ?? null ) && array_key_exists( 'after', $by_key['stagger.offset'] ?? array() ) && null === $by_key['stagger.offset']['after'], 'the flag records the value as mapped and the value after sanitising' );
	$flag_doc = (string) json_encode( parse_blocks( $flag['content'] )[0]['attrs']['sgsMotion'] ?? array() );
	ok( false !== strpos( $flag_doc, '"step":120' ) && false === strpos( $flag_doc, '99999' ), 'the stored document holds only what the schema allows' );

	// 3c. An attribute is consumed only when the value that carried it survives sanitising. The fixture mapper says
	// nothing about which consumed attribute feeds which path, so a mapper whose fragment lost any value to the
	// sanitiser keeps every attribute it consumed on that block, each reported as not consumed. A value beaten by one
	// already stored is the stored-wins rule (section 5, and the hover, marquee and tilt runners): consumed, flagged.
	$attrs_of = static function ( array $diff ): array {
		return parse_blocks( $diff['content'] )[0]['attrs'] ?? array();
	};
	$rows_of  = static function ( array $diff ): array {
		return array_column( $diff['reported'], null, 'attr' );
	};
	$dropped = $runner->migrate_content( '<!-- wp:sgs/container {"sgsFixtureStep":120,"sgsFixtureOffset":99999} /-->' );
	$kept    = $attrs_of( $dropped );
	$rows    = $rows_of( $dropped );
	ok( 99999 === ( $kept['sgsFixtureOffset'] ?? null ) && 120 === ( $kept['sgsFixtureStep'] ?? null ) && 120 === ( $kept['sgsMotion']['stagger']['step'] ?? null ), 'a value the sanitiser drops (offset 99999): the mapper\'s consumed attributes stay on the block; what survived is still stored', json_encode( $kept ) );
	ok( false === ( $rows['sgsFixtureOffset']['consumed'] ?? null ) && false === ( $rows['sgsFixtureStep']['consumed'] ?? null ) && 'fixture' === ( $rows['sgsFixtureOffset']['family'] ?? '' ) && false !== strpos( (string) ( $rows['sgsFixtureOffset']['reason'] ?? '' ), 'stagger.offset' ), 'each kept attribute is reported as not consumed, naming the lost path', json_encode( $dropped['reported'] ) );
	ok( array() === ( $dropped['changes'][0]['consumed'] ?? array( 'missing' ) ), 'the change row lists no consumed attribute', json_encode( $dropped['changes'] ) );
	$whole = $runner->migrate_content( '<!-- wp:sgs/container {"sgsFixtureStep":120} /-->' );
	ok( ! isset( $attrs_of( $whole )['sgsFixtureStep'] ) && array() === $whole['reported'], 'control: a fragment that survives whole consumes its attribute and reports nothing' );

	// 4. A post with no old attributes yields no diff.
	$clean = '<!-- wp:sgs/container {"align":"wide"} /-->' . "\n" . '<!-- wp:paragraph --><p>Hello</p><!-- /wp:paragraph -->';
	$none  = $runner->migrate_content( $clean );
	ok( ! $none['changed'] && array() === $none['changes'] && array() === $none['flags'] && $none['content'] === $clean, 'a post with no old attributes yields no diff and identical content' );
	$stuck_post = '<!-- wp:sgs/container {"sgsFixtureStuck":1,"align":"wide"} /-->';
	$stuck      = ( new Sgs_Motion_Migrate_Runner( array( new Reporting_Mapper() ) ) )->migrate_content( $stuck_post );
	ok( ! $stuck['changed'] && array() === $stuck['changes'] && $stuck['content'] === $stuck_post && array( 'sgsFixtureStuck' ) === array_column( $stuck['reported'], 'attr' ), 'a block with only reported attributes gives changed false, identical content, and still reports the attribute' );

	// 5. A stored sgsMotion value wins over the mapped one.
	$mixed = '<!-- wp:sgs/container {"sgsFixtureStep":120,"sgsMotion":{"v":1,"elements":{"root":{"hover":{"state":{"values":{"scale":1.2}}}}},"stagger":{"step":300}}} /-->';
	$won   = $runner->migrate_content( $mixed );
	ok( false !== strpos( $won['content'], '"step":300' ) && false === strpos( $won['content'], '"step":120' ), 'a value already stored in sgsMotion wins over the mapped fragment' );
	ok( false !== strpos( $won['content'], '"scale":1.2' ) && false === strpos( $won['content'], '"scale":1.05' ), 'the stored hover scale wins over the mapped one' );

	// 5b. Effect lists (Spec 38A section 2): lists append, never merge by index.
	$fx_mapper = static function ( string $attr, string $id, string $effect ) {
		return new class( $attr, $id, $effect ) implements Sgs_Motion_Mapper_Interface {
			private $attr;
			private $id;
			private $effect;
			public function __construct( $attr, $id, $effect ) {
				$this->attr   = $attr;
				$this->id     = $id;
				$this->effect = $effect;
			}
			public function family(): string {
				return 'fx-' . $this->effect;
			}
			public function handles( string $block_name, array $attrs ): bool {
				return isset( $attrs[ $this->attr ] );
			}
			public function map( string $block_name, array $attrs ): array {
				return array(
					'motion'   => array(
						'v'        => 1,
						'elements' => array( 'root' => array( 'effects' => array( array( 'id' => $this->id, 'effect' => $this->effect ) ) ) ),
					),
					'consumed' => array( $this->attr ),
				);
			}
		};
	};
	$fx_runner = new Sgs_Motion_Migrate_Runner( array( $fx_mapper( 'oldRipple', 'r1', 'ripple' ), $fx_mapper( 'oldParallax', 'p1', 'parallax' ) ) );
	$effects   = static function ( array $diff ): array {
		preg_match( '/<!-- wp:\S+ (\{.*\}) \/?-->/s', $diff['content'], $am );
		$doc = json_decode( $am[1] ?? '{}', true )['sgsMotion'] ?? array();
		return $doc['elements']['root']['effects'] ?? array();
	};

	$two = $fx_runner->migrate_content( '<!-- wp:sgs/container {"oldRipple":true,"oldParallax":true} /-->' );
	ok( array( 'ripple', 'parallax' ) === array_column( $effects( $two ), 'effect' ) && array() === $two['flags'], 'two mappers returning one effect each yield two effects, not one mixed item' );

	$stored = $fx_runner->migrate_content( '<!-- wp:sgs/container {"oldRipple":true,"sgsMotion":{"v":1,"elements":{"root":{"effects":[{"id":"p9","effect":"parallax"}]}}}} /-->' );
	ok( array( 'parallax', 'ripple' ) === array_column( $effects( $stored ), 'effect' ) && array() === $stored['flags'], 'a stored effect and a mapped effect both survive (stored first)' );

	$clash = $fx_runner->migrate_content( '<!-- wp:sgs/container {"oldRipple":true,"sgsMotion":{"v":1,"elements":{"root":{"effects":[{"id":"old","effect":"ripple"}]}}}} /-->' );
	$ckeys = array_column( $clash['flags'], 'key' );
	ok( 1 === count( $effects( $clash ) ) && 'old' === ( $effects( $clash )[0]['id'] ?? '' ), 'the same effect slug merges into the stored layer and the stored value wins' );
	ok( in_array( 'conflict: elements.root.effects[ripple].id', $ckeys, true ), 'the mapped value the stored one overrode is flagged as a conflict' );

	// 5c. Editor locks.
	$GLOBALS['locks'] = array( 12 => 3 );
	$split            = Sgs_Motion_Migrate_Lock::partition( array( array( 'ID' => 11 ), array( 'ID' => 12 ), array( 'ID' => 13 ) ) );
	ok( Sgs_Motion_Migrate_Lock::available() && array( 12 => 3 ) === $split['locked'] && array( 11, 13 ) === array_column( $split['free'], 'ID' ), 'a post locked by another user is split out; the others stay free' );
	ok( 3 === Sgs_Motion_Migrate_Lock::owner( 12 ) && 0 === Sgs_Motion_Migrate_Lock::owner( 11 ), 'owner() returns the editing user or 0 (the re-check before each write)' );
	$GLOBALS['locks'] = array();

	// 6. Family listing reads file names.
	$dir = ABSPATH . 'inside';
	file_put_contents( $dir . '/class-sgs-motion-map-ghost.php', '<?php' );
	file_put_contents( $dir . '/class-sgs-motion-map-fixture.php', '<?php' );
	file_put_contents( $dir . '/other.php', '<?php' );
	ok( array( 'fixture', 'ghost' ) === Sgs_Motion_Migrate_Runner::families( $dir ), 'families() lists the file suffixes, sorted' );
	ok( array( 'fixture' ) === Sgs_Motion_Migrate_Runner::loadable_families( $dir ) && array( 'ghost' ) === Sgs_Motion_Migrate_Runner::broken_families( $dir ), 'a mapper file whose class is missing is broken and not listed as loadable' );
	ok( 'SGS\\Blocks\\Motion\\Sgs_Motion_Map_Block_Reveals' === Sgs_Motion_Migrate_Runner::mapper_class( 'block-reveals' ), 'mapper_class() maps a family slug to its class name' );

	// 7. Backup directory resolves outside ABSPATH; an inside candidate is refused.
	$above      = dirname( rtrim( ABSPATH, '/\\' ) ) . DIRECTORY_SEPARATOR . 'above';
	$candidates = 'backup' === $plant ? array( ABSPATH . 'inside' ) : array( ABSPATH . 'inside', $above );
	$bdir       = Sgs_Motion_Migrate_Backup::resolve_directory( ABSPATH, $candidates );
	ok( null !== $bdir && ! Sgs_Motion_Migrate_Backup::is_inside( $bdir, ABSPATH ), 'the backup directory resolves outside ABSPATH' );
	ok( null === Sgs_Motion_Migrate_Backup::resolve_directory( ABSPATH, array( ABSPATH . 'inside' ) ), 'a candidate inside ABSPATH is refused' );
	ok( null === Sgs_Motion_Migrate_Backup::resolve_directory( ABSPATH, array( $above ), $above ), 'a candidate inside the document root is refused' );

	// 8. Write, read back, random names, restore.
	$posts = array(
		array( 'ID' => 7, 'post_type' => 'sgs_header', 'post_content' => $header ),
		array( 'ID' => 9, 'post_type' => 'product', 'post_content' => "<!-- wp:paragraph -->\n<p>caf\u{e9} \\ \"q\"</p>\n<!-- /wp:paragraph -->" ),
	);
	$file_a = null === $bdir ? null : Sgs_Motion_Migrate_Backup::write( $posts, $bdir, 'https://example.test' );
	$file_b = null === $bdir ? null : Sgs_Motion_Migrate_Backup::write( $posts, $bdir, 'https://example.test' );
	ok( null !== $file_a && is_file( $file_a ) && ! Sgs_Motion_Migrate_Backup::is_inside( dirname( (string) $file_a ), ABSPATH ), 'the backup file exists outside ABSPATH' );
	ok( null !== $file_a && null !== $file_b && $file_a !== $file_b && 1 === preg_match( '/motion-migrate-\d{8}-\d{6}-[0-9a-f]{16}\.json$/', $file_a ), 'backup file names are random' );
	ok( null !== $file_a && Sgs_Motion_Migrate_Backup::read( $file_a ) === $posts, 'the backup reads back byte-identical, including quotes, backslashes and accents' );
	$restored = null === $file_a ? null : Sgs_Motion_Migrate_Backup::restore( $file_a );
	ok( array( 'restored' => 2, 'failed' => array() ) === $restored, 'restore reports both posts restored' );
	ok( 2 === count( $wpdb->updates ) && $wpdb->updates[0][1] === array( 'post_content' => $header ) && $wpdb->updates[0][2] === array( 'ID' => 7 ), 'restore writes the stored content with $wpdb->update by ID' );
	ok( array( 7, 9 ) === $GLOBALS['cleaned'], 'restore clears each post cache' );
	file_put_contents( $dir . '/bad.json', '{"posts":[{"ID":1}]}' );
	ok( null === Sgs_Motion_Migrate_Backup::read( $dir . '/bad.json' ) && null === Sgs_Motion_Migrate_Backup::restore( $dir . '/missing.json' ), 'a malformed or missing backup is refused' );

	// 9. The group pass (Spec 38A FR-38A-31): a staggered container migrates end to end through migrate_content.
	$stagger_post = '<!-- wp:sgs/container {"sgsAnimation":"fade-in","sgsAnimationStaggerChildren":"70","sgsAnimationStaggerMax":"3"} -->' . "\n"
		. '<!-- wp:sgs/info-box {"sgsAnimation":"fade-up"} /-->' . "\n"
		. '<!-- wp:sgs/info-box {"sgsAnimation":"fade-up","sgsAnimationDelay":"50"} /-->' . "\n"
		. '<!-- wp:sgs/info-box {"sgsAnimation":"slide-left","sgsAnimationDuration":"fast"} /-->' . "\n"
		. '<!-- /wp:sgs/container -->';
	$spy       = new Spy_Entrance();
	$grouped   = ( new Sgs_Motion_Migrate_Runner( array( $spy ) ) )->migrate_content( $stagger_post );
	$tree      = parse_blocks( $grouped['content'] );
	$delays    = array_map( static fn( $b ) => $b['attrs']['sgsMotion']['elements']['root']['entrance']['base']['values']['delay'] ?? 0, $tree[0]['innerBlocks'] );
	ok( $grouped['changed'] && array() === $grouped['flags'] && false === strpos( $grouped['content'], 'sgsAnimation' ), 'a staggered container migrates in one migrate_content call: no sgsAnimation* attribute left, no flag', json_encode( $grouped['flags'] ) );
	ok( array( 0, 120, 140 ) === $delays, 'the three children store the delays the entrance mapper computes (0, 50 + 70, 2 x 70)', json_encode( $delays ) );
	$parent = $tree[0]['attrs']['sgsMotion'] ?? array();
	ok( 'entrance-fade-in' === ( $parent['elements']['root']['entrance']['base']['preset'] ?? '' ) && 210 === ( $parent['stagger']['cap'] ?? null ) && false === ( $parent['stagger']['apply'] ?? true ), 'the container keeps its own entrance and gets the helper settings (cap 210, apply false)' );
	$paths = array_column( $grouped['changes'], 'path' );
	sort( $paths );
	ok( array( '0', '0/0', '0/1', '0/2' ) === $paths, 'every block has exactly one change row', json_encode( $paths ) );
	ok( array( 'sgs/container:sgsAnimation,sgsMotion' ) === $spy->mapped, 'double-apply: the per-block pass is handed only the container, with just its own sgsAnimation left (the three children and the stagger attributes were consumed by the group pass)', json_encode( $spy->mapped ) );

	// 9b. Running twice changes nothing.
	$again = ( new Sgs_Motion_Migrate_Runner( array( new Sgs_Motion_Map_Entrance() ) ) )->migrate_content( $grouped['content'] );
	ok( ! $again['changed'] && $again['content'] === $grouped['content'] && array() === $again['changes'] && array() === $again['flags'], 'idempotent: a second migrate_content over the migrated post changes nothing' );

	// 9c. A runner built without the entrance mapper (--family=block-reveals) never runs its group pass.
	$skipped = ( new Sgs_Motion_Migrate_Runner( array( new Sgs_Motion_Map_Block_Reveals() ) ) )->migrate_content( $stagger_post );
	ok( ! $skipped['changed'] && $skipped['content'] === $stagger_post && array() === $skipped['changes'], '--family=block-reveals: the entrance group pass is skipped and the old stagger attributes stay untouched' );

	// 9d. Reported rows reach the result.
	$report_post = '<!-- wp:sgs/container {"sgsAnimationStaggerChildren":"500","sgsAnimationStaggerMax":"50"} -->' . "\n"
		. '<!-- wp:sgs/info-box {"sgsAnimation":"fade-up"} /-->' . "\n"
		. '<!-- /wp:sgs/container -->' . "\n"
		. '<!-- wp:sgs/hero {"sgsAnimationStagger":"abc"} /-->';
	$reported = ( new Sgs_Motion_Migrate_Runner( array( new Sgs_Motion_Map_Entrance() ) ) )->migrate_content( $report_post );
	$by_attr  = array();
	foreach ( $reported['reported'] as $row ) {
		$by_attr[ $row['path'] . ' ' . $row['attr'] ] = $row;
	}
	ok( isset( $by_attr['0 sgsAnimationStaggerMax'] ) && 'entrance' === $by_attr['0 sgsAnimationStaggerMax']['family'] && 'sgs/container' === $by_attr['0 sgsAnimationStaggerMax']['block'] && '' !== $by_attr['0 sgsAnimationStaggerMax']['reason'], 'a group-pass reported row (cap above the ceiling) appears in the result with its path, block and family', json_encode( $reported['reported'] ) );
	ok( isset( $by_attr['1 sgsAnimationStagger'] ) && false === $by_attr['1 sgsAnimationStagger']['consumed'], 'a per-block reported row (a non-numeric step) appears in the result', json_encode( $reported['reported'] ) );
	ok( array() === $none['reported'] && array() === $skipped['reported'] && array() === $again['reported'], 'a post with nothing to report has an empty reported list' );

	// Tidy the fake tree.
	foreach ( array_merge( glob( $dir . '/*' ) ?: array(), glob( $above . '/*/*' ) ?: array() ) as $f ) {
		@unlink( $f );
	}
	foreach ( glob( $above . '/*' ) ?: array() as $d ) {
		@rmdir( $d );
	}
	@rmdir( $dir );
	@rmdir( ABSPATH );
	@rmdir( $above );
	@rmdir( dirname( rtrim( ABSPATH, '/\\' ) ) );

	echo "\n$pass passed, $fail failed\n";
	exit( $fail > 0 ? 1 : 0 );
}
