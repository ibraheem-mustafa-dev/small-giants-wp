<?php
/**
 * Google Reviews — star rating SVG helper (sgs_render_stars_svg).
 *
 * Function file, loaded once with require_once from render.php; the function is
 * declared inside a function_exists() guard.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// ───────────────────────────────────────────────────────────────────────────
// Star rendering helper (inline — shared helper not yet shipped).
// ───────────────────────────────────────────────────────────────────────────

if ( ! function_exists( 'sgs_render_stars_svg' ) ) {
	/**
	 * Render SVG star rating.
	 *
	 * TODO: Replace with sgs_render_stars() from includes/render-helpers.php
	 * once Agent P ships the shared helper — this inline version can then be removed.
	 *
	 * Uses Lucide-compatible 5-point star SVG paths.
	 * Full stars are solid; half stars use a clip-path split; empty stars are outline only.
	 *
	 * @param float  $star_rating        Rating value (0-5).
	 * @param string $fill_gradient_defs Optional `<defs>…</defs>` markup for a
	 *                                    star-fill gradient (D636/D644 rollout,
	 *                                    from sgs_svg_stroke_gradient(...,'fill')).
	 *                                    Injected into the FIRST rendered star
	 *                                    SVG only (per call, and only once per
	 *                                    unique defs string across all calls in
	 *                                    this request) — `url(#id)` resolves
	 *                                    document-wide, so a single `<defs>`
	 *                                    paints every repeated star instance via
	 *                                    the block's own scoped CSS rule; a
	 *                                    duplicate `id` per block instance is
	 *                                    avoided by tracking already-injected
	 *                                    defs strings in a static map that
	 *                                    persists across every call this
	 *                                    function makes on the page.
	 * @param string $extra_class        Optional extra class on the star run (the header run passes
	 *                                    `sgs-google-reviews__aggregate-stars`).
	 * @return string HTML for star rating.
	 */
	function sgs_render_stars_svg( float $star_rating, string $fill_gradient_defs = '', string $extra_class = '' ): string {
		static $gradient_defs_emitted = array();

		$star_rating = max( 0.0, min( 5.0, $star_rating ) );
		$full_stars  = (int) floor( $star_rating );
		// The partial star is filled to the exact fraction (4.7 fills the fifth star to 70%), as Google draws it;
		// a sliver under 5% is not drawn.
		$fraction    = round( $star_rating - $full_stars, 2 );
		$half_star   = $fraction >= 0.05 ? 1 : 0;
		$empty_stars = 5 - $full_stars - $half_star;

		// SVG star path — standard 5-point polygon, 24×24 viewBox.
		$star_path = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

		$label = esc_attr(
			sprintf(
				/* translators: %s: rating number */
				__( '%s out of 5 stars', 'sgs-blocks' ),
				number_format( $star_rating, 1 )
			)
		);

		$html = '<div class="sgs-google-reviews__stars' . ( '' !== $extra_class ? ' ' . esc_attr( $extra_class ) : '' ) . '" role="img" aria-label="' . $label . '">';
		$uid  = wp_unique_id( 'star-half-' );

		// Consume the gradient defs on the first full/half star this call
		// renders, but only once EVER per unique defs string (guards against
		// a duplicate `id` when this function is called repeatedly — once for
		// the aggregate rating, once per individual review).
		$defs_to_inject = '';
		if ( '' !== $fill_gradient_defs && ! isset( $gradient_defs_emitted[ $fill_gradient_defs ] ) ) {
			$defs_to_inject                               = $fill_gradient_defs;
			$gradient_defs_emitted[ $fill_gradient_defs ] = true;
		}

		for ( $i = 0; $i < $full_stars; $i++ ) {
			$star_svg = '<svg class="sgs-google-reviews__star sgs-google-reviews__star--full" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="' . $star_path . '"/></svg>';
			if ( '' !== $defs_to_inject ) {
				$star_svg       = sgs_svg_inject_defs( $star_svg, $defs_to_inject );
				$defs_to_inject = '';
			}
			$html .= $star_svg;
		}

		if ( $half_star ) {
			// Partial star: the filled part is clipped to the fraction's share of the 24-unit width.
			$fill_width = (string) round( 24 * $fraction, 2 );
			$half_svg   = '<svg class="sgs-google-reviews__star sgs-google-reviews__star--half" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">';
			$half_svg  .= '<defs><clipPath id="' . esc_attr( $uid ) . '"><rect x="0" y="0" width="' . esc_attr( $fill_width ) . '" height="24"/></clipPath></defs>';
			$half_svg  .= '<path class="sgs-google-reviews__star-outline" d="' . $star_path . '"/>';
			$half_svg  .= '<path class="sgs-google-reviews__star-fill" d="' . $star_path . '" clip-path="url(#' . esc_attr( $uid ) . ')"/>';
			$half_svg  .= '</svg>';
			if ( '' !== $defs_to_inject ) {
				$half_svg       = sgs_svg_inject_defs( $half_svg, $defs_to_inject );
				$defs_to_inject = '';
			}
			$html .= $half_svg;
		}

		for ( $i = 0; $i < $empty_stars; $i++ ) {
			$html .= '<svg class="sgs-google-reviews__star sgs-google-reviews__star--empty" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="' . $star_path . '"/></svg>';
		}

		$html .= '</div>';

		return $html;
	}
}
