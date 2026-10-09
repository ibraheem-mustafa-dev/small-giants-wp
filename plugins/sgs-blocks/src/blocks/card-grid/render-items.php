<?php
/**
 * Card Grid - card item loop (emits each card into the output buffer render.php opened).
 *
 * Partial of render.php, included with a plain require so it shares render.php's
 * local scope (required once per block instance).
 *
 * Reads: $items, $variant, $root_sel, $hover_effect, $heading_level, $no_image_label, $image_fallback, $sgs_cg_media_classes, $card_grid_overlay_active and $card_grid_per_item_css.
 * Writes: $card_grid_per_item_css (extended); the echoed card markup goes into the buffer render.php collects as $inner_html.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

foreach ( $items as $index => $item ) :
	$card_grid_item_key      = ! empty( $item['_key'] ) ? (string) $item['_key'] : 'idx-' . absint( $index );
	$card_grid_per_item_css .= sgs_media_position_css(
		array(
			'objectPosition' => $item['focalPoint'] ?? null,
			'objectFit'      => $item['objectFit'] ?? '',
		),
		'',
		$root_sel . ' [data-card-key="' . esc_attr( $card_grid_item_key ) . '"] img, '
			. $root_sel . ' [data-card-key="' . esc_attr( $card_grid_item_key ) . '"] video'
	);
	// Task 2.1) resolved via sgs_link_attributes() — link/linkTarget/linkRel
	// are the existing per-item storage keys, mapped to the shared
	// SgsLinkControl object shape { url, opensInNewTab, rel } at render time.
	$link_attr = sgs_link_attributes(
		array(
			'url'           => $item['link'] ?? '',
			'opensInNewTab' => isset( $item['linkTarget'] ) && '_blank' === $item['linkTarget'],
			'rel'           => $item['linkRel'] ?? '',
		)
	);
	$has_link  = '' !== $link_attr;
	$item_tag  = $has_link ? 'a' : 'div';

	// Unified media slot — sgs_render_media() emits the right tag for either
	// image or video.
	$item_media = $item['media'] ?? null;
	// A BARE URL STRING is a first-class accepted shape. block.json declares
	// `items[].media` as `{"type":"string"}` while edit.js writes the object
	// form, and `sgs_render_media()` bails on anything that is not an array
	// (helpers-media.php:168) — so a string URL would render NOTHING, silently,
	// with an empty `.sgs-card-grid__image-wrap` left behind. Normalising here
	// fixes every caller at once — patterns, and any clone output
	// that emits the documented string shape.
	// `alt` is deliberately '': these cards carry a visible title, so an alt
	// that repeated it would double-announce to a screen reader.
	if ( is_string( $item_media ) ) {
		$item_media = '' !== trim( $item_media )
			? array(
				'url'  => trim( $item_media ),
				'type' => 'image',
				'alt'  => '',
			)
			: null;
	}
	// Per-card decorative toggle (item 18 of the detector-findings backlog,
	// D918/S8 repeater-field naming — the media slot lives inside the `items`
	// array, so the flag does too). Blanking alt AND aria-hiding the wrapper
	// mirrors sgs/timeline's block-level `milestoneMediaDecorative` mechanism
	// so the image (or video) is skipped entirely by assistive tech, per
	// WCAG 2.1 AA 1.1.1. wc-product/cpt-collection modes never reach this
	// loop with client-authored media — `$items` there is the live product
	// query result, not this attribute, so decorative scoping is a no-op for
	// those modes rather than needing a separate exclusion.
	$item_decorative = ! empty( $item['decorative'] );
	if ( $item_decorative && is_array( $item_media ) ) {
		$item_media['alt'] = '';
	}
	$media_html = ! empty( $item_media ) ? sgs_render_media( $item_media, 'sgs/card-grid' ) : '';
	// Media-element atom layer (rule 37-media-no-handroll fix) — append the
	// `.sgs-media-el` marker + per-instance scope class onto the FIRST
	// <img>/<video> tag `sgs_render_media()` returned, so this element inherits
	// the `--sgs-media-object-fit` custom property set on $root_sel above and
	// picks up assets/css/media-atoms/object-fit.css's rule. `sgs_render_media()`
	// has no classes parameter (shared helper, out of this fix's scope), so the
	// class is appended here via a scoped regex rather than editing that helper.
	if ( '' !== $media_html && ! empty( $sgs_cg_media_classes ) ) {
		$media_html = preg_replace(
			'/(<(?:img|video)\b[^>]*\bclass=")/',
			'$1' . esc_attr( implode( ' ', $sgs_cg_media_classes ) ) . ' ',
			$media_html,
			1
		);
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
		|| 'overlay' === $variant || 'overlay-slide' === $hover_effect;
	?>
	<<?php echo esc_attr( $item_tag ); ?> class="sgs-card-grid__item" data-card-key="<?php echo esc_attr( $card_grid_item_key ); ?>"<?php echo $link_attr; ?>>
		<?php if ( $item_needs_wrap ) : ?>
		<div class="<?php echo esc_attr( $image_wrap_class ); ?>"<?php echo $item_decorative ? ' aria-hidden="true"' : ''; ?>>
			<?php if ( '' !== $media_html ) : ?>
				<?php echo $media_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped inside sgs_render_media(). ?>
			<?php endif; ?>
			<?php if ( $item_show_overlay ) : ?>
				<div class="sgs-card-grid__image-overlay" aria-hidden="true"></div>
			<?php endif; ?>
			<?php if ( $item_use_fallback && '' !== $no_image_label ) : ?>
				<span class="sgs-card-grid__no-image-label"><?php echo esc_html( $no_image_label ); ?></span>
			<?php endif; ?>
			<?php if ( '' !== $item_glyph_html && ! $glyph_in_caption ) : ?>
				<?php echo $item_glyph_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped inside sgs_card_grid_glyph_html() via wp_kses(). ?>
			<?php elseif ( '' === $item_glyph_html && $item_use_fallback && ! empty( $item['title'] ) ) : ?>
				<?php echo sgs_card_grid_fallback_initial( $item['title'] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped inside sgs_card_grid_fallback_initial() via esc_html(). ?>
			<?php endif; ?>
			<?php if ( 'overlay' === $variant || 'overlay-slide' === $hover_effect ) : ?>
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
