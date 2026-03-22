<?php
/**
 * Business Details Settings Page
 *
 * Registers Settings > Business Details admin page. Stores global site
 * information (contact details, address, opening hours, social media URLs)
 * used by the sgs/business-info block and Schema.org output.
 *
 * @package SGS\Theme
 */

namespace SGS\Theme;

defined( 'ABSPATH' ) || exit;

class Business_Details {

	const OPTION_GROUP = 'sgs_business_details';
	const PAGE_SLUG    = 'sgs-business-details';

	const DAYS = [
		'monday'    => 'Monday',    'tuesday'  => 'Tuesday',
		'wednesday' => 'Wednesday', 'thursday' => 'Thursday',
		'friday'    => 'Friday',    'saturday' => 'Saturday',
		'sunday'    => 'Sunday',
	];

	public static function register(): void {
		add_action( 'admin_menu', [ __CLASS__, 'add_page' ] );
		add_action( 'admin_init', [ __CLASS__, 'register_settings' ] );
	}

	public static function add_page(): void {
		add_options_page(
			__( 'Business Details', 'sgs-theme' ),
			__( 'Business Details', 'sgs-theme' ),
			'manage_options',
			self::PAGE_SLUG,
			[ __CLASS__, 'render_page' ]
		);
	}

	public static function register_settings(): void {
		$slug = self::PAGE_SLUG;
		$cb   = __CLASS__;

		// ── Business Info ─────────────────────────────────────────────────────
		self::reg( 'sgs_business_name',    'sanitize_text_field' );
		self::reg( 'sgs_business_tagline', [ $cb, 'sanitise_textarea' ] );

		add_settings_section( 'sgs_section_business', __( 'Business Information', 'sgs-theme' ), [ $cb, 'render_section_business' ], $slug );
		self::field( 'sgs_business_name',    __( 'Business Name', 'sgs-theme' ),          'sgs_section_business', [ 'type' => 'text' ] );
		self::field( 'sgs_business_tagline', __( 'Tagline / Description', 'sgs-theme' ),  'sgs_section_business', [ 'textarea' => true ] );

		// ── Contact ───────────────────────────────────────────────────────────
		self::reg( 'sgs_business_phone',    [ $cb, 'sanitise_phone' ] );
		self::reg( 'sgs_business_email',    'sanitize_email' );
		self::reg( 'sgs_business_whatsapp', [ $cb, 'sanitise_phone' ] );

		add_settings_section( 'sgs_section_contact', __( 'Contact Details', 'sgs-theme' ), [ $cb, 'render_section_contact' ], $slug );
		self::field( 'sgs_business_phone',    __( 'Phone Number', 'sgs-theme' ),    'sgs_section_contact', [ 'type' => 'tel',   'placeholder' => '+44 121 000 0000' ] );
		self::field( 'sgs_business_email',    __( 'Email Address', 'sgs-theme' ),   'sgs_section_contact', [ 'type' => 'email', 'placeholder' => 'hello@example.com' ] );
		self::field( 'sgs_business_whatsapp', __( 'WhatsApp Number', 'sgs-theme' ), 'sgs_section_contact', [ 'type' => 'tel',   'placeholder' => '+447700000000', 'description' => __( 'International format without spaces, e.g. +447700000000', 'sgs-theme' ) ] );

		// ── Address ───────────────────────────────────────────────────────────
		foreach ( [ 'sgs_business_street', 'sgs_business_city', 'sgs_business_postcode', 'sgs_business_country' ] as $key ) {
			self::reg( $key, 'sanitize_text_field', 'sgs_business_country' === $key ? 'United Kingdom' : '' );
		}
		self::reg( 'sgs_business_maps_cid', [ $cb, 'sanitise_maps_cid' ] );

		add_settings_section( 'sgs_section_address', __( 'Address', 'sgs-theme' ), [ $cb, 'render_section_address' ], $slug );
		self::field( 'sgs_business_street',   __( 'Street Address', 'sgs-theme' ), 'sgs_section_address', [ 'type' => 'text' ] );
		self::field( 'sgs_business_city',     __( 'City / Town', 'sgs-theme' ),    'sgs_section_address', [ 'type' => 'text' ] );
		self::field( 'sgs_business_postcode', __( 'Postcode', 'sgs-theme' ),       'sgs_section_address', [ 'type' => 'text', 'class' => 'small-text' ] );
		self::field( 'sgs_business_country',  __( 'Country', 'sgs-theme' ),        'sgs_section_address', [ 'type' => 'text' ] );
		self::field( 'sgs_business_maps_cid', __( 'Google Maps CID', 'sgs-theme' ),'sgs_section_address', [ 'type' => 'text', 'description' => __( 'Digits-only CID from your Google Business Profile URL', 'sgs-theme' ) ] );

		// ── Social Media ──────────────────────────────────────────────────────
		$social_fields = [
			'sgs_social_linkedin'  => __( 'LinkedIn URL', 'sgs-theme' ),
			'sgs_social_facebook'  => __( 'Facebook URL', 'sgs-theme' ),
			'sgs_social_instagram' => __( 'Instagram URL', 'sgs-theme' ),
			'sgs_social_google'    => __( 'Google Business URL', 'sgs-theme' ),
			'sgs_social_twitter'   => __( 'X / Twitter URL', 'sgs-theme' ),
		];

		add_settings_section( 'sgs_section_social', __( 'Social Media', 'sgs-theme' ), [ $cb, 'render_section_social' ], $slug );
		foreach ( $social_fields as $key => $label ) {
			self::reg( $key, 'esc_url_raw' );
			self::field( $key, $label, 'sgs_section_social', [ 'type' => 'url', 'placeholder' => 'https://' ] );
		}

		// ── Opening Hours ─────────────────────────────────────────────────────
		register_setting( self::OPTION_GROUP, 'sgs_business_hours', [
			'type'              => 'array',
			'default'           => [],
			'sanitize_callback' => [ $cb, 'sanitise_hours' ],
		] );
		add_settings_section( 'sgs_section_hours', __( 'Opening Hours', 'sgs-theme' ), [ $cb, 'render_section_hours' ], $slug );
		add_settings_field( 'sgs_business_hours', '', [ $cb, 'render_field_hours' ], $slug, 'sgs_section_hours' );
	}

