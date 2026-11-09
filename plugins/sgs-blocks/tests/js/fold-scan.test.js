/**
 * @jest-environment jsdom
 */
import {
	countSectionsAboveFold,
	largestCount,
} from '../../src/blocks/extensions/fold-scan-count';
import { createSaveWatcher } from '../../src/blocks/extensions/fold-scan';

jest.mock( '@wordpress/data', () => ( {
	select: jest.fn(),
	subscribe: jest.fn(),
} ) );
jest.mock( '@wordpress/api-fetch', () => jest.fn() );

function page( html, tops ) {
	document.body.innerHTML = html;
	document.querySelectorAll( '[data-s]' ).forEach( ( el, i ) => {
		el.getBoundingClientRect = () => ( {
			top: tops[ i ],
			width: tops[ i ] === null ? 0 : 100,
			height: tops[ i ] === null ? 0 : 200,
		} );
	} );
	return document;
}

const SIX =
	'<main><div class="wp-block-post-content">' +
	'<section data-s></section>'.repeat( 6 ) +
	'</div></main>';

describe( 'countSectionsAboveFold', () => {
	it( 'counts sections whose top is above the viewport height', () => {
		const doc = page( SIX, [ 0, 300, 700, 900, 1500, 2000 ] );
		expect( countSectionsAboveFold( doc, 812 ) ).toBe( 3 );
		expect( countSectionsAboveFold( doc, 1024 ) ).toBe( 4 );
	} );

	it( 'skips sections with no rendered box', () => {
		const doc = page( SIX, [ 0, null, 300, 5000, 6000, 7000 ] );
		expect( countSectionsAboveFold( doc, 812 ) ).toBe( 2 );
	} );

	it( 'descends into a lone main wrapper', () => {
		const doc = page(
			'<div class="wp-block-post-content"><main>' +
				'<section data-s></section>'.repeat( 3 ) +
				'</main></div>',
			[ 0, 400, 2000 ]
		);
		expect( countSectionsAboveFold( doc, 812 ) ).toBe( 2 );
	} );

	it( 'ignores scripts and styles among the sections', () => {
		const doc = page(
			'<div class="wp-block-post-content"><style></style><script></script>' +
				'<section data-s></section><section data-s></section></div>',
			[ 0, 100 ]
		);
		expect( countSectionsAboveFold( doc, 812 ) ).toBe( 2 );
	} );
} );

describe( 'largestCount', () => {
	it( 'takes the maximum across sizes', () => {
		expect( largestCount( [ 3, 4, 2 ] ) ).toBe( 4 );
	} );
	it( 'is at least 1', () => {
		expect( largestCount( [ 0, 0, 0 ] ) ).toBe( 1 );
	} );
} );

describe( 'createSaveWatcher', () => {
	function editorState( over = {} ) {
		const state = {
			saving: false,
			autosaving: false,
			ok: true,
			status: 'publish',
			link: 'https://x.test/p/',
			...over,
		};
		return {
			state,
			api: {
				isSavingPost: () => state.saving,
				isAutosavingPost: () => state.autosaving,
				didPostSaveRequestSucceed: () => state.ok,
				getCurrentPostAttribute: () => state.status,
				getPermalink: () => state.link,
				getCurrentPostId: () => 12,
			},
		};
	}

	function runSave( over ) {
		const { state, api } = editorState( over );
		const onScan = jest.fn();
		const check = createSaveWatcher( { getEditor: () => api, onScan } );
		state.saving = true;
		check();
		state.saving = false;
		check();
		return onScan;
	}

	it( 'scans when a manual save finishes', () => {
		expect( runSave( {} ) ).toHaveBeenCalledWith( {
			id: 12,
			permalink: 'https://x.test/p/',
		} );
	} );

	it( 'does not scan after an autosave', () => {
		expect( runSave( { autosaving: true } ) ).not.toHaveBeenCalled();
	} );

	it( 'does not scan an unpublished draft', () => {
		expect( runSave( { status: 'draft' } ) ).not.toHaveBeenCalled();
	} );

	it( 'does not scan a failed save', () => {
		expect( runSave( { ok: false } ) ).not.toHaveBeenCalled();
	} );
} );
