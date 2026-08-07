<?php
/**
 * SGS Button Presets — Customiser colour control.
 *
 * CLIENT-EXPERIENCE DESIGN (CLAUDE.md "Client experience is primary")
 * ------------------------------------------------------------------
 * A raw text box containing `var(--wp--preset--color--primary)` is unusable by a
 * non-coder, and a bare hex picker throws away the brand palette. This control follows
 * the `DesignTokenPicker` convention used in the block inspector: the client picks a
 * NAMED brand colour from the site's own palette, and only drops to a free hex picker
 * if they deliberately want something off-palette.
 *
 *   - A row of named swatches, labelled with the palette entry's human name
 *     ("Primary", "Text", "Surface") — drawn live from the active client's
 *     `theme-snapshot.json`, so no colour or name is hardcoded here.
 *   - "Transparent" and "Theme default" as explicit, named options rather than
 *     magic empty values.
 *   - "Custom colour…" reveals a native colour picker for anything else.
 *
 * Everything is keyboard reachable (radio semantics via real `<input type="radio">`),
 * each swatch has a visible label and a focus ring, and no swatch is smaller than
 * 44px — WCAG 2.1 AA plus 2.2's cheap wins, per the project baseline.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Customiser;

defined( 'ABSPATH' ) || exit;

if ( ! class_exists( '\\WP_Customize_Control' ) ) {
	return;
}

/**
 * Named-palette + custom-hex colour control for one button preset token.
 */
class Button_Preset_Control extends \WP_Customize_Control {

	/**
	 * Control type.
	 *
	 * @var string
	 */
	public $type = 'sgs_button_preset_colour';

	/**
	 * Send the palette to the control's JS template.
	 *
	 * @return void
	 */
	public function to_json() {
		parent::to_json();

		$choices = array(
			array(
				'value' => '',
				'name'  => __( 'Theme default', 'sgs-blocks' ),
				'color' => '',
			),
			array(
				'value' => 'transparent',
				'name'  => __( 'Transparent', 'sgs-blocks' ),
				'color' => 'transparent',
			),
		);

		foreach ( palette() as $slug => $entry ) {
			$choices[] = array(
				'value' => 'var(--wp--preset--color--' . $slug . ')',
				'name'  => $entry['name'],
				'color' => $entry['color'],
			);
		}

		$this->json['choices'] = $choices;
		$this->json['value']   = $this->value();
	}

	/**
	 * Underscore template for the control.
	 *
	 * @return void
	 */
	public function content_template() {
		?>
		<# var groupName = 'sgs-btn-preset-' + data.id; #>
		<div class="sgs-btn-preset-control">
			<span class="customize-control-title">{{ data.label }}</span>
			<# if ( data.description ) { #>
				<span class="description customize-control-description">{{ data.description }}</span>
			<# } #>

			<div class="sgs-btn-preset-swatches" role="group" aria-label="{{ data.label }}">
				<# _.each( data.choices, function ( choice ) { #>
					<label class="sgs-btn-preset-swatch" title="{{ choice.name }}">
						<input
							type="radio"
							name="{{ groupName }}"
							value="{{ choice.value }}"
							<# if ( choice.value === data.value ) { #>checked<# } #>
						/>
						<span
							class="sgs-btn-preset-chip<# if ( ! choice.color ) { #> is-empty<# } #>"
							style="background-color: {{ choice.color }}"
							aria-hidden="true"
						></span>
						<span class="sgs-btn-preset-name">{{ choice.name }}</span>
					</label>
				<# }); #>

				<label class="sgs-btn-preset-swatch sgs-btn-preset-swatch--custom" title="<?php esc_attr_e( 'Custom colour', 'sgs-blocks' ); ?>">
					<input type="radio" name="{{ groupName }}" value="__custom__" class="sgs-btn-preset-custom-radio" />
					<span class="sgs-btn-preset-chip sgs-btn-preset-chip--custom" aria-hidden="true"></span>
					<span class="sgs-btn-preset-name"><?php esc_html_e( 'Custom colour', 'sgs-blocks' ); ?></span>
				</label>
			</div>

			<input
				type="color"
				class="sgs-btn-preset-custom-input"
				aria-label="<?php esc_attr_e( 'Pick a custom colour', 'sgs-blocks' ); ?>"
			/>
			<input
				type="hidden"
				class="sgs-btn-preset-value"
				data-customize-setting-link="{{ data.id }}"
				value="{{ data.value }}"
			/>
		</div>
		<?php
	}
}
