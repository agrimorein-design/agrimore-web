/**
 * MapPicker — Reusable map component for Agrimore
 * 
 * Features:
 *  - Auto-detect user location on toggle
 *  - Draggable center pin (move map, pin stays centered)
 *  - Fixed-card size — no fullscreen occupation
 *  - Default: Chinnamanur (9.8398, 77.3888)
 *  - Normal / Satellite layer toggle
 *  - Smooth Google Maps web iframe
 *  - Emits onLocationChange({ lat, lng, address })
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Platform, Dimensions, Switch, Animated
} from 'react-native';
import * as Location from 'expo-location';
import { Navigation2, Layers, Crosshair } from 'lucide-react-native';

const MAPS_KEY = 'AIzaSyCKL5RYJ39x93yz1Km59KwpYybRod3IOeg';
// Chinnamanur — default center
export const DEFAULT_COORD = { lat: 9.8398, lng: 77.3888 };

export interface MapCoord { lat: number; lng: number }

interface MapPickerProps {
  height?: number;
  initialCoord?: MapCoord;
  onLocationChange?: (coord: MapCoord, address: string) => void;
  showAutodetectToggle?: boolean;
}

/* ─── Web iframe html ─────────────────────────────────────────────────────── */
function buildMapHtml(lat: number, lng: number, mapType: string) {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { overflow:hidden; }
  #map { width:100vw; height:100vh; }

  /* Animated center pin */
  .pin-wrap {
    position:absolute; top:50%; left:50%;
    transform:translate(-50%, -100%);
    display:flex; flex-direction:column; align-items:center;
    z-index:999; pointer-events:none;
    transition: transform 0.15s ease;
  }
  .pin-wrap.dragging { transform:translate(-50%,-110%) scale(1.12); }

  .pin-head {
    width:38px; height:38px; border-radius:50%;
    background:linear-gradient(135deg,#145A32,#1e7a45);
    display:flex; align-items:center; justify-content:center;
    box-shadow: 0 6px 20px rgba(20,90,50,0.45);
  }
  .pin-dot { width:10px; height:10px; background:#D4A843; border-radius:50%; }
  .pin-stalk { width:4px; height:18px; background:#145A32; border-radius:0 0 3px 3px; }
  .pin-shadow {
    width:14px; height:5px; background:rgba(0,0,0,0.2);
    border-radius:50%; margin-top:2px;
    transform:scaleX(1); transition:transform 0.15s ease;
  }
  .pin-wrap.dragging .pin-shadow { transform:scaleX(0.6); }

  /* Layer toggle pills */
  #layer-toggle {
    position:absolute; top:12px; right:12px;
    background:#fff; border-radius:20px; padding:4px;
    display:flex; box-shadow:0 2px 10px rgba(0,0,0,0.15); z-index:10;
  }
  .layer-btn {
    padding:6px 14px; border-radius:16px; font-size:13px;
    font-weight:700; cursor:pointer; border:none; background:transparent; color:#6B7280;
  }
  .layer-btn.active { background:#145A32; color:#D4A843; }

  /* GPS fab */
  #gps-btn {
    position:absolute; bottom:90px; right:12px;
    width:44px; height:44px; background:#fff; border-radius:50%;
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 4px 12px rgba(0,0,0,0.2); cursor:pointer; z-index:10; border:none;
  }
  #gps-btn svg { width:22px; height:22px; stroke:#145A32; stroke-width:2; fill:none; }

  /* Address card */
  #addr-card {
    position:absolute; bottom:0; left:0; right:0;
    background:#fff; padding:14px 18px 18px;
    box-shadow:0 -4px 20px rgba(0,0,0,0.1);
    font-family:Georgia, serif; z-index:10;
  }
  #addr-label { font-size:11px; color:#9CA3AF; margin-bottom:4px; }
  #addr-text { font-size:15px; font-weight:bold; color:#111827; }
  #addr-sub { font-size:12px; color:#6B7280; margin-top:2px; }

  /* Loading overlay */
  #loader {
    position:absolute; inset:0; background:#F3F4F6;
    display:flex; align-items:center; justify-content:center;
    z-index:999; transition:opacity 0.3s;
  }
  .spinner {
    width:40px; height:40px; border:4px solid #E5E7EB;
    border-top-color:#145A32; border-radius:50%; animation:spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform:rotate(360deg); } }
</style>
</head>
<body>
  <div id="loader"><div class="spinner"></div></div>
  <div id="map"></div>

  <div class="pin-wrap" id="pin">
    <div class="pin-head"><div class="pin-dot"></div></div>
    <div class="pin-stalk"></div>
    <div class="pin-shadow"></div>
  </div>

  <div id="layer-toggle">
    <button class="layer-btn active" id="btn-road" onclick="setLayer('roadmap')">Map</button>
    <button class="layer-btn" id="btn-sat" onclick="setLayer('satellite')">Satellite</button>
  </div>

  <button id="gps-btn" onclick="gotoMyLocation()" title="My Location">
    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="9" stroke-dasharray="2 2"/></svg>
  </button>

  <div id="addr-card">
    <div id="addr-label">Delivery Location</div>
    <div id="addr-text">Locating...</div>
    <div id="addr-sub"> </div>
  </div>

  <script>
    let map, geocoder, isDragging = false, debounceTimer;
    const pin = document.getElementById('pin');

    function initMap() {
      geocoder = new google.maps.Geocoder();
      map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: ${lat}, lng: ${lng} },
        zoom: 16,
        mapTypeId: 'roadmap',
        disableDefaultUI: true,
        gestureHandling: 'greedy',
        styles: [
          { featureType:'poi', elementType:'labels', stylers:[{visibility:'off'}] }
        ]
      });

      // Hide loader once tiles load
      google.maps.event.addListenerOnce(map, 'tilesloaded', () => {
        document.getElementById('loader').style.opacity = '0';
        setTimeout(() => document.getElementById('loader').style.display = 'none', 300);
      });

      // Drag events — animate pin
      map.addListener('dragstart', () => {
        isDragging = true;
        pin.classList.add('dragging');
      });
      map.addListener('drag', () => {
        clearTimeout(debounceTimer);
      });
      map.addListener('dragend', () => {
        isDragging = false;
        pin.classList.remove('dragging');
        const c = map.getCenter();
        emitAndGeocode(c.lat(), c.lng());
      });
      map.addListener('zoom_changed', () => {
        const c = map.getCenter();
        emitAndGeocode(c.lat(), c.lng());
      });

      // First geocode
      emitAndGeocode(${lat}, ${lng});
    }

    function emitAndGeocode(lat, lng) {
      window.parent.postMessage({ type:'map_move', lat, lng }, '*');
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results[0]) {
            const r = results[0];
            const getC = t => (r.address_components.find(c => c.types.includes(t)) || {}).long_name || '';
            const street = getC('route') || getC('sublocality') || getC('locality') || 'Location';
            const area   = getC('locality') || getC('sublocality') || '';
            const state  = getC('administrative_area_level_1') || '';
            document.getElementById('addr-text').textContent = street;
            document.getElementById('addr-sub').textContent  = area ? area + ', ' + state : state;
            window.parent.postMessage({ type:'address_update', lat, lng,
              formatted: r.formatted_address,
              street, area, state,
              district: getC('administrative_area_level_3') || getC('administrative_area_level_2'),
              pincode:  getC('postal_code')
            }, '*');
          }
        });
      }, 600);
    }

    function setLayer(type) {
      map.setMapTypeId(type);
      document.getElementById('btn-road').className = 'layer-btn' + (type==='roadmap'?' active':'');
      document.getElementById('btn-sat').className  = 'layer-btn' + (type==='satellite'?' active':'');
    }

    function gotoMyLocation() {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(pos => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        map.panTo(c);
        map.setZoom(17);
        emitAndGeocode(c.lat, c.lng);
      });
    }

    // Listen for external "fly-to" messages
    window.addEventListener('message', e => {
      if (e.data && e.data.type === 'fly_to') {
        map.panTo({ lat: e.data.lat, lng: e.data.lng });
        map.setZoom(17);
        emitAndGeocode(e.data.lat, e.data.lng);
      }
    });
  </script>
  <script async defer src="https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&callback=initMap"></script>
