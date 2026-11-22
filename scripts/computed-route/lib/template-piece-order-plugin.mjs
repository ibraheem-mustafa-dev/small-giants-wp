// What the plugin's order parts hold, read from the plugin and the framework database, never written out here (FP-1):
//   - the `sgs/order` binding source's name and keys, from plugins/sgs-blocks/includes/class-order-binding.php
//     (`register_block_bindings_source( 'sgs/order', … )` and `Order_Binding::KEYS`);
//   - which attribute of a block takes a binding, from plugins/sgs-blocks/includes/class-sgs-block-bindings-support.php
//     (`Sgs_Block_Bindings_Support::SUPPORTED_ATTRIBUTES`) joined with the attribute's role in the framework database
//     (`text-content` for words, `link-href` for an address);
//   - the Show-to setting that holds an order rule, and the settings of sgs/order-items, from the framework database.
// Every reader returns null or an empty list when the fact is absent, so the caller writes a problem row naming it.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const INCLUDES = path.resolve( HERE, '..', '..', '..', 'plugins', 'sgs-blocks', 'includes' );
export const BINDING_FILE = path.join( INCLUDES, 'class-order-binding.php' );
export const SUPPORT_FILE = path.join( INCLUDES, 'class-sgs-block-bindings-support.php' );
export const FACTS_FILE = path.resolve( HERE, '..', 'data', 'order-facts.json' );

const quoted = ( text ) => [ ...String( text ).matchAll( /'([^']*)'/g ) ].map( ( m ) => m[ 1 ] );

// { source, keys, factPrefix, factFilter } of the order binding source in its PHP file's text: the source name
// `register_block_bindings_source` registers, the strings of `const KEYS = array( … )`, and the form a site-supplied fact's key
// takes (`const FACT_PREFIX`, `fact:`) with the filter the site answers through (`const FACT_FILTER`); each of those two is null
// when the plugin holds none, and the route then binds no fact.
export function bindingSourceOf( php ) {
	const source = /register_block_bindings_source\(\s*'([^']+)'/.exec( php )?.[ 1 ] ?? null;
	const keys = quoted( /const\s+KEYS\s*=\s*array\(([^)]*)\)/.exec( php )?.[ 1 ] ?? '' );
	const factPrefix = /const\s+FACT_PREFIX\s*=\s*'([^']+)'/.exec( php )?.[ 1 ] ?? null;
	const factFilter = /const\s+FACT_FILTER\s*=\s*'([^']+)'/.exec( php )?.[ 1 ] ?? null;
	return { source, keys, factPrefix, factFilter };
}

// { <block>: [ attribute ] } of the bindings support file's SUPPORTED_ATTRIBUTES array.
export function supportedAttributesOf( php ) {
	const body = /SUPPORTED_ATTRIBUTES\s*=\s*array\(([\s\S]*?)\n\t\);/.exec( php )?.[ 1 ] ?? '';
	return Object.fromEntries( [ ...body.matchAll( /'([^']+)'\s*=>\s*array\(([^)]*)\)/g ) ].map( ( m ) => [ m[ 1 ], quoted( m[ 2 ] ) ] ) );
}

// The plugin facts the order builder reads, from the plugin files (readable anywhere: they are source files).
export function pluginFacts( { binding = BINDING_FILE, support = SUPPORT_FILE } = {} ) {
	return { ...bindingSourceOf( fs.readFileSync( binding, 'utf8' ) ), supported: supportedAttributesOf( fs.readFileSync( support, 'utf8' ) ) };
}

export const loadOrderFacts = ( file = FACTS_FILE ) => JSON.parse( fs.readFileSync( file, 'utf8' ) );

// The attribute of `block` a binding of this role writes (`text-content` or `link-href`): the first such attribute in the
// database's order that the bindings support file lists for the block, or null.
export function boundAttr( db, supported, block, role ) {
	const rows = db.prepare( 'SELECT attr_name FROM block_attributes WHERE block_slug = ? AND role = ? AND attr_type = ? ORDER BY id' ).all( block, role, 'string' );
	return rows.map( ( r ) => r.attr_name ).find( ( a ) => ( supported[ block ] || [] ).includes( a ) ) ?? null;
}

// The setting of `block` whose enum holds `rule` (the Show-to extension), or null.
export function ruleAttr( db, block, rule ) {
	const rows = db.prepare( "SELECT attr_name, enum_values FROM block_attributes WHERE block_slug = ? AND enum_values IS NOT NULL AND attr_type = 'string' ORDER BY id" ).all( block );
	const hit = rows.find( ( r ) => {
		try {
			return JSON.parse( r.enum_values ).includes( rule );
		} catch {
			return false;
		}
	} );
	return hit?.attr_name ?? null;
}

// The type of one setting of a block in the framework database, or null when the block holds no such setting.
export const settingType = ( db, block, attr ) => db.prepare( 'SELECT attr_type FROM block_attributes WHERE block_slug = ? AND attr_name = ?' ).get( block, attr )?.attr_type ?? null;

// What is wrong with the order facts file against the plugin and the database: a key the binding source does not hold, a
// Show-to rule no block setting lists, an order-items setting the block does not hold or holds with another type.
export function orderFactsProblems( { facts, plugin, db } ) {
	const out = [];
	for ( const key of Object.keys( facts.keys || {} ) ) {
		plugin.keys.includes( key ) || out.push( `order-facts.json: key "${ key }" is not a key of the ${ plugin.source } binding source (${ plugin.keys.join( ', ' ) })` );
	}
	facts.viewable && ! ruleAttr( db, 'sgs/text', facts.viewable ) && out.push( `order-facts.json: viewable names the Show-to rule "${ facts.viewable }", which no setting of sgs/text lists` );
	for ( const [ name, g ] of Object.entries( facts.groups || {} ) ) {
		for ( const rule of [ g.shown, g.hidden ].filter( Boolean ) ) {
			ruleAttr( db, 'sgs/text', rule ) || out.push( `order-facts.json: group "${ name }" names the Show-to rule "${ rule }", which no setting of sgs/text lists` );
		}
	}
	for ( const [ name, c ] of Object.entries( facts.choices || {} ).filter( ( [ k ] ) => ! k.startsWith( '_' ) ) ) {
		const rules = [ c.shown, c.hidden, ...Object.keys( c.values || {} ), ...( c.within || [] ) ].filter( Boolean );
		( c.values ? 2 === Object.keys( c.values ).length : c.shown && c.hidden ) || out.push( `order-facts.json: choice "${ name }" needs either shown and hidden or exactly two values` );
		c.group && ! facts.groups?.[ c.group ] && out.push( `order-facts.json: choice "${ name }" names the group "${ c.group }", which groups does not hold` );
		for ( const rule of rules ) {
			ruleAttr( db, 'sgs/text', rule ) || out.push( `order-facts.json: choice "${ name }" names the Show-to rule "${ rule }", which no setting of sgs/text lists` );
		}
	}
	const items = facts.items || {};
	const want = [ [ items.thumbnail, 'boolean' ], [ items.options, 'boolean' ], [ items.totalLabel, 'string' ], ...Object.values( items.rows || {} ).map( ( r ) => [ r.setting, 'boolean' ] ) ];
	for ( const [ attr, type ] of want ) {
		const has = settingType( db, items.block, attr );
		has === type || out.push( `order-facts.json: ${ items.block } ${ has ? `holds ${ attr } as ${ has }, not ${ type }` : `holds no setting ${ attr }` }` );
	}
	return out;
}
