<?php
/**
 * SGS llms.txt navigation-map builders (FR-27-F2 llms clause, Spec 27 v6).
 *
 * Builds the curated /llms.txt navigation map in the llmstxt.org shape:
 * H1 site name, blockquote summary, H2 sections of markdown link lists.
 * Contains ONLY structural navigation — shop page, category archives, policy
 * pages, FAQ. NEVER individual product pages (anti-cloaking: every link is a
 * real on-site URL).
 *
 * Per-product expansion lives in class-llms-txt-products.php. Split solely to
 * keep each file within the SGS 300-line limit.
 *
 * @package SGS\Blocks
 * @since   1.6.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Llms_Txt_Builders
 *
 * Static builders for the curated llms.txt navigation map. Called from
 * Llms_Txt (orchestrator) and Llms_Txt_Products (shared header + sanitiser).
 */
final class Llms_Txt_Builders {

	/**
	 * Build the curated navigation map (slim llms.txt).
	 *
	 * @return string Plain-text content, UTF-8 no BOM.
	 */
	public static function build_slim(): string {
		$lines = array();

		// H1 — site name.
		$lines[] = '# ' . self::sanitise_line( \get_bloginfo( 'name' ) );
		$lines[] = '';

		// Blockquote summary — filterable.
		$lines[] = '> ' . self::build_summary();
		$lines[] = '';

		// Shop page.
		if ( \function_exists( 'wc_get_page_id' ) ) {
			$shop_id = \wc_get_page_id( 'shop' );
			if ( $shop_id > 0 ) {
				$shop_url   = \get_permalink( $shop_id );
				$shop_title = \get_the_title( $shop_id );
				if ( $shop_url ) {
					$lines[]       = '## Shop';
					$lines[]       = '';
					$display_title = $shop_title ? $shop_title : 'Shop';
					$lines[]       = '- [' . self::sanitise_line( $display_title ) . '](' . \esc_url_raw( $shop_url ) . '): Browse all products';
					$lines[]       = '';
				}
			}
		}

		// Product category archives.
		$cat_lines = self::build_category_lines();
		if ( ! empty( $cat_lines ) ) {
			$lines[] = '## Product Categories';
			$lines[] = '';
			$lines   = array_merge( $lines, $cat_lines );
			$lines[] = '';
		}

		// Policy pages (privacy, terms, refund).
		$policy_lines = self::build_policy_lines();
		if ( ! empty( $policy_lines ) ) {
			$lines[] = '## Policies';
			$lines[] = '';
			$lines   = array_merge( $lines, $policy_lines );
			$lines[] = '';
		}

		// FAQ page (search by slug).
		$faq_lines = self::build_faq_lines();
		if ( ! empty( $faq_lines ) ) {
			$lines[] = '## FAQ';
			$lines[] = '';
			$lines   = array_merge( $lines, $faq_lines );
			$lines[] = '';
		}

		return implode( "\n", $lines );
	}

	/**
	 * Build the blockquote brand summary string (filterable).
	 *
	 * Derives a brief description from site tagline + WC store info. Clients can
	 * override via the sgs_llms_txt_summary filter to refine the copy.
	 *
	 * @return string Single-line summary, <200 words.
	 */
	public static function build_summary(): string {
		$site_name = self::sanitise_line( \get_bloginfo( 'name' ) );
		$tagline   = self::sanitise_line( \get_bloginfo( 'description' ) );
		$country   = '';
		$currency  = '';

		if ( \function_exists( 'get_woocommerce_currency_symbol' ) ) {
			$currency = self::sanitise_line( html_entity_decode( \get_woocommerce_currency_symbol(), ENT_QUOTES, 'UTF-8' ) );
		}
		if ( \function_exists( 'WC' ) && isset( WC()->countries ) ) {
			$country = self::sanitise_line( (string) WC()->countries->get_base_country() );
		}

		$summary = $site_name;
		if ( $tagline ) {
			$summary .= ' — ' . $tagline;
		}
		if ( $country ) {
			$summary .= '. Serving customers in ' . $country;
			if ( $currency ) {
				$summary .= ' (' . $currency . ')';
			}
			$summary .= '.';
		}

		/**
		 * Filter the llms.txt blockquote summary.
		 *
		 * @param string $summary   The auto-generated one-line summary.
		 * @param string $site_name The site name.
		 * @param string $tagline   The site tagline.
		 */
		$summary = (string) \apply_filters( 'sgs_llms_txt_summary', $summary, $site_name, $tagline );

		// llmstxt.org caps the blockquote at <200 words — enforce it even on
		// filtered values (a verbose tagline or filter must not break the shape).
		$words = \preg_split( '/\s+/', $summary, -1, PREG_SPLIT_NO_EMPTY );
		if ( \is_array( $words ) && \count( $words ) > 199 ) {
			$summary = \implode( ' ', \array_slice( $words, 0, 199 ) ) . '…';
		}

		return $summary;
	}