</body>
</html>`;
}

/* ─── Main Component ──────────────────────────────────────────────────────── */
export default function MapPicker({
  height = 320,
  initialCoord = DEFAULT_COORD,
  onLocationChange,
  showAutodetectToggle = true,
}: MapPickerProps) {
  const [coord, setCoord] = useState<MapCoord>(initialCoord);
  const [address, setAddress] = useState('Locating...');
  const [autoDetect, setAutoDetect] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const iframeRef = useRef<any>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fade in once map declares ready
  useEffect(() => {
    if (mapReady) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [mapReady]);

  // Listen to iframe postMessage (web)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (event: any) => {
      if (!event.data) return;
      if (event.data.type === 'map_move') {
        const c = { lat: event.data.lat, lng: event.data.lng };
        setCoord(c);
        // onLocationChange will be called with address on address_update
      }
      if (event.data.type === 'address_update') {
        const c = { lat: event.data.lat, lng: event.data.lng };
        const addr = event.data.formatted || event.data.street || 'Selected Location';
        setAddress(addr);
        setCoord(c);
        onLocationChange?.(c, addr);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onLocationChange]);

  const flyTo = (lat: number, lng: number) => {
    if (Platform.OS === 'web' && iframeRef.current) {
      try {
        iframeRef.current.contentWindow?.postMessage({ type: 'fly_to', lat, lng }, '*');
      } catch {}
    }
  };

  const handleAutoDetectToggle = async (val: boolean) => {
    setAutoDetect(val);
    if (!val) return;

    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setAutoDetect(false); setIsLocating(false); return; }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const c = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setCoord(c);
      flyTo(c.lat, c.lng);
    } catch {
      setAutoDetect(false);
    } finally {
      setIsLocating(false);
    }
  };

  const initCoord = React.useRef({ lat: coord.lat, lng: coord.lng }).current;
  const html = React.useMemo(() => buildMapHtml(initCoord.lat, initCoord.lng, 'roadmap'), [initCoord]);
  return (
    <View style={styles.wrapper}>
      {/* Auto-detect toggle */}
      {showAutodetectToggle && (
        <View style={styles.toggleRow}>
          <View style={styles.toggleLeft}>
            <Navigation2 color="#145A32" size={16} />
            <Text style={styles.toggleLabel}>Auto-detect my location</Text>
          </View>
          {isLocating ? (
            <ActivityIndicator size="small" color="#145A32" />
          ) : (
            <Switch
              value={autoDetect}
              onValueChange={handleAutoDetectToggle}
              trackColor={{ false: '#E5E7EB', true: '#145A32' }}
              thumbColor="#FFF"
            />
          )}
        </View>
      )}

      {/* Map Card */}
      <View style={[styles.mapCard, { height }]}>
        {/* Skeleton loader */}
        {!mapReady && Platform.OS === 'web' && (
          <View style={styles.skeleton}>
            <ActivityIndicator color="#145A32" size="large" />
            <Text style={styles.skeletonText}>Loading map...</Text>
          </View>
        )}

        {/* Web iframe */}
        {Platform.OS === 'web' && (
          <Animated.View style={{ flex: 1, opacity: mapReady ? fadeAnim : 0 }}>
            {React.createElement('iframe', {
              ref: iframeRef,
              srcDoc: html,
              style: { width: '100%', height: '100%', border: 'none', borderRadius: 16 },
              onLoad: () => setMapReady(true),
            })}
          </Animated.View>
        )}

        {/* Native map (non-web) */}
        {Platform.OS !== 'web' && (
          <View style={{ flex: 1 }}>
            <Text style={{ textAlign: 'center', marginTop: 60, color: '#6B7280' }}>
              Native map renders here via react-native-maps
            </Text>
          </View>
        )}
      </View>

      {/* Address display below map */}
      <View style={styles.addrRow}>
        <View style={styles.addrPin} />
        <Text style={styles.addrText} numberOfLines={2}>{address}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F0FDF4', borderRadius: 14, paddingHorizontal: 16,
    paddingVertical: 12, marginBottom: 12, borderWidth: 1, borderColor: '#D1FAE5',
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleLabel: { fontSize: 14, fontWeight: '700', color: '#145A32', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  mapCard: {
    borderRadius: 20, overflow: 'hidden', backgroundColor: '#E5E7EB',
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 6,
  },
  skeleton: {
    ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F3F4F6', zIndex: 5,
  },
  skeletonText: { color: '#9CA3AF', fontSize: 14, marginTop: 12, fontWeight: '600' },
  addrRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingHorizontal: 4 },
  addrPin: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#145A32', marginRight: 10 },
  addrText: { flex: 1, fontSize: 13, color: '#374151', fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
});
