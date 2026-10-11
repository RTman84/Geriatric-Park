# Geriatric Park - Art prompt pack (2026-10-10)

How to use: pick a sheet, paste STYLE + the sheet's LAYOUT line + its item list into Leonardo, generate, and upload the PNG with the sheet id in the file name (for example `S01_medals.png`). Items are always numbered left to right, top to bottom, so I can cut them out in code and wire them in without asking which is which. If a result has touching items or merged items, regenerate it or tell me which cell is bad; I can drop any single item and the rest still works.

Generation-saving rules:
- 6 items per sheet (3 columns x 2 rows) worked best for dioramas; flat icons can take 8 (4 x 2).
- Do the sheets in PRIORITY order. P1 fixes the most visible emoji; P3 can wait for months.
- Each item needs clear white space around it. Overlap is the one thing that costs a re-generation.

## STYLE (paste at the start of every prompt)
Glossy cartoon mobile-game icon art, bold dark outlines, warm saturated colors, soft top-left lighting, cozy retirement-community nostalgia, each item centered in its own cell with generous pure-white space around it, items never touching each other or the image edge, pure white background, no text, no letters, no numbers, no watermark.

For dioramas (buildings, events) use instead: STYLE + "each item sits on its own round stone-and-grass base with a cobblestone rim, like a collectible figurine".

## P1 - Badges and ranks (replaces the most emoji)
Medals and glyphs are drawn separately and combined in code (40 badges from only 13 images).

**S01 - Tier medals (5, one row of 5 plus 1 empty is fine; use 3x2 and leave the 6th cell empty)**
LAYOUT: 3 columns x 2 rows, 5 round medals with ribbons, the 6th cell empty.
1 Bronze medal (copper, simple), 2 Silver medal (polished, a little shine), 3 Gold medal (rich gold, sparkle), 4 Platinum medal (icy blue-white metal, gem in center), 5 Legend medal (rainbow-gold, laurel wreath, glowing, most ornate). Each has an EMPTY round center so a glyph can be placed on it.

**S02 - Mode glyphs (8, flat single-color-looking emblems on a plain disc, 4 x 2)**
LAYOUT: 4 columns x 2 rows, each a bold simple emblem inside a plain round dark-blue disc.
1 Park Brawler (a fist with a flower), 2 Court Regular (shuffleboard puck and cue), 3 Friendly Rival (two crossed canes with a handshake), 4 Arena Defender (shield with a clubhouse), 5 Good Neighbor (two houses with a heart), 6 Bingo Buff (bingo cage with balls), 7 Park Collector (a basket of acorns and trinkets), 8 Evolution Expert (a sprout turning into a tree).

**S03 - Rank icons (6)**
LAYOUT: 3 x 2, each a round badge with an increasingly grand frame.
1 Newcomer (a green seedling), 2 Regular (a target with a dart), 3 Veteran (a ribbon rosette), 4 Champion (a golden trophy cup), 5 Legend (a crown with a cane crossed behind it), 6 Park Icon (a big gold star on a podium).

**S04 - Court place medals and extras (6)**
LAYOUT: 3 x 2.
1 First place medal (gold, number-free, laurel), 2 Second place medal (silver), 3 Third place medal (bronze), 4 Weekly Board trophy, 5 Laurel wreath, 6 Ribbon banner (blank).

**S05 and S06 - Bracket crests (10)**
LAYOUT: S05 = brackets 1-5 on a 3x2 grid (6th cell empty), S06 = brackets 6-10 the same. Each a shield crest that gets grander each time, all sharing one shape and a gold rim, each with one central object:
1 Porch Sitters (rocking chair), 2 Shuffle Starters (shuffleboard puck), 3 Bingo Regulars (bingo card), 4 Court Challengers (cue and trophy), 5 Clubhouse Contenders (clubhouse), 6 Sunroom Veterans (sunroom window and plants), 7 Gold Lounge (gold armchair), 8 Circuit Elite (winged golf cart), 9 Hall of Famers (statue on pedestal), 10 Living Legends (radiant crown over a cane).

## P1 - Gear (new set bonuses, see GEAR_SETS note at the end)

**S07 - PvP shop gear (8 items, 4 x 2, flat icons)**
1 Tournament Visor (white sports visor, Head), 2 Club Blazer (navy blazer with crest, Body), 3 Champion Cufflinks (gold cufflinks, Accessory), 4 Lucky Rabbit Foot (keychain rabbit foot, Charm), 5 Golden Reading Glasses (gold-rimmed glasses, Head), 6 Velvet Smoking Jacket (burgundy velvet jacket, Body), 7 Heirloom Pocket Watch (gold watch open on chain, Accessory), 8 Four-Leaf Clover Pin (emerald clover pin, Charm). Epic items have a purple tint accent, Legendary items a gold glow.

