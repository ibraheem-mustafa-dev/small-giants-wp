<?php
/**
 * Server-side render for the SGS Social Icons block.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';

$icons        = $attributes['icons'] ?? array();
$icon_size    = (int) ( $attributes['iconSize'] ?? 24 );
$icon_colour  = $attributes['iconColour'] ?? 'text-muted';
$hover_colour = $attributes['hoverColour'] ?? 'primary';
$style_type   = $attributes['style'] ?? 'plain';
$gap          = $attributes['gap'] ?? '20';

$platform_icons = array(
	'facebook'  => 'facebook',
	'twitter'   => 'twitter',
	'linkedin'  => 'linkedin',
	'instagram' => 'instagram',
	'youtube'   => 'youtube',
	'tiktok'    => 'music',
	'github'    => 'github',
	'whatsapp'  => 'message-circle',
	'email'     => 'mail',
	'website'   => 'globe',
	'pinterest' => 'pin',
	'snapchat'  => 'ghost',
	'telegram'  => 'send',
	'discord'   => 'message-square',
);

$platform_labels = array(
	'facebook'  => 'Facebook',
	'twitter'   => 'X (Twitter)',
	'linkedin'  => 'LinkedIn',
	'instagram' => 'Instagram',
	'youtube'   => 'YouTube',
	'tiktok'    => 'TikTok',
	'github'    => 'GitHub',
	'whatsapp'  => 'WhatsApp',
	'email'     => 'Email',
	'website'   => 'Website',
	'pinterest' => 'Pinterest',
	'snapchat'  => 'Snapchat',
	'telegram'  => 'Telegram',
	'discord'   => 'Discord',
);

$classes = array(
	'sgs-social-icons',
	'sgs-social-icons--' . esc_attr( $style_type ),
);

$inline_styles = array(
	'gap:var(--wp--preset--spacing--' . esc_attr( $gap ) . ')',
	'--sgs-social-colour:' . sgs_colour_value( $icon_colour ),
	'--sgs-social-hover:' . sgs_colour_value( $hover_colour ),
);

$wrapper_attributes = get_block_wrapper_attributes( array(
	'class' => implode( ' ', $classes ),
	'style' => implode( ';', $inline_styles ),
) );

if ( empty( $icons ) ) {
	return;
}

$items_html = '';
foreach ( $icons as $icon_item ) {
	if ( empty( $icon_item['url'] ) ) continue;
	$platform   = $icon_item['platform'] ?? 'website';
	$label      = $platform_labels[ $platform ] ?? ucfirst( $platform );
	$icon_name  = $platform_icons[ $platform ] ?? 'link';
	$href       = 'email' === $platform ? 'mailto:' . esc_attr( $icon_item['url'] ) : esc_url( $icon_item['url'] );
	$icon_svg   = sgs_get_lucide_icon( $icon_name );

	$items_html .= sprintf(
		'<a href="%s" class="sgs-social-icons__item" target="_blank" rel="noopener noreferrer" aria-label="%s" style="width:%dpx;height:%dpx">%s</a>',
		$href,
		esc_attr( $label ),
		$icon_size + ( 'plain' === $style_type ? 0 : 16 ),
		$icon_size + ( 'plain' === $style_type ? 0 : 16 ),
		$icon_svg
	);
}

printf( '<div %s>%s</div>', $wrapper_attributes, $items_html );
