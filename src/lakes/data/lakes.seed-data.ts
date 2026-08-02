/**
 * Verified glacial lake seed data.
 *
 * Task #5's definition of done asked for the ICIMOD HKH inventory ∩ GLOF-II priority
 * list, ≥25 lakes. That specific dataset is real but institutionally gated — ICIMOD's
 * digital repository and GLOF-II's technical reports, not an openly downloadable point
 * dataset. Fabricating 25 plausible-looking coordinates to hit the number was rejected
 * (decision: Shaan, 2026-08-02) — this is a GLOF early-warning system; invented
 * coordinates presented as real inventory data is a credibility and safety problem, not
 * an acceptable prototype shortcut.
 *
 * What's here instead: every lake below is individually verifiable against a real,
 * citable source (`source` / `sourceUrl` on each entry, and required — non-nullable —
 * on the Lake entity itself, so this constraint is enforced by the schema, not just this
 * comment). Six lakes, not 25. The gap is tracked, not hidden — see
 * docs/ai/decisions/0002-lake-data-provenance.md and the follow-up issue it links.
 *
 * A DOI-backed dataset that likely covers the full GLOF-II priority list exists —
 * Zhang et al. 2022, Earth System Science Data, DOI 10.12380/Glaci.msdc.000001,
 * "glacial lake dataset in the China–Pakistan Economic Corridor from 1990 to 2020" —
 * but its shapefile sits behind an academic data portal that needs a browser session
 * (and possibly registration) to pull, which this task did not do unilaterally.
 * Importing it is the natural next step once someone downloads the file.
 */

export type LakeSeed = {
  slug: string;
  name: string;
  valley: string;
  district: string;
  damType: 'moraine' | 'bedrock' | 'ice' | 'unknown';
  glacierContact: boolean;
  historicalGlof: boolean;
  lon: number;
  lat: number;
  source: string;
  sourceUrl: string;
};

export const LAKE_SEEDS: LakeSeed[] = [
  {
    slug: 'shishper',
    name: 'Shishper (Hassanabad) glacial lake',
    valley: 'Hassanabad, Hunza',
    district: 'Hunza',
    damType: 'ice',
    glacierContact: true,
    historicalGlof: true,
    lon: 74.61,
    lat: 36.4,
    source:
      'Ali et al., "Formation of a hazardous ice-dammed glacier lake: a case study of anomalous behavior of Hassanabad glacier system in the Karakoram", Discover Applied Sciences (Springer Nature), 2020',
    sourceUrl: 'https://link.springer.com/article/10.1007/s42452-020-2989-4',
  },
  {
    slug: 'khurdopin',
    name: 'Khurdopin glacial lake',
    valley: 'Shimshal, Hunza',
    district: 'Hunza',
    damType: 'ice',
    glacierContact: true,
    historicalGlof: true,
    lon: 75.5083,
    lat: 36.3383,
    source:
      '"Brief communication: The Khurdopin glacier surge revisited – extreme flow velocities and formation of a dammed lake in 2017", The Cryosphere (Copernicus), 2018',
    sourceUrl: 'https://tc.copernicus.org/articles/12/95/2018/',
  },
  {
    slug: 'badswat',
    name: 'Badswat glacial lake',
    valley: 'Immit, Ishkoman, Ghizer',
    district: 'Ghizer',
    damType: 'moraine',
    glacierContact: true,
    historicalGlof: true,
    lon: 74.0775,
    lat: 36.4855,
    source:
      'Midpoint of the G1/G2 glacier IDs (G074052E36491N, G074103E36480N) cited in "Determining the Events in a Glacial Disaster Chain at Badswat Glacier in the Karakoram Range Using Remote Sensing". Approximate — derived from cited glacier IDs, not a surveyed lake centroid.',
    sourceUrl:
      'https://www.researchgate.net/publication/350183638_Determining_the_Events_in_a_Glacial_Disaster_Chain_at_Badswat_Glacier_in_the_Karakoram_Range_Using_Remote_Sensing',
  },
  {
    slug: 'passu',
    name: 'Passu glacial pond',
    valley: 'Gojal, Hunza',
    district: 'Hunza',
    damType: 'unknown',
    glacierContact: true,
    historicalGlof: false,
    lon: 74.77,
    lat: 36.47,
    source:
      'Wikipedia: Passu Glacier (geographic coordinate only; no specific GLOF event documented for this pond in the sources checked for this seed)',
    sourceUrl: 'https://en.wikipedia.org/wiki/Passu_Glacier',
  },
  {
    slug: 'ghulkin',
    name: 'Ghulkin glacial pond',
    valley: 'Gojal, Hunza',
    district: 'Hunza',
    damType: 'unknown',
    glacierContact: true,
    historicalGlof: false,
    lon: 74.856,
    lat: 36.4653,
    source:
      'AikQaum geographic profile of Ghulkin Glacier (non-academic source; coordinate only, no specific GLOF event verified for this seed)',
    sourceUrl:
      'https://aikqaum.com/ghulkin-glacier-a-natural-wonder-in-the-karakoram-range-of-pakistan/',
  },
  {
    slug: 'batura',
    name: 'Batura glacier snout ponds',
    valley: 'Gojal, Hunza',
    district: 'Hunza',
    damType: 'unknown',
    glacierContact: true,
    historicalGlof: false,
    lon: 74.65,
    lat: 36.53,
    source:
      'Wikipedia: Batura Glacier (geographic coordinate only; no specific GLOF event documented for this pond in the sources checked for this seed)',
    sourceUrl: 'https://en.wikipedia.org/wiki/Batura_Glacier',
  },
];
