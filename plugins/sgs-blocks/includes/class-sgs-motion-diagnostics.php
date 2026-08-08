<?php
/**
 * SGS Motion Diagnostics — an admin support surface for motion complaints
 * (Step 18, Spec 38, D448).
 *
 * PROBLEM THIS EXISTS TO SOLVE
 * `SGS_Motion_Registry` already reports WHY an effect was skipped
 * (`class-sgs-motion-registry.php::enqueue_effect()`), but only to
 * `error_log()` behind `WP_DEBUG`. On Hostinger, Bean never sees that: when a
 * client reports "the animation is broken", there is nothing to look at and
 * no way to answer without SSH. This page IS that "something to look at".
 *
 * WHAT IT MEASURES, AND WHY THAT METHOD (not internals of the locked file)
 * This class does NOT read `SGS_Motion_Registry`'s private module map or
 * hook into its enqueue path — that file is owned by a different track in
 * this session and this class must not depend on its private internals
 * changing shape under it. Instead it fetches the page's OWN LIVE URL via
 * `wp_remote_get()` — exactly the bytes a real visitor's browser would
 * receive — and reads the rendered HTML directly:
 *   · which effects are in use            → `data-sgs-fx="…"` occurrences
 *   · which motion modules were loaded    → `<script type="module" src="…">`
 *     tags whose path falls under this plugin's `build/vendor-modules/` or
 *     `build/shared/effects/` (the exact same scope
 *     `check-motion-bundle-budget.py`'s `_WATCHED_SUBDIRS` already uses)
 *   · how many bytes those modules cost   → gzip-recompressed file size,
 *     read straight off disk (same metric convention as the budget gate's
 *     `_gzip_size()`, so the two numbers are directly comparable)
 *   · what was SKIPPED and why            → cross-referencing the markup
 *     against (a) `SGS_Motion_Registry::effects()` — the SAME public,
 *     generated projection the registry itself gates on, so an effect name
 *     absent from it is reported with the identical reason the registry's
 *     own `error_log()` line would have given; and (b) the page's AUTHORED
 *     `fx` block attribute (via `parse_blocks()`), so an effect the operator
 *     set in the editor but which never reached the rendered page (a failed
 *     emission, or a build missing the module file) is caught too — this
 *     mirrors the registry's own documented "two independent signals" design
 *     (see that file's `sniff_block()` docblock) without needing to touch it.
 *
 * PER-PAGE BUDGET (Step 19 / D448)
 * Bean's ruling: a per-page motion cost over Spec 02's <50KB JS budget is not
 * something this framework should silently exempt, nor something it should
 * enforce by capping what an operator can author. The fix is VISIBILITY: this
 * page reports the real per-page gzip total against `BUDGET_BYTES_GZIP`
 * (51200 — the SAME literal the Wave-C canary probe
 * `scripts/motion-qa/probe-wave-c.mjs` reports against, and the number any
 * future editor-side authoring-time warning — fx.js, owned separately —
 * should read rather than inventing its own threshold).
 *
 * ADMIN ONLY (hard constraint) — AMENDED 2026-08-08, see below
 * This class is wired to `admin_menu` only. It is never loaded on the
 * frontend request path, never enqueues anything there, and its render
 * method additionally gates on `current_user_can()` before printing
 * anything.
 *
 * ⚠ THE "ONLY FROM render_page()" CLAUSE IS NO LONGER TRUE and is corrected
 * rather than left standing. It used to say the one network call
 * (`wp_remote_get()` against the page's own permalink) fired only from inside
 * `render_page()`. Since 2026-08-08 `measure_post()` can also trigger it, from
 * `includes/rest-motion-budget.php`, which serves the block editor the route
 * `extensions/fx.js` had been requesting (and 404ing on) since it was written.
 *
 * What is unchanged, and what the constraint now means precisely:
 *   · the admin PAGE is still `admin_menu` only;
 *   · nothing here is ever loaded or enqueued on the FRONTEND request path;
 *   · every entry point is capability-gated — `render_page()` on
 *     `current_user_can( self::CAP )`, the REST route on a per-post
 *     `current_user_can( 'edit_post', $id )`;
 *   · the outbound fetch is now transient-cached (`CACHE_TTL`, keyed on the
 *     post's modified time), so an editor session cannot turn one authenticated
 *     request into a stream of outbound ones.
 * A doc that silently stops matching the code is the failure this project
 * treats as a defect in its own right, so the claim was narrowed to what is
 * actually true instead of being quietly outgrown.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Diagnostics
 */
