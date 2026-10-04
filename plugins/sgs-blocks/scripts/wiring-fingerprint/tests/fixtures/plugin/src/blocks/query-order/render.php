<?php
// listOrder only sorts the queried terms; listPaged only picks the page of a collection
// query. rowOrder is written into a CSS `order` declaration (the negative control).
$orderby = in_array( $attributes['listOrder'], array( 'name', 'count', 'term_order' ), true ) ? $attributes['listOrder'] : 'name';
$terms   = get_terms(
	array(
		'taxonomy' => 'product_brand',
		'orderby'  => $orderby,
	)
);
$paged   = absint( $attributes['listPaged'] );
$result  = \SGS\Blocks\Thing_Query::get_results( $attributes, array( 'paged' => $paged ) );
echo esc_html( $attributes['listSort'] );
foreach ( $terms as $term ) {
	echo '<li class="sgs-query-order__item">' . esc_html( $term->name ) . '</li>';
}
echo '<ul style="order:' . esc_attr( $attributes['rowOrder'] ) . '"></ul>';
