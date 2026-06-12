// Strategy Kingdom — authored content (economy, research tree, event decks, scenarios).
// Source of truth: specs/gdd/strategy-kingdom-gdd.md, with binding Director amendments applied.
// NO React imports. Pure data + small pure helpers. Numbers are frozen at authoring time.

export type BuildingId =
  | "farm"
  | "lumberCamp"
  | "quarry"
  | "market"
  | "house"
  | "library";

export type ResourceId = "food" | "wood" | "stone" | "gold";

export type ResearchId =
  | "irrigation"
  | "wheelbarrow"
  | "coinage"
  | "scriptorium"
  | "surveying"
  | "masonry"
  | "cropRotation"
  | "census"
  | "guild"
  | "greatHall";

// ── Buildings ────────────────────────────────────────────────────────────────
export interface BuildingDef {
  id: BuildingId;
  label: string;
  /** Base yield per worker (the resource produced). Houses produce nothing. */
  baseYield: number;
  /** Which resource this building produces (RP is tracked separately as research). */
  produces: ResourceId | "research" | null;
  /** Worker slots. Houses = 0. */
  slots: number;
  /** Build cost. */
  cost: { wood: number; stone: number };
  /** Max instances on the 12-plot map (plot-limited if undefined). */
  max?: number;
}

// DIRECTOR AMENDMENT (post-review): the Quarry is the only stone income, so its
// build cost is WOOD-ONLY — the GDD's 3 wood / 2 stone becomes 5 wood / 0 stone
// (same total magnitude; the stone component converts to wood). This kills the
// stone softlock: spending the starting 4 stone elsewhere (e.g. a Library-first
// opening) no longer strands the player waiting on rescue event cards. Strictly
// loosens the economy; verified by the completability tests.
export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  farm: { id: "farm", label: "Farm", baseYield: 3, produces: "food", slots: 3, cost: { wood: 4, stone: 0 }, max: 4 },
  lumberCamp: { id: "lumberCamp", label: "Lumber Camp", baseYield: 2, produces: "wood", slots: 3, cost: { wood: 3, stone: 0 } },
  quarry: { id: "quarry", label: "Quarry", baseYield: 2, produces: "stone", slots: 2, cost: { wood: 5, stone: 0 } },
  market: { id: "market", label: "Market", baseYield: 2, produces: "gold", slots: 2, cost: { wood: 5, stone: 3 }, max: 2 },
  library: { id: "library", label: "Library", baseYield: 1, produces: "research", slots: 2, cost: { wood: 5, stone: 4 }, max: 2 },
  house: { id: "house", label: "House", baseYield: 0, produces: null, slots: 0, cost: { wood: 4, stone: 2 }, max: 5 },
};

export const BUILDING_ORDER: BuildingId[] = [
  "farm",
  "lumberCamp",
  "quarry",
  "market",
  "library",
  "house",
];

export const PLOT_COUNT = 12;
/** Surveying opens a 13th plot. */
export const SURVEYING_PLOT_BONUS = 1;
export const BASE_POPCAP = 8;
export const POPCAP_PER_HOUSE = 4;
/** Census adds +1 popCap per house. */
export const CENSUS_POPCAP_PER_HOUSE = 1;

// ── Research tree ─────────────────────────────────────────────────────────────
// DIRECTOR AMENDMENT (Q1): shave 1 RP off ONE early yield-spine tier-1 node to
// cushion the Prosperity research leg. Chosen node: SCRIPTORIUM 6 -> 5.
// Rationale: Scriptorium is the RP-multiplier node itself (Library 1->2 RP/worker).
// Lowering its cost brings the research engine online one turn sooner, which
// compounds margin on Prosperity's tightest goal (the 6th node). Strictly loosens
// balance; the GDD's verified intended strategy remains valid (it researches
// Scriptorium ~T8 either way, now cheaper). All other costs unchanged.
const SCRIPTORIUM_COST = 5; // GDD authored 6; amendment -1.

