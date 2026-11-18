<?php
/**
 * SGS Email Introduction — a per-email "Introduction" setting that replaces the
 * opening sentences of a WooCommerce customer email (Spec 04, FR-04-EMAIL-INTRO).
 *
 * Each customer email whose template opens with `<div class="email-introduction">`
 * gets an "Introduction" textarea on its own settings screen, stored with the
 * email's other settings (`sgs_introduction`) and empty by default. When filled,
 * it replaces the paragraphs inside that wrapper after WooCommerce has inlined
 * the CSS (`woocommerce_mail_content`, which WooCommerce's own preview applies
 * too). A button inside the wrapper (the verify-email link) stays. The switch for
 * the site's styles does not affect this setting.
 *
 * @package SGS\Blocks\Mail
 */

namespace SGS\Blocks\Mail;

defined( 'ABSPATH' ) || exit;

/** Adds the Introduction setting to customer emails and applies it to the rendered HTML. */
final class Sgs_Email_Introduction {

	/** Key of the field in an email's own settings. */
	const FIELD = 'sgs_introduction';

	/**
	 * The email being rendered, set on `woocommerce_email_header` and cleared once its content is final.
	 *
	 * @var object|null
	 */
	private static $current = null;

	/** Wire the hooks. Called once from sgs-blocks.php. */
	public static function register(): void {
		\add_filter( 'woocommerce_email_classes', array( __CLASS__, 'add_fields' ), 99 );
		\add_action( 'woocommerce_email_header', array( __CLASS__, 'remember_email' ), 1, 2 );
		\add_filter( 'woocommerce_mail_content', array( __CLASS__, 'replace_introduction' ), 99 );
	}

	/**
	 * Give each customer email whose template has an introduction its own field.
	 *
	 * @param  array<string,mixed> $emails WooCommerce email objects.
	 * @return array<string,mixed> Unchanged.
	 */
	public static function add_fields( $emails ) {
		if ( ! \is_array( $emails ) ) {
			return $emails;
		}
		foreach ( $emails as $email ) {
			if ( ! \is_object( $email ) || ! \method_exists( $email, 'is_customer_email' ) || ! $email->is_customer_email() || empty( $email->id ) ) {
				continue;
			}
			if ( ! self::template_has_introduction( $email ) ) {
				continue;
			}
			\add_filter( 'woocommerce_settings_api_form_fields_' . $email->id, array( __CLASS__, 'add_field' ) );
		}
		return $emails;
	}

	/**
	 * Add the Introduction field before the email type field, or at the end.
	 *
	 * @param  mixed $fields One email's form fields.
	 * @return mixed
	 */
	public static function add_field( $fields ) {
		if ( ! \is_array( $fields ) || isset( $fields[ self::FIELD ] ) ) {
			return $fields;
		}
		$field = array(
			'title'       => \__( 'Introduction', 'sgs-blocks' ),
			'type'        => 'textarea',
			'description' => \__( "Replaces the opening sentences of this email. A blank line starts a new paragraph. Placeholders: {customer_first_name} {order_number} {site_title}. Leave empty to keep WooCommerce's own wording.", 'sgs-blocks' ),
			'placeholder' => '',
			'default'     => '',
			'css'         => 'width:400px; height: 120px;',
			'desc_tip'    => true,
		);
		$out   = array();
		$added = false;
		foreach ( $fields as $key => $value ) {
			if ( ! $added && 'email_type' === $key ) {
				$out[ self::FIELD ] = $field;
				$added              = true;
			}
			$out[ $key ] = $value;
		}
		if ( ! $added ) {
			$out[ self::FIELD ] = $field;
		}
		return $out;
	}

	/**
	 * Note which email is rendering.
	 *
	 * @param  mixed $heading Email heading (unused).
	 * @param  mixed $email   The email object.
	 * @return void
	 */
	public static function remember_email( $heading, $email = null ): void { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter -- action signature.
		self::$current = \is_object( $email ) ? $email : null;
	}

	/**
	 * Replace the introduction in the inlined HTML when the email has one set.
	 *
	 * @param  mixed $content Final HTML of the email.
	 * @return mixed
	 */
	public static function replace_introduction( $content ) {
		$email         = self::$current;
		self::$current = null;
		if ( ! \is_string( $content ) || ! \is_object( $email ) || ! \method_exists( $email, 'get_option' ) ) {
			return $content;
		}
		$text = (string) $email->get_option( self::FIELD, '' );
		if ( '' === \trim( $text ) ) {
			return $content;
		}
		return self::apply( $content, $text, self::placeholders( $email ) );
	}

