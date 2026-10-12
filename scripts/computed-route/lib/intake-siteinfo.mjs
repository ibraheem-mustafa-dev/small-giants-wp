// Site Info proposal (Spec 48 FR-48-32). Harvests business details from one export: template links (tel:, mailto:,
// social hosts, wa.me, and `#` links an accessible label names as a social brand), logic links (through
// lib/intake-routing.mjs::readRouting), logic data objects (label/value pairs, phone/email/address keys, an hours
// object of per-weekday minute ranges), labelled template text ("Call us", "Email us", "Opening hours", a postcode
// address) and the print of `sync-business-info.py --draft` (run as a command, never with --push; R-47-1). Every
// candidate is shape-validated (lib/intake-siteinfo-shape.mjs); one review row per key and normalised value, so two
// values for one key are two rows, never a silent pick. handoverFor/provisionDryRun feed the confirmed set to
// `provision-site-info-from-draft.py` without --apply. A failing command or unreadable draft is a gap row (R-48-3).
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { attrOf, evalStr, keyName, resolveName, snippet } from './intake-ast.mjs';
import { loadExport, readRouting } from './intake-routing.mjs';
import { brandRegistry } from './brand-registry.mjs';
import { DAYS, POSTCODE, validate, socialKey, brandByLabel, locator, textRuns, parseHoursText } from './intake-siteinfo-shape.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
export const SYNC_SCRIPT = path.join( REPO, 'plugins', 'sgs-blocks', 'scripts', 'sync-business-info.py' );
export const PROVISION_SCRIPT = path.join( REPO, 'plugins', 'sgs-blocks', 'scripts', 'provision-site-info-from-draft.py' );

// Template label text → Site Info key ("Call us" / "Email us" / "Opening hours" / "Find us").
const TEXT_LABELS = [ [ /^(call us|phone|telephone|tel)$/i, 'phone' ], [ /^(email us|email|e-mail)$/i, 'email' ],
	[ /^(opening hours|opening times|hours)$/i, 'hours' ], [ /^(address|find us|visit us|our address)$/i, 'address' ] ];
// A logic data object's `label` → key (Visit / Call / Email cards).
const DATA_LABELS = [ [ /^(call|phone|telephone|tel)\b/i, 'phone' ], [ /^e-?mail\b/i, 'email' ], [ /^(visit|address|find us|location|where)\b/i, 'address' ], [ /^(opening|hours)\b/i, 'hours' ] ];
const DATA_KEYS = { phone: 'phone', telephone: 'phone', tel: 'phone', email: 'email', address: 'address' };
const labelKey = ( table, text ) => table.find( ( [ re ] ) => re.test( String( text ).trim() ) )?.[ 1 ] ?? null;
const gap = ( construct, draftId, error ) => ( { construct, draftId, error } );

// The Site Info key and raw value of a link, or null when it is no business detail.
export function linkCandidate( href, label = '' ) {
	const v = String( href ?? '' ).trim();
	if ( /^tel:/i.test( v ) ) {
		return { key: 'phone', raw: decodeURIComponent( v.slice( 4 ) ) };
	}
	if ( /^mailto:/i.test( v ) ) {
		return { key: 'email', raw: decodeURIComponent( v.slice( 7 ).split( '?' )[ 0 ] ) };
	}
	const named = brandByLabel( label );
	if ( /^#/.test( v ) || '' === v ) {
		return named && /^#\/?$/.test( v || '#' ) ? { key: named.siteInfoKey, raw: v || '#' } : null;
	}
	const key = socialKey( v );
	if ( key ) {
		return { key, raw: v };
	}
	return named && /^https?:\/\//i.test( v ) ? { key: named.siteInfoKey, raw: v } : null;
}

// A literal's static value (number, string, array of literals; identifiers through their declaration), else undefined.
function literal( idx, n, depth = 0 ) {
	if ( ! n || depth > 4 ) {
		return undefined;
	}
	if ( 'NumericLiteral' === n.type || 'StringLiteral' === n.type ) {
		return n.value;
	}
	if ( 'ArrayExpression' === n.type ) {
		const out = n.elements.map( ( e ) => literal( idx, e, depth + 1 ) );
		return out.some( ( x ) => undefined === x ) ? undefined : out;
	}
	if ( 'Identifier' === n.type ) {
		const r = resolveName( idx, n );
		return 'var' === r?.kind && ! r.key ? literal( idx, r.init, depth + 1 ) : undefined;
	}
	return undefined;
}

