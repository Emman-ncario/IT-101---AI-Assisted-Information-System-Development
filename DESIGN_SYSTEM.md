# Room for More? — UI Design Notes

## Brand
- Product name: **Room for More?**
- Brand idea: campus spaces made easier to discover and reserve.
- Logo: `apps/web/public/room-for-more-logo.svg` (building + reservation check).
- Suggested tagline: **Find your space. Make it yours.**

## Color tokens
| Token | Light | Purpose |
|---|---|---|
| Primary | `#2864C8` | Main actions, links, active navigation |
| Primary soft | `#EAF1FC` | Selected states and subtle highlights |
| Navy | `#172B4D` | Main text and brand anchor |
| Amber | `#F2A65A` | Accent and pending indicators |
| Background | `#F3F6FB` | App canvas |
| Surface | `#FFFFFF` | Cards and panels |
| Green | `#168568` | Available / success |
| Red | `#C94B53` | Occupied / destructive actions |

Dark mode uses the matching CSS custom properties in `apps/web/src/styles.css`.

## UX updates
- Find Rooms: room search by number/type, room-type filter, minimum-capacity filter, result count, and clearer selected-room state. Existing live availability and queue submission API calls are retained.
- Booking Queue: summary metrics, search, date sorting, refresh, clearer pending labels, and localized date/time display. Existing remove and confirm API calls are retained.
- Responsive filters and queue summary cards adapt to narrow screens.
