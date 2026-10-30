// Spec 48 FR-48-25 (RC12), METHOD.md §5.2: a Web Animations call on a part of content the draft's code injects at runtime
// is recorded against the stamped holder plus the part's id (lib/intake-inventory-part.mjs::partTarget), never as a record
// with no element. The two shapes are a real client draft's code with its brand name changed: a ref callback that fetches
// an SVG into its stamped holder and animates parts it finds by id through a local `q(id)`, and a helmet script that
// defines a custom element which fills itself with its SVG and animates parts held in `this._p` (on load, on hover, and
// each child of one part).
import test from 'node:test';
import assert from 'node:assert/strict';
import { codeModel } from '../lib/intake-inventory-code.mjs';
import { animationRecords } from '../lib/intake-inventory-anim.mjs';
import { idOfSelector } from '../lib/intake-inventory-part.mjs';

const HERO = `class Component extends DCComponent {
  setHeroSvgEl = (el) => {
    if (!el) return;
    const src = el.getAttribute('data-src');
    if (el._src === src) return;
    el._src = src;
    fetch(src).then((r) => r.text()).then((txt) => {
      if (el._src !== src) return;
      el.innerHTML = txt.replace(/<\\?xml[^>]*>/, '');
      const svg = el.querySelector('svg'); if (!svg) return;
      const q = (id) => svg.querySelector('[id="' + id + '"]');
      const spin = q('sunrays_spin'), grow = q('sunrays_expand'), mtn = q('Mountain Block'), snow = q('snow'), bg = q('background');
      const gold = q('path5'), glow = q('goldpath_glow'), hi = q('goldpath_highlight'), road = q('darkpath');
      const E = 'cubic-bezier(.16,.84,.32,1)', IO = 'cubic-bezier(.65,0,.35,1)';
      const f = { fill: 'both' };
      if (spin) spin.animate([{ rotate: '0deg' }, { rotate: '360deg' }], { duration: 40000, iterations: Infinity });
      if (mtn) mtn.animate([{ translate: '0 140px', opacity: 0 }, { translate: '0 0', opacity: 1 }], { duration: 1100, easing: E, ...f });
      [gold, glow, hi].forEach((p, i) => p && p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 1600, delay: 1100 + i * 120, easing: IO, ...f }));
      [spin, document.getElementById('lost')].forEach((p) => p && p.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 }));
      const byClass = (c) => svg.querySelector('.' + c), fixed = (c) => svg.querySelector('#fixed');
      const k = byClass('ray'), m = fixed('ray');
      if (k) k.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 210 });
      if (m) m.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220 });
      const other = document.querySelector('#outside');
      if (other) other.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
    }).catch(() => {});
  };
}`;

const MARK = `(() => {
  const SRC = { horizontal: './assets/mark.svg' };
  let uid = 0;
  const E = 'cubic-bezier(.16,.84,.32,1)';
  class BrandMark extends HTMLElement {
    connectedCallback() { this.load(); this._enter = () => this.play(true); this.addEventListener('mouseenter', this._enter); }
    async load() {
      const url = SRC[this.getAttribute('variant') || 'horizontal'];
      let t = await fetch(url).then((r) => r.text());
      const p = 'il' + (++uid) + '_';
      t = t.replace(/\\sid="([^"]+)"/g, (m, id) => ' id="' + p + id + '"');
      this.innerHTML = t;
      const svg = this.querySelector('svg');
      const q = (id) => svg.querySelector('#' + p + id);
      this._p = { spin: q('sunrays_spin'), expand: q('sunrays_expand'), text: q('logo_text') };
      if (this._p.spin) this._spin = this._p.spin.animate([{ rotate: '0deg' }, { rotate: '360deg' }], { duration: 60000, iterations: Infinity });
    }
    play(hover) {
      const P = this._p; if (!P) return;
      if (hover) {
        if (P.expand) P.expand.animate([{ scale: '1' }, { scale: '1.12' }, { scale: '1' }], { duration: 900, easing: E });
        if (P.text) [...P.text.children].forEach((c, i) => c.animate([{ translate: '0 0' }, { translate: '0 -40px' }, { translate: '0 0' }], { duration: 520, delay: i * 28, easing: E }));
      }
    }
  }
  customElements.define('brand-mark', BrandMark);
})();`;

