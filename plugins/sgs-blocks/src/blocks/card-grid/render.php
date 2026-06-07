<?php
/**
 * Server-side render for the SGS Card Grid block.
 *
 * In manual mode: renders the items array stored in block attributes.
 * In query mode: fetches posts via WP_Query and maps them to card layout.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — block is fully dynamic).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

$source             = $attributes['source'] ?? 'manual';
$variant            = $attributes['variant'] ?? 'card';
$items              = $attributes['items'] ?? array();
$columns            = $attributes['columns'] ?? 3;
$columns_mobile     = $attributes['columnsMobile'] ?? 1;
$columns_tablet     = $attributes['columnsTablet'] ?? 2;
$gap                = $attributes['gap'] ?? '30';
$aspect_ratio       = $attributes['aspectRatio'] ?? '16/10';
$hover_effect       = $attributes['hoverEffect'] ?? 'zoom';
$overlay_style      = $attributes['overlayStyle'] ?? 'gradient';
$title_colour       = $attributes['titleColour'] ?? '';
$subtitle_colour    = $attributes['subtitleColour'] ?? '';
$hover_bg           = $attributes['hoverBackgroundColour'] ?? '';
$hover_text         = $attributes['hoverTextColour'] ?? '';
$hover_border       = $attributes['hoverBorderColour'] ?? '';
$transition_dur     = $attributes['transitionDuration'] ?? '300';
$transition_ease    = $attributes['transitionEasing'] ?? 'ease-in-out';
$hover_scale        = $attributes['hoverScale'] ?? '';
$hover_shadow       = $attributes['hoverShadow'] ?? '';
$hover_image_zoom   = ! empty( $attributes['hoverImageZoom'] );
$hover_grayscale    = ! empty( $attributes['hoverGrayscale'] );
$stagger_delay      = $attributes['staggerDelay'] ?? 0;
$query_post_type    = sanitize_key( $attributes['queryPostType'] ?? 'post' );
$query_per_page     = absint( $attributes['queryPostsPerPage'] ?? 6 );
$query_category     = absint( $attributes['queryCategory'] ?? 0 );

// Query mode: fetch posts and map to card data.
if ( 'query' === $source ) {
	$query_args = array(
		'post_type'      => $query_post_type,
		'posts_per_page' => $query_per_page,
		'post_status'    => 'publish',
		'no_found_rows'  => true,
	);

	if ( $query_category > 0 ) {
		$query_args['cat'] = $query_category;
	}

	$grid_query   = new WP_Query( $query_args );
	$query_items  = array();

	foreach ( $grid_query->posts as $grid_post ) {
		$thumb_id  = get_post_thumbnail_id( $grid_post->ID );
		$thumb_url = $thumb_id ? wp_get_attachment_image_url( $thumb_id, 'large' ) : '';
		$thumb_alt = $thumb_id ? (string) get_post_meta( $thumb_id, '_wp_attachment_image_alt', true ) : '';

		$query_items[] = array(
			'title'    => get_the_title( $grid_post ),
			'subtitle' => wp_trim_words( get_the_excerpt( $grid_post ), 15, '…' ),
			'link'     => get_permalink( $grid_post ),
			'image'    => $thumb_url ? array(
				'url' => $thumb_url,
				'alt' => $thumb_alt,
			) : null,
			'badge'    => '',
		);
	}

	$items = $query_items;
	wp_reset_postdata();
}

if ( empty( $items ) ) {
	return '';
}

// Build class list.
$class_names = array(
	'sgs-card-grid',
	'sgs-card-grid--' . esc_attr( $variant ),
	'sgs-card-grid--hover-' . esc_attr( $hover_effect ),
);

if ( $hover_scale ) {
	$class_names[] = 'sgs-has-hover-scale';
}
if ( $hover_shadow ) {
	$class_names[] = 'sgs-has-hover';
}
if ( $hover_image_zoom ) {
	$class_names[] = 'sgs-has-img-zoom';
}
if ( $hover_grayscale ) {
	$class_names[] = 'sgs-has-grayscale';
}
if ( $stagger_delay ) {
	$class_names[] = 'sgs-has-stagger';
}

// Resolve gap via the shared helper — handles both preset slugs ("30" →
// var(--wp--preset--spacing--30)) and raw CSS lengths ("16px" → "16px").
// Back-compat: the old SelectControl only wrote bare numeric slugs, so
// existing posts are covered by the slug branch. New posts written via the
// shared ContainerWrapperControls SpacingControl may be raw lengths.
$gap_value = sgs_container_gap_value( $gap );

// Build grid CSS custom properties.
$grid_style_parts = array(
	'--sgs-card-grid-columns: ' . absint( $columns ),
	'--sgs-card-grid-columns-mobile: ' . absint( $columns_mobile ),
	'--sgs-card-grid-columns-tablet: ' . absint( $columns_tablet ),
	'--sgs-card-grid-gap: ' . $gap_value,
	'--sgs-card-grid-aspect: ' . esc_attr( $aspect_ratio ),
);

if ( $hover_bg ) {
	$grid_style_parts[] = '--sgs-hover-bg: var(--wp--preset--color--' . sanitize_key( $hover_bg ) . ')';
}
if ( $hover_text ) {
	$grid_style_parts[] = '--sgs-hover-text: var(--wp--preset--color--' . sanitize_key( $hover_text ) . ')';
}
if ( $hover_border ) {
	$grid_style_parts[] = '--sgs-hover-border: var(--wp--preset--color--' . sanitize_key( $hover_border ) . ')';
}
if ( $transition_dur ) {
	$grid_style_parts[] = '--sgs-transition-duration: ' . absint( $transition_dur ) . 'ms';
}
if ( $transition_ease ) {
	$grid_style_parts[] = '--sgs-transition-easing: ' . esc_attr( $transition_ease );
}
if ( $hover_scale ) {
	$grid_style_parts[] = '--sgs-hover-scale: ' . esc_attr( $hover_scale );
}
if ( $hover_shadow ) {
	$grid_style_parts[] = '--sgs-hover-shadow: var(--wp--preset--shadow--' . sanitize_key( $hover_shadow ) . ')';
}
if ( $stagger_delay ) {
	$grid_style_parts[] = '--sgs-stagger: ' . absint( $stagger_delay ) . 'ms';
}

$title_style    = $title_colour ? ' style="color:var(--wp--preset--color--' . sanitize_key( $title_colour ) . ')"' : '';
$subtitle_style = $subtitle_colour ? ' style="color:var(--wp--preset--color--' . sanitize_key( $subtitle_colour ) . ')"' : '';

// Build the interior HTML (card items).
ob_start();
foreach ( $items as $index => $item ) :
	$has_link   = ! empty( $item['link'] );
	$item_tag   = $has_link ? 'a' : 'div';
	$link_attr  = $has_link ? ' href="' . esc_url( $item['link'] ) . '"' : '';
	$item_style = $stagger_delay ? ' style="--sgs-item-index:' . absint( $index ) . '"' : '';

	// Unified media slot (added 2026-05-05). When only the legacy
	// $item['image'] is set, synthesise a media object so the shared
	// sgs_render_media() helper can emit the right tag for video too.
	$item_media = $item['media'] ?? null;
	if ( empty( $item_media ) && ! empty( $item['image']['url'] ) ) {
		$item_media = array(
			'url'  => $item['image']['url'],
			'type' => 'image',
			'id'   => isset( $item['image']['id'] ) ? absint( $item['image']['id'] ) : 0,
			'alt'  => isset( $item['image']['alt'] ) ? (string) $item['image']['alt'] : '',
			'mime' => 'image/jpeg',
		);
	}
	$media_html = ! empty( $item_media ) ? sgs_render_media( $item_media, 'sgs/card-grid' ) : '';
	?>
	<<?php echo esc_attr( $item_tag ); ?> class="sgs-card-grid__item"<?php echo $link_attr; ?><?php echo $item_style; ?>>
		<div class="sgs-card-grid__image-wrap">
			<?php if ( '' !== $media_html ) : ?>
				<?php echo $media_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped inside sgs_render_media(). ?>
			<?php elseif ( ! empty( $item['image']['url'] ) ) : ?>
				<img
					src="<?php echo esc_url( $item['image']['url'] ); ?>"
					alt="<?php echo esc_attr( $item['image']['alt'] ?? '' ); ?>"
					class="sgs-card-grid__image"
					loading="lazy"
				/>
			<?php endif; ?>
			<?php if ( 'overlay' === $variant || 'overlay-slide' === $hover_effect ) : ?>
				<div class="sgs-card-grid__overlay">
					<?php if ( ! empty( $item['title'] ) ) : ?>
						<span class="sgs-card-grid__title"<?php echo $title_style; ?>><?php echo esc_html( $item['title'] ); ?></span>
					<?php endif; ?>
					<?php if ( ! empty( $item['subtitle'] ) ) : ?>
						<span class="sgs-card-grid__subtitle"<?php echo $subtitle_style; ?>><?php echo esc_html( $item['subtitle'] ); ?></span>
					<?php endif; ?>
				</div>
			<?php endif; ?>
		</div>
		<?php if ( 'card' === $variant ) : ?>
			<div class="sgs-card-grid__body">
				<?php if ( ! empty( $item['title'] ) ) : ?>
					<h3 class="sgs-card-grid__title"<?php echo $title_style; ?>><?php echo esc_html( $item['title'] ); ?></h3>
				<?php endif; ?>
				<?php if ( ! empty( $item['subtitle'] ) ) : ?>
					<p class="sgs-card-grid__subtitle"<?php echo $subtitle_style; ?>><?php echo esc_html( $item['subtitle'] ); ?></p>
				<?php endif; ?>
				<?php if ( ! empty( $item['badge'] ) && ! empty( $item['badgeVariant'] ) ) : ?>
					<span class="sgs-card-grid__badge sgs-card-grid__badge--<?php echo esc_attr( $item['badgeVariant'] ); ?>">
						<?php echo esc_html( $item['badge'] ); ?>
					</span>
				<?php endif; ?>
			</div>
		<?php endif; ?>
	</<?php echo esc_attr( $item_tag ); ?>>
<?php endforeach;
$inner_html = ob_get_clean();

echo SGS_Container_Wrapper::render( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() escapes internally.
	$attributes,
	$block,
	$inner_html,
	'layout',
	array(
		'tag'           => 'div',
		'extra_classes' => $class_names,
		'extra_styles'  => $grid_style_parts,
	)
);
