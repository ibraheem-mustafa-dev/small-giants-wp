<?php
/**
 * SGS Email Site Tokens — reads the site's design tokens as literal values an
 * email client can use (Spec 04, FR-04-EMAIL-STYLES).
 *
 * Email clients have no CSS variables, `clamp()` or `rem`, so every
 * `var(--wp--preset--...)`, `var(--wp--custom--...)` and `var:preset|x|y`
 * reference is resolved to its final value from the site's merged global
 * settings and styles, `rem` becomes px at 16, and a `clamp()` takes its
 * maximum. Every value is validated (colours, lengths, weights, font names)
 * before it can enter CSS; a value that fails is left out, and the caller keeps
 * WooCommerce's own value for it.
 *
 * {@see self::from_sources()} is pure (data in, tokens out) so it is tested
 * without WordPress; {@see self::current()} feeds it from the live site.
 *
 * @package SGS\Blocks\Mail
 */

namespace SGS\Blocks\Mail;

defined( 'ABSPATH' ) || exit;

/** Resolves the site's tokens into email-safe literal values. */
final class Sgs_Email_Site_Tokens {

	/** Minimum text contrast on the card (WCAG AA, normal text). */
	const MIN_CONTRAST = 4.5;

	/** Generic families a font stack may end with. */
	const GENERICS = array( 'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy' );

	/** Families an email client cannot use, dropped from every stack. */
	const UNSAFE_FAMILIES = array( 'system-ui', '-apple-system', 'blinkmacsystemfont', 'inherit', 'initial', 'ui-sans-serif', 'ui-serif', 'ui-monospace', 'ui-rounded' );

	/**
	 * The live site's tokens.
	 *
	 * @return array<string,mixed> See {@see self::from_sources()}.
	 */
	public static function current(): array {
		$settings  = \function_exists( 'wp_get_global_settings' ) ? \wp_get_global_settings() : array();
		$styles    = \function_exists( 'wp_get_global_styles' ) ? \wp_get_global_styles() : array();
		$sheet     = \function_exists( 'wp_get_global_stylesheet' ) ? (string) \wp_get_global_stylesheet( array( 'variables' ) ) : '';
		$theme_uri = \function_exists( 'get_theme_file_uri' ) ? (string) \get_theme_file_uri() : '';

		/**
		 * Filters the merged global settings the email tokens are read from.
		 *
		 * @param array<string,mixed> $settings Merged `settings`.
		 */
		$settings = \apply_filters( 'sgs_email_site_tokens_settings', \is_array( $settings ) ? $settings : array() );

		return self::from_sources(
			\is_array( $settings ) ? $settings : array(),
			\is_array( $styles ) ? $styles : array(),
			self::parse_variables( $sheet ),
			$theme_uri
		);
	}

	/**
	 * Turn a printed custom-property stylesheet into a name-to-value map.
	 *
	 * @param  string $css Output of `wp_get_global_stylesheet( array( 'variables' ) )`.
	 * @return array<string,string>
	 */
	public static function parse_variables( string $css ): array {
		$vars = array();
		if ( \preg_match_all( '/(--[A-Za-z0-9_-]+)\s*:\s*([^;}]+)\s*;/', $css, $found, PREG_SET_ORDER ) ) {
			foreach ( $found as $match ) {
				$vars[ $match[1] ] = \trim( $match[2] );
			}
		}
		return $vars;
	}

