import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView } from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { LayoutGrid, Package, FileText, LogOut, Store } from 'lucide-react-native';
import { logoutUser } from '../../services/auth';

import SellerDashboard from './SellerDashboard';
import SellerProducts from './SellerProducts';
import SellerOrders from './SellerOrders';

const font = { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' };

const TABS = [
  { key: 'dashboard', label: 'Dashboard', Icon: LayoutGrid },
  { key: 'products', label: 'Products', Icon: Package },
  { key: 'orders', label: 'Orders', Icon: FileText },
];

export default function SellerPanel({ navigation }: any) {
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [pendingCount, setPendingCount] = useState(0);

  const sellerId = userData?.uid;

  useEffect(() => {
    if (!sellerId) return;
    const q = query(collection(db, 'orders'), where('sellerId', '==', sellerId), where('status', '==', 'placed'));
    const unsub = onSnapshot(q, (snap) => setPendingCount(snap.size));
    return () => unsub();
  }, [sellerId]);

  const shopName = (userData as any)?.sellerProfile?.shopName || 'My Shop';

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <SellerDashboard />;
      case 'products': return <SellerProducts />;
      case 'orders': return <SellerOrders />;
      default: return <SellerDashboard />;
    }
  };

  const handleLogout = async () => {
    try {
      if (Platform.OS === 'web') {
        if (window.confirm('Are you sure you want to log out?')) {
          await logoutUser();
          window.location.reload();
        }
      } else {
        const { Alert } = require('react-native');
        Alert.alert('Logout', 'Are you sure?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Logout', style: 'destructive', onPress: () => logoutUser() },
        ]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View style={s.root}>
      <View style={s.contentContainer}>
        {renderContent()}
      </View>
      <View style={s.tabBarContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabBarScroll}>
          {TABS.map(t => {
            const Icon = t.Icon;
            const isActive = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[s.tabItem, isActive && s.tabItemActive]}
                onPress={() => setActiveTab(t.key)}
                activeOpacity={0.7}
              >
                <View style={{ position: 'relative' }}>
                  <Icon color={isActive ? '#D4A843' : '#9CA3AF'} size={22} />
                  {t.key === 'orders' && pendingCount > 0 && (
                    <View style={s.badge}><Text style={s.badgeText}>{pendingCount}</Text></View>
                  )}
                </View>
                <Text style={[font, s.tabText, isActive && s.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}

          {/* Customer View */}
          <TouchableOpacity
            style={s.tabItem}
            onPress={() => navigation.navigate('Customer')}
            activeOpacity={0.7}
          >
            <Store color="#9CA3AF" size={22} />
            <Text style={[font, s.tabText]}>Shop</Text>
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity
            style={s.tabItem}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <LogOut color="#EF4444" size={22} />
            <Text style={[font, s.tabText, { color: '#EF4444' }]}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  contentContainer: { flex: 1 },
  tabBarContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
  },
  tabBarScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginHorizontal: 4,
    minWidth: 70,
  },
  tabItemActive: {
    backgroundColor: 'rgba(212,168,67,0.12)',
  },
  tabText: {
    fontSize: 11,
    marginTop: 4,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#D4A843',
    fontWeight: '800',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
  },
});
