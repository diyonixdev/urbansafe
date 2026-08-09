import { MapPin, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { LocationState } from '@/hooks/useGeolocation';

interface LocationPermissionProps {
  location: LocationState;
  onRequestPermission: () => void;
}

export function LocationPermission({ location, onRequestPermission }: LocationPermissionProps) {
  if (location.permission === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-slate-50 rounded-2xl border border-slate-200 p-8 text-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <h3 className="text-lg font-bold text-slate-900">Checking location...</h3>
      </div>
    );
  }

  if (location.permission === 'unsupported') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-red-50 rounded-2xl border border-red-200 p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-red-500 mb-4" />
        <h3 className="text-lg font-bold text-red-900 mb-2">Geolocation Not Supported</h3>
        <p className="text-sm text-red-700 max-w-sm">
          {location.error || "Your browser doesn't support geolocation, which is required for this feature."}
        </p>
      </div>
    );
  }

  if (location.permission === 'denied' || location.error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-amber-50 rounded-2xl border border-amber-200 p-8 text-center">
        <MapPin className="w-10 h-10 text-amber-500 mb-4" />
        <h3 className="text-lg font-bold text-amber-900 mb-2">Location Access Denied</h3>
        <p className="text-sm text-amber-700 max-w-sm mb-6">
          {location.error || "Please enable location services in your browser settings to find nearby emergency facilities."}
        </p>
        <button
          onClick={onRequestPermission}
          className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl shadow-sm transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
        <MapPin className="w-8 h-8 text-blue-600" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">Location access is required</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-8 leading-relaxed">
        Allow location access to find nearby police stations, hospitals, and other emergency services. 
        Your location is used to show nearby safety services and improve route-safety information.
      </p>
      <button
        onClick={onRequestPermission}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center gap-2"
      >
        <ShieldCheck size={18} />
        Enable Location
      </button>
      
      <p className="mt-6 text-xs text-slate-400 font-medium max-w-xs">
        Location access can be disabled at any time. We do not collect your location in the background.
      </p>
    </div>
  );
}
