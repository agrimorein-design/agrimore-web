import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Platform, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ArrowLeft, Store, User, Phone, Mail, Building2, CreditCard, Hash, MapPin, Send, CheckCircle } from 'lucide-react-native';

const font = { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' };

export default function SellerApply({ navigation }: any) {
  const { user, userData, refreshUserData } = useAuth();

  const [name, setName] = useState(userData?.name || '');
  const [mobile, setMobile] = useState(userData?.phone || '');
  const [email, setEmail] = useState(userData?.email || '');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [saving, setSaving] = useState(false);

  // Already applied?
  const sellerStatus = (userData as any)?.sellerStatus;
  const isApproved = sellerStatus === 'approved';
  const isPending = sellerStatus === 'pending';
  const isRejected = sellerStatus === 'rejected';

  const handleSubmit = async () => {
    if (!name.trim()) return Alert.alert('Error', 'Name is required');
    if (!mobile.trim()) return Alert.alert('Error', 'Mobile number is required');
    if (!email.trim()) return Alert.alert('Error', 'Email is required');
    if (!bankName.trim()) return Alert.alert('Error', 'Bank name is required');
    if (!accountNumber.trim()) return Alert.alert('Error', 'Account number is required');
    if (!ifsc.trim()) return Alert.alert('Error', 'IFSC code is required');
    if (!shopName.trim()) return Alert.alert('Error', 'Shop name is required');
    if (!shopAddress.trim()) return Alert.alert('Error', 'Shop address is required');

    setSaving(true);
    try {
      // Save seller application data to the user document
      await setDoc(doc(db, 'users', user!.uid), {
        sellerStatus: 'pending',
        sellerProfile: {
          name: name.trim(),
          mobile: mobile.trim(),
          email: email.trim(),
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          ifsc: ifsc.trim().toUpperCase(),
          shopName: shopName.trim(),
          shopAddress: shopAddress.trim(),
          appliedAt: new Date().toISOString(),
        },
      }, { merge: true });

      // Also create a seller request document for admin
      await setDoc(doc(db, 'sellerRequests', user!.uid), {
        userId: user!.uid,
        name: name.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        ifsc: ifsc.trim().toUpperCase(),
        shopName: shopName.trim(),
        shopAddress: shopAddress.trim(),
        status: 'pending',
        appliedAt: serverTimestamp(),
      });

      await refreshUserData();

      if (Platform.OS === 'web') {
        Platform.OS === 'web' ? window.alert('✅ Your seller application has been submitted! Admin will review it shortly.') : Alert.alert('Notice', '✅ Your seller application has been submitted! Admin will review it shortly.');
      } else {
        Alert.alert('Success', 'Your seller application has been submitted! Admin will review it shortly.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setSaving(false);
  };

  // STATUS SCREEN (already applied)
  if (isPending || isRejected) {
    return (
      <View style={s.root}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <ArrowLeft color="#D4A843" size={24} />
          </TouchableOpacity>
          <Text style={[font, s.headerTitle]}>Seller Application</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.statusContainer}>
          <View style={[s.statusCard, isPending ? s.statusPending : s.statusRejected]}>
            <Text style={{ fontSize: 64, marginBottom: 16 }}>{isPending ? '⏳' : '❌'}</Text>
            <Text style={[font, s.statusTitle]}>
              {isPending ? 'Application Pending' : 'Application Rejected'}
            </Text>
            <Text style={[font, s.statusDesc]}>
              {isPending
                ? 'Your seller application is under review. Admin will approve it soon.'
                : 'Your seller application was rejected. Please contact support for more details.'}
            </Text>
            <View style={s.statusBadge}>
              <Text style={[font, s.statusBadgeText]}>
                Status: {isPending ? 'PENDING' : 'REJECTED'}
              </Text>
            </View>
            {(userData as any)?.sellerProfile?.shopName && (
              <View style={s.shopInfo}>
                <Store color="#6B7280" size={16} />
                <Text style={[font, { color: '#6B7280', marginLeft: 8, fontSize: 14 }]}>
                  {(userData as any).sellerProfile.shopName}
                </Text>
              </View>
            )}
          </View>
          {isRejected && (
            <TouchableOpacity
              style={s.reapplyBtn}
              onPress={() => {
                // Reset for re-apply
                const sp = (userData as any)?.sellerProfile;
                if (sp) {
                  setName(sp.name || '');
                  setMobile(sp.mobile || '');
                  setEmail(sp.email || '');
                  setBankName(sp.bankName || '');
                  setAccountNumber(sp.accountNumber || '');
                  setIfsc(sp.ifsc || '');
                  setShopName(sp.shopName || '');
                  setShopAddress(sp.shopAddress || '');
                }
                // Clear status to show form
                setDoc(doc(db, 'users', user!.uid), { sellerStatus: null }, { merge: true }).then(() => refreshUserData());
              }}
            >
              <Text style={[font, { color: '#FFF', fontWeight: '900', fontSize: 16 }]}>Re-Apply</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <ArrowLeft color="#D4A843" size={24} />
        </TouchableOpacity>
        <Text style={[font, s.headerTitle]}>Become a Seller</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={s.banner}>
          <Store color="#FFF" size={32} />
          <View style={{ marginLeft: 16, flex: 1 }}>
            <Text style={[font, { color: '#FFF', fontSize: 20, fontWeight: '900' }]}>Start Selling</Text>
            <Text style={[font, { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 }]}>
              Fill in your details below. Admin will review and approve your application.
            </Text>
          </View>
        </View>

        {/* Personal Details */}
        <Text style={[font, s.sectionTitle]}>👤 Personal Details</Text>

        <Text style={[font, s.label]}>Full Name *</Text>
        <View style={s.inputWrap}>
          <User color="#9CA3AF" size={18} />
          <TextInput style={[font, s.input]} value={name} onChangeText={setName} placeholder="Your full name" placeholderTextColor="#9CA3AF" />
        </View>

        <Text style={[font, s.label]}>Mobile Number *</Text>
        <View style={s.inputWrap}>
          <Phone color="#9CA3AF" size={18} />
          <TextInput style={[font, s.input]} value={mobile} onChangeText={setMobile} placeholder="9876543210" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />
        </View>

        <Text style={[font, s.label]}>Email ID *</Text>
        <View style={s.inputWrap}>
          <Mail color="#9CA3AF" size={18} />
          <TextInput style={[font, s.input]} value={email} onChangeText={setEmail} placeholder="you@email.com" placeholderTextColor="#9CA3AF" keyboardType="email-address" autoCapitalize="none" />
        </View>

        {/* Bank Details */}
        <Text style={[font, s.sectionTitle, { marginTop: 24 }]}>🏦 Bank Details</Text>

        <Text style={[font, s.label]}>Bank Name *</Text>
        <View style={s.inputWrap}>
          <Building2 color="#9CA3AF" size={18} />
          <TextInput style={[font, s.input]} value={bankName} onChangeText={setBankName} placeholder="e.g. Indian Bank" placeholderTextColor="#9CA3AF" />
        </View>

        <Text style={[font, s.label]}>Account Number *</Text>
        <View style={s.inputWrap}>
          <CreditCard color="#9CA3AF" size={18} />
          <TextInput style={[font, s.input]} value={accountNumber} onChangeText={setAccountNumber} placeholder="Account number" placeholderTextColor="#9CA3AF" keyboardType="numeric" />
        </View>

        <Text style={[font, s.label]}>IFSC Code *</Text>
        <View style={s.inputWrap}>
          <Hash color="#9CA3AF" size={18} />
          <TextInput style={[font, s.input]} value={ifsc} onChangeText={setIfsc} placeholder="e.g. IDIB0001234" placeholderTextColor="#9CA3AF" autoCapitalize="characters" />
        </View>

        {/* Shop Details */}
        <Text style={[font, s.sectionTitle, { marginTop: 24 }]}>🏪 Shop Details</Text>

        <Text style={[font, s.label]}>Shop Name *</Text>
        <View style={s.inputWrap}>
          <Store color="#9CA3AF" size={18} />
          <TextInput style={[font, s.input]} value={shopName} onChangeText={setShopName} placeholder="e.g. Ravi Vegetables" placeholderTextColor="#9CA3AF" />
        </View>

        <Text style={[font, s.label]}>Shop Address *</Text>
        <View style={s.inputWrap}>
          <MapPin color="#9CA3AF" size={18} />
          <TextInput style={[font, s.input, { height: 70, textAlignVertical: 'top' }]} value={shopAddress} onChangeText={setShopAddress} placeholder="Full shop address..." placeholderTextColor="#9CA3AF" multiline />
        </View>

        {/* Submit */}
        <TouchableOpacity style={[s.submitBtn, saving && { opacity: 0.6 }]} onPress={handleSubmit} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Send color="#FFF" size={20} />
              <Text style={[font, s.submitText]}>Submit Application</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    backgroundColor: '#145A32',
    paddingTop: 54,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#D4A843', fontSize: 22, fontWeight: '900' },
  scrollBody: { paddingHorizontal: 20, paddingTop: 24 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#145A32',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#145A32',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#145A32', marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6, marginTop: 12 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  input: { flex: 1, paddingVertical: 14, paddingHorizontal: 12, fontSize: 15, color: '#111827' },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4A843',
    paddingVertical: 18,
    borderRadius: 16,
    marginTop: 32,
    gap: 10,
    shadowColor: '#D4A843',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  submitText: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  // Status screen
  statusContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  statusCard: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 2,
  },
  statusPending: { borderColor: '#F59E0B' },
  statusRejected: { borderColor: '#EF4444' },
  statusTitle: { fontSize: 24, fontWeight: '900', color: '#111827', marginBottom: 8 },
  statusDesc: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  statusBadge: {
    marginTop: 20,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statusBadgeText: { color: '#D97706', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  shopInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  reapplyBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 24,
  },
});
