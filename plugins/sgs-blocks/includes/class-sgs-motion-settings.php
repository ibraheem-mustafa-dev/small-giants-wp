<?php
/**
 * SGS → Motion settings page (Spec 38 §7 / FR-38-18, D422).
 *
 * Site-LEVEL motion capabilities live here rather than in a block inspector,
 * because they describe the whole site and there is no block to attach them to.
 * Spec 38 §7 is explicit about that placement.
 *
 * One option row holds every site-level motion setting
 * (`sgs_motion_settings`), so adding page transitions later is a new key
 * rather than a second option and a second sanitiser.
 *
 * Read-side defaulting lives on {@see SGS_Motion_Registry::settings()} — the
 * frontend must never depend on this admin class being loaded.
 *
 * @package SGS\Blocks
 * @since   1.18.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Settings
 */
final class Sgs_Motion_Settings {

	const OPTION_KEY = 'sgs_motion_settings';
	const PAGE_SLUG  = 'sgs-motion';
	const CAP        = 'manage_options';

	/**
	 * Wire hooks.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'admin_init', array( __CLASS__, 'register_setting' ) );
		\add_action( 'admin_menu', array( __CLASS__, 'add_page' ), 20 );
		\add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue_admin_assets' ) );
	}

	/**
	 * Page hook returned by add_submenu_page(), so the dependent-control script
	 * loads on THIS screen only rather than across wp-admin.
	 *
	 * @var string
	 */
	private static $page_hook = '';

	/**
	 * Enqueue the dependent-control script on this settings screen only.
	 *
	 * @param string $hook Current admin page hook.
	 * @return void
	 */
	public static function enqueue_admin_assets( string $hook ): void {
		if ( '' === self::$page_hook || $hook !== self::$page_hook ) {
			return;
		}

		$rel = 'assets/admin/motion-settings.js';
		if ( ! \file_exists( SGS_BLOCKS_PATH . $rel ) ) {
			return;
		}

		\wp_enqueue_script(
			'sgs-motion-settings',
			SGS_BLOCKS_URL . $rel,
			array(),
			SGS_BLOCKS_VERSION,
			true
		);
	}

	/**
	 * Register the option with a strict sanitiser.
	 *
	 * @return void
	 */
	public static function register_setting(): void {
		\register_setting(
			'sgs_motion',
			self::OPTION_KEY,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( __CLASS__, 'sanitise' ),
				'default'           => array(
					'smooth_scroll'          => false,
					'smooth_scroll_strength' => 3,
				),
			)
		);
	}

	/**
	 * Sanitise the whole settings array.
	 *
	 * An absent checkbox is how HTML says "off", so `smooth_scroll` is derived
	 * from presence, never from a submitted falsy value. Strength is clamped to
	 * the 1–5 the control offers — a value outside it could only arrive from a
	 * hand-crafted POST or WP-CLI, and the frontend maps it into a physics
	 * constant, so it is clamped rather than trusted.
	 *
	 * @param mixed $value Submitted value.
	 * @return array
	 */
	public static function sanitise( $value ): array {
		$value = \is_array( $value ) ? $value : array();

		$strength = isset( $value['smooth_scroll_strength'] )
			? (int) $value['smooth_scroll_strength']
			: 3;

		if ( $strength < 1 || $strength > 5 ) {
			$strength = 3;
		}

		return array(
			'smooth_scroll'          => ! empty( $value['smooth_scroll'] ),
			'smooth_scroll_strength' => $strength,
		);
	}

	/**
	 * Add the submenu page under the SGS menu.
	 *
	 * @return void
	 */
	public static function add_page(): void {
		self::$page_hook = (string) \add_submenu_page(
			'sgs',
			\__( 'Motion', 'sgs-blocks' ),
			\__( 'Motion', 'sgs-blocks' ),
			self::CAP,
			self::PAGE_SLUG,
			array( __CLASS__, 'render_page' )
		);
	}

	/**
	 * Render the settings page.
	 *
	 * @return void
	 */
	public static function render_page(): void {
		if ( ! \current_user_can( self::CAP ) ) {
			\wp_die(
				\esc_html__( 'You do not have permission to access this page.', 'sgs-blocks' ),
				'',
				array( 'response' => 403 )
			);
		}

		$settings = SGS_Motion_Registry::settings();
		?>
		<div class="wrap">
			<h1><?php \esc_html_e( 'SGS — Motion', 'sgs-blocks' ); ?></h1>

			<form method="post" action="options.php">
				<?php \settings_fields( 'sgs_motion' ); ?>

				<h2><?php \esc_html_e( 'Smooth scrolling', 'sgs-blocks' ); ?></h2>
				<p style="max-width:46rem">
					<?php \esc_html_e( 'Gives scrolling a slight weight, so the page eases to a stop instead of stopping dead. It is the effect used on high-end agency sites. Off by default — when it is off, none of its code is sent to the browser at all.', 'sgs-blocks' ); ?>
				</p>

				<table class="form-table" role="presentation">
					<tbody>
						<tr>
							<th scope="row"><?php \esc_html_e( 'Smooth scrolling', 'sgs-blocks' ); ?></th>
							<td>
								<label>
									<input
										type="checkbox"
										id="sgs-smooth-scroll-toggle"
										name="<?php echo \esc_attr( self::OPTION_KEY ); ?>[smooth_scroll]"
										value="1"
										<?php \checked( true, $settings['smooth_scroll'] ); ?>
									/>
									<?php \esc_html_e( 'Turn on smooth scrolling for this site', 'sgs-blocks' ); ?>
								</label>
							</td>
						</tr>
						<tr>
							<th scope="row">
								<label for="sgs-smooth-strength"><?php \esc_html_e( 'Strength', 'sgs-blocks' ); ?></label>
							</th>
							<td>
								<input
									type="range"
									id="sgs-smooth-strength"
									name="<?php echo \esc_attr( self::OPTION_KEY ); ?>[smooth_scroll_strength]"
									min="1"
									max="5"
									step="1"
									value="<?php echo \esc_attr( (string) $settings['smooth_scroll_strength'] ); ?>"
								/>
								<p class="description" style="max-width:44rem">
									<?php \esc_html_e( '1 is barely noticeable, 5 is heavy and cinematic. 3 is the recommended starting point. Heavier settings feel more dramatic but can feel sluggish to visitors who scroll quickly.', 'sgs-blocks' ); ?>
								</p>
							</td>
						</tr>
					</tbody>
				</table>

				<h2><?php \esc_html_e( 'Who does not get this', 'sgs-blocks' ); ?></h2>
				<p style="max-width:46rem">
					<?php \esc_html_e( 'Smooth scrolling is switched off automatically, with no action needed from you, for: visitors whose device asks for reduced motion (a health setting people use for motion sickness and migraine); the block editor and all admin screens; and touch devices, which keep their own native scrolling because that is what phone users expect. Your header, anchor links and in-page search are unaffected.', 'sgs-blocks' ); ?>
				</p>

				<?php \submit_button(); ?>
			</form>
		</div>
		<?php
	}
}
