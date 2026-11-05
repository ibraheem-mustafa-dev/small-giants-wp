import { pillTriggerLabel } from '../../src/blocks/cart/trigger-label';

// The same strings tests/php/CartPillAccessibleNameTest.php::test_widget_prints_the_label_templates asserts the server prints.
const DATASET = { labelOne: 'Bag {count} item, open bag', labelOther: 'Bag {count} items, open bag' };

describe( 'cart trigger label', () => {
	it( 'matches the server format after a count update', () => {
		expect( pillTriggerLabel( DATASET, 0 ) ).toBe( 'Bag 0 items, open bag' );
		expect( pillTriggerLabel( DATASET, 1 ) ).toBe( 'Bag 1 item, open bag' );
		expect( pillTriggerLabel( DATASET, 12 ) ).toBe( 'Bag 12 items, open bag' );
	} );
	it( 'leaves an icon-only widget alone', () => {
		expect( pillTriggerLabel( {}, 3 ) ).toBeNull();
	} );
} );
