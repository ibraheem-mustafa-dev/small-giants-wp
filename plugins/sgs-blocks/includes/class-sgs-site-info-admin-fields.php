<?php
/**
 * SGS Site Info — admin field + section renderers (FR-S4-3 companion).
 *
 * Split out of {@see Sgs_Site_Info_Admin} to keep both files under the 300-line
 * file-length budget. This companion holds only presentation logic — section
 * blurbs, single-input fields, address textarea, and the custom-field repeater.
 * It must not contain hook wiring or save logic.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Site_Info_Admin_Fields
 *
 * Pure renderer methods invoked by add_settings_section / add_settings_field
 * callbacks registered in {@see Sgs_Site_Info_Admin::register_settings()}.
 */
final class Sgs_Site_Info_Admin_Fields {

	// -------------------------------------------------------------------------
	// Section blurbs
	// -------------------------------------------------------------------------

	/**
	 * Render the Identity section: current logo preview + deep-link to the
	 * Site Editor. Per FR-S4-3: no new media uploader is registered here.
	 */
	public static function render_identity_section(): void {
		$logo_id  = (int) \get_theme_mod( 'custom_logo' );
		$logo_url = $logo_id ? \wp_get_attachment_image_url( $logo_id, 'medium' ) : '';
		// Deep-link to the Site Editor. The site-logo block is reached from
		// the global styles surface; operators click into the header template
		// to focus it. See developer.wordpress.org/block-editor/reference-guides/data/data-core-edit-site/.
		$logo_editor_url = \admin_url( 'site-editor.php?path=%2Fwp_global_styles' );

		echo '<p>' . \esc_html__( 'Your site logo is managed from the Site Editor — set or change it there, then it appears across every template that uses the Site Logo block.', 'sgs-blocks' ) . '</p>';

		if ( $logo_url ) {
			printf(
				'<p><img src="%1$s" alt="%2$s" style="max-width:160px;height:auto;border:1px solid #ccd0d4;padding:4px;background:#fff;" /></p>',
				\esc_url( $logo_url ),
				\esc_attr__( 'Current site logo', 'sgs-blocks' )
			);
		} else {
			echo '<p><em>' . \esc_html__( 'No site logo set yet.', 'sgs-blocks' ) . '</em></p>';
		}

		printf(
			'<p><a class="button button-secondary" href="%1$s">%2$s</a></p>',
			\esc_url( $logo_editor_url ),
			\esc_html__( 'Set logo in Site Editor →', 'sgs-blocks' )
		);
	}

	/**
	 * Contact section blurb.
	 */
	public static function render_contact_section(): void {
		echo '<p>' . \esc_html__( 'Contact details surface in headers, footers, contact blocks, and form notification templates.', 'sgs-blocks' ) . '</p>';
	}

	/**
	 * Socials section blurb.
	 */
	public static function render_socials_section(): void {
		echo '<p>' . \esc_html__( 'Add full URLs (including https://). Empty fields are hidden automatically.', 'sgs-blocks' ) . '</p>';
	}

	/**
	 * Opening hours section blurb.
	 */
	public static function render_hours_section(): void {
		echo '<p>' . \esc_html__( 'Free-text per day. Use the same format for every day so it reads cleanly in the footer.', 'sgs-blocks' ) . '</p>';
	}

	/**
	 * Copyright section blurb.
	 */
	public static function render_copyright_section(): void {
		echo '<p>' . \esc_html__( 'Shown in the footer copyright row and any block that binds to the copyright key.', 'sgs-blocks' ) . '</p>';
	}

	/**
	 * Custom fields section blurb.
	 */
	public static function render_custom_section(): void {
		echo '<p>' . \esc_html__( 'Add ad-hoc business data (e.g. licence number, founded year). Keys must use lower-case letters, numbers and underscores only.', 'sgs-blocks' ) . '</p>';
	}

	// -------------------------------------------------------------------------
	// Field renderers
	// -------------------------------------------------------------------------

	/**
	 * Render a single text-like input for a dot-notation key.
	 *
	 * @param array $args Field args from add_settings_field().
	 */
	public static function render_input_field( array $args ): void {
		$key         = (string) ( $args['key'] ?? '' );
		$type        = (string) ( $args['type'] ?? 'text' );
		$id          = (string) ( $args['label_for'] ?? 'sgs_site_info_' . $key );
		$value       = (string) Sgs_Site_Info::get( $key, '' );
		$placeholder = isset( $args['placeholder'] ) ? (string) $args['placeholder'] : '';
		$name        = self::dot_to_name( $key );

		printf(
			'<input type="%1$s" id="%2$s" name="%3$s" value="%4$s" class="regular-text" placeholder="%5$s" />',
			\esc_attr( $type ),
			\esc_attr( $id ),
			\esc_attr( $name ),
			\esc_attr( $value ),
			\esc_attr( $placeholder )
		);
	}

