import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, TouchableOpacity, Alert, Linking, Image } from 'react-native';
import { db } from '../../firebase/config';
import { collection, onSnapshot, doc, updateDoc, query, where, orderBy, addDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { Phone, MessageCircle, ChevronDown, ChevronUp, MapPin, Package, Download } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const font = { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' };

const STATUS_FLOW = ['placed', 'accepted', 'out for delivery', 'delivered'];
const STATUS_LABELS: Record<string, string> = { placed: '📦 New', accepted: '✅ Accepted', 'out for delivery': '🚚 OFD', delivered: '🎉 Delivered' };
const STATUS_COLORS: Record<string, string> = { placed: '#3B82F6', accepted: '#8B5CF6', 'out for delivery': '#F59E0B', delivered: '#16A34A' };

export default function SellerOrders() {
  const { user, userData } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'orders'),
      where('sellerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const order = orders.find(o => o.id === orderId);

      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: new Date(),
      });

      // Notify customer
      if (order?.userId) {
        const statusMsgs: Record<string, { title: string; body: string; emoji: string }> = {
          accepted: { title: 'Order Accepted ✅', body: 'Your order has been accepted by the seller and is being prepared.', emoji: '✅' },
          'out for delivery': { title: 'Out for Delivery 🚚', body: 'Your order is on the way!', emoji: '🚚' },
          delivered: { title: 'Order Delivered 🎉', body: 'Your order has been delivered. Enjoy!', emoji: '🎉' },
        };
        const msg = statusMsgs[newStatus];
        if (msg) {
          await addDoc(collection(db, 'users', order.userId, 'notifications'), {
            ...msg,
            createdAt: new Date(),
            unread: true,
            orderId,
          });
        }
      }

      Alert.alert('✅', `Order status updated to: ${newStatus}`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleCall = (ph: string) => {
    if (!ph) return Alert.alert('No Phone Number');
    Linking.openURL(`tel:${ph}`);
  };

  const handleWhatsApp = (ph: string, o: any) => {
    if (!ph) return Alert.alert('No Phone Number');
    const msg = `Hi ${o.userName}, your order #${o.id.substring(0, 6).toUpperCase()} status: ${(o.status || 'placed').toUpperCase()}. Total: ₹${o.totalAmount}`;
    Linking.openURL(`whatsapp://send?phone=${ph.startsWith('+') ? ph : '+91' + ph}&text=${encodeURIComponent(msg)}`).catch(() => Alert.alert('WhatsApp not found'));
  };

  const generateInvoiceHtml = (o: any) => {
    const dateStr = o.createdAt?.toDate?.()?.toLocaleString('en-IN') || new Date().toLocaleString('en-IN');
    const slogans = [
      "Agrimore – உங்கள் business growth-க்கு நாங்கள் partner.",
      "Wholesale to Retail – உங்கள் கடைக்கு direct supply.",
      "உங்கள் விற்பனை வளர்ச்சி தான் Agrimore நோக்கம்.",
      "Better supply, Better profit – Agrimore உடன்.",
      "உங்கள் கடை வளர்ச்சி, எங்கள் platform support.",
      "Fresh stock. Fast supply. Happy customers.",
      "வியாபாரம் வளர Agrimore உங்களுடன்.",
      "Direct sourcing – அதிக லாபம், நல்ல வியாபாரம்.",
      "Grow your shop with Agrimore network.",
      "உங்கள் கடைக்கு quality products – Agrimore guarantee."
    ];
    const slogan = slogans[Math.floor(Math.random() * slogans.length)];

    let itemsHtml = (o.products || []).map((p: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; display: flex; align-items: center;">
          <img src="${p.images?.[0] || p.image || 'https://via.placeholder.com/50'}" style="width: 40px; height: 40px; border-radius: 8px; margin-right: 10px; object-fit: cover;" />
          ${p.name}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${p.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₹${(p.discountPrice || p.price).toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">₹${((p.discountPrice || p.price) * p.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

    return `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #333; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #145A32; padding-bottom: 20px; margin-bottom: 30px; }
            .company-info h1 { color: #145A32; margin: 0; font-size: 28px; }
            .company-info p { margin: 2px 0; font-size: 13px; color: #666; }
            .invoice-title { text-align: right; }
            .invoice-title h2 { margin: 0; color: #D4A843; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; }
            .invoice-title p { margin: 4px 0; font-size: 14px; font-weight: bold; }
            
            .details-section { display: flex; justify-content: space-between; margin-bottom: 30px; background: #F8FAFC; padding: 20px; border-radius: 12px; }
            .details-block h3 { margin-top: 0; margin-bottom: 10px; font-size: 14px; color: #145A32; text-transform: uppercase; }
            .details-block p { margin: 4px 0; font-size: 14px; }
            
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background-color: #145A32; color: white; padding: 12px 10px; text-align: left; }
            th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: right; }
            th:nth-child(2) { text-align: center; }
            
            .totals { width: 40%; margin-left: auto; }
            .total-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #ddd; }
            .total-row.grand { font-size: 18px; font-weight: bold; color: #145A32; border-bottom: none; border-top: 2px solid #145A32; margin-top: 5px; padding-top: 15px; }
            
            .footer { margin-top: 50px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 12px; color: #666; }
            .tc-title { font-weight: bold; color: #111; margin-bottom: 5px; }
            
            .slogan { margin-top: 30px; padding: 15px; background: #ECFDF5; color: #065F46; border-left: 4px solid #10B981; border-radius: 4px; font-weight: bold; font-style: italic; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-info">
              <h1>Agrimore</h1>
              <p>123 Farm Road, Green City, TN 600001</p>
              <p>+91 98765 43210 | support@agrimore.in</p>
              <p>www.agrimore.in</p>
            </div>
            <div class="invoice-title">
              <h2>INVOICE</h2>
              <p>Order #${o.id.substring(0, 8).toUpperCase()}</p>
              <p style="color: #666; font-weight: normal;">${dateStr}</p>
            </div>
          </div>
          
          <div class="details-section">
            <div class="details-block">
              <h3>Billed To (Customer)</h3>
              <p><strong>${o.userName || 'Customer'}</strong></p>
              <p>Phone: ${o.phone || o.userPhone || 'N/A'}</p>
              <p style="max-width: 250px;">Address: ${typeof o.address === 'string' ? o.address : o.address?.address || o.address?.fullAddress || 'N/A'}</p>
            </div>
            <div class="details-block" style="text-align: right;">
              <h3>Seller Information</h3>
              <p><strong>${userData?.name || 'Seller'}</strong></p>
              <p>Shop: ${(userData as any)?.sellerProfile?.shopName || 'N/A'}</p>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Product Image & Name</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="total-row grand">
              <span>Total Amount:</span>
              <span>₹${parseFloat(o.totalAmount || 0).toFixed(2)}</span>
            </div>
          </div>
          
          <div class="slogan">
            "${slogan}"
          </div>
          
          <div class="footer">
            <div class="tc-title">Terms & Conditions:</div>
            <p>1. Product quality issue இருந்தால் return request செய்யலாம்.</p>
            <p>2. Return approval admin policy-க்கு உட்பட்டது.</p>
            <p>3. Return period (example: 2–3 days).</p>
            <p>4. Fresh products mostly return ஆகாது.</p>
            <p style="text-align: center; margin-top: 20px; font-weight: bold; color: #ccc;">Thank you for your business!</p>
          </div>
        </body>
      </html>
    `;
  };

  const handleDownloadInvoice = async (o: any) => {
    try {
      const html = generateInvoiceHtml(o);
      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html, width: 612, height: 792 });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Download Invoice' });
      }
    } catch (e: any) {
      Alert.alert('Error', 'Unable to generate invoice: ' + e.message);
    }
  };

  if (loading) return (
    <View style={s.loadWrap}>
      <ActivityIndicator size="large" color="#D4A843" />
      <Text style={[font, { color: '#9CA3AF', marginTop: 12 }]}>Loading orders...</Text>
    </View>
  );

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);
  const counts: Record<string, number> = { all: orders.length };
  STATUS_FLOW.forEach(st => { counts[st] = orders.filter(o => o.status === st).length; });
  const ph = (o: any) => o.phone || o.userPhone || '';

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View>
          <Text style={[font, s.hTitle]}>Orders</Text>
          <Text style={[font, s.hSub]}>{orders.length} total • {counts.placed || 0} new</Text>
        </View>
        <View style={s.newBadge}>
          <Package color="#FFF" size={16} />
          <Text style={[font, { color: '#FFF', fontWeight: '900', fontSize: 14, marginLeft: 6 }]}>{counts.placed || 0}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Status Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {['all', ...STATUS_FLOW].map(f => (
            <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[s.pill, filter === f && s.pillAct]}>
              <Text style={[font, s.pillTxt, filter === f && s.pillTxtAct]}>
                {f === 'all' ? `All (${counts.all})` : `${STATUS_LABELS[f]?.split(' ')[0] || ''} (${counts[f] || 0})`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filtered.length === 0 && (
          <View style={s.emptyBox}>
            <Text style={{ fontSize: 48 }}>📭</Text>
            <Text style={[font, { color: '#6B7280', marginTop: 8, fontSize: 16, fontWeight: '800' }]}>No orders</Text>
            <Text style={[font, { color: '#9CA3AF', marginTop: 4, fontSize: 13 }]}>Customer orders will appear here</Text>
          </View>
        )}

        {filtered.map(o => {
          const isExp = expandedId === o.id;
          const sc = STATUS_COLORS[o.status] || '#6B7280';
          const dateStr = o.createdAt?.toDate?.()?.toLocaleString('en-IN') || 'N/A';

          return (
            <View key={o.id} style={s.card}>
              <TouchableOpacity style={s.cardHead} onPress={() => setExpandedId(isExp ? null : o.id)} activeOpacity={0.7}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={[font, s.ordId]}>#{o.id.substring(0, 8).toUpperCase()}</Text>
                    <View style={[s.stBadge, { backgroundColor: sc + '20' }]}>
                      <Text style={[font, { fontSize: 10, fontWeight: '900', color: sc }]}>{(o.status || 'placed').toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={[font, s.custName]}>{o.userName || 'Customer'}</Text>
                  <Text style={[font, s.ordMeta]}>₹{parseFloat(o.totalAmount || 0).toFixed(0)} • {o.products?.length || 0} items • {dateStr}</Text>
                </View>
                {isExp ? <ChevronUp color="#9CA3AF" size={20} /> : <ChevronDown color="#9CA3AF" size={20} />}
              </TouchableOpacity>

              {/* Quick Contact Actions */}
              <View style={s.qActions}>
                <TouchableOpacity style={[s.qBtn, { backgroundColor: '#F0FDF4' }]} onPress={() => handleCall(ph(o))}>
                  <Phone color="#16A34A" size={14} />
                  <Text style={[font, s.qBtnT, { color: '#16A34A' }]}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.qBtn, { backgroundColor: '#ECFDF5' }]} onPress={() => handleWhatsApp(ph(o), o)}>
                  <MessageCircle color="#059669" size={14} />
                  <Text style={[font, s.qBtnT, { color: '#059669' }]}>WhatsApp</Text>
                </TouchableOpacity>
              </View>

              {isExp && (
                <View style={s.expSec}>
                  {/* Customer Details */}
                  <Text style={[font, s.secHeader]}>👤 Customer Details</Text>
                  <View style={s.detailRow}><Text style={[font, s.dLbl]}>Name:</Text><Text style={[font, s.dVal]}>{o.userName || 'N/A'}</Text></View>
                  <View style={s.detailRow}><Text style={[font, s.dLbl]}>Mobile:</Text><Text style={[font, s.dVal]}>{ph(o) || 'N/A'}</Text></View>
                  <View style={s.detailRow}><Text style={[font, s.dLbl]}>Address:</Text><Text style={[font, s.dVal, { flex: 1 }]} numberOfLines={2}>{typeof o.address === 'string' ? o.address : o.address?.address || o.address?.fullAddress || 'N/A'}</Text></View>

                  {/* Order Items */}
                  <Text style={[font, s.secHeader, { marginTop: 16 }]}>🛒 Ordered Items</Text>
                  {(o.products || []).map((p: any, i: number) => (
                    <View key={i} style={s.itemRow}>
                      <Image source={{ uri: p.images?.[0] || p.image || 'https://via.placeholder.com/50' }} style={s.itemImg} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[font, { fontSize: 14, fontWeight: '800', color: '#1F2937' }]} numberOfLines={1}>{p.name}</Text>
                        <Text style={[font, { fontSize: 12, color: '#6B7280', marginTop: 2 }]}>Qty: {p.quantity} × ₹{(p.discountPrice || p.price).toFixed(0)}</Text>
                      </View>
                      <Text style={[font, { fontSize: 15, fontWeight: '900', color: '#145A32' }]}>₹{((p.discountPrice || p.price) * p.quantity).toFixed(0)}</Text>
                    </View>
                  ))}

                  <View style={s.totRow}>
                    <Text style={[font, { fontSize: 16, fontWeight: '800', color: '#111827' }]}>Total</Text>
                    <Text style={[font, { fontSize: 18, fontWeight: '900', color: '#145A32' }]}>₹{parseFloat(o.totalAmount || 0).toFixed(2)}</Text>
                  </View>

                  {/* Invoice Download */}
                  <TouchableOpacity style={s.invoiceBtn} onPress={() => handleDownloadInvoice(o)}>
                    <Download color="#145A32" size={18} />
                    <Text style={[font, { color: '#145A32', fontWeight: '900', fontSize: 14, marginLeft: 8 }]}>Download Invoice (PDF)</Text>
                  </TouchableOpacity>

                  {/* Status Update */}
                  <Text style={[font, s.secHeader, { marginTop: 20 }]}>🔄 Update Status</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                    {STATUS_FLOW.map(st => {
                      const isA = o.status === st;
                      const isPast = STATUS_FLOW.indexOf(st) < STATUS_FLOW.indexOf(o.status);
                      return (
                        <TouchableOpacity
                          key={st}
                          style={[s.stBtn, isA && { backgroundColor: STATUS_COLORS[st], borderColor: STATUS_COLORS[st] }, isPast && { opacity: 0.5 }]}
                          onPress={() => updateStatus(o.id, st)}
                          disabled={isPast}
                        >
                          <Text style={[font, { fontSize: 12, fontWeight: '800', color: isA ? '#FFF' : '#6B7280', textTransform: 'capitalize' }]}>{st}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {o.status === 'delivered' && (
                    <View style={s.deliveredNote}>
                      <Text style={[font, { color: '#16A34A', fontWeight: '800', fontSize: 13 }]}>✅ This order is delivered</Text>
                      <Text style={[font, { color: '#15803D', fontSize: 12, marginTop: 4 }]}>₹{parseFloat(o.totalAmount || 0).toFixed(0)} has been added to your revenue.</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  loadWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: '#FFF', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  hTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  hSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  newBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF', marginRight: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  pillAct: { backgroundColor: '#D4A843', borderColor: '#D4A843' },
  pillTxt: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  pillTxtAct: { color: '#FFF' },
  emptyBox: { backgroundColor: '#FFF', borderRadius: 20, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', marginTop: 20 },
  card: { backgroundColor: '#FFF', borderRadius: 20, marginBottom: 14, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden' },
  cardHead: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  ordId: { fontSize: 11, fontWeight: '900', color: '#9CA3AF', letterSpacing: 1, marginRight: 8 },
  stBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  custName: { fontSize: 16, fontWeight: '800', color: '#111827', marginTop: 4 },
  ordMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  qActions: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  qBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12 },
  qBtnT: { fontSize: 12, fontWeight: '800', marginLeft: 6 },
  expSec: { paddingHorizontal: 20, paddingBottom: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 16, backgroundColor: '#FAFAFA' },
  secHeader: { fontSize: 15, fontWeight: '900', color: '#145A32', marginBottom: 10 },
  detailRow: { flexDirection: 'row', marginBottom: 6 },
  dLbl: { width: 100, fontSize: 13, color: '#6B7280', fontWeight: '600' },
  dVal: { fontSize: 13, color: '#111827', fontWeight: '700' },
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 10, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  itemImg: { width: 46, height: 46, borderRadius: 8, backgroundColor: '#F3F4F6' },
  totRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 14, borderTopWidth: 2, borderTopColor: '#E5E7EB', marginTop: 8 },
  stBtn: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  deliveredNote: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', borderRadius: 12, padding: 14, marginTop: 16 },
  invoiceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', paddingVertical: 14, borderRadius: 14, marginTop: 16 },
});
