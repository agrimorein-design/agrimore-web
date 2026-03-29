import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, TouchableOpacity, Alert, Linking, Modal, Dimensions, Image, TextInput, Switch } from 'react-native';
import { db } from '../../firebase/config';
import { collection, onSnapshot, doc, updateDoc, query, orderBy, addDoc, getDoc } from 'firebase/firestore';
import { Phone, MessageSquare, Printer, Map as MapIcon, List, X, ChevronDown, ChevronUp, Send, MessageCircle, MapPin, Calendar, Navigation2, Layers } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Location from 'expo-location';

import MapView, { Marker, Circle, Polyline, PROVIDER_GOOGLE } from '../../components/MapWrapper';

// Helper to render Iframe on Web cleanly
const WebMapIframe = ({ adminLoc, ofdOrders, routeCoords, showRoute, colors, mapType }: any) => {
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
          function initMap() {
            map = new google.maps.Map(document.getElementById('map'), {
              center: {lat: ${mapCenter.latitude}, lng: ${mapCenter.longitude}},
              zoom: 14,
              mapTypeId: '${mapType}' === 'satellite' ? 'satellite' : 'roadmap',
              disableDefaultUI: true,
            });

            // Admin marker
            new google.maps.Marker({
              position: {lat: ${mapCenter.latitude}, lng: ${mapCenter.longitude}},
              map,
              title: "Store Location",
              icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
            });

            // Rings
            [100, 500, 1000].forEach((r, i) => {
               const ringColors = ['#16A34A', '#3B82F6', '#F59E0B'];
               new google.maps.Circle({
                 strokeColor: ringColors[i],
                 strokeOpacity: 0.8,
                 strokeWeight: 2,
                 fillColor: ringColors[i],
                 fillOpacity: 0.1,
                 map,
                 center: {lat: ${mapCenter.latitude}, lng: ${mapCenter.longitude}},
                 radius: r
               });
            });

            const orders = ${JSON.stringify(ofdOrders)};
            const colors = ${JSON.stringify(colors)};

            orders.forEach(o => {
              const loc = o.deliveryAddress && o.deliveryAddress.location;
              if(!loc || !loc.lat) return;
              
              const m = new google.maps.Marker({
                position: { lat: loc.lat, lng: loc.lng },
                map,
                title: o.userName + " (" + Number(o.distance).toFixed(2) + "km)"
              });
              
              m.addListener('click', () => {
                window.parent.postMessage({ type: 'marker_click', orderId: o.id }, '*');
              });
            });

            const showRoute = ${showRoute};
            if (showRoute) {
              const routeCoords = ${JSON.stringify(routeCoords)};
              if (routeCoords && routeCoords.length > 1) {
                const latlngs = routeCoords.map(c => ({lat: c.latitude, lng: c.longitude}));
                new google.maps.Polyline({
                  path: latlngs,
                  geodesic: true,
                  strokeColor: '#3B82F6',
                  strokeOpacity: 1.0,
                  strokeWeight: 4
                }).setMap(map);
              }
            }
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

const font = { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' };
const { width: SW } = Dimensions.get('window');

const STATUS_FLOW = ['placed', 'accepted', 'preparing', 'out for delivery', 'delivered'];
const STATUS_LABELS: Record<string, string> = { placed: '📦 Placed', accepted: '✅ Accepted', preparing: '👨‍🍳 Preparing', 'out for delivery': '🚚 OFD', delivered: '🎉 Done' };
const STATUS_COLORS: Record<string, string> = { placed: '#3B82F6', accepted: '#8B5CF6', preparing: '#F59E0B', 'out for delivery': '#2563EB', delivered: '#16A34A' };
const DIST_COLORS: Record<string, string> = { '0-100m': '#16A34A', '100m-500m': '#3B82F6', '500m-1km': '#F59E0B', '1km-2km': '#EF4444', '>2km': '#6B7280' };

// Haversine distance
const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; const dLat = (lat2 - lat1) * Math.PI / 180; const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
const getDistRange = (d: number) => d < 0.1 ? '0-100m' : d < 0.5 ? '100m-500m' : d < 1 ? '500m-1km' : d < 2 ? '1km-2km' : '>2km';

import { useNavigation } from '@react-navigation/native';

export default function AdminOrders() {
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [adminLoc, setAdminLoc] = useState({ latitude: 9.8398, longitude: 77.3888 });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [invoiceModal, setInvoiceModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [customerModal, setCustomerModal] = useState(false);
  const [mapOrder, setMapOrder] = useState<any>(null);
  const [showRoute, setShowRoute] = useState(false);
  const [mapType, setMapType] = useState('standard'); // 'standard' | 'satellite'
  
  // Date filter for map
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'all'>('today');

  const [payModal, setPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', txId: '', autoAction: true });
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let loc = await Location.getCurrentPositionAsync({});
          setAdminLoc({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }
      } catch (e) { console.log('Loc error:', e); }
    })();
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setOrders(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Web iframe marker click listener
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleWebMessage = (event: any) => {
        if (event.data && event.data.type === 'marker_click' && event.data.orderId) {
          const ord = orders.find(o => o.id === event.data.orderId);
          if (ord) {
            setMapOrder(ord);
            setCustomerModal(true);
          }
        }
      };
      window.addEventListener('message', handleWebMessage);
      return () => window.removeEventListener('message', handleWebMessage);
    }
  }, [orders]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { status: newStatus, updatedAt: new Date() });
      
      // Send Notification to User
      const order = orders.find(o => o.id === orderId);
      if (order?.userId) {
        const notifRef = collection(db, 'users', order.userId, 'notifications');
        const statusMap: any = {
          accepted: { title: 'Order Accepted ✅', body: 'Great news! Your order has been accepted and is being processed.', emoji: '✅' },
          preparing: { title: 'Preparing Your Order 👨‍🍳', body: 'The farm is getting your fresh items ready for dispatch.', emoji: '👨‍🍳' },
          'out for delivery': { title: 'Out for Delivery 🚚', body: 'Get ready! Our delivery partner is on the way to your home.', emoji: '🚚' },
          delivered: { title: 'Order Delivered 🎉', body: 'Your fresh items have been delivered. Enjoy!', emoji: '🎉' },
        };
        const n = statusMap[newStatus];
        if (n) {
          await addDoc(notifRef, { ...n, createdAt: new Date(), unread: true, orderId });
        }
      }

      Alert.alert('✅', `Status: ${newStatus}`);
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleVerifyPayment = async () => {
    if(!selectedOrder) return;
    const amt = parseFloat(payForm.amount);
    if(isNaN(amt) || amt <= 0) return Alert.alert('Error', 'Enter a valid amount');
    if(!payForm.txId) return Alert.alert('Validation', 'Enter Payer ID or Transaction Ref');
    
    setIsVerifying(true);
    try {
      const dbAmt = parseFloat(selectedOrder.totalAmount);
      const updates: any = { paymentStatus: 'paid', paymentMethod: `Verified: ${payForm.txId}` };
      if (payForm.autoAction && selectedOrder.status === 'placed') updates.status = 'accepted';

      await updateDoc(doc(db, 'orders', selectedOrder.id), updates);

      // Seamless wallet integration if overpaid
      if (amt > dbAmt && selectedOrder.userId) {
        const excess = amt - dbAmt;
        const uRef = doc(db, 'users', selectedOrder.userId);
        const uSnap = await getDoc(uRef);
        const curBal = (uSnap.data()?.walletBalance || 0) + excess;
        await updateDoc(uRef, { walletBalance: curBal });
        
        await addDoc(collection(db, 'users', selectedOrder.userId, 'transactions'), {
          type: 'credit', title: `Excess from Order #${selectedOrder.id.substring(0,6)}`, amount: excess, status: 'success', createdAt: new Date()
        });
      }
      Alert.alert('Success', `Payment of ₹${amt} verified! ${amt>dbAmt?`\n₹${(amt-dbAmt).toFixed(2)} automatically added to Wallet.` : ''}`);
      setPayModal(false);
      setPayForm({ amount:'', txId:'', autoAction: true });
    } catch(e:any) { Alert.alert('Error', e.message); }
    setIsVerifying(false);
  };

  const handleCall = (ph: string) => { if (!ph) return Alert.alert('No Phone'); Linking.openURL(`tel:${ph}`); };
  const handleSMS = (ph: string, o: any) => {
    if (!ph) return Alert.alert('No Phone');
    Linking.openURL(`sms:${ph}?body=${encodeURIComponent(`Hi ${o.userName}, your AgriMore order #${o.id.substring(0,6).toUpperCase()} is ${o.status}. Total: ₹${o.totalAmount}`)}`);
  };
  const handleWhatsApp = (ph: string, o: any) => {
    if (!ph) return Alert.alert('No Phone');
    const items = (o.products || []).map((p: any) => `• ${p.name} x${p.quantity} = ₹${(p.price*p.quantity).toFixed(0)}`).join('\n');
    const msg = `🌿 *AgriMore*\nHi *${o.userName}*\nOrder #${o.id.substring(0,6).toUpperCase()}\nStatus: *${(o.status||'placed').toUpperCase()}*\n\n${items}\n\n💰 Total: *₹${o.totalAmount}*`;
    Linking.openURL(`whatsapp://send?phone=${ph.startsWith('+') ? ph : '+91'+ph}&text=${encodeURIComponent(msg)}`).catch(() => Alert.alert('WhatsApp not found'));
  };

  const handlePrint = async (o: any) => {
    const dateStr = o.createdAt?.toDate ? o.createdAt.toDate().toLocaleString('en-IN') : 'N/A';
    
    // Ordered Items List HTML
    const items = (o.products||[]).map((p:any)=>`
      <tr>
        <td style="padding:12px 10px;border-bottom:1px solid #E5E7EB;display:flex;align-items:center;gap:12px;">
          <img src="${p.images?.[0] || p.image || 'https://via.placeholder.com/50'}" style="width:48px;height:48px;border-radius:8px;object-fit:cover;border:1px solid #F3F4F6;" />
          <span style="font-weight:600;color:#1F2937;font-size:14px;">${p.name}</span>
        </td>
        <td style="padding:12px 10px;text-align:center;border-bottom:1px solid #E5E7EB;color:#4B5563;">${p.quantity}</td>
        <td style="padding:12px 10px;text-align:right;border-bottom:1px solid #E5E7EB;color:#4B5563;">₹${(p.discountPrice||p.price).toFixed(2)}</td>
        <td style="padding:12px 10px;text-align:right;border-bottom:1px solid #E5E7EB;font-weight:bold;color:#145A32;">₹${((p.discountPrice||p.price)*p.quantity).toFixed(2)}</td>
      </tr>`).join('');
      
    // Calculations
    const subtotal = o.subtotal || o.totalAmount;
    const deliveryFee = o.deliveryFee !== undefined ? o.deliveryFee : (parseFloat(subtotal) >= 499 ? 0 : 30);
    const discount = o.discount || 0;
    
    // Loyalty Feature
    const loyalMsg = `
      <div style="margin-top:24px;padding:16px;background-color:#F0FDF4;border-left:4px solid #16A34A;border-radius:6px;">
        <h4 style="color:#145A32;margin-bottom:6px;font-size:15px;">🌟 Lucky Buyer!</h4>
        <p style="color:#16A34A;font-size:13px;line-height:1.5;margin:0;">You are one of our valuable customers. Keep supporting farmers with Agrimore.<br>Use Code <b>AGRI10</b> on your next order for an exclusive discount!</p>
      </div>
    `;

    const html = `
      <html>
        <head>
          <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 40px; background: #fff; }
            .inv { max-width: 800px; margin: auto; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; }
            .hdr { display: flex; justify-content: space-between; align-items: flex-start; padding: 30px; background: #FAFAFA; border-bottom: 2px solid #145A32; }
            .hdr-info { text-align: right; }
            .hdr-info h2 { color: #145A32; font-size: 28px; margin-bottom: 6px; letter-spacing: 1px; }
            .sec { padding: 30px; display: flex; justify-content: space-between; gap: 40px; }
            .inv-details h3 { font-size: 13px; color: #6B7280; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px; }
            .inv-details p { font-size: 15px; margin-bottom: 6px; color: #1F2937; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #F9FAFB; padding: 14px 10px; text-align: left; font-size: 12px; color: #6B7280; text-transform: uppercase; border-bottom: 1px solid #E5E7EB; }
            .totals { width: 320px; margin-left: auto; padding: 30px; }
            .tot-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 15px; color: #4B5563; }
            .tot-grand { display: flex; justify-content: space-between; margin-top: 16px; padding-top: 16px; border-top: 2px solid #145A32; font-size: 20px; font-weight: 900; color: #145A32; }
            .footer { text-align: center; padding: 30px; background: #145A32; color: #D4A843; }
            .footer h4 { margin-bottom: 8px; font-size: 18px; font-weight: normal; color: #FFF; }
            .footer p { font-size: 14px; opacity: 0.9; }
          </style>
        </head>
        <body>
          <div class="inv">
            <div class="hdr">
              <div>
                <h1 style="color:#145A32;font-size:36px;letter-spacing:-1px;margin-bottom:8px;">🌿 AgriMore</h1>
                <p style="color:#4B5563;font-size:14px;max-width:200px;">Fresh from farm to your home.</p>
              </div>
              <div class="hdr-info">
                <h2>INVOICE</h2>
                <p style="color:#6B7280;font-size:14px;margin-top:8px;">Chinnamanur, Theni</p>
                <p style="color:#6B7280;font-size:14px;">+91 99999 99999</p>
                <p style="color:#6B7280;font-size:14px;">support@agrimore.in</p>
              </div>
            </div>
            
            <div class="sec">
              <div class="inv-details" style="flex:1;">
                <h3>Billed To</h3>
                <p style="font-size:18px;font-weight:bold;color:#145A32;">${o.userName}</p>
                <p>📞 ${o.phone || o.userPhone || 'N/A'}</p>
                <p style="margin-top:8px;color:#4B5563;line-height:1.5;">${typeof o.address === 'string' ? o.address : o.address?.address || o.address?.fullAddress || ''}</p>
              </div>
              <div class="inv-details" style="text-align:right; flex:1;">
                <h3>Order Snapshot</h3>
                <p><strong>Invoice No:</strong> #INV-${o.id.substring(0,6).toUpperCase()}</p>
                <p><strong>Order ID:</strong> #${o.id.toUpperCase()}</p>
                <p><strong>Type:</strong> ${o.orderType || 'One Time Delivery'}</p>
                <p><strong>Date:</strong> ${dateStr}</p>
                <p><strong>Payment Method:</strong> ${(o.paymentMethod||'COD').toUpperCase()}</p>
                <p><strong>Status:</strong> ${(o.status||'Pending').toUpperCase()}</p>
              </div>
            </div>
            
            <div style="padding: 0 30px;">
              <table>
                <tr>
                  <th>Product Details</th>
                  <th style="text-align:center;">Qty</th>
                  <th style="text-align:right;">Price</th>
                  <th style="text-align:right;">Total</th>
                </tr>
                ${items}
              </table>
            </div>
            
            <div class="totals">
              <div class="tot-row"><span>Subtotal</span><span>₹${parseFloat(subtotal).toFixed(2)}</span></div>
              <div class="tot-row"><span>Delivery Charge</span><span>₹${parseFloat(deliveryFee as any).toFixed(2)}</span></div>
              ${parseFloat(discount as any) > 0 ? `<div class="tot-row"><span style="color:#16A34A">Discount</span><span style="color:#16A34A">-₹${parseFloat(discount as any).toFixed(2)}</span></div>` : ''}
              <div class="tot-grand"><span>Grand Total</span><span>₹${parseFloat(o.totalAmount||0).toFixed(2)}</span></div>
            </div>
            
            <div style="padding:0 30px 30px 30px;">${loyalMsg}</div>

            <div class="footer">
              <h4>Thank you for choosing Agrimore.</h4>
              <p>Every order supports farmers and agriculture.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    try { const {uri} = await Print.printToFileAsync({html}); if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri); else Alert.alert('Saved', uri); } catch(e) { Alert.alert('Error','Failed to print'); }
  };

  if (loading) return <View style={s.loadWrap}><ActivityIndicator size="large" color="#3B82F6" /><Text style={[font,{color:'#9CA3AF',marginTop:12}]}>Loading orders...</Text></View>;

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);
  const counts: Record<string,number> = { all: orders.length };
  STATUS_FLOW.forEach(st => { counts[st] = orders.filter(o => o.status === st).length; });

  // Map orders — OFD with location + date filter
  const now = new Date(); const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
  const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);

  const ofdOrders = orders.filter(o => {
    if (o.status !== 'out for delivery') return false;
    if (!o.location) return false;
    const d = o.createdAt?.toDate?.() || new Date(0);
    if (dateFilter === 'today') return d >= todayStart;
    if (dateFilter === 'week') return d >= weekAgo;
    return true;
  }).map(o => {
    const dist = haversine(adminLoc.latitude, adminLoc.longitude, o.location.lat, o.location.lng);
    return { ...o, distance: dist, distanceRange: getDistRange(dist) };
  }).sort((a, b) => a.distance - b.distance);

  // Build optimized delivery route (sorted by distance = nearest first)
  const routeCoords = [adminLoc, ...ofdOrders.map(o => ({ latitude: o.location.lat, longitude: o.location.lng }))];

  const ph = (o: any) => o.phone || o.userPhone || '';

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View>
          <Text style={[font, s.hTitle]}>Orders</Text>
          <Text style={[font, s.hSub]}>{orders.length} total • {counts['out for delivery']||0} delivering</Text>
        </View>
        <View style={s.viewToggles}>
          <TouchableOpacity onPress={() => setViewMode('list')} style={[s.tBtn, viewMode==='list' && s.tBtnAct]}><List color={viewMode==='list'?'#3B82F6':'#9CA3AF'} size={20}/></TouchableOpacity>
          <TouchableOpacity onPress={() => setViewMode('map')} style={[s.tBtn, viewMode==='map' && s.tBtnAct]}><MapIcon color={viewMode==='map'?'#3B82F6':'#9CA3AF'} size={20}/></TouchableOpacity>
        </View>
      </View>

      {/* ═══ LIST VIEW ═══ */}
      {viewMode === 'list' ? (
        <ScrollView style={{flex:1}} contentContainerStyle={{padding:16,paddingBottom:100}} showsVerticalScrollIndicator={false}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:16}}>
            {['all',...STATUS_FLOW].map(f=>(
              <TouchableOpacity key={f} onPress={()=>setFilter(f)} style={[s.pill, filter===f && s.pillAct]}>
                <Text style={[font,s.pillTxt,filter===f&&s.pillTxtAct]}>{f==='all'?`All (${counts.all})`:`${STATUS_LABELS[f]?.split(' ')[0]||''} (${counts[f]||0})`}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {filtered.length===0 && <View style={s.emptyWrap}><Text style={{fontSize:48}}>📭</Text><Text style={[font,{fontSize:18,fontWeight:'800',color:'#374151',marginTop:12}]}>No orders</Text></View>}
          {filtered.map(o => {
            const isExp = expandedId === o.id; const sc = STATUS_COLORS[o.status]||'#6B7280';
            return (
              <View key={o.id} style={s.card}>
                <TouchableOpacity style={s.cardHead} onPress={()=>setExpandedId(isExp?null:o.id)} activeOpacity={0.7}>
                  <View style={{flex:1}}>
                    <View style={{flexDirection:'row',alignItems:'center',marginBottom:4}}>
                      <Text style={[font,s.ordId]}>#{o.id.substring(0,8).toUpperCase()}</Text>
                      <View style={[s.stBadge,{backgroundColor:sc+'20'}]}><Text style={[font,{fontSize:10,fontWeight:'900',color:sc}]}>{(o.status||'placed').toUpperCase()}</Text></View>
                      {o.orderType === 'Auto Delivery' || (o.paymentId || '').startsWith('SUB_') ? (
                        <View style={[s.stBadge, {backgroundColor: '#FEF3C7', marginLeft: 6}]}>
                           <Text style={[font, {fontSize:10,fontWeight:'900',color:'#D97706'}]}>🔄 {o.autoFrequency ? o.autoFrequency.toUpperCase() : 'SUBSCRIPTION'}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={[font,s.custName]}>{o.userName||'Customer'}</Text>
                    <Text style={[font,s.ordMeta]}>₹{parseFloat(o.totalAmount||0).toFixed(0)} • {o.products?.length||0} items</Text>
                  </View>
                  {/* 5️⃣ Location Icon */}
                  {o.location && (
                    <TouchableOpacity style={s.locIcon} onPress={()=>{setMapOrder(o);setCustomerModal(true);}}>
                      <MapPin color="#3B82F6" size={18} />
                    </TouchableOpacity>
                  )}
                  {isExp ? <ChevronUp color="#9CA3AF" size={20}/> : <ChevronDown color="#9CA3AF" size={20}/>}
                </TouchableOpacity>
                {/* Quick Actions */}
                <View style={s.qActions}>
                  <TouchableOpacity style={[s.qBtn,{backgroundColor:'#F0FDF4'}]} onPress={()=>handleCall(ph(o))}><Phone color="#16A34A" size={14}/><Text style={[font,s.qBtnT,{color:'#16A34A'}]}>Call</Text></TouchableOpacity>
                  <TouchableOpacity style={[s.qBtn,{backgroundColor:'#EFF6FF'}]} onPress={()=>handleSMS(ph(o),o)}><MessageCircle color="#3B82F6" size={14}/><Text style={[font,s.qBtnT,{color:'#3B82F6'}]}>SMS</Text></TouchableOpacity>
                  <TouchableOpacity style={[s.qBtn,{backgroundColor:'#ECFDF5'}]} onPress={()=>handleWhatsApp(ph(o),o)}><Send color="#059669" size={14}/><Text style={[font,s.qBtnT,{color:'#059669'}]}>WA</Text></TouchableOpacity>
                  <TouchableOpacity style={[s.qBtn,{backgroundColor:'#FFFBEB'}]} onPress={()=>{setSelectedOrder(o);setInvoiceModal(true);}}><Printer color="#D97706" size={14}/><Text style={[font,s.qBtnT,{color:'#D97706'}]}>Bill</Text></TouchableOpacity>
                </View>
                {isExp && (
                  <View style={s.expSec}>
                    
                    {/* Customer Details */}
                    <Text style={[font,s.secHeader]}>👤 Customer Details</Text>
                    <View style={s.detailRow}><Text style={[font,s.dLbl]}>Name:</Text><Text style={[font,s.dVal]}>{o.userName || 'N/A'}</Text></View>
                    <View style={s.detailRow}><Text style={[font,s.dLbl]}>Mobile:</Text><Text style={[font,s.dVal]}>{ph(o) || 'N/A'}</Text></View>
                    <View style={s.detailRow}><Text style={[font,s.dLbl]}>Address:</Text><Text style={[font,s.dVal,{flex:1}]} numberOfLines={2}>{typeof o.address === 'string' ? o.address : o.address?.address || o.address?.fullAddress || 'N/A'}</Text></View>

                    {/* Order Details */}
                    <Text style={[font,s.secHeader,{marginTop:16}]}>🧾 Order Details</Text>
                    <View style={s.detailRow}><Text style={[font,s.dLbl]}>Order No:</Text><Text style={[font,s.dVal]}>#{o.id.toUpperCase()}</Text></View>
                    <View style={s.detailRow}><Text style={[font,s.dLbl]}>Order Type:</Text><Text style={[font,s.dVal, {color: o.orderType === 'Auto Delivery' ? '#16A34A' : '#374151'}]}>{o.orderType || 'One Time'}</Text></View>
                    <View style={s.detailRow}><Text style={[font,s.dLbl]}>Date & Time:</Text><Text style={[font,s.dVal]}>{o.createdAt?.toDate?.()?.toLocaleString('en-IN') || 'N/A'}</Text></View>
                    <View style={s.detailRow}><Text style={[font,s.dLbl]}>Payment Method:</Text><Text style={[font,s.dVal]}>{(o.paymentMethod||'COD').toUpperCase()} • {(o.paymentStatus||'Pending').toUpperCase()}</Text></View>
                    <View style={s.detailRow}><Text style={[font,s.dLbl]}>Order Status:</Text><Text style={[font,s.dVal,{color:STATUS_COLORS[o.status]||'#374151',fontWeight:'800'}]}>{(o.status||'Placed').toUpperCase()}</Text></View>

                    {/* Ordered Items List */}
                    <Text style={[font,s.secHeader,{marginTop:16,marginBottom:8}]}>🛒 Ordered Items</Text>
                    {(o.products||[]).map((p:any,i:number)=>(
                      <View key={i} style={s.imgItemRow}>
                        <Image source={{ uri: p.images?.[0] || p.image || 'https://via.placeholder.com/60' }} style={s.imgThumb} />
                        <View style={{flex:1,marginLeft:12}}>
                          <Text style={[font,{fontSize:14,fontWeight:'800',color:'#1F2937'}]} numberOfLines={1}>{p.name}</Text>
                          <Text style={[font,{fontSize:12,color:'#6B7280',marginTop:2}]}>Qty: {p.quantity} × ₹{(p.discountPrice||p.price).toFixed(0)}</Text>
                        </View>
                        <Text style={[font,{fontSize:15,fontWeight:'900',color:'#145A32'}]}>₹{((p.discountPrice||p.price)*p.quantity).toFixed(0)}</Text>
                      </View>
                    ))}
                    
                    <View style={s.totRow}>
                      <Text style={[font,{fontSize:16,fontWeight:'800',color:'#111827'}]}>Grand Total</Text>
                      <Text style={[font,{fontSize:18,fontWeight:'900',color:'#145A32'}]}>₹{parseFloat(o.totalAmount||0).toFixed(2)}</Text>
                    </View>

                    {/* Direct Payment & Order Automatic Verification */}
                    {o.paymentStatus !== 'paid' && (
                      <TouchableOpacity 
                        style={{flexDirection:'row',alignItems:'center',justifyContent:'center',backgroundColor:'#F59E0B',paddingVertical:12,borderRadius:12,marginTop:16}}
                        onPress={() => {
                          setSelectedOrder(o);
                          setPayForm({ amount: parseFloat(o.totalAmount||0).toString(), txId: '', autoAction: true });
                          setPayModal(true);
                        }}
                      >
                        <Text style={[font,{color:'#FFF',fontWeight:'800',fontSize:14}]}>💰 Verify Offline Payment</Text>
                      </TouchableOpacity>
                    )}

                    {/* 🧭 Admin Direction Route Assign Button */}
                    <TouchableOpacity 
                      style={{flexDirection:'row',alignItems:'center',justifyContent:'center',backgroundColor:'#F0FDF4',borderColor: '#BBF7D0', borderWidth: 1, paddingVertical:14,borderRadius:12,marginTop:16}}
                      onPress={() => navigation.navigate('AdminDeliveryRoute', { order: o })}
                    >
                      <Navigation2 color="#145A32" size={18} />
                      <Text style={[font,{color:'#145A32',fontWeight:'900',fontSize:15,marginLeft:8}]}>🧭 View Direction & Assign Delivery</Text>
                    </TouchableOpacity>

                    <Text style={[font,s.secHeader,{marginTop:20}]}>🔄 Update Status Manually</Text>
                    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:6}}>
                      {STATUS_FLOW.map(st=>{
                        const isA = o.status === st;
                        return <TouchableOpacity key={st} style={[s.stBtn,isA&&{backgroundColor:STATUS_COLORS[st],borderColor:STATUS_COLORS[st]}]} onPress={()=>updateStatus(o.id,st)}>
                          <Text style={[font,{fontSize:12,fontWeight:'800',color:isA?'#FFF':'#6B7280',textTransform:'capitalize'}]}>{st}</Text>
                        </TouchableOpacity>;
                      })}
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      ) : (
        /* ═══ MAP VIEW ═══ */
        <View style={{flex:1}}>
          {/* 7️⃣ Date Filter */}
          <View style={s.dateFilterRow}>
            <Calendar color="#6B7280" size={16} />
            {(['today','week','all'] as const).map(d=>(
              <TouchableOpacity key={d} style={[s.datePill,dateFilter===d&&s.datePillAct]} onPress={()=>setDateFilter(d)}>
                <Text style={[font,{fontSize:12,fontWeight:'700',color:dateFilter===d?'#FFF':'#6B7280'}]}>{d==='today'?'Today':d==='week'?'This Week':'All Time'}</Text>
              </TouchableOpacity>
            ))}
            
            {/* 9️⃣ Satellite/Map Toggle */}
            <TouchableOpacity style={[s.routeBtn, mapType==='satellite'&&{backgroundColor:'#145A32'}]} onPress={()=>setMapType(mapType==='standard'?'satellite':'standard')}>
              <Layers color={mapType==='satellite'?'#FFF':'#3B82F6'} size={16}/>
            </TouchableOpacity>

            {/* 8️⃣ Route toggle */}
            <TouchableOpacity style={[s.routeBtn,showRoute&&{backgroundColor:'#3B82F6'},{marginLeft:8}]} onPress={()=>setShowRoute(!showRoute)}>
              <Navigation2 color={showRoute?'#FFF':'#3B82F6'} size={16}/>
            </TouchableOpacity>
          </View>

          <View style={{height:'50%'}}>
            {Platform.OS === 'web' ? (
              <WebMapIframe 
                adminLoc={adminLoc} 
                ofdOrders={ofdOrders} 
                routeCoords={routeCoords} 
                showRoute={showRoute} 
                colors={DIST_COLORS}
                mapType={mapType}
              />
            ) : !MapView ? (
              <View style={s.mapFallback}><MapIcon color="#9CA3AF" size={48}/><Text style={[font,{color:'#6B7280',marginTop:12}]}>Map not available</Text></View>
            ) : (
              <MapView style={{flex:1}} provider={PROVIDER_GOOGLE} initialRegion={{...adminLoc,latitudeDelta:0.03,longitudeDelta:0.03}} mapType={mapType as any}>
                <Marker coordinate={adminLoc} pinColor="blue" title="📍 Store Location"/>
                {/* Distance circles */}
                <Circle center={adminLoc} radius={100} strokeColor="rgba(22,163,74,0.9)" strokeWidth={2} fillColor="rgba(22,163,74,0.08)"/>
                <Circle center={adminLoc} radius={500} strokeColor="rgba(37,99,235,0.7)" strokeWidth={2} fillColor="rgba(37,99,235,0.05)"/>
                <Circle center={adminLoc} radius={1000} strokeColor="rgba(245,158,11,0.7)" strokeWidth={2} fillColor="rgba(245,158,11,0.03)"/>
                {/* Customer pins */}
                {ofdOrders.map((o: any) => {
          const loc = o.deliveryAddress && o.deliveryAddress.location;
          if (!loc || !loc.lat) return null;
          return (
            <Marker
              key={o.id}
              coordinate={{ latitude: loc.lat, longitude: loc.lng }}
              pinColor={DIST_COLORS[o.distanceRange as keyof typeof DIST_COLORS] || 'red'}
              title={`${o.userName} • ${ph(o)}`} description={`${o.distance.toFixed(2)}km • ₹${o.totalAmount}`}
              onCalloutPress={()=>{setMapOrder(o);setCustomerModal(true);}}
            />
          );
        })}
                {/* 8️⃣ Delivery Route line */}
                {showRoute && routeCoords.length > 1 && Polyline && (
                  <Polyline coordinates={routeCoords} strokeColor="#3B82F6" strokeWidth={3} lineDashPattern={[10,5]}/>
                )}
              </MapView>
            )}
          </View>
          {/* Legend + stats */}
          <View style={s.legend}>
            {[{c:'#16A34A',l:'100m'},{c:'#3B82F6',l:'500m'},{c:'#F59E0B',l:'1km'},{c:'#EF4444',l:'2km+'}].map((x,i)=>(
              <View key={i} style={s.legendItem}><View style={[s.legendDot,{backgroundColor:x.c}]}/><Text style={[font,{fontSize:10,color:'#6B7280'}]}>{x.l}</Text></View>
            ))}
            <Text style={[font,{fontSize:11,color:'#3B82F6',fontWeight:'800',marginLeft:'auto'}]}>{ofdOrders.length} deliveries</Text>
          </View>
          {/* Sorted list */}
          <ScrollView style={{flex:1,paddingHorizontal:16}} showsVerticalScrollIndicator={false}>
            <Text style={[font,{fontSize:15,fontWeight:'800',color:'#111827',marginTop:10,marginBottom:10}]}>🚚 Delivery Route ({ofdOrders.length})</Text>
            {ofdOrders.map((o,i)=>(
              <TouchableOpacity key={o.id} style={s.mapCard} onPress={()=>{setMapOrder(o);setCustomerModal(true);}}>
                <View style={[s.routeNum,{backgroundColor:DIST_COLORS[o.distanceRange]||'#6B7280'}]}><Text style={[font,{color:'#FFF',fontWeight:'900',fontSize:12}]}>{i+1}</Text></View>
                <View style={{flex:1}}><Text style={[font,{fontSize:14,fontWeight:'800',color:'#111827'}]}>{o.userName}</Text><Text style={[font,{fontSize:11,color:'#6B7280'}]}>{o.distance.toFixed(2)}km • ₹{o.totalAmount}</Text></View>
                <TouchableOpacity style={s.mapCallBtn} onPress={()=>handleCall(ph(o))}><Phone color="#FFF" size={14}/></TouchableOpacity>
              </TouchableOpacity>
            ))}
            <View style={{height:80}}/>
          </ScrollView>
        </View>
      )}

      {/* Invoice Modal */}
      <Modal visible={invoiceModal} transparent animationType="slide">
        <View style={s.mOverlay}><View style={s.mBody}>
          <View style={s.mHead}><Text style={[font,s.mTitle]}>📄 Invoice</Text><TouchableOpacity onPress={()=>setInvoiceModal(false)}><X color="#6B7280" size={24}/></TouchableOpacity></View>
          {selectedOrder && <ScrollView showsVerticalScrollIndicator={false}>
            <View style={s.invBox}>
              <Text style={[font,{fontSize:20,fontWeight:'900',color:'#145A32'}]}>🌿 AgriMore</Text>
              <View style={s.invDiv}/>
              <View style={s.invR}><Text style={[font,s.invL]}>Order</Text><Text style={[font,s.invV]}>#{selectedOrder.id.substring(0,8).toUpperCase()}</Text></View>
              <View style={s.invR}><Text style={[font,s.invL]}>Customer</Text><Text style={[font,s.invV]}>{selectedOrder.userName}</Text></View>
              <View style={s.invR}><Text style={[font,s.invL]}>Phone</Text><Text style={[font,s.invV]}>{ph(selectedOrder)||'N/A'}</Text></View>
              <View style={s.invDiv}/>
              {(selectedOrder.products||[]).map((p:any,i:number)=>(<View key={i} style={s.invItemR}><Text style={[font,{fontSize:13,color:'#374151',flex:1}]}>{p.name} ×{p.quantity}</Text><Text style={[font,{fontSize:13,fontWeight:'700',color:'#145A32'}]}>₹{((p.discountPrice||p.price)*p.quantity).toFixed(2)}</Text></View>))}
              <View style={s.invDiv}/>
              <View style={s.invR}><Text style={[font,{fontSize:16,fontWeight:'900'}]}>Total</Text><Text style={[font,{fontSize:16,fontWeight:'900',color:'#145A32'}]}>₹{parseFloat(selectedOrder.totalAmount||0).toFixed(2)}</Text></View>
            </View>
            <TouchableOpacity style={s.printBtn} onPress={()=>handlePrint(selectedOrder)}><Printer color="#FFF" size={18}/><Text style={[font,{color:'#FFF',fontWeight:'800',fontSize:15,marginLeft:8}]}>🖨️ Print / Download PDF</Text></TouchableOpacity>
          </ScrollView>}
        </View></View>
      </Modal>

      {/* Collect Payment Modal */}
      <Modal visible={payModal} transparent animationType="fade">
        <View style={s.mOverlay}>
          <View style={[s.mBody, { maxHeight: 'auto' }]}>
            <View style={s.mHead}>
              <Text style={[font, s.mTitle, { color: '#145A32' }]}>💰 Verify Payment</Text>
              <TouchableOpacity onPress={() => setPayModal(false)}><X color="#6B7280" size={24} /></TouchableOpacity>
            </View>
            {selectedOrder && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ backgroundColor: '#F0FDF4', padding: 14, borderRadius: 12, marginBottom: 16 }}>
                  <Text style={[font, { fontSize: 13, color: '#16A34A', fontWeight: 'bold' }]}>Order #{selectedOrder.id.substring(0,8).toUpperCase()}</Text>
                  <Text style={[font, { fontSize: 18, fontWeight: '900', color: '#145A32', marginTop: 4 }]}>Due: ₹{parseFloat(selectedOrder.totalAmount||0).toFixed(2)}</Text>
                  <Text style={[font, { fontSize: 12, color: '#16A34A', marginTop: 4 }]}>{selectedOrder.userName} • {ph(selectedOrder)}</Text>
                </View>
                
                <Text style={[font, { fontSize: 13, fontWeight: '800', color: '#374151', marginBottom: 6 }]}>Amount Received (₹):</Text>
                <TextInput style={s.pInput} keyboardType="numeric" value={payForm.amount} onChangeText={(t) => setPayForm({...payForm, amount: t})} />
                {parseFloat(payForm.amount) > parseFloat(selectedOrder.totalAmount) && (
                  <Text style={[font, { fontSize: 11, color: '#16A34A', marginTop: -8, marginBottom: 12, fontWeight: 'bold' }]}>
                    Excess ₹{(parseFloat(payForm.amount) - parseFloat(selectedOrder.totalAmount||0)).toFixed(2)} will automatically add to Wallet!
                  </Text>
                )}

                <Text style={[font, { fontSize: 13, fontWeight: '800', color: '#374151', marginBottom: 6, marginTop: 4 }]}>Payer ID / Transaction UTR:</Text>
                <TextInput style={s.pInput} placeholder="e.g. PhonePe UTR / Cash" autoCapitalize="characters" value={payForm.txId} onChangeText={(t) => setPayForm({...payForm, txId: t})} />
                
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, marginTop: 10 }}>
                  <Text style={[font, { fontSize: 13, color: '#374151', fontWeight: '800', flex: 1 }]}>Auto-Accept Order & Mark Paid</Text>
                  <Switch value={payForm.autoAction} onValueChange={(v) => setPayForm({...payForm, autoAction: v})} trackColor={{ false: '#E5E7EB', true: '#145A32' }} />
                </View>

                <TouchableOpacity style={[s.printBtn, { marginTop: 24, paddingVertical: 14 }]} onPress={handleVerifyPayment} disabled={isVerifying}>
                  {isVerifying ? <ActivityIndicator color="#FFF" /> : <Text style={[font,{color:'#FFF',fontWeight:'800',fontSize:15}]}>✅ Confirm Payment</Text>}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Customer Info Modal (from map/location icon) */}
      <Modal visible={customerModal} transparent animationType="slide">
        <View style={s.mOverlay}><View style={[s.mBody,{maxHeight:'50%'}]}>
          <View style={s.mHead}><Text style={[font,s.mTitle]}>👤 Customer</Text><TouchableOpacity onPress={()=>setCustomerModal(false)}><X color="#6B7280" size={24}/></TouchableOpacity></View>
          {mapOrder && <View>
            <Text style={[font,{fontSize:22,fontWeight:'900',color:'#111827',marginBottom:4}]}>{mapOrder.userName}</Text>
            <Text style={[font,{fontSize:14,color:'#4B5563'}]}>📞 {ph(mapOrder)||'N/A'}</Text>
            {mapOrder.distance != null && <Text style={[font,{fontSize:13,color:'#6B7280',marginTop:4}]}>📍 {mapOrder.distance.toFixed(2)}km away • ₹{mapOrder.totalAmount}</Text>}
            {mapOrder.address && <Text style={[font,{fontSize:12,color:'#9CA3AF',marginTop:4}]}>{typeof mapOrder.address==='string'?mapOrder.address:mapOrder.address?.address||''}</Text>}
            <View style={{flexDirection:'row',gap:10,marginTop:16}}>
              <TouchableOpacity style={[s.modalABtn,{backgroundColor:'#16A34A'}]} onPress={()=>handleCall(ph(mapOrder))}><Phone color="#FFF" size={18}/><Text style={[font,{color:'#FFF',fontWeight:'bold',marginLeft:8}]}>Call</Text></TouchableOpacity>
              <TouchableOpacity style={[s.modalABtn,{backgroundColor:'#25D366'}]} onPress={()=>handleWhatsApp(ph(mapOrder),mapOrder)}><MessageSquare color="#FFF" size={18}/><Text style={[font,{color:'#FFF',fontWeight:'bold',marginLeft:8}]}>WhatsApp</Text></TouchableOpacity>
            </View>
            <TouchableOpacity style={[s.modalABtn,{backgroundColor:'#3B82F6',marginTop:10}]} onPress={()=>handleSMS(ph(mapOrder),mapOrder)}><MessageCircle color="#FFF" size={18}/><Text style={[font,{color:'#FFF',fontWeight:'bold',marginLeft:8}]}>Send SMS</Text></TouchableOpacity>
          </View>}
        </View></View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#F8FAFC'},
  loadWrap:{flex:1,alignItems:'center',justifyContent:'center'},
  header:{paddingTop:50,paddingBottom:16,paddingHorizontal:20,backgroundColor:'#FFF',flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderBottomWidth:1,borderBottomColor:'#F1F5F9'},
  hTitle:{fontSize:24,fontWeight:'800',color:'#111827'},
  hSub:{fontSize:12,color:'#9CA3AF',marginTop:2},
  viewToggles:{flexDirection:'row',backgroundColor:'#F3F4F6',borderRadius:10,padding:4},
  tBtn:{padding:8,borderRadius:8},
  tBtnAct:{backgroundColor:'#FFF',shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.1,shadowRadius:3,elevation:2},
  pill:{paddingHorizontal:14,paddingVertical:8,borderRadius:20,backgroundColor:'#FFF',marginRight:8,borderWidth:1,borderColor:'#E5E7EB'},
  pillAct:{backgroundColor:'#3B82F6',borderColor:'#3B82F6'},
  pillTxt:{fontSize:11,fontWeight:'700',color:'#6B7280'},
  pillTxtAct:{color:'#FFF'},
  emptyWrap:{alignItems:'center',marginTop:60},
  card:{backgroundColor:'#FFF',borderRadius:20,marginBottom:14,borderWidth:1,borderColor:'#F1F5F9',overflow:'hidden'},
  cardHead:{flexDirection:'row',alignItems:'center',padding:16},
  ordId:{fontSize:11,fontWeight:'900',color:'#9CA3AF',letterSpacing:1,marginRight:8},
  stBadge:{paddingHorizontal:10,paddingVertical:3,borderRadius:10},
  custName:{fontSize:16,fontWeight:'800',color:'#111827',marginTop:4},
  ordMeta:{fontSize:12,color:'#6B7280',marginTop:2},
  locIcon:{padding:8,backgroundColor:'#EFF6FF',borderRadius:10,marginRight:6},
  qActions:{flexDirection:'row',paddingHorizontal:12,paddingBottom:12,gap:6},
  qBtn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',paddingVertical:9,borderRadius:10},
  qBtnT:{fontSize:11,fontWeight:'800',marginLeft:4},
  expSec:{paddingHorizontal:20,paddingBottom:20,borderTopWidth:1,borderTopColor:'#F3F4F6',paddingTop:16,backgroundColor:'#FAFAFA',borderBottomLeftRadius:20,borderBottomRightRadius:20},
  secHeader:{fontSize:15,fontWeight:'900',color:'#145A32',marginBottom:10,letterSpacing:0.5},
  detailRow:{flexDirection:'row',marginBottom:6},
  dLbl:{width:120,fontSize:13,color:'#6B7280',fontWeight:'600'},
  dVal:{fontSize:13,color:'#111827',fontWeight:'700'},
  imgItemRow:{flexDirection:'row',alignItems:'center',backgroundColor:'#FFF',padding:10,borderRadius:12,marginBottom:8,borderWidth:1,borderColor:'#E5E7EB'},
  imgThumb:{width:46,height:46,borderRadius:8,backgroundColor:'#F3F4F6'},
  totRow:{flexDirection:'row',justifyContent:'space-between',paddingTop:14,borderTopWidth:2,borderTopColor:'#E5E7EB',marginTop:8},
  stBtn:{paddingHorizontal:16,paddingVertical:10,backgroundColor:'#FFF',borderRadius:12,borderWidth:1,borderColor:'#E5E7EB',shadowColor:'#000',shadowOpacity:0.02,shadowRadius:3},
  // Map view
  dateFilterRow:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:10,backgroundColor:'#FFF',gap:8,borderBottomWidth:1,borderBottomColor:'#F1F5F9'},
  datePill:{paddingHorizontal:12,paddingVertical:6,borderRadius:8,backgroundColor:'#F3F4F6'},
  datePillAct:{backgroundColor:'#3B82F6'},
  routeBtn:{width:36,height:36,borderRadius:10,backgroundColor:'#EFF6FF',alignItems:'center',justifyContent:'center'},
  mapFallback:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:'#F3F4F6'},
  legend:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:8,backgroundColor:'#FFF',gap:12,borderBottomWidth:1,borderBottomColor:'#F1F5F9'},
  legendItem:{flexDirection:'row',alignItems:'center',gap:4},
  legendDot:{width:8,height:8,borderRadius:4},
  mapCard:{flexDirection:'row',alignItems:'center',backgroundColor:'#FFF',padding:12,borderRadius:14,marginBottom:8,borderWidth:1,borderColor:'#F1F5F9'},
  routeNum:{width:28,height:28,borderRadius:14,alignItems:'center',justifyContent:'center',marginRight:12},
  mapCallBtn:{width:36,height:36,borderRadius:18,backgroundColor:'#16A34A',alignItems:'center',justifyContent:'center'},
  // Modals
  mOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'flex-end'},
  mBody:{backgroundColor:'#FFF',borderTopLeftRadius:28,borderTopRightRadius:28,padding:24,paddingBottom:40,maxHeight:'88%'},
  mHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:20},
  mTitle:{fontSize:22,fontWeight:'900',color:'#111827'},
  modalABtn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',paddingVertical:14,borderRadius:14},
  invBox:{backgroundColor:'#F9FAFB',borderRadius:16,padding:20,marginBottom:20,borderWidth:1,borderColor:'#E5E7EB'},
  invDiv:{height:1,backgroundColor:'#E5E7EB',marginVertical:12},
  invR:{flexDirection:'row',justifyContent:'space-between',marginBottom:6},
  invL:{fontSize:13,color:'#6B7280'},
  invV:{fontSize:13,fontWeight:'700',color:'#374151'},
  invItemR:{flexDirection:'row',justifyContent:'space-between',paddingVertical:5,borderBottomWidth:1,borderBottomColor:'#F3F4F6'},
  printBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',backgroundColor:'#145A32',paddingVertical:16,borderRadius:14,marginBottom:20},
  pInput:{backgroundColor:'#F3F4F6',borderWidth:1,borderColor:'#E5E7EB',borderRadius:10,paddingHorizontal:16,paddingVertical:12,fontSize:15,color:'#111827',marginBottom:16},
});
