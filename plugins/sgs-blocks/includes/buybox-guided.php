<?php
/**
 * Sgs/buybox — guided layout (Spec 43 FR-43-23).
 *
 * Turns the buy box into a one-decision-per-screen flow behind a segmented
 * progress meter: every variation-forming axis from Product_Manifest, plus
 * (guidedAnswerAttributes) the product's other VISIBLE non-variation
 * attributes, in the product's own attribute order. An answer group's terms
 * still render as an `sgs/option-picker` (swatch images, styling, badges all
 * apply unchanged) but are marked `data-guided-answer="1"` so buybox/guided.js
 * can stop their `sgs:option-selected` event reaching the product-card store
 * BEFORE it corrupts variation resolution — proof of why that interception is
 * needed, not merely a naming convention, is in the buybox report:
 * `applyPillSelection()` (product-card/view.js) has no guard at all against an unrecognised
 * `typeKey` — it unconditionally folds it into `ctx.selectedAxes` and then fails to resolve a
 * matching combo, which marks the card `stockText:'Unavailable'`. Interception must happen
 * upstream of that function, not inside it.
 *
 * New file — buybox/render.php (1092 lines) and product-card/view.js (1046 lines) are both
 * over the plugin's 300/250-line caps, so this whole feature (incl. FR-43-25 peripherals:
 * Back/Next wording, meter style, meter colour) lives here, wired in with a few hook lines.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_buybox_guided_groups' ) ) {
	/**
	 * Ordered guided-flow groups.
	 *
	 * @param \WC_Product $product         The buybox's variable product.
	 * @param array       $manifest        Product_Manifest::build() result.
	 * @param bool        $include_answers Add non-variation attribute groups (guidedAnswerAttributes).
	 * @return array<int,array{type:string,taxonomy:string,label:string,terms:array,default_slug:string}>
	 */
	function sgs_buybox_guided_groups( \WC_Product $product, array $manifest, bool $include_answers ): array {
		$axes_by_tax = array();
		foreach ( $manifest['axes'] as $axis ) {
			// Single-variant suppression — same rule as the standard 8b loop.
			if ( count( $axis['terms'] ?? array() ) >= 2 ) {
				$axes_by_tax[ $axis['taxonomy'] ] = $axis;
			}
		}

		$groups = array();

		foreach ( $product->get_attributes() as $wc_attr ) {
			if ( ! $wc_attr instanceof \WC_Product_Attribute || ! $wc_attr->is_taxonomy() ) {
				continue;
			}
			$taxonomy = (string) $wc_attr->get_name();

			if ( isset( $axes_by_tax[ $taxonomy ] ) ) {
				$axis     = $axes_by_tax[ $taxonomy ];
				$groups[] = array(
					'type'         => 'priced',
					'taxonomy'     => $taxonomy,
					'label'        => $axis['label'],
					'terms'        => $axis['terms'],
					'default_slug' => (string) ( $manifest['defaultAxes'][ $taxonomy ] ?? '' ),
				);
				continue;
			}

			if ( ! $include_answers || ! $wc_attr->get_visible() ) {
				continue;
			}

			$terms = wc_get_product_terms( $product->get_id(), $taxonomy, array( 'fields' => 'all' ) );
			if ( ! is_array( $terms ) || count( $terms ) < 2 ) {
				continue;
			}

			$groups[] = array(
				'type'         => 'answer',
				'taxonomy'     => $taxonomy,
				'label'        => wc_attribute_label( $taxonomy ),
				'terms'        => array_map(
					static function ( $term ) {
						return array(
							'slug'  => $term->slug,
							'label' => $term->name,
						);
					},
					$terms
				),
				'default_slug' => '',
			);
		}

		return $groups;
	}
}

if ( ! function_exists( 'sgs_buybox_guided_term_label' ) ) {
	/**
	 * A group's term label by slug (used for the meter's "done" caption).
	 *
	 * @param array  $group Group descriptor from sgs_buybox_guided_groups().
	 * @param string $slug  Term slug to find.
	 * @return string Label, or '' if not found.
	 */
	function sgs_buybox_guided_term_label( array $group, string $slug ): string {
		if ( '' === $slug ) {
			return '';
		}
		foreach ( $group['terms'] as $term ) {
			if ( $term['slug'] === $slug ) {
				return $term['label'];
			}
		}
		return '';
	}
}

