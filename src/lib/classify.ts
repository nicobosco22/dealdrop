// Sorts a product into one of DealDrop's categories by reading its title.
// Returns null when the product does not belong in DealDrop at all
// (a phone case, a LEGO knockoff, a random toy). Null means "skip it".
//
// How it works: the rules below are checked from top to bottom and the first
// one that matches wins. The ORDER matters. For example "laptop" is checked
// before "keyboard", so "gaming laptop with RGB keyboard" lands in computers.

import type { Category } from "@/sources/types";

export type Placement = { category: Category; subcategory: string | null };

type Rule = {
  category: Category;
  subcategory: string | null;
  /** The title must match this. */
  match: RegExp;
  /** ...and must NOT match this. */
  unless?: RegExp;
  /**
   * What to do when `match` fits but `unless` also fits.
   * Normally the next rules get a try. With "skip", the product is dropped right away
   * (a case for a DJ controller should not fall through and be filed as a game controller).
   */
  onUnless?: "skip";
};

// Phrases that mention a product without being that product.
// "Microwave-safe bowls" are bowls, not a microwave.
const MISLEADING_PHRASES =
  /\b(microwave|dishwasher|oven|freezer|refrigerator|fridge|dryer|washer)[- ]?(safe|friendly|proof)\b|\bmachine[- ]washable\b/g;

// "for laptop", "compatible with PS5": the item is an add-on for the thing, not the thing.
const FOR_A_COMPUTER = /\b(for|with|fits?|compatible with)\b[^.;]{0,40}?\b(laptops?|notebooks?|macbooks?|desktops?|pcs?|tablets?|ipads?|chromebooks?)\b/;

// Add-ons we do not track (cases, mounts, cables and so on).
const ACCESSORY =
  /\b(cases?|covers?|sleeves?|skins?|screen protectors?|mounts?|brackets?|stands?|risers?|arms?|docks?|docking|hubs?|cables?|adapters?|chargers?|straps?|bands?|bags?|backpacks?|cooling pads?|stickers?|decals?|remotes?|replacement|wall plates?)\b/;

const APPLIANCE_ADDON = /\b(liners?|filters?|replacement|bags?|covers?|parts?|descaler|pods?|k-cups?|cleaner|detergent|hoses?|racks?)\b/;

// Add-ons that would otherwise sneak into a category through another word
// ("Monitor Arm Desk Mount" has the word desk in it). Checked before any rule.
const ALWAYS_SKIP = new RegExp(
  [
    String.raw`\bmonitor (arm|stand|mount|riser)s?\b`,
    String.raw`\b(desk|wall|ceiling) (mount|clamp)s?\b`,
    String.raw`\b(charging|charger) (station|dock|stand|cradle)s?\b`,
    // Spare parts: a replacement fan for a graphics card is not a graphics card.
    String.raw`\b(graphics card|video card|gpu|[gr]tx ?\d{3,4}|rx ?\d{4})\b.*\b(cooling|cooler|fans?|radiator|brackets?|backplates?|risers?|heatsinks?)\b`,
    String.raw`\b(replacement|cooling) fans?\b`,
    String.raw`\bpower supply for\b`,
    // Gear made for vehicles.
    String.raw`\b(utv|atv|golf cart|marine|boat|motorcycle|car stereo|car audio)\b`,
    String.raw`\b(phone|controller|headset|tablet|cup) (and \w+ )?(holders?|hangers?)\b`,
  ].join("|"),
);

