<?php
/**
 * The built-in button migration's attribute rewrite: the one function the WP-CLI sweep of saved content
 * (scripts/sweep-builtin-button-attrs.php) and the look probe (tests/playwright/button-migration/probe.mjs) share.
 *
 * It reads scripts/data/builtin-button-renames.json, the map `check-styled-part-has-setting.py --fix` rewrites the code from, and
 * moves one block's saved attributes from the old names and shapes to the kit's: a rename (`addToCartBackgroundColour` to
 * `addToCartColourBackground`) and a reshape (`addToCartMinHeight` from "64px" to {desktop: "64px"}), by the map row's `value.kind`:
 *
 *   string-to-desktop-object   "64px" becomes {"desktop": "64px"}; an empty string becomes {} (cleared: a block default is not restored).
 *   number-to-desktop-object   15 becomes {"desktop": 15}; an empty value becomes {}. The unit stays unset, which the type rule reads as px.
 *   flat-box-to-desktop-object one box of sides or corners becomes {"desktop": box}; an empty box is left as it is.
 *   true-to-full               true becomes "full"; false is unset.
 *   fit-to-unset               "fit" is unset (the key is dropped); "full" stays. The CTA width choice's default was "fit", which printed
 *                              no width, and the kit prints "fit" as width:fit-content, so a saved "fit" would otherwise change the look.
 *   merge-tier-object          Two settings that painted one property on one element become one: the old value is folded into the new
 *                              setting per device and per side, the new setting's own values winning, and the old key is dropped
 *                              (scripts/data/account-empty-button-renames.json: sgs/account's empty orders button).
 *
 * Every step is idempotent: a value already in the new shape, or a name already renamed, is left alone, and when both the old and the new
 * name are saved the new one wins and the old is dropped (a `merge-tier-object` row folds the old into the new instead). Only the named
 * attributes of the named blocks change.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_builtin_button_sweep_map' ) ) {

	/**
	 * The map's rows, keyed by block name.
	 *
	 * @param string $file Path of the map; '' reads scripts/data/builtin-button-renames.json.
	 * @return array<string, array<int, array<string, mixed>>> Rows by block name (`sgs/buybox`).
	 */
	function sgs_builtin_button_sweep_map( string $file = '' ): array {
		$file = '' !== $file ? $file : dirname( __DIR__ ) . '/data/builtin-button-renames.json';
		$data = json_decode( (string) file_get_contents( $file ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- a local file in the plugin.
		$by   = array();
		foreach ( (array) ( $data['renames'] ?? array() ) as $row ) {
			$by[ (string) $row['block'] ][] = $row;
		}
		return $by;
	}
}

if ( ! function_exists( 'sgs_builtin_button_sweep_value' ) ) {

	/**
	 * One attribute value reshaped by a map row's `value.kind`.
	 *
	 * @param string $kind  The row's `value.kind`.
	 * @param mixed  $value The saved value.
	 * @return array{0: bool, 1: mixed} [keep, value]: `keep` false means the attribute is dropped (unset).
	 */
	function sgs_builtin_button_sweep_value( string $kind, $value ): array {
		$per_device = static function ( $v ): bool {
			return is_array( $v ) && ( isset( $v['desktop'] ) || isset( $v['tablet'] ) || isset( $v['mobile'] ) );
		};
		switch ( $kind ) {
			case 'string-to-desktop-object':
			case 'number-to-desktop-object':
				if ( is_array( $value ) ) {
					return array( true, $value );
				}
				if ( null === $value || '' === $value || ( is_string( $value ) && '' === trim( $value ) ) ) {
					// An explicit empty value is the author's "none" (it overrides the block's default), so it stays saved, as an empty object.
					return array( true, new stdClass() );
				}
				if ( 'number-to-desktop-object' === $kind && is_string( $value ) && is_numeric( $value ) ) {
					$value = $value + 0;
				}
				return array(
					true,
					array( 'desktop' => $value ),
				);
			case 'flat-box-to-desktop-object':
				if ( ! is_array( $value ) || array() === $value || $per_device( $value ) ) {
					return array( true, $value );
				}
				return array(
					true,
					array( 'desktop' => $value ),
				);
			case 'fit-to-unset':
				return 'fit' === $value || '' === $value || null === $value ? array( false, null ) : array( true, $value );
			case 'true-to-full':
				if ( 'full' === $value || 'fit' === $value ) {
					return array( true, $value );
				}
				return true === $value || 'true' === $value || 1 === $value ? array( true, 'full' ) : array( false, null );
		}
		return array( true, $value );
	}
}

if ( ! function_exists( 'sgs_builtin_button_sweep_same_attrs' ) ) {
	/**
	 * Whether a block's rewritten attributes equal the attributes parsed back from the written content.
	 *
	 * The parser decodes JSON into arrays, so the empty object a cleared value is written as (`{}`) reads back as an empty
	 * array: both sides are compared as arrays (an object becomes one), keys sorted at every level, values strictly.
	 *
	 * @param array $expect The rewrite of the old attributes.
	 * @param array $parsed The attributes parse_blocks() read from the written content.
	 * @return bool
	 */
	function sgs_builtin_button_sweep_same_attrs( array $expect, array $parsed ): bool {
		$canon = static function ( $v ) use ( &$canon ) {
			if ( is_object( $v ) ) {
				$v = (array) $v;
			}
			if ( ! is_array( $v ) ) {
				return $v;
			}
			ksort( $v );
			return array_map( $canon, $v );
		};
		// Compared as values, not as encoded JSON: json_encode fails on a stray byte, and two failures would compare equal.
		return $canon( $expect ) === $canon( $parsed );
	}
}

if ( ! function_exists( 'sgs_builtin_button_sweep_attrs' ) ) {

	/**
	 * One block's attributes moved from the old names and shapes to the kit's.
	 *
	 * @param string               $block Block name, for example `sgs/buybox`.
	 * @param array<string, mixed> $attrs Saved attributes.
	 * @param array                $map   The map from sgs_builtin_button_sweep_map(); empty reads the plugin's own.
	 * @return array<string, mixed> The attributes after the rewrite (equal to `$attrs` when nothing applies).
	 */
	function sgs_builtin_button_sweep_attrs( string $block, array $attrs, array $map = array() ): array {
		$map = array() === $map ? sgs_builtin_button_sweep_map() : $map;
		$out = $attrs;
		foreach ( $map[ $block ] ?? array() as $row ) {
			$old  = (string) $row['old'];
			$new  = (string) $row['new'];
			$kind = (string) ( $row['value']['kind'] ?? '' );
			if ( ! array_key_exists( $old, $out ) ) {
				continue;
			}
			$value = $out[ $old ];
			if ( '' !== $kind ) {
				list( $keep, $value ) = sgs_builtin_button_sweep_value( $kind, $value );
			} else {
				$keep = true;
			}
			if ( $old !== $new ) {
				unset( $out[ $old ] );
				if ( 'merge-tier-object' === $kind && array_key_exists( $new, $out ) && is_array( $out[ $new ] ) && is_array( $value ) ) {
					// Both settings were saved: each device and side the new one leaves unset keeps the old one's value, as the cascade painted it.
					$out[ $new ] = array_replace_recursive( $value, $out[ $new ] );
					continue;
				}
				if ( array_key_exists( $new, $out ) ) {
					continue; // The new name is already saved: it wins, the old one is dropped.
				}
			}
			if ( $keep ) {
				$out[ $new ] = $value;
			} else {
				unset( $out[ $new ] );
			}
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_builtin_button_sweep_content' ) ) {

	/**
	 * A post's saved content with the named blocks' delimiters rewritten. Only a block comment's JSON attributes change, and only for a
	 * delimiter that holds an old name or shape; every other byte of the content stays as it was.
	 *
	 * @param string   $content   `post_content`.
	 * @param string[] $blocks    Block names to rewrite (`sgs/buybox`).
	 * @param array    $map       The map; empty reads the plugin's own.
	 * @param callable $serialise Encodes a block's attributes as WordPress writes them in a delimiter (`serialize_block_attributes`).
	 * @return array{content: string, changed: array<string, int>, attrs: array<string, int>} The new content, the count of delimiters
	 *                            changed per block name, and the count of attributes renamed or reshaped per `block::old name`.
	 */
	function sgs_builtin_button_sweep_content( string $content, array $blocks, array $map = array(), ?callable $serialise = null ): array {
		$map       = array() === $map ? sgs_builtin_button_sweep_map() : $map;
		$serialise = $serialise ?? 'serialize_block_attributes';
		$changed   = array();
		$counted   = array();
		$names     = implode( '|', array_map( static fn( string $b ): string => preg_quote( substr( $b, strpos( $b, '/' ) + 1 ), '#' ), $blocks ) );
		if ( '' === $names ) {
			return array(
				'content' => $content,
				'changed' => $changed,
				'attrs'   => $counted,
			);
		}
		$pattern = '#<!--(\s+)wp:sgs/(' . $names . ')(\s+)(\{(?:(?!-->).)*?\})(\s+)(/?)-->#s';
		$new     = preg_replace_callback(
			$pattern,
			static function ( array $m ) use ( $map, $serialise, &$changed, &$counted ): string {
				$block = 'sgs/' . $m[2];
				$attrs = json_decode( $m[4], true );
				if ( ! is_array( $attrs ) ) {
					return $m[0];
				}
				$after = sgs_builtin_button_sweep_attrs( $block, $attrs, $map );
				if ( $after === $attrs ) {
					return $m[0];
				}
				$changed[ $block ] = ( $changed[ $block ] ?? 0 ) + 1;
				// One count per attribute that was renamed or reshaped, under its old name.
				foreach ( array_keys( $attrs ) as $name ) {
					if ( ! array_key_exists( $name, $after ) || $attrs[ $name ] !== $after[ $name ] ) {
						$key             = $block . '::' . $name;
						$counted[ $key ] = ( $counted[ $key ] ?? 0 ) + 1;
					}
				}
				return '<!--' . $m[1] . 'wp:' . $block . $m[3] . $serialise( $after ) . $m[5] . $m[6] . '-->';
			},
			$content
		);
		return array(
			'content' => is_string( $new ) ? $new : $content,
			'changed' => $changed,
			'attrs'   => $counted,
		);
	}
}
