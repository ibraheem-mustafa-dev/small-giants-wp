# What the skeleton stage had for each dropped point (2026-10-29 intakes)

### mamas-munches-redesign / basket-gift-note-upsell

surfaces.json record:

```json
{
 "kind": "form",
 "name": "Basket gift note + upsell",
 "dc": "Basket",
 "template_tpl_id": [
  "47"
 ],
 "route": "Basket.dc.html",
 "parent": "S-23",
 "opened_by": "Tick \"This is a gift\"",
 "closed_by": "Untick",
 "states": [
  {
   "name": "gift note open",
   "state_keys": {
    "gift.on": true
   },
   "sc_if_tpl_ids": [
    "47"
   ],
   "how_to_reach": "MM.cart.setGift({ on: true })"
  },
  {
   "name": "upsell shown",
   "state_keys": {
    "showUpsell": true
   },
   "sc_if_tpl_ids": [
    "49"
   ],
   "how_to_reach": "No Taster Trio line"
  }
 ],
 "time_dependent": {
  "value": true,
  "reason": "localStorage mm_gift_v2."
 },
 "id": "S-24"
}
```

logged gap: basket-gift-note-upsell: <sc-if> Basket:47 renders nothing at this route and state; still not rendered after state "upsell shown" {"showUpsell":true} (1440px: <sc-if> Basket:47 renders nothing at this route and state; 375px: <sc-if> Basket:47 renders nothing at this route and state; 768px: <sc-if> Basket:47 renders nothing at this route and state)

### mamas-munches-redesign / cancel-subscription-confirm

surfaces.json record:

```json
{
 "kind": "modal",
 "name": "Cancel subscription confirm",
 "dc": "Account",
 "template_tpl_id": [
  "129"
 ],
 "route": "Account.dc.html?tab=subs",
 "parent": "S-54",
 "opened_by": "\"Cancel subscription\"",
 "closed_by": "\"Keep it\", or \"Yes, cancel\" (→ cancelled)",
 "states": [
  {
   "name": "confirming",
   "state_keys": {
    "confirm": "<sub id>"
   },
   "sc_if_tpl_ids": [
    "129"
   ],
   "how_to_reach": "dcLogic('Account').setState({ tab: \"subs\", confirm: \"s1\" })"
  }
 ],
 "time_dependent": {
  "value": false,
  "reason": "Reads no clock, random value, storage or timer."
 },
 "notes": "Inline role=\"alertdialog\" panel inside the card, not an overlay.",
 "id": "S-55"
}
```

logged gap: cancel-subscription-confirm: <sc-if> Account:129 renders nothing at this route and state; no opener: no surfaces.json state gives a settable state key or a setState call, and opened_by names no template handler of the component

### mamas-munches-redesign / address-form-add-edit

surfaces.json record:

```json
{
 "kind": "form",
 "name": "Address form (add / edit)",
 "dc": "Account",
 "template_tpl_id": [
  "160"
 ],
 "route": "Account.dc.html?tab=addresses",
 "parent": "S-56",
 "opened_by": "\"Add an address\" or Edit",
 "closed_by": "Save address (name, line 1, town, postcode required) or Cancel",
 "states": [
  {
   "name": "editing",
   "state_keys": {
    "editing": "new|<address id>"
   },
   "sc_if_tpl_ids": [
    "160"
   ],
   "how_to_reach": "dcLogic('Account').setState({ tab: \"addresses\", editing: \"new\", form: {} })"
  },
  {
   "name": "validation",
   "state_keys": {
    "formErr": "Fill in name, address line 1, town and postcode"
   },
   "sc_if_tpl_ids": [
    "174"
   ],
   "how_to_reach": "Save empty"
  }
 ],
 "time_dependent": {
  "value": false,
  "reason": "Reads no clock, random value, storage or timer."
 },
 "id": "S-57"
}
```

logged gap: address-form-add-edit: <sc-if> Account:160 renders nothing at this route and state; no opener: no surfaces.json state gives a settable state key or a setState call, and opened_by names no template handler of the component

### mamas-munches-redesign / account-details-change-password

