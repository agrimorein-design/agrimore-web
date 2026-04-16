import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { db } from '../../firebase/config';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import * as Location from 'expo-location';
import { ArrowLeft, Navigation, Crosshair, CheckCircle, MapPin } from 'lucide-react-native';

const STORE_LOCATION = { latitude: 9.8398, longitude: 77.3888 }; // Chinnamanur Store Default
const font = { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' };

const WebDeliveryMapIframe = ({ storeLoc, custLoc, onReady, iframeRef }: any) => {
  if (Platform.OS !== 'web') return null;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>body { margin: 0; padding: 0; } #map { width: 100vw; height: 100vh; background: #E5E7EB; }</style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          let map;
          let directionsService;
          let directionsRenderer;

          function initMap() {
            directionsService = new google.maps.DirectionsService();
            directionsRenderer = new google.maps.DirectionsRenderer({
              suppressMarkers: true,
              polylineOptions: { strokeColor: '#145A32', strokeWeight: 5 }
            });

            map = new google.maps.Map(document.getElementById('map'), {
              center: {lat: ${storeLoc.latitude}, lng: ${storeLoc.longitude}},
              zoom: 14,
              disableDefaultUI: true,
              gestureHandling: 'greedy'
            });
            directionsRenderer.setMap(map);

            const sLoc = {lat: ${storeLoc.latitude}, lng: ${storeLoc.longitude}};
            const cLoc = {lat: ${custLoc.latitude}, lng: ${custLoc.longitude}};
            
            new google.maps.Marker({ position: sLoc, map, title: "Store", icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png' });
            new google.maps.Marker({ position: cLoc, map, title: "Customer Location", icon: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png' });

            // Fit
            const bounds = new google.maps.LatLngBounds(); bounds.extend(sLoc); bounds.extend(cLoc); map.fitBounds(bounds, { padding: 40 });

            window.parent.postMessage({ type: 'map_ready' }, '*');
          }

          window.addEventListener('message', e => {
            if (e.data.type === 'center_store') {
               map.panTo({lat: ${storeLoc.latitude}, lng: ${storeLoc.longitude}});
               map.setZoom(16);
            } else if (e.data.type === 'show_route') {
               directionsService.route({ origin: {lat: ${storeLoc.latitude}, lng: ${storeLoc.longitude}}, destination: {lat: ${custLoc.latitude}, lng: ${custLoc.longitude}}, travelMode: 'DRIVING' }, (response, status) => {
                 if (status === 'OK') {
                   directionsRenderer.setDirections(response);
                 }
               });
            }
          });
        </script>
        <script async defer src="https://maps.googleapis.com/maps/api/js?key=AIzaSyCKL5RYJ39x93yz1Km59KwpYybRod3IOeg&callback=initMap"></script>
      </body>
    </html>
  `;
  return React.createElement('iframe', { ref: iframeRef, srcDoc: html, style: { width: '100%', height: '100%', border: 'none' } });
};

export default function AdminDeliveryRoute({ route, navigation }: any) {
  const { order } = route.params;
  const [loading, setLoading] = useState(false);
  const [routed, setRouted] = useState(false);
  const iframeRef = useRef<any>(null);

  const loc = order?.location || order?.deliveryAddress?.location || STORE_LOCATION;
  const custLoc = { latitude: loc.lat || loc.latitude, longitude: loc.lng || loc.longitude };

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleWebMessage = (e: any) => {
        if (e.data.type === 'map_ready') {
          // Ready
        }
      };
      window.addEventListener('message', handleWebMessage);
      return () => window.removeEventListener('message', handleWebMessage);
    }
  }, []);

  const drawRoute = () => {
    setRouted(true);
    if (Platform.OS === 'web' && iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage({ type: 'show_route' }, '*');
    }
  };

  const centerMe = () => {
    if (Platform.OS === 'web' && iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage({ type: 'center_store' }, '*');
    }
  };

  const confirmDelivery = async () => {
    setLoading(true);
    try {
      if(order.status !== 'out for delivery') {
        const orderRef = doc(db, 'orders', order.id);
        await updateDoc(orderRef, { status: 'out for delivery', updatedAt: new Date() });
        // Notification
        if (order.userId) {
          await addDoc(collection(db, 'users', order.userId, 'notifications'), {
            title: 'Out for Delivery 🚚', body: 'Get ready! Our delivery partner is on the way to your home.', emoji: '🚚', createdAt: new Date(), unread: true, orderId: order.id
          });
        }
      }
      Alert.alert('Success', 'Order assigned and route confirmed!');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <View style={s.mapArea}>
        {Platform.OS === 'web' ? (
          <WebDeliveryMapIframe storeLoc={STORE_LOCATION} custLoc={custLoc} iframeRef={iframeRef} />
        ) : (
          <View style={s.mapFallback}><Text style={{color:'#6B7280'}}>Map native not set</Text></View>
        )}
      </View>

      <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
        <ArrowLeft color="#1F2937" size={24} />
      </TouchableOpacity>
      
      {/* Step 5: My Location */}
      <TouchableOpacity style={s.gpsBtn} onPress={centerMe}>
        <Crosshair color="#145A32" size={24} />
      </TouchableOpacity>

      <View style={s.bottomPanel}>
        <View style={s.panelHead}>
          <Text style={[font, s.pTitle]}>Assign Delivery Path</Text>
          <Text style={[font, s.pSub]}>{order.userName} • #{order.id.substring(0,6).toUpperCase()}</Text>
        </View>
        <Text style={[font, s.address]}>{typeof order.address === 'string' ? order.address : order.deliveryAddress?.address || 'Location Area'}</Text>
        
        <View style={s.actions}>
          {/* Step 4: Direction Start */}
          <TouchableOpacity style={[s.actionBtn, s.dirBtn, routed && s.dirBtnActive]} onPress={drawRoute}>
             <Navigation color={routed ? '#FFF' : '#145A32'} size={20} />
             <Text style={[font, s.btnText, routed && { color: '#FFF' }]}>{routed ? 'Route Generated' : '🧭 Auto Direction'}</Text>
          </TouchableOpacity>

          {/* Step 6: Delivery Confirm */}
          <TouchableOpacity style={[s.actionBtn, s.confBtn, !routed && { opacity: 0.5 }]} disabled={!routed || loading} onPress={confirmDelivery}>
            {loading ? <ActivityIndicator color="#145A32" /> : (
              <>
                <CheckCircle color="#145A32" size={20} />
                <Text style={[font, s.btnText, { color: '#145A32' }]}>✅ Confirm Submit</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  mapArea: { flex: 1, backgroundColor: '#E5E7EB' },
  mapFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backBtn: { position: 'absolute', top: 50, left: 20, width: 44, height: 44, backgroundColor: '#FFF', borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: {width:0,height:4}, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
  gpsBtn: { position: 'absolute', bottom: 220, right: 20, width: 50, height: 50, backgroundColor: '#FFF', borderRadius: 25, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: {width:0,height:4}, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
  bottomPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 24, paddingBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20 },
  panelHead: { marginBottom: 10 },
  pTitle: { fontSize: 22, fontWeight: '900', color: '#111827' },
  pSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  address: { fontSize: 13, color: '#374151', padding: 12, backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 20 },
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, borderWidth: 1 },
  dirBtn: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  dirBtnActive: { backgroundColor: '#145A32', borderColor: '#145A32' },
  confBtn: { backgroundColor: '#D4A843', borderColor: '#D4A843' },
  btnText: { fontSize: 14, fontWeight: 'bold', marginLeft: 8, color: '#145A32' }
});
