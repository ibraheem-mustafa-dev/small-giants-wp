<?php
/**
 * Admin settings page for SGS Button Presets.
 *
 * Stores primary and secondary button defaults in a single wp_options entry
 * (`sgs_button_presets`) and outputs them as CSS custom properties on both
 * the frontend (wp_head) and the block editor (admin_head) so that
 * .is-style-primary / .is-style-secondary buttons pick up the values
 * without any server-side logic in render.php.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Admin settings page for SGS Button Presets.
 *
 * Provides site-wide primary and secondary button styling stored in wp_options.
 * CSS custom properties are emitted to both wp_head and admin_head so block
 * preset classes (.is-style-primary etc.) pick up values in editor and frontend.
 */
class Button_Presets_Admin {

	const OPTION_KEY = 'sgs_button_presets';

	/**
	 * Register all hooks.
	 */
	public static function register(): void {
		add_action( 'admin_menu', array( __CLASS__, 'add_menu_page' ) );
		add_action( 'admin_init', array( __CLASS__, 'register_settings' ) );
		add_action( 'wp_head', array( __CLASS__, 'output_css_custom_properties' ) );
		add_action( 'admin_head', array( __CLASS__, 'output_css_custom_properties' ) );
	}

	/**
	 * Add settings sub-page under the Settings menu.
	 */
	public static function add_menu_page(): void {
		add_options_page(
			__( 'SGS Button Presets', 'sgs-blocks' ),
			__( 'SGS Button Presets', 'sgs-blocks' ),
			'manage_options',
			'sgs-button-presets',
			array( __CLASS__, 'render_settings_page' )
		);
	}

