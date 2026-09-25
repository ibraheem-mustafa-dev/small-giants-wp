<?php
/**
 * Server-side render for sgs/notice-message.
 *
 * U-15 design (`.claude/reports/2026-09-26-u15-notice-message-design.md` §3.1).
 * A single rotating/random message inside sgs/notice-banner. Renders a plain
 * scoped div; the PARENT banner decides whether it is shown static/stacked
 * (no JS, or fewer than two messages) or as one of a rotating/random set.
 *
 * NO-WRAPPER, content-kind, block-private — mirrors sgs/notice-banner's own
 * contract. NO-INLINE (Spec 32): every declaration is scoped through
 * $scoped_css, never a `style="…"` attribute.
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    InnerBlocks HTML.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once __DIR__ . '/helpers.php';

$background_colour          = (string) ( $attributes['backgroundColour'] ?? '' );
$background_colour_gradient = (string) ( $attributes['backgroundColourGradient'] ?? '' );
$text_colour                = (string) ( $attributes['textColour'] ?? '' );
$text_colour_gradient       = (string) ( $attributes['textColourGradient'] ?? '' );

$uid = 'sgs-notice-message-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );

$scoped_css   = array();
$scoped_css[] = sgs_notice_message_bar_css(
	$uid,
	$background_colour,
	$background_colour_gradient,
	$text_colour,
	$text_colour_gradient
);
$scoped_css = array_filter( $scoped_css );

$wrapper_attrs = get_block_wrapper_attributes(
	array(
		'class' => 'sgs-notice-message ' . $uid,
	)
);

?>
<?php if ( $scoped_css ) : ?>
<style>
	<?php
	// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving
	// CSS combinators like `>` and `:has()` intact — same contract as the
	// parent sgs/notice-banner. Every value reaching $scoped_css is
	// pre-sanitised by the colour helpers it was built from.
	echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	?>
</style>
<?php endif; ?>
<?php
echo '<div ' . $wrapper_attrs . ' data-sgs-message>' . $content . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() returns pre-sanitised HTML; $content is WP core InnerBlocks output.
