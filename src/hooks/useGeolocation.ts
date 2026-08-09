import { useState, useEffect, useCallback } from 'react';

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
  const [refreshVersion, setRefreshVersion] = useState(0);
  const refresh = useCallback(() => setRefreshVersion((version) => version + 1), []);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setLocation((prev) => ({
        ...prev,
        error: 'Geolocation is not supported by your browser.',
        permission: 'unsupported',
      }));
      return;
    }

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

<<<<<<< HEAD
    let watchId: number;
    // Start watching immediately
    watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
=======
    let watchId: number | undefined;

    // Start watching immediately. In insecure contexts (e.g. http://LAN-IP)
    // or under a blocked permissions policy the browser throws synchronously
    // instead of calling the error callback — never let that escape.
    try {
      watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    } catch {
      setLocation((prev) => ({
        ...prev,
        error: "Location access is not available in this context.",
        permission: 'unsupported',
      }));
      return;
    }

    // A user-initiated refresh asks for a new fix immediately while keeping
    // the existing watch active for later, meaningful movement updates.
    if (refreshVersion > 0) {
      try {
        navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      } catch {
        // The watch above remains active; a synchronous throw here is not fatal.
      }
    }
>>>>>>> 165fa26 (Add dynamic location and route safety features)

    // Try to get permission status for UI if available (fails gracefully if unsupported)
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'prompt') {
           setLocation((prev) => ({ ...prev, permission: 'prompt' }));
        } else if (result.state === 'denied') {
           setLocation((prev) => ({ ...prev, permission: 'denied', error: 'Location permission denied by user.' }));
        } else if (result.state === 'granted') {
           setLocation((prev) => ({ ...prev, permission: 'granted' }));
        }
        
        // Listen for permission changes
        result.onchange = () => {
           if (result.state === 'denied') {
              setLocation((prev) => ({ ...prev, permission: 'denied', error: 'Location permission denied by user.' }));
           } else if (result.state === 'granted') {
              setLocation((prev) => ({ ...prev, permission: 'granted' }));
           }
        }
      }).catch(() => {
        // Ignore errors if permissions API is acting up
      });
    }

    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
<<<<<<< HEAD
  }, []);
=======
  }, [refreshVersion]);
>>>>>>> 165fa26 (Add dynamic location and route safety features)

  return { ...location, refresh };
}
