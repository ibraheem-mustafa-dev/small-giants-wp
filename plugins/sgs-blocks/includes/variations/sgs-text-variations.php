<?php
/**
 * SGS Block Styles — sgs/text
 *
 * Registers the three named cosmetic presets (Quote, Caption, Lead) as proper
 * WordPress block styles so they appear in the Styles tab of the block editor
 * and are serialised as `is-style-{value}` on the wrapper class — the pattern
 * the cloning converter already treats as plain CSS.
 *
 * Visual definitions were previously implied by the `variantStyle` attribute
 * (which emitted `wp-block-sgs-text--{value}` modifier classes) but no CSS
 * rules ever backed those classes. This file introduces the canonical CSS for
 * all three presets using design tokens where possible.
 *
 * Migration: blocks saved with `variantStyle` != "default" are handled by the
 * `deprecated.js` entry in the block — `migrate()` moves the old attr value
 * into `className` as `is-style-{value}` so existing posts render correctly
 * after the next editor save.
 *
 * @package SGS\Blocks
 * @since   0.1.1
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Register cosmetic block styles for sgs/text.
 *
 * Hooked on `init` so styles are available both in the editor and on the
 * frontend. `inline_style` is enqueued automatically by WordPress alongside
 * the block's own stylesheet when the block is present on the page.
 *
 * @return void
 */
function sgs_register_text_styles(): void {
	// Quote — left border accent, italic body, muted text, generous side padding.
	register_block_style(
		'sgs/text',
		array(
			'name'         => 'quote',
			'label'        => __( 'Quote', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-text.is-style-quote {
					border-left: 4px solid var( --wp--preset--color--primary, #0D1B2A );
					padding-left: 1.25em;
					font-style: italic;
					color: var( --wp--preset--color--text-muted, #6B6B6B );
				}
			',
		)
	);

	// Caption — small uppercase label, muted colour, tracked letters.
	register_block_style(
		'sgs/text',
		array(
			'name'         => 'caption',
			'label'        => __( 'Caption', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-text.is-style-caption {
					font-size: 0.8125em;
					letter-spacing: 0.04em;
					color: var( --wp--preset--color--text-muted, #6B6B6B );
					text-transform: uppercase;
				}
			',
		)
	);

	// Lead — larger introductory paragraph, slightly lighter weight.
	register_block_style(
		'sgs/text',
		array(
			'name'         => 'lead',
			'label'        => __( 'Lead', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-text.is-style-lead {
					font-size: 1.2em;
					line-height: 1.7;
					font-weight: 300;
					color: var( --wp--preset--color--text-secondary, #4A4A4A );
				}
			',
		)
	);
}

add_action( 'init', __NAMESPACE__ . '\\sgs_register_text_styles' );