export interface ResearchDef {
  id: ResearchId;
  label: string;
  cost: number;
  prereq: ResearchId | null;
  /** Plain-language exact effect, shown in the UI. */
  effect: string;
  tier: 1 | 2 | 3;
}

export const RESEARCH: Record<ResearchId, ResearchDef> = {
  irrigation: { id: "irrigation", label: "Irrigation", cost: 4, prereq: null, tier: 1, effect: "Every Farm makes 1 more food per worker." },
  wheelbarrow: { id: "wheelbarrow", label: "Wheelbarrow", cost: 5, prereq: null, tier: 1, effect: "Every Lumber Camp and Quarry makes 1 more per worker." },
  coinage: { id: "coinage", label: "Coinage", cost: 5, prereq: null, tier: 1, effect: "Every Market makes 1 more gold per worker." },
  scriptorium: { id: "scriptorium", label: "Scriptorium", cost: SCRIPTORIUM_COST, prereq: null, tier: 1, effect: "Every Library makes 1 more research per worker." },
  surveying: { id: "surveying", label: "Surveying", cost: 5, prereq: null, tier: 1, effect: "Opens one more build plot." },
  masonry: { id: "masonry", label: "Masonry", cost: 6, prereq: "wheelbarrow", tier: 2, effect: "Every Quarry makes 1 more stone per worker." },
  cropRotation: { id: "cropRotation", label: "Crop Rotation", cost: 8, prereq: "irrigation", tier: 2, effect: "Every Farm makes 1 more food per worker." },
  census: { id: "census", label: "Census", cost: 7, prereq: "surveying", tier: 2, effect: "Each House holds 1 more person." },
  guild: { id: "guild", label: "Guild", cost: 9, prereq: "coinage", tier: 3, effect: "Every Market makes 1 more gold per worker." },
  greatHall: { id: "greatHall", label: "Great Hall", cost: 10, prereq: "census", tier: 3, effect: "Adds 1 person now. Festivals bring 1 extra person." },
};

export const RESEARCH_ORDER: ResearchId[] = [
  "irrigation",
  "wheelbarrow",
  "coinage",
  "scriptorium",
  "surveying",
  "masonry",
  "cropRotation",
  "census",
  "guild",
  "greatHall",
];

export const ALL_RESEARCH_COUNT = RESEARCH_ORDER.length; // 10

// ── Events ───────────────────────────────────────────────────────────────────
// Each effect is the EXACT arithmetic applied by the reducer; option text prints
// the same numbers. Resources floor at 0, never negative. `people` grows pop
// (still capped by popCap at apply time). `festival: true` marks Festival-type
// cards (Great Hall grants +1 extra person on these).
export interface EventEffect {
  food?: number;
  wood?: number;
  stone?: number;
  gold?: number;
  research?: number;
  people?: number;
}
export interface EventOption {
  label: string; // printed exactly, includes the numbers
  effect: EventEffect;
}
export interface EventCard {
  id: string;
  title: string;
  setup: string;
  festival?: boolean;
  /** A = index 0 (the +people / "kind" option lives here on growth cards, per early-reader path). */
  options: [EventOption, EventOption];
}