if ( ! function_exists( 'sgs_buybox_guided_picker' ) ) {
	/**
	 * One group's terms as an `sgs/option-picker` block, forwarding the same
	 * swatch/style/sub-label/tick overrides the standard 8b loop forwards.
	 * The picker's `typeKey` is always the group's REAL taxonomy (never a
	 * synthetic key) — this is what lets option-picker's own swatch-image
	 * lookup work unchanged for answer groups too; the group is kept out of
	 * variation resolution by DOM interception (guided.js), not by mangling
	 * the taxonomy name.
	 *
	 * @param array $group          Group descriptor.
	 * @param array $picker_forward {swatch_style, plain_style, sub_label_key, show_tick}.
	 * @return string Fully-rendered, escaped block markup.
	 */
	function sgs_buybox_guided_picker( array $group, array $picker_forward ): string {
		$style = sgs_buybox_axis_has_swatch( $group['taxonomy'], $group['terms'] )
			? $picker_forward['swatch_style']
			: $picker_forward['plain_style'];

		$attrs = array(
			'label'            => $group['label'],
			'showLabel'        => false,
			'optionItems'      => array_map(
				static function ( $t ) {
					return array(
						'key'   => $t['slug'],
						'label' => $t['label'],
					);
				},
				$group['terms']
			),
			'defaultSelected'  => $group['default_slug'],
			'typeKey'          => $group['taxonomy'],
			'showSelectedTick' => $picker_forward['show_tick'],
		);
		if ( '' !== $style ) {
			$attrs['pillStyle'] = $style;
		}
		if ( '' !== $picker_forward['sub_label_key'] ) {
			$attrs['subLabelMetaKey'] = $picker_forward['sub_label_key'];
		}

		return (string) render_block(
			array(
				'blockName' => 'sgs/option-picker',
				'attrs'     => $attrs,
			)
		);
	}
}

