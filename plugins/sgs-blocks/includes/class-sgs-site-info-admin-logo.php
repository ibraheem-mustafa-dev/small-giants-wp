<?php
/**
 * SGS Site Info — the `logo` field's media picker (FR-36-22, logo chain tier 2).
 *
 * Presentation + asset wiring only: it prints a media-library attachment picker
 * whose hidden input posts the chosen attachment ID as `sgs_site_info[logo]`.
 * Saving, capability checks and sanitisation stay in
 * {@see Sgs_Site_Info_Admin::sanitise_submission()} and
 * {@see Sgs_Site_Info::set()}, so this class holds no write path.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Site_Info_Admin_Logo
 */
final class Sgs_Site_Info_Admin_Logo {

	/** Script handle carrying the picker behaviour. */
	const SCRIPT_HANDLE = 'sgs-site-info-logo-picker';

	/**
	 * Render the logo picker field.
	 *
	 * @param array $args Field args from add_settings_field() (unused; the key is fixed).
	 */
	public static function render_field( array $args = array() ): void { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.Found -- signature required by add_settings_field().
		$logo_id  = Sgs_Site_Info_Logo::get_id();
		$logo_url = $logo_id > 0 ? (string) \wp_get_attachment_image_url( $logo_id, 'medium' ) : '';

		// The page is gated on `edit_theme_options`, which does not imply
		// `upload_files`. Without the media capability the modal cannot open, so
		// such an operator is shown the current logo and told who can change it
		// rather than a button that silently does nothing.
		$can_upload = \current_user_can( 'upload_files' );

		printf(
			'<div class="sgs-site-info-logo" data-title="%1$s" data-button="%2$s" data-choose-label="%3$s" data-replace-label="%4$s">',
			\esc_attr__( 'Choose your site logo', 'sgs-blocks' ),
			\esc_attr__( 'Use this logo', 'sgs-blocks' ),
			\esc_attr__( 'Choose logo', 'sgs-blocks' ),
			\esc_attr__( 'Replace logo', 'sgs-blocks' )
		);

		printf(
			'<input type="hidden" class="sgs-site-info-logo__input" id="sgs_site_info_logo" name="%1$s" value="%2$s" />',
			\esc_attr( Sgs_Site_Info_Admin_Fields::dot_to_name( 'logo' ) ),
			\esc_attr( $logo_id > 0 ? (string) $logo_id : '' )
		);

		// An <img> with an empty src would make the browser request the page itself,
		// so the attribute is omitted (and the element hidden) while no logo is set.
		printf(
			'<img class="sgs-site-info-logo__preview" alt="%1$s"%2$s />',
			\esc_attr__( 'Selected site logo', 'sgs-blocks' ),
			'' === $logo_url ? ' hidden' : ' src="' . \esc_url( $logo_url ) . '"' // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- literal attribute string or esc_url()-escaped value.
		);

		echo '<p>';
		if ( $can_upload ) {
			printf(
				'<button type="button" class="button button-secondary sgs-site-info-logo__choose">%s</button> ',
				\esc_html( '' === $logo_url ? \__( 'Choose logo', 'sgs-blocks' ) : \__( 'Replace logo', 'sgs-blocks' ) )
			);
			printf(
				'<button type="button" class="button button-link-delete sgs-site-info-logo__remove"%1$s>%2$s</button>',
				'' === $logo_url ? ' hidden' : '', // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- literal attribute string, no user input.
				\esc_html__( 'Remove logo', 'sgs-blocks' )
			);
		} else {
			echo '<em>' . \esc_html__( 'You do not have permission to upload or choose media, so the logo cannot be changed here. Ask a site administrator.', 'sgs-blocks' ) . '</em>';
		}
		echo '</p></div>';

		echo '<p class="description">' . \esc_html__( 'Used by every Logo block that has no image of its own. Leave empty to use the WordPress site logo instead.', 'sgs-blocks' ) . '</p>';
	}

	/**
	 * Load the media library and the picker script. Call on the Site Info admin
	 * page only.
	 *
	 * @param string $style_handle Already-enqueued admin stylesheet handle to attach the preview rule to.
	 */
	public static function enqueue( string $style_handle ): void {
		\wp_enqueue_media();
		\wp_register_script( self::SCRIPT_HANDLE, false, array( 'media-editor' ), \defined( 'SGS_BLOCKS_VERSION' ) ? \SGS_BLOCKS_VERSION : '0.1.1', true );
		\wp_enqueue_script( self::SCRIPT_HANDLE );
		\wp_add_inline_script( self::SCRIPT_HANDLE, self::picker_script() );
		\wp_add_inline_style( $style_handle, '.sgs-site-info-logo__preview{display:block;max-width:160px;height:auto;margin-bottom:8px;padding:4px;border:1px solid #ccd0d4;background:#fff}.sgs-site-info-logo__preview[hidden]{display:none}' );
	}

	/**
	 * The picker behaviour: opens the media modal, writes the chosen ID into the
	 * hidden input and swaps the preview. Vanilla JS, no jQuery of our own.
	 *
	 * @return string Script source (no <script> tags).
	 */
	private static function picker_script(): string {
		return <<<'JS'
( function () {
	'use strict';
	var root = document.querySelector( '.sgs-site-info-logo' );
	if ( ! root || ! window.wp || ! window.wp.media ) {
		return;
	}
	var input = root.querySelector( '.sgs-site-info-logo__input' );
	var preview = root.querySelector( '.sgs-site-info-logo__preview' );
	var choose = root.querySelector( '.sgs-site-info-logo__choose' );
	var remove = root.querySelector( '.sgs-site-info-logo__remove' );
	var frame = null;

	// The buttons are absent for an operator without the upload_files capability.
	if ( ! input || ! preview || ! choose || ! remove ) {
		return;
	}

	function show( id, url ) {
		input.value = id ? String( id ) : '';
		if ( url ) {
			preview.src = url;
		} else {
			preview.removeAttribute( 'src' );
		}
		preview.hidden = ! url;
		remove.hidden = ! url;
		choose.textContent = url ? root.dataset.replaceLabel : root.dataset.chooseLabel;
	}

	choose.addEventListener( 'click', function () {
		if ( ! frame ) {
			frame = window.wp.media( {
				title: root.dataset.title,
				button: { text: root.dataset.button },
				library: { type: 'image' },
				multiple: false
			} );
			frame.on( 'select', function () {
				var item = frame.state().get( 'selection' ).first().toJSON();
				var sizes = item.sizes || {};
				show( item.id, ( sizes.medium && sizes.medium.url ) || item.url );
			} );
		}
		frame.open();
	} );

	remove.addEventListener( 'click', function () {
		show( 0, '' );
	} );
}() );
JS;
	}
}
