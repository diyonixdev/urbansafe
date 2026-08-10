import { calculate_route_safety_score } from './safetyScoringAlgorithm';
import * as fs from 'fs';
import * as path from 'path';

function createRoute(startLat: number, startLng: number, steps: number, latDelta: number, lngDelta: number) {
  const route = [];
  for (let i = 0; i < steps; i++) {
    route.push({ lat: startLat + i * latDelta, lng: startLng + i * lngDelta });
  }
  return route;
}

const hotspotRoute = createRoute(26.9124 + 0.008, 75.7873 + 0.008, 10, 0.0005, 0.0005);
const cleanRoute = createRoute(26.9124 - 0.04, 75.7873 + 0.04, 10, 0.0005, 0.0005);
const mixedRoute = createRoute(26.9124 - 0.02, 75.7873 - 0.01, 20, 0.002, 0.001);

const routes = {
  Hotspot: hotspotRoute,
  Clean: cleanRoute,
  Mixed: mixedRoute
};

let mdOutput = `# Safety Score Tuning Analysis\n\n`;

// Task 2 - Current Behavior
mdOutput += `## Task 2: Current Behavior\n`;
mdOutput += `Running with default configs (Exp decay, half-life 3 months, 200m buffer, Severity ON).\n\n`;

for (const [name, route] of Object.entries(routes)) {
  const res = calculate_route_safety_score(route, { travel_time_of_day: 'night' });
  mdOutput += `### ${name} Route\n`;
  mdOutput += `- **Final Score**: ${res.final_score} (${res.rating})\n`;
  mdOutput += `- **Sub-scores**: Crime (${res.breakdown.crime_score}), Accident (${res.breakdown.accident_score}), Police (${res.breakdown.police_proximity_score})\n`;
  if (res.breakdown.decay_stats.min_decay_multiplier !== null) {
      mdOutput += `- **Decay Stats**: Oldest multiplier applied: ${res.breakdown.decay_stats.min_decay_multiplier?.toFixed(3)}, Newest: ${res.breakdown.decay_stats.max_decay_multiplier?.toFixed(3)}\n`;
  }
  mdOutput += `- **Top Crime Contributors**:\n`;
  res.breakdown.top_crime_contributors.forEach((c: any) => {
    mdOutput += `  - ID: ${c.id}, Category: ${c.category}, Penalty: ${c.final_penalty.toFixed(2)} (Age: ${c.monthsOld.toFixed(1)} mo, Decay: ${c.decay.toFixed(2)})\n`;
  });
  mdOutput += `- **Top Accident Contributors**:\n`;
  res.breakdown.top_accident_contributors.forEach((a: any) => {
    mdOutput += `  - ID: ${a.id}, Type: ${a.type}, Penalty: ${a.final_penalty.toFixed(2)}\n`;
  });
  mdOutput += `\n`;
}

// Task 3 - Sensitivity Test: Corridor Width
mdOutput += `## Task 3: Sensitivity Test - Corridor Width\n\n`;
mdOutput += `| Route | 100m Width | 200m Width | 400m Width |\n`;
mdOutput += `|---|---|---|---|\n`;
for (const [name, route] of Object.entries(routes)) {
  const w100 = calculate_route_safety_score(route, { travel_time_of_day: 'night', bufferMeters: 100 });
  const w200 = calculate_route_safety_score(route, { travel_time_of_day: 'night', bufferMeters: 200 });
  const w400 = calculate_route_safety_score(route, { travel_time_of_day: 'night', bufferMeters: 400 });
  mdOutput += `| ${name} | Score: **${w100.final_score}** <br> (C:${w100.breakdown.crime_score}, A:${w100.breakdown.accident_score}) | Score: **${w200.final_score}** <br> (C:${w200.breakdown.crime_score}, A:${w200.breakdown.accident_score}) | Score: **${w400.final_score}** <br> (C:${w400.breakdown.crime_score}, A:${w400.breakdown.accident_score}) |\n`;
}
mdOutput += `\n`;

// Task 4 - Sensitivity Test: Decay Rate
mdOutput += `## Task 4: Sensitivity Test - Decay Rate\n\n`;
mdOutput += `| Route | Exp (Half-life 1mo) | Exp (Half-life 3mo) | Exp (Half-life 6mo) | Linear (12mo) |\n`;
mdOutput += `|---|---|---|---|---|\n`;
for (const [name, route] of Object.entries(routes)) {
  const exp1 = calculate_route_safety_score(route, { travel_time_of_day: 'night', decayType: 'exponential', halfLifeMonths: 1 });
  const exp3 = calculate_route_safety_score(route, { travel_time_of_day: 'night', decayType: 'exponential', halfLifeMonths: 3 });
  const exp6 = calculate_route_safety_score(route, { travel_time_of_day: 'night', decayType: 'exponential', halfLifeMonths: 6 });
  const lin12 = calculate_route_safety_score(route, { travel_time_of_day: 'night', decayType: 'linear' });
  mdOutput += `| ${name} | ${exp1.final_score} | ${exp3.final_score} | ${exp6.final_score} | ${lin12.final_score} |\n`;
}
mdOutput += `\n`;

// Task 5 - Severity Weighting Check
mdOutput += `## Task 5: Severity Weighting Check (Hotspot Route)\n\n`;
const severityOn = calculate_route_safety_score(hotspotRoute, { travel_time_of_day: 'night', useSeverity: true });
const severityOff = calculate_route_safety_score(hotspotRoute, { travel_time_of_day: 'night', useSeverity: false });

mdOutput += `- **Crime Score (Severity ON)**: ${severityOn.breakdown.crime_score} (Raw points: ${severityOn.breakdown.raw_crime_score.toFixed(2)})\n`;
mdOutput += `- **Crime Score (Severity OFF)**: ${severityOff.breakdown.crime_score} (Raw points: ${severityOff.breakdown.raw_crime_score.toFixed(2)})\n`;
mdOutput += `- **Difference**: If severity weighting is OFF, we see a crime score of ${severityOff.breakdown.crime_score}, whereas with it ON we see ${severityOn.breakdown.crime_score}.\n\n`;

// Task 6 - Weight Split Recommendation
mdOutput += `## Task 6: Weight Split Recommendation (For Pedestrians)\n\n`;
mdOutput += `Assuming pedestrians/cyclists are the primary users, crime/harassment is a much larger deterrent than minor vehicle accidents. Police proximity remains important for general safety perception.\n`;
mdOutput += `**Proposed Split**: 50% Crime, 30% Accident, 20% Police Proximity.\n\n`;

mdOutput += `| Route | Original (40/35/25) | Proposed (50/30/20) |\n`;
mdOutput += `|---|---|---|\n`;
for (const [name, route] of Object.entries(routes)) {
  const orig = calculate_route_safety_score(route, { travel_time_of_day: 'night' });
  const prop = calculate_route_safety_score(route, { travel_time_of_day: 'night', weightCrime: 0.50, weightAccident: 0.30, weightPolice: 0.20 });
  mdOutput += `| ${name} | ${orig.final_score} | **${prop.final_score}** |\n`;
}
mdOutput += `\n`;

const outPath = path.join(process.cwd(), 'tuning_results.md');
fs.writeFileSync(outPath, mdOutput);
console.log(`Saved results to ${outPath}`);
