/**
 * Curated named-glacier register for Gilgit-Baltistan / Chitral (issue #14).
 *
 * Two kinds of record, kept deliberately distinct (docs/ai/decisions/0002 applies to
 * glaciers exactly as it does to lakes — nothing is padded to make the UI look full):
 *
 *  - RGI_MATCHED: identity confirmed against RGI v7.0 by RGI ID and/or RGI's own
 *    `glac_name`, or — for outlines RGI leaves unnamed — spatially, by the cited point
 *    lying inside the outline (evidence recorded in each record's notes). Every
 *    measured attribute (centroid, area, max length, elevation
 *    range, outline date) is read from `rgi7-region14-extract.csv` at seed time —
 *    none of it is typed in here.
 *  - UNMATCHED: real named features (GeoNames, a paper, or USGS) with no RGI v7.0
 *    outline of their own, so no RGI measurements; `source` holds the citation. Most are
 *    tributaries that RGI v7.0 maps inside a larger glacier's outline; giving them the
 *    parent's area would be fabricating a measurement. `measured` holds only values
 *    the cited source states (checked against its text), dated as the source dates
 *    them; anything the source doesn't state stays NULL.
 *
 * `district` is the geoBoundaries PAK ADM2 (2019) district containing the glacier's RGI
 * terminus point (RGI_MATCHED) or its cited point (UNMATCHED) — the terminus, because
 * that is where the downstream communities are. Siachen and Bilafond are deliberately
 * left blank (disputed area). The seed resolves names against the districts table and
 * leaves district_id NULL, with a warning, where a district row doesn't exist yet.
 *
 * See src/glaciers/data/README.md for how the extract was produced.
 */

export const RGI_SOURCE =
  'RGI v7.0 (RGI Consortium 2023), doi:10.5067/f6jmovy5navz';
export const RGI_SOURCE_URL = 'https://doi.org/10.5067/f6jmovy5navz';
export const RGI_EXTRACT_FILE = 'rgi7-region14-extract.csv';

/** Gilgit-Baltistan + Chitral envelope used to cut the RGI extract; verify-glaciers enforces it. */
export const REGION_BBOX = {
  minLat: 34.5,
  maxLat: 37.2,
  minLng: 71.0,
  maxLng: 77.9,
} as const;

export interface RgiMatchedGlacier {
  name: string;
  rgiId: string;
  status: string;
  district?: string;
  notes: string;
}

/** Values stated in the record's own `source`, with the date they describe. */
export interface CitedMeasurement {
  /** ISO date; notes state the precision the source actually gives. */
  observedAt: string;
  lengthKm?: number;
  areaKm2?: number;
  elevationMinM?: number;
  elevationMaxM?: number;
}

export interface UnmatchedGlacier {
  name: string;
  lat: number;
  lng: number;
  status: string;
  district?: string;
  source: string;
  sourceUrl?: string;
  /** Only values the cited source states; omitted when none were found. */
  measured?: CitedMeasurement;
  notes: string;
}

