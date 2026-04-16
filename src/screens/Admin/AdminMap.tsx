import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator, TouchableOpacity, Linking, Dimensions, ScrollView } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from '../../components/MapWrapper';
import { Package } from 'lucide-react-native';

const WebAdminMapIframe = ({ adminLoc, users, orders, viewType, filter1Km, mapType }: any) => {
  if (Platform.OS !== 'web') return null;
  const mapCenter = adminLoc.latitude && adminLoc.longitude ? adminLoc : { latitude: 9.8398, longitude: 77.3888 };
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>body { margin: 0; padding: 0; } #map { width: 100vw; height: 100vh; background: #E5E7EB; }</style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          let map;
          let currentPolyline = null;
          function initMap() {
            map = new google.maps.Map(document.getElementById('map'), {
              center: {lat: ${mapCenter.latitude}, lng: ${mapCenter.longitude}},
              zoom: 14,
              mapTypeId: '${mapType}',
              disableDefaultUI: true,
            });


            // Admin marker
            new google.maps.Marker({
              position: {lat: ${mapCenter.latitude}, lng: ${mapCenter.longitude}},
              map,
              title: "Store Location",
              icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
            });

            const points = '${viewType}' === 'users' ? ${JSON.stringify(users)} : ${JSON.stringify(orders)};

            points.forEach(item => {
              const loc = item.location || (item.deliveryAddress && item.deliveryAddress.location);
              if(!loc || !loc.lat) return;
              
              const m = new google.maps.Marker({
                position: { lat: loc.lat, lng: loc.lng },
                map,
                title: item.name || item.userName || 'Unknown',
                icon: '${viewType}' === 'users' ? 'https://maps.google.com/mapfiles/ms/icons/red-dot.png' : 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
              });

              m.addListener('click', () => {
                if(currentPolyline) currentPolyline.setMap(null);
                
                currentPolyline = new google.maps.Polyline({
                  path: [
                    {lat: ${mapCenter.latitude}, lng: ${mapCenter.longitude}},
                    {lat: loc.lat, lng: loc.lng}
                  ],
                  geodesic: true,
                  strokeColor: '#3B82F6',
                  strokeOpacity: 1.0,
                  strokeWeight: 4
                });
                currentPolyline.setMap(map);

                window.parent.postMessage({ type: 'marker_click', itemId: item.id }, '*');
              });
            });
          }
        </script>
        <script async defer src="https://maps.googleapis.com/maps/api/js?key=AIzaSyCKL5RYJ39x93yz1Km59KwpYybRod3IOeg&callback=initMap"></script>
      </body>
    </html>
  `;
  
  return React.createElement('iframe', {
    srcDoc: html,
    style: { width: '100%', height: '100%', border: 'none' }
  });
};
import * as Location from 'expo-location';
import { db } from '../../firebase/config';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { Map, Navigation, Phone, MessageCircle, Clock, MapPin, X, Crosshair, ArrowLeft, ShoppingCart, MessageSquare, User } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');
const font = { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' };

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = deg2rad(lat2-lat1);
  const dLon = deg2rad(lon2-lon1); 
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; 
}
function deg2rad(deg: number) { return deg * (Math.PI/180); }

export default function AdminMap({ navigation }: any) {
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminLoc, setAdminLoc] = useState<any>(null);
  
  const [viewType, setViewType] = useState<'users' | 'deliveries'>('deliveries');
  const [filter1Km, setFilter1Km] = useState(false);
  const [mapType, setMapType] = useState<'roadmap'|'satellite'>('roadmap');
  const [selectedItem, setSelectedItem] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let loc = await Location.getCurrentPositionAsync({});
          setAdminLoc({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        } else {
          setAdminLoc({ latitude: 9.8398, longitude: 77.3888 });
        }
      } catch (e) {
        setAdminLoc({ latitude: 9.8398, longitude: 77.3888 });
      }
    })();

    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    getDocs(collection(db, 'orders')).then(snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    if (Platform.OS === 'web') {
      const handleWebMessage = (event: any) => {
        if (event.data && event.data.type === 'marker_click' && event.data.itemId) {
          setSelectedItem(event.data.itemId);
        }
      };
      window.addEventListener('message', handleWebMessage);
      return () => {
        unsub();
        window.removeEventListener('message', handleWebMessage);
      };
    }

    return () => unsub();
  }, []);

  const openWhatsApp = (phone: string, name: string) => {
    const p = phone?.startsWith('+91') ? phone : '+91' + phone;
    Linking.openURL(`whatsapp://send?phone=${p.replace('+', '')}&text=Hello ${name}...`);
  };

  const callUser = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const getFilteredUsers = () => {
    let filtered = users.filter(u => u.location && u.location.lat && u.location.lng);
    
    if (filter1Km && adminLoc) {
      filtered = filtered.filter(u => {
        const dist = getDistanceFromLatLonInKm(adminLoc.latitude, adminLoc.longitude, u.location.lat, u.location.lng);
        return dist <= 1.0;
      });
    }
    return filtered;
  };

  const getUserStats = (userId: string) => {
    const userOrders = orders.filter(o => o.userId === userId);
    return { orderCount: userOrders.length };
  };

  const getFilteredOrders = () => {
    let filtered = orders.filter(o => o.deliveryAddress?.location?.lat && o.status !== 'delivered' && o.status !== 'cancelled');
    if (filter1Km && adminLoc) {
      filtered = filtered.filter(o => getDistanceFromLatLonInKm(adminLoc.latitude, adminLoc.longitude, o.deliveryAddress.location.lat, o.deliveryAddress.location.lng) <= 1.0);
    }
    return filtered.map(o => ({ ...o, location: o.deliveryAddress.location, name: o.deliveryAddress.name, phone: o.deliveryAddress.phone }));
  };

  const displayUsers = getFilteredUsers();
  const displayOrders = getFilteredOrders();
  const currentPoints = viewType === 'users' ? displayUsers : displayOrders;
  const detailedItem = currentPoints.find(p => p.id === selectedItem);

  if (loading || !adminLoc) return <View style={s.center}><ActivityIndicator size="large" color="#3B82F6" /></View>;

  return (
    <View style={s.root}>
      {Platform.OS === 'web' ? (
        <WebAdminMapIframe adminLoc={adminLoc} users={displayUsers} orders={displayOrders} viewType={viewType} filter1Km={filter1Km} mapType={mapType} />
      ) : !MapView ? (
        <View style={s.center}><Text>Native Map Not Found</Text></View>
      ) : (
        <MapView
          style={s.map}
          provider={PROVIDER_GOOGLE}
          mapType={mapType === 'satellite' ? 'satellite' : 'standard'}
          initialRegion={{
            latitude: adminLoc.latitude,
            longitude: adminLoc.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {/* Admin Location */}
          <Marker coordinate={adminLoc} title="My Location" pinColor="blue" zIndex={999} />

          {/* Points */}
        {currentPoints.map(p => {
          const stats = viewType === 'users' ? getUserStats(p.id) : null;
          return (
            <Marker
              key={p.id}
              coordinate={{ latitude: p.location.lat, longitude: p.location.lng }}
              title={p.name || 'Unknown'}
              description={viewType === 'users' ? `${stats?.orderCount||0} Orders - ${p.phone || 'No Phone'}` : `₹${p.totalAmount} - ${p.status}`}
              pinColor={viewType === 'users' ? 'red' : 'green'}
              onPress={() => setSelectedItem(p.id)}
            />
          );
        })}

        {/* Direction line if selected */}
        {detailedItem && detailedItem.location && (
          <Polyline
            coordinates={[
              adminLoc,
              { latitude: detailedItem.location.lat, longitude: detailedItem.location.lng }
            ]}
            strokeColor="#3B82F6"
            strokeWidth={4}
          />
        )}
      </MapView>
      )}

      {/* Floating Header Actions */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.canGoBack() && navigation.goBack()}>
          <ArrowLeft color="#1F2937" size={24} />
        </TouchableOpacity>
        
        {/* Toggle Users/Deliveries */}
        <View style={s.toggleWrap}>
          <TouchableOpacity style={[s.toggleBtn, viewType === 'users' && s.toggleBtnAct]} onPress={() => {setViewType('users'); setSelectedItem(null);}}>
            <User color={viewType === 'users' ? '#FFF' : '#6B7280'} size={14} />
            <Text style={[font, s.toggleTxt, viewType === 'users' && s.toggleTxtAct]}>Users</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.toggleBtn, viewType === 'deliveries' && s.toggleBtnAct]} onPress={() => {setViewType('deliveries'); setSelectedItem(null);}}>
            <Package color={viewType === 'deliveries' ? '#FFF' : '#6B7280'} size={14} />
            <Text style={[font, s.toggleTxt, viewType === 'deliveries' && s.toggleTxtAct]}>Deliveries</Text>
          </TouchableOpacity>
        </View>
        
        {/* Layer Toggle Component */}
        <View style={s.toggleWrap}>
          <TouchableOpacity 
            style={[s.toggleBtn, mapType === 'roadmap' && s.toggleBtnAct]} 
            onPress={() => setMapType('roadmap')}>
            <Text style={[font, s.toggleTxt, mapType === 'roadmap' && s.toggleTxtAct]}>Normal</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[s.toggleBtn, mapType === 'satellite' && s.toggleBtnAct]} 
            onPress={() => setMapType('satellite')}>
            <Text style={[font, s.toggleTxt, mapType === 'satellite' && s.toggleTxtAct]}>Satellite</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={[s.filterBtn, filter1Km && s.filterBtnActive]} onPress={() => setFilter1Km(!filter1Km)}>
            <Crosshair color={filter1Km ? '#FFF' : '#4B5563'} size={16} />
            <Text style={[font, { color: filter1Km ? '#FFF' : '#4B5563', fontSize: 12, fontWeight: 'bold', marginLeft: 4 }]}>&lt; 1KM</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Selected Item Bottom Sheet */}
      {detailedItem && (
        <View style={s.bottomSheet}>
          <TouchableOpacity style={s.closeSheet} onPress={() => setSelectedItem(null)}>
            <X color="#9CA3AF" size={20} />
          </TouchableOpacity>
          
          <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, paddingRight: 40 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                   <View style={s.avatar}>{viewType === 'users' ? <User color="#3B82F6" size={18} /> : <Package color="#3B82F6" size={18}/>}</View>
                   <Text style={[font, { fontSize: 20, fontWeight: '900', color: '#111827' }]}>{detailedItem.name || detailedItem.userName || 'Unknown'}</Text>
                </View>
                <Text style={[font, { fontSize: 14, color: '#6B7280', marginTop: 2 }]}>{detailedItem.phone || 'No Mobile Number'}</Text>
              </View>
              {viewType === 'users' ? (
                <View style={s.amtBadge}>
                  <ShoppingCart color="#FFF" size={14} />
                  <Text style={[font, { fontSize: 14, fontWeight: 'bold', color: '#FFF', marginLeft: 4 }]}>{getUserStats(detailedItem.id).orderCount} Orders</Text>
                </View>
              ) : (
                <View style={[s.amtBadge, { backgroundColor: '#10B981' }]}>
                  <Text style={[font, { fontSize: 16, fontWeight: 'bold', color: '#FFF' }]}>₹{detailedItem.totalAmount}</Text>
                </View>
              )}
            </View>

            <View style={s.addrBox}>
              <MapPin color="#EF4444" size={16} />
              <Text style={[font, { fontSize: 13, color: '#374151', marginLeft: 8, flex: 1, lineHeight: 20 }]}>{detailedItem.defaultAddress || detailedItem.address || 'Address not mapped'}</Text>
            </View>

            <View style={s.actionRow}>
              {detailedItem.phone ? (
                <>
                  <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]} onPress={() => callUser(detailedItem.phone)}>
                    <Phone color="#16A34A" size={20} />
                    <Text style={[font, { color: '#16A34A', fontSize: 14, fontWeight: 'bold', marginLeft: 8 }]}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#ECFCCB', borderColor: '#D9F99D' }]} onPress={() => openWhatsApp(detailedItem.phone, detailedItem.name || detailedItem.userName)}>
                    <MessageCircle color="#65A30D" size={20} />
                    <Text style={[font, { color: '#65A30D', fontSize: 14, fontWeight: 'bold', marginLeft: 8 }]}>WhatsApp</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={[font, { color: '#9CA3AF', fontSize: 14, marginTop: 10 }]}>No phone number available to contact.</Text>
              )}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  map: { ...StyleSheet.absoluteFillObject },
  topBar: { position: 'absolute', top: 50, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 20 },
  backBtn: { backgroundColor: '#FFF', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
  filterBtnActive: { backgroundColor: '#3B82F6' },
  toggleWrap: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 20, padding: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, gap: 4 },
  toggleBtnAct: { backgroundColor: '#3B82F6' },
  toggleTxt: { fontSize: 12, fontWeight: '800', color: '#6B7280' },
  toggleTxtAct: { color: '#FFF' },
  bottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingTop: 30, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 20, maxHeight: height * 0.5 },
  closeSheet: { position: 'absolute', top: 16, right: 20, padding: 8, zIndex: 10 },
  avatar: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  amtBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B82F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  addrBox: { flexDirection: 'row', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, marginTop: 16, alignItems: 'flex-start', borderWidth: 1, borderColor: '#F3F4F6' },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, borderWidth: 1 }
});