// 4A. Tutorial Reign deck (10 cards; first 4 reached).
export const TUTORIAL_DECK: EventCard[] = [
  {
    id: "tut-1",
    title: "Travelers at the Gate",
    setup: "A family asks to settle in your kingdom. There is room if the larder can spare some food.",
    options: [
      { label: "Take them in: +2 people, -8 food", effect: { people: 2, food: -8 } },
      { label: "Send them on: +5 gold", effect: { gold: 5 } },
    ],
  },
  {
    id: "tut-2",
    title: "Good Harvest",
    setup: "The fields came in heavy this season. The barns are full and the people are glad.",
    options: [
      { label: "Store it: +10 food", effect: { food: 10 } },
      { label: "Sell some: +6 gold, +4 food", effect: { gold: 6, food: 4 } },
    ],
  },
  {
    id: "tut-3",
    title: "Wandering Builder",
    setup: "A carpenter offers a week of work for a small wage.",
    options: [
      { label: "Hire him: -5 gold, +6 wood", effect: { gold: -5, wood: 6 } },
      { label: "Thank him, no: no change", effect: {} },
    ],
  },
  {
    id: "tut-4",
    title: "Spring Festival",
    setup: "The people want a festival to welcome the new season.",
    festival: true,
    options: [
      { label: "Hold it: +2 people, -6 food", effect: { people: 2, food: -6 } },
      { label: "Keep it quiet: +4 gold", effect: { gold: 4 } },
    ],
  },
  {
    id: "tut-5",
    title: "Stone from the Hills",
    setup: "Miners found an easy seam this season.",
    options: [
      { label: "Quarry it: +6 stone, -3 food", effect: { stone: 6, food: -3 } },
      { label: "Leave it: +3 gold", effect: { gold: 3 } },
    ],
  },
  {
    id: "tut-6",
    title: "A Visiting Scholar",
    setup: "A scholar will teach for a season if you house her.",
    options: [
      { label: "Welcome her: +5 research, -4 food", effect: { research: 5, food: -4 } },
      { label: "Send her on: +4 gold", effect: { gold: 4 } },
    ],
  },
  {
    id: "tut-7",
    title: "Trade Caravan",
    setup: "Merchants pass through with goods to sell.",
    options: [
      { label: "Trade with them: -6 food, +10 gold", effect: { food: -6, gold: 10 } },
      { label: "Wave them past: no change", effect: {} },
    ],
  },
  {
    id: "tut-8",
    title: "Timber Order",
    setup: "A nearby town wants to buy your wood.",
    options: [
      { label: "Sell wood: -8 wood, +9 gold", effect: { wood: -8, gold: 9 } },
      { label: "Keep the wood: no change", effect: {} },
    ],
  },
  {
    id: "tut-9",
    title: "New Families",
    setup: "Word of your fair rule spreads. Families want to join.",
    options: [
      { label: "Welcome them: +2 people, -6 food", effect: { people: 2, food: -6 } },
      { label: "Not yet: +3 gold", effect: { gold: 3 } },
    ],
  },
  {
    id: "tut-10",
    title: "Bumper Year",
    setup: "Every field and forest gave more than expected.",
    options: [
      { label: "Take the bounty: +8 food, +6 wood", effect: { food: 8, wood: 6 } },
      { label: "Sell the surplus: +8 gold", effect: { gold: 8 } },
    ],
  },
];