export const RGI_MATCHED: RgiMatchedGlacier[] = [
  {
    name: 'Baltoro Glacier',
    rgiId: 'RGI2000-v7.0-G-14-11612',
    status: 'unknown',
    district: 'Shigar',
    notes:
      'Major Karakoram glacier. RGI v7.0 outline includes the K2/Godwin-Austen, Trango and Uli Biaho tributaries.',
  },
  {
    name: 'Biafo Glacier',
    rgiId: 'RGI2000-v7.0-G-14-23729',
    status: 'unknown',
    district: 'Shigar',
    notes: 'Major Karakoram glacier.',
  },
  {
    name: 'Hispar Glacier',
    rgiId: 'RGI2000-v7.0-G-14-21670',
    status: 'unknown',
    district: 'Nagar',
    notes:
      'Major Karakoram glacier. RGI v7.0 outline includes the Pumarikish, Ghandershish and Haigatum tributaries.',
  },
  {
    name: 'Batura Glacier',
    rgiId: 'RGI2000-v7.0-G-14-08687',
    status: 'unknown',
    district: 'Hunza',
    notes: 'Major glacier in upper Hunza.',
  },
  {
    name: 'Panmah Glacier',
    rgiId: 'RGI2000-v7.0-G-14-12063',
    status: 'unknown',
    district: 'Shigar',
    notes: 'Karakoram glacier draining to the Braldu.',
  },
  {
    name: 'Siachen Glacier',
    rgiId: 'RGI2000-v7.0-G-14-20040',
    status: 'unknown',
    notes:
      'RGI v7.0 name: "IN5Q151B0013 Siachen Glacier". District intentionally blank: disputed area (CryoHealth team decision 2026-10-06).',
  },
  {
    name: 'Khurdopin Glacier',
    rgiId: 'RGI2000-v7.0-G-14-21665',
    status: 'unknown',
    district: 'Hunza',
    notes:
      'Surge-type glacier; 2017 surge dammed the Shimshal river ("The Khurdopin glacier surge revisited", The Cryosphere 2018, https://tc.copernicus.org/articles/12/95/2018/).',
  },
  {
    name: 'Yazghil Glacier',
    rgiId: 'RGI2000-v7.0-G-14-21865',
    status: 'unknown',
    district: 'Hunza',
    notes: 'RGI v7.0 name: "Yazgil Glacier".',
  },
  {
    name: 'Bilafond Glacier',
    rgiId: 'RGI2000-v7.0-G-14-19917',
    status: 'unknown',
    notes:
      'Matched by RGI v7.0 glacier name. District intentionally blank: disputed area (CryoHealth team decision 2026-10-06).',
  },
  {
    name: 'Momhil Glacier',
    rgiId: 'RGI2000-v7.0-G-14-21955',
    status: 'unknown',
    district: 'Hunza',
    notes: 'Matched by RGI v7.0 glacier name.',
  },
  {
    name: 'Mulungutti Glacier',
    rgiId: 'RGI2000-v7.0-G-14-21842',
    status: 'unknown',
    district: 'Hunza',
    notes: 'Matched by RGI v7.0 glacier name.',
  },
  {
    name: 'Lupghar Yaz Glacier',
    rgiId: 'RGI2000-v7.0-G-14-21947',
    status: 'unknown',
    district: 'Hunza',
    notes:
      'RGI v7.0 spelling. Previously seeded as "Lunghar Yaz Glacier" from GeoNames; that GeoNames point lies inside this outline.',
  },
  {
    name: 'Qoz Yaz Glacier',
    rgiId: 'RGI2000-v7.0-G-14-07930',
    status: 'unknown',
    district: 'Hunza',
    notes: 'RGI v7.0 name: "Koz Yaz Glacier".',
  },
  {
    name: 'Salili Glacier',
    rgiId: 'RGI2000-v7.0-G-14-24190',
    status: 'unknown',
    district: 'Gilgit',
    notes: 'RGI v7.0 name: "Salili Glacier I".',
  },
  {
    name: 'Bazain Glacier',
    rgiId: 'RGI2000-v7.0-G-14-26493',
    status: 'unknown',
    district: 'Astore',
    notes: 'RGI v7.0 name: "Bazhin Glacier" (Nanga Parbat, Rupal side).',
  },
  {
    name: 'Thoshai Glacier',
    rgiId: 'RGI2000-v7.0-G-14-26588',
    status: 'unknown',
    district: 'Astore',
    notes: 'RGI v7.0 name: "Toshain Glacier".',
  },
  {
    name: 'Hassanabad Glacier (Shishper)',
    rgiId: 'RGI2000-v7.0-G-14-08450',
    status: 'surging',
    district: 'Hunza',
    notes:
      'RGI v7.0 name: "Hasanabad Glacier II" (identified as Shishper by the CryoHealth team). Status "surging" follows the project status vocabulary; RGI v7.0 flags it as surge-type (surge_type = 3). Hazard context: Ali et al., Discover Applied Sciences 2020, https://link.springer.com/article/10.1007/s42452-020-2989-4',
  },
  {
    name: 'Chogo Lungma Glacier',
    rgiId: 'RGI2000-v7.0-G-14-11166',
    status: 'unknown',
    district: 'Shigar',
    notes:
      'Unnamed in RGI v7.0; matched spatially: the GeoNames point (35.946459, 75.121054) lies inside this outline. Name per the CKNP (Central Karakoram National Park) glacier inventory, as cited by the CryoHealth team.',
  },
  {
    name: 'Shani Glacier',
    rgiId: 'RGI2000-v7.0-G-14-10888',
    status: 'unknown',
    district: 'Gilgit',
    notes:
      'Unnamed in RGI v7.0; matched spatially: the GeoNames point (36.310339, 74.079537) lies inside this outline. Name per GeoNames/Wikidata and the Pakistan Meteorological Department, as cited by the CryoHealth team.',
  },
  {
    name: 'Mashish Glacier',
    rgiId: 'RGI2000-v7.0-G-14-21924',
    status: 'unknown',
    district: 'Nagar',
    notes:
      'Unnamed in RGI v7.0; matched spatially: the GeoNames 7449710 point (36.2144, 75.03357) lies inside this outline. Also known as Makudas Har Glacier.',
  },
  {
    name: 'Mazeno Glacier',
    rgiId: 'RGI2000-v7.0-G-14-26546',
    status: 'unknown',
    district: 'Astore',
    notes:
      'Unnamed in RGI v7.0; matched spatially: the GeoNames point (35.197654, 74.48917) lies inside this outline, and it is the only outline within 600 m of the GeoNames/OSM point (35.2023, 74.49182). A GLIMS submission names this outline "Mazeno Glacier I"; RGI names Mazeno Glacier II/III separately (~1.2 km away). Also known as Masfino Glacier.',
  },
  {
    name: 'Badswat Glacier (G1)',
    rgiId: 'RGI2000-v7.0-G-14-08625',
    status: 'unknown',
    district: 'Ghizer',
    notes:
      'Unnamed in RGI v7.0; matched spatially: the cited glacier ID G074052E36491N lies inside this outline (RGI glims_id G074051E36491N). The second cited glacier, G2 (G074103E36480N), is RGI2000-v7.0-G-14-08628 and is not seeded. Source: "Determining the Events in a Glacial Disaster Chain at Badswat Glacier in the Karakoram Range Using Remote Sensing", https://www.researchgate.net/publication/350183638; the team also cites the GAMDAM inventory.',
  },
  {
    name: 'Passu Glacier',
    rgiId: 'RGI2000-v7.0-G-14-23581',
    status: 'unknown',
    district: 'Hunza',
    notes:
      'RGI v7.0 name: "Pasu Glacier". Previously a dev-seed-only row (Wikipedia citation); that point lies inside this outline.',
  },
  {
    name: 'Ghulkin Glacier',
    rgiId: 'RGI2000-v7.0-G-14-23615',
    status: 'unknown',
    district: 'Hunza',
    notes: 'Matched by RGI v7.0 glacier name.',
  },
];

