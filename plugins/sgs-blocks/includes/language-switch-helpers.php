<?php
/**
 * Label and language-tag helpers for sgs/language-switch.
 *
 * Every helper that needs PHP's `intl` extension (`Locale::canonicalize()`,
 * `Locale::getDisplayLanguage()`) takes an optional `$intl_available`
 * parameter. When omitted (null), the real `class_exists( 'Locale' )` check
 * runs. The standalone test at
 * `plugins/sgs-blocks/tests/php/run-language-switch-standalone.php` passes
 * `false` explicitly so the "intl unavailable" fallback path is exercised on
 * any machine, regardless of whether the extension is actually installed
 * there.
 *
 * Fallback chain when intl is unavailable (or resolves to nothing): the
 * operator's typed `customLabel`, then the upper-cased primary subtag of the
 * language code. Never an empty string.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_language_switch_intl_available' ) ) {
	/**
	 * Resolve whether the intl extension's Locale class should be treated as
	 * available for this call. `null` means "ask PHP for real"; a boolean
	 * lets a test force either branch regardless of the host's real intl
	 * install.
	 *
	 * @param bool|null $intl_available Injected override, or null.
	 * @return bool
	 */
	function sgs_language_switch_intl_available( $intl_available = null ) {
		if ( null === $intl_available ) {
			return class_exists( 'Locale' );
		}
		return (bool) $intl_available;
	}
}

if ( ! function_exists( 'sgs_language_switch_ucfirst' ) ) {
	/**
	 * Multibyte-safe "uppercase the first character only" — Locale::
	 * getDisplayLanguage() returns lower-case autonyms ("español"); the
	 * design calls for "Español".
	 *
	 * @param string $text Source text.
	 * @return string
	 */
	function sgs_language_switch_ucfirst( $text ) {
		$text = (string) $text;
		if ( '' === $text ) {
			return $text;
		}
		if ( function_exists( 'mb_substr' ) ) {
			return mb_strtoupper( mb_substr( $text, 0, 1 ), 'UTF-8' ) . mb_substr( $text, 1, null, 'UTF-8' );
		}
		return ucfirst( $text );
	}
}

if ( ! function_exists( 'sgs_language_switch_primary_subtag' ) ) {
	/**
	 * The primary language subtag of a BCP 47 / locale-ish code — "en" from
	 * "en_GB", "en-GB" or "en". Used both to build the upper-cased "code
	 * style" label and to match an item against the current site locale.
	 *
	 * @param string $code Raw language code as typed in the repeater.
	 * @return string Lower-case primary subtag, '' if $code is empty.
	 */
	function sgs_language_switch_primary_subtag( $code ) {
		$code = trim( (string) $code );
		if ( '' === $code ) {
			return '';
		}
		$code  = str_replace( '_', '-', $code );
		$parts = explode( '-', $code );
		return strtolower( $parts[0] );
	}
}

if ( ! function_exists( 'sgs_language_switch_code_label' ) ) {
	/**
	 * The "code style" visible label — the upper-cased primary subtag
	 * ("nl" -> "NL"). Never needs intl.
	 *
	 * @param string $code Raw language code.
	 * @return string
	 */
	function sgs_language_switch_code_label( $code ) {
		$subtag = sgs_language_switch_primary_subtag( $code );
		return '' !== $subtag ? strtoupper( $subtag ) : '';
	}
}

if ( ! function_exists( 'sgs_language_switch_bcp47' ) ) {
	/**
	 * The `hreflang`/`lang` tag for an item: `Locale::canonicalize( $code )`
	 * with underscores swapped for hyphens ("en_GB" -> "en-GB"). Falls back
	 * to a plain underscore-to-hyphen swap of the typed code when intl is
	 * unavailable or canonicalize() returns nothing usable.
	 *
	 * @param string    $code           Raw language code as typed in the repeater.
	 * @param bool|null $intl_available Injected override, or null for the real check.
	 * @return string BCP 47-ish tag, '' if $code is empty.
	 */
	function sgs_language_switch_bcp47( $code, $intl_available = null ) {
		$code = trim( (string) $code );
		if ( '' === $code ) {
			return '';
		}

		if ( sgs_language_switch_intl_available( $intl_available ) && class_exists( 'Locale' ) ) {
			$canonical = \Locale::canonicalize( $code );
			if ( is_string( $canonical ) && '' !== $canonical ) {
				return str_replace( '_', '-', $canonical );
			}
		}

		return str_replace( '_', '-', $code );
	}
}

if ( ! function_exists( 'sgs_language_switch_autonym_or_fallback' ) ) {
	/**
	 * The language's own name in itself ("es" -> "Español"), upper-cased on
	 * the first letter. Falls back to the operator's typed `customLabel`
	 * when set, else the upper-cased code, whenever intl is unavailable or
	 * `Locale::getDisplayLanguage()` resolves to nothing.
	 *
	 * NEGATIVE-CONTROL SURFACE: with `$intl_available` forced false this
	 * NEVER returns '' as long as either $custom_label or $code is non-empty
	 * — the standalone test's negative control breaks this guarantee on
	 * purpose (by forcing every fallback branch to return '') and asserts
	 * the test goes red.
	 *
	 * @param string    $code           Raw language code.
	 * @param string    $custom_label   Operator's typed custom label, '' if unset.
	 * @param bool|null $intl_available Injected override, or null for the real check.
	 * @return string
	 */
	function sgs_language_switch_autonym_or_fallback( $code, $custom_label = '', $intl_available = null ) {
		$code         = trim( (string) $code );
		$custom_label = trim( (string) $custom_label );

		if ( sgs_language_switch_intl_available( $intl_available ) && class_exists( 'Locale' ) && '' !== $code ) {
			$autonym = \Locale::getDisplayLanguage( $code, $code );
			if ( is_string( $autonym ) && '' !== trim( $autonym ) ) {
				return sgs_language_switch_ucfirst( trim( $autonym ) );
			}
		}

		if ( '' !== $custom_label ) {
			return $custom_label;
		}

		return sgs_language_switch_code_label( $code );
	}
}

