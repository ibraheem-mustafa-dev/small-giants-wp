<?php
/**
 * Cart and Checkout look: the row-by-column table.
 *
 * The table in selectors.json names every WooCommerce part (a row) and the property kinds (columns) the part takes. A row's
 * `columns` list adds one setting per column: margin, padding, gap, column gap, width, height, minimum width and
 * height, corner radius, border (all sides, top, bottom), shadow, text, underline, and the keyword columns (align items,
 * align this part, justify content, fill spare space). The attribute name is the row's
 * prefix (`sgs` plus the row id in PascalCase, or the row's own `prefix`) plus the column's suffix, so the settings
 * need no list of their own: this file prints them, scripts/generate-commerce-look-table.js writes the attribute
 * definitions and roster rows, and src/blocks/extensions/commerce-look/table-panels.js draws the controls, all from
 * the same JSON. Adding a setting is adding a column name to a row.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 2 ) . '/helpers-tiered-border.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/selectors.php';

/**
 * The column registry from selectors.json.
 *
 * @return array<string, array<string, mixed>>
 */
function sgs_commerce_look_table_columns(): array {
	static $columns = null;
	if ( null !== $columns ) {
		return $columns;
	}
	$raw     = file_get_contents( __DIR__ . '/selectors.json' ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- a plugin file read, not a remote request.
	$data    = false === $raw ? null : json_decode( $raw, true );
	$columns = is_array( $data ) && is_array( $data['columns'] ?? null ) ? $data['columns'] : array();
	return $columns;
}

/**
 * A row's attribute prefix: its own `prefix`, else `sgs` plus the row id in PascalCase.
 *
 * @param string               $row_id Row id.
 * @param array<string, mixed> $row    The row.
 * @return string
 */
function sgs_commerce_look_table_prefix( string $row_id, array $row ): string {
	if ( ! empty( $row['prefix'] ) ) {
		return (string) $row['prefix'];
	}
	return 'sgs' . str_replace( ' ', '', ucwords( str_replace( '_', ' ', $row_id ) ) );
}

/**
 * Every setting the table defines.
 *
 * @return array<string, array{type: string, row: string, column: string, suffix: string}> Attribute name => its type, row and column.
 */
function sgs_commerce_look_table_attributes(): array {
	$columns = sgs_commerce_look_table_columns();
	$out     = array();
	foreach ( sgs_commerce_look_selector_table() as $row_id => $row ) {
		foreach ( (array) ( $row['columns'] ?? array() ) as $column ) {
			foreach ( (array) ( $columns[ $column ]['attrs'] ?? array() ) as $pair ) {
				$out[ sgs_commerce_look_table_prefix( (string) $row_id, $row ) . $pair[0] ] = array(
					'type'   => (string) $pair[1],
					'row'    => (string) $row_id,
					'column' => (string) $column,
					'suffix' => (string) $pair[0],
				);
			}
		}
	}
	return $out;
}

/**
 * The rules for every table setting that is set.
 *
 * @param array<string, mixed> $attrs Set attributes.
 * @param string               $block 'cart' or 'checkout'.
 * @param string               $root  Scope selector.
 * @return string CSS text; '' when no table setting is set.
 */
function sgs_commerce_look_table_css( array $attrs, string $block, string $root ): string {
	$columns = sgs_commerce_look_table_columns();
	$css     = '';
	foreach ( sgs_commerce_look_selector_table() as $row_id => $row ) {
		$list = (array) ( $row['columns'] ?? array() );
		if ( array() === $list ) {
			continue;
		}
		// `&` names the block root itself (the scope class), not a part inside it.
		// A row whose WooCommerce rule carries several classes repeats the scope class (`root_repeat`) so its settings out-rank it.
		$lead     = str_repeat( $root, max( 1, (int) ( $row['root_repeat'] ?? 1 ) ) );
		$selector = '&' === ( $row[ $block ] ?? '' ) ? $root : sgs_commerce_look_selector( (string) $row_id, $block, $lead );
		if ( '' === $selector ) {
			continue;
		}
		$prefix = sgs_commerce_look_table_prefix( (string) $row_id, $row );
		foreach ( $list as $column ) {
			$def  = $columns[ $column ] ?? array();
			$css .= sgs_commerce_look_table_column_css( $attrs, $prefix . (string) ( $def['attrs'][0][0] ?? '' ), (string) ( $def['kind'] ?? '' ), (string) ( $def['css'] ?? '' ), $selector, (array) ( $def['options'] ?? array() ) );
		}
	}
	return $css;
}

/**
 * One column of one row.
 *
 * @param array<string, mixed> $attrs    Set attributes.
 * @param string               $name     The column's first attribute name (row prefix plus suffix; a text column passes the bare prefix below).
 * @param string               $kind     Column kind: box, length, border, shadow, text, keyword or decoration.
 * @param string               $property CSS property (the property prefix for a border).
 * @param string               $selector Scoped selector list.
 * @param array                $options  A keyword column's allowed values, each `[ value, label ]`.
 * @return string CSS text.
 */
function sgs_commerce_look_table_column_css( array $attrs, string $name, string $kind, string $property, string $selector, array $options = array() ): string {
	switch ( $kind ) {
		case 'box':
			return sgs_emit_responsive_css(
				$selector,
				array(
					array(
						'value'        => $attrs[ $name ] ?? null,
						'css'          => $property,
						'box'          => true,
						'unit_default' => 'px',
					),
				)
			);
		case 'length':
			return sgs_emit_responsive_css(
				$selector,
				array(
					array(
						'value'        => $attrs[ $name ] ?? null,
						'css'          => $property,
						'unit_default' => 'px',
					),
				)
			);
		case 'keyword':
			// Only a value the column lists prints, so a stored value cannot carry other CSS.
			$allowed = array_map( static fn( $pair ): string => (string) $pair[0], $options );
			return sgs_emit_responsive_css(
				$selector,
				array(
					array(
						'value'     => $attrs[ $name ] ?? null,
						'css'       => $property,
						'transform' => static fn( $raw ): ?string => in_array( (string) $raw, $allowed, true ) ? (string) $raw : null,
					),
				)
			);
		case 'border':
			return sgs_emit_responsive_css( $selector, sgs_tiered_border_specs( $attrs[ $name ] ?? array(), $property ) );
		case 'shadow':
			$decls = sgs_shadow_decls(
				$attrs,
				array(
					'base'   => $name,
					'colour' => $name . 'Colour',
				)
			)['normal'];
			return array() === $decls ? '' : $selector . '{' . implode( ';', $decls ) . ';}';
		case 'text':
			// A text column's attributes are the typography set under the row prefix.
			return sgs_commerce_look_text_css( $attrs, substr( $name, 0, -strlen( 'FontSize' ) ), $selector );
		default:
			// `decoration` is printed with the text style of a row that already has one (typography.php).
			return '';
	}
}
