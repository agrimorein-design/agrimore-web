import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { db } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { logoutUser } from '../../services/auth';
import { Users, Package, Map, Image as ImageIcon, LogOut, DollarSign } from 'lucide-react-native';

const font = {
  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  fontStyle: 'italic' as const,
};

export default function AdminDashboard({ navigation }: any) {
  const { userData } = useAuth();
  const [stats, setStats] = useState({ orders: 0, revenue: 0, products: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const ordersSnap = await getDocs(collection(db, 'orders'));
        const productsSnap = await getDocs(collection(db, 'products'));
        
        let revenue = 0;
        ordersSnap.docs.forEach(doc => {
          revenue += parseFloat(doc.data().totalAmount) || 0;
        });

        setStats({
          orders: ordersSnap.size,
          revenue,
          products: productsSnap.size
        });
      } catch (e) {
        console.error('Error fetching admin stats', e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  const cards = [
    { label: 'Orders View', icon: Package, bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', screen: 'AdminMap' },
    { label: 'Products', icon: Users, bg: 'rgba(167,139,250,0.12)', color: '#A78BFA', screen: 'ManageProducts' },
    { label: 'Distance Map', icon: Map, bg: 'rgba(239,68,68,0.12)', color: '#F87171', screen: 'AdminMap' },
    { label: 'Banners', icon: ImageIcon, bg: 'rgba(52,211,153,0.12)', color: '#34D399', screen: 'ManageBanners' },
  ];

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={[font, s.headerTitle]}>Admin Portal</Text>
          <Text style={[font, s.headerSub]}>Welcome, {userData?.name}</Text>
        </View>
        <TouchableOpacity onPress={logoutUser} style={s.logoutBtn}>
          <LogOut color="white" size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <View style={[s.statIconWrap, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
              <Package color="#60A5FA" size={24} />
            </View>
            <Text style={[font, s.statNum]}>{stats.orders}</Text>
            <Text style={[font, s.statLabel]}>Total Orders</Text>
          </View>
          <View style={[s.statCard, { marginLeft: 12 }]}>
            <View style={[s.statIconWrap, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
              <DollarSign color="#F59E0B" size={24} />
            </View>
            <Text style={[font, s.statNum]}>₹{stats.revenue.toFixed(0)}</Text>
            <Text style={[font, s.statLabel]}>Revenue</Text>
          </View>
          <View style={[s.statCard, { marginLeft: 12 }]}>
            <View style={[s.statIconWrap, { backgroundColor: 'rgba(167,139,250,0.12)' }]}>
              <Package color="#A78BFA" size={24} />
            </View>
            <Text style={[font, s.statNum]}>{stats.products}</Text>
            <Text style={[font, s.statLabel]}>Products</Text>
          </View>
        </View>

        {/* Management Console */}
        <Text style={[font, s.sectionTitle]}>Management Console</Text>

        <View style={s.cardsGrid}>
          {cards.map((c, i) => {
            const Icon = c.icon;
            return (
              <TouchableOpacity
                key={i}
                style={s.mgmtCard}
                onPress={() => navigation.navigate(c.screen)}
              >
                <View style={[s.mgmtIconWrap, { backgroundColor: c.bg }]}>
                  <Icon color={c.color} size={28} />
                </View>
                <Text style={[font, s.mgmtLabel]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F172A' },
  header: {
    backgroundColor: '#1E293B',
    paddingTop: 56,
    paddingBottom: 28,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(248,250,252,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  headerTitle: { color: '#F59E0B', fontSize: 28, fontWeight: '900' },
  headerSub: { color: '#94A3B8', fontSize: 14, marginTop: 4 },
  logoutBtn: {
    backgroundColor: 'rgba(248,250,252,0.08)',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(248,250,252,0.1)',
  },
  scrollBody: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  statsRow: { flexDirection: 'row', marginBottom: 28 },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(30,41,59,0.85)',
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(248,250,252,0.08)',
  },
  statIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statNum: { fontSize: 22, fontWeight: '900', color: '#F8FAFC', marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#94A3B8' },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#F59E0B', marginBottom: 16, paddingLeft: 4 },
  cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  mgmtCard: {
    width: '48%',
    backgroundColor: 'rgba(30,41,59,0.85)',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(248,250,252,0.08)',
  },
  mgmtIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  mgmtLabel: { fontWeight: '900', color: '#F8FAFC', fontSize: 14, textAlign: 'center' },
});

