<?php
/**
 * Server-side render for the SGS Decorative Image block.
 *
 * Outputs an absolute-positioned image. Positioning, rotation, opacity, and
 * z-index are emitted into the block's OWN scoped `<style>` tag.
 *
 * NO-INLINE: this block emits zero inline style property declarations.
 * Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
 *
 * Scoping: this block declares `supports.anchor` — the scope token is
 * therefore a CLASS (`.sgs-di-XXXXXXXX`), never an id, so it can never
 * collide with a user-set anchor id (Spec 31 §B3), mirroring sgs/label +
 * sgs/media.
 *
 * Runtime scroll effects (parallax / fade-on-scroll, `view.js`) mutate two
 * CSS CUSTOM PROPERTIES (`--sgs-di-py` / `--sgs-di-op`) — never a real CSS
 * property — so the element carries zero inline property declarations at
 * any point in its lifecycle; the scoped `<style>` below is the only place
 * the actual `transform`/`opacity` declarations exist.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// 0. Security sanitiser (contract §D) — every value that reaches the scoped
// CSS blob is cast through this before concatenation.
// ---------------------------------------------------------------------------

$sgs_css_num = static function ( $value, int $decimals = 4 ): float {
	return is_numeric( $value ) ? round( (float) $value, $decimals ) : 0.0;
};

// Extract attributes with defaults.
$image_id            = $attributes['imageId'] ?? null;
$image_url           = $attributes['imageUrl'] ?? '';
$image_alt           = $attributes['imageAlt'] ?? '';
// Spec 35 item 18 — default true (this block is decorative-by-design); an
// operator who genuinely wants an accessible name can flip this in the
// Accessibility panel, which is why $rendered_alt is not simply ''.
$image_decorative    = (bool) ( $attributes['imageDecorative'] ?? true );
$rendered_alt        = $image_decorative ? '' : $image_alt;

// decorMedia is the unified image-or-video slot. For
// back-compat, when only the legacy imageUrl is set, synthesise a decorMedia
// object so downstream rendering can use sgs_render_media() for video while
// keeping the rich image pipeline (srcset via sgs_responsive_image) for images.
$decor_media         = $attributes['decorMedia'] ?? null;
if ( empty( $decor_media ) && ! empty( $image_url ) ) {
	$decor_media = array(
		'url'  => $image_url,
		'type' => 'image',
		'id'   => $image_id ? absint( $image_id ) : 0,
		'alt'  => (string) $image_alt,
		'mime' => 'image/jpeg',
	);
}
// When decorMedia carries an image and the legacy imageUrl is empty, hydrate
// the legacy fields so the existing srcset/responsive pipeline still runs.
if ( empty( $image_url ) && ! empty( $decor_media['url'] ) && 'image' === ( $decor_media['type'] ?? 'image' ) ) {
	$image_url = (string) $decor_media['url'];
	$image_id  = isset( $decor_media['id'] ) ? absint( $decor_media['id'] ) : 0;
	$image_alt = isset( $decor_media['alt'] ) ? (string) $decor_media['alt'] : '';
}
// `positionX`/`positionY`/`rotation` are TIER OBJECTS (Spec 35 pass,
// {desktop,tablet,mobile}) — normalise before reading any tier. The base
// desktop-tier value drives the always-on scoped CSS rule below; tablet/
// mobile tiers feed the `data-*` attrs further down (a pre-existing,
// documented gap — see style.css:31 — those attrs have never had a CSS/JS
// consumer, so this migration preserves that exact behaviour rather than
// wiring a new one in as a side effect).
$position_x_obj      = sgs_responsive_normalise_object( $attributes['positionX'] ?? null );
$position_y_obj      = sgs_responsive_normalise_object( $attributes['positionY'] ?? null );
$rotation_obj        = sgs_responsive_normalise_object( $attributes['rotation'] ?? null );
$position_x          = $position_x_obj['desktop'] ?? 50;
$position_y          = $position_y_obj['desktop'] ?? 50;
$width_obj           = sgs_responsive_normalise_object( $attributes['width'] ?? null );
$width               = $width_obj['desktop'] ?? 200;
$max_width_percent   = $attributes['maxWidthPercent'] ?? 20;
$rotation            = $rotation_obj['desktop'] ?? 0;
$opacity             = $attributes['opacity'] ?? 85;
$z_index             = $attributes['zIndex'] ?? 1;
$flip_x              = $attributes['flipX'] ?? false;
$parallax_strength   = $attributes['parallaxStrength'] ?? 0;
$fade_on_scroll      = (bool) ( $attributes['fadeOnScroll'] ?? false );
// overflow is interpolated straight into the scoped <style> block below —
// allow-list it against valid CSS `overflow` keywords (never trust it
// unsanitised into a <style> element, contract §D CSS-injection guard).
$allowed_overflows   = array( 'visible', 'hidden', 'clip', 'scroll', 'auto' );
$overflow_raw        = $attributes['overflow'] ?? 'visible';
$overflow            = in_array( $overflow_raw, $allowed_overflows, true ) ? $overflow_raw : 'visible';
$path_draw           = (bool) ( $attributes['pathDrawOnScroll'] ?? false );
$path_draw_duration  = absint( $attributes['pathDrawDurationMs'] ?? 1500 );
$path_draw_offset    = absint( $attributes['pathDrawTriggerOffset'] ?? 20 );
$allowed_easings     = array( 'ease-out', 'ease-in-out', 'linear' );
$path_draw_easing    = in_array( $attributes['pathDrawEasing'] ?? 'ease-out', $allowed_easings, true )
	? $attributes['pathDrawEasing']
	: 'ease-out';

// Responsive overrides. positionX/positionY/rotation tablet+mobile tiers now
// come off the normalised tier objects built above ($position_x_obj etc.) —
// `positionXTablet`/`positionYTablet`/`rotationTablet` and their Mobile
// siblings are no longer declared by block.json (folded into the object).
$position_x_tablet   = $position_x_obj['tablet'] ?? null;
$position_y_tablet   = $position_y_obj['tablet'] ?? null;
$width_tablet        = $width_obj['tablet'] ?? null;
$rotation_tablet     = $rotation_obj['tablet'] ?? null;
$hide_on_tablet      = $attributes['hideOnTablet'] ?? false;

$position_x_mobile   = $position_x_obj['mobile'] ?? null;
$position_y_mobile   = $position_y_obj['mobile'] ?? null;
$width_mobile        = $width_obj['mobile'] ?? null;
$rotation_mobile     = $rotation_obj['mobile'] ?? null;
$hide_on_mobile      = $attributes['hideOnMobile'] ?? false;

// Don't render if no media.
if ( empty( $decor_media['url'] ) && ! $image_url ) {
	return;
}

// ---------------------------------------------------------------------------
// Scoped CSS assembly (contract §A). uid is a CLASS — this block declares
// `supports.anchor`, so the scope token must never be an id (Spec 31 §B3).
// ---------------------------------------------------------------------------

$uid      = 'sgs-di-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.sgs-decorative-image';

// Base declarations — position/size/opacity/z-index/transform. `opacity` and
// the parallax translateY read from CSS custom properties so the runtime
// scroll effects in view.js only ever mutate a --var VALUE, never a real CSS
// property (keeps the element at zero inline property declarations even
// after JS runs).
$pos_x_css        = $sgs_css_num( $position_x, 2 );
$pos_y_css        = $sgs_css_num( $position_y, 2 );
$width_css        = $sgs_css_num( $width, 2 );
$max_width_css    = $sgs_css_num( $max_width_percent, 2 );
$opacity_css      = $sgs_css_num( $opacity / 100, 4 );
$z_index_css      = (int) $sgs_css_num( $z_index, 0 );
$rotation_css     = $sgs_css_num( $rotation, 2 );

$transform_parts   = array( 'translate(-50%, -50%)' );
if ( 0.0 !== $rotation_css ) {
	$transform_parts[] = 'rotate(' . $rotation_css . 'deg)';
}
if ( $flip_x ) {
	$transform_parts[] = 'scaleX(-1)';
}
$transform_parts[] = 'translateY(var(--sgs-di-py, 0px))';

$root_decls = array(
	'position:absolute',
	'left:' . $pos_x_css . '%',
	'top:' . $pos_y_css . '%',
	'width:' . $width_css . 'px',
	'max-width:' . $max_width_css . '%',
	'opacity:var(--sgs-di-op, ' . $opacity_css . ')',
	'z-index:' . $z_index_css,
	'transform:' . implode( ' ', $transform_parts ),
	'overflow:' . $overflow,
);

$scoped_css   = array();
$scoped_css[] = "{$root_sel}{" . implode( ';', $root_decls ) . ';}';

// ---------------------------------------------------------------------------
// Media-atom layer (Wave 6, 2026-09-02) — object-fit / focal-point (element
// scope) / overlay (box scope). Scoped to '.' . $uid alone (this block
// declares `mediaElements: [{ prefix: "", ... }]`, so
// `SGS_Media_Element::scope_class()` resolves to $uid itself with no
// suffix — the SAME class every rendered node in this file already carries
// somewhere in its ancestor chain: the naked <img> in default mode, or the
// wrapper span in video/treated/boxed mode). Custom properties inherit, so
// one rule on `.{uid}` feeds both `.sgs-media-el` and `.sgs-media-box`
// wherever those markers land.
//
// object-fit/focal-point never emitted anything for this block before this
// migration (it had no such controls) — this is new capability, wired via
// the atom layer exactly per the migration brief, not a replacement of any
// existing hand-rolled CSS (there was none to replace).
$sgs_di_atoms        = array( 'object-fit', 'focal-point', 'overlay' );
$sgs_di_requires_box = class_exists( 'SGS_Media_Element' )
	&& SGS_Media_Element::requires_box( $attributes, '', 'sgs/decorative-image', $sgs_di_atoms );
if ( class_exists( 'SGS_Media_Element' ) ) {
	$sgs_di_atom_css = SGS_Media_Element::style( $attributes, '', 'sgs/decorative-image', $uid, $sgs_di_atoms );
	if ( '' !== $sgs_di_atom_css ) {
		$scoped_css[] = $sgs_di_atom_css;
	}
}

// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving
// CSS combinators like `>` intact (contract §D). Every value reaching
// $scoped_css is pre-sanitised via $sgs_css_num (numeric cast) or a literal.
$style_tag_html = '<style>' . wp_strip_all_tags( implode( '', $scoped_css ) ) . '</style>';

// Build data attributes — passed directly through $img_attrs for proper escaping.
$img_attrs = array(
	// `sgs-media-el` is the shared atom layer's marker for the REPLACED
	// element (object-fit/focal-point read it) — added Wave 6, 2026-09-02.
	'class'    => 'sgs-decorative-image sgs-media-el ' . $uid,
	'alt'      => $rendered_alt,
	'loading'  => 'lazy',
	'decoding' => 'async',
);
if ( $image_decorative ) {
	$img_attrs['aria-hidden'] = 'true';
	$img_attrs['role']        = 'presentation';
}

if ( $parallax_strength > 0 ) {
	$img_attrs['data-parallax'] = esc_attr( $parallax_strength );
}
if ( $fade_on_scroll ) {
	$img_attrs['data-fade-on-scroll'] = 'true';
}
if ( $path_draw ) {
	$img_attrs['data-sgs-path-draw']          = 'true';
	$img_attrs['data-sgs-path-draw-duration'] = esc_attr( $path_draw_duration );
	$img_attrs['data-sgs-path-draw-offset']   = esc_attr( $path_draw_offset );
	$img_attrs['data-sgs-path-draw-easing']   = esc_attr( $path_draw_easing );
}
if ( $hide_on_tablet ) {
	$img_attrs['data-hide-tablet'] = 'true';
}
if ( $hide_on_mobile ) {
	$img_attrs['data-hide-mobile'] = 'true';
}

// Responsive overrides via data attributes (consumed by view.js).
if ( null !== $position_x_tablet ) {
	$img_attrs['data-position-x-tablet'] = esc_attr( $position_x_tablet );
}
if ( null !== $position_y_tablet ) {
	$img_attrs['data-position-y-tablet'] = esc_attr( $position_y_tablet );
}
if ( null !== $width_tablet ) {
	$img_attrs['data-width-tablet'] = esc_attr( $width_tablet );
}
if ( null !== $rotation_tablet ) {
	$img_attrs['data-rotation-tablet'] = esc_attr( $rotation_tablet );
}

if ( null !== $position_x_mobile ) {
	$img_attrs['data-position-x-mobile'] = esc_attr( $position_x_mobile );
}
if ( null !== $position_y_mobile ) {
	$img_attrs['data-position-y-mobile'] = esc_attr( $position_y_mobile );
}
if ( null !== $width_mobile ) {
	$img_attrs['data-width-mobile'] = esc_attr( $width_mobile );
}
if ( null !== $rotation_mobile ) {
	$img_attrs['data-rotation-mobile'] = esc_attr( $rotation_mobile );
}

// Video branch: when decorMedia is a video, defer to sgs_render_media() and
// wrap it in a positioned span so the existing position/transform/data-*
// pipeline (parallax, fade, hide-on-*, responsive overrides) still applies.
$is_video = ! empty( $decor_media ) && isset( $decor_media['type'] ) && 'video' === $decor_media['type'];

if ( $is_video ) {
	$video_html = sgs_render_media( $decor_media, 'sgs/decorative-image' );
	if ( '' === $video_html ) {
		return;
	}

	// Build wrapper attributes mirroring the image data-* pipeline. NO 'style'
	// key — the wrapper carries zero inline property declarations; the
	// positioning/transform/opacity rule lives in $style_tag_html above,
	// scoped to $uid (contract §A).
	//
	// `sgs-media-box` (Wave 6, 2026-09-02) is added ONLY when the overlay
	// atom actually emits box-scope CSS for these attribute values
	// ($sgs_di_requires_box, value-aware) — this wrapper already carries the
	// $uid class the atom CSS is scoped to, so no other change is needed for
	// overlay to paint here. object-fit/focal-point are NOT wired onto the
	// inner <video> in this branch: sgs_render_media() (includes/helpers-
	// media.php, a shared file out of scope for this migration) has no class
	// parameter to carry the `sgs-media-el` marker — a documented, narrow gap,
	// not a silent drop (this block never had object-fit/focal-point controls
	// for video before this migration either).
	$video_wrapper_class = array( 'sgs-decorative-image', 'sgs-decorative-image--video' );
	if ( $sgs_di_requires_box ) {
		$video_wrapper_class[] = SGS_Media_Element::CLASS_BOX;
	}
	$video_wrapper_class[] = $uid;
	$wrapper_attrs         = array(
		'class'       => implode( ' ', $video_wrapper_class ),
		'aria-hidden' => 'true',
		'role'        => 'presentation',
	);
	foreach ( $img_attrs as $key => $val ) {
		if ( 0 === strpos( $key, 'data-' ) ) {
			$wrapper_attrs[ $key ] = $val;
		}
	}

	$wrapper_attr_strs = array();
	foreach ( $wrapper_attrs as $key => $val ) {
		$wrapper_attr_strs[] = sprintf( '%s="%s"', esc_attr( $key ), esc_attr( $val ) );
	}

	printf(
		'%1$s<span %2$s>%3$s</span>',
		$style_tag_html, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised via $sgs_css_num + wp_strip_all_tags.
		implode( ' ', $wrapper_attr_strs ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- each attr already escaped above.
		$video_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sgs_render_media() escapes attributes internally.
	);
	return;
}

// ART-DIRECTION TIERS (2026-08-07). Image branch only — the video branch above
// has already returned. Same {base}/{base}Tablet/{base}Mobile shape as
// sgs/media and sgs/hero, so one client interaction covers "a different crop on
// narrow screens" wherever images appear.
//
// ⚠ NAKED MODE. This block has NO wrapper element — sgs_responsive_image()
// emits the <img> AS the block root. So each tier is a SIBLING <img> that must
// itself carry the $uid class (the positioning/opacity/transform rule is scoped
// to `.{uid}.sgs-decorative-image` and would not reach a tier img without it),
// and the toggle selectors are COMPOUND (`.{uid}.sgs-decorative-image--mobile`),
// never descendant — there is no ancestor to descend from.
//
// ⛔ Tier selectors are built from `'.' . $uid` (a bare single-class token),
// never from $root_sel or any multi-member selector list: a descendant or
// modifier appended to a LIST binds to the last member only, which on
// sgs/media hid every image at every width before it was caught live.
// SURFACE-TREATMENT WRAPPER GATE (2026-08-28).
//
// THE BUG: `fx-surface-treatment.js`'s `initTreatment()` does
// `el.querySelector( 'img' )` and returns a silent no-op closure when it finds
// nothing. In naked mode `el` IS the <img>, and querySelector only searches
// DESCENDANTS — so it never matches, and a client who picks grain/halftone/
// duotone in the inspector gets absolutely nothing, with no error anywhere.
// The second half fails too: `webgl/renderer.js` appends its
// <canvas class="sgs-webgl-surface"> INSIDE that element, and an <img> is a
// void element that cannot hold children.
//
// The PHP half was never broken — `includes/fx-surface-treatment.php` stamps
// `data-sgs-fx-treatment` onto the naked <img> correctly. Only the JS half needs
// a host, so this gate gives it one and changes nothing else.

/*
 * ⛔ GATED, never unconditional. The untreated path must stay byte-identical,
 * because three separate things assume the <img> is the root:
 *   · $root_sel / $sgs_tier_sel are COMPOUND (`.{uid}.sgs-decorative-image`) —
 *     see the tier note above; a wrapper changes which element they must hit.
 *   · style.css binds `data-hide-tablet` / `data-hide-mobile` to whatever
 *     carries the class; splitting the pair across two elements breaks both.
 *   · view.js selects `.sgs-decorative-image[data-parallax]` and writes
 *     --sgs-di-py / --sgs-di-op onto the match. If BOTH wrapper and <img> kept
 *     the class + data-*, parallax would apply twice and the inner <img> would
 *     take its own position:absolute from $root_sel.
 */
