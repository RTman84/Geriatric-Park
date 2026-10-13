// Generated from the AA1-AA3 badge sheets (rank medals, mode glyphs, tier frames). Mode badges are pre-composited
// (glyph on tier frame) so every badge is one image and works anywhere an icon path is accepted.
import rank1 from './rank_1.webp';
import rank2 from './rank_2.webp';
import rank3 from './rank_3.webp';
import rank4 from './rank_4.webp';
import rank5 from './rank_5.webp';
import rank6 from './rank_6.webp';
import glyph_battle from './glyph_battle.webp';
import mode_battle_1 from './mode_battle_1.webp';
import mode_battle_2 from './mode_battle_2.webp';
import mode_battle_3 from './mode_battle_3.webp';
import mode_battle_4 from './mode_battle_4.webp';
import mode_battle_5 from './mode_battle_5.webp';
import glyph_court from './glyph_court.webp';
import mode_court_1 from './mode_court_1.webp';
import mode_court_2 from './mode_court_2.webp';
import mode_court_3 from './mode_court_3.webp';
import mode_court_4 from './mode_court_4.webp';
import mode_court_5 from './mode_court_5.webp';
import glyph_friend from './glyph_friend.webp';
import mode_friend_1 from './mode_friend_1.webp';
import mode_friend_2 from './mode_friend_2.webp';
import mode_friend_3 from './mode_friend_3.webp';
import mode_friend_4 from './mode_friend_4.webp';
import mode_friend_5 from './mode_friend_5.webp';
import glyph_arena from './glyph_arena.webp';
import mode_arena_1 from './mode_arena_1.webp';
import mode_arena_2 from './mode_arena_2.webp';
import mode_arena_3 from './mode_arena_3.webp';
import mode_arena_4 from './mode_arena_4.webp';
import mode_arena_5 from './mode_arena_5.webp';
import glyph_exchange from './glyph_exchange.webp';
import mode_exchange_1 from './mode_exchange_1.webp';
import mode_exchange_2 from './mode_exchange_2.webp';
import mode_exchange_3 from './mode_exchange_3.webp';
import mode_exchange_4 from './mode_exchange_4.webp';
import mode_exchange_5 from './mode_exchange_5.webp';
import glyph_bingo from './glyph_bingo.webp';
import mode_bingo_1 from './mode_bingo_1.webp';
import mode_bingo_2 from './mode_bingo_2.webp';
import mode_bingo_3 from './mode_bingo_3.webp';
import mode_bingo_4 from './mode_bingo_4.webp';
import mode_bingo_5 from './mode_bingo_5.webp';
import glyph_collect from './glyph_collect.webp';
import mode_collect_1 from './mode_collect_1.webp';
import mode_collect_2 from './mode_collect_2.webp';
import mode_collect_3 from './mode_collect_3.webp';
import mode_collect_4 from './mode_collect_4.webp';
import mode_collect_5 from './mode_collect_5.webp';
import glyph_evolve from './glyph_evolve.webp';
import mode_evolve_1 from './mode_evolve_1.webp';
import mode_evolve_2 from './mode_evolve_2.webp';
import mode_evolve_3 from './mode_evolve_3.webp';
import mode_evolve_4 from './mode_evolve_4.webp';
import mode_evolve_5 from './mode_evolve_5.webp';
import place1 from './place_1.webp';
import place2 from './place_2.webp';
import place3 from './place_3.webp';
import bracket1 from './bracket_1.webp';
import bracket2 from './bracket_2.webp';
import bracket3 from './bracket_3.webp';
import bracket4 from './bracket_4.webp';
import bracket5 from './bracket_5.webp';
import bracket6 from './bracket_6.webp';
import bracket7 from './bracket_7.webp';
import bracket8 from './bracket_8.webp';
import bracket9 from './bracket_9.webp';
import bracket10 from './bracket_10.webp';
import trophyArt from './trophy.webp';
import laurelArt from './laurel.webp';
import bannerArt from './banner.webp';

export const RANK_ART: string[] = [rank1, rank2, rank3, rank4, rank5, rank6];
export const MODE_GLYPH_ART: Record<string, string> = { battle: glyph_battle, court: glyph_court, friend: glyph_friend, arena: glyph_arena, exchange: glyph_exchange, bingo: glyph_bingo, collect: glyph_collect, evolve: glyph_evolve };
export const MODE_BADGE_ART: Record<string, string[]> = {
  battle: [mode_battle_1, mode_battle_2, mode_battle_3, mode_battle_4, mode_battle_5],
  court: [mode_court_1, mode_court_2, mode_court_3, mode_court_4, mode_court_5],
  friend: [mode_friend_1, mode_friend_2, mode_friend_3, mode_friend_4, mode_friend_5],
  arena: [mode_arena_1, mode_arena_2, mode_arena_3, mode_arena_4, mode_arena_5],
  exchange: [mode_exchange_1, mode_exchange_2, mode_exchange_3, mode_exchange_4, mode_exchange_5],
  bingo: [mode_bingo_1, mode_bingo_2, mode_bingo_3, mode_bingo_4, mode_bingo_5],
  collect: [mode_collect_1, mode_collect_2, mode_collect_3, mode_collect_4, mode_collect_5],
  evolve: [mode_evolve_1, mode_evolve_2, mode_evolve_3, mode_evolve_4, mode_evolve_5],
};
export const PLACE_ART: string[] = [place1, place2, place3]; // 1st, 2nd, 3rd place medals
export const BRACKET_ART: string[] = [bracket1, bracket2, bracket3, bracket4, bracket5, bracket6, bracket7, bracket8, bracket9, bracket10]; // crest per power bracket 1-10
export const EXTRA_ART = { trophy: trophyArt, laurel: laurelArt, banner: bannerArt }; // weekly-board trophy, laurel wreath, blank ribbon banner