	/**
	 * Build markdown link lines for all non-empty product category archives.
	 *
	 * @return string[]
	 */
	public static function build_category_lines(): array {
		if ( ! \taxonomy_exists( 'product_cat' ) ) {
			return array();
		}

		$terms = \get_terms(
			array(
				'taxonomy'   => 'product_cat',
				'hide_empty' => true,
				'orderby'    => 'name',
				'order'      => 'ASC',
				'number'     => 200,
			)
		);

		if ( \is_wp_error( $terms ) || empty( $terms ) ) {
			return array();
		}

		$lines = array();
		foreach ( $terms as $term ) {
			$url  = \get_term_link( $term );
			$name = self::sanitise_line( $term->name );
			$desc = $term->description
				? self::sanitise_line( \wp_strip_all_tags( $term->description ) )
				: $name . ' products';
			if ( strlen( $desc ) > 120 ) {
				$desc = substr( $desc, 0, 117 ) . '...';
			}
			if ( ! \is_wp_error( $url ) && $url ) {
				$lines[] = '- [' . $name . '](' . \esc_url_raw( $url ) . '): ' . $desc;
			}
		}

		return $lines;
	}

	/**
	 * Build markdown link lines for WooCommerce policy pages.
	 *
	 * Privacy comes from get_privacy_policy_url() (WP core helper, which
	 * reads the same page ID WC's wc_privacy_policy_page_id() resolves to);
	 * terms via wc_get_page_id('terms'); refund/returns via the
	 * woocommerce_refund_returns_page_id option (WC 3.9+).
	 *
	 * @return string[]
	 */
	public static function build_policy_lines(): array {
		$lines = array();

		// Privacy policy — WP core helper is the most reliable source.
		$privacy_url = \get_privacy_policy_url();
		if ( $privacy_url ) {
			$lines[] = '- [Privacy Policy](' . \esc_url_raw( $privacy_url ) . '): How we handle your personal data';
		}

		if ( \function_exists( 'wc_get_page_id' ) ) {
			// WooCommerce terms and conditions page.
			$terms_id = \wc_get_page_id( 'terms' );
			if ( $terms_id > 0 ) {
				$terms_url = \get_permalink( $terms_id );
				if ( $terms_url ) {
					$lines[] = '- [Terms & Conditions](' . \esc_url_raw( $terms_url ) . '): Our terms of service';
				}
			}

			// Refund / returns page — woocommerce_refund_returns_page_id option
			// introduced in WC 3.9; get_option() returns 0 on older installs (safe).
			$refund_id = (int) \get_option( 'woocommerce_refund_returns_page_id', 0 );
			if ( $refund_id > 0 ) {
				$refund_url = \get_permalink( $refund_id );
				if ( $refund_url ) {
					$lines[] = '- [Refund & Returns Policy](' . \esc_url_raw( $refund_url ) . '): Returns, refunds and cancellation rights';
				}
			}
		}

		return $lines;
	}

	/**
	 * Look for an FAQ page by common slugs and return a link line if found.
	 *
	 * @return string[]
	 */
	public static function build_faq_lines(): array {
		$slugs = array( 'faq', 'faqs', 'frequently-asked-questions' );
		foreach ( $slugs as $slug ) {
			$page = \get_page_by_path( $slug );
			if ( $page && 'publish' === $page->post_status && '' === $page->post_password ) {
				$url = \get_permalink( $page );
				if ( $url ) {
					return array(
						'- [' . self::sanitise_line( $page->post_title ) . '](' . \esc_url_raw( $url ) . '): Frequently asked questions',
					);
				}
			}
		}
		return array();
	}

	/**
	 * Strip newlines and control characters from a string so it cannot break
	 * the llmstxt.org markdown line structure.
	 *
	 * @param string $raw Raw string value.
	 * @return string Single-line safe string.
	 */
	public static function sanitise_line( string $raw ): string {
		// This is a text/plain context: WP display filters HTML-encode values
		// (get_bloginfo('name') → "Mama&#039;s Munches"), so DECODE entities or
		// they leak literally into the plain-text output (live-caught 2026-06-10).
		$clean = html_entity_decode( $raw, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
		// Remove control characters (0x00–0x1F, 0x7F), then collapse whitespace.
		$clean = preg_replace( '/[\x00-\x1F\x7F]/', ' ', $clean );
		return trim( (string) preg_replace( '/\s+/', ' ', $clean ) );
	}
}
