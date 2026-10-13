// Bean's one batched intake review (Spec 48 FR-48-17, Appendix C "Intake record" `review` and "Review marks").
// review.md is generated from intake.json; Bean ticks a section's "Accept all" box and writes a mark only in the Mark
// cell of a row he wants changed. A row's own mark beats Accept all; a flag row left blank is `accept-flagged` and a
// not-a-defect row left blank is `not-a-defect` (Appendix C calls each "the default"); every other row needs Accept all
// or its own mark, notices included: Appendix C gives notices the one value `noted`, so a notice is acknowledged,
// never defaulted.
//
// Content hash: SHA-256 of a canonical (sorted-key) JSON of HASH_FIELDS[rowType] plus `draftId`, so a mark carries
// across an identical re-export and is dropped when what the row shows changes. Proposal noise (confidence, scores,
// "why" text, source locations, screenshots) is never hashed. Defect and missing-feature rows hash every field except
// VOLATILE ones.
//
// Row IDs: `|`, a backtick, CR and LF would break the review table, so each is written as %7C, %60, %0D or %0A, and
// a row ID that is still not unique gains `#<n>`; review.md and intake.review both hold the written form.
//
// Notices come from `intake.notices` ({ prose: commandLikeLines rows, blockedHosts: sandbox blocked rows }).
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isUnwiredEntry } from './intake-defects-static.mjs';

export const ROW_TYPES = [ 'page-map', 'palette-role', 'site-info', 'flag', 'draft-defect', 'not-a-defect', 'missing-feature', 'skeleton-block', 'inventory-diff', 'notice' ];
export const SECTION_TITLES = {
	'page-map': 'Page map', 'palette-role': 'Palette roles', 'site-info': 'Site Info', flag: 'Flags', 'draft-defect': 'Draft defects', 'not-a-defect': 'Not defects: unwired code',
	'missing-feature': 'Missing features', 'skeleton-block': 'Skeleton block choices', 'inventory-diff': 'Inventory diffs', notice: 'Notices',
};

const SLUG = /^[a-z0-9-]+$/;
const BLOCK = /^[a-z0-9-]+\/[a-z0-9-]+$/;
// postType and collection take exactly the values data/page-map.schema.json's enums allow (read once), so a mark can
// never set a value the page map itself refuses, nor refuse one it allows.
const PAGE_ROW = JSON.parse( fs.readFileSync( path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'data', 'page-map.schema.json' ), 'utf8' ) ).items.properties;
const oneOf = ( values ) => ( { test: ( v ) => values.includes( v ) } );
const PAGE_FIELDS = { route: null, slug: SLUG, title: null, parent: null, template: null, postType: oneOf( PAGE_ROW.postType.enum ), collection: oneOf( PAGE_ROW.collection.enum ) };

// The mark vocabulary per row type, in Appendix C order; the first entry is what "Accept all" sets. A pattern entry's
// `check` returns null for a sound mark or the reason it is refused.
export const MARKS = {
	'page-map': [ { value: 'accept' }, { shape: 'edit:<field>=<value>', re: /^edit:([A-Za-z]+)=(.*)$/, check: ( m ) => {
		if ( ! ( m[ 1 ] in PAGE_FIELDS ) ) {
			return `"${ m[ 1 ] }" is not an editable page-map field (${ Object.keys( PAGE_FIELDS ).join( ', ' ) })`;
		}
		const re = PAGE_FIELDS[ m[ 1 ] ];
		return re && ! re.test( m[ 2 ] ) ? `"${ m[ 2 ] }" is not a valid ${ m[ 1 ] }` : null;
	} }, { value: 'drop' } ],
	'palette-role': [ { value: 'accept' }, { shape: 'role:<slug>', re: /^role:(.+)$/, check: ( m ) => ( SLUG.test( m[ 1 ] ) ? null : `"${ m[ 1 ] }" is not a slug` ) }, { value: 'one-off' } ],
	'site-info': [ { value: 'accept' }, { shape: 'edit:<value>', re: /^edit:(.*)$/, check: ( m ) => ( m[ 1 ].trim() ? null : 'the edited value is empty' ) }, { value: 'drop' } ],
	flag: [ { value: 'accept-flagged' }, { value: 'not-flagged' } ],
	'draft-defect': [ { value: 'accept' }, { value: 'render-wins' } ],
	'not-a-defect': [ { value: 'not-a-defect' }, { value: 'defect' } ],
	'missing-feature': [ { shape: 'map:<block>', re: /^map:(.+)$/, check: ( m ) => ( BLOCK.test( m[ 1 ] ) ? null : `"${ m[ 1 ] }" is not a block name` ) }, { value: 'difference' }, { value: 'build' } ],
	'skeleton-block': [ { value: 'accept' }, { shape: 'block:<slug>', re: /^block:(.+)$/, check: ( m ) => ( BLOCK.test( m[ 1 ] ) ? null : `"${ m[ 1 ] }" is not a block name` ) }, { value: 'remove' } ],
	'inventory-diff': [ { value: 'ours' }, { value: 'theirs' } ],
	notice: [ { value: 'noted' } ],
};

