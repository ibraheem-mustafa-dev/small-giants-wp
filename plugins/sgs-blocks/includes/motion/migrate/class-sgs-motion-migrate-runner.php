<?php
/**
 * The motion migration runner (Spec 38A §13.2, FR-38A-32): walks one post's blocks, applies every registered mapper,
 * merges each fragment into the block's `sgsMotion`, sanitises the result against the shipped schema and returns a
 * per-post diff. It writes nothing; `Sgs_Motion_Migrate_Command` owns the database.
 *
 * Mappers come from `includes/motion/migrate/mappers/` (class `Sgs_Motion_Map_<Family>` per file) plus the
 * `sgs_motion_migrate_mappers` filter. Fragments merge as keyed objects recursively and as lists by appending (an
 * `effects` item merges into the existing item with the same `effect` slug). A fragment value that is missing from or
 * different in the merged result (a stored value or another mapper won) and a value `Sgs_Motion_Document::sanitise`
 * drops or changes are FLAGGED in the diff, never silently lost.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/interface-sgs-motion-mapper.php';
require_once __DIR__ . '/interface-sgs-motion-group-mapper.php';
require_once __DIR__ . '/class-sgs-motion-migrate-merge.php';
require_once __DIR__ . '/class-sgs-motion-migrate-apply.php';
require_once dirname( __DIR__ ) . '/field-types/class-sgs-motion-document.php';

/**
 * Class Sgs_Motion_Migrate_Runner
 */
final class Sgs_Motion_Migrate_Runner {

	/**
	 * Post types that cannot carry block markup in `post_content`. Mirrors `NON_BLOCK_POST_TYPES` in
	 * `plugins/sgs-blocks/scripts/build-deploy.py`; the sweep covers every other registered post type.
	 */
	const NON_BLOCK_POST_TYPES = array(
		'attachment',
		'revision',
		'nav_menu_item',
		'custom_css',
		'customize_changeset',
		'oembed_cache',
		'user_request',
		'wp_global_styles',
		'wp_font_family',
		'wp_font_face',
	);

	const MAPPER_FILE_PREFIX = 'class-sgs-motion-map-';

	/**
	 * The mappers this runner applies.
	 *
	 * @var Sgs_Motion_Mapper_Interface[]
	 */
	private $mappers;

	/**
	 * Bind to a mapper list.
	 *
	 * @param Sgs_Motion_Mapper_Interface[]|null $mappers Mappers to apply; null loads the folder's mappers and the filter's.
	 */
	public function __construct( ?array $mappers = null ) {
		$this->mappers = null === $mappers ? self::default_mappers() : array_values( $mappers );
	}

	/**
	 * The folder holding the mapper files.
	 *
	 * @return string
	 */
	public static function mappers_dir(): string {
		return __DIR__ . '/mappers';
	}

	/**
	 * Every family that has a mapper file, from the file names.
	 *
	 * @param string|null $dir Folder to read; null uses `mappers_dir()`.
	 * @return string[] Sorted family slugs.
	 */
	public static function families( ?string $dir = null ): array {
		$files    = glob( ( $dir ?? self::mappers_dir() ) . '/' . self::MAPPER_FILE_PREFIX . '*.php' );
		$families = array();
		foreach ( is_array( $files ) ? $files : array() as $file ) {
			$families[] = substr( basename( $file, '.php' ), strlen( self::MAPPER_FILE_PREFIX ) );
		}
		sort( $families, SORT_STRING );
		return $families;
	}

	/**
	 * The families whose file declares the expected class implementing the mapper interface.
	 *
	 * @param string|null $dir Folder to read; null uses `mappers_dir()`.
	 * @return string[]
	 */
	public static function loadable_families( ?string $dir = null ): array {
		return array_values( array_filter( self::families( $dir ), array( __CLASS__, 'is_loadable' ) ) );
	}

