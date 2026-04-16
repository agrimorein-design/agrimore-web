import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, ActivityIndicator, Dimensions } from 'react-native';
import { db } from '../../firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { ArrowLeft, Phone, MessageCircle, MapPin, Package, CheckCircle, Truck, ChefHat, Clock, Navigation } from 'lucide-react-native';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

const font = {
  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  fontStyle: 'italic' as const,
};

const STORE_LOCATION = { latitude: 9.8398, longitude: 77.3888 }; // Chinnamanur Store Default

const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; const dLat = (lat2 - lat1) * Math.PI / 180; const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const WebTrackingMap = ({ storeLoc, userLoc, showRoute }: any) => {
  if (Platform.OS !== 'web') return null;
  const mapCenter = userLoc ? userLoc : storeLoc;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>body { margin: 0; padding: 0; } #map { width: 100vw; height: 100vh; background: #E5E7EB; }</style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          function initMap() {
            const map = new google.maps.Map(document.getElementById('map'), {
              center: {lat: ${mapCenter.latitude}, lng: ${mapCenter.longitude}},
              zoom: 13,
              disableDefaultUI: true,
            });

            const storeLoc = {lat: ${storeLoc.latitude}, lng: ${storeLoc.longitude}};
            new google.maps.Marker({
              position: storeLoc,
              map,
              title: "Agrimore Store",
              icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
            });

            ${userLoc ? `
              const userLoc = {lat: ${userLoc.latitude}, lng: ${userLoc.longitude}};
              new google.maps.Marker({
                position: userLoc,
                map,
                title: "Delivery Location",
                icon: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
              });

              if (${showRoute}) {
                new google.maps.Polyline({
                  path: [storeLoc, userLoc],
                  geodesic: true,
                  strokeColor: '#145A32',
                  strokeOpacity: 1.0,
                  strokeWeight: 4
                }).setMap(map);
                
                // Adjust bounds
                const bounds = new google.maps.LatLngBounds();
                bounds.extend(storeLoc);
                bounds.extend(userLoc);
                map.fitBounds(bounds, { padding: 50 });
              }
            ` : ''}
          }
        </script>
        <script async defer src="https://maps.googleapis.com/maps/api/js?key=AIzaSyCKL5RYJ39x93yz1Km59KwpYybRod3IOeg&callback=initMap"></script>
      </body>
    </html>
  `;
  return React.createElement('iframe', { srcDoc: html, style: { width: '100%', height: '100%', border: 'none' } });
};

const TIMELINE_STEPS = [
  { key: 'placed', label: 'Order Placed', desc: 'Your order has been confirmed', icon: Package },
  { key: 'accepted', label: 'Accepted', desc: 'Store accepted your order', icon: CheckCircle },
  { key: 'preparing', label: 'Preparing', desc: 'Your order is being packed', icon: ChefHat },
  { key: 'out for delivery', label: 'On the Way', desc: 'Delivery partner is arriving', icon: Truck },
  { key: 'delivered', label: 'Delivered', desc: 'Enjoy your fresh items', icon: CheckCircle },
];

export default function OrderTracking({ route, navigation }: any) {
  const [order, setOrder] = useState<any>(route?.params?.order || null);
  const [loading, setLoading] = useState(!route?.params?.order);
  const [currentLoc, setCurrentLoc] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let loc = await Location.getCurrentPositionAsync({});
          setCurrentLoc({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }
      } catch (e) {}
    })();

    const orderId = order?.id || route?.params?.orderId;
    if (!orderId) { setLoading(false); return; }

    const unsub = onSnapshot(doc(db, 'orders', orderId), (snap) => {
      if (snap.exists()) setOrder({ id: snap.id, ...snap.data() });
      setLoading(false);
    });
    return () => unsub();
  }, [route?.params?.orderId]);

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#145A32" /></View>;
  if (!order) return <View style={s.center}><Text style={[font,{color:'#6B7280'}]}>Order not found</Text></View>;

  const userLoc = order.location ? { latitude: order.location.lat, longitude: order.location.lng } : currentLoc;
  const distance = userLoc ? haversine(STORE_LOCATION.latitude, STORE_LOCATION.longitude, userLoc.latitude, userLoc.longitude) : 0;
  const etaMins = userLoc ? Math.ceil((distance / 30) * 60) + 15 : 0; // rough 30km/h avg speed + 15 min prep

  const currentStepIndex = TIMELINE_STEPS.findIndex(s => s.key === order.status);
  const isDelivered = order.status === 'delivered';

  return (
    <View style={s.root}>
      {/* Full Screen Map UI */}
      <View style={s.mapArea}>
        {Platform.OS === 'web' ? (
          <WebTrackingMap storeLoc={STORE_LOCATION} userLoc={userLoc} showRoute={order.status === 'out for delivery' || order.status === 'preparing'} />
        ) : (
          <View style={s.mapFallback}><Text style={{color:'#6B7280'}}>Map native not set</Text></View>
        )}
      </View>

      {/* Floating Header */}
      <View style={s.headerFloat}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtnFloat}>
          <ArrowLeft color="#1F2937" size={24} />
        </TouchableOpacity>
        <View style={s.distBadge}>
          <Navigation color="#145A32" size={16} />
          <Text style={[font, s.distText]}>{distance.toFixed(1)} km away</Text>
        </View>
      </View>

      {/* Detail Bottom Sheet */}
      <View style={s.bottomSheet}>
        <View style={s.sheetHandle} />
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Status Main */}
          <View style={s.statusMainBox}>
            <View>
              <Text style={[font, { fontSize: 24, fontWeight: '900', color: '#111827' }]}>
                {isDelivered ? 'Delivered successfully 🎉' : order.status === 'out for delivery' ? 'Arriving soon 🚚' : 'Preparing Order 👨‍🍳'}
              </Text>
              {!isDelivered && (
                <Text style={[font, { fontSize: 14, color: '#6B7280', marginTop: 4 }]}>Due in <Text style={{color:'#145A32',fontWeight:'bold'}}>{etaMins} mins</Text> • Distance {distance.toFixed(1)} km</Text>
              )}
            </View>
            <View style={s.timerCircle}>
              <Clock color="#D4A843" size={20} />
              <Text style={[font, s.timerTxt]}>{!isDelivered ? etaMins : '0'}</Text>
            </View>
          </View>

          {/* Delivery Partner */}
          {order.status === 'out for delivery' && (
            <View style={s.driverCard}>
              <View style={s.driverAvatar}><Text style={s.driverEmoji}>🧑‍💼</Text></View>
              <View style={s.driverInfo}>
                <Text style={[font, s.driverName]}>Ravi Kumar</Text>
                <Text style={[font, s.driverRole]}>Delivery Partner</Text>
              </View>
              <TouchableOpacity style={[s.driverAction, { backgroundColor: 'rgba(20,90,50,0.1)' }]}>
                <Phone color="#145A32" size={18} />
              </TouchableOpacity>
            </View>
          )}

          {/* Address */}
          <View style={s.addrCard}>
            <MapPin color="#145A32" size={20} />
            <Text style={[font, {flex: 1, marginLeft: 12, fontSize: 14, color: '#374151', lineHeight: 20}]}>
              {typeof order.address === 'string' ? order.address : order.deliveryAddress?.address || 'Your saved delivery location'}
            </Text>
          </View>

          {/* Timeline Timeline */}
          <Text style={[font, {fontSize: 18, fontWeight: '900', color: '#111827', marginVertical: 16}]}>Order Progress</Text>
          <View style={s.timeline}>
            {TIMELINE_STEPS.map((step, i) => {
              const isComplete = i <= currentStepIndex;
              const isCurrent = i === currentStepIndex;
              const StepIcon = step.icon;
              return (
                <View key={step.key} style={s.timelineStep}>
                  <View style={s.timelineLeft}>
                    <View style={[s.timelineDot, isComplete && s.timelineDotActive, isCurrent && s.timelineDotCurrent]}>
                      <StepIcon color={isComplete ? '#FFF' : '#D1D5DB'} size={16} />
                    </View>
                    {i < TIMELINE_STEPS.length - 1 && <View style={[s.timelineLine, isComplete && s.timelineLineActive]} />}
                  </View>
                  <View style={s.timelineContent}>
                    <Text style={[font, { fontSize: 15, fontWeight: isCurrent ? '900' : '700', color: isComplete ? '#1F2937' : '#9CA3AF' }]}>{step.label}</Text>
                    <Text style={[font, { fontSize: 13, color: '#9CA3AF', marginTop: 2 }]}>{step.desc}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mapArea: { flex: 1, backgroundColor: '#E5E7EB' },
  mapFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerFloat: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 },
  backBtnFloat: { width: 44, height: 44, backgroundColor: '#FFF', borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: {width:0,height:4}, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
  distBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, shadowColor: '#000', shadowOffset: {width:0,height:4}, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
  distText: { fontSize: 14, fontWeight: 'bold', color: '#145A32', marginLeft: 6 },
  
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0, 
    backgroundColor: '#FFF', borderTopLeftRadius: 36, borderTopRightRadius: 36,
    height: height * 0.55,
    shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 15,
  },
  sheetHandle: { width: 40, height: 5, backgroundColor: '#E5E7EB', borderRadius: 3, alignSelf: 'center', marginVertical: 12 },
  statusMainBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingTop: 10 },
  timerCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(212,168,67,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#D4A843' },
  timerTxt: { fontSize: 13, fontWeight: '900', color: '#145A32', marginTop: -2 },
  
  driverCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 20,
    padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6',
  },
  driverAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(212,168,67,0.15)', alignItems: 'center', justifyContent: 'center' },
  driverEmoji: { fontSize: 24 },
  driverInfo: { flex: 1, marginLeft: 14 },
  driverName: { fontSize: 16, fontWeight: '900', color: '#1F2937' },
  driverRole: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  driverAction: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  
  addrCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#BBF7D0', marginBottom: 20 },
  
  timeline: { paddingLeft: 4 },
  timelineStep: { flexDirection: 'row', minHeight: 64 },
  timelineLeft: { alignItems: 'center', width: 40 },
  timelineDot: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#E5E7EB',
  },
  timelineDotActive: { backgroundColor: '#145A32', borderColor: '#145A32' },
  timelineDotCurrent: { backgroundColor: '#D4A843', borderColor: '#D4A843', shadowColor: '#D4A843', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 },
  timelineLine: { flex: 1, width: 2, backgroundColor: '#E5E7EB', borderRadius: 1, marginVertical: 4 },
  timelineLineActive: { backgroundColor: '#145A32' },
  timelineContent: { flex: 1, marginLeft: 16, paddingBottom: 24 },
});

