<?php
/**
 * sgs/buybox — back-in-stock notify-me form partial.
 *
 * Included by render.php when $notify_enabled is true. Not a standalone file.
 *
 * Expected variables in scope (set by render.php before the include):
 *   $buybox_post_id   int     Product post ID (for data-product-id).
 *   $notify_me_label  string  Sanitised heading/button label.
 *
 * The form is wrapped in data-wp-bind--hidden="context.inStock" so it is only
 * visible when the selected variation is out of stock. This is a pure read of
 * the existing sgs/product-card context — no new actions or state are added.
 *
 * @package SGS\Blocks
 * @since   1.18.0 (FR-30-10 Spec 30 Step 10)
 */

defined( 'ABSPATH' ) || exit;

// Privacy policy URL — only rendered when non-empty.
$notify_privacy_url = \function_exists( 'get_privacy_policy_url' ) ? \get_privacy_policy_url() : '';

$notify_email_id   = 'sgs-notify-email-' . \absint( $buybox_post_id );
$notify_consent_id = 'sgs-notify-consent-' . \absint( $buybox_post_id );
?>
<div
	class="sgs-buybox__notify"
	data-wp-bind--hidden="context.inStock"
>
	<p class="sgs-buybox__notify-heading">
		<?php echo \esc_html( $notify_me_label ); ?>
	</p>

	<form
		class="sgs-buybox__notify-form"
		data-product-id="<?php echo \esc_attr( (string) $buybox_post_id ); ?>"
		data-nonce="<?php echo \esc_attr( \wp_create_nonce( 'wp_rest' ) ); ?>"
		novalidate
	>
		<div class="sgs-buybox__notify-field">
			<label for="<?php echo \esc_attr( $notify_email_id ); ?>" class="sgs-buybox__notify-label">
				<?php \esc_html_e( 'Email address', 'sgs-blocks' ); ?>
			</label>
			<input
				type="email"
				id="<?php echo \esc_attr( $notify_email_id ); ?>"
				class="sgs-buybox__notify-email"
				name="email"
				autocomplete="email"
				required
				placeholder="<?php \esc_attr_e( 'your@email.com', 'sgs-blocks' ); ?>"
			/>
		</div>

		<div class="sgs-buybox__notify-consent-row">
			<input
				type="checkbox"
				id="<?php echo \esc_attr( $notify_consent_id ); ?>"
				class="sgs-buybox__notify-consent"
				name="consent"
				required
			/>
			<label for="<?php echo \esc_attr( $notify_consent_id ); ?>" class="sgs-buybox__notify-consent-label">
				<?php
				if ( '' !== $notify_privacy_url ) {
					printf(
						/* translators: 1: opening anchor tag, 2: closing anchor tag */
						\esc_html__( 'Email me once when this is back in stock. See our %1$sprivacy policy%2$s.', 'sgs-blocks' ),
						'<a href="' . \esc_url( $notify_privacy_url ) . '" target="_blank" rel="noopener noreferrer">',
						'</a>'
					);
				} else {
					\esc_html_e( 'Email me once when this is back in stock.', 'sgs-blocks' );
				}
				?>
			</label>
		</div>

		<?php
		// Turnstile widget — empty string when not configured (graceful skip).
		echo \SGS\Blocks\Turnstile::widget_html(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- widget_html() returns either '' or a div with esc_attr().
		?>

		<button type="submit" class="wp-element-button sgs-buybox__notify-submit">
			<?php echo \esc_html( $notify_me_label ); ?>
		</button>

		<p
			class="sgs-buybox__notify-status"
			role="status"
			aria-live="polite"
		></p>
	</form>
</div>