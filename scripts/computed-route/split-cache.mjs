#!/usr/bin/env node
// One-off, idempotent migration of the calibration cache to its two outputs (lib/cache.mjs): each cache/<block>.json
// written before the split holds the default paint (`elements`) beside the slot map. This moves the paint into
// cache/<file.site>/<block>.paint.json and rewrites the slot map without it, then moves any paint file sitting in a mirror's
// folder into its test site's folder (lib/cache.mjs::paintSite), keeping the newer `measured` when both hold the block.
// A file already split or placed is left alone.
//   node scripts/computed-route/split-cache.mjs [--dry-run] [--cache <dir>]
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { splitCalibration, writeSlotMap, writePaint, paintFile, paintSite } from './lib/cache.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );

// Splits every unsplit slot map in `dir`. Returns { split, unchanged, problems } (lists of block file names).
export function splitCache( dir, { dryRun = false, log = () => {} } = {} ) {
	const out = { split: [], unchanged: [], problems: [] };
	for ( const name of fs.readdirSync( dir ).filter( ( n ) => n.endsWith( '.json' ) && ! n.endsWith( '.tree.json' ) && ! n.endsWith( '.paint.json' ) ).sort() ) {
		const file = JSON.parse( fs.readFileSync( path.join( dir, name ), 'utf8' ) );
		if ( ! file.elements && ! file.paintKey ) {
			out.unchanged.push( name );
			continue;
		}
		if ( ! file.block || ! file.site ) {
			out.problems.push( `${ name }: no block or site recorded` );
			continue;
		}
		const { slotMap, paint } = splitCalibration( file );
		const target = paintFile( dir, file.site, file.block );
		log( `${ dryRun ? 'would split' : 'split' } ${ name }: paint (${ Object.keys( paint.elements || {} ).length } elements) -> ${ path.relative( dir, target ) }` );
		if ( ! dryRun ) {
			writePaint( dir, file.site, file.block, paint );
			writeSlotMap( dir, file.block, slotMap );
		}
		out.split.push( name );
	}
	return out;
}

// Moves each paint file out of a mirror's folder into its test site's folder. Returns { moved, dropped } (relative paths):
// `dropped` is a mirror file older than the one already in the test site's folder.
export function placeMirrorPaint( dir, { dryRun = false, log = () => {} } = {} ) {
	const out = { moved: [], dropped: [] };
	for ( const site of fs.readdirSync( dir ).filter( ( n ) => fs.statSync( path.join( dir, n ) ).isDirectory() ).sort() ) {
		const home = paintSite( site );
		if ( home === site ) {
			continue;
		}
		for ( const name of fs.readdirSync( path.join( dir, site ) ).filter( ( n ) => n.endsWith( '.paint.json' ) ).sort() ) {
			const from = path.join( dir, site, name );
			const to = path.join( dir, home, name );
			const mine = JSON.parse( fs.readFileSync( from, 'utf8' ) );
			const theirs = fs.existsSync( to ) ? JSON.parse( fs.readFileSync( to, 'utf8' ) ) : null;
			const keep = ! theirs || String( mine.measured ) > String( theirs.measured );
			log( `${ dryRun ? 'would ' : '' }${ keep ? 'move' : 'drop (older)' } ${ site }/${ name } -> ${ home }/${ name }` );
			if ( ! dryRun ) {
				if ( keep ) {
					fs.mkdirSync( path.dirname( to ), { recursive: true } );
					fs.copyFileSync( from, to );
				}
				fs.unlinkSync( from );
			}
			( keep ? out.moved : out.dropped ).push( `${ site }/${ name }` );
		}
		if ( ! dryRun && ! fs.readdirSync( path.join( dir, site ) ).length ) {
			fs.rmdirSync( path.join( dir, site ) );
		}
	}
	return out;
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const argv = process.argv.slice( 2 );
	const i = argv.indexOf( '--cache' );
	const dir = path.resolve( -1 === i ? path.join( HERE, 'cache' ) : argv[ i + 1 ] );
	const dryRun = argv.includes( '--dry-run' );
	const r = splitCache( dir, { dryRun, log: console.log } );
	const m = placeMirrorPaint( dir, { dryRun, log: console.log } );
	console.log( `${ dryRun ? 'dry run: ' : '' }${ r.split.length } split, ${ r.unchanged.length } already split or without paint, ${ m.moved.length } mirror paint files moved, ${ m.dropped.length } older ones dropped, ${ r.problems.length } problems` );
	r.problems.forEach( ( p ) => console.log( `[PROBLEM] ${ p }` ) );
	process.exit( r.problems.length ? 1 : 0 );
}
