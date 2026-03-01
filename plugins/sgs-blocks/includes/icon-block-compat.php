<?php
/**
 * Backward compatibility registration for the retired sgs/icon-block type.
 *
 * When the sgs/icon and sgs/icon-block blocks were consolidated (March 2026),
 * the sgs/icon-block source directory was deleted and sgs/icon became the
 * canonical icon block. This file ensures that any existing post or template
 * content that still contains <!-- wp:sgs/icon-block --> continues to render
 * correctly on the frontend.
 *
 * The block is registered with inserter: false so it does not appear in the
 * block inserter for new content. Editors are encouraged to use the
 * "Transform to" option in the block toolbar to convert existing instances to
 * sgs/icon, after which this compat registration can be removed entirely.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Register the retired sgs/icon-block as a read-only compatibility alias.
 */
add_action( 'init', function (): void {
	/**
	 * Render a retired sgs/icon-block using the canonical sgs/icon renderer.
	 *
	 * Maps the old attribute names to the sgs/icon schema before delegating.
	 *
	 * Old → New:
	 *   iconSize  (number)  → size            (number)
	 *   shape     (string)  → backgroundShape  (string)
	 *
	 * @param array    $attrs   Block attributes using the sgs/icon-block schema.
	 * @param string   $content Inner block content (unused — dynamic block).
	 * @return string  Rendered HTML output.
	 */
	$render_callback = function ( array $attrs, string $content ): string {
		require_once SGS_BLOCKS_PATH . 'includes/render-helpers.php';
		require_once SGS_BLOCKS_PATH . 'includes/lucide-icons.php';

		// Map old attribute names to the sgs/icon schema.
		$icon             = $attrs['icon']             ?? 'star';
		$size             = (int) ( $attrs['iconSize'] ?? 48 );
		$icon_colour      = $attrs['iconColour']       ?? 'primary';
		$bg_colour        = $attrs['backgroundColour'] ?? '';
		$bg_shape         = $attrs['shape']            ?? 'none';
		$link             = $attrs['link']             ?? '';
		$link_new_tab     = ! empty( $attrs['linkOpensNewTab'] );

		$classes   = [ 'sgs-icon' ];
		$classes[] = 'sgs-icon--bg-' . esc_attr( $bg_shape );

		$styles = [
			'width:'  . $size . 'px',
			'height:' . $size . 'px',
		];

		if ( $icon_colour ) {
			$styles[] = 'color:' . sgs_colour_value( $icon_colour );
		}

		if ( $bg_colour && 'none' !== $bg_shape ) {
			$styles[] = 'background-color:' . sgs_colour_value( $bg_colour );
		}

		$wrapper = get_block_wrapper_attributes( [
			'class' => implode( ' ', $classes ),
			'style' => implode( ';', $styles ),
		] );

		$icon_svg = sgs_get_lucide_icon( $icon );
		$inner    = sprintf( '<span class="sgs-icon__svg" aria-hidden="true">%s</span>', $icon_svg );

		if ( $link ) {
			$target = $link_new_tab ? ' target="_blank" rel="noopener noreferrer"' : '';
			$inner  = sprintf(
				'<a href="%s" class="sgs-icon__link"%s aria-label="%s">%s</a>',
				esc_url( $link ),
				$target,
				esc_attr( $icon ),
				$inner
			);
		}

		return sprintf( '<div %s>%s</div>', $wrapper, $inner );
	};

	// Guard: skip if already registered (e.g. a stale build artefact was auto-discovered).
	if ( \WP_Block_Type_Registry::get_instance()->is_registered( 'sgs/icon-block' ) ) {
		return;
	}

	register_block_type( 'sgs/icon-block', [
		'api_version'     => 3,
		'title'           => __( 'SGS Icon Block (retired — use SGS Icon)', 'sgs-blocks' ),
		'description'     => __( 'Retired. Exists only for backward compatibility. Use the SGS Icon block for new content.', 'sgs-blocks' ),
		'category'        => 'sgs-content',
		'supports'        => [ 'inserter' => false ],
		'attributes'      => [
			'icon'             => [ 'type' => 'string',  'default' => 'star'    ],
			'iconColour'       => [ 'type' => 'string',  'default' => 'primary' ],
			'iconSize'         => [ 'type' => 'number',  'default' => 48        ],
			'backgroundColour' => [ 'type' => 'string',  'default' => ''        ],
			'link'             => [ 'type' => 'string',  'default' => ''        ],
			'linkOpensNewTab'  => [ 'type' => 'boolean', 'default' => false     ],
			'shape'            => [ 'type' => 'string',  'default' => 'none'    ],
		],
		'render_callback' => $render_callback,
	] );
}, 11 ); // Priority 11 — runs after the auto-discovery loop at priority 10.
