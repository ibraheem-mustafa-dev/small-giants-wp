// Skeleton writer step 3 (Spec 47 §3.4): the review table Bean reads. One row per draft element: its key, tag and
// attributes, words, the draft's own code, its screenshot, the block proposed with the confidence and the reasons, and the
// decision column filled from the decisions file (a client decision) or the finaliser's picks.
const esc = ( s ) => String( s ?? '' ).replace( /&/g, '&amp;' ).replace( /</g, '&lt;' ).replace( />/g, '&gt;' ).replace( /"/g, '&quot;' );
const attrS = ( a ) => Object.entries( a || {} ).filter( ( [ k ] ) => 'style' !== k ).map( ( [ k, v ] ) => `${ k }="${ v }"` ).join( ' ' );

const STYLE = `:root{--bg:#fbfaf8;--fg:#1d1b19;--muted:#6b665f;--line:#e2ddd5;--card:#fff;--accent:#2f5d8a;--code:#f3f0ea;--low:#fbe9cf;--gone:#f3dcdc}
@media (prefers-color-scheme: dark){:root{--bg:#1a1917;--fg:#ece8e1;--muted:#a49d92;--line:#3a3732;--card:#23211e;--accent:#8db7e0;--code:#2c2a26;--low:#4a3a1c;--gone:#4a2626}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{padding:24px 16px;max-width:1800px;margin:0 auto}h1{font-size:1.5rem;margin:0 0 4px}.muted{color:var(--muted)}
.summary{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}.summary span{background:var(--card);border:1px solid var(--line);border-radius:6px;padding:6px 10px}
table{width:100%;border-collapse:collapse;background:var(--card)}th,td{border-bottom:1px solid var(--line);padding:8px;vertical-align:top;text-align:left}
th{position:sticky;top:0;background:var(--card);font-size:.85rem;z-index:1}code,pre{font-family:ui-monospace,Consolas,monospace;font-size:.8rem}
pre{white-space:pre-wrap;word-break:break-word;background:var(--code);padding:6px;border-radius:4px;margin:0;min-width:220px;max-width:320px}
.key{white-space:nowrap;color:var(--accent)}.indent{display:inline-block;width:calc(var(--d)*14px)}.attrs{font-size:.75rem;color:var(--muted);word-break:break-all;max-width:240px}
figure{margin:0 0 6px}figure img{max-width:200px;max-height:160px;border:1px solid var(--line);background:repeating-conic-gradient(#ddd 0 25%,#fff 0 50%) 0 0/12px 12px}figcaption{font-size:.7rem;color:var(--muted)}
tr.low td{background:var(--low)}tr.gone td{background:var(--gone)}.why{font-size:.78rem;color:var(--muted);margin:4px 0 0;padding-left:16px;max-width:360px}
a:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
@media (max-width:800px){table,thead,tbody,tr,td{display:block}thead{display:none}tr{border:1px solid var(--line);border-radius:8px;margin:0 0 12px;padding:8px}td{border:0;padding:4px 0}td::before{content:attr(data-label);display:block;font-size:.72rem;font-weight:600;color:var(--muted);text-transform:uppercase}.indent{display:none}pre{max-width:100%}figure img{max-width:100%}}`;

// The decision cell: Bean's recorded choice for the key, else the finaliser's pick, else empty.
export function decisionCell( key, surface, clientDecisions = {}, picks = {} ) {
	const own = clientDecisions.surfaces?.[ surface ]?.[ key ];
	const pick = picks[ key ];
	const say = ( d ) => ( d.remove ? 'remove' : `${ d.block }${ d.attributes ? ` ${ JSON.stringify( d.attributes ) }` : '' }` );
	return own ? { text: say( own ), source: 'decided' } : pick ? { text: say( pick ), source: `finaliser pick (${ pick.confidence })` } : null;
}

// The review page as one HTML string. Screenshot paths in the inventory are relative to the review file's folder.
export function reviewHtml( { inventory, proposal, surface, clientDecisions, picks } ) {
	const rowOf = Object.fromEntries( proposal.rows.map( ( r ) => [ r.key, r ] ) );
	const owner = {};
	proposal.rows.forEach( ( r ) => r.parts.forEach( ( p ) => ( owner[ p ] = r.key ) ) );
	const body = inventory.elements.map( ( e ) => {
		const r = rowOf[ e.key ];
		const shots = Object.entries( e.screenshots || {} ).sort( ( a, b ) => b[ 0 ] - a[ 0 ] ).map( ( [ w, p ] ) => `<figure><a href="${ esc( p ) }"><img src="${ esc( p ) }" alt="Screenshot of ${ esc( e.key ) } at ${ w }px" loading="lazy"></a><figcaption>${ w }px</figcaption></figure>` ).join( '' );
		const dec = decisionCell( e.key, surface, clientDecisions, picks );
		const gone = r && ( 'remove' === r.action || 'absorbed' === r.action );
		const proposed = r ? ( gone ? `<strong>${ esc( r.action ) }</strong>${ r.into ? ` into <code>${ esc( r.into ) }</code>` : '' }` : `<strong>${ esc( r.block ) }</strong>${ r.item ? `<div class="attrs">list item ${ esc( JSON.stringify( r.item ) ) }</div>` : '' }` ) : `<span class="muted">part of ${ esc( owner[ e.key ] || 'its parent' ) }</span>`;
		const why = r ? `<ul class="why">${ ( r.reason ? [ r.reason ] : [] ).concat( ( r.candidates[ 0 ]?.evidence || [] ) ).map( ( t ) => `<li>${ esc( t ) }</li>` ).join( '' ) }</ul>` : '';
		return `<tr class="${ r?.low && ! gone ? 'low' : '' }${ gone ? ' gone' : '' }">
<td data-label="Key"><span class="indent" style="--d:${ e.depth }"></span><code class="key">${ esc( e.key ) }</code></td>
<td data-label="Tag"><code>&lt;${ esc( e.tag ) }&gt;</code><div class="attrs">${ esc( attrS( e.attrs ) ) }</div></td>
<td data-label="Words">${ esc( e.words ) || '<span class="muted">none</span>' }</td>
<td data-label="Draft code"><pre>${ esc( e.snippet ) }</pre></td>
<td data-label="Screenshot">${ shots || '<span class="muted">none (not shown, or the layout is unchanged at 375px)</span>' }</td>
<td data-label="Proposed block">${ proposed }${ why }</td>
<td data-label="Confidence">${ r ? `${ r.confidence }${ r.low && ! gone ? ' <strong>LOW</strong>' : '' }${ r.stale ? `<div class="attrs">stale decision: ${ esc( r.stale ) }</div>` : '' }` : '' }</td>
<td data-label="Decision">${ dec ? `<strong>${ esc( dec.text ) }</strong><div class="attrs">${ esc( dec.source ) }</div>` : '' }</td>
</tr>`;
	} ).join( '\n' );
	const c = proposal.counts;
	return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${ esc( surface ) } skeleton review</title><style>${ STYLE }</style></head><body><main>
<h1>${ esc( surface ) } skeleton review</h1>
<p class="muted">Source: ${ esc( inventory.source ) } · root ${ esc( inventory.root ) } · inventory ${ esc( inventory.generated ) } · key = import chain / template number # copy</p>
<div class="summary"><span>Elements: ${ c.inventoryElements }</span><span>Parts of another element: ${ c.parts }</span><span>Skeleton nodes: ${ c.skeletonNodes } (${ c.expandedNodes } once Fill generates the icon rows)</span><span>Low confidence: ${ c.low }</span><span>Removed or absorbed: ${ c.removed }</span><span>Unresolved: ${ c.unresolved }</span></div>
<p class="muted">Record a choice with <code>node scripts/computed-route/skeleton.mjs decide --key "&lt;key&gt;" --block &lt;slug&gt;</code> (or <code>--remove</code>), then run <code>propose</code> and <code>review</code> again.</p>
<table><thead><tr><th>Key</th><th>Tag</th><th>Words</th><th>Draft code</th><th>Screenshot</th><th>Proposed block</th><th>Confidence</th><th>Decision</th></tr></thead><tbody>
${ body }
</tbody></table></main></body></html>`;
}
