<?php
/**
 * Negative-control fixture for Detector 1's MULTI-HOP PROVENANCE branch.
 *
 * Not a real block. It is a synthetic `render.php` whose only job is to
 * contain, in isolation, each attribute-flow shape the multi-hop branch was
 * built to resolve — so that if someone later narrows or deletes that branch,
 * `php detector1_render_escaping.php --self-test` fails loudly instead of the
 * detector quietly under-reporting again.
 *
 * Every shape below was copied from a REAL block that measured NULL on
 * 2026-08-05 because single-hop tracking could not follow it. Cited inline.
 *
 * Path note: this file lives under `fixtures/`, NOT `src/blocks/*\/render.php`,
 * so `collect_default_files()` never picks it up and it can never contaminate
 * a `--glob` production run.
 */

// Shape A — two-hop ternary into a sprintf'd aria-label.
// Real instance: sgs/icon.ariaLabel (icon/render.php:113,379-382).
// Needs BOTH multi-hop provenance (to reach $emoji_aria_label at all) AND
// printf_context outranking the statement window (the format string also
// carries `class="sgs-icon__emoji"`, whose class-token rule would otherwise
// return NOT-content first). Expect: a11y-metadata.
$fx_aria_label       = $attributes['fxAriaLabel'] ?? '';
$fx_emoji_aria_label = '' !== $fx_aria_label ? $fx_aria_label : 'icon';
$fx_output           = sprintf(
	'<span class="sgs-fixture__emoji" role="img" aria-label="%s">%s</span>',
	esc_attr( $fx_emoji_aria_label ),
	esc_html( $fx_safe_emoji )
);

// Shape B — two-hop through a sanitiser + ternary into visible text.
// Real instance: sgs/buybox.addToCartLabel (buybox/render.php:393-395,623).
// Expect: visible-text.
$fx_cart_label_raw = $attributes['fxCartLabel'] ?? '';
$fx_cart_label     = '' !== sanitize_text_field( $fx_cart_label_raw )
	? sanitize_text_field( $fx_cart_label_raw )
	: __( 'Add to Cart', 'sgs-blocks' );
echo esc_html( $fx_cart_label );

// Shape C — FRAGMENT. The attribute is concatenated behind a literal prefix
// and only ever reaches the escaper as part of a larger URL.
// Real instance: sgs/whatsapp-cta.phoneNumber (whatsapp-cta/render.php:54-56,327).
// Expect: value-fragment (a VETO), never link-href — the role's consumer
// would write the whole URL back into a digits-only attribute.
$fx_phone       = $attributes['fxPhoneNumber'] ?? '';
$fx_clean_phone = preg_replace( '/[^0-9]/', '', $fx_phone );
$fx_url         = 'https://example.test/' . $fx_clean_phone;
echo esc_url( $fx_url );

// Shape D — a DIRECT binding must NOT be clobbered by a later conditional
// reassignment from unrelated locals. Real instance: sgs/nav-menu.navLabel
// (nav-menu/render.php:639,653), which LOST its correct a11y-text assignment
// on the first cut of multi-hop. $fx_other is deliberately tracked to a
// DIFFERENT attribute, so a clobbering implementation mis-attributes this
// aria-label to `fxOtherAttr`. Expect: fxNavLabel resolves a11y-metadata.
$fx_other     = $attributes['fxOtherAttr'] ?? '';
$fx_nav_label = trim( (string) ( $attributes['fxNavLabel'] ?? '' ) );
if ( '' === $fx_nav_label ) {
	$fx_nav_label = '' !== $fx_other ? $fx_other : 'Primary';
}
echo '<nav aria-label="' . esc_attr( $fx_nav_label ) . '">';

// Shape E — FRAGMENT LANDING IN A TECHNICAL ATTRIBUTE. The value is concatenated
// behind a literal prefix (so `fragment` is set, exactly like Shape C) but the
// concatenation lands in `name="`, which classify_esc_attr() rules NOT-content.
// Real instance: sgs/form-field-{date,email,number,phone,select,text,textarea}
// .fieldName via includes/forms/field-render-helpers.php:166-175 — the submission
// key is `'sgs-field-' . sanitize_key( $field_name )`.
// Expect: NOT-content. Before the 2026-08-06 fix the fragment flag short-circuited
// BEFORE the func dispatch, so this resolved value-fragment and the seven blocks
// that delegate to the shared helper could never earn a D1 veto -> role `technical`.
// This is the REGRESSION GUARD for that fix: it fails if the short-circuit returns.
// Shape C above is its paired negative control — a fragment reaching a CONTENT
// category must still be suppressed to value-fragment.
$fx_field_name  = $attributes['fxFieldName'] ?? '';
$fx_field_slug  = sanitize_key( $fx_field_name );
$fx_submit_name = 'sgs-field-' . $fx_field_slug;
echo '<input name="' . esc_attr( $fx_submit_name ) . '">';

// Shape F — a token-normalising function reached WHOLE-VALUE (no concatenation,
// no fragment flag). Real instance: sgs/post-grid.orderBy, which reaches ONLY
// `sanitize_key( $attributes['orderBy'] ?? 'date' )` before being handed to
// WP_Query's 'orderby' argument (post-grid/render.php:55) — never rendered,
// never escaped as content, so D1 previously emitted ZERO rows for it (the
// tracked-function allowlist gap this task closes; see classify_detector1.py's
// FUNC_CATEGORY comment). Expect: NOT-content.
$fx_order_by = sanitize_key( $attributes['fxOrderBy'] ?? 'date' );

// Shape G — NEGATIVE CONTROL for the token-sanitiser addition. The SAME
// attribute reaches BOTH a token-normaliser (sanitize_html_class, feeding an
// HTML class -- NOT-content) AND a genuine content escaper (esc_html, feeding
// visible text) at two DIFFERENT usage sites. This is the guard the task brief
// asked for: proves the NOT-content addition can only ADD evidence, never
// silently reclassify a real content attribute as a backend token. Real-shape
// precedent: several blocks build an `sgs-*` modifier class from a value that
// is ALSO painted on the page (e.g. a status label used both as `.status--%s`
// and as its own visible text). Expect: fxDualUse resolves to
// {NOT-content, visible-text} as raw D1 facts, and — per
// fingerprint_content_roles.py's `content_cats` filter (NON_CONTENT_CATEGORIES
// excludes NOT-content before the winner is picked, :365) — visible-text must
// be the one that survives into content_cats and wins the aggregation.
$fx_dual_use  = $attributes['fxDualUse'] ?? '';
$fx_dual_slug = 'sgs-status--' . sanitize_html_class( $fx_dual_use );
echo esc_html( $fx_dual_use );