// Row types whose blank Mark cell takes the first value (Appendix C calls it "the default" for both).
export const DEFAULTED = [ 'flag', 'not-a-defect' ];

export const markShapes =( rowType ) => MARKS[ rowType ].map( ( m ) => m.value ?? m.shape );

// null when `mark` is one of the row type's values, else why it is refused.
export function markProblem( rowType, mark ) {
	for ( const m of MARKS[ rowType ] || [] ) {
		if ( m.value === mark ) {
			return null;
		}
		const hit = m.re?.exec( mark );
		if ( hit ) {
			return m.check( hit );
		}
	}
	return `not a ${ rowType } mark (${ markShapes( rowType ).join( ', ' ) })`;
}

export const HASH_FIELDS = {
	'page-map': [ 'route', 'slug', 'title', 'parent', 'template', 'postType', 'collection', 'menus', 'flags' ],
	'palette-role': [ 'token', 'hex', 'role' ],
	'site-info': [ 'key', 'value', 'normalised' ],
	flag: [ 'kind', 'text', 'url' ],
	'not-a-defect': [ 'censusId', 'why', 'note' ],
	// What a diff row states, never its `text` or row ID (both name record IDs, which renumber across a re-export).
	'inventory-diff': [ 'draftId', 'field', 'ours', 'theirs' ],
	'skeleton-block': [ 'surface', 'key', 'tag', 'words', 'block', 'action' ], // action only when it removes or absorbs
	notice: [ 'kind', 'file', 'text', 'host', 'reasons' ],
};
export const VOLATILE = [ 'rowId', 'confidence', 'score', 'scores', 'why', 'reason', 'location', 'source', 'sources', 'screenshots', 'snippet', 'candidates', 'low', 'ms' ];

const canonical = ( v ) => {
	if ( Array.isArray( v ) ) {
		return `[${ v.map( canonical ).join( ',' ) }]`;
	}
	if ( v && 'object' === typeof v ) {
		return `{${ Object.keys( v ).sort().filter( ( k ) => undefined !== v[ k ] ).map( ( k ) => `${ JSON.stringify( k ) }:${ canonical( v[ k ] ) }` ).join( ',' ) }}`;
	}
	return JSON.stringify( v ?? null );
};
export const sha = ( s ) => crypto.createHash( 'sha256' ).update( s ).digest( 'hex' );

export function contentHash( rowType, row, draftId ) {
	const fields = HASH_FIELDS[ rowType ] || Object.keys( row ).filter( ( k ) => ! VOLATILE.includes( k ) );
	return sha( canonical( { draftId, ...Object.fromEntries( fields.map( ( k ) => [ k, row[ k ] ] ) ) } ) );
}

const text = ( v ) => ( null === v || undefined === v ? '' : 'string' === typeof v ? v : canonical( v ) );
const describe = ( r ) => text( r.text ?? r.summary ?? r.line ?? r.what ?? r.title ?? r.description ?? Object.fromEntries( Object.entries( r ).filter( ( [ k ] ) => ! VOLATILE.includes( k ) && 'draftId' !== k ) ) );
const unique = ( list ) => {
	const seen = new Map();
	return list.map( ( r ) => {
		const n = ( seen.get( r.rowId ) || 0 ) + 1;
		seen.set( r.rowId, n );
		return 1 === n ? r : { ...r, rowId: `${ r.rowId }#${ n }` };
	} );
};