// An object literal of weekday → [[start, end]] minute ranges (0-6 with 0 = Sunday as JS Date numbers them, 1-7 with
// 7 = Sunday, or day names); five days or more must be present. Returns { day: ranges } or null.
function hoursObject( idx, obj ) {
	const entries = obj.properties.map( ( p ) => ( 'ObjectProperty' === p.type ? [ keyName( p ) ?? String( p.key.value ), literal( idx, p.value ) ] : [ null ] ) );
	if ( entries.length < 5 || entries.some( ( [ k, v ] ) => null == k || ! Array.isArray( v ) || v.some( ( r ) => ! Array.isArray( r ) || ! r.every( ( x ) => 'number' === typeof x ) ) ) ) {
		return null;
	}
	const iso = entries.some( ( [ k ] ) => '7' === String( k ) );
	const day = ( k ) => ( /^\d$/.test( k ) ? DAYS[ Number( k ) % 7 ] : DAYS.find( ( d ) => d.startsWith( String( k ).toLowerCase().slice( 0, 3 ) ) ) );
	const out = {};
	for ( const [ k, v ] of entries ) {
		const d = day( String( k ) );
		if ( ! d || ( iso && '0' === String( k ) ) ) {
			return null;
		}
		out[ d ] = v;
	}
	return out;
}

// Candidates from one draft's logic: data objects, keyed values and hours objects.
function logicCandidates( d, loc, add ) {
	const idx = d.idx;
	const str = ( n ) => {
		const r = n ? evalStr( idx, n ) : null;
		return 1 === r?.values.length && ! r.partial.length && ! r.unresolved.length ? r.values[ 0 ] : null;
	};
	for ( const n of idx.all ) {
		if ( 'ObjectExpression' === n.type ) {
			const prop = ( k ) => n.properties.find( ( p ) => 'ObjectProperty' === p.type && keyName( p ) === k )?.value;
			const hours = hoursObject( idx, n );
			if ( hours ) {
				const where = idx.parent.get( idx.parent.get( idx.parent.get( n ) ) );
				const via = where && 'get' === where.kind ? `get ${ keyName( where ) }()` : snippet( idx, n, 60 );
				Object.entries( hours ).forEach( ( [ day, ranges ] ) => add( `hours.${ day }`, ranges, `logic hours object ${ via }`, loc.node( d, n ) ) );
				continue;
			}
			const label = str( prop( 'label' ) );
			const key = label ? labelKey( DATA_LABELS, label ) : null;
			const value = str( prop( 'value' ) );
			if ( key && value ) {
				const note = str( prop( 'note' ) );
				const raw = 'address' === key && note && POSTCODE.test( note ) && ! POSTCODE.test( value ) ? `${ value }, ${ note }` : value;
				add( key, raw, `logic data object { label: '${ label }' }`, loc.node( d, n ) );
			}
		} else if ( 'ObjectProperty' === n.type && DATA_KEYS[ keyName( n ) ] ) {
			const value = str( n.value );
			if ( value ) {
				add( DATA_KEYS[ keyName( n ) ], value, `logic data key ${ keyName( n ) }`, loc.node( d, n ) );
			}
		}
	}
}

// Candidates from one draft's template: links, labelled text and postcode addresses.
function templateCandidates( d, loc, add ) {
	const runs = textRuns( d );
	for ( const t of d.tags.filter( ( x ) => 'link' !== x.name && undefined !== attrOf( x, 'href' ) ) ) {
		const href = attrOf( t, 'href' );
		if ( href.includes( '{{' ) && ! /^(tel|mailto):/i.test( href ) ) {
			continue;
		}
		const label = attrOf( t, 'aria-label' ) || attrOf( t, 'title' ) || runs.find( ( r ) => r.tag === t )?.text || '';
		const c = linkCandidate( href, label );
		if ( c ) {
			add( c.key, c.raw, `template <${ t.name } href>`, loc.tag( d, t ) );
		}
	}
	runs.forEach( ( r, i ) => {
		const m = /^([^:]{2,20}?)\s*:?\s*$/.exec( r.text ) || /^([^:]{2,20}?)\s*:\s*(.+)$/.exec( r.text );
		const key = m ? labelKey( TEXT_LABELS, m[ 1 ] ) : null;
		let value = key ? m[ 2 ] ?? runs[ i + 1 ]?.text : null;
		for ( let k = i + 2; key && ! m[ 2 ] && runs[ k ]?.joined; k++ ) {
			value = `${ value.replace( /,$/, '' ) }, ${ runs[ k ].text }`;
		}
		const days = 'hours' === key && value && ! value.includes( '{{' ) ? parseHoursText( value ) : null;
		if ( days ) {
			Object.entries( days ).forEach( ( [ day, ranges ] ) => add( `hours.${ day }`, ranges, `template label "${ m[ 1 ] }"`, loc.tag( d, r.tag ) ) );
		} else if ( key && value ) {
			add( key, value, `template label "${ m[ 1 ] }"`, loc.tag( d, r.tag ) );
		} else if ( POSTCODE.test( r.text ) && ! r.text.includes( '{{' ) && ! ( key && m[ 2 ] ) ) {
			let j = i;
			while ( j > 0 && runs[ j ].joined ) {
				j--;
			}
			const lines = runs.slice( j, i + 1 ).map( ( x ) => x.text.replace( /,$/, '' ) );
			while ( runs[ i + 1 ]?.joined ) {
				lines.push( runs[ ++i ].text.replace( /,$/, '' ) );
			}
			add( 'address', lines.join( ', ' ).replace( /^(find us|visit us|address)\s*:\s*/i, '' ), 'template text with a UK postcode', loc.tag( d, runs[ j ].tag ) );
		}
	} );
}

