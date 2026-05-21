<?php
/**
 * SGS Customiser Info Control — read-only info / link panel inside the Customiser.
 *
 * A thin WP_Customize_Control subclass that renders a descriptive text block
 * with an optional admin link. Used by SGS Header, Footer, and Site Info
 * sections to point operators at related admin pages (e.g. Header Rules)
 * without duplicating the full admin UI inside the Customiser panel.
 *
 * Accepts one extra arg `admin_url` (string) which is sprintf'd into the
 * description string as %s when the description contains a printf placeholder.
 *
 * Transport: always 'refresh' — this control carries no saveable value.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Customiser_Info_Control
 *
 * Renders a labelled info block with an optional HTML description string.
 * The description is output via wp_kses( sprintf( $description, $admin_url ) )
 * so the %s placeholder can safely embed a plain HTTPS URL.
 */
class Sgs_Customiser_Info_Control extends \WP_Customize_Control {

	/**
	 * Control type identifier. Gives WP a stable type key.
	 *
	 * @var string
	 */
	public $type = 'sgs_info';

	/**
	 * Optional URL to sprintf into the description string's %s placeholder.
	 * Must be a valid admin URL — sanitised before output.
	 *
	 * @var string
	 */
	public $admin_url = '';

	/**
	 * Render the control's content.
	 *
	 * Called by WP_Customize_Control::render_content(). The outer <li> wrapper
	 * and capability checks are handled by the parent class. We only output the
	 * inner markup here.
	 *
	 * @return void
	 */
	public function render_content(): void {
		$label = (string) $this->label;
		$desc  = (string) $this->description;
		$url   = \esc_url( (string) $this->admin_url );

		if ( $label ) {
			echo '<span class="customize-control-title">' . \esc_html( $label ) . '</span>';
		}

		if ( $desc ) {
			$formatted = $url ? sprintf( $desc, $url ) : $desc;
			echo '<span class="description customize-control-description">';
			echo \wp_kses(
				$formatted,
				array(
					'a' => array(
						'href'   => array(),
						'target' => array(),
						'rel'    => array(),
					),
				)
			);
			echo '</span>';
		}
	}
}
