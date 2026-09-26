<?php
/**
 * Showcase layout helpers for sgs/choice-flow (Spec 43 FR-43-24, v1.8.0).
 *
 * Holds markup and CSS that `choice-flow/render.php`,
 * `choice-flow-question/render.php` and `choice-flow-summary.php` need but
 * can't build inline — those files sit at or near this codebase's 300-line
 * cap. `function_exists()` guards match every other render helper in this
 * plugin (safe against the file loading more than once per request).
 *
 * NO-INLINE (Spec 32): colours reach the stylesheet as custom-property
 * values in the flow's own scoped `<style>`, never as `style="…"`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_choice_flow_question_intro_html' ) ) {
	/**
	 * The question's optional intro paragraph, shown under the title in both
	 * the `compact` and `showcase` layouts (style.css caps its width only in
	 * `showcase`). Empty attribute renders nothing — no empty `<p>`.
	 *
	 * @param array $attributes This block's own attributes.
	 * @return string Escaped HTML, or '' when unset.
	 */
	function sgs_choice_flow_question_intro_html( array $attributes ): string {
		$intro = isset( $attributes['intro'] ) ? trim( (string) $attributes['intro'] ) : '';
		if ( '' === $intro ) {
			return '';
		}
		return '<p class="sgs-choice-flow-question__intro">' . esc_html( $intro ) . '</p>';
	}
}