	/**
	 * Build the tokens from merged global settings, styles and variables.
	 *
	 * Keys that cannot be resolved are absent. Keys: `button` (array: bg, text,
	 * border_colour, border_width, radius, pad_v, pad_h, font_size, weight,
	 * line_height, shadow), `text`, `heading`, `link`, `muted`, `line`,
	 * `outer_bg`, `card_bg`, `body_font`, `heading_font`, `heading_weight`,
	 * `heading_line_height`, `faces` (list of family, src, weight, style),
	 * `card_radius`, `card_border_width`, `card_border_colour`, `card_border_style`,
	 * `line_style`, `image_radius`,
	 * `heading_align`, `panel_bg`.
	 *
	 * @param  array<string,mixed>  $settings  Merged `settings` (theme.json shape).
	 * @param  array<string,mixed>  $styles    Merged `styles`.
	 * @param  array<string,string> $vars      Custom property name to value.
	 * @param  string               $theme_uri Theme URL, no trailing slash needed.
	 * @return array<string,mixed>
	 */
	public static function from_sources( array $settings, array $styles, array $vars, string $theme_uri = '' ): array {
		$roles    = self::dig( $settings, 'custom.colourRoles' );
		$override = self::dig( $settings, 'custom.email' );
		$override = \is_array( $override ) ? $override : array();
		// A colour role (primary, text, surface, ...) is a colour preset too: it points at a palette slug or a literal.
		if ( \is_array( $roles ) ) {
			foreach ( $roles as $name => $target ) {
				$key = '--wp--preset--color--' . $name;
				if ( \is_string( $name ) && \is_string( $target ) && ! isset( $vars[ $key ] ) ) {
					$vars[ $key ] = $vars[ '--wp--preset--color--' . $target ] ?? $target;
				}
			}
		}
		$role = static function ( string $name ) use ( $roles, $vars ): ?string {
			if ( ! \is_array( $roles ) || ! isset( $roles[ $name ] ) || ! \is_string( $roles[ $name ] ) ) {
				return null;
			}
			$value = $roles[ $name ];
			if ( 1 === \preg_match( '/^[a-z0-9-]+$/i', $value ) && isset( $vars[ '--wp--preset--color--' . $value ] ) ) {
				$value = $vars[ '--wp--preset--color--' . $value ];
			}
			return self::colour( $value, $vars );
		};

		$tokens = array();

		$site_bg = self::colour( self::dig( $styles, 'color.background' ), $vars );
		$text    = self::colour( self::dig( $styles, 'color.text' ), $vars );
		$card    = self::colour( $override['cardBackground'] ?? null, $vars ) ?? $role( 'surface-alt' ) ?? $site_bg;
		$outer   = self::colour( $override['outerBackground'] ?? null, $vars ) ?? $site_bg;
		$ground  = $card ?? '#ffffff';

		if ( null !== $card ) {
			$tokens['card_bg'] = $card;
		}
		if ( null !== $outer ) {
			$tokens['outer_bg'] = $outer;
		}
		if ( null !== $text ) {
			$tokens['text'] = $text;
		}

		// Heading, link and muted colours: the site's own when readable on the card, else the text colour.
		$heading = self::colour( self::dig( $styles, 'elements.heading.color.text' ), $vars ) ?? $role( 'heading' );
		$link    = self::colour( self::dig( $styles, 'elements.link.color.text' ), $vars ) ?? $role( 'link' );
		$muted   = $role( 'text-muted' );
		foreach ( array(
			'heading' => $heading,
			'link'    => $link,
			'muted'   => $muted,
		) as $key => $colour ) {
			if ( null !== $colour && self::contrast_ratio( $colour, $ground ) >= self::MIN_CONTRAST ) {
				$tokens[ $key ] = $colour;
			} elseif ( null !== $text ) {
				$tokens[ $key ] = $text;
			}
		}

		$line = self::colour( $override['lineColour'] ?? null, $vars ) ?? $role( 'border-light' );
		if ( null === $line && null !== $text ) {
			$line = self::mix( $text, $ground, 0.2 );
		}
		if ( null !== $line ) {
			$tokens['line'] = $line;
		}
		$style                       = $override['lineStyle'] ?? '';
		$tokens['line_style']        = 'dashed' === $style ? 'dashed' : 'solid';
		$tokens['card_radius']       = self::length( $override['cardRadius'] ?? null, $vars )
			?? self::length( self::dig( $settings, 'custom.borderRadius.medium' ), $vars )
			?? '8px';
		$tokens['card_border_width'] = self::length( $override['cardBorderWidth'] ?? null, $vars ) ?? '1px';
		// The card's own edge may differ from the rules inside it (a dark solid outline around dashed rules).
		$card_border = self::colour( $override['cardBorderColour'] ?? null, $vars );
		if ( null !== $card_border ) {
			$tokens['card_border_colour'] = $card_border;
		}
		$card_border_style = $override['cardBorderStyle'] ?? '';
		if ( 'solid' === $card_border_style || 'dashed' === $card_border_style ) {
			$tokens['card_border_style'] = $card_border_style;
		}

		$image_radius = self::length( $override['imageRadius'] ?? null, $vars ) ?? self::length( self::dig( $settings, 'custom.borderRadius.small' ), $vars );
		if ( null !== $image_radius ) {
			$tokens['image_radius'] = $image_radius;
		}
		$align = $override['headingAlign'] ?? '';
		if ( 'left' === $align || 'center' === $align ) {
			$tokens['heading_align'] = $align;
		}
		$panel = self::colour( $override['panelBackground'] ?? null, $vars );
		if ( null !== $panel ) {
			$tokens['panel_bg'] = $panel;
		}

		// Fonts.
		$body_font = self::font_stack( self::dig( $styles, 'typography.fontFamily' ), $vars );
		$head_font = self::font_stack( self::dig( $styles, 'elements.heading.typography.fontFamily' ), $vars ) ?? $body_font;
		if ( null !== $body_font ) {
			$tokens['body_font'] = $body_font;
		}
		if ( null !== $head_font ) {
			$tokens['heading_font'] = $head_font;
		}
		$weight = self::weight( self::dig( $styles, 'elements.heading.typography.fontWeight' ), $vars );
		if ( null !== $weight ) {
			$tokens['heading_weight'] = $weight;
		}
		$height = self::line_height( self::dig( $styles, 'elements.heading.typography.lineHeight' ), $vars );
		if ( null !== $height ) {
			$tokens['heading_line_height'] = $height;
		}
		$tokens['faces'] = self::font_faces( $settings, array_filter( array( $body_font, $head_font ) ), $theme_uri );

		$button = self::button( $settings, $styles, $vars );
		if ( null !== $button ) {
			$tokens['button'] = $button;
		}

		return $tokens;
	}

