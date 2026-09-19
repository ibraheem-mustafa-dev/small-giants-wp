<?php
/**
 * Frontend render path for the Active menu drawer.
 *
 * WHAT THIS IS, plainly: the slide-out panel a burger opens lives on its own
 * edit screen (the `sgs_drawer` CPT). This class is what puts that panel onto a
 * real page — once, at the end of the document, and only when something on the
 * page actually has a burger to open it.
 *
 * WHY IT IS NOT A `pre_render_block` FILTER LIKE HEADER AND FOOTER.
 * {@see Sgs_Header_Rules::filter_template_part()} intercepts `core/template-part`
 * because a header and a footer each OWN a template-part slot. A drawer owns no
 * slot: its root is a `<dialog>` that promotes to the browser's top layer, and
 * `sgs/site-header` is `templateLock:'all'` around exactly three rows, so the
 * drawer cannot live inside it. There is no template-part hook to mirror, and
 * `wp_footer` is the correct equivalent: document-end, once per page, after every
 * burger has rendered. A `sgs/nav-drawer` placed directly in content still renders
 * through the block path.
 *
 * ORDERING. Priority 5 is safe for the drawer's scoped CSS
 * because `class-sgs-css-registry.php` opens ONE whole-page output buffer on
 * `template_redirect` priority 0 and injects the consolidated CSS into the already
 * printed `<head>` when that buffer closes — which is AFTER the whole of
 * `wp_footer`. Late-enqueued block stylesheets are printed by core's own
 * `wp_footer` priority-20 callback, and script modules at priority 10, so both land
 * after this render too.
 *
 * NON-DESTRUCTIVE BY CONSTRUCTION. With no Active drawer pointer set,
 * {@see Sgs_Active_Layout::get_active_content()} returns '' and this class emits
 * nothing at all — so page output is unchanged, and any `sgs/nav-drawer` block
 * placed directly in content keeps rendering through the block path. `wp sgs
 * drawer clear-active` reverts the entire binding.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Drawer_Render
 *
 * Lazily renders the Active `sgs_drawer` post on `wp_footer`, guarded so that a
 * page which ALREADY painted a drawer never gets a second one.
 */
final class Sgs_Drawer_Render {

	/** `wp_footer` priority. See the ordering note in the file docblock. */
	private const FOOTER_PRIORITY = 5;

	/**
	 * The "a burger asked for a drawer" registry.
	 *
	 * Recorded rather than assumed because rendering a drawer on a page with no
	 * burger would add a `<dialog>` nothing can open — pure weight on every
	 * page. Keyed by the RAW `drawerRef` post id each `sgs/nav-bar-menu`
	 * instance carries: `0` means "no specific pick, fall back to the site
	 * Active drawer" (the single `Sgs_Active_Layout::AREA_DRAWER` pointer —
	 * see that class's `OPTION_DRAWER` docblock), a positive id means the
	 * operator picked a specific `sgs_drawer` post via the picker in
	 * `DropdownSettingsPanel.js`. Multiple distinct picks across burgers on one
	 * page are supported — {@see self::render_active_drawer()} dedupes the
	 * RESOLVED ids so each drawer post prints at most once.
	 *
	 * @var array<int,bool>
	 */
	private static $requested_post_ids = array();

	/**
	 * Per-request guard: has the `wp_footer` render already been attempted?
	 *
	 * Mirrors {@see Sgs_Active_Layout::$render_attempted} and exists for the same
	 * reason — the drawer's own post content can contain a `sgs/nav-bar-menu`, so
	 * `do_blocks()` below re-enters this class's registry mid-render.
	 *
	 * @var bool
	 */
	private static $render_attempted = false;

	/**
	 * Wire hooks. Call once from the plugin bootstrap AFTER Sgs_Active_Layout is
	 * loaded, since every read below resolves through it.
	 */
	public static function register(): void {
		\add_action( 'wp_footer', array( __CLASS__, 'render_active_drawer' ), self::FOOTER_PRIORITY );
	}

