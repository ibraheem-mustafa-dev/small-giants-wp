<?php
/**
 * Swatch fields on WooCommerce attribute term screens (FR-27-B2 authoring UI).
 *
 * Adds colour picker + image-attachment-ID fields to every `pa_*` attribute
 * taxonomy's Add-term and Edit-term admin screens, then saves both values to
 * the registered term_meta keys (`_sgs_swatch_color`, `_sgs_swatch_image_id`).
 *
 * Design decisions:
 *   - The colour input is `<input type="color">` (native browser picker, zero JS
 *     required). Plain hex-text fallback is provided alongside it so users on
 *     browsers with poor colour-picker support (some older Safari) can type directly.
 *   - The image field is a plain `<input type="number">` attachment-ID field.
 *     A "Select image" media-library button is added via a minimal vanilla
 *     `wp.media()` call, enqueued ONLY on the taxonomy term screens to avoid
 *     any frontend cost. Clients who prefer can also type/paste the attachment ID.
 *   - Both fields save through the registered `sanitize_callback` in
 *     class-configurator-meta.php (`sanitize_hex_color` / `sanitize_image_id`),
 *     so even direct REST or WP-CLI writes are sanitised identically.
 *
 * Security:
 *   - `manage_woocommerce` capability check before any save (matches the
 *     `auth_callback` registered in class-configurator-meta.php).
 *   - wp_verify_nonce() on save — nonce field output on both Add and Edit forms.
 *   - sanitize_hex_color() + absint() applied at save (defence-in-depth beyond
 *     the meta-registration sanitise_callback).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Dependencies: this file calls sanitize_hex_color() (WP core, always available)
 * and absint() (WP core, always available).  No SGS helpers needed.
 */

/**
 * Registers all hooks.
 *
 * Called from sgs-blocks.php after WooCommerce is available (init:20).
 * Guarded by wc_get_attribute_taxonomy_names() presence check.
 *
 * @return void
 */
function sgs_configurator_term_fields_register(): void {
	if ( ! function_exists( 'wc_get_attribute_taxonomy_names' ) ) {
		return;
	}

	add_action( 'admin_init', __NAMESPACE__ . '\\sgs_configurator_term_fields_hooks' );
}
add_action( 'init', __NAMESPACE__ . '\\sgs_configurator_term_fields_register', 20 );

/**
 * Attach add/edit/save hooks to every WooCommerce attribute taxonomy.
 *
 * Called on admin_init so the taxonomy list is fully populated and we are
 * definitely in an admin context.
 *
 * @return void
 */
function sgs_configurator_term_fields_hooks(): void {
	if ( ! function_exists( 'wc_get_attribute_taxonomy_names' ) ) {
		return;
	}

	foreach ( wc_get_attribute_taxonomy_names() as $taxonomy ) {
		// Add-term screen — fields below the default form fields.
		add_action( "{$taxonomy}_add_form_fields", __NAMESPACE__ . '\\sgs_render_swatch_add_fields' );
		add_action( "{$taxonomy}_add_form_fields", __NAMESPACE__ . '\\sgs_render_variesby_add_field' );
		// Edit-term screen — table rows inserted into the edit form.
		add_action( "{$taxonomy}_edit_form_fields", __NAMESPACE__ . '\\sgs_render_swatch_edit_fields' );
		add_action( "{$taxonomy}_edit_form_fields", __NAMESPACE__ . '\\sgs_render_variesby_edit_field' );
		// Save on create.
		add_action( "created_{$taxonomy}", __NAMESPACE__ . '\\sgs_save_swatch_fields', 10, 2 );
		add_action( "created_{$taxonomy}", __NAMESPACE__ . '\\sgs_save_variesby_field', 10, 2 );
		// Save on update.
		add_action( "edited_{$taxonomy}", __NAMESPACE__ . '\\sgs_save_swatch_fields', 10, 2 );
		add_action( "edited_{$taxonomy}", __NAMESPACE__ . '\\sgs_save_variesby_field', 10, 2 );
	}

	// Enqueue the tiny media-button script on term screens only.
	add_action( 'admin_enqueue_scripts', __NAMESPACE__ . '\\sgs_enqueue_swatch_admin_script' );
}

/**
 * Enqueue the media-library frame script only on WooCommerce attribute taxonomy
 * term screens (Add/Edit attribute pages).
 *
 * We output a tiny inline script rather than a separate file to keep the
 * deployment footprint at zero (no new file in build/).
 *
 * @return void
 */
