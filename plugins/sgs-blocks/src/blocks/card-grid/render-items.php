<?php
/**
 * Card Grid - card item loop (emits each card into the output buffer render.php opened).
 *
 * Partial of render.php, included with a plain require so it shares render.php's
 * local scope (required once per block instance).
 *
 * Reads: $items, $card_grid_loop_style, $card_grid_loop_i, $variant, $heading_level, $no_image_label, $image_fallback, $attributes, $columns, $columns_tablet, $columns_mobile, $sgs_cg_media_slot, $sgs_cg_media_scope, $card_grid_overlay_active and $card_grid_per_item_css.
 * Writes: $card_grid_per_item_css (extended); the echoed card markup goes into the buffer render.php collects as $inner_html.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// The card photos' scope class and columns (for `sizes`), and whether the next card prints the block-level media rules (once).
$sgs_cg_media_cols = array(
	'desktop' => $columns,
	'tablet'  => $columns_tablet,
	'mobile'  => $columns_mobile,
);
$sgs_cg_block_rules = true;

foreach ( $items as $index => $item ) :
	$card_grid_item_key = ! empty( $item['_key'] ) ? (string) $item['_key'] : 'idx-' . absint( $index );
	// Task 2.1) resolved via sgs_link_attributes() — link/linkTarget/linkRel
	// are the existing per-item storage keys, mapped to the shared
	// SgsLinkControl object shape { url, opensInNewTab, rel } at render time.
	$link_attr = sgs_link_attributes(
		array(
			'url'           => $item['link'] ?? '',
			'opensInNewTab' => isset( $item['linkTarget'] ) && '_blank' === $item['linkTarget'],
			'rel'           => $item['linkRel'] ?? '',
			'source'        => $item['linkSource'] ?? '',
		)
	);
	$has_link  = '' !== $link_attr;
	$item_tag  = $has_link ? 'a' : 'div';

	// The card's photo goes through the shared media renderer as an item of an item set (fit, focal point, ratio,
	// radius, shape and loading come from its per-card and block-level rules). A decorative card prints an empty alt.
	// The aria-hidden wrapper below mirrors sgs/timeline's decorative-media mechanism so assistive technology skips it.
	$item_decorative = ! empty( $item['decorative'] );
	$item_media      = sgs_card_grid_render_item_media( (array) $item, (int) $index, $attributes, $sgs_cg_media_slot, $sgs_cg_media_scope, $sgs_cg_media_cols, $sgs_cg_block_rules );
	$media_html      = $item_media['html'];
	if ( '' !== $media_html ) {
		$sgs_cg_block_rules      = false;
		$card_grid_per_item_css .= $item_media['css'];
	}
	// Per-item glyph icon ("Shop by shape") — shown OVER the
	// photo when there is one, or inside the image-fallback tile when
	// there isn't. An unknown/missing slug renders nothing (never a broken
	// icon). `imageFallback` gates the fallback tile itself (default off —
	// existing sites render an unchanged empty box).
	// `glyphImage` (wave B round 2) — an uploaded image in the SAME slot —
	// wins over the Lucide slug when both are set; the Lucide path only
	// runs when there is no usable glyphImage.
	$item_glyph_image = ( isset( $item['glyphImage'] ) && is_array( $item['glyphImage'] ) && ! empty( $item['glyphImage']['url'] ) )
		? $item['glyphImage']
		: null;
	if ( null !== $item_glyph_image ) {
		$item_glyph_html = sgs_card_grid_glyph_image_html( $item_glyph_image );
	} else {
		$item_glyph_slug = isset( $item['glyph'] ) ? sanitize_key( (string) $item['glyph'] ) : '';
		$item_glyph_html = sgs_card_grid_glyph_html( $item_glyph_slug );
	}
	$item_has_media    = '' !== $media_html;
	$item_use_fallback = $image_fallback && ! $item_has_media;
	$image_wrap_class  = 'sgs-card-grid__image-wrap' . ( $item_use_fallback ? ' sgs-card-grid__image-wrap--fallback' : '' );
	// Image overlay (wave B round 2) — only over a real photo, never the flat
	// image-fallback tile, matching the design's own
	// `s.hasImg` gate. Rendered BEFORE the glyph/title markup below so it
	// sits behind them (DOM order = paint order for these
	// position:absolute siblings — same technique as the existing
	// `.sgs-card-grid__overlay` text layer further down).
	$item_show_overlay = $card_grid_overlay_active && $item_has_media;
	// In the overlay variant the glyph belongs to the caption, above the title,
	// instead of being pinned to the bottom of the image where the caption sits.
	$glyph_in_caption = ( 'overlay' === $variant );
	// A text-only card (no photo, no fallback tile, no glyph, and a variant whose
	// title sits below rather than over the image) has nothing to put in the image
	// area, so it renders none: an empty wrap still took the aspect-ratio height.
	$item_needs_wrap = $item_has_media || $item_use_fallback || '' !== $item_glyph_html
		|| 'overlay' === $variant;
	?>
	<<?php echo esc_attr( $item_tag ); ?> class="sgs-card-grid__item" data-card-key="<?php echo esc_attr( $card_grid_item_key ); ?>"<?php echo null !== $card_grid_loop_style ? \SGS\Blocks\Motion\Sgs_Motion_Loop_Delays::item_attr( $card_grid_loop_i++ ) : ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- ` data-sgs-loop-i="<int>"`. ?><?php echo $link_attr; ?>>
		<?php if ( $item_needs_wrap ) : ?>
		<div class="<?php echo esc_attr( $image_wrap_class ); ?>"<?php echo $item_decorative ? ' aria-hidden="true"' : ''; ?>>
			<?php if ( '' !== $media_html ) : ?>
				<?php echo $media_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped inside sgs_render_media(). ?>
			<?php endif; ?>
			<?php if ( $item_show_overlay ) : ?>
				<div class="sgs-card-grid__image-overlay" aria-hidden="true"></div>
			<?php endif; ?>
			<?php if ( $item_use_fallback && '' !== $no_image_label ) : ?>
				<span class="sgs-card-grid__no-image-label"><?php echo sgs_rich_text_kses( $no_image_label, false ); ?></span>
			<?php endif; ?>
			<?php if ( '' !== $item_glyph_html && ! $glyph_in_caption ) : ?>
				<?php echo $item_glyph_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped inside sgs_card_grid_glyph_html() via wp_kses(). ?>
			<?php elseif ( '' === $item_glyph_html && $item_use_fallback && ! empty( $item['title'] ) ) : ?>
				<?php echo sgs_card_grid_fallback_initial( $item['title'] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped inside sgs_card_grid_fallback_initial() via esc_html(). ?>
			<?php endif; ?>
			<?php if ( 'overlay' === $variant ) : ?>
				<div class="sgs-card-grid__overlay">
					<?php if ( '' !== $item_glyph_html && $glyph_in_caption ) : ?>
						<?php echo $item_glyph_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped inside the glyph helpers via wp_kses()/esc_url(). ?>
					<?php endif; ?>
					<?php if ( ! empty( $item['title'] ) ) : ?>
						<span class="sgs-card-grid__title"><?php echo esc_html( $item['title'] ); ?></span>
					<?php endif; ?>
					<?php if ( ! empty( $item['subtitle'] ) ) : ?>
						<span class="sgs-card-grid__subtitle"><?php echo esc_html( $item['subtitle'] ); ?></span>
					<?php endif; ?>
				</div>
			<?php endif; ?>
		</div>
		<?php endif; ?>
		<?php if ( 'card' === $variant ) : ?>
			<div class="sgs-card-grid__body">
				<?php if ( ! empty( $item['title'] ) ) : ?>
					<<?php echo esc_attr( $heading_level ); ?> class="sgs-card-grid__title"><?php echo esc_html( $item['title'] ); ?></<?php echo esc_attr( $heading_level ); ?>>
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
	<?php
endforeach;
