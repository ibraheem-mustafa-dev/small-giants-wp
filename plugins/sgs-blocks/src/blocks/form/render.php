<?php
/**
 * Server-side render for the SGS Form block.
 *
 * WS-4 (composite-mirror, 2026-06-04): outer wrapper now emitted by
 * SGS_Container_Wrapper::render( ..., 'layout', ... ) so the block inherits
 * sgs/container's full LAYOUT-scope capabilities (align/maxWidth/contentWidth,
 * customWidth, gap, grid/flex, responsive gridTemplateColumns, etc.).
 *
 * The Interactivity API data-* attributes, focus-ring CSS vars, form ID and
 * store-submissions flags are carried through via the `extra_attrs` opt.
 * The block's own class (sgs-form) rides in `extra_classes`.
 * The interior (progress bar + <form> + success/error messages) is $inner_html.
 *
 * R-22-14: explicit discriminators only — never branch on empty($content).
 *
 * NO-INLINE (contract §A, 2026-07-09): color/typography/spacing/
 * __experimentalBorder all declare __experimentalSkipSerialization in
 * block.json. The wrapper handles base+tier padding/margin scoped internally
 * (paddingTablet/paddingMobile/marginTablet/marginMobile object attrs, new
 * this migration — box-group contract §B). color/typography/border are
 * block-private (mirrors sgs/container's render.php pattern): extracted from
 * $attributes['style'], emitted into a scoped `<style>` keyed to a
 * content-hash uid CLASS, fed to the wrapper via `extra_classes`. The submit
 * button's colour (previously inline style="") is now a scoped rule on
 * `.uid .sgs-form__button--submit`; the honeypot's off-screen positioning
 * (previously inline style="position:absolute;...") now relies solely on the
 * pre-existing `.sgs-form__honeypot` rule in style.css — the div carries only
 * its class.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

// CSS-keyword sanitiser — letters + hyphen only (border-style — the only
// free-text keyword sgs/form's declared supports concatenate into scoped CSS;
// fontSize/lineHeight are string values passed straight to
// wp_style_engine_get_styles(), which sanitises them internally).
$sgs_form_css_keyword = static function ( $value ) {
	return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
};

$form_id           = $attributes['formId'] ?? '';
$form_name         = $attributes['formName'] ?? '';
$submit_label      = $attributes['submitLabel'] ?? __( 'Submit', 'sgs-blocks' );
$submit_style      = $attributes['submitStyle'] ?? 'primary';
$success_message   = $attributes['successMessage'] ?? __( 'Thank you! Your submission has been received.', 'sgs-blocks' );
$success_redirect  = $attributes['successRedirect'] ?? '';
$success_redirect  = $success_redirect ? wp_validate_redirect( $success_redirect, '' ) : '';
$honeypot          = $attributes['honeypot'] ?? true;
$store_submissions = $attributes['storeSubmissions'] ?? true;
$submit_colour     = $attributes['submitColour'] ?? '';
$submit_background = $attributes['submitBackground'] ?? '';
$progress_colour   = $attributes['progressBarColour'] ?? 'primary';

// Count form steps from inner blocks (not rendered content).
$steps       = array();
$total_steps = 0;

foreach ( $block->inner_blocks as $inner_block ) {
	if ( 'sgs/form-step' === $inner_block->name ) {
		++$total_steps;
		$steps[] = array(
			/* translators: %d: step number */
			'label' => $inner_block->attributes['label'] ?? sprintf( __( 'Step %d', 'sgs-blocks' ), $total_steps ),
		);
	}
}

$is_multi_step = $total_steps > 1;
$require_login = $attributes['requireLogin'] ?? false;
$rate_limit    = absint( $attributes['rateLimit'] ?? 5 );

// Focus ring attributes — editor-controllable, keyboard-only (:focus-visible).
$focus_ring_colour  = $attributes['formFocusRingColour'] ?? 'primary';
$focus_ring_width   = absint( $attributes['formFocusRingWidth'] ?? 2 );
$focus_ring_opacity = absint( $attributes['formFocusRingOpacity'] ?? 40 );
$focus_ring_offset  = absint( $attributes['formFocusRingOffset'] ?? 2 );

// Cache form configuration server-side so the submit handler can enforce
// requireLogin and per-form rateLimit without trusting client data.
// Transient lasts 24 hours; re-cached on every page render.
if ( ! empty( $form_id ) ) {
	set_transient(
		'sgs_form_config_' . sanitize_key( $form_id ),
		array(
			'requireLogin' => $require_login,
			'rateLimit'    => $rate_limit,
		),
		DAY_IN_SECONDS
	);
}