// 4B. Growth Reign deck (11 cards; 6 reached).
export const GROWTH_DECK: EventCard[] = [
  {
    id: "gro-1",
    title: "Refugees from the North",
    setup: "A larger group seeks shelter. They would more than fill an empty house.",
    options: [
      { label: "Take them in: +3 people, -12 food", effect: { people: 3, food: -12 } },
      { label: "Offer supplies: -4 food, +6 gold", effect: { food: -4, gold: 6 } },
    ],
  },
  {
    id: "gro-2",
    title: "Harvest Festival",
    setup: "A feast would draw new families and lift spirits.",
    festival: true,
    options: [
      { label: "Hold the feast: +2 people, -6 food", effect: { people: 2, food: -6 } },
      { label: "Modest meal: +5 gold", effect: { gold: 5 } },
    ],
  },
  {
    id: "gro-3",
    title: "Master Mason",
    setup: "A mason offers to cut stone cheaply for one season.",
    options: [
      { label: "Hire him: -4 gold, +8 stone", effect: { gold: -4, stone: 8 } },
      { label: "Decline: +3 gold", effect: { gold: 3 } },
    ],
  },
  {
    id: "gro-4",
    title: "Newlyweds",
    setup: "Two families join through marriage and want to stay.",
    options: [
      { label: "Bless them: +2 people, -6 food", effect: { people: 2, food: -6 } },
      { label: "Gift of gold: -5 gold", effect: { gold: -5 } },
    ],
  },
  {
    id: "gro-5",
    title: "Rich Caravan",
    setup: "Wealthy traders will pay well for your goods.",
    options: [
      { label: "Trade big: -8 food, +12 gold", effect: { food: -8, gold: 12 } },
      { label: "Trade small: -3 food, +5 gold", effect: { food: -3, gold: 5 } },
    ],
  },
  {
    id: "gro-6",
    title: "A Good Year",
    setup: "The seasons were kind. Choose where the luck lands.",
    options: [
      { label: "More people: +2 people, -6 food", effect: { people: 2, food: -6 } },
      { label: "More gold: +8 gold", effect: { gold: 8 } },
    ],
  },
  {
    id: "gro-7",
    title: "Library Donation",
    setup: "A patron funds your scholars.",
    options: [
      { label: "Accept books: +5 research", effect: { research: 5 } },
      { label: "Accept coin: +6 gold", effect: { gold: 6 } },
    ],
  },
  {
    id: "gro-8",
    title: "Forest Fire",
    setup: "A small fire took part of the woods.",
    options: [
      { label: "Replant: -6 wood", effect: { wood: -6 } },
      { label: "Clear it: -6 wood, +4 gold", effect: { wood: -6, gold: 4 } },
    ],
  },
  {
    id: "gro-9",
    title: "Wandering Families",
    setup: "More families have heard of your kingdom.",
    options: [
      { label: "Welcome them: +2 people, -6 food", effect: { people: 2, food: -6 } },
      { label: "Send greetings: +4 gold", effect: { gold: 4 } },
    ],
  },
  {
    id: "gro-10",
    title: "Stone Windfall",
    setup: "A rockslide left easy stone in the valley.",
    options: [
      { label: "Gather it: +8 stone, -4 food", effect: { stone: 8, food: -4 } },
      { label: "Sell access: +6 gold", effect: { gold: 6 } },
    ],
  },
  {
    id: "gro-11",
    title: "Great Market Day",
    setup: "Buyers crowd the square.",
    options: [
      { label: "Sell hard: -6 food, +12 gold", effect: { food: -6, gold: 12 } },
      { label: "Steady trade: +6 gold", effect: { gold: 6 } },
    ],
  },
];

