<?php
/**
 * U-6 + U-7 live-check fixture on sandybrown (wp eval-file qa-item-markup-fixture.php <case>). Idempotent.
 * Merges item-markup attributes into the FIRST sgs/nav-drawer-menu block of test drawer 3778 and the
 * FIRST sgs/nav-bar-menu block of test header 3777. Backups (first run only) in post meta
 * _sgs_qa_item_markup_backup. Case "restore" puts both bodies back.
 *
 * Run `qa-geometry-fixture.php restore` first, so this fixture starts from the untouched bodies.
 * Design: .claude/reports/2026-09-25-u6-u7-design.md section 8.
 *
 * Cases:
 *   exit-cells  drawer menu: halcyon's row separator (1px #16140a at 0.1), wearecollins' sibling dim
 *               (#4c4c4c, 0.7s), lusion's label roll, dogstudio's index at desktop only, studionamma's
 *               hover thumbnail at desktop (160 x 112), a 45deg expander turn, mega items as panels.
 *               Bar: collapse at 1600 so the drawer opens at 1440; the trigger word "Menu" rolls to
 *               "Close" while open.
 *   restore     put the pre-fixture bodies back.
 */

$header_id = 3777;
$drawer_id = 3778;
$case      = isset( $args[0] ) ? (string) $args[0] : 'exit-cells';

foreach ( array( $header_id, $drawer_id ) as $id ) {
	if ( '' === (string) get_post_meta( $id, '_sgs_qa_item_markup_backup', true ) ) {
		update_post_meta( $id, '_sgs_qa_item_markup_backup', wp_slash( get_post_field( 'post_content', $id ) ) );
	}
}

// Menu 119 (qa-hdr-nav) holds the mega item "Brands" (panel post 1745). Its other links are
// custom links, which carry no featured image by design, so the fixture adds ONE page link
// (the homepage, page 2742) and gives that page a featured image (attachment 3459) for the
// per-item media cell. Both are tagged and undone by "restore".
$menu_id       = 119;
$media_page_id = 2742;
$media_thumb   = 3459;

if ( 'restore' === $case ) {
	foreach ( array( $header_id, $drawer_id ) as $id ) {
		$backup = get_post_meta( $id, '_sgs_qa_item_markup_backup', true );
		wp_update_post( wp_slash( array( 'ID' => $id, 'post_content' => $backup ) ) );
	}
	foreach ( (array) wp_get_nav_menu_items( $menu_id ) as $item ) {
		if ( get_post_meta( $item->ID, '_sgs_qa_item_markup', true ) ) {
			wp_delete_post( $item->ID, true );
		}
	}
	$old_thumb = get_post_meta( $media_page_id, '_sgs_qa_item_markup_thumb', true );
	if ( '' !== (string) $old_thumb ) {
		'none' === $old_thumb ? delete_post_thumbnail( $media_page_id ) : set_post_thumbnail( $media_page_id, (int) $old_thumb );
		delete_post_meta( $media_page_id, '_sgs_qa_item_markup_thumb' );
	}
	echo "restored\n";
	return;
}

if ( 'exit-cells' !== $case ) {
	echo "unknown case {$case}\n";
	return;
}

/**
 * Merge $set into the attribute JSON of the first $block comment in $content.
 * Keys whose value is null are removed.
 */
$merge = static function ( string $content, string $block, array $set ): string {
	$pattern = '#<!-- wp:' . preg_quote( $block, '#' ) . '(?: (\{.*?\}))? (/?)-->#s';
	return (string) preg_replace_callback(
		$pattern,
		static function ( $m ) use ( $block, $set ) {
			$attrs = ( isset( $m[1] ) && '' !== $m[1] ) ? json_decode( $m[1], true ) : array();
			$attrs = is_array( $attrs ) ? $attrs : array();
			foreach ( $set as $k => $v ) {
				if ( null === $v ) {
					unset( $attrs[ $k ] );
				} else {
					$attrs[ $k ] = $v;
				}
			}
			$json = $attrs ? ' ' . serialize_block_attributes( $attrs ) : '';
			return '<!-- wp:' . $block . $json . ' ' . ( $m[2] ?? '' ) . '-->';
		},
		$content,
		1
	);
};

