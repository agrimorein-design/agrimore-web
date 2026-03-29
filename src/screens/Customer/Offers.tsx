import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { ArrowLeft, Tag, Copy, Clock } from 'lucide-react-native';
import { db } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';

const font = {
  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  fontStyle: 'italic' as const,
};

export default function Offers({ navigation }: any) {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const snap = await getDocs(collection(db, 'coupons'));
        setCoupons(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error('Error fetching coupons:', e);
      }
      setLoading(false);
    };
    fetchCoupons();
  }, []);

  const handleApply = (code: string) => {
    setAppliedCode(code);
  };

  if (loading) {
    return (
      <View style={s.root}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <ArrowLeft color="#D4A843" size={22} />
          </TouchableOpacity>
          <Text style={[font, s.headerTitle]}>Offers & Coupons</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#145A32" />
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <ArrowLeft color="#D4A843" size={22} />
        </TouchableOpacity>
        <Text style={[font, s.headerTitle]}>Offers & Coupons</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={s.banner}>
          <Text style={s.bannerEmoji}>🎉</Text>
          <View style={s.bannerInfo}>
            <Text style={[font, s.bannerTitle]}>Save Big Today!</Text>
            <Text style={[font, s.bannerSub]}>Apply coupons at checkout to save more</Text>
          </View>
        </View>

        {coupons.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🏷️</Text>
            <Text style={[font, { fontSize: 18, fontWeight: '900', color: '#1F2937', marginBottom: 6 }]}>No Coupons Yet</Text>
            <Text style={[font, { fontSize: 13, color: '#9CA3AF' }]}>Check back later for exciting offers!</Text>
          </View>
        ) : (
          coupons.map((coupon) => (
            <View key={coupon.id} style={s.couponCard}>
              <View style={s.couponTop}>
                <View style={s.codeBox}>
                  <Text style={[font, s.codeText]}>{coupon.code || 'CODE'}</Text>
                  <TouchableOpacity style={s.copyBtn}>
                    <Copy color="#145A32" size={14} />
                  </TouchableOpacity>
                </View>
                <View style={s.discountBadge}>
                  <Text style={[font, s.discountText]}>{coupon.discount || '0%'} OFF</Text>
                </View>
              </View>

              <Text style={[font, s.couponDesc]}>{coupon.description || ''}</Text>

              <View style={s.couponMeta}>
                <View style={s.metaItem}>
                  <Tag color="#9CA3AF" size={12} />
                  <Text style={[font, s.metaText]}>Min ₹{coupon.minOrder || 0}</Text>
                </View>
                <View style={s.metaItem}>
                  <Clock color="#9CA3AF" size={12} />
                <Text style={[font, s.metaText]}>Expires {coupon.expiry?.toDate ? coupon.expiry.toDate().toLocaleDateString('en-IN') : 'N/A'}</Text>
              </View>
                <Text style={[font, s.usesText]}>{coupon.usedCount || 0}/{coupon.maxUses || 1} used</Text>
              </View>

              <TouchableOpacity
                style={[s.applyBtn, appliedCode === coupon.code && s.appliedBtn]}
                onPress={() => handleApply(coupon.code)}
              >
                <Text style={[font, s.applyBtnText, appliedCode === coupon.code && s.appliedBtnText]}>
                  {appliedCode === coupon.code ? '✓ Applied' : 'Apply'}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    backgroundColor: '#145A32',
    paddingTop: 54, paddingBottom: 20, paddingHorizontal: 16,
    borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#145A32', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
  },
  backBtn: { padding: 8 },
  headerTitle: { color: '#D4A843', fontSize: 24, fontWeight: '900' },
  scroll: { paddingHorizontal: 20, paddingTop: 24 },
  banner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(212,168,67,0.12)',
    borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(212,168,67,0.3)',
  },
  bannerEmoji: { fontSize: 40, marginRight: 16 },
  bannerInfo: { flex: 1 },
  bannerTitle: { fontSize: 18, fontWeight: '900', color: '#145A32', marginBottom: 4 },
  bannerSub: { fontSize: 13, color: '#6B7280' },
  couponCard: {
    backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 16,
    borderWidth: 1.5, borderColor: '#E5E7EB', borderStyle: 'dashed',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  couponTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  codeBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(20,90,50,0.06)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(20,90,50,0.15)', borderStyle: 'dashed',
  },
  codeText: { fontSize: 14, fontWeight: '900', color: '#145A32', marginRight: 8, letterSpacing: 1 },
  copyBtn: { padding: 2 },
  discountBadge: { backgroundColor: '#D4A843', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  discountText: { color: '#145A32', fontSize: 13, fontWeight: '900' },
  couponDesc: { fontSize: 14, color: '#4B5563', marginBottom: 12, lineHeight: 20 },
  couponMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 4 },
  metaText: { fontSize: 11, color: '#9CA3AF', marginLeft: 4 },
  usesText: { fontSize: 11, color: '#D4A843', fontWeight: '700' },
  applyBtn: {
    backgroundColor: 'rgba(20,90,50,0.1)', paddingVertical: 12, borderRadius: 12, alignItems: 'center',
  },
  applyBtnText: { color: '#145A32', fontSize: 14, fontWeight: '900' },
  appliedBtn: { backgroundColor: '#145A32' },
  appliedBtnText: { color: '#D4A843' },
});
