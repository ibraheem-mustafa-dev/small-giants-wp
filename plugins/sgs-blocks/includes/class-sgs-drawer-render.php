<?php
/**
 * Frontend render path for the Active menu drawer (W2-a, merged Spec 36+37 Wave 2).
 *
 * WHAT THIS IS, plainly: the slide-out panel a burger opens now lives on its own
 * edit screen (the `sgs_drawer` CPT). This class is what puts that panel onto a
 * real page — once, at the end of the document, and only when something on the
 * page actually has a burger to open it.
 *
 * WHY IT IS NOT A `pre_render_block` FILTER LIKE HEADER AND FOOTER.
 * {@see Sgs_Header_Rules::filter_template_part()} intercepts `core/template-part`
 * because a header and a footer each OWN a template-part slot. A drawer owns no
 * slot: in every one of the 8 header patterns it is a plain SIBLING placed after
 * `</sgs/site-header>` (see theme/sgs-theme/patterns/framework-header-default.php),
 * because its root is a `<dialog>` that promotes to the browser's top layer and
 * `sgs/site-header` is `templateLock:'all'` around exactly three rows (D393). There
 * is therefore no existing hook to mirror, and `wp_footer` is the correct
 * equivalent: document-end, once per page, after every burger has rendered.
 *
 * ORDERING IS PROVEN, NOT ASSUMED. Priority 5 is safe for the drawer's scoped CSS
 * because `class-sgs-css-registry.php` opens ONE whole-page output buffer on
 * `template_redirect` priority 0 and injects the consolidated CSS into the already
 * printed `<head>` when that buffer closes — which is AFTER the whole of
 * `wp_footer`. Late-enqueued block stylesheets are printed by core's own
 * `wp_footer` priority-20 callback, and script modules at priority 10, so both land
 * after this render too.
 *
 * NON-DESTRUCTIVE BY CONSTRUCTION. With no Active drawer pointer set,
 * {@see Sgs_Active_Layout::get_active_content()} returns '' and this class emits
 * nothing at all — so page output is byte-identical to the pre-CPT behaviour and
 * the 8 pattern-embedded drawers keep working untouched. `wp sgs drawer
 * clear-active` reverts the entire binding.
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
	 * The "a burger asked for a drawer" registry: every `drawerRef` a
	 * `sgs/nav-menu` emitted an `aria-controls` for on this request.
	 *
	 * Recorded rather than assumed because rendering the Active drawer on a page
	 * with no burger would add a `<dialog>` nothing can open — pure weight on
	 * every page. It is a SET of refs, not a bool, because W2-b's per-burger
	 * override needs the requested identities and this is its natural home: the
	 * same registry will carry post ids with no re-architecture.
	 *
	 * @var array<string,bool>
	 */
	private static $burger_refs = array();

	/**
	 * Per-request guard: has the `wp_footer` render already been attempted?
	 *
	 * Mirrors {@see Sgs_Active_Layout::$render_attempted} and exists for the same
	 * reason — the drawer's own post content contains a `sgs/nav-menu`, so
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
	 * COUNCIL FIX (ii). `Sgs_Active_Layout` documents that its statics reset
	 * naturally "because PHP processes terminate at the end of each request" and
	 * still exposes {@see Sgs_Active_Layout::reset_request_state()} as a seam. A
	 * fresh static with no such seam would carry stale state through anything that
	 * builds two pages in one process — a sitemap or feed loop, a test run, a
	 * WP-CLI batch. Same seam, same reason, so neither class is the odd one out.
	 */
	public static function reset_request_state(): void {
		self::$burger_refs      = array();
		self::$render_attempted = false;
	}

	/**
	 * Record that a burger on this page points at `$drawer_ref`.
	 *
	 * Called from `sgs/nav-menu`'s render.php, which always emits its burger
	 * markup (CSS decides visibility at `collapsePoint`, so the button exists in
	 * the DOM on every tier). Every nav-menu — header or footer — renders before
	 * `wp_footer`, so the flag is always set in time.
	 *
	 * @param string $drawer_ref Sanitised `<dialog>` id the burger controls.
	 */
	public static function note_burger( string $drawer_ref ): void {
		if ( '' === $drawer_ref ) {
			return;
		}
		self::$burger_refs[ $drawer_ref ] = true;
	}

	/**
	 * Did any burger on this request ask for a drawer?
	 *
	 * @return bool
	 */
	public static function has_burger(): bool {
		return ! empty( self::$burger_refs );
	}

	/**
	 * Render the Active drawer at the end of the document, at most once.
	 *
	 * Every branch below fails CLOSED — emits nothing and leaves the page exactly
	 * as it was — because the alternative to "no drawer" must never be "an empty
	 * `<dialog>` and no error" (the D338 silent-failure class).
	 *
	 * @return void
	 */
	public static function render_active_drawer(): void {
		if ( self::$render_attempted ) {
			return;
		}

		// COUNCIL FIX (iv), first half. `wp_footer` does not fire in the block
		// editor's ServerSideRender / block-renderer REST route at all
		// (class-sgs-css-registry.php:32-36), so a page being edited shows no
		// drawer in the canvas. That limitation is ACCEPTED and DECLARED (Bean,
		// 2026-07-30) rather than worked around; the operator-facing half is the
		// editor notice on the burger, wired through {@see self::editor_data()}.
		// This guard is belt-and-braces: it makes the fork explicit at the render
		// site instead of relying on a hook that happens not to fire.
		if ( ! sgs_is_frontend_render() ) {
			return;
		}

		// Lazy: a page with no burger keeps byte-identical output.
		if ( ! self::has_burger() ) {
			return;
		}

		// ── THE LANDMARK GUARD (council BLOCKER 3). ───────────────────────────
		// A drawer may ALREADY have painted on this page: the 8 header patterns
		// each embed a `sgs/nav-drawer` block, and both that block's `drawerRef`
		// and `sgs/nav-menu`'s default are the same string 'sgs-nav-drawer'
		// (nav-drawer/block.json, nav-menu/block.json). Rendering the Active CPT
		// drawer on top of one would put TWO `<dialog id="sgs-nav-drawer">`
		// elements in the DOM — a duplicate-id defect, emitted silently.
		//
		// The input for this guard did not exist until this commit: nav-drawer's
		// render.php had ZERO references to Sgs_Active_Layout, so the shared
		// registry was never marked by the ordinary block path and this check
		// would have read false on a page that had already painted a drawer. It
		// now calls mark_served( AREA_DRAWER ), mirroring the identical fix at
		// class-sgs-header-rules.php:253-258. Both halves ship together — the
		// guard is inert without the mark, and that is precisely the trap.
		if ( Sgs_Active_Layout::has_served( Sgs_Active_Layout::AREA_DRAWER ) ) {
			return;
		}

		$content = Sgs_Active_Layout::get_active_content( Sgs_Active_Layout::AREA_DRAWER );
		if ( '' === $content ) {
			return;
		}

		// ── COUNCIL FIX (iii) — WRITE-ORDERING IS LOAD-BEARING. ───────────────
		// Set the attempt guard BEFORE do_blocks(), exactly as
		// Sgs_Active_Layout::render_active() does at :159-165 and for the same
		// reason. The drawer's own content contains a `sgs/nav-menu`
		// (framework-header-default.php:42-45) and nav-menu's render.php has no
		// nesting check — the drawer-awareness that suppresses its burger is
		// EDITOR-only (nav-menu/edit.js). So do_blocks() below re-invokes
		// nav-menu, which calls note_burger() again, and the nested
		// `sgs/nav-drawer` calls mark_served() — both AFTER this callback already
		// consumed them. Setting the guard first makes that re-entry a no-op
		// instead of a second render. This is stated rather than left as a
		// mirrored line doing invisible work.
		self::$render_attempted = true;

		$html = (string) \do_blocks( $content );

		// Fail closed on an empty RENDER, not just on empty content — a published
		// drawer whose blocks all fail their render callbacks yields ''. Emitting
		// nothing is right here: the page keeps its burger, and the FR-36-9a
		// editor notice is what tells the operator the panel is missing.
		if ( '' === trim( $html ) ) {
			return;
		}

		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- do_blocks() output is trusted rendered block HTML, identical in provenance to Sgs_Active_Layout::render_active()'s return value.
		echo $html;
	}

	/**
	 * Editor-facing summary of the Active drawer, or null when there is none.
	 *
	 * COUNCIL FIX (iv), second half. Without this the CPT move would make the
	 * existing FR-36-9a notice LIE. That notice warns "there is no menu panel for
	 * it to open" whenever the editor canvas holds no `sgs/nav-drawer` block with
	 * a matching id — which, once the drawer lives in a CPT, is the NORMAL and
	 * CORRECT state for every ordinary page. The burger does open something; the
	 * panel simply is not in this post. So the editor needs to know the Active
	 * drawer exists, and the notice turns from a false warning into a true
	 * statement of where to go and edit it.
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
