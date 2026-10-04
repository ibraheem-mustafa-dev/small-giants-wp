<?php
$classes = array( 'sgs-fwd-child' );
if ( empty( $attributes['showTick'] ) ) {
	$classes[] = 'sgs-fwd-child--no-tick';
}
$items = $attributes['items'] ?? array();
echo '<ul class="' . esc_attr( implode( ' ', $classes ) ) . '">';
foreach ( $items as $item ) {
	echo '<li class="sgs-fwd-child__item sgs-fwd-child__item--on">' . esc_html( $item['key'] ) . '</li>';
}
echo '</ul>';