// Why a skeleton or missing-feature row needs Bean's judgement rather than a glance (null: a confident proposal Accept
// all covers). Skeleton: the finaliser agent picked it, no block fits, or its confidence is low. Missing feature: it is
// on the main flow, or it proposes no block (Accept all cannot mark it).
export const NEEDS_ORDER = [ 'agent-pick', 'unresolved', 'low', 'main-flow', 'no-block' ];
// The cause that settled a skeleton row, for grouping the review by cause (Spec 48 FR-48-6): the client's built post or
// the standing rule (lib/skeleton-rules.mjs), with its reason; {} for a row the scoring proposed.
const causeOf = ( r ) => {
	if ( r.builtPost ) {
		return { cause: `built post ${ r.builtPost.postType } ${ r.builtPost.postId }`, causeReason: `the client already built this surface (${ r.builtPost.title || r.builtPost.postType } on ${ r.builtPost.site })` };
	}
	return r.rule && 'agent' !== r.finalisedBy ? { cause: `rule ${ r.rule }`, causeReason: r.reason || '' } : {};
};
const skeletonNeeds = ( r ) => ( 'agent' === r.finalisedBy ? 'agent-pick' : 'unresolved' === r.action ? 'unresolved' : r.low ? 'low' : null );
const proposalText = ( r ) => ( r.block ? `block:${ r.block }` : r.action && 'unresolved' !== r.action ? r.action : 'no block' );
const skeletonNote = ( r ) => ( 'agent' === r.finalisedBy
	? `agent pick ${ r.confidence ?? '?' }: ${ r.reason ?? '' }; was ${ proposalText( r.original || {} ) } ${ r.original?.confidence ?? '' }`.trim()
	: [ r.confidence, r.reason ].filter( ( x ) => null != x && '' !== x ).join( ': ' ) );

// The not-a-defect entries (FR-48-34) listed one per review row: dead code of the unwired kind (its `deadKind`, or for
// an older record without one lib/intake-defects-static.mjs::isUnwired over its note), each with a stable
// `not-defect:<censusId>` row ID.
export const unwiredRows = ( intake ) => unique( ( intake.notDefects || [] ).filter( isUnwiredEntry )
	.map( ( r ) => ( { ...r, rowId: `not-defect:${ r.censusId ?? r.draftId }` } ) ) );

// The reason cell of every not-a-defect row: what unwired code is, for handlers, ref callbacks, timers and fields alike.
export const UNWIRED_NOTE = 'unwired: nothing live reaches it (a handler, ref callback, timer or observer under a renderVals key no template binding names, or a guard field nothing live writes); a misspelled binding or field name reads the same';

// The counted label of a dead-code kind other than unwired.
const DEAD_LABEL = { 'constant-guard': 'dead-code (constant guard)', 'data-gated': 'dead-code (data-gated)' };

// One header line counting every other not-a-defect entry per reason (constant-guard and data-gated dead code, prop
// variants, prototype-only and the rest), which review.md does not list row by row.
export function notDefectLine( intake ) {
	const counts = new Map();
	( intake.notDefects || [] ).forEach( ( r ) => {
		const key = 'dead-code' === r.why ? ( isUnwiredEntry( r ) ? null : DEAD_LABEL[ r.deadKind ] ?? DEAD_LABEL[ 'constant-guard' ] ) : r.why;
		key && counts.set( key, ( counts.get( key ) || 0 ) + 1 );
	} );
	const list = [ ...counts ].sort( ( a, b ) => ( a[ 0 ] < b[ 0 ] ? -1 : 1 ) ).map( ( [ k, n ] ) => `${ k } ${ n }` );
	return `Not defects counted, not listed: ${ list.length ? list.join( ', ' ) : 'none' }.`;
}

