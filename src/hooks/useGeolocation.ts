import { useState, useEffect } from 'react';

export interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  timestamp: number | null;
  error: string | null;
  permission: 'prompt' | 'granted' | 'denied' | 'unsupported' | 'loading';
}

export function useGeolocation() {
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    timestamp: null,
    error: null,
    permission: 'loading',
  });

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setLocation((prev) => ({
        ...prev,
        error: 'Geolocation is not supported by your browser.',
        permission: 'unsupported',
      }));
      return;
    }

    let watchId: number;

    const handleSuccess = (position: GeolocationPosition) => {
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
        error: null,
        permission: 'granted',
      });
    };

    const handleError = (error: GeolocationPositionError) => {
      let errorMessage = 'An unknown error occurred.';
      let permStatus: LocationState['permission'] = 'granted'; // default, might have failed to get fix

      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Location permission denied by user.';
          permStatus = 'denied';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'Location information is unavailable.';
          break;
        case error.TIMEOUT:
          errorMessage = 'The request to get user location timed out.';
          break;
      }

      setLocation((prev) => ({
        ...prev,
        error: errorMessage,
        permission: permStatus,
      }));
    };

    // Check current permission state before watching (optional, but good for UI)
    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
      if (result.state === 'prompt') {
         setLocation((prev) => ({ ...prev, permission: 'prompt' }));
      } else if (result.state === 'denied') {
         setLocation((prev) => ({ ...prev, permission: 'denied', error: 'Location permission denied by user.' }));
      }
      
      // Start watching
      watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
      
      // Listen for permission changes
      result.onchange = () => {
         if (result.state === 'denied') {
            setLocation((prev) => ({ ...prev, permission: 'denied', error: 'Location permission denied by user.' }));
         }
      }
    });

    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  return location;
}