	/**
	 * The button token set: the primary button preset, then the site's button element.
	 *
	 * @param  array<string,mixed>  $settings Settings.
	 * @param  array<string,mixed>  $styles   Styles.
	 * @param  array<string,string> $vars     Custom properties.
	 * @return array<string,mixed>|null Null when no button background resolves.
	 */
	private static function button( array $settings, array $styles, array $vars ): ?array {
		$preset = self::dig( $settings, 'custom.buttonPresets.primary' );
		$preset = \is_array( $preset ) ? $preset : array();
		$el     = self::dig( $styles, 'elements.button' );
		$el     = \is_array( $el ) ? $el : array();

		$bg = self::colour( $preset['background'] ?? null, $vars ) ?? self::colour( self::dig( $el, 'color.background' ), $vars );
		if ( null === $bg ) {
			return null;
		}
		$text = self::colour( $preset['text'] ?? null, $vars ) ?? self::colour( self::dig( $el, 'color.text' ), $vars );
		if ( null === $text || self::contrast_ratio( $text, $bg ) < self::MIN_CONTRAST ) {
			$text = self::readable_on( $bg );
		}

		$font_size = self::length( $preset['font-size'] ?? null, $vars ) ?? self::length( self::dig( $el, 'typography.fontSize' ), $vars ) ?? '16px';
		$weight    = self::weight( $preset['font-weight'] ?? null, $vars ) ?? self::weight( self::dig( $el, 'typography.fontWeight' ), $vars ) ?? '700';
		$bw        = self::length( $preset['border-width'] ?? null, $vars ) ?? self::length( self::dig( $el, 'border.width' ), $vars );
		$bc        = self::colour( $preset['border'] ?? null, $vars ) ?? self::colour( self::dig( $el, 'border.color' ), $vars );
		$radius    = self::length( $preset['border-radius'] ?? null, $vars ) ?? self::length( self::dig( $el, 'border.radius' ), $vars ) ?? '4px';

		$pad = self::box( $preset['padding'] ?? null, $vars );
		if ( null === $pad ) {
			$spacing = self::dig( $el, 'spacing.padding' );
			if ( \is_array( $spacing ) ) {
				$pad = array(
					self::px( self::length( $spacing['top'] ?? null, $vars ) ),
					self::px( self::length( $spacing['right'] ?? null, $vars ) ),
					self::px( self::length( $spacing['bottom'] ?? null, $vars ) ),
					self::px( self::length( $spacing['left'] ?? null, $vars ) ),
				);
			}
		}
		$pad = $pad ?? array( 16, 32, 16, 32 );

		// A link has no min-height in every client: turn it into vertical padding around a set line height.
		$size        = self::px( $font_size );
		$line_height = (int) \round( $size * 1.25 );
		$border_px   = ( null !== $bc && null !== $bw ) ? self::px( $bw ) : 0;
		$min_height  = self::px( self::length( $preset['min-height'] ?? null, $vars ) );
		$pad_v       = \max( $pad[0], $pad[2] );
		if ( $min_height > 0 ) {
			$pad_v = \max( $pad_v, (int) \ceil( ( $min_height - $line_height - 2 * $border_px ) / 2 ) );
		}

		$out = array(
			'bg'          => $bg,
			'text'        => $text,
			'radius'      => $radius,
			'pad_v'       => $pad_v,
			'pad_h'       => \max( $pad[1], $pad[3] ),
			'font_size'   => $font_size,
			'weight'      => $weight,
			'line_height' => $line_height,
		);
		if ( null !== $bc && null !== $bw ) {
			$out['border_colour'] = $bc;
			$out['border_width']  = $bw;
		}
		$shadow = self::shadow( $preset['shadow'] ?? null, $vars );
		if ( null !== $shadow ) {
			$out['shadow'] = $shadow;
		}
		return $out;
	}

