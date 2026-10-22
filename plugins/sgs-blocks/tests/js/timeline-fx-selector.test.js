/**
 * The timeline's horizontal-panel rules match the pin as a token (`~=`), the way `fx-scroll-progress.js` does, so the
 * counter shows when another effect shares the root's `data-sgs-fx` list.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const scss = readFileSync( join( __dirname, '../../src/blocks/timeline/style.scss' ), 'utf8' );

test( 'no horizontal-panel selector uses an exact attribute match', () => {
	expect( scss ).not.toMatch( /data-sgs-fx=["']horizontal-panel["']/ );
} );

test( 'the counter rule matches the pin as a token', () => {
	expect( scss ).toMatch( /\[data-sgs-fx~=["']horizontal-panel["']\]\s*>\s*\.sgs-timeline__counter/ );
} );
