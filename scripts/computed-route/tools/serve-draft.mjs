#!/usr/bin/env node
// Serves a draft folder in a process of its own (lib/draft.mjs::serveDraftApart starts it):
//   node scripts/computed-route/tools/serve-draft.mjs <folder> [<index file>]
// Prints `serving <url>` once the port is bound, and stops when its stdin closes (the process that started it ended) or on SIGINT.
import { assertDraftPage, serveDraft } from '../lib/draft.mjs';

const [ folder, index = null ] = process.argv.slice( 2 );
const served = await serveDraft( assertDraftPage( folder, index ), { index } );
process.stdout.write( `serving ${ served.url }\n` );
const stop = () => served.close().then( () => process.exit( 0 ) );
process.stdin.on( 'end', stop ).on( 'close', stop ).resume();
process.on( 'SIGINT', stop );
