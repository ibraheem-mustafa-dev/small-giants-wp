<?php
/**
 * Back-in-stock notice — WC_Email subclass (Spec 30 FR-30-15, unified-email
 * plan phase 3). Sent once to a shopper who asked to be told when a product
 * came back in stock.
 *
 * Registered with WooCommerce by {@see Sgs_Shop_Emails}; never instantiated
 * before WooCommerce has loaded `WC_Email` (that class only exists inside the
 * `woocommerce_email_classes` filter callback).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/** The `sgs_back_in_stock` customer email. */
final class Email_Back_In_Stock extends \WC_Email {

	/**
	 * Restocked product's name.
	 *
	 * @var string
	 */
	private $product_name = '';

	/**
	 * Restocked product's URL.
	 *
	 * @var string
	 */
	private $product_url = '';

	/**
	 * Saved-items page URL, or '' when there is no such page.
	 *
	 * @var string
	 */
	private $manage_url = '';

	/** Set up the email's identity, templates and default form fields. */
	public function __construct() {
		$this->id             = 'sgs_back_in_stock';
		$this->customer_email = true;
		$this->title          = __( 'Back in stock', 'sgs-blocks' );
		$this->description    = __( 'Sent once to a shopper who asked to be told when a product came back in stock.', 'sgs-blocks' );
		$this->template_html  = 'emails/sgs-back-in-stock.php';
		$this->template_plain = 'emails/plain/sgs-back-in-stock.php';
		$this->template_base  = SGS_BLOCKS_PATH . 'templates/';
		$this->placeholders   = array(
			'{site_title}'   => $this->get_blogname(),
			'{product_name}' => '',
		);

		parent::__construct();
	}

	/**
	 * Send the back-in-stock notice to one subscriber.
	 *
	 * @param  string $to           Subscriber's email address.
	 * @param  string $product_name Restocked product's name.
	 * @param  string $product_url  Restocked product's URL.
	 * @param  string $manage_url   Saved-items page URL, or '' when there is none.
	 * @return bool True once `wp_mail()` reports the send succeeded.
	 */
	public function trigger( string $to, string $product_name, string $product_url, string $manage_url = '' ): bool {
		$this->setup_locale();

		$this->recipient    = \sanitize_email( $to );
		$this->product_name = self::strip_crlf( $product_name );
		$this->product_url  = $product_url;
		$this->manage_url   = $manage_url;
		$this->placeholders = array(
			'{site_title}'   => $this->get_blogname(),
			'{product_name}' => $this->product_name,
		);

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
	 * The HTML body, built from the back-in-stock template plus the
	 * per-subscriber data {@see self::trigger()} set.
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
	 * The plain-text body, built from the back-in-stock plain template.
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
			'product_name'       => $this->product_name,
			'product_url'        => $this->product_url,
			'manage_url'         => $this->manage_url,
			'sent_to_admin'      => false,
			'plain_text'         => $plain_text,
			'email'              => $this,
		);
	}

	/**
	 * Default subject, with the `{product_name}` and `{site_title}` placeholders.
	 *
	 * @return string
	 */
	public function get_default_subject(): string {
		return __( '{product_name} is back in stock at {site_title}', 'sgs-blocks' );
	}

	/**
	 * Default heading, with the `{product_name}` placeholder.
	 *
	 * @return string
	 */
	public function get_default_heading(): string {
		return __( 'Back in stock: {product_name}', 'sgs-blocks' );
	}

	/** Register the settings-screen fields (enable switch, subject, heading, additional content). */
	public function init_form_fields(): void {
		$placeholder_text = sprintf(
			/* translators: %s: comma-separated list of placeholder tokens */
			__( 'Available placeholders: %s', 'sgs-blocks' ),
			'<code>{product_name}</code>, <code>{site_title}</code>'
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
			'email_type'         => array(
				'title'       => __( 'Email type', 'sgs-blocks' ),
				'type'        => 'select',
				'description' => __( 'Choose which format of email to send.', 'sgs-blocks' ),
				'default'     => 'html',
				'class'       => 'email_type wc-enhanced-select',
				'options'     => $this->get_email_type_options(),
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
		return __( 'This is a one-off message; we will not email you again about this product.', 'sgs-blocks' );
	}

	/**
	 * Strip a carriage return or line feed from a placeholder value.
	 *
	 * @param  string $value Raw value.
	 * @return string
	 */
	private static function strip_crlf( string $value ): string {
		return (string) \preg_replace( '/[\r\n]+/', '', $value );
	}
}
