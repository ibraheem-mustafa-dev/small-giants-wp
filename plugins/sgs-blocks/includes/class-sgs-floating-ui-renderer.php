<?php
/**
 * SGS Floating UI — Frontend renderer.
 *
 * Reads the Customiser option values from wp_options and emits the back-to-top
 * button and reading-progress bar HTML + inline CSS custom properties in
 * `wp_footer`. Enqueues the shared JS + CSS only when at least one element is
 * enabled — zero frontend cost when both are disabled.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Floating_UI_Renderer
 *
 * Static entry point — call {@see self::register()} from the plugin bootstrap.
 */
final class Sgs_Floating_UI_Renderer {

	/**
	 * Wire WP hooks. Safe to call from sgs-blocks.php bootstrap.
	 */
	public static function register(): void {
		\add_action( 'wp_footer', array( __CLASS__, 'render' ) );
	}

	// ── Public render method ─────────────────────────────────────────────────

	/**
	 * Emit the floating UI HTML (back-to-top + reading-progress) in the footer.
	 *
	 * Reads each setting individually from wp_options using the same option keys
	 * as {@see Sgs_Floating_UI_Customiser}. Returns early (no output, no assets)
	 * when both elements are disabled.
	 */
	public static function render(): void {
		$btt_enabled = (bool) \get_option( Sgs_Floating_UI_Customiser::OPT_BTT_ENABLED, false );
		$rp_enabled  = (bool) \get_option( Sgs_Floating_UI_Customiser::OPT_RP_ENABLED, false );

		if ( ! $btt_enabled && ! $rp_enabled ) {
			return; // Nothing to render — skip asset enqueue entirely.
		}

		// -- Enqueue shared assets -------------------------------------------
		\wp_enqueue_style(
			'sgs-floating-ui',
			\plugins_url( 'assets/floating-ui/floating-ui.css', \dirname( __DIR__ ) . '/sgs-blocks.php' ),
			array(),
			SGS_BLOCKS_VERSION
		);
		\wp_enqueue_script(
			'sgs-floating-ui',
			\plugins_url( 'assets/floating-ui/floating-ui.js', \dirname( __DIR__ ) . '/sgs-blocks.php' ),
			array(),
			SGS_BLOCKS_VERSION,
			true
		);

		// -- Resolve colours and options -------------------------------------
		$raw_btt_bg = \sanitize_hex_color( (string) \get_option( Sgs_Floating_UI_Customiser::OPT_BTT_BG, Sgs_Floating_UI_Customiser::DEFAULT_BTT_BG ) );
		$btt_bg     = ( null !== $raw_btt_bg && '' !== $raw_btt_bg ) ? $raw_btt_bg : Sgs_Floating_UI_Customiser::DEFAULT_BTT_BG;

		$raw_btt_icon = \sanitize_hex_color( (string) \get_option( Sgs_Floating_UI_Customiser::OPT_BTT_ICON, Sgs_Floating_UI_Customiser::DEFAULT_BTT_ICON ) );
		$btt_icon     = ( null !== $raw_btt_icon && '' !== $raw_btt_icon ) ? $raw_btt_icon : Sgs_Floating_UI_Customiser::DEFAULT_BTT_ICON;

		$btt_pos = Sgs_Floating_UI_Customiser::sanitise_position( \get_option( Sgs_Floating_UI_Customiser::OPT_BTT_POSITION, Sgs_Floating_UI_Customiser::DEFAULT_BTT_POSITION ) );

		$raw_rp_colour = \sanitize_hex_color( (string) \get_option( Sgs_Floating_UI_Customiser::OPT_RP_COLOUR, Sgs_Floating_UI_Customiser::DEFAULT_RP_COLOUR ) );
		$rp_colour     = ( null !== $raw_rp_colour && '' !== $raw_rp_colour ) ? $raw_rp_colour : Sgs_Floating_UI_Customiser::DEFAULT_RP_COLOUR;
		$rp_height     = Sgs_Floating_UI_Customiser::sanitise_height( \get_option( Sgs_Floating_UI_Customiser::OPT_RP_HEIGHT, Sgs_Floating_UI_Customiser::DEFAULT_RP_HEIGHT ) );

		// -- CSS custom properties wrapper -----------------------------------
		?>
		<div class="sgs-floating-ui" aria-hidden="true">
			<style>
				.sgs-floating-ui {
					--btt-bg:     <?php echo \esc_attr( $btt_bg ); ?>;
					--btt-icon:   <?php echo \esc_attr( $btt_icon ); ?>;
					--btt-pos:    <?php echo \esc_attr( $btt_pos ); ?>;
					--rp-colour:  <?php echo \esc_attr( $rp_colour ); ?>;
					--rp-height:  <?php echo \esc_attr( (string) $rp_height ); ?>px;
				}
			</style>

			<?php if ( $rp_enabled ) : ?>
			<div
				class="sgs-floating-ui__reading-progress"
				role="progressbar"
				aria-label="<?php \esc_attr_e( 'Reading progress', 'sgs-blocks' ); ?>"
				aria-valuenow="0"
				aria-valuemin="0"
				aria-valuemax="100"
			></div>
			<?php endif; ?>

			<?php if ( $btt_enabled ) : ?>
			<button
				class="sgs-floating-ui__back-to-top sgs-floating-ui__back-to-top--<?php echo \esc_attr( $btt_pos ); ?>"
				type="button"
				aria-label="<?php \esc_attr_e( 'Back to top', 'sgs-blocks' ); ?>"
				aria-hidden="true"
				hidden
			>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="20" height="20">
					<path d="M12 4l-8 8h5v8h6v-8h5z" fill="currentColor"/>
				</svg>
			</button>
			<?php endif; ?>
		</div>
		<?php
	}
}
