<?php
/**
 * Standalone runner: every form field submits under a name the submit endpoint accepts (Spec 04 "Field Blocks —
 * Common Attributes", submission name).
 *
 * Renders the REAL src/blocks/form-field-<type>/render.php of every field block on disk through the QA harness
 * (scripts/qa/lib/render-css-harness.php, a child PHP process per render) and checks each named control:
 *   - the name is never empty (the browser drops an unnamed control from the submission);
 *   - with any trailing "[]" removed (the form runtime strips it) it passes the key pattern
 *     Form_Rest_Submission::validate_fields() enforces, so the endpoint never refuses the whole submission;
 *   - fieldName wins when set, otherwise the label's slug, otherwise a numbered "field-N";
 *   - the file field's attachment-ID carrier has no name (it was submitted as a stray "_id" column).
 * Then loads the real field-render-helpers.php in this process to check that two derived names never collide, that a
 * composite address field leaves room for its longest suffix (a 60-character fieldName still submits valid keys), and
 * that names are unique per form render: an explicit fieldName wins over an earlier derived name, and the same form
 * rendered twice in one request gives identical names.
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-form-field-names-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

$plugin  = dirname( __DIR__, 2 );
$harness = $plugin . '/scripts/qa/lib/render-css-harness.php';
$failed  = 0;
$passed  = 0;

/** The key pattern Form_Rest_Submission::validate_fields() accepts. */
const NAMES_SERVER_KEY = '/^[A-Za-z0-9_\-]{1,64}$/';

/**
 * Render a block through the harness.
 *
 * @param string $harness Harness path.
 * @param string $slug    Block slug.
 * @param array  $attrs   Attributes.
 * @return string HTML.
 */
function names_render( string $harness, string $slug, array $attrs ): string {
	$file = tempnam( sys_get_temp_dir(), 'sgsfn' );
	file_put_contents( $file, json_encode( (object) $attrs, JSON_THROW_ON_ERROR ) );
	$ctx = tempnam( sys_get_temp_dir(), 'sgsfc' );
	file_put_contents( $ctx, '{}' );
	// The consent block calls sgs_rich_text_kses(), which the plugin bootstrap (not the harness) loads.
	$prepend = tempnam( sys_get_temp_dir(), 'sgsfp' );
	file_put_contents( $prepend, '<?php if ( ! function_exists( "sgs_rich_text_kses" ) ) { function sgs_rich_text_kses( $html ): string { return (string) $html; } }' );
	$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' -d auto_prepend_file=' . escapeshellarg( $prepend ) . ' ' . escapeshellarg( $harness ) . ' --slug ' . escapeshellarg( $slug ) . ' --attrs-file ' . escapeshellarg( $file ) . ' --context-file ' . escapeshellarg( $ctx ) . ' 2>&1' );
	unlink( $file );
	unlink( $ctx );
	unlink( $prepend );
	$decoded = json_decode( $out, true );
	if ( ! is_array( $decoded ) || empty( $decoded['ok'] ) ) {
		fwrite( STDERR, "harness failed for $slug: $out\n" );
		exit( 2 );
	}
	return (string) $decoded['html'];
}

/**
 * Record one check.
 *
 * @param string $name Check name.
 * @param bool   $ok   Result.
 */
function names_check( string $name, bool $ok ): void {
	global $failed, $passed;
	if ( $ok ) {
		++$passed;
		echo "PASS $name\n";
		return;
	}
	++$failed;
	echo "FAIL $name\n";
}

/**
 * Every form control tag (input, select, textarea) in the markup.
 *
 * @param string $html Markup.
 * @return string[] Opening tags.
 */
function names_controls( string $html ): array {
	preg_match_all( '#<(?:input|select|textarea)\b[^>]*>#', $html, $m );
	return $m[0];
}

/**
 * The name attribute of a tag, or null when it has none.
 *
 * @param string $tag Opening tag.
 * @return string|null Name.
 */
