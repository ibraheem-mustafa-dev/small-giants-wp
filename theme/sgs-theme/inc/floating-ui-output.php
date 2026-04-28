<?php
/**
 * SGS Floating UI Frontend Output
 *
 * @package SGS\Theme
 */

namespace SGS\Theme;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Output Floating UI elements in the footer.
 */
function output_floating_ui() {
	$btt_enabled = get_theme_mod( 'sgs_back_to_top_enabled', true );
	$rp_enabled  = get_theme_mod( 'sgs_reading_progress_enabled', false );

	// Post-level overrides.
	$hide_overrides = get_post_meta( get_the_ID(), '_sgs_hide_floating_ui', true );
	if ( ! is_array( $hide_overrides ) ) {
		$hide_overrides = array();
	}

	if ( in_array( 'back-to-top', $hide_overrides, true ) ) {
		$btt_enabled = false;
	}
	if ( in_array( 'reading-progress', $hide_overrides, true ) ) {
		$rp_enabled = false;
	}

	// Reading progress post type check.
	if ( $rp_enabled ) {
		$enabled_types = explode( ',', get_theme_mod( 'sgs_reading_progress_post_types', 'post' ) );
		$enabled_types = array_map( 'trim', $enabled_types );
		if ( ! is_singular( $enabled_types ) ) {
			$rp_enabled = false;
		}
	}

	if ( ! $btt_enabled && ! $rp_enabled ) {
		return;
	}

	// --- BACK TO TOP ---
	if ( $btt_enabled ) :
		$pos         = get_theme_mod( 'sgs_back_to_top_position', 'bottom-right' );
		$shape       = get_theme_mod( 'sgs_back_to_top_shape', 'circle' );
		$show_after  = get_theme_mod( 'sgs_back_to_top_show_after', 200 );
		$colour_slug = get_theme_mod( 'sgs_back_to_top_colour_slug', 'primary' );
		$size        = get_theme_mod( 'sgs_back_to_top_size', 48 );
		$icon        = get_theme_mod( 'sgs_back_to_top_icon', 'arrow-up' );

		$style = sprintf(
			'background-color: var(--wp--preset--color--%1$s); width: %2$dpx; height: %2$dpx;',
			esc_attr( $colour_slug ),
			absint( $size )
		);

		$icon_svg = '';
		switch ( $icon ) {
			case 'chevron-up':
				$icon_svg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>';
				break;
			case 'double-chevron-up':
				$icon_svg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 11-5-5-5 5M17 18l-5-5-5 5"/></svg>';
				break;
			default:
				$icon_svg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
		}
		?>
		<button id="sgs-back-to-top"
				class="sgs-floating-ui sgs-floating-ui--back-to-top sgs-floating-ui--position-<?php echo esc_attr( $pos ); ?> sgs-floating-ui--shape-<?php echo esc_attr( $shape ); ?>"
				style="<?php echo esc_attr( $style ); ?>"
				data-threshold="<?php echo absint( $show_after ); ?>"
				aria-label="<?php esc_attr_e( 'Back to top', 'sgs-theme' ); ?>"
				hidden>
			<?php echo $icon_svg; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
		</button>
		<?php
		wp_enqueue_style( 'sgs-back-to-top' );
		wp_enqueue_script( 'sgs-back-to-top' );
	endif;

	// --- READING PROGRESS ---
	if ( $rp_enabled ) :
		$mode        = get_theme_mod( 'sgs_reading_progress_mode', 'both' );
		$pos         = get_theme_mod( 'sgs_reading_progress_position', 'top' );
		$selector    = get_theme_mod( 'sgs_reading_progress_target_selector', 'main, article, .entry-content' );
		$wpm         = get_theme_mod( 'sgs_reading_progress_wpm', 225 );
		$colour_slug = get_theme_mod( 'sgs_reading_progress_bar_colour_slug', 'primary' );
		$height      = get_theme_mod( 'sgs_reading_progress_bar_height', 4 );
		$show_fin    = get_theme_mod( 'sgs_reading_progress_show_when_finished', false );

		// Initial word count / reading time calculation.
		$content = get_the_content();
		$word_count = str_word_count( strip_tags( $content ) );
		$total_mins = max( 1, ceil( $word_count / $wpm ) );

		$vars = sprintf(
			'--sgs-rp-bar-colour: var(--wp--preset--color--%1$s); --sgs-rp-bar-height: %2$dpx;',
			esc_attr( $colour_slug ),
			absint( $height )
		);
		?>
		<div id="sgs-reading-progress"
			 class="sgs-floating-ui sgs-floating-ui--reading-progress sgs-floating-ui--mode-<?php echo esc_attr( $mode ); ?> sgs-floating-ui--pos-<?php echo esc_attr( $pos ); ?>"
			 style="<?php echo esc_attr( $vars ); ?>"
			 data-target-selector="<?php echo esc_attr( $selector ); ?>"
			 data-wpm="<?php echo absint( $wpm ); ?>"
			 data-show-when-finished="<?php echo $show_fin ? 'true' : 'false'; ?>"
			 aria-label="<?php esc_attr_e( 'Reading progress', 'sgs-theme' ); ?>"
			 role="progressbar"
			 aria-valuemin="0"
			 aria-valuemax="100"
			 aria-valuenow="0">
			<div class="sgs-reading-progress__track">
				<div class="sgs-reading-progress__fill"></div>
			</div>
			<div class="sgs-reading-progress__countdown">
				<?php printf( esc_html__( '%d min left', 'sgs-theme' ), absint( $total_mins ) ); ?>
			</div>
		</div>
		<?php
		wp_enqueue_style( 'sgs-reading-progress' );
		wp_enqueue_script( 'sgs-reading-progress' );
	endif;
}
add_action( 'wp_footer', __NAMESPACE__ . '\\output_floating_ui', 5 );