surfaces.json record:

```json
{
 "kind": "form",
 "name": "Account details + change password",
 "dc": "Account",
 "template_tpl_id": [
  "179"
 ],
 "route": "Account.dc.html?tab=details",
 "parent": "S-49",
 "opened_by": "Account details tab",
 "closed_by": "Another tab",
 "states": [
  {
   "name": "details form",
   "state_keys": {
    "tab": "details"
   },
   "sc_if_tpl_ids": [
    "179"
   ],
   "how_to_reach": "setState({ tab: \"details\" })"
  },
  {
   "name": "details error / saved ✓ (2.4s)",
   "state_keys": {
    "detErr": "Add your first name and a valid email",
    "saved": true
   },
   "sc_if_tpl_ids": [
    "193",
    "197"
   ],
   "how_to_reach": "Save with an empty name, or a valid save"
  },
  {
   "name": "password error / updated ✓ (2.4s)",
   "state_keys": {
    "pwErr": "…",
    "pwSaved": true
   },
   "sc_if_tpl_ids": [
    "206",
    "210"
   ],
   "how_to_reach": "Update with a short password, or a valid one"
  }
 ],
 "time_dependent": {
  "value": true,
  "reason": "setTimeout 2400ms hides the saved messages."
 },
 "id": "S-58"
}
```

