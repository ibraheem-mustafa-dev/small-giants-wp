// The construct registry's template, binding, logic-value, script and link readers (lib/intake-construct-readers.mjs,
// Spec 48 FR-48-24, FR-48-85): each reads an occurrence to where the route consumes it and refuses what nothing can.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readTemplateElement, readLoop, readImport, bindingTarget, readBinding, readRenderKey, readGetter, readHelmetScript, readLink } from '../lib/intake-construct-readers.mjs';

const row = ( kind, detail, extra = {} ) => ( { id: `${ kind }@C:${ extra.n ?? 1 }`, kind, draftId: `C:${ extra.n ?? 1 }`, component: extra.component ?? 'C', detail } );

test( 'MUST FAIL: a template element is a block, its children\'s membership or part of the document; one with no tag is refused', () => {
	assert.deepEqual( readTemplateElement( row( 'template-element', { tag: 'section', inFor: false } ) ), { identity: 'C:1', tag: 'section', role: 'skeleton' } );
	assert.deepEqual( readTemplateElement( row( 'template-element', { tag: 'li', inFor: true } ) ), { identity: 'C:1', tag: 'li', role: 'skeleton', inLoop: true } );
	assert.equal( readTemplateElement( row( 'template-element', { tag: 'sc-for' } ) ).role, 'membership' );
	assert.equal( readTemplateElement( row( 'template-element', { tag: 'helmet' } ) ).role, 'document' );
	assert.equal( readTemplateElement( row( 'template-element', { tag: 'style' } ) ).role, 'document' );
	assert.throws( () => readTemplateElement( row( 'template-element', {} ) ), /has no tag/ );
} );

test( 'MUST FAIL: a loop reads its list expression and item name; a list that is not a {{ }} binding is refused', () => {
	assert.deepEqual( readLoop( row( 'sc-for', { list: '{{ activePanel.links }}', as: 'link' } ) ), { list: 'activePanel.links', as: 'link', identity: 'C:1' } );
	assert.equal( readLoop( row( 'sc-for', { list: '{{ items }}' } ) ).as, 'item' );
	assert.throws( () => readLoop( row( 'sc-for', { list: 'items' } ) ), /not a \{\{ \}\} binding/ );
} );

test( 'MUST FAIL: an import host reads the component it stamps; one the export does not hold is refused', () => {
	const sources = [ { component: 'C', file: 'C.dc.html' }, { component: 'Form', file: 'Form.dc.html' } ];
	assert.deepEqual( readImport( row( 'dc-import', { name: 'Form', props: [ 'a' ] } ), { sources } ), { component: 'Form', file: 'Form.dc.html', props: [ 'a' ], identity: 'C:1' } );
	assert.throws( () => readImport( row( 'dc-import', { name: 'Gone' } ), { sources } ), /does not hold/ );
} );

test( 'MUST FAIL: a binding is routed to what it fills; one that fills neither text nor an attribute is refused', () => {
	assert.deepEqual( bindingTarget( 'text' ), { target: 'content' } );
	assert.deepEqual( bindingTarget( 'attr:style' ), { target: 'style' } );
	assert.deepEqual( bindingTarget( 'attr:style-hover' ), { target: 'style' } );
	assert.deepEqual( bindingTarget( 'attr:href' ), { target: 'link' } );
	assert.deepEqual( bindingTarget( 'attr:list' ), { target: 'loop', capability: 'construct:sc-for' } );
	assert.deepEqual( bindingTarget( 'attr:ref' ), { target: 'ref', capability: 'construct:ref' } );
	assert.deepEqual( bindingTarget( 'attr:onClick' ), { target: 'handler', capability: 'construct:handler' } );
	assert.deepEqual( bindingTarget( 'attr:placeholder' ), { target: 'attribute', attribute: 'placeholder' } );
	assert.deepEqual( bindingTarget( 'attr:one' ), { target: 'attribute', attribute: 'one' }, 'a lower-case on… attribute is not a handler' );
	assert.equal( readBinding( row( 'binding', { where: 'text', expression: 'item.title' } ) ).expression, 'item.title' );
	assert.throws( () => readBinding( row( 'binding', { where: 'slot' } ) ), /neither text nor an attribute/ );
} );