if ( ! function_exists( 'sgs_buybox_guided_render' ) ) {
	/**
	 * Render the guided-flow shell: meter, per-group containers, nav row and
	 * status region. Replaces buybox/render.php's standard axis-picker loop
	 * (8b) when `layout` is 'guided'.
	 *
	 * FR-43-25 wiring line for render.php's call site (owned by another agent) — add a 4th arg:
	 * array( 'next_label'=>$attributes['guidedNextLabel']??'', 'back_label'=>$attributes['guidedBackLabel']??'',
	 * 'meter_style'=>$attributes['guidedMeterStyle']??'segments', 'meter_colour'=>$attributes['guidedMeterColour']??'' ).
	 *
	 * @param array $groups          sgs_buybox_guided_groups() output. Empty = renders nothing (byte-identical no-op).
	 * @param array $picker_forward  {swatch_style, plain_style, sub_label_key, show_tick}.
	 * @param bool  $auto_advance    guidedAutoAdvance attribute — forwarded as a data attribute for guided.js.
	 * @param array $peripherals     Optional FR-43-25 peripherals: {next_label, back_label, meter_style, meter_colour}.
	 * @return string Escaped HTML — safe to echo directly.
	 */
	function sgs_buybox_guided_render( array $groups, array $picker_forward, bool $auto_advance, array $peripherals = array() ): string {
		if ( empty( $groups ) ) {
			return '';
		}

		$next_label  = '' !== ( $peripherals['next_label'] ?? '' ) ? $peripherals['next_label'] : __( 'Next', 'sgs-blocks' );
		$back_label  = '' !== ( $peripherals['back_label'] ?? '' ) ? $peripherals['back_label'] : __( 'Back', 'sgs-blocks' );
		$meter_style = $peripherals['meter_style'] ?? 'segments';
		if ( ! in_array( $meter_style, array( 'segments', 'bar', 'dots' ), true ) ) {
			$meter_style = 'segments';
		}
		$meter_colour = (string) ( $peripherals['meter_colour'] ?? '' );

		// Scoped colour override (Spec 32 — class-scoped <style>, option-picker's own pattern). Empty = no-op.
		$meter_scope_class = '';
		$meter_colour_css  = '';
		if ( '' !== $meter_colour ) {
			$meter_scope_class = 'sgs-bbg-' . substr( md5( $meter_colour ), 0, 8 );
			$meter_colour_css  = '.' . $meter_scope_class . '{--sgs-buybox-guided-meter-colour:' . sgs_colour_value( $meter_colour ) . ';}';
		}

		$total = count( $groups );

		// Opens on the first group with no chosen default (FR-43-23: "a default
		// choice counts as made"). All groups already made -> land on the last.
		$first_active = $total - 1;
		foreach ( $groups as $i => $group ) {
			if ( '' === $group['default_slug'] ) {
				$first_active = $i;
				break;
			}
		}

		ob_start();
		?>
		<?php if ( '' !== $meter_colour_css ) : ?>
		<style><?php echo wp_strip_all_tags( $meter_colour_css ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sgs_colour_value() resolves to a token var() or a sanitised colour; wp_strip_all_tags guards </style>. ?></style>
		<?php endif; ?>
		<div
			class="sgs-buybox-guided<?php echo '' !== $meter_scope_class ? ' ' . esc_attr( $meter_scope_class ) : ''; ?>"
			data-sgs-buybox-guided="1"
			data-total-groups="<?php echo (int) $total; ?>"
			data-guided-auto-advance="<?php echo $auto_advance ? '1' : '0'; ?>"
		>
			<div class="sgs-buybox-guided__meter-wrap">
				<ol class="sgs-buybox-guided__meter sgs-buybox-guided__meter--<?php echo esc_attr( $meter_style ); ?>" data-guided-meter role="list">
					<?php foreach ( $groups as $i => $group ) : ?>
						<?php
						$is_done    = '' !== $group['default_slug'];
						$done_label = $is_done ? sgs_buybox_guided_term_label( $group, $group['default_slug'] ) : '';
						?>
					<li class="sgs-buybox-guided__meter-item">
						<button
							type="button"
							class="sgs-buybox-guided__meter-btn<?php echo $is_done ? ' sgs-buybox-guided__meter-btn--done' : ''; ?><?php echo ( $i === $first_active ) ? ' sgs-buybox-guided__meter-btn--current' : ''; ?>"
							data-guided-goto="<?php echo (int) $i; ?>"
							aria-current="<?php echo ( $i === $first_active ) ? 'true' : 'false'; ?>"
							<?php echo $is_done ? '' : 'aria-disabled="true"'; ?>
						>
							<span class="sgs-buybox-guided__meter-index"><?php echo (int) ( $i + 1 ); ?></span>
							<span class="sgs-buybox-guided__meter-value" data-guided-meter-value>
								<?php echo esc_html( '' !== $done_label ? $done_label : $group['label'] ); ?>
							</span>
						</button>
					</li>
					<?php endforeach; ?>
				</ol>
				<p class="sgs-buybox-guided__meter-compact" data-guided-meter-compact>
					<?php
					printf(
						/* translators: 1: current step number, 2: total steps, 3: current group label. */
						esc_html__( '%1$d of %2$d · %3$s', 'sgs-blocks' ),
						(int) ( $first_active + 1 ),
						(int) $total,
						esc_html( $groups[ $first_active ]['label'] )
					);
					?>
				</p>
			</div>

			<?php foreach ( $groups as $i => $group ) : ?>
			<div
				class="sgs-buybox-guided__group"
				data-guided-group="<?php echo (int) $i; ?>"
				data-guided-answer="<?php echo 'answer' === $group['type'] ? '1' : '0'; ?>"
				data-guided-label="<?php echo esc_attr( $group['label'] ); ?>"
				data-guided-taxonomy="<?php echo esc_attr( $group['taxonomy'] ); ?>"
				data-guided-has-default="<?php echo '' !== $group['default_slug'] ? '1' : '0'; ?>"
				<?php echo ( $i !== $first_active ) ? 'hidden' : ''; ?>
			>
				<h3 class="sgs-buybox-guided__group-title" tabindex="-1"><?php echo esc_html( $group['label'] ); ?></h3>
				<?php echo sgs_buybox_guided_picker( $group, $picker_forward ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- render_block() output is fully-rendered, escaped block markup. ?>
			</div>
			<?php endforeach; ?>

			<div class="sgs-buybox-guided__nav">
				<button
					type="button"
					class="sgs-buybox-guided__nav-btn sgs-buybox-guided__nav-btn--back"
					data-guided-back
					<?php echo ( 0 === $first_active ) ? 'hidden' : ''; ?>
				><?php echo esc_html( $back_label ); ?></button>
				<button
					type="button"
					class="sgs-buybox-guided__nav-btn sgs-buybox-guided__nav-btn--next"
					data-guided-next
					<?php echo ( $first_active >= $total - 1 ) ? 'hidden' : ''; ?>
					<?php echo ( '' === $groups[ $first_active ]['default_slug'] ) ? 'aria-disabled="true"' : ''; ?>
				><?php echo esc_html( $next_label ); ?></button>
			</div>

			<p class="sgs-buybox-guided__status sgs-sr-only" role="status" aria-live="polite" data-guided-status></p>
		</div>
		<?php
		return (string) ob_get_clean();
	}
}
