import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  MapPin, 
  Navigation, 
  Layers, 
  Search, 
  Filter,
  Locate,
  Route,
  Star
} from 'lucide-react';

// Note: In a real implementation, you would import mapbox-gl
// import mapboxgl from 'mapbox-gl';
// import 'mapbox-gl/dist/mapbox-gl.css';

interface EventLocation {
  id: string;
  title: string;
  category: string;
  latitude: number;
  longitude: number;
  price: number;
  rating: number;
  date: Date;
  image?: string;
  description?: string;
}

interface EventMapProps {
  events: EventLocation[];
  center?: [number, number];
  zoom?: number;
  onEventSelect?: (event: EventLocation) => void;
  mapboxToken?: string;
}

export const EventMap = ({ 
  events, 
  center = [24.7136, 46.6753], // Riyadh coordinates
  zoom = 10,
  onEventSelect,
  mapboxToken 
}: EventMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventLocation | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapStyle, setMapStyle] = useState('streets');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMapReady, setIsMapReady] = useState(false);

  // Use provided events data only
  const eventsToShow = events;

  useEffect(() => {
    if (!mapContainer.current) return;

    // Map initialization - requires proper Mapbox token
    if (mapboxToken) {
      // Real implementation would initialize Mapbox here
      // mapboxgl.accessToken = mapboxToken;
      // map.current = new mapboxgl.Map({...})
    }
    
    setIsMapReady(true);

    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => console.log('Location access denied:', error)
      );
    }

    return () => {
      // Cleanup map
      if (map.current) {
        // map.current.remove();
      }
    };
  }, []);

  const handleEventClick = (event: EventLocation) => {
    setSelectedEvent(event);
    onEventSelect?.(event);
  };

  const centerMapOnUser = () => {
    if (userLocation && map.current) {
      // In real implementation: map.current.flyTo({ center: userLocation });
      console.log('Centering map on user location:', userLocation);
    }
  };

  const getDirections = (event: EventLocation) => {
    if (userLocation) {
      const mapsUrl = `https://www.google.com/maps/dir/${userLocation[0]},${userLocation[1]}/${event.latitude},${event.longitude}`;
      window.open(mapsUrl, '_blank');
    }
  };

  const filteredEvents = eventsToShow.filter(event =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'مغامرات': 'bg-green-500',
      'طعام': 'bg-orange-500',
      'فنون': 'bg-purple-500',
      'رياضة': 'bg-blue-500',
      'ثقافة': 'bg-indigo-500',
      'طبيعة': 'bg-emerald-500',
    };
    return colors[category] || 'bg-gray-500';
  };

  return (
    <div className="space-y-4">
      {/* Map Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث عن الفعاليات على الخريطة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={centerMapOnUser}>
                <Locate className="h-4 w-4 mr-2" />
                موقعي
              </Button>
              
              <Button variant="outline">
                <Layers className="h-4 w-4 mr-2" />
                النمط
              </Button>
              
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                فلتر
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Map Container */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              خريطة الفعاليات
            </CardTitle>
            <CardDescription>
              اكتشف الفعاليات القريبة منك على الخريطة
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div 
              ref={mapContainer} 
              className="w-full h-96 bg-muted rounded-lg relative overflow-hidden"
            >
              {!isMapReady ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">جاري تحميل الخريطة...</p>
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full bg-gradient-to-br from-green-100 to-blue-100">
                  {/* Mock Map with Event Markers */}
                  <div className="absolute inset-0 p-4">
                    <div className="text-center text-muted-foreground text-sm mb-4">
                      خريطة تفاعلية - {filteredEvents.length} فعالية
                    </div>
                    
                    {/* Mock Event Markers */}
                    {filteredEvents.map((event, index) => (
                      <div
                        key={event.id}
                        className={`absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 ${
                          selectedEvent?.id === event.id ? 'z-10 scale-110' : ''
                        }`}
                        style={{
                          left: `${20 + (index * 25)}%`,
                          top: `${30 + (index * 20)}%`,
                        }}
                        onClick={() => handleEventClick(event)}
                      >
                        <div className={`w-4 h-4 rounded-full ${getCategoryColor(event.category)} border-2 border-white shadow-lg`} />
                        {selectedEvent?.id === event.id && (
                          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-2 min-w-48 z-20">
                            <h4 className="font-semibold text-sm">{event.title}</h4>
                            <p className="text-xs text-muted-foreground">{event.category}</p>
                            <p className="text-xs font-medium">{event.price} ريال</p>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* User Location Mock */}
                    {userLocation && (
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Events List */}
        <Card>
          <CardHeader>
            <CardTitle>الفعاليات القريبة ({filteredEvents.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-accent/50 ${
                    selectedEvent?.id === event.id ? 'border-primary bg-accent/50' : ''
                  }`}
                  onClick={() => handleEventClick(event)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-3 h-3 rounded-full ${getCategoryColor(event.category)} mt-2`} />
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm mb-1 truncate">
                        {event.title}
                      </h4>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {event.category}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs">{event.rating}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-primary">
                          {event.price} ريال
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            getDirections(event);
                          }}
                        >
                          <Route className="h-3 w-3 mr-1" />
                          طريق
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredEvents.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>لا توجد فعاليات مطابقة للبحث</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium">الفئات:</span>
            {['مغامرات', 'طعام', 'فنون', 'رياضة', 'ثقافة', 'طبيعة'].map(category => (
              <div key={category} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getCategoryColor(category)}`} />
                <span className="text-xs">{category}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};