// 4C. Prosperity Reign deck (12 cards; 8 reached).
export const PROSPERITY_DECK: EventCard[] = [
  {
    id: "pro-1",
    title: "Settlers Arrive",
    setup: "A wagon train of new families reaches your gates.",
    options: [
      { label: "Take them in: +2 people, -8 food", effect: { people: 2, food: -8 } },
      { label: "Provision them: -4 food, +6 gold", effect: { food: -4, gold: 6 } },
    ],
  },
  {
    id: "pro-2",
    title: "Merchant Festival",
    setup: "Traders propose a market festival in your square.",
    festival: true,
    options: [
      { label: "Host it: +8 gold", effect: { gold: 8 } },
      { label: "Decline, plant instead: +6 food", effect: { food: 6 } },
    ],
  },
  {
    id: "pro-3",
    title: "A Wave of Refugees",
    setup: "A hard winter to the east sends many seeking shelter.",
    options: [
      { label: "Shelter them: +3 people, -12 food", effect: { people: 3, food: -12 } },
      { label: "Send aid: -6 food, +5 gold", effect: { food: -6, gold: 5 } },
    ],
  },
  {
    id: "pro-4",
    title: "Visiting Scholar",
    setup: "A renowned scholar offers a season of teaching.",
    options: [
      { label: "Welcome her: +5 research, -4 food", effect: { research: 5, food: -4 } },
      { label: "Pay her stipend: -4 gold, +3 research", effect: { gold: -4, research: 3 } },
    ],
  },
  {
    id: "pro-5",
    title: "Royal Wedding",
    setup: "A marriage of two houses brings new families.",
    options: [
      { label: "Celebrate: +2 people, -6 food", effect: { people: 2, food: -6 } },
      { label: "Quiet vows: +5 gold", effect: { gold: 5 } },
    ],
  },
  {
    id: "pro-6",
    title: "The Rich Caravan",
    setup: "The wealthiest traders of the season arrive.",
    options: [
      { label: "Trade big: -8 food, +12 gold", effect: { food: -8, gold: 12 } },
      { label: "Trade safe: -4 food, +7 gold", effect: { food: -4, gold: 7 } },
    ],
  },
  {
    id: "pro-7",
    title: "Inventor's Workshop",
    setup: "An inventor will share plans for coin.",
    options: [
      { label: "Fund it: -6 gold, +6 research", effect: { gold: -6, research: 6 } },
      { label: "Buy one plan: -2 gold, +3 research", effect: { gold: -2, research: 3 } },
    ],
  },
  {
    id: "pro-8",
    title: "Bountiful Season",
    setup: "A good year. Decide where the surplus goes.",
    options: [
      { label: "Grow the people: +2 people, -6 food", effect: { people: 2, food: -6 } },
      { label: "Fill the treasury: +8 gold", effect: { gold: 8 } },
    ],
  },
  {
    id: "pro-9",
    title: "Stonecutters' Guild",
    setup: "Masons offer cut stone in bulk.",
    options: [
      { label: "Buy stone: -6 gold, +10 stone", effect: { gold: -6, stone: 10 } },
      { label: "Decline: +4 gold", effect: { gold: 4 } },
    ],
  },
  {
    id: "pro-10",
    title: "Grand Bazaar",
    setup: "Buyers from three kingdoms fill the square.",
    options: [
      { label: "Sell hard: -6 food, +14 gold", effect: { food: -6, gold: 14 } },
      { label: "Steady stalls: +8 gold", effect: { gold: 8 } },
    ],
  },
  {
    id: "pro-11",
    title: "Founders' Festival",
    setup: "A festival to honor your reign draws new families.",
    festival: true,
    options: [
      { label: "Hold it: +2 people, -6 food", effect: { people: 2, food: -6 } },
      { label: "Modest rites: +6 gold", effect: { gold: 6 } },
    ],
  },
  {
    id: "pro-12",
    title: "A Prosperous Year",
    setup: "The kingdom thrives. One last choice.",
    options: [
      { label: "Welcome more people: +2 people, -6 food", effect: { people: 2, food: -6 } },
      { label: "Crown the treasury: +10 gold", effect: { gold: 10 } },
    ],
  },
];

// ── Scenarios ─────────────────────────────────────────────────────────────────
export type ScenarioId = "tutorial" | "growth" | "prosperity";

export interface ScenarioGoals {
  population?: number;
  gold?: number;
  research?: number; // count of nodes
}

export interface ScenarioDef {
  id: ScenarioId;
  label: string;
  turnLimit: number;
  goals: ScenarioGoals;
  deck: EventCard[];
  /** Throne Room one-line hint. */
  hint: string;
  /** Tutorial only — 12 dismissible Counsel tips, indexed by turn (1-based). */
  counsel?: string[];
  /** Rank thresholds for this scenario's reachable score ceiling. */
  ranks: { reeve: number; magistrate: number; monarch: number };
}

