import * as fs from 'fs';
import * as path from 'path';

// Bounding box for Jaipur (roughly 10x10 km)
const CENTER_LAT = 26.9124;
const CENTER_LNG = 75.7873;
const LAT_OFFSET = 0.045; // ~5km
const LNG_OFFSET = 0.050; // ~5km

const MIN_LAT = CENTER_LAT - LAT_OFFSET;
const MAX_LAT = CENTER_LAT + LAT_OFFSET;
const MIN_LNG = CENTER_LNG - LNG_OFFSET;
const MAX_LNG = CENTER_LNG + LNG_OFFSET;

// Helper to generate a random number within a range
function randNum(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// Helper to generate random item from array
function randItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Generate random date within the last year
function randDateLastYear(): string {
  const now = new Date();
  const past = new Date();
  past.setFullYear(now.getFullYear() - 1);
  const randTime = randNum(past.getTime(), now.getTime());
  return new Date(randTime).toISOString();
}

// Hotspots to cluster events
const HOTSPOTS = [
  { lat: CENTER_LAT + 0.01, lng: CENTER_LNG + 0.01, radius: 0.01 },
  { lat: CENTER_LAT - 0.02, lng: CENTER_LNG - 0.015, radius: 0.012 },
  { lat: CENTER_LAT + 0.015, lng: CENTER_LNG - 0.02, radius: 0.008 }
];

function generatePoint(): { lat: number; lng: number } {
  // 60% chance to be in a hotspot
  if (Math.random() < 0.6) {
    const hotspot = randItem(HOTSPOTS);
    // Rough circular offset
    const angle = randNum(0, 2 * Math.PI);
    const r = randNum(0, hotspot.radius);
    return {
      lat: hotspot.lat + r * Math.sin(angle),
      lng: hotspot.lng + r * Math.cos(angle)
    };
  }
  // Otherwise random in bounding box
  return {
    lat: randNum(MIN_LAT, MAX_LAT),
    lng: randNum(MIN_LNG, MAX_LNG)
  };
}

// 1. Generate Crime Data
const CRIME_CATEGORIES = ['theft', 'assault', 'robbery', 'harassment', 'vehicle_theft', 'other'];
const TIME_OF_DAY = ['morning', 'afternoon', 'evening', 'night'];

const crimes = [];
for (let i = 1; i <= 300; i++) {
  const { lat, lng } = generatePoint();
  crimes.push({
    id: `C${i.toString().padStart(4, '0')}`,
    latitude: lat,
    longitude: lng,
    category: randItem(CRIME_CATEGORIES),
    severity: Math.floor(randNum(1, 6)), // 1 to 5
    date: randDateLastYear(),
    time_of_day: randItem(TIME_OF_DAY),
    status: randItem(['reported', 'resolved', 'reported']) // Bias towards reported
  });
}

// 2. Generate Accident Data
const ACCIDENT_TYPES = ['pedestrian', 'vehicle_collision', 'hit_and_run', 'two_wheeler'];
const SEVERITIES = ['minor', 'major', 'fatal'];
const ROAD_TYPES = ['highway', 'main_road', 'residential'];

const accidents = [];
for (let i = 1; i <= 150; i++) {
  const { lat, lng } = generatePoint();
  accidents.push({
    id: `A${i.toString().padStart(4, '0')}`,
    latitude: lat,
    longitude: lng,
    accident_type: randItem(ACCIDENT_TYPES),
    severity: randItem(SEVERITIES),
    date: randDateLastYear(),
    time_of_day: randItem(TIME_OF_DAY),
    road_type: randItem(ROAD_TYPES)
  });
}

// 3. Generate Police Stations
const policeStations = [];
for (let i = 1; i <= 15; i++) {
  // Police stations are more evenly distributed
  const lat = randNum(MIN_LAT, MAX_LAT);
  const lng = randNum(MIN_LNG, MAX_LNG);
  policeStations.push({
    id: `P${i.toString().padStart(3, '0')}`,
    name: `Station ${i}`,
    latitude: lat,
    longitude: lng,
    jurisdiction_area_code: `JA-${Math.floor(randNum(100, 999))}`,
    contact: `555-${Math.floor(randNum(1000, 9999))}`,
    response_time_avg_minutes: Math.floor(randNum(5, 21))
  });
}

// Save to disk
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

fs.writeFileSync(path.join(dataDir, 'crime_data.json'), JSON.stringify(crimes, null, 2));
fs.writeFileSync(path.join(dataDir, 'accident_data.json'), JSON.stringify(accidents, null, 2));
fs.writeFileSync(path.join(dataDir, 'police_stations.json'), JSON.stringify(policeStations, null, 2));

console.log('Successfully generated dummy data in src/data/');
