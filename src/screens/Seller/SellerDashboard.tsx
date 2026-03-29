import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, Dimensions } from 'react-native';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { IndianRupee, ShoppingCart, Package, TrendingUp, Truck, CheckCircle } from 'lucide-react-native';

const font = { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' };

export default function SellerDashboard() {
  const { user, userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayOrders: 0,
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
    acceptedOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    try {
      const sellerId = user!.uid;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch seller's products
      const productsSnap = await getDocs(
        query(collection(db, 'products'), where('sellerId', '==', sellerId))
      );

      // Fetch seller's orders
      const ordersSnap = await getDocs(
        query(collection(db, 'orders'), where('sellerId', '==', sellerId))
      );

      let todayRevenue = 0, todayOrders = 0, totalRevenue = 0;
      let pendingOrders = 0, deliveredOrders = 0, acceptedOrders = 0;
      const allOrders: any[] = [];

      ordersSnap.docs.forEach(d => {
        const data = { id: d.id, ...d.data() } as any;
        allOrders.push(data);
        const amt = parseFloat(data.totalAmount) || 0;

        // Revenue only from delivered orders
        if (data.status === 'delivered') {
          totalRevenue += amt;
          deliveredOrders++;

          const orderDate = data.createdAt?.toDate?.() || new Date(0);
          if (orderDate >= today) {
            todayRevenue += amt;
          }
        }

        if (data.status === 'placed') pendingOrders++;
        if (data.status === 'accepted') acceptedOrders++;

        const orderDate = data.createdAt?.toDate?.() || new Date(0);
        if (orderDate >= today) todayOrders++;
      });

      // Sort recent
      const recent = allOrders
        .sort((a, b) => (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0))
        .slice(0, 5);

      setStats({
        todayRevenue,
        todayOrders,
        totalRevenue,
        totalOrders: ordersSnap.size,
        totalProducts: productsSnap.size,
        pendingOrders,
        deliveredOrders,
        acceptedOrders,
      });
      setRecentOrders(recent);
    } catch (e) {
      console.error('Seller dashboard error:', e);
    } finally {
      setLoading(false);
    }
  };

  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return { emoji: '🌅', text: 'Good Morning' };
    if (h < 17) return { emoji: '☀️', text: 'Good Afternoon' };
    return { emoji: '🌙', text: 'Good Evening' };
  };
  const g = greet();
  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const shopName = (userData as any)?.sellerProfile?.shopName || 'My Shop';

  const STATUS_COLOR: Record<string, string> = {
    placed: '#3B82F6',
    accepted: '#8B5CF6',
    'out for delivery': '#F59E0B',
    delivered: '#16A34A',
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View>
          <Text style={[font, s.hTitle]}>Dashboard</Text>
          <Text style={[font, s.hSub]}>{dateStr}</Text>
        </View>
        <View style={s.shopBadge}>
          <Text style={[font, { color: '#145A32', fontSize: 10, fontWeight: '800' }]}>🏪 {shopName}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Welcome Banner */}
        <View style={s.banner}>
          <Text style={{ fontSize: 32, marginRight: 12 }}>{g.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[font, { color: 'rgba(255,255,255,0.8)', fontSize: 14 }]}>{g.text},</Text>
            <Text style={[font, { color: '#FFF', fontSize: 24, fontWeight: '900' }]}>{userData?.name || 'Seller'}!</Text>
          </View>
          <View style={s.onlineBadge}>
            <Text style={[font, { color: '#FFF', fontSize: 10, fontWeight: '700' }]}>🟢 Active</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#D4A843" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Today Stats */}
            <View style={s.todayRow}>
              <View style={[s.todayCard, { backgroundColor: '#F0FDF4' }]}>
                <IndianRupee color="#16A34A" size={20} />
                <Text style={[font, s.todayVal]}>₹{stats.todayRevenue.toFixed(0)}</Text>
                <Text style={[font, s.todayLabel]}>Today Revenue</Text>
              </View>
              <View style={[s.todayCard, { backgroundColor: '#EFF6FF' }]}>
                <ShoppingCart color="#3B82F6" size={20} />
                <Text style={[font, s.todayVal]}>{stats.todayOrders}</Text>
                <Text style={[font, s.todayLabel]}>Today Orders</Text>
              </View>
            </View>

            {/* Main Stats Grid */}
            <View style={s.grid}>
              {[
                { label: 'Total Revenue', val: `₹${stats.totalRevenue.toFixed(0)}`, Icon: TrendingUp, color: '#10B981', bg: '#ECFDF5' },
                { label: 'Total Orders', val: `${stats.totalOrders}`, Icon: ShoppingCart, color: '#3B82F6', bg: '#EFF6FF' },
                { label: 'Products', val: `${stats.totalProducts}`, Icon: Package, color: '#8B5CF6', bg: '#F5F3FF' },
                { label: 'Delivered', val: `${stats.deliveredOrders}`, Icon: CheckCircle, color: '#16A34A', bg: '#F0FDF4' },
              ].map((c, i) => {
                const Icon = c.Icon;
                return (
                  <View key={i} style={s.card}>
                    <View style={[s.iconBox, { backgroundColor: c.bg }]}>
                      <Icon color={c.color} size={22} />
                    </View>
                    <Text style={[font, s.cardVal]}>{c.val}</Text>
                    <Text style={[font, s.cardLabel]}>{c.label}</Text>
                  </View>
                );
              })}
            </View>

            {/* Order Status Summary */}
            <View style={s.statusRow}>
              {[
                { label: 'Pending', val: stats.pendingOrders, color: '#F59E0B', emoji: '⏳' },
                { label: 'Accepted', val: stats.acceptedOrders, color: '#8B5CF6', emoji: '✅' },
                { label: 'Delivered', val: stats.deliveredOrders, color: '#10B981', emoji: '🎉' },
              ].map((st, i) => (
                <View key={i} style={s.statusCard}>
                  <Text style={{ fontSize: 24 }}>{st.emoji}</Text>
                  <Text style={[font, { fontSize: 22, fontWeight: '900', color: st.color, marginTop: 4 }]}>{st.val}</Text>
                  <Text style={[font, { fontSize: 11, color: '#6B7280' }]}>{st.label}</Text>
                </View>
              ))}
            </View>

            {/* Recent Orders */}
            <Text style={[font, s.secTitle]}>📋 Recent Orders</Text>
            {recentOrders.length === 0 ? (
              <View style={s.emptyBox}>
                <Text style={{ fontSize: 48 }}>📭</Text>
                <Text style={[font, { color: '#6B7280', marginTop: 8, fontSize: 15, fontWeight: '700' }]}>No orders yet</Text>
                <Text style={[font, { color: '#9CA3AF', marginTop: 4, fontSize: 12 }]}>Orders will appear here when customers order your products</Text>
              </View>
            ) : (
              recentOrders.map((o: any) => (
                <View key={o.id} style={s.orderCard}>
                  <View style={[s.orderDot, { backgroundColor: STATUS_COLOR[o.status] || '#6B7280' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[font, { fontSize: 14, fontWeight: '800', color: '#111827' }]}>{o.userName || 'Customer'}</Text>
                    <Text style={[font, { fontSize: 11, color: '#6B7280' }]}>#{o.id.substring(0, 6).toUpperCase()} • {o.products?.length || 0} items</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[font, { fontSize: 15, fontWeight: '900', color: '#145A32' }]}>₹{parseFloat(o.totalAmount || 0).toFixed(0)}</Text>
                    <View style={[s.orderBadge, { backgroundColor: (STATUS_COLOR[o.status] || '#6B7280') + '20' }]}>
                      <Text style={[font, { fontSize: 9, fontWeight: '800', color: STATUS_COLOR[o.status] || '#6B7280' }]}>{(o.status || 'placed').toUpperCase()}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}

            {/* Revenue Note */}
            <View style={s.revenueNote}>
              <Text style={[font, { color: '#D97706', fontWeight: '800', fontSize: 13 }]}>💡 Revenue Info</Text>
              <Text style={[font, { color: '#92400E', fontSize: 12, marginTop: 4, lineHeight: 20 }]}>
                Revenue is counted only after an order is marked as "Delivered". Pending and accepted orders are not included in the revenue calculation.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  hTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  hSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  shopBadge: { backgroundColor: '#F0FDF4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#BBF7D0' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#145A32',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  onlineBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  todayRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  todayCard: { flex: 1, borderRadius: 18, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  todayVal: { fontSize: 24, fontWeight: '900', color: '#111827', marginTop: 6 },
  todayLabel: { fontSize: 11, color: '#6B7280', marginTop: 2, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  card: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
  },
  iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  cardVal: { fontSize: 22, fontWeight: '900', color: '#111827' },
  cardLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  statusRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statusCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  secTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 12 },
  emptyBox: { backgroundColor: '#FFF', borderRadius: 20, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 20 },
  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  orderDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  orderBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  revenueNote: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
});