// Gold goal stays 80 (Director amendment, overriding GDD open Q2).
export const SCENARIOS: Record<ScenarioId, ScenarioDef> = {
  tutorial: {
    id: "tutorial",
    label: "Tutorial Reign",
    turnLimit: 12,
    goals: { population: 14 },
    deck: TUTORIAL_DECK,
    hint: "Grow your kingdom to 14 people.",
    ranks: { reeve: 28, magistrate: 36, monarch: 44 },
    counsel: [
      "Welcome. Tap your Farm, then add workers. Each worker makes 3 food. Three workers make 9 food, and your 6 people eat 6. That leaves a surplus.",
      "A surplus grew your kingdom by one person. To hold more people, you need houses. Tap an empty plot to build one. It costs 4 wood and 2 stone.",
      "An advisor brings a choice. Read both options. The numbers show exactly what happens. Pick one, then you can end the turn.",
      "Your house is ready. Your cap went up by 4. More room means your kingdom can keep growing each turn it has a surplus.",
      "Watch the food line. As long as workers make more food than your people eat, you grow. If food runs low, add a farm worker.",
      "Wood comes from the Lumber Camp, stone from a Quarry. You need both to build. Keep one or two workers cutting wood.",
      "You can build a second Farm for more food, or another House for more room. Both help you grow. There is no wrong order.",
      "Idle workers do nothing. The panel shows how many hands are free. Put them to work where you need the most.",
      "Another choice card. Taking in people grows your kingdom but costs food. You usually have plenty. Choose what you like.",
      "You are close to your goal of 14 people. Keep food positive and your kingdom will reach it.",
      "When a reign ends, your story is written from everything you did, and a rank is stamped. Steward, Reeve, Magistrate, or Monarch.",
      "Last turn. End it when you are ready, and watch your kingdom's story.",
    ],
  },
  growth: {
    id: "growth",
    label: "Growth Reign",
    turnLimit: 20,
    goals: { population: 25 },
    deck: GROWTH_DECK,
    hint: "Grow your kingdom to 25 people.",
    ranks: { reeve: 45, magistrate: 58, monarch: 70 },
  },
  prosperity: {
    id: "prosperity",
    label: "Prosperity Reign",
    turnLimit: 24,
    goals: { population: 28, gold: 80, research: 6 },
    deck: PROSPERITY_DECK,
    hint: "Reach 28 people, 80 gold, and 6 discoveries.",
    ranks: { reeve: 70, magistrate: 90, monarch: 110 },
  },
};

export const SCENARIO_ORDER: ScenarioId[] = ["tutorial", "growth", "prosperity"];

// ── Cosmetics & badges ────────────────────────────────────────────────────────
export type CosmeticId =
  | "plain"
  | "harvest"
  | "mason"
  | "scholar"
  | "sovereign"
  | "founders"
  | "tutorialStarter";

export interface CosmeticDef {
  id: CosmeticId;
  name: string;
  /** CSS variable theming for the banner (field color, charge color, trim). */
  field: string;
  charge: string;
  trim: string;
  /** Simple charge motif key the banner SVG switches on. */
  motif: "bar" | "wheat" | "hammer" | "book" | "crown" | "houses" | "seal";
  shimmer?: boolean;
  unlock: string; // human-readable unlock rule (for Throne Room)
}

export const COSMETICS: Record<CosmeticId, CosmeticDef> = {
  plain: { id: "plain", name: "Plain Standard", field: "#c9a86a", charge: "#171a21", trim: "#9a7b45", motif: "bar", unlock: "Available from the start." },
  // Director amendment: starter banner granted on Tutorial completion (banner design language).
  tutorialStarter: { id: "tutorialStarter", name: "Steward's Pennant", field: "#8ab87a", charge: "#20242e", trim: "#c9a86a", motif: "seal", unlock: "Finish the Tutorial Reign." },
  harvest: { id: "harvest", name: "Harvest Crest", field: "#8ab87a", charge: "#d9b945", trim: "#d9b945", motif: "wheat", unlock: "Complete the Growth Reign." },
  mason: { id: "mason", name: "Mason's Mark", field: "#9aa3ad", charge: "#20242e", trim: "#6f7780", motif: "hammer", unlock: "Discover Masonry." },
  scholar: { id: "scholar", name: "Scholar's Seal", field: "#e9dfc8", charge: "#2f4a7a", trim: "#2f4a7a", motif: "book", unlock: "Earn the Master Scholar badge." },
  sovereign: { id: "sovereign", name: "Sovereign's Gold", field: "#d9b945", charge: "#3a2f12", trim: "#3a2f12", motif: "crown", shimmer: true, unlock: "Earn Monarch in any reign." },
  founders: { id: "founders", name: "Founders' Banner", field: "#8ab87a", charge: "#a9805b", trim: "#a9805b", motif: "houses", unlock: "Earn the Founder badge." },
};