/** Previous seed names that RGI_MATCHED renames, so re-seeding updates the old row instead of duplicating it. */
export const RENAMED_FROM: Record<string, string> = {
  'Lupghar Yaz Glacier': 'Lunghar Yaz Glacier',
  'Badswat Glacier (G1)': 'Badswat Glacier (G1/G2)',
};

const GEONAMES_COORDS = 'Coordinates: GeoNames named feature';

const NO_MEASUREMENT =
  'GeoNames named-feature coordinates; no separate RGI v7.0 outline and no published measurement found, so area, length and elevation are intentionally not set';

/** USGS PP 1386-F chapter F-4, Table 3 ("Glaciers of northern Pakistan selected for remote-sensing analysis"). */
const USGS_F4 =
  'Shroder, J.F., Jr. & Bishop, M.P. (2010), "Glaciers of Pakistan", USGS Professional Paper 1386-F (Glaciers of Asia), chapter F-4, Table 3';
const USGS_F4_URL = 'https://pubs.usgs.gov/pp/p1386f/pdf/F4_Pakistan.pdf';

export const UNMATCHED: UnmatchedGlacier[] = [
  {
    name: 'K2 / Godwin-Austen Glacier',
    lat: 35.7665721011735,
    lng: 76.5225219726562,
    status: 'unknown',
    district: 'Shigar',
    source: `${USGS_F4}, row 135 "K2-Godwin Austen": length 18 km. ${GEONAMES_COORDS} (K2 Glacier, alternate name Godwin Austen Glacier).`,
    sourceUrl: USGS_F4_URL,
    measured: { observedAt: '1979-08-18', lengthKm: 18 },
    notes:
      'Tributary: in RGI v7.0 this point lies inside the Baltoro Glacier outline (RGI2000-v7.0-G-14-11612); no separate outline exists. Observation date is that of the Landsat 3 RBV image Table 3 lists for this glacier (18 Aug 1979). The CKNP site also gives "roughly 18 km" (uncited).',
  },
  {
    name: 'Trango Glacier',
    lat: 35.798714,
    lng: 76.122211,
    status: 'unknown',
    district: 'Shigar',
    source: `${USGS_F4}, row 130 "Trango": length 16 km. ${GEONAMES_COORDS}.`,
    sourceUrl: USGS_F4_URL,
    measured: { observedAt: '1979-08-18', lengthKm: 16 },
    notes:
      'Tributary: in RGI v7.0 this point lies inside the Baltoro Glacier outline (RGI2000-v7.0-G-14-11612). Observation date is that of the Landsat 3 RBV image Table 3 lists for this glacier (18 Aug 1979). GeoNames also records it as Trahonge Glacier. The team also cites an IUCN Karakoram source; exact reference not yet recorded.',
  },
  {
    name: 'Uli Biaho Glacier',
    lat: 35.722431,
    lng: 76.143029,
    status: 'unknown',
    district: 'Shigar',
    source: `${USGS_F4}, row 129 "Uli Biaho": length 8 km. ${GEONAMES_COORDS}.`,
    sourceUrl: USGS_F4_URL,
    measured: { observedAt: '1979-08-18', lengthKm: 8 },
    notes:
      'Tributary: in RGI v7.0 this point lies inside the Baltoro Glacier outline (RGI2000-v7.0-G-14-11612). Observation date is that of the Landsat 3 RBV image Table 3 lists for this glacier (18 Aug 1979). Table 3 prints its latitude as 35°13′N, apparently a typo for 35°43′N (beside Trango). GeoNames alternate name: Biaho Glacier.',
  },
  {
    name: 'Pumarikish Glacier',
    lat: 36.153417,
    lng: 75.210714,
    status: 'unknown',
    district: 'Shigar',
    source: `Wake, C.P. & Searle, M.P. (1993), "Rapid advance of Pumarikish Glacier, Hispar Glacier Basin, Karakoram Himalaya", Journal of Glaciology 39(131), 204–206, doi:10.3189/S0022143000015847: "approximately 7 km long". ${GEONAMES_COORDS}.`,
    sourceUrl: 'https://doi.org/10.3189/S0022143000015847',
    measured: { observedAt: '1989-07-01', lengthKm: 7 },
    notes:
      'Hispar tributary: in RGI v7.0 this point lies inside the Hispar Glacier outline (RGI2000-v7.0-G-14-21670). The paper reports a ~1 km advance and snout thickening between August 1985 and July–August 1989; the observation is stored as 1989-07-01 (month precision). USGS PP 1386-F Table 3 (row 66) gives 8 km.',
  },
  {
    name: 'Ghandershish Glacier',
    lat: 36.108855,
    lng: 75.109365,
    status: 'unknown',
    district: 'Nagar',
    source: `${NO_MEASUREMENT}. GeoNames ID 1178643.`,
    sourceUrl: 'https://www.geonames.org/1178643',
    notes:
      'Tributary: in RGI v7.0 this point lies inside the Hispar Glacier outline (RGI2000-v7.0-G-14-21670). Also known as Ghandir Chhish Glacier. Not listed in USGS PP 1386-F Table 3.',
  },
  {
    name: 'Haigatum Glacier',
    lat: 36.075856,
    lng: 75.232116,
    status: 'unknown',
    district: 'Shigar',
    source: `${USGS_F4}, row 69 "Haigatum" (Hispar tributary, 36°04′N 75°13′E): length 5 km. ${GEONAMES_COORDS}.`,
    sourceUrl: USGS_F4_URL,
    measured: { observedAt: '1979-08-02', lengthKm: 5 },
    notes:
      'Hispar tributary: in RGI v7.0 this point lies inside the Hispar Glacier outline (RGI2000-v7.0-G-14-21670). Observation date is that of the Landsat 3 RBV image Table 3 lists for this glacier (2 Aug 1979). Also known as Haigutum Glacier.',
  },
  {
    name: 'Miar Glacier',
    lat: 36.118023,
    lng: 74.840878,
    status: 'unknown',
    district: 'Nagar',
    source: `Young, G.J. & Schmok, J.P. (1989), "Ice Loss in the Ablation Area of a Himalayan Glacier; Studies on Miar Glacier, Karakoram Mountains, Pakistan", Annals of Glaciology 13, 289–293, doi:10.3189/S0260305500008077: "approximately 28 km in length", "an area of 53 km2", "2850 m at its snout to about 7000 m". ${GEONAMES_COORDS}.`,
    sourceUrl: 'https://doi.org/10.3189/S0260305500008077',
    measured: {
      observedAt: '1987-07-01',
      lengthKm: 28,
      areaKm2: 53,
      elevationMinM: 2850,
      elevationMaxM: 7000,
    },
    notes:
      'Tributary: in RGI v7.0 this point lies inside the Barpu Glacier outline (RGI2000-v7.0-G-14-11090). Hopar valley, Nagar. Field work summers 1986–87, soundings June–July 1987; the observation is stored as 1987-07-01 (month precision). USGS PP 1386-F Table 3 (row 74, "Miar or Shalhubu") gives 23 km.',
  },
  {
    name: 'Ghompot Glacier',
    lat: 35.111266,
    lng: 76.136977,
    status: 'unknown',
    district: 'Kharmang',
    source: NO_MEASUREMENT,
    notes:
      'No RGI v7.0 outline contains this point (nearest outline ~4 km away), and no published inventory or paper found names it. GeoNames places it in Ghanche District.',
  },
];