	/**
	 * Put the paragraphs of `$text` into the introduction wrapper.
	 *
	 * @param  string               $html         Email HTML.
	 * @param  string               $text         The Introduction setting.
	 * @param  array<string,string> $placeholders Placeholder to plain-text value.
	 * @return string The HTML unchanged when it has no introduction wrapper.
	 */
	public static function apply( string $html, string $text, array $placeholders ): string {
		if ( 1 !== \preg_match( '#(<div\b[^>]*\bclass="(?:[^"]*\s)?email-introduction(?:\s[^"]*)?"[^>]*>)(.*?)(</div>)#is', $html, $wrapper, PREG_OFFSET_CAPTURE ) ) {
			return $html;
		}
		$inner = $wrapper[2][0];

		// Reuse the style WooCommerce's inliner put on the paragraphs it replaces.
		$style = '';
		if ( 1 === \preg_match( '#<p\b[^>]*?\sstyle=(["\'])(.*?)\1#is', $inner, $match ) ) {
			$style = ' style=' . $match[1] . $match[2] . $match[1];
		}

		$values = array();
		foreach ( $placeholders as $token => $value ) {
			$values[ '{' . $token . '}' ] = \esc_html( $value );
		}
		$paragraphs = '';
		$blocks     = \preg_split( '/\n\s*\n/', \str_replace( array( "\r\n", "\r" ), "\n", \trim( $text ) ) );
		foreach ( false === $blocks ? array() : $blocks as $block ) {
			$block = \trim( $block );
			if ( '' === $block ) {
				continue;
			}
			$block       = \str_replace( \array_keys( $values ), \array_values( $values ), \wp_kses_post( \nl2br( $block ) ) );
			$paragraphs .= "<p{$style}>" . $block . '</p>';
		}
		if ( '' === $paragraphs ) {
			return $html;
		}

		// Keep a button (a paragraph holding an inline-block link); every other paragraph is replaced.
		$buttons = '';
		$kept    = (string) \preg_replace_callback(
			'#<p\b[^>]*>.*?</p>#is',
			static function ( array $m ) use ( &$buttons ): string {
				if ( 1 === \preg_match( '#<a\b[^>]*display:\s*inline-block#i', $m[0] ) ) {
					$buttons .= $m[0];
				}
				return '';
			},
			$inner
		);
		$new     = \trim( $kept ) . $paragraphs . $buttons;

		return \substr( $html, 0, $wrapper[2][1] ) . $new . \substr( $html, $wrapper[2][1] + \strlen( $inner ) );
	}

	/**
	 * Placeholder values for an email: first name and order number from its order, the site title.
	 *
	 * @param  object $email The WooCommerce email.
	 * @return array<string,string>
	 */
	private static function placeholders( $email ): array {
		$object = $email->object ?? null;
		$first  = '';
		$number = '';
		if ( \is_object( $object ) ) {
			if ( \method_exists( $object, 'get_billing_first_name' ) ) {
				$first = (string) $object->get_billing_first_name();
			} elseif ( isset( $object->first_name ) ) {
				$first = (string) $object->first_name;
			}
			if ( \method_exists( $object, 'get_order_number' ) ) {
				$number = (string) $object->get_order_number();
			}
		}
		return array(
			'customer_first_name' => $first,
			'order_number'        => $number,
			'site_title'          => (string) \get_bloginfo( 'name' ),
		);
	}

	/**
	 * Whether the email's template has an introduction wrapper (so the field has an effect).
	 *
	 * @param  object $email The WooCommerce email.
	 * @return bool
	 */
	private static function template_has_introduction( $email ): bool {
		static $cache = array();
		$template     = (string) ( $email->template_html ?? '' );
		if ( '' === $template || ! \function_exists( 'wc_locate_template' ) ) {
			return false;
		}
		if ( ! isset( $cache[ $template ] ) ) {
			$file               = (string) \wc_locate_template( $template );
			$source             = ( '' !== $file && \is_readable( $file ) ) ? \file_get_contents( $file ) : ''; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local template file.
			$cache[ $template ] = \is_string( $source ) && false !== \strpos( $source, 'email-introduction' );
		}
		return $cache[ $template ];
	}
}
