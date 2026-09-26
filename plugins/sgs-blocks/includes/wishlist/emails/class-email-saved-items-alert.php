<?php
/**
 * Saved-items alert — WC_Email subclass (Spec 30 FR-30-15, unified-email
 * plan phase 3). Sent to a shopper when a saved item's price has dropped, or
 * a saved item has come back in stock.
 *
 * Registered with WooCommerce by {@see Sgs_Shop_Emails}; never instantiated
 * before WooCommerce has loaded `WC_Email` (that class only exists inside the
 * `woocommerce_email_classes` filter callback).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/** The `sgs_saved_items_alert` customer email. */
final class Email_Saved_Items_Alert extends \WC_Email {

	/**
	 * Shopper's first name, or '' when unknown.
	 *
	 * @var string
	 */
	private $first_name = '';

	/**
	 * Changed-item view models: `{type, name, url, price_now?, price_saved?}`.
	 *
	 * @var array
	 */
	private $alert_items = array();

	/**
	 * Saved-items page URL, or '' when there is no such page.
	 *
	 * @var string
	 */
	private $manage_url = '';

	/** Set up the email's identity, templates and default form fields. */
	public function __construct() {
		$this->id             = 'sgs_saved_items_alert';
		$this->customer_email = true;
		$this->title          = __( 'Saved items alert', 'sgs-blocks' );
		$this->description    = __( 'Sent to a shopper when a price they saved has dropped, or a saved item is back in stock.', 'sgs-blocks' );
		$this->template_html  = 'emails/sgs-saved-items-alert.php';
		$this->template_plain = 'emails/plain/sgs-saved-items-alert.php';
		$this->template_base  = SGS_BLOCKS_PATH . 'templates/';
		$this->placeholders   = array( '{site_title}' => $this->get_blogname() );

		parent::__construct();
	}

	/**
	 * Send the alert to one shopper.
	 *
	 * @param  string $to         Shopper's email address.
	 * @param  string $first_name Shopper's first name, or '' when unknown.
	 * @param  array  $items      Changed-item view models.
	 * @param  string $manage_url Saved-items page URL, or '' when there is none.
	 * @return bool True once `wp_mail()` reports the send succeeded.
	 */
	public function trigger( string $to, string $first_name, array $items, string $manage_url ): bool {
		$this->setup_locale();

		$this->recipient    = \sanitize_email( $to );
		$this->first_name   = self::strip_crlf( $first_name );
		$this->alert_items  = $items;
		$this->manage_url   = $manage_url;
		$this->placeholders = array( '{site_title}' => $this->get_blogname() );

		if ( ! $this->is_enabled() || ! $this->get_recipient() ) {
			$this->restore_locale();
			return false;
		}

		$sent = $this->send(
			$this->get_recipient(),
			$this->get_subject(),
			$this->get_content(),
			$this->get_headers(),
			$this->get_attachments()
		);

		$this->restore_locale();

		return $sent;
	}

	/**
	 * The HTML body, built from the saved-items-alert template plus the
	 * per-shopper data {@see self::trigger()} set.
	 *
	 * @return string
	 */
	public function get_content_html(): string {
		return \wc_get_template_html(
			$this->template_html,
			$this->template_args( false ),
			'',
			$this->template_base
		);
	}

	/**
	 * The plain-text body, built from the saved-items-alert plain template.
	 *
	 * @return string
	 */
	public function get_content_plain(): string {
		return \wc_get_template_html(
			$this->template_plain,
			$this->template_args( true ),
			'',
			$this->template_base
		);
	}

	/**
	 * Shared template args for both the HTML and plain bodies.
	 *
	 * @param  bool $plain_text Whether this is the plain-text render.
	 * @return array
	 */
	private function template_args( bool $plain_text ): array {
		return array(
			'email_heading'      => $this->get_heading(),
			'additional_content' => $this->get_additional_content(),
			'first_name'         => $this->first_name,
			'items'              => $this->alert_items,
			'manage_url'         => $this->manage_url,
			'sent_to_admin'      => false,
			'plain_text'         => $plain_text,
			'email'              => $this,
		);
	}

	/**
	 * Default subject, with the `{site_title}` placeholder.
	 *
	 * @return string
	 */
	public function get_default_subject(): string {
		return __( 'Update on your saved items at {site_title}', 'sgs-blocks' );
	}

	/**
	 * Default heading.
	 *
	 * @return string
	 */
	public function get_default_heading(): string {
		return __( 'Your saved items have changed', 'sgs-blocks' );
	}

	/** Register the settings-screen fields (enable switch, subject, heading, additional content). */
	public function init_form_fields(): void {
		$placeholder_text = sprintf(
			/* translators: %s: comma-separated list of placeholder tokens */
			__( 'Available placeholders: %s', 'sgs-blocks' ),
			'<code>{site_title}</code>'
		);

		$this->form_fields = array(
			'enabled'            => array(
				'title'   => __( 'Enable/Disable', 'sgs-blocks' ),
				'type'    => 'checkbox',
				'label'   => __( 'Enable this email notification', 'sgs-blocks' ),
				'default' => 'yes',
			),
			'subject'            => array(
				'title'       => __( 'Subject', 'sgs-blocks' ),
				'type'        => 'text',
				'desc_tip'    => true,
				'description' => $placeholder_text,
				'placeholder' => $this->get_default_subject(),
				'default'     => '',
			),
			'heading'            => array(
				'title'       => __( 'Email heading', 'sgs-blocks' ),
				'type'        => 'text',
				'desc_tip'    => true,
				'description' => $placeholder_text,
				'placeholder' => $this->get_default_heading(),
				'default'     => '',
			),
			'additional_content' => array(
				'title'       => __( 'Additional content', 'sgs-blocks' ),
				'description' => __( 'Text to appear below the main email content.', 'sgs-blocks' ),
				'type'        => 'textarea',
				'default'     => $this->get_default_additional_content(),
				'desc_tip'    => true,
			),
		);
	}

	/**
	 * Default additional content shown under the settings-screen field.
	 *
	 * @return string
	 */
	public function get_default_additional_content(): string {
		return __( 'You are getting this because you turned on saved-item alerts. You can switch them off at any time from your saved items page.', 'sgs-blocks' );
	}

	/**
	 * Strip a carriage return or line feed from a placeholder value (a shopper's
	 * first name is free text and must never reach a mail header unescaped).
	 *
	 * @param  string $value Raw value.
	 * @return string
	 */
	private static function strip_crlf( string $value ): string {
		return (string) \preg_replace( '/[\r\n]+/', '', $value );
	}
}
