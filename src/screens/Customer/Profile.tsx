import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Alert, ActivityIndicator, Share } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { logoutUser } from '../../services/auth';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import {
  MapPin, Package, Heart, Settings, HelpCircle, LogOut, ChevronRight, Edit3,
  Wallet, Gift, Bell, Globe, Shield, Repeat, Store, Share2
} from 'lucide-react-native';

const font = {
  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  fontStyle: 'italic' as const,
};

export default function Profile({ navigation }: any) {
  const { userData } = useAuth();
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    const fetchStats = async () => {
      if (!userData?.uid) return;
      try {
        const q = query(collection(db, 'orders'), where('userId', '==', userData.uid));
        const snap = await getDocs(q);
        if (mounted) {
          setTotalOrders(snap.size);
          setLoadingStats(false);
        }
      } catch (e) {
        if (mounted) setLoadingStats(false);
      }
    };
    fetchStats();
    return () => { mounted = false; };
  }, [userData?.uid]);

  const menuItems = [
    { icon: Package, label: 'My Orders', screen: 'Orders', color: '#3B82F6', bg: '#EFF6FF' },
    { icon: Repeat, label: 'My Subscriptions', screen: 'MySubscriptions', color: '#145A32', bg: '#F0FDF4' },
    { icon: MapPin, label: 'Delivery Addresses', screen: 'Addresses', color: '#D4A843', bg: 'rgba(212,168,67,0.12)' },
    { icon: Wallet, label: 'Wallet', screen: 'Wallet', color: '#8B5CF6', bg: '#F5F3FF' },
    { icon: Heart, label: 'Wishlist', screen: 'Wishlist', color: '#EF4444', bg: '#FEF2F2' },
    { icon: Gift, label: 'Refer & Earn', screen: 'Referral', color: '#16A34A', bg: '#F0FDF4' },
    { icon: Gift, label: 'Rewards & Offers', screen: 'Rewards', color: '#D4A843', bg: '#FEF9C3' },
    { icon: Bell, label: 'Notifications', screen: 'Notifications', color: '#F59E0B', bg: '#FFFBEB' },
    { icon: Globe, label: 'Language', screen: 'Language', color: '#06B6D4', bg: '#ECFEFF' },
    { icon: Share2, label: 'Share with Friends', screen: 'ShareApp', color: '#EC4899', bg: '#FDF2F8' },
    { icon: HelpCircle, label: 'Help & Support', screen: 'Support', color: '#6366F1', bg: '#EEF2FF' },
    { icon: Settings, label: 'Settings', screen: null, color: '#6B7280', bg: '#F3F4F6' },
  ];

  const statCards = [
    { label: 'Agrimore Wallet', value: `₹${userData?.walletBalance || 0}`, color: '#145A32' },
    { label: 'Reward Points', value: `${(userData as any)?.rewardPoints || 0} pts`, color: '#D4A843' },
    { label: 'Total Orders', value: loadingStats ? '...' : `${totalOrders}`, color: '#3B82F6' },
  ];

  const handleLogout = async () => {
    try {
      if (Platform.OS === 'web') {
        const confirmResult = window.confirm('Are you sure you want to log out?');
        if (confirmResult) {
          await logoutUser();
          window.location.reload(); 
        }
      } else {
        Alert.alert('Logout', 'Are you sure?', [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Logout', 
            style: 'destructive', 
            onPress: async () => {
              try {
                await logoutUser();
              } catch (e: any) {
                Alert.alert('Error', e.message);
              }
            }
          }
        ]);
      }
    } catch (error: any) {
      if (Platform.OS === 'web') Platform.OS === 'web' ? window.alert(error.message) : Alert.alert('Notice', error.message);
      else Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={s.root}>
      {/* Premium Header */}
      <View style={s.header}>
        <Text style={[font, s.headerTitle]}>My Profile</Text>
      </View>

      <ScrollView contentContainerStyle={s.scrollBody} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View style={s.profileCard}>
          <View style={s.avatarWrap}>
            <View style={s.avatar}>
              <Text style={[font, s.avatarText]}>{userData?.name?.charAt(0) || 'A'}</Text>
            </View>
            <TouchableOpacity style={s.editBtn}>
              <Edit3 color="#FFF" size={12} />
            </TouchableOpacity>
          </View>

          <View style={s.userInfo}>
            <Text style={[font, s.userName]}>{userData?.name || 'Guest User'}</Text>
            <Text style={[font, s.userEmail]}>{userData?.email || 'guest@agrimore.com'}</Text>
            {userData?.phone && <Text style={[font, s.userPhone]}>📱 {userData.phone}</Text>}
            <View style={s.rolePill}>
              <Text style={s.roleText}>
                {userData?.role === 'admin' ? 'PREMIUM ADMIN' : userData?.role === 'seller' ? 'VERIFIED SELLER' : 'PREMIUM MEMBER'}
              </Text>
            </View>
          </View>
        </View>

        {/* 3 Stat Cards */}
        <View style={s.statRow}>
          {statCards.map((card, i) => (
            <View key={i} style={s.statCard}>
              <Text style={[font, s.statLabel]}>{card.label}</Text>
              <Text style={[font, s.statVal, { color: card.color }]}>{card.value}</Text>
            </View>
          ))}
        </View>

        <Text style={[font, s.sectionTitle]}>Account</Text>

        {/* Menu Items */}
        <View style={s.menuList}>
          {menuItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={i}
                style={s.menuItem}
                onPress={async () => {
                  if (item.screen === 'ShareApp') {
                    try {
                      await Share.share({
                        message: 'Check out Agrimore! The best app for fresh grocery delivery. Download now: https://agrimore.in',
                      });
                    } catch (error: any) {
                      Alert.alert('Error', error.message);
                    }
                  } else if (item.screen) {
                    navigation.navigate(item.screen);
                  }
                }}
              >
                <View style={[s.menuIconWrap, { backgroundColor: item.bg }]}>
                  <Icon color={item.color} size={20} />
                </View>
                <Text style={[font, s.menuLabel]}>{item.label}</Text>
                <ChevronRight color="#9CA3AF" size={18} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Admin Link if applicable */}
        {userData?.role === 'admin' && (
          <TouchableOpacity style={s.adminBtn} onPress={() => navigation.navigate('AdminPanel')}>
            <Shield color="#145A32" size={20} />
            <Text style={[font, s.adminBtnText]}>Enter Admin Portal</Text>
          </TouchableOpacity>
        )}

        {/* Seller Portal Link */}
        {userData?.role === 'seller' && (
          <TouchableOpacity style={[s.adminBtn, { backgroundColor: '#D4A843' }]} onPress={() => navigation.navigate('SellerPanel')}>
            <Store color="#145A32" size={20} />
            <Text style={[font, s.adminBtnText]}>Enter Seller Portal</Text>
          </TouchableOpacity>
        )}

        {/* Become a Seller button */}
        {userData?.role !== 'admin' && userData?.role !== 'seller' && (
          <TouchableOpacity
            style={[s.adminBtn, { backgroundColor: '#F0FDF4', borderWidth: 2, borderColor: '#BBF7D0' }]}
            onPress={() => navigation.navigate('SellerApply')}
          >
            <Store color="#145A32" size={20} />
            <Text style={[font, s.adminBtnText, { color: '#145A32' }]}>
              {(userData as any)?.sellerStatus === 'pending' ? '⏳ Application Pending'
                : (userData as any)?.sellerStatus === 'rejected' ? '❌ Rejected — Reapply'
                : '🏪 Become a Seller'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <LogOut color="#EF4444" size={20} />
          <Text style={[font, s.logoutText]}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    backgroundColor: '#145A32',
    paddingTop: 54,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    shadowColor: '#145A32',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 10,
  },
  headerTitle: { color: '#D4A843', fontSize: 32, fontWeight: '900', textAlign: 'center' },
  scrollBody: { paddingHorizontal: 20, paddingTop: 24 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  avatarWrap: { position: 'relative', marginRight: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(212,168,67,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#D4A843' },
  avatarText: { fontSize: 36, fontWeight: '900', color: '#145A32' },
  editBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#145A32', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
  userInfo: { flex: 1 },
  userName: { fontSize: 22, fontWeight: '900', color: '#1F2937', marginBottom: 2 },
  userEmail: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  userPhone: { fontSize: 12, color: '#9CA3AF', marginBottom: 8 },
  rolePill: { backgroundColor: '#145A32', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  roleText: { color: '#D4A843', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 14, alignItems: 'center',
    marginHorizontal: 4, borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2,
  },
  statLabel: { fontSize: 10, color: '#6B7280', marginBottom: 4 },
  statVal: { fontSize: 16, fontWeight: '900' },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#145A32', marginBottom: 16, marginLeft: 4 },
  menuList: {
    backgroundColor: '#FFF', borderRadius: 24, paddingVertical: 8,
    borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 3,
    marginBottom: 24,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  menuIconWrap: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  menuLabel: { flex: 1, fontSize: 15, color: '#1F2937', fontWeight: 'bold' },
  adminBtn: {
    backgroundColor: '#D4A843', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 18, borderRadius: 16, marginBottom: 16,
    shadowColor: '#D4A843', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  adminBtnText: { color: '#145A32', fontSize: 16, fontWeight: '900', letterSpacing: 1, marginLeft: 10 },
  logoutBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 18, backgroundColor: '#FEF2F2', borderRadius: 16,
    borderWidth: 1, borderColor: '#FEE2E2',
  },
  logoutText: { color: '#EF4444', fontSize: 16, fontWeight: '900', marginLeft: 12 },
});
