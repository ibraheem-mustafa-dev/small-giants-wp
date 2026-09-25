<?php
/**
 * Live WP test for sgs/container's "Scroll sideways" setting through
 * SGS_Container_Wrapper::render() (render_block on WordPress).
 *
 * Checks: a container whose ONLY setting is scrollSideways {mobile:on} (layout
 * default, no band props) still mints a uid, renders its .sgs-container__inner,
 * and puts the row rules on `.{uid}>.sgs-container__inner` inside the mobile
 * range with the item width; a grid container with a content width does the
 * same; with the horizontal-panel effect the setting emits nothing; a container
 * without the setting emits no scroll rule. Negative control: run on a site
 * without the change, the scroll checks fail.
 *
 *   wp eval-file wp-eval-container-scroll-row.php
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped

$child  = static function ( string $text ): array {
	return array(
		'blockName'    => 'sgs/container',
		'attrs'        => array( 'layout' => 'stack' ),
		'innerBlocks'  => array(),
		'innerHTML'    => $text,
		'innerContent' => array( $text ),
	);
};
$render = static function ( array $attrs ) use ( $child ): array {
	$GLOBALS['sgs_collected_css'] = array();
	$html                          = render_block(
		array(
			'blockName'    => 'sgs/container',
			'attrs'        => $attrs,
			'innerBlocks'  => array( $child( 'A' ), $child( 'B' ) ),
			'innerHTML'    => '',
			'innerContent' => array( null, null ),
		)
	);
	$css = implode( "\n", (array) ( $GLOBALS['sgs_collected_css'] ?? array() ) )
		. implode( "\n", preg_match_all( '#<style[^>]*>(.*?)</style>#s', $html, $mm ) ? $mm[1] : array() );
	return array( $html, $css );
};

$pass = 0;
$fail = 0;
$ok   = static function ( bool $cond, string $label ) use ( &$pass, &$fail ) {
	$cond ? ++$pass : ++$fail;
	echo ( $cond ? 'PASS  ' : 'FAIL  ' ) . $label . "\n";
};

list( $html, $css ) = $render( array( 'scrollSideways' => array( 'desktop' => 'off', 'mobile' => 'on' ), 'scrollItemWidth' => array( 'mobile' => '236px' ) ) );
preg_match( '#sgs-container-([0-9a-f]{8})#', $html, $u );
$uid = isset( $u[1] ) ? 'sgs-container-' . $u[1] : '';
$ok( '' !== $uid, '1 a container with only the setting mints a uid' );
$ok( false !== strpos( $html, 'class="sgs-container__inner"' ), '2 it renders its inner element' );
$ok( '' !== $uid && false !== strpos( $css, '@media (max-width:767px){.' . $uid . '>.sgs-container__inner{display:flex;flex-direction:row;flex-wrap:nowrap;' ), '3 the row rules sit on the inner, in the mobile range' );
$ok( '' !== $uid && false !== strpos( $css, '.' . $uid . '>.sgs-container__inner>*{flex:0 0 236px;' ), '4 items take the item width' );

list( $html2, $css2 ) = $render( array( 'layout' => 'grid', 'columns' => array( 'desktop' => 2 ), 'contentWidth' => array( 'desktop' => 'normal' ), 'scrollSideways' => array( 'mobile' => 'on' ) ) );
$ok( (bool) preg_match( '#\.sgs-container-[0-9a-f]{8}>\.sgs-container__inner\{display:flex;flex-direction:row#', $css2 ), '5 a banded grid container: the row is its inner' );

list( $html3, $css3 ) = $render( array( 'fx' => 'horizontal-panel', 'scrollSideways' => array( 'mobile' => 'on' ) ) );
$ok( false === strpos( $css3, 'scroll-snap-type:x mandatory;-webkit' ), '6 with the horizontal-panel effect the setting emits nothing' );

list( $html4, $css4 ) = $render( array( 'layout' => 'grid', 'columns' => array( 'desktop' => 2 ) ) );
$ok( false === strpos( $css4, 'scroll-snap' ), '7 a container without the setting emits no scroll rule' );

echo "\n{$pass} passed, {$fail} failed\n";