// Initialise Interactivity API global state.
wp_interactivity_state(
	'sgs/form',
	array(
		'restUrl' => rest_url( 'sgs-forms/v1/' ),
		'nonce'   => wp_create_nonce( 'wp_rest' ),
	)
);

// Form-level context.
$context = array(
	'formId'          => $form_id,
	'currentStep'     => 0,
	'totalSteps'      => $total_steps,
	'isMultiStep'     => $is_multi_step,
	'submitting'      => false,
	'submitted'       => false,
	'errorMessage'    => '',
	'successMessage'  => $success_message,
	'successRedirect' => $success_redirect,
);

// ---------------------------------------------------------------------------
// Block-private scoped color/typography/border supports (no-inline contract
// §A) — mirrors sgs/container's render.php pattern. Base padding/margin +
// their Tablet/Mobile tiers are handled separately, scoped, inside
// SGS_Container_Wrapper::render() (reads $attributes['paddingTablet'] etc.
// directly — no change needed here beyond the new block.json attrs).
// ---------------------------------------------------------------------------
$sgs_form_style_group      = is_array( $attributes['style'] ?? null ) ? $attributes['style'] : array();
$sgs_form_supports_css     = '';
$sgs_form_supports_classes = array( 'sgs-form' );

if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$sgs_form_style_engine_input = array();

	if ( ! empty( $sgs_form_style_group['color'] ) && is_array( $sgs_form_style_group['color'] ) ) {
		$sgs_form_style_engine_input['color'] = $sgs_form_style_group['color'];
	}

	if ( ! empty( $sgs_form_style_group['border'] ) && is_array( $sgs_form_style_group['border'] ) ) {
		$sgs_form_border_raw = $sgs_form_style_group['border'];
		$sgs_form_border     = array();
		if ( isset( $sgs_form_border_raw['color'] ) && '' !== $sgs_form_border_raw['color'] ) {
			$sgs_form_border['color'] = (string) $sgs_form_border_raw['color'];
		}
		if ( isset( $sgs_form_border_raw['style'] ) && '' !== $sgs_form_border_raw['style'] ) {
			$sgs_form_border['style'] = $sgs_form_css_keyword( $sgs_form_border_raw['style'] );
		}
		if ( isset( $sgs_form_border_raw['width'] ) && '' !== $sgs_form_border_raw['width'] ) {
			$sgs_form_border['width'] = $sgs_form_border_raw['width'];
		}
		if ( isset( $sgs_form_border_raw['radius'] ) && '' !== $sgs_form_border_raw['radius'] ) {
			$sgs_form_border['radius'] = $sgs_form_border_raw['radius'];
		}
		if ( ! empty( $sgs_form_border ) ) {
			$sgs_form_style_engine_input['border'] = $sgs_form_border;
		}
	}

	if ( ! empty( $sgs_form_style_engine_input ) ) {
		$sgs_form_uid = 'sgs-form-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
		$sgs_form_sel = '.' . $sgs_form_uid . '.sgs-form';

		$sgs_form_engine_styles = wp_style_engine_get_styles(
			$sgs_form_style_engine_input,
			array( 'selector' => $sgs_form_sel )
		);
		if ( ! empty( $sgs_form_engine_styles['css'] ) ) {
			$sgs_form_supports_css      .= $sgs_form_engine_styles['css'];
			$sgs_form_supports_classes[] = $sgs_form_uid;
		}
	}

	// Typography — declared selector (block.json selectors.typography.root,
	// none declared for sgs/form, so scope to the block root itself).
	$sgs_form_typography_args = array();
	if ( isset( $sgs_form_style_group['typography']['fontSize'] ) && '' !== $sgs_form_style_group['typography']['fontSize'] ) {
		$sgs_form_typography_args['fontSize'] = (string) $sgs_form_style_group['typography']['fontSize'];
	}
	if ( isset( $sgs_form_style_group['typography']['lineHeight'] ) && '' !== $sgs_form_style_group['typography']['lineHeight'] ) {
		$sgs_form_typography_args['lineHeight'] = (string) $sgs_form_style_group['typography']['lineHeight'];
	}
	if ( ! empty( $sgs_form_typography_args ) ) {
		if ( empty( $sgs_form_uid ) ) {
			$sgs_form_uid                = 'sgs-form-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
			$sgs_form_supports_classes[] = $sgs_form_uid;
		}
		$sgs_form_typography_scoped = wp_style_engine_get_styles(
			array( 'typography' => $sgs_form_typography_args ),
			array( 'selector' => '.' . $sgs_form_uid . '.sgs-form' )
		);
		if ( ! empty( $sgs_form_typography_scoped['css'] ) ) {
			$sgs_form_supports_css .= $sgs_form_typography_scoped['css'];
		}
	}
}