function sgs_enqueue_swatch_admin_script(): void {
	$screen = get_current_screen();
	if ( ! $screen ) {
		return;
	}

	// WC attribute taxonomy screens have id like "edit-pa_flavour".
	if ( 'edit' !== $screen->base ) {
		return;
	}

	if ( ! function_exists( 'wc_get_attribute_taxonomy_names' ) ) {
		return;
	}

	$taxonomies = wc_get_attribute_taxonomy_names();
	$on_screen  = false;
	foreach ( $taxonomies as $tax ) {
		if ( 'edit-' . $tax === $screen->id ) {
			$on_screen = true;
			break;
		}
	}

	if ( ! $on_screen ) {
		return;
	}

	// wp.media is provided by WordPress core.
	wp_enqueue_media();

	// Inline vanilla script — opens a media modal, inserts the attachment ID
	// into the paired number field and previews the image URL.
	$inline = <<<'JS'
( function() {
	document.addEventListener( 'click', function( e ) {
		var btn = e.target.closest( '.sgs-swatch-image-select' );
		if ( ! btn ) { return; }
		e.preventDefault();

		var targetId  = btn.dataset.target;
		var previewId = btn.dataset.preview;
		var field     = document.getElementById( targetId );
		var preview   = previewId ? document.getElementById( previewId ) : null;

		var frame = wp.media( {
			title:    btn.dataset.title || 'Select swatch image',
			button:   { text: 'Use this image' },
			multiple: false,
			library:  { type: 'image' }
		} );

		frame.on( 'select', function() {
			var attachment = frame.state().get( 'selection' ).first().toJSON();
			field.value = attachment.id;
			if ( preview ) {
				preview.src   = attachment.sizes && attachment.sizes.thumbnail
					? attachment.sizes.thumbnail.url
					: attachment.url;
				preview.style.display = 'inline-block';
			}
		} );

		frame.open();
	} );
} )();
JS;

	wp_add_inline_script( 'media-upload', $inline );
}

/**
 * Render swatch fields on the "Add term" screen (plain HTML, no table wrapper).
 *
 * @param string $taxonomy Current taxonomy slug.
 * @return void
 */
function sgs_render_swatch_add_fields( string $taxonomy ): void {
	$nonce = wp_create_nonce( 'sgs_swatch_save_' . $taxonomy );
	?>
	<div class="form-field sgs-swatch-fields">
		<input type="hidden" name="sgs_swatch_nonce" value="<?php echo esc_attr( $nonce ); ?>" />

		<h3 style="margin-bottom:0.5em;"><?php esc_html_e( 'SGS Swatch', 'sgs-blocks' ); ?></h3>
		<p class="description" style="margin-bottom:1em;">
			<?php esc_html_e( 'Optional. Set a swatch colour or image for this attribute value. The image takes priority if both are set.', 'sgs-blocks' ); ?>
		</p>

		<label for="sgs_swatch_color_add"><?php esc_html_e( 'Swatch colour', 'sgs-blocks' ); ?></label>
		<div style="display:flex;align-items:center;gap:0.5em;margin-bottom:0.75em;">
			<input type="color"
				id="sgs_swatch_color_add"
				name="sgs_swatch_color"
				value="#ffffff"
				style="height:36px;width:60px;cursor:pointer;border:1px solid #8c8f94;border-radius:3px;" />
			<input type="text"
				name="sgs_swatch_color_text"
				value=""
				placeholder="#rrggbb"
				style="width:90px;font-family:monospace;"
				aria-label="<?php esc_attr_e( 'Hex colour value', 'sgs-blocks' ); ?>" />
		</div>
		<p class="description"><?php esc_html_e( 'Leave the default white (#ffffff) to use no colour swatch.', 'sgs-blocks' ); ?></p>

		<label for="sgs_swatch_image_id_add" style="display:block;margin-top:1em;"><?php esc_html_e( 'Swatch image (attachment ID)', 'sgs-blocks' ); ?></label>
		<div style="display:flex;align-items:center;gap:0.5em;margin-top:0.25em;">
			<input type="number"
				id="sgs_swatch_image_id_add"
				name="sgs_swatch_image_id"
				value="0"
				min="0"
				style="width:80px;" />
			<button type="button"
				class="button sgs-swatch-image-select"
				data-target="sgs_swatch_image_id_add"
				data-preview="sgs_swatch_image_preview_add"
				data-title="<?php esc_attr_e( 'Select swatch image', 'sgs-blocks' ); ?>">
				<?php esc_html_e( 'Select image', 'sgs-blocks' ); ?>
			</button>
		</div>
		<img id="sgs_swatch_image_preview_add"
			src=""
			alt=""
			style="display:none;width:48px;height:48px;object-fit:cover;border-radius:3px;margin-top:0.5em;border:1px solid #c3c4c7;" />
		<p class="description"><?php esc_html_e( 'Leave 0 to use no image swatch.', 'sgs-blocks' ); ?></p>
	</div>
	<?php
}

