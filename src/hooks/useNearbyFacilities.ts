import { useState, useEffect, useRef } from 'react';
import { calculateDistance } from '@/utils/distance';

export type FacilityCategory = 'police' | 'hospital' | 'fire_station' | 'pharmacy';

export interface Facility {
  id: number;
  category: FacilityCategory;
  name: string;
  address: string | null;
  phone: string | null;
  distance: number;
  latitude: number;
  longitude: number;
  emergencyInfo: string | null;
}

export function useNearbyFacilities(latitude: number | null, longitude: number | null, radiusKm: number = 3) {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // To avoid fetching on every tiny movement, keep track of last fetched location
  const lastFetchedLocation = useRef<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    if (!latitude || !longitude) return;

    // Throttle: Only fetch if we haven't fetched yet, or if we moved more than 500 meters
    if (lastFetchedLocation.current) {
      const dist = calculateDistance(
        lastFetchedLocation.current.lat,
        lastFetchedLocation.current.lon,
        latitude,
        longitude
      );
      if (dist < 0.5) {
        // We moved less than 500 meters, just recalculate distances to existing facilities
        setFacilities((prev) => 
          prev.map(f => ({
            ...f,
            distance: calculateDistance(latitude, longitude, f.latitude, f.longitude)
          })).sort((a, b) => a.distance - b.distance)
        );
        return;
      }
    }

    const fetchFacilities = async () => {
      setLoading(true);
      setError(null);
      lastFetchedLocation.current = { lat: latitude, lon: longitude };

      // Convert km to meters for Overpass radius
      const radiusMeters = radiusKm * 1000;
      
      const query = `
        [out:json][timeout:25];
        (
          node["amenity"="police"](around:${radiusMeters},${latitude},${longitude});
          way["amenity"="police"](around:${radiusMeters},${latitude},${longitude});
          
          node["amenity"="hospital"](around:${radiusMeters},${latitude},${longitude});
          way["amenity"="hospital"](around:${radiusMeters},${latitude},${longitude});
          
          node["amenity"="fire_station"](around:${radiusMeters},${latitude},${longitude});
          way["amenity"="fire_station"](around:${radiusMeters},${latitude},${longitude});
          
          node["amenity"="pharmacy"](around:${radiusMeters},${latitude},${longitude});
          way["amenity"="pharmacy"](around:${radiusMeters},${latitude},${longitude});
        );
        out center;
      `;

      try {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: query
        });

        if (!response.ok) {
          throw new Error('Failed to fetch from Overpass API');
        }

        const data = await response.json();
        
        const mappedFacilities: Facility[] = data.elements.map((el: any) => {
          const tags = el.tags || {};
          const lat = el.lat || el.center.lat;
          const lon = el.lon || el.center.lon;
          const category = tags.amenity as FacilityCategory;
          
          let name = tags.name || tags['name:en'] || `Unknown ${category.replace('_', ' ')}`;
          let address = null;
          if (tags['addr:street']) {
              address = `${tags['addr:housenumber'] ? tags['addr:housenumber'] + ' ' : ''}${tags['addr:street']}`;
          } else if (tags['addr:full']) {
              address = tags['addr:full'];
          }
          
          let emergencyInfo = null;
          if (category === 'hospital' && tags.emergency === 'yes') {
             emergencyInfo = 'Emergency room available';
          }

          return {
            id: el.id,
            category,
            name,
            address,
            phone: tags.phone || tags['contact:phone'] || null,
            distance: calculateDistance(latitude, longitude, lat, lon),
            latitude: lat,
            longitude: lon,
            emergencyInfo
          };
        });

        // Sort by distance
        mappedFacilities.sort((a, b) => a.distance - b.distance);
        setFacilities(mappedFacilities);

      } catch (err: any) {
        console.error("Overpass API Error:", err);
        setError("Could not load nearby facilities. Please try again later.");
        // Reset last fetched so we try again next time coordinates change
        lastFetchedLocation.current = null;
      } finally {
        setLoading(false);
      }
    };

    fetchFacilities();
  }, [latitude, longitude, radiusKm]);

  return { facilities, loading, error };
}
