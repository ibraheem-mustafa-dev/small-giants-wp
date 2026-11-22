<?php
// Scratch fixtures for the browser pass: a branded simple product (20) and a variable product whose one variation costs 10, both purchasable.
// Together they stay under a 35 free-shipping minimum; a second simple product takes the basket over it.
$brand = term_exists( 'SR Brand', 'product_brand' ) ?: wp_insert_term( 'SR Brand', 'product_brand' );
$brand_id = is_array( $brand ) ? (int) $brand['term_id'] : (int) $brand;
$simple = new WC_Product_Simple();
$simple->set_name( 'SR Branded Simple' ); $simple->set_regular_price( '20' ); $simple->set_status( 'publish' );
$simple->set_catalog_visibility( 'visible' ); $simple->set_manage_stock( false ); $simple->set_stock_status( 'instock' );
$sid = $simple->save();
wp_set_object_terms( $sid, array( $brand_id ), 'product_brand' );
$var = new WC_Product_Variable();
$var->set_name( 'SR Variable' ); $var->set_status( 'publish' );
$attr = new WC_Product_Attribute(); $attr->set_name( 'Size' ); $attr->set_options( array( 'S', 'M' ) ); $attr->set_visible( true ); $attr->set_variation( true );
$var->set_attributes( array( $attr ) );
$vid = $var->save();
$v = new WC_Product_Variation(); $v->set_parent_id( $vid ); $v->set_attributes( array( 'size' => 'M' ) ); $v->set_regular_price( '10' ); $v->set_status( 'publish' ); $v->set_manage_stock( false ); $v->set_stock_status( 'instock' );
$vvid = $v->save();
WC_Product_Variable::sync( $vid );
// The branded simple product links a published choice flow, so the bag drawer offers its "Add options" link on that line
// (includes/cart-item-extensions.php::sgs_cart_item_has_choice_flow, item-row-template.js hasChoiceFlow).
$flow = get_page_by_path( 'sr-choice-flow', OBJECT, 'sgs_choice_flow' );
$fid  = $flow ? (int) $flow->ID : (int) wp_insert_post( array( 'post_type' => 'sgs_choice_flow', 'post_status' => 'publish', 'post_name' => 'sr-choice-flow', 'post_title' => 'SR choice flow' ) );
update_post_meta( $sid, '_sgs_choice_flow', 'sr-choice-flow' );
echo json_encode( array( 'simple' => $sid, 'variable' => $vid, 'variation' => $vvid, 'brand' => $brand_id, 'flow' => $fid ) ), "\n";
