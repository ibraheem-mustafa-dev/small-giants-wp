<?php
/**
 * SGS → CSS Output settings page.
 *
 * Lets the operator choose how the consolidated per-instance block CSS
 * (Spec 32 §6.2 / FR-32-11) is delivered, and lists the recommended
 * optimisation plugins (+ the exact setting to switch on) so the site is never
 * locked to a single plugin.
 *
 * @package SGS\Blocks
 * @since   1.17.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Css_Output_Settings
 *
 * Registers the `sgs_css_output_mode` option + a submenu under the SGS menu.
 */
final class Css_Output_Settings {

	const OPTION_KEY = 'sgs_css_output_mode';
	const PAGE_SLUG  = 'sgs-css-output';

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
	 * Register the option with a strict sanitiser.
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
				'default'           => 'file',
			)
		);
	}

	/**
	 * Only 'file' or 'head' are valid; anything else falls back to the default.
	 *
	 * @param mixed $value Submitted value.
	 * @return string
	 */
	public static function sanitise_mode( $value ): string {
		return ( 'head' === $value ) ? 'head' : 'file';
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
	 * Render the settings page.
	 *
	 * @return void
	 */
	public static function render_page(): void {
		if ( ! \current_user_can( 'manage_options' ) ) {
			\wp_die( \esc_html__( 'You do not have permission to access this page.', 'sgs-blocks' ), '', array( 'response' => 403 ) );
		}
		$mode = \get_option( self::OPTION_KEY, 'file' );
		$mode = ( 'head' === $mode ) ? 'head' : 'file';
		?>
		<div class="wrap">
			<h1><?php \esc_html_e( 'SGS — CSS Output', 'sgs-blocks' ); ?></h1>
			<p style="max-width:46rem">
				<?php \esc_html_e( 'SGS blocks style themselves with scoped CSS. Instead of scattering ~100 tiny <style> tags through the page, that CSS is consolidated into ONE stylesheet. Choose how it is delivered:', 'sgs-blocks' ); ?>
			</p>

			<form method="post" action="options.php">
				<?php \settings_fields( 'sgs_css_output' ); ?>
				<table class="form-table" role="presentation">
					<tbody>
						<tr>
							<th scope="row"><?php \esc_html_e( 'Delivery method', 'sgs-blocks' ); ?></th>
							<td>
								<fieldset>
									<label style="display:block;margin-bottom:12px">
										<input type="radio" name="<?php echo \esc_attr( self::OPTION_KEY ); ?>" value="file" <?php \checked( 'file', $mode ); ?> />
										<strong><?php \esc_html_e( 'External file (recommended)', 'sgs-blocks' ); ?></strong><br>
										<span style="margin-left:24px;display:block;max-width:44rem;color:#555">
											<?php \esc_html_e( 'One cached .css file linked in the page head. Cleanest HTML, browser-cacheable, and an optimisation plugin can defer it for the best Core Web Vitals. Best choice when you run one of the optimisation plugins below.', 'sgs-blocks' ); ?>
										</span>
									</label>
									<label style="display:block">
										<input type="radio" name="<?php echo \esc_attr( self::OPTION_KEY ); ?>" value="head" <?php \checked( 'head', $mode ); ?> />
										<strong><?php \esc_html_e( 'Inline in head (self-contained)', 'sgs-blocks' ); ?></strong><br>
										<span style="margin-left:24px;display:block;max-width:44rem;color:#555">
											<?php \esc_html_e( 'The CSS is written straight into the page head — no external file, no cache dependency, works with zero extra plugins. Choose this if you do NOT run a CSS-optimisation plugin.', 'sgs-blocks' ); ?>
										</span>
									</label>
								</fieldset>
							</td>
						</tr>
					</tbody>
				</table>
				<?php \submit_button(); ?>
			</form>

			<hr>
			<h2><?php \esc_html_e( 'Recommended optimisation plugins (for “External file” mode)', 'sgs-blocks' ); ?></h2>
			<p style="max-width:46rem;color:#555">
				<?php \esc_html_e( 'Any ONE of these will defer the external stylesheet and generate critical CSS for the fastest load. You are not tied to a single plugin — pick whichever suits the host. After installing, switch on the setting named below.', 'sgs-blocks' ); ?>
			</p>
			<table class="widefat striped" style="max-width:60rem">
				<thead>
					<tr>
						<th><?php \esc_html_e( 'Plugin', 'sgs-blocks' ); ?></th>
						<th><?php \esc_html_e( 'Setting to switch on', 'sgs-blocks' ); ?></th>
						<th><?php \esc_html_e( 'Best for', 'sgs-blocks' ); ?></th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><strong>LiteSpeed Cache</strong></td>
						<td><?php \esc_html_e( 'Page Optimization → CSS Settings → “Load CSS Asynchronously” + “Generate Critical CSS”', 'sgs-blocks' ); ?></td>
						<td><?php \esc_html_e( 'LiteSpeed / Hostinger hosting (built-in, free)', 'sgs-blocks' ); ?></td>
					</tr>
					<tr>
						<td><strong>Autoptimize</strong></td>
						<td><?php \esc_html_e( 'CSS Options → “Inline and Defer CSS”', 'sgs-blocks' ); ?></td>
						<td><?php \esc_html_e( 'Any host (Apache/Nginx), lightweight', 'sgs-blocks' ); ?></td>
					</tr>
					<tr>
						<td><strong>WP Rocket</strong></td>
						<td><?php \esc_html_e( 'File Optimization → “Optimize CSS delivery” (Remove Unused CSS or Load CSS Asynchronously)', 'sgs-blocks' ); ?></td>
						<td><?php \esc_html_e( 'Premium, easiest setup', 'sgs-blocks' ); ?></td>
					</tr>
					<tr>
						<td><strong>Perfmatters</strong></td>
						<td><?php \esc_html_e( 'Assets → CSS → “Critical CSS” / “Defer CSS”', 'sgs-blocks' ); ?></td>
						<td><?php \esc_html_e( 'Premium, granular control', 'sgs-blocks' ); ?></td>
					</tr>
				</tbody>
			</table>
			<p style="max-width:46rem;color:#555">
				<em><?php \esc_html_e( 'No optimisation plugin? Choose “Inline in head” above — it needs nothing else and stays fast for first-time visitors.', 'sgs-blocks' ); ?></em>
			</p>
		</div>
		<?php
	}
}
