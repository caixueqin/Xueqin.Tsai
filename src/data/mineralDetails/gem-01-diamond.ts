import type { MineralDetail } from './types'
import { MINERAL_REVIEW_ZH_BY_TITLE } from './reviewTranslations.zh'

const diamond: MineralDetail = {
  title: 'DIAMOND｜Secret File',
  mission: 'Sparkle hard. Cut harder.',
  reviewZh: MINERAL_REVIEW_ZH_BY_TITLE.Diamond,
  photo: {
    src: '/image/mineral-details/gem-01-diamond.jpg',
    alt: 'The rough yellow Oppenheimer Diamond crystal',
    credit: 'Chip Clark, Smithsonian National Museum of Natural History',
    sourceUrl: 'https://naturalhistory.si.edu/explore/collections/geogallery/10002807',
  },
  facts: [
    {
      label: 'Color',
      value: 'Usually colorless; impurities and defects can add color.',
      help: 'Impurities are tiny amounts of other elements. Crystal defects are interruptions in the regular atomic pattern. Either can change color.',
    },
    { label: 'Formula', value: 'C' },
    { label: 'Main element', value: 'Carbon' },
    {
      label: 'Hardness',
      value: '10 on the Mohs scale',
      help: 'The Mohs scale ranks scratch resistance from 1 to 10. Diamond is 10, the highest standard value.',
    },
    {
      label: 'Luster',
      value: 'Adamantine',
      help: 'Luster describes how light reflects from a surface. Adamantine means an extremely bright, diamond-like shine.',
    },
    {
      label: 'Streak',
      value: 'Not usually tested',
      help: 'Diamond is harder than a porcelain streak plate, so a normal streak test is not useful.',
    },
    {
      label: 'Density',
      value: 'About 3.52 g/cm³',
      help: 'A 1 cm³ piece of diamond would have a mass of about 3.52 grams.',
    },
  ],
  sections: [
    {
      heading: 'SUPERPOWER',
      illustration: '/image/mineral-details/diamond-sections/superpower.png?v=3',
      content: `Diamond sits at 10 on the Mohs scale. Almost every other mineral loses a scratching contest with it.

That is why diamond appears on saws, drill bits, and polishing tools. Its most reliable opponent is rather awkwardly… another diamond.`,
    },
    {
      heading: 'WEAK SPOT',
      illustration: '/image/mineral-details/diamond-sections/weak-spot.png?v=3',
      content: `Diamond wears excellent scratch-resistant armor, but it is not shockproof.

A sharp blow along one of its cleavage directions can split it. The hardness champion still prefers that you put the hammer down.`,
    },
    {
      heading: 'SECRET IDENTITY',
      illustration: '/image/mineral-details/diamond-sections/secret-identity.png?v=3',
      content: `Diamond and pencil graphite are both carbon.

In graphite, carbon atoms sit in slippery layers. In diamond, they lock together in a strong 3D framework.

Same cast of atoms; completely different choreography.`,
    },
    {
      heading: 'HUMAN USES',
      illustration: '/image/mineral-details/diamond-sections/human-uses.png?v=3',
      content: `Gem-quality diamonds perform under spotlights. Industrial diamonds report to workshops.

They cut stone, drill rock, shape tools, and polish difficult surfaces. Diamond owns both formal clothes and sturdy work boots.`,
    },
    {
      heading: 'ORIGIN STORY',
      illustration: '/image/mineral-details/diamond-sections/origin-story.png?v=3',
      content: `Many diamonds formed about 160 kilometres beneath Earth’s surface, long before the volcanic rock that carried them upward existed.

Kimberlite did not make the diamond. It arrived later as an extremely fast lift from the mantle.`,
    },
    {
      heading: 'FUN SECRET',
      illustration: '/image/mineral-details/diamond-sections/fun-secret.png?v=3',
      content: `• A common rough-diamond shape is an octahedron: imagine two pyramids joined base to base.

• The yellow Oppenheimer Diamond weighs 253.7 carats. Nitrogen atoms replacing a few carbon atoms helped give it its color.

• Some diamonds contain tiny pieces of deep-mantle minerals. They are sparkling sample boxes delivered from places humans cannot drill.`,
    },
    {
      heading: 'LEARNING LINKS',
      content: '',
      links: [
        {
          label: 'See how carbon structure makes graphite soft and diamond hard.',
          url: 'https://www.gia.edu/diamond-description',
        },
        {
          label: 'Meet the real 253.7-carat Oppenheimer Diamond.',
          url: 'https://naturalhistory.si.edu/explore/collections/geogallery/10002807',
        },
        {
          label: 'Explore diamond statistics, production, and industrial uses.',
          url: 'https://www.usgs.gov/centers/national-minerals-information-center/diamond-statistics-and-information',
        },
      ],
    },
    {
      heading: 'SAFETY NOTE',
      content: `A scratch test can damage the object, the stone, or both. A hammer test answers only one question: “Can I break this?”

A careful scientist uses proper tools, records evidence, and lets the jewelry remain jewelry.`,
    },
  ],
  content: '',
}

export default diamond
