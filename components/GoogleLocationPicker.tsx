// components/GoogleLocationPicker.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleMap, LoadScript, Autocomplete, Marker } from '@react-google-maps/api';
import { Input } from '@/components/ui/input'; // Import Input if using it inside
import { Loader2 } from 'lucide-react'; // <-- Add this import
// --- Component Props Interface ---
interface GoogleLocationPickerProps {
  apiKey: string;
  initialLat?: number | null;
  initialLng?: number | null;
  onLocationChange: (lat: number, lng: number) => void;
  mapHeight?: string;
  disabled?: boolean;
}

// --- Default Map Settings ---
const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 }; // Center of India (adjust as needed)
const DEFAULT_ZOOM = 5;
const SELECTED_ZOOM = 15;

// --- Libraries to load from Google Maps API ---
const libraries: ("places")[] = ['places']; // Specify 'places' library for Autocomplete

export default function GoogleLocationPicker({
  apiKey,
  initialLat,
  initialLng,
  onLocationChange,
  mapHeight = '400px',
  disabled = false
}: GoogleLocationPickerProps) {

  // --- State ---
  // Use null initially for marker position to distinguish between default center and actual selection
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);

  // --- Refs ---
  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null); // Ref for the input element

  // --- Effects ---
  // Set initial marker and map center when initial coordinates are provided
  useEffect(() => {
    if (initialLat != null && initialLng != null) {
      const initialPos = { lat: initialLat, lng: initialLng };
      setMarkerPosition(initialPos);
      setMapCenter(initialPos);
      setMapZoom(SELECTED_ZOOM);
    } else {
      // Reset if initial coords become null
      setMarkerPosition(null);
      setMapCenter(DEFAULT_CENTER);
      setMapZoom(DEFAULT_ZOOM);
    }
  }, [initialLat, initialLng]);

  // --- Callbacks for Map/Autocomplete Loading ---
  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
    mapRef.current = mapInstance;
    console.log("Google Map Loaded");
  }, []);

  const onAutocompleteLoad = useCallback((autocompleteInstance: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocompleteInstance;
    console.log("Google Places Autocomplete Loaded");
  }, []);

  // Cleanup refs on unmount
  const onMapUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const onAutocompleteUnmount = useCallback(() => {
    autocompleteRef.current = null;
  }, []);

  // --- Event Handlers ---

  // When a place is selected from the Autocomplete dropdown
  const onPlaceChanged = () => {
    if (autocompleteRef.current && !disabled) {
      const place = autocompleteRef.current.getPlace();

      if (place?.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const newPos = { lat, lng };

        console.log("Place Selected:", place.name, newPos);

        setMarkerPosition(newPos);
        setMapCenter(newPos); // Center map on selected place
        setMapZoom(SELECTED_ZOOM); // Zoom in
        onLocationChange(lat, lng); // Update parent state

        // Optionally update the input field value to the selected place name
        if (searchInputRef.current) {
          searchInputRef.current.value = place.name || '';
        }
      } else {
        console.warn("Selected place does not have geometry:", place);
        // Handle cases where geometry is missing (optional: show a message)
      }
    }
  };

  // When the map is clicked directly
  const onMapClick = useCallback((event: google.maps.MapMouseEvent) => {
      if (disabled || !event.latLng) return;
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      const newPos = { lat, lng };

      console.log("Map Clicked:", newPos);

      setMarkerPosition(newPos);
      // Don't necessarily recenter map on click, just update marker/state
      // setMapCenter(newPos);
      onLocationChange(lat, lng);

      // Optionally clear the search input on map click
      if (searchInputRef.current) {
          searchInputRef.current.value = '';
      }
  }, [disabled, onLocationChange]);

   // When the marker is dragged
   const onMarkerDragEnd = useCallback((event: google.maps.MapMouseEvent) => {
        if (disabled || !event.latLng) return;
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        const newPos = { lat, lng };

        console.log("Marker Dragged:", newPos);
        // Update marker position state directly, parent is notified via onLocationChange
        setMarkerPosition(newPos);
        onLocationChange(lat, lng);

         // Optionally clear the search input on marker drag
        if (searchInputRef.current) {
            searchInputRef.current.value = '';
        }
   }, [disabled, onLocationChange]);

  // --- Render ---
  // Important: Check if API key is provided before attempting to load script
  if (!apiKey) {
    return <div className="text-destructive p-4 border border-destructive rounded-md">Error: Google Maps API Key is missing. Please check environment variables.</div>;
  }

  return (
    <LoadScript
      googleMapsApiKey={apiKey}
      libraries={libraries} // Load 'places' library
      onError={(error) => console.error("Google Maps Script Load Error:", error)}
      loadingElement={<div style={{ height: mapHeight }} className="flex items-center justify-center bg-muted"><Loader2 className="h-6 w-6 animate-spin" /> Loading Map...</div>}
    >
      <div className="space-y-3">
        {/* --- Autocomplete Search Input --- */}
        {!disabled && ( // Only show search if not disabled
          <Autocomplete
            onLoad={onAutocompleteLoad}
            onPlaceChanged={onPlaceChanged}
            onUnmount={onAutocompleteUnmount}
            // Restrict search results (optional, e.g., to a country)
            // options={{ componentRestrictions: { country: "in" } }}
          >
            <Input
              type="text"
              placeholder="Search for store location..."
              ref={searchInputRef} // Assign ref to the input
              className="w-full" // Use Shadcn Input for styling
              disabled={disabled}
              aria-label="Search store location"
            />
          </Autocomplete>
        )}

        {/* --- Google Map Container --- */}
        <div className="rounded-md border overflow-hidden" style={{ height: mapHeight }}>
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={mapCenter}
            zoom={mapZoom}
            onLoad={onMapLoad}
            onUnmount={onMapUnmount}
            onClick={onMapClick} // Handle map clicks
            options={{ // Additional map options
                streetViewControl: false, // Disable street view
                mapTypeControl: false, // Disable map type selector
                fullscreenControl: false, // Disable fullscreen button
                zoomControl: !disabled, // Allow zoom if not disabled
                clickableIcons: !disabled, // Allow clicking points of interest if not disabled
                draggableCursor: disabled ? 'default' : undefined, // Change cursor if disabled
                draggingCursor: disabled ? 'default' : undefined,
            }}
          >
            {/* --- Marker --- */}
            {markerPosition && (
              <Marker
                position={markerPosition}
                draggable={!disabled} // Allow dragging if not disabled
                onDragEnd={onMarkerDragEnd} // Handle drag end event
                title="Store Location"
              />
            )}
          </GoogleMap>
        </div>
      </div>
    </LoadScript>
  );
}