function names_attr( string $tag ): ?string {
	return 1 === preg_match( '#\sname="([^"]*)"#', $tag, $m ) ? html_entity_decode( $m[1], ENT_QUOTES ) : null;
}

/**
 * The distinct submission names in the markup.
 *
 * @param string $html Markup.
 * @return string[] Names.
 */
function names_all( string $html ): array {
	$out = array();
	foreach ( names_controls( $html ) as $tag ) {
		$name = names_attr( $tag );
		if ( null !== $name ) {
			$out[ $name ] = true;
		}
	}
	return array_keys( $out );
}

// Attributes every field block understands enough to render its controls. fieldName is '' as block.json's
// default stores it.
$shared = array(
	'fieldName'    => '',
	'label'        => 'Enquiry type',
	'options'      => array( 'a', 'b' ),
	'tiles'        => array(
		array( 'value' => 'x', 'label' => 'X' ),
		array( 'value' => 'y', 'label' => 'Y' ),
	),
	'fields'       => array( 'line1', 'postcode' ),
	'consentText'  => 'I agree',
	'defaultValue' => 'website',
);

// 1. Every field block on disk, with no fieldName: every control is named, and the name passes the endpoint.
$blocks = glob( $plugin . '/src/blocks/form-field-*', GLOB_ONLYDIR );
names_check( 'found the field blocks', is_array( $blocks ) && count( $blocks ) >= 14 );
foreach ( $blocks as $dir ) {
	$slug     = 'sgs/' . basename( $dir );
	$html     = names_render( $harness, $slug, $shared );
	$controls = names_controls( $html );
	names_check( "$slug renders a control", count( $controls ) > 0 );
	foreach ( $controls as $tag ) {
		if ( str_contains( $tag, 'data-file-id' ) ) {
			names_check( "$slug attachment-ID carrier has no name (no stray column)", null === names_attr( $tag ) );
			continue;
		}
		if ( str_contains( $tag, 'name="sgs_hp_' ) ) {
			continue;
		}
		$name = names_attr( $tag );
		names_check( "$slug control is named: " . substr( $tag, 0, 60 ), null !== $name && '' !== $name );
		$key = preg_replace( '/\[\]$/', '', (string) $name );
		names_check( "$slug name \"$name\" passes the submit endpoint's key pattern", 1 === preg_match( NAMES_SERVER_KEY, (string) $key ) );
	}
}

// 2. The tile field (the proven fault): the label names it when fieldName is empty.
$tiles = static fn( array $a ): string => names_render( $harness, 'sgs/form-field-tiles', array_merge( $shared, $a ) );
names_check( 'tiles: label names the field', array( 'enquiry-type' ) === names_all( $tiles( array() ) ) );
names_check( 'tiles: multi-select keeps the list marker', array( 'enquiry-type[]' ) === names_all( $tiles( array( 'multiSelect' => true ) ) ) );
names_check( 'tiles: fieldName wins over the label', array( 'service' ) === names_all( $tiles( array( 'fieldName' => 'service' ) ) ) );
names_check( 'tiles: no label and no fieldName gives a numbered name', 1 === preg_match( '/^field-[a-z0-9-]+$/', implode( ',', names_all( $tiles( array( 'label' => '' ) ) ) ) ) );
$long = names_all( $tiles( array( 'label' => str_repeat( 'Which of our many services ', 6 ) ) ) );
names_check( 'tiles: a long label is cut to a key the endpoint accepts', 1 === count( $long ) && 1 === preg_match( NAMES_SERVER_KEY, $long[0] ) );
names_check( 'tiles: a label of punctuation only falls back to the numbered name', 1 === preg_match( '/^field-/', implode( ',', names_all( $tiles( array( 'label' => '?!' ) ) ) ) ) );

// 3. The file field (the proven fault): one named file input, no "_id" companion.
$file = names_render( $harness, 'sgs/form-field-file', $shared );
names_check( 'file: the file input carries the label name', array( 'enquiry-type' ) === names_all( $file ) );
names_check( 'file: no name ends in _id', ! str_contains( $file, '_id"' ) );
names_check( 'file: the carrier still names its field for the upload script', str_contains( $file, 'data-file-field="enquiry-type"' ) );

// 4. One naming rule for every field: fieldName is the submission key as written (Spec 04), never prefixed.
foreach ( array( 'text', 'email', 'select', 'radio', 'number', 'textarea', 'date', 'phone', 'hidden', 'file', 'tiles' ) as $type ) {
	$names = names_all( names_render( $harness, "sgs/form-field-$type", array_merge( $shared, array( 'fieldName' => 'business_name' ) ) ) );
	names_check( "$type: fieldName is the submission key", array( 'business_name' ) === $names );
}
names_check( 'checkbox: fieldName plus the list marker', array( 'business_name[]' ) === names_all( names_render( $harness, 'sgs/form-field-checkbox', array_merge( $shared, array( 'fieldName' => 'business_name' ) ) ) ) );
names_check( 'fieldName is cleaned to a key the endpoint accepts', array( 'businessname' ) === names_all( names_render( $harness, 'sgs/form-field-text', array_merge( $shared, array( 'fieldName' => 'Business Name"' ) ) ) ) );
names_check( 'text: label names the field when fieldName is empty', array( 'your-name' ) === names_all( names_render( $harness, 'sgs/form-field-text', array_merge( $shared, array( 'label' => 'Your name' ) ) ) ) );
names_check( 'consent: unnamed and unlabelled submits as consent', array( 'consent' ) === names_all( names_render( $harness, 'sgs/form-field-consent', array( 'fieldName' => '', 'consentText' => 'I agree' ) ) ) );

// 5. Address sub-fields submit as <name>-<part>; the postcode lookup box submits the postcode.
$addr = names_all( names_render( $harness, 'sgs/form-field-address', array_merge( $shared, array( 'fieldName' => 'site' ) ) ) );
names_check( 'address: sub-fields are <name>-<part>', array( 'site-line1', 'site-postcode' ) === $addr );
$addr = names_all( names_render( $harness, 'sgs/form-field-address', array_merge( $shared, array( 'fieldName' => 'site', 'enableLookup' => true ) ) ) );
names_check( 'address: the lookup box submits the postcode', in_array( 'site-postcode', $addr, true ) );

// 5a. A long address name (MUST FAIL before the suffix reserve): a 60-character fieldName gave "<60 chars>-postcode",
// which the endpoint refused, so every submission of the form failed with 400.
$long_name = str_repeat( 'a', 60 );
$all_parts = array( 'line1', 'line2', 'city', 'county', 'postcode', 'country' );
foreach ( array( false, true ) as $lookup ) {
	$addr  = names_all( names_render( $harness, 'sgs/form-field-address', array_merge( $shared, array( 'fieldName' => $long_name, 'fields' => $all_parts, 'enableLookup' => $lookup ) ) ) );
	$label = $lookup ? 'with the lookup box' : 'without the lookup box';
	names_check( "address: a 60-character fieldName renders every part ($label)", 6 === count( $addr ) );
	$bad = array_filter( $addr, static fn( string $n ): bool => 1 !== preg_match( NAMES_SERVER_KEY, $n ) );
	names_check( "address: a 60-character fieldName submits keys the endpoint accepts ($label): " . implode( ',', $bad ), array() === $bad );
	names_check( "address: a 60-character fieldName keeps its parts distinct ($label)", count( array_unique( $addr ) ) === count( $addr ) );
	names_check( "address: a 60-character fieldName keeps as much of the name as fits ($label)", in_array( substr( $long_name, 0, 55 ) . '-postcode', $addr, true ) );
}
$addr = names_all( names_render( $harness, 'sgs/form-field-address', array_merge( $shared, array( 'label' => str_repeat( 'Where should we send it ', 5 ), 'fields' => $all_parts ) ) ) );
$bad  = array_filter( $addr, static fn( string $n ): bool => 1 !== preg_match( NAMES_SERVER_KEY, $n ) );
names_check( 'address: a long label submits keys the endpoint accepts', 6 === count( $addr ) && array() === $bad );