	/**
	 * `@font-face` sources for the families a stack names, from the site's font settings.
	 *
	 * @param  array<string,mixed> $settings  Settings.
	 * @param  array<int,string>   $stacks    Resolved font stacks in use.
	 * @param  string              $theme_uri Theme URL for `file:./` sources.
	 * @return array<int,array{family:string,src:string,weight:string,style:string}>
	 */
	private static function font_faces( array $settings, array $stacks, string $theme_uri ): array {
		$wanted = array();
		foreach ( $stacks as $stack ) {
			$first = \trim( (string) \strtok( $stack, ',' ), " \"'" );
			if ( '' !== $first ) {
				$wanted[ \strtolower( $first ) ] = true;
			}
		}
		$families = self::dig( $settings, 'typography.fontFamilies' );
		if ( ! \is_array( $families ) || array() === $wanted ) {
			return array();
		}
		// Presets arrive flat or keyed by origin (theme, custom, default).
		$flat = array();
		foreach ( $families as $key => $entry ) {
			if ( ! \is_array( $entry ) ) {
				continue;
			}
			if ( isset( $entry['fontFamily'] ) || isset( $entry['fontFace'] ) ) {
				$flat[] = $entry;
			} elseif ( \is_string( $key ) ) {
				foreach ( $entry as $inner ) {
					if ( \is_array( $inner ) ) {
						$flat[] = $inner;
					}
				}
			}
		}
		$faces = array();
		$seen  = array();
		foreach ( $flat as $entry ) {
			foreach ( (array) ( $entry['fontFace'] ?? array() ) as $face ) {
				if ( ! \is_array( $face ) ) {
					continue;
				}
				$name = self::font_name( (string) ( $face['fontFamily'] ?? '' ) );
				$src  = \is_array( $face['src'] ?? null ) ? (string) \reset( $face['src'] ) : (string) ( $face['src'] ?? '' );
				$url  = self::font_url( $src, $theme_uri );
				if ( '' === $name || null === $url || ! isset( $wanted[ \strtolower( $name ) ] ) ) {
					continue;
				}
				$weight = (string) ( $face['fontWeight'] ?? '400' );
				$weight = 1 === \preg_match( '/^[1-9]00( [1-9]00)?$/', $weight ) ? $weight : '400';
				$style  = 'italic' === ( $face['fontStyle'] ?? '' ) ? 'italic' : 'normal';
				$id     = $name . $weight . $style . $url;
				if ( isset( $seen[ $id ] ) ) {
					continue;
				}
				$seen[ $id ] = true;
				$faces[]     = array(
					'family' => $name,
					'src'    => $url,
					'weight' => $weight,
					'style'  => $style,
				);
			}
		}
		return $faces;
	}

