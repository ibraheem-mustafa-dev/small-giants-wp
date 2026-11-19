// The part-look report (part-look.mjs): report.json holds every number and list, report.md the same for a person. Pure: the
// per-surface results go in, text comes out.
import { WIDTHS } from './fill-part-look.mjs';

const json = ( v ) => ( undefined === v ? 'none' : JSON.stringify( v ) );
const draftText = ( draft ) => WIDTHS.map( ( w ) => `${ w }: ${ json( draft?.[ w ] ?? null ) }` ).join( '; ' );

// The totals across surfaces, per block: written, unpaired, noLocator, noSetting, and with --compare the comparison counts.
export function totalsOf( surfaces ) {
	const out = {};
	for ( const s of Object.values( surfaces ) ) {
		const t = ( out[ s.block ] ||= { surface: s.surface, postId: s.postId, written: 0, companions: 0, knownFaultWrites: 0, unpaired: 0, noLocator: 0, noSetting: 0, conflicts: 0, tableRowsPresent: 0, tableRowsPaired: 0, partsWithSettings: 0, partsPaired: 0 } );
		const c = s.build.counts;
		t.written += c.written;
		t.companions += c.companions;
		t.knownFaultWrites += c.knownFaults;
		t.unpaired += c.unpaired;
		t.noLocator += c.noLocator;
		t.noSetting += c.noSetting;
		t.conflicts += c.conflicts;
		t.tableRowsPresent += s.rowsPaired.tableRows.present;
		t.tableRowsPaired += s.rowsPaired.tableRows.paired;
		t.partsWithSettings += s.rowsPaired.parts.withSettings;
		t.partsPaired += s.rowsPaired.parts.paired;
		if ( s.compare ) {
			const k = s.compare.counts;
			t.compare = k;
		}
		if ( s.customCss ) {
			t.customCss = s.customCss;
		}
	}
	return out;
}

const table = ( head, rows ) => [ `| ${ head.join( ' | ' ) } |`, `| ${ head.map( () => '---' ).join( ' | ' ) } |`, ...rows.map( ( r ) => `| ${ r.map( ( c ) => String( c ).replace( /\|/g, '\\|' ) ).join( ' | ' ) } |` ) ].join( '\n' );

