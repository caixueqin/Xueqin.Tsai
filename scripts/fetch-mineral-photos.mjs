import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const webRoot = fileURLToPath(new URL('../', import.meta.url))
const detailDir = join(webRoot, 'src/data/mineralDetails')
const imageDir = join(webRoot, 'public/image/mineral-details/specimens')
const metadataPath = join(detailDir, 'photo-metadata.json')

const cards = {
  'GEM-02': ['Ruby', 'ruby corundum mineral specimen'],
  'GEM-03': ['Sapphire', 'blue sapphire corundum crystal specimen'],
  'GEM-04': ['Emerald', 'emerald beryl crystal matrix specimen'],
  'GEM-05': [null, 'jadeite mineral crystal specimen'],
  'GEM-06': ['Tourmaline', 'tourmaline crystal mineral specimen'],
  'GEM-07': ['Labradorite', 'labradorite mineral specimen'],
  'GEM-08': ['Spinel', 'spinel crystal mineral specimen'],
  'GEM-09': ['Aquamarine (gem)', 'aquamarine beryl crystal specimen'],
  'GEM-10': ['Topaz', 'topaz crystal mineral specimen'],
  'GEM-11': ['Peridot', 'peridot olivine crystal specimen'],
  'GEM-12': ['Turquoise', 'turquoise mineral specimen'],
  'GEM-13': ['Malachite', 'malachite mineral specimen'],
  'GEM-14': ['Garnet', 'garnet crystal mineral specimen'],
  'GEM-15': ['Amethyst', 'amethyst crystal mineral specimen'],
  'MET-01': ['Hematite', 'hematite mineral specimen'],
  'MET-02': ['Magnetite', 'magnetite crystal mineral specimen'],
  'MET-03': ['Chalcopyrite', 'chalcopyrite mineral specimen'],
  'MET-04': ['Bornite', 'bornite mineral specimen'],
  'MET-05': ['Bauxite', 'bauxite rock specimen'],
  'MET-06': ['Galena', 'galena crystal mineral specimen'],
  'MET-07': ['Sphalerite', 'sphalerite crystal mineral specimen'],
  'MET-08': ['Cassiterite', 'cassiterite crystal mineral specimen'],
  'MET-09': ['Chromite', 'chromite mineral specimen'],
  'MET-10': ['Pyrolusite', 'pyrolusite mineral specimen'],
  'MET-11': ['Pentlandite', 'pentlandite mineral specimen'],
  'MET-12': ['Molybdenite', 'molybdenite mineral specimen'],
  'MET-13': ['Gold nugget', 'native gold quartz mineral specimen'],
  'MET-14': [null, 'native silver mineral specimen'],
  'MET-15': ['Cobaltite', 'cobaltite mineral specimen'],
  'IND-01': ['Graphite', 'graphite mineral specimen'],
  'IND-02': ['Sulfur', 'native sulfur crystal mineral specimen'],
  'IND-03': ['Gypsum', 'gypsum crystal mineral specimen'],
  'IND-04': ['Halite', 'halite crystal mineral specimen'],
  'IND-05': ['Fluorite', 'fluorite crystal mineral specimen'],
  'IND-06': ['Baryte', 'barite crystal mineral specimen'],
  'IND-07': ['Apatite', 'apatite crystal mineral specimen'],
  'IND-08': ['Spodumene', 'spodumene crystal mineral specimen'],
  'IND-09': ['Lepidolite', 'lepidolite mineral specimen'],
  'IND-10': ['Monazite', 'monazite mineral specimen'],
  'IND-11': ['Bastnäsite', 'bastnasite mineral specimen'],
  'IND-12': ['Sylvite', 'sylvite mineral specimen'],
  'IND-13': ['Borax', 'borax mineral specimen'],
  'IND-14': [null, 'chrysotile asbestos fibrous mineral specimen'],
  'IND-15': ['Uraninite', 'uraninite mineral specimen'],
  'GEO-01': ['Quartz', 'quartz crystal mineral specimen'],
  'GEO-02': ['Orthoclase', 'orthoclase crystal mineral specimen'],
  'GEO-03': ['Calcite', 'calcite crystal mineral specimen'],
  'GEO-04': ['Dolomite (mineral)', 'dolomite crystal mineral specimen'],
  'GEO-05': ['Augite', 'augite crystal mineral specimen'],
  'GEO-06': ['Hornblende', 'hornblende mineral specimen'],
  'GEO-07': ['Muscovite', 'muscovite mica mineral specimen'],
  'GEO-08': ['Aragonite', 'aragonite crystal mineral specimen'],
  'GEO-09': ['Talc', 'talc mineral specimen'],
  'GEO-10': ['Kaolinite', 'kaolinite mineral specimen'],
  'GEO-11': ['Serpentine subgroup', 'serpentine mineral specimen'],
  'GEO-12': ['Epidote', 'epidote crystal mineral specimen'],
  'GEO-13': ['Kyanite', 'kyanite crystal mineral specimen'],
  'GEO-14': ['Staurolite', 'staurolite cross crystal specimen'],
  'GEO-15': ['Chlorite group', 'chlorite mineral specimen'],
  'JOKER-01': [null, 'imperial topaz crystal Ouro Preto specimen'],
  'JOKER-02': [null, 'magnesiotaaffeite musgravite gemstone'],
  'JOKER-03': ['Red beryl', 'red beryl crystal Utah specimen'],
  'JOKER-04': ['Benitoite', 'benitoite crystal mineral specimen'],
}