	/**
	 * The families whose file exists but whose class is missing, misnamed or not a mapper.
	 *
	 * @param string|null $dir Folder to read; null uses `mappers_dir()`.
	 * @return string[]
	 */
	public static function broken_families( ?string $dir = null ): array {
		return array_values( array_diff( self::families( $dir ), self::loadable_families( $dir ) ) );
	}

	/**
	 * Whether a family's expected class exists and implements the interface.
	 *
	 * @param string $family Family slug.
	 * @return bool
	 */
	private static function is_loadable( string $family ): bool {
		$class = self::mapper_class( $family );
		return class_exists( $class ) && is_subclass_of( $class, Sgs_Motion_Mapper_Interface::class );
	}

	/**
	 * The class name a family's mapper file declares.
	 *
	 * @param string $family Family slug, for example `block-reveals`.
	 * @return string Fully qualified class name.
	 */
	public static function mapper_class( string $family ): string {
		return __NAMESPACE__ . '\\Sgs_Motion_Map_' . implode( '_', array_map( 'ucfirst', explode( '-', $family ) ) );
	}

	/**
	 * The folder's mappers plus any added through the `sgs_motion_migrate_mappers` filter.
	 *
	 * @return Sgs_Motion_Mapper_Interface[]
	 */
	public static function default_mappers(): array {
		$mappers = array();
		foreach ( self::loadable_families() as $family ) {
			$class     = self::mapper_class( $family );
			$mappers[] = new $class();
		}
		$filtered = function_exists( 'apply_filters' ) ? apply_filters( 'sgs_motion_migrate_mappers', $mappers ) : $mappers;
		return array_values(
			array_filter(
				is_array( $filtered ) ? $filtered : $mappers,
				static function ( $mapper ) {
					return $mapper instanceof Sgs_Motion_Mapper_Interface;
				}
			)
		);
	}

	/**
	 * The post types a sweep covers: every registered type minus the non-block list.
	 *
	 * @param string[] $registered Registered post type names.
	 * @return string[]
	 */
	public static function post_types( array $registered ): array {
		return array_values( array_diff( $registered, self::NON_BLOCK_POST_TYPES ) );
	}

	/**
	 * Migrate one post's content.
	 *
	 * Two passes. Every mapper implementing `Sgs_Motion_Group_Mapper_Interface` first sees the whole block tree and its
	 * patches are applied by block path; then every mapper's `handles()` / `map()` runs per block on the attributes the
	 * group pass left. A group patch consumes the attributes it carries, so the per-block pass finds them gone and can
	 * never apply them a second time; what the group pass left in place (an entrance it could not store) is mapped
	 * without any group context, the stored `sgsMotion` winning on a clash (and flagged).
	 *
	 * Only the attribute JSON of the migrated block comments is replaced in the original text, so every other byte of
	 * the post (other blocks, whitespace, HTML) is untouched.
	 *
	 * @param string $content The stored `post_content`.
	 * @return array{content:string,changed:bool,changes:array<int,array<string,mixed>>,flags:array<int,array<string,mixed>>,reported:array<int,array<string,mixed>>}
	 *         `changes` has one row per migrated block (path, block, families, consumed, motion); `flags` has one row per
	 *         conflict between mapped and stored values and per value the schema dropped or changed (path, block, key,
	 *         before, after); `reported` has one row per value a mapper had no destination for (path, block, family, then
	 *         the mapper's attr, value, reason, consumed).
	 */
	public function migrate_content( string $content ): array {
		$blocks = parse_blocks( $content );
		$run    = array(
			'changes'  => array(),
			'flags'    => array(),
			'reported' => array(),
			'patches'  => array(),
			'touched'  => array(),
			'seq'      => 0,
		);
		$this->group_pass( $blocks, $run );
		$this->walk( $blocks, '', $run );
		$flags    = $run['flags'];
		$reported = $run['reported'];
		if ( array() === $run['changes'] ) {
			return array(
				'content'  => $content,
				'changed'  => false,
				'changes'  => array(),
				'flags'    => $flags,
				'reported' => $reported,
			);
		}
		$patched = self::patch_comments( $content, $run['patches'], $run['seq'] );
		if ( null === $patched ) {
			$flags[] = Sgs_Motion_Migrate_Apply::flag( '', '', '(content)', 'the block comments in the stored text do not line up with the parsed blocks', null );
			return array(
				'content'  => $content,
				'changed'  => false,
				'changes'  => array(),
				'flags'    => $flags,
				'reported' => $reported,
			);
		}
		return array(
			'content'  => $patched,
			'changed'  => true,
			'changes'  => $run['changes'],
			'flags'    => $flags,
			'reported' => $reported,
		);
	}