// Parses the `sync-business-info.py --draft` print: [{ key, raw }] (opening_hours.<day> becomes hours.<day>).
export function parseSyncPrint( text ) {
	return String( text ).split( /\r?\n/ ).map( ( l ) => /^ {2}([a-z_][a-z0-9_.]*)\s+= (.*)$/i.exec( l ) ).filter( Boolean )
		.map( ( [ , k, v ] ) => ( { key: k.replace( /^opening_hours\./, 'hours.' ), raw: v.trim() } ) );
}

// Runs `sync-business-info.py --draft <file>` print-only: { stdout } or { error }.
export function runSyncPrint( file, { python = 'python', script = SYNC_SCRIPT, timeout = 60000 } = {} ) {
	const args = [ script, '--draft', file ];
	if ( args.includes( '--push' ) ) {
		throw new Error( 'sync-business-info.py never runs with --push from intake' );
	}
	const r = spawnSync( python, args, { encoding: 'utf8', timeout, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } } );
	if ( r.error || 0 !== r.status ) {
		return { error: `exit ${ r.status ?? 'none' }: ${ ( r.stderr || r.error?.message || '' ).trim() }` };
	}
	return { stdout: r.stdout };
}

// The Site Info proposal for one export folder. `routing` (a readRouting result) and `census` (a staticCensus result,
// for `<component>:<data-dc-tpl>` draft IDs) are optional; `syncPrint` is { file: printed text } to use given prints,
// false to skip the script, or omitted to run it on every draft. Returns { rows, refused, gaps }.
export function proposeSiteInfo( { folder, routing = null, census = null, syncPrint, python = 'python' } ) {
	const exp = loadExport( folder );
	const loc = locator( census );
	const gaps = [];
	const cands = [];
	const add = ( key, raw, source, where ) => cands.push( { key, raw, source, ...where } );
	let links = routing?.links;
	if ( ! links ) {
		try {
			links = readRouting( { folder } ).links;
		} catch ( e ) {
			gaps.push( e.gap || gap( 'routing', folder, e.message ) );
			links = [];
		}
	}
	for ( const d of exp.drafts ) {
		if ( d.error ) {
			gaps.push( gap( 'draft', d.file, d.error ) );
			continue;
		}
		templateCandidates( d, loc, add );
		if ( d.idx ) {
			logicCandidates( d, loc, add );
		}
		for ( const l of links.filter( ( x ) => ! x.partial && x.from.startsWith( `${ d.file }:` ) && x.from.includes( '(logic)' ) ) ) {
			const c = linkCandidate( l.href );
			const line = Number( /^.+?:(\d+) \(logic\)/.exec( l.from )?.[ 1 ] );
			const node = d.idx?.all.find( ( n ) => 'StringLiteral' === n.type && n.value === l.href && d.idx.line( n ) === line );
			if ( c ) {
				add( c.key, c.raw, `logic link ${ l.call || 'data href' }`, node ? loc.node( d, node ) : { draftId: `${ d.file }:js:${ line }`, location: `${ d.file }:js:${ line }` } );
			}
		}
		if ( false !== syncPrint ) {
			const printed = syncPrint ? { stdout: syncPrint[ d.file ] ?? '' } : runSyncPrint( path.join( folder, d.file ), { python } );
			if ( printed.error ) {
				gaps.push( gap( 'sync-business-info', d.file, printed.error ) );
			}
			parseSyncPrint( printed.stdout || '' ).forEach( ( c ) => add( c.key, c.raw, 'sync-business-info.py --draft (print only)', { draftId: d.file, location: `sync-business-info.py --draft ${ d.file }` } ) );
		}
	}
	return { ...group( cands ), gaps };
}