// The flat review rows of an intake record, section by section: { rowId, rowType, draftId, contentHash, shows,
// proposed, note, acceptAll, needs } where `acceptAll` is the mark the section's Accept all gives the row (null when
// the first value needs a block the row does not propose) and `needs` is skeletonNeeds' or the missing-feature reason
// (undefined for the other row types, whose every row is read).
const ID_ESCAPES = { '|': '%7C', '`': '%60', '\r': '%0D', '\n': '%0A' };
export const safeRowId = ( id ) => String( id ).replace( /[|`\r\n]/g, ( c ) => ID_ESCAPES[ c ] );

export function reviewRows( intake ) {
	const out = [];
	const taken = new Set();
	const rowIdOf = ( id ) => {
		const base = safeRowId( id );
		let n = 1;
		let next = base;
		while ( taken.has( next ) ) {
			n++;
			next = `${ base }#${ n }`;
		}
		taken.add( next );
		return next;
	};
	const add = ( rowType, row, draftId, shows, proposed = '', note = '', acceptAll = MARKS[ rowType ][ 0 ].value, needs = undefined, extra = {} ) => out.push( {
		rowId: rowIdOf( row.rowId ), rowType, draftId: String( draftId ?? '' ), contentHash: contentHash( rowType, row, draftId ), shows, proposed, note, acceptAll, ...( undefined === needs ? {} : { needs } ), ...extra,
	} );
	unique( ( intake.pageMap || [] ).map( ( r ) => ( { ...r, rowId: `page:${ r.postType }:${ r.slug }` } ) ) ).forEach( ( r ) => add( 'page-map', r, r.route ?? r.slug,
		`${ r.route ?? '(no route)' } → ${ r.title } (${ r.postType }, ${ r.collection }${ r.template ? `, ${ r.template }` : '' })`,
		`${ r.parent ? `${ r.parent }/` : '' }${ r.slug }`,
		[ ...( r.menus || [] ).map( ( m ) => `${ m.menu } #${ m.position }` ), ...( r.flags || [] ) ].join( ', ' ) ) );
	( intake.palette?.rows || [] ).forEach( ( r ) => add( 'palette-role', r, r.token, `${ r.token } ${ r.hex }`, r.role ? `role:${ r.role }` : 'no slug (one-off)', [ r.confidence, r.why ].filter( Boolean ).join( ': ' ) ) );
	( intake.siteInfo?.rows || [] ).forEach( ( r ) => add( 'site-info', r, r.key, `${ r.key }: ${ text( r.value ) }`, text( r.normalised ), ( r.sources || [] ).map( ( s ) => s.draftId || s.location ).filter( Boolean ).join( ', ' ) ) );
	( intake.flags || [] ).forEach( ( r ) => add( 'flag', r, r.draftId, `${ r.kind }: ${ r.text ?? r.url ?? '' }`, 'accept-flagged', r.why || '' ) );
	( intake.draftDefects || [] ).forEach( ( r ) => add( 'draft-defect', r, r.draftId, describe( r ), text( r.proposed ?? r.intent ?? 'build the code\'s intent' ), text( r.why ?? r.reason ) ) );
	unwiredRows( intake ).forEach( ( r ) => add( 'not-a-defect', r, r.draftId, `${ r.censusId ?? r.draftId } ${ text( r.note ) }`, 'not-a-defect', UNWIRED_NOTE ) );
	( intake.missingFeatures || [] ).forEach( ( r ) => {
		const block = r.block ?? r.proposedBlock ?? null;
		const acceptAll = block && BLOCK.test( block ) ? `map:${ block }` : null;
		add( 'missing-feature', r, r.draftId, describe( r ), block ? `map:${ block }` : 'no block proposed', text( r.why ?? r.reason ), acceptAll, r.mainFlow ? 'main-flow' : acceptAll ? null : 'no-block' );
	} );
	const sk = intake.skeletons || {};
	( Array.isArray( sk ) ? sk : Object.entries( sk ).map( ( [ surface, s ] ) => ( { surface, ...s } ) ) ).forEach( ( s ) => ( s.rows || [] ).forEach( ( r ) => add( 'skeleton-block',
		{ surface: s.surface, ...r, action: r.action && 'unresolved' !== r.action ? r.action : undefined, rowId: r.rowId || `skeleton:${ s.surface }:${ r.key }` }, r.key,
		`${ s.surface } ${ r.key } <${ r.tag ?? '?' }>${ r.words ? ` "${ text( r.words ) }"` : '' }`, proposalText( r ), skeletonNote( r ), MARKS[ 'skeleton-block' ][ 0 ].value, skeletonNeeds( r ), causeOf( r ) ) ) );
	( intake.inventory?.diff || [] ).forEach( ( r ) => add( 'inventory-diff', { ...r, rowId: r.rowId || `inventory:${ r.draftId }` }, r.draftId, describe( r ), 'ours', text( r.why ?? r.reason ) ) );
	( intake.notices?.prose || [] ).forEach( ( r ) => add( 'notice', { kind: 'prose', file: r.file, text: r.text, rowId: `notice:${ r.rowId }` }, `${ r.file }:${ r.line }`, `${ r.file }:${ r.line } ${ r.text }`, 'noted', r.why || '' ) );
	const hosts = new Map();
	( intake.notices?.blockedHosts || [] ).forEach( ( b ) => {
		const h = b.host || b.url;
		hosts.set( h, [ ...( hosts.get( h ) || [] ), b ] );
	} );
	[ ...hosts ].forEach( ( [ host, list ] ) => {
		const reasons = [ ...new Set( list.map( ( b ) => b.reason ) ) ].sort();
		const urls = [ ...new Set( list.map( ( b ) => b.url ) ) ].sort();
		add( 'notice', { kind: 'host', host, reasons, rowId: `notice:host:${ host }` }, host, `request to ${ host } blocked (${ urls.length } URL${ 1 === urls.length ? '' : 's' }, first ${ urls[ 0 ] })`, 'noted', reasons.join( ', ' ) );
	} );
	return out;
}

