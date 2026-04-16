import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView } from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { LayoutGrid, Package, FolderOpen, FileText, Users, Image, Tag, Map as MapIcon, BarChart2, Settings, Store } from 'lucide-react-native';

// Import All Admin Components
import AdminHome from './AdminHome';
import AdminProducts from './AdminProducts';
import AdminCategories from './AdminCategories';
import AdminOrders from './AdminOrders';
import AdminUsers from './AdminUsers';
import AdminBanners from './AdminBanners';
import AdminCoupons from './AdminCoupons';
import AdminMap from './AdminMap';
import AdminReports from './AdminReports';
import AdminWallet from './AdminWallet';
import AdminSettings from './AdminSettings';
import AdminSubscriptions from './AdminSubscriptions';
import AdminSellers from './AdminSellers';

const font = { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' };

const TABS = [
  { key: 'home', label: 'Dashboard', Icon: LayoutGrid },
  { key: 'products', label: 'Products', Icon: Package },
  { key: 'categories', label: 'Categories', Icon: FolderOpen },
  { key: 'orders', label: 'Orders', Icon: FileText },
  { key: 'sellers', label: 'Sellers', Icon: Store },
  { key: 'users', label: 'Users', Icon: Users },
  { key: 'banners', label: 'Banners', Icon: Image },
  { key: 'coupons', label: 'Coupons', Icon: Tag },
  { key: 'map', label: 'Map', Icon: MapIcon },
  { key: 'wallet', label: 'Wallet', Icon: BarChart2 },
  { key: 'reports', label: 'Reports', Icon: BarChart2 },
  { key: 'subs', label: 'Subscriptions', Icon: LayoutGrid },
  { key: 'settings', label: 'Settings', Icon: Settings },
];

export default function AdminPanel({ navigation }: any) {
  const [activeTab, setActiveTab] = useState('home');
  const [pendingCount, setPendingCount] = useState(0);
  const [sellerPendingCount, setSellerPendingCount] = useState(0);

  useEffect(() => {
    const q = query(collection(db, 'orders'), where('status', '==', 'placed'));
    const unsubscribe = onSnapshot(q, (snap) => setPendingCount(snap.size));
    
    const sq = query(collection(db, 'sellerRequests'), where('status', '==', 'pending'));
    const unsubSellers = onSnapshot(sq, (snap) => setSellerPendingCount(snap.size));
    
    return () => { unsubscribe(); unsubSellers(); };
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <AdminHome />;
      case 'products': return <AdminProducts />;
      case 'categories': return <AdminCategories />;
      case 'orders': return <AdminOrders />;
      case 'sellers': return <AdminSellers />;
      case 'users': return <AdminUsers />;
      case 'banners': return <AdminBanners />;
      case 'coupons': return <AdminCoupons />;
      case 'map': return <AdminMap navigation={navigation} />;
      case 'wallet': return <AdminWallet />;
      case 'reports': return <AdminReports />;
      case 'subs': return <AdminSubscriptions />;
      case 'settings': return <AdminSettings navigation={navigation} />;
      default: return <AdminHome />;
    }
  };

  return (
    <View style={s.root}>
      <View style={s.contentContainer}>
        {renderContent()}
      </View>
      <View style={s.tabBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabBarScroll}
        >
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
                  <Icon color={isActive ? '#3B82F6' : '#9CA3AF'} size={22} />
                  {t.key === 'orders' && pendingCount > 0 && (
                    <View style={s.badge}><Text style={s.badgeText}>{pendingCount}</Text></View>
                  )}
                  {t.key === 'sellers' && sellerPendingCount > 0 && (
                    <View style={[s.badge, { backgroundColor: '#F59E0B' }]}><Text style={s.badgeText}>{sellerPendingCount}</Text></View>
                  )}
                </View>
                <Text style={[font, s.tabText, isActive && s.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
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
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginHorizontal: 2,
    minWidth: 64,
  },
  tabItemActive: {
    backgroundColor: '#EFF6FF',
  },
  tabText: {
    fontSize: 10,
    marginTop: 4,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#3B82F6',
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
  }
});