// One row per key and normalised value (refused values per key and raw value); sources merged.
function group( cands ) {
	const groups = new Map();
	for ( const c of cands ) {
		const v = validate( c.key, c.raw );
		const id = `${ c.key }\u0001${ v.valid ? v.normalised : `!${ JSON.stringify( c.raw ) }` }`;
		const g = groups.get( id ) || { key: c.key, value: c.raw, normalised: v.normalised, sources: [], valid: v.valid, reason: v.reason };
		if ( 'phone' === c.key && /\s/.test( c.raw ) && ! /\s/.test( g.value ) ) {
			g.value = c.raw;
		}
		if ( ! g.sources.some( ( s ) => s.source === c.source && s.location === c.location ) ) {
			g.sources.push( { source: c.source, draftId: c.draftId, location: c.location } );
		}
		groups.set( id, g );
	}
	const out = { rows: [], refused: [] };
	for ( const list of [ 'rows', 'refused' ] ) {
		const of = [ ...groups.values() ].filter( ( g ) => g.valid === ( 'rows' === list ) );
		for ( const g of of ) {
			const same = of.filter( ( x ) => x.key === g.key );
			const n = same.indexOf( g ) + 1;
			const base = 'rows' === list ? `siteinfo:${ g.key }` : `siteinfo:refused:${ g.key }`;
			out[ list ].push( { rowId: 1 === same.length && 'rows' === list ? base : `${ base }#${ n }`, ...g, value: Array.isArray( g.value ) ? g.normalised : g.value } );
		}
	}
	return out;
}

// The Site Info keys provision-site-info-from-draft.py fills: the registry's siteInfoKeys (its ALLOWED_KEYS mirror
// Sgs_Site_Info_Binding::EDITOR_KEYS, which the registry also names).
export const provisionKeys = () => brandRegistry().map( ( b ) => b.siteInfoKey ).filter( Boolean );

// The handover entries for the confirmed rows ({ owner: 'site-info', key, address, ref }) and the rows not applied,
// each with its reason. A row's `mark` (Appendix C) is honoured: `drop` is not applied, `edit:<value>` replaces it.
export function handoverFor( confirmedRows ) {
	const keys = new Set( provisionKeys() );
	const entries = [];
	const notApplied = [];
	const live = confirmedRows.filter( ( r ) => 'drop' !== r.mark );
	confirmedRows.filter( ( r ) => 'drop' === r.mark ).forEach( ( r ) => notApplied.push( { rowId: r.rowId, key: r.key, reason: 'dropped in review' } ) );
	for ( const r of live ) {
		const edited = String( r.mark || '' ).startsWith( 'edit:' ) ? r.mark.slice( 5 ) : null;
		const check = edited === null ? r : { ...r, ...validate( r.key, edited ) };
		const twins = live.filter( ( x ) => x.key === r.key );
		const reason = ! keys.has( r.key ) ? `provision-site-info-from-draft.py does not fill ${ r.key }`
			: ! check.valid ? `failed shape validation: ${ check.reason }`
				: twins.length > 1 ? `${ twins.length } confirmed values for ${ r.key }; mark all but one drop` : null;
		if ( reason ) {
			notApplied.push( { rowId: r.rowId, key: r.key, reason } );
			continue;
		}
		const value = edited ?? ( 'email' === r.key ? r.normalised : r.value );
		const address = 'phone' === r.key ? String( value ).replace( /^tel:/i, '' ) : value;
		entries.push( { owner: 'site-info', key: r.key, address, ref: r.rowId } );
	}
	return { entries, notApplied };
}

// The printed table of provision-site-info-from-draft.py: [{ key, current, address, result }].
export function parseProvisionTable( lines ) {
	const head = lines.findIndex( ( l ) => /^key\s+\|\s+current value\s+\|/.test( l ) );
	if ( head < 0 ) {
		return [];
	}
	const rows = [];
	for ( const l of lines.slice( head + 2 ) ) {
		if ( ! l.includes( ' | ' ) ) {
			break;
		}
		const [ key, current, address, result ] = l.split( ' | ' ).map( ( c ) => c.trim() );
		rows.push( { key, current, address, result } );
	}
	return rows;
}

// Runs provision-site-info-from-draft.py as a dry run (never --apply): { table, lines, code, stderr, gaps }.
export function provisionDryRun( { site, handoverFile, script = PROVISION_SCRIPT, python = 'python', timeout = 180000 } ) {
	const args = [ script, '--site', site, '--handover', handoverFile ];
	const r = spawnSync( python, args, { encoding: 'utf8', timeout, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } } );
	const lines = ( r.stdout || '' ).split( /\r?\n/ );
	const stderr = ( r.stderr || r.error?.message || '' ).trim();
	const code = r.status ?? null;
	return { table: parseProvisionTable( lines ), lines, code, stderr, gaps: 0 === code ? [] : [ gap( 'provision-dry-run', handoverFile, `exit ${ code ?? 'none' }: ${ stderr }` ) ] };
}
