import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Search } from 'lucide-react';

interface MapLocationPickerProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
  initialLat?: number;
  initialLng?: number;
}

export const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  onLocationSelect,
  initialLat = 24.7136,
  initialLng = 46.6753
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState({ lat: initialLat, lng: initialLng });

  useEffect(() => {
    if (!mapContainer.current) return;

    // Get token from environment or use default
    const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbTZkdXAzZW0wMDkzMmtzYnBucmZmbTJ5In0.G5e-z_FDLqQjQvjqBJ0Zzw';
    mapboxgl.accessToken = mapboxToken;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [initialLng, initialLat],
      zoom: 12
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add marker
    marker.current = new mapboxgl.Marker({
      draggable: true,
      color: '#ef4444'
    })
      .setLngLat([initialLng, initialLat])
      .addTo(map.current);

    // Handle marker drag
    marker.current.on('dragend', async () => {
      if (!marker.current) return;
      const lngLat = marker.current.getLngLat();
      const address = await reverseGeocode(lngLat.lng, lngLat.lat);
      setSelectedLocation({ lat: lngLat.lat, lng: lngLat.lng });
      onLocationSelect({ lat: lngLat.lat, lng: lngLat.lng, address });
    });

    // Handle map click
    map.current.on('click', async (e) => {
      if (!marker.current) return;
      marker.current.setLngLat([e.lngLat.lng, e.lngLat.lat]);
      const address = await reverseGeocode(e.lngLat.lng, e.lngLat.lat);
      setSelectedLocation({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      onLocationSelect({ lat: e.lngLat.lat, lng: e.lngLat.lng, address });
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  const reverseGeocode = async (lng: number, lat: number): Promise<string> => {
    try {
      const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbTZkdXAzZW0wMDkzMmtzYnBucmZmbTJ5In0.G5e-z_FDLqQjQvjqBJ0Zzw';
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&language=ar`
      );
      const data = await response.json();
      return data.features[0]?.place_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbTZkdXAzZW0wMDkzMmtzYnBucmZmbTJ5In0.G5e-z_FDLqQjQvjqBJ0Zzw';
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${mapboxToken}&country=SA&language=ar`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        const address = data.features[0].place_name;
        
        if (map.current && marker.current) {
          map.current.flyTo({ center: [lng, lat], zoom: 14 });
          marker.current.setLngLat([lng, lat]);
          setSelectedLocation({ lat, lng });
          onLocationSelect({ lat, lng, address });
        }
      }
    } catch (error) {
      console.error('Error searching location:', error);
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="ابحث عن موقع..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pr-10"
            />
          </div>
          <Button onClick={handleSearch}>
            بحث
          </Button>
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