logged gap: account-details-change-password: <sc-if> Account:179 renders nothing at this route and state; still not rendered after state "details form" {"tab":"details"} (1440px: <sc-if> Account:179 renders nothing at this route and state; 375px: <sc-if> Account:179 renders nothing at this route and state; 768px: <sc-if> Account:179 renders nothing at this route and state); then state "details error / saved ✓ (2.4s)" {"saved":true} (1440px: <sc-if> Account:179 renders nothing at this route and state; 375px:

### eye-care-ward-end / storefront-shell

surfaces.json record:

```json
{
 "id": "S-01",
 "dc": "Eye Care Birmingham",
 "time_dependent": {
  "value": true,
  "reason": "measure() polls container width every 120ms for 40 ticks, then every 800ms; ResizeObserver also updates state.w."
 },
 "parent": null,
 "kind": "global",
 "name": "Storefront shell",
 "template_tpl_id": "0",
 "route": "*",
 "opened_by": "Always rendered",
 "closed_by": "Never",
 "breakpoints": [
  "mobile",
  "tablet",
  "desktop"
 ],
 "states": [
  {
   "name": "mobile",
   "state_keys": {
    "w": "< 768"
   },
   "how_to_reach": "Resize the container below 768px, or L = dcLogic('Eye Care Birmingham'); L.setState({w:375})"
  },
  {
   "name": "tablet",
   "state_keys": {
    "w": "768–1023"
   },
   "how_to_reach": "L.setState({w:800})"
  },
  {
   "name": "desktop",
   "state_keys": {
    "w": ">= 1024"
   },
   "how_to_reach": "L.setState({w:1400})"
  }
 ],
 "source": "measure(), renderVals() breakpoint flags",
 "notes": "Breakpoints are measured on the root container width (state.w), not the viewport. Extra steps: 620 (lens options one-up), 1060 (nav compact, filter drawer), 1100 (lens aside), 1160 (header phone), 1280 (four-up product grid). Accounts: state.user (null when signed out), auth, acct, addr, subs, placed, lastOrder."
}
```

logged gap: storefront-shell: <sc-helmet> Eye Care Birmingham:0 is not rendered at this route and state; still not rendered after reach "mobile" L.setState({w:375}) at w <= 767 (1440px: <sc-helmet> Eye Care Birmingham:0 is not rendered at this route and state; 375px: <sc-helmet> Eye Care Birmingham:0 is not rendered at this route and state; 768px: <sc-helmet> Eye Care Birmingham:0 is not rendered at this route and state); then reach "tablet" L.setState({w:800}) at w 768-1023 (1440px: <sc-helmet> Eye Care Bi

### eye-care-ward-end / addresses

surfaces.json record:

```json
{
 "dc": "Eye Care Birmingham",
 "id": "S-49",
 "kind": "form",
 "name": "Addresses",
 "template_tpl_id": "1055",
 "route": "account",
 "parent": "S-45",
 "opened_by": "Addresses tab",
 "closed_by": "Another tab",
 "breakpoints": [
  "mobile",
  "tablet",
  "desktop"
 ],
 "time_dependent": {
  "value": false,
  "reason": "Reads no Date, Math.random, localStorage or timers."
 },
 "source": "addrCards; state.addr, acct.editAddr",
 "states": [
  {
   "name": "viewing",
   "state_keys": {
    "acct.editAddr": null
   },
   "how_to_reach": "L.setState({acct:{tab:'addr', editAddr:null}})",
   "sc_if_tpl_ids": [
    "1063",
    "1065"
   ]
  },
  {
   "name": "editing delivery or billing",
   "state_keys": {
    "acct.editAddr": "'delivery' | 'billing'"
   },
   "how_to_reach": "Edit / Add; L.setState({acct:{tab:'addr', editAddr:'delivery'}})",
   "sc_if_tpl_ids": [
    "1067"
   ],
   "animation_ids": [
    "CA-87",
    "TR-95",
    "TR-96"
   ]
  }
 ],
 "notes": "Billing shows \"Same as delivery address\" until one is saved. The saved delivery address prefills the checkout fields while signed in."
}
```

logged gap: addresses: <sc-if> Eye Care Birmingham:1055 renders nothing at this route and state; still not rendered after reach "viewing" L.setState({acct:{tab:'addr', editAddr:null}}) (1440px: <sc-if> Eye Care Birmingham:1055 renders nothing at this route and state; 375px: <sc-if> Eye Care Birmingham:1055 renders nothing at this route and state; 768px: <sc-if> Eye Care Birmingham:1055 renders nothing at this route and state); then reach "editing delivery or billing" L.setState({acct:{tab:'addr', editAddr:'

### eye-care-ward-end / account-details

surfaces.json record:

```json
{
 "dc": "Eye Care Birmingham",
 "id": "S-51",
 "kind": "form",
 "name": "Account details",
 "template_tpl_id": "1095",
 "route": "account",
 "parent": "S-45",
 "opened_by": "Account details tab",
 "closed_by": "Another tab",
 "breakpoints": [
  "mobile",
  "tablet",
  "desktop"
 ],
 "time_dependent": {
  "value": false,
  "reason": "Reads no Date, Math.random, localStorage or timers."
 },
 "source": "saveDetails (FormData)",
 "states": [
  {
   "name": "editing",
   "state_keys": {
    "acct.saved": false
   },
   "how_to_reach": "L.setState({acct:{tab:'details', saved:false}})",
   "sc_if_tpl_ids": [
    "1095"
   ],
   "animation_ids": [
    "CA-89",
    "CA-90",
    "TR-98"
   ]
  },
  {
   "name": "saved",
   "state_keys": {
    "acct.saved": true
   },
   "how_to_reach": "Save changes",
   "sc_if_tpl_ids": [
    "1120"
   ],
   "animation_ids": [
    "CA-90"
   ]
  }
 ],
 "notes": "Name, email, mobile; change password (current, new, again) left blank to keep. No password check in the prototype."
}
```

logged gap: account-details: <sc-if> Eye Care Birmingham:1095 renders nothing at this route and state; still not rendered after reach "editing" L.setState({acct:{tab:'details', saved:false}}) (1440px: <sc-if> Eye Care Birmingham:1095 renders nothing at this route and state; 375px: <sc-if> Eye Care Birmingham:1095 renders nothing at this route and state; 768px: <sc-if> Eye Care Birmingham:1095 renders nothing at this route and state)

### eye-care-ward-end / shop-filter-rail-drawer

surfaces.json record:

```json
{
 "id": "S-17",
 "dc": "Eye Care Birmingham",
 "time_dependent": {
  "value": false,
  "reason": "Reads no Date, Math.random, localStorage or timers."
 },
 "parent": "S-09",
 "kind": "drawer",
 "name": "Shop filter rail / drawer",
 "template_tpl_id": "269",
 "route": "shop",
 "opened_by": "Always visible as a sticky rail at >= 1060px; below that the Filter button (toggleFilters)",
 "closed_by": "× or \"Show N frames\" (toggleFilters); go()",
 "breakpoints": [
  "mobile",
  "tablet",
  "desktop"
 ],
 "states": [
  {
   "name": "sticky rail",
   "state_keys": {
    "w": ">= 1060"
   },
   "how_to_reach": "L.setState({page:'shop', w:1400})",
   "sc_if_tpl_ids": [
    "268"
   ]
  },
  {
   "name": "drawer closed",
   "state_keys": {
    "w": "< 1060",
    "filtersOpen": false
   },
   "how_to_reach": "L.setState({page:'shop', w:900, filtersOpen:false})",
   "sc_if_tpl_ids": [
    "253"
   ]
  },
  {
   "name": "drawer open (full screen)",
   "state_keys": {
    "w": "< 1060",
    "filtersOpen": true
   },
   "how_to_reach": "Tap Filter; L.setState({page:'shop', w:900, filtersOpen:true})",
   "sc_if_tpl_ids": [
    "268",
    "270",
    "317"
   ],
   "animation_ids": [
    "CA-12"
   ]
  }
 ],
 "source": "drawerFilters, showRail, filtersFull",
 "notes": "The drawer behaves like the mobile menu: full-screen fade-in, × top right, page scroll locked (J-08), sticky Clear / Show N frames footer."
}
```

logged gap: shop-filter-rail-drawer: no element matches [data-sgs-skeleton-root="shop-filter-rail-drawer"] at 375px

### indus-foods / footer: the floating WhatsApp button (inventory element)

```json
{
 "key": "Indus Foods Website v2/728#0",
 "parentKey": null,
 "strip": {
  "side": "after",
  "distance": 1
 },
 "depth": 1,
 "tag": "a",
 "template": "Indus Foods Website v2",
 "tpl": 728,
 "attrs": {
  "href": "https://wa.me/441217714330",
  "aria-label": "Message Indus Foods on WhatsApp",
  "target": "_blank",
  "class": "scp1k",
  "style": "position: fixed; right: 22px; bottom: 22px; z-index: 140; display: flex; align-items: center; gap: 10px; background: rgb(37, 211, 102); color: rgb(11, 43, 23); border-radius: 999px; padding: 0px 18px 0px 14px; min-height: 52px; font-size: 15px; font-weight: 600; box-shadow: rgba(13, 110, 53, 0.32) 0px 10px 30px; transition: transform 0.25s, background 0.25s;"
 },
 "words": "",
 "allText": "Chat with our team",
 "srcLine": 1002,
 "membership": [],
 "srcTag": "a",
 "srcOwnText": "",
 "snippet": "<a href=\"https://wa.me/441217714330\" target=\"_blank\" rel=\"noopener\" aria-label=\"Message Indus Foods on WhatsApp\" style=\"position:fixed;right:22px;bottom:22px;z-index:140;display:flex;align-items:center;gap:10px;background:#25D366;color:#0B2B17;border-radius:999px;padding:0 18px 0 14px;min-height:52px;font-size:15px;font-weight:600;box-shadow:0 10px 30px rgba(13,110,53,.32);transition:transform .25",
 "box": {
  "375": {
   "x": 299,
   "y": 826,
   "w": 54,
   "h": 52
  },
  "768": {
   "x": 559,
   "y": 826,
   "w": 187,
   "h": 52
  },
  "1440": {
   "x": 1231,
   "y": 826,
   "w": 187,
   "h": 52
  }
 },
 "visible": {
  "375": true,
  "768": true,
  "1440": true
 },
 "display": "flex",
 "position": {
  "375": "fixed",
  "768": "fixed",
  "1440": "fixed"
 },
 "flexDirection": "row",
 "layoutChanged375": true
}
```

### mamas-munches-redesign / checkout header

logged gap: the census holds a <header> in Checkout and surfaces.json has no header record for that component
