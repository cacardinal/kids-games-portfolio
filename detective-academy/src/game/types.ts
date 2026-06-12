// Binding data shapes from specs/detective-academy.md §"Data model".
// Engineer may extend, not change semantics.

export type Hair = "black" | "brown" | "red" | "blond";
export type Accessory = "scarf" | "glasses" | "cap" | "watch" | "backpack";
export type Pet = "dog" | "cat" | "bird" | "none";
export type Place =
  | "library"
  | "gym"
  | "cafeteria"
  | "park"
  | "music room"
  | "art room";

export type AttributeDimension = "hair" | "accessory" | "pet";

export interface Suspect {
  id: string;
  name: string;
  hair: Hair;
  accessory: Accessory;
  pet: Pet;
  alibiPlace: Place;
}

export type AlibiClue = {
  id: string;
  kind: "alibi";
  clearsSuspectId: string;
  text: string;
};

export type AttributeClue = {
  id: string;
  kind: "attribute";
  dimension: AttributeDimension;
  value: string; // the suspect attribute value as a string (e.g. "red", "scarf", "dog", "none")
  text: string;
  twoStep: boolean;
  loadBearing: boolean;
};

export type FlavorClue = {
  id: string;
  kind: "flavor";
  text: string;
};

export type Clue = AlibiClue | AttributeClue | FlavorClue;

export interface Case {
  id: number;
  seed: number;
  tier: 1 | 2 | 3;
  title: string;
  intro: string;
  location: Place;
  suspects: Suspect[];
  clues: Clue[];
  culpritId: string;
  implicatingClueIds: string[]; // attribute clues matching culprit (the 2+ that close the case)
}