	/**
	 * Register the single option that holds the entire preset array.
	 *
	 * We do NOT use add_settings_section / add_settings_field here because
	 * the full array is sanitised as a unit via the callback, keeping the
	 * serialised structure clean and avoiding 30+ individual option rows.
	 */
	public static function register_settings(): void {
		register_setting(
			'sgs_button_presets_group',
			self::OPTION_KEY,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( __CLASS__, 'sanitise_presets' ),
				'default'           => self::get_defaults(),
			)
		);
	}

	/**
	 * Default preset values.
	 *
	 * Colour fields accept either a bare hex value or a CSS custom property
	 * reference such as var(--wp--preset--color--primary).
	 * Numeric fields are always stored as integers (px values, no unit).
	 *
	 * @return array<string, array<string, string|int>>
	 */
	public static function get_defaults(): array {
		return array(
			'primary'   => array(
				'background'       => 'var(--wp--preset--color--primary)',
				'text'             => '#ffffff',
				'border'           => 'var(--wp--preset--color--primary)',
				'border_width'     => 2,
				'border_radius'    => 8,
				'padding_top'      => 12,
				'padding_right'    => 24,
				'padding_bottom'   => 12,
				'padding_left'     => 24,
				'font_size'        => 15,
				'font_weight'      => '600',
				'min_height'       => 48,
				'hover_background' => 'var(--wp--preset--color--text)',
				'hover_text'       => '#ffffff',
				'hover_border'     => 'var(--wp--preset--color--text)',
			),
			'secondary' => array(
				'background'       => 'transparent',
				'text'             => 'var(--wp--preset--color--primary)',
				'border'           => 'var(--wp--preset--color--primary)',
				'border_width'     => 2,
				'border_radius'    => 8,
				'padding_top'      => 12,
				'padding_right'    => 24,
				'padding_bottom'   => 12,
				'padding_left'     => 24,
				'font_size'        => 15,
				'font_weight'      => '600',
				'min_height'       => 48,
				'hover_background' => 'var(--wp--preset--color--primary)',
				'hover_text'       => '#ffffff',
				'hover_border'     => 'var(--wp--preset--color--primary)',
			),
		);
	}

	/**
	 * Sanitise the submitted preset array.
	 *
	 * Every field is sanitised individually. Missing variants fall back to
	 * their defaults so a partial POST cannot wipe stored values.
	 *
	 * @param mixed $input Raw $_POST data from the settings form.
	 * @return array<string, array<string, string|int>> Sanitised preset array.
	 */
	public static function sanitise_presets( $input ): array {
		$defaults = self::get_defaults();
		$clean    = array();

		foreach ( array( 'primary', 'secondary' ) as $variant ) {
			if ( ! isset( $input[ $variant ] ) || ! is_array( $input[ $variant ] ) ) {
				$clean[ $variant ] = $defaults[ $variant ];
				continue;
			}

			$v = $input[ $variant ];
			$d = $defaults[ $variant ];

			$clean[ $variant ] = array(
				'background'       => sanitize_text_field( $v['background'] ?? $d['background'] ),
				'text'             => sanitize_text_field( $v['text'] ?? $d['text'] ),
				'border'           => sanitize_text_field( $v['border'] ?? $d['border'] ),
				'border_width'     => absint( $v['border_width'] ?? 2 ),
				'border_radius'    => absint( $v['border_radius'] ?? 8 ),
				'padding_top'      => absint( $v['padding_top'] ?? 12 ),
				'padding_right'    => absint( $v['padding_right'] ?? 24 ),
				'padding_bottom'   => absint( $v['padding_bottom'] ?? 12 ),
				'padding_left'     => absint( $v['padding_left'] ?? 24 ),
				'font_size'        => absint( $v['font_size'] ?? 15 ),
				'font_weight'      => sanitize_text_field( $v['font_weight'] ?? '600' ),
				'min_height'       => absint( $v['min_height'] ?? 48 ),
				'hover_background' => sanitize_text_field( $v['hover_background'] ?? $d['hover_background'] ),
				'hover_text'       => sanitize_text_field( $v['hover_text'] ?? $d['hover_text'] ),
				'hover_border'     => sanitize_text_field( $v['hover_border'] ?? $d['hover_border'] ),
			);
		}

		return $clean;
	}

	/**
	 * Render the settings page.
	 *
	 * Outputs two tables (primary / secondary) using the WordPress form-table
	 * pattern. settings_fields() injects the nonce and option group. No
	 * do_settings_sections() call — fields are rendered manually so the
	 * array-keyed input names are correct.
	 */
	public static function render_settings_page(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$presets = get_option( self::OPTION_KEY, self::get_defaults() );

		// Merge with defaults to guarantee all keys exist even on legacy data.
		$p = array_merge( self::get_defaults()['primary'], (array) ( $presets['primary'] ?? array() ) );
		$s = array_merge( self::get_defaults()['secondary'], (array) ( $presets['secondary'] ?? array() ) );
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'SGS Button Presets', 'sgs-blocks' ); ?></h1>
			<p>
				<?php esc_html_e( 'Set the default styling for primary and secondary buttons across the entire site. Buttons using the "Primary" or "Secondary" preset style will inherit these values automatically via CSS custom properties.', 'sgs-blocks' ); ?>
			</p>

			<form method="post" action="options.php">
				<?php settings_fields( 'sgs_button_presets_group' ); ?>

				<?php
				foreach ( array(
					'primary'   => $p,
					'secondary' => $s,
				) as $variant => $vals ) :
					?>
				<h2><?php echo esc_html( ucfirst( $variant ) ); ?> <?php esc_html_e( 'Button', 'sgs-blocks' ); ?></h2>
				<table class="form-table" role="presentation">
					<tbody>

						<?php self::render_text_field( $variant, $vals, 'background', __( 'Background', 'sgs-blocks' ), __( 'Hex value or CSS custom property. E.g. #FF6B6B or var(--wp--preset--color--primary)', 'sgs-blocks' ) ); ?>
						<?php self::render_text_field( $variant, $vals, 'text', __( 'Text Colour', 'sgs-blocks' ), __( 'Hex value or CSS custom property.', 'sgs-blocks' ) ); ?>
						<?php self::render_text_field( $variant, $vals, 'border', __( 'Border Colour', 'sgs-blocks' ), __( 'Hex value or CSS custom property.', 'sgs-blocks' ) ); ?>
						<?php self::render_number_field( $variant, $vals, 'border_width', __( 'Border Width (px)', 'sgs-blocks' ) ); ?>
						<?php self::render_number_field( $variant, $vals, 'border_radius', __( 'Border Radius (px)', 'sgs-blocks' ) ); ?>
						<?php self::render_number_field( $variant, $vals, 'padding_top', __( 'Padding Top (px)', 'sgs-blocks' ) ); ?>
						<?php self::render_number_field( $variant, $vals, 'padding_right', __( 'Padding Right (px)', 'sgs-blocks' ) ); ?>
						<?php self::render_number_field( $variant, $vals, 'padding_bottom', __( 'Padding Bottom (px)', 'sgs-blocks' ) ); ?>
						<?php self::render_number_field( $variant, $vals, 'padding_left', __( 'Padding Left (px)', 'sgs-blocks' ) ); ?>
						<?php self::render_number_field( $variant, $vals, 'font_size', __( 'Font Size (px)', 'sgs-blocks' ) ); ?>
						<?php self::render_text_field( $variant, $vals, 'font_weight', __( 'Font Weight', 'sgs-blocks' ), __( '400, 500, 600, or 700', 'sgs-blocks' ) ); ?>
						<?php self::render_number_field( $variant, $vals, 'min_height', __( 'Min Height (px)', 'sgs-blocks' ), __( 'Minimum 44px for WCAG 2.2 AA touch target compliance.', 'sgs-blocks' ) ); ?>

						<tr>
							<th colspan="2">
								<strong><?php esc_html_e( 'Hover State', 'sgs-blocks' ); ?></strong>
							</th>
						</tr>

						<?php self::render_text_field( $variant, $vals, 'hover_background', __( 'Hover Background', 'sgs-blocks' ), __( 'Hex value or CSS custom property. Leave empty to inherit base background.', 'sgs-blocks' ) ); ?>
						<?php self::render_text_field( $variant, $vals, 'hover_text', __( 'Hover Text Colour', 'sgs-blocks' ), __( 'Hex value or CSS custom property. Leave empty to inherit base text colour.', 'sgs-blocks' ) ); ?>
						<?php self::render_text_field( $variant, $vals, 'hover_border', __( 'Hover Border Colour', 'sgs-blocks' ), __( 'Hex value or CSS custom property. Leave empty to inherit base border colour.', 'sgs-blocks' ) ); ?>

					</tbody>
				</table>
				<?php endforeach; ?>

				<?php submit_button( __( 'Save Button Presets', 'sgs-blocks' ) ); ?>
			</form>
		</div>
		<?php
	}

	/**
	 * Render a text input field row inside a .form-table.
	 *
	 * @param string $variant   'primary' or 'secondary'.
	 * @param array  $vals      Current saved values for this variant.
	 * @param string $key       Field key within the variant array.
	 * @param string $label     Human-readable label.
	 * @param string $help      Optional description shown below the input.
	 */
	private static function render_text_field( string $variant, array $vals, string $key, string $label, string $help = '' ): void {
		$field_id = 'sgs_button_presets_' . $variant . '_' . $key;
		$name     = 'sgs_button_presets[' . $variant . '][' . $key . ']';
		$value    = $vals[ $key ] ?? '';
		?>
		<tr>
			<th scope="row">
				<label for="<?php echo esc_attr( $field_id ); ?>"><?php echo esc_html( $label ); ?></label>
			</th>
			<td>
				<input
					type="text"
					id="<?php echo esc_attr( $field_id ); ?>"
					name="<?php echo esc_attr( $name ); ?>"
					value="<?php echo esc_attr( $value ); ?>"
					class="regular-text"
				>
				<?php if ( $help ) : ?>
				<p class="description"><?php echo esc_html( $help ); ?></p>
				<?php endif; ?>
			</td>
		</tr>
		<?php
	}

	/**
	 * Render a number input field row inside a .form-table.
	 *
	 * @param string $variant 'primary' or 'secondary'.
	 * @param array  $vals    Current saved values for this variant.
	 * @param string $key     Field key within the variant array.
	 * @param string $label   Human-readable label.
	 * @param string $help    Optional description shown below the input.
	 */
	private static function render_number_field( string $variant, array $vals, string $key, string $label, string $help = '' ): void {
		$field_id = 'sgs_button_presets_' . $variant . '_' . $key;
		$name     = 'sgs_button_presets[' . $variant . '][' . $key . ']';
		$value    = absint( $vals[ $key ] ?? 0 );
		?>
		<tr>
			<th scope="row">
				<label for="<?php echo esc_attr( $field_id ); ?>"><?php echo esc_html( $label ); ?></label>
			</th>
			<td>
				<input
					type="number"
					id="<?php echo esc_attr( $field_id ); ?>"
					name="<?php echo esc_attr( $name ); ?>"
					value="<?php echo esc_attr( (string) $value ); ?>"
					class="small-text"
					min="0"
				>
				<?php if ( $help ) : ?>
				<p class="description"><?php echo esc_html( $help ); ?></p>
				<?php endif; ?>
			</td>
		</tr>
		<?php
	}

	/**
	 * Output CSS custom properties for both presets.
	 *
	 * Fires on wp_head (frontend) AND admin_head (block editor preview).
	 * Outputs two blocks:
	 *   1. :root { --wp--custom--button-presets--primary--* ... } — for CSS consumption.
	 *   2. .sgs-button.is-style-primary:hover / :focus-visible rules — hover states.
	 *
	 * All values are sanitised before output. The <style> tag carries a
	 * deterministic id so it does not duplicate on wp_head + admin_head.
	 */
	public static function output_css_custom_properties(): void {
		$presets = get_option( self::OPTION_KEY, self::get_defaults() );

		// Merge with defaults to guarantee all keys are present.
		$presets['primary']   = array_merge( self::get_defaults()['primary'], (array) ( $presets['primary'] ?? array() ) );
		$presets['secondary'] = array_merge( self::get_defaults()['secondary'], (array) ( $presets['secondary'] ?? array() ) );

		$css = ':root{';

		foreach ( array( 'primary', 'secondary' ) as $variant ) {
			$v      = $presets[ $variant ];
			$prefix = "--wp--custom--button-presets--{$variant}--";

			$background = sanitize_text_field( $v['background'] );
			$text       = sanitize_text_field( $v['text'] );
			$border     = sanitize_text_field( $v['border'] );
			$bw         = absint( $v['border_width'] );
			$br         = absint( $v['border_radius'] );
			$pt         = absint( $v['padding_top'] );
			$pr         = absint( $v['padding_right'] );
			$pb         = absint( $v['padding_bottom'] );
			$pl         = absint( $v['padding_left'] );
			$fs         = absint( $v['font_size'] );
			$fw         = sanitize_text_field( $v['font_weight'] );
			$mh         = absint( $v['min_height'] );
			$hbg        = sanitize_text_field( $v['hover_background'] );
			$ht         = sanitize_text_field( $v['hover_text'] );
			$hb         = sanitize_text_field( $v['hover_border'] );

			if ( $background ) {
				$css .= "{$prefix}background:{$background};";
			}
			if ( $text ) {
				$css .= "{$prefix}text:{$text};";
			}
			if ( $border ) {
				$css .= "{$prefix}border:{$border};";
			}

			$css .= "{$prefix}border-width:{$bw}px;";
			$css .= "{$prefix}border-radius:{$br}px;";
			$css .= "{$prefix}padding:{$pt}px {$pr}px {$pb}px {$pl}px;";
			$css .= "{$prefix}font-size:{$fs}px;";

			if ( $fw ) {
				$css .= "{$prefix}font-weight:{$fw};";
			}

			$css .= "{$prefix}min-height:{$mh}px;";

			if ( $hbg ) {
				$css .= "{$prefix}hover-background:{$hbg};";
			}
			if ( $ht ) {
				$css .= "{$prefix}hover-text:{$ht};";
			}
			if ( $hb ) {
				$css .= "{$prefix}hover-border:{$hb};";
			}
		}

		$css .= '}';

		// Append hover state rules for each preset variant.
		$css .= self::build_hover_css( $presets );

		// wp_strip_all_tags removes any attempt to inject markup via a stored value.
		echo '<style id="sgs-button-presets">' . esc_html( $css ) . '</style>' . "\n";
	}

	/**
	 * Build the hover and focus-visible CSS rules for preset button classes.
	 *
	 * Only emits rules for colour properties that have a value — avoids
	 * outputting empty declarations that could reset inherited styles.
	 *
	 * @param array<string, array<string, string|int>> $presets Full preset array.
	 * @return string CSS string (no surrounding <style> tags).
	 */
	private static function build_hover_css( array $presets ): string {
		$css = '';

		foreach ( array( 'primary', 'secondary' ) as $variant ) {
			$v   = $presets[ $variant ] ?? array();
			$hbg = sanitize_text_field( $v['hover_background'] ?? '' );
			$ht  = sanitize_text_field( $v['hover_text'] ?? '' );
			$hb  = sanitize_text_field( $v['hover_border'] ?? '' );

			if ( ! $hbg && ! $ht && ! $hb ) {
				continue;
			}

			$selector = ".sgs-button.is-style-{$variant}:hover,.sgs-button.is-style-{$variant}:focus-visible";
			$css     .= "{$selector}{";

			if ( $hbg ) {
				$css .= "background-color:{$hbg};";
			}
			if ( $ht ) {
				$css .= "color:{$ht};";
			}
			if ( $hb ) {
				$css .= "border-color:{$hb};";
			}

			$css .= '}';
		}

		return $css;
	}
}
