// Authored content from the GDD (specs/gdd/detective-academy-gdd.md §3).
// The generator FILLS these templates; it never freestyles prose.
// Template slots: {name} {place} {value} {valueShort} {item}.
// [T2+] / [T3] eligibility is encoded per entry so the generator can filter by tier.

import type { Accessory, Hair, Pet, Place, AttributeDimension } from "../game/types";

export type Tier = 1 | 2 | 3;

// --- §3.1 Name pool (24, diverse, kid-adjacent, TTS-clean) ---
export const NAME_POOL = [
  "Maya", "Priya", "Marcus", "Theo", "Zoe", "Amara", "Hugo", "Lena", "Diego", "Nina",
  "Omar", "Ivy", "Kai", "Sofia", "Felix", "Aisha", "Leo", "Ruby", "Mateo", "Esme",
  "Jonah", "Yara", "Rowan", "Cleo",
] as const;

// --- Fix 4 (director ruling): stable looks per character. Each NAME in the pool has a
// FIXED hair color, skin tone, and hair style, used in EVERY case the name appears.
// The generator draws each case's suspects' hair FROM these fixed traits (accessory,
// pet, and alibi still vary per case). Recurring characters with stable looks is the
// point — "Mateo again." `skin`/`hairStyle` drive the SVG bust only; only `hair`
// participates in puzzle logic (it is the suspect's `hair` attribute). Hair colors are
// distributed ~6 each across the 4 values so a 3–5 name sample usually has spread; where
// it doesn't, the elimination plan leans on accessory/pet (which stay free).
export type HairStyle = "short" | "wavy" | "bun" | "curly";

export interface NameTraits {
  hair: Hair;
  skin: string; // bust fill tone (cosmetic only)
  hairStyle: HairStyle; // bust silhouette variant (cosmetic only)
}

// Skin tone swatches (warm, muted; noir-register, not cartoon).
const SKIN = {
  porcelain: "#e8c9a8",
  warm: "#d9a878",
  tan: "#c08a52",
  olive: "#a9753f",
  deep: "#7a4f2c",
  espresso: "#5c3a1f",
} as const;

// 24 names → fixed (hair, skin, hairStyle). Distribution: black ×6, brown ×6, red ×6,
// blond ×6 (verified by a test). Styles + skins spread for visual variety.
export const NAME_TRAITS: Record<string, NameTraits> = {
  Maya: { hair: "black", skin: SKIN.tan, hairStyle: "wavy" },
  Priya: { hair: "black", skin: SKIN.deep, hairStyle: "bun" },
  Marcus: { hair: "black", skin: SKIN.espresso, hairStyle: "short" },
  Theo: { hair: "brown", skin: SKIN.warm, hairStyle: "short" },
  Zoe: { hair: "brown", skin: SKIN.porcelain, hairStyle: "wavy" },
  Amara: { hair: "black", skin: SKIN.espresso, hairStyle: "curly" },
  Hugo: { hair: "brown", skin: SKIN.tan, hairStyle: "short" },
  Lena: { hair: "blond", skin: SKIN.porcelain, hairStyle: "wavy" },
  Diego: { hair: "black", skin: SKIN.olive, hairStyle: "short" },
  Nina: { hair: "blond", skin: SKIN.warm, hairStyle: "bun" },
  Omar: { hair: "black", skin: SKIN.deep, hairStyle: "short" },
  Ivy: { hair: "red", skin: SKIN.porcelain, hairStyle: "curly" },
  Kai: { hair: "brown", skin: SKIN.tan, hairStyle: "short" },
  Sofia: { hair: "brown", skin: SKIN.olive, hairStyle: "wavy" },
  Felix: { hair: "red", skin: SKIN.warm, hairStyle: "short" },
  Aisha: { hair: "blond", skin: SKIN.espresso, hairStyle: "bun" },
  Leo: { hair: "red", skin: SKIN.warm, hairStyle: "curly" },
  Ruby: { hair: "red", skin: SKIN.porcelain, hairStyle: "wavy" },
  Mateo: { hair: "brown", skin: SKIN.olive, hairStyle: "short" },
  Esme: { hair: "blond", skin: SKIN.porcelain, hairStyle: "bun" },
  Jonah: { hair: "red", skin: SKIN.tan, hairStyle: "short" },
  Yara: { hair: "blond", skin: SKIN.tan, hairStyle: "curly" },
  Rowan: { hair: "red", skin: SKIN.warm, hairStyle: "wavy" },
  Cleo: { hair: "blond", skin: SKIN.deep, hairStyle: "bun" },
};

// All four hair colors appear among the names that share each other's slot; the
// generator reads NAME_TRAITS[name].hair when minting a suspect.
export function hairForName(name: string): Hair {
  return NAME_TRAITS[name]?.hair ?? "brown";
}

