// Event scenes, set/legendary gear icons and a few UI icons generated 2026-10-14 (sheets AA7-AA9, Sheet1, Sheet2). Spare, not-yet-used art lives in game-assets/spare/.
import ev_sweetheart from './events/sweetheart.webp';
import ev_springfling from './events/springfling.webp';
import ev_summerpicnic from './events/summerpicnic.webp';
import ev_grandparents from './events/grandparents.webp';
import ev_spooky from './events/spooky.webp';
import ev_thanksgiving from './events/thanksgiving.webp';
import ev_winter from './events/winter.webp';
import g_as_head from './gear/as_head.webp';
import g_as_body from './gear/as_body.webp';
import g_as_acc from './gear/as_acc.webp';
import g_as_charm from './gear/as_charm.webp';
import g_rs_head from './gear/rs_head.webp';
import g_rs_body from './gear/rs_body.webp';
import g_rs_acc from './gear/rs_acc.webp';
import g_rs_charm from './gear/rs_charm.webp';
import g_golden_glasses from './gear/golden_glasses.webp';
import g_heirloom_watch from './gear/heirloom_watch.webp';
import g_clover_pin from './gear/clover_pin.webp';
import ui_elderpass from './ui/elderpass.webp';
import ui_goldpass from './ui/goldpass.webp';
import ui_workshop from './ui/workshop.webp';

// Seasonal event id -> scene art (Spooky Bingo Night uses the cardigan ghost; the other ghost is spare/ghost_a.webp).
export const EVENT_ART: Record<string, string> = { sweetheart: ev_sweetheart, springfling: ev_springfling, summerpicnic: ev_summerpicnic, grandparents: ev_grandparents, spooky: ev_spooky, potluck: ev_thanksgiving, wintergames: ev_winter };

// Gear item NAME -> icon (merged into ITEM_ICON_ASSETS).
export const NEW_GEAR_ART: Record<string, string> = {
  "Champion's Sweatband": g_as_head,
  'Clubhouse Cardigan': g_as_body,
  'Banner Brooch': g_as_acc,
  'Faction Pin': g_as_charm,
  'Whistle-Blower Cap': g_rs_head,
  'Reflective Crossing Vest': g_rs_body,
  'Clipboard Shield': g_rs_acc,
  'Lucky Bingo Dauber': g_rs_charm,
  'Golden Reading Glasses': g_golden_glasses,
  'Heirloom Pocket Watch': g_heirloom_watch,
  'Four-Leaf Clover Pin': g_clover_pin,
};

export const UI_ART = { elderPass: ui_elderpass, goldPass: ui_goldpass, workshop: ui_workshop };