if ( ! function_exists( 'sgs_language_switch_visible_label' ) ) {
	/**
	 * The visible link text for one item, per `labelStyle`.
	 *
	 * @param string    $code           Raw language code.
	 * @param string    $label_style    'autonym' | 'code' | 'custom'.
	 * @param string    $custom_label   Operator's typed custom label, '' if unset.
	 * @param bool|null $intl_available Injected override, or null for the real check.
	 * @return string
	 */
	function sgs_language_switch_visible_label( $code, $label_style, $custom_label = '', $intl_available = null ) {
		$custom_label = trim( (string) $custom_label );

		if ( 'custom' === $label_style ) {
			return '' !== $custom_label ? $custom_label : sgs_language_switch_code_label( $code );
		}

		if ( 'code' === $label_style ) {
			return sgs_language_switch_code_label( $code );
		}

		// 'autonym' (default).
		return sgs_language_switch_autonym_or_fallback( $code, $custom_label, $intl_available );
	}
}

if ( ! function_exists( 'sgs_language_switch_accessible_name' ) ) {
	/**
	 * The accessible name to expose via a visually-hidden span for a "code
	 * style" item, whose visible text ("NL") is not itself meaningful to a
	 * screen-reader user. Same fallback chain as the visible autonym label.
	 *
	 * @param string    $code           Raw language code.
	 * @param string    $custom_label   Operator's typed custom label, '' if unset.
	 * @param bool|null $intl_available Injected override, or null for the real check.
	 * @return string
	 */
	function sgs_language_switch_accessible_name( $code, $custom_label = '', $intl_available = null ) {
		return sgs_language_switch_autonym_or_fallback( $code, $custom_label, $intl_available );
	}
}

if ( ! function_exists( 'sgs_language_switch_item_html' ) ) {
	/**
	 * The `<a>` markup for one `languages` repeater item.
	 *
	 * `labelStyle === 'code'` prints the upper-cased code visibly but wraps
	 * it `aria-hidden`, paired with a `.sgs-sr-only` span carrying the real
	 * autonym as the link's accessible name (e.g. an "NL" link whose
	 * accessible name is "Nederlands").
	 *
	 * @param array     $item           {code, url, customLabel} repeater row.
	 * @param string    $label_style    'autonym' | 'code' | 'custom'.
	 * @param bool      $is_current     Whether this item matches the current site locale.
	 * @param bool|null $intl_available Injected override, or null for the real check.
	 * @return string HTML, '' when the item has no code.
	 */
	function sgs_language_switch_item_html( array $item, $label_style, $is_current, $intl_available = null ) {
		$code         = isset( $item['code'] ) ? trim( (string) $item['code'] ) : '';
		$url          = isset( $item['url'] ) ? (string) $item['url'] : '';
		$custom_label = isset( $item['customLabel'] ) ? (string) $item['customLabel'] : '';

		if ( '' === $code ) {
			return '';
		}

		$tag     = sgs_language_switch_bcp47( $code, $intl_available );
		$visible = sgs_language_switch_visible_label( $code, $label_style, $custom_label, $intl_available );
		if ( '' === $visible ) {
			$visible = sgs_language_switch_code_label( $code );
		}

		$href = '' !== $url ? esc_url( $url ) : '#';

		$attrs = ' href="' . $href . '"';
		if ( '' !== $tag ) {
			$attrs .= ' lang="' . esc_attr( $tag ) . '" hreflang="' . esc_attr( $tag ) . '"';
		}
		if ( $is_current ) {
			$attrs .= ' aria-current="true"';
		}

		if ( 'code' === $label_style ) {
			$accessible = sgs_language_switch_accessible_name( $code, $custom_label, $intl_available );
			if ( '' === $accessible ) {
				$accessible = $visible;
			}
			$inner = '<span class="sgs-sr-only">' . esc_html( $accessible ) . '</span>'
				. '<span aria-hidden="true">' . esc_html( $visible ) . '</span>';
		} else {
			$inner = esc_html( $visible );
		}

		return '<a class="sgs-language-switch__link"' . $attrs . '>' . $inner . '</a>';
	}
}

if ( ! function_exists( 'sgs_language_switch_is_current' ) ) {
	/**
	 * Whether an item's primary subtag matches the current site locale's
	 * primary subtag ("nl" from a `languages` item vs "nl_NL" from
	 * `get_locale()`).
	 *
	 * @param string $code           Raw language code.
	 * @param string $current_locale The value of `get_locale()` (or a stub in tests).
	 * @return bool
	 */
	function sgs_language_switch_is_current( $code, $current_locale ) {
		$item_subtag    = sgs_language_switch_primary_subtag( $code );
		$current_subtag = sgs_language_switch_primary_subtag( $current_locale );
		return '' !== $item_subtag && $item_subtag === $current_subtag;
	}
}
