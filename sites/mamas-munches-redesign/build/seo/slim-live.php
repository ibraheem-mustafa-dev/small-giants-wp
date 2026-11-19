<?php
// Sets up Slim SEO on the shop: the features the framework does not already cover, a default social image, and each main
// page's description. Usage: wp --user=1 eval-file slim-live.php [dry]   (dry prints what would change and writes nothing)
$dry = 'dry' === ( $args[0] ?? '' );
if ( ! defined( 'SLIM_SEO_VER' ) ) {
	WP_CLI::error( 'Slim SEO is not active' );
}

$features = array( 'meta_title', 'meta_description', 'meta_robots', 'open_graph', 'twitter_cards', 'canonical_url', 'rel_links', 'images_alt' );
global $wpdb;
$logo_id = (int) $wpdb->get_var( "SELECT post_id FROM $wpdb->postmeta WHERE meta_key = '_wp_attached_file' AND meta_value LIKE '%/logo-round.png' ORDER BY post_id LIMIT 1" );
$logo    = $logo_id ? (string) wp_get_attachment_url( $logo_id ) : '';

$option             = get_option( 'slim_seo', array() );
$option             = is_array( $option ) ? $option : array();
$option['features'] = $features;
if ( '' !== $logo ) {
	$option['default_facebook_image'] = $logo;
	$option['default_twitter_image']  = $logo;
}
WP_CLI::log( 'features: ' . implode( ', ', $features ) );
WP_CLI::log( 'default social image: ' . ( '' !== $logo ? basename( $logo ) : 'none found' ) );

$pages = array(
	'page:home'                     => array( 'title' => 'Mama’s Munches: lactation cookies handmade in Birmingham', 'description' => 'Giant lactation cookies with oats, brewer’s yeast, flaxseed and fenugreek, handmade in Birmingham for new mums. Build your own box or send a gift.' ),
	'page:shop'                     => array( 'description' => 'Shop Zookies lactation cookies, gift boxes and gift cards, handmade in Birmingham for new mums and posted across the UK by Royal Mail Tracked.' ),
	'page:gifts'                    => array( 'description' => 'Gifts for new mums that she will actually eat: gift boxes, gift cards and a note from you, with the prices left off. Handmade in Birmingham.' ),
	'page:help'                     => array( 'description' => 'Answers on delivery, ingredients and allergens for our lactation cookies, handmade in Birmingham and posted across the UK by Royal Mail Tracked.' ),
	'page:contact'                  => array( 'description' => 'Get in touch with Zainab at Mama’s Munches by WhatsApp, Instagram, email or the form, for questions about your order, gifts, allergens or anything else.' ),
	'page:terms'                    => array( 'description' => 'The terms for ordering from Mama’s Munches: prices and payment, delivery, allergens, cancellations and returns, gift cards and your legal rights.' ),
	'page:privacy-policy'           => array( 'description' => 'How Mama’s Munches collects, uses and protects your personal data, who else handles it, how long we keep it and how to use your rights over it.' ),
	'product:zookies'               => array( 'description' => 'Build your own box of giant lactation cookies: pick the oat base, the chips and your flavours. Handmade in Birmingham and posted across the UK.' ),
	'product:taster-trio'           => array( 'description' => 'Try three of our giant lactation cookies before you choose a full box. A small flat pack that fits through the letterbox, so nobody needs to be in.' ),
	'product:new-baby-gift-box'     => array( 'description' => 'A gift-boxed mix of our giant lactation cookies with your own note and the prices left off. Handmade in Birmingham and posted straight to a new mum.' ),
	'product:40-day-care-bundle'    => array( 'description' => 'A gift bundle of lactation cookies for the first 40 days after the birth, with your own note and the prices left off. Handmade in Birmingham.' ),
	'product:baby-shower-gift-card' => array( 'description' => 'A baby shower gift card for lactation cookies. She redeems it once the baby arrives, so every cookie reaches her fresh. Handmade in Birmingham.' ),
);

$writes = array();
foreach ( $pages as $key => $values ) {
	list( $type, $slug ) = explode( ':', $key );
	$post = get_page_by_path( $slug, OBJECT, $type );
	if ( ! $post || 'publish' !== $post->post_status ) {
		WP_CLI::warning( "$key: no published post, skipped" );
		continue;
	}
	$meta = get_post_meta( $post->ID, 'slim_seo', true );
	$meta = is_array( $meta ) ? $meta : array();
	$new  = array_merge( $meta, $values );
	WP_CLI::log( sprintf( '%-32s %d  %d chars%s', $key, $post->ID, mb_strlen( $values['description'] ), $meta === $new ? '  (already set)' : '' ) );
	$writes[ $post->ID ] = $new;
}

if ( $dry ) {
	WP_CLI::success( 'dry run: nothing written' );
	return;
}
update_option( 'slim_seo', $option );
update_option( 'rss_use_excerpt', 1 );
foreach ( $writes as $post_id => $meta ) {
	update_post_meta( $post_id, 'slim_seo', $meta );
}
WP_CLI::success( 'settings saved; descriptions set on ' . count( $writes ) . ' pages and products' );