if ( ! function_exists( 'sgs_choice_flow_question_data_attrs' ) ) {
	/**
	 * The question wrapper's data attributes the flow's scripts read:
	 * `data-eyebrow` (replaces "Question N of M" and leaves this question out
	 * of the count), `data-summary-label` (the stage line's label for an
	 * unpriced answer) and `data-price-prefix` (a starting price).
	 *
	 * @param array $attributes The question block's attributes.
	 * @return array<string,string> Attribute name => raw value (escaped by get_block_wrapper_attributes()).
	 */
	function sgs_choice_flow_question_data_attrs( array $attributes ): array {
		$out = array();
		foreach ( array(
			'eyebrow'      => 'data-eyebrow',
			'summaryLabel' => 'data-summary-label',
		) as $key => $data ) {
			$value = isset( $attributes[ $key ] ) ? trim( (string) $attributes[ $key ] ) : '';
			if ( '' !== $value ) {
				$out[ $data ] = $value;
			}
		}
		// A starting price ('from') reads as a plain amount on the stage line too.
		if ( isset( $attributes['pricePrefix'] ) && 'from' === $attributes['pricePrefix'] ) {
			$out['data-price-prefix'] = 'from';
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_choice_flow_option_data_attrs' ) ) {
	/**
	 * One option button's extra data attributes: `data-summary-text` (the
	 * stage line's wording for this answer, e.g. "Sending it later") and
	 * `data-stage-effect` (a named photo treatment the stage applies while
	 * this option is chosen — see style.css's `--effect-*` rules).
	 *
	 * @param array $option A stored option row.
	 * @return string Escaped attribute markup with a leading space, or ''.
	 */
	function sgs_choice_flow_option_data_attrs( array $option ): string {
		$out     = '';
		$summary = isset( $option['summaryText'] ) ? trim( (string) $option['summaryText'] ) : '';
		if ( '' !== $summary ) {
			$out .= ' data-summary-text="' . esc_attr( $summary ) . '"';
		}
		$effect = isset( $option['stageEffect'] ) ? (string) $option['stageEffect'] : '';
		if ( in_array( $effect, array( 'dim', 'deepen', 'soften', 'brighten' ), true ) ) {
			$out .= ' data-stage-effect="' . esc_attr( $effect ) . '"';
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_choice_flow_showcase_css' ) ) {
	/**
	 * The flow's scoped colour and logo-size values, consumed by style.css:
	 * `--sgs-choice-flow-stage` (stage and chosen card), the help note's
	 * `--sgs-choice-flow-note-icon` / `-note-border` / `-note-hover`, and
	 * `--sgs-choice-flow-logo-height`. Each colour resolves a token slug or
	 * passes a raw colour through (`sgs_colour_value()`).
	 *
	 * @param array  $attributes Root block attributes.
	 * @param string $root_sel   The instance's scoped root selector.
	 * @return string One scoped rule, or '' when nothing is set.
	 */
	function sgs_choice_flow_showcase_css( array $attributes, string $root_sel ): string {
		$decls  = array();
		$colour = array(
			'stageColour'           => '--sgs-choice-flow-stage',
			'stageNoteIconColour'   => '--sgs-choice-flow-note-icon',
			'stageNoteBorderColour' => '--sgs-choice-flow-note-border',
			'stageNoteHoverColour'  => '--sgs-choice-flow-note-hover',
		);
		foreach ( $colour as $key => $property ) {
			$raw      = isset( $attributes[ $key ] ) ? (string) $attributes[ $key ] : '';
			$resolved = '' !== $raw && function_exists( 'sgs_colour_value' ) ? sgs_colour_value( $raw ) : '';
			if ( '' !== $resolved ) {
				$decls[] = "{$property}:{$resolved}";
			}
		}
		$logo_height = isset( $attributes['headerLogoHeight'] ) ? (int) $attributes['headerLogoHeight'] : 32;
		if ( 32 !== $logo_height && $logo_height >= 12 && $logo_height <= 80 ) {
			$decls[] = "--sgs-choice-flow-logo-height:{$logo_height}px";
		}
		return $decls ? $root_sel . '{' . implode( ';', $decls ) . ';}' : '';
	}
}

if ( ! function_exists( 'sgs_choice_flow_product_details' ) ) {
	/**
	 * What the stage names beside the product: its brand (WooCommerce's own
	 * `product_brand` taxonomy) and, per variation-forming attribute, the
	 * attribute's label and each term's display name — so the stage can read
	 * the page buybox's chosen slugs ("ivory", "56-17-140") as "Ivory" and
	 * "Frame size 56".
	 *
	 * @param int $product_id The flow's resolved product (0 = none).
	 * @return array{brand:string,axes:array<string,array{label:string,terms:array<string,string>}>}
	 */
	function sgs_choice_flow_product_details( int $product_id ): array {
		$details = array(
			'brand' => '',
			'axes'  => array(),
		);
		if ( $product_id <= 0 || ! function_exists( 'wc_get_product' ) ) {
			return $details;
		}
		$product = wc_get_product( $product_id );
		if ( ! $product ) {
			return $details;
		}
		if ( taxonomy_exists( 'product_brand' ) ) {
			$brands = wp_get_post_terms( $product_id, 'product_brand', array( 'fields' => 'names' ) );
			if ( is_array( $brands ) && ! empty( $brands ) ) {
				$details['brand'] = html_entity_decode( (string) $brands[0], ENT_QUOTES, 'UTF-8' );
			}
		}
		foreach ( $product->get_attributes() as $taxonomy => $attribute ) {
			if ( ! $attribute instanceof \WC_Product_Attribute || ! $attribute->get_variation() || ! $attribute->is_taxonomy() ) {
				continue;
			}
			$terms = array();
			foreach ( $attribute->get_terms() as $term ) {
				$terms[ $term->slug ] = html_entity_decode( $term->name, ENT_QUOTES, 'UTF-8' );
			}
			$details['axes'][ $taxonomy ] = array(
				'label' => wc_attribute_label( $taxonomy ),
				'terms' => $terms,
			);
		}
		return $details;
	}
}

if ( ! function_exists( 'sgs_choice_flow_stage_note_html' ) ) {
	/**
	 * The stage's optional help note (`stageNote`, `stageNoteLink`). With a
	 * link the whole note is the link: an optional round icon badge
	 * (`stageNoteIcon`), then the note as a title line and the link text as
	 * the line under it. Rendered twice in showcase — in the stage aside
	 * (wide containers) and at the end of the step pane (narrow ones, where
	 * the aside is a slim row); style.css shows one or the other.
	 *
	 * @param array  $attributes Root block attributes.
	 * @param string $placement  'stage' or 'pane' (a modifier class).
	 * @return string Escaped HTML, or '' when `stageNote` is empty.
	 */
	function sgs_choice_flow_stage_note_html( array $attributes, string $placement = 'stage' ): string {
		$note = isset( $attributes['stageNote'] ) ? trim( (string) $attributes['stageNote'] ) : '';
		if ( '' === $note ) {
			return '';
		}
		$link      = isset( $attributes['stageNoteLink'] ) && is_array( $attributes['stageNoteLink'] ) ? $attributes['stageNoteLink'] : array();
		$url       = isset( $link['url'] ) ? (string) $link['url'] : '';
		$link_text = isset( $link['text'] ) ? (string) $link['text'] : '';
		$icon      = isset( $attributes['stageNoteIcon'] ) ? (string) $attributes['stageNoteIcon'] : 'none';
		$class     = 'sgs-choice-flow__summary-note sgs-choice-flow__summary-note--' . ( 'pane' === $placement ? 'pane' : 'stage' );

		$icon_svg = '';
		if ( 'whatsapp' === $icon && function_exists( 'sgs_whatsapp_glyph_svg' ) ) {
			$icon_svg = sgs_whatsapp_glyph_svg( 'sgs-choice-flow__summary-note-glyph', 18 );
		} elseif ( in_array( $icon, array( 'phone', 'email', 'chat' ), true ) && function_exists( 'sgs_get_lucide_icon' ) ) {
			$icon_svg = (string) sgs_get_lucide_icon(
				array(
					'phone' => 'phone',
					'email' => 'mail',
					'chat'  => 'message-circle',
				)[ $icon ]
			);
		}
		$badge = '' !== $icon_svg ? '<span class="sgs-choice-flow__summary-note-icon" aria-hidden="true">' . $icon_svg . '</span>' : '';

		if ( '' === $url ) {
			$class .= '' !== $badge ? ' sgs-choice-flow__summary-note--has-icon' : '';
			return '<p class="' . esc_attr( $class ) . '">' . $badge . '<span class="sgs-choice-flow__summary-note-text">' . esc_html( $note ) . '</span></p>';
		}

		$class      .= ' sgs-choice-flow__summary-note--link' . ( '' !== $badge ? ' sgs-choice-flow__summary-note--has-icon' : '' );
		$is_external = 0 === strpos( $url, 'http' ) && false === strpos( $url, (string) wp_parse_url( home_url(), PHP_URL_HOST ) );
		$out         = '<a class="' . esc_attr( $class ) . '" href="' . esc_url( $url ) . '"' . ( $is_external ? ' target="_blank" rel="noopener"' : '' ) . '>';
		$out        .= $badge; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- fixed SVG constants.
		$out        .= '<span class="sgs-choice-flow__summary-note-text">' . esc_html( $note );
		if ( '' !== $link_text ) {
			$out .= '<span class="sgs-choice-flow__summary-note-sub">' . esc_html( $link_text ) . '</span>';
		}
		$out .= '</span></a>';
		return $out;
	}
}