	/**
	 * An absolute font file URL, or null when the source is not a woff/woff2 file.
	 *
	 * @param  string $src       Source: `file:./path` or an https URL.
	 * @param  string $theme_uri Theme URL.
	 * @return string|null
	 */
	private static function font_url( string $src, string $theme_uri ): ?string {
		$src = \trim( $src );
		if ( 0 === \strpos( $src, 'file:./' ) ) {
			$path = \substr( $src, 7 );
			if ( '' === $theme_uri || false !== \strpos( $path, '..' ) || 1 !== \preg_match( '#^[A-Za-z0-9_./-]+\.woff2?$#', $path ) ) {
				return null;
			}
			return \rtrim( $theme_uri, '/' ) . '/' . $path;
		}
		if ( 1 === \preg_match( '#^https://[A-Za-z0-9._~:/?\#@!$&+=%-]+\.woff2?$#', $src ) ) {
			return $src;
		}
		return null;
	}

	/**
	 * Read a dotted path from nested arrays.
	 *
	 * @param  mixed  $data Array to read.
	 * @param  string $path Dotted path.
	 * @return mixed Null when absent.
	 */
	private static function dig( $data, string $path ) {
		foreach ( \explode( '.', $path ) as $key ) {
			if ( ! \is_array( $data ) || ! \array_key_exists( $key, $data ) ) {
				return null;
			}
			$data = $data[ $key ];
		}
		return $data;
	}

	/**
	 * Resolve a raw token to a final literal string: references followed, `rem` to px, `clamp()` to its maximum.
	 *
	 * @param  mixed                $raw  Raw value.
	 * @param  array<string,string> $vars Custom properties.
	 * @return string|null Null when a reference cannot be resolved.
	 */
	public static function resolve( $raw, array $vars ): ?string {
		if ( \is_int( $raw ) || \is_float( $raw ) ) {
			$raw = (string) $raw;
		}
		if ( ! \is_string( $raw ) ) {
			return null;
		}
		$value = \trim( $raw );
		if ( '' === $value ) {
			return null;
		}
		if ( 1 === \preg_match( '/^var:((?:preset|custom)\|.+)$/', $value, $match ) ) {
			$parts = \array_map(
				static function ( string $part ): string {
					return \strtolower( (string) \preg_replace( '/([a-z0-9])([A-Z])/', '$1-$2', $part ) );
				},
				\explode( '|', $match[1] )
			);
			$value = 'var(--wp--' . \implode( '--', $parts ) . ')';
		}
		for ( $i = 0; $i < 10; $i++ ) {
			if ( false === \strpos( $value, 'var(' ) ) {
				break;
			}
			$value = (string) \preg_replace_callback(
				'/var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,\s*([^()]*?))?\s*\)/',
				static function ( array $m ) use ( $vars ): string {
					if ( isset( $vars[ $m[1] ] ) ) {
						return $vars[ $m[1] ];
					}
					return isset( $m[2] ) && '' !== $m[2] ? $m[2] : '__UNRESOLVED__';
				},
				$value
			);
		}
		if ( false !== \strpos( $value, 'var(' ) || false !== \strpos( $value, '__UNRESOLVED__' ) ) {
			return null;
		}
		if ( 1 === \preg_match( '/^clamp\((.*)\)$/is', $value, $match ) ) {
			$args  = \array_map( 'trim', \explode( ',', $match[1] ) );
			$value = null;
			foreach ( array( 2, 0 ) as $index ) {
				if ( isset( $args[ $index ] ) && 1 === \preg_match( '/^-?\d*\.?\d+(px|rem)?$/', $args[ $index ] ) ) {
					$value = $args[ $index ];
					break;
				}
			}
			if ( null === $value ) {
				return null;
			}
		}
		$value = (string) \preg_replace_callback(
			'/(-?\d*\.?\d+)rem\b/',
			static function ( array $m ): string {
				return self::trim_number( (float) $m[1] * 16 ) . 'px';
			},
			$value
		);
		return $value;
	}