final class Sgs_Motion_Diagnostics {

	/** Submenu page slug. */
	const PAGE_SLUG = 'sgs-motion-diagnostics';

	/** Capability gate — matches every other SGS admin surface. */
	const CAP = 'edit_theme_options';

	/** Nonce action for the page picker form (GET, but it drives a remote fetch — gated all the same). */
	const NONCE_ACTION = 'sgs_motion_diagnostics_run';

	/**
	 * Per-page Tier G/V motion bundle budget, gzip bytes (Spec 02: <50KB JS
	 * per page). SHARED CONSTANT NAME — see this file's docblock. If this
	 * number ever changes, update it here AND in
	 * `scripts/motion-qa/probe-wave-c.mjs` (`MOTION_BUDGET_BYTES_GZIP`)
	 * together; do not let the two drift.
	 */
	const BUDGET_BYTES_GZIP = 51200;

	/**
	 * URL-path fragments that mark a script as one of this plugin's motion
	 * modules. Kept identical to `check-motion-bundle-budget.py`'s
	 * `_WATCHED_SUBDIRS` so "what counts as a motion module" is defined once
	 * in spirit across the per-module gate, this per-page report, and the
	 * canary probe.
	 *
	 * @var string[]
	 */
	const WATCHED_URL_FRAGMENTS = array(
		'vendor-modules/',
		'shared/effects/',
	);

	/**
	 * Transient prefix for a measured result. Keyed by post ID AND the post's
	 * own modified-time, so an edit invalidates the reading by construction
	 * rather than by remembering to purge it — a stale motion cost is a wrong
	 * number presented confidently, which is worse than no number.
	 */
	const CACHE_PREFIX = 'sgs_motion_budget_';

	/** How long a measurement stays warm. */
	const CACHE_TTL = 300;

	/** Wire WP hooks. Safe to call multiple times (add_action de-duplicates). */
	public static function register(): void {
		\add_action( 'admin_menu', array( __CLASS__, 'add_menu' ) );
	}

	/**
	 * Measure one post's motion cost, for callers OUTSIDE this admin page.
	 *
	 * Added 2026-08-08 so `rest-motion-budget.php` can serve the editor the
	 * SAME measurement this page shows, rather than a second implementation.
	 * `extensions/fx.js:1015-1038` documented the interface it wanted and
	 * explicitly refused to compute a cost itself, on the grounds that two
	 * independently-derived numbers can silently disagree. That reasoning binds
	 * here too: this returns the measured figure or nothing at all.
	 *
	 * ⚠ SCOPE NOTE — this class's header calls it "admin only ... never loaded
	 * on the frontend request path". That remains true of the PAGE (still
	 * `admin_menu` only) but is no longer true of the CLASS, which a REST
	 * request now loads. The header has been amended rather than left to become
	 * a false statement. The REST surface carries its own capability check.
	 *
	 * @param int $post_id Post to measure.
	 * @return array|null Analyse() output plus 'budget_bytes_gzip', or null when
	 *                    the post cannot be measured (missing, unpublished, no
	 *                    permalink, or the fetch failed). Null means "no data",
	 *                    never "zero cost" — the caller must not render a 0.
	 */
	public static function measure_post( int $post_id ): ?array {
		$post = \get_post( $post_id );
		if ( ! $post || ! \is_a( $post, '\\WP_Post' ) || 'publish' !== $post->post_status ) {
			return null;
		}

		$url = \get_permalink( $post );
		if ( ! $url ) {
			return null;
		}

		$key    = self::CACHE_PREFIX . $post_id . '_' . \md5( (string) $post->post_modified_gmt );
		$cached = \get_transient( $key );
		if ( \is_array( $cached ) ) {
			return $cached;
		}

		// Same cache-bust discipline as render_report(): LiteSpeed sits in front
		// of both live sites and a stale copy would report an old build as today.
		$response = \wp_remote_get(
			\add_query_arg( 'sgsmotiondiag', (string) \time(), $url ),
			array(
				'timeout'   => 20,
				'sslverify' => true,
			)
		);

		if ( \is_wp_error( $response ) ) {
			return null;
		}
		if ( 200 !== (int) \wp_remote_retrieve_response_code( $response ) ) {
			return null;
		}
		$body = \wp_remote_retrieve_body( $response );
		if ( '' === $body ) {
			return null;
		}

		$result                        = self::analyse( $post, $body );
		$result['budget_bytes_gzip']   = self::BUDGET_BYTES_GZIP;
		\set_transient( $key, $result, self::CACHE_TTL );

		return $result;
	}

