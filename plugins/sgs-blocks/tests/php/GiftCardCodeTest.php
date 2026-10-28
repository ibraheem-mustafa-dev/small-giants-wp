<?php
/**
 * Gift card code entropy, normalisation and hashed storage (Spec 27, FR-27-GC3).
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\Attributes\Group;
use SGS\Blocks\Gift_Card\Gift_Card_Code;
use SGS\Blocks\Tests\Support\Gift_Card_Test_Case;

require_once __DIR__ . '/support/Gift_Card_Test_Case.php';

#[Group( 'sgs_gift_card' )]
final class GiftCardCodeTest extends Gift_Card_Test_Case {

	public function test_a_code_carries_at_least_80_bits_of_randomness(): void {
		$this->assertSame( 80, Gift_Card_Code::ENTROPY_BITS );
		$this->assertGreaterThanOrEqual( 80, Gift_Card_Code::LENGTH * log( strlen( Gift_Card_Code::ALPHABET ), 2 ) );
		$this->assertSame( 32, strlen( Gift_Card_Code::ALPHABET ) );
		$this->assertSame( 32, count( array_unique( str_split( Gift_Card_Code::ALPHABET ) ) ) );

		$asked = 0;
		Gift_Card_Code::generate(
			function ( int $bytes ) use ( &$asked ): string {
				$asked = $bytes;
				return random_bytes( $bytes );
			}
		);
		$this->assertSame( 10, $asked, '10 random bytes are 80 bits, all of which reach the code.' );
	}

	public function test_every_bit_of_the_random_input_changes_the_code(): void {
		$base = Gift_Card_Code::generate( fn() => str_repeat( "\x00", 10 ) );
		$this->assertSame( '0000-0000-0000-0000', $base );
		$this->assertSame( 'ZZZZ-ZZZZ-ZZZZ-ZZZZ', Gift_Card_Code::generate( fn() => str_repeat( "\xFF", 10 ) ) );

		for ( $bit = 0; $bit < 80; $bit++ ) {
			$bytes                      = str_repeat( "\x00", 10 );
			$bytes[ intdiv( $bit, 8 ) ] = chr( 1 << ( 7 - ( $bit % 8 ) ) );
			$this->assertNotSame( $base, Gift_Card_Code::generate( fn() => $bytes ), 'Bit ' . $bit . ' is ignored.' );
		}
	}

	public function test_a_generator_given_too_little_randomness_is_refused(): void {
		$this->expectException( InvalidArgumentException::class );
		Gift_Card_Code::generate( fn() => random_bytes( 8 ) ); // Negative control: 64 bits is not enough.
	}

	public function test_generated_codes_are_well_formed_unique_and_use_the_whole_alphabet(): void {
		$seen    = array();
		$symbols = array();
		for ( $i = 0; $i < 2000; $i++ ) {
			$code = Gift_Card_Code::generate();
			$this->assertMatchesRegularExpression( '/^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){3}$/', $code );
			$this->assertSame( str_replace( '-', '', $code ), Gift_Card_Code::normalise( $code ) );
			$seen[ $code ] = true;
			foreach ( str_split( str_replace( '-', '', $code ) ) as $ch ) {
				$symbols[ $ch ] = true;
			}
		}
		$this->assertCount( 2000, $seen, 'No duplicate in 2000 codes.' );
		$this->assertCount( 32, $symbols, 'All 32 symbols appear.' );
	}

	public function test_normalise_forgives_case_spaces_and_look_alikes_but_nothing_else(): void {
		$this->assertSame( '7K2M9QXA0BD4VNE6', Gift_Card_Code::normalise( ' 7k2m-9qxa 0bd4_vne6 ' ) );
		$this->assertSame( '1111000000000000', Gift_Card_Code::normalise( 'IiLl-OOoo-0000-0000' ), 'I and L read as 1, O reads as 0.' );
		foreach ( array( '', 'ABC', '7K2M-9QXA-0BD4-VNE', '7K2M-9QXA-0BD4-VNE66', '7K2M-9QXA-0BD4-VNEU', '7K2M-9QXA-0BD4-VNE!' ) as $bad ) {
			$this->assertSame( '', Gift_Card_Code::normalise( $bad ), $bad );
		}
	}

	public function test_the_hash_is_keyed_and_deterministic(): void {
		$norm = Gift_Card_Code::normalise( '7K2M-9QXA-0BD4-VNE6' );
		$a    = Gift_Card_Code::hash( $norm, 'key-one' );
		$this->assertSame( $a, Gift_Card_Code::hash( $norm, 'key-one' ) );
		$this->assertNotSame( $a, Gift_Card_Code::hash( $norm, 'key-two' ), 'The key is part of the hash.' );
		$this->assertMatchesRegularExpression( '/^[0-9a-f]{64}$/', $a );
		$this->assertSame( hash_hmac( 'sha256', $norm, 'key-one' ), $a );
		$this->assertSame( 'VNE6', Gift_Card_Code::last4( $norm ) );
	}

	public function test_the_plain_code_is_never_stored(): void {
		$card = $this->issued_card( 2500 );
		$norm = Gift_Card_Code::normalise( $card['code'] );
		$row  = $this->store->find( $card['id'] );

		$this->assertSame( Gift_Card_Code::hash( $norm, 'test-key' ), $row['code_hash'] );
		$this->assertSame( substr( $norm, -4 ), $row['code_last4'] );
		$this->assertFalse( $this->storeHoldsPlainCode( $card['code'] ), 'Cards and ledger hold only the hash and the last four.' );
	}

	public function test_the_plain_code_scanner_can_go_red(): void {
		$card = $this->issued_card( 2500 );
		// A careless implementation that kept the code in a note field.
		$this->store->cards[ $card['id'] ]['message'] = 'code ' . $card['code'];
		$this->assertTrue( $this->storeHoldsPlainCode( $card['code'] ) );
		// ...and one that kept it without the dashes.
		$this->store->cards[ $card['id'] ]['message'] = Gift_Card_Code::normalise( $card['code'] );
		$this->assertTrue( $this->storeHoldsPlainCode( $card['code'] ) );
	}

	/**
	 * Whether anything the store holds contains the code, formatted or bare.
	 */
	private function storeHoldsPlainCode( string $code ): bool {
		$dump = json_encode( array( $this->store->cards, $this->store->ledger ) );
		return false !== strpos( $dump, $code ) || false !== strpos( $dump, str_replace( '-', '', $code ) );
	}
}
