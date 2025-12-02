import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Search } from 'lucide-react';

interface GoogleMapLocationPickerProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
  initialLat?: number;
  initialLng?: number;
}

declare global {
  interface Window {
    google: any;
  }
}

export const GoogleMapLocationPicker: React.FC<GoogleMapLocationPickerProps> = ({
  onLocationSelect,
  initialLat = 24.7136,
  initialLng = 46.6753
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerInstance = useRef<any>(null);
  const autocompleteInstance = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState({ lat: initialLat, lng: initialLng });
  const [isLoaded, setIsLoaded] = useState(false);

  // Load Google Maps script
  useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        setIsLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY_HERE'}&libraries=places&language=ar`;
      script.async = true;
      script.defer = true;
      script.onload = () => setIsLoaded(true);
      script.onerror = () => console.error('Failed to load Google Maps');
      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapContainer.current) return;

    // Initialize map
    mapInstance.current = new window.google.maps.Map(mapContainer.current, {
      center: { lat: initialLat, lng: initialLng },
      zoom: 12,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    });

    // Initialize marker
    markerInstance.current = new window.google.maps.Marker({
      position: { lat: initialLat, lng: initialLng },
      map: mapInstance.current,
      draggable: true,
      animation: window.google.maps.Animation.DROP,
    });

    // Handle marker drag
    markerInstance.current.addListener('dragend', async () => {
      if (!markerInstance.current) return;
      const position = markerInstance.current.getPosition();
      if (!position) return;
      
      const lat = position.lat();
      const lng = position.lng();
      const address = await reverseGeocode(lat, lng);
      
      setSelectedLocation({ lat, lng });
      onLocationSelect({ lat, lng, address });
    });

    // Handle map click
    mapInstance.current.addListener('click', async (e: any) => {
      if (!e.latLng || !markerInstance.current || !mapInstance.current) return;
      
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      
      markerInstance.current.setPosition(e.latLng);
      const address = await reverseGeocode(lat, lng);
      
      setSelectedLocation({ lat, lng });
      onLocationSelect({ lat, lng, address });
    });

    // Initialize autocomplete
    if (searchInputRef.current) {
      autocompleteInstance.current = new window.google.maps.places.Autocomplete(searchInputRef.current, {
        componentRestrictions: { country: 'sa' },
        fields: ['geometry', 'formatted_address'],
      });

      autocompleteInstance.current.addListener('place_changed', () => {
        if (!autocompleteInstance.current || !markerInstance.current || !mapInstance.current) return;
        
        const place = autocompleteInstance.current.getPlace();
        if (!place.geometry || !place.geometry.location) return;

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const address = place.formatted_address || '';

        markerInstance.current.setPosition(place.geometry.location);
        mapInstance.current.setCenter(place.geometry.location);
        mapInstance.current.setZoom(14);

        setSelectedLocation({ lat, lng });
        onLocationSelect({ lat, lng, address });
      });
    }

    return () => {
      if (markerInstance.current && window.google) {
        window.google.maps.event.clearInstanceListeners(markerInstance.current);
      }
      if (mapInstance.current && window.google) {
        window.google.maps.event.clearInstanceListeners(mapInstance.current);
      }
    };
  }, [isLoaded, initialLat, initialLng, onLocationSelect]);

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const response = await geocoder.geocode({ location: { lat, lng } });
      
      if (response.results[0]) {
        return response.results[0].formatted_address;
      }
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  if (!isLoaded) {
    return (
      <Card className="p-4">
        <div className="w-full h-96 flex items-center justify-center">
          <p className="text-muted-foreground">جاري تحميل الخريطة...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              ref={searchInputRef}
              placeholder="ابحث عن موقع..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
        </div>
        
        <div 
          ref={mapContainer} 
          className="w-full h-96 rounded-lg border"
        />
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span>
            الإحداثيات: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
          </span>
        </div>
        
        <p className="text-sm text-muted-foreground">
          اضغط على الخريطة أو اسحب العلامة لتحديد الموقع
        </p>
      </div>
    </Card>
  );
};
