<?php
/**
 * Server-side render for the SGS Card Grid block.
 *
 * In manual mode:     renders the items array stored in block attributes.
 * In query mode:      fetches posts via WP_Query and maps them to card layout.
 * In wc-product mode: fetches WooCommerce products via Card_Grid_Products and
 *                     renders each as an sgs/product-card in wc-product mode.
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
require_once dirname( __DIR__, 3 ) . '/includes/class-card-grid-products.php';

// CSS length/unit sanitiser — for free-text length values (border width,
// letter-spacing) concatenated into raw CSS declarations inside this block's
// own scoped <style> tag. Strips everything except letters, digits, dot, and
// % so a Contributor-authored malicious value can never break out of the
// declaration into a new CSS rule. Mirrors sgs/hero's proven sanitiser.
$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

// CSS-keyword sanitiser — for free-text attrs concatenated into raw CSS
// declarations (border-style / text-transform / font-weight / font-style) —
// letters + hyphen only.
$sgs_css_keyword = static function ( $value ) {
	return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
};

$source             = $attributes['source'] ?? 'manual';
$variant            = $attributes['variant'] ?? 'card';
$items              = $attributes['items'] ?? array();
$columns            = $attributes['columns'] ?? 3;
$columns_mobile     = $attributes['columnsMobile'] ?? 1;
$columns_tablet     = $attributes['columnsTablet'] ?? 2;
$gap                = $attributes['gap'] ?? '30';
$aspect_ratio       = $attributes['aspectRatio'] ?? '16/10';
$hover_effect       = sanitize_key( $attributes['effectHover'] ?? 'zoom' );
$overlay_style      = $attributes['overlayStyle'] ?? 'gradient';
$title_colour       = $attributes['titleColour'] ?? '';
$subtitle_colour    = $attributes['subtitleColour'] ?? '';
$hover_bg           = $attributes['backgroundColourHover'] ?? '';
$hover_text         = $attributes['textColourHover'] ?? '';
$hover_border       = $attributes['borderColourHover'] ?? '';
$transition_dur     = $attributes['transitionDuration'] ?? '300';
$transition_ease    = $attributes['transitionEasing'] ?? 'ease-in-out';
$hover_scale        = $attributes['scaleHover'] ?? '';
$hover_shadow       = $attributes['shadowHover'] ?? '';
$hover_image_zoom   = ! empty( $attributes['imageZoomHover'] );
$hover_grayscale    = ! empty( $attributes['grayscaleHover'] );
$stagger_delay      = $attributes['staggerDelay'] ?? 0;
$query_post_type    = sanitize_key( $attributes['queryPostType'] ?? 'post' );
$query_per_page     = absint( $attributes['queryPostsPerPage'] ?? 6 );
$query_category     = absint( $attributes['queryCategory'] ?? 0 );

// ── Instance uid — a CLASS (matches the container/hero/quote convention) so
// this grid's WP-native supports + title/subtitle colours can be scoped to
// THIS instance only (multiple grids may sit on one page). Reused across all
// three render paths below (empty state / wc-product grid / manual-query grid)
// so every path shares the identical scoping hook.
$uid      = 'sgs-cg-' . substr( md5( wp_json_encode( $attributes ) . ( $block->parsed_block['attrs']['anchor'] ?? '' ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-card-grid';

// ── WP-native color / border / typography / shadow supports — no-inline
// contract. block.json declares color/typography/spacing/__experimentalBorder/
// shadow ALL with __experimentalSkipSerialization:true, so
// get_block_wrapper_attributes() (called inside SGS_Container_Wrapper::render())
// never auto-inlines them. Read the resolved values from $attributes['style']
// here and emit them into THIS block's OWN scoped <style> (composite caveat —
// do NOT pass these as wrapper `extra_styles`, that path inlines). Base
// spacing (padding/margin) is a separate mechanism the wrapper already
// handles scoped internally — not duplicated here.
$card_grid_native_css = '';
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$cg_style_engine_args = array();

	$cg_color_args = array();
	if ( isset( $attributes['style']['color']['text'] ) && '' !== $attributes['style']['color']['text'] ) {
		$cg_color_args['text'] = (string) $attributes['style']['color']['text'];
	}
	if ( isset( $attributes['style']['color']['background'] ) && '' !== $attributes['style']['color']['background'] ) {
		$cg_color_args['background'] = (string) $attributes['style']['color']['background'];
	}
	if ( isset( $attributes['style']['color']['gradient'] ) && '' !== $attributes['style']['color']['gradient'] ) {
		$cg_color_args['gradient'] = (string) $attributes['style']['color']['gradient'];
	}
	if ( ! empty( $cg_color_args ) ) {
		$cg_style_engine_args['color'] = $cg_color_args;
	}

	$cg_border_args = array();
	if ( isset( $attributes['style']['border']['color'] ) && '' !== $attributes['style']['border']['color'] ) {
		$cg_border_args['color'] = (string) $attributes['style']['border']['color'];
	}
	if ( isset( $attributes['style']['border']['style'] ) && '' !== $attributes['style']['border']['style'] ) {
		$cg_border_args['style'] = $sgs_css_keyword( $attributes['style']['border']['style'] );
	}
	if ( isset( $attributes['style']['border']['width'] ) && '' !== $attributes['style']['border']['width'] ) {
		$cg_border_args['width'] = $sgs_css_length( $attributes['style']['border']['width'] );
	}
	if ( isset( $attributes['style']['border']['radius'] ) ) {
		$cg_radius_raw = $attributes['style']['border']['radius'];
		if ( is_string( $cg_radius_raw ) && '' !== $cg_radius_raw ) {
			$cg_border_args['radius'] = $sgs_css_length( $cg_radius_raw );
		} elseif ( is_array( $cg_radius_raw ) ) {
			$cg_radius_clean = array();
			foreach ( array( 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ) as $cg_corner ) {
				if ( ! empty( $cg_radius_raw[ $cg_corner ] ) ) {
					$cg_radius_clean[ $cg_corner ] = $sgs_css_length( $cg_radius_raw[ $cg_corner ] );
				}
			}
			if ( ! empty( $cg_radius_clean ) ) {
				$cg_border_args['radius'] = $cg_radius_clean;
			}
		}
	}
	if ( ! empty( $cg_border_args ) ) {
		$cg_style_engine_args['border'] = $cg_border_args;
	}

	if ( isset( $attributes['style']['shadow'] ) && '' !== $attributes['style']['shadow'] ) {
		$cg_style_engine_args['shadow'] = (string) $attributes['style']['shadow'];
	}

	if ( ! empty( $cg_style_engine_args ) ) {
		$cg_scoped_styles = wp_style_engine_get_styles(
			$cg_style_engine_args,
			array( 'selector' => $root_sel )
		);
		if ( ! empty( $cg_scoped_styles['css'] ) ) {
			$card_grid_native_css .= $cg_scoped_styles['css'];
		}
	}

	// Typography — block.json selectors.typography targets .sgs-card-grid__title,
	// so scope the native typography rule there (distinct from the per-instance
	// titleFontSize/subtitleFontSize custom-attr mechanism further below).
	$cg_typography_args = array();
	if ( isset( $attributes['style']['typography']['fontSize'] ) && '' !== $attributes['style']['typography']['fontSize'] ) {
		$cg_typography_args['fontSize'] = (string) $attributes['style']['typography']['fontSize'];
	}
	if ( isset( $attributes['style']['typography']['lineHeight'] ) && '' !== $attributes['style']['typography']['lineHeight'] ) {
		$cg_typography_args['lineHeight'] = (string) $attributes['style']['typography']['lineHeight'];
	}
	if ( isset( $attributes['style']['typography']['letterSpacing'] ) && '' !== $attributes['style']['typography']['letterSpacing'] ) {
		$cg_typography_args['letterSpacing'] = $sgs_css_length( $attributes['style']['typography']['letterSpacing'] );
	}
	if ( isset( $attributes['style']['typography']['textTransform'] ) && '' !== $attributes['style']['typography']['textTransform'] ) {
		$cg_typography_args['textTransform'] = $sgs_css_keyword( $attributes['style']['typography']['textTransform'] );
	}
	if ( isset( $attributes['style']['typography']['fontWeight'] ) && '' !== $attributes['style']['typography']['fontWeight'] ) {
		$cg_typography_args['fontWeight'] = $sgs_css_keyword( (string) $attributes['style']['typography']['fontWeight'] );
	}
	if ( isset( $attributes['style']['typography']['fontStyle'] ) && '' !== $attributes['style']['typography']['fontStyle'] ) {
		$cg_typography_args['fontStyle'] = $sgs_css_keyword( $attributes['style']['typography']['fontStyle'] );
	}
	if ( ! empty( $cg_typography_args ) ) {
		$cg_typography_scoped = wp_style_engine_get_styles(
			array( 'typography' => $cg_typography_args ),
			array( 'selector' => $root_sel . ' .sgs-card-grid__title' )
		);
		if ( ! empty( $cg_typography_scoped['css'] ) ) {
			$card_grid_native_css .= $cg_typography_scoped['css'];
		}
	}
	if ( isset( $attributes['style']['typography']['textAlign'] ) && in_array( $attributes['style']['typography']['textAlign'], array( 'left', 'center', 'right' ), true ) ) {
		$card_grid_native_css .= $root_sel . ' .sgs-card-grid__title{text-align:' . $attributes['style']['typography']['textAlign'] . '}';
	}
}

// Skip-serialised `color` support also stops WP auto-adding the standard
// has-*-color / has-*-background-color classes onto the wrapper — re-add them
// manually (mirrors sgs/hero / sgs/quote) so preset palette colours still
// resolve visually.
$card_grid_preset_classes = array();
$cg_preset_text_slug      = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$cg_preset_bg_slug        = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
if ( '' !== $cg_preset_text_slug ) {
	$card_grid_preset_classes[] = 'has-text-color';
	$card_grid_preset_classes[] = 'has-' . $cg_preset_text_slug . '-color';
}
if ( '' !== $cg_preset_bg_slug ) {
	$card_grid_preset_classes[] = 'has-background';
	$card_grid_preset_classes[] = 'has-' . $cg_preset_bg_slug . '-background-color';
}

// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving CSS
// combinators like `>` intact (contract §D — matches SGS_Container_Wrapper +
// sgs/hero). Every value reaching $card_grid_native_css is pre-sanitised
// ($sgs_css_length / $sgs_css_keyword / wp_style_engine_get_styles), so no
// un-sanitised value survives to here.
$card_grid_native_style_tag = $card_grid_native_css ? '<style id="' . esc_attr( $uid ) . '-native">' . wp_strip_all_tags( $card_grid_native_css ) . '</style>' : '';

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

// WC-product mode: render product cards via the dual-mode sgs/product-card.
// Delegates the query entirely to Card_Grid_Products (HPOS-safe, WC-canonical).
if ( 'wc-product' === $source ) {
	$product_ids   = \SGS\Blocks\Card_Grid_Products::get_product_ids( $attributes );
	$empty_message = sanitize_text_field(
		$attributes['productEmptyMessage'] ?? __( 'No products to show at the moment. Check back soon.', 'sgs-blocks' )
	);

	// ── Build shared wrapper props (same CSS vars the other modes use) ───────
	$wc_class_names = array_merge(
		array(
			'sgs-card-grid',
			'sgs-card-grid--card', // Product cards always use card variant.
			'sgs-card-grid--hover-' . esc_attr( $hover_effect ),
			$uid,
		),
		$card_grid_preset_classes
	);
	if ( $hover_scale ) {
		$wc_class_names[] = 'sgs-has-hover-scale';
	}
	if ( $hover_shadow ) {
		$wc_class_names[] = 'sgs-has-hover';
	}
	if ( $stagger_delay ) {
		$wc_class_names[] = 'sgs-has-stagger';
	}

	$gap_value_wc   = sgs_container_gap_value( $gap );
	$wc_style_parts = array(
		'--sgs-card-grid-columns: ' . absint( $columns ),
		'--sgs-card-grid-columns-mobile: ' . absint( $columns_mobile ),
		'--sgs-card-grid-columns-tablet: ' . absint( $columns_tablet ),
		'--sgs-card-grid-gap: ' . $gap_value_wc,
	);
	if ( $hover_bg ) {
		$wc_style_parts[] = '--sgs-hover-bg: var(--wp--preset--color--' . sanitize_key( $hover_bg ) . ')';
	}
	if ( $hover_text ) {
		$wc_style_parts[] = '--sgs-hover-text: var(--wp--preset--color--' . sanitize_key( $hover_text ) . ')';
	}
	if ( $hover_border ) {
		$wc_style_parts[] = '--sgs-hover-border: var(--wp--preset--color--' . sanitize_key( $hover_border ) . ')';
	}
	if ( $transition_dur ) {
		$wc_style_parts[] = '--sgs-transition-duration: ' . absint( $transition_dur ) . 'ms';
	}
	if ( $transition_ease ) {
		$wc_style_parts[] = '--sgs-transition-easing: ' . esc_attr( $transition_ease );
	}
	if ( $hover_scale ) {
		$wc_style_parts[] = '--sgs-hover-scale: ' . esc_attr( $hover_scale );
	}
	if ( $hover_shadow ) {
		$wc_style_parts[] = '--sgs-hover-shadow: var(--wp--preset--shadow--' . sanitize_key( $hover_shadow ) . ')';
	}
	if ( $stagger_delay ) {
		$wc_style_parts[] = '--sgs-stagger: ' . absint( $stagger_delay ) . 'ms';
	}

	$wc_wrapper_opts = array(
		'tag'           => 'div',
		'extra_classes' => $wc_class_names,
		'extra_styles'  => $wc_style_parts,
	);

	// ── Empty state (FR-24-6 reuse) ──────────────────────────────────────────
	if ( empty( $product_ids ) ) {
		ob_start();
		?>
		<div class="sgs-card-grid__empty">
			<p class="sgs-card-grid__empty-message">
				<?php echo esc_html( $empty_message ); ?>
			</p>
		</div>
		<?php
		$empty_html = ob_get_clean();

		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $card_grid_native_style_tag built from pre-sanitised values only (wp_strip_all_tags applied above).
		echo $card_grid_native_style_tag;
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() escapes internally.
		echo SGS_Container_Wrapper::render( $attributes, $block, $empty_html, 'layout', $wc_wrapper_opts );
		return;
	}

	// ── Render each product as sgs/product-card in wc-product mode ──────────
	// Mirror of content-collection render.php §6 — render_block() returns
	// fully-rendered, escaped markup (house pattern file:render.php:242).
	ob_start();
	foreach ( $product_ids as $wc_product_id ) :
		$card_attrs = array(
			'sourceMode' => 'wc-product',
			'productId'  => absint( $wc_product_id ),
			'showLadder' => (bool) ( $attributes['productShowLadder'] ?? false ),
		);
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- render_block() returns fully-rendered, escaped block markup.
		echo render_block(
			array(
				'blockName' => 'sgs/product-card',
				'attrs'     => $card_attrs,
			)
		);
	endforeach;
	$wc_inner_html = ob_get_clean();

	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $card_grid_native_style_tag built from pre-sanitised values only (wp_strip_all_tags applied above).
	echo $card_grid_native_style_tag;
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() escapes internally.
	echo SGS_Container_Wrapper::render( $attributes, $block, $wc_inner_html, 'layout', $wc_wrapper_opts );

	// ItemList JSON-LD is emitted page-level by Product_Item_List
	// (includes/class-product-item-list.php) — single source of truth; no
	// per-grid emission here (prevents double-emission with loose cards).
	return;
}

if ( empty( $items ) ) {
	return '';
}

// Build class list. Reuses the shared $uid computed above (same instance
// scoping hook as the WP-native supports re-emit, wc-product branches).
$sgs_grid_uid = $uid;
$class_names  = array_merge(
	array(
		'sgs-card-grid',
		'sgs-card-grid--' . esc_attr( $variant ),
		'sgs-card-grid--hover-' . esc_attr( $hover_effect ),
		$sgs_grid_uid,
	),
	$card_grid_preset_classes
);

// Title/subtitle font-size (CG-9): block-wide typography via the shared
// TypographyControls attr shape, scoped to this grid instance's uid so
// multiple grids on one page can differ. Only set values are emitted.
$sgs_grid_typo_css  = sgs_typography_css_rule( $attributes, 'title', '.' . $sgs_grid_uid . ' .sgs-card-grid__title' );
$sgs_grid_typo_css .= sgs_typography_css_rule( $attributes, 'subtitle', '.' . $sgs_grid_uid . ' .sgs-card-grid__subtitle' );

// Per-item title/subtitle colour (was inline `style="color:…"` on every
// title/subtitle element — moved to a scoped rule keyed off the same uid so
// no rendered element carries an inline CSS property declaration).
if ( $title_colour ) {
	$sgs_grid_typo_css .= '.' . $sgs_grid_uid . ' .sgs-card-grid__title{color:' . sgs_colour_value( $title_colour ) . '}';
}
if ( $subtitle_colour ) {
	$sgs_grid_typo_css .= '.' . $sgs_grid_uid . ' .sgs-card-grid__subtitle{color:' . sgs_colour_value( $subtitle_colour ) . '}';
}

$sgs_grid_typo_tag = '' !== $sgs_grid_typo_css ? '<style>' . wp_strip_all_tags( $sgs_grid_typo_css ) . '</style>' : '';

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
						<span class="sgs-card-grid__title"><?php echo esc_html( $item['title'] ); ?></span>
					<?php endif; ?>
					<?php if ( ! empty( $item['subtitle'] ) ) : ?>
						<span class="sgs-card-grid__subtitle"><?php echo esc_html( $item['subtitle'] ); ?></span>
					<?php endif; ?>
				</div>
			<?php endif; ?>
		</div>
		<?php if ( 'card' === $variant ) : ?>
			<div class="sgs-card-grid__body">
				<?php if ( ! empty( $item['title'] ) ) : ?>
					<h3 class="sgs-card-grid__title"><?php echo esc_html( $item['title'] ); ?></h3>
				<?php endif; ?>
				<?php if ( ! empty( $item['subtitle'] ) ) : ?>
					<p class="sgs-card-grid__subtitle"><?php echo esc_html( $item['subtitle'] ); ?></p>
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
$inner_html = $card_grid_native_style_tag . $sgs_grid_typo_tag . ob_get_clean();

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
