// The process steps' number badge hover. Run: node --test tests/apply-chrome-number.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { numberHover } from '../lib/apply-chrome-number.mjs';
import { recordIndex } from '../lib/apply-records.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const rawSnapshot = { settings: { custom: { easing: { default: 'cubic-bezier(.34,1.56,.64,1)' }, duration: { fast: '250ms' } } } };
const rec = ( detail ) => ( { id: 'TR-060', mechanism: 'css-transition', status: 'active', element: { dc: 'D', template_tpl_id: '301' }, trigger: { type: 'hover', detail }, duration_ms: 500, easing: 'cubic-bezier(.34,1.56,.64,1)', properties: [ { property: 'transform', from: null, to: 'scale(1.12) rotate(-8deg)', duration_ms: 500, easing: 'cubic-bezier(.34,1.56,.64,1)' } ] } );
const css = '& .sgs-process-steps__number{margin:0}\n& .sgs-process-steps__step:hover .sgs-process-steps__number{transform:scale(1.12) rotate(-8deg)}\n& .sgs-process-steps__title{margin:0}';
const ctx = ( detail, saved ) => ( { saved, block: 'sgs/process-steps', db, rawSnapshot, target: { ref: 'cr-ref-x-1', key: 'cr-ref-x-1', tpl: 'Root/298#0', owns: [], reach: [ 298, 299, 300, 301 ] }, recordsIndex: recordIndex( [ rec( detail ) ], 'D' ) } );

test( 'a badge record becomes the number part hover and the step-wide hand rule leaves sgsCustomCss', () => {
	const [ item ] = numberHover( ctx( ':hover rule (style-hover), applied with !important', { sgsCustomCss: css } ) );
	assert.equal( item.status, 'op' );
	const motion = item.writes.find( ( w ) => 'sgsMotion' === w.attr ).value;
	assert.equal( motion.elements.number.hover.state.values.scale, 1.12 );
	assert.equal( motion.elements.number.hover.state.values.rotate, -8 );
	const kept = item.writes.find( ( w ) => 'sgsCustomCss' === w.attr ).value;
	assert.ok( ! /step:hover/.test( kept ) );
	assert.equal( kept, '& .sgs-process-steps__number{margin:0}\n& .sgs-process-steps__title{margin:0}' );
} );

test( 'negative control: a parent-driven record writes no op and a step-wide rule is reported, not removed', () => {
	const items = numberHover( ctx( ':hover - parent-driven: --x set by :hover on tpl 298', { sgsCustomCss: css } ) );
	assert.ok( items.every( ( i ) => 'op' !== i.status ) );
	assert.equal( items[ 0 ].status, 'no-setting' );
	assert.deepEqual( numberHover( ctx( ':hover - parent-driven: --x set by :hover on tpl 298', { sgsCustomCss: '& .a{b:c}' } ) ), [] );
} );

test( 'negative control: no hand rule and the layer already saved gives no change in the custom CSS', () => {
	const [ item ] = numberHover( ctx( ':hover rule (style-hover), applied with !important', { sgsCustomCss: '& .sgs-process-steps__title{margin:0}' } ) );
	assert.ok( ! item.writes.some( ( w ) => 'sgsCustomCss' === w.attr ) );
} );

test( 'stripStepHover: only a sole-selector rule loses its motion declarations; lists, at-rules, pseudo-elements and other declarations stay', async () => {
	const { stripStepHover } = await import( '../lib/apply-chrome-number.mjs' );
	const T = '.sgs-process-steps__step:hover .sgs-process-steps__number';
	const sole = stripStepHover( `& ${ T }{transform:x;color:red}\n& .b{c:d}` );
	assert.equal( sole.css, `& ${ T }{color:red;}\n& .b{c:d}` );
	assert.equal( stripStepHover( `& ${ T }{transform:x}\n& ${ T }{color:red}` ).css, `\n& ${ T }{color:red}` );
	const list = stripStepHover( `& .a,\n& ${ T }{transform:x}` );
	assert.deepEqual( [ list.changed, list.css, list.blocked.length ], [ false, `& .a,\n& ${ T }{transform:x}`, 1 ] );
	const media = stripStepHover( `@media (min-width:600px){& ${ T }{transform:x}}` );
	assert.deepEqual( [ media.changed, media.blocked.length ], [ false, 1 ] );
	const pseudo = stripStepHover( `& ${ T }::after{transform:x}` );
	assert.deepEqual( [ pseudo.changed, pseudo.blocked.length ], [ false, 0 ] );
} );