const RULES: Rule[] = [
  // --- Things that look like one category but are another ---
  {
    category: "house",
    subcategory: null,
    match: /\bmattress (topper|protector|pad|cover|encasement)s?\b/,
  },
  {
    category: "furniture",
    subcategory: null,
    match: /\b(tv|television) (stand|console|cabinet)s?\b|\bentertainment center\b|\bmedia console\b/,
  },

  // --- Technology ---
  // DJ gear is checked first: a "DJ controller" must not be mistaken for a game controller,
  // and "studio monitors" for a DJ booth are speakers, not screens.
  {
    category: "technology",
    subcategory: "dj-gear",
    match:
      /\bdj (controllers?|mixers?|decks?|turntables?|headphones?|equipment|gear|booths?|sets?|systems?|speakers?|monitors?|players?|consoles?|packages?|bundles?|starter)\b|\b(ddj|cdj|djm|xdj|plx|dvs)[- ]?[a-z]*\d[a-z0-9-]*\b|\b(pioneer dj|alphatheta|numark|denon dj|rane|serato|rekordbox|traktor|djcontrol|mixtrack|party ?mix|hercules dj)\b|\b(scratch|battle|club) mixers?\b|\b(direct[- ]drive|dj) turntables?\b|\b\d-(channel|deck) (dj )?(controllers?|mixers?)\b/,
    unless: /\b(cases?|bags?|covers?|stands?|skins?|decksavers?|cables?|stickers?|faceplates?|lessons?|courses?|t-?shirts?|posters?)\b/,
    onUnless: "skip",
  },
  {
    category: "technology",
    subcategory: "monitors",
    match: /\bmonitors?\b|\b(laptop )?screen extenders?\b|\bportable (displays?|screens?)\b/,
    unless:
      /\b(baby|blood pressure|heart rate|glucose|air quality|energy|oxygen|sleep|pet|video baby|studio) monitors?\b|\bmonitor (arm|stand|mount|riser|light ?bar|lamp|cable|hood|privacy)/,
  },
  {
    category: "technology",
    subcategory: "computers",
    match:
      /\b(laptops?|notebook pcs?|chromebooks?|macbooks?|ultrabooks?|desktop (pc|computer|tower)s?|gaming (pc|desktop)s?|mini pcs?|all[- ]in[- ]one (pc|computer|desktop)s?|imac|mac mini|mac studio|tablets?|ipads?|surface (pro|laptop|go)|galaxy tab)\b/,
    unless: new RegExp(`${FOR_A_COMPUTER.source}|${ACCESSORY.source}|\\bgraphics tablet\\b|\\bhandheld\\b|\\b(towel|dishwasher|cleaning|descaling|denture|toilet|pool|chlorine|vitamin|chewable|detergent|fizzing)\\b|\\btablets? \\(\\d+ count\\)`),
  },
  {
    category: "technology",
    subcategory: "gaming-gear",
    match:
      /\bgaming chairs?\b|\b(controllers?|gamepads?|joy-?cons?|dualsense|fight sticks?|racing wheels?)\b|\bheadsets?\b|\bkeyboards?\b|\bkeypads?\b|\bmouse ?pads?\b|\bdesk ?mats?\b|\b(mouse|mice)\b|\bwebcams?\b|\b(microphones?|mics?)\b|\bcapture cards?\b|\bstream deck\b|\bkey lights?\b|\bring lights?\b|\bboom arms?\b/,
    unless: /\b(playstation ?[45]?|ps[45]|xbox( series [xs])?|nintendo switch( 2)?|switch 2)( \w+){0,3} (consoles?|bundles?)\b|\bkeyboard (tray|drawer|cover|stickers?)\b|\bmouse traps?\b|\bcontroller (charger|charging|skin|grip|case|stand)s?\b|\bpiano\b|\bcharge controllers?\b/,
  },
  {
    category: "technology",
    subcategory: "consoles",
    match:
      /\b(playstation ?[45]?|ps[45]( pro| slim)?|xbox( series [xs]| one)?|nintendo switch( 2| lite| oled)?|switch 2|steam deck|rog ally|legion go|msi claw|meta quest|handheld (gaming )?(pc|console)s?|game consoles?)\b/,
    unless: ACCESSORY,
  },
  {
    category: "technology",
    subcategory: "pc-parts",
    match:
      /\b(graphics cards?|video cards?|gpus?|(rtx|gtx) ?\d{3,4}|rx ?\d{4}|arc [ab]\d{3}|cpus?|processors?|ryzen [3579]|core (i[3579]|ultra)|threadripper|ddr[345]|(desktop|laptop) memory|sodimm|ssds?|nvme|m\.2|hard drives?|hdds?|motherboards?|power suppl(y|ies)|psus?|(pc|computer|atx|matx|itx|mid[- ]tower|full[- ]tower) cases?|cpu coolers?|aio (liquid )?coolers?|liquid coolers?|case fans?|thermal paste)\b|\b\d{1,3} ?gb (ram|memory) kit\b/,
    unless: /\b(enclosures?|food processors?|word processors?)\b/,
  },
  {
    category: "technology",
    subcategory: "tv-video",
    match:
      /\b(tvs?|televisions?|soundbars?|sound bars?|roku|fire tv|chromecast|apple tv|google tv streamer|streaming (stick|device|player|box)s?|projectors?|blu-?ray players?)\b/,
    unless: ACCESSORY,
  },
  {
    category: "technology",
    subcategory: "audio",
    match:
      /\b(headphones?|earbuds?|earphones?|airpods|in-ear monitors?|(bluetooth|portable|bookshelf|smart|party|wireless|computer|pc) speakers?|speakers?|subwoofers?|turntables?|av receivers?|echo (dot|pop|show|studio)|homepod)\b/,
    unless: /\b(speaker (stand|mount|wire|cable)s?|ear ?tips?|ear ?pads?|headphone (stand|case|hanger)s?)\b/,
  },
  {
    category: "technology",
    subcategory: "phones-wearables",
    match:
      /\b(iphone ?\d*|smartphones?|cell ?phones?|galaxy [sza]\d+|galaxy z (fold|flip)|pixel \d+|oneplus \d+|moto g|smart ?watch(es)?|apple watch|galaxy watch|pixel watch|fitbit|garmin (forerunner|fenix|venu|vivoactive|instinct)|fitness trackers?|oura ring|smart rings?)\b/,
    unless: new RegExp(`${ACCESSORY.source}|\\b(batter(y|ies)|power ?banks?|apps?|wallets?|grips?|lens(es)?|tripods?|gimbals?)\\b`),
  },
  {
    category: "technology",
    subcategory: "smart-home",
    match:
      /\b((security|indoor|outdoor|wi-?fi|ip|floodlight|spotlight) cam(era)?s?|video doorbells?|doorbells?|smart plugs?|routers?|mesh (wi-?fi|system|router)s?|wi-?fi (\d[e]? )?(system|extender|mesh)s?|range extenders?|smart locks?|smart thermostats?|thermostats?|smart (home )?hubs?)\b/,
    unless: /\b(wood|cnc|trim|plunge|palm) routers?\b|\brouter (table|bits?)\b/,
  },
  {
    category: "technology",
    subcategory: "appliances",
    match:
      /\b(washing machines?|washers?|dryers?|washer[- ]dryer|refrigerators?|fridges?|freezers?|dishwashers?|microwaves?|air fryers?|coffee (makers?|machines?)|espresso (machines?|makers?)|keurig|nespresso|blenders?|stand mixers?|hand mixers?|food processors?|vacuums?|robot vacuums?|roomba|air purifiers?|humidifiers?|dehumidifiers?|toasters?|toaster ovens?|ovens?|ranges?|cooktops?|pressure cookers?|instant pot|slow cookers?|rice cookers?|electric kettles?|juicers?|carpet cleaners?|steam mops?|air conditioners?|space heaters?)\b/,
    unless: new RegExp(
      `${APPLIANCE_ADDON.source}|\\b(pressure|power|window|car|parts) washers?\\b|\\bwasher fluid\\b|\\b(hair|blow|nail|boot|salad) dryers?\\b|\\bdutch ovens?\\b|\\boven (mitts?|gloves?)\\b|\\bvacuum (sealers?|insulated|flasks?|bottles?|storage bags?)\\b|\\brange (hoods?|finders?|extenders?)\\b`,
    ),
  },

  // --- Furniture ---
  {
    category: "furniture",
    subcategory: null,
    match:
      /\b(desks?|(office|desk|task|ergonomic|executive|dining|accent|lounge|rocking|folding) chairs?|recliners?|couch(es)?|sofas?|sectionals?|loveseats?|futons?|ottomans?|bed frames?|platform beds?|bunk beds?|(twin|full|queen|king)[- ]size beds?|headboards?|mattress(es)?|dressers?|nightstands?|wardrobes?|armoires?|bookshel(f|ves)|bookcases?|shelving units?|(wall|floating|storage|garage) shel(f|ves)|(coffee|dining|end|side|console|kitchen|folding|bedside) tables?|bar stools?|benches|bench|file cabinets?|storage cabinets?)\b/,
    unless: /\bdesk (lamps?|fans?|organizers?|pads?|calendars?|clocks?)\b|\bcoffee table books?\b|\bbench (press|grinders?|vises?)\b|\b(car|dog|pet|cat) (seat|bed)s?\b/,
  },

  // --- House items ---
  {
    category: "house",
    subcategory: null,
    match:
      /\b(sheet sets?|bed sheets?|sheets|comforters?|duvets?|quilts?|pillows?|pillowcases?|blankets?|throws?|bedding|bedspreads?|towels?|bath mats?|shower curtains?|cookware|frying pans?|skillets?|sauce ?pans?|stock ?pots?|dutch ovens?|bakeware|baking sheets?|knife (sets?|blocks?)|cutting boards?|dinnerware|flatware|silverware|utensils?|mixing bowls?|bowls?|plates?|glassware|tumblers?|mugs?|food storage|storage containers?|storage bins?|organizers?|hangers?|baskets?|laundry hampers?|rugs?|curtains?|drapes?|mirrors?|picture frames?|vases?|wall art|candles?|lamps?|light bulbs?|led bulbs?|string lights?|ceiling lights?|light fixtures?|mops?|brooms?|dustpans?|sponges?|trash (bags?|cans?)|paper towels?|laundry detergent|dish soap|cleaning (supplies|cloths?|wipes|spray)|all-purpose cleaner)\b/,
    unless: /\b(car|dog|pet|cat|baby|yoga|camping|beach|golf|gym)\b/,
  },
];