test( 'MUST FAIL: a renderVals key counts the template expressions that use it by name; a member\'s property of the same name does not count', () => {
	const rows = [
		row( 'binding', { where: 'text', expression: 'R.title' }, { n: 2 } ),
		row( 'binding', { where: 'attr:style', expression: 'isOpen ? R.px : 0' }, { n: 3 } ),
		row( 'sc-if', { value: '{{ isOpen }}' }, { n: 4 } ),
		row( 'sc-for', { list: '{{ items }}', as: 'item' }, { n: 5 } ),
		row( 'binding', { where: 'text', expression: 'item.isOpen' }, { n: 6 } ),
	];
	const key = ( name ) => readRenderKey( row( 'renderVals-key', { name } ), { rows } );
	assert.deepEqual( key( 'R' ), { key: 'R', uses: 2 } );
	assert.deepEqual( key( 'isOpen' ), { key: 'isOpen', uses: 2 } );
	assert.deepEqual( key( 'items' ), { key: 'items', uses: 1 } );
	assert.deepEqual( key( 'title' ), { key: 'title', uses: 0, unused: true } );
	assert.throws( () => readRenderKey( row( 'renderVals-key', {} ), { rows } ), /has no name/ );
} );

test( 'MUST FAIL: a getter counts its own component\'s this.<name> reads and the template expressions that name it', () => {
	const sources = [
		{ component: 'C', logic: 'class C { get rm() { return 1; } renderVals() { return { a: this.rm, b: this.rm ? 1 : 2, c: this.other }; } }' },
		{ component: 'D', logic: 'class D { go() { return this.rm; } }' },
	];
	const g = ( name, component = 'C' ) => readGetter( row( 'getter', { name }, { component } ), { rows: [], sources } );
	assert.deepEqual( g( 'rm' ), { getter: 'rm', code: 2, template: 0 } );
	assert.deepEqual( g( 'rm', 'D' ), { getter: 'rm', code: 1, template: 0 }, 'only its own component' );
	assert.deepEqual( g( 'unread' ), { getter: 'unread', code: 0, template: 0, unused: true } );
} );

test( 'MUST FAIL: a helmet script lists the constructs found in its file; one the export does not hold is refused', () => {
	const sources = [ { component: 'C', scripts: [ { src: './logo.js', file: 'logo.js' } ] } ];
	const rows = [ { id: 'waapi@logo.js:js:4:2', kind: 'waapi', component: 'logo.js' }, { id: 'waapi@C:js:9:1', kind: 'waapi', component: 'C' } ];
	assert.deepEqual( readHelmetScript( row( 'helmet-script', { src: './logo.js', inline: 0 } ), { rows, sources } ), { src: './logo.js', inline: 0, constructs: [ 'waapi@logo.js:js:4:2' ] } );
	assert.throws( () => readHelmetScript( row( 'helmet-script', { src: './gone.js' } ), { rows, sources } ), /does not hold/ );
	assert.deepEqual( readHelmetScript( row( 'helmet-script', { src: null, inline: 1 } ), { rows, sources } ).constructs, [] );
} );

test( 'MUST FAIL: a link is read by what its address is; one with no address is refused', () => {
	const k = ( href, rel ) => readLink( row( 'link', { href, rel } ) ).kind;
	assert.equal( k( '{{ card.href }}' ), 'bound' );
	assert.equal( k( 'https://fonts.googleapis.com', 'preconnect' ), 'head' );
	assert.equal( k( '#' ), 'anchor' );
	assert.equal( k( '#menu' ), 'anchor' );
	assert.equal( k( 'tel:0123' ), 'contact' );
	assert.equal( k( 'mailto:a@b.c' ), 'contact' );
	assert.equal( k( 'https://wa.me/1', 'noopener' ), 'external' );
	assert.equal( k( 'about.html' ), 'page' );
	assert.equal( k( 'javascript:void(0)' ), 'script' );
	assert.equal( k( 'data:text/plain,x' ), 'data' );
	assert.throws( () => readLink( row( 'link', { href: '' } ) ), /has no address/ );
} );