	/**
	 * A validated colour as lowercase `#rrggbb`, or null.
	 *
	 * @param  mixed                $raw  Raw value.
	 * @param  array<string,string> $vars Custom properties.
	 * @return string|null
	 */
	public static function colour( $raw, array $vars ): ?string {
		$value = self::resolve( $raw, $vars );
		if ( null === $value ) {
			return null;
		}
		if ( 1 === \preg_match( '/^#([0-9a-f]{3})$/i', $value, $m ) ) {
			return '#' . \strtolower( $m[1][0] . $m[1][0] . $m[1][1] . $m[1][1] . $m[1][2] . $m[1][2] );
		}
		if ( 1 === \preg_match( '/^#([0-9a-f]{6})(ff)?$/i', $value, $m ) ) {
			return '#' . \strtolower( $m[1] );
		}
		if ( 1 === \preg_match( '/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(1|1\.0+)\s*)?\)$/i', $value, $m ) ) {
			if ( (int) $m[1] > 255 || (int) $m[2] > 255 || (int) $m[3] > 255 ) {
				return null;
			}
			return \sprintf( '#%02x%02x%02x', $m[1], $m[2], $m[3] );
		}
		return null;
	}

	/**
	 * A validated length as `Npx` (or `0`), or null.
	 *
	 * @param  mixed                $raw  Raw value.
	 * @param  array<string,string> $vars Custom properties.
	 * @return string|null
	 */
	public static function length( $raw, array $vars ): ?string {
		$value = self::resolve( $raw, $vars );
		if ( null === $value || 1 !== \preg_match( '/^(\d+(?:\.\d+)?)(?:px)?$/', $value, $m ) || (float) $m[1] > 1000 ) {
			return null;
		}
		return 0.0 === (float) $m[1] ? '0' : self::trim_number( (float) $m[1] ) . 'px';
	}

	/**
	 * Whole pixels from a validated length string (0 for null).
	 *
	 * @param  string|null $length Output of {@see self::length()}.
	 * @return int
	 */
	private static function px( ?string $length ): int {
		return null === $length ? 0 : (int) \round( (float) $length );
	}

	/**
	 * A one-to-four value padding as [top, right, bottom, left] pixels, or null.
	 *
	 * @param  mixed                $raw  Raw value.
	 * @param  array<string,string> $vars Custom properties.
	 * @return array<int,int>|null
	 */
	private static function box( $raw, array $vars ): ?array {
		$value = self::resolve( $raw, $vars );
		if ( null === $value ) {
			return null;
		}
		$parts = \preg_split( '/\s+/', $value );
		if ( false === $parts ) {
			return null;
		}
		if ( \count( $parts ) < 1 || \count( $parts ) > 4 ) {
			return null;
		}
		$px = array();
		foreach ( $parts as $part ) {
			$length = self::length( $part, $vars );
			if ( null === $length ) {
				return null;
			}
			$px[] = self::px( $length );
		}
		switch ( \count( $px ) ) {
			case 1:
				return array( $px[0], $px[0], $px[0], $px[0] );
			case 2:
				return array( $px[0], $px[1], $px[0], $px[1] );
			case 3:
				return array( $px[0], $px[1], $px[2], $px[1] );
			default:
				return array( $px[0], $px[1], $px[2], $px[3] );
		}
	}