const cell = ( v ) => String( v ?? '' ).replace( /\r?\n/g, ' ' ).replace( /\|/g, '\\|' ).trim();
const byId = ( a, b ) => ( a.rowId < b.rowId ? -1 : a.rowId > b.rowId ? 1 : 0 );
const ordered = ( rows, changed ) => [ ...rows.filter( ( r ) => changed.has( r.rowId ) ).sort( byId ), ...rows.filter( ( r ) => ! changed.has( r.rowId ) ).sort( byId ) ];
const rank = ( r, changed ) => ( changed.has( r.rowId ) ? -1 : NEEDS_ORDER.indexOf( r.needs ) );
// Rows needing judgement (changed first, then NEEDS_ORDER, each by row ID) and the confident rest (by row ID).
const splitByNeed = ( rows, changed ) => [
	rows.filter( ( r ) => changed.has( r.rowId ) || r.needs ).sort( ( a, b ) => rank( a, changed ) - rank( b, changed ) || byId( a, b ) ),
	rows.filter( ( r ) => ! changed.has( r.rowId ) && ! r.needs ).sort( byId ),
];
const SPLIT = new Set( [ 'skeleton-block', 'missing-feature' ] );

// The skeleton rows grouped by cause, never by page: [ [ heading, rows ] ]. First the rows changed since the last export
// (`changed`, a Set of row IDs: they lost their mark), then the rows still needing Bean's judgement, by what they need (NEEDS_ORDER) and the block proposed; then each standing rule and built post with its
// reason, so one rule's rows are approved together; then the confident scored proposals.
export function byCause( rows, changed = new Set() ) {
	const groups = new Map();
	const put = ( key, order, heading, r ) => {
		const g = groups.get( key ) || groups.set( key, { order, heading, list: [] } ).get( key );
		g.list.push( r );
		// The heading takes the rule's own reason: the first row stating it, not a row absorbed into another or one
		// whose reason the cross-surface collapse prefixed.
		heading && ( ! g.heading || g.heading.endsWith( ': ' ) ) && ( g.heading = heading );
	};
	for ( const r of rows ) {
		if ( changed.has( r.rowId ) ) {
			put( '-', '-', 'Changed since the last export', r );
		} else if ( r.needs ) {
			put( `0 ${ NEEDS_ORDER.indexOf( r.needs ) } ${ r.proposed }`, `0 ${ NEEDS_ORDER.indexOf( r.needs ) } ${ r.proposed }`, `Needs a decision (${ r.needs }): ${ r.proposed }`, r );
		} else if ( r.cause ) {
			const reason = String( r.causeReason ?? '' ).replace( /^\d+ copies of one template element(?: on \d+ surfaces)?; /, '' );
			put( `1 ${ r.cause }`, `1 ${ r.cause }`, /^drawn by /.test( reason ) ? `Settled by ${ r.cause }: ` : `Settled by ${ r.cause }: ${ cell( reason.replace( /\|/g, '/' ) ) }`, r );
		} else {
			put( '2', '2', CONFIDENT_HEADING, r );
		}
	}
	const sorted = [ ...groups.values() ].sort( ( a, b ) => ( a.order < b.order ? -1 : a.order > b.order ? 1 : 0 ) );
	// A group whose every row is absorbed into another block states what absorbed means.
	return sorted.map( ( g ) => [ `${ g.heading.replace( /: $/, ': the block each sits in draws it (each row\'s reason names that block)' ) } (${ g.list.length })`, g.list ] );
}
export const CONFIDENT_HEADING = 'Confident proposals (Accept all covers these)';

