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
	 * Stub: one block per opening comment, in document order, attributes decoded from the JSON. A `test/unparsed`
	 * comment is left out, standing in for a parser that reads fewer blocks than the text holds.
	 *
	 * @param string $content Stored content.
	 * @return array<int,array<string,mixed>>
	 */
	function parse_blocks( $content ) {
		preg_match_all( '/<!--\s+wp:([a-z][a-z0-9_-]*(?:\/[a-z][a-z0-9_-]*)?)(\s+\{.*?\})?(\s*\/)?\s*-->/s', $content, $m, PREG_SET_ORDER );
		$out = array();
		foreach ( $m as $one ) {
			if ( 'test/unparsed' === $one[1] ) {
				continue;
			}
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
		'left'   => 'calc(5px + 40px)',
		'bottom' => '12px',
	),
	$out['attrs']['padding']['desktop'],
	'both: own-only side kept, a side both set is their sum (both painted), band-only side added'
);
same( 1, count( $out['conflicts'] ), 'both: one conflict reported' );
same(
	array(
		'tier' => 'desktop',
		'side' => 'left',
		'own'  => '5px',
		'band' => '40px',
		'sum'  => 'calc(5px + 40px)',
	),
	$out['conflicts'][0],
	'both: the report names tier, side, both values and their sum'
);

// The same value on both painted twice: it is summed and reported.
$out = Sgs_Band_Padding_Folder::fold(
	array(
		'padding'            => array( 'desktop' => array( 'left' => '40px' ) ),
		'contentBandPadding' => array( 'desktop' => array( 'left' => '40px' ) ),
	)
);
same( array( 'left' => 'calc(40px + 40px)' ), $out['attrs']['padding']['desktop'], 'equal values: both painted, so summed' );
same( 1, count( $out['conflicts'] ), 'equal values: the sum is reported' );

// A zero adds nothing (MUST FAIL against band-wins): the block's 11px top and bottom survive the band's 0, and the
// band's 24px sides survive the block's 0; nothing is reported.
$out = Sgs_Band_Padding_Folder::fold(
	array(
		'padding'            => array(
			'desktop' => array(
				'top'    => '11px',
				'right'  => '0',
				'bottom' => '11px',
				'left'   => '0',
			),
		),
		'contentBandPadding' => array(
			'desktop' => array(
				'top'    => '0',
				'right'  => '24px',
				'bottom' => '0',
				'left'   => '24px',
			),
		),
	)
);
same(
	array(
		'top'    => '11px',
		'right'  => '24px',
		'bottom' => '11px',
		'left'   => '24px',
	),
	$out['attrs']['padding']['desktop'],
	'zeros: each side keeps the length the other painted over nothing'
);
same( array(), $out['conflicts'], 'zeros: nothing is reported' );

// A tier with no value paints the larger tier's, on both attributes (MUST FAIL against per-tier-only reading).
$out = Sgs_Band_Padding_Folder::fold(
	array(
		'padding'            => array( 'mobile' => array( 'left' => '10px' ) ),
		'contentBandPadding' => array( 'desktop' => array( 'left' => '24px' ) ),
	)
);
same(
	array(
		'desktop' => array( 'left' => '24px' ),
		'mobile'  => array( 'left' => 'calc(10px + 24px)' ),
	),
	$out['attrs']['padding'],
	'inherited: the mobile side adds the band\'s desktop value it inherited'
);
$out = Sgs_Band_Padding_Folder::fold(
	array(
		'padding'            => array( 'desktop' => array( 'left' => '10px' ) ),
		'contentBandPadding' => array( 'mobile' => array( 'left' => '24px' ) ),
	)
);
same(
	array(
		'desktop' => array( 'left' => '10px' ),
		'mobile'  => array( 'left' => 'calc(10px + 24px)' ),
	),
	$out['attrs']['padding'],
	'inherited: the band\'s mobile side adds the block\'s desktop value it inherited'
);

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

// Comments that do not line up with the parsed blocks: nothing is written and the post is reported as skipped.
$misaligned = $folder->migrate_content( '<!-- wp:test/unparsed /--><!-- wp:sgs/hero {"contentBandPadding":{"desktop":{"left":"30px"}}} /-->' );
ok( ! $misaligned['changed'], 'misaligned comments: the content is not rewritten' );
ok( isset( $misaligned['skipped'] ) && '' !== $misaligned['skipped'], 'misaligned comments: the post is reported as skipped' );
ok( ! isset( $clean['skipped'] ) && ! isset( $result['skipped'] ), 'aligned content: nothing is reported as skipped' );

echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );
