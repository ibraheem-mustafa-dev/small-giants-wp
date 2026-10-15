<?php
/**
 * The motion schema evaluator parity test (Spec 38A FR-38A-55).
 *
 * The PHP evaluator and the JavaScript evaluator must give the same verdict, the first failing keyword path or a pass,
 * on the same schema node and value. Run it with:
 *
 *   php plugins/sgs-blocks/tests/php/run-motion-schema-eval-parity.php
 *
 * Runs every case through `Sgs_Motion_Schema_Eval::evaluate()` and, in one `node` process, through
 * `src/components/motion/field-types/schema-eval.js::createEvaluator()` (the source is copied to a temporary `.mjs`
 * file, so the build and Jest are not needed), then compares the verdicts. Each keyword the two evaluators share has a
 * passing and a failing case. Exits 1 on any disagreement, on a case that does not give its expected verdict, or when
 * node cannot run.
 *
 * Not covered: an empty JSON object and an empty JSON array are one empty PHP array, so `{}` against `minItems` or `[]`
 * against `minProperties` has no JavaScript-equal case.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// CLI test harness (not shipped code).
// phpcs:disable

require_once __DIR__ . '/stubs/motion-render-stubs.php';

use SGS\Blocks\Motion\Sgs_Motion_Schema_Eval;

$plugin = dirname( __DIR__, 2 );
require_once $plugin . '/includes/motion/field-types/class-sgs-motion-schema-eval.php';

$defs = array(
	'named' => array(
		'type'       => 'object',
		'properties' => array( 'a' => array( 'type' => 'number' ) ),
	),
);

$num    = array( 'type' => 'number' );
$closed = array(
	'properties'            => array( 'a' => $num ),
	'unevaluatedProperties' => false,
);
$by_a   = array( 'required' => array( 'a' ) );

// name => array( node, value, expected verdict ).
$cases = array(
	'items pass'                           => array( array( 'items' => $num ), array( 1, 2.5, 3 ), null ),
	'items fail names the index and rule'  => array( array( 'items' => $num ), array( 1, 'x' ), 'items.1.type' ),
	'items nested object path'             => array( array( 'items' => array( 'properties' => array( 'k' => $num ) ) ), array( array( 'k' => 1 ), array( 'k' => 's' ) ), 'items.1.k.type' ),
	'items ignores a string'               => array( array( 'items' => $num ), 'text', null ),
	'items ignores an object'              => array( array( 'items' => $num ), array( 'a' => 'x' ), null ),
	'items true schema'                    => array( array( 'items' => true ), array( 1, 'x' ), null ),
	'items false schema'                   => array( array( 'items' => false ), array( 1 ), 'items.0.false' ),
	'items empty list'                     => array( array( 'items' => false ), array(), null ),
	'maxItems pass at the bound'           => array( array( 'maxItems' => 2 ), array( 1, 2 ), null ),
	'maxItems fail'                        => array( array( 'maxItems' => 2 ), array( 1, 2, 3 ), 'maxItems' ),
	'maxItems ignores a string'            => array( array( 'maxItems' => 1 ), 'abc', null ),
	'minItems pass at the bound'           => array( array( 'minItems' => 2 ), array( 1, 2 ), null ),
	'minItems fail'                        => array( array( 'minItems' => 2 ), array( 1 ), 'minItems' ),
	'minItems fail on an empty list'       => array( array( 'minItems' => 1 ), array(), 'minItems' ),
	'minItems ignores a number'            => array( array( 'minItems' => 2 ), 1, null ),
	'uniqueItems pass'                     => array( array( 'uniqueItems' => true ), array( 1, '1', true, null ), null ),
	'uniqueItems fail on scalars'          => array( array( 'uniqueItems' => true ), array( 'a', 'b', 'a' ), 'uniqueItems' ),
	'uniqueItems fail on 1 and 1.0'        => array( array( 'uniqueItems' => true ), array( 1, 1.0 ), 'uniqueItems' ),
	'uniqueItems fail on equal objects'    => array( array( 'uniqueItems' => true ), array( array( 'a' => 1, 'b' => array( 2 ) ), array( 'a' => 1, 'b' => array( 2 ) ) ), 'uniqueItems' ),
	'uniqueItems pass on unequal objects'  => array( array( 'uniqueItems' => true ), array( array( 'a' => 1 ), array( 'a' => 2 ) ), null ),
	'uniqueItems false does not assert'    => array( array( 'uniqueItems' => false ), array( 1, 1 ), null ),
	'uniqueItems ignores an object'        => array( array( 'uniqueItems' => true ), array( 'a' => 1, 'b' => 1 ), null ),
	'minProperties pass at the bound'      => array( array( 'minProperties' => 2 ), array( 'a' => 1, 'b' => 2 ), null ),
	'minProperties fail'                   => array( array( 'minProperties' => 2 ), array( 'a' => 1 ), 'minProperties' ),
	'minProperties ignores a list'         => array( array( 'minProperties' => 2 ), array( 1 ), null ),
	'minProperties ignores a string'       => array( array( 'minProperties' => 2 ), 'x', null ),
	'maxProperties pass at the bound'      => array( array( 'maxProperties' => 1 ), array( 'a' => 1 ), null ),
	'maxProperties fail'                   => array( array( 'maxProperties' => 1 ), array( 'a' => 1, 'b' => 2 ), 'maxProperties' ),
	'maxProperties ignores a list'         => array( array( 'maxProperties' => 1 ), array( 1, 2, 3 ), null ),
	'unevaluated pass: only declared'      => array( $closed, array( 'a' => 1 ), null ),
	'unevaluated fail: extra name'         => array( $closed, array( 'a' => 1, 'z' => 1 ), 'unevaluatedProperties' ),
	'unevaluated schema accepts extra'     => array( array( 'properties' => array( 'a' => $num ), 'unevaluatedProperties' => $num ), array( 'a' => 1, 'z' => 2 ), null ),
	'unevaluated schema refuses extra'     => array( array( 'properties' => array( 'a' => $num ), 'unevaluatedProperties' => $num ), array( 'a' => 1, 'z' => 'x' ), 'unevaluatedProperties' ),
	'unevaluated sees ref names'           => array( array( '$ref' => '#/$defs/named', 'unevaluatedProperties' => false ), array( 'a' => 1 ), null ),
	'unevaluated ref still refuses extra'  => array( array( '$ref' => '#/$defs/named', 'unevaluatedProperties' => false ), array( 'a' => 1, 'z' => 1 ), 'unevaluatedProperties' ),
	'unevaluated sees allOf names'         => array( array( 'allOf' => array( array( 'properties' => array( 'b' => $num ) ) ), 'unevaluatedProperties' => false ), array( 'b' => 1 ), null ),
	'unevaluated allOf refuses extra'      => array( array( 'allOf' => array( array( 'properties' => array( 'b' => $num ) ) ), 'unevaluatedProperties' => false ), array( 'b' => 1, 'c' => 1 ), 'unevaluatedProperties' ),
	'unevaluated skips an unmet then'      => array( array( 'if' => $by_a, 'then' => array( 'properties' => array( 'b' => $num ) ), 'unevaluatedProperties' => false ), array( 'b' => 2 ), 'unevaluatedProperties' ),
	'unevaluated sees the then names'      => array( array( 'if' => $by_a, 'then' => array( 'properties' => array( 'a' => $num, 'b' => $num ) ), 'unevaluatedProperties' => false ), array( 'a' => 1, 'b' => 2 ), null ),
	'unevaluated sees the else names'      => array( array( 'if' => $by_a, 'else' => array( 'properties' => array( 'b' => $num ) ), 'unevaluatedProperties' => false ), array( 'b' => 2 ), null ),
	'unevaluated ignores a list'           => array( $closed, array( 1, 2 ), null ),
	'unevaluated ignores a string'         => array( $closed, 'x', null ),
	'keyword order: type before items'     => array( array( 'type' => 'array', 'items' => $num ), 'x', 'type' ),
	'unknown keyword is still unsupported' => array( array( 'contains' => $num ), array( 1 ), 'unsupported:contains' ),
);

$node_script = <<<'JS'
import { readFileSync } from 'node:fs';
const [ , , moduleFile, casesFile ] = process.argv;
const { createEvaluator } = await import( 'file:///' + moduleFile.replace( /\\/g, '/' ) );
const { defs, cases } = JSON.parse( readFileSync( casesFile, 'utf8' ) );
const evaluate = createEvaluator( defs );
process.stdout.write( JSON.stringify( cases.map( ( c ) => evaluate( c.node, c.value ) ) ) );
JS;

$tmp = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'sgs-schema-eval-parity-' . getmypid();
mkdir( $tmp );
$cleanup = static function () use ( $tmp ): void {
	foreach ( glob( $tmp . '/*' ) ?: array() as $file ) {
		unlink( $file );
	}
	rmdir( $tmp );
};

// The evaluator imports its value helpers from a sibling module; both are copied as `.mjs` so Node reads them as ES modules.
$eval_dir = $plugin . '/src/components/motion/field-types/';
file_put_contents( $tmp . '/schema-eval.mjs', str_replace( "'./schema-eval-values'", "'./schema-eval-values.mjs'", (string) file_get_contents( $eval_dir . 'schema-eval.js' ) ) );
file_put_contents( $tmp . '/schema-eval-values.mjs', (string) file_get_contents( $eval_dir . 'schema-eval-values.js' ) );
file_put_contents( $tmp . '/run.mjs', $node_script );
$payload = array(
	'defs'  => $defs,
	'cases' => array_map(
		static fn( $case ) => array(
			'node'  => $case[0],
			'value' => $case[1],
		),
		array_values( $cases )
	),
);
file_put_contents( $tmp . '/cases.json', json_encode( $payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION ) );

$command = 'node ' . escapeshellarg( $tmp . '/run.mjs' ) . ' ' . escapeshellarg( $tmp . '/schema-eval.mjs' ) . ' ' . escapeshellarg( $tmp . '/cases.json' ) . ' 2>&1';
$raw     = (string) shell_exec( $command );
$js      = json_decode( $raw, true );
$cleanup();

if ( ! is_array( $js ) || count( $js ) !== count( $cases ) ) {
	fwrite( STDERR, "FAIL: the JavaScript evaluator did not return one verdict per case.\n" . $raw . "\n" );
	exit( 1 );
}

$eval   = new Sgs_Motion_Schema_Eval( $defs );
$pass   = 0;
$failed = 0;
$index  = 0;
foreach ( $cases as $name => $case ) {
	list( $node, $value, $expect ) = $case;
	$php_verdict                   = $eval->evaluate( $node, Sgs_Motion_Schema_Eval::normalise( $value ) );
	$js_verdict                    = $js[ $index++ ];
	if ( $php_verdict === $js_verdict && $php_verdict === $expect ) {
		++$pass;
		continue;
	}
	++$failed;
	fwrite(
		STDERR,
		sprintf(
			"FAIL %s: expected %s, php %s, js %s\n",
			$name,
			var_export( $expect, true ),
			var_export( $php_verdict, true ),
			var_export( $js_verdict, true )
		)
	);
}

echo "motion schema-eval parity: {$pass} passed, {$failed} failed of " . count( $cases ) . "\n";
exit( $failed > 0 ? 1 : 0 );
