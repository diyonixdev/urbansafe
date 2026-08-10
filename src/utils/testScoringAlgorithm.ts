import { calculate_route_safety_score } from './safetyScoringAlgorithm';

// Helper to generate route coordinates in a line
function createRoute(startLat: number, startLng: number, steps: number, latDelta: number, lngDelta: number) {
  const route = [];
  for (let i = 0; i < steps; i++) {
    route.push({ lat: startLat + i * latDelta, lng: startLng + i * lngDelta });
  }
  return route;
}

console.log('--- Testing Safety Scoring Algorithm ---\n');

// 1. Hotspot Route (passing through the generated hotspot near CENTER_LAT + 0.01)
const hotspotRoute = createRoute(26.9124 + 0.008, 75.7873 + 0.008, 10, 0.0005, 0.0005);
console.log('Route 1: Hotspot Route');
console.log(JSON.stringify(calculate_route_safety_score(hotspotRoute, { travel_time_of_day: 'night' }), null, 2));
console.log('\n');

// 2. Clean Route (far away from hotspots)
const cleanRoute = createRoute(26.9124 - 0.04, 75.7873 + 0.04, 10, 0.0005, 0.0005);
console.log('Route 2: Clean/Far Route');
console.log(JSON.stringify(calculate_route_safety_score(cleanRoute, { travel_time_of_day: 'morning' }), null, 2));
console.log('\n');

// 3. Mixed Route (crosses the grid)
const mixedRoute = createRoute(26.9124 - 0.02, 75.7873 - 0.01, 20, 0.002, 0.001);
console.log('Route 3: Mixed Route');
console.log(JSON.stringify(calculate_route_safety_score(mixedRoute), null, 2));