// --- §3.2 Case titles (12, warm/low-stakes only) — kept for reference/back-compat.
// The shipped generator no longer draws titles from this pool; it uses STORY_SEEDS
// (one unique, coherent seed per case). See the Fix-1 note on STORY_SEEDS below.
export const CASE_TITLES = [
  "The Case of the Vanishing Trophy",
  "The Case of the Missing Cookies",
  "The Case of the Mystery Noise",
  "The Case of the Swapped Backpacks",
  "The Case of the Borrowed Umbrella",
  "The Case of the Smudged Painting",
  "The Case of the Silent Bell",
  "The Case of the Wandering Hamster",
  "The Case of the Hidden Hall Pass",
  "The Case of the Untied Shoelaces",
  "The Case of the Last Slice of Pizza",
  "The Case of the Mixed-Up Lunchboxes",
] as const;

// --- §3.3 Intro: item pool (cosmetic flavor; no clue depends on it) — back-compat.
// The shipped generator now sources the intro item from each case's STORY_SEED so the
// briefing item matches the title. Kept so older callers/tests still resolve.
export const ITEM_POOL = [
  "the trophy", "the cookies", "a backpack", "the umbrella", "the hall pass",
  "the hamster", "the last slice", "a paintbrush", "the bell rope", "the lunchbox",
] as const;

// --- Fix 1: deterministic story-seed table (30 distinct seeds, indexed by caseId-1).
// Each seed fixes the {title, item, location} tuple ONCE so it is woven consistently
// through the title, the intro (the crime line's {place} == location, {item} == item),
// and any location-referencing clue (alibi/accessory/flavor {place} slots resolve to
// the case location). Titles are all distinct, warm/low-stakes, in the GDD register
// ("The Case of the ..."). The object (item) is the human label used verbatim in the
// intro item slot; `location` is one of the six Places. Content may change pre-ship;
// the seed-freeze rule begins when the kids start playing.
export interface StorySeed {
  title: string;
  item: string; // the intro item-slot label (e.g. "the trophy")
  location: Place; // the case location (one of the six Places)
}

export const STORY_SEEDS: readonly StorySeed[] = [
  // Tier 1 (cases 1–10) — short, concrete, early-reader friendly.
  { title: "The Case of the Vanishing Trophy", item: "the trophy", location: "gym" },
  { title: "The Case of the Missing Cookies", item: "the cookies", location: "cafeteria" },
  { title: "The Case of the Borrowed Library Book", item: "the library book", location: "library" },
  { title: "The Case of the Smudged Painting", item: "the painting", location: "art room" },
  { title: "The Case of the Silent Triangle", item: "the triangle", location: "music room" },
  { title: "The Case of the Empty Birdfeeder", item: "the birdseed", location: "park" },
  { title: "The Case of the Missing Whistle", item: "the whistle", location: "gym" },
  { title: "The Case of the Swapped Lunchbox", item: "the lunchbox", location: "cafeteria" },
  { title: "The Case of the Overdue Atlas", item: "the atlas", location: "library" },
  { title: "The Case of the Mixed-Up Paintbrushes", item: "the paintbrushes", location: "art room" },
  // Tier 2 (cases 11–20) — a touch longer, one red herring each.
  { title: "The Case of the Quiet Piano", item: "the sheet music", location: "music room" },
  { title: "The Case of the Lost Soccer Ball", item: "the soccer ball", location: "park" },
  { title: "The Case of the Borrowed Umbrella", item: "the umbrella", location: "library" },
  { title: "The Case of the Vanished Volleyball", item: "the volleyball", location: "gym" },
  { title: "The Case of the Misplaced Cupcakes", item: "the cupcakes", location: "cafeteria" },
  { title: "The Case of the Tipped Easel", item: "the easel", location: "art room" },
  { title: "The Case of the Humming Recorder", item: "the recorder", location: "music room" },
  { title: "The Case of the Wandering Kickball", item: "the kickball", location: "park" },
  { title: "The Case of the Misshelved Dictionary", item: "the dictionary", location: "library" },
  { title: "The Case of the Missing Jump Rope", item: "the jump rope", location: "gym" },
  // Tier 3 (cases 21–30) — fuller, ≥2 herrings, a twoStep inference clue.
  { title: "The Case of the Spilled Glitter", item: "the glitter jar", location: "art room" },
  { title: "The Case of the Off-Key Xylophone", item: "the xylophone mallet", location: "music room" },
  { title: "The Case of the Stolen Snack Tray", item: "the snack tray", location: "cafeteria" },
  { title: "The Case of the Bent Frisbee", item: "the frisbee", location: "park" },
  { title: "The Case of the Hidden Hall Pass", item: "the hall pass", location: "library" },
  { title: "The Case of the Deflated Basketball", item: "the basketball", location: "gym" },
  { title: "The Case of the Cracked Clay Pot", item: "the clay pot", location: "art room" },
  { title: "The Case of the Tangled Guitar Strings", item: "the guitar", location: "music room" },
  { title: "The Case of the Frosting Footprints", item: "the birthday cake", location: "cafeteria" },
  { title: "The Case of the Last Slice of Pizza", item: "the last slice", location: "cafeteria" },
];

