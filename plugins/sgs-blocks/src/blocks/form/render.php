<?php
/**
 * Server-side render for the SGS Form block.
 *
 * Outputs a form wrapper with multi-step support, validation, and N8N webhook integration.
 * Uses WordPress Interactivity API for client-side state management.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

$form_id            = $attributes['formId'] ?? '';
$form_name          = $attributes['formName'] ?? '';
$submit_label       = $attributes['submitLabel'] ?? __( 'Submit', 'sgs-blocks' );
$submit_style       = $attributes['submitStyle'] ?? 'primary';
$success_message    = $attributes['successMessage'] ?? __( 'Thank you! Your submission has been received.', 'sgs-blocks' );
$success_redirect   = $attributes['successRedirect'] ?? '';
$success_redirect   = $success_redirect ? wp_validate_redirect( $success_redirect, '' ) : '';
$honeypot           = $attributes['honeypot'] ?? true;
$store_submissions  = $attributes['storeSubmissions'] ?? true;
$submit_colour      = $attributes['submitColour'] ?? '';
$submit_background  = $attributes['submitBackground'] ?? '';
$progress_colour    = $attributes['progressBarColour'] ?? 'primary';

// Count form steps from inner blocks (not rendered content).
$steps       = array();
$total_steps = 0;

foreach ( $block->inner_blocks as $inner_block ) {
	if ( 'sgs/form-step' === $inner_block->name ) {
		$total_steps++;
		$steps[] = array(
			'label' => $inner_block->attributes['label'] ?? sprintf( __( 'Step %d', 'sgs-blocks' ), $total_steps ),
		);
	}
}

$is_multi_step  = $total_steps > 1;
$require_login  = $attributes['requireLogin'] ?? false;
$rate_limit     = absint( $attributes['rateLimit'] ?? 5 );

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

// Build submit button inline styles.
$submit_styles = array();
if ( $submit_colour ) {
	$submit_styles[] = 'color:' . sgs_colour_value( $submit_colour );
}
if ( $submit_background ) {
	$submit_styles[] = 'background-color:' . sgs_colour_value( $submit_background );
}
$submit_style_attr = ! empty( $submit_styles ) ? ' style="' . implode( ';', $submit_styles ) . '"' : '';

// Build progress bar colour style.
$progress_style_attr = '';
if ( $progress_colour ) {
	$progress_style_attr = ' style="--sgs-progress-colour:' . sgs_colour_value( $progress_colour ) . '"';
}

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class'                     => 'sgs-form',
		'data-wp-interactive'       => 'sgs/form',
		'data-wp-context'           => wp_json_encode( $context ),
		'data-form-id'              => esc_attr( $form_id ),
		'data-store-submissions'    => $store_submissions ? 'true' : 'false',
	)
);

?>
<div <?php echo $wrapper_attributes; ?>>

	<?php if ( $is_multi_step ) : ?>
		<div class="sgs-form__progress-wrapper">
			<div
				class="sgs-form__progress"
				role="progressbar"
				aria-label="<?php esc_attr_e( 'Form progress', 'sgs-blocks' ); ?>"
				aria-valuenow="0"
				aria-valuemin="0"
				aria-valuemax="100"
				data-wp-bind--aria-valuenow="state.progressPercent"
				<?php echo $progress_style_attr; ?>
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
						data-wp-context='<?php echo $step_context; ?>'
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
			<div class="sgs-form__honeypot" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;">
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
				<?php echo $submit_style_attr; ?>
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

</div>
