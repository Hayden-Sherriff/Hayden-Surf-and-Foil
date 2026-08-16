export type SurfSpot = {
  id: string;
  name: string;
  shortName: string;
  lat: number;
  lon: number;
  /** Wind direction (degrees the wind blows FROM) that is dead offshore. */
  offshoreDir: number;
  /** Swell directions the spot picks up, as [from, to] degrees clockwise. */
  swellWindow: [number, number];
  /** Swell direction that lines the bank up best. */
  idealSwellDir: number;
  /**
   * How much open-ocean swell the spot actually sees (1 = fully exposed beach).
   * The points sit behind headlands, so they run smaller than the beaches on
   * the same swell.
   */
  exposure: number;
  /**
   * How badly an off-angle swell hurts, 0-1. High for the points, which need
   * the swell to wrap onto the bank at the right angle.
   */
  refraction: number;
  notes: string;
};

/**
 * Burleigh Heads down to Duranbah. Offshore directions come from the local
 * point/beach orientation: the right-hand points face NE-E so SW-W is offshore,
 * while the east-facing beach breaks want a straight W-WNW.
 */
export const SURF_SPOTS: SurfSpot[] = [
  {
    id: "burleigh",
    name: "Burleigh Heads",
    shortName: "Burleigh",
    lat: -28.0954,
    lon: 153.4585,
    offshoreDir: 225,
    swellWindow: [45, 190],
    idealSwellDir: 135,
    exposure: 0.9,
    refraction: 0.45,
    notes:
      "Right-hand point off the bluff. Best on mid-period SE swell with SW offshore; needs 3ft+ to run past The Cove, holds up to 10ft+.",
  },
  {
    id: "palm-beach",
    name: "Palm Beach",
    shortName: "Palmy",
    lat: -28.1167,
    lon: 153.47,
    offshoreDir: 265,
    swellWindow: [45, 190],
    idealSwellDir: 110,
    exposure: 1,
    refraction: 0.15,
    notes:
      "Series of banks between Tallebudgera and Currumbin creeks. Punchy on E-SE swell with W offshore; picks up more size than the points.",
  },
  {
    id: "currumbin-alley",
    name: "Currumbin Alley",
    shortName: "The Alley",
    lat: -28.135,
    lon: 153.488,
    offshoreDir: 235,
    swellWindow: [45, 180],
    idealSwellDir: 130,
    exposure: 0.8,
    refraction: 0.35,
    notes:
      "Long sand-bottom right off the creek mouth. Handles SW-S offshore and works on bigger SE swell when the beaches close out.",
  },
  {
    id: "tugun-bilinga",
    name: "Tugun / Bilinga",
    shortName: "Tugun",
    lat: -28.152,
    lon: 153.502,
    offshoreDir: 270,
    swellWindow: [45, 190],
    idealSwellDir: 100,
    exposure: 1,
    refraction: 0.15,
    notes:
      "Open beach breaks. Consistent on E swell with W offshore, closes out over about 6ft.",
  },
  {
    id: "kirra",
    name: "Kirra",
    shortName: "Kirra",
    lat: -28.166,
    lon: 153.523,
    offshoreDir: 230,
    swellWindow: [60, 170],
    idealSwellDir: 135,
    exposure: 0.75,
    refraction: 0.55,
    notes:
      "Barrelling right point at the north end of the Superbank. Needs a solid ESE-SE swell (4ft+) and SW-W offshore to link up.",
  },
  {
    id: "greenmount",
    name: "Greenmount / Rainbow Bay",
    shortName: "Greenmount",
    lat: -28.167,
    lon: 153.538,
    offshoreDir: 225,
    swellWindow: [70, 165],
    idealSwellDir: 140,
    exposure: 0.6,
    refraction: 0.5,
    notes:
      "Sheltered inside points. Cleanest option when it is windy elsewhere; smaller than Snapper on the same swell.",
  },
  {
    id: "snapper",
    name: "Snapper Rocks / Superbank",
    shortName: "Snapper",
    lat: -28.162,
    lon: 153.55,
    offshoreDir: 225,
    swellWindow: [70, 145],
    idealSwellDir: 120,
    exposure: 0.85,
    refraction: 0.5,
    notes:
      "Best window is ENE-SE (70-145deg) mid-period swell with light SW offshore. Very south swells need 16s+ periods to wrap in.",
  },
  {
    id: "duranbah",
    name: "Duranbah (D-Bah)",
    shortName: "D-Bah",
    lat: -28.169,
    lon: 153.551,
    offshoreDir: 270,
    swellWindow: [45, 190],
    idealSwellDir: 90,
    exposure: 1.05,
    refraction: 0.2,
    notes:
      "East-facing swell magnet next to the Tweed wall. Wants E swell and W-WSW offshore; has a wave when the points are flat.",
  },
];

export type FoilSpot = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  /** Wind directions that work at all, [from, to] degrees clockwise. */
  windWindow: [number, number];
  /** The directions that make it classic. */
  idealWindWindow: [number, number];
  notes: string;
};

/**
 * Currumbin only - the creek for flat water and the Alley for wave riding.
 */
export const FOIL_SPOTS: FoilSpot[] = [
  {
    id: "currumbin-creek",
    name: "Currumbin Creek",
    lat: -28.133,
    lon: 153.483,
    windWindow: [20, 200],
    idealWindWindow: [20, 90],
    notes:
      "Flat-water launch on the north side of the bridge. NE seabreeze is the classic direction; easy launch, steep gradient into the channel.",
  },
  {
    id: "currumbin-alley",
    name: "Currumbin Alley",
    lat: -28.1355,
    lon: 153.4885,
    windWindow: [20, 200],
    idealWindWindow: [110, 200],
    notes:
      "Downwind/wave riding out the front of the creek mouth. SE-S winds give the best swell-into-wind angle on the bank.",
  },
];
