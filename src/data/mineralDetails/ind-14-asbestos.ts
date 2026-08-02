import { createMineralDetail } from './createMineralDetail'

const detail = createMineralDetail({
  "title": "Asbestos",
  "mission": "Teach why useful properties can carry unacceptable risk.",
  "classification": "Commercial name for six regulated fibrous silicate minerals; not one mineral",
  "formula": "Variable; includes chrysotile and five amphibole minerals",
  "colors": "White, gray, green, blue, or brown",
  "hardness": "Variable, roughly 2.5–6",
  "luster": "Silky to dull",
  "streak": "White",
  "density": "About 2.5–3.3 g/cm³",
  "superpower": "Asbestos fibers resist heat, chemicals, and pulling forces. Those once-useful properties led to widespread use before severe health risks were understood.",
  "weakSpot": "Airborne microscopic fibers can lodge deep in lungs and cause asbestosis, lung cancer, and mesothelioma, often decades after exposure.",
  "secretIdentity": "Asbestos is a shape-based commercial category. Chrysotile is serpentine; crocidolite, amosite, tremolite, actinolite, and anthophyllite are amphiboles.",
  "humanUses": "Historically it was used in insulation, fireproofing, cement products, brakes, and textiles. Many uses are now banned or tightly regulated.",
  "originStory": "Fibers form when certain rocks undergo deformation and fluid-driven alteration, allowing minerals to grow as long, separable strands.",
  "funSecrets": [
    "Ancient writers described fire-resistant mineral cloth, but its durability never cancelled the danger of inhaled fibers.",
    "A hand specimen cannot reliably tell whether building material contains asbestos; trained sampling and laboratory analysis are required.",
    "The dangerous feature is not simply “a rock being poisonous.” Fiber shape, size, durability, and dose all matter."
  ],
  "safetyNote": "Knowledge card only. Never collect, touch, disturb, sweep, drill, or sample suspected asbestos. Leave the area and contact qualified professionals.",
  "sources": [
    {
      "label": "Read the US EPA health and safety overview for asbestos.",
      "url": "https://www.epa.gov/asbestos/learn-about-asbestos"
    },
    {
      "label": "Read the USGS asbestos statistics and information page.",
      "url": "https://www.usgs.gov/centers/national-minerals-information-center/asbestos-statistics-and-information"
    }
  ]
})

export default detail
