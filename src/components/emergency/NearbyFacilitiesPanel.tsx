import { ShieldAlert, MapPin, PhoneCall, Info, Loader2 } from 'lucide-react';
import type { Facility } from '@/hooks/useNearbyFacilities';

interface NearbyFacilitiesPanelProps {
  facilities: Facility[];
  loading: boolean;
  error: string | null;
}

const CATEGORY_LABELS = {
  police: { icon: '🚓', label: 'Police', color: 'text-blue-600' },
  hospital: { icon: '🏥', label: 'Hospital', color: 'text-red-600' },
  fire_station: { icon: '🚒', label: 'Fire Station', color: 'text-orange-600' },
  pharmacy: { icon: '💊', label: 'Pharmacy', color: 'text-green-600' },
};

export function NearbyFacilitiesPanel({ facilities, loading, error }: NearbyFacilitiesPanelProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full max-h-[500px] md:max-h-[600px]">
      <div className="p-5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 shrink-0">
            <ShieldAlert size={16} />
          </span>
          <div>
            <h2 className="text-[13px] font-extrabold uppercase tracking-[0.12em] text-slate-900">NEARBY HELP</h2>
            <p className="text-xs text-slate-500 mt-0.5">Emergency services around you</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading && facilities.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-500" />
            <p className="text-sm font-medium">Finding nearby facilities...</p>
          </div>
        )}

        {error && (
          <div className="m-3 p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100">
            {error}
          </div>
        )}

        {!loading && !error && facilities.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <p className="text-sm font-medium">No emergency facilities found nearby.</p>
          </div>
        )}

        <div className="flex flex-col gap-2 p-2">
          {facilities.map((facility) => {
            const cat = CATEGORY_LABELS[facility.category];
            
            return (
              <div key={facility.id} className="p-4 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl" aria-hidden="true">{cat.icon}</span>
                    <span className={`text-xs font-bold uppercase tracking-wider ${cat.color}`}>
                      {cat.label}
                    </span>
                  </div>
                  <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded-md">
                    {facility.distance.toFixed(1)} km
                  </span>
                </div>
                
                <h3 className="font-bold text-slate-900 text-sm mb-1 leading-snug line-clamp-2">
                  {facility.name}
                </h3>
                
                {facility.address && (
                  <p className="text-xs text-slate-500 flex items-start gap-1.5 mb-2 line-clamp-1">
                    <MapPin size={12} className="shrink-0 mt-0.5" />
                    {facility.address}
                  </p>
                )}
                
                {facility.emergencyInfo && (
                  <p className="text-xs text-red-600 bg-red-50 font-medium flex items-center gap-1.5 px-2 py-1 rounded-md mb-2 w-fit">
                    <Info size={12} />
                    {facility.emergencyInfo}
                  </p>
                )}
                
                {facility.phone && (
                  <a 
                    href={`tel:${facility.phone}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:border-blue-300 hover:text-blue-700 transition-colors mt-1"
                  >
                    <PhoneCall size={12} />
                    {facility.phone}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