export const COSMETIC_ORDER: CosmeticId[] = [
  "plain",
  "tutorialStarter",
  "harvest",
  "mason",
  "scholar",
  "sovereign",
  "founders",
];

export type BadgeId = "fullLarder" | "firstLight" | "masterScholar" | "founder" | "treasurer" | "crowned";

export interface BadgeDef {
  id: BadgeId;
  name: string;
  desc: string;
}

export const BADGES: Record<BadgeId, BadgeDef> = {
  fullLarder: { id: "fullLarder", name: "Full Larder", desc: "End a reign with a surplus on every turn." },
  firstLight: { id: "firstLight", name: "First Light", desc: "Complete the Tutorial Reign." },
  // Director amendment (Q4): all 10 nodes ACROSS the campaign, not one reign.
  masterScholar: { id: "masterScholar", name: "Master Scholar", desc: "Discover all 10 things across your reigns." },
  founder: { id: "founder", name: "Founder", desc: "Build all 5 Houses in a single reign." },
  treasurer: { id: "treasurer", name: "Treasurer", desc: "End a reign holding 100 or more gold." },
  crowned: { id: "crowned", name: "Crowned", desc: "Earn the Monarch rank in any reign." },
};

export const BADGE_ORDER: BadgeId[] = [
  "firstLight",
  "fullLarder",
  "founder",
  "treasurer",
  "masterScholar",
  "crowned",
];

// ── Copy deck (system strings) ────────────────────────────────────────────────
export const COPY = {
  appTitle: "Strategy Kingdom",
  profilePrompt: "Who is ruling today?",
  throneTitle: "The Throne Room",
  throneLocked: "Finish the reign before this one to unlock.",
  barFood: "Food",
  barWood: "Wood",
  barStone: "Stone",
  barGold: "Gold",
  barResearch: "Research",
  barPopulation: "People",
  workerAdd: "Add worker",
  workerRemove: "Remove worker",
  workerFull: "All slots full",
  buildTitle: "Build here",
  buildReady: "Ready next season",
  buildCapped: "The kingdom has all of these it can hold.",
  researchTitle: "Discoveries",
  eventResolve: "Choose, then end the turn.",
  endturnLabel: "End Turn",
  endturnBlocked: "Answer the advisor first.",
  recapAgain: "Reign Again",
  recapThrone: "Throne Room",
  saveReset: "Reset this kingdom",
  muteOn: "Sound on",
  muteOff: "Sound off",
  speakAria: "Read aloud",
  speakStop: "Stop",
  deficitBanner: "The kingdom waits. More food first.",
  deficitEndTurn: "Food ran short, so the kingdom held steady this season. Add a worker to a Farm.",
  larderBare: "The larder was already bare, so it stayed at zero. The rest still happened.",
} as const;

export const RANK_NAMES = {
  steward: "Steward",
  reeve: "Reeve",
  magistrate: "Magistrate",
  monarch: "Monarch",
} as const;

export const SEASONS = ["spring", "summer", "fall", "winter"] as const;
export type Season = (typeof SEASONS)[number];
/** turn is 1-based; turn 1 = spring, 2 = summer, 3 = fall, 4 = winter, 5 = spring... */
export function seasonForTurn(turn: number): Season {
  return SEASONS[(turn - 1) % 4];
}