**S08 - Arena set "Clubhouse Champion" + Raid set "Boss Buster" (8 items, 4 x 2)** (names are tentative; tell me if you want others)
Top row, Arena set (matching teal-and-gold clubhouse look): 1 Champion's Sweatband (Head), 2 Clubhouse Cardigan with a crest (Body), 3 Banner Brooch (Accessory), 4 Faction Pin (Charm).
Bottom row, Raid set (matching orange-and-red hazard look): 5 Whistle-Blower Cap (Head), 6 Reflective Crossing Vest (Body), 7 Clipboard Shield (Accessory), 8 Lucky Bingo Dauber (Charm).

## P1 - Pass and events

**S09 - Elder Pass icons (9)**
LAYOUT: 3 x 3.
Free lane: 1 Regular (bronze rosette), 2 Veteran (silver star ribbon), 3 Champion (gold trophy).
Gold lane (all with a gold glow): 4 Gilded Guest (gold coin with a ticket), 5 Golden Regular (sparkling star pin), 6 Gilded Veteran (shooting star), 7 Golden Champion (gold medal with laurel), 8 Gold Legend (gold crown), 9 Golden Icon (radiant gold star).

**S10 - Gold Pass and shop banners (6)**
1 Gold Pass emblem (a golden ticket with wings), 2 Mementos 100 pack (a small pile of golden keepsake coins), 3 Mementos 550 pack (a medium treasure chest), 4 Mementos 1150 pack (an overflowing chest), 5 Attack Pass (a ticket with a sword), 6 Rally Pass (a ticket with a banner).

**S11 - Seasonal event emblems (7 plus 1 spare; diorama style)**
LAYOUT: 4 x 2, diorama bases. 1 Sweetheart (heart-shaped cake and roses), 2 Green Thumb (watering can and sprouts), 3 Picnic Champion (picnic basket and lemonade), 4 Favorite Grandparent (framed photo and cookie jar), 5 Haunted Hall Regular (friendly ghost with a bingo card and jack-o'-lantern), 6 Casserole Captain (steaming casserole with a captain's hat), 7 Winter Games Veteran (snowman on a shuffleboard court), 8 spare: a gift box.

**S12 - Main UI icons (8, flat, 4 x 2)**
1 Map (folded map with a pin), 2 Team (three elder silhouettes), 3 Park (a bench under a tree), 4 Shop (market awning), 5 Tasks (clipboard with a checkmark), 6 Pass (a ticket), 7 Bank (a piggy bank with a coin), 8 Mailbox (a classic mailbox with a letter).

## P2 - Keepsakes (Mementos Shop, 12)
**S13 - Keepsakes 1-6:** Anniversary Locket, Silver Wedding Bells, Pressed Prom Corsage, Grandkid Crayon Portrait, Postcard from the Coast, Wartime Love Letters (tied with ribbon).
**S14 - Keepsakes 7-12:** Family Reunion Photo (framed), First Car Hood Ornament, Golden Retirement Watch, Hand-Knit Baby Booties, County Fair Blue Ribbon, Porch Swing Plaque.

## P3 - Antiques (PvP Shop, 60; 10 sheets of 6)
Common (S15): Brass Bugle, Doily Set, Hard Candy Dish, Rotary Phone, Cuckoo Clock, Plaid Thermos.
S16: Seed Packet Tin, Crossword Book, Wool Cardigan, Mason Jar, Checkers Board, Porch Lantern.
S17: Recipe Box, Sewing Tin, Garden Gnome, Polka Record, Pocket Comb, Butter Dish.
S18: Church Fan, Reading Lamp, Pinochle Deck, Lemon Drops Tin, Rain Bonnet, Garden Trowel.
S19: Pill Organizer, Quilting Hoop, Almanac, Tea Cozy, Hand Bell, Clothespin Bag.
S20: Silver Teapot, Phonograph, Brass Telescope, Cast-Iron Skillet, Typewriter, Grandfather Clock.
S21: Quilted Heirloom, Pocket Compass, Wooden Cane, Victory Garden Sign, Banjo, Gramophone Horn.
S22: Porcelain Teacups, Spinning Wheel, Dance Hall Poster, War Bond Frame, Hand-Cranked Radio, Fishing Creel.
Rare and above (give these a faint gold glow): S23: Golden Bingo Cage, Crystal Chandelier, Velvet Armchair, Jeweled Hearing Horn, Mahogany Radio Cabinet, Opera Glasses.
S24: Ballroom Trophy, Stained-Glass Lamp, Ivory Chess Set, The First Casserole Dish, Founder's Shuffleboard Cue, Gilded TV Dinner Tray.

## Already done (no more generations needed)
Currency icons, Tinker's Workshop, Visitors' Lodge, Arena marker, 3 faction emblems, 10 raid bosses, Elder evolution art, structures, parcels, achievements and existing item icons.

## Leaving as emoji for now (low value)
Daily and weekly Task icons (25), small status chips, map pickup sparkles.

## Design note: Arena and Raid gear sets (needs your OK before I build it)
- Arena set "Clubhouse Champion" (4 pieces, drops from Arena wins): wearing 2 pieces gives +4% Squad Power in Arena fights, 4 pieces +10%.
- Raid set "Boss Buster" (4 pieces, drops from Raid hits): 2 pieces +5% raid damage, 4 pieces +12%.
- Bonuses apply only in their own mode, are capped on the server, and never touch PP or passive income.
