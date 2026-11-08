// W7 art (2026-10-30, sheets W7-A..D). Not yet wired into screens: Posse emblems/header wait for the Posse build, chat stickers for Quick Chat, new Park Assets for the badge/Memento shop (economy owner sets names, prices, rarity points).
import pe_skirmish from './posse/skirmish.webp';
import pe_bingo from './posse/bingo.webp';
import pe_porch from './posse/porch.webp';
import pe_knit from './posse/knit.webp';
import pe_casserole from './posse/casserole.webp';
import pe_gnome from './posse/gnome.webp';
import pe_cane from './posse/cane.webp';
import pe_swing from './posse/swing.webp';
import posseHeader from './posse/header.webp';
import cs_wave from './chat/wave.webp';
import cs_thumbs from './chat/thumbs.webp';
import cs_rematch from './chat/rematch.webp';
import cs_bingo from './chat/bingo.webp';
import cs_morning from './chat/morning.webp';
import cs_night from './chat/night.webp';
import cs_thanks from './chat/thanks.webp';
import cs_goodfight from './chat/goodfight.webp';
import pa_birdbath from './parkassets/birdbath.webp';
import pa_lemonade from './parkassets/lemonade.webp';
import pa_rosearch from './parkassets/rosearch.webp';
import pa_shuffletable from './parkassets/shuffletable.webp';
import pa_fountain from './parkassets/fountain.webp';
import pa_flagpole from './parkassets/flagpole.webp';
import pa_bingostatue from './parkassets/bingostatue.webp';
import pa_gazebo from './parkassets/gazebo.webp';
import ge_beret from './gear2/beret.webp';
import ge_bifocals from './gear2/bifocals.webp';
import ge_shawl from './gear2/shawl.webp';
import ge_cardigan from './gear2/cardigan.webp';
import ge_pearls from './gear2/pearls.webp';
import ge_gloves from './gear2/gloves.webp';
import ge_horseshoe from './gear2/horseshoe.webp';
import ge_bell from './gear2/bell.webp';
import kk_weddingalbum from './keepsakes2/weddingalbum.webp';
import kk_harmonica from './keepsakes2/harmonica.webp';
import kk_sewingbasket from './keepsakes2/sewingbasket.webp';
import kk_musicbox from './keepsakes2/musicbox.webp';
import kk_seedjar from './keepsakes2/seedjar.webp';
import kk_teapot from './keepsakes2/teapot.webp';
import aq_brassbell from './antiques2/brassbell.webp';
import aq_doorstop from './antiques2/doorstop.webp';
import aq_coffeegrinder from './antiques2/coffeegrinder.webp';
import aq_goldcompass from './antiques2/goldcompass.webp';
import aq_footstool from './antiques2/footstool.webp';
import aq_trophyspoon from './antiques2/trophyspoon.webp';
import pb_picnictable from './parkassets/picnictable.webp';
import pb_pinwheel from './parkassets/pinwheel.webp';
import pb_mailbox from './parkassets/mailbox.webp';
import pb_wishingwell from './parkassets/wishingwell.webp';
import pb_bandstand from './parkassets/bandstand.webp';
import pb_vegbed from './parkassets/vegbed.webp';
import pb_elderstatue from './parkassets/elderstatue.webp';
import pb_lamppost from './parkassets/lamppost.webp';
import pz_anchor from './posse2/anchor.webp';
import pz_bell from './posse2/bell.webp';
import pz_cat from './posse2/cat.webp';
import pz_clover from './posse2/clover.webp';
import pz_compass from './posse2/compass.webp';
import pz_crown from './posse2/crown.webp';
import pz_diamond from './posse2/diamond.webp';
import pz_dog from './posse2/dog.webp';
import pz_dragon from './posse2/dragon.webp';
import pz_fishing from './posse2/fishing.webp';
import pz_flame from './posse2/flame.webp';
import pz_glasses from './posse2/glasses.webp';
import pz_key from './posse2/key.webp';
import pz_lightning from './posse2/lightning.webp';
import pz_oldgang from './posse2/oldgang.webp';
import pz_owl from './posse2/owl.webp';
import pz_pie from './posse2/pie.webp';
import pz_rocket from './posse2/rocket.webp';
import pz_rose from './posse2/rose.webp';
import pz_sedan from './posse2/sedan.webp';
import pz_shield from './posse2/shield.webp';
import pz_star from './posse2/star.webp';
import pz_sunflower from './posse2/sunflower.webp';
import pz_sunrise from './posse2/sunrise.webp';
import pz_teapot from './posse2/teapot.webp';
import pz_trophy from './posse2/trophy.webp';
import pz_unicorn from './posse2/unicorn.webp';
import pz_yarn from './posse2/yarn.webp';
import pu_posse from './posseui/posse.webp';
import pu_chat from './posseui/chat.webp';
import pu_recruit from './posseui/recruit.webp';
import pu_missions from './posseui/missions.webp';
import pu_points from './posseui/points.webp';
import pu_level from './posseui/level.webp';
import pu_reward from './posseui/reward.webp';
import pu_trophy from './posseui/trophy.webp';
import st_horn from './chat/horn.webp';
import st_flag from './chat/flag.webp';
import st_hands from './chat/hands.webp';
import st_tea from './chat/tea.webp';
import st_scroll from './chat/scroll.webp';
import st_cheer from './chat/cheer.webp';
import st_laugh from './chat/laugh.webp';
import st_sorry from './chat/sorry.webp';
import st_okay from './chat/okay.webp';
import st_highfive from './chat/highfive.webp';
import st_surprised from './chat/surprised.webp';
import st_sleepy from './chat/sleepy.webp';
import st_casserole from './chat/casserole.webp';
import st_puck from './chat/puck.webp';
import st_heart from './chat/heart.webp';
import st_confetti from './chat/confetti.webp';
import p3_frame3 from './posse3/frame3.webp';
import p3_frame6 from './posse3/frame6.webp';
import p3_frame9 from './posse3/frame9.webp';
import p3_racewinner from './posse3/racewinner.webp';
import p3_champbirds from './posse3/champbirds.webp';
import p3_champowls from './posse3/champowls.webp';
import p3_champdrivers from './posse3/champdrivers.webp';
import p3_cup from './posse3/cup.webp';
import p3_raidparty from './posse3/raidparty.webp';
import p3_holdline from './posse3/holdline.webp';
import p3_rivals from './posse3/rivals.webp';
import p3_bossdown from './posse3/bossdown.webp';
import p3_duesrun from './posse3/duesrun.webp';
import p3_showup from './posse3/showup.webp';
import ev_cornucopia from './events2/cornucopia.webp';
import ev_platter from './events2/platter.webp';
import ev_redjar from './events2/redjar.webp';
import ev_gravypot from './events2/gravypot.webp';
import ev_haybales from './events2/haybales.webp';
import ev_pumpkins from './events2/pumpkins.webp';
import ev_potlucktable from './events2/potlucktable.webp';
import ev_ciderpress from './events2/ciderpress.webp';
import ev_skates from './events2/skates.webp';
import ev_sleighbells from './events2/sleighbells.webp';
import ev_sled from './events2/sled.webp';
import ev_snowglobe from './events2/snowglobe.webp';
import ev_snowman from './events2/snowman.webp';
import ev_cocoastand from './events2/cocoastand.webp';
import ev_pinetree from './events2/pinetree.webp';
import ev_iceswan from './events2/iceswan.webp';

