<?php
/**
 * Live WP test for sgs/icon-list's per-item description line (Wave 3C lane A,
 * the numbered compact-links pattern's rows).
 *
 * Renders a real block through WordPress (render_block) and checks: a linked
 * item's description sits INSIDE its link (one click target) as a
 * `.sgs-icon-list__description` span; an unlinked item's sits in its text span;
 * an item without one renders no description span; the description is escaped;
 * `descriptionColour` and `descriptionFontSize` emit scoped rules.
 * Negative control: run against a site without the change, every check fails.
 *
 *   wp eval-file wp-eval-icon-list-description.php
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped

$attrs = array(
	'markerType'          => 'numbered',
	'numberFormat'        => 'decimal-leading-zero',
	'descriptionColour'   => '#0a7ea8',
	'descriptionFontSize' => array( 'desktop' => 13 ),
	'items'               => array(
		array(
			'text'        => 'Our Story',
			'url'         => '/about/',
			'description' => 'Three decades of heritage <b>&</b> care',
		),
		array(
			'text'        => 'Careers',
			'description' => 'Join the team',
		),
		array( 'text' => 'Contact' ),
	),
);
$html  = render_block(
	array(
		'blockName'    => 'sgs/icon-list',
		'attrs'        => $attrs,
		'innerBlocks'  => array(),
		'innerHTML'    => '',
		'innerContent' => array(),
	)
);
$css   = implode( "\n", array_map( static fn( $m ) => $m, (array) ( preg_match_all( '#<style[^>]*>(.*?)</style>#s', $html, $mm ) ? $mm[1] : array() ) ) );
// On the front end, includes/class-sgs-css-registry.php::sgs_lift_block_css()
// lifts the block's <style> into this collector instead of leaving it inline.
$css .= implode( "\n", (array) ( $GLOBALS['sgs_collected_css'] ?? array() ) );

$pass = 0;
$fail = 0;
$ok   = static function ( bool $cond, string $label ) use ( &$pass, &$fail ) {
	$cond ? ++$pass : ++$fail;
	echo ( $cond ? 'PASS  ' : 'FAIL  ' ) . $label . "\n";
};

$ok( (bool) preg_match( '#<a [^>]*class="sgs-icon-list__item-link"[^>]*>.*?<span class="sgs-icon-list__description">Three decades of heritage &lt;b&gt;&amp;&lt;/b&gt; care</span></a>#s', $html ), '1 linked item: escaped description inside its link' );
$ok( (bool) preg_match( '#<span class="sgs-icon-list__text">[^<]*Careers<span class="sgs-icon-list__description">Join the team</span></span>#s', $html ), '2 unlinked item: description inside its text span' );
$ok( 2 === substr_count( $html, 'sgs-icon-list__description' ), '3 an item without a description renders none (2 spans for 3 items)' );
$ok( (bool) preg_match( '~\.sgs-icon-list__description\{color:#0a7ea8;?\}~i', $html . $css ), '4 descriptionColour emits a scoped rule' );
$ok( (bool) preg_match( '#\.sgs-icon-list__description\{[^}]*font-size:13px#i', $html . $css ), '5 descriptionFontSize emits a scoped rule' );

echo "\n{$pass} passed, {$fail} failed\n";
