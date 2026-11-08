// Live verification rows (sites/<client>/build/qa/apply/verify.json, read by lib/delivery-map.mjs::liveStatus).
// A row: { record, target, state, ok, measured, want, status, host, commit, measured_at, evidence, sample }.
//   status 'done'            measured ok on a test site at a deployed commit, every element of the set read
//   status 'sampled'         measured ok but only `sample.n` of `sample.of` elements were read: not proof for the set
//   status 'built-not-pushed' measured on a mirror host: the build exists, the deploy does not
//   status 'failed'          measured and not ok
// A row with no `status` (written by apply.mjs after its own re-read) counts as done when ok is true.
const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0|\[?::1\]?$)|\.(local|test|localhost)$|^local-/i;

// Whether a host (or URL) is a mirror: loopback, a private address, a .local name or a local-<client> alias.
export function isMirrorHost( hostOrUrl ) {
	const h = hostOf( hostOrUrl );
	return ! h || PRIVATE_HOST.test( h );
}

export function hostOf( hostOrUrl ) {
	const s = String( hostOrUrl ?? '' ).trim();
	try {
		return new URL( /^[a-z]+:\/\//i.test( s ) ? s : `https://${ s }` ).hostname.toLowerCase();
	} catch {
		return '';
	}
}

// { status, why } for one measurement, given where it was read. `sample` is { n, of } when only part of a set was read.
export function rowStatus( { ok, host, sample } ) {
	if ( true !== ok ) {
		return { status: 'failed', why: 'the measurement is not ok' };
	}
	if ( isMirrorHost( host ) ) {
		return { status: 'built-not-pushed', why: `${ hostOf( host ) || 'no host' } is a mirror: the build is not deployed` };
	}
	if ( sample && Number.isFinite( sample.n ) && Number.isFinite( sample.of ) && sample.n < sample.of ) {
		return { status: 'sampled', why: `${ sample.n } of ${ sample.of } read` };
	}
	return { status: 'done', why: 'read on a test site at a deployed commit' };
}

// The key's live state from its verify rows: failed beats built-not-pushed beats sampled beats done.
// -> { state: 'not done' | 'built-not-pushed' | 'sampled' | 'done', why }
export function rowsState( rows ) {
	const eff = rows.map( ( r ) => r.status ?? ( true === r.ok ? 'done' : 'failed' ) );
	const bad = rows.filter( ( r, i ) => 'failed' === eff[ i ] || true !== r.ok );
	if ( bad.length ) {
		const r = bad[ 0 ];
		return { state: 'not done', why: `${ bad.length } of ${ rows.length } verify row(s) not ok (first: ${ r.target ?? '?' } ${ r.state ?? '' }, measured ${ JSON.stringify( r.measured ) }, want ${ JSON.stringify( r.want ) })` };
	}
	for ( const s of [ 'built-not-pushed', 'sampled' ] ) {
		if ( eff.includes( s ) ) {
			return { state: s, why: `${ eff.filter( ( x ) => x === s ).length } of ${ rows.length } verify row(s) are ${ s }` };
		}
	}
	return { state: 'done', why: `${ rows.length } verify row(s) ok` };
}

// { delivery: 'delivered' | 'partial' | 'missing', why } for one record's live rows. delivered: every row ok and read live
// (rowsState done). partial: at least one row ok on the live site (done or sampled) and the rest not; why names the first
// row that differs. missing: no row, or no row ok on the live site (a built-not-pushed row is not on the live site).
export function deliveryOf( rows ) {
	const list = Array.isArray( rows ) ? rows : [];
	if ( ! list.length ) {
		return { delivery: 'missing', why: 'no live row' };
	}
	const st = rowsState( list );
	if ( 'done' === st.state ) {
		return { delivery: 'delivered', why: st.why };
	}
	const eff = ( r ) => r.status ?? ( true === r.ok ? 'done' : 'failed' );
	const liveOk = list.filter( ( r ) => true === r.ok && [ 'done', 'sampled' ].includes( eff( r ) ) );
	const bad = list.find( ( r ) => ! liveOk.includes( r ) );
	const what = bad ? `${ bad.target ?? '?' } ${ bad.state ?? '' }: measured ${ JSON.stringify( bad.measured ) }, want ${ JSON.stringify( bad.want ) }` : st.why;
	return { delivery: liveOk.length ? 'partial' : 'missing', why: `${ liveOk.length } of ${ list.length } row(s) ok live; differs: ${ what }` };
}

// Detector findings (scripts/parity/detect.mjs detect.json: { <detector>: { findings: [...] } }) as measurement rows.
// A finding names its animation record in `record` or `animation`; a finding with neither is not a per-record read and is
// counted in `skipped`. severity 'fail' is not ok.
export function rowsFromFindings( detect ) {
	const rows = [];
	let skipped = 0;
	for ( const [ id, res ] of Object.entries( detect || {} ) ) {
		for ( const f of res?.findings || [] ) {
			const record = f.record ?? f.animation;
			if ( ! record ) {
				skipped++;
				continue;
			}
			rows.push( { record, target: f.key ?? f.part ?? f.target ?? id, state: f.state ?? 'rest', ok: 'fail' !== f.severity, measured: f.live ?? null, want: f.draft ?? null, sample: f.sample ?? null, detector: id } );
		}
	}
	return { rows, skipped };
}

// Rows ready for verify.json from raw measurements ({ record, target, state, ok, measured, want, sample? }) read at `host`,
// at `commit`, into `evidence`. Throws with the reason when the read cannot count: no host, or a test host with no commit.
export function buildRows( measurements, { host, commit, evidence, now = new Date(), hasCommit = () => true, testHosts = null } ) {
	const h = hostOf( host );
	if ( ! h ) {
		throw new Error( 'a verify row needs the host it was read from (--site <url>)' );
	}
	const mirror = isMirrorHost( h );
	if ( ! mirror && testHosts && ! testHosts.has( h ) ) {
		throw new Error( `${ h } is not a test site of this client (known: ${ [ ...testHosts ].join( ', ' ) || 'none' })` );
	}
	if ( ! mirror && ( ! commit || ! hasCommit( commit ) ) ) {
		throw new Error( `a live row needs the deployed commit, and ${ commit || 'none' } is not a commit in this repo (--commit <hash> or --marker <file>)` );
	}
	return measurements.filter( ( m ) => m && m.record && m.target ).map( ( m ) => ( {
		record: m.record,
		target: m.target,
		state: m.state ?? 'rest',
		ok: true === m.ok,
		measured: m.measured ?? null,
		want: m.want ?? null,
		status: rowStatus( { ok: true === m.ok, host: h, sample: m.sample } ).status,
		host: h,
		commit: mirror ? ( commit ?? null ) : commit,
		measured_at: now.toISOString(),
		evidence: evidence ?? null,
		...( m.sample ? { sample: m.sample } : {} ),
	} ) );
}
