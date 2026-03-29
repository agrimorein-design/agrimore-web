import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Share, ActivityIndicator } from 'react-native';
import { ArrowLeft, Copy, Share2, Users, ShoppingCart, DollarSign } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';

const font = {
  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  fontStyle: 'italic' as const,
};

export default function Referral({ navigation }: any) {
  const { userData } = useAuth();
  const [referralCode, setReferralCode] = useState('');
  const [stats, setStats] = useState({ friends: 0, orders: 0, earned: 0 });
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReferralData = async () => {
      if (!userData?.uid) { setLoading(false); return; }
      try {
        const userDoc = await getDoc(doc(db, 'users', userData.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setReferralCode(data.referralCode || userData.uid.substring(0, 8).toUpperCase());
          setStats({
            friends: data.referralFriends || 0,
            orders: data.referralOrders || 0,
            earned: data.referralEarned || 0,
          });
        } else {
          setReferralCode(userData.uid.substring(0, 8).toUpperCase());
        }
      } catch (e) {
        console.error('Error fetching referral data:', e);
        setReferralCode(userData?.uid?.substring(0, 8).toUpperCase() || 'AGRIMORE');
      }
      setLoading(false);
    };
    fetchReferralData();
  }, [userData]);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join Agrimore and get ₹50 off on your first order! Use my referral code: ${referralCode}. Download now: https://agrimore.app`,
      });
    } catch (e) {}
  };

  if (loading) {
    return (
      <View style={s.root}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><ArrowLeft color="#D4A843" size={22} /></TouchableOpacity>
          <Text style={[font, s.headerTitle]}>Refer & Earn</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color="#145A32" /></View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <ArrowLeft color="#D4A843" size={22} />
        </TouchableOpacity>
        <Text style={[font, s.headerTitle]}>Refer & Earn</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={s.heroCard}>
          <Text style={s.heroEmoji}>🎁</Text>
          <Text style={[font, s.heroTitle]}>Invite Friends, Earn Rewards</Text>
          <Text style={[font, s.heroSub]}>
            Share your code and earn ₹50 for every friend who joins and places their first order
          </Text>
        </View>

        {/* Referral Code */}
        <View style={s.codeCard}>
          <Text style={[font, s.codeLabel]}>Your Referral Code</Text>
          <View style={s.codeBox}>
            <Text style={[font, s.codeText]}>{referralCode}</Text>
          </View>
          <View style={s.codeActions}>
            <TouchableOpacity style={s.codeBtn} onPress={handleCopy}>
              <Copy color="#145A32" size={18} />
              <Text style={[font, s.codeBtnText]}>{copied ? 'Copied!' : 'Copy'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.codeBtn, s.shareBtnStyle]} onPress={handleShare}>
              <Share2 color="#FFF" size={18} />
              <Text style={[font, s.codeBtnText, { color: '#FFF' }]}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <Text style={[font, s.statsTitle]}>Your Referral Stats</Text>
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <View style={[s.statIcon, { backgroundColor: '#EFF6FF' }]}>
              <Users color="#3B82F6" size={22} />
            </View>
            <Text style={[font, s.statNum]}>{stats.friends}</Text>
            <Text style={[font, s.statLabel]}>Friends Invited</Text>
          </View>
          <View style={s.statCard}>
            <View style={[s.statIcon, { backgroundColor: '#F0FDF4' }]}>
              <ShoppingCart color="#16A34A" size={22} />
            </View>
            <Text style={[font, s.statNum]}>{stats.orders}</Text>
            <Text style={[font, s.statLabel]}>Orders Placed</Text>
          </View>
          <View style={s.statCard}>
            <View style={[s.statIcon, { backgroundColor: '#FFFBEB' }]}>
              <DollarSign color="#D4A843" size={22} />
            </View>
            <Text style={[font, s.statNum]}>₹{stats.earned}</Text>
            <Text style={[font, s.statLabel]}>Total Earned</Text>
          </View>
        </View>

        {/* How it works */}
        <Text style={[font, s.howTitle]}>How It Works</Text>
        {[
          { step: '1', title: 'Share your code', desc: 'Share your unique referral code with friends' },
          { step: '2', title: 'Friend joins', desc: 'Your friend signs up using your code' },
          { step: '3', title: 'Both earn rewards', desc: 'You both get ₹50 in your wallet' },
        ].map((item, i) => (
          <View key={i} style={s.stepCard}>
            <View style={s.stepCircle}>
              <Text style={[font, s.stepNum]}>{item.step}</Text>
            </View>
            <View style={s.stepInfo}>
              <Text style={[font, s.stepTitle]}>{item.title}</Text>
              <Text style={[font, s.stepDesc]}>{item.desc}</Text>
            </View>
          </View>
        ))}

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
  heroCard: {
    backgroundColor: '#145A32', borderRadius: 24, padding: 28, alignItems: 'center', marginBottom: 24,
  },
  heroEmoji: { fontSize: 52, marginBottom: 12 },
  heroTitle: { color: '#D4A843', fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  heroSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  codeCard: {
    backgroundColor: '#FFF', borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 24,
    borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  codeLabel: { fontSize: 14, color: '#6B7280', marginBottom: 12 },
  codeBox: {
    backgroundColor: 'rgba(20,90,50,0.06)', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16,
    borderWidth: 2, borderColor: 'rgba(20,90,50,0.15)', borderStyle: 'dashed', marginBottom: 20,
  },
  codeText: { fontSize: 28, fontWeight: '900', color: '#145A32', letterSpacing: 4 },
  codeActions: { flexDirection: 'row' },
  codeBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(20,90,50,0.1)',
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginHorizontal: 8,
  },
  codeBtnText: { fontSize: 14, fontWeight: '700', color: '#145A32', marginLeft: 8 },
  shareBtnStyle: { backgroundColor: '#145A32' },
  statsTitle: { fontSize: 18, fontWeight: '900', color: '#145A32', marginBottom: 14 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  statCard: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 16, alignItems: 'center',
    marginHorizontal: 4, borderWidth: 1, borderColor: '#F3F4F6',
  },
  statIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statNum: { fontSize: 20, fontWeight: '900', color: '#1F2937', marginBottom: 2 },
  statLabel: { fontSize: 10, color: '#9CA3AF', textAlign: 'center' },
  howTitle: { fontSize: 18, fontWeight: '900', color: '#145A32', marginBottom: 14 },
  stepCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16,
    padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6',
  },
  stepCircle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#D4A843',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  stepNum: { color: '#145A32', fontSize: 18, fontWeight: '900' },
  stepInfo: { flex: 1 },
  stepTitle: { fontSize: 15, fontWeight: '900', color: '#1F2937', marginBottom: 2 },
  stepDesc: { fontSize: 12, color: '#6B7280' },
});