$sgs_form_preset_text = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$sgs_form_preset_bg   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
if ( '' !== $sgs_form_preset_text ) {
	$sgs_form_supports_classes[] = 'has-text-color';
	$sgs_form_supports_classes[] = 'has-' . $sgs_form_preset_text . '-color';
}
if ( '' !== $sgs_form_preset_bg ) {
	$sgs_form_supports_classes[] = 'has-background';
	$sgs_form_supports_classes[] = 'has-' . $sgs_form_preset_bg . '-background-color';
}

// Submit button colour — moved from inline style="" (contract §A) into a
// scoped rule on `.uid .sgs-form__button--submit`. Uses the SAME uid as the
// color/border/typography supports above (generated eagerly here when none
// of those already needed one) so everything lands in ONE scoped <style>.
if ( $submit_colour || $submit_background ) {
	if ( empty( $sgs_form_uid ) ) {
		$sgs_form_uid                = 'sgs-form-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
		$sgs_form_supports_classes[] = $sgs_form_uid;
	}
	$sgs_form_submit_decls = array();
	if ( $submit_colour ) {
		$sgs_form_submit_decls[] = 'color:' . sgs_colour_value( $submit_colour );
	}
	if ( $submit_background ) {
		$sgs_form_submit_decls[] = 'background-color:' . sgs_colour_value( $submit_background );
	}
	$sgs_form_supports_css .= '.' . $sgs_form_uid . ' .sgs-form__button--submit{' . implode( ';', $sgs_form_submit_decls ) . '}';
}

// Build progress bar colour style — a CSS custom-property VALUE (contract §A
// allows `--x:y`, not a real property declaration), so this stays inline.
$progress_style_attr = '';
if ( $progress_colour ) {
	$progress_style_attr = ' style="--sgs-progress-colour:' . sgs_colour_value( $progress_colour ) . '"';
}

// Build focus ring CSS custom properties for :focus-visible on form inputs.
// Opacity attribute is stored as 0-100 integer; CSS needs 0-1 decimal.
// absint() sanitises every value before interpolation.
$focus_ring_css_vars = '--sgs-focus-ring-width:' . absint( $focus_ring_width ) . 'px'
	. ';--sgs-focus-ring-colour:' . esc_attr( sgs_colour_value( $focus_ring_colour ) )
	. ';--sgs-focus-ring-opacity:' . esc_attr( strval( round( absint( $focus_ring_opacity ) / 100, 2 ) ) )
	. ';--sgs-focus-ring-offset:' . absint( $focus_ring_offset ) . 'px';

// ── Build inner HTML ───────────────────────────────────────────────────────
// Capture the form interior (progress bar + <form> + messages) as a string
// so it can be passed to SGS_Container_Wrapper::render() as $inner_html.

ob_start();

if ( $is_multi_step ) :
	?>
	<div class="sgs-form__progress-wrapper">
		<div
			class="sgs-form__progress"
			role="progressbar"
			aria-label="<?php esc_attr_e( 'Form progress', 'sgs-blocks' ); ?>"
			aria-valuenow="0"
			aria-valuemin="0"
			aria-valuemax="100"
			data-wp-bind--aria-valuenow="state.progressPercent"
			<?php echo $progress_style_attr; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built with sgs_colour_value() ?>
		>
			<div class="sgs-form__progress-bar" data-wp-style--width="state.progressWidth" aria-hidden="true"></div>
		</div>
		<nav class="sgs-form__progress-steps" aria-label="<?php esc_attr_e( 'Form steps', 'sgs-blocks' ); ?>">
			<?php foreach ( $steps as $index => $step ) : ?>
				<?php
				$step_context = wp_json_encode( array( 'stepIndex' => $index ) );
				?>
				<button
					type="button"
					class="sgs-form__progress-step"
					data-wp-context='<?php echo $step_context; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_json_encode output ?>'
					data-wp-on--click="actions.goToStep"
					data-wp-class--sgs-form__progress-step--active="state.isStepActive"
					data-wp-class--sgs-form__progress-step--completed="state.isStepCompleted"
					aria-label="<?php echo esc_attr( sprintf( 'Go to %s', $step['label'] ) ); ?>"
					data-wp-bind--aria-current="state.isStepActive"
				>
					<span class="sgs-form__progress-step-number"><?php echo absint( $index + 1 ); ?></span>
					<span class="sgs-form__progress-step-label"><?php echo esc_html( $step['label'] ); ?></span>
				</button>
			<?php endforeach; ?>
		</nav>
	</div>