// 6. A conditional field watches the cleaned name the watched field submits under.
$cond = names_render( $harness, 'sgs/form-field-text', array_merge( $shared, array( 'conditionalField' => 'Business_Type' ) ) );
names_check( 'conditional field name is cleaned the same way', str_contains( $cond, 'data-conditional-field="business_type"' ) );

// 7. In process: derived names never collide on one page; fieldName is never renamed.
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', $plugin . '/' );
}
require_once $plugin . '/scripts/qa/lib/wp-stubs.php';
require_once $plugin . '/includes/forms/field-render-helpers.php';
$n1 = \SGS\Blocks\Forms\field_submission_name( 'sgs-field-1', array( 'label' => 'Email' ) );
$n2 = \SGS\Blocks\Forms\field_submission_name( 'sgs-field-2', array( 'label' => 'Email' ) );
$n3 = \SGS\Blocks\Forms\field_submission_name( 'sgs-field-3', array( 'fieldName' => 'email-2' ) );
$n4 = \SGS\Blocks\Forms\field_submission_name( 'sgs-field-4', array( 'label' => 'Email' ) );
names_check( 'first derived name is the label slug', 'email' === $n1 );
names_check( 'second field with the same label gets its own name', 'email-2' === $n2 );
names_check( 'outside a form, fieldName is used as written even when a derived name took it', 'email-2' === $n3 );
names_check( 'a later derived name skips every name already used', 'email-3' === $n4 );
$n5 = \SGS\Blocks\Forms\field_submission_name( 'sgs-field-9', array( 'label' => '' ) );
$n6 = \SGS\Blocks\Forms\field_submission_name( 'sgs-field-9', array( 'label' => '' ) );
names_check( 'numbered names never collide', 'field-9' === $n5 && 'field-9-2' === $n6 );

// 8. In process, inside a form: names are unique per form render (field-name-scope.php), driven through the same
// filter callbacks WordPress calls as an sgs/form block renders.
$functions_present = function_exists( '\SGS\Blocks\Forms\field_names_on_render_block_data' ) && function_exists( '\SGS\Blocks\Forms\field_names_on_render_form' );
names_check( 'the form naming-scope filter callbacks exist', $functions_present );

/**
 * WordPress's render_block_data call for a block, when the scope callbacks exist (the cases below still run, and
 * fail, against code without them).
 *
 * @param array $block Parsed block.
 */
function names_open( array $block ): void {
	if ( function_exists( '\SGS\Blocks\Forms\field_names_on_render_block_data' ) ) {
		\SGS\Blocks\Forms\field_names_on_render_block_data( $block );
	}
}

/**
 * WordPress's render_block_sgs/form call, when the scope callbacks exist.
 */
function names_close(): void {
	if ( function_exists( '\SGS\Blocks\Forms\field_names_on_render_form' ) ) {
		\SGS\Blocks\Forms\field_names_on_render_form( '' );
	}
}

/**
 * Render one form's fields in order through the scope callbacks and return their names.
 *
 * @param array $form   Parsed sgs/form block.
 * @param array $fields Each [ field id, attributes ] in render order.
 * @return string[] Names in render order.
 */
function names_render_form( array $form, array $fields ): array {
	names_open( $form );
	$out = array();
	foreach ( $fields as $field ) {
		$out[] = \SGS\Blocks\Forms\field_submission_name( $field[0], $field[1] );
	}
	names_close();
	return $out;
}