/**
 * Render swatch fields on the "Edit term" screen (inside a <table> row).
 *
 * @param \WP_Term $wp_term      The term being edited.
 * @return void
 */
function sgs_render_swatch_edit_fields( \WP_Term $wp_term ): void {
	$taxonomy  = $wp_term->taxonomy;
	$nonce     = wp_create_nonce( 'sgs_swatch_save_' . $taxonomy );
	$color_val = (string) get_term_meta( $wp_term->term_id, '_sgs_swatch_color', true );
	$image_id  = absint( get_term_meta( $wp_term->term_id, '_sgs_swatch_image_id', true ) );

	// Show existing image preview if an image is set.
	$preview_src = '';
	if ( $image_id > 0 ) {
		$src_data    = wp_get_attachment_image_src( $image_id, 'thumbnail' );
		$preview_src = $src_data ? esc_url( $src_data[0] ) : '';
	}

	// Normalise colour: fallback to #ffffff when empty so the colour picker
	// shows a meaningful value rather than defaulting to black.
	$safe_color_picker = $color_val ? sanitize_hex_color( $color_val ) : '#ffffff';
	$safe_color_picker = $safe_color_picker ? $safe_color_picker : '#ffffff';
	?>
	<input type="hidden" name="sgs_swatch_nonce" value="<?php echo esc_attr( $nonce ); ?>" />

	<tr class="form-field sgs-swatch-field-row">
		<th scope="row">
			<label for="sgs_swatch_color_edit"><?php esc_html_e( 'Swatch colour', 'sgs-blocks' ); ?></label>
		</th>
		<td>
			<div style="display:flex;align-items:center;gap:0.5em;margin-bottom:0.25em;">
				<input type="color"
					id="sgs_swatch_color_edit"
					name="sgs_swatch_color"
					value="<?php echo esc_attr( $safe_color_picker ); ?>"
					style="height:36px;width:60px;cursor:pointer;border:1px solid #8c8f94;border-radius:3px;" />
				<input type="text"
					name="sgs_swatch_color_text"
					value="<?php echo esc_attr( $color_val ); ?>"
					placeholder="#rrggbb"
					style="width:90px;font-family:monospace;"
					aria-label="<?php esc_attr_e( 'Hex colour value', 'sgs-blocks' ); ?>" />
			</div>
			<p class="description">
				<?php esc_html_e( 'Leave blank (or the default white) to use no colour swatch.', 'sgs-blocks' ); ?>
			</p>
		</td>
	</tr>

	<tr class="form-field sgs-swatch-field-row">
		<th scope="row">
			<label for="sgs_swatch_image_id_edit"><?php esc_html_e( 'Swatch image', 'sgs-blocks' ); ?></label>
		</th>
		<td>
			<div style="display:flex;align-items:center;gap:0.5em;">
				<input type="number"
					id="sgs_swatch_image_id_edit"
					name="sgs_swatch_image_id"
					value="<?php echo esc_attr( $image_id ); ?>"
					min="0"
					style="width:80px;" />
				<button type="button"
					class="button sgs-swatch-image-select"
					data-target="sgs_swatch_image_id_edit"
					data-preview="sgs_swatch_image_preview_edit"
					data-title="<?php esc_attr_e( 'Select swatch image', 'sgs-blocks' ); ?>">
					<?php esc_html_e( 'Select image', 'sgs-blocks' ); ?>
				</button>
			</div>
			<?php if ( $preview_src ) : ?>
				<img id="sgs_swatch_image_preview_edit"
					src="<?php echo esc_url( $preview_src ); ?>"
					alt=""
					style="display:inline-block;width:48px;height:48px;object-fit:cover;border-radius:3px;margin-top:0.5em;border:1px solid #c3c4c7;" />
			<?php else : ?>
				<img id="sgs_swatch_image_preview_edit"
					src=""
					alt=""
					style="display:none;width:48px;height:48px;object-fit:cover;border-radius:3px;margin-top:0.5em;border:1px solid #c3c4c7;" />
			<?php endif; ?>
			<p class="description">
				<?php esc_html_e( 'Select an image from the media library, or enter its attachment ID. Leave 0 to use no image swatch. Image takes priority over colour when both are set.', 'sgs-blocks' ); ?>
			</p>
		</td>
	</tr>
	<?php
}

