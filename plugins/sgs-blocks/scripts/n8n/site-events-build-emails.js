// SGS site events: turns one webhook POST into zero or more ready-to-send emails.
// Sites must be listed in SITES (keyed by the envelope's site_url); anything else is dropped.
const SITES = {
  'https://sandybrown-nightingale-600381.hostingersite.com': {
    name: 'SGS Canary Shop',
    from: 'admin@ibraheemmustafa.com',
  },
};

const body = $input.first().json.body || {};
const site = SITES[String(body.site_url || '').replace(/\/+$/, '')];
const event = body.event;
const data = body.data || {};

// Form submissions carry no `event`; they are acknowledged and dropped here.
if (!site || (event !== 'sgs_wishlist_alert' && event !== 'sgs_back_in_stock')) {
  return [];
}

const origin = String(body.site_url).replace(/\/+$/, '');
const isEmail = (v) => typeof v === 'string' && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(v) && v.length <= 254;
const isSiteUrl = (v) => typeof v === 'string' && (v === origin || v.startsWith(origin + '/'));
const text = (v) => String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').trim().slice(0, 200);
const esc = (v) => text(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const from = `${site.name} <${site.from}>`;
const wrap = (inner) => `<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#1a1a1a;max-width:560px">${inner}</div>`;
const link = (url, label) => `<a href="${esc(url)}" style="color:#0b57d0">${esc(label)}</a>`;

if (event === 'sgs_wishlist_alert') {
  const to = data.customer && data.customer.email;
  if (!isEmail(to)) return [];
  const items = (Array.isArray(data.items) ? data.items : [])
    .filter((i) => i && isSiteUrl(i.url) && (i.type === 'price_drop' || i.type === 'back_in_stock'))
    .slice(0, 50);
  if (!items.length) return [];
  const manage = isSiteUrl(data.manage_url) ? data.manage_url : origin;
  const hi = text(data.customer.first_name) || 'there';

  const lineText = (i) => i.type === 'price_drop'
    ? `- ${text(i.name)}: price drop, now ${text(i.price_now)} (${text(i.price_saved)} when you saved it)\n  ${i.url}`
    : `- ${text(i.name)}: back in stock\n  ${i.url}`;
  const lineHtml = (i) => i.type === 'price_drop'
    ? `<li style="margin-bottom:12px">${link(i.url, i.name)}<br>Price drop: now <strong>${esc(i.price_now)}</strong> (${esc(i.price_saved)} when you saved it)</li>`
    : `<li style="margin-bottom:12px">${link(i.url, i.name)}<br>Back in stock</li>`;

  const intro = items.length === 1 ? 'An item you saved has changed:' : `${items.length} items you saved have changed:`;
  const footer = `You are getting this because you turned on saved-item alerts at ${site.name}. You can switch them off at any time from your saved items page.`;

  return [{ json: {
    from, to,
    subject: `Update on your saved items at ${site.name}`,
    text: `Hi ${hi},\n\n${intro}\n\n${items.map(lineText).join('\n\n')}\n\nView or manage your saved items: ${manage}\n\n${footer}\n`,
    html: wrap(`<p>Hi ${esc(hi)},</p><p>${esc(intro)}</p><ul style="padding-left:20px">${items.map(lineHtml).join('')}</ul><p>${link(manage, 'View or manage your saved items')}</p><p style="font-size:13px;color:#555">${esc(footer)}</p>`),
  } }];
}

// sgs_back_in_stock: one separate email per subscriber, never a shared recipient list.
if (!isSiteUrl(data.url)) return [];
const name = text(data.name) || 'An item';
const seen = new Set();
return (Array.isArray(data.subscribers) ? data.subscribers : [])
  .map((s) => s && s.email)
  .filter((e) => isEmail(e) && !seen.has(e.toLowerCase()) && seen.add(e.toLowerCase()))
  .slice(0, 500)
  .map((to) => ({ json: {
    from, to,
    subject: `${name} is back in stock at ${site.name}`,
    text: `Hello,\n\nYou asked ${site.name} to let you know when ${name} was back in stock. It is available now:\n${data.url}\n\nThis is a one-off message; we will not email you again about this product.\n`,
    html: wrap(`<p>Hello,</p><p>You asked ${esc(site.name)} to let you know when <strong>${esc(name)}</strong> was back in stock. It is available now.</p><p>${link(data.url, 'View ' + name)}</p><p style="font-size:13px;color:#555">This is a one-off message; we will not email you again about this product.</p>`),
  } }));
