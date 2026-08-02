import { createMineralDetail } from './createMineralDetail'

const detail = createMineralDetail({
  "title": "Bauxite",
  "mission": "Be a rock, not a mineral, and still run the aluminum business.",
  "classification": "Aluminum-rich sedimentary rock; not one mineral species",
  "formula": "Variable mixture, commonly gibbsite, boehmite, diaspore, and iron oxides",
  "colors": "White, gray, yellow, red, or brown",
  "hardness": "Variable, commonly about 1–3",
  "luster": "Dull to earthy",
  "streak": "White to reddish brown",
  "density": "Usually about 2.0–2.6 g/cm³",
  "superpower": "Bauxite concentrates aluminum into material rich enough to mine. Its greatest trick is economic rather than crystalline.",
  "weakSpot": "Because it is a rock mixture, one neat formula or hardness number would be misleading. Red mud left from refining also requires careful management.",
  "secretIdentity": "The useful aluminum is held mainly in hydroxide minerals such as gibbsite and boehmite. “Bauxite crystal” is therefore rather like “fruit-salad crystal.”",
  "humanUses": "Most bauxite is refined to alumina and then smelted into aluminum. Smaller amounts serve in refractories, abrasives, cement, and chemicals.",
  "originStory": "It commonly develops through intense tropical or subtropical weathering that removes soluble elements and leaves aluminum-rich residues behind.",
  "funSecrets": [
    "Making aluminum metal requires two major stages: refining bauxite into alumina, then using electricity to free aluminum from oxygen.",
    "Before modern refining, aluminum was so difficult to produce that it was once treated as a precious metal.",
    "Some bauxite formed in pockets within limestone landscapes, where weathered material collected in natural depressions."
  ],
  "safetyNote": "Avoid dusty handling. Industrial refining involves caustic chemicals and high-energy equipment and is not a home experiment.",
  "sources": [
    {
      "label": "Read the USGS bauxite and alumina overview.",
      "url": "https://www.usgs.gov/centers/national-minerals-information-center/bauxite-and-alumina-statistics-and-information"
    },
    {
      "label": "See how aluminum resources move from ore to products.",
      "url": "https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-bauxite-alumina.pdf"
    }
  ]
})

export default detail
