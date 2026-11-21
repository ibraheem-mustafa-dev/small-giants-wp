// A product page's draft, its skeleton and its shop parts record for the paint check after the template pieces
// (tests/template-piece-paint.test.mjs, tests/skeleton-pieces-paint.test.mjs).
export const PIECE = { id: 'buy-box', block: 'sgs/buybox', required: true, kind: 'buybox', find: { surface: 'buybox' } };
const PAINT = 'background-color: rgb(250, 200, 0)';
// An inventory element: [ tpl, parent tpl, tag, own source text, extra ]; `paint` gives it a background, `copy` its copy
// index, `fixed` a fixed position.
const el = ( tpl, parent, tag, own = '', extra = {} ) => ( { key: `Root/${ tpl }#${ extra.copy ?? 0 }`, parentKey: parent ? `Root/${ parent }#0` : 'Root/0#0', tag, template: 'Root', tpl, srcOwnText: own, words: extra.words ?? own, snippet: `<${ tag }>`, attrs: extra.paint ? { style: PAINT } : {}, visible: { 1440: true }, membership: [], position: { 1440: extra.fixed ? 'fixed' : 'static' } } );
// main > grid > [ info column [ h1, options [ label (painted, holding a painted mark), picker > choice (painted) + a badge
// (painted, also drawn in the related section) ], add row > button (painted) ] ], related section [ a painted box no node
// reads, the badge's copy ], a fixed bar [ the add button's copy, a sticky price ].
export const INVENTORY = { elements: [
	el( 1, null, 'main' ), el( 2, 1, 'div' ), el( 5, 2, 'div' ), el( 6, 5, 'h1', '{{ p.name }}', { words: 'Zookies' } ),
	el( 8, 5, 'div' ), el( 9, 8, 'span', 'Size', { paint: true } ), el( 20, 9, 'b', '', { paint: true } ), el( 10, 8, 'div' ), el( 11, 10, 'button', '{{ o.name }}', { words: 'Small', paint: true } ),
	el( 19, 10, 'span', '', { paint: true } ),
	el( 12, 5, 'div' ), el( 13, 12, 'button', '{{ addLabel }}', { words: 'Add to basket', paint: true } ),
	el( 15, 1, 'section' ), el( 18, 15, 'div', '', { paint: true } ), { ...el( 19, 15, 'span', '', { paint: true, copy: 1 } ), parentKey: 'Root/15#0' },
	el( 30, 1, 'div', '', { fixed: true } ), { ...el( 13, 30, 'button', '{{ addLabel }}', { words: 'Add to basket', copy: 1 } ), parentKey: 'Root/30#0' }, el( 32, 30, 'span', '{{ price }}', { words: '£4' } ),
] };
const n = ( name, tpl, attributes = {}, innerBlocks = [] ) => ( { name, attributes, innerBlocks, draftRef: { tpl: `Root/${ tpl }#0` } } );
export const TREE = () => [ n( 'sgs/container', 1, {}, [
	n( 'sgs/container', 2, {}, [ n( 'sgs/heading', 6, { content: 'Zookies' } ), n( 'sgs/label', 9, { text: 'Size' } ), n( 'sgs/option-picker', 10, {}, [ n( 'sgs/button', 11, { label: 'Small' } ), n( 'sgs/text', 19 ) ] ), n( 'sgs/button', 13, { label: 'Add to basket' } ) ] ),
	n( 'sgs/container', 15 ),
] ) ];
const part = ( id, home, locators, sample ) => ( { id, label: id, home, write: null, locators, sample } );
export const RECORD = { surfaces: [ { kind: 'buybox', file: 'Product.dc.html', parts: [
	part( 'buybox-title', { type: 'part', contains: 'wp:post-title' }, [ 'Product/6' ], [ '{{ p.name }}' ] ),
	part( 'buybox-option-picker', { type: 'setting', block: 'sgs/buybox', settings: [ 'pickerStyle' ] }, [ 'Product/11' ], [ '{{ o.name }}' ] ),
	part( 'buybox-add-to-basket', { type: 'setting', block: 'sgs/buybox', settings: [ 'addToCartLabel' ] }, [ 'Product/13' ], [ '{{ addLabel }}' ] ),
	// A part located only in the fixed bar is the sticky bar's, not the buy box's place.
	part( 'buybox-sticky-price', { type: 'setting', block: 'sgs/buybox', settings: [ 'stickyBar' ] }, [ 'Product/32' ], [ '{{ price }}' ] ),
	part( 'buybox-size:hint', { type: 'missing', reason: 'words only' }, [ 'Product/9' ], [ 'Size' ] ),
	// A missing-features part located outside the buy box names no element of it.
	part( 'related-note:hint', { type: 'missing', reason: 'words only' }, [ 'Product/18' ], [] ),
] } ] };
export const keysOf = ( rows ) => rows.map( ( r ) => r.key ).sort();
export const STALE = 'paint conservation: 1 painted element host-unread (rule optionSet, host sgs/option-picker) no node reads and no record carries: Root/11#0 background';
export const KEPT = 'paint pairing: Root/11#0 fits several measured parts of sgs/option-picker: not paired, so its looks are not read';
