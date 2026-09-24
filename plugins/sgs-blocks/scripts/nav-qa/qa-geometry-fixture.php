<?php
/**
 * U-3 + U-8 live-check fixture on sandybrown (wp eval-file qa-geometry-fixture.php <case>). Idempotent.
 * Merges geometry attributes into the FIRST sgs/nav-drawer and sgs/nav-drawer-menu blocks of test
 * drawer 3778 and the FIRST sgs/nav-bar-menu block of test header 3777. Backups (first run only) in
 * post meta _sgs_qa_geometry_backup. Case "restore" puts both bodies back.
 *
 * Run `qa-motion-fixture.php restore` first, so this fixture starts from the untouched bodies.
 *
 * Cases:
 *   exit-cells  drawer: lusion's corner panel at desktop (310px, 12.8px below the burger), away's
 *               390px side panel at tablet, lusion's header-content panel at mobile; lusion's item
 *               pitch (gap 14px, 0 at mobile, on 44px rows). Modal, as away's drawer is. Bar: mega panels centred on the page 10px below
 *               the header (halcyon), dropdowns centred on the page (indus-foods' More).
 *   restore     put the pre-fixture bodies back.
 */

$header_id = 3777;
$drawer_id = 3778;
$case      = isset( $args[0] ) ? (string) $args[0] : 'exit-cells';

foreach ( array( $header_id, $drawer_id ) as $id ) {
	if ( '' === (string) get_post_meta( $id, '_sgs_qa_geometry_backup', true ) ) {
		update_post_meta( $id, '_sgs_qa_geometry_backup', wp_slash( get_post_field( 'post_content', $id ) ) );
	}
}

if ( 'restore' === $case ) {
	foreach ( array( $header_id, $drawer_id ) as $id ) {
		$backup = get_post_meta( $id, '_sgs_qa_geometry_backup', true );
		wp_update_post( wp_slash( array( 'ID' => $id, 'post_content' => $backup ) ) );
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

$drawer_set = array(
	'anchor'         => array( 'desktop' => 'trigger', 'tablet' => 'side-start', 'mobile' => 'container' ),
	'panelSize'      => array( 'desktop' => '310px', 'tablet' => '390px' ),
	'anchorOffset'   => array( 'desktop' => '12.8px', 'mobile' => '0px' ),
	'entryAnimation' => null,
	// away's side panel is a modal drawer that covers the header (top 0).
	'modality'       => 'modal',
);
$menu_set   = array(
	// lusion's pitch: rows are the 44px touch target, so 14px gives 58 and 0 gives 44 (lusion 43.5).
	'gap' => array( 'desktop' => '14px', 'mobile' => '0px' ),
);
$bar_set    = array(
	'megaAlign'        => array( 'desktop' => 'page-centred' ),
	'submenuAlign'     => 'page-centred',
	'submenuTopOffset' => '10px',
	// Collapse to the burger below 1600, so the drawer opens at every tier (lusion's corner panel at 1440, away's side panel at 768).
	'collapsePoint'    => 1600,
);

$d = get_post_field( 'post_content', $drawer_id );
$d = $merge( $d, 'sgs/nav-drawer', $drawer_set );
$d = $merge( $d, 'sgs/nav-drawer-menu', $menu_set );
wp_update_post( wp_slash( array( 'ID' => $drawer_id, 'post_content' => $d ) ) );

$h = $merge( get_post_field( 'post_content', $header_id ), 'sgs/nav-bar-menu', $bar_set );
wp_update_post( wp_slash( array( 'ID' => $header_id, 'post_content' => $h ) ) );

preg_match( '#<!-- wp:sgs/nav-drawer (\{.*?\}) #s', get_post_field( 'post_content', $drawer_id ), $dm );
preg_match( '#<!-- wp:sgs/nav-drawer-menu (\{.*?\}) #s', get_post_field( 'post_content', $drawer_id ), $mm );
preg_match( '#<!-- wp:sgs/nav-bar-menu (\{.*?\}) #s', get_post_field( 'post_content', $header_id ), $hm );
echo "case: {$case}\n";
echo 'drawer: ' . ( $dm[1] ?? 'NOT FOUND' ) . "\n";
echo 'menu: ' . ( $mm[1] ?? 'NOT FOUND' ) . "\n";
echo 'bar: ' . ( $hm[1] ?? 'NOT FOUND' ) . "\n";
