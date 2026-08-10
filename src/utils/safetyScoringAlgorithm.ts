import { SCORE_WEIGHTS, DECAY_CONFIG, CORRIDOR_WIDTH_METERS, SEVERITY_CONFIG } from './scoreConfig';
import crimes from '../data/crime_data.json';
import accidents from '../data/accident_data.json';
import policeStations from '../data/police_stations.json';

// Haversine formula to get distance in meters
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Distance from point to line segment
function getDistancePointToSegment(
  pLat: number, pLon: number,
  vLat: number, vLon: number,
  wLat: number, wLon: number
): number {
  const R = 6371e3;
  const lat1 = vLat * Math.PI / 180;
  const lon1 = vLon * Math.PI / 180;
  const lat2 = wLat * Math.PI / 180;
  const lon2 = wLon * Math.PI / 180;
  const lat3 = pLat * Math.PI / 180;
  const lon3 = pLon * Math.PI / 180;

  const x1 = R * lon1 * Math.cos(lat1);
  const y1 = R * lat1;
  const x2 = R * lon2 * Math.cos(lat2);
  const y2 = R * lat2;
  const x3 = R * lon3 * Math.cos(lat3);
  const y3 = R * lat3;

  const l2 = (x1 - x2) ** 2 + (y1 - y2) ** 2;
  if (l2 === 0) return getDistanceInMeters(pLat, pLon, vLat, vLon);
  
  let t = ((x3 - x1) * (x2 - x1) + (y3 - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);
  
  return Math.sqrt((x3 - projX) ** 2 + (y3 - projY) ** 2);
}

function isWithinBuffer(pointLat: number, pointLon: number, route: {lat: number, lng: number}[], bufferMeters: number): boolean {
  if (route.length === 1) {
    return getDistanceInMeters(pointLat, pointLon, route[0].lat, route[0].lng) <= bufferMeters;
  }
  for (let i = 0; i < route.length - 1; i++) {
    const dist = getDistancePointToSegment(
      pointLat, pointLon,
      route[i].lat, route[i].lng,
      route[i+1].lat, route[i+1].lng
    );
    if (dist <= bufferMeters) {
      return true;
    }
  }
  return false;
}

export interface SafetyScoreOptions {
  travel_time_of_day?: 'morning' | 'afternoon' | 'evening' | 'night';
  bufferMeters?: number;
  weightCrime?: number;
  weightAccident?: number;
  weightPolice?: number;
  decayType?: string;
  halfLifeMonths?: number;
  useSeverity?: boolean;
}

export function calculate_route_safety_score(
  route_coordinates: {lat: number, lng: number}[],
  options: SafetyScoreOptions = {}
) {
  const {
    travel_time_of_day,
    bufferMeters = CORRIDOR_WIDTH_METERS,
    weightCrime = SCORE_WEIGHTS.crime,
    weightAccident = SCORE_WEIGHTS.accident,
    weightPolice = SCORE_WEIGHTS.policeProximity,
    decayType = DECAY_CONFIG.type,
    halfLifeMonths = DECAY_CONFIG.halfLifeMonths,
    useSeverity = SEVERITY_CONFIG.enabled
  } = options;

  // Datasets are imported statically at the top of the file

  const flagged_points: any[] = [];
  
  // Tracking granular data
  let minDecayApplied = Infinity;
  let maxDecayApplied = -Infinity;
  const crimeContributors: { id: string, category: string, raw_penalty: number, decay: number, final_penalty: number, monthsOld: number }[] = [];
  const accidentContributors: { id: string, type: string, final_penalty: number }[] = [];

  // 1. Crime Score
  let crimePenalty = 0;
  for (const crime of crimes) {
    if (isWithinBuffer(crime.latitude, crime.longitude, route_coordinates, bufferMeters)) {
      // Weight severity
      let penalty = useSeverity ? crime.severity * 2 : 5; // 5 is average baseline when severity off
      
      // Time of day multiplier
      if (travel_time_of_day && crime.time_of_day === travel_time_of_day) {
        penalty *= 1.5;
      }
      
      const raw_penalty = penalty;

      // Recency decay
      const monthsOld = (Date.now() - new Date(crime.date).getTime()) / (1000 * 60 * 60 * 24 * 30);
      let decay = 1.0;
      
      if (decayType === 'exponential') {
        // penalty = base * (0.5 ^ (t / halfLife))
        decay = Math.pow(0.5, monthsOld / halfLifeMonths);
      } else if (decayType === 'linear') {
        // penalty = base * max(0, 1 - (t / 12)) -> Drops to 0 over 12 months
        decay = Math.max(0, 1 - (monthsOld / 12));
      }
      
      if (decay < minDecayApplied) minDecayApplied = decay;
      if (decay > maxDecayApplied) maxDecayApplied = decay;

      penalty *= decay;
      crimePenalty += penalty;
      
      crimeContributors.push({
        id: crime.id,
        category: crime.category,
        raw_penalty,
        decay,
        final_penalty: penalty,
        monthsOld
      });
    }
  }
  
  const crime_score = Math.max(0, 100 - crimePenalty);
  crimeContributors.sort((a, b) => b.final_penalty - a.final_penalty);
  if (crimeContributors.length > 5) {
    flagged_points.push({ reason: `${crimeContributors.length} crimes reported nearby recently.` });
  }

  // 2. Accident Score
  let accidentPenalty = 0;
  const accidentSeverityWeight: Record<string, number> = { minor: 5, major: 15, fatal: 30 };
  for (const accident of accidents) {
    if (isWithinBuffer(accident.latitude, accident.longitude, route_coordinates, bufferMeters)) {
      let penalty = 5;
      if (useSeverity) {
        penalty = accidentSeverityWeight[accident.severity] || 5;
      }
      
      if (travel_time_of_day && accident.time_of_day === travel_time_of_day) {
        penalty *= 1.5;
      }
      
      accidentPenalty += penalty;
      
      accidentContributors.push({
        id: accident.id,
        type: accident.accident_type,
        final_penalty: penalty
      });
    }
  }
  
  const accident_score = Math.max(0, 100 - accidentPenalty);
  accidentContributors.sort((a, b) => b.final_penalty - a.final_penalty);
  if (accidentContributors.length > 2) {
    flagged_points.push({ reason: `${accidentContributors.length} accidents reported along this stretch.` });
  }

  // 3. Police Proximity Score
  let minPoliceDistance = Infinity;
  for (const wp of route_coordinates) {
    for (const station of policeStations) {
      const dist = getDistanceInMeters(wp.lat, wp.lng, station.latitude, station.longitude);
      if (dist < minPoliceDistance) minPoliceDistance = dist;
    }
  }
  
  let police_proximity_score = 0;
  if (minPoliceDistance <= 1000) {
    police_proximity_score = 100;
  } else if (minPoliceDistance < 5000) {
    police_proximity_score = 100 - ((minPoliceDistance - 1000) / 4000) * 100;
  }

  const final_score = Math.round(
    (crime_score * weightCrime) +
    (accident_score * weightAccident) +
    (police_proximity_score * weightPolice)
  );

  let rating = "Low Risk";
  if (final_score < 40) rating = "High Risk";
  else if (final_score < 75) rating = "Moderate Risk";

  return {
    final_score,
    rating,
    breakdown: {
      raw_crime_score: crime_score,
      raw_accident_score: accident_score,
      raw_police_proximity_score: police_proximity_score,
      crime_score: Math.round(crime_score),
      accident_score: Math.round(accident_score),
      police_proximity_score: Math.round(police_proximity_score),
      top_crime_contributors: crimeContributors.slice(0, 5),
      top_accident_contributors: accidentContributors.slice(0, 3),
      decay_stats: {
        min_decay_multiplier: minDecayApplied === Infinity ? null : minDecayApplied,
        max_decay_multiplier: maxDecayApplied === -Infinity ? null : maxDecayApplied
      }
    },
    flagged_points
  };
}