/**
 * Save swatch term meta on term create or update.
 *
 * Called on `created_{taxonomy}` and `edited_{taxonomy}`.
 *
 * @param int $term_id Term ID being saved.
 * @param int $tt_id   Term taxonomy ID (unused).
 * @return void
 */
function sgs_save_swatch_fields( int $term_id, int $tt_id ): void { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed
	// Capability check — matches the auth_callback in class-configurator-meta.php.
	if ( ! current_user_can( 'manage_woocommerce' ) ) { // phpcs:ignore WordPress.WP.Capabilities.Unknown -- manage_woocommerce is a WooCommerce core capability registered via WP_Role::add_cap() in WC_Install::create_roles().
		return;
	}

	// Determine taxonomy from the current action name so we can verify the nonce.
	$action = current_action();
	// Action is "created_{taxonomy}" or "edited_{taxonomy}".
	$taxonomy = preg_replace( '/^(created|edited)_/', '', $action );

	// Nonce verification.
	$nonce = isset( $_POST['sgs_swatch_nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['sgs_swatch_nonce'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Missing -- verified below.
	if ( ! wp_verify_nonce( $nonce, 'sgs_swatch_save_' . $taxonomy ) ) {
		return;
	}

	/* ── Colour ─────────────────────────────────────────────────────────── */

	// Prefer the text field (more precise) over the colour picker when both
	// are submitted and differ.  Both are run through sanitize_hex_color().
	$color_text   = isset( $_POST['sgs_swatch_color_text'] ) ? sanitize_text_field( wp_unslash( $_POST['sgs_swatch_color_text'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Missing
	$color_picker = isset( $_POST['sgs_swatch_color'] ) ? sanitize_text_field( wp_unslash( $_POST['sgs_swatch_color'] ) ) : '';            // phpcs:ignore WordPress.Security.NonceVerification.Missing

	$color_candidate = '' !== $color_text ? $color_text : $color_picker;
	$safe_color      = sanitize_hex_color( $color_candidate );

	// Treat #ffffff with no text-field input as "no colour" (the colour picker
	// defaults to white).  Only save if the text field was explicitly set or
	// the picker is non-white.
	$save_color = '';
	if ( '' !== $color_text && $safe_color ) {
		$save_color = $safe_color;
	} elseif ( '' === $color_text && $safe_color && '#ffffff' !== strtolower( $safe_color ) ) {
		$save_color = $safe_color;
	}

	update_term_meta( $term_id, '_sgs_swatch_color', $save_color );

	/* ── Image ──────────────────────────────────────────────────────────── */

	$image_id_raw  = isset( $_POST['sgs_swatch_image_id'] ) ? absint( wp_unslash( $_POST['sgs_swatch_image_id'] ) ) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Missing
	$safe_image_id = 0;

	if ( $image_id_raw > 0 && wp_attachment_is_image( $image_id_raw ) ) {
		$safe_image_id = $image_id_raw;
	}

	update_term_meta( $term_id, '_sgs_swatch_image_id', $safe_image_id );
}

// ─── variesBy field (FR-27-R3) ────────────────────────────────────────────────

/**
 * Render the variesBy <select> on the "Add term" screen.
 *
 * The field maps to Google Merchant Center's `variesBy` closed enum (SEC-8):
 * color, size, material, pattern, suggestedAge, suggestedGender.
 *
 * @param string $taxonomy Current taxonomy slug (unused; field is taxonomy-agnostic).
 * @return void
 */
function sgs_render_variesby_add_field( string $taxonomy ): void { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.Found
	$nonce = wp_create_nonce( 'sgs_variesby_save_' . $taxonomy );
	?>
	<div class="form-field sgs-variesby-field" style="margin-top:1.5em;">
		<input type="hidden" name="sgs_variesby_nonce" value="<?php echo esc_attr( $nonce ); ?>" />
		<label for="sgs_variesby_value_add"><?php esc_html_e( 'Google variesBy type', 'sgs-blocks' ); ?></label>
		<?php echo sgs_variesby_select( 'sgs_variesby_value_add', 'sgs_variesby_value', '' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- function returns pre-escaped markup. ?>
		<p class="description">
			<?php esc_html_e( 'Optional. Tells Google which product dimension this attribute represents (e.g. "color" for a colour attribute). Used in the JSON-LD ProductGroup markup. Leave "(none)" if unsure.', 'sgs-blocks' ); ?>
		</p>
	</div>
	<?php
}

/**
 * Render the variesBy <select> on the "Edit term" screen (inside a <table> row).
 *
 * @param \WP_Term $wp_term The term being edited.
 * @return void
 */
function sgs_render_variesby_edit_field( \WP_Term $wp_term ): void {
	$taxonomy      = $wp_term->taxonomy;
	$nonce         = wp_create_nonce( 'sgs_variesby_save_' . $taxonomy );
	$current_value = (string) get_term_meta( $wp_term->term_id, '_sgs_variesby_value', true );
	?>
	<input type="hidden" name="sgs_variesby_nonce" value="<?php echo esc_attr( $nonce ); ?>" />
	<tr class="form-field sgs-variesby-field-row">
		<th scope="row">
			<label for="sgs_variesby_value_edit"><?php esc_html_e( 'Google variesBy type', 'sgs-blocks' ); ?></label>
		</th>
		<td>
			<?php echo sgs_variesby_select( 'sgs_variesby_value_edit', 'sgs_variesby_value', $current_value ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- function returns pre-escaped markup. ?>
			<p class="description">
				<?php esc_html_e( 'Tells Google which product dimension this attribute represents. Used in the JSON-LD ProductGroup markup. Leave "(none)" if unsure.', 'sgs-blocks' ); ?>
			</p>
		</td>
	</tr>
	<?php
}

/**
 * Build a <select> element for the variesBy closed enum.
 *
 * Returns a pre-escaped HTML string; callers must NOT double-escape.
 *
 * @param string $id            The HTML `id` attribute.
 * @param string $name          The HTML `name` attribute.
 * @param string $current_value The currently saved value (may be '').
 * @return string Pre-escaped HTML markup.
 */
function sgs_variesby_select( string $id, string $name, string $current_value ): string {
	$options = array(
		''                => __( '(none)', 'sgs-blocks' ),
		'color'           => __( 'color — colour swatches', 'sgs-blocks' ),
		'size'            => __( 'size — size options (S, M, L…)', 'sgs-blocks' ),
		'material'        => __( 'material — fabric or material type', 'sgs-blocks' ),
		'pattern'         => __( 'pattern — visual pattern', 'sgs-blocks' ),
		'suggestedAge'    => __( 'suggestedAge — age range', 'sgs-blocks' ),
		'suggestedGender' => __( 'suggestedGender — gender targeting', 'sgs-blocks' ),
	);

	$html = '<select id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '" style="max-width:280px;">';
	foreach ( $options as $value => $label ) {
		$html .= '<option value="' . esc_attr( (string) $value ) . '"'
			. selected( $current_value, (string) $value, false )
			. '>' . esc_html( $label ) . '</option>';
	}
	$html .= '</select>';

	return $html;
}

/**
 * Save the variesBy term meta on term create or update.
 *
 * Called on `created_{taxonomy}` and `edited_{taxonomy}`.
 *
 * @param int $term_id Term ID being saved.
 * @param int $tt_id   Term taxonomy ID (unused).
 * @return void
 */
function sgs_save_variesby_field( int $term_id, int $tt_id ): void { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed
	// Capability check — matches the auth_callback in class-configurator-meta.php.
	if ( ! current_user_can( 'manage_woocommerce' ) ) { // phpcs:ignore WordPress.WP.Capabilities.Unknown -- manage_woocommerce is a WooCommerce core capability.
		return;
	}

	// Derive taxonomy from the current action name to verify the correct nonce.
	$action   = current_action();
	$taxonomy = preg_replace( '/^(created|edited)_/', '', (string) $action );

	$nonce = isset( $_POST['sgs_variesby_nonce'] ) // phpcs:ignore WordPress.Security.NonceVerification.Missing -- verified below.
		? sanitize_text_field( wp_unslash( $_POST['sgs_variesby_nonce'] ) )
		: '';
	if ( ! wp_verify_nonce( $nonce, 'sgs_variesby_save_' . $taxonomy ) ) {
		return;
	}

	// phpcs:ignore WordPress.Security.NonceVerification.Missing -- verified above.
	$raw   = isset( $_POST['sgs_variesby_value'] )
		? sanitize_text_field( wp_unslash( $_POST['sgs_variesby_value'] ) )
		: '';
	$value = Configurator_Meta::sanitize_variesby( $raw ); // SEC-8: drops any non-enum value.

	update_term_meta( $term_id, '_sgs_variesby_value', $value );
}