	/**
	 * Replace the attribute JSON of the patched blocks' opening comments.
	 *
	 * @param string                         $content Original text.
	 * @param array<int,array<string,mixed>> $patches New attributes by pre-order block sequence number.
	 * @param int                            $total   Number of named blocks the parser found.
	 * @return string|null Null when the comment count differs from the parsed block count.
	 */
	private static function patch_comments( string $content, array $patches, int $total ): ?string {
		$count  = 0;
		$result = preg_replace_callback(
			'/<!--\s+wp:([a-z][a-z0-9_-]*(?:\/[a-z][a-z0-9_-]*)?)(\s+\{.*?\})?(\s*\/)?\s*-->/s',
			static function ( array $m ) use ( &$count, $patches ): string {
				$i = $count++;
				if ( ! isset( $patches[ $i ] ) ) {
					return $m[0];
				}
				$attrs = array() === $patches[ $i ] ? '' : ' ' . serialize_block_attributes( $patches[ $i ] );
				return '<!-- wp:' . $m[1] . $attrs . ( empty( $m[3] ) ? ' -->' : ' /-->' );
			},
			$content
		);
		return null === $result || $count !== $total ? null : $result;
	}

	/**
	 * Hand the whole tree to every group mapper and apply its patches by block path.
	 *
	 * @param array<int,array<string,mixed>> $blocks Parsed blocks (modified in place).
	 * @param array<string,mixed>            $run    Run state (changes, flags, reported, patches, touched, seq).
	 */
	private function group_pass( array &$blocks, array &$run ): void {
		$by_path = array();
		foreach ( $this->mappers as $mapper ) {
			if ( ! $mapper instanceof Sgs_Motion_Group_Mapper_Interface ) {
				continue;
			}
			try {
				$patches = $mapper->map_groups( $blocks );
			} catch ( \Throwable $e ) {
				$run['flags'][] = Sgs_Motion_Migrate_Apply::flag( '', '', '(group mapper ' . $mapper->family() . ')', $e->getMessage(), null );
				continue;
			}
			foreach ( $patches as $path => $patch ) {
				$path = (string) $path;
				if ( ! is_array( $patch ) || ! isset( $patch['motion'], $patch['consumed'] ) || ! is_array( $patch['motion'] ) || ! is_array( $patch['consumed'] ) ) {
					$run['flags'][] = Sgs_Motion_Migrate_Apply::flag( $path, '', '(group mapper ' . $mapper->family() . ')', 'malformed patch', null );
					continue;
				}
				$by_path[ $path ][] = array(
					'family' => $mapper->family(),
					'patch'  => $patch,
				);
			}
		}
		foreach ( $by_path as $path => $entries ) {
			$path  = (string) $path;
			$block = &self::locate( $blocks, $path );
			$name  = is_array( $block ) && isset( $block['blockName'] ) && is_string( $block['blockName'] ) ? $block['blockName'] : '';
			if ( '' === $name ) {
				$run['flags'][] = Sgs_Motion_Migrate_Apply::flag( $path, '', '(group mapper)', 'the patch path names no block in this post', null );
				unset( $block );
				continue;
			}
			$results = array();
			foreach ( $entries as $entry ) {
				$results[] = Sgs_Motion_Migrate_Apply::result( $entry['family'], $entry['patch'] );
				Sgs_Motion_Migrate_Apply::collect_reported( $run, $path, $name, $entry['family'], $entry['patch'] );
			}
			if ( Sgs_Motion_Migrate_Apply::apply_results( $block, $name, $path, $results, $run ) ) {
				$run['touched'][ $path ] = true;
			}
			unset( $block );
		}
	}