	/**
	 * Reset the per-request state.
	 *
	 * `Sgs_Active_Layout` documents that its statics reset
	 * naturally "because PHP processes terminate at the end of each request" and
	 * still exposes {@see Sgs_Active_Layout::reset_request_state()} as a seam. A
	 * fresh static with no such seam would carry stale state through anything that
	 * builds two pages in one process — a sitemap or feed loop, a test run, a
	 * WP-CLI batch. Same seam, same reason, so neither class is the odd one out.
	 */
	public static function reset_request_state(): void {
		self::$requested_post_ids = array();
		self::$render_attempted   = false;
	}

	/**
	 * Record that a burger on this page wants a drawer open.
	 *
	 * Called from `sgs/nav-bar-menu`'s render.php, which always emits its burger
	 * markup (CSS decides visibility at `collapsePoint`, so the button exists in
	 * the DOM on every tier). Every bar instance renders before `wp_footer`, so
	 * the registry is always populated in time.
	 *
	 * @param int $post_id The block's raw `drawerRef` attribute — a `sgs_drawer`
	 *                      post id, or `0` for "no specific pick".
	 */
	public static function note_burger( int $post_id = 0 ): void {
		self::$requested_post_ids[ $post_id ] = true;
	}

	/**
	 * Did any burger on this request ask for a drawer?
	 *
	 * @return bool
	 */
	public static function has_burger(): bool {
		return ! empty( self::$requested_post_ids );
	}

	/**
	 * Validated `sgs_drawer` post content, or '' when the id does not resolve
	 * to a published post of that type.
	 *
	 * Shared validation point for both the picker's render-time resolution
	 * ({@see self::drawer_ref_for()}) and the `wp_footer` print
	 * ({@see self::render_active_drawer()}) — a single fail-closed check,
	 * never two copies that could drift (R-31-9).
	 *
	 * @param int $post_id Candidate `sgs_drawer` post id.
	 * @return string Raw `post_content`, or ''.
	 */
	public static function get_drawer_post_content( int $post_id ): string {
		if ( $post_id <= 0 ) {
			return '';
		}
		$post = \get_post( $post_id );
		if ( ! $post instanceof \WP_Post ) {
			return '';
		}
		if ( Sgs_Block_CPTs::DRAWER_CPT !== $post->post_type ) {
			return '';
		}
		if ( 'publish' !== $post->post_status ) {
			return '';
		}
		return (string) $post->post_content;
	}

	/**
	 * The `<dialog>` id a burger should target for a given picked drawer post
	 * id.
	 *
	 * `$post_id` of `0` (no specific pick) falls back to the site's single
	 * Active-drawer pointer ({@see Sgs_Active_Layout::AREA_DRAWER}) — the SAME
	 * pointer every other AREA_DRAWER consumer reads, per that class's
	 * `OPTION_DRAWER` docblock (the burger carries a post id and falls back
	 * to this pointer, with no second store). Whatever post is resolved, the
	 * actual DOM id is read from ITS OWN `sgs/nav-drawer` block's `drawerRef`
	 * attribute (mirrors {@see self::active_drawer_ref()}'s resolution), so a
	 * picker choice always opens the panel it actually points at. Falls back to
	 * 'sgs-nav-drawer' — the block's default id — when nothing
	 * resolves, so an untouched instance (no pick, no Active drawer set)
	 * renders unchanged.
	 *
	 * @param int $post_id Raw `drawerRef` attribute value.
	 * @return string Resolved `<dialog>` id.
	 */
	public static function drawer_ref_for( int $post_id ): string {
		$resolved = $post_id > 0 ? $post_id : Sgs_Active_Layout::get_active_id( Sgs_Active_Layout::AREA_DRAWER );
		if ( 0 === $resolved ) {
			return 'sgs-nav-drawer';
		}
		$content = self::get_drawer_post_content( $resolved );
		if ( '' === $content ) {
			return 'sgs-nav-drawer';
		}
		$ref = self::find_drawer_ref( (array) \parse_blocks( $content ) );
		return '' !== $ref ? $ref : 'sgs-nav-drawer';
	}

