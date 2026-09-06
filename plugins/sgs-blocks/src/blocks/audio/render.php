<?php
/**
 * Server-side render for sgs/audio.
 *
 * Progressive enhancement: this ALWAYS server-renders a native <audio controls>
 * element inside a styled wrapper. With no JavaScript the native player works.
 * The viewScriptModule (view.js) then UPGRADES the wrapper to the chosen
 * `playerStyle` — a custom transport + a Web Audio visualiser that reacts to the
 * real audio (spectrum / oscilloscope / gradient-pulse / radial).
 *
 * The seven player styles:
 *   minimal        — a quiet pill: play + progress track + timecode
 *   waveform       — pre-rendered peaks that fill with playback
 *   spectrum       — live frequency bars (Web Audio AnalyserNode)
 *   radial         — circular progress ring + a glow that pulses with amplitude
 *   oscilloscope   — a live waveform line on a dark scope
 *   gradient-pulse — the player background shifts colour + brightness to the sound
 *   hidden         — audio loads + plays but renders no visible player
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    Inner block content (unused).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;



require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';


// [D-tier-object-render-fix 2026-09-06]
// Group 1 folded padding/margin into owned tier-object attrs
// {desktop,tablet,mobile}, but this block's own scoped CSS below still
// reads the pre-migration flat shape (a plain box for the base value,
// plus four separate flat attrs for the tablet/mobile overrides --
// block.json no longer declares any of those four). Normalise once,
// into fresh locals only -- every literal reference below has been
// redirected to these instead of writing back into $attributes.
$sgs_tor_padding_tiers  = sgs_responsive_normalise_object( $attributes['padding'] ?? null, true );
$sgs_tor_margin_tiers   = sgs_responsive_normalise_object( $attributes['margin'] ?? null, true );
$sgs_tor_padding_desktop = is_array( $sgs_tor_padding_tiers['desktop'] ) ? $sgs_tor_padding_tiers['desktop'] : array();
$sgs_tor_margin_desktop  = is_array( $sgs_tor_margin_tiers['desktop'] ) ? $sgs_tor_margin_tiers['desktop'] : array();
// ---------------------------------------------------------------------------
// Security sanitiser (contract §D) — a CSS-length sanitiser for box/side
// values (mirrors sgs/label + sgs/heading + sgs/container).
// ---------------------------------------------------------------------------

$allowed_styles = array( 'minimal', 'waveform', 'spectrum', 'radial', 'oscilloscope', 'gradient-pulse', 'hidden' );
$player_style   = $attributes['playerStyle'] ?? 'minimal';
$player_style   = in_array( $player_style, $allowed_styles, true ) ? $player_style : 'minimal';

// 0-100, "how snappy the reactive visualisers feel" — a continuous slider
// (§ discoverability review) rather than a 3-value enum, mapped to the two
// underlying AnalyserNode params in view.js. 50 reproduces the exact values
// this block shipped with before the control existed (fftSize 512 /
// smoothingTimeConstant 0.8) — see view.js's SENSITIVITY comment.
$reactive_sensitivity = isset( $attributes['reactiveSensitivity'] ) ? (float) $attributes['reactiveSensitivity'] : 50;
$reactive_sensitivity = max( 0, min( 100, $reactive_sensitivity ) );

$audio_url    = isset( $attributes['audioUrl'] ) ? (string) $attributes['audioUrl'] : '';
$audio_source = isset( $attributes['audioSource'] ) ? (string) $attributes['audioSource'] : 'external';
$audio_id     = isset( $attributes['audioId'] ) ? absint( $attributes['audioId'] ) : 0;
$audio_mime   = isset( $attributes['audioMimeType'] ) ? (string) $attributes['audioMimeType'] : '';
$controls     = isset( $attributes['audioControls'] ) ? (bool) $attributes['audioControls'] : true;
$loop         = ! empty( $attributes['audioLoop'] );
$autoplay     = ! empty( $attributes['audioAutoplay'] );
$preload_raw  = isset( $attributes['audioPreload'] ) ? (string) $attributes['audioPreload'] : 'metadata';
$preload      = in_array( $preload_raw, array( 'none', 'metadata', 'auto' ), true ) ? $preload_raw : 'metadata';
$audio_title  = isset( $attributes['title'] ) ? trim( (string) $attributes['title'] ) : '';

// Resolve internal source from the WP media library.
$resolved_url  = $audio_url;
$resolved_mime = $audio_mime;
if ( 'internal' === $audio_source && $audio_id ) {
	$att_url = wp_get_attachment_url( $audio_id );
	if ( $att_url ) {
		$resolved_url = $att_url;
	}
	$att_mime = get_post_mime_type( $audio_id );
	if ( $att_mime && str_starts_with( $att_mime, 'audio/' ) ) {
		$resolved_mime = $att_mime;
	}
}

if ( '' === $resolved_url ) {
	echo '<!-- sgs/audio: no audio set -->';
	return;
}

// Auto-detect MIME from the URL extension when not set.
if ( '' === $resolved_mime ) {
	$ext           = strtolower( pathinfo( wp_parse_url( $resolved_url, PHP_URL_PATH ), PATHINFO_EXTENSION ) );
	$resolved_mime = match ( $ext ) {
		'mp3'  => 'audio/mpeg',
		'ogg'  => 'audio/ogg',
		'oga'  => 'audio/ogg',
		'wav'  => 'audio/wav',
		'm4a'  => 'audio/mp4',
		'aac'  => 'audio/aac',
		'flac' => 'audio/flac',
		default => 'audio/mpeg',
	};
}

// Brand colours — default to theme tokens; operator overrides win. Resolve to a
// CSS value (custom property or literal) so the visualiser draws in the client's brand.
$accent_raw          = isset( $attributes['accentColour'] ) ? (string) $attributes['accentColour'] : '';
$accent_gradient_raw = isset( $attributes['accentColourGradient'] ) ? (string) $attributes['accentColourGradient'] : '';
$spectrum_raw        = isset( $attributes['spectrumColour'] ) ? (string) $attributes['spectrumColour'] : '';
$accent_val          = '' !== $accent_raw ? sgs_colour_value( $accent_raw ) : 'var(--wp--preset--color--primary, #c9821f)';
$spectrum_val        = '' !== $spectrum_raw ? sgs_colour_value( $spectrum_raw ) : 'var(--wp--preset--color--secondary, #1c9a93)';
// accentColourGradient (2026-09-06, colour-conformance closeout) — a SEPARATE
// custom property, --sgs-audio-accent-gradient, consumed ONLY by the 3
// genuine solid-fill background-image siblings added in style.css (play
// button / seek-thumb webkit+moz). --sgs-audio-accent itself is untouched, so
// the composed progress-track/glow gradients, the focus outline, and view.js's
// canvas fillStyle / SVG stroke reads of --sgs-audio-accent all keep resolving
// the flat value exactly as before (see block.json's accent element _note).
$accent_gradient_val = sgs_css_gradient_value( $accent_gradient_raw );

// Border (Block Customisation Standard — wrapper-level border control).
// Box-object interface contract §1/§2: borderWidth is an SGS custom OBJECT
// attr { top, right, bottom, left }, no tiers. Colour resolution (flat vs
// gradient, base + hover) is delegated to the shared sgs_border_states_css()
// helper (helpers-colour-variants.php) — the ONLY one of the four colour
// helpers that returns finished CSS unconditionally, per CLAUDE.md's
// precedent-function registry.
$border_style_raw = isset( $attributes['borderStyle'] ) ? sgs_css_keyword_sanitise( $attributes['borderStyle'] ) : 'solid';
$border_width_obj = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top = sgs_css_length_value( $border_width_obj['top'] ?? '' );
$border_width_rgt = sgs_css_length_value( $border_width_obj['right'] ?? '' );
$border_width_bot = sgs_css_length_value( $border_width_obj['bottom'] ?? '' );
$border_width_lft = sgs_css_length_value( $border_width_obj['left'] ?? '' );
$has_border_width = ( '' !== $border_width_top || '' !== $border_width_rgt || '' !== $border_width_bot || '' !== $border_width_lft );

// A no-controls audio with no autoplay is unreachable — force controls unless autoplay is on.
$show_native_controls = ( $controls || ! $autoplay );

// Bool attrs for the native <audio> (the no-JS surface).
$audio_bool  = '';
$audio_bool .= $show_native_controls ? ' controls' : '';
$audio_bool .= $loop ? ' loop' : '';
$audio_bool .= $autoplay ? ' autoplay' : '';

$aria_label = '' !== $audio_title ? $audio_title : __( 'Audio player', 'sgs-blocks' );

// Schema.org AudioObject (structured data — SEO + AI-search citation). Emitted as
// inline JSON-LD; JSON_HEX_TAG/AMP make it safe inside a <script> tag.
$schema = array(
	'@context'       => 'https://schema.org',
	'@type'          => 'AudioObject',
	'contentUrl'     => $resolved_url,
	'encodingFormat' => $resolved_mime,
);
if ( '' !== $audio_title ) {
	$schema['name'] = $audio_title;
}
$schema_json = wp_json_encode( $schema, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_SLASHES );

// ---------------------------------------------------------------------------
// NO-INLINE: this block emits zero inline style property declarations.
// Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
// margin/padding come from WP-native style.spacing + SGS custom tier object
// attrs, all emitted into a scoped `.{uid}` <style> tag. uid is a CLASS
// (mirrors sgs/label/sgs/heading/sgs/container).
// ---------------------------------------------------------------------------

$uid      = 'sgs-au-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-audio';

$base_padding_obj = array();
if ( ! empty( $sgs_tor_padding_desktop ) ) {
	foreach ( $sgs_tor_padding_desktop as $padding_side => $padding_value ) {
		if ( is_string( $padding_value ) && '' !== $padding_value ) {
			$base_padding_obj[ $padding_side ] = $padding_value;
		}
	}
}
$base_margin_obj = array();
if ( ! empty( $sgs_tor_margin_desktop ) ) {
	foreach ( $sgs_tor_margin_desktop as $margin_side => $margin_value ) {
		if ( is_string( $margin_value ) && '' !== $margin_value ) {
			$base_margin_obj[ $margin_side ] = $margin_value;
		}
	}
}

$padding_tablet_obj = is_array( $sgs_tor_padding_tiers['tablet'] ?? null ) ? $sgs_tor_padding_tiers['tablet'] : array();
$padding_mobile_obj = is_array( $sgs_tor_padding_tiers['mobile'] ?? null ) ? $sgs_tor_padding_tiers['mobile'] : array();
$margin_tablet_obj  = is_array( $sgs_tor_margin_tiers['tablet'] ?? null ) ? $sgs_tor_margin_tiers['tablet'] : array();
$margin_mobile_obj  = is_array( $sgs_tor_margin_tiers['mobile'] ?? null ) ? $sgs_tor_margin_tiers['mobile'] : array();

$scoped_css = array();

// --- Base padding + margin (WP-native style.spacing, skip-serialised) —
// emitted scoped via the stable core style engine. ---

$base_spacing = array();
if ( ! empty( $base_padding_obj ) ) {
	$base_spacing['padding'] = $base_padding_obj;
}
if ( ! empty( $base_margin_obj ) ) {
	$base_spacing['margin'] = $base_margin_obj;
}
if ( ! empty( $base_spacing ) ) {
	$base_scoped_styles = wp_style_engine_get_styles(
		array( 'spacing' => $base_spacing ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $base_scoped_styles['css'] ) ) {
		$scoped_css[] = $base_scoped_styles['css'];
	}
}

// --- Responsive tiers — box objects, hand-built shorthand, scoped @media on
// the SAME selector (contract §B2: tablet max-width:1023px, mobile max-width:767px). ---
$padding_tab_val = sgs_box_object_shorthand( $padding_tablet_obj );
$padding_mob_val = sgs_box_object_shorthand( $padding_mobile_obj );
$margin_tab_val  = sgs_box_object_shorthand( $margin_tablet_obj );
$margin_mob_val  = sgs_box_object_shorthand( $margin_mobile_obj );

$tablet_decls = array();
if ( null !== $padding_tab_val ) {
	$tablet_decls[] = "padding:{$padding_tab_val}";
}
if ( null !== $margin_tab_val ) {
	$tablet_decls[] = "margin:{$margin_tab_val}";
}
if ( $tablet_decls ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{" . implode( ';', $tablet_decls ) . ';}}';
}

$mobile_decls = array();
if ( null !== $padding_mob_val ) {
	$mobile_decls[] = "padding:{$padding_mob_val}";
}
if ( null !== $margin_mob_val ) {
	$mobile_decls[] = "margin:{$margin_mob_val}";
}
if ( $mobile_decls ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{" . implode( ';', $mobile_decls ) . ';}}';
}

// --- Brand accent/spectrum custom properties (FR-32-4 as amended D345:
// inline `--var` is FORBIDDEN, not just real property declarations) — moved
// from the wrapper's `style` attribute into the SAME scoped <style> rule as
// the padding/margin above. view.js/CSS read these via getComputedStyle(),
// which resolves the cascade identically whether the var comes from an
// inline attribute or a stylesheet rule, so no runtime behaviour changes. ---
$accent_gradient_decl = '' !== $accent_gradient_val ? '--sgs-audio-accent-gradient:' . esc_attr( $accent_gradient_val ) . ';' : '';
$scoped_css[]         = "{$root_sel}{--sgs-audio-accent:" . esc_attr( $accent_val ) . ';--sgs-audio-spectrum:' . esc_attr( $spectrum_val ) . ';' . $accent_gradient_decl . '}';

// --- Border — width/style on the wrapper (base decls), colour (flat or
// gradient, base + hover) via the shared sgs_border_states_css() helper,
// radius via the shared sgs_border_radius_tiers() + core style engine
// (base) plus hand-built shorthand tiers (tablet/mobile), mirroring
// sgs/button + sgs/quote. ---
$border_base_decls = array();
if ( $has_border_width ) {
	$bwt                 = '' !== $border_width_top ? $border_width_top : '0';
	$bwr                 = '' !== $border_width_rgt ? $border_width_rgt : '0';
	$bwb                 = '' !== $border_width_bot ? $border_width_bot : '0';
	$bwl                 = '' !== $border_width_lft ? $border_width_lft : '0';
	$border_base_decls[] = "border-width:{$bwt} {$bwr} {$bwb} {$bwl}";
	if ( $border_style_raw && 'solid' !== $border_style_raw ) {
		$border_base_decls[] = 'border-style:' . $border_style_raw;
	}
}
if ( $border_base_decls ) {
	$scoped_css[] = "{$root_sel}{" . implode( ';', $border_base_decls ) . ';}';
}

$border_colour_css = sgs_border_states_css(
	$root_sel,
	$attributes,
	array(
		'base'           => 'borderColour',
		'hover'          => 'borderColourHover',
		'gradient'       => 'borderColourGradient',
		'hover_gradient' => 'borderColourHoverGradient',
		'width'          => $has_border_width && '' !== $border_width_top ? $border_width_top : '1px',
	)
);
if ( '' !== $border_colour_css ) {
	$scoped_css[] = $border_colour_css;
}

$border_radius_tiers      = sgs_border_radius_tiers( $attributes, $attributes['borderRadiusTablet'] ?? null, $attributes['borderRadiusMobile'] ?? null );
$border_radius_base       = $border_radius_tiers['base'];
$border_radius_tablet_obj = $border_radius_tiers['tablet'];
$border_radius_mobile_obj = $border_radius_tiers['mobile'];
if ( null !== $border_radius_base ) {
	$border_radius_scoped = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_base ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_scoped['css'] ) ) {
		$scoped_css[] = $border_radius_scoped['css'];
	}
}
$border_radius_tab_val = sgs_corner_object_shorthand( $border_radius_tablet_obj );
$border_radius_mob_val = sgs_corner_object_shorthand( $border_radius_mobile_obj );
if ( null !== $border_radius_tab_val ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{border-radius:{$border_radius_tab_val};}}";
}
if ( null !== $border_radius_mob_val ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{border-radius:{$border_radius_mob_val};}}";
}

// Wrapper: SGS-BEM root + uid + style modifier + data hooks. Zero inline
// `style` — everything (spacing + brand vars) lives in the scoped <style>
// tag above (contract §A / FR-32-4).
$wrapper_classes = array(
	'sgs-audio',
	'sgs-audio--' . sanitize_html_class( $player_style ),
	$uid,
);
$wrapper_attrs   = get_block_wrapper_attributes(
	array(
		'class'                     => implode( ' ', $wrapper_classes ),
		'data-player-style'         => $player_style,
		'data-reactive-sensitivity' => $reactive_sensitivity,
		'data-loop'                 => $loop ? '1' : '0',
		'data-autoplay'             => $autoplay ? '1' : '0',
	)
);
?>
<?php if ( $scoped_css ) : ?>
<style><?php echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised via sgs_css_length_value() / wp_style_engine_get_styles; wp_strip_all_tags guards </style> breakout. ?></style>
<?php endif; ?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() escapes internally. ?>>
	<?php if ( $schema_json ) : ?>
		<script type="application/ld+json"><?php echo $schema_json; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_json_encode with JSON_HEX_TAG|JSON_HEX_AMP is script-safe JSON-LD. ?></script>
	<?php endif; ?>
	<?php if ( '' !== $audio_title && 'hidden' !== $player_style ) : ?>
		<p class="sgs-audio__title"><?php echo esc_html( $audio_title ); ?></p>
	<?php endif; ?>
	<audio
		class="sgs-audio__native"
		src="<?php echo esc_url( $resolved_url ); ?>"
		<?php echo $audio_bool; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static boolean attribute keywords assembled above. ?>
		preload="<?php echo esc_attr( $preload ); ?>"
		aria-label="<?php echo esc_attr( $aria_label ); ?>"
		data-mime="<?php echo esc_attr( $resolved_mime ); ?>"
	>
		<source src="<?php echo esc_url( $resolved_url ); ?>" type="<?php echo esc_attr( $resolved_mime ); ?>" />
		<?php echo esc_html__( 'Your browser does not support the audio element.', 'sgs-blocks' ); ?>
	</audio>
	<?php if ( 'hidden' !== $player_style ) : ?>
		<div class="sgs-audio__viz" aria-hidden="true"></div>
	<?php endif; ?>
</div>
<?php