	/**
	 * Multi-line address — wp_kses-sanitised on save to allow only <br>.
	 *
	 * @param array $args Field args.
	 */
	public static function render_address_field( array $args ): void {
		$key   = (string) ( $args['key'] ?? 'address' );
		$id    = (string) ( $args['label_for'] ?? 'sgs_site_info_address' );
		$value = (string) Sgs_Site_Info::get( $key, '' );
		$name  = self::dot_to_name( $key );

		printf(
			'<textarea id="%1$s" name="%2$s" rows="4" cols="50" class="large-text code">%3$s</textarea>',
			\esc_attr( $id ),
			\esc_attr( $name ),
			\esc_textarea( $value )
		);
		echo '<p class="description">' . \esc_html__( 'Plain text plus <br> tags only. Other HTML is stripped on save.', 'sgs-blocks' ) . '</p>';
	}

	/**
	 * Render the custom-field repeater. Two columns per row (key, value); the
	 * key input uses the same lower-snake_case pattern as the server-side
	 * allowlist so the browser blocks invalid keys before submission.
	 */
	public static function render_custom_fields(): void {
		$store      = Sgs_Site_Info::all();
		$well_known = array(
			'phone',
			'email',
			'support_email',
			'address',
			'copyright',
			'tagline',
			'vat_number',
			'registered_office',
			'socials',
			'opening_hours',
		);

		$custom_rows = array();
		foreach ( $store as $key => $value ) {
			if ( \in_array( $key, $well_known, true ) ) {
				continue;
			}
			if ( ! Sgs_Site_Info_Admin::is_valid_custom_key( (string) $key ) ) {
				continue;
			}
			$custom_rows[] = array(
				'key'   => (string) $key,
				'value' => \is_scalar( $value ) ? (string) $value : '',
			);
		}
		// Always render one empty row for new entries.
		$custom_rows[] = array(
			'key'   => '',
			'value' => '',
		);

		$option_key  = Sgs_Site_Info::OPTION_KEY;
		$remove_text = \__( 'Remove', 'sgs-blocks' );
		$add_text    = \__( 'Add row', 'sgs-blocks' );

		echo '<div class="sgs-site-info-custom-fields-table" data-option-key="' . \esc_attr( $option_key ) . '" data-remove-label="' . \esc_attr( $remove_text ) . '">';
		echo '<table class="widefat" style="max-width:720px;">';
		echo '<thead><tr>';
		echo '<th scope="col">' . \esc_html__( 'Key', 'sgs-blocks' ) . '</th>';
		echo '<th scope="col">' . \esc_html__( 'Value', 'sgs-blocks' ) . '</th>';
		echo '<th scope="col" class="sgs-site-info-actions-col"><span class="screen-reader-text">' . \esc_html__( 'Actions', 'sgs-blocks' ) . '</span></th>';
		echo '</tr></thead><tbody>';
		foreach ( $custom_rows as $idx => $row ) {
			printf(
				'<tr class="sgs-site-info-custom-row"><td><input type="text" name="%1$s[custom][%2$d][key]" value="%3$s" pattern="[a-z0-9_]+" title="%4$s" class="regular-text code" /></td>'
				. '<td><input type="text" name="%1$s[custom][%2$d][value]" value="%5$s" class="regular-text" /></td>'
				. '<td><button type="button" class="button button-link-delete sgs-site-info-remove-row">%6$s</button></td></tr>',
				\esc_attr( $option_key ),
				(int) $idx,
				\esc_attr( $row['key'] ),
				\esc_attr__( 'Lower-case letters, numbers, and underscores only.', 'sgs-blocks' ),
				\esc_attr( $row['value'] ),
				\esc_html( $remove_text )
			);
		}
		echo '</tbody></table>';
		printf(
			'<p><button type="button" class="button button-secondary sgs-site-info-add-row">%s</button></p>',
			\esc_html( $add_text )
		);
		echo '</div>';
		echo '<p class="description">' . \esc_html__( 'Leave a key blank to ignore that row. Reserved keys (e.g. sgs_framework_version) are blocked server-side.', 'sgs-blocks' ) . '</p>';
	}

	// -------------------------------------------------------------------------
	// Helper
	// -------------------------------------------------------------------------

	/**
	 * Convert a dot-notation key (e.g. socials.facebook) into the HTML name
	 * attribute that PHP unpacks into a nested array on POST.
	 *
	 * @param  string $key Dot-notation key.
	 * @return string      HTML form name (e.g. sgs_site_info[socials][facebook]).
	 */
	public static function dot_to_name( string $key ): string {
		$parts = \explode( '.', $key );
		$name  = Sgs_Site_Info::OPTION_KEY;
		foreach ( $parts as $part ) {
			$name .= '[' . $part . ']';
		}
		return $name;
	}
}