$has_page_item = false;
foreach ( (array) wp_get_nav_menu_items( $menu_id ) as $item ) {
	if ( get_post_meta( $item->ID, '_sgs_qa_item_markup', true ) ) {
		$has_page_item = true;
	}
}
if ( ! $has_page_item ) {
	$new_item = wp_update_nav_menu_item(
		$menu_id,
		0,
		array(
			'menu-item-title'     => 'Home page',
			'menu-item-object'    => 'page',
			'menu-item-object-id' => $media_page_id,
			'menu-item-type'      => 'post_type',
			'menu-item-status'    => 'publish',
		)
	);
	if ( ! is_wp_error( $new_item ) ) {
		update_post_meta( $new_item, '_sgs_qa_item_markup', 1 );
	}
}
if ( '' === (string) get_post_meta( $media_page_id, '_sgs_qa_item_markup_thumb', true ) ) {
	$prior = get_post_thumbnail_id( $media_page_id );
	update_post_meta( $media_page_id, '_sgs_qa_item_markup_thumb', $prior ? (string) $prior : 'none' );
}
set_post_thumbnail( $media_page_id, $media_thumb );

$menu_set = array(
	'ref'                     => $menu_id,
	'itemBorderWidth'         => array(
		'top'    => '0px',
		'right'  => '0px',
		'bottom' => '1px',
		'left'   => '0px',
	),
	'itemBorderColour'        => '#16140a1a',
	'itemBorderColourHover'   => '#16140a1a',
	'itemBorderColourCurrent' => '#16140a1a',
	'siblingDimColour'        => '#4c4c4c',
	'itemMotionDuration'      => 700,
	'itemMotionEasing'        => 'custom',
	'itemMotionEasingCustom'  => 'cubic-bezier(0.215, 0.61, 0.355, 1)',
	'labelRoll'               => 'up',
	'itemOrnament'            => array(
		'desktop' => 'index',
		'tablet'  => 'none',
		'mobile'  => 'none',
	),
	'itemOrnamentSize'        => array( 'desktop' => '12px' ),
	'itemMedia'               => 'featured-image',
	'itemMediaReveal'         => array(
		'desktop' => 'hover',
		'tablet'  => 'none',
		'mobile'  => 'none',
	),
	'itemMediaWidth'          => array( 'desktop' => '160px' ),
	'itemMediaHeight'         => array( 'desktop' => '112px' ),
	'itemExpanderRotate'      => 45,
	'megaDrawerMode'          => 'panel',
);
$bar_set  = array(
	'collapsePoint'    => 1600,
	'labelRoll'        => 'up',
	'triggerMode'      => array( 'desktop' => 'icon-and-text' ),
	'triggerLabel'     => 'Menu',
	'triggerOpenLabel' => 'Close',
);

$d = $merge( get_post_field( 'post_content', $drawer_id ), 'sgs/nav-drawer-menu', $menu_set );
wp_update_post( wp_slash( array( 'ID' => $drawer_id, 'post_content' => $d ) ) );

$h = $merge( get_post_field( 'post_content', $header_id ), 'sgs/nav-bar-menu', $bar_set );
wp_update_post( wp_slash( array( 'ID' => $header_id, 'post_content' => $h ) ) );

preg_match( '#<!-- wp:sgs/nav-drawer-menu (\{.*?\}) #s', get_post_field( 'post_content', $drawer_id ), $mm );
preg_match( '#<!-- wp:sgs/nav-bar-menu (\{.*?\}) #s', get_post_field( 'post_content', $header_id ), $hm );
echo "case: {$case}\n";
echo 'menu: ' . ( $mm[1] ?? 'NOT FOUND' ) . "\n";
echo 'bar: ' . ( $hm[1] ?? 'NOT FOUND' ) . "\n";