	/**
	 * A validated hard shadow `Xpx Ypx [Bpx] #colour`, or null.
	 *
	 * @param  mixed                $raw  Raw value.
	 * @param  array<string,string> $vars Custom properties.
	 * @return string|null
	 */
	private static function shadow( $raw, array $vars ): ?string {
		$value = self::resolve( $raw, $vars );
		if ( null === $value || 1 !== \preg_match( '/^(-?\d+(?:\.\d+)?)(?:px)?\s+(-?\d+(?:\.\d+)?)(?:px)?\s+(?:(\d+(?:\.\d+)?)(?:px)?\s+)?(#[0-9a-f]{3}|#[0-9a-f]{6})$/i', $value, $m ) ) {
			return null;
		}
		$blur   = isset( $m[3] ) && '' !== $m[3] ? $m[3] : '0';
		$colour = self::colour( $m[4], $vars );
		if ( null === $colour ) {
			return null;
		}
		return self::trim_number( (float) $m[1] ) . 'px ' . self::trim_number( (float) $m[2] ) . 'px ' . self::trim_number( (float) $blur ) . 'px ' . $colour;
	}

	/**
	 * A validated font weight (100 to 900, normal or bold), or null.
	 *
	 * @param  mixed                $raw  Raw value.
	 * @param  array<string,string> $vars Custom properties.
	 * @return string|null
	 */
	public static function weight( $raw, array $vars ): ?string {
		$value = self::resolve( $raw, $vars );
		return ( null !== $value && 1 === \preg_match( '/^([1-9]00|normal|bold)$/', $value ) ) ? $value : null;
	}

	/**
	 * A validated line height (unitless, or a percentage), or null.
	 *
	 * @param  mixed                $raw  Raw value.
	 * @param  array<string,string> $vars Custom properties.
	 * @return string|null
	 */
	public static function line_height( $raw, array $vars ): ?string {
		$value = self::resolve( $raw, $vars );
		return ( null !== $value && 1 === \preg_match( '/^\d(?:\.\d+)?$|^\d{2,3}%$/', $value ) ) ? $value : null;
	}

	/**
	 * One font family name stripped to letters, digits, spaces and hyphens.
	 *
	 * @param  string $name Raw name.
	 * @return string
	 */
	private static function font_name( string $name ): string {
		return \trim( (string) \preg_replace( '/[^A-Za-z0-9 -]/', '', $name ) );
	}

