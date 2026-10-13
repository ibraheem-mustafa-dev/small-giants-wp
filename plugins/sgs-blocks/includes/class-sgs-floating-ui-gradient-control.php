<?php
/**
 * SGS Floating UI — Customiser control for the reading-progress gradient.
 *
 * A text field that takes a CSS gradient string, with a live preview swatch
 * and a browser-side validity message (driven by assets/floating-ui/customise-control.js).
 * The server remains the authority: the setting's sanitiser is
 * `sgs_css_gradient_value()`.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Floating_UI_Gradient_Control
 */
class Sgs_Floating_UI_Gradient_Control extends \WP_Customize_Control {

	/**
	 * Control type slug.
	 *
	 * @var string
	 */
	public $type = 'sgs_gradient_text';

	/**
	 * Render the control markup: label, description, input, swatch, message.
	 */
	protected function render_content(): void {
		?>
		<label>
			<?php if ( '' !== (string) $this->label ) : ?>
				<span class="customize-control-title"><?php echo \esc_html( $this->label ); ?></span>
			<?php endif; ?>
			<?php if ( '' !== (string) $this->description ) : ?>
				<span class="description customize-control-description"><?php echo \esc_html( $this->description ); ?></span>
			<?php endif; ?>
			<input type="text" class="sgs-gradient-control__input" spellcheck="false" value="<?php echo \esc_attr( (string) $this->value() ); ?>" <?php $this->link(); ?> />
		</label>
		<span class="sgs-gradient-control__swatch" aria-hidden="true"></span>
		<span class="sgs-gradient-control__message description" role="status"></span>
		<?php
	}
}