// { total, read, confident, skeleton, missing }: rows Bean reads one by one versus the confident skeleton and
// missing-feature proposals that the section's Accept all covers without reading (a changed row is always read).
export function readingCounts( intake, changed = ( intake.review || [] ).filter( ( r ) => r.changed ).map( ( r ) => r.rowId ) ) {
	const ch = new Set( changed );
	const rows = reviewRows( intake );
	const confident = rows.filter( ( r ) => SPLIT.has( r.rowType ) && ! r.needs && ! ch.has( r.rowId ) );
	const by = ( t ) => confident.filter( ( r ) => r.rowType === t ).length;
	return { total: rows.length, read: rows.length - confident.length, confident: confident.length, skeleton: by( 'skeleton-block' ), missing: by( 'missing-feature' ) };
}
const TABLE_HEAD = [ '| Row | Shows | Proposed | Confidence or reason | Mark |', '|---|---|---|---|---|' ];
const readingLine = ( c ) => `Rows: ${ c.total }; ${ c.read } need reading, ${ c.confident } are confident proposals that Accept all covers (skeleton block choices ${ c.skeleton }, missing features ${ c.missing }).`;
const manifestHash = ( m ) => sha( canonical( m?.files || {} ) ).slice( 0, 16 );

// The Markdown of review.md. `changed` is the rowIds changed since the previous export (by default the review rows
// carryOver set `changed: true` on); they are listed first in their section (and surface) with a **changed** marker.
// The skeleton section is grouped by cause (byCause: the rows needing judgement by need and proposed block, then each
// standing rule or built post with its reason, then the confident proposals); in the missing-feature section the rows
// needing judgement come next (NEEDS_ORDER), then the confident rows under a `### Confident proposals (Accept all
// covers these)` sub-heading; the header states how
// many rows need reading. Marks already in intake.review (carried or applied before) show in the Mark cell.
// Byte-identical for identical input.
export function renderReview( intake, { changed = ( intake.review || [] ).filter( ( r ) => r.changed ).map( ( r ) => r.rowId ) } = {} ) {
	const ch = new Set( changed );
	const marks = new Map( ( intake.review || [] ).map( ( r ) => [ r.rowId, r ] ) );
	const rows = reviewRows( intake );
	const out = [ `# Intake review: ${ intake.client }`, '', `Taken on ${ intake.takenOn }; manifest ${ intake.manifest?.schema_version ?? '?' }, files hash ${ manifestHash( intake.manifest ) }.`, '',
		'How to mark: put x in a section\'s `Accept all: [ ]` box to give every row the section\'s first mark; to mark one row differently, write its mark in that row\'s Mark cell (a row\'s own mark always beats Accept all). Flag rows left blank are accepted as flagged and not-a-defect rows left blank stay not defects; every other row needs Accept all or its own mark. Rows marked **changed** differ from the last export, lost their old mark and come first. Then run `node scripts/computed-route/intake.mjs --apply-review ' + intake.client + '`.', '',
		readingLine( readingCounts( intake, changed ) ), '',
		notDefectLine( intake ), '',
		'Marks per section (first value = Accept all):' ];
	ROW_TYPES.forEach( ( t ) => out.push( `- ${ SECTION_TITLES[ t ] }: ${ markShapes( t ).map( ( s ) => `\`${ s }\`` ).join( ', ' ) }` ) );
	const line = ( r ) => {
		const prior = marks.get( r.rowId );
		const mark = prior && prior.contentHash === r.contentHash && ! ch.has( r.rowId ) ? prior.mark : null;
		return `| \`${ r.rowId }\` | ${ ch.has( r.rowId ) ? '**changed** ' : '' }${ cell( r.shows ) } | ${ cell( r.proposed ) } | ${ cell( r.note ) } | ${ cell( mark ) } |`;
	};
	for ( const t of ROW_TYPES ) {
		const of = rows.filter( ( r ) => r.rowType === t );
		if ( ! of.length ) {
			continue;
		}
		out.push( '', `## ${ SECTION_TITLES[ t ] } (${ t })`, '', 'Accept all: [ ]' );
		if ( 'skeleton-block' === t ) {
			byCause( of, ch ).forEach( ( [ heading, list ] ) => out.push( '', `### ${ heading }`, '', ...TABLE_HEAD, ...ordered( list, ch ).map( line ) ) );
			continue;
		}
		for ( const [ name, list ] of [ [ null, of ] ] ) {
			if ( ! SPLIT.has( t ) ) {
				out.push( '', ...( name ? [ `### ${ name }`, '' ] : [] ), ...TABLE_HEAD, ...ordered( list, ch ).map( line ) );
				continue;
			}
			const [ judge, sure ] = splitByNeed( list, ch );
			judge.length && out.push( '', ...( name ? [ `### ${ name }`, '' ] : [] ), ...TABLE_HEAD, ...judge.map( line ) );
			sure.length && out.push( '', `### ${ name ? `${ name }: ` : '' }${ CONFIDENT_HEADING }`, '', ...TABLE_HEAD, ...sure.map( line ) );
		}
	}
	return `${ out.join( '\n' ) }\n`;
}