export const POSSE_EMBLEM_ART: string[] = [pe_skirmish, pe_bingo, pe_porch, pe_knit, pe_casserole, pe_gnome, pe_cane, pe_swing];
export const POSSE_HEADER_ART: string = posseHeader;
export const CHAT_STICKER_ART: Record<string, string> = { horn: st_horn, flag: st_flag, hands: st_hands, tea: st_tea, scroll: st_scroll, cheer: st_cheer, laugh: st_laugh, sorry: st_sorry, okay: st_okay, highfive: st_highfive, surprised: st_surprised, sleepy: st_sleepy, casserole: st_casserole, puck: st_puck, heart: st_heart, confetti: st_confetti, wave: cs_wave, thumbs: cs_thumbs, rematch: cs_rematch, bingo: cs_bingo, morning: cs_morning, night: cs_night, thanks: cs_thanks, goodfight: cs_goodfight };
// Suggested names and rarity looks (Common x3, Rare x2, Epic x2, Legendary x1); the economy owner may rename.
export const NEW_PARK_ASSET_ART: Record<string, { name: string; rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary'; art: string }> = {
  birdbath: { name: 'Bird Bath', rarity: 'Common', art: pa_birdbath },
  lemonade: { name: 'Lemonade Stand', rarity: 'Common', art: pa_lemonade },
  rosearch: { name: 'Rose Arch', rarity: 'Rare', art: pa_rosearch },
  shuffletable: { name: 'Shuffleboard Table', rarity: 'Rare', art: pa_shuffletable },
  fountain: { name: 'Wishing Fountain', rarity: 'Epic', art: pa_fountain },
  flagpole: { name: 'Clubhouse Flagpole', rarity: 'Common', art: pa_flagpole },
  bingostatue: { name: 'Bingo Ball Statue', rarity: 'Epic', art: pa_bingostatue },
  gazebo: { name: 'Golden Gazebo', rarity: 'Legendary', art: pa_gazebo },
};
// W7-E gear art (no game objects yet: boosts, rarity and drop sources are set when the pieces are added to the drop tables / shops).
export const NEW_GEAR_ART_W7: Record<string, { slot: 'Head' | 'Body' | 'Accessory' | 'Charm'; art: string }> = {
  'Wool Beret': { slot: 'Head', art: ge_beret },
  'Bifocal Chain Glasses': { slot: 'Head', art: ge_bifocals },
  'Knitted Shawl': { slot: 'Body', art: ge_shawl },
  'Elbow Patch Cardigan': { slot: 'Body', art: ge_cardigan },
  'Pearl Necklace': { slot: 'Accessory', art: ge_pearls },
  'Garden Gloves': { slot: 'Accessory', art: ge_gloves },
  'Lucky Horseshoe': { slot: 'Charm', art: ge_horseshoe },
  'Brass Bell Keychain': { slot: 'Charm', art: ge_bell },
};
// W7-F new Keepsakes and W7-G new Antiques (art only; rarity, price, perks and where they drop are set when added to the shops/collections).
export const NEW_KEEPSAKE_ART_W7: Record<string, string> = {
  "Wedding Album": kk_weddingalbum,
  "Grandpa's Harmonica": kk_harmonica,
  "Sewing Basket Heirloom": kk_sewingbasket,
  "Porch Music Box": kk_musicbox,
  "Victory Garden Seed Jar": kk_seedjar,
  "Hand-Painted Teapot": kk_teapot,
};
export const NEW_ANTIQUE_ART_W7: Record<string, string> = {
  "Brass Bingo Bell": aq_brassbell,
  "Cast-Iron Doorstop": aq_doorstop,
  "Crank Coffee Grinder": aq_coffeegrinder,
  "Gold Pocket Compass": aq_goldcompass,
  "Embroidered Footstool": aq_footstool,
  "Silver Trophy Spoon": aq_trophyspoon,
};
// W7-H Park Assets set 2 (suggested rarity looks; economy owner sets names/prices/points).
export const NEW_PARK_ASSET_ART2: Record<string, { name: string; rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary'; art: string }> = {
  picnictable: { name: 'Picnic Table', rarity: 'Common', art: pb_picnictable },
  pinwheel: { name: 'Garden Pinwheel', rarity: 'Common', art: pb_pinwheel },
  mailbox: { name: 'Porch Mailbox', rarity: 'Common', art: pb_mailbox },
  wishingwell: { name: 'Wishing Well', rarity: 'Rare', art: pb_wishingwell },
  bandstand: { name: 'Bandstand', rarity: 'Epic', art: pb_bandstand },
  vegbed: { name: 'Vegetable Bed', rarity: 'Rare', art: pb_vegbed },
  elderstatue: { name: 'Founder Statue', rarity: 'Epic', art: pb_elderstatue },
  lamppost: { name: 'Brass Lamp Post', rarity: 'Rare', art: pb_lamppost },
};

