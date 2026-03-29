import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, Platform, StyleSheet, ScrollView, Image
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { completeUserProfile } from '../../services/auth';
import { User, Phone, MapPin, ArrowRight, Sparkles } from 'lucide-react-native';

const font = {
  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  fontStyle: 'italic' as const,
};

export default function Onboarding() {
  const { user, userData, refreshUserData } = useAuth();
  const [name, setName] = useState(userData?.name || user?.displayName || '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (!name || !phone || !address) {
      Alert.alert('Error', 'Please fill all fields to continue');
      return;
    }
    if (!user) return;

    setLoading(true);
    try {
      await completeUserProfile(user.uid, name, phone, address, null);
      await refreshUserData();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.root} showsVerticalScrollIndicator={false}>
      {/* Premium Header Banner */}
      <View style={styles.banner}>
        <View style={styles.darkOverlay} />
        <Sparkles color="#D4A843" size={40} style={{ zIndex: 1, marginBottom: 12 }} />
        <Text style={[font, styles.brandName]}>Welcome to Agrimore</Text>
        <Text style={[font, styles.tagline]}>Complete your premium profile</Text>
      </View>

      {/* Card */}
      <View style={styles.card}>
        <Text style={[font, styles.heading]}>Your Details</Text>
        <Text style={[font, styles.subheading]}>
          Welcome {user?.displayName || 'there'}! We need a few more details.
        </Text>

        {/* Name */}
        <View style={styles.inputRow}>
          <User color="#D4A843" size={20} />
          <TextInput
            placeholder="Full Name"
            placeholderTextColor="#9CA3AF"
            style={[font, styles.input]}
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Phone */}
        <View style={styles.inputRow}>
          <Phone color="#D4A843" size={20} />
          <TextInput
            placeholder="Mobile Number"
            placeholderTextColor="#9CA3AF"
            style={[font, styles.input]}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        {/* Address */}
        <View style={[styles.inputRow, { alignItems: 'flex-start', paddingVertical: 16 }]}>
          <MapPin color="#D4A843" size={20} style={{ marginTop: 2 }} />
          <TextInput
            placeholder="Delivery Address (House No, Street, Area)"
            placeholderTextColor="#9CA3AF"
            style={[font, styles.input, { minHeight: 60 }]}
            value={address}
            onChangeText={setAddress}
            multiline
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleComplete} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#145A32" />
          ) : (
            <>
              <Text style={[font, styles.submitBtnText]}>Start Shopping</Text>
              <View style={styles.arrowCircle}>
                <ArrowRight color="#145A32" size={20} />
              </View>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  banner: {
    width: '100%',
    height: 300,
    backgroundColor: '#145A32',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    zIndex: 0,
    shadowColor: '#145A32',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#D4A843', // Gold
    letterSpacing: 1,
    zIndex: 1,
  },
  tagline: {
    fontSize: 15,
    color: '#FFF',
    marginTop: 6,
    opacity: 0.9,
    zIndex: 1,
  },
  card: {
    width: '90%',
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 30,
    marginTop: 220, // Overlaps the banner
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    zIndex: 2,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  heading: { fontSize: 30, fontWeight: '900', color: '#145A32', marginBottom: 4 },
  subheading: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  input: { flex: 1, marginLeft: 12, color: '#1F2937', fontSize: 16 },
  submitBtn: {
    backgroundColor: '#D4A843', // Gold button
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 12,
    shadowColor: '#D4A843',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  submitBtnText: { color: '#145A32', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  arrowCircle: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
