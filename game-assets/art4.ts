// Art delivered 2026-10-20 (sheets N1-N5): nav icons, redone first-generation shop/found items and the stand-alone Park Assets.
// Items are keyed by NAME (merged last into ITEM_ICON_ASSETS so they replace the old art); parcels by id (i1-i6).
import it_high_fiber_muffin from './items2/high_fiber_muffin.webp';
import it_tennis_ball_walker from './items2/tennis_ball_walker.webp';
import it_straw_sunhat from './items2/straw_sunhat.webp';
import it_comfy_loafers from './items2/comfy_loafers.webp';
import it_hearing_aid_plus from './items2/hearing_aid_plus.webp';
import it_reading_glasses from './items2/reading_glasses.webp';
import it_bingo_lucky_charm from './items2/bingo_lucky_charm.webp';
import it_hard_candy from './items2/hard_candy.webp';
import it_vintage_radio from './items2/vintage_radio.webp';
import it_lost_dentures from './items2/lost_dentures.webp';
import it_old_map from './items2/old_map.webp';
import it_garden_charm from './items2/garden_charm.webp';
import it_antique_pocket_watch from './items2/antique_pocket_watch.webp';
import pc_garden_plot from './items2/garden_plot.webp';
import pc_park_bench_sponsor from './items2/park_bench_sponsor.webp';
import pc_bingo_hall_equity from './items2/bingo_hall_equity.webp';
import pc_shuttle_van_fleet from './items2/shuttle_van_fleet.webp';
import pc_the_golden_wing from './items2/the_golden_wing.webp';
import pc_park_directorship from './items2/park_directorship.webp';
import nav_map from './nav/nav_map.webp';
import nav_team from './nav/nav_team.webp';
import nav_park from './nav/nav_park.webp';
import nav_shop from './nav/nav_shop.webp';
import nav_tasks from './nav/nav_tasks.webp';
import nav_pass from './nav/nav_pass.webp';
import nav_bank from './nav/nav_bank.webp';
export const ITEM_ART4: Record<string, string> = {
  "High-Fiber Muffin": it_high_fiber_muffin,
  "Tennis Ball Walker": it_tennis_ball_walker,
  "Straw Sunhat": it_straw_sunhat,
  "Comfy Loafers": it_comfy_loafers,
  "Hearing Aid Plus": it_hearing_aid_plus,
  "Reading Glasses": it_reading_glasses,
  "Bingo Lucky Charm": it_bingo_lucky_charm,
  "Hard Candy": it_hard_candy,
  "Vintage Radio": it_vintage_radio,
  "Lost Dentures": it_lost_dentures,
  "Old Map": it_old_map,
  "Garden Charm": it_garden_charm,
  "Antique Pocket Watch": it_antique_pocket_watch,
};
export const PARCEL_ART4: Record<string, string> = {
  i1: pc_garden_plot,
  i2: pc_park_bench_sponsor,
  i3: pc_bingo_hall_equity,
  i4: pc_shuttle_van_fleet,
  i5: pc_the_golden_wing,
  i6: pc_park_directorship,
};
export const NAV_ART: Record<string, string> = { map: nav_map, team: nav_team, park: nav_park, shop: nav_shop, tasks: nav_tasks, pass: nav_pass, bank: nav_bank };