// Crime lines (10) — parameterized by {place} and {item}.
export const CRIME_LINES = [
  "Something went missing from the {place} this morning, and nobody owned up.",
  "The {place} was quiet when {item} disappeared without a trace.",
  "Somebody was in the {place} when they shouldn't have been.",
  "{item} vanished from the {place} between recess and lunch.",
  "A small mix-up in the {place} turned into a real mystery.",
  "The {place} looked normal — except {item} was gone.",
  "There was a strange noise in the {place}, then {item} went missing.",
  "{item} was right here yesterday. This morning, the {place} was empty-handed.",
  "Three things are certain: it was the {place}, it was today, and someone knows more than they are saying.",
  "The {place} kept a secret overnight, and now it is your job to open it.",
] as const;

// Setup lines (10).
export const SETUP_LINES = [
  "A few people had reasons to be nearby. One of them did it.",
  "The witnesses left clues. Read them, clear the innocent, name who did it.",
  "You have the statements and the evidence. The rest is deduction.",
  "Everyone has a story. Only one of them holds up.",
  "Pin the evidence, clear the innocent, and make your accusation.",
  "The proof is in the folder. Find who it points to.",
  "Some clues matter. Some are noise. Tell them apart.",
  "Start with who could not have done it. What remains is your answer.",
  "Nobody is in trouble until the evidence says so.",
  "Take your time. Good detectives close the case, they don't rush it.",
] as const;

// --- §3.4 Attribute value-label map ---
// {value} reads naturally inside a sentence; {valueShort} is the bare label.
type LabelEntry = { value: string; valueShort: string };

export const HAIR_LABELS: Record<Hair, LabelEntry> = {
  black: { value: "black hair", valueShort: "black" },
  brown: { value: "brown hair", valueShort: "brown" },
  red: { value: "red hair", valueShort: "red" },
  blond: { value: "blond hair", valueShort: "blond" },
};

export const ACCESSORY_LABELS: Record<Accessory, LabelEntry> = {
  scarf: { value: "a scarf", valueShort: "scarf" },
  glasses: { value: "glasses", valueShort: "glasses" },
  cap: { value: "a cap", valueShort: "cap" },
  watch: { value: "a watch", valueShort: "watch" },
  backpack: { value: "a backpack", valueShort: "backpack" },
};

export const PET_LABELS: Record<Pet, LabelEntry> = {
  dog: { value: "a dog", valueShort: "dog" },
  cat: { value: "a cat", valueShort: "cat" },
  bird: { value: "a bird", valueShort: "bird" },
  none: { value: "no pet", valueShort: "none" },
};

export function labelFor(dim: AttributeDimension, raw: string): LabelEntry {
  if (dim === "hair") return HAIR_LABELS[raw as Hair];
  if (dim === "accessory") return ACCESSORY_LABELS[raw as Accessory];
  return PET_LABELS[raw as Pet];
}

// --- A clue template carries its text + tier eligibility. ---
export interface ClueTemplate {
  id: string;
  text: string;
  minTier: Tier; // smallest tier this template may appear in
}

// --- §3.5 Alibi templates (slots {name} {place}) ---
export const ALIBI_TEMPLATES: ClueTemplate[] = [
  { id: "AL1", text: "{name} was reading in the {place} the whole time. The librarian confirmed it.", minTier: 1 },
  { id: "AL2", text: "{name} never left the {place} — three people saw them there.", minTier: 1 },
  { id: "AL3", text: "{name} was helping set up the {place} and didn't leave once.", minTier: 1 },
  { id: "AL4", text: "The {place} sign-in sheet has {name}'s name from start to finish.", minTier: 1 },
  { id: "AL5", text: "{name} was stuck in the {place} with a teacher the entire morning.", minTier: 2 },
  { id: "AL6", text: "A photo timestamp puts {name} in the {place}, far from the scene.", minTier: 2 },
];

