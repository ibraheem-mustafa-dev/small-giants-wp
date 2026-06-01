<?php
/**
 * SGS Block Styles — sgs/quote
 *
 * Registers the three cosmetic style presets that were previously driven by the
 * `variantStyle` scalar attribute. Converting them to native WordPress block
 * styles means:
 *   - Editors choose them from the Styles panel (sidebar or Block Toolbar switcher)
 *     rather than a custom SelectControl.
 *   - Each style applies the `is-style-{name}` class on the wrapper automatically.
 *   - No PHP render.php branching is needed — CSS selectors handle everything.
 *
 * `default` is the base (no is-style-* class) and needs no registration.
 *
 * @package SGS\Blocks
 * @since   0.1.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Register block styles for sgs/quote.
 *
 * @return void
 */
function sgs_register_quote_styles(): void {
	register_block_style(
		'sgs/quote',
		array(
			'name'         => 'pullquote',
			'label'        => __( 'Pull-quote', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-quote.is-style-pullquote {
					text-align: center;
					border-left: 4px solid var( --wp--preset--color--primary, currentColor );
					border-right: 4px solid var( --wp--preset--color--primary, currentColor );
				}
			',
		)
	);

	register_block_style(
		'sgs/quote',
		array(
			'name'         => 'testimonial',
			'label'        => __( 'Testimonial', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-quote.is-style-testimonial {
					border-radius: 8px;
					box-shadow: 0 2px 8px rgba( 0, 0, 0, 0.08 );
				}
			',
		)
	);

	register_block_style(
		'sgs/quote',
		array(
			'name'         => 'plain',
			'label'        => __( 'Plain', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-quote.is-style-plain {
					/* Plain: no visual decoration beyond the base reset. */
				}
			',
		)
	);
}

add_action( 'init', __NAMESPACE__ . '\\sgs_register_quote_styles' );
