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

// ---------------------------------------------------------------------------
// Security sanitiser (contract §D) — a CSS-length sanitiser for box/side
// values (mirrors sgs/label + sgs/heading + sgs/container).
// ---------------------------------------------------------------------------

$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

$allowed_styles = array( 'minimal', 'waveform', 'spectrum', 'radial', 'oscilloscope', 'gradient-pulse', 'hidden' );
$player_style   = $attributes['playerStyle'] ?? 'minimal';
$player_style   = in_array( $player_style, $allowed_styles, true ) ? $player_style : 'minimal';

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
$accent_raw   = isset( $attributes['accentColour'] ) ? (string) $attributes['accentColour'] : '';
$spectrum_raw = isset( $attributes['spectrumColour'] ) ? (string) $attributes['spectrumColour'] : '';
$accent_val   = '' !== $accent_raw ? sgs_colour_value( $accent_raw ) : 'var(--wp--preset--color--primary, #c9821f)';
$spectrum_val = '' !== $spectrum_raw ? sgs_colour_value( $spectrum_raw ) : 'var(--wp--preset--color--secondary, #1c9a93)';

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
// No-inline spacing (contract §A/§B): margin/padding come from WP-native
// style.spacing (skip-serialised in block.json so get_block_wrapper_attributes()
// never auto-inlines them) + SGS custom tier object attrs, all emitted into a
// scoped `.{uid}` <style> tag — never inline. uid is a CLASS (mirrors
// sgs/label/sgs/heading/sgs/container).
// ---------------------------------------------------------------------------

$uid      = 'sgs-au-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-audio';

$base_padding_obj = array();
if ( isset( $attributes['style']['spacing']['padding'] ) && is_array( $attributes['style']['spacing']['padding'] ) ) {
	foreach ( $attributes['style']['spacing']['padding'] as $padding_side => $padding_value ) {
		if ( is_string( $padding_value ) && '' !== $padding_value ) {
			$base_padding_obj[ $padding_side ] = $padding_value;
		}
	}
}
$base_margin_obj = array();
if ( isset( $attributes['style']['spacing']['margin'] ) && is_array( $attributes['style']['spacing']['margin'] ) ) {
	foreach ( $attributes['style']['spacing']['margin'] as $margin_side => $margin_value ) {
		if ( is_string( $margin_value ) && '' !== $margin_value ) {
			$base_margin_obj[ $margin_side ] = $margin_value;
		}
	}
}

$padding_tablet_obj = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
$padding_mobile_obj = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();
$margin_tablet_obj  = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj  = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();

$sgs_box_shorthand = static function ( array $box ) use ( $sgs_css_length ) {
	$top    = $sgs_css_length( $box['top'] ?? '' );
	$right  = $sgs_css_length( $box['right'] ?? '' );
	$bottom = $sgs_css_length( $box['bottom'] ?? '' );
	$left   = $sgs_css_length( $box['left'] ?? '' );
	if ( '' === $top && '' === $right && '' === $bottom && '' === $left ) {
		return null;
	}
	return ( '' !== $top ? $top : '0' ) . ' ' . ( '' !== $right ? $right : '0' ) . ' ' . ( '' !== $bottom ? $bottom : '0' ) . ' ' . ( '' !== $left ? $left : '0' );
};

$scoped_css = array();

// --- Base padding + margin (WP-native style.spacing, skip-serialised) —
// emitted scoped via the stable core style engine. ---
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
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
}

// --- Responsive tiers — box objects, hand-built shorthand, scoped @media on
// the SAME selector (contract §B2: tablet max-width:1023px, mobile max-width:767px). ---
$padding_tab_val = $sgs_box_shorthand( $padding_tablet_obj );
$padding_mob_val = $sgs_box_shorthand( $padding_mobile_obj );
$margin_tab_val  = $sgs_box_shorthand( $margin_tablet_obj );
$margin_mob_val  = $sgs_box_shorthand( $margin_mobile_obj );

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
$scoped_css[] = "{$root_sel}{--sgs-audio-accent:" . esc_attr( $accent_val ) . ';--sgs-audio-spectrum:' . esc_attr( $spectrum_val ) . ';}';

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
		'class'             => implode( ' ', $wrapper_classes ),
		'data-player-style' => $player_style,
		'data-loop'         => $loop ? '1' : '0',
		'data-autoplay'     => $autoplay ? '1' : '0',
	)
);
?>
<?php if ( $scoped_css ) : ?>
<style><?php echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised via $sgs_css_length / wp_style_engine_get_styles; wp_strip_all_tags guards </style> breakout. ?></style>
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
