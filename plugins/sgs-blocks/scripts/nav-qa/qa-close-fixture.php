<?php
/**
 * U-9+U-11 live-check fixture on sandybrown (wp eval-file qa-close-fixture.php <case>). Idempotent.
 * Merges attributes into the FIRST sgs/nav-drawer block of test drawer 3778 and the FIRST
 * sgs/nav-bar-menu block of test header 3777. Backups (first run only) in post meta
 * _sgs_qa_close_backup. Case "restore" puts both bodies back.
 */

$header_id = 3777;
$drawer_id = 3778;
$case      = isset( $args[0] ) ? (string) $args[0] : 'trigger';

foreach ( array( $header_id, $drawer_id ) as $id ) {
	if ( '' === (string) get_post_meta( $id, '_sgs_qa_close_backup', true ) ) {
		update_post_meta( $id, '_sgs_qa_close_backup', wp_slash( get_post_field( 'post_content', $id ) ) );
	}
}

if ( 'restore' === $case ) {
	foreach ( array( $header_id, $drawer_id ) as $id ) {
		$backup = get_post_meta( $id, '_sgs_qa_close_backup', true );
		wp_update_post( wp_slash( array( 'ID' => $id, 'post_content' => $backup ) ) );
	}
	echo "restored\n";
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
			$json = $attrs ? ' ' . wp_json_encode( $attrs, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) : '';
			return '<!-- wp:' . $block . $json . ' ' . ( $m[2] ?? '' ) . '-->';
		},
		$content,
		1
	);
};

$drawer_sets = array(
	// × omitted: non-modal, "menu button closes it" at every tier, full-screen on mobile.
	'trigger'   => array(
		'modality'              => 'non-modal',
		'closeStyle'            => array( 'desktop' => 'trigger' ),
		'closePlacement'        => null,
		'closeOffset'           => null,
		'accordionExclusive'    => false,
		'closeOnScrollDistance' => 24,
	),
	// Negative control for the × rule: modal keeps the × even with `trigger`.
	'modal'     => array(
		'modality'              => 'modal',
		'closeStyle'            => array( 'desktop' => 'trigger' ),
		'closePlacement'        => null,
		'closeOffset'           => null,
		'accordionExclusive'    => true,
		'closeOnScrollDistance' => null,
	),
	// halcyon: × centred on the burger, nudged +4 / -0.5, radius 12.
	'same-slot' => array(
		'modality'              => 'modal',
		'closeStyle'            => array( 'desktop' => 'separate-x' ),
		'closePlacement'        => array( 'desktop' => 'same-slot' ),
		'closeOffset'           => array( 'desktop' => array( 'x' => 4, 'y' => -0.5 ) ),
		'closeRadius'           => array( 'desktop' => '12px' ),
		'accordionExclusive'    => true,
		'closeOnScrollDistance' => null,
	),
);

$bar_set = array(
	'burgerMorph'         => 'x-rotate',
	'burgerMorphDuration' => 600,
	'burgerMorphEasing'   => 'quart-out',
	'itemMagnetEnabled'   => true,
	'itemMagnetStrength'  => 0.16,
);

if ( ! isset( $drawer_sets[ $case ] ) ) {
	echo "unknown case {$case}\n";
	return;
}

$d = $merge( get_post_field( 'post_content', $drawer_id ), 'sgs/nav-drawer', $drawer_sets[ $case ] );
wp_update_post( wp_slash( array( 'ID' => $drawer_id, 'post_content' => $d ) ) );

$h = $merge( get_post_field( 'post_content', $header_id ), 'sgs/nav-bar-menu', $bar_set );
wp_update_post( wp_slash( array( 'ID' => $header_id, 'post_content' => $h ) ) );

preg_match( '#<!-- wp:sgs/nav-drawer (\{.*?\}) #s', get_post_field( 'post_content', $drawer_id ), $dm );
preg_match( '#<!-- wp:sgs/nav-bar-menu (\{.*?\}) #s', get_post_field( 'post_content', $header_id ), $hm );
echo "case: {$case}\n";
echo 'drawer: ' . ( $dm[1] ?? 'NOT FOUND' ) . "\n";
echo 'bar: ' . ( $hm[1] ?? 'NOT FOUND' ) . "\n";