/**
 * Register Floating UI assets.
 */
function register_floating_ui_assets() {
	wp_register_style(
		'sgs-back-to-top',
		get_template_directory_uri() . '/assets/css/back-to-top.css',
		array(),
		'1.0.0'
	);

	wp_register_script(
		'sgs-back-to-top',
		get_template_directory_uri() . '/assets/js/back-to-top.js',
		array(),
		'1.0.0',
		true
	);

	wp_register_style(
		'sgs-reading-progress',
		get_template_directory_uri() . '/assets/css/reading-progress.css',
		array(),
		'1.0.0'
	);

	wp_register_script(
		'sgs-reading-progress',
		get_template_directory_uri() . '/assets/js/reading-progress.js',
		array(),
		'1.0.0',
		true
	);
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\\register_floating_ui_assets' );

/**
 * Add Meta Box for post-level overrides.
 */
function add_floating_ui_meta_box() {
	$screens = array( 'post', 'page' );
	foreach ( $screens as $screen ) {
		add_meta_box(
			'sgs_floating_ui_overrides',
			__( 'SGS Floating UI Overrides', 'sgs-theme' ),
			__NAMESPACE__ . '\\render_floating_ui_meta_box',
			$screen,
			'side'
		);
	}
}
add_action( 'add_meta_boxes', __NAMESPACE__ . '\\add_floating_ui_meta_box' );

function render_floating_ui_meta_box( $post ) {
	$value = get_post_meta( $post->ID, '_sgs_hide_floating_ui', true );
	if ( ! is_array( $value ) ) {
		$value = array();
	}
	wp_nonce_field( 'sgs_floating_ui_meta_box', 'sgs_floating_ui_meta_box_nonce' );
	?>
	<p>
		<label>
			<input type="checkbox" name="sgs_hide_floating_ui[]" value="back-to-top" <?php checked( in_array( 'back-to-top', $value, true ) ); ?>>
			<?php esc_html_e( 'Hide Back to Top', 'sgs-theme' ); ?>
		</label>
	</p>
	<p>
		<label>
			<input type="checkbox" name="sgs_hide_floating_ui[]" value="reading-progress" <?php checked( in_array( 'reading-progress', $value, true ) ); ?>>
			<?php esc_html_e( 'Hide Reading Progress', 'sgs-theme' ); ?>
		</label>
	</p>
	<?php
}

function save_floating_ui_meta_box( $post_id ) {
	if ( ! isset( $_POST['sgs_floating_ui_meta_box_nonce'] ) || ! wp_verify_nonce( $_POST['sgs_floating_ui_meta_box_nonce'], 'sgs_floating_ui_meta_box' ) ) {
		return;
	}
	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
		return;
	}
	if ( ! current_user_can( 'edit_post', $post_id ) ) {
		return;
	}

	$hide = isset( $_POST['sgs_hide_floating_ui'] ) ? array_map( 'sanitize_text_field', $_POST['sgs_hide_floating_ui'] ) : array();
	update_post_meta( $post_id, '_sgs_hide_floating_ui', $hide );
}
add_action( 'save_post', __NAMESPACE__ . '\\save_floating_ui_meta_box' );
