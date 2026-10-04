// Module resolution for editor_facts.js: parsing (cached), each file's exports,
// relative import specifiers, barrel re-exports followed to the declaring file,
// and the JSX component name -> file map (a declaration beats a file name).
'use strict';
const fs = require( 'fs' );
const path = require( 'path' );

module.exports = function makeResolver( { SRC, BLOCKS, parser, OPTS } ) {
	function walkJs( dir, out ) {
		if ( ! fs.existsSync( dir ) ) return out;
		for ( const e of fs.readdirSync( dir, { withFileTypes: true } ).sort( ( a, b ) => ( a.name < b.name ? -1 : 1 ) ) ) {
			const f = path.join( dir, e.name );
			if ( e.isDirectory() ) walkJs( f, out );
			else if ( f.endsWith( '.js' ) ) out.push( f );
		}
		return out;
	}

	const astCache = new Map();
	function parse( file ) {
		if ( astCache.has( file ) ) return astCache.get( file );
		let ast = null, src = '';
		try {
			src = fs.readFileSync( file, 'utf8' );
			ast = parser.parse( src, OPTS );
		} catch ( e ) {
			ast = null;
		}
		const v = { ast, src };
		astCache.set( file, v );
		return v;
	}

	// Exports per file: declared names, named re-exports and `export *` sources.
	const exportCache = new Map();
	function exportsOf( file ) {
		if ( exportCache.has( file ) ) return exportCache.get( file );
		const out = { declared: new Set(), reexports: new Map(), star: [] };
		exportCache.set( file, out );
		const { ast } = parse( file );
		if ( ! ast ) return out;
		for ( const n of ast.program.body ) {
			if ( n.type === 'ExportNamedDeclaration' ) {
				if ( n.declaration ) {
					const d = n.declaration;
					if ( d.id ) out.declared.add( d.id.name );
					( d.declarations || [] ).forEach( ( x ) => x.id && x.id.name && out.declared.add( x.id.name ) );
				}
				for ( const s of n.specifiers || [] ) {
					const name = s.exported.name || s.exported.value;
					if ( n.source ) out.reexports.set( name, { from: n.source.value, local: s.local.name } );
					else out.declared.add( name );
				}
			} else if ( n.type === 'ExportAllDeclaration' ) out.star.push( n.source.value );
			else if ( n.type === 'ExportDefaultDeclaration' ) {
				out.declared.add( 'default' );
				if ( n.declaration && n.declaration.id ) out.declared.add( n.declaration.id.name );
			}
		}
		return out;
	}

	function resolveSpec( fromFile, spec ) {
		if ( ! spec.startsWith( '.' ) ) return null;
		const base = path.resolve( path.dirname( fromFile ), spec );
		for ( const c of [ base, base + '.js', path.join( base, 'index.js' ) ] ) {
			if ( fs.existsSync( c ) && fs.statSync( c ).isFile() ) return c;
		}
		return null;
	}

	// Follow `export {x} from` / `export * from` until the file that declares `name`.
	function declaringFile( file, name, depth = 0 ) {
		if ( ! file || depth > 6 ) return null;
		const ex = exportsOf( file );
		if ( ex.declared.has( name ) ) return file;
		if ( ex.reexports.has( name ) ) {
			const r = ex.reexports.get( name );
			return declaringFile( resolveSpec( file, r.from ), r.local === 'default' ? 'default' : r.local, depth + 1 ) || resolveSpec( file, r.from );
		}
		for ( const s of ex.star ) {
			const hit = declaringFile( resolveSpec( file, s ), name, depth + 1 );
			if ( hit ) return hit;
		}
		return null;
	}

	// JSX component name -> declaring file (declaration beats filename).
	const COMPONENT_MAP = ( () => {
		const strong = new Map(), weak = new Map();
		const dirs = [ path.join( SRC, 'components' ), path.join( BLOCKS, 'extensions' ) ];
		if ( fs.existsSync( BLOCKS ) ) for ( const b of fs.readdirSync( BLOCKS ).sort() ) dirs.push( path.join( BLOCKS, b, 'components' ) );
		for ( const d of dirs ) {
			for ( const f of walkJs( d, [] ) ) {
				if ( path.basename( f ) === 'index.js' ) continue;
				const ex = exportsOf( f );
				for ( const n of ex.declared ) if ( /^[A-Z]/.test( n ) && ! strong.has( n ) ) strong.set( n, f );
				const base = path.basename( f, '.js' );
				if ( /^[A-Z]\w*$/.test( base ) && ! weak.has( base ) ) weak.set( base, f );
			}
		}
		const m = new Map( weak );
		for ( const [ n, f ] of strong ) m.set( n, f );
		return m;
	} )();

	return { walkJs, parse, exportsOf, resolveSpec, declaringFile, COMPONENT_MAP };
};