	// ── Private helpers ───────────────────────────────────────────────────────

	/** Register a single string option. */
	private static function reg( string $key, $sanitise, string $default = '' ): void {
		register_setting( self::OPTION_GROUP, $key, [
			'type'              => 'string',
			'default'           => $default,
			'sanitize_callback' => $sanitise,
		] );
	}

	/** Add a settings field pointing to render_field_text or render_field_textarea. */
	private static function field( string $key, string $label, string $section, array $extra = [] ): void {
		$renderer = ! empty( $extra['textarea'] ) ? [ __CLASS__, 'render_field_textarea' ] : [ __CLASS__, 'render_field_text' ];
		add_settings_field( $key, $label, $renderer, self::PAGE_SLUG, $section, array_merge( [ 'option' => $key ], $extra ) );
	}

	// ── Section descriptions ──────────────────────────────────────────────────

	public static function render_section_business(): void {
		echo '<p class="description">' . esc_html__( 'Core business information used in copyright notices and structured data (Schema.org).', 'sgs-theme' ) . '</p>';
	}
	public static function render_section_contact(): void {
		echo '<p class="description">' . esc_html__( 'Displayed in the header top bar, footer, and contact blocks.', 'sgs-theme' ) . '</p>';
	}
	public static function render_section_address(): void {
		echo '<p class="description">' . esc_html__( 'Used in the footer and Schema.org LocalBusiness structured data.', 'sgs-theme' ) . '</p>';
	}
	public static function render_section_social(): void {
		echo '<p class="description">' . esc_html__( 'Leave blank to hide an icon. Used in the header, footer, and social icon blocks.', 'sgs-theme' ) . '</p>';
	}
	public static function render_section_hours(): void {
		echo '<p class="description">' . esc_html__( 'Enter the times for each day, e.g. "9:00am – 5:30pm". Enter "Closed" for days you are not open.', 'sgs-theme' ) . '</p>';
	}

	// ── Field renderers ───────────────────────────────────────────────────────

