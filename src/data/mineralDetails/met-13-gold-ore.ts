import { createMineralDetail } from './createMineralDetail'

const detail = createMineralDetail({
  "title": "Gold Ore",
  "mission": "Hide a valuable element in an ordinary-looking rock.",
  "classification": "Rock containing economically recoverable gold; not one mineral species",
  "formula": "Variable; gold may occur as Au or in gold-bearing minerals",
  "colors": "Highly variable; visible gold is metallic yellow",
  "hardness": "Variable; native gold is 2.5–3",
  "luster": "Variable; native gold is metallic",
  "streak": "Variable; native gold is yellow",
  "density": "Variable; native gold is 19.3 g/cm³",
  "superpower": "Gold is extremely dense, malleable, corrosion-resistant, and electrically conductive. Ore can be valuable even when no gold is visible.",
  "weakSpot": "Appearance is a poor grade detector. Pyrite glitters more boldly, while microscopic gold may hide inside sulfides and require laboratory analysis.",
  "secretIdentity": "“Gold ore” describes economic material, not a mineral. Native gold, electrum, tellurides, quartz, and sulfides may all take part.",
  "humanUses": "Gold is used in jewelry, electronics, dentistry, aerospace equipment, investment, and specialized coatings.",
  "originStory": "Gold concentrates in hydrothermal veins, disseminated deposits, volcanic systems, and placers where dense grains collect in streams.",
  "funSecrets": [
    "A thin gold leaf can transmit greenish-blue light. Metal famous for reflecting yellow can become unexpectedly colorful when made extremely thin.",
    "Placer miners use gravity because gold is far denser than common sand; the pan is a sorting machine powered by patience.",
    "Some bacteria can help precipitate dissolved gold into tiny particles, adding microbiology to an already crowded detective story."
  ],
  "safetyNote": "Never use mercury, cyanide, acids, or home smelting to recover gold. Ore processing is hazardous professional work.",
  "sources": [
    {
      "label": "Explore gold resources, production, and uses at USGS.",
      "url": "https://www.usgs.gov/centers/national-minerals-information-center/gold-statistics-and-information"
    },
    {
      "label": "Read the native gold mineral data sheet.",
      "url": "https://www.handbookofmineralogy.org/pdfs/gold.pdf"
    }
  ]
})

export default detail
