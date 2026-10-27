// The draft catalogue as an intake stage (Spec 48 FR-48-92, FR-48-17): lib/catalogue-read.mjs's reading written to
// sites/<client>/build/catalogue.json (validated against data/catalogue.schema.json; an invalid one is never written)
// and summarised into intake.json's `catalogue` block, which review.md lists as the "Draft catalogue" section (one row
// per product, one per gap; Accept all accepts them, `drop` on a product row keeps it off the site). A rewrite keeps the
// file's `sites` section (what each site build made) and records the dropped draft ids from the review marks.
//   node scripts/computed-route/intake.mjs --catalogue <client>   reads the catalogue offline from the export and the
//     current page map (page-map.json, else intake.json's), writes catalogue.json, and when intake.json exists puts the
//     summary into it and renders review.md again.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAjv, schemaProblems } from './handoff.mjs';
import { catalogueFile, productAddress, readCatalogue } from './catalogue-read.mjs';
import { carryOver, renderReview } from './intake-review.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const CATALOGUE_SCHEMA = path.join( HERE, '..', 'data', 'catalogue.schema.json' );
const INTAKE_SCHEMA = path.join( HERE, '..', 'data', 'intake.schema.json' );

// intake.json's `catalogue` block: what the review shows of each product and every gap row.
export function catalogueSummary( catalogue, notes = [] ) {
	return {
		products: catalogue.products.map( ( p ) => ( { draftId: p.draftId, name: p.name, type: p.type, price: p.price, variations: p.variations.length, address: productAddress( catalogue, p ), image: !! p.image } ) ),
		gaps: catalogue.gaps,
		notes,
	};
}

// The draft ids whose catalogue row Bean marked `drop`.
export const droppedIds = ( intake ) => ( intake?.review || [] ).filter( ( r ) => 'catalogue' === r.rowType && 'drop' === r.mark && /^catalogue:/.test( r.rowId ) ).map( ( r ) => r.rowId.slice( 'catalogue:'.length ) ).sort();

// The file as it is written: the fresh reading, the dropped ids and the earlier file's `sites` section.
export function catalogueRecord( fresh, previous, dropped ) {
	return { ...fresh, ...( dropped.length ? { dropped } : {} ), ...( previous?.sites ? { sites: previous.sites } : {} ) };
}

export const catalogueProblems = ( record, ajv = loadAjv() ) => schemaProblems( ajv, CATALOGUE_SCHEMA, record );

// Reads and writes the catalogue of `client` (offline). Returns { code, record, summary }.
export function writeCatalogue( { repo, client, rows, intake = null, log = () => {} } ) {
	const { catalogue, notes } = readCatalogue( { repo, client, rows } );
	const file = catalogueFile( repo, client );
	const previous = fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : null;
	const record = catalogueRecord( catalogue, previous, droppedIds( intake ) );
	const problems = catalogueProblems( record );
	if ( problems.length ) {
		log( `catalogue.json does not validate, nothing written:\n${ problems.map( ( p ) => `  - ${ p }` ).join( '\n' ) }` );
		return { code: 1, record: null, summary: null };
	}
	fs.mkdirSync( path.dirname( file ), { recursive: true } );
	fs.writeFileSync( file, `${ JSON.stringify( record, null, 2 ) }\n` );
	return { code: 0, record, summary: catalogueSummary( catalogue, notes ) };
}

// `intake.mjs --catalogue <client>`. Returns the exit code.
export function runCatalogue( o, { log = ( l ) => process.stderr.write( `${ l }\n` ) } = {} ) {
	const say = ( l ) => log( `[intake --catalogue] ${ l }` );
	const build = path.join( o.repo, 'sites', o.client, 'build' );
	const intakeFile = path.join( build, 'intake', 'intake.json' );
	const mapFile = path.join( build, 'page-map.json' );
	if ( ! fs.existsSync( path.join( o.repo, 'sites', o.client, 'handoff' ) ) ) {
		say( `sites/${ o.client }/handoff is missing` );
		return 1;
	}
	const intake = fs.existsSync( intakeFile ) ? JSON.parse( fs.readFileSync( intakeFile, 'utf8' ) ) : null;
	const rows = fs.existsSync( mapFile ) ? JSON.parse( fs.readFileSync( mapFile, 'utf8' ) ) : intake?.pageMap || [];
	const r = writeCatalogue( { repo: o.repo, client: o.client, rows, intake, log: say } );
	if ( r.code ) {
		return r.code;
	}
	r.summary.notes.forEach( ( n ) => say( `note: ${ n }` ) );
	say( `${ o.client }: ${ r.record.products.length } products (${ r.record.products.filter( ( p ) => 'variable' === p.type ).length } variable, ${ r.record.products.reduce( ( n, p ) => n + p.variations.length, 0 ) } variations), ${ r.record.gaps.length } gap rows; wrote ${ path.relative( o.repo, catalogueFile( o.repo, o.client ) ) }` );
	r.record.gaps.forEach( ( g ) => say( `gap ${ g.draftId } ${ g.kind }: ${ g.detail }` ) );
	if ( intake ) {
		const next = { ...intake, catalogue: r.summary };
		next.review = carryOver( intake, next ).review;
		const problems = schemaProblems( loadAjv(), INTAKE_SCHEMA, next );
		if ( problems.length ) {
			say( `intake.json with the catalogue does not validate, left as it is:\n${ problems.map( ( p ) => `  - ${ p }` ).join( '\n' ) }` );
			return 1;
		}
		fs.writeFileSync( intakeFile, `${ JSON.stringify( next, null, 1 ) }\n` );
		fs.writeFileSync( path.join( build, 'intake', 'review.md' ), renderReview( next ) );
		say( `${ path.relative( o.repo, intakeFile ) } takes the catalogue summary and review.md is rendered again` );
	}
	return 0;
}
