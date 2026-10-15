<?php
/**
 * The effect-layer emitter (Spec 38A §5.3, §6.5; FR-38A-22 emission).
 *
 * Writes each effect layer of one sgsMotion element (`effects`, `hover.effects` and `entrance.text`) as the
 * `data-sgs-fx` / `data-sgs-fx-*` attributes the shipped runtimes read, for `Sgs_Motion_Renderer` to stamp onto the
 * layer's target element (the root or a declared part, resolved by `Sgs_Motion_Targets::resolve`) through
 * `Sgs_Motion_Markup::apply`, whose `split_head` skips a block's leading `<style>`/`<script>` as
 * `includes/fx-attributes.php::sgs_fx_root_offset` did. Each value field writes its schema `x-sgs-field.dataAttr` in
 * its `dataUnit` and `dataForm` (`Sgs_Motion_Fx_Grammar`).
 *
 * Grammar rules carried over from `includes/fx-attributes.php::sgs_fx_data_attr_string`:
 * - `data-sgs-fx` names the effect; an element holding several effect layers lists their slugs in paint order,
 *   separated by single spaces (the runtimes match one token, `[data-sgs-fx~="<effect>"]`).
 * - Only a genuinely absent value is left out: a numeric zero (no smoothing lag) is written.
 * - One attribute, one value: when two layers on one element write the same attribute, the first in paint order keeps
 *   it and the later value is reported through the `sgs_motion_layer_dropped` action.
 * - A layer's `off` tiers are the per-breakpoint switches `data-sgs-fx-disable-tablet` / `-mobile` set to `1`.
 * - A hover state with `followPointer` on in any tier adds `follow-pointer` to the element's `data-sgs-fx`.
 *
 * Every value is checked again through `Sgs_Motion_Field_Types::sanitise` against its own schema node before it is
 * written, so an out-of-range or wrong-typed value is dropped here even when the caller passes an unsanitised element.
 * A token reference is resolved to the theme's value first; one that does not resolve, and a curve no shipped runtime
 * reads, are reported through `sgs_motion_layer_dropped`. An effect slug the schema does not know writes nothing.
 * Per-device value overrides (`devices.tablet`, `devices.mobile`) are not written: the grammar has no per-device value.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Fx_Emitter
 */
final class Sgs_Motion_Fx_Emitter {

	/** The lists whose layers are runtime effects, in paint order. */
	const LISTS = array( 'hover.effects', 'entrance.text', 'effects' );

	/**
	 * The token a hover state with Follow pointer on adds to its element's `data-sgs-fx`, so the registry loads the
	 * pointer writer (`@sgs/fx-follow-pointer`) beside the transform channel the hover state stamps on the same element.
	 */
	const FOLLOW_POINTER = 'follow-pointer';

	/** The tiers a layer's `off` list may name, as the attributes the runtimes read. */
	const OFF_ATTRS = array(
		'tablet' => 'data-sgs-fx-disable-tablet',
		'mobile' => 'data-sgs-fx-disable-mobile',
	);

	/**
	 * The `data-sgs-fx*` attributes of one element's effect layers.
	 *
	 * @param array<string,mixed> $element A sgsMotion element.
	 * @param string              $block   Block name, for drop reports.
	 * @param string              $target  Target key, for drop reports.
	 * @return array<string,string> Attribute name => value; empty when the element has no effect layer.
	 */
	public static function attrs( array $element, string $block = '', string $target = '' ): array {
		$out = self::follows_pointer( $element ) ? array( 'data-sgs-fx' => self::FOLLOW_POINTER ) : array();
		foreach ( self::LISTS as $list ) {
			$parts = explode( '.', $list );
			$node  = 2 === count( $parts ) ? ( $element[ $parts[0] ][ $parts[1] ] ?? array() ) : ( $element[ $list ] ?? array() );
			foreach ( is_array( $node ) ? $node : array() as $layer ) {
				if ( is_array( $layer ) && isset( $layer['effect'] ) && is_string( $layer['effect'] ) ) {
					$out = self::merge( $out, self::layer_attrs( $layer, $block, $target ), $block, $target );
				}
			}
		}
		return $out;
	}