// So in treated mode the WRAPPER takes over the root role wholesale (class,
// uid, a11y, every data-*) and the inner <img> becomes plain fill-the-host
// media — exactly the division the video branch above already uses.

/*
 * ⛔ GATE ON `fx`, NOT ON `fxTreatment`. This was wrong in the first cut and a
 * live capture caught it. `includes/fx-attributes.php`'s FX_ATTR_MAP maps
 * `fx` => `data-sgs-fx`, and `fx-surface-treatment.php` activates on
 * `'surface-treatment' === get_attribute( 'data-sgs-fx' )` — `fxTreatment` only
 * chooses WHICH preset, and an empty one falls back to
 * SGS_FX_TREATMENT_DEFAULT ('grain'). So a client who picks the effect and
 * never touches the preset has a LIVE treatment with an empty `fxTreatment`,
 * and a gate keyed on the preset would have left exactly that client with the
 * original silent no-op — the precise bug this change exists to fix.
 */
$has_treatment = 'surface-treatment' === ( $attributes['fx'] ?? '' );

// A real container is needed whenever EITHER the FX surface-treatment (a
// <canvas> host) OR the overlay atom (a ::after box paint) needs one — a
// replaced <img> supplies neither (Wave 6, 2026-09-02: see the overlay-atom
// note further below, and the surface-treatment note above it — both name
// the identical constraint independently). Generalising the wrapper-takes-
// root-role shape this file already uses for $has_treatment means overlay
// gets it for free with no second implementation.
$sgs_di_wants_wrapper = $has_treatment || $sgs_di_requires_box;

