// The per-draft Custom CSS log and its check (Spec 48 FR-48-109; Bean's ruling F, 2026-10-24). Every surface's latest Fill report
// (`sites/<client>/build/qa/fill/<surface>/<run>/fill-report.json`, `residualCss`) lists the Custom CSS rules the run wrote, the
// rows it refused with the reason, and one gap row per written rule naming the setting the block lacks. This merges them into one
// log per draft, and the check refuses any written rule with no justification: a rule is justified when it carries a reason that
// names why no setting could hold it (FR-48-109's "all five equivalence layers failed and no setting of the block paints it", or
// FR-48-50's visibility-by-width reason) and a gap row naming the setting it could not use.
import fs from 'node:fs';
import path from 'node:path';

const byText = ( a, b ) => ( a < b ? -1 : a > b ? 1 : 0 );
// The reasons a rule may carry: FR-48-109's, or FR-48-50's visibility-by-width rule.
const JUSTIFIED = /all five equivalence layers failed|no setting of the block|FR-48-50|FR-48-109|visibility by (?:screen )?width/i;

// The latest run's fill-report.json per surface of one client's build folder: [ { surface, file } ].
export function latestReports( buildDir ) {
	const fill = path.join( buildDir, 'qa', 'fill' );
	if ( ! fs.existsSync( fill ) ) {
		return [];
	}
	return fs.readdirSync( fill, { withFileTypes: true } ).filter( ( d ) => d.isDirectory() ).sort( ( a, b ) => byText( a.name, b.name ) ).flatMap( ( d ) => {
		const runs = fs.readdirSync( path.join( fill, d.name ), { withFileTypes: true } ).filter( ( x ) => x.isDirectory() && fs.existsSync( path.join( fill, d.name, x.name, 'fill-report.json' ) ) ).map( ( x ) => x.name ).sort( byText );
		return runs.length ? [ { surface: d.name, file: path.join( fill, d.name, runs.at( -1 ), 'fill-report.json' ) } ] : [];
	} );
}

// The log of one draft from its surfaces' reports: { client, surfaces, rules: [ { surface, node, block, part, state, range,
// declarations, reason, gap } ], refused: [ { surface, node, block, slot, property, state, value, reason } ], unreadable }.
export function buildCustomCssLog( { client, buildDir } ) {
	const log = { client, surfaces: [], rules: [], refused: [], unreadable: [] };
	for ( const { surface, file } of latestReports( buildDir ) ) {
		let residual;
		try {
			residual = JSON.parse( fs.readFileSync( file, 'utf8' ) ).residualCss ?? {};
		} catch ( e ) {
			log.unreadable.push( `${ file }: ${ String( e.message || e ).slice( 0, 120 ) }` );
			continue;
		}
		log.surfaces.push( surface );
		for ( const r of residual.rules ?? [] ) {
			const gap = ( residual.gaps ?? [] ).find( ( g ) => g.node === r.node && g.block === r.block && ( g.slot ?? '' ) === ( r.part ?? '' ) && ( r.declarations ?? [] ).some( ( d ) => ( g.properties ?? [] ).includes( String( d ).split( ':' )[ 0 ].trim() ) ) ) ?? null;
			log.rules.push( { surface, node: r.node, block: r.block, part: r.part ?? '', state: r.state ?? null, range: r.range ?? '', declarations: r.declarations ?? [], reason: r.reason ?? '', gap: gap ? { control: gap.control, reason: gap.reason } : null } );
		}
		for ( const x of residual.refused ?? [] ) {
			log.refused.push( { surface, node: x.node, block: x.block, slot: x.slot ?? '', property: x.property, state: x.state ?? null, value: x.value, reason: x.reason } );
		}
	}
	return log;
}

// The rules the check refuses, each with why: no reason, a reason that names neither FR-48-109 nor FR-48-50's ground, or no gap row
// naming the setting the block could not use.
export function unjustifiedRules( log ) {
	return log.rules.flatMap( ( r ) => {
		const why = [];
		if ( ! String( r.reason ).trim() ) {
			why.push( 'it has no reason' );
		} else if ( ! JUSTIFIED.test( r.reason ) ) {
			why.push( `its reason (${ r.reason.slice( 0, 80 ) }) names no ground FR-48-109 or FR-48-50 allows` );
		}
		if ( ! r.gap?.control ) {
			why.push( 'no gap row names the setting it could not use' );
		}
		return why.length ? [ { ...r, problems: why } ] : [];
	} );
}

// The log as Markdown, one line per rule (never hard-wrapped).
export function logMarkdown( log, bad = unjustifiedRules( log ) ) {
	const lines = [ `# Custom CSS log: ${ log.client }`, '', `${ log.rules.length } rule(s) written across ${ log.surfaces.length } surface(s); ${ log.refused.length } row(s) refused; ${ bad.length } unjustified.`, '' ];
	log.rules.forEach( ( r ) => lines.push( `- ${ r.surface } / ${ r.node } ${ r.block } ${ r.part || 'the root' }${ r.state ? ` (${ r.state })` : '' } ${ r.range }: ${ r.declarations.join( '; ' ) }. Why: ${ r.reason }. Setting it could not use: ${ r.gap?.control ?? 'none named' }.` ) );
	log.refused.length && lines.push( '', '## Refused', '' );
	log.refused.forEach( ( x ) => lines.push( `- ${ x.surface } / ${ x.node } ${ x.block } ${ x.slot || 'the root' } ${ x.property }${ x.state ? ` (${ x.state })` : '' } ${ x.value }: ${ x.reason }` ) );
	return `${ lines.join( '\n' ) }\n`;
}

// Writes `qa/custom-css-log.json` and `.md` beside the fill reports; returns { log, bad, files }.
export function writeCustomCssLog( { client, buildDir } ) {
	const log = buildCustomCssLog( { client, buildDir } );
	const bad = unjustifiedRules( log );
	const dir = path.join( buildDir, 'qa' );
	fs.mkdirSync( dir, { recursive: true } );
	const files = [ path.join( dir, 'custom-css-log.json' ), path.join( dir, 'custom-css-log.md' ) ];
	fs.writeFileSync( files[ 0 ], `${ JSON.stringify( { ...log, unjustified: bad.length }, null, 2 ) }\n` );
	fs.writeFileSync( files[ 1 ], logMarkdown( log, bad ) );
	return { log, bad, files };
}
