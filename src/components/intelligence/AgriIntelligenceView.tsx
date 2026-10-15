import React, { useState } from 'react';
import {
  MapPin,
  Search,
  ExternalLink,
  Sparkles,
  Compass,
  TrendingUp,
  CloudSun,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Building2,
  Warehouse,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { MALAWI_DISTRICTS } from '../../types/index.ts';

interface AgriPlace {
  title: string;
  uri: string;
  reviewSnippets?: Array<{ snippetText?: string; sourceUri?: string }>;
}

interface WebSource {
  title: string;
  uri: string;
}

interface AgriIntelligenceViewProps {
  initialTab?: 'maps' | 'search';
  embedded?: boolean;
}

export const AgriIntelligenceView: React.FC<AgriIntelligenceViewProps> = ({
  initialTab = 'maps',
  embedded = false,
}) => {
  const [activeMode, setActiveMode] = useState<'maps' | 'search'>(initialTab);

  // Maps Grounding State
  const [mapsDistrict, setMapsDistrict] = useState<string>('Lilongwe');
  const [mapsQuery, setMapsQuery] = useState<string>(
    'Find major ADMARC crop buying depots, NFRA grain silos, and agricultural warehouses in Lilongwe, Malawi'
  );
  const [mapsLoading, setMapsLoading] = useState<boolean>(false);
  const [mapsResponse, setMapsResponse] = useState<string | null>(null);
  const [mapsPlaces, setMapsPlaces] = useState<AgriPlace[]>([]);
  const [mapsError, setMapsError] = useState<string | null>(null);

  // Search Grounding State
  const [searchTopic, setSearchTopic] = useState<string>('commodity_prices');
  const [searchQuery, setSearchQuery] = useState<string>(
    'Current market price of maize per 50kg bag and Kilombero rice in Malawi agricultural markets this week'
  );
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchResponse, setSearchResponse] = useState<string | null>(null);
  const [searchSources, setSearchSources] = useState<WebSource[]>([]);
  const [searchQueries, setSearchQueries] = useState<string[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Execute Google Maps Grounding
  const handleRunMapsGrounding = async (customPrompt?: string) => {
    const promptToSend = (customPrompt || mapsQuery).trim();
    if (!promptToSend) return;

    setMapsLoading(true);
    setMapsError(null);
    setMapsResponse(null);
    setMapsPlaces([]);

    try {
      const res = await fetch('/api/ai/maps-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSend,
          district: mapsDistrict,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to retrieve grounded Google Maps intelligence.');
      }

      setMapsResponse(data.text || 'No detailed descriptive text returned.');
      setMapsPlaces(Array.isArray(data.places) ? data.places : []);
    } catch (err: any) {
      setMapsError(err.message || 'An error occurred while connecting to Google Maps Grounding.');
    } finally {
      setMapsLoading(false);
    }
  };

  // Execute Google Search Grounding
  const handleRunSearchGrounding = async (customPrompt?: string) => {
    const promptToSend = (customPrompt || searchQuery).trim();
    if (!promptToSend) return;

    setSearchLoading(true);
    setSearchError(null);
    setSearchResponse(null);
    setSearchSources([]);
    setSearchQueries([]);

    try {
      const res = await fetch('/api/ai/search-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSend,
          topic: searchTopic,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to retrieve grounded Google Search intelligence.');
      }

      setSearchResponse(data.text || 'No search analysis text returned.');
      setSearchSources(Array.isArray(data.sources) ? data.sources : []);
      setSearchQueries(Array.isArray(data.searchQueries) ? data.searchQueries : []);
    } catch (err: any) {
      setSearchError(err.message || 'An error occurred while connecting to Google Search Grounding.');
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className={`space-y-6 ${embedded ? '' : 'max-w-6xl mx-auto'}`}>
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-emerald-900 via-stone-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Live Grounded AI &bull; Gemini 3.8 Flash
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/10 text-stone-200">
                Official Google Maps &amp; Search Data
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Malawi Agri-Intelligence &amp; Depots Hub
            </h1>
            <p className="text-stone-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Real-time grounded insights directly from Google Maps and Google Search. Locate official NFRA silos, ADMARC depots, transport weighbridges, and monitor live commodity prices and weather forecasts across Malawi's 28 districts.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/15 shrink-0 self-start md:self-auto">
            <button
              onClick={() => setActiveMode('maps')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeMode === 'maps'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-stone-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <MapPin className="w-4 h-4 text-emerald-300" />
              <span>Google Maps Grounding</span>
            </button>
            <button
              onClick={() => setActiveMode('search')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeMode === 'search'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-stone-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Search className="w-4 h-4 text-blue-300" />
              <span>Google Search Grounding</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODE 1: GOOGLE MAPS GROUNDING */}
      {activeMode === 'maps' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <MapPin className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-900">
                    Live Facilities &amp; Depots Finder
                  </h2>
                  <p className="text-xs text-stone-500">
                    Grounded with Google Maps tool (`gemini-3.8-flash`) &bull; Real geographic coordinates
                  </p>
                </div>
              </div>

              {/* District Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-600">Focus District:</span>
                <select
                  value={mapsDistrict}
                  onChange={(e) => setMapsDistrict(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-stone-300 bg-stone-50 text-xs font-semibold text-stone-800 focus:outline-emerald-600"
                >
                  {MALAWI_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d} District
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Presets for Farmers, Transporters & Buyers */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                Quick Grounded Prompts:
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  `Find NFRA national grain silos and ADMARC buying depots in ${mapsDistrict}`,
                  `Locate major agricultural input stores, fertilizer distribution, and agro-dealers in ${mapsDistrict}`,
                  `Find produce collection warehouses, weighbridges, and truck loading bays in ${mapsDistrict}`,
                  `Produce markets, Kapiri/trading centers, and transport dispatch terminals in ${mapsDistrict}`,
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setMapsQuery(preset);
                      handleRunMapsGrounding(preset);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 text-[11px] font-medium text-stone-700 border border-stone-200 transition-colors text-left"
                  >
                    &bull; {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={mapsQuery}
                onChange={(e) => setMapsQuery(e.target.value)}
                placeholder="Ask about grain silos, ADMARC depots, wholesale markets, or route facilities in Malawi..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-stone-300 text-xs text-stone-900 focus:outline-emerald-600 placeholder:text-stone-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRunMapsGrounding();
                }}
              />
              <button
                type="button"
                disabled={mapsLoading || !mapsQuery.trim()}
                onClick={() => handleRunMapsGrounding()}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all shrink-0"
              >
                {mapsLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Searching Google Maps...</span>
                  </>
                ) : (
                  <>
                    <Compass className="w-4 h-4" />
                    <span>Search Google Maps</span>
                  </>
                )}
              </button>
            </div>

            {mapsError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{mapsError}</span>
              </div>
            )}
          </div>

          {/* Results: Grounded Places & Detailed Answers */}
          {mapsLoading && (
            <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
              <h3 className="font-bold text-stone-800 text-sm">Querying Google Maps Grounding Engine</h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Grounding places, coordinates, depots, and logistics hubs for {mapsDistrict}, Malawi via Gemini 3.8 Flash...
              </p>
            </div>
          )}

          {mapsResponse && !mapsLoading && (
            <div className="space-y-6">
              {/* Grounded Places Cards with Clickable Links */}
              {mapsPlaces.length > 0 && (
                <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      <span>Verified Google Maps Locations &amp; Depots ({mapsPlaces.length})</span>
                    </h3>
                    <span className="text-[11px] text-stone-500 font-medium">Click to open directly on Google Maps</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {mapsPlaces.map((place, idx) => (
                      <a
                        key={idx}
                        href={place.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group p-4 rounded-2xl bg-stone-50 hover:bg-emerald-50/60 border border-stone-200 hover:border-emerald-300 transition-all flex flex-col justify-between space-y-2.5 shadow-2xs"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-stone-900 group-hover:text-emerald-800 text-xs leading-tight">
                              {place.title}
                            </span>
                            <ExternalLink className="w-3.5 h-3.5 text-stone-400 group-hover:text-emerald-700 shrink-0 mt-0.5" />
                          </div>
                          {place.reviewSnippets && place.reviewSnippets.length > 0 && (
                            <p className="text-[11px] text-stone-500 mt-1 line-clamp-2 italic">
                              "{place.reviewSnippets[0].snippetText}"
                            </p>
                          )}
                        </div>
                        <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px] text-emerald-700 font-bold">
                          <span>View on Maps</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                            Google Verified
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Detailed Markdown Content */}
              <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-stone-700" />
                    <span>Grounded Location Analysis &amp; Depot Logistics Details</span>
                  </h3>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    Target: {mapsDistrict}
                  </span>
                </div>
                <div className="prose prose-stone prose-xs max-w-none text-xs sm:text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
                  {mapsResponse}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 2: GOOGLE SEARCH GROUNDING */}
      {activeMode === 'search' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                  <Search className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-900">
                    Live Agricultural Market Search
                  </h2>
                  <p className="text-xs text-stone-500">
                    Grounded with Google Search tool (`gemini-3.8-flash`) &bull; Real-time web citations
                  </p>
                </div>
              </div>

              {/* Topic Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-600">Category:</span>
                <select
                  value={searchTopic}
                  onChange={(e) => setSearchTopic(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-stone-300 bg-stone-50 text-xs font-semibold text-stone-800 focus:outline-blue-600"
                >
                  <option value="commodity_prices">Commodity Prices (Maize, Soya, Rice)</option>
                  <option value="weather_rainfall">Weather, Rainfall &amp; Seasonal Alerts</option>
                  <option value="government_policies">AIP Subsidies &amp; Farmgate Pricing Policies</option>
                  <option value="pest_disease">Crop Disease &amp; Pest Management Advisories</option>
                </select>
              </div>
            </div>

            {/* Quick Presets for Live Market Data */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                Current Agricultural Market Queries:
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  'Current market price of maize per 50kg bag in Malawi markets this week',
                  'Kilombero super rice and soya bean wholesale price trends in Lilongwe and Blantyre',
                  'Malawi Ministry of Agriculture minimum farmgate prices announcements',
                  'Weather forecast and rainfall outlook for planting and harvesting in Malawi',
                  'Fertilizer pricing (Urea and NPK) and Agricultural Input Programme (AIP) status in Malawi',
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSearchQuery(preset);
                      handleRunSearchGrounding(preset);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-blue-50 hover:text-blue-800 text-[11px] font-medium text-stone-700 border border-stone-200 transition-colors text-left"
                  >
                    &bull; {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ask about live commodity prices, weather, Ministry of Agriculture circulars, or export trends..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-stone-300 text-xs text-stone-900 focus:outline-blue-600 placeholder:text-stone-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRunSearchGrounding();
                }}
              />
              <button
                type="button"
                disabled={searchLoading || !searchQuery.trim()}
                onClick={() => handleRunSearchGrounding()}
                className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all shrink-0"
              >
                {searchLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Searching Google...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Search Google</span>
                  </>
                )}
              </button>
            </div>

            {searchError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{searchError}</span>
              </div>
            )}
          </div>

          {/* Results: Grounded Search Text & Citations */}
          {searchLoading && (
            <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <h3 className="font-bold text-stone-800 text-sm">Querying Google Search Grounding Engine</h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Retrieving verified web sources, market price bulletins, and agricultural updates via Gemini 3.8 Flash...
              </p>
            </div>
          )}

          {searchResponse && !searchLoading && (
            <div className="space-y-6">
              {/* Web Sources & Citations Links */}
              {searchSources.length > 0 && (
                <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-blue-600" />
                      <span>Verified Web Sources &amp; Citations ({searchSources.length})</span>
                    </h3>
                    <span className="text-[11px] text-stone-500">Live web links referenced by model</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {searchSources.map((source, idx) => (
                      <a
                        key={idx}
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group p-3 rounded-2xl bg-stone-50 hover:bg-blue-50/60 border border-stone-200 hover:border-blue-300 transition-all flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="truncate">
                          <span className="font-bold text-stone-900 group-hover:text-blue-800 text-xs block truncate">
                            {source.title}
                          </span>
                          <span className="text-[10px] text-stone-400 block truncate font-mono">
                            {source.uri}
                          </span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-stone-400 group-hover:text-blue-700 shrink-0" />
                      </a>
                    ))}
                  </div>

                  {searchQueries.length > 0 && (
                    <div className="pt-2 border-t border-stone-100 flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-stone-500">Search Queries:</span>
                      {searchQueries.map((q, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-lg bg-stone-100 text-stone-700 text-[10px] font-medium">
                          "{q}"
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Detailed Markdown Content */}
              <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-stone-700" />
                    <span>Real-time Market Intelligence &amp; Analysis</span>
                  </h3>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold capitalize">
                    {searchTopic.replace('_', ' ')}
                  </span>
                </div>
                <div className="prose prose-stone prose-xs max-w-none text-xs sm:text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
                  {searchResponse}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
