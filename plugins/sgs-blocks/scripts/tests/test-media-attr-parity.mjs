/**
 * Standing gate: the L1 media-naming helpers must agree ACROSS LANGUAGES.
 *
 * `mediaAttrName()` (JS, src/components/MediaElementControls.js) and
 * `sgs_media_element_attr()` (PHP, includes/helpers-media-element.php) derive
 * the same attribute names from the same (prefix, base) pair. If they drift,
 * the editor writes one key and the renderer reads another - and because
 * WordPress silently ignores an attribute nothing declares, that failure is
 * INVISIBLE: no error, no warning, just a client setting that does nothing.
 *
 * The same applies to the STORED_AS overrides, which exist precisely where the
 * convention does not reproduce a real stored name.
 *
 * Runs the REAL PHP via the php CLI rather than reimplementing the rule - a
 * check that reimplements what it checks can only prove the reimplementation.
 *
 * Run:  node scripts/tests/test-media-attr-parity.mjs
 * Exit: 0 = green, 1 = red.
 */

import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
const BS = String.fromCharCode(92);
// Self-locating: scripts/tests/ -> plugin root. A gate that needs an argument
// is a gate someone will wire without one.
const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const P = ( process.argv[2] || path.resolve( HERE, '..', '..' ) ).split(BS).join('/');
const { mediaAttrName, mediaAttrKeys, mediaStoredAttrName } =
  await import('file:///' + P + '/src/components/MediaElementControls.js');

function php(body){ return JSON.parse(execFileSync('php',['-r',
  'define("ABSPATH","'+P+'/");require "'+P+'/includes/helpers-media-element.php";'+body],{encoding:'utf8'})); }

const cases=[['before','ImageUrl'],['','ImageUrl'],['split','Image'],['bg','Video'],
             ['background','Image'],['after','SvgContent'],['','MediaType'],['','VideoCaptionsUrl']];
const phpNames = php('$c='+JSON.stringify(cases)+';$o=[];foreach($c as $x){$o[]=sgs_media_element_attr($x[0],$x[1]);}echo json_encode($o);');
let fail=0;
console.log('JS <-> PHP NAMING PARITY');
cases.forEach(([p,b],i)=>{ const js=mediaAttrName(p,b), ph=phpNames[i], ok=js===ph;
  console.log('  '+(ok?'ok  ':'FAIL')+" ('"+p+"','"+b+"') -> JS="+js+" PHP="+ph); if(!ok)fail++; });

const sc=[['sgs/before-after','before','VideoAutoplay'],['sgs/media','','VideoAutoplay'],['sgs/decorative-image','','DecorMedia']];
const phpStored = php('$c='+JSON.stringify(sc)+';$o=[];foreach($c as $x){$o[]=sgs_media_element_stored_attr($x[0],$x[1],$x[2]);}echo json_encode($o);');
console.log('\nstoredAs OVERRIDE PARITY');
sc.forEach(([s,p,b],i)=>{ const js=mediaStoredAttrName(s,p,b), ph=phpStored[i], ok=js===ph;
  console.log('  '+(ok?'ok  ':'FAIL')+' '+s+" ('"+p+"','"+b+"') -> JS="+js+" PHP="+ph); if(!ok)fail++; });

const k=mediaAttrKeys('before');
console.log('\nmediaAttrKeys("before") -> '+Object.keys(k).length+' keys');
console.log('  imageUrlTablet -> '+k.imageUrlTablet+'   (expect beforeImageUrlTablet)');
if(k.imageUrlTablet!=='beforeImageUrlTablet'){console.log('  FAIL tier key');fail++;}
console.log(fail?'\n'+fail+' PARITY FAILURE(S)':'\nJS and PHP agree on every case');
process.exit(fail?1:0);
