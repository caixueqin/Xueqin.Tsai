import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

// Helper to parse problem ranges like "Problem 1.1 - 1.6" or "约 Problem 5.1 - 5.7"
function parseProblemRange(text: string): { start: number, end: number, prefix: string } | null {
  const match = text.match(/Problem\s+(\d+)\.(\d+)\s*-\s*(?:\d+\.)?(\d+)/i)
  if (match) {
    return {
      prefix: match[1],
      start: parseInt(match[2]),
      end: parseInt(match[3])
    }
  }
  return null
}

async function main() {
  console.log('Clearing database...')
  await prisma.checkmark.deleteMany()
  await prisma.checkItem.deleteMany()
  await prisma.section.deleteMany()
  await prisma.chapter.deleteMany()
  await prisma.child.deleteMany()
  await prisma.user.deleteMany()

  // 1. Create Users
  const admin = await prisma.user.create({
    data: { name: 'Admin', role: 'admin', password: 'admin' }
  })
  const parent = await prisma.user.create({
    data: { name: 'Parent', role: 'parent', password: 'parent' }
  })

  const childrenNames = ['Yao', 'Sean', 'Mia', 'Leo']
  const childrenPins = ['1111', '1234', '1234', '1234']
  
  for (let i = 0; i < childrenNames.length; i++) {
    const user = await prisma.user.create({
      data: { name: childrenNames[i], role: 'child', pin: childrenPins[i] }
    })
    await prisma.child.create({
      data: { userId: user.id, displayName: childrenNames[i] }
    })
  }

  const alcumusIniPath = path.join(process.cwd(), 'data', '# Alcumus 练习 Focus 索引.ini')
  const alcumusContent = fs.readFileSync(alcumusIniPath, 'utf-8')
  const alcumusMap: Record<string, string> = {}
  for (const line of alcumusContent.split('\n')) {
    const match = line.match(/\*\s+\*\*(\d+\.\d+)\*\*\s+.*➔\s+\*\*(.+)\*\*/)
    if (match) {
      if (match[2].trim() !== '无') {
        alcumusMap[match[1]] = match[2].trim()
      }
    }
  }

  // 2. Read INI file
  const iniPath = path.join(process.cwd(), 'data', '# AoPS Prealgebra 1-6 章节题目矿洞打卡点地图.ini')
  const content = fs.readFileSync(iniPath, 'utf-8')
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0)

  let currentChapter: any = null
  let chapterIndex = 1
  let sectionIndex = 1

  for (const line of lines) {
    if (line.startsWith('## 第') || line.startsWith('第')) {
      const match = line.match(/第(\d+)章：(.+)\s*\((.+)\)/)
      if (match) {
        currentChapter = await prisma.chapter.create({
          data: {
            number: parseInt(match[1]),
            titleZh: match[2].trim(),
            titleEn: match[3].trim(),
            orderIndex: chapterIndex++
          }
        })
        sectionIndex = 1
      }
    } else if (line.match(/^\d+\.\d+节/) || line.includes('章末复习题') || line.includes('挑战题')) {
      if (!currentChapter) continue;

      let sectionTitleZh = ''
      let sectionTitleEn = ''
      let sectionType = 'regular'
      let isFinalGate = false

      if (line.includes('章末复习题') || line.includes('挑战题')) {
        // We will combine Review and Challenge into one 'final_gate' section if it doesn't exist yet
        isFinalGate = true
        sectionTitleZh = '章末综合'
        sectionTitleEn = 'Chapter Review & Challenge'
        sectionType = 'final_gate'
      } else {
        const match = line.match(/^\d+\.\d+节\s+([^：:]+)/)
        if (match) {
          sectionTitleZh = match[1].trim()
          
          // English mapping
          const enMap: Record<string, string> = {
            '引言': 'Introduction',
            '加法': 'Addition',
            '乘法': 'Multiplication',
            '相反数': 'Negation',
            '减法': 'Subtraction',
            '倒数': 'Reciprocals',
            '除法': 'Division',
            '平方': 'Squares',
            '更高次幂': 'Higher Exponents',
            '零作指数': 'Zero as an Exponent',
            '负指数': 'Negative Exponents',
            '倍数': 'Multiples',
            '整除法则': 'Divisibility Rules',
            '质数': 'Prime Numbers',
            '质因数分解': 'Prime Factorization',
            '最小公倍数': 'Least Common Multiple',
            '约数': 'Divisors',
            '最大公约数': 'Greatest Common Divisor',
            '什么是分数': 'What is a Fraction',
            '分数乘法': 'Multiplying Fractions',
            '分数除法': 'Dividing Fractions',
            '分数乘方': 'Exponentiation with Fractions',
            '最简分数': 'Simplest Form',
            '分数比较': 'Comparing Fractions',
            '分数加减法': 'Adding and Subtracting Fractions',
            '带分数': 'Mixed Numbers',
            '表达式': 'Expressions',
            '解线性方程 I': 'Solving Linear Equations I',
            '解线性方程 II': 'Solving Linear Equations II',
            '应用题': 'Word Problems',
            '不等式': 'Inequalities',
            '小数算术': 'Decimal Arithmetic',
            '舍入': 'Rounding',
            '小数与分数': 'Decimals and Fractions',
            '循环小数': 'Repeating Decimals'
          }
          sectionTitleEn = enMap[sectionTitleZh] || sectionTitleZh
        }
      }

      // Check if section already created (for final gate)
      let section = null
      if (isFinalGate) {
        section = await prisma.section.findFirst({
          where: { chapterId: currentChapter.id, sectionType: 'final_gate' }
        })
      }

      if (!section) {
        section = await prisma.section.create({
          data: {
            chapterId: currentChapter.id,
            number: isFinalGate ? 'Review' : `${currentChapter.number}.${sectionIndex}`,
            titleZh: sectionTitleZh,
            titleEn: sectionTitleEn,
            sectionType: sectionType,
            orderIndex: sectionIndex++
          }
        })
      }

      let checkItemOrder = await prisma.checkItem.count({ where: { sectionId: section.id } }) + 1

      // Parse problems
      if (line.includes('无例题')) {
        await prisma.checkItem.create({
          data: {
            sectionId: section.id,
            itemGroup: 'Reading',
            itemType: 'read',
            labelEn: 'Read Section',
            orderIndex: checkItemOrder++
          }
        })
      } else {
        const range = parseProblemRange(line)
        if (range) {
          if (isFinalGate) {
            // For Chapter End, we don't break down into individual examples, just one block
            const groupName = line.includes('挑战题') ? 'Challenge Problems' : 'Review Problems'
            const itemType = line.includes('挑战题') ? 'challenge' : 'review_q'
            
            await prisma.checkItem.create({
              data: {
                sectionId: section.id,
                itemGroup: 'End of Chapter',
                itemType: itemType,
                labelEn: `${groupName} (${range.prefix}.${range.start}-${range.end})`,
                orderIndex: checkItemOrder++
              }
            })
          } else {
            // Regular section: generate each problem
            for (let i = range.start; i <= range.end; i++) {
              const probName = `Problem ${range.prefix}.${i}`
              
              await prisma.checkItem.create({
                data: {
                  sectionId: section.id,
                  itemGroup: probName,
                  itemType: 'try',
                  labelEn: 'Try',
                  orderIndex: checkItemOrder++
                }
              })
              await prisma.checkItem.create({
                data: {
                  sectionId: section.id,
                  itemGroup: probName,
                  itemType: 'aops_way',
                  labelEn: 'AoPS Way',
                  orderIndex: checkItemOrder++
                }
              })
            }
          }
        }
      }

      // Add Alcumus to regular sections
      const noAlcumusSections = ['引言', '什么是分数', '零作指数', '最简分数'];
      if (!isFinalGate && sectionType === 'regular' && !noAlcumusSections.includes(sectionTitleZh)) {
        // check if alcumus already added
        const alcumusFocus = alcumusMap[section.number] || 'Alcumus'
        const itemGroupName = alcumusFocus === 'Alcumus' ? 'Alcumus' : `Alcumus: ${alcumusFocus}`
        const hasAlcumus = await prisma.checkItem.findFirst({ where: { sectionId: section.id, itemGroup: itemGroupName }})
        if (!hasAlcumus) {
          await prisma.checkItem.create({
            data: {
              sectionId: section.id,
              itemGroup: itemGroupName,
              itemType: 'alcumus_green',
              labelEn: 'Pass (Green)',
              orderIndex: checkItemOrder++
            }
          })
          await prisma.checkItem.create({
            data: {
              sectionId: section.id,
              itemGroup: itemGroupName,
              itemType: 'alcumus_blue',
              labelEn: 'Mastery (Blue)',
              orderIndex: checkItemOrder++
            }
          })
        }
      }
    }
  }

  console.log('Database seeded successfully based on INI file!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
