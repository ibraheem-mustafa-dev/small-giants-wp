// The gate chain G0 to G7 (Spec 48 FR-48-64): the checks a Solve row passes, in order, before it may be called a
// framework gap. A row stops at the first gate it fails and carries that gate's failure class (FR-48-65); a row that
// passes all eight is a framework-gap candidate for gaps.json (FR-48-66), its F-class named by the live probe (G6).
// Every gate takes its inputs as one argument and returns { pass, class, evidence }. Nothing fails open: an input that
// is missing, unreadable or not the shape the gate needs fails that gate, with I-stale (G0, G3, G7) or the gate's own
// class. The database is read through lib/db.mjs (read-only); live reads (emission, the probes, the re-check) are
// functions the caller injects, so the chain runs offline on fixtures.
import { compareDR } from './fill-confirm.mjs';
import { listedProperties } from './db.mjs';
import { settingFits } from './triage.mjs';

export const GATES = [ 'G0', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7' ];
const ok = ( evidence, extra = {} ) => ( { pass: true, class: null, evidence, ...extra } );
const fail = ( cls, evidence, extra = {} ) => ( { pass: false, class: cls, evidence, ...extra } );
const blank = ( v ) => null == v || '' === String( v ).trim();
const time = ( v ) => ( blank( v ) ? NaN : Date.parse( v ) );

// G0 Freshness. i: { dbRefreshedAt, blockCommittedAt (ISO times), cache: { slotKey, playwrightVersion, browserVersion },
// deployHash (the current deploy's key), installed: { playwrightVersion, browserVersion }, manifest: { schema_version,
// files: { path: sha256 } } (MANIFEST.json), intake: the same shape from intake.json, schemaVersion (expected) }.
export function g0Freshness( i ) {
	const stale = ( why ) => fail( 'I-stale', why );
	if ( ! i || 'object' !== typeof i ) {
		return stale( 'no freshness inputs' );
	}
	const [ db, commit ] = [ time( i.dbRefreshedAt ), time( i.blockCommittedAt ) ];
	if ( Number.isNaN( db ) || Number.isNaN( commit ) ) {
		return stale( `DB refresh time (${ i.dbRefreshedAt ?? 'unreadable' }) or the block's last commit (${ i.blockCommittedAt ?? 'unreadable' }) cannot be read` );
	}
	if ( db < commit ) {
		return stale( `the DB was refreshed ${ i.dbRefreshedAt }, before the block's last commit ${ i.blockCommittedAt }` );
	}
	const c = i.cache;
	if ( ! c || blank( c.slotKey ) || blank( i.deployHash ) ) {
		return stale( 'the calibration cache or the current deploy hash is unreadable' );
	}
	if ( c.slotKey !== i.deployHash ) {
		return stale( `the cache measured deploy ${ c.slotKey }; the current deploy is ${ i.deployHash }` );
	}
	// The browser the cache was measured in (FR-48-75): both versions must be recorded and equal the installed ones.
	for ( const k of [ 'playwrightVersion', 'browserVersion' ] ) {
		if ( blank( c[ k ] ) || blank( i.installed?.[ k ] ) ) {
			return stale( `${ k } is not recorded in the cache or not readable from the install` );
		}
		if ( String( c[ k ] ) !== String( i.installed[ k ] ) ) {
			return stale( `the cache was measured with ${ k } ${ c[ k ] }; installed is ${ i.installed[ k ] }` );
		}
	}
	const [ m, t ] = [ i.manifest, i.intake ];
	if ( ! m?.files || ! t?.files || blank( i.schemaVersion ) ) {
		return stale( 'MANIFEST.json or intake.json hashes are unreadable' );
	}
	if ( String( m.schema_version ) !== String( i.schemaVersion ) || String( t.schema_version ) !== String( i.schemaVersion ) ) {
		return stale( `schema_version is ${ m.schema_version } in MANIFEST.json and ${ t.schema_version } in intake.json; expected ${ i.schemaVersion }` );
	}
	const differ = [ ...new Set( [ ...Object.keys( m.files ), ...Object.keys( t.files ) ] ) ].filter( ( f ) => m.files[ f ] !== t.files[ f ] );
	return differ.length ? stale( `intake.json hashes differ from MANIFEST.json: ${ differ.slice( 0, 5 ).join( ', ' ) }` ) : ok( `DB ${ i.dbRefreshedAt } after commit ${ i.blockCommittedAt }; deploy ${ i.deployHash }; browser ${ c.browserVersion }; intake matches MANIFEST` );
}

// G1 Pair and paint. i: { row, pairing: { by: 'identity' | 'words' }, paint: { inert, paints }, stateListed }.
export function g1PairAndPaint( i ) {
	const row = i?.row;
	if ( ! row || ! i.pairing || ! i.paint || 'boolean' !== typeof i.stateListed ) {
		return fail( 'W-walker', 'the pairing, paint or state input is missing' );
	}
	const bad = row.mispaired ? `the block is mispaired (${ row.mispaired })`
		: 'identity' !== i.pairing.by ? `paired by ${ i.pairing.by ?? 'nothing' }, not by identity`
			: ! row.ref ? 'the row names no node'
				: null == row.draft || null == row.live ? `the ${ null == row.draft ? 'draft' : 'live' } side was not read`
					: i.paint.inert ? 'the element is inert (no box or display none)'
						: ! i.paint.paints ? `the element does not paint ${ row.key }`
							: ! i.stateListed ? `the draft state ${ row.state } is not a listed state` : null;
	return bad ? fail( 'W-walker', bad ) : ok( `identity pair ${ row.pair } on ${ row.ref }, paints ${ row.key }, state ${ row.state }` );
}

// G2 Intent. i: { property, declared, renderedDraft, fr34Passes, ledgered }.
export function g2Intent( i ) {
	if ( ! i || blank( i.property ) || 'boolean' !== typeof i.fr34Passes || 'boolean' !== typeof i.ledgered ) {
		return fail( 'W-walker', 'the intent input is missing' );
	}
	if ( i.ledgered ) {
		return fail( 'CLIENT', `the row is in the divergence ledger (declared ${ i.declared ?? 'none' }, rendered ${ i.renderedDraft })` );
	}
	if ( blank( i.renderedDraft ) ) {
		return fail( 'W-walker', 'the rendered draft value is unread' );
	}
	const c = compareDR( i.property, i.declared, i.renderedDraft );
	if ( 'unreadable' === c.dr ) {
		return fail( 'W-walker', `declared ${ i.declared } cannot be compared with rendered ${ i.renderedDraft }` );
	}
	if ( 'disagree' === c.dr ) {
		return i.fr34Passes ? fail( 'draft-defect', `declared ${ i.declared } never paints (FR-48-34); rendered ${ i.renderedDraft }` ) : fail( 'render-wins', `declared ${ i.declared } but the draft renders ${ i.renderedDraft } (FR-48-34 fails)` );
	}
	return ok( `${ c.dr }: declared ${ i.declared ?? 'none' }, rendered ${ i.renderedDraft }` );
}

// G3 DB query. i: { db, block, ancestors: [slug], property, state }. Reads block_attributes for the block, its ancestors
// and its extensions (rows with source sgs-ext carry the block's slug). Fails I-unrouted when a NULL css_property row
// fits the property (lib/triage.mjs::settingFits, the name test triage uses), I-mistag when a routed row fits but its
// role is not classed styling-behaviour. Otherwise passes, listing the routed settings that fit (none when nothing
// does): G4 and G5 decide whether one of them is the route's miss.
export function g3Db( i ) {
	if ( ! i?.db || blank( i.block ) || blank( i.property ) ) {
		return fail( 'I-stale', 'the DB, block or property is missing' );
	}
	let rows;
	let roles;
	try {
		const slugs = [ i.block, ...( i.ancestors || [] ) ];
		rows = i.db.prepare( `SELECT block_slug, attr_name, css_property, css_state, role, source FROM block_attributes WHERE source IN ( 'sgs', 'sgs-ext' ) AND block_slug IN ( ${ slugs.map( () => '?' ).join( ',' ) } )` ).all( ...slugs );
		roles = new Map( i.db.prepare( 'SELECT role_name, classification FROM roles' ).all().map( ( r ) => [ r.role_name, r.classification ] ) );
	} catch ( e ) {
		return fail( 'I-stale', `the DB cannot be read: ${ String( e.message || e ).slice( 0, 100 ) }` );
	}
	const state = i.state || null;
	const routed = rows.filter( ( r ) => null !== r.css_property && listedProperties( r.css_property ).includes( i.property ) && ( r.css_state || null ) === state );
	const unrouted = rows.filter( ( r ) => null === r.css_property && settingFits( r.attr_name, r, i.property ) );
	const label = ( r ) => `${ r.block_slug } ${ r.attr_name } (css_property ${ r.css_property ?? 'NULL' }, role ${ r.role })`;
	if ( unrouted.length ) {
		return fail( 'I-unrouted', `${ label( unrouted[ 0 ] ) } fits ${ i.property } but carries no css_property` );
	}
	const mistag = routed.find( ( r ) => 'styling-behaviour' !== roles.get( r.role ) );
	if ( mistag ) {
		return fail( 'I-mistag', `${ label( mistag ) } paints ${ i.property } but its role is classed ${ roles.get( mistag.role ) ?? 'unknown' }` );
	}
	if ( routed.length ) {
		return ok( `${ routed.length } stored setting(s) fit ${ i.property }: ${ routed.map( label ).join( '; ' ) }`, { settings: routed.map( ( r ) => ( { block: r.block_slug, attr: r.attr_name } ) ) } );
	}
	return ok( `no stored row on ${ [ i.block, ...( i.ancestors || [] ) ].join( ', ' ) } fits ${ i.property }`, { settings: [] } );
}

// G4 Calibration. i: { cache, settings: [{ block, attr }] (G3's), state, boxAgrees }. A candidate setting listed as dead,
// without a marker, with the row's state untested or rejected is instrument debt (I-calibration); an `overriddenBy`
// verdict stands only while the rendered box agrees.
export function g4Calibration( i ) {
	if ( ! i || ! Array.isArray( i.settings ) || ( i.settings.length && ! i.cache ) ) {
		return fail( 'I-calibration', 'the calibration cache or the candidate settings are unreadable' );
	}
	const c = i.cache || {};
	const key = ( r ) => ( 'string' === typeof r ? r : r?.key ?? '' );
	for ( const { attr } of i.settings ) {
		const hit = ( c.dead || [] ).includes( attr ) ? 'dead'
			: ( c.noMarker || [] ).includes( attr ) ? 'noMarker'
				: ( c.untestedStates || [] ).some( ( u ) => u === `${ attr }:${ i.state }` || ( ! i.state && u === attr ) ) ? 'untestedStates'
					: ( c.rejected || [] ).some( ( r ) => key( r ).startsWith( `${ attr }-` ) || key( r ) === attr ) ? 'rejected' : null;
		if ( hit ) {
			return fail( 'I-calibration', `${ attr } is listed ${ hit } in the cache` );
		}
		const over = c.settings?.[ attr ]?.overriddenBy;
		if ( over && true !== i.boxAgrees ) {
			return fail( 'I-calibration', `${ attr } is overridden by ${ JSON.stringify( over ) } and the rendered box ${ false === i.boxAgrees ? 'does not agree' : 'was not measured' }` );
		}
	}
	return ok( i.settings.length ? `${ i.settings.map( ( s ) => s.attr ).join( ', ' ) } calibrated live` : 'no candidate setting to calibrate' );
}

// G5 Emission and reach. i: { settings, measure(setting) -> { method: 'measured', emitted, reaches, evidence } }. The pass
// condition is the gap's: no candidate setting's emission reaches the element. A measurement that is not a live
// measurement (a string search of the CSS, no boolean answer) fails the gate (R-48-4).
export async function g5Emission( i ) {
	if ( ! i || ! Array.isArray( i.settings ) || ( i.settings.length && 'function' !== typeof i.measure ) ) {
		return fail( 'W-route', 'no emission measurement was supplied' );
	}
	const seen = [];
	for ( const s of i.settings ) {
		let m;
		try {
			m = await i.measure( s );
		} catch ( e ) {
			return fail( 'W-route', `measuring ${ s.attr } failed: ${ String( e.message || e ).slice( 0, 100 ) }` );
		}
		if ( 'measured' !== m?.method || 'boolean' !== typeof m.reaches ) {
			return fail( 'W-route', `${ s.attr }: the emission was not measured on the live element (method ${ m?.method ?? 'none' })` );
		}
		if ( m.reaches ) {
			return fail( 'W-route', `${ s.attr } emits ${ m.emitted ?? '' } and reaches the element: ${ m.evidence ?? '' }` );
		}
		seen.push( `${ s.attr }: ${ m.evidence ?? 'no reach' }` );
	}
	return ok( seen.length ? seen.join( '; ' ) : 'no candidate setting emits' );
}

// The probe kinds of G6 and the F-class each proves.
export const PROBE_CLASS = { 'missing-setting': 'F-setting', hardcode: 'F-hardcode', 'missing-block': 'F-block', behaviour: 'F-behaviour' };

// G6 Live probe. i: { kind, probe(kind) -> result }. Missing setting: result.changed === false (a trial finds no setting
// changes it). Hardcode: result.rule names the winning rule. Missing block: result.matches is an empty list. Behaviour:
// result.flowFails === true and result.attributeMatches is an empty list.
export async function g6Probe( i ) {
	if ( ! PROBE_CLASS[ i?.kind ] || 'function' !== typeof i.probe ) {
		return fail( 'W-route', `no live probe for ${ i?.kind ?? 'an unknown kind' }` );
	}
	let r;
	try {
		r = await i.probe( i.kind );
	} catch ( e ) {
		return fail( 'W-route', `the ${ i.kind } probe failed: ${ String( e.message || e ).slice( 0, 100 ) }` );
	}
	const proven = 'missing-setting' === i.kind ? false === r?.changed
		: 'hardcode' === i.kind ? ! blank( r?.rule )
			: 'missing-block' === i.kind ? Array.isArray( r?.matches ) && 0 === r.matches.length
				: true === r?.flowFails && Array.isArray( r?.attributeMatches ) && 0 === r.attributeMatches.length;
	return proven ? ok( r.evidence ?? JSON.stringify( r ), { framework: PROBE_CLASS[ i.kind ] } ) : fail( 'W-route', `the ${ i.kind } probe did not prove the gap: ${ r?.evidence ?? JSON.stringify( r ?? null ) }` );
}

// G7 Re-check. i: { recheck() -> { stillOpen } }. A row that a fresh walk no longer shows is dropped as closed.
export async function g7Recheck( i ) {
	if ( 'function' !== typeof i?.recheck ) {
		return fail( 'I-stale', 'no re-check was supplied' );
	}
	let r;
	try {
		r = await i.recheck();
	} catch ( e ) {
		return fail( 'I-stale', `the re-check failed: ${ String( e.message || e ).slice( 0, 100 ) }` );
	}
	if ( 'boolean' !== typeof r?.stillOpen ) {
		return fail( 'I-stale', 're-check returned no answer' );
	}
	return r.stillOpen ? ok( r.evidence ?? 'still open on a fresh walk' ) : fail( 'closed', r.evidence ?? 'a fresh walk no longer shows the row' );
}

// Runs G0 to G7 on a Solve row. ctx.inputs maps a gate name to a function (row, soFar) -> the gate's input (or a promise
// of it); a missing builder, a thrown error or an undefined input fails that gate closed. Returns { gate, class,
// evidence, gates: [{ gate, status: 'pass' | 'fail' | 'not-reached', evidence }], candidate }: gate and class are those
// of the first failing gate, or null and the F-class G6 proved when every gate passed (candidate: true).
export async function runChain( row, ctx ) {
	const fns = { G0: g0Freshness, G1: g1PairAndPaint, G2: g2Intent, G3: g3Db, G4: g4Calibration, G5: g5Emission, G6: g6Probe, G7: g7Recheck };
	const unreadable = { G0: 'I-stale', G1: 'W-walker', G2: 'W-walker', G3: 'I-stale', G4: 'I-calibration', G5: 'W-route', G6: 'W-route', G7: 'I-stale' };
	const gates = GATES.map( ( gate ) => ( { gate, status: 'not-reached', evidence: null } ) );
	const soFar = {};
	for ( let n = 0; n < GATES.length; n++ ) {
		const gate = GATES[ n ];
		let result;
		try {
			const input = ctx?.inputs?.[ gate ] ? await ctx.inputs[ gate ]( row, soFar ) : undefined;
			result = undefined === input ? fail( unreadable[ gate ], `no input for ${ gate }` ) : await fns[ gate ]( input );
		} catch ( e ) {
			result = fail( unreadable[ gate ], `${ gate } input failed: ${ String( e.message || e ).slice( 0, 120 ) }` );
		}
		soFar[ gate ] = result;
		gates[ n ] = { gate, status: result.pass ? 'pass' : 'fail', evidence: result.evidence };
		if ( ! result.pass ) {
			return { gate, class: result.class, evidence: result.evidence, gates, candidate: false };
		}
	}
	return { gate: null, class: soFar.G6.framework, evidence: soFar.G6.evidence, gates, candidate: true };
}
