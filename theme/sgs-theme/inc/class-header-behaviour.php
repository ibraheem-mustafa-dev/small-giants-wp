<?php
/**
 * SGS Header Behaviour System
 *
 * Injects CSS classes onto the <header> template part based on global settings
 * and per-page overrides. Handles sticky, transparent, shrink, smart-reveal,
 * and transparent+sticky combo modes.
 *
 * Architecture: one header.html template part, behaviour controlled by CSS
 * classes injected via render_block filter. No template duplication needed.
 *
 * @package SGS\Theme
 */

namespace SGS\Theme;

defined( 'ABSPATH' ) || exit;

/**
 * Register header behaviour settings.
 *
 * Creates:
 * - sgs_header_mode: global default mode (static|sticky|transparent|transparent-sticky|smart-reveal|shrink)
 * - sgs_header_top_bar: whether to show the top bar (1|0)
 * - _sgs_header_mode: per-page/post meta override
 */
function register_header_settings(): void {
	// Global header mode.
	register_setting( 'sgs_header', 'sgs_header_mode', [
		'type'              => 'string',
		'default'           => 'static',
		'sanitize_callback' => __NAMESPACE__ . '\sanitise_header_mode',
		'show_in_rest'      => true,
	] );

	// Global top bar visibility.
	register_setting( 'sgs_header', 'sgs_header_top_bar', [
		'type'              => 'boolean',
		'default'           => true,
		'sanitize_callback' => 'rest_sanitize_boolean',
		'show_in_rest'      => true,
	] );

	// Per-page override meta.
	register_post_meta( '', '_sgs_header_mode', [
		'type'              => 'string',
		'single'            => true,
		'default'           => 'default',
		'sanitize_callback' => __NAMESPACE__ . '\sanitise_header_mode_meta',
		'show_in_rest'      => true,
		'auth_callback'     => function () {
			return current_user_can( 'edit_posts' );
		},
	] );
}
add_action( 'init', __NAMESPACE__ . '\register_header_settings' );

/**
 * Sanitise header mode value.
 */
function sanitise_header_mode( string $value ): string {
	$valid = [ 'static', 'sticky', 'transparent', 'transparent-sticky', 'smart-reveal', 'shrink' ];
	return in_array( $value, $valid, true ) ? $value : 'static';
}

/**
 * Sanitise per-page header mode meta (includes 'default' option).
 */
function sanitise_header_mode_meta( string $value ): string {
	$valid = [ 'default', 'static', 'sticky', 'transparent', 'transparent-sticky', 'smart-reveal', 'shrink', 'hidden' ];
	return in_array( $value, $valid, true ) ? $value : 'default';
}

/**
 * Get the effective header mode for the current page.
 *
 * Checks per-page meta first, falls back to global setting.
 */
function get_header_mode(): string {
	$page_mode = '';

	if ( is_singular() ) {
		$page_mode = get_post_meta( get_the_ID(), '_sgs_header_mode', true );
	}

	if ( $page_mode && 'default' !== $page_mode ) {
		return $page_mode;
	}

	return get_option( 'sgs_header_mode', 'static' );
}

/**
 * Inject header behaviour classes onto the <header> template part.
 *
 * Replaces the old propagate_header_classes function that looked for classes
 * in the HTML content. This reads the setting and injects dynamically.
 *
 * @param string $html  Rendered block HTML.
 * @param array  $block Block data.
 * @return string Modified HTML.
 */
function inject_header_classes( string $html, array $block ): string {
	if ( empty( $block['blockName'] ) || 'core/template-part' !== $block['blockName'] ) {
		return $html;
	}

	// Only apply to header area template parts.
	$tag_name = $block['attrs']['tagName'] ?? '';
	if ( 'header' !== $tag_name ) {
		return $html;
	}

	$mode = get_header_mode();

	// Hidden mode: remove the header entirely.
	if ( 'hidden' === $mode ) {
		return '';
	}

	// Build class list based on mode.
	$classes = [];
	$body_classes_to_add = [];

	switch ( $mode ) {
		case 'sticky':
			$classes[] = 'sgs-header-sticky';
			break;

		case 'transparent':
			$classes[] = 'sgs-header-transparent';
			$body_classes_to_add[] = 'sgs-has-transparent-header';
			break;

		case 'transparent-sticky':
			$classes[] = 'sgs-header-transparent';
			$classes[] = 'sgs-header-sticky';
			$classes[] = 'sgs-header-transparent-sticky';
			$body_classes_to_add[] = 'sgs-has-transparent-header';
			break;

		case 'smart-reveal':
			$classes[] = 'sgs-header-sticky';
			$classes[] = 'sgs-header-smart-reveal';
			break;

		case 'shrink':
			$classes[] = 'sgs-header-shrink';
			break;

		case 'static':
		default:
			// No extra classes needed.
			break;
	}

	// Check top bar visibility.
	$show_top_bar = (bool) get_option( 'sgs_header_top_bar', true );

	// In fully-transparent mode (no sticky), hide top bar by default.
	// transparent-sticky retains the top bar since it becomes opaque on scroll.
	if ( 'transparent' === $mode ) {
		$show_top_bar = false;
	}

	if ( ! $show_top_bar ) {
		$classes[] = 'sgs-header-no-top-bar';

		/*
		 * Inject sgs-hidden class onto the top bar element.
		 * CSS handles the hiding via !important to beat WP global styles.
		 */
		$html = preg_replace(
			'/(<div\b[^>]*class=")(wp-block-group[^"]*(?:sgs-header-top-bar|has-primary-background-color))/i',
			'$1sgs-hidden $2',
			$html,
			1
		);
	}

	// Inject classes onto the <header> tag.
	if ( ! empty( $classes ) ) {
		$classes_str = implode( ' ', $classes );
		$html = preg_replace(
			'/^(<header\b[^>]*class=["\'])/',
			'$1' . $classes_str . ' ',
			$html,
			1
		);
	}

	// Store body classes for later output.
	if ( ! empty( $body_classes_to_add ) ) {
		// Use a global to pass body classes to the body_class filter.
		global $sgs_header_body_classes;
		if ( ! is_array( $sgs_header_body_classes ) ) {
			$sgs_header_body_classes = [];
		}
		$sgs_header_body_classes = array_merge( $sgs_header_body_classes, $body_classes_to_add );
	}

	return $html;
}
add_filter( 'render_block', __NAMESPACE__ . '\inject_header_classes', 10, 2 );