	/**
	 * Render the Active drawer at the end of the document, at most once.
	 *
	 * Every branch below fails CLOSED — emits nothing and leaves the page exactly
	 * as it was — because the alternative to "no drawer" must never be "an empty
	 * `<dialog>` and no error" (a silent failure).
	 *
	 * @return void
	 */
	public static function render_active_drawer(): void {
		if ( self::$render_attempted ) {
			return;
		}

		// `wp_footer` does not fire in the block editor's ServerSideRender /
		// block-renderer REST route at all (see class-sgs-css-registry.php), so a
		// page being edited shows no drawer in the canvas. That limitation is
		// accepted rather than worked around; the operator-facing half is the
		// editor notice on the burger, wired through {@see self::editor_data()}.
		// This guard is belt-and-braces: it makes the fork explicit at the render
		// site instead of relying on a hook that happens not to fire.
		if ( ! sgs_is_frontend_render() ) {
			return;
		}

		// Lazy: a page with no burger emits nothing here.
		if ( ! self::has_burger() ) {
			return;
		}

		// ── THE LANDMARK GUARD. A drawer may ALREADY have painted on this page:
		// a `sgs/nav-drawer` block placed directly in content marks AREA_DRAWER
		// served the moment it renders. Printing a picked/Active drawer on top of
		// one would duplicate the `<dialog>` id — this guard stops that,
		// unconditionally, before this class resolves or prints anything of its
		// own.
		if ( Sgs_Active_Layout::has_served( Sgs_Active_Layout::AREA_DRAWER ) ) {
			return;
		}

		// ── WRITE-ORDERING IS LOAD-BEARING. ───────────────────────────────────
		// Set the attempt guard BEFORE do_blocks(), exactly as
		// Sgs_Active_Layout::render_active() does and for the same reason: a
		// picked drawer's own content may contain a `sgs/nav-bar-menu` (a burger
		// nested inside a drawer), whose render.php would call note_burger()
		// again and whose nested `sgs/nav-drawer` would call mark_served() —
		// both AFTER this callback already consumed them. Setting the guard
		// first makes that re-entry a no-op instead of a second render.
		self::$render_attempted = true;

		// Resolve each requested pick to a concrete, VALIDATED post id. `0`
		// (no specific pick, the default) falls back to the site's single
		// Active-drawer pointer — the same one every other AREA_DRAWER consumer
		// reads (no second store). Distinct picks across multiple burgers on one
		// page are deduped by resolved id, so the same drawer post never prints
		// twice even when two burgers point at it.
		$resolved_ids = array();
		foreach ( array_keys( self::$requested_post_ids ) as $post_id ) {
			$resolved = $post_id > 0 ? $post_id : Sgs_Active_Layout::get_active_id( Sgs_Active_Layout::AREA_DRAWER );
			if ( $resolved > 0 ) {
				$resolved_ids[ $resolved ] = true;
			}
		}
		if ( empty( $resolved_ids ) ) {
			return;
		}

		$served_any = false;
		foreach ( array_keys( $resolved_ids ) as $post_id ) {
			$content = self::get_drawer_post_content( $post_id );
			if ( '' === $content ) {
				continue;
			}

			$html = (string) \do_blocks( $content );

			// Fail closed on an empty RENDER, not just on empty content — a
			// published drawer whose blocks all fail their render callbacks
			// yields ''. Emitting nothing is right here: the page keeps its
			// burger, and the FR-36-9a editor notice is what tells the operator
			// the panel is missing.
			if ( '' === trim( $html ) ) {
				continue;
			}

			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- do_blocks() output is trusted rendered block HTML, identical in provenance to Sgs_Active_Layout::render_active()'s return value.
			echo $html;
			$served_any = true;
		}

		if ( $served_any ) {
			Sgs_Active_Layout::mark_served( Sgs_Active_Layout::AREA_DRAWER );
		}
	}

