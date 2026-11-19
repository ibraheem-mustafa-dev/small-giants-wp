<?php
/**
 * SGS → CSS Output settings page.
 *
 * Two choices, both about delivery only (the same CSS reaches the page either way): where the page-specific
 * per-instance CSS goes (Spec 32 FR-32-11, `sgs_css_output_mode`) and how the shared block, theme and plugin
 * stylesheets arrive (FR-32-32, `sgs_css_shared_delivery`, printed by `class-sgs-css-delivery.php`).
 *
 * @package SGS\Blocks
 * @since   1.17.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Css_Output_Settings
 *
 * Registers the `sgs_css_output_mode` and `sgs_css_shared_delivery` options and a submenu under the SGS menu.
 */
final class Css_Output_Settings {

	const OPTION_KEY    = 'sgs_css_output_mode';
	const SHARED_OPTION = Css_Delivery::OPTION;
	const PAGE_SLUG     = 'sgs-css-output';

	/**
	 * Wire hooks.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'admin_init', array( __CLASS__, 'register_setting' ) );
		\add_action( 'admin_menu', array( __CLASS__, 'add_page' ), 20 );
	}

	/**
	 * Register both options with strict sanitisers.
	 *
	 * @return void
	 */
	public static function register_setting(): void {
		\register_setting(
			'sgs_css_output',
			self::OPTION_KEY,
			array(
				'type'              => 'string',
				'sanitize_callback' => array( __CLASS__, 'sanitise_mode' ),
				'default'           => 'head',
			)
		);
		\register_setting(
			'sgs_css_output',
			self::SHARED_OPTION,
			array(
				'type'              => 'string',
				'sanitize_callback' => array( __CLASS__, 'sanitise_shared' ),
				'default'           => Css_Delivery::DEFAULT_MODE,
			)
		);
	}

	/**
	 * Only 'file' or 'head' are valid; anything else is 'head'.
	 *
	 * @param mixed $value Submitted value.
	 * @return string
	 */
	public static function sanitise_mode( $value ): string {
		return ( 'file' === $value ) ? 'file' : 'head';
	}

	/**
	 * Only the delivery modes Css_Delivery accepts; anything else is its default.
	 *
	 * @param mixed $value Submitted value.
	 * @return string
	 */
	public static function sanitise_shared( $value ): string {
		return \in_array( $value, Css_Delivery::MODES, true ) ? (string) $value : Css_Delivery::DEFAULT_MODE;
	}

	/**
	 * Add the submenu page under the SGS menu.
	 *
	 * @return void
	 */
	public static function add_page(): void {
		\add_submenu_page(
			'sgs',
			\__( 'CSS Output', 'sgs-blocks' ),
			\__( 'CSS Output', 'sgs-blocks' ),
			'manage_options',
			self::PAGE_SLUG,
			array( __CLASS__, 'render_page' )
		);
	}

	/**
	 * Print one radio choice.
	 *
	 * @param string $name    Option name.
	 * @param string $value   This choice's value.
	 * @param string $current The saved value.
	 * @param string $label   Bold label.
	 * @param string $help    Explanation under the label.
	 * @return void
	 */
	private static function choice( string $name, string $value, string $current, string $label, string $help ): void {
		?>
		<label style="display:block;margin-bottom:12px">
			<input type="radio" name="<?php echo \esc_attr( $name ); ?>" value="<?php echo \esc_attr( $value ); ?>" <?php \checked( $value, $current ); ?> />
			<strong><?php echo \esc_html( $label ); ?></strong><br>
			<span style="margin-left:24px;display:block;max-width:44rem;color:#555"><?php echo \esc_html( $help ); ?></span>
		</label>
		<?php
	}

	/**
	 * Render the settings page.
	 *
	 * @return void
	 */
	public static function render_page(): void {
		if ( ! \current_user_can( 'manage_options' ) ) {
			\wp_die( \esc_html__( 'You do not have permission to access this page.', 'sgs-blocks' ), '', array( 'response' => 403 ) );
		}
		$mode   = self::sanitise_mode( \get_option( self::OPTION_KEY, 'head' ) );
		$shared = self::sanitise_shared( \get_option( self::SHARED_OPTION, Css_Delivery::DEFAULT_MODE ) );
		?>
		<div class="wrap">
			<h1><?php \esc_html_e( 'SGS — CSS Output', 'sgs-blocks' ); ?></h1>
			<p style="max-width:46rem">
				<?php \esc_html_e( 'These settings change only how the styling reaches the page, never how the page looks. The defaults give the fastest first paint without any optimisation plugin.', 'sgs-blocks' ); ?>
			</p>

			<form method="post" action="options.php">
				<?php \settings_fields( 'sgs_css_output' ); ?>
				<table class="form-table" role="presentation">
					<tbody>
						<tr>
							<th scope="row"><?php \esc_html_e( 'Page styling (this page’s block settings)', 'sgs-blocks' ); ?></th>
							<td>
								<fieldset>
									<?php
									self::choice( self::OPTION_KEY, 'head', $mode, \__( 'In the page (recommended)', 'sgs-blocks' ), \__( 'Written into the page head. It is different on every page, so a separate file would only add a request.', 'sgs-blocks' ) );
									self::choice( self::OPTION_KEY, 'file', $mode, \__( 'Separate file', 'sgs-blocks' ), \__( 'One cached .css file per page, linked in the head. The browser waits for it before showing the page.', 'sgs-blocks' ) );
									?>
								</fieldset>
							</td>
						</tr>
						<tr>
							<th scope="row"><?php \esc_html_e( 'Shared styling (blocks, theme and plugins)', 'sgs-blocks' ); ?></th>
							<td>
								<fieldset>
									<?php
									self::choice( self::SHARED_OPTION, 'inline', $shared, \__( 'In the page (recommended)', 'sgs-blocks' ), \__( 'Every stylesheet the page uses is written into the page head in its usual order, so nothing but the page itself has to load before it shows.', 'sgs-blocks' ) );
									self::choice( self::SHARED_OPTION, 'bundle', $shared, \__( 'One combined file', 'sgs-blocks' ), \__( 'The stylesheets are combined, in their usual order, into one cached file: one request instead of one per stylesheet. Each page is smaller, but a first visit waits for the file, which is reused only by pages with the same blocks.', 'sgs-blocks' ) );
									self::choice( self::SHARED_OPTION, 'links', $shared, \__( 'Separate files (WordPress default)', 'sgs-blocks' ), \__( 'One stylesheet link per block type and asset, exactly as WordPress prints them. Use only to compare, or when another plugin needs the separate files.', 'sgs-blocks' ) );
									?>
								</fieldset>
							</td>
						</tr>
					</tbody>
				</table>
				<?php \submit_button(); ?>
			</form>

			<p style="max-width:46rem;color:#555">
				<em><?php \esc_html_e( 'Do not switch on a plugin’s “load CSS asynchronously”, “critical CSS” or “remove unused CSS” setting on top of these: those settings delay or drop styling that menus, drawers and shop pages need, which shows as a flash of unstyled or broken layout.', 'sgs-blocks' ); ?></em>
			</p>
		</div>
		<?php
	}
}
