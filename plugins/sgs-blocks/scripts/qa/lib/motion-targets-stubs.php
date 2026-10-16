<?php
/**
 * Stand-ins the render harness loads only under `--motion-targets` (scripts/check-motion-part-render-paths.py is the
 * caller): the block type registry, read from the real `src/blocks/<slug>/block.json` files, and a `WP_Block` base
 * class, so the real `Sgs_Motion_Targets::resolve` and the container wrapper's motion band force
 * (`Sgs_Motion_Targets::names_band`, which reads the block name only off a `WP_Block`) run as they do in WordPress.
 *
 * Opt-in because a registered block type changes what the container wrapper reads (`supports` lookups through the
 * registry); the CSS-effect callers of the harness keep their unregistered behaviour.
 *
 * Test scaffolding only; nothing here is shipped.
 *
 * @package SGS\Blocks\QA
 */

declare(strict_types=1);

// phpcs:disable

if ( ! class_exists( 'WP_Block' ) ) {
	/** The properties SGS render code reads off a block instance. */
	class WP_Block {
		public $name         = '';
		public $attributes   = array();
		public $context      = array();
		public $parsed_block = array();
		public $inner_blocks = array();
		public $block_type   = null;
	}
}

if ( ! class_exists( 'WP_Block_Type_Registry' ) ) {
	/** Block types read from the real `src/blocks/<slug>/block.json` (supports and attributes only). */
	class WP_Block_Type_Registry {
		private static $inst;
		private $types = array();
		public static function get_instance() {
			return self::$inst ??= new self();
		}
		public function get_registered( $name ) {
			if ( ! array_key_exists( $name, $this->types ) ) {
				$slug = substr( (string) $name, strpos( (string) $name, '/' ) + 1 );
				$file = dirname( __DIR__, 3 ) . '/src/blocks/' . $slug . '/block.json';
				$json = is_readable( $file ) ? json_decode( (string) file_get_contents( $file ), true ) : null;
				$this->types[ $name ] = is_array( $json )
					? (object) array(
						'name'       => (string) $name,
						'supports'   => $json['supports'] ?? array(),
						'attributes' => $json['attributes'] ?? array(),
					)
					: null;
			}
			return $this->types[ $name ];
		}
		public function is_registered( $name ) {
			return null !== $this->get_registered( $name );
		}
	}
}

/** The harness block, as a `WP_Block`, carrying the block name. */
class SGS_QA_Motion_Block extends WP_Block {
	public function __construct( string $name, array $attributes, array $context, ?object $block_type ) {
		$this->name         = $name;
		$this->attributes   = $attributes;
		$this->context      = $context;
		$this->block_type   = $block_type;
		$this->parsed_block = array(
			'blockName' => $name,
			'attrs'     => array( 'anchor' => '' ),
		);
	}
}

/**
 * `$attributes` with every block.json attribute default the caller left out, as WordPress applies them before a
 * render (`WP_Block_Type::prepare_attributes_for_render`).
 *
 * @param array<string,mixed> $attributes Caller attributes.
 * @param array<string,mixed> $schema     block.json `attributes`.
 * @return array<string,mixed>
 */
function sgs_qa_apply_attribute_defaults( array $attributes, array $schema ): array {
	foreach ( $schema as $key => $def ) {
		if ( ! array_key_exists( $key, $attributes ) && is_array( $def ) && array_key_exists( 'default', $def ) ) {
			$attributes[ $key ] = $def['default'];
		}
	}
	return $attributes;
}
