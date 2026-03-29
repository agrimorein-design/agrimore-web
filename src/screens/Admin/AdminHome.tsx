import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { db } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import {
  IndianRupee, FileText, Package, Users, Truck, ShoppingCart, TrendingUp, AlertCircle, Map as MapIcon
} from 'lucide-react-native';

const font = { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' };
const { width: SW } = Dimensions.get('window');

export default function AdminHome({ onMenu }: { onMenu?: () => void }) {
  const { userData } = useAuth();
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState({ revenue: 0, orders: 0, pending: 0, products: 0, users: 0, sellers: 0, todayRevenue: 0, todayOrders: 0, ofd: 0, delivered: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  
  // Feature 1: Low Stock Alerts
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  
  // Feature 2: Multi-Period Chart
  const [chartPeriod, setChartPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [weeklyData, setWeeklyData] = useState<number[]>([0,0,0,0,0,0,0]);
  const [monthlyData, setMonthlyData] = useState<number[]>(new Array(12).fill(0));
  const [yearlyData, setYearlyData] = useState<number[]>([0,0,0,0,0]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [oSnap, pSnap, uSnap] = await Promise.all([
          getDocs(collection(db, 'orders')),
          getDocs(collection(db, 'products')),
          getDocs(collection(db, 'users')),
        ]);
        let revenue = 0, pending = 0, todayRevenue = 0, todayOrders = 0, ofd = 0, delivered = 0;
        const today = new Date(); today.setHours(0,0,0,0);
        const currentYear = today.getFullYear();
        
        const wData = [0,0,0,0,0,0,0]; 
        const mData = new Array(12).fill(0);
        const yData = new Array(5).fill(0);

        const allOrders = oSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        allOrders.forEach((data: any) => {
          const amt = parseFloat(data.totalAmount) || 0;
          revenue += amt;
          if (data.status !== 'delivered') pending++;
          if (data.status === 'out for delivery') ofd++;
          if (data.status === 'delivered') delivered++;

          const orderDate = data.createdAt?.toDate?.() || new Date(0);
          if (orderDate >= today) { todayRevenue += amt; todayOrders++; }

          // Weekly chart data
          const dayDiff = Math.floor((today.getTime() - orderDate.getTime()) / (1000*60*60*24));
          if (dayDiff >= 0 && dayDiff < 7) { wData[6 - dayDiff] += amt; }

          // Monthly chart data (Jan-Dec for the current year)
          if (orderDate.getFullYear() === currentYear) {
            mData[orderDate.getMonth()] += amt;
          }

          // Yearly chart data (Last 5 years)
          const yDiff = currentYear - orderDate.getFullYear();
          if (yDiff >= 0 && yDiff < 5) {
            yData[4 - yDiff] += amt;
          }
        });

        let sellers = 0;
        uSnap.docs.forEach(d => { if (d.data().role === 'seller') sellers++; });

        // Low Stock calculation (< 10 items)
        const productsList: any[] = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const lowStock = productsList.filter(p => p.stock !== undefined && Number(p.stock) <= 10);
        setLowStockProducts(lowStock);

        // Recent 5 orders
        const recent = allOrders
          .sort((a: any, b: any) => (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0))
          .slice(0, 5);

        setStats({ revenue, orders: oSnap.size, pending, products: pSnap.size, users: uSnap.size, sellers, todayRevenue, todayOrders, ofd, delivered });
        setRecentOrders(recent);
        setWeeklyData(wData);
        setMonthlyData(mData);
        setYearlyData(yData);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchStats();
  }, []);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return { emoji: '🌅', text: 'Good Morning' };
    if (h < 17) return { emoji: '☀️', text: 'Good Afternoon' };
    return { emoji: '🌙', text: 'Good Evening' };
  };
  const greet = getGreeting();
  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  
  // Dynamic Chart Labels
  const chartLabels = {
    week: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    year: [new Date().getFullYear()-4, new Date().getFullYear()-3, new Date().getFullYear()-2, new Date().getFullYear()-1, new Date().getFullYear()]
  };

  const activeChartData = chartPeriod === 'week' ? weeklyData : chartPeriod === 'month' ? monthlyData : yearlyData;
  const activeChartLabels = chartLabels[chartPeriod];
  const maxChartValue = Math.max(...activeChartData, 1);

  const STATUS_COLOR: Record<string, string> = { placed: '#3B82F6', accepted: '#8B5CF6', preparing: '#F59E0B', 'out for delivery': '#2563EB', delivered: '#16A34A' };

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={[font, s.hTitle]}>Dashboard</Text>
          <Text style={[font, s.hSub]}>{dateStr}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <TouchableOpacity 
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6 }} 
            onPress={() => navigation.navigate('AdminMap')}
          >
            <MapIcon color="#FFF" size={20} />
          </TouchableOpacity>
          <View style={s.avatar}><Text style={[font, { color: '#FFF', fontWeight: 'bold', fontSize: 16 }]}>{userData?.name?.charAt(0) || 'A'}</Text></View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Welcome Banner */}
        <View style={s.banner}>
          <Text style={{ fontSize: 32, marginRight: 12 }}>{greet.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[font, { color: 'rgba(255,255,255,0.8)', fontSize: 14 }]}>{greet.text},</Text>
            <Text style={[font, { color: '#FFF', fontSize: 26, fontWeight: '900' }]}>{userData?.name || 'Admin'}!</Text>
          </View>
          <View style={s.systemBadge}><Text style={[font, { color: '#FFF', fontSize: 10, fontWeight: '700' }]}>🟢 Online</Text></View>
        </View>

        {loading ? <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} /> : (
          <>
            {/* Today's Stats Row */}
            <View style={s.todayRow}>
              <View style={[s.todayCard, { backgroundColor: '#ECFDF5' }]}>
                <IndianRupee color="#10B981" size={18} />
                <Text style={[font, s.todayVal]}>₹{stats.todayRevenue.toFixed(0)}</Text>
                <Text style={[font, s.todayLabel]}>Today Revenue</Text>
              </View>
              <View style={[s.todayCard, { backgroundColor: '#EFF6FF' }]}>
                <ShoppingCart color="#3B82F6" size={18} />
                <Text style={[font, s.todayVal]}>{stats.todayOrders}</Text>
                <Text style={[font, s.todayLabel]}>Today Orders</Text>
              </View>
              <View style={[s.todayCard, { backgroundColor: '#FEF3C7' }]}>
                <Truck color="#D97706" size={18} />
                <Text style={[font, s.todayVal]}>{stats.ofd}</Text>
                <Text style={[font, s.todayLabel]}>Delivering</Text>
              </View>
            </View>

            {/* Main Stat Cards Grid */}
            <View style={s.grid}>
              {[
                { label: 'Revenue', val: `₹${stats.revenue.toFixed(0)}`, Icon: IndianRupee, color: '#10B981', bg: '#ECFDF5', trend: `${stats.orders} orders` },
                { label: 'Orders', val: stats.orders, Icon: FileText, color: '#3B82F6', bg: '#EFF6FF', trend: `${stats.pending} pending` },
                { label: 'Products', val: stats.products, Icon: Package, color: '#8B5CF6', bg: '#F5F3FF', trend: 'In stock' },
                { label: 'Users', val: stats.users, Icon: Users, color: '#06B6D4', bg: '#ECFEFF', trend: `${stats.sellers} sellers` },
              ].map((c, i) => {
                const Icon = c.Icon;
                return (
                  <View key={i} style={s.card}>
                    <View style={s.cardTop}>
                      <View style={[s.iconBox, { backgroundColor: c.bg }]}><Icon color={c.color} size={20} /></View>
                      <View style={s.trendPill}><Text style={[font, { fontSize: 10, fontWeight: '700', color: '#16A34A' }]}>↗ {c.trend}</Text></View>
                    </View>
                    <Text style={[font, s.cardVal]}>{c.val}</Text>
                    <Text style={[font, s.cardLabel]}>{c.label}</Text>
                  </View>
                );
              })}
            </View>

            {/* Low Stock Alerts */}
            {lowStockProducts.length > 0 && (
              <View style={s.alertBox}>
                <View style={s.alertHeader}>
                  <AlertCircle color="#DC2626" size={20} />
                  <Text style={[font, { color: '#DC2626', fontWeight: '900', fontSize: 16, marginLeft: 8 }]}>Low Stock Alerts</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                  {lowStockProducts.map(p => (
                    <View key={p.id} style={s.alertItem}>
                      <Text style={[font, { fontSize: 13, fontWeight: '800', color: '#111827' }]} numberOfLines={1}>{p.name}</Text>
                      <Text style={[font, { fontSize: 12, color: '#DC2626', fontWeight: 'bold' }]}>Only {p.stock} left</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Multi-Period Revenue Bar Chart */}
            <View style={s.chartCard}>
              <View style={s.chartHeader}>
                <Text style={[font, s.chartTitle]}>📊 Revenue Analytics</Text>
                <View style={s.chartTabs}>
                  {['week', 'month', 'year'].map(period => (
                    <TouchableOpacity 
                      key={period} 
                      style={[s.chartTab, chartPeriod === period && s.chartTabActive]}
                      onPress={() => setChartPeriod(period as any)}
                    >
                      <Text style={[font, s.chartTabText, chartPeriod === period && s.chartTabTextActive]}>{period.charAt(0).toUpperCase() + period.slice(1)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View style={s.chartBars}>
                {activeChartLabels.map((label, i) => {
                  const h = Math.max(8, (activeChartData[i] / maxChartValue) * 80);
                  const isCurrent = (chartPeriod === 'week' && (i === new Date().getDay() - 1 || (new Date().getDay() === 0 && i === 6))) || 
                                    (chartPeriod === 'month' && i === new Date().getMonth()) ||
                                    (chartPeriod === 'year' && i === 4);
                  return (
                    <View key={i} style={s.barCol}>
                      {activeChartData[i] > 0 && (
                        <Text style={[font, { fontSize: 8, color: '#6B7280', marginBottom: 4, width: 30, textAlign: 'center' }]} numberOfLines={1}>
                          {activeChartData[i] > 1000 ? `${(activeChartData[i]/1000).toFixed(1)}k` : `₹${activeChartData[i].toFixed(0)}`}
                        </Text>
                      )}
                      <View style={[s.bar, { height: h, backgroundColor: isCurrent ? '#3B82F6' : '#E5E7EB', width: chartPeriod === 'month' ? 14 : 24 }]} />
                      <Text style={[font, { fontSize: 9, color: isCurrent ? '#3B82F6' : '#9CA3AF', marginTop: 4, fontWeight: isCurrent ? '800' : '600' }]}>{label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Order Status Summary */}
            <View style={s.statusRow}>
              {[
                { label: 'Pending', val: stats.pending, color: '#F59E0B', emoji: '⏳' },
                { label: 'Delivering', val: stats.ofd, color: '#3B82F6', emoji: '🚚' },
                { label: 'Delivered', val: stats.delivered, color: '#10B981', emoji: '✅' },
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
              <Text style={[font, { color: '#9CA3AF', textAlign: 'center', marginTop: 16 }]}>No orders yet</Text>
            ) : (
              recentOrders.map((o: any) => (
                <View key={o.id} style={s.orderCard}>
                  <View style={[s.orderDot, { backgroundColor: STATUS_COLOR[o.status] || '#6B7280' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[font, { fontSize: 14, fontWeight: '800', color: '#111827' }]}>{o.userName || 'Customer'}</Text>
                    <Text style={[font, { fontSize: 11, color: '#6B7280' }]}>#{o.id.substring(0,6).toUpperCase()} • {o.products?.length || 0} items</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[font, { fontSize: 15, fontWeight: '900', color: '#145A32' }]}>₹{parseFloat(o.totalAmount || 0).toFixed(0)}</Text>
                    <View style={[s.orderStatusPill, { backgroundColor: (STATUS_COLOR[o.status] || '#6B7280') + '20' }]}>
                      <Text style={[font, { fontSize: 9, fontWeight: '800', color: STATUS_COLOR[o.status] || '#6B7280' }]}>{(o.status || 'placed').toUpperCase()}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: '#FFF', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  hTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  hSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  avatar: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' },
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B82F6', borderRadius: 20, padding: 20, marginBottom: 20 },
  systemBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  todayRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  todayCard: { flex: 1, borderRadius: 16, padding: 14, alignItems: 'center' },
  todayVal: { fontSize: 20, fontWeight: '900', color: '#111827', marginTop: 6 },
  todayLabel: { fontSize: 10, color: '#6B7280', marginTop: 2, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 },
  card: { width: '48%', backgroundColor: '#FFF', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  trendPill: { backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  cardVal: { fontSize: 26, fontWeight: '900', color: '#111827' },
  cardLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  
  // Low stock
  alertBox: { backgroundColor: '#FEF2F2', padding: 16, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: '#FCA5A5' },
  alertHeader: { flexDirection: 'row', alignItems: 'center' },
  alertItem: { backgroundColor: '#FFF', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, marginRight: 10, width: 140, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },

  // Chart
  chartCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  chartTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  chartTabs: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 4 },
  chartTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  chartTabActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  chartTabText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  chartTabTextActive: { color: '#3B82F6', fontWeight: '800' },
  chartBars: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 120 },
  barCol: { alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  bar: { borderRadius: 6 },

  statusRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statusCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  secTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 12 },
  orderCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 14, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  orderDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  orderStatusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
});