	/**
	 * A validated font stack ending in a web-safe generic family, or null.
	 *
	 * Names are stripped of everything but letters, digits, spaces, quotes,
	 * commas and hyphens; families an email client cannot use are dropped.
	 *
	 * @param  mixed                $raw  Raw value.
	 * @param  array<string,string> $vars Custom properties.
	 * @return string|null
	 */
	public static function font_stack( $raw, array $vars ): ?string {
		$value = self::resolve( $raw, $vars );
		if ( null === $value ) {
			return null;
		}
		$value = (string) \preg_replace( '/[^A-Za-z0-9 ,\'"-]/', '', $value );
		$names = array();
		$serif = false;
		$sans  = false;
		foreach ( \explode( ',', $value ) as $part ) {
			$name  = self::font_name( $part );
			$lower = \strtolower( $name );
			if ( '' === $name || \in_array( $lower, self::UNSAFE_FAMILIES, true ) ) {
				continue;
			}
			if ( \in_array( $lower, self::GENERICS, true ) ) {
				$names[ $lower ] = $lower;
				continue;
			}
			if ( false !== \strpos( $lower, 'serif' ) && false === \strpos( $lower, 'sans' ) ) {
				$serif = true;
			}
			$names[ $lower ] = ( 1 === \preg_match( '/[ 0-9]/', $name ) ) ? '"' . $name . '"' : $name;
		}
		if ( array() === $names ) {
			return null;
		}
		$generic = null;
		foreach ( self::GENERICS as $candidate ) {
			if ( isset( $names[ $candidate ] ) ) {
				$generic = $candidate;
				unset( $names[ $candidate ] );
			}
		}
		if ( null === $generic ) {
			$generic = $serif ? 'serif' : 'sans-serif';
		}
		$sans = 'serif' !== $generic && 'monospace' !== $generic && 'cursive' !== $generic && 'fantasy' !== $generic;
		if ( $sans && ! isset( $names['helvetica'] ) && ! isset( $names['arial'] ) ) {
			$names['helvetica'] = 'Helvetica';
			$names['arial']     = 'Arial';
		}
		if ( 'serif' === $generic && ! isset( $names['georgia'] ) ) {
			$names['georgia'] = 'Georgia';
		}
		return \implode( ', ', $names ) . ', ' . $generic;
	}

	/**
	 * WCAG contrast ratio between two `#rrggbb` colours.
	 *
	 * @param  string $a First colour.
	 * @param  string $b Second colour.
	 * @return float
	 */
	public static function contrast_ratio( string $a, string $b ): float {
		$l1 = self::luminance( $a );
		$l2 = self::luminance( $b );
		return ( \max( $l1, $l2 ) + 0.05 ) / ( \min( $l1, $l2 ) + 0.05 );
	}

	/**
	 * WCAG relative luminance of a `#rrggbb` colour.
	 *
	 * @param  string $hex Colour.
	 * @return float
	 */
	private static function luminance( string $hex ): float {
		$rgb = \array_map(
			static function ( string $part ): float {
				$c = \hexdec( $part ) / 255;
				return $c <= 0.03928 ? $c / 12.92 : ( ( $c + 0.055 ) / 1.055 ) ** 2.4;
			},
			\str_split( \ltrim( $hex, '#' ), 2 )
		);
		return 0.2126 * $rgb[0] + 0.7152 * $rgb[1] + 0.0722 * $rgb[2];
	}

	/**
	 * Dark or white, whichever reads better on a background.
	 *
	 * @param  string $bg Background `#rrggbb`.
	 * @return string
	 */
	public static function readable_on( string $bg ): string {
		return self::contrast_ratio( '#202020', $bg ) >= self::contrast_ratio( '#ffffff', $bg ) ? '#202020' : '#ffffff';
	}

	/**
	 * A colour at a given opacity mixed onto a background, as a literal hex.
	 *
	 * @param  string $fg    Foreground `#rrggbb`.
	 * @param  string $bg    Background `#rrggbb`.
	 * @param  float  $alpha Foreground opacity, 0 to 1.
	 * @return string
	 */
	public static function mix( string $fg, string $bg, float $alpha ): string {
		$f   = \array_map( 'hexdec', \str_split( \ltrim( $fg, '#' ), 2 ) );
		$b   = \array_map( 'hexdec', \str_split( \ltrim( $bg, '#' ), 2 ) );
		$out = '#';
		for ( $i = 0; $i < 3; $i++ ) {
			$out .= \sprintf( '%02x', (int) \round( $f[ $i ] * $alpha + $b[ $i ] * ( 1 - $alpha ) ) );
		}
		return $out;
	}

	/**
	 * A number without trailing zeros.
	 *
	 * @param  float $number Number.
	 * @return string
	 */
	private static function trim_number( float $number ): string {
		return \rtrim( \rtrim( \number_format( $number, 2, '.', '' ), '0' ), '.' );
	}
}