<?php endif; ?>

<form class="sgs-form__inner" method="post" novalidate data-wp-on-async--submit="actions.submitForm">

	<input type="hidden" name="_sgs_form_id" value="<?php echo esc_attr( $form_id ); ?>" />

	<?php if ( $honeypot ) : ?>
		<?php // No-inline contract (§A): position/left/width/height/overflow moved to the pre-existing .sgs-form__honeypot rule in style.css — this div carries only its class. ?>
		<div class="sgs-form__honeypot" aria-hidden="true">
			<label for="sgs_hp_<?php echo esc_attr( $form_id ); ?>"><?php esc_html_e( 'Leave this field empty', 'sgs-blocks' ); ?></label>
			<input type="text" id="sgs_hp_<?php echo esc_attr( $form_id ); ?>" name="sgs_hp_<?php echo esc_attr( $form_id ); ?>" tabindex="-1" autocomplete="off" />
		</div>
	<?php endif; ?>

	<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- InnerBlocks output, pre-rendered and escaped by WordPress. ?>

	<div class="sgs-form__actions">
		<?php if ( $is_multi_step ) : ?>
			<button
				type="button"
				class="sgs-form__button sgs-form__button--prev"
				data-wp-on--click="actions.prevStep"
				data-wp-bind--hidden="state.isFirstStep"
			>
				<?php echo esc_html__( 'Previous', 'sgs-blocks' ); ?>
			</button>

			<button
				type="button"
				class="sgs-form__button sgs-form__button--next"
				data-wp-on--click="actions.nextStep"
				data-wp-bind--hidden="state.isLastStep"
			>
				<?php echo esc_html__( 'Next', 'sgs-blocks' ); ?>
			</button>
		<?php endif; ?>

		<button
			type="submit"
			class="sgs-form__button sgs-form__button--submit sgs-form__button--<?php echo esc_attr( $submit_style ); ?>"
			data-wp-bind--disabled="context.submitting"
			<?php if ( $is_multi_step ) : ?>
				data-wp-bind--hidden="!state.isLastStep"
			<?php endif; ?>
		>
			<?php echo esc_html( $submit_label ); ?>
		</button>
	</div>

</form>

<div
	class="sgs-form__message sgs-form__message--success"
	role="alert"
	aria-live="polite"
	data-wp-bind--hidden="!context.submitted"
	data-wp-text="context.successMessage"
></div>

<div
	class="sgs-form__message sgs-form__message--error"
	role="alert"
	aria-live="assertive"
	data-wp-bind--hidden="!context.errorMessage"
	data-wp-text="context.errorMessage"
></div>
<?php
$inner_html = ob_get_clean();

// ── WS-4 wrapper via SGS_Container_Wrapper ─────────────────────────────────
// tag='div' — the form block outer wrapper is always a <div>; the <form>
// element is the inner .sgs-form__inner child.
// extra_attrs carry ALL Interactivity API data-* + form-specific identifiers
// that view.js / the store / REST handler depend on.
// extra_styles carry the focus-ring CSS custom properties — these are CSS
// custom-property VALUES (`--x:y`), allowed inline per contract §A (not a
// real property declaration). extra_classes carries 'sgs-form' + the uid +
// re-added preset has-* classes computed above (color/typography/border are
// block-private, scoped in $sgs_form_supports_css).
$sgs_form_output = SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$inner_html,
	'layout',
	array(
		'tag'           => 'div',
		'extra_classes' => $sgs_form_supports_classes,
		'extra_styles'  => array( $focus_ring_css_vars ),
		'extra_attrs'   => array(
			'data-wp-interactive'    => 'sgs/form',
			'data-wp-context'        => wp_json_encode( $context ),
			'data-form-id'           => esc_attr( $form_id ),
			'data-store-submissions' => $store_submissions ? 'true' : 'false',
		),
	)
);

if ( '' !== $sgs_form_supports_css ) {
	// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving
	// CSS combinators intact — $sgs_form_supports_css is entirely style-engine-
	// generated or built from sgs_colour_value()/sanitised values, so nothing
	// un-sanitised survives here.
	$sgs_form_output = '<style>' . wp_strip_all_tags( $sgs_form_supports_css ) . '</style>' . $sgs_form_output;
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() output is pre-sanitised; the prepended <style> is pre-sanitised above.
echo $sgs_form_output;
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