/**
 * Add header-related body classes.
 *
 * @param string[] $classes Existing body classes.
 * @return string[] Modified body classes.
 */
function header_body_classes( array $classes ): array {
	global $sgs_header_body_classes;

	if ( ! empty( $sgs_header_body_classes ) && is_array( $sgs_header_body_classes ) ) {
		$classes = array_merge( $classes, $sgs_header_body_classes );
	}

	return $classes;
}
add_filter( 'body_class', __NAMESPACE__ . '\header_body_classes' );

/**
 * Add Settings > SGS Header admin page.
 */
function add_header_settings_page(): void {
	add_options_page(
		__( 'SGS Header', 'sgs-theme' ),
		__( 'SGS Header', 'sgs-theme' ),
		'manage_options',
		'sgs-header',
		__NAMESPACE__ . '\render_header_settings_page'
	);
}
add_action( 'admin_menu', __NAMESPACE__ . '\add_header_settings_page' );

/**
 * Render the header settings admin page.
 */
function render_header_settings_page(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	// Handle form submission.
	if ( isset( $_POST['sgs_header_nonce'] ) && wp_verify_nonce( $_POST['sgs_header_nonce'], 'sgs_header_settings' ) ) {
		$mode = sanitise_header_mode( $_POST['sgs_header_mode'] ?? 'static' );
		update_option( 'sgs_header_mode', $mode );

		$top_bar = ! empty( $_POST['sgs_header_top_bar'] );
		update_option( 'sgs_header_top_bar', $top_bar );

		echo '<div class="updated"><p>' . esc_html__( 'Settings saved.', 'sgs-theme' ) . '</p></div>';
	}

	$current_mode    = get_option( 'sgs_header_mode', 'static' );
	$current_top_bar = (bool) get_option( 'sgs_header_top_bar', true );

	$modes = [
		'static'             => __( 'Static — scrolls with page', 'sgs-theme' ),
		'sticky'             => __( 'Sticky — fixed to top on scroll', 'sgs-theme' ),
		'transparent'        => __( 'Transparent — overlays hero content', 'sgs-theme' ),
		'transparent-sticky' => __( 'Transparent + Sticky — starts transparent, becomes sticky on scroll', 'sgs-theme' ),
		'smart-reveal'       => __( 'Smart Reveal — hides on scroll down, reveals on scroll up', 'sgs-theme' ),
		'shrink'             => __( 'Shrink — reduces padding on scroll', 'sgs-theme' ),
	];

	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'SGS Header Settings', 'sgs-theme' ); ?></h1>
		<p><?php esc_html_e( 'Configure the default header behaviour for your site. Individual pages can override this in the editor sidebar.', 'sgs-theme' ); ?></p>

		<form method="post">
			<?php wp_nonce_field( 'sgs_header_settings', 'sgs_header_nonce' ); ?>

			<table class="form-table">
				<tr>
					<th scope="row">
						<label for="sgs_header_mode"><?php esc_html_e( 'Header Mode', 'sgs-theme' ); ?></label>
					</th>
					<td>
						<select name="sgs_header_mode" id="sgs_header_mode">
							<?php foreach ( $modes as $value => $label ) : ?>
								<option value="<?php echo esc_attr( $value ); ?>" <?php selected( $current_mode, $value ); ?>>
									<?php echo esc_html( $label ); ?>
								</option>
							<?php endforeach; ?>
						</select>
					</td>
				</tr>
				<tr>
					<th scope="row"><?php esc_html_e( 'Top Bar', 'sgs-theme' ); ?></th>
					<td>
						<label>
							<input type="checkbox" name="sgs_header_top_bar" value="1" <?php checked( $current_top_bar ); ?>>
							<?php esc_html_e( 'Show top bar (phone, email, social links)', 'sgs-theme' ); ?>
						</label>
						<p class="description">
							<?php esc_html_e( 'The top bar is automatically hidden in transparent and transparent+sticky modes.', 'sgs-theme' ); ?>
						</p>
					</td>
				</tr>
			</table>

			<?php submit_button(); ?>
		</form>
	</div>
	<?php
}

/**
 * Register per-page header mode sidebar panel in the block editor.
 */
function register_header_mode_editor_panel(): void {
	$asset_path = get_theme_file_path( 'assets/js/header-editor-panel.js' );
	if ( ! file_exists( $asset_path ) ) {
		return;
	}

	wp_enqueue_script(
		'sgs-header-editor-panel',
		get_theme_file_uri( 'assets/js/header-editor-panel.js' ),
		[ 'wp-plugins', 'wp-edit-post', 'wp-components', 'wp-data', 'wp-element', 'wp-i18n' ],
		wp_get_theme()->get( 'Version' ),
		true
	);
}
add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\register_header_mode_editor_panel' );