// E1-E3 (2026-11-03): art for every Posse emblem id that was still emoji, plus the new 'oldgang' seal (level 5). Keys are Posse emblem ids.
export const POSSE_EMBLEM_BY_ID: Record<string, string> = { anchor: pz_anchor, bell: pz_bell, cat: pz_cat, clover: pz_clover, compass: pz_compass, crown: pz_crown, diamond: pz_diamond, dog: pz_dog, dragon: pz_dragon, fishing: pz_fishing, flame: pz_flame, glasses: pz_glasses, key: pz_key, lightning: pz_lightning, oldgang: pz_oldgang, owl: pz_owl, pie: pz_pie, rocket: pz_rocket, rose: pz_rose, sedan: pz_sedan, shield: pz_shield, star: pz_star, sunflower: pz_sunflower, sunrise: pz_sunrise, teapot: pz_teapot, trophy: pz_trophy, unicorn: pz_unicorn, yarn: pz_yarn };
// I1: Posse UI icons.
export const POSSE_UI_ART: Record<string, string> = { posse: pu_posse, chat: pu_chat, recruit: pu_recruit, missions: pu_missions, points: pu_points, level: pu_level, reward: pu_reward, trophy: pu_trophy };

// P1-P3 (2026-11-07): Posse banner frames (transparent centre; Posse levels 3, 6, 9), competition banners and Cup, mission icons keyed by server mission id.
export const POSSE_BANNER_FRAME_ART: Record<number, string> = { 3: p3_frame3, 6: p3_frame6, 9: p3_frame9 };
export const POSSE_COMPETE_ART = { raceWinner: p3_racewinner, factionChampion: { birds: p3_champbirds, owls: p3_champowls, drivers: p3_champdrivers }, cup: p3_cup };
export const POSSE_MISSION_ICON_ART: Record<string, string> = { raid_party: p3_raidparty, hold_line: p3_holdline, rivals: p3_rivals, boss_down: p3_bossdown, dues_run: p3_duesrun, show_up: p3_showup };
// TG / WG event art (art only; how event antiques are earned is still a design decision, see tracker W1.5). 4 antiques + 4 Park Assets each.
export const THANKSGIVING_ART = {
  antiques: { 'Harvest Cornucopia': ev_cornucopia, 'Gilded Serving Platter': ev_platter, 'Cranberry Glass Jar': ev_redjar, 'Cast-Iron Gravy Pot': ev_gravypot },
  parkAssets: { 'Hay Bale Stack': ev_haybales, 'Pumpkin Patch': ev_pumpkins, 'Potluck Table': ev_potlucktable, 'Cider Press': ev_ciderpress },
};
export const WINTER_GAMES_ART = {
  antiques: { 'Antique Ice Skates': ev_skates, 'Brass Sleigh Bells': ev_sleighbells, 'Wooden Toboggan': ev_sled, 'Winter Snow Globe': ev_snowglobe },
  parkAssets: { 'Snowman': ev_snowman, 'Hot Cocoa Stand': ev_cocoastand, 'Lit Pine Tree': ev_pinetree, 'Ice Swan Sculpture': ev_iceswan },
};
