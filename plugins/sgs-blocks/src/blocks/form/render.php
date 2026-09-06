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
 * R-31-14: explicit discriminators only — never branch on empty($content).
 *
 * NO-INLINE: this block emits zero inline style property declarations. Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
 * The wrapper handles base+tier padding/margin scoped internally
 * (paddingTablet/paddingMobile/marginTablet/marginMobile object attrs —
 * box-group contract §B). color/typography/border are block-private
 * (mirrors sgs/container's render.php pattern): extracted from
 * $attributes['style'], emitted into a scoped `<style>` keyed to a
 * content-hash uid CLASS, fed to the wrapper via `extra_classes`. The submit
 * button's colour is a scoped rule on `.uid .sgs-form__button--submit`; the
 * honeypot's off-screen positioning relies solely on the pre-existing
 * `.sgs-form__honeypot` rule in style.css — the div carries only its class.
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
// D636 text-colour gradient sibling (778879732 rollout finish, 2026-09-04) —
// non-empty wins over submitColour at render time.
$submit_colour_gradient = $attributes['submitColourGradient'] ?? '';
// submitBackground/submitBackgroundGradient/submitBackgroundHover/
// submitBackgroundHoverGradient are read further down via sgs_fill_decls()
// (Case C fill-helper adoption, 2026-09-06) — no standalone vars needed here,
// that helper reads the raw attribute names straight off $attributes.
$progress_colour          = $attributes['progressBarColour'] ?? 'primary';
$progress_colour_gradient = $attributes['progressBarColourGradient'] ?? '';

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
$focus_ring_colour  = $attributes['formFocusRingColour'] ?? 'accent';
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
	// G5 (Bean, 2026-08-26): 'style set, no width' means no border by
	// default — never fall through to the browser's initial medium (~3px)
	// border-width.
	if ( isset( $sgs_form_border_raw['style'] ) && '' !== $sgs_form_border_raw['style'] && isset( $sgs_form_border_raw['width'] ) && '' !== $sgs_form_border_raw['width'] ) {
		$sgs_form_border['style'] = sgs_css_keyword_sanitise( $sgs_form_border_raw['style'] );
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

// Hoisted out of the conditional: the Shape-B border emission scopes to
// $sgs_form_sel, which was only assigned when NATIVE style-engine input existed.
$sgs_form_uid = 'sgs-form-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$sgs_form_sel = '.' . $sgs_form_uid . '.sgs-form';

if ( ! empty( $sgs_form_style_engine_input ) ) {

	$sgs_form_engine_styles = wp_style_engine_get_styles(
		$sgs_form_style_engine_input,
		array( 'selector' => $sgs_form_sel )
	);
	if ( ! empty( $sgs_form_engine_styles['css'] ) ) {
		$sgs_form_supports_css      .= $sgs_form_engine_styles['css'];
		$sgs_form_supports_classes[] = $sgs_form_uid;
	}
}

// Typography — migrated off WP-native supports.typography onto the shared
// TypographyControls/sgs_typography_css_rule() mechanism (D971/D972 full-
// replacement track), root prefix '' (fontSize/fontWeight/fontStyle/
// lineHeight). Registers the uid class unconditionally the same way the
// legacy block did (it can't know in advance whether the helper will emit
// any CSS), matching sgs/accordion's migrated shape.
if ( ! in_array( $sgs_form_uid, $sgs_form_supports_classes, true ) ) {
	$sgs_form_supports_classes[] = $sgs_form_uid;
}
$sgs_form_supports_css .= sgs_typography_css_rule( $attributes, '', $sgs_form_sel );

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
// D636 text-colour gradient sibling — resolved once, used for both the decl
// below and the mandatory @supports fallback further down. A gradient wins
// over the flat submitColour when set+valid.
$submit_colour_effective = sgs_resolve_text_colour_or_gradient( $submit_colour, $submit_colour_gradient );
// Case C fill-helper adoption (2026-09-06): the background paint used to be
// hand-built inline (a single sgs_background_paint_decl() call folded into
// $sgs_form_submit_decls). This selector SHARES its rule with the text decl
// above, so per the colour EMISSION helper decision table this is
// sgs_fill_decls() (declarations, not finished CSS) composed into one rule —
// never sgs_fill_states_css(), which would own its own separate rule and
// risk a cascade-order fight with the D942 transparent-cancellation decl
// below. sgs_fill_decls() reads the raw attribute names directly off
// $attributes, so no standalone $submit_background* vars are needed here.
$submit_fill_decls = sgs_fill_decls(
	$attributes,
	array(
		'base'           => 'submitBackground',
		'hover'          => 'submitBackgroundHover',
		'gradient'       => 'submitBackgroundGradient',
		'hover_gradient' => 'submitBackgroundHoverGradient',
	)
);
if ( '' !== $submit_colour_effective || $submit_fill_decls['normal'] || $submit_fill_decls['hover'] ) {
	if ( ! in_array( $sgs_form_uid, $sgs_form_supports_classes, true ) ) {
		// The uid is hoisted above; this now registers the CLASS exactly once. It
		// used to key on empty($sgs_form_uid), which the hoist made permanently
		// false -- so the class stopped being added and .{uid}.sgs-form matched nothing.
		$sgs_form_supports_classes[] = $sgs_form_uid;
	}
	$sgs_form_submit_decls = array();
	if ( '' !== $submit_colour_effective ) {
		// sgs_text_colour_decl() returns either 'color:X' (flat) or the full
		// 'background-image:...;-webkit-background-clip:text;background-clip:text;
		// color:transparent' form (gradient) — same helper + shape as
		// sgs/counter's numberColour/labelColour.
		$submit_colour_decl = sgs_text_colour_decl( $submit_colour_effective );
		if ( '' !== $submit_colour_decl ) {
			$sgs_form_submit_decls[] = $submit_colour_decl;
		}
		if ( ! $submit_fill_decls['normal'] ) {
			// D942 recipe item 2: the style-variant class default
			// (`:where(.sgs-form__button--primary)`, form/style.css) paints a
			// `background-color` on this same selector. This scoped rule
			// already out-specifies that class default today, so cancel it
			// here via pure cascade rather than duplicating the class's
			// actual colour value — frees `submitColour` for its
			// `submitColourGradient` sibling (`background-clip:text` would
			// otherwise be clipped by the class's inherited fill, and would
			// otherwise collide with a genuine operator-set submitBackground).
			// Only when the operator hasn't set an explicit `submitBackground`
			// (normal-state fill decls empty) — that already wins this same
			// rule below and must not be cancelled. NOTE: if an operator sets
			// BOTH submitColourGradient AND submitBackground/
			// submitBackgroundGradient, both write to `background-image` on
			// this one rule below — the later decl in $sgs_form_submit_decls
			// wins (submitColour is pushed first, so the background paint
			// wins that combination; the gradient text clip is then visually
			// inert). Documented trade-off, not a bug: no CSS mechanism lets
			// one element's background paint two different gradients on the
			// same property.
			$sgs_form_submit_decls[] = 'background-color:transparent';
		}
	}
	// Both gates must include the gradient var, not just the flat colour —
	// a gradient-only instance previously emitted zero CSS at all (same
	// defect class as modal's triggerBackgroundGradient, found live 2026-09-03).
	// sgs_fill_decls() already applies that same rule internally.
	$sgs_form_submit_decls  = array_merge( $sgs_form_submit_decls, $submit_fill_decls['normal'] );
	$sgs_form_supports_css .= sgs_emit_state_colour_css(
		'.' . $sgs_form_uid . ' .sgs-form__button--submit',
		$sgs_form_submit_decls,
		$submit_fill_decls['hover']
	);
	// Mandatory companion (self-no-ops on a flat colour): a browser lacking
	// background-clip:text support would otherwise get a bare `color:` value
	// holding a gradient string, dropped silently.
	$sgs_form_supports_css .= sgs_text_colour_gradient_fallback_rule(
		'.' . $sgs_form_uid . ' .sgs-form__button--submit',
		$submit_colour_effective
	);
}

// Progress-bar colour custom-property VALUE (FR-32-4, D345) — scoped rule on
// `.uid .sgs-form__progress`, NOT an inline `style="--x:y"` attribute. Uses the
// SAME uid as the color/border/typography/submit-button supports above
// (minted eagerly here when none of those already needed one) so everything
// lands in ONE scoped <style>. progressBarColourGradient sibling (2026-09-04)
// — the gradient wins when set; flat colour acts as fallback. HOVER SIBLING
// (2026-09-06, hover-sibling closeout) — the same 5-arg call now also emits
// -hover/-hover-gradient custom-property siblings, consumed by a new
// .sgs-form__progress-bar:hover/:focus-visible rule in style.css. Unset
// hover attrs mean the two extra decls are simply never appended, so an
// untouched form stays byte-identical.
$progress_colour_decls = function_exists( 'sgs_custom_property_gradient_decls' )
	? sgs_custom_property_gradient_decls(
		'sgs-progress-colour',
		(string) $progress_colour,
		(string) $progress_colour_gradient,
		(string) ( $attributes['progressBarColourHover'] ?? '' ),
		(string) ( $attributes['progressBarColourHoverGradient'] ?? '' )
	)
	: array();
if ( ! empty( $progress_colour_decls ) ) {
	if ( ! in_array( $sgs_form_uid, $sgs_form_supports_classes, true ) ) {
		// The uid is hoisted above; this now registers the CLASS exactly once. It
		// used to key on empty($sgs_form_uid), which the hoist made permanently
		// false -- so the class stopped being added and .{uid}.sgs-form matched nothing.
		$sgs_form_supports_classes[] = $sgs_form_uid;
	}
	$sgs_form_supports_css .= '.' . $sgs_form_uid . ' .sgs-form__progress{' . implode( ';', $progress_colour_decls ) . ';}';
}

// Prev-button, tile + file-label hover colours — moved off style.css hardcoded
// `:hover` rules into scoped attribute-driven CSS (mirrors the submit-button
// pattern above). Uses the SAME uid so everything lands in ONE scoped <style>.
$sgs_form_prev_css = function_exists( 'sgs_button_element_style_css' )
	? sgs_button_element_style_css( $attributes, 'prev', '.' . $sgs_form_uid . ' .sgs-form__button--prev' )
	: '';
if ( '' !== $sgs_form_prev_css ) {
	if ( ! in_array( $sgs_form_uid, $sgs_form_supports_classes, true ) ) {
		$sgs_form_supports_classes[] = $sgs_form_uid;
	}
	$sgs_form_supports_css .= $sgs_form_prev_css;
}

// Tile border — routed through the shared sgs_border_states_css() emitter
// (helpers-colour-variants.php) so a gradient sibling comes free: that helper
// owns the flat-vs-gradient branch (a masked ::before ring only when a
// gradient is actually set) rather than this block hand-building decls.
$sgs_form_tile_border_css = function_exists( 'sgs_border_states_css' )
	? sgs_border_states_css(
		'.' . $sgs_form_uid . ' .sgs-form-tile',
		$attributes,
		array(
			'base'           => 'tileBorderColour',
			'hover'          => 'tileBorderColourHover',
			'gradient'       => 'tileBorderColourGradient',
			'hover_gradient' => 'tileBorderColourHoverGradient',
		)
	)
	: '';
if ( '' !== $sgs_form_tile_border_css ) {
	if ( ! in_array( $sgs_form_uid, $sgs_form_supports_classes, true ) ) {
		$sgs_form_supports_classes[] = $sgs_form_uid;
	}
	$sgs_form_supports_css .= $sgs_form_tile_border_css;
}

// File-label border + background — this selector mixes TWO mechanisms (border
// AND fill), so it cannot be a single sgs_border_states_css()/sgs_fill_states_css()
// call the way the tile is. Call each shared emitter separately (both return
// FINISHED css for their own selector, per their own docblocks) and concatenate;
// this is the least invasive swap that keeps the file-label's existing
// one-selector-two-properties shape while still getting gradient support on both.
$sgs_form_file_label_sel = '.' . $sgs_form_uid . ' .sgs-form-field__file-label';

$sgs_form_file_border_css = function_exists( 'sgs_border_states_css' )
	? sgs_border_states_css(
		$sgs_form_file_label_sel,
		$attributes,
		array(
			'base'           => 'fileLabelBorderColour',
			'hover'          => 'fileLabelBorderColourHover',
			'gradient'       => 'fileLabelBorderColourGradient',
			'hover_gradient' => 'fileLabelBorderColourHoverGradient',
		)
	)
	: '';

$sgs_form_file_fill_css = function_exists( 'sgs_fill_states_css' )
	? sgs_fill_states_css(
		$sgs_form_file_label_sel,
		$attributes,
		array(
			'base'           => 'fileLabelBackgroundColour',
			'hover'          => 'fileLabelBackgroundColourHover',
			'gradient'       => 'fileLabelBackgroundColourGradient',
			'hover_gradient' => 'fileLabelBackgroundColourHoverGradient',
		)
	)
	: '';

if ( '' !== $sgs_form_file_border_css || '' !== $sgs_form_file_fill_css ) {
	if ( ! in_array( $sgs_form_uid, $sgs_form_supports_classes, true ) ) {
		$sgs_form_supports_classes[] = $sgs_form_uid;
	}
	$sgs_form_supports_css .= $sgs_form_file_border_css . $sgs_form_file_fill_css;
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

<?php
// ACCESSIBLE NAME. Without an accessible name every SGS form is a real WCAG 2.1
// gap when a page carries more than one form — a screen-reader user hears
// "form" twice with nothing to tell them apart.
//
// Rendered as aria-label rather than a visible heading DELIBERATELY: a visible title
// is the operator's own sgs/heading block placed above the form, and emitting a
// second one would duplicate it and fight their layout. The name is metadata about
// the form, so it belongs in the accessible name.
//
// Emitted only when non-empty: an `aria-label=""` is worse than none (it can strip a
// naming fallback), so the whole attribute is omitted rather than emitted blank.
$sgs_form_label      = trim( (string) $form_name );
$sgs_form_label_attr = '' !== $sgs_form_label
	? ' aria-label="' . esc_attr( $sgs_form_label ) . '"'
	: '';
?>
<form class="sgs-form__inner" method="post" novalidate<?php echo $sgs_form_label_attr; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built immediately above from esc_attr(). ?> data-wp-on-async--submit="actions.submitForm">

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

// ── Block-private border: width / style / colour (Shape B). ──
// Migrated from WP-native supports by scripts/migrate-border-shape-b.js.
// Oracle: sgs/accordion, live-verified with scripts/qa/check-border-roundtrip.js.
$border_width_obj    = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top    = sgs_css_length_value( $border_width_obj['top'] ?? '' );
$border_width_right  = sgs_css_length_value( $border_width_obj['right'] ?? '' );
$border_width_bottom = sgs_css_length_value( $border_width_obj['bottom'] ?? '' );
$border_width_left   = sgs_css_length_value( $border_width_obj['left'] ?? '' );
$has_border_width    = ( '' !== $border_width_top || '' !== $border_width_right || '' !== $border_width_bottom || '' !== $border_width_left );

$border_style_raw      = $attributes['borderStyle'] ?? 'none';
$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
$border_style          = in_array( $border_style_raw, $allowed_border_styles, true ) ? $border_style_raw : 'none';

if ( 'none' !== $border_style ) {
	// G5 (Bean, 2026-08-26): a style with no width means NO border -- never fall
	// through to the browser's initial `medium` (~3px).
	if ( $has_border_width ) {
		$bwt = '' !== $border_width_top ? $border_width_top : '0';
		$bwr = '' !== $border_width_right ? $border_width_right : '0';
		$bwb = '' !== $border_width_bottom ? $border_width_bottom : '0';
		$bwl = '' !== $border_width_left ? $border_width_left : '0';
		$sgs_form_supports_css .= $sgs_form_sel . '{border-style:' . $border_style . ';border-width:' . "{$bwt} {$bwr} {$bwb} {$bwl}" . ';}';
	}

	// A FLAT colour emits `border-color` DIRECTLY; only a GRADIENT uses the
	// masked ::before ring. NOT sgs_border_states_css(): that helper always
	// routes through sgs_border_gradient_css(), which sets
	// border-color:transparent -- measured live, both of its callers
	// (sgs/product-card, sgs/container) report border-color = rgba(0,0,0,0).
	$border_colour          = (string) ( $attributes['borderColour'] ?? '' );
	$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );
	if ( '' !== $border_colour_gradient ) {
		$sgs_form_supports_css .= sgs_border_gradient_css( $sgs_form_sel, $border_colour_gradient, null, '' !== $border_width_top ? $border_width_top : '1px' );
	} elseif ( '' !== $border_colour ) {
		// sgs_colour_value() resolves a palette SLUG; a bare slug is invalid CSS
		// the browser drops (D881 defect 3).
		$sgs_form_supports_css .= $sgs_form_sel . '{border-color:' . sgs_colour_value( $border_colour ) . ';}';
	}
} else {
	// G5 corollary: "none" must be an explicit override too, not a
	// no-op -- a variant's own hardcoded CSS border (e.g. a card-style
	// class default) would otherwise keep painting even though the
	// operator picked "no border". Cause-agnostic: harmless when no
	// such default exists, a real fix when one does.
	$sgs_form_supports_css .= $sgs_form_sel . '{border-style:none;border-width:0;}';
}

// ── Block-private border-radius (radius is no longer native -- Shape B now
// covers all four legs). Same wp_style_engine_get_styles() route already
// proven live by sgs/media + sgs/before-after's borderRadiusTablet/Mobile
// tiers; base now goes through the identical call instead of WP's native
// serialisation. The style-engine result is an intermediate PHP value ($out
// array), never appended raw -- only its ['css'] string goes through the
// detected sink (`.=` for a string accumulator, `[] =` for an array one). ──
$border_radius_obj = is_array( $attributes['borderRadius'] ?? null ) ? $attributes['borderRadius'] : array();
if ( ! empty( $border_radius_obj ) ) {
	$border_radius_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_obj ) ),
		array( 'selector' => $sgs_form_sel )
	);
	if ( ! empty( $border_radius_out['css'] ) ) {
		$sgs_form_supports_css .= $border_radius_out['css'];
	}
}
$border_radius_tablet_obj = is_array( $attributes['borderRadiusTablet'] ?? null ) ? $attributes['borderRadiusTablet'] : array();
if ( ! empty( $border_radius_tablet_obj ) ) {
	$border_radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $sgs_form_sel )
	);
	if ( ! empty( $border_radius_tab_out['css'] ) ) {
		$sgs_form_supports_css .= '@media(max-width:1023px){' . $border_radius_tab_out['css'] . '}';
	}
}
$border_radius_mobile_obj = is_array( $attributes['borderRadiusMobile'] ?? null ) ? $attributes['borderRadiusMobile'] : array();
if ( ! empty( $border_radius_mobile_obj ) ) {
	$border_radius_mob_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
		array( 'selector' => $sgs_form_sel )
	);
	if ( ! empty( $border_radius_mob_out['css'] ) ) {
		$sgs_form_supports_css .= '@media(max-width:767px){' . $border_radius_mob_out['css'] . '}';
	}
}

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