const preferredFiles = {
  'GEM-05': 'Jadeite (GeoDIL number - 1607).jpg',
  'IND-13': 'Borax-150039.jpg',
  'IND-14': 'Chrysotile and asbestos (GeoDIL number - 2527).jpg',
  'GEO-11': 'Serpentine-Group-142252.jpg',
  'JOKER-02': 'Fotostrecke Weltraritaeten-Musgravit-G-EmpireTheWorldOfGems.jpg',
  'JOKER-03': 'Red beryl.jpg',
}

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

const cleanHtml = value =>
  String(value || '')
    .replace(/<[^>]+>/g, '')
    .replaceAll('&quot;', '"')
    .replaceAll('&#039;', "'")
    .replaceAll('&amp;', '&')
    .trim()

async function getJson(url, retries = 4) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'MathCraftMineralCards/1.0 (educational project)' },
  })
  if (response.status === 429 && retries > 0) {
    await sleep((5 - retries) * 2500)
    return getJson(url, retries - 1)
  }
  if (!response.ok) throw new Error(`${response.status} ${url}`)
  return response.json()
}

async function getBuffer(url, retries = 1) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'MathCraftMineralCards/1.0 (educational project)' },
  })
  if (response.status === 429 && retries > 0) {
    await sleep((6 - retries) * 3000)
    return getBuffer(url, retries - 1)
  }
  if (response.status === 429) {
    const proxyUrl = new URL('https://images.weserv.nl/')
    proxyUrl.search = new URLSearchParams({
      url,
      w: '1400',
      h: '1100',
      fit: 'inside',
      output: 'jpg',
    })
    const proxyResponse = await fetch(proxyUrl)
    if (proxyResponse.ok) {
      return Buffer.from(await proxyResponse.arrayBuffer())
    }
  }
  if (!response.ok) throw new Error(`download ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

function chunks(values, size) {
  const result = []
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size))
  }
  return result
}

async function getWikipediaLeadImages() {
  const requestedTitles = [...new Set(Object.values(cards).map(([title]) => title).filter(Boolean))]
  const byTitle = new Map()

  for (const titleBatch of chunks(requestedTitles, 40)) {
    const url = new URL('https://en.wikipedia.org/w/api.php')
    url.search = new URLSearchParams({
      action: 'query',
      format: 'json',
      origin: '*',
      redirects: '1',
      prop: 'pageimages',
      piprop: 'thumbnail|name|original',
      pithumbsize: '1200',
      titles: titleBatch.join('|'),
    })
    const json = await getJson(url)
    const aliases = new Map()
    for (const item of [...(json.query.normalized || []), ...(json.query.redirects || [])]) {
      aliases.set(item.from.toLowerCase(), item.to.toLowerCase())
    }
    const pages = Object.values(json.query.pages || {})
    for (const page of pages) {
      byTitle.set(page.title.toLowerCase(), page)
    }
    for (const requested of titleBatch) {
      let key = requested.toLowerCase()
      const seen = new Set()
      while (aliases.has(key) && !seen.has(key)) {
        seen.add(key)
        key = aliases.get(key)
      }
      const page = byTitle.get(key)
      if (page) byTitle.set(requested.toLowerCase(), page)
    }
    await sleep(1200)
  }
  return byTitle
}

async function searchCommons(query) {
  const url = new URL('https://commons.wikimedia.org/w/api.php')
  url.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: '6',
    gsrlimit: '8',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: '1200',
  })
  const json = await getJson(url)
  const pages = Object.values(json.query?.pages || {})
  return pages.find(page => page.imageinfo?.[0]?.thumburl) || null
}

async function getCommonsMetadata(fileNames) {
  const result = new Map()
  for (const fileBatch of chunks([...new Set(fileNames)], 40)) {
    const url = new URL('https://commons.wikimedia.org/w/api.php')
    url.search = new URLSearchParams({
      action: 'query',
      format: 'json',
      origin: '*',
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      iiurlwidth: '1200',
      titles: fileBatch.map(file => `File:${file}`).join('|'),
    })
    const json = await getJson(url)
    for (const page of Object.values(json.query.pages || {})) {
      result.set(page.title.replace(/^File:/, ''), page)
    }
    await sleep(1200)
  }
  return result
}

function buildRecord(id, label, commonsPage) {
  const info = commonsPage.imageinfo[0]
  const metadata = info.extmetadata || {}
  const artist = cleanHtml(metadata.Artist?.value) || 'Wikimedia Commons contributor'
  const license = cleanHtml(metadata.LicenseShortName?.value)
  const description =
    cleanHtml(metadata.ImageDescription?.value) || `${label} mineral specimen`
  return {
    id,
    label,
    fileTitle: commonsPage.title,
    alt: description,
    credit: [artist, license].filter(Boolean).join(' · '),
    sourceUrl: info.descriptionurl,
    originalUrl: info.url,
    downloadUrl: info.thumburl || info.url,
  }
}

await mkdir(imageDir, { recursive: true })
let previousResults = []
try {
  previousResults = JSON.parse(await readFile(metadataPath, 'utf8')).map(result => ({
    ...result,
    outputPath: result.outputPath || join(webRoot, 'public', result.localFile),
  }))
} catch {}
const previousById = new Map(previousResults.map(result => [result.id, result]))
const forceReplace = new Set()

const wikipediaPages = await getWikipediaLeadImages()
const leadFiles = []
for (const [id, [title]] of Object.entries(cards)) {
  if (preferredFiles[id]) {
    leadFiles.push(preferredFiles[id])
    continue
  }
  const page = title ? wikipediaPages.get(title.toLowerCase()) : null
  if (page?.pageimage) leadFiles.push(page.pageimage)
}
const commonsByFile = await getCommonsMetadata(leadFiles)

const results = []
for (const [id, [title, searchQuery]] of Object.entries(cards)) {
  if (previousById.has(id) && !forceReplace.has(id)) {
    results.push(previousById.get(id))
    console.log(`↺ ${id} kept reviewed photo`)
    continue
  }

  let commonsPage
  const wikipediaPage = title ? wikipediaPages.get(title.toLowerCase()) : null
  if (preferredFiles[id]) {
    commonsPage = commonsByFile.get(preferredFiles[id])
  } else if (wikipediaPage?.pageimage) {
    commonsPage = commonsByFile.get(wikipediaPage.pageimage)
  }
  if (!commonsPage?.imageinfo?.[0]?.thumburl) {
    commonsPage = await searchCommons(searchQuery)
    await sleep(1200)
  }
  if (!commonsPage) {
    console.error(`✗ ${id}: no photo candidate`)
    continue
  }

  const record = buildRecord(id, title || searchQuery, commonsPage)
  const outputName = `${id.toLowerCase()}.jpg`
  const outputPath = join(imageDir, outputName)
  if (!forceReplace.has(id)) {
    try {
      await access(outputPath)
      results.push({
        ...record,
        localFile: `/image/mineral-details/specimens/${outputName}`,
        outputPath,
      })
      await writeFile(metadataPath, JSON.stringify(results, null, 2))
      console.log(`↺ ${id} recovered downloaded photo`)
      continue
    } catch {}
  }

  try {
    const original = await getBuffer(record.downloadUrl)
    await sharp(original)
      .rotate()
      .resize(1400, 1100, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 88, mozjpeg: true })
      .toFile(outputPath)
  } catch (error) {
    console.error(`✗ ${id}: ${error.message}`)
    continue
  }
  results.push({
    ...record,
    localFile: `/image/mineral-details/specimens/${outputName}`,
    outputPath,
  })
  await writeFile(metadataPath, JSON.stringify(results, null, 2))
  console.log(`✓ ${id} ${record.fileTitle}`)
  await sleep(8000)
}

await writeFile(
  metadataPath,
  JSON.stringify(
    results.map(({ outputPath, downloadUrl, ...metadata }) => metadata),
    null,
    2
  )
)

const tiles = []
for (const result of results) {
  const escapedLabel = result.label.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  const tile = await sharp(result.outputPath)
    .resize(260, 200, { fit: 'contain', background: '#ffffff' })
    .extend({ bottom: 40, background: '#ffffff' })
    .composite([
      {
        input: Buffer.from(
          `<svg width="260" height="40"><rect width="260" height="40" fill="white"/><text x="130" y="26" text-anchor="middle" font-family="Arial" font-size="18" font-weight="700" fill="#263238">${result.id} · ${escapedLabel}</text></svg>`
        ),
        top: 200,
        left: 0,
      },
    ])
    .png()
    .toBuffer()
  tiles.push(tile)
}

const columns = 5
const rows = Math.ceil(tiles.length / columns)
await sharp({
  create: {
    width: columns * 260,
    height: rows * 240,
    channels: 3,
    background: '#e9eef3',
  },
})
  .composite(
    tiles.map((input, index) => ({
      input,
      left: (index % columns) * 260,
      top: Math.floor(index / columns) * 240,
    }))
  )
  .png()
  .toFile(join(imageDir, '_contact-sheet.png'))

console.log(`Saved ${results.length} photos and contact sheet.`)
