import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/package.json');
export const { chromium } = require('playwright');
export const env = (f,k)=>{const t=fs.readFileSync(f,'utf8');const g=n=>t.match(new RegExp(`${n}='([^']*)'`))[1];return {url:g('WP_URL_'+k),user:g('WP_USER_'+k),pwd:g('WP_PWD_'+k)};};
export async function login(page,e){
  await page.goto(e.url+'/wp-login.php',{waitUntil:'domcontentloaded'});
  await page.fill('#user_login',e.user); await page.fill('#user_pass',e.pwd);
  await page.keyboard.press('Enter'); await page.waitForURL(/wp-admin/,{timeout:30000});
}
export async function openEditor(page,e,id){
  await page.goto(`${e.url}/wp-admin/post.php?post=${id}&action=edit`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('iframe[name="editor-canvas"]',{timeout:60000});
  await page.waitForTimeout(3000);
  // close welcome guide if present
  const close=page.locator('.edit-post-welcome-guide button[aria-label="Close"], .components-modal__header button[aria-label="Close"]');
  if(await close.count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(500);}
}
export const desc=()=>{const a=document.activeElement;const d=e=>e?`${e.tagName}${e.id?'#'+e.id:''}${e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\s+/).slice(0,3).join('.'):''}${e.getAttribute&&e.getAttribute('aria-label')?'[aria-label='+e.getAttribute('aria-label')+']':''}${e.getAttribute&&e.getAttribute('role')?'[role='+e.getAttribute('role')+']':''}`:'null';
 let s=d(a); if(a&&a.tagName==='IFRAME'&&a.contentDocument){const i=a.contentDocument.activeElement; s+=' > '+d(i)+(i&&i.textContent?' "'+i.textContent.slice(0,30)+'"':'');} return s;};