	/**
	 * A reference to the block at a runner path (`'3/0/2'`), or null when no block is there.
	 *
	 * @param array<int,array<string,mixed>> $blocks Parsed blocks.
	 * @param string                         $path   Runner path.
	 * @return array<string,mixed>|null
	 */
	private static function &locate( array &$blocks, string $path ): ?array {
		$none     = null;
		$segments = explode( '/', $path );
		$first    = array_shift( $segments );
		if ( ! is_numeric( $first ) || ! isset( $blocks[ (int) $first ] ) ) {
			return $none;
		}
		$node = &$blocks[ (int) $first ];
		foreach ( $segments as $segment ) {
			if ( ! is_numeric( $segment ) || ! isset( $node['innerBlocks'][ (int) $segment ] ) ) {
				return $none;
			}
			$node = &$node['innerBlocks'][ (int) $segment ];
		}
		return $node;
	}

	/**
	 * Walk a block list, migrating each block in place.
	 *
	 * @param array<int,array<string,mixed>> $blocks Parsed blocks (modified in place).
	 * @param string                         $path   Path prefix.
	 * @param array<string,mixed>            $run    Run state (changes, flags, reported, patches, touched, seq).
	 */
	private function walk( array &$blocks, string $path, array &$run ): void {
		foreach ( $blocks as $i => &$block ) {
			$here = '' === $path ? (string) $i : $path . '/' . $i;
			$name = isset( $block['blockName'] ) && is_string( $block['blockName'] ) ? $block['blockName'] : '';
			if ( '' !== $name ) {
				$mine = $run['seq']++;
				if ( $this->migrate_block( $block, $name, $here, $run ) || isset( $run['touched'][ $here ] ) ) {
					$run['patches'][ $mine ] = $block['attrs'];
				}
			}
			if ( ! empty( $block['innerBlocks'] ) && is_array( $block['innerBlocks'] ) ) {
				$this->walk( $block['innerBlocks'], $here, $run );
			}
		}
		unset( $block );
	}

	/**
	 * Ask every handling mapper about one block, then apply what they return.
	 *
	 * @param array<string,mixed> $block The parsed block (modified in place).
	 * @param string              $name  Block name.
	 * @param string              $path  Block path.
	 * @param array<string,mixed> $run   Run state.
	 * @return bool Whether the block's attributes changed.
	 */
	private function migrate_block( array &$block, string $name, string $path, array &$run ): bool {
		$attrs   = isset( $block['attrs'] ) && is_array( $block['attrs'] ) ? $block['attrs'] : array();
		$results = array();
		foreach ( $this->mappers as $mapper ) {
			try {
				if ( ! $mapper->handles( $name, $attrs ) ) {
					continue;
				}
				$result = $mapper->map( $name, $attrs );
			} catch ( \Throwable $e ) {
				$run['flags'][] = Sgs_Motion_Migrate_Apply::flag( $path, $name, '(mapper ' . $mapper->family() . ')', $e->getMessage(), null );
				continue;
			}
			if ( ! isset( $result['motion'], $result['consumed'] ) || ! is_array( $result['motion'] ) || ! is_array( $result['consumed'] ) ) {
				$run['flags'][] = Sgs_Motion_Migrate_Apply::flag( $path, $name, '(mapper ' . $mapper->family() . ')', 'malformed result', null );
				continue;
			}
			$results[] = Sgs_Motion_Migrate_Apply::result( $mapper->family(), $result );
			Sgs_Motion_Migrate_Apply::collect_reported( $run, $path, $name, $mapper->family(), $result );
		}
		return array() !== $results && Sgs_Motion_Migrate_Apply::apply_results( $block, $name, $path, $results, $run );
	}
}
