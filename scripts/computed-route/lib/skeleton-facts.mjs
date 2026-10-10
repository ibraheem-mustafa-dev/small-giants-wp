// The facts the skeleton writer reasons from, all read from data (R-31-1): the framework database (read-only), the brand
// registry, the client's Site Info placeholder map, the standing decisions file (data/skeleton-decisions.json) and the
// block.json of the list block (its item properties are not database columns). No block name is written in code below.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { brandRegistry } from './brand-registry.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const REPO = path.resolve( HERE, '../../..' );
export const DECISIONS_FILE = path.resolve( HERE, '../data/skeleton-decisions.json' );

// The regular expressions of a { patterns, flags } spec, and the first text any of them matches (else null).
export const rxList = ( spec ) => ( spec?.patterns || [] ).map( ( p ) => new RegExp( p, spec.flags || '' ) );
export const specHit = ( spec, text ) => ( rxList( spec ).find( ( r ) => r.test( String( text ?? '' ) ) ) ? spec : null );

const readJson = ( file ) => JSON.parse( fs.readFileSync( file, 'utf8' ) );

// The facts object. o: { db, client, repo, siteName, decisionsFile }. Queries are made on demand and cached.
export function loadFacts( { db, client, repo = REPO, siteName = null, decisionsFile = DECISIONS_FILE } ) {
	const q = ( sql, ...a ) => db.prepare( sql ).all( ...a ).map( ( r ) => ( { ...r } ) );
	const decisions = readJson( decisionsFile );
	const mapFile = path.join( repo, 'sites', client, 'site-info-placeholder-map.json' );
	const placeholderMap = fs.existsSync( mapFile ) ? readJson( mapFile ) : {};
	const composition = Object.fromEntries( q( 'SELECT block_slug, wraps_block, composition_role, accepts_allowed_blocks, container_kind FROM block_composition' ).map( ( r ) => [ r.block_slug, { ...r, accepts: r.accepts_allowed_blocks ? JSON.parse( r.accepts_allowed_blocks ) : null } ] ) );
	const tagMap = Object.fromEntries( q( 'SELECT html_tag, core_block_slug, note FROM html_tag_to_core_block' ).map( ( r ) => [ r.html_tag, r ] ) );
	const capsCache = {};
	const capsOf = ( slug ) => ( capsCache[ slug ] ||= q( 'SELECT capability FROM block_capabilities WHERE block_slug = ?', slug ).map( ( r ) => r.capability ) );
	const blocksWithCap = ( cap ) => q( 'SELECT DISTINCT block_slug FROM block_capabilities WHERE capability = ?', cap ).map( ( r ) => r.block_slug );
	const attr = ( slug, name ) => q( 'SELECT attr_name, attr_type, default_value, enum_values, role, css_property FROM block_attributes WHERE block_slug = ? AND attr_name = ?', slug, name )[ 0 ] || null;
	const attrsByRole = ( slug, role ) => q( 'SELECT attr_name, attr_type FROM block_attributes WHERE block_slug = ? AND role = ? AND css_property IS NULL', slug, role );
	// The first (by declaration order) content setting of a role: a block's primary text and link settings.
	const firstAttrByRole = ( slug, role ) => q( 'SELECT attr_name FROM block_attributes WHERE block_slug = ? AND role = ? AND css_property IS NULL ORDER BY rowid LIMIT 1', slug, role )[ 0 ]?.attr_name || null;
	const blocksWithDisplayType = ( kind ) => q( "SELECT block_slug FROM block_attributes WHERE attr_name = 'displayType' AND enum_values LIKE ?", `%"${ kind }"%` ).map( ( r ) => r.block_slug );
	const enumOf = ( slug, name ) => {
		const a = attr( slug, name );
		return a?.enum_values ? JSON.parse( a.enum_values ) : null;
	};
	const blocksOfRole = ( role ) => Object.values( composition ).filter( ( r ) => role === r.composition_role );
	// The list block is the one the database maps the `ul` tag to; its item properties come from its block.json.
	const listSlug = tagMap.ul?.core_block_slug || null;
	let listItem = null;
	if ( listSlug ) {
		const file = path.join( repo, 'plugins/sgs-blocks/src/blocks', listSlug.replace( /^sgs\//, '' ), 'block.json' );
		const props = fs.existsSync( file ) ? readJson( file ).attributes?.items?.items?.properties || {} : {};
		const kinds = /([a-z]+(?:\s*\|\s*[a-z]+)+)/.exec( props.siteInfoSource?.description || '' )?.[ 1 ].split( /\s*\|\s*/ ) || [];
		listItem = { text: props.text ? 'text' : null, url: Object.keys( props ).find( ( k ) => 'url-href' === props[ k ].role ) || null, siteInfoSource: props.siteInfoSource ? 'siteInfoSource' : null, siteInfoLink: props.siteInfoLink ? 'siteInfoLink' : null, kinds };
	}
	return {
		client, repo, decisions, placeholderMap, composition, tagMap, capsOf, blocksWithCap, attr, attrsByRole, firstAttrByRole, blocksWithDisplayType, enumOf, q,
		brands: brandRegistry(),
		siteName: siteName ? String( siteName ).replace( /\s+/g, ' ' ).trim() : null,
		wrapperShells: blocksOfRole( 'wrapper-shell' ).map( ( r ) => r.block_slug ),
		// A content block accepting exactly one block is a row of that block (a social row accepts only icons).
		rowBlocks: blocksOfRole( 'content-block' ).filter( ( r ) => 1 === r.accepts?.length ).map( ( r ) => ( { slug: r.block_slug, child: r.accepts[ 0 ] } ) ),
		logoBlocks: blocksWithCap( 'logo' ).filter( ( b ) => 'leaf' === composition[ b ]?.composition_role ),
		displayTypes: enumOf( 'sgs/business-info', 'displayType' ) || [],
		listSlug, listItem,
		mapEntry: ( ph ) => placeholderMap[ ph ] || placeholderMap[ ph.replace( /\{\{ ?| ?\}\}/g, ( s ) => ( s.includes( '{' ) ? '{{ ' : ' }}' ) ) ] || null,
	};
}

// What is wrong with the decisions data, as readable lines (empty when sound): every block named exists in the database,
// every pattern compiles, the list block and its item properties were found.
export function decisionsProblems( facts ) {
	const d = facts.decisions;
	const problems = [];
	const known = ( slug, where ) => {
		if ( ! facts.composition[ slug ] && ! facts.q( 'SELECT 1 FROM blocks WHERE slug = ? LIMIT 1', slug ).length ) {
			problems.push( `${ where } names ${ slug }, which is not in the framework database` );
		}
	};
	known( d.structural?.columnLabel?.block, 'structural.columnLabel' );
	( d.elements || [] ).forEach( ( e ) => e.block && known( e.block, `elements.${ e.id }` ) );
	const specs = [ ...( d.briefOnlyLines || [] ).map( ( s ) => [ `briefOnlyLines.${ s.id }`, s ] ), ...Object.entries( d.siteInfoPatterns || {} ).map( ( [ k, s ] ) => [ `siteInfoPatterns.${ k }`, s ] ), [ 'addressLinkPatterns', d.addressLinkPatterns ], [ 'logoImage', d.logoImage ] ];
	for ( const [ where, spec ] of specs ) {
		try {
			rxList( spec );
		} catch ( e ) {
			problems.push( `${ where } has a pattern that does not compile: ${ e.message }` );
		}
	}
	if ( ! facts.listSlug || ! facts.listItem?.text || ! facts.listItem?.url ) {
		problems.push( 'the list block (the database maps the ul tag to it) was not found, or its block.json items carry no text and url-href property' );
	}
	return problems;
}
