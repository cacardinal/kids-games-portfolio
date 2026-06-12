// Fix 4 — suspect portrait busts. The portrait is composed FROM the puzzle attributes
// and must expose them as DOM data-* attributes (the director's assertability hook), and
// a character's LOOK (hair color + skin + hair style) must be STABLE across cases.
//
// No jsdom is installed, so we render the component to static markup via
// react-dom/server (available under React 19) and assert on the emitted attributes.
// Calling the component as a function returns a React element — no JSX needed here, so
// this stays a plain .ts test file.

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SuspectPortrait } from "../SuspectPortrait";
import { NAME_TRAITS, hairForName } from "../../data/content";
import { generateAllCases } from "../../game/generator";
import type { Accessory, Hair, Pet } from "../../game/types";

function render(props: {
  name: string;
  hair: Hair;
  accessory: Accessory;
  pet: Pet;
  cleared?: boolean;
}): string {
  return renderToStaticMarkup(SuspectPortrait(props));
}

describe("Fix 4 — portrait exposes the puzzle attributes as data-* hooks", () => {
  it("renders data-hair / data-accessory / data-pet from the suspect attributes", () => {
    const html = render({ name: "Mateo", hair: "brown", accessory: "scarf", pet: "dog" });
    expect(html).toContain('data-hair="brown"');
    expect(html).toContain('data-accessory="scarf"');
    expect(html).toContain('data-pet="dog"');
  });

  it("renders an SVG bust (no external image assets)", () => {
    const html = render({ name: "Ivy", hair: "red", accessory: "glasses", pet: "cat" });
    expect(html).toContain("<svg");
    expect(html).not.toMatch(/<img/i);
    // hair color fill present (red bust tone)
    expect(html.toLowerCase()).toContain("#a8472a");
  });

  it("omits the pet companion chip when pet is none, includes it otherwise", () => {
    const none = render({ name: "Lena", hair: "blond", accessory: "cap", pet: "none" });
    expect(none).not.toContain("portrait__pet");
    const withPet = render({ name: "Lena", hair: "blond", accessory: "cap", pet: "bird" });
    expect(withPet).toContain("portrait__pet");
  });

  it("renders each accessory on the bust without error (all five)", () => {
    const accs: Accessory[] = ["scarf", "glasses", "cap", "watch", "backpack"];
    for (const a of accs) {
      const html = render({ name: "Theo", hair: "brown", accessory: a, pet: "none" });
      expect(html, `accessory ${a}`).toContain(`data-accessory="${a}"`);
      expect(html).toContain("<svg");
    }
  });
});

describe("Fix 4 — stable looks: the bust uses the name's fixed traits", () => {
  it("emits the name's fixed hair style for every name in the pool", () => {
    for (const [name, t] of Object.entries(NAME_TRAITS)) {
      const html = render({ name, hair: t.hair, accessory: "watch", pet: "none" });
      expect(html, `${name} hairstyle`).toContain(`data-hairstyle="${t.hairStyle}"`);
    }
  });

  it("a given name renders the same hair color + style regardless of other attributes", () => {
    const a = render({ name: "Mateo", hair: hairForName("Mateo"), accessory: "scarf", pet: "dog" });
    const b = render({ name: "Mateo", hair: hairForName("Mateo"), accessory: "backpack", pet: "cat" });
    // hair-related markup (color fill + style) is identical; only accessory/pet differ.
    const hairOf = (html: string) => html.match(/data-hairstyle="[^"]+"/)?.[0];
    expect(hairOf(a)).toBe(hairOf(b));
    expect(a).toContain('data-hair="brown"');
    expect(b).toContain('data-hair="brown"');
  });

  it("across all 30 generated cases, every suspect's portrait hair === hairForName", () => {
    for (const c of generateAllCases()) {
      for (const s of c.suspects) {
        const html = render({ name: s.name, hair: s.hair, accessory: s.accessory, pet: s.pet });
        expect(html, `${s.name} in case ${c.id}`).toContain(`data-hair="${hairForName(s.name)}"`);
      }
    }
  });
});
