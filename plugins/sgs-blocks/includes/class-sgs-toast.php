<?php
/**
 * SGS Toast — the ONE shared transient feedback surface.
 *
 * Emits a single page-level toast region in `wp_footer`, server-rendered so
 * its Interactivity directives hydrate (a region created from JS after the
 * runtime has booted never does). Every add-to-bag surface writes into this
 * one region through `src/shared/toast/store.js` (`store( 'sgs/toast' )`)
 * instead of carrying its own inline status strip.
 *
 * Opt-in, not unconditional: a block that can produce toast messages calls
 * {@see self::request()} during its own render, and only then does the
 * footer emit the region and enqueue the stylesheet. A page with no
 * toast-capable block pays nothing.
 *
 * NOT a block. There is nothing for an operator to place, configure or
 * delete — it is chrome owned by the surfaces that feed it, and exactly one
 * instance per document is the whole point.
 *
 * Deliberately not `sgs/notice-banner`: that block is an author-placed,
 * server-rendered banner with `role="note"`/`role="banner"`, no live region,
 * no auto-close, no action slot, and a dismissal that PERSISTS to
 * session/localStorage for 365 days. A toast needs a runtime-created
 * message, a polite live region, a timed close and a transient dismissal.
 * Its variant colour tokens and 44px close-button sizing are reused here
 * (assets/toast/toast.css) so the two surfaces look like one system.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Toast
 *
 * Static entry point — call {@see self::register()} from the plugin bootstrap.
 */
final class Sgs_Toast {

	/**
	 * True once a rendering block has asked for the toast region.
	 *
	 * @var bool
	 */
	private static $requested = false;

	/**
	 * Wire WP hooks. Safe to call from the sgs-blocks.php bootstrap.
	 */
	public static function register(): void {
		\add_action( 'wp_footer', array( __CLASS__, 'render' ), 5 );
	}

	/**
	 * Ask for the toast region on this page load.
	 *
	 * Called from the render.php of every block whose frontend can produce a
	 * toast message. Idempotent — any number of blocks may ask.
	 */
	public static function request(): void {
		self::$requested = true;
	}

	/**
	 * Whether the region will be emitted in the footer.
	 *
	 * @return bool
	 */
	public static function is_requested(): bool {
		return self::$requested;
	}

	/**
	 * The bag URL the "View bag" action points at.
	 *
	 * WooCommerce supplies `wc_get_cart_url()` when active; the `/cart` path
	 * is the same fallback `src/blocks/cart/render.php` uses, so both
	 * surfaces agree on where the bag lives.
	 *
	 * @return string Escaped URL.
	 */
	private static function bag_url(): string {
		$url = \function_exists( 'wc_get_cart_url' )
			? \wc_get_cart_url()
			: \home_url( '/cart' );

		return \esc_url( $url );
	}

	/**
	 * One variant icon, or an empty string when the icon library is absent.
	 *
	 * Same per-variant Lucide defaults `sgs/notice-banner` uses for its
	 * success and error variants.
	 *
	 * @param string $slug Lucide icon slug.
	 * @return string SVG markup.
	 */
	private static function icon( string $slug ): string {
		if ( ! \function_exists( 'sgs_get_lucide_icon' ) ) {
			return '';
		}

		return (string) \sgs_get_lucide_icon( $slug );
	}

	/**
	 * Emit the toast region.
	 *
	 * The region stays in the DOM from first paint: the message paragraph is
	 * the live region, and a live region only announces changes made while
	 * it is already present and unhidden.
	 *
	 * `role="status"` sits on the message paragraph, NOT on the wrapper, so
	 * the announcement is exactly the message sentence — the "View bag" link
	 * and the close button are inside the wrapper and would otherwise be
	 * read as part of every announcement. They are still reachable by Tab
	 * and by screen-reader navigation.
	 *
	 * The wrapper is never `display:none`/`visibility:hidden`/`hidden` (any
	 * of those would drop the live region out of the accessibility tree and
	 * silence it). It hides visually through opacity and `pointer-events`,
	 * and its two focusable controls carry a bound `hidden` attribute so a
	 * keyboard user can never tab into an invisible toast.
	 */
	public static function render(): void {
		if ( ! self::$requested || \is_admin() ) {
			return;
		}

		\wp_enqueue_style(
			'sgs-toast',
			\plugins_url( 'assets/toast/toast.css', \dirname( __DIR__ ) . '/sgs-blocks.php' ),
			array(),
			SGS_BLOCKS_VERSION
		);

		$success_icon = self::icon( 'circle-check' );
		$error_icon   = self::icon( 'circle-x' );
		?>
		<div
			class="sgs-toast"
			data-wp-interactive="sgs/toast"
			data-wp-class--sgs-toast--visible="state.isVisible"
			data-wp-class--sgs-toast--success="state.isSuccess"
			data-wp-class--sgs-toast--error="state.isError"
			data-wp-class--sgs-toast--animated="state.isAnimated"
			data-wp-on--mouseenter="actions.pointerIn"
			data-wp-on--mouseleave="actions.pointerOut"
			data-wp-on--focusin="actions.focusIn"
			data-wp-on--focusout="actions.focusOut"
		>
			<span class="sgs-toast__icon sgs-toast__icon--success" aria-hidden="true" data-wp-bind--hidden="state.isNotSuccess">
				<?php echo $success_icon; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static Lucide SVG from includes/lucide-icons.php. ?>
			</span>
			<span class="sgs-toast__icon sgs-toast__icon--error" aria-hidden="true" data-wp-bind--hidden="state.isNotError">
				<?php echo $error_icon; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static Lucide SVG from includes/lucide-icons.php. ?>
			</span>
			<p
				class="sgs-toast__message"
				role="status"
				aria-live="polite"
				aria-atomic="true"
				data-wp-text="state.message"
			></p>
			<a
				class="sgs-toast__action"
				href="<?php echo self::bag_url(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- esc_url'd in bag_url(). ?>"
				data-wp-bind--hidden="state.isActionHidden"
			><?php esc_html_e( 'View bag', 'sgs-blocks' ); ?></a>
			<button
				type="button"
				class="sgs-toast__close"
				aria-label="<?php esc_attr_e( 'Close message', 'sgs-blocks' ); ?>"
				data-wp-on--click="actions.close"
				data-wp-bind--hidden="state.isHidden"
			>
				<svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
			</button>
		</div>
		<?php
	}
}