	/**
	 * Per-effect byte attribution, derived ONLY from what was measured.
	 *
	 * ⚠ There is deliberately no effect→module lookup here. A first version of
	 * this method read a `path` key off `known_effects()` — a shape that DOES
	 * NOT EXIST (`generated-fx-effects.php` entries carry `plugin_set`,
	 * `owns_scroll_transform`, `pins`, `triggers` and nothing else), so it would
	 * have returned an empty map forever while looking correct. The real
	 * effect→module map is `SGS_Motion_Registry`'s private one, which this
	 * class's header is explicit about NOT depending on.
	 *
	 * So attribution comes from the measurement itself: a module this page
	 * actually loaded, whose filename is `fx-<effect>.js`, is that effect's
	 * cost. Nothing is apportioned and nothing is guessed.
	 *
	 * ⚠ These figures do NOT sum to the page total, and must never be presented
	 * as if they do. The shared GSAP core and any module serving several
	 * effects are real page cost with no single owner; dividing them up would
	 * invent a number nobody measured. The total is the authoritative figure.
	 *
	 * @param array $result Output of analyse().
	 * @return array<int,array{effect:string,bytes_gzip:int}> Only effects whose
	 *         own module was measured; effects without one are omitted rather
	 *         than reported as costing zero.
	 */
	public static function attribute_effect_bytes( array $result ): array {
		$by_basename = array();
		foreach ( (array) ( $result['modules'] ?? array() ) as $module ) {
			$path = (string) ( $module['path'] ?? '' );
			if ( '' === $path ) {
				continue;
			}
			$base = \basename( $path, '.js' );
			if ( 0 === \strpos( $base, 'fx-' ) ) {
				$by_basename[ \substr( $base, 3 ) ] = (int) ( $module['bytes_gzip'] ?? 0 );
			}
		}

		$out = array();
		foreach ( \array_keys( (array) ( $result['effects_in_markup'] ?? array() ) ) as $effect ) {
			$effect = (string) $effect;
			if ( isset( $by_basename[ $effect ] ) ) {
				$out[] = array(
					'effect'     => $effect,
					'bytes_gzip' => $by_basename[ $effect ],
				);
			}
		}
		return $out;
	}

	/** Register the submenu under the SGS top-level entry. */
	public static function add_menu(): void {
		\add_submenu_page(
			Sgs_Admin_Menu::MENU_SLUG,
			\__( 'SGS Motion Diagnostics', 'sgs-blocks' ),
			\__( 'Motion Diagnostics', 'sgs-blocks' ),
			self::CAP,
			self::PAGE_SLUG,
			array( __CLASS__, 'render_page' )
		);
	}

	/** Render the admin page: picker form + (when a page was chosen) the report. */
	public static function render_page(): void {
		if ( ! \current_user_can( self::CAP ) ) {
			\wp_die( \esc_html__( 'You do not have permission to access this page.', 'sgs-blocks' ), '', array( 'response' => 403 ) );
		}

		echo '<div class="wrap">';
		echo '<h1>' . \esc_html__( 'SGS Motion Diagnostics', 'sgs-blocks' ) . '</h1>';
		echo '<p>' . \esc_html__( 'Check which motion effects a page actually shipped on its live frontend, how many bytes they cost, and which effects were skipped — and why — without SSH or WP_DEBUG.', 'sgs-blocks' ) . '</p>';

		self::render_picker_form();

		$post_id = self::requested_post_id();
		if ( $post_id > 0 ) {
			self::render_report( $post_id );
		}

		echo '</div>';
	}

