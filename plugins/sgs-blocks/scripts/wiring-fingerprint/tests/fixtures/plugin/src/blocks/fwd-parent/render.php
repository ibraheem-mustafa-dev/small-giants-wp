<?php
// The tick toggle reaches the nested picker in an attrs array that also holds a
// closure (its braces split the statement), and paints there through a modifier
// class with a rule. The items toggle lands in the nested block's content attribute.
$tick        = array_key_exists( 'pickerTick', $attributes ) ? (bool) $attributes['pickerTick'] : true;
$child_attrs = array(
	'items'    => array_map(
		static function ( $t ) {
			return array( 'key' => $t );
		},
		array( 'a', 'b' )
	),
	'showTick' => $tick,
);
echo render_block(
	array(
		'blockName' => 'sgs/fwd-child',
		'attrs'     => $child_attrs,
	)
);
echo render_block(
	array(
		'blockName' => 'sgs/fwd-child',
		'attrs'     => array( 'items' => $attributes['pickerItems'] ),
	)
);
