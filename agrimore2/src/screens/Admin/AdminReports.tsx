import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { TrendingUp, DollarSign, Package, ShoppingCart, Download, Calendar } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const font = { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' };

export default function AdminReports() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [stats, setStats] = useState({ revenue: 0, orders: 0, avgOrder: 0, newUsers: 0 });
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [oSnap, pSnap, uSnap] = await Promise.all([
          getDocs(collection(db, 'orders')),
          getDocs(collection(db, 'products')),
          getDocs(collection(db, 'users')),
        ]);

        const now = new Date();
        let filterDate = new Date();
        if (period === 'daily') filterDate.setDate(now.getDate() - 1);
        else if (period === 'weekly') filterDate.setDate(now.getDate() - 7);
        else filterDate.setMonth(now.getMonth() - 1);

        let revenue = 0; let count = 0;
        const productSales: Record<string, { name: string; qty: number; rev: number }> = {};
        const historyList: any[] = [];

        oSnap.docs.forEach(d => {
          const data = d.data();
          const orderDate = data.createdAt?.toDate?.() || new Date(0);
          
          if (orderDate >= filterDate && data.status === 'delivered') {
            const amt = parseFloat(data.totalAmount) || 0;
            revenue += amt; count++;
            historyList.push({ id: d.id, ...data, orderDate });
            
            (data.products || []).forEach((p: any) => {
              if (!productSales[p.name]) productSales[p.name] = { name: p.name, qty: 0, rev: 0 };
              productSales[p.name].qty += p.quantity || 1;
              productSales[p.name].rev += (p.price || 0) * (p.quantity || 1);
            });
          }
        });

        // Always show the newest sales first
        historyList.sort((a,b) => b.orderDate - a.orderDate);
        setSalesHistory(historyList);

        setStats({ revenue, orders: count, avgOrder: count > 0 ? revenue / count : 0, newUsers: uSnap.size });
        const topArr = Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 5);
        setTopProducts(topArr);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchStats();
  }, [period]);

  const metrics = [
    { label: 'Revenue', value: `₹${stats.revenue.toFixed(0)}`, color: '#10B981', bg: '#ECFDF5', Icon: DollarSign },
    { label: 'Orders', value: stats.orders, color: '#3B82F6', bg: '#EFF6FF', Icon: ShoppingCart },
    { label: 'Avg Order', value: `₹${stats.avgOrder.toFixed(0)}`, color: '#F59E0B', bg: '#FFFBEB', Icon: TrendingUp },
    { label: 'Users', value: stats.newUsers, color: '#8B5CF6', bg: '#F5F3FF', Icon: Package },
  ];

  const exportPDF = async () => {
    const tableRows = salesHistory.map(o => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${o.orderDate.toLocaleDateString()}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${o.userName}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">ID-${o.id.substring(0,6).toUpperCase()}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${(o.products||[]).length} items</td>
        <td style="padding:8px;text-align:right;border-bottom:1px solid #eee;font-weight:bold;">₹${parseFloat(o.totalAmount||0).toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `
      <html>
        <head>
          <style>body{font-family:sans-serif;padding:20px} table{width:100%;border-collapse:collapse} th{background:#F3F4F6;padding:10px;text-align:left}</style>
        </head>
        <body>
          <h2>Agrimore Sales Report</h2>
          <p>Period: <b>${period.toUpperCase()}</b> | Total Revenue: <b>₹${stats.revenue.toFixed(2)}</b></p>
          <hr style="margin:20px 0"/>
          <table>
            <tr><th>Date</th><th>Customer</th><th>Order ID</th><th>Items</th><th style="text-align:right">Total</th></tr>
            ${tableRows || '<tr><td colspan="5" style="text-align:center;padding:20px;">No data for this period</td></tr>'}
          </table>
        </body>
      </html>
    `;
    try { const {uri} = await Print.printToFileAsync({html}); if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri); else Alert.alert('Saved', 'Report Generated'); } catch(e) { Alert.alert('Error', 'Failed to generate PDF'); }
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View><Text style={[font, s.hTitle]}>Reports</Text><Text style={[font, s.hSub]}>Analytics & Insights</Text></View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <View style={s.periodRow}>
          {(['daily', 'weekly', 'monthly'] as const).map(p => (
            <TouchableOpacity key={p} style={[s.periodBtn, period === p && s.periodBtnAct]} onPress={() => setPeriod(p)}>
              <Text style={[font, s.periodTxt, period === p && s.periodTxtAct]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} /> : (
          <>
            {/* Metric Cards */}
            <View style={s.metricsGrid}>
              {metrics.map((m, i) => {
                const Icon = m.Icon;
                return (
                  <View key={i} style={s.metricCard}>
                    <View style={[s.metricIcon, { backgroundColor: m.bg }]}><Icon color={m.color} size={20} /></View>
                    <Text style={[font, s.metricVal]}>{m.value}</Text>
                    <Text style={[font, s.metricLabel]}>{m.label}</Text>
                  </View>
                );
              })}
            </View>

            {/* Bar Chart (visual bars) */}
            <View style={s.chartCard}>
              <Text style={[font, s.chartTitle]}>📊 Revenue Trend</Text>
              <View style={s.chartBars}>
                {[65, 40, 80, 55, 90, 70, 50].map((h, i) => (
                  <View key={i} style={s.barCol}>
                    <View style={[s.bar, { height: h, backgroundColor: i === 4 ? '#3B82F6' : '#E5E7EB' }]} />
                    <Text style={[font, s.barLabel]}>{['M','T','W','T','F','S','S'][i]}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Top Products */}
            <Text style={[font, s.secTitle]}>🏆 Top Selling Products</Text>
            {topProducts.length === 0 ? (
              <Text style={[font, { color: '#9CA3AF', textAlign: 'center', marginTop: 16 }]}>No product data for this period</Text>
            ) : (
              topProducts.map((p, i) => (
                <View key={i} style={s.topCard}>
                  <View style={s.rankBadge}><Text style={[font, s.rankNum]}>#{i + 1}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={[font, s.topName]}>{p.name}</Text>
                    <Text style={[font, s.topMeta]}>{p.qty} sold • ₹{p.rev.toFixed(0)}</Text>
                  </View>
                  <Text style={[font, s.topRev]}>₹{p.rev.toFixed(0)}</Text>
                </View>
              ))
            )}

            {/* Sales History List */}
            <Text style={[font, s.secTitle, { marginTop: 16 }]}>📜 Completed Sales History</Text>
            {salesHistory.length === 0 ? (
              <Text style={[font, { color: '#9CA3AF', textAlign: 'center', marginTop: 16 }]}>No recent deliveries found.</Text>
            ) : (
              salesHistory.slice(0, 10).map((sh, idx) => (
                <View key={idx} style={s.historyCard}>
                  <View style={s.hTop}>
                    <Text style={[font, s.hDate]}>{sh.orderDate.toLocaleDateString()}</Text>
                    <Text style={[font, s.hId]}>#{sh.id.substring(0,8).toUpperCase()}</Text>
                  </View>
                  <View style={s.hMid}>
                    <Text style={[font, s.hName]}>{sh.userName}</Text>
                    <Text style={[font, s.hTotal]}>₹{parseFloat(sh.totalAmount||0).toFixed(0)}</Text>
                  </View>
                  <Text style={[font, s.hItems]}>{(sh.products||[]).length} items purchased</Text>
                </View>
              ))
            )}
            {salesHistory.length > 10 && <Text style={[font, s.hLimitText]}>Showing 10 of {salesHistory.length} orders. Export PDF for full list.</Text>}

            {/* Export Buttons (UI Only) */}
            <Text style={[font, s.secTitle, { marginTop: 24 }]}>📤 Export Data</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={[s.exportBtn, { backgroundColor: '#EFF6FF' }]} onPress={exportPDF}>
                <Download color="#3B82F6" size={18} />
                <Text style={[font, { color: '#3B82F6', fontWeight: 'bold', marginLeft: 8 }]}>Export PDF Report</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.exportBtn, { backgroundColor: '#ECFDF5', opacity: 0.5 }]} disabled>
                <Download color="#10B981" size={18} />
                <Text style={[font, { color: '#10B981', fontWeight: 'bold', marginLeft: 8 }]}>CSV Export (Coming)</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  hTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  hSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  periodRow: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 14, padding: 4, marginBottom: 20 },
  periodBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  periodBtnAct: { backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  periodTxt: { fontSize: 14, fontWeight: '700', color: '#6B7280' },
  periodTxtAct: { color: '#3B82F6', fontWeight: '800' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  metricCard: { width: '48%', backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  metricIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  metricVal: { fontSize: 24, fontWeight: '900', color: '#111827' },
  metricLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  chartCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#F1F5F9' },
  chartTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 16 },
  chartBars: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 100 },
  barCol: { alignItems: 'center' },
  bar: { width: 28, borderRadius: 6 },
  barLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 6 },
  secTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 12 },
  topCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 14, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  rankBadge: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rankNum: { fontSize: 13, fontWeight: '900', color: '#3B82F6' },
  topName: { fontSize: 14, fontWeight: '800', color: '#111827' },
  topMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  topRev: { fontSize: 15, fontWeight: '900', color: '#10B981' },
  exportBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14 },
  historyCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  hTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  hDate: { fontSize: 13, color: '#6B7280', fontWeight: '700' },
  hId: { fontSize: 12, color: '#9CA3AF', fontWeight: '900' },
  hMid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hName: { fontSize: 16, fontWeight: '800', color: '#111827' },
  hTotal: { fontSize: 16, fontWeight: '900', color: '#145A32' },
  hItems: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  hLimitText: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginVertical: 8, fontStyle: 'italic' }
});