// A census of one component (its logic, its stamped elements and their template rows) and an optional helmet script,
// with a waapi row at every `.animate(` call.
function censusOf( { logic = 'class Component extends DCComponent {}', script = null, rows: extra = [] } ) {
	const source = { component: 'App', file: 'App.dc.html', via: 'entry', logic, logicLine: 1, logicColumn: 0, scripts: script ? [ { file: 'mark.js', text: script } ] : [], stamped: { elements: [] } };
	const m = codeModel( { sources: [ source ], rows: [] } );
	const rows = [ ...extra ];
	for ( const [ comp, p ] of m.progs ) {
		p.nodes.filter( ( n ) => 'CallExpression' === n.type && 'animate' === n.callee?.property?.name ).forEach( ( c, i ) => rows.push( { id: `waapi@${ comp }:${ i }`, kind: 'waapi', component: p.file ? 'App' : comp, draftId: `${ comp }:js:${ c.loc.start.line }:${ c.loc.start.column }`, detail: {} } ) );
	}
	return { sources: [ source ], rows };
}
const waapi = ( c ) => animationRecords( c ).records.filter( ( r ) => 'waapi' === r.mechanism );
const HOLDER = { id: 'ref@App:321', kind: 'ref', component: 'App', draftId: 'App:321', detail: { expression: 'setHeroSvgEl' } };
const MARKS = [ ...[ 49, 976 ].map( ( n ) => ( { id: `template-element@App:${ n }`, kind: 'template-element', component: 'App', draftId: `App:${ n }`, detail: { tag: 'brand-mark' } } ) ), { id: 'helmet-script@App:7', kind: 'helmet-script', component: 'App', draftId: 'App:7', detail: { src: './mark.js' } } ];

test( 'MUST FAIL: a fetched SVG\'s parts animated by id are recorded against the stamped holder with each part\'s id', () => {
	const recs = waapi( censusOf( { logic: HERO, rows: [ HOLDER ] } ) );
	const by = ( code ) => recs.find( ( r ) => r.source.code.startsWith( code ) );
	assert.deepEqual( by( 'spin.animate' ).element, { dc: 'App', template_tpl_id: '321', selector: '#sunrays_spin', selection_rule: 'the part "sunrays_spin" of the content the code puts into ref setHeroSvgEl', description: 'animated element: #sunrays_spin' } );
	assert.equal( by( 'mtn.animate' ).element.selector, '[id="Mountain Block"]', 'an id that is not a CSS name is written as an attribute selector' );
	const lines = by( 'p.animate' ).element;
	assert.equal( lines.template_tpl_id, '321' );
	assert.equal( lines.selector, '#path5, #goldpath_glow, #goldpath_highlight', 'each member of the array is a part' );
} );

test( 'MUST FAIL: a custom element\'s own parts, animated on load, on hover and child by child, are recorded against every stamped element of its tag', () => {
	const recs = waapi( censusOf( { script: MARK, rows: MARKS } ) );
	assert.equal( recs.length, 3 );
	for ( const r of recs ) {
		assert.deepEqual( r.element.template_tpl_id, [ '49', '976' ], r.source.code );
		assert.equal( r.element.nearest_tpl_id, undefined, 'the holder is named, not only a nearest ancestor' );
	}
	assert.deepEqual( recs.map( ( r ) => r.element.selector ), [ '#sunrays_spin', '#sunrays_expand', '#logo_text > *' ] );
	assert.match( recs[ 2 ].element.selection_rule, /^each child of the part "logo_text" of the content the code puts into <brand-mark>$/ );
} );

test( 'negative control: an element the code finds in the page, not in content it injected, keeps its own target; a script that registers no element names no holder', () => {
	const recs = waapi( censusOf( { logic: HERO, rows: [ HOLDER ] } ) );
	const outside = recs.find( ( r ) => r.source.code.startsWith( 'other.animate' ) );
	assert.equal( outside.element.template_tpl_id, null );
	assert.notEqual( outside.element.selection_rule ?? '', 'the part "outside" of the content the code puts into ref setHeroSvgEl' );
	const unregistered = waapi( censusOf( { script: MARK.replace( "customElements.define('brand-mark', BrandMark);", '' ), rows: MARKS } ) );
	const another = waapi( censusOf( { script: MARK.replace( "customElements.define('brand-mark', BrandMark);", "class Other extends HTMLElement {} customElements.define('brand-mark', Other);" ), rows: MARKS } ) );
	another.forEach( ( r ) => assert.equal( r.element.template_tpl_id, null, `${ r.source.code }: another class is registered under the tag` ) );
	const lone = ( code ) => recs.find( ( r ) => r.source.code.startsWith( code ) ).element.template_tpl_id;
	assert.equal( lone( 'p.animate([{ opacity' ), null, 'a list whose member is found in the page, not in the content, has no one holder' );
	assert.equal( lone( 'k.animate' ), null, 'a query by class is not a part by id' );
	assert.equal( lone( 'm.animate' ), null, 'a query that ignores its parameter names no part' );
	unregistered.forEach( ( r ) => assert.equal( r.element.template_tpl_id, null, r.source.code ) );
	const noHolder = waapi( censusOf( { logic: HERO, rows: [] } ) );
	noHolder.forEach( ( r ) => assert.equal( r.element.template_tpl_id, null, `${ r.source.code }: with no ref row there is no stamped holder` ) );
} );

test( 'idOfSelector reads only a plain id query', () => {
	assert.equal( idOfSelector( '#a-b' ), 'a-b' );
	assert.equal( idOfSelector( '[id="Mountain Block"]' ), 'Mountain Block' );
	assert.equal( idOfSelector( "[id='x']" ), 'x' );
	assert.equal( idOfSelector( '.a' ), null );
	assert.equal( idOfSelector( '#a .b' ), null );
	assert.equal( idOfSelector( null ), null );
} );