$tier_imgs = array();
foreach ( array( 'Tablet', 'Mobile' ) as $sgs_tier ) {
	$tier_id  = isset( $attributes[ 'imageId' . $sgs_tier ] ) ? absint( $attributes[ 'imageId' . $sgs_tier ] ) : 0;
	$tier_url = isset( $attributes[ 'imageUrl' . $sgs_tier ] ) ? (string) $attributes[ 'imageUrl' . $sgs_tier ] : '';
	if ( '' === $tier_url && 0 === $tier_id ) {
		continue;
	}
	$tier_imgs[ strtolower( $sgs_tier ) ] = array(
		'id'  => $tier_id,
		'url' => $tier_url,
	);
}

$base_class = $img_attrs['class'];

// In treated mode the tier <img>s live INSIDE the wrapper and carry neither the
// uid nor the base class (see the gate note above), so their toggle selectors
// must be DESCENDANT rather than compound. Naked mode keeps the compound form
// verbatim — there is still no ancestor to descend from there.
$sgs_media_class = 'sgs-decorative-image__media';
if ( ! empty( $tier_imgs ) ) {
	// `$sgs_di_wants_wrapper` (Wave 6) generalises this gate: the same
	// wrapper-takes-root-role tier-class shape now also applies when overlay
	// alone needs the wrapper, not only fx-surface-treatment.
	$img_attrs['class'] = $sgs_di_wants_wrapper
		? $sgs_media_class . ' sgs-media-el ' . $sgs_media_class . '--desktop'
		: $base_class . ' sgs-decorative-image--desktop';

	$sgs_tier_sel = static function ( $tier ) use ( $uid, $sgs_di_wants_wrapper, $sgs_media_class ) {
		if ( $sgs_di_wants_wrapper ) {
			return '.' . $uid . ' .' . $sgs_media_class . '--' . $tier;
		}
		return '.' . $uid . '.sgs-decorative-image--' . $tier;
	};
	$tier_css = '';
	if ( isset( $tier_imgs['mobile'] ) ) {
		$tier_css .= '@media(max-width:767px){' . $sgs_tier_sel( 'desktop' ) . '{display:none}}';
		$tier_css .= '@media(min-width:768px){' . $sgs_tier_sel( 'mobile' ) . '{display:none}}';
	}
	if ( isset( $tier_imgs['tablet'] ) ) {
		$tier_css .= '@media(min-width:768px) and (max-width:1023px){' . $sgs_tier_sel( 'desktop' ) . '{display:none}}';
		$tier_css .= '@media(max-width:767px){' . $sgs_tier_sel( 'tablet' ) . '{display:none}}';
		$tier_css .= '@media(min-width:1024px){' . $sgs_tier_sel( 'tablet' ) . '{display:none}}';
	}
	// Re-assemble the <style> tag with the tier rules appended, through the same
	// wp_strip_all_tags </style>-breakout guard the base rule uses (contract §D).
	$scoped_css[]   = $tier_css;
	$style_tag_html = '<style>' . wp_strip_all_tags( implode( '', $scoped_css ) ) . '</style>';
}

