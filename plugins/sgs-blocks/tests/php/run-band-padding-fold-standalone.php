<?php
/**
 * Standalone runner for Sgs_Band_Padding_Folder (includes/class-sgs-band-padding-folder.php).
 *
 * The fold of a stored `contentBandPadding` into `padding` is pure array work plus a text patcher
 * over the block comments. WordPress's `parse_blocks()` and `serialize_block_attributes()` are
 * stubbed with the smallest equivalents the fixtures need (a flat run of block comments, JSON
 * attributes), so the patcher and the document-order numbering run without WordPress.
 *
 * Run with:
 *   php plugins/sgs-blocks/tests/php/run-band-padding-fold-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}

if ( ! function_exists( 'parse_blocks' ) ) {
	/**
	 * Stub: one block per opening comment, in document order, attributes decoded from the JSON.
	 *
	 * @param string $content Stored content.
	 * @return array<int,array<string,mixed>>
	 */
	function parse_blocks( $content ) {
		preg_match_all( '/<!--\s+wp:([a-z][a-z0-9_-]*(?:\/[a-z][a-z0-9_-]*)?)(\s+\{.*?\})?(\s*\/)?\s*-->/s', $content, $m, PREG_SET_ORDER );
		$out = array();
		foreach ( $m as $one ) {
			$out[] = array(
				'blockName'   => $one[1],
				'attrs'       => isset( $one[2] ) && '' !== $one[2] ? json_decode( trim( $one[2] ), true ) : array(),
				'innerBlocks' => array(),
			);
		}
		return $out;
	}
}

if ( ! function_exists( 'serialize_block_attributes' ) ) {
	function serialize_block_attributes( $attrs ) {
		return json_encode( $attrs, JSON_UNESCAPED_SLASHES ); // phpcs:ignore WordPress.WP.AlternativeFunctions.json_encode_json_encode -- CLI stub.
	}
}

require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-band-padding-folder.php';

use SGS\Blocks\Sgs_Band_Padding_Folder;

$pass = 0;
$fail = 0;

function ok( bool $cond, string $label ): void {
	global $pass, $fail;
	if ( $cond ) {
		++$pass;
		echo "PASS  $label\n";
	} else {
		++$fail;
		echo "FAIL  $label\n";
	}
}

function same( $expected, $actual, string $label ): void {
	ok( $expected === $actual, $label . ( $expected === $actual ? '' : ' — expected ' . json_encode( $expected ) . ' got ' . json_encode( $actual ) ) ); // phpcs:ignore WordPress.WP.AlternativeFunctions.json_encode_json_encode -- CLI.
}

// A block with no band padding is left alone.
same( null, Sgs_Band_Padding_Folder::fold( array( 'padding' => array( 'desktop' => array( 'top' => '8px' ) ) ) ), 'no contentBandPadding: nothing to fold' );

// Only the band: it becomes `padding`, tiers kept.
$out = Sgs_Band_Padding_Folder::fold(
	array(
		'contentBandPadding' => array(
			'desktop' => array(
				'left'  => '40px',
				'right' => '40px',
			),
			'mobile'  => array(
				'left'  => '20px',
				'right' => '20px',
			),
		),
		'gap'                => '8px',
	)
);
same(
	array(
		'desktop' => array(
			'left'  => '40px',
			'right' => '40px',
		),
		'mobile'  => array(
			'left'  => '20px',
			'right' => '20px',
		),
	),
	$out['attrs']['padding'],
	'band only: the tiers become padding'
);
ok( ! array_key_exists( 'contentBandPadding', $out['attrs'] ), 'band only: contentBandPadding is removed' );
same( '8px', $out['attrs']['gap'], 'band only: other attributes are untouched' );
same( array(), $out['conflicts'], 'band only: no conflict' );

// Both: the band wins on a clash and the clash is reported; an own-only side survives.
$out = Sgs_Band_Padding_Folder::fold(
	array(
		'padding'            => array(
			'desktop' => array(
				'top'  => '10px',
				'left' => '5px',
			),
		),
		'contentBandPadding' => array(
			'desktop' => array(
				'left'   => '40px',
				'bottom' => '12px',
			),
		),
	)
);
same(
	array(
		'top'    => '10px',
		'left'   => '40px',
		'bottom' => '12px',
	),
	$out['attrs']['padding']['desktop'],
	'both: own-only side kept, band wins the clash, band-only side added'
);
same( 1, count( $out['conflicts'] ), 'both: one conflict reported' );
same(
	array(
		'tier' => 'desktop',
		'side' => 'left',
		'own'  => '5px',
		'band' => '40px',
	),
	$out['conflicts'][0],
	'both: the conflict names tier, side and both values'
);

// The same value on both is not a conflict.
$out = Sgs_Band_Padding_Folder::fold(
	array(
		'padding'            => array( 'desktop' => array( 'left' => '40px' ) ),
		'contentBandPadding' => array( 'desktop' => array( 'left' => '40px' ) ),
	)
);
same( array(), $out['conflicts'], 'equal values: no conflict' );

// A flat box (no tier keys) is the desktop tier; an empty band only drops the attribute.
$out = Sgs_Band_Padding_Folder::fold( array( 'contentBandPadding' => array( 'top' => '6px' ) ) );
same( array( 'desktop' => array( 'top' => '6px' ) ), $out['attrs']['padding'], 'flat band box: becomes the desktop tier' );
$out = Sgs_Band_Padding_Folder::fold(
	array(
		'contentBandPadding' => array( 'desktop' => array() ),
		'padding'            => array( 'desktop' => array( 'top' => '1px' ) ),
	)
);
same( array( 'desktop' => array( 'top' => '1px' ) ), $out['attrs']['padding'], 'empty band: padding is unchanged' );
ok( ! array_key_exists( 'contentBandPadding', $out['attrs'] ), 'empty band: the attribute is still removed' );

// The text patcher: only the folded comment's JSON changes, other bytes are kept.
$content = "<!-- wp:sgs/container {\"gap\":\"4px\"} -->\n<div>keep  this</div>\n<!-- /wp:sgs/container -->\n"
	. "<!-- wp:sgs/hero {\"contentBandPadding\":{\"desktop\":{\"left\":\"30px\"}},\"padding\":{\"desktop\":{\"top\":\"9px\"}}} /-->\n"
	. '<!-- wp:paragraph --><p>x</p><!-- /wp:paragraph -->';
$folder  = new Sgs_Band_Padding_Folder();
$result  = $folder->migrate_content( $content );
ok( $result['changed'], 'patcher: the content changed' );
same( 1, count( $result['changes'] ), 'patcher: one block folded' );
same( 'sgs/hero', $result['changes'][0]['block'], 'patcher: the folded block is named' );
ok( false !== strpos( $result['content'], '<!-- wp:sgs/hero {"padding":{"desktop":{"top":"9px","left":"30px"}}} /-->' ), 'patcher: the hero comment carries the folded padding and stays self-closing' );
ok( false !== strpos( $result['content'], "<!-- wp:sgs/container {\"gap\":\"4px\"} -->\n<div>keep  this</div>" ), 'patcher: an untouched block keeps its bytes' );
ok( false === strpos( $result['content'], 'contentBandPadding' ), 'patcher: the retired attribute is gone from the content' );

$clean = $folder->migrate_content( '<!-- wp:sgs/container {"padding":{"desktop":{"top":"1px"}}} --><div></div><!-- /wp:sgs/container -->' );
ok( ! $clean['changed'], 'patcher: content without the retired attribute is not rewritten' );

echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );
