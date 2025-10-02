import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { MapPin, Navigation, Search, Layers, Filter, Route } from 'lucide-react';

interface EventLocation {
  id: string;
  title: string;
  title_ar: string;
  category: string;
  location: [number, number]; // [longitude, latitude]
  price: number;
  rating: number;
  date: string;
  image?: string;
  description?: string;
  difficulty?: string;
  duration?: string;
}

interface InteractiveMapboxProps {
  events: EventLocation[];
  center?: [number, number];
  zoom?: number;
  onEventSelect?: (event: EventLocation) => void;
  showRoutes?: boolean;
  allowEdit?: boolean;
}

const InteractiveMapbox: React.FC<InteractiveMapboxProps> = ({
  events = [],
  center = [46.6753, 24.7136], // Riyadh coordinates
  zoom = 6,
  onEventSelect,
  showRoutes = false,
  allowEdit = false
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventLocation | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/satellite-streets-v12');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDirections, setShowDirections] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const { t, isRTL } = useLanguageContext();
  const { toast } = useToast();

  // Use only provided events data
  const displayEvents = events;

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Get API key from localStorage or props
    const storedApiKey = localStorage.getItem('mapbox_token');
    const mapboxToken = apiKey || storedApiKey;
    
    // Check if API key is provided
    if (!mapboxToken) {
      return;
    }

    // Initialize map with API key
    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: center,
      zoom: zoom,
      pitch: 45,
      bearing: 0,
      antialias: true,
      locale: isRTL ? { 'NavigationControl.ZoomIn': 'تكبير' } : undefined
    });

    // Add navigation controls
    const nav = new mapboxgl.NavigationControl({
      visualizePitch: true
    });
    map.current.addControl(nav, isRTL ? 'top-left' : 'top-right');

    // Add geolocate control
    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true
    });
    map.current.addControl(geolocate, isRTL ? 'top-left' : 'top-right');

    map.current.on('load', () => {
      setMapReady(true);
      addEventMarkers();
      
      // Add 3D terrain
      if (map.current) {
        map.current.addSource('mapbox-dem', {
          'type': 'raster-dem',
          'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
          'tileSize': 512,
          'maxzoom': 14
        });
        map.current.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
        
        // Add sky layer
        map.current.addLayer({
          'id': 'sky',
          'type': 'sky',
          'paint': {
            'sky-type': 'atmosphere',
            'sky-atmosphere-sun': [0.0, 0.0],
            'sky-atmosphere-sun-intensity': 15
          }
        });
      }
    });

    // Get user location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userPos: [number, number] = [
          position.coords.longitude,
          position.coords.latitude
        ];
        setUserLocation(userPos);
      },
      (error) => {
        console.warn('Could not get user location:', error);
      }
    );

    return () => {
      map.current?.remove();
    };
  }, [apiKey, mapStyle]);

  const addEventMarkers = () => {
    if (!map.current || !mapReady) return;

    displayEvents.forEach((event) => {
      const el = document.createElement('div');
      el.className = 'event-marker';
      el.style.backgroundImage = `url(data:image/svg+xml;base64,${btoa(`
        <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 50s20-18 20-32.5C40 8.5 31 0 20 0S0 8.5 0 17.5C0 32 20 50 20 50z" fill="${getCategoryColor(event.category)}"/>
          <circle cx="20" cy="17.5" r="8" fill="white"/>
          <text x="20" y="22" text-anchor="middle" font-size="12" font-weight="bold" fill="${getCategoryColor(event.category)}">${event.rating}</text>
        </svg>
      `)})`;
      el.style.width = '40px';
      el.style.height = '50px';
      el.style.cursor = 'pointer';

      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false
      }).setHTML(`
        <div class="p-4 max-w-sm">
          <h3 class="font-bold text-lg mb-2">${isRTL ? event.title_ar : event.title}</h3>
          <div class="space-y-2 text-sm">
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">${t('price')}</span>
              <span class="font-bold text-primary">${event.price} ${t('currency')}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">${t('rating')}</span>
              <span>⭐ ${event.rating}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">${t('difficulty')}</span>
              <span>${event.difficulty}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">${t('duration')}</span>
              <span>${event.duration}</span>
            </div>
          </div>
          <button 
            onclick="window.selectMapEvent('${event.id}')" 
            class="w-full mt-3 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            ${t('viewDetails')}
          </button>
        </div>
      `);

      new mapboxgl.Marker(el)
        .setLngLat(event.location)
        .setPopup(popup)
        .addTo(map.current!);

      el.addEventListener('click', () => {
        setSelectedEvent(event);
        onEventSelect?.(event);
      });
    });

    // Make selectMapEvent globally available
    (window as any).selectMapEvent = (eventId: string) => {
      const event = displayEvents.find(e => e.id === eventId);
      if (event) {
        setSelectedEvent(event);
        onEventSelect?.(event);
      }
    };
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      hiking: '#22c55e',
      diving: '#3b82f6', 
      camping: '#f59e0b',
      cycling: '#ef4444',
      climbing: '#8b5cf6',
      default: '#6b7280'
    };
    return colors[category] || colors.default;
  };

  const centerMapOnUser = () => {
    if (userLocation && map.current) {
      map.current.flyTo({
        center: userLocation,
        zoom: 12,
        duration: 2000
      });
    } else {
      toast({
        title: t('locationNotAvailable'),
        description: t('enableLocationServices'),
        variant: 'destructive'
      });
    }
  };

  const getDirections = (event: EventLocation) => {
    if (userLocation) {
      const url = `https://www.google.com/maps/dir/${userLocation[1]},${userLocation[0]}/${event.location[1]},${event.location[0]}`;
      window.open(url, '_blank');
    } else {
      toast({
        title: t('locationRequired'),
        description: t('locationRequiredForDirections'),
        variant: 'destructive'
      });
    }
  };

  const filteredEvents = displayEvents.filter(event =>
    (isRTL ? event.title_ar : event.title).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleMapStyle = () => {
    const styles = [
      'mapbox://styles/mapbox/satellite-streets-v12',
      'mapbox://styles/mapbox/streets-v12',
      'mapbox://styles/mapbox/outdoors-v12',
      'mapbox://styles/mapbox/light-v11'
    ];
    const currentIndex = styles.indexOf(mapStyle);
    const nextStyle = styles[(currentIndex + 1) % styles.length];
    setMapStyle(nextStyle);
    map.current?.setStyle(nextStyle);
  };

  const storedApiKey = localStorage.getItem('mapbox_token');
  if (!apiKey && !storedApiKey) {
    return (
      <Card className="w-full h-96">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {t('interactiveMap')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            يتطلب عرض الخريطة التفاعلية مفتاح API من Mapbox
          </p>
          <div className="space-y-2">
            <Input
              placeholder="أدخل مفتاح Mapbox API"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              type="password"
            />
            <p className="text-xs text-muted-foreground">
              احصل على مفتاح مجاني من{' '}
              <a 
                href="https://account.mapbox.com/access-tokens/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                mapbox.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Map Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder={t('searchEvents')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Button onClick={centerMapOnUser} variant="outline" size="sm">
              <Navigation className="w-4 h-4 mr-2" />
              {t('myLocation')}
            </Button>
            
            <Button onClick={toggleMapStyle} variant="outline" size="sm">
              <Layers className="w-4 h-4 mr-2" />
              {t('mapStyle')}
            </Button>

            {selectedEvent && (
              <Button onClick={() => getDirections(selectedEvent)} size="sm">
                <Route className="w-4 h-4 mr-2" />
                {t('getDirections')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-96">
        {/* Map Container */}
        <div className="lg:col-span-2 relative">
          <div ref={mapContainer} className="w-full h-full rounded-lg" />
          {!mapReady && (
            <div className="absolute inset-0 bg-muted/50 flex items-center justify-center rounded-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">{t('loadingMap')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Events List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          <h3 className="font-semibold text-lg mb-3">{t('eventsOnMap')}</h3>
          {filteredEvents.map((event) => (
            <Card 
              key={event.id} 
              className={`cursor-pointer transition-colors ${
                selectedEvent?.id === event.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              }`}
              onClick={() => {
                setSelectedEvent(event);
                map.current?.flyTo({
                  center: event.location,
                  zoom: 14,
                  duration: 1500
                });
              }}
            >
              <CardContent className="p-3">
                <h4 className="font-medium text-sm mb-1">
                  {isRTL ? event.title_ar : event.title}
                </h4>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <Badge 
                    variant="secondary" 
                    className="text-xs"
                    style={{ backgroundColor: getCategoryColor(event.category) + '20' }}
                  >
                    {t(event.category)}
                  </Badge>
                  <span className="font-medium">{event.price} {t('currency')}</span>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span>⭐ {event.rating}</span>
                  <span>{event.date}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Category Legend */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium mb-3">{t('categoryLegend')}</h4>
          <div className="flex flex-wrap gap-3">
            {Object.entries({
              hiking: t('hiking'),
              diving: t('diving'),
              camping: t('camping'),
              cycling: t('cycling'),
              climbing: t('climbing')
            }).map(([category, label]) => (
              <div key={category} className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: getCategoryColor(category) }}
                ></div>
                <span className="text-sm">{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InteractiveMapbox;