// An unnamed "Contact email" field rendered first, then a field whose fieldName is "contact-email" (MUST FAIL before the
// reservation: both submitted as "contact-email", so one value overwrote the other). The named field sits inside a step,
// so the reservation reaches nested fields.
$form   = array(
	'blockName'   => 'sgs/form',
	'attrs'       => array(),
	'innerBlocks' => array(
		array( 'blockName' => 'sgs/form-field-email', 'attrs' => array( 'label' => 'Contact email' ), 'innerBlocks' => array() ),
		array(
			'blockName'   => 'sgs/form-step',
			'attrs'       => array(),
			'innerBlocks' => array(
				array( 'blockName' => 'sgs/form-field-email', 'attrs' => array( 'fieldName' => 'contact-email', 'label' => 'Work email' ), 'innerBlocks' => array() ),
			),
		),
		array( 'blockName' => 'sgs/form-field-text', 'attrs' => array( 'label' => 'Your name' ), 'innerBlocks' => array() ),
	),
);
$fields = array(
	array( 'sgs-field-a', array( 'label' => 'Contact email' ) ),
	array( 'sgs-field-contact-email', array( 'fieldName' => 'contact-email', 'label' => 'Work email' ) ),
	array( 'sgs-field-b', array( 'label' => 'Your name' ) ),
);
$first  = names_render_form( $form, $fields );
names_check( 'in a form: an explicit fieldName wins over an earlier derived name: ' . implode( ',', $first ), array( 'contact-email-2', 'contact-email', 'your-name' ) === $first );
names_check( 'in a form: no two fields share a name', count( array_unique( $first ) ) === count( $first ) );

// The same form rendered a second time in one request (a pattern preview, a query loop) (MUST FAIL before the
// per-form scope: the request-wide record renamed every derived field to "-2").
$second = names_render_form( $form, $fields );
names_check( 'two renders of one form give identical names: ' . implode( ',', $second ), $first === $second );

// A form rendered inside another form's render (a linked saved form) gets its own scope and hands the outer
// form's scope back intact.
names_open( array( 'blockName' => 'sgs/form', 'attrs' => array(), 'innerBlocks' => array() ) );
$outer_a = \SGS\Blocks\Forms\field_submission_name( 'sgs-field-o1', array( 'label' => 'Phone' ) );
$inner   = names_render_form( $form, $fields );
$outer_b = \SGS\Blocks\Forms\field_submission_name( 'sgs-field-o2', array( 'label' => 'Phone' ) );
names_close();
names_check( 'a nested form keeps its own names', $first === $inner );
names_check( 'the outer form keeps its own record after a nested form', 'phone' === $outer_a && 'phone-2' === $outer_b );

// A block that is not sgs/form opens no scope: an unnamed field outside a form still claims from the base scope.
names_open( array( 'blockName' => 'sgs/container', 'attrs' => array(), 'innerBlocks' => array() ) );
$base_a = \SGS\Blocks\Forms\field_submission_name( 'sgs-field-x', array( 'label' => 'Base check' ) );
$base_b = \SGS\Blocks\Forms\field_submission_name( 'sgs-field-y', array( 'label' => 'Base check' ) );
names_check( 'a non-form block opens no scope', 'base-check' === $base_a && 'base-check-2' === $base_b );

// A long address fieldName is reserved as the address renders it (cut for its suffix), and the derived base of a
// composite field leaves room for its suffix and the counter.
$reserve = function_exists( '\SGS\Blocks\Forms\field_name_suffix_reserve' ) ? \SGS\Blocks\Forms\field_name_suffix_reserve( 'sgs/form-field-address' ) : 0;
names_check( 'the address reserve fits its longest part ("-postcode")', 9 === $reserve );
$derived = \SGS\Blocks\Forms\field_submission_name( 'sgs-field-z', array( 'label' => str_repeat( 'x', 80 ) ), $reserve );
names_check( 'a composite derived name plus its suffix fits the key', strlen( $derived . '-postcode' ) <= 64 );

echo "\n$passed passed, $failed failed\n";
exit( $failed > 0 ? 1 : 0 );