	/**
	 * Whether the element's hover state turns Follow pointer on in any tier.
	 *
	 * @param array<string,mixed> $element A sgsMotion element.
	 * @return bool
	 */
	private static function follows_pointer( array $element ): bool {
		$state = $element['hover']['state'] ?? null;
		if ( ! is_array( $state ) ) {
			return false;
		}
		foreach ( array( $state['values'] ?? null, $state['devices']['tablet'] ?? null, $state['devices']['mobile'] ?? null ) as $values ) {
			if ( is_array( $values ) && true === ( $values['followPointer'] ?? null ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Merge a second attribute set into a first: `data-sgs-fx` lists are joined, every other attribute keeps the first
	 * value and reports the later one as dropped.
	 *
	 * @param array<string,string> $first  Attributes already held.
	 * @param array<string,string> $second Attributes to add.
	 * @param string               $block  Block name, for drop reports.
	 * @param string               $target Target key, for drop reports.
	 * @return array<string,string>
	 */
	public static function merge( array $first, array $second, string $block = '', string $target = '' ): array {
		foreach ( $second as $name => $value ) {
			if ( 'data-sgs-fx' === $name && isset( $first[ $name ] ) ) {
				$slugs          = array_merge( explode( ' ', $first[ $name ] ), explode( ' ', $value ) );
				$first[ $name ] = implode( ' ', array_values( array_unique( array_filter( $slugs, 'strlen' ) ) ) );
				continue;
			}
			if ( array_key_exists( $name, $first ) ) {
				if ( $first[ $name ] !== $value ) {
					self::report( $block, $target, 'fx-attribute-shared', $name . ' is already written by an earlier effect on this element; the later value ' . $value . ' is not written.' );
				}
				continue;
			}
			$first[ $name ] = $value;
		}
		return $first;
	}

	/**
	 * Report a value that is not written.
	 *
	 * @param string $block  Block name.
	 * @param string $target Target key.
	 * @param string $id     Drop id.
	 * @param string $text   Why.
	 * @return void
	 */
	private static function report( string $block, string $target, string $id, string $text ): void {
		if ( function_exists( 'do_action' ) ) {
			do_action(
				'sgs_motion_layer_dropped',
				$block,
				$target,
				array(
					'id'   => $id,
					'text' => $text,
				)
			);
		}
	}

	/**
	 * The attributes of one layer.
	 *
	 * @param array<string,mixed> $layer  An effect layer.
	 * @param string              $block  Block name, for drop reports.
	 * @param string              $target Target key, for drop reports.
	 * @return array<string,string>
	 */
	public static function layer_attrs( array $layer, string $block = '', string $target = '' ): array {
		$effect = is_string( $layer['effect'] ?? null ) ? $layer['effect'] : '';
		if ( ! isset( Sgs_Motion_Field_Types::schema()['x-sgs-effects'][ $effect ] ) ) {
			return array();
		}
		$out     = array( 'data-sgs-fx' => $effect );
		$trigger = $layer['trigger'] ?? null;
		if ( is_string( $trigger ) && in_array( $trigger, Sgs_Motion_Fx_Grammar::RUNTIME_TRIGGERS, true ) ) {
			$out['data-sgs-fx-trigger'] = $trigger;
		}
		foreach ( self::OFF_ATTRS as $tier => $attr ) {
			if ( is_array( $layer['off'] ?? null ) && in_array( $tier, $layer['off'], true ) ) {
				$out[ $attr ] = '1';
			}
		}
		$values = isset( $layer['values'] ) && is_array( $layer['values'] ) ? $layer['values'] : array();
		$fields = Sgs_Motion_Fx_Grammar::fields( $effect );
		$clean  = array();
		foreach ( $fields as $i => $field ) {
			$value = self::clean_value( $field, $values );
			if ( null !== $value ) {
				$clean[ $i ] = $value;
			}
		}
		foreach ( $clean as $i => $value ) {
			$field = $fields[ $i ];
			if ( '' === $field['attr'] || isset( $out[ $field['attr'] ] ) ) {
				continue;
			}
			$text = self::convert( $i, $value, $fields, $clean, $effect . ' ' . implode( '.', $field['path'] ), $block, $target );
			if ( null !== $text ) {
				$out[ $field['attr'] ] = $text;
			}
		}
		return $out;
	}

	/**
	 * One field's stored value when it passes its own schema node (a list keeps its valid items), else null.
	 *
	 * @param array<string,mixed> $field  A field from `Sgs_Motion_Fx_Grammar::fields`.
	 * @param array<string,mixed> $values The layer's stored values.
	 * @return mixed|null
	 */
	private static function clean_value( array $field, array $values ) {
		$value = $values;
		foreach ( $field['path'] as $step ) {
			if ( ! is_array( $value ) || ! array_key_exists( $step, $value ) ) {
				return null;
			}
			$value = $value[ $step ];
		}
		if ( ! $field['list'] ) {
			return Sgs_Motion_Field_Types::sanitise( $field['type'], $value, $field['node'] );
		}
		$items = array();
		foreach ( is_array( $value ) && array_is_list( $value ) ? $value : array() as $item ) {
			$item = Sgs_Motion_Field_Types::sanitise( $field['type'], $item, $field['node'] );
			if ( null !== $item ) {
				$items[] = $item;
			}
		}
		return array() === $items ? null : $items;
	}

	/**
	 * One field's attribute value.
	 *
	 * @param int                            $index  The field's index.
	 * @param mixed                          $value  Clean value.
	 * @param array<int,array<string,mixed>> $fields The effect's fields.
	 * @param array<int,mixed>               $clean  Clean values by field index.
	 * @param string                         $label  `<effect> <value path>`, for reports.
	 * @param string                         $block  Block name, for reports.
	 * @param string                         $target Target key, for reports.
	 * @return string|null Null when the value has no runtime form.
	 */
	private static function convert( int $index, $value, array $fields, array $clean, string $label, string $block, string $target ): ?string {
		$field = $fields[ $index ];
		$raw   = $value;
		$value = is_string( $value ) ? Sgs_Motion_Fx_Grammar::resolve_token( $value ) : $value;
		if ( null === $value ) {
			self::report( $block, $target, 'fx-token-unresolved', $label . ': the token ' . $raw . ' has no theme value here, so it is not written.' );
			return null;
		}
		switch ( $field['form'] ) {
			case 'position':
				return self::position( $index, $value, $fields, $clean );
			case 'pinLength':
				return self::pin_end( $value );
			case 'gsapEase':
				$ease = Sgs_Motion_Fx_Grammar::gsap_ease( $value );
				if ( null !== $ease && ! $ease['readable'] ) {
					self::report( $block, $target, 'fx-ease-unread', $label . ': the curve ' . $ease['ease'] . ' is written, but no shipped runtime reads a curve yet, so GSAP falls back to its default ease.' );
				}
				return null === $ease ? null : $ease['ease'];
			case 'maskUnit':
				$unit = self::clean_at( 'unit', $fields, $clean ) ?? 'words';
				return true === $value && is_string( $unit ) ? $unit : null;
			case 'flagText':
				return is_bool( $value ) ? ( $value ? 'true' : 'false' ) : null;
			case 'flagTrue':
				return true === $value ? 'true' : null;
			case 'offWord':
				return false === $value ? 'off' : null;
			case 'omitDefault':
				return $field['omit'] === $value ? null : self::plain( $value, $field['type'] );
		}
		return self::in_unit( $value, $field );
	}

	/**
	 * A value in its field's `dataUnit`.
	 *
	 * @param mixed               $value  Clean value, token resolved.
	 * @param array<string,mixed> $field  The field.
	 * @return string|null
	 */
	private static function in_unit( $value, array $field ): ?string {
		switch ( $field['unit'] ) {
			case 's':
			case 'ms':
				$ms = Sgs_Motion_Fx_Grammar::milliseconds( $value );
				return null === $ms ? null : Sgs_Motion_Field_Css::number( 's' === $field['unit'] ? $ms / 1000 : $ms );
			case 'px':
			case 'deg':
				$number = Sgs_Motion_Fx_Grammar::plain_number( $value, $field['unit'] );
				return null === $number ? null : Sgs_Motion_Field_Css::number( $number );
		}
		return self::plain( $value, $field['type'] );
	}

	/**
	 * A position's text from its edge field and the viewport-line field that shares its attribute.
	 *
	 * @param int                            $index  The field's index.
	 * @param mixed                          $value  Clean value.
	 * @param array<int,array<string,mixed>> $fields The effect's fields.
	 * @param array<int,mixed>               $clean  Clean values by field index.
	 * @return string|null Null for the line field itself and for an edge with no line.
	 */
	private static function position( int $index, $value, array $fields, array $clean ): ?string {
		if ( 'choice' !== $fields[ $index ]['type'] || ! is_string( $value ) ) {
			return null;
		}
		foreach ( $fields as $i => $field ) {
			$line = $clean[ $i ] ?? null;
			if ( $i !== $index && $field['attr'] === $fields[ $index ]['attr'] && 'percentage' === $field['type'] && ( is_int( $line ) || is_float( $line ) ) ) {
				return Sgs_Motion_Fx_Grammar::position( $value, $line );
			}
		}
		return null;
	}

	/**
	 * The clean value of the field at a top-level key, or null.
	 *
	 * @param string                         $key    Value key.
	 * @param array<int,array<string,mixed>> $fields The effect's fields.
	 * @param array<int,mixed>               $clean  Clean values by field index.
	 * @return mixed|null
	 */
	private static function clean_at( string $key, array $fields, array $clean ) {
		foreach ( $fields as $i => $field ) {
			if ( array( $key ) === $field['path'] ) {
				return $clean[ $i ] ?? null;
			}
		}
		return null;
	}

	/**
	 * A pin length as the relative ScrollTrigger end the runtime reads: viewport heights or percent as `+=N%`, pixels
	 * (a number, `px` or `rem`) as `+=Npx`.
	 *
	 * @param mixed $value Clean distance, token resolved.
	 * @return string|null
	 */
	public static function pin_end( $value ): ?string {
		if ( is_string( $value ) && 1 === preg_match( '/^(\d+(?:\.\d+)?|\.\d+)(vh|svh|dvh|%)$/', $value, $m ) ) {
			return '+=' . Sgs_Motion_Field_Css::number( (float) $m[1] ) . '%';
		}
		$px = Sgs_Motion_Fx_Grammar::plain_number( $value, 'px' );
		return null === $px || $px < 0 ? null : '+=' . Sgs_Motion_Field_Css::number( $px ) . 'px';
	}

	/**
	 * A clean value written as is: a number (a length or angle with its CSS unit), a string, a flag as `true`/`false`,
	 * a list or object as JSON.
	 *
	 * @param mixed  $value Clean value, token resolved.
	 * @param string $type  Its field type.
	 * @return string|null
	 */
	private static function plain( $value, string $type ): ?string {
		if ( is_bool( $value ) ) {
			return $value ? 'true' : 'false';
		}
		if ( is_int( $value ) || is_float( $value ) ) {
			$units = array(
				'distance' => 'px',
				'angle'    => 'deg',
			);
			return Sgs_Motion_Field_Css::number( $value ) . ( $units[ $type ] ?? '' );
		}
		if ( is_string( $value ) ) {
			return '' === $value ? null : $value;
		}
		if ( is_array( $value ) && array() !== $value ) {
			$json = wp_json_encode( $value );
			return is_string( $json ) ? $json : null;
		}
		return null;
	}
}