export function reportMarkdown( { client, site, compare, generated, surfaces, totals, notes = [] } ) {
	const lines = [ `# Part look: ${ client }`, '', `Generated ${ generated }${ site ? `, saved settings read from \`${ site }\`` : ', no site named (the draft side only)' }.`, '' ];
	lines.push( 'A value is never averaged across instances, a responsive setting is written per device only where the draft\'s narrower value differs, and no block default is read: a written value that equals the block\'s own default is written all the same (`defaultNotRead`). "Known not to paint" marks a value that lands on a setting with a recorded fault, so a pass there does not prove the page looks right. A unit or shadow-colour setting that rides with its setting is written and compared with it and is not counted on its own.', '' );
	lines.push( '## Totals per block', '' );
	const head = [ 'Block', 'Surface', 'Table rows paired / present', 'Parts paired / with settings', 'Values to write', 'of which known not to paint', 'Unpaired parts', 'No locator', 'No setting', 'Instance conflicts' ];
	lines.push( table( head, Object.entries( totals ).map( ( [ block, t ] ) => [ block, t.surface, `${ t.tableRowsPaired } / ${ t.tableRowsPresent }`, `${ t.partsPaired } / ${ t.partsWithSettings }`, t.written, t.knownFaultWrites, t.unpaired, t.noLocator, t.noSetting, t.conflicts ] ) ), '' );
	if ( compare ) {
		lines.push( '## Comparison with the saved settings', '' );
		lines.push( table( [ 'Block', 'Post', 'Equal', 'Differs', 'Hand-set only', 'Route only', 'Written and known not to paint', 'Custom CSS (attributes / rules / bytes)' ], Object.entries( totals ).map( ( [ block, t ] ) => [ block, t.postId ?? '', t.compare?.equal ?? '', t.compare?.differs ?? '', t.compare ? `${ t.compare.handSetOnly } (${ Object.entries( t.compare.handSetOnlyByReason ).map( ( [ k, n ] ) => `${ k } ${ n }` ).join( ', ' ) })` : '', t.compare?.routeOnly ?? '', t.compare?.knownFaultValues ?? '', t.customCss ? `${ t.customCss.attributes } / ${ t.customCss.rules } / ${ t.customCss.bytes }` : '' ] ) ), '' );
	}
	for ( const n of notes ) {
		lines.push( `- ${ n }` );
	}
	notes.length && lines.push( '' );
	for ( const s of Object.values( surfaces ) ) {
		const b = s.build;
		lines.push( `## ${ s.surface } (${ s.block }${ s.postId ? `, post ${ s.postId }` : '' })`, '' );
		lines.push( `Draft read: ${ s.draftFile }${ s.alsoRead?.length ? ` (and ${ s.alsoRead.join( ', ' ) } for the parts it lacks)` : '' }. Parts located: ${ s.rowsPaired.parts.paired } of ${ s.rowsPaired.parts.withSettings } parts that have settings; look-table rows paired ${ s.rowsPaired.tableRows.paired } of ${ s.rowsPaired.tableRows.present } present for this block.`, '' );
		if ( s.compare ) {
			const c = s.compare;
			lines.push( `### Compared with post ${ s.postId }`, '', `Equal ${ c.counts.equal}, differs ${ c.counts.differs }, hand-set only ${ c.counts.handSetOnly } (${ Object.entries( c.counts.handSetOnlyByReason ).map( ( [ k, n ] ) => `${ k } ${ n }` ).join( ', ' ) }), route only ${ c.counts.routeOnly }; ${ c.counts.knownFaultValues } of the route's values are written, known not to paint.`, '' );
			if ( c.differs.length ) {
				lines.push( '**Differs (both values)**', '', table( [ 'Setting', 'Part', 'Route', 'Saved' ], c.differs.map( ( d ) => [ d.attr, d.part, json( d.route ), json( d.saved ) ] ) ), '' );
			}
			if ( c.handSetOnly.length ) {
				lines.push( '**Hand-set only**', '', table( [ 'Setting', 'Part', 'Saved', 'Reason' ], c.handSetOnly.map( ( h ) => [ h.attr, h.part ?? '', json( h.saved ), h.reason ] ) ), '' );
			}
			if ( c.routeOnly.length ) {
				lines.push( '**Route only**', '', table( [ 'Setting', 'Part', 'Route' ], c.routeOnly.map( ( r ) => [ `${ r.attr }${ r.knownFault ? ' (known not to paint)' : '' }`, r.part, json( r.route ) ] ) ), '' );
			}
		}
		lines.push( '### Values to write', '', b.writes.length ? table( [ 'Setting', 'Part', 'Property', 'Value', 'Draft value per width', 'Flags' ], b.writes.map( ( w ) => [ w.attr, w.part, w.property, json( w.value ), draftText( w.draft ), [ w.knownFault ? 'written, known not to paint' : '', w.widthVaries ? 'widths differ, one value held' : '', w.defaultNotRead ? 'default not read' : '' ].filter( Boolean ).join( ', ' ) ] ) ) : 'None.', '' );
		lines.push( '### Unpaired (a locator, no draft element)', '', b.unpaired.length ? b.unpaired.map( ( u ) => `- ${ u.part } (${ u.settings } settings${ u.tableRow ? ', look-table row' : '' })` ).join( '\n' ) : 'None.', '' );
		lines.push( '### No locator', '', b.noLocator.length ? b.noLocator.map( ( u ) => `- ${ u.part } (${ u.settings } settings${ u.tableRow ? ', look-table row' : '' })` ).join( '\n' ) : 'None.', '' );
		lines.push( '### Instance conflicts (nothing written)', '', b.conflicts.length ? b.conflicts.map( ( c ) => `- ${ c.part } ${ c.attr }: ${ c.conflicts.map( ( x ) => `${ x.width }px ${ [ ...new Set( x.values.map( ( v ) => json( v.value ) ) ) ].join( ' vs ' ) }` ).join( '; ' ) }` ).join( '\n' ) : 'None.', '' );
		if ( s.verify ) {
			const v = s.verify;
			lines.push( '### Verified on the live page', '', `Compared ${ v.counts.compared } part and property pairs at 1440, 768 and 375: ${ v.counts.matched } match, ${ v.counts.differs } still differ. The pass wrote ${ v.counts.written } settings the live page differed on (${ v.kept.join( ', ' ) || 'none' }), took back ${ v.counts.takenBack } that changed nothing${ v.takenBack.length ? ` (${ v.takenBack.map( ( t ) => t.attr ).join( ', ' ) })` : '' }, and dropped ${ v.droppedNoSetting } of ${ v.counts.noSettingBefore } no-setting rows that already match.`, '' );
			lines.push( '### Still differs', '', v.stillDiffers.length ? table( [ 'Part', 'Property', 'Draft', 'Live', 'Why' ], v.stillDiffers.map( ( d ) => [ d.part, d.property, WIDTHS.filter( ( w ) => undefined !== d.draft?.[ w ] ).map( ( w ) => `${ w }: ${ json( d.draft[ w ] ) }` ).join( '; ' ), WIDTHS.filter( ( w ) => undefined !== d.live?.[ w ] ).map( ( w ) => `${ w }: ${ json( d.live[ w ] ) }` ).join( '; ' ), d.why ] ) ) : 'Nothing differs.', '' );
			const nv = Object.entries( v.notVerified || {} );
			nv.length && lines.push( '### Not verified (no live selector)', '', nv.map( ( [ part, why ] ) => `- ${ part }: ${ why }` ).join( '\n' ), '' );
		}
		const noSet = s.verify ? s.verify.noSetting : b.noSetting;
		lines.push( '### No setting (a look the draft element carries and no setting of its part holds)', '', noSet.length ? table( [ 'Part', 'Selector', 'Property', 'Draft value per width', ...( s.verify ? [ 'Live value per width' ] : [] ) ], noSet.map( ( n ) => [ n.part, n.selector ?? 'no look-table row', n.property, draftText( n.draft ), ...( s.verify ? [ false === n.liveRead ? 'not read' : draftText( n.live ) ] : [] ) ] ) ) : 'None.', '' );
	}
	return `${ lines.join( '\n' ) }\n`;
}