const splitRow = ( l ) => {
	const body = l.replace( /^\|/, '' ).replace( /(?<!\\)\|\s*$/, '' );
	return body.split( /(?<!\\)\|/ ).map( ( c ) => c.trim() );
};
const unquote = ( s ) => s.replace( /\\\|/g, '|' ).replace( /^`(.*)`$/, '$1' ).trim();

// Reads review.md back: { sections: { rowType: { acceptAll, exceptions: { rowId: mark } } }, rowMarks, rowSection
// (every rowId listed, with its section's type), problems }. Free text is allowed only before the first section;
// inside sections every line must be a heading, the Accept all line, a table line or blank.
export function parseReview( markdown ) {
	const sections = {};
	const rowMarks = {};
	const rowSection = {};
	const problems = [];
	let cur = null;
	markdown.split( /\r?\n/ ).forEach( ( raw, i ) => {
		const n = i + 1;
		const l = raw.trim();
		const h = /^##\s+(.*?)\s*$/.exec( l );
		if ( h && ! l.startsWith( '###' ) ) {
			const t = /\(([a-z-]+)\)$/.exec( h[ 1 ] )?.[ 1 ];
			if ( ! ROW_TYPES.includes( t ) ) {
				problems.push( `line ${ n }: section heading "${ l }" names no row type (${ ROW_TYPES.join( ', ' ) })` );
				cur = null;
				return;
			}
			if ( sections[ t ] ) {
				problems.push( `line ${ n }: the ${ t } section appears twice` );
			}
			cur = t;
			sections[ t ] = { acceptAll: null, exceptions: {}, line: n };
			return;
		}
		if ( ! cur || ! l || l.startsWith( '### ' ) ) {
			return;
		}
		if ( /^accept all\s*:/i.test( l ) ) {
			const m = /^accept all\s*:\s*\[\s*([xX]?)\s*\]$/i.exec( l );
			if ( ! m ) {
				problems.push( `line ${ n }: "${ l }" is not "Accept all: [ ]" or "Accept all: [x]"` );
			} else if ( null !== sections[ cur ].acceptAll ) {
				problems.push( `line ${ n }: a second Accept all line in the ${ cur } section` );
			} else {
				sections[ cur ].acceptAll = !! m[ 1 ];
			}
			return;
		}
		if ( ! l.startsWith( '|' ) ) {
			problems.push( `line ${ n }: unrecognised line in the ${ cur } section: "${ l }"` );
			return;
		}
		if ( /^\|[\s|:-]+$/.test( l ) ) {
			return;
		}
		const cells = splitRow( l );
		if ( 5 !== cells.length ) {
			problems.push( `line ${ n }: a table row needs 5 cells (Row, Shows, Proposed, Confidence or reason, Mark), found ${ cells.length }` );
			return;
		}
		if ( 'Row' === cells[ 0 ] ) {
			return;
		}
		const id = unquote( cells[ 0 ] );
		if ( ! id ) {
			problems.push( `line ${ n }: a table row has no row ID` );
			return;
		}
		if ( id in rowSection ) {
			problems.push( `line ${ n }: row ${ id } is listed twice` );
			return;
		}
		rowSection[ id ] = cur;
		const mark = unquote( cells[ 4 ] );
		if ( mark ) {
			rowMarks[ id ] = mark;
			sections[ cur ].exceptions[ id ] = mark;
		}
	} );
	for ( const [ t, s ] of Object.entries( sections ) ) {
		if ( null === s.acceptAll ) {
			problems.push( `line ${ s.line }: the ${ t } section has no "Accept all: [ ]" line` );
			s.acceptAll = false;
		}
		delete s.line;
	}
	return { sections, rowMarks, rowSection, problems };
}

