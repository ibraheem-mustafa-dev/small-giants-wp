<?php
/**
 * Server-side render for sgs/measured-diagram.
 *
 * A drawing with labelled measurement lines on top. Each measurement is an
 * sgs/diagram-dimension child (rendered into $content) that draws its own line
 * SVG and its own label; this block paints the frame, the drawing and every
 * shared style the children read:
 *
 *   <figure class="wp-block-sgs-measured-diagram sgs-measured-diagram {uid}">
 *     <div class="sgs-measured-diagram__frame"> <img …> [gradient defs] </div>
 *     <ul class="sgs-measured-diagram__labels" role="list" aria-live="polite">
 *       <li class="sgs-diagram-dimension {child uid}">…</li> …
 *     </ul>
 *   </figure>
 *
 * The labels are real, readable text and are the accessible text alternative
 * for the measurements; the line SVGs are aria-hidden. `aria-live` lets a
 * screen reader hear a label change when a bound value follows a size pick.
 *
 * NO-INLINE (Spec 32): every per-instance value is a rule in this block's own
 * `.{uid}`-scoped <style>. Colour, width and typography defaults live in the
 * stylesheets as `:where()` token chains
 * (`--wp--custom--measured-diagram-presets--default--<role>`, FR-32-5), so an
 * instance rule here always wins and an unset attribute emits nothing.
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    Rendered sgs/diagram-dimension children.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ── Drawing (media-element atoms, prefix `drawing`) ─────────────────────────
$sgs_md_image_url  = isset( $attributes['drawingImageUrl'] ) ? (string) $attributes['drawingImageUrl'] : '';
$sgs_md_decorative = ! empty( $attributes['drawingImageDecorative'] );
$sgs_md_image_id   = absint( $attributes['drawingImageId'] ?? 0 );
$sgs_md_alt        = $sgs_md_decorative ? '' : (string) ( $attributes['drawingImageAlt'] ?? '' );
// No alt typed for this instance: use the media library's own description of
// the file, so a drawing bound per product still carries its text alternative.
if ( ! $sgs_md_decorative && '' === trim( $sgs_md_alt ) && $sgs_md_image_id > 0 ) {
	$sgs_md_alt = (string) get_post_meta( $sgs_md_image_id, '_wp_attachment_image_alt', true );
}
list( $sgs_md_w, $sgs_md_h ) = sgs_measured_diagram_box(
	$attributes['drawingImageWidth'] ?? null,
	$attributes['drawingImageHeight'] ?? null
);

$sgs_md_ext_style = isset( $attributes['extensionStyle'] ) && in_array( $attributes['extensionStyle'], array( 'solid', 'dashed', 'dotted' ), true )
	? $attributes['extensionStyle']
	: 'solid';

// uid is a CLASS — this block declares supports.anchor, so the scope token is
// never an id (Spec 31 §B3).
$uid        = wp_unique_id( 'sgs-measured-diagram-' );
$scoped_css = array();
$sgs_md_defs = '';

// ── Frame ratio + max width ─────────────────────────────────────────────────
$scoped_css[] = '.' . $uid . '.sgs-measured-diagram{--sgs-measured-diagram-ratio:' . sgs_diagram_fmt( $sgs_md_w ) . ' / ' . sgs_diagram_fmt( $sgs_md_h ) . ';}';

$sgs_md_max_width_css = sgs_emit_responsive_css(
	'.' . $uid . '.sgs-measured-diagram',
	array(
		array(
			'value' => sgs_measured_diagram_length_tiers( $attributes['maxWidth'] ?? null ),
			'css'   => 'max-width',
		),
	)
);
if ( '' !== $sgs_md_max_width_css ) {
	$scoped_css[] = $sgs_md_max_width_css;
}

// ── Label mode per tier: on the drawing, or numbered markers + a list below ─
// Pure CSS: the tier rule only switches custom properties the two stylesheets
// read (label position and offset, marker and number display, list spacing).
$sgs_md_mode_raw = sgs_responsive_normalise_object( $attributes['labelMode'] ?? null );
$sgs_md_mode     = array();
foreach ( array( 'desktop', 'tablet', 'mobile' ) as $sgs_md_tier ) {
	$sgs_md_mode[ $sgs_md_tier ] = in_array( $sgs_md_mode_raw[ $sgs_md_tier ], array( 'onDrawing', 'numbered' ), true )
		? $sgs_md_mode_raw[ $sgs_md_tier ]
		: null;
}
if ( array_filter( $sgs_md_mode ) ) {
	$sgs_md_mode_css = sgs_emit_tier_rules_map(
		'.' . $uid . '.sgs-measured-diagram',
		$sgs_md_mode,
		array(
			'numbered'  => '--sgs-measured-diagram-label-position:static;--sgs-measured-diagram-label-transform:none;--sgs-measured-diagram-marker-display:flex;--sgs-measured-diagram-number-display:inline-flex;--sgs-measured-diagram-numbered:1;',
			'onDrawing' => '--sgs-measured-diagram-label-position:absolute;--sgs-measured-diagram-label-transform:initial;--sgs-measured-diagram-marker-display:none;--sgs-measured-diagram-number-display:none;--sgs-measured-diagram-numbered:0;',
		),
		'',
		'onDrawing'
	);
	if ( '' !== $sgs_md_mode_css ) {
		$scoped_css[] = $sgs_md_mode_css;
	}
}

// ── Line: colour or gradient, width ─────────────────────────────────────────
$sgs_md_line_gradient = (string) ( $attributes['lineColourGradient'] ?? '' );
$sgs_md_line_colour   = sgs_colour_value( (string) ( $attributes['lineColour'] ?? '' ) );
$sgs_md_line_stroke   = sgs_svg_stroke_gradient( $sgs_md_line_gradient, $uid . '-line', 'stroke' );
if ( '' !== $sgs_md_line_stroke['defs'] ) {
	$sgs_md_defs      .= sgs_measured_diagram_user_space_gradient( $sgs_md_line_stroke['defs'], $sgs_md_w, $sgs_md_h );
	$sgs_md_line_fill  = sgs_svg_stroke_gradient( $sgs_md_line_gradient, $uid . '-line', 'fill' );
	$scoped_css[]      = '.' . $uid . ' .sgs-diagram-dimension__line,.' . $uid . ' .sgs-diagram-dimension__ends{' . $sgs_md_line_stroke['css'] . ';}';
	$scoped_css[]      = '.' . $uid . ' .sgs-diagram-dimension__dot{' . $sgs_md_line_fill['css'] . ';}';
} elseif ( '' !== $sgs_md_line_colour ) {
	$scoped_css[] = '.' . $uid . ' .sgs-diagram-dimension__line,.' . $uid . ' .sgs-diagram-dimension__ends{stroke:' . $sgs_md_line_colour . ';}';
	$scoped_css[] = '.' . $uid . ' .sgs-diagram-dimension__dot{fill:' . $sgs_md_line_colour . ';}';
}

$sgs_md_line_width = sgs_measured_diagram_length( $attributes['lineWidth'] ?? '' );
if ( '' !== $sgs_md_line_width ) {
	$scoped_css[] = '.' . $uid . ' .sgs-diagram-dimension__line,.' . $uid . ' .sgs-diagram-dimension__ends{stroke-width:' . $sgs_md_line_width . ';}';
}

// ── Extension (guide) lines: colour or gradient, width + dash rhythm ────────
$sgs_md_ext_gradient = (string) ( $attributes['extensionColourGradient'] ?? '' );
$sgs_md_ext_colour   = sgs_colour_value( (string) ( $attributes['extensionColour'] ?? '' ) );
$sgs_md_ext_stroke   = sgs_svg_stroke_gradient( $sgs_md_ext_gradient, $uid . '-extension', 'stroke' );
if ( '' !== $sgs_md_ext_stroke['defs'] ) {
	$sgs_md_defs .= sgs_measured_diagram_user_space_gradient( $sgs_md_ext_stroke['defs'], $sgs_md_w, $sgs_md_h );
	$scoped_css[] = '.' . $uid . ' .sgs-diagram-dimension__guides{' . $sgs_md_ext_stroke['css'] . ';}';
} elseif ( '' !== $sgs_md_ext_colour ) {
	$scoped_css[] = '.' . $uid . ' .sgs-diagram-dimension__guides{stroke:' . $sgs_md_ext_colour . ';}';
}

$sgs_md_ext_width = sgs_measured_diagram_length( $attributes['extensionWidth'] ?? '' );
if ( '' !== $sgs_md_ext_width ) {
	$scoped_css[] = '.' . $uid . ' .sgs-diagram-dimension__guides{stroke-width:' . $sgs_md_ext_width . ';' . sgs_measured_diagram_dash_decls( $sgs_md_ext_style, $sgs_md_ext_width ) . '}';
}

// ── Label text colours (flat or gradient, the text-colour trio) ────────────
$sgs_md_value_paint = sgs_resolve_text_colour_or_gradient(
	(string) ( $attributes['valueColour'] ?? '' ),
	(string) ( $attributes['valueColourGradient'] ?? '' )
);
$sgs_md_value_decl  = sgs_text_colour_decl( $sgs_md_value_paint );
if ( '' !== $sgs_md_value_decl ) {
	$scoped_css[] = '.' . $uid . ' .sgs-diagram-dimension__value{' . $sgs_md_value_decl . ';}';
	$scoped_css[] = sgs_text_colour_gradient_fallback_rule( '.' . $uid . ' .sgs-diagram-dimension__value', $sgs_md_value_paint );
	// The numbered marker and list number share the value's flat colour; a
	// gradient stays on the value text only (the marker paints a background).
	if ( 0 === strpos( $sgs_md_value_decl, 'color:' ) ) {
		$scoped_css[] = '.' . $uid . ' .sgs-diagram-dimension__marker,.' . $uid . ' .sgs-diagram-dimension__number{' . $sgs_md_value_decl . ';}';
	}
}

$sgs_md_caption_paint = sgs_resolve_text_colour_or_gradient(
	(string) ( $attributes['captionColour'] ?? '' ),
	(string) ( $attributes['captionColourGradient'] ?? '' )
);
$sgs_md_caption_decl  = sgs_text_colour_decl( $sgs_md_caption_paint );
if ( '' !== $sgs_md_caption_decl ) {
	$scoped_css[] = '.' . $uid . ' .sgs-diagram-dimension__caption{' . $sgs_md_caption_decl . ';}';
	$scoped_css[] = sgs_text_colour_gradient_fallback_rule( '.' . $uid . ' .sgs-diagram-dimension__caption', $sgs_md_caption_paint );
}

// ── Label typography (one TypographyControls mount, two targets) ───────────
$scoped_css[] = sgs_typography_css_rule( $attributes, 'value', '.' . $uid . ' .sgs-diagram-dimension__value' );
$scoped_css[] = sgs_typography_css_rule( $attributes, 'caption', '.' . $uid . ' .sgs-diagram-dimension__caption' );

// ── Gap between a label's caption and value ─────────────────────────────────
$scoped_css[] = sgs_emit_responsive_css(
	'.' . $uid . ' .sgs-diagram-dimension__label',
	array(
		array(
			'value' => sgs_measured_diagram_length_tiers( $attributes['labelGap'] ?? null ),
			'css'   => 'gap',
		),
	)
);

// ── Media-atom layer (intrinsic + meaning emit no CSS; called for parity) ───
$sgs_md_atoms = array( 'intrinsic', 'meaning' );
if ( class_exists( 'SGS_Media_Element' ) ) {
	$scoped_css[] = SGS_Media_Element::style( $attributes, 'drawing', 'sgs/measured-diagram', $uid, $sgs_md_atoms );
}

// ── Markup ──────────────────────────────────────────────────────────────────
$sgs_md_img = '';
if ( '' !== $sgs_md_image_url ) {
	$sgs_md_img_classes = array( 'sgs-measured-diagram__drawing' );
	if ( class_exists( 'SGS_Media_Element' ) ) {
		$sgs_md_img_classes = array_merge(
			$sgs_md_img_classes,
			SGS_Media_Element::element_classes( SGS_Media_Element::scope_class( $uid, 'drawing' ) )
		);
	}
	$sgs_md_has_size = ! empty( $attributes['drawingImageWidth'] ) && ! empty( $attributes['drawingImageHeight'] );
	$sgs_md_img      = sprintf(
		'<img class="%1$s" src="%2$s" alt="%3$s"%4$s loading="lazy" decoding="async" />',
		esc_attr( implode( ' ', $sgs_md_img_classes ) ),
		esc_url( $sgs_md_image_url ),
		esc_attr( $sgs_md_alt ),
		$sgs_md_has_size
			? ' width="' . esc_attr( (string) (int) round( $sgs_md_w ) ) . '" height="' . esc_attr( (string) (int) round( $sgs_md_h ) ) . '"'
			: ''
	);
}

$sgs_md_defs_svg = '';
if ( '' !== $sgs_md_defs ) {
	$sgs_md_defs_svg = sgs_svg_inject_defs(
		'<svg class="sgs-measured-diagram__defs" aria-hidden="true" focusable="false"></svg>',
		$sgs_md_defs
	);
}

$sgs_md_labels = '';
if ( '' !== trim( (string) $content ) ) {
	$sgs_md_labels = '<ul class="sgs-measured-diagram__labels" role="list" aria-live="polite">' . $content . '</ul>';
}

$sgs_md_wrapper = get_block_wrapper_attributes(
	array(
		'class' => 'sgs-measured-diagram ' . $uid . ' sgs-measured-diagram--extension-' . $sgs_md_ext_style,
	)
);

$scoped_css = array_filter( $scoped_css );

// wp_strip_all_tags (not esc_html) blocks a </style> breakout while keeping
// CSS combinators intact; every value above is cast, allow-listed or run
// through a shared CSS-safety helper first.
if ( $scoped_css ) {
	echo '<style>' . wp_strip_all_tags( implode( '', $scoped_css ) ) . '</style>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- pre-sanitised CSS, see above.
}

printf(
	'<figure %1$s><div class="sgs-measured-diagram__frame">%2$s%3$s</div>%4$s</figure>',
	$sgs_md_wrapper, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() escapes.
	$sgs_md_img, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from esc_attr()/esc_url() parts above.
	$sgs_md_defs_svg, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- gradient defs built from esc_attr()'d stop fragments by sgs_svg_stroke_gradient().
	$sgs_md_labels // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $content is the children's own escaped render output.
);
