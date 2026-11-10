// Spec 49 §11 parity: the cloned page's media compared with the draft's at 375, 768 and 1440, per width. The closing check is
// the rendered output against the draft (FP-11), never the slot's own settings. Pure; not wired until Stage B.
//
// Each side: { 375: visible, 768: visible, 1440: visible }, `visible` = { tag, box: { w, h }, computed: { objectFit,
// borderRadius } } or null. Rows: kind, box ratio (2%), width fill (1px), object-fit, corner radius.
import { kindOfTag } from './kind-per-width.mjs';

const WIDTHS = [ 375, 768, 1440 ];
const ratio = ( v ) => ( v?.box?.w > 0 && v?.box?.h > 0 ? v.box.w / v.box.h : null );
const radiusKey = ( v ) => JSON.stringify( v?.computed?.borderRadius ?? null );

/**
 * @param {{draft:Object, live:Object}} sides Both sides' reads.
 * @return {{ok:boolean, rows:Object[]}} One row per width and property: { width, property, draft, live, verdict }.
 */
export function mediaParity( { draft, live } ) {
	const rows = [];
	const row = ( width, property, d, l, agree ) => rows.push( { width, property, draft: d, live: l, verdict: agree ? 'agree' : 'differs' } );
	for ( const w of WIDTHS ) {
		const d = draft?.[ w ] || null;
		const l = live?.[ w ] || null;
		const dk = d ? kindOfTag( d.tag ) : 'none';
		const lk = l ? kindOfTag( l.tag ) : 'none';
		row( w, 'kind', dk, lk, dk === lk );
		if ( ! d || ! l ) {
			continue;
		}
		const dr = ratio( d );
		const lr = ratio( l );
		row( w, 'ratio', dr, lr, null !== dr && null !== lr && Math.abs( dr - lr ) / dr <= 0.02 );
		row( w, 'width', d.box?.w ?? null, l.box?.w ?? null, Math.abs( ( d.box?.w ?? 0 ) - ( l.box?.w ?? 0 ) ) <= 1 );
		row( w, 'object-fit', d.computed?.objectFit ?? null, l.computed?.objectFit ?? null, ( d.computed?.objectFit ?? 'fill' ) === ( l.computed?.objectFit ?? 'fill' ) );
		row( w, 'border-radius', radiusKey( d ), radiusKey( l ), radiusKey( d ) === radiusKey( l ) );
	}
	return { ok: rows.every( ( r ) => 'agree' === r.verdict ), rows };
}