// --- LEGO: the only toys allowed ---

// Words that mean "this works with LEGO" rather than "this IS LEGO".
const LEGO_KNOCKOFF =
  /\b(compatible|compatibility|fits|works) with (all )?(major brands|lego)|lego[- ]?(compatible|style|like|type)\b|\b(for|like|not|non|with|alternative to) lego\b|\bcompatible\b|\bmoc\b|\b(mould king|cobi|mega bloks?|mega construx|megabloks|sluban|lepin|xingbao|cada|wange|nanoblock|k'?nex|duplo[- ]compatible)\b/;

// LEGO-branded things that are not building sets.
const LEGO_NOT_A_SET =
  /\b(light(ing)? kits?|led (light|lighting)|display (case|stand|box)|acrylic|base ?plates? (compatible|for)|storage (bin|box|head|brick)|sorting|backpack|lunch ?box|keychain|key ?chain|book|magazine|costume|t-?shirt|hoodie|pajamas?|bedding|watch|pen|notebook|sticker|poster|mug|dvd|blu-?ray|movie)\b/;

// Video games are not tracked, only the consoles that play them.
// A game names its console as a label: "Zelda - Nintendo Switch", "Elden Ring (PS5)",
// "Mario Kart for Nintendo Switch 2". A console names itself first: "PlayStation 5 Slim Console".
const PLATFORM = "(the )?(playstation ?[45]?|ps[45]|xbox( series [xs]| one| 360)?|nintendo switch( 2)?|switch 2|wii u?|3ds|pc|steam|epic games)";
const VIDEO_GAME = new RegExp(
  `(\\bfor|\\bon|[-–—:(\\[/,])\\s*${PLATFORM}\\b|\\b(video games?|pc games?|game keys?|steam keys?|digital (code|download)s?|dlc|season pass|v-?bucks|game pass|ps plus|playstation plus|nintendo switch online)\\b`,
);

const VIDEO_GAME_WORDS =
  /\b(ps[45]|playstation|xbox|nintendo switch|switch 2|pc download|steam key|steam|digital (code|download)|video game|epic games)\b/;

export type ProductInfo = { title: string; brand?: string | null };

export function classifyProduct({ title, brand }: ProductInfo): Placement | null {
  const text = title.toLowerCase().replace(MISLEADING_PHRASES, " ");
  if (!text.trim()) return null;

  if (/\blego\b/.test(text)) {
    // A LEGO video game is a game, not a building set, and games are not tracked.
    if (VIDEO_GAME_WORDS.test(text)) return null;
    // If the store tells us the brand and it is not LEGO, it is not LEGO.
    if (brand && brand.trim().toLowerCase() !== "lego") return null;
    if (LEGO_KNOCKOFF.test(text) || LEGO_NOT_A_SET.test(text)) return null;
    return { category: "lego", subcategory: null };
  }
  // No other toys are allowed, including other brick brands.
  if (LEGO_KNOCKOFF.test(text) || /\b(building (blocks?|bricks?|toys?)|brick sets?|toys?|action figures?|dolls?|plush|board games?|puzzles?|nerf|hot wheels|barbie|funko)\b/.test(text)) {
    return null;
  }

  if (ALWAYS_SKIP.test(text)) return null;

  for (const rule of RULES) {
    if (!rule.match.test(text)) continue;
    if (rule.unless?.test(text)) {
      if (rule.onUnless === "skip") return null;
      continue;
    }
    {
      // Something filed under consoles that reads like a game title is a game: skip it.
      if (rule.subcategory === "consoles" && VIDEO_GAME.test(text)) return null;
      return { category: rule.category, subcategory: rule.subcategory };
    }
  }
  return null;
}
