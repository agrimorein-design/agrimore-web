import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, KeyboardAvoidingView, Image, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { Phone, CheckCircle2 } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const font = { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' };

export default function MobileSetup() {
  const { user, refreshUserData } = useAuth();
  const [mobile, setMobile] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSaveMobile = async () => {
    if (mobile.length !== 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    
    setLoading(true);
    try {
      if (user?.uid) {
        let appliedRef = null;
        if (referralCode.trim()) {
           // Basic validation, backend evaluates exactly to whom it belongs via query later
           appliedRef = referralCode.trim().toUpperCase();
        }

        await updateDoc(doc(db, 'users', user.uid), {
          phone: '+91' + mobile,
          appliedReferralCode: appliedRef,
          isReferralRewarded: false
        });
        await refreshUserData();
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.root}>
      {/* Background Graphic */}
      <View style={s.bgGraphic}>
        <View style={s.circle1} />
        <View style={s.circle2} />
      </View>

      <View style={s.content}>
        <View style={s.header}>
          <Text style={[font, s.title]}>Secure Your Account</Text>
          <Text style={[font, s.subtitle]}>We need your mobile number to ensure safe delivery and important updates.</Text>
        </View>

        <View style={s.inputContainer}>
          <Text style={[font, s.label]}>Mobile Number</Text>
          <View style={s.inputWrapper}>
            <View style={s.countryCode}>
              <Text style={[font, s.countryText]}>+91</Text>
            </View>
            <View style={s.divider} />
            <TextInput
              style={[font, s.input]}
              placeholder="e.g. 9876543210"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={10}
              value={mobile}
              onChangeText={setMobile}
              autoFocus
            />
            {mobile.length === 10 && <CheckCircle2 color="#16A34A" size={20} style={{ marginRight: 16 }} />}
          </View>
        </View>

        <View style={s.inputContainer}>
          <Text style={[font, s.label]}>Referral Code (Optional)</Text>
          <View style={[s.inputWrapper, { height: 50 }]}>
            <TextInput
              style={[font, s.input]}
              placeholder="e.g. AGRI12AB"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
              value={referralCode}
              onChangeText={setReferralCode}
            />
          </View>
        </View>

        <TouchableOpacity 
          style={[s.btn, mobile.length === 10 && s.btnActive]} 
          onPress={handleSaveMobile}
          disabled={mobile.length !== 10 || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={[font, s.btnText, mobile.length === 10 && s.btnTextActive]}>Continue to Map Setup</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  bgGraphic: { position: 'absolute', top: 0, left: 0, right: 0, height: 350, overflow: 'hidden', backgroundColor: '#145A32', borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  circle1: { position: 'absolute', top: -100, right: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,255,255,0.05)' },
  circle2: { position: 'absolute', top: 50, left: -100, width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(212,168,67,0.1)' },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  header: { marginBottom: 40, alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '900', color: '#FFF', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#D1D5DB', textAlign: 'center', lineHeight: 24, paddingHorizontal: 10 },
  inputContainer: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, marginBottom: 30 },
  label: { fontSize: 14, fontWeight: '800', color: '#4B5563', marginBottom: 12 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 16, borderWidth: 2, borderColor: '#E5E7EB', height: 60, overflow: 'hidden' },
  countryCode: { paddingHorizontal: 16, justifyContent: 'center' },
  countryText: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  divider: { width: 2, height: 30, backgroundColor: '#E5E7EB' },
  input: { flex: 1, fontSize: 18, fontWeight: '800', color: '#111827', paddingHorizontal: 16, height: '100%' },
  btn: { backgroundColor: '#E5E7EB', paddingVertical: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  btnActive: { backgroundColor: '#145A32', shadowColor: '#145A32', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  btnText: { fontSize: 18, fontWeight: '900', color: '#9CA3AF' },
  btnTextActive: { color: '#D4A843' }
});