export const isoDay = () => new Date().toISOString().slice( 0, 10 );

// Applies Bean's marks to the intake record. Per row: its own Mark cell, else the section's Accept all (the first
// value), else the first value for a DEFAULTED row type (flag, not-a-defect), else no mark. A mark kept unchanged on a row with an unchanged hash
// keeps its markedOn and carriedFrom; any other new mark is dated `today`. Returns { intake (review rebuilt from the
// record's rows), problems, missing: [{ rowId, rowType, why }] }; non-empty problems or missing means the review fails.
export function applyReview( intake, markdown, { today = isoDay() } = {} ) {
	const rows = reviewRows( intake );
	const known = new Map( rows.map( ( r ) => [ r.rowId, r ] ) );
	const prior = new Map( ( intake.review || [] ).map( ( r ) => [ r.rowId, r ] ) );
	const parsed = parseReview( markdown );
	const problems = [ ...parsed.problems ];
	for ( const [ id, t ] of Object.entries( parsed.rowSection ) ) {
		if ( ! known.has( id ) ) {
			problems.push( `row ${ id } (${ t } section) is not a row of this intake` );
		} else if ( known.get( id ).rowType !== t ) {
			problems.push( `row ${ id } sits in the ${ t } section but is a ${ known.get( id ).rowType } row` );
		}
	}
	const review = [];
	const missing = [];
	for ( const r of rows ) {
		if ( ! ( r.rowId in parsed.rowSection ) ) {
			problems.push( `row ${ r.rowId } is not in review.md; regenerate it from intake.json` );
		}
		let mark = parsed.rowMarks[ r.rowId ] ?? null;
		let why = 'no mark of its own and its section is not accepted';
		if ( null !== mark ) {
			const bad = markProblem( r.rowType, mark );
			if ( bad ) {
				problems.push( `row ${ r.rowId }: mark "${ mark }" refused: ${ bad }` );
				mark = null;
				why = 'its mark was refused';
			}
		} else if ( parsed.sections[ r.rowType ]?.acceptAll ) {
			mark = r.acceptAll;
			why = 'Accept all cannot mark it: it proposes no block; mark map:<block>, difference or build';
		} else if ( DEFAULTED.includes( r.rowType ) ) {
			mark = MARKS[ r.rowType ][ 0 ].value;
		}
		const old = prior.get( r.rowId );
		const keep = old && old.contentHash === r.contentHash && null !== mark && old.mark === mark;
		review.push( { rowId: r.rowId, rowType: r.rowType, contentHash: r.contentHash, mark, markedOn: null === mark ? null : keep ? old.markedOn : today, carriedFrom: keep ? old.carriedFrom ?? null : null,
			...( old?.changed && old.contentHash === r.contentHash ? { changed: true } : {} ) } );
		if ( null === mark ) {
			missing.push( { rowId: r.rowId, rowType: r.rowType, why } );
		}
	}
	return { intake: { ...intake, review }, problems, missing };
}

// The new intake's review rows after a re-export: a row whose rowId (which carries its draft ID) and content hash match
// the previous intake's row keeps its mark, markedOn and carriedFrom (the previous takenOn, or the date it was first
// carried from); every other row is unmarked. A row present before with a different hash gets `changed: true` (kept by
// applyReview while the hash holds), and `changed` lists those rowIds too.
export function carryOver( previousIntake, intake ) {
	const prior = new Map( ( previousIntake?.review || [] ).map( ( r ) => [ r.rowId, r ] ) );
	const changed = [];
	const review = reviewRows( intake ).map( ( r ) => {
		const old = prior.get( r.rowId );
		const base = { rowId: r.rowId, rowType: r.rowType, contentHash: r.contentHash, mark: null, markedOn: null, carriedFrom: null };
		if ( ! old ) {
			return base;
		}
		if ( old.contentHash !== r.contentHash || old.rowType !== r.rowType ) {
			changed.push( r.rowId );
			return { ...base, changed: true };
		}
		return null === old.mark ? base : { ...base, mark: old.mark, markedOn: old.markedOn, carriedFrom: old.carriedFrom ?? previousIntake.takenOn };
	} );
	return { review, changed };
}