// --- §3.6 Hair templates (direct + twoStep) ---
export const HAIR_DIRECT: ClueTemplate[] = [
  { id: "H1", text: "A strand of {valueShort} hair was found at the scene.", minTier: 1 },
  { id: "H2", text: "Whoever did it has {value}.", minTier: 1 },
  { id: "H3", text: "Witnesses agree: the person they saw had {value}.", minTier: 1 },
  { id: "H4", text: "The only clear detail anyone remembers is {value}.", minTier: 1 },
];
export const HAIR_TWOSTEP: ClueTemplate[] = [
  { id: "H5", text: "A {valueShort} hair was caught in the door hinge. Match it to the culprit's hair.", minTier: 3 },
  { id: "H6", text: "The hat left behind had {valueShort} hairs inside it. That tells you the culprit's hair color.", minTier: 3 },
  { id: "H7", text: "Paint on the brush held a {valueShort} hair — the same color as whoever painted it.", minTier: 3 },
];

// --- §3.6 Accessory templates (direct + twoStep) ---
export const ACCESSORY_DIRECT: ClueTemplate[] = [
  { id: "C1", text: "A witness saw the person wearing {value}.", minTier: 1 },
  { id: "C2", text: "Whoever did it had {value} on at the time.", minTier: 1 },
  { id: "C3", text: "The one detail everyone agrees on: they were wearing {value}.", minTier: 1 },
  { id: "C4", text: "Security spotted someone in {value} leaving the {place}.", minTier: 1 },
];
export const ACCESSORY_TWOSTEP: ClueTemplate[] = [
  { id: "C5", text: "{value} was snagged on the fence by the {place}. The culprit was wearing it.", minTier: 3 },
  { id: "C6", text: "A button from {value} was left behind. The culprit wore {value}.", minTier: 3 },
  { id: "C7", text: "The reflection in the window showed someone in {value}. That's your wardrobe clue.", minTier: 3 },
];

// --- §3.7 Pet templates (has-a-pet direct/twoStep + the none subset) ---
// Fix 3: pet-appropriate phrasing — nobody "walks a bird". These read naturally for
// dog/cat/bird alike (value = "a dog"/"a cat"/"a bird"). The walking-specific phrasing
// (P9) is dog-only and the generator restricts it to value === "a dog".
export const PET_DIRECT: ClueTemplate[] = [
  { id: "P1", text: "Whoever did it owns {value}.", minTier: 1 },
  { id: "P2", text: "The culprit has {value} at home.", minTier: 1 },
  { id: "P3", text: "Everyone knows the person responsible has {value}.", minTier: 1 },
  { id: "P10", text: "A witness saw the culprit with {value} that morning.", minTier: 1 },
  { id: "P9", text: "The culprit was seen earlier walking {value}.", minTier: 1 }, // dog-only (generator-guarded)
];
export const PET_TWOSTEP: ClueTemplate[] = [
  { id: "P4", text: "Paw prints by the window. Whoever did it brought {value}.", minTier: 3 },
  { id: "P5", text: "{value} hair was all over the chair. The culprit must own one.", minTier: 3 },
  // P6 only valid when value resolves to "a bird" — generator guards this.
  { id: "P6", text: "Birdseed was scattered near the door — only someone with {value} carries that.", minTier: 3 },
];
export const PET_NONE: ClueTemplate[] = [
  { id: "P7", text: "The culprit has no pet at home — that rules some people out.", minTier: 1 },
  { id: "P8", text: "Whoever did it keeps no animals; the person they saw came alone, no pet in sight.", minTier: 1 },
];

// --- §3.8 Red-herring / flavor templates (never load-bearing; tier 3). {place} slot allowed. ---
export const FLAVOR_TEMPLATES: ClueTemplate[] = [
  { id: "F1", text: "The window was open, but it's always open on warm days.", minTier: 1 },
  { id: "F2", text: "A juice box was left on the table. It belongs to half the class.", minTier: 1 },
  { id: "F3", text: "Someone doodled a cat in the margin of the sign-in sheet.", minTier: 1 },
  { id: "F4", text: "The clock in the {place} is four minutes fast. It has been for weeks.", minTier: 1 },
  { id: "F5", text: "There were muddy shoe prints, but it rained on everyone this morning.", minTier: 2 },
  { id: "F6", text: "A library book sat face-down on the chair. Nobody remembers leaving it.", minTier: 1 },
  { id: "F7", text: "The {place} smelled faintly of popcorn. The popcorn machine is two rooms away.", minTier: 1 },
  { id: "F8", text: "A single glove was on the floor. It fits nobody who was questioned.", minTier: 2 },
];

// All six places (data model).
export const PLACES = [
  "library", "gym", "cafeteria", "park", "music room", "art room",
] as const;

export const HAIR_VALUES: Hair[] = ["black", "brown", "red", "blond"];
export const ACCESSORY_VALUES: Accessory[] = ["scarf", "glasses", "cap", "watch", "backpack"];
export const PET_VALUES: Pet[] = ["dog", "cat", "bird", "none"];