	/**
	 * Render a text/email/tel/url input field.
	 *
	 * @param array{option: string, type?: string, placeholder?: string, description?: string, class?: string} $args
	 */
	public static function render_field_text( array $args ): void {
		$option      = $args['option'];
		$type        = $args['type'] ?? 'text';
		$placeholder = $args['placeholder'] ?? '';
		$description = $args['description'] ?? '';
		$class       = $args['class'] ?? 'regular-text';
		$value       = get_option( $option, '' );

		printf(
			'<input type="%s" id="%s" name="%s" value="%s" placeholder="%s" class="%s">',
			esc_attr( $type ),
			esc_attr( $option ),
			esc_attr( $option ),
			esc_attr( $value ),
			esc_attr( $placeholder ),
			esc_attr( $class )
		);

		if ( $description ) {
			printf( '<p class="description">%s</p>', esc_html( $description ) );
		}
	}

	/**
	 * Render a textarea field.
	 *
	 * @param array{option: string} $args
	 */
	public static function render_field_textarea( array $args ): void {
		$option = $args['option'];
		$value  = get_option( $option, '' );
		printf(
			'<textarea id="%s" name="%s" class="large-text" rows="3">%s</textarea>',
			esc_attr( $option ),
			esc_attr( $option ),
			esc_textarea( $value )
		);
	}

	/** Render the opening hours table — 7 rows, one per day. */
	public static function render_field_hours(): void {
		$hours = get_option( 'sgs_business_hours', [] );
		if ( ! is_array( $hours ) ) {
			$hours = [];
		}

		echo '<table class="widefat striped" style="max-width:500px">';
		echo '<thead><tr><th>' . esc_html__( 'Day', 'sgs-theme' ) . '</th><th>' . esc_html__( 'Hours', 'sgs-theme' ) . '</th></tr></thead><tbody>';

		foreach ( self::DAYS as $slug => $label ) {
			$day_value = isset( $hours[ $slug ] ) ? sanitize_text_field( $hours[ $slug ] ) : '';
			printf(
				'<tr><th scope="row" style="width:120px">%s</th><td><input type="text" name="sgs_business_hours[%s]" value="%s" class="regular-text" placeholder="%s"></td></tr>',
				esc_html( $label ),
				esc_attr( $slug ),
				esc_attr( $day_value ),
				esc_attr__( 'e.g. 9:00am – 5:30pm', 'sgs-theme' )
			);
		}

		echo '</tbody></table>';
	}

	// ── Sanitisation ─────────────────────────────────────────────────────────

	/** Sanitise textarea — strip tags, preserve line breaks. */
	public static function sanitise_textarea( string $value ): string {
		return sanitize_textarea_field( $value );
	}

	/** Sanitise phone — keep digits, +, spaces, hyphens, parentheses only. */
	public static function sanitise_phone( string $value ): string {
		return preg_replace( '/[^0-9+\s\-()]/', '', sanitize_text_field( $value ) );
	}

	/** Sanitise Google Maps CID — digits only. */
	public static function sanitise_maps_cid( string $value ): string {
		return preg_replace( '/[^0-9]/', '', sanitize_text_field( $value ) );
	}

	/**
	 * Sanitise opening hours array — only valid day slugs, plain string values.
	 *
	 * @param mixed $value
	 * @return array<string,string>
	 */
	public static function sanitise_hours( $value ): array {
		if ( ! is_array( $value ) ) {
			return [];
		}
		$clean = [];
		foreach ( self::DAYS as $slug => $label ) {
			if ( isset( $value[ $slug ] ) ) {
				$clean[ $slug ] = sanitize_text_field( $value[ $slug ] );
			}
		}
		return $clean;
	}

	// ── Page ─────────────────────────────────────────────────────────────────

	/** Render the full settings page. */
	public static function render_page(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		?>
		<div class="wrap">
			<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
			<p class="description" style="margin-bottom:1.5em;">
				<?php esc_html_e( 'Central store for business information used across blocks, templates, and Schema.org structured data. Update once — it reflects everywhere.', 'sgs-theme' ); ?>
			</p>
			<?php settings_errors( self::OPTION_GROUP ); ?>
			<form action="options.php" method="post">
				<?php
				settings_fields( self::OPTION_GROUP );
				do_settings_sections( self::PAGE_SLUG );
				submit_button( __( 'Save Business Details', 'sgs-theme' ) );
				?>
			</form>
		</div>
		<?php
	}
}

Business_Details::register();
