<?php
/**
 * Tests: the SGS icon library security gate.
 *
 * A library icon lands in includes/lucide-icons.php, which blocks echo. Two tools
 * validate one shared definition (assets/icons/svg-allowlist.json):
 *
 *   - scripts/generate-icons.js  validates the RAW library and refuses on any hit.
 *   - scripts/promote-icon.py    normalises a proposal, refusing on any hit or dropping
 *                                what it can safely drop.
 *
 * This test runs both over one hostile corpus and fails if they disagree: the generator
 * must refuse every hostile SVG, and promote-icon must either refuse it too or emit
 * markup the generator accepts and that no longer contains the hostile construct.
 *
 * Set SGS_TEST_GENERATOR / SGS_TEST_PROMOTE to point at mutated copies (negative controls).
 *
 * @package SGS\Blocks\Tests
 */

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class IconLibrarySecurityTest extends TestCase {

	private string $tmp;

	private const V = 'viewBox="0 0 24 24"';

	protected function setUp(): void {
		if ( false === strpos( (string) shell_exec( 'node --version 2>&1' ), 'v' ) ) {
			$this->markTestSkipped( 'node is required to run scripts/generate-icons.js' );
		}
		if ( false === strpos( (string) shell_exec( 'python --version 2>&1' ), 'Python 3' ) ) {
			$this->markTestSkipped( 'python 3 is required to run scripts/promote-icon.py' );
		}
		if ( false === stripos( (string) shell_exec( 'php --version 2>&1' ), 'PHP' ) ) {
			$this->markTestSkipped( 'php must be on PATH (promote-icon.py reads the kses allowlist through it)' );
		}
		$this->tmp = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'sgs-icon-sec-' . bin2hex( random_bytes( 6 ) );
		mkdir( $this->tmp, 0777, true );
	}

	protected function tearDown(): void {
		if ( isset( $this->tmp ) && is_dir( $this->tmp ) ) {
			$this->remove_dir( $this->tmp );
		}
	}

	private function remove_dir( string $dir ): void {
		foreach ( scandir( $dir ) ?: array() as $entry ) {
			if ( '.' === $entry || '..' === $entry ) {
				continue;
			}
			$path = $dir . DIRECTORY_SEPARATOR . $entry;
			is_dir( $path ) ? $this->remove_dir( $path ) : unlink( $path );
		}
		rmdir( $dir );
	}

	/**
	 * The hostile corpus.
	 *
	 * expect: 'refused'   promote-icon.py must refuse it (reason contains the fragment);
	 *         'sanitised' promote-icon.py may drop the construct instead: its output must
	 *                     pass the generator and no longer contain the marker.
	 *
	 * @return array<string, array{0: string, 1: string, 2: string}> svg, python expectation, fragment/marker.
	 */
	public static function hostile_corpus(): array {
		$v = self::V;
		return array(
			'use href'              => array( "<svg $v><use href='https://evil/x.svg#a'/></svg>", 'refused', '<use>' ),
			'use xlink:href'        => array( "<svg xmlns:xlink='http://www.w3.org/1999/xlink' $v><use xlink:href='#a'/></svg>", 'refused', '<use>' ),
			'image href'            => array( "<svg $v><image href='https://evil/x.png'/></svg>", 'refused', '<image>' ),
			'style element'         => array( "<svg $v><style>*{background:url(https://evil/)}</style></svg>", 'refused', '<style>' ),
			'foreignObject'         => array( "<svg $v><foreignObject><div/></foreignObject></svg>", 'refused', '<foreignobject>' ),
			'animate'               => array( "<svg $v><path d='M1 1'><animate attributeName='href' to='https://evil/x.svg'/></path></svg>", 'refused', '<animate>' ),
			'animateTransform'      => array( "<svg $v><path d='M1 1'><animateTransform attributeName='transform'/></path></svg>", 'refused', '<animatetransform>' ),
			'script element'        => array( "<svg $v><script>alert(1)</script></svg>", 'refused', 'script' ),
			'onload on root'        => array( "<svg $v onload='x()'><path d='M1 1'/></svg>", 'refused', 'event-handler' ),
			'onclick on path'       => array( "<svg $v><path d='M1 1' onclick='x()'/></svg>", 'refused', 'event-handler' ),
			'mixed-case OnClick'    => array( "<svg $v><path d='M1 1' OnClick='x()'/></svg>", 'refused', 'event-handler' ),
			'javascript: value'     => array( "<svg $v><path d='M1 1' data-x='javascript:alert(1)'/></svg>", 'refused', 'javascript' ),
			'doctype and entity'    => array( "<!DOCTYPE svg [<!ENTITY x 'y'>]><svg $v><path d='M1 1'/></svg>", 'refused', 'DOCTYPE' ),
			'url paint'             => array( "<svg $v><path d='M1 1' fill='url(https://evil/x)'/></svg>", 'refused', 'url(' ),
			'entity-encoded url'    => array( "<svg $v><path d='M1 1' fill='&#117;rl(https://evil/x)'/></svg>", 'refused', 'url(' ),
			'href on a path'        => array( "<svg $v><path d='M1 1' href='https://evil'/></svg>", 'refused', 'href' ),
			'anchor element'        => array( "<svg $v><a href='https://evil'><path d='M1 1'/></a></svg>", 'refused', '<a>' ),
			'upper-case USE HREF'   => array( "<svg $v><USE HREF='https://evil/x.svg#a'/></svg>", 'refused', '<use>' ),
			'style attribute url'   => array( "<svg $v><path d='M1 1' style='fill:url(https://evil/x)'/></svg>", 'refused', 'url(' ),
			'style attribute'       => array( "<svg $v><path d='M1 1' style='fill:red;opacity:.5'/></svg>", 'sanitised', 'style' ),
			'xml comment'           => array( "<svg $v><!-- <use href='x'/> --><path d='M1 1'/></svg>", 'sanitised', '<!--' ),
			'prefixed element'      => array( "<svg xmlns='http://www.w3.org/2000/svg' xmlns:s='http://www.w3.org/2000/svg' $v><s:path d='M1 1'/></svg>", 'sanitised', 's:path' ),
			'entity in a value'     => array( "<svg $v><path d='M1 1' stroke-linecap='&#114;ound'/></svg>", 'sanitised', '&#' ),
		);
	}

	/** @return array<string, array{0: string}> */
	public static function benign_corpus(): array {
		$v = self::V;
		return array(
			'stroked outline' => array( "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' $v fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M3 3h18v18H3z'/><path d='M8 12h8'/></svg>" ),
			'filled shapes'   => array( "<svg $v fill='currentColor'><circle cx='12' cy='12' r='9'/><rect x='4' y='4' width='6' height='6'/></svg>" ),
			'grouped'         => array( "<svg $v stroke='currentColor' fill='none'><g><polyline points='4 12 9 17 20 6'/><line x1='4' y1='4' x2='8' y2='8'/><ellipse cx='12' cy='12' rx='4' ry='2'/><polygon points='1,1 5,1 3,5'/></g></svg>" ),
		);
	}

	private function generator(): string {
		$override = getenv( 'SGS_TEST_GENERATOR' );
		return $override ? $override : SGS_BLOCKS_PLUGIN_DIR . '/scripts/generate-icons.js';
	}

	private function promote_script(): string {
		$override = getenv( 'SGS_TEST_PROMOTE' );
		return $override ? $override : SGS_BLOCKS_PLUGIN_DIR . '/scripts/promote-icon.py';
	}

	/**
	 * Run the generator in check mode over one library entry.
	 *
	 * @return array{0:int,1:string} Exit code and output.
	 */
	private function generator_check( string $slug, string $svg ): array {
		$lib = $this->tmp . DIRECTORY_SEPARATOR . 'lib-' . bin2hex( random_bytes( 3 ) ) . '.json';
		file_put_contents( $lib, json_encode( array( $slug => $svg ) ) );
		exec( 'node ' . escapeshellarg( $this->generator() ) . ' --check --library ' . escapeshellarg( $lib ) . ' 2>&1', $lines, $code );
		return array( $code, implode( "\n", $lines ) );
	}

	/**
	 * Run promote-icon.py's normalise_svg() over a corpus.
	 *
	 * @param array<string,string> $corpus name => raw svg.
	 * @return array<string,array{ok?:string,refused?:string}>
	 */
	private function promote_normalise( array $corpus ): array {
		$in     = $this->tmp . DIRECTORY_SEPARATOR . 'corpus.json';
		$script = $this->tmp . DIRECTORY_SEPARATOR . 'run.py';
		file_put_contents( $in, json_encode( $corpus ) );
		file_put_contents(
			$script,
			"import importlib.util, json, sys\n"
			. "sys.stdout.reconfigure(encoding='utf-8')\n"
			. "spec = importlib.util.spec_from_file_location('promote_icon', sys.argv[1])\n"
			. "m = importlib.util.module_from_spec(spec)\n"
			. "spec.loader.exec_module(m)\n"
			. "out = {}\n"
			. "for name, svg in json.load(open(sys.argv[2], encoding='utf-8')).items():\n"
			. "    try:\n"
			. "        out[name] = {'ok': m.normalise_svg(svg, 'outline')}\n"
			. "    except m.Refusal as exc:\n"
			. "        out[name] = {'refused': str(exc)}\n"
			. "print(json.dumps(out))\n"
		);
		$raw = (string) shell_exec( 'python ' . escapeshellarg( $script ) . ' ' . escapeshellarg( $this->promote_script() ) . ' ' . escapeshellarg( $in ) . ' 2>&1' );
		$out = json_decode( $raw, true );
		$this->assertIsArray( $out, 'promote-icon harness did not return JSON: ' . $raw );
		return $out;
	}

	public function test_the_corpus_is_big_enough_to_mean_something(): void {
		$this->assertGreaterThanOrEqual( 10, count( self::hostile_corpus() ) );
	}

	#[DataProvider( 'hostile_corpus' )]
	public function test_generator_refuses_every_hostile_svg( string $svg, string $expect, string $fragment ): void {
		[ $code, $output ] = $this->generator_check( 'evil-icon', $svg );
		$this->assertNotSame( 0, $code, "Generator accepted a hostile SVG ($fragment): $output" );
		$this->assertStringContainsString( 'refused', $output );
		$this->assertStringContainsString( '"evil-icon"', $output, 'the message names the offending slug' );
	}

	public function test_generator_and_promote_icon_never_disagree_on_the_hostile_corpus(): void {
		$corpus = array();
		foreach ( self::hostile_corpus() as $name => $row ) {
			$corpus[ $name ] = $row[0];
		}
		$promoted = $this->promote_normalise( $corpus );

		foreach ( self::hostile_corpus() as $name => [ $svg, $expect, $fragment ] ) {
			$this->assertArrayHasKey( $name, $promoted );
			$result = $promoted[ $name ];

			if ( 'refused' === $expect ) {
				$this->assertArrayHasKey( 'refused', $result, "promote-icon accepted `$name` but the generator refuses it: DRIFT" );
				$this->assertStringContainsStringIgnoringCase( $fragment, $result['refused'], "`$name` was refused for the wrong reason" );
				continue;
			}

			// Sanitised: promote-icon dropped the construct, so what it emits must be clean.
			$this->assertArrayHasKey( 'ok', $result, "`$name` should normalise, got: " . json_encode( $result ) );
			$this->assertStringNotContainsString( $fragment, $result['ok'], "`$name` survived normalisation" );
			[ $code, $output ] = $this->generator_check( 'clean-icon', $result['ok'] );
			$this->assertSame( 0, $code, "the generator refuses promote-icon's own output for `$name`: $output" );
		}
	}

	#[DataProvider( 'benign_corpus' )]
	public function test_both_tools_accept_a_clean_pictogram( string $svg ): void {
		[ $code, $output ] = $this->generator_check( 'clean-icon', $svg );
		$this->assertSame( 0, $code, "Generator refused a clean SVG: $output" );

		$name     = 'clean';
		$promoted = $this->promote_normalise( array( $name => $svg ) );
		$this->assertArrayHasKey( 'ok', $promoted[ $name ], 'promote-icon refused a clean SVG: ' . json_encode( $promoted[ $name ] ) );
		[ $code2, $output2 ] = $this->generator_check( 'clean-icon', $promoted[ $name ]['ok'] );
		$this->assertSame( 0, $code2, "the generator refuses promote-icon's output: $output2" );
	}

	public function test_a_refused_library_writes_nothing(): void {
		$lib = $this->tmp . DIRECTORY_SEPARATOR . 'hostile.json';
		$out = $this->tmp . DIRECTORY_SEPARATOR . 'out';
		file_put_contents( $lib, json_encode( array( 'evil-use' => "<svg><use href='https://evil/x.svg#a'/></svg>" ) ) );
		exec( 'node ' . escapeshellarg( $this->generator() ) . ' --out-dir ' . escapeshellarg( $out ) . ' --library ' . escapeshellarg( $lib ) . ' 2>&1', $lines, $code );

		$this->assertNotSame( 0, $code, 'the original repro (exit 0 and an emitted <use href>) is closed' );
		$this->assertFileDoesNotExist( $out . DIRECTORY_SEPARATOR . 'lucide-icons.php' );
	}

	/** @return array<string, array{0: string}> */
	public static function prototype_slugs(): array {
		$rows = array();
		foreach ( array( 'constructor', 'toString', 'valueOf', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString', '__proto__' ) as $slug ) {
			$rows[ $slug ] = array( $slug );
		}
		return $rows;
	}

	#[DataProvider( 'prototype_slugs' )]
	public function test_object_prototype_member_names_are_refused_as_slugs( string $slug ): void {
		[ $code, $output ] = $this->generator_check( $slug, "<svg " . self::V . "><path d='M1 1'/></svg>" );
		$this->assertNotSame( 0, $code, "slug `$slug` must be refused: $output" );
		$this->assertStringContainsString( '"' . $slug . '"', $output );
	}

	public function test_an_ordinary_slug_still_passes(): void {
		[ $code ] = $this->generator_check( 'shield-tick', "<svg " . self::V . "><path d='M1 1'/></svg>" );
		$this->assertSame( 0, $code );
	}

	public function test_both_tools_read_one_allowlist_file(): void {
		$allow = json_decode( (string) file_get_contents( SGS_BLOCKS_PLUGIN_DIR . '/assets/icons/svg-allowlist.json' ), true );
		$this->assertIsArray( $allow );
		$this->assertContains( 'path', $allow['drawingElements'] );
		foreach ( array( 'use', 'image', 'style', 'foreignObject', 'script', 'animate' ) as $banned ) {
			$this->assertNotContains( $banned, $allow['drawingElements'] );
		}
		foreach ( array( '/scripts/generate-icons.js', '/scripts/promote-icon.py' ) as $file ) {
			$this->assertStringContainsString( 'svg-allowlist.json', (string) file_get_contents( SGS_BLOCKS_PLUGIN_DIR . $file ), "$file reads the shared allowlist" );
		}
	}
}