	/**
	 * Editor-facing summary of the Active drawer, or null when there is none.
	 *
	 * Without this the FR-36-9a notice would be false. That notice warns "there is
	 * no menu panel for it to open" whenever the editor canvas holds no
	 * `sgs/nav-drawer` block with a matching id — which, with the drawer living in
	 * a CPT, is the NORMAL and CORRECT state for every ordinary page. The burger
	 * does open something; the panel simply is not in this post. So the editor
	 * needs to know the Active drawer exists, and the notice states where to go
	 * and edit it.
	 *
	 * Reads the VALIDATED id: a trashed or unpublished drawer must not be reported
	 * as one the burger will open, because it will not.
	 *
	 * `ref` is the crux and is why this returns more than an id. A burger opens a
	 * drawer BY ELEMENT ID, so "an Active drawer exists" is NOT the same claim as
	 * "this burger will open it" — a drawer whose `drawerRef` differs from the
	 * burger's still opens nothing. Reporting the Active drawer's own ref lets the
	 * notice state which of those two is true instead of assuming the happy one.
	 *
	 * @return array{id:int,title:string,ref:string,editUrl:string}|null
	 */
	public static function editor_data(): ?array {
		$post_id = Sgs_Active_Layout::get_active_id( Sgs_Active_Layout::AREA_DRAWER );
		if ( 0 === $post_id ) {
			return null;
		}

		$title = \get_the_title( $post_id );

		return array(
			'id'      => $post_id,
			'title'   => '' !== $title ? $title : \__( '(no title)', 'sgs-blocks' ),
			'ref'     => self::active_drawer_ref(),
			'editUrl' => (string) \get_edit_post_link( $post_id, 'raw' ),
		);
	}

	/**
	 * The `<dialog>` id the Active drawer will actually render with, or ''.
	 *
	 * Resolved by parsing the post's own block markup rather than storing it
	 * separately: the block's attribute IS the source of truth, and a second copy
	 * in post meta could drift out of sync with it — the same reasoning that keeps
	 * the Active pointer a single option rather than per-post meta
	 * ({@see Sgs_Active_Layout::set_active()}).
	 *
	 * Mirrors the render-side default exactly (`nav-drawer/render.php`: an empty or
	 * absent `drawerRef` falls back to 'sgs-nav-drawer'), because a blank-versus-
	 * default pair would otherwise read as a mismatch when it is not.
	 *
	 * @return string
	 */
	private static function active_drawer_ref(): string {
		$content = Sgs_Active_Layout::get_active_content( Sgs_Active_Layout::AREA_DRAWER );
		if ( '' === $content ) {
			return '';
		}

		return self::find_drawer_ref( (array) \parse_blocks( $content ) );
	}

	/**
	 * Depth-first search for the first `sgs/nav-drawer` block's resolved ref.
	 *
	 * Recursive because the drawer block need not be top level in the post — an
	 * operator may have wrapped it, and a starter pattern may nest it.
	 *
	 * @param array<int,array<string,mixed>> $blocks Parsed blocks.
	 * @return string Resolved ref, or '' when the post contains no drawer block.
	 */
	private static function find_drawer_ref( array $blocks ): string {
		foreach ( $blocks as $block ) {
			if ( ! is_array( $block ) ) {
				continue;
			}

			if ( 'sgs/nav-drawer' === ( $block['blockName'] ?? '' ) ) {
				$raw = isset( $block['attrs']['drawerRef'] ) ? trim( (string) $block['attrs']['drawerRef'] ) : '';
				$ref = '' !== $raw ? \sanitize_html_class( $raw ) : 'sgs-nav-drawer';
				return '' !== $ref ? $ref : 'sgs-nav-drawer';
			}

			if ( ! empty( $block['innerBlocks'] ) && is_array( $block['innerBlocks'] ) ) {
				$nested = self::find_drawer_ref( $block['innerBlocks'] );
				if ( '' !== $nested ) {
					return $nested;
				}
			}
		}

		return '';
	}
}
