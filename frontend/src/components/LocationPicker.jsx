import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, X, MapPin, Check, Loader2 } from "lucide-react";
import { useDebounce } from "../hooks/useDebounce";


const BASE_URL = import.meta.env.VITE_SERVER_URL

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const DEFAULT_CENTER = { lat: 20, lng: 78 };
const DEFAULT_ZOOM = 4;
const SELECTED_ZOOM = 14;

function RecenterMap({ lat, lng, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) {
      map.setView([lat, lng], zoom, { animate: true });
    }
  }, [lat, lng, zoom, map]);
  return null;
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const LocationPicker = ({ value, onChange, onClose }) => {
  const [query, setQuery] = useState(value?.name || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resolvingPin, setResolvingPin] = useState(false);
  const debouncedQuery = useDebounce(query, 400);
  const inputRef = useRef(null);
  const skipNextSearch = useRef(!!value?.name);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // search-as-you-type
  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }

    const q = debouncedQuery.trim();
    if (!q) {
      setResults([]);
      return;
    }

    const token = localStorage.getItem("authToken");
    let cancelled = false;
    setLoading(true);

    fetch(`${BASE_URL}/post/search-location?q=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setResults(data.results || []);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const handleSelect = (place) => {
    skipNextSearch.current = true;
    onChange({ name: place.name, lat: place.lat, lng: place.lng });
    setQuery(place.name);
    setResults([]);
  };

  const handleClear = () => {
    onChange(null);
    setQuery("");
    setResults([]);
    inputRef.current?.focus();
  };

  // click anywhere on the map to drop a pin there
  const handleMapClick = useCallback(async (lat, lng) => {
    skipNextSearch.current = true;
    setResults([]);
    setQuery("Dropped pin");
    onChange({ name: "Dropped pin", lat, lng });

    setResolvingPin(true);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(
        `${BASE_URL}/post/reverse-geocode?lat=${lat}&lng=${lng}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      const resolvedName = data?.name || "Dropped pin";
      skipNextSearch.current = true;
      setQuery(resolvedName);
      onChange({ name: resolvedName, lat, lng });
    } catch {
      // keep "Dropped pin" as a fallback name if reverse geocoding fails
    } finally {
      setResolvingPin(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showDropdown = query.trim().length > 0 && (loading || results.length > 0 || query !== value?.name);
  const center = value?.lat != null ? { lat: value.lat, lng: value.lng } : DEFAULT_CENTER;
  const zoom = value?.lat != null ? SELECTED_ZOOM : DEFAULT_ZOOM;

  return (
    <div className="absolute inset-0 z-40 bg-[var(--bg-surface)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-[50px] flex-shrink-0 border-b border-[rgba(128,128,128,0.2)]">
        <button onClick={onClose} type="button" className="text-[var(--text-primary)]">
          <X size={20} />
        </button>
        <div className="font-semibold text-[var(--text-primary)] text-[15px]">Add Location</div>
        {value && (
          <button
            onClick={onClose}
            type="button"
            className="ml-auto flex items-center gap-1 text-[var(--accent-blue)] text-sm font-semibold hover:underline"
          >
            <Check size={15} />
            Done
          </button>
        )}
      </div>

      {/* Search bar */}
      <div className="px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2 bg-[var(--bg-elevated)] rounded-lg px-3 h-[38px]">
          <Search size={16} className="text-[#8e8e8e] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a location, or tap the map"
            className="flex-1 min-w-0 bg-transparent outline-none text-sm text-[var(--text-primary)] placeholder:text-[#8e8e8e]"
          />
          {query && (
            <button onClick={handleClear} type="button" className="shrink-0">
              <X size={14} className="text-[#8e8e8e]" />
            </button>
          )}
        </div>
      </div>

      {/* Map + overlay results */}
      {/*
        NOTE: relative + isolate creates a fresh stacking context for this
        wrapper. Leaflet sets its own explicit z-index values on internal
        panes (tilePane ~200, markerPane ~600, popupPane ~700, controls
        ~1000). Any overlay we place as a plain sibling with no z-index
        defaults to z-index:auto (effectively 0), so Leaflet's panes were
        rendering ON TOP of our dropdown/hint pills even though they appear
        later in the DOM — that's why only a sliver (shadow/border) was
        visible and the suggestion text itself was hidden underneath the
        map tiles. Giving every overlay an explicit z-[1000]+ (higher than
        Leaflet's highest internal z-index) fixes it.
      */}
      <div className="relative isolate flex-1 min-h-0">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={zoom}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          {value?.lat != null && <Marker position={[value.lat, value.lng]} icon={markerIcon} />}
          <RecenterMap lat={value?.lat} lng={value?.lng} zoom={zoom} />
          <MapClickHandler onMapClick={handleMapClick} />
        </MapContainer>

        {/* hint / resolving pill */}
        {!value && !showDropdown && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1100] bg-black/70 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none">
            Tap anywhere on the map to drop a pin
          </div>
        )}
        {resolvingPin && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1100] flex items-center gap-1.5 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none">
            <Loader2 size={12} className="animate-spin" />
            Finding place name...
          </div>
        )}

        {/* search results dropdown, floats above the map */}
        {showDropdown && (
          <div className="absolute top-0 left-0 right-0 z-[1100] max-h-full overflow-y-auto bg-[var(--bg-surface)] shadow-lg">
            {loading && (
              <div className="text-center text-xs text-[#8e8e8e] py-3">Searching...</div>
            )}
            {!loading &&
              results.map((place, i) => (
                <div
                  key={`${place.lat}-${place.lng}-${i}`}
                  onClick={() => handleSelect(place)}
                  className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[var(--bg-elevated)]"
                >
                  <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center shrink-0">
                    <MapPin size={16} className="text-[var(--text-primary)]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-[var(--text-primary)] truncate">{place.name}</div>
                    <div className="text-xs text-[#8e8e8e] truncate">{place.subtitle}</div>
                  </div>
                </div>
              ))}
            {!loading && results.length === 0 && (
              <div className="text-center text-xs text-[#8e8e8e] py-6">No locations found</div>
            )}
          </div>
        )}
      </div>

      {/* selected location chip */}
      {value && (
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 flex-shrink-0 border-t border-[rgba(128,128,128,0.2)] bg-[var(--bg-elevated)]">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin size={15} className="text-[var(--accent-blue)] shrink-0" />
            <span className="text-sm text-[var(--text-primary)] truncate">{value.name}</span>
          </div>
          <button
            onClick={handleClear}
            type="button"
            className="text-xs text-[#8e8e8e] hover:text-[var(--text-primary)] shrink-0"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
