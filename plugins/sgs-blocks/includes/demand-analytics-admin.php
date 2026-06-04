<?php
/**
 * SGS Demand Analytics — admin meta-box renderer.
 *
 * Renders the "Top Unbuyable Combos" read-only table on the WooCommerce
 * product edit screen.  Called exclusively from Demand_Analytics::render_meta_box().
 *
 * Security: the meta-box is only registered when the current user has
 * `manage_woocommerce` (enforced in Demand_Analytics::register_meta_box()).
 * This file performs a second capability check as a defence-in-depth measure.
 *
 * No PII is displayed — the stored map contains only aggregate counts and a
 * last-seen Unix timestamp; no IP address, user ID, or session data is ever
 * stored.
 *
 * @package SGS\Blocks
 * @since   1.5.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Render the demand-analytics meta-box body for a given product.
 *
 * @param int $product_id WooCommerce product post ID.
 */
function sgs_demand_analytics_render_meta_box( int $product_id ): void {

	// Defence-in-depth capability check.
	if ( ! \current_user_can( 'manage_woocommerce' ) ) { // phpcs:ignore WordPress.WP.Capabilities.Unknown -- manage_woocommerce is a WooCommerce-registered capability.
		return;
	}

	// ── Load raw data ─────────────────────────────────────────────────────────
	$raw = \get_post_meta( $product_id, Demand_Analytics::META_KEY, true );
	$map = array();

	if ( \is_string( $raw ) && '' !== $raw ) {
		$decoded = \json_decode( $raw, true );
		if ( \is_array( $decoded ) ) {
			$map = $decoded;
		}
	}

	if ( empty( $map ) ) {
		echo '<p>' . \esc_html__( 'No demand data recorded yet. Data appears when shoppers attempt to buy an unavailable combination.', 'sgs-blocks' ) . '</p>';
		return;
	}

	// ── Sort by total attempts (desc) ─────────────────────────────────────────
	\uasort(
		$map,
		static function ( array $a, array $b ): int {
			$total_a = (int) ( $a['oos'] ?? 0 ) + (int) ( $a['nonexistent'] ?? 0 );
			$total_b = (int) ( $b['oos'] ?? 0 ) + (int) ( $b['nonexistent'] ?? 0 );
			return $total_b - $total_a;
		}
	);

	// ── Build attribute-label lookup (WC global attributes) ──────────────────
	// Resolves e.g. "pa_size" → "Size" and "48-pack" → "48-Pack" via WC term.
	$attr_label_cache = array();

	/**
	 * Resolve a single taxonomy:slug pair to a human-readable "Label: Value" string.
	 * Falls back gracefully when WC helpers are unavailable.
	 *
	 * @param string $taxonomy e.g. "pa_size"
	 * @param string $slug     e.g. "48-pack"
	 * @return string          e.g. "Size: 48-Pack"
	 */
	$resolve_pair = static function ( string $taxonomy, string $slug ) use ( &$attr_label_cache ): string {
		// Taxonomy label (e.g. "pa_size" → "Size").
		if ( ! isset( $attr_label_cache[ $taxonomy ] ) ) {
			if ( \function_exists( 'wc_attribute_label' ) ) {
				$attr_label_cache[ $taxonomy ] = \wc_attribute_label( $taxonomy );
			} else {
				// Fallback: strip "pa_" prefix and title-case.
				$attr_label_cache[ $taxonomy ] = \ucwords( \str_replace( array( 'pa_', '_', '-' ), array( '', ' ', ' ' ), $taxonomy ) );
			}
		}
		$tax_label = $attr_label_cache[ $taxonomy ];

		// Term label (e.g. "48-pack" → "48-Pack" or the WC term name).
		$term_label = $slug;
		if ( \function_exists( 'get_term_by' ) ) {
			$term = \get_term_by( 'slug', $slug, $taxonomy );
			if ( $term && ! \is_wp_error( $term ) ) {
				$term_label = $term->name;
			} else {
				// Graceful fallback: title-case the slug.
				$term_label = \ucwords( \str_replace( '-', ' ', $slug ) );
			}
		}

		return \esc_html( $tax_label ) . ': ' . \esc_html( $term_label );
	};

	/**
	 * Resolve a full combo key to a readable string.
	 * e.g. "pa_flavour:mint|pa_size:48-pack" → "Flavour: Mint, Size: 48-Pack"
	 *
	 * @param string $combo_key Canonical combo key.
	 * @return string
	 */
	$resolve_combo = static function ( string $combo_key ) use ( $resolve_pair ): string {
		$segments = \explode( '|', $combo_key );
		$parts    = array();
		foreach ( $segments as $segment ) {
			$pair = \explode( ':', $segment, 2 );
			if ( 2 !== \count( $pair ) ) {
				$parts[] = \esc_html( $segment );
				continue;
			}
			$parts[] = $resolve_pair( $pair[0], $pair[1] );
		}
		return \implode( ', ', $parts );
	};

	// ── Render table ──────────────────────────────────────────────────────────
	?>
	<style>
		#sgs-demand-analytics table {
			border-collapse: collapse;
			width: 100%;
		}
		#sgs-demand-analytics th,
		#sgs-demand-analytics td {
			padding: 6px 10px;
			text-align: left;
			border-bottom: 1px solid #dcdcdc;
			font-size: 13px;
		}
		#sgs-demand-analytics th {
			background: #f9f9f9;
			font-weight: 600;
		}
		#sgs-demand-analytics tr:last-child td {
			border-bottom: none;
		}
		#sgs-demand-analytics .sgs-da-total {
			font-weight: 600;
		}
		#sgs-demand-analytics .sgs-da-note {
			margin-top: 8px;
			color: #666;
			font-size: 12px;
		}
	</style>
	<table>
		<thead>
			<tr>
				<th><?php \esc_html_e( 'Combination', 'sgs-blocks' ); ?></th>
				<th><?php \esc_html_e( 'Out of Stock', 'sgs-blocks' ); ?></th>
				<th><?php \esc_html_e( 'Non-existent', 'sgs-blocks' ); ?></th>
				<th><?php \esc_html_e( 'Total', 'sgs-blocks' ); ?></th>
				<th><?php \esc_html_e( 'Last Seen', 'sgs-blocks' ); ?></th>
			</tr>
		</thead>
		<tbody>
		<?php foreach ( $map as $combo_key => $data ) : ?>
			<?php
			$oos         = (int) ( $data['oos'] ?? 0 );
			$nonexistent = (int) ( $data['nonexistent'] ?? 0 );
			$total       = $oos + $nonexistent;
			$last_ts     = (int) ( $data['last_ts'] ?? 0 );
			$last_seen   = $last_ts > 0
				? \esc_html(
					\date_i18n(
						\get_option( 'date_format' ) . ' ' . \get_option( 'time_format' ),
						$last_ts
					)
				)
				: '—';
			?>
			<tr>
				<td><?php echo $resolve_combo( (string) $combo_key ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- output is fully escaped inside $resolve_combo via esc_html() on every segment. ?></td>
				<td><?php echo \esc_html( (string) $oos ); ?></td>
				<td><?php echo \esc_html( (string) $nonexistent ); ?></td>
				<td class="sgs-da-total"><?php echo \esc_html( (string) $total ); ?></td>
				<td><?php echo $last_seen; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- value is either esc_html( date_i18n(...) ) or the literal '—', both safe. ?></td>
			</tr>
		<?php endforeach; ?>
		</tbody>
	</table>
	<p class="sgs-da-note">
		<?php
		\printf(
			/* translators: %d: number of distinct combos recorded. */
			\esc_html( \_n( '%d combination recorded.', '%d combinations recorded.', \count( $map ), 'sgs-blocks' ) ),
			(int) \count( $map )
		);
		?>
		<?php if ( \count( $map ) >= Demand_Analytics::MAX_COMBOS ) : ?>
			<?php \esc_html_e( 'Cap reached — new combinations are no longer tracked until existing entries are cleared.', 'sgs-blocks' ); ?>
		<?php endif; ?>
	</p>
	<?php
}
