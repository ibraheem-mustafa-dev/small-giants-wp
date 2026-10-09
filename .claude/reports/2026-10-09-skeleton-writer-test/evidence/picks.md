# Footer finaliser picks

| Key | Words | Generator | Pick | Conf |
|---|---|---|---|---|
| 849 | EYE CARE | text | sgs/text (wordmark, not a heading; responsive-logo needs an image) | 0.70 |
| 850 | BIRMINGHAM | text | sgs/text (sgs/label close) | 0.60 |
| 852 | icon row | social-icons | sgs/social-icons | 0.88 |
| 870 | WhatsApp | icon | sgs/icon bound to Site Info socials.whatsapp | 0.85 |
| 874/880/886 | Shop / Help / Visit or call | text | sgs/heading h2 (column labels) | 0.75 |
| 878 | Glasses — arriving soon | text | sgs/text | 0.82 |
| 888 | phone | button (linkSource phone) | sgs/business-info phone (binds number AND href) | 0.72 |
| 889 | address | business-info | business-info address, addressLink on | 0.80 |
| 891 | hours | business-info | business-info hours, condensed | 0.78 |
| 893 | © line | business-info | business-info copyright, empty prefix (auto year) | 0.80 |
| 894 | Privacy/Terms wrapper | container | sgs/multi-button (container equal; decider: shared link style) | 0.55 |
| 895/896 | Privacy / Terms | button | sgs/button, link style, real page URL required | 0.80/0.75 |

Key finding: sgs/button renders a `<button>` when its URL is empty, so the "#" Privacy/Terms links must get a real destination or be hidden.
Full reasons: picks.json.
