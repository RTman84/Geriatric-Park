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

export const POSSE_EMBLEM_ART: string[] = [pe_skirmish, pe_bingo, pe_porch, pe_knit, pe_casserole, pe_gnome, pe_cane, pe_swing];
export const POSSE_HEADER_ART: string = posseHeader;
export const CHAT_STICKER_ART: Record<string, string> = { wave: cs_wave, thumbs: cs_thumbs, rematch: cs_rematch, bingo: cs_bingo, morning: cs_morning, night: cs_night, thanks: cs_thanks, goodfight: cs_goodfight };
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
