import fs from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

function normalizeEnv(value) {
  return !value || value === 'undefined' || value === 'null' ? undefined : value
}

const dbUrl = normalizeEnv(process.env.DATABASE_URL) || normalizeEnv(process.env.TURSO_DATABASE_URL)
if (!dbUrl) throw new Error('Missing DATABASE_URL or TURSO_DATABASE_URL')

const prisma = new PrismaClient({
  adapter: new PrismaLibSQL({
    url: dbUrl,
    authToken: normalizeEnv(process.env.TURSO_AUTH_TOKEN),
  }),
})

function parseProblemRange(text) {
  const match = text.match(/Problem\s+(\d+)\.(\d+)\s*-\s*(?:\d+\.)?(\d+)/i)
  if (!match) return null
  return { prefix: match[1], start: Number(match[2]), end: Number(match[3]) }
}

function parseFocus(content) {
  const result = new Map()
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    const markdown = line.match(/^\*\s+\*\*(\d+\.\d+)\*\*\s+(.+?)\s+➔\s+\*\*(.+?)\*\*(.*)$/)
    const plain = line.match(/^(\d+\.\d+)\s+(.+?)\s+➔\s+(.+?)(?:\s+\(备注.*\))?$/)
    const match = markdown || plain
    if (!match) continue
    const focus = match[3].trim()
    result.set(match[1], {
      titleEn: match[2].trim(),
      focus: focus === '无' ? null : focus,
    })
  }
  return result
}

function parseChapters(content, focusMap) {
  const chapters = []
  let chapter = null
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('# ') || /^-+$/.test(line)) continue

    const chapterMatch = line.match(/^##\s*第(\d+)章：(.+?)\s*\((.+)\)$/)
    if (chapterMatch) {
      chapter = {
        number: Number(chapterMatch[1]),
        titleZh: chapterMatch[2].trim(),
        titleEn: chapterMatch[3].trim(),
        sections: [],
      }
      chapters.push(chapter)
      continue
    }
    if (!chapter) continue

    const sectionMatch = line.match(/^(\d+\.\d+)节\s+([^：:]+)[：:]\s*(.+)$/)
    if (sectionMatch) {
      const number = sectionMatch[1]
      const focus = focusMap.get(number)
      chapter.sections.push({
        number,
        titleZh: sectionMatch[2].trim(),
        titleEn: focus?.titleEn || sectionMatch[2].trim(),
        type: 'regular',
        problemRange: parseProblemRange(sectionMatch[3]),
        alcumusFocus: focus?.focus || null,
      })
      continue
    }

    if (line.includes('章末复习题') || line.includes('挑战题')) {
      let finalGate = chapter.sections.find((section) => section.type === 'final_gate')
      if (!finalGate) {
        finalGate = {
          number: 'Review',
          titleZh: '章末综合',
          titleEn: 'Chapter Review & Challenge',
          type: 'final_gate',
          endGroups: [],
        }
        chapter.sections.push(finalGate)
      }
      finalGate.endGroups.push({
        kind: line.includes('挑战题') ? 'challenge' : 'review_q',
        range: parseProblemRange(line),
      })
    }
  }
  return chapters
}

async function addRegularItems(sectionId, section) {
  let orderIndex = 1
  const range = section.problemRange
  if (range) {
    for (let number = range.start; number <= range.end; number++) {
      const itemGroup = `Problem ${range.prefix}.${number}`
      await prisma.checkItem.createMany({
        data: [
          { sectionId, itemGroup, itemType: 'try', labelEn: 'Try', orderIndex: orderIndex++ },
          { sectionId, itemGroup, itemType: 'aops_way', labelEn: 'AoPS Way', orderIndex: orderIndex++ },
        ],
      })
    }
  }
  if (section.alcumusFocus) {
    const itemGroup = `Alcumus: ${section.alcumusFocus}`
    await prisma.checkItem.createMany({
      data: [
        { sectionId, itemGroup, itemType: 'alcumus_green', labelEn: 'Pass (Green)', orderIndex: orderIndex++ },
        { sectionId, itemGroup, itemType: 'alcumus_blue', labelEn: 'Mastery (Blue)', orderIndex: orderIndex++ },
      ],
    })
  }
}

async function addFinalGateItems(sectionId, section) {
  let orderIndex = 1
  for (const group of section.endGroups) {
    if (!group.range) continue
    const groupName = group.kind === 'challenge' ? 'Challenge Problems' : 'Review Problems'
    await prisma.checkItem.create({
      data: {
        sectionId,
        itemGroup: 'End of Chapter',
        itemType: group.kind,
        labelEn: `${groupName} (${group.range.prefix}.${group.range.start}-${group.range.end})`,
        orderIndex: orderIndex++,
      },
    })
  }
}

async function main() {
  const dataDir = path.join(process.cwd(), 'data')
  const mapContent = fs.readFileSync(path.join(dataDir, '# AoPS Prealgebra 7-15 章节题目矿洞打卡点地图.ini'), 'utf8')
  const focusContent = fs.readFileSync(path.join(dataDir, '# Alcumus 练习 Focus 索引.ini'), 'utf8')
  const chapters = parseChapters(mapContent, parseFocus(focusContent))
  if (chapters.length !== 9) throw new Error(`Expected 9 chapters, parsed ${chapters.length}`)

  const existing = await prisma.chapter.findMany({
    where: { number: { in: chapters.map((chapter) => chapter.number) } },
    select: { number: true },
  })
  if (existing.length) {
    throw new Error(`Refusing to create duplicate chapters. Already present: ${existing.map((chapter) => chapter.number).sort((a, b) => a - b).join(', ')}`)
  }

  for (const chapterData of chapters) {
    const chapter = await prisma.chapter.create({
      data: {
        number: chapterData.number,
        titleZh: chapterData.titleZh,
        titleEn: chapterData.titleEn,
        orderIndex: chapterData.number,
      },
    })

    for (let index = 0; index < chapterData.sections.length; index++) {
      const sectionData = chapterData.sections[index]
      const section = await prisma.section.create({
        data: {
          chapterId: chapter.id,
          number: sectionData.number,
          titleZh: sectionData.titleZh,
          titleEn: sectionData.titleEn,
          sectionType: sectionData.type,
          orderIndex: index + 1,
        },
      })
      if (sectionData.type === 'final_gate') {
        await addFinalGateItems(section.id, sectionData)
      } else {
        await addRegularItems(section.id, sectionData)
      }
    }
    console.log(`Imported chapter ${chapterData.number}: ${chapterData.titleEn}`)
  }

  const result = await prisma.chapter.findMany({
    where: { number: { gte: 7, lte: 15 } },
    orderBy: { number: 'asc' },
    include: { sections: { include: { checkItems: true } } },
  })
  console.log(JSON.stringify(result.map((chapter) => ({
    number: chapter.number,
    sections: chapter.sections.length,
    checkItems: chapter.sections.reduce((sum, section) => sum + section.checkItems.length, 0),
  })), null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