	/**
	 * Resolve + verify the requested post/page ID from the GET request.
	 * Returns 0 when nothing valid was submitted (nonce missing/invalid, or
	 * no ID given) — the caller treats 0 as "show the picker only".
	 *
	 * @return int
	 */
	private static function requested_post_id(): int {
		if ( ! isset( $_GET['_wpnonce'] ) ) {
			return 0;
		}
		$nonce = \sanitize_text_field( \wp_unslash( $_GET['_wpnonce'] ) );
		if ( ! \wp_verify_nonce( $nonce, self::NONCE_ACTION ) ) {
			return 0;
		}

		// The manual-ID override field wins when present and non-zero, so an
		// operator diagnosing a product/CPT (not in the Pages dropdown) can
		// still reach it.
		$override = isset( $_GET['sgs_post_id_override'] ) ? \absint( $_GET['sgs_post_id_override'] ) : 0;
		if ( $override > 0 ) {
			return $override;
		}

		return isset( $_GET['sgs_page_id'] ) ? \absint( $_GET['sgs_page_id'] ) : 0;
	}

	/** Render the page-picker form. */
	private static function render_picker_form(): void {
		$selected = isset( $_GET['sgs_page_id'] ) ? \absint( $_GET['sgs_page_id'] ) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only pre-fill, the actual action is nonce-gated in requested_post_id().

		echo '<form method="get" action="' . \esc_url( \admin_url( 'admin.php' ) ) . '">';
		echo '<input type="hidden" name="page" value="' . \esc_attr( self::PAGE_SLUG ) . '" />';
		\wp_nonce_field( self::NONCE_ACTION, '_wpnonce', false );

		echo '<table class="form-table"><tbody>';

		echo '<tr><th scope="row"><label for="sgs_page_id">' . \esc_html__( 'Page', 'sgs-blocks' ) . '</label></th><td>';
		\wp_dropdown_pages(
			array(
				'name'              => 'sgs_page_id',
				'id'                => 'sgs_page_id',
				'show_option_none'  => \__( '— Select a page —', 'sgs-blocks' ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_dropdown_pages() escapes this internally before echoing the <option>.
				'option_none_value' => '0',
				'selected'          => $selected, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- an int (absint()'d above), not raw output; wp_dropdown_pages() compares it, never echoes it unescaped.
			)
		);
		echo '<p class="description">' . \esc_html__( 'Only published Pages are listed here.', 'sgs-blocks' ) . '</p>';
		echo '</td></tr>';

		echo '<tr><th scope="row"><label for="sgs_post_id_override">' . \esc_html__( 'Or enter any post/product ID', 'sgs-blocks' ) . '</label></th><td>';
		echo '<input type="number" min="1" step="1" id="sgs_post_id_override" name="sgs_post_id_override" value="" />';
		echo '<p class="description">' . \esc_html__( 'Use this for a post or a custom content type (e.g. a product) that is not a Page. Overrides the dropdown above when filled in.', 'sgs-blocks' ) . '</p>';
		echo '</td></tr>';

		echo '</tbody></table>';

		\submit_button( \__( 'Diagnose', 'sgs-blocks' ) );
		echo '</form>';
	}

	/**
	 * Fetch the given post's live frontend HTML and render the full report.
	 *
	 * @param int $post_id Post ID.
	 */
	private static function render_report( int $post_id ): void {
		$post = \get_post( $post_id );

		if ( ! $post || ! \is_a( $post, '\\WP_Post' ) ) {
			self::render_error( \__( 'That post/page ID does not exist.', 'sgs-blocks' ) );
			return;
		}

		if ( 'publish' !== $post->post_status ) {
			self::render_error(
				\sprintf(
					/* translators: %s: post status */
					\esc_html__( 'That content is not published (status: %s) — it has no live frontend URL to measure.', 'sgs-blocks' ),
					\esc_html( $post->post_status )
				)
			);
			return;
		}

		$url = \get_permalink( $post );
		if ( ! $url ) {
			self::render_error( \__( 'This content has no public permalink.', 'sgs-blocks' ) );
			return;
		}

		// Cache-bust — LiteSpeed sits in front of both live sites, and a run
		// against a stale cached copy would report yesterday's build as
		// today's truth. Same discipline the Wave-C canary probe applies to
		// its own fetches.
		$fetch_url = \add_query_arg( 'sgsmotiondiag', (string) \time(), $url );

		$response = \wp_remote_get(
			$fetch_url,
			array(
				'timeout'   => 20,
				'sslverify' => true,
			)
		);

		if ( \is_wp_error( $response ) ) {
			self::render_error(
				\sprintf(
					/* translators: %s: error message */
					\esc_html__( 'Could not fetch the live page to measure it: %s', 'sgs-blocks' ),
					\esc_html( $response->get_error_message() )
				)
			);
			return;
		}

		$code = (int) \wp_remote_retrieve_response_code( $response );
		$body = \wp_remote_retrieve_body( $response );

		if ( 200 !== $code || '' === $body ) {
			self::render_error(
				\sprintf(
					/* translators: %d: HTTP status code */
					\esc_html__( 'The live page returned HTTP %d — cannot measure it.', 'sgs-blocks' ),
					$code
				)
			);
			return;
		}

		$result = self::analyse( $post, $body );

		echo '<h2>' . \esc_html(
			\sprintf(
				/* translators: %s: post title */
				\__( 'Report — %s', 'sgs-blocks' ),
				\get_the_title( $post )
			)
		) . '</h2>';
		echo '<p><a href="' . \esc_url( $url ) . '" target="_blank" rel="noopener noreferrer">' . \esc_html( $url ) . '</a></p>';

		self::render_budget_summary( $result );
		self::render_effects_table( $result );
		self::render_modules_table( $result );
		self::render_skipped_table( $result );
	}

	/**
	 * Print a dismissible-style error notice.
	 *
	 * @param string $message Already-escaped or safe message.
	 */
	private static function render_error( string $message ): void {
		echo '<div class="notice notice-error"><p>' . $message . '</p></div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- callers pass pre-escaped strings.
	}

	/**
	 * Analyse a page's live rendered HTML for motion effects, module cost,
	 * and skip reasons. Pure function of (post, html) — no side effects, no
	 * writes, safe to call repeatedly.
	 *
	 * @param \WP_Post $post Post object (used for authored `fx` attrs + title).
	 * @param string   $html Live rendered HTML from wp_remote_get().
	 * @return array{effects_in_markup: array<string,int>, modules: array<int,array{path:string,bytes_raw:?int,bytes_gzip:?int,note:string}>, total_bytes_raw:int, total_bytes_gzip:int, skipped: array<int,array{effect:string,reason:string}>}
	 */
	private static function analyse( \WP_Post $post, string $html ): array {
		$effects_in_markup = self::extract_effects_from_html( $html );
		$module_srcs       = self::extract_module_srcs( $html );

		$modules          = array();
		$total_bytes_raw  = 0;
		$total_bytes_gzip = 0;

		foreach ( $module_srcs as $src ) {
			$rel = self::plugin_relative_path( $src );
			if ( null === $rel || ! self::is_watched_module( $rel ) ) {
				continue;
			}

			$local = SGS_BLOCKS_PATH . $rel;

			if ( ! \file_exists( $local ) || ! \is_readable( $local ) ) {
				$modules[] = array(
					'path'       => $rel,
					'bytes_raw'  => null,
					'bytes_gzip' => null,
					'note'       => \__( 'The page requested this file, but it was not found on disk — cannot measure it.', 'sgs-blocks' ),
				);
				continue;
			}

			$raw_contents = (string) \file_get_contents( $local ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- reading our own plugin's built asset off local disk, not a remote URL; wp_remote_get() does not apply here.
			$raw          = \strlen( $raw_contents );
			$gzip         = \strlen( (string) \gzencode( $raw_contents, 9 ) );

			$modules[] = array(
				'path'       => $rel,
				'bytes_raw'  => $raw,
				'bytes_gzip' => $gzip,
				'note'       => '',
			);

			$total_bytes_raw  += $raw;
			$total_bytes_gzip += $gzip;
		}

		$known_effects = self::known_effects();
		$skipped       = array();

		foreach ( \array_keys( $effects_in_markup ) as $effect ) {
			if ( ! isset( $known_effects[ $effect ] ) ) {
				$skipped[] = array(
					'effect' => $effect,
					'reason' => \__( 'Not recognised — this effect name is not in the generated effect registry (includes/generated-fx-effects.php). It appears in the rendered page but no motion module was ever enqueued for it, so it will never run. Regenerate the registry (scripts/generate-fx-effects-php.py) if this effect should exist.', 'sgs-blocks' ),
				);
			}
		}

		$authored = self::collect_authored_fx( \parse_blocks( (string) $post->post_content ) );
		foreach ( $authored as $entry ) {
			$effect = \strtolower( $entry['effect'] );
			if ( ! isset( $effects_in_markup[ $effect ] ) ) {
				$skipped[] = array(
					'effect' => $effect,
					'reason' => \sprintf(
						/* translators: %s: block name, e.g. sgs/heading */
						\__( 'Set on a %s block in the editor, but no matching data-sgs-fx attribute was found anywhere in the live rendered page — the effect never reached a visitor. Re-open the block, confirm the effect is still assigned, and re-save the page.', 'sgs-blocks' ),
						'' !== $entry['blockName'] ? $entry['blockName'] : \__( '(unknown block)', 'sgs-blocks' )
					),
				);
			}
		}

		if ( ! empty( $effects_in_markup ) && empty( $module_srcs ) ) {
			$skipped[] = array(
				'effect' => \__( '(every effect on this page)', 'sgs-blocks' ),
				'reason' => \__( 'This page carries motion-effect markup, but no motion module <script> tag was found in the response at all. The most likely cause: the deployed build is missing the module file(s) — SGS_Motion_Registry::register_modules() silently skips registering a module whose built file does not exist, so the effect renders but never animates. Run `npm run build` and redeploy.', 'sgs-blocks' ),
			);
		}

		return array(
			'effects_in_markup' => $effects_in_markup,
			'modules'           => $modules,
			'total_bytes_raw'   => $total_bytes_raw,
			'total_bytes_gzip'  => $total_bytes_gzip,
			'skipped'           => $skipped,
		);
	}

	/**
	 * Effect names present in rendered HTML, with occurrence counts.
	 *
	 * @param string $html Rendered HTML.
	 * @return array<string,int>
	 */
	private static function extract_effects_from_html( string $html ): array {
		$out = array();
		if ( ! \preg_match_all( '/data-sgs-fx="([a-z0-9-]+)"/i', $html, $matches ) ) {
			return $out;
		}
		foreach ( $matches[1] as $name ) {
			$name         = \strtolower( $name );
			$out[ $name ] = ( $out[ $name ] ?? 0 ) + 1;
		}
		return $out;
	}

	/**
	 * `<script type="module" src="…">` URLs found in rendered HTML.
	 *
	 * @param string $html Rendered HTML.
	 * @return string[]
	 */
	private static function extract_module_srcs( string $html ): array {
		/*
		 * ⛔ ATTRIBUTE ORDER IS NOT GUARANTEED, and assuming it was made this
		 * whole report read ZERO for every page since it was built.
		 *
		 * The previous pattern was:
		 *   /<script[^>]+type=["\']module["\'][^>]+src=["\']([^"\']+)["\']/i
		 * which requires `type="module"` to appear BEFORE `src=`. WordPress
		 * emits the opposite order — measured on the canary 2026-08-08:
		 *   <script id="@sgs/fx-scrub-js-module" src="…/fx-scrub.js?ver=…" type="module">
		 * so the pattern never matched, `modules` was always empty, and the
		 * page total was always 0 KB. A page carrying a real `scrub` effect and
		 * loading three motion modules reported "0 KB of a 50 KB budget".
		 *
		 * That is the "gate that cannot fail reads green forever" shape: the
		 * number was not merely wrong, it was UNFALSIFIABLE by inspection —
		 * 0 KB looks like a healthy result. It only surfaced because a positive
		 * control was built (a page authored WITH an effect) rather than
		 * trusting a zero from pages that happened to have no motion.
		 *
		 * Now: find every <script> tag, then require BOTH markers within it, in
		 * either order.
		 */
		if ( ! \preg_match_all( '/<script\b([^>]*)>/i', $html, $matches ) ) {
			return array();
		}

		$srcs = array();
		foreach ( $matches[1] as $attrs ) {
			if ( ! \preg_match( '/\btype=["\']module["\']/i', $attrs ) ) {
				continue;
			}
			if ( \preg_match( '/\bsrc=["\']([^"\']+)["\']/i', $attrs, $found ) ) {
				$srcs[] = $found[1];
			}
		}

		return \array_values( \array_unique( $srcs ) );
	}

	/**
	 * Map a script src URL back to a path relative to this plugin's root
	 * directory. Works regardless of scheme/host (a CDN in front of the site
	 * would rewrite both) because it locates the literal
	 * `wp-content/plugins/sgs-blocks/` marker rather than comparing against
	 * `SGS_BLOCKS_URL` directly.
	 *
	 * @param string $src Script src attribute value.
	 * @return string|null Relative path, or null if this isn't one of ours.
	 */
	private static function plugin_relative_path( string $src ): ?string {
		$marker = 'wp-content/plugins/sgs-blocks/';
		$pos    = \strpos( $src, $marker );
		if ( false === $pos ) {
			return null;
		}
		$rel = \substr( $src, $pos + \strlen( $marker ) );
		return \strtok( $rel, '?' );
	}

	/**
	 * True when a plugin-relative path sits under a watched motion-module
	 * directory (see WATCHED_URL_FRAGMENTS).
	 *
	 * @param string $rel Plugin-relative path.
	 * @return bool
	 */
	private static function is_watched_module( string $rel ): bool {
		foreach ( self::WATCHED_URL_FRAGMENTS as $fragment ) {
			if ( false !== \strpos( $rel, $fragment ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * The generated effect => plugin_set projection, read the SAME way
	 * `SGS_Motion_Registry::effects()` reads it — via its own public method,
	 * never by re-parsing `generated-fx-effects.php` a second time, so there
	 * is exactly one place this lookup can drift from the registry's own.
	 *
	 * @return array<string,array>
	 */
	private static function known_effects(): array {
		if ( \class_exists( __NAMESPACE__ . '\\SGS_Motion_Registry' )
			&& \method_exists( __NAMESPACE__ . '\\SGS_Motion_Registry', 'effects' ) ) {
			return SGS_Motion_Registry::effects();
		}
		return array();
	}

	/**
	 * Recursively collect every authored `fx` block attribute from a parsed
	 * block tree (mirrors `SGS_Motion_Registry::sniff_block()`'s own
	 * attribute-based signal, applied here to post_content rather than
	 * rendered output).
	 *
	 * @param array $blocks Parsed blocks (parse_blocks() output).
	 * @return array<int,array{effect:string,blockName:string}>
	 */
	private static function collect_authored_fx( array $blocks ): array {
		$out = array();
		foreach ( $blocks as $block ) {
			$fx = $block['attrs']['fx'] ?? '';
			if ( \is_string( $fx ) && '' !== $fx && 'none' !== $fx ) {
				$out[] = array(
					'effect'    => $fx,
					'blockName' => (string) ( $block['blockName'] ?? '' ),
				);
			}
			if ( ! empty( $block['innerBlocks'] ) && \is_array( $block['innerBlocks'] ) ) {
				$out = \array_merge( $out, self::collect_authored_fx( $block['innerBlocks'] ) );
			}
		}
		return $out;
	}

	/**
	 * Render the per-page budget summary (Step 19 / D448) — reported, and
	 * ALWAYS reported, whether over or under budget. This is deliberately not
	 * a pass/fail badge that only appears on failure: an operator should be
	 * able to see "comfortably under budget" just as easily as "over".
	 *
	 * @param array $result Output of analyse().
	 */
	private static function render_budget_summary( array $result ): void {
		$total  = (int) $result['total_bytes_gzip'];
		$budget = self::BUDGET_BYTES_GZIP;
		$pct    = $budget > 0 ? \round( ( $total / $budget ) * 100, 1 ) : 0.0;
		$over   = $total > $budget;

		$notice_class = $over ? 'notice-warning' : 'notice-success';

		echo '<h2>' . \esc_html__( 'Per-page motion bundle cost', 'sgs-blocks' ) . '</h2>';
		echo '<div class="notice ' . \esc_attr( $notice_class ) . ' inline"><p>';
		echo \esc_html(
			\sprintf(
				/* translators: 1: bytes used, 2: budget bytes, 3: percentage */
				\__( '%1$s KB gzip of a %2$s KB budget (%3$s%% of budget).', 'sgs-blocks' ),
				\number_format_i18n( \round( $total / 1024, 1 ), 1 ),
				\number_format_i18n( \round( $budget / 1024, 1 ), 1 ),
				\number_format_i18n( $pct, 1 )
			)
		);
		if ( $over ) {
			echo ' ' . \esc_html__( 'This page is OVER the Spec 02 per-page JS budget. This is a report, not a block — nothing stops the page from working. Consider whether every effect on it is pulling its weight.', 'sgs-blocks' );
		} else {
			echo ' ' . \esc_html__( 'Within budget.', 'sgs-blocks' );
		}
		echo '</p></div>';
	}

	/**
	 * Render the "effects in use" table.
	 *
	 * @param array $result Output of analyse().
	 */
	private static function render_effects_table( array $result ): void {
		echo '<h2>' . \esc_html__( 'Effects in use on this page', 'sgs-blocks' ) . '</h2>';

		if ( empty( $result['effects_in_markup'] ) ) {
			echo '<p>' . \esc_html__( 'No motion effect markup was found on this page.', 'sgs-blocks' ) . '</p>';
			return;
		}

		echo '<table class="widefat striped"><thead><tr>';
		echo '<th>' . \esc_html__( 'Effect', 'sgs-blocks' ) . '</th>';
		echo '<th>' . \esc_html__( 'Instances on page', 'sgs-blocks' ) . '</th>';
		echo '<th>' . \esc_html__( 'Recognised', 'sgs-blocks' ) . '</th>';
		echo '</tr></thead><tbody>';

		$known = self::known_effects();
		foreach ( $result['effects_in_markup'] as $effect => $count ) {
			echo '<tr>';
			echo '<td><code>' . \esc_html( $effect ) . '</code></td>';
			echo '<td>' . \esc_html( (string) $count ) . '</td>';
			echo '<td>' . ( isset( $known[ $effect ] ) ? \esc_html__( 'Yes', 'sgs-blocks' ) : '<strong>' . \esc_html__( 'No — see Skipped effects below', 'sgs-blocks' ) . '</strong>' ) . '</td>';
			echo '</tr>';
		}
		echo '</tbody></table>';
	}

	/**
	 * Render the modules + byte-cost table.
	 *
	 * @param array $result Output of analyse().
	 */
	private static function render_modules_table( array $result ): void {
		echo '<h2>' . \esc_html__( 'Motion modules shipped', 'sgs-blocks' ) . '</h2>';

		if ( empty( $result['modules'] ) ) {
			echo '<p>' . \esc_html__( 'No motion module scripts were loaded by this page.', 'sgs-blocks' ) . '</p>';
			return;
		}

		echo '<table class="widefat striped"><thead><tr>';
		echo '<th>' . \esc_html__( 'Module', 'sgs-blocks' ) . '</th>';
		echo '<th>' . \esc_html__( 'Raw bytes', 'sgs-blocks' ) . '</th>';
		echo '<th>' . \esc_html__( 'Gzip bytes', 'sgs-blocks' ) . '</th>';
		echo '<th>' . \esc_html__( 'Note', 'sgs-blocks' ) . '</th>';
		echo '</tr></thead><tbody>';

		foreach ( $result['modules'] as $module ) {
			echo '<tr>';
			echo '<td><code>' . \esc_html( $module['path'] ) . '</code></td>';
			echo '<td>' . ( null === $module['bytes_raw'] ? '—' : \esc_html( \number_format_i18n( $module['bytes_raw'] ) ) ) . '</td>';
			echo '<td>' . ( null === $module['bytes_gzip'] ? '—' : \esc_html( \number_format_i18n( $module['bytes_gzip'] ) ) ) . '</td>';
			echo '<td>' . \esc_html( $module['note'] ) . '</td>';
			echo '</tr>';
		}

		echo '<tr><td><strong>' . \esc_html__( 'Total', 'sgs-blocks' ) . '</strong></td>';
		echo '<td><strong>' . \esc_html( \number_format_i18n( $result['total_bytes_raw'] ) ) . '</strong></td>';
		echo '<td><strong>' . \esc_html( \number_format_i18n( $result['total_bytes_gzip'] ) ) . '</strong></td>';
		echo '<td></td></tr>';

		echo '</tbody></table>';
	}

	/**
	 * Render the "skipped effects" table — the whole point of Step 18.
	 *
	 * @param array $result Output of analyse().
	 */
	private static function render_skipped_table( array $result ): void {
		echo '<h2>' . \esc_html__( 'Skipped effects', 'sgs-blocks' ) . '</h2>';

		if ( empty( $result['skipped'] ) ) {
			echo '<p>' . \esc_html__( 'Nothing was skipped on this page.', 'sgs-blocks' ) . '</p>';
			return;
		}

		echo '<table class="widefat striped"><thead><tr>';
		echo '<th>' . \esc_html__( 'Effect', 'sgs-blocks' ) . '</th>';
		echo '<th>' . \esc_html__( 'Why it was skipped', 'sgs-blocks' ) . '</th>';
		echo '</tr></thead><tbody>';

		foreach ( $result['skipped'] as $row ) {
			echo '<tr>';
			echo '<td><code>' . \esc_html( $row['effect'] ) . '</code></td>';
			echo '<td>' . \esc_html( $row['reason'] ) . '</td>';
			echo '</tr>';
		}

		echo '</tbody></table>';
	}
}