// WRAPPER BRANCH — emit the container EITHER the WebGL host ($has_treatment)
// OR the overlay atom's ::after box paint ($sgs_di_requires_box, Wave 6,
// 2026-09-02) needs. Mirrors the video branch above: <style> printed BEFORE
// the wrapper, wrapper carries no 'style' key (Spec 32), data-* lifted off
// $img_attrs and nothing else. The two triggers share one wrapper when both
// are active — a treated block that ALSO sets an overlay colour gets both
// classes on the same span, not two.
if ( $sgs_di_wants_wrapper ) {
	if ( $has_treatment ) {
		// The inner media carries neither uid nor base class, so $root_sel's
		// position:absolute never reaches it — it only needs to fill the host.
		// `[data-sgs-fx="surface-treatment"]{position:relative}` (0,1,0) loses to
		// $root_sel's (0,2,0) position:absolute on the wrapper, which is fine:
		// absolute is equally a containing block, so the canvas's inset:0 still
		// resolves against the wrapper.
		$scoped_css[] = '.' . $uid . '.sgs-decorative-image--treated>.' . $sgs_media_class
			. '{display:block;width:100%;height:auto}';
	}
	$style_tag_html = '<style>' . wp_strip_all_tags( implode( '', $scoped_css ) ) . '</style>';

	$sgs_di_wrapper_class = array( 'sgs-decorative-image' );
	if ( $has_treatment ) {
		$sgs_di_wrapper_class[] = 'sgs-decorative-image--treated';
	}
	if ( $sgs_di_requires_box ) {
		// `sgs-media-box` is the shared atom layer's marker for the overlay's
		// ::after paint (class-sgs-media-element.php::CLASS_BOX) — added
		// ONLY when overlay actually emits box-scope CSS for these attribute
		// values, so an instance that never sets an overlay colour/gradient
		// renders byte-identically to before this migration.
		$sgs_di_wrapper_class[] = SGS_Media_Element::CLASS_BOX;
	}
	$sgs_di_wrapper_class[] = $uid;

	$wrapper_attrs = array(
		'class' => implode( ' ', $sgs_di_wrapper_class ),
	);
	if ( $image_decorative ) {
		$wrapper_attrs['aria-hidden'] = 'true';
		$wrapper_attrs['role']        = 'presentation';
	}
	foreach ( $img_attrs as $sgs_key => $sgs_val ) {
		if ( 0 === strpos( $sgs_key, 'data-' ) ) {
			$wrapper_attrs[ $sgs_key ] = $sgs_val;
		}
	}

	$wrapper_attr_strs = array();
	foreach ( $wrapper_attrs as $sgs_key => $sgs_val ) {
		$wrapper_attr_strs[] = sprintf( '%s="%s"', esc_attr( $sgs_key ), esc_attr( $sgs_val ) );
	}

	// Plain fill-the-host media: no uid, no base class, no data-* — but it
	// KEEPS `sgs-media-el` (Wave 6) so object-fit/focal-point still reach it;
	// the custom-property VALUES those atoms read are set on the wrapper via
	// $sgs_di_atom_css above and inherit down through the DOM to this node.
	// Without that stripping otherwise, view.js would match the inner <img>
	// too and apply parallax twice, and $root_sel would absolutely-position
	// it inside its own wrapper.
	$media_attrs = array(
		'class'    => empty( $tier_imgs ) ? $sgs_media_class . ' sgs-media-el' : $img_attrs['class'],
		'alt'      => $rendered_alt,
		'loading'  => 'lazy',
		'decoding' => 'async',
	);

	/*
	 * ⚠ KNOWN LIMITATION — treatment + art-direction tiers samples the DESKTOP
	 * image at every width. `fx-surface-treatment.js` takes
	 * `el.querySelector( 'img' )`, i.e. the FIRST <img> in the wrapper, which is
	 * always the desktop tier. The narrower tiers are hidden by `display:none`,
	 * not removed, so on a phone the visible <img> is the mobile one while the
	 * canvas painted over it was sampled from the desktop one.
	 *
	 * NOT fixed here, deliberately: the fix belongs in the shared JS module
	 * (pick the tier that is actually visible, and repaint on the tier change),
	 * and `fx-surface-treatment.js` is a shared mechanism used by every
	 * treatment-qualifying block — a Rule 7 design-gate change, not a
	 * side-effect of this block's wrapper fix. Recorded rather than left to be
	 * rediscovered as a mystery, because every automated signal here is green:
	 * the markup is correct, the canvas paints, and only the SOURCE PIXELS are
	 * wrong. A block using a treatment with no tiers is unaffected.
	 */
	$media_html = sgs_responsive_image(
		$image_id ? absint( $image_id ) : 0,
		$image_url,
		$rendered_alt,
		'large',
		$media_attrs
	);
	foreach ( $tier_imgs as $tier_key => $tier_media ) {
		$tier_attrs          = $media_attrs;
		$tier_attrs['class'] = $sgs_media_class . ' sgs-media-el ' . $sgs_media_class . '--' . $tier_key;
		$media_html         .= sgs_responsive_image(
			$tier_media['id'],
			$tier_media['url'],
			$rendered_alt,
			'large',
			$tier_attrs
		);
	}

	printf(
		'%1$s<span %2$s>%3$s</span>',
		$style_tag_html, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised via $sgs_css_num + wp_strip_all_tags.
		implode( ' ', $wrapper_attr_strs ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- each attr already escaped above.
		$media_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sgs_responsive_image() escapes all attributes internally.
	);
	return;
}

// Image branch: render using sgs_responsive_image helper — all attributes
// escaped via $img_attrs. NO 'style' key on $img_attrs — the scoped
// $style_tag_html (echoed first) carries the positioning/transform/opacity
// rule (contract §A).
echo $style_tag_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised via $sgs_css_num + wp_strip_all_tags.
echo sgs_responsive_image( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sgs_responsive_image() escapes all attributes internally.
	$image_id ? absint( $image_id ) : 0,
	$image_url,
	$rendered_alt, // Empty when decorative (default); operator-set imageAlt otherwise.
	'large',
	$img_attrs
);

foreach ( $tier_imgs as $tier_key => $tier_media ) {
	$tier_attrs          = $img_attrs;
	$tier_attrs['class'] = $base_class . ' sgs-decorative-image--' . $tier_key;
	echo sgs_responsive_image( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sgs_responsive_image() escapes all attributes internally.
		$tier_media['id'],
		$tier_media['url'],
		$rendered_alt, // Empty when decorative (default); operator-set imageAlt otherwise.
		'large',
		$tier_attrs
	);
}
