import diamond from './gem-01-diamond'
import gem02 from './gem-02-ruby'
import gem03 from './gem-03-sapphire'
import gem04 from './gem-04-emerald'
import gem05 from './gem-05-jadeite'
import gem06 from './gem-06-tourmaline'
import gem07 from './gem-07-labradorite'
import gem08 from './gem-08-spinel'
import gem09 from './gem-09-aquamarine'
import gem10 from './gem-10-topaz'
import gem11 from './gem-11-peridot'
import gem12 from './gem-12-turquoise'
import gem13 from './gem-13-malachite'
import gem14 from './gem-14-garnet'
import gem15 from './gem-15-amethyst'
import met01 from './met-01-hematite'
import met02 from './met-02-magnetite'
import met03 from './met-03-chalcopyrite'
import met04 from './met-04-bornite'
import met05 from './met-05-bauxite'
import met06 from './met-06-galena'
import met07 from './met-07-sphalerite'
import met08 from './met-08-cassiterite'
import met09 from './met-09-chromite'
import met10 from './met-10-pyrolusite'
import met11 from './met-11-pentlandite'
import met12 from './met-12-molybdenite'
import met13 from './met-13-gold-ore'
import met14 from './met-14-silver-ore'
import met15 from './met-15-cobaltite'
import ind01 from './ind-01-graphite'
import ind02 from './ind-02-sulfur'
import ind03 from './ind-03-gypsum'
import ind04 from './ind-04-halite'
import ind05 from './ind-05-fluorite'
import ind06 from './ind-06-barite'
import ind07 from './ind-07-apatite'
import ind08 from './ind-08-spodumene'
import ind09 from './ind-09-lepidolite'
import ind10 from './ind-10-monazite'
import ind11 from './ind-11-bastnasite'
import ind12 from './ind-12-sylvite'
import ind13 from './ind-13-borax'
import ind14 from './ind-14-asbestos'
import ind15 from './ind-15-uraninite'
import geo01 from './geo-01-quartz'
import geo02 from './geo-02-orthoclase'
import geo03 from './geo-03-calcite'
import geo04 from './geo-04-dolomite'
import geo05 from './geo-05-augite'
import geo06 from './geo-06-hornblende'
import geo07 from './geo-07-muscovite'
import geo08 from './geo-08-aragonite'
import geo09 from './geo-09-talc'
import geo10 from './geo-10-kaolinite'
import geo11 from './geo-11-serpentine'
import geo12 from './geo-12-epidote'
import geo13 from './geo-13-kyanite'
import geo14 from './geo-14-staurolite'
import geo15 from './geo-15-chlorite'
import joker01 from './joker-01-imperial-topaz'
import joker02 from './joker-02-musgravite'
import joker03 from './joker-03-red-beryl'
import joker04 from './joker-04-benitoite'
import type { MineralDetail } from './types'

export type { MineralDetail } from './types'

export const MINERAL_DETAILS: Record<string, MineralDetail> = {
  'GEM-01': diamond,
  'GEM-02': gem02,
  'GEM-03': gem03,
  'GEM-04': gem04,
  'GEM-05': gem05,
  'GEM-06': gem06,
  'GEM-07': gem07,
  'GEM-08': gem08,
  'GEM-09': gem09,
  'GEM-10': gem10,
  'GEM-11': gem11,
  'GEM-12': gem12,
  'GEM-13': gem13,
  'GEM-14': gem14,
  'GEM-15': gem15,
  'MET-01': met01,
  'MET-02': met02,
  'MET-03': met03,
  'MET-04': met04,
  'MET-05': met05,
  'MET-06': met06,
  'MET-07': met07,
  'MET-08': met08,
  'MET-09': met09,
  'MET-10': met10,
  'MET-11': met11,
  'MET-12': met12,
  'MET-13': met13,
  'MET-14': met14,
  'MET-15': met15,
  'IND-01': ind01,
  'IND-02': ind02,
  'IND-03': ind03,
  'IND-04': ind04,
  'IND-05': ind05,
  'IND-06': ind06,
  'IND-07': ind07,
  'IND-08': ind08,
  'IND-09': ind09,
  'IND-10': ind10,
  'IND-11': ind11,
  'IND-12': ind12,
  'IND-13': ind13,
  'IND-14': ind14,
  'IND-15': ind15,
  'GEO-01': geo01,
  'GEO-02': geo02,
  'GEO-03': geo03,
  'GEO-04': geo04,
  'GEO-05': geo05,
  'GEO-06': geo06,
  'GEO-07': geo07,
  'GEO-08': geo08,
  'GEO-09': geo09,
  'GEO-10': geo10,
  'GEO-11': geo11,
  'GEO-12': geo12,
  'GEO-13': geo13,
  'GEO-14': geo14,
  'GEO-15': geo15,
  'JOKER-01': joker01,
  'JOKER-02': joker02,
  'JOKER-03': joker03,
  'JOKER-04': joker04,
}
