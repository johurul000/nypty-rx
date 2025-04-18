// components/LocationPicker.tsx
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Popup } from 'react-leaflet';
// Import L directly - needed for the fix inside useEffect
import L, { LatLngExpression, LeafletMouseEvent } from 'leaflet';

// Import CSS globally (in layout.tsx) is preferred, but keep it here for certainty if needed
import 'leaflet/dist/leaflet.css';

// --- REMOVE THE GLOBAL ICON FIX CODE FROM THE TOP LEVEL ---


interface LocationPickerProps {
  initialLat?: number | null;
  initialLng?: number | null;
  onLocationChange: (lat: number, lng: number) => void;
  mapHeight?: string;
  disabled?: boolean;
}

const DEFAULT_CENTER: LatLngExpression = [51.505, -0.09];
const DEFAULT_ZOOM = 10;
const SELECTED_ZOOM = 15;

export default function LocationPicker({
  initialLat,
  initialLng,
  onLocationChange,
  mapHeight = '400px',
  disabled = false
}: LocationPickerProps) {

  const [markerPosition, setMarkerPosition] = useState<LatLngExpression | null>(null);
  const mapRef = useRef<L.Map>(null);
  // State to track if Leaflet setup (like icon fix) is complete
  const [isLeafletReady, setIsLeafletReady] = useState(false);

  // --- Apply Icon Fix and Signal Readiness in useEffect ---
  useEffect(() => {
    // This effect runs only once on the client after the component mounts
    (async () => {
      try {
        // Dynamically import icon assets *within* the effect
        // This might help ensure they are resolved correctly in the client context
        const iconRetinaUrl = (await import('leaflet/dist/images/marker-icon-2x.png')).default;
        const iconUrl = (await import('leaflet/dist/images/marker-icon.png')).default;
        const shadowUrl = (await import('leaflet/dist/images/marker-shadow.png')).default;

        // Apply the fix
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: iconRetinaUrl.src,
          iconUrl: iconUrl.src,
          shadowUrl: shadowUrl.src,
        });

        console.log("Leaflet Icon Fix Applied via useEffect.");
        setIsLeafletReady(true); // Signal that setup is done

      } catch (error) {
        console.error("Error applying Leaflet icon fix:", error);
        // Handle error - maybe set an error state?
      }
    })(); // Immediately invoke the async function

  }, []); // Empty dependency array ensures it runs only once on mount


  // --- Effect to set initial position *after* Leaflet is ready ---
  useEffect(() => {
    // Only run this if Leaflet setup is complete
    if (!isLeafletReady) return;

    const pos: LatLngExpression | null =
      initialLat != null && initialLng != null ? [initialLat, initialLng] : null;
    setMarkerPosition(pos);

    // Fly map to position if map instance exists
    // Check mapRef.current exists before calling methods on it
    if (pos && mapRef.current) {
      mapRef.current.flyTo(pos, SELECTED_ZOOM);
    }
    // console.log("Initial position set:", pos);

  }, [initialLat, initialLng, isLeafletReady]); // Depends on initial props and readiness


  // --- Map Interaction Handlers (No changes needed here) ---
  const MapClickHandler = () => {
    useMapEvents({
      click(e: LeafletMouseEvent) {
        if (disabled) return;
        const { lat, lng } = e.latlng;
        setMarkerPosition([lat, lng]);
        onLocationChange(lat, lng);
      },
    });
    return null;
  };

  const markerEventHandlers = useMemo(() => ({
      dragend(e: L.DragEndEvent) {
        if (disabled) return;
        const marker = e.target;
        const position = marker.getLatLng();
        setMarkerPosition([position.lat, position.lng]);
        onLocationChange(position.lat, position.lng);
      },
    }), [onLocationChange, disabled]);


  // --- Calculate Map View ---
  const mapCenter = markerPosition ?? DEFAULT_CENTER;
  const mapZoom = markerPosition ? SELECTED_ZOOM : DEFAULT_ZOOM;

  // --- Render ---
  // Conditionally render the map container ONLY when Leaflet setup is complete
  if (!isLeafletReady) {
    // Render a placeholder or loader while waiting for Leaflet setup
    return (
      <div
        style={{ height: mapHeight }}
        className="flex items-center justify-center border rounded-md bg-muted text-muted-foreground"
      >
        Initializing Map...
      </div>
    );
  }

  // Render the actual map once ready
  return (
    <div className="leaflet-map-container rounded-md border overflow-hidden" style={{ height: mapHeight }}>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        scrollWheelZoom={!disabled}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        zoomControl={!disabled}
        dragging={!disabled}
        touchZoom={!disabled}
        doubleClickZoom={!disabled}
      >
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {markerPosition && (
          <Marker
            position={markerPosition}
            draggable={!disabled}
            eventHandlers={markerEventHandlers}
          >
            <Popup>
              {disabled ? "Store Location" : "Store Location (Drag marker to adjust)"}
            </Popup>
          </Marker>
        )}

        <MapClickHandler />
      </MapContainer>
    </div>
  );
}