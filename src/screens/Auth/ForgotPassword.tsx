import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, Platform, StyleSheet, ScrollView, Image
} from 'react-native';
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react-native';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase/config';

const font = {
  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
};

export default function ForgotPassword({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendResetEmail = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      // Navigate to Reset Password page passing the email
      navigation.navigate('ResetPassword', { email });
    } catch (e: any) {
       Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.root} showsVerticalScrollIndicator={false}>
      {/* Dynamic Background Image */}
      <Image 
        source={{ uri: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80' }} 
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      <View style={styles.darkOverlay} />
      
      {/* Header Back Button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <ArrowLeft color="#FFF" size={24} />
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={[font, styles.heading]}>Forgot Password?</Text>
        <Text style={[font, styles.subheading]}>Enter your registered email address to receive a reset code.</Text>

        {/* Email Input */}
        <View style={styles.inputRow}>
          <Mail color="#9CA3AF" size={20} />
          <TextInput
            placeholder="Email Address"
            placeholderTextColor="#9CA3AF"
            style={[font, styles.input]}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Submit Btn */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSendResetEmail} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#145A32" />
          ) : (
            <>
              <Text style={[font, styles.submitBtnText]}>Send Reset Link</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 13, 16, 0.75)',
  },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  card: {
    width: '90%',
    backgroundColor: 'rgba(20, 30, 40, 0.85)',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  heading: { 
    fontSize: 24, 
    fontWeight: '900', 
    color: '#FFF', 
    marginBottom: 6,
    textAlign: 'center' 
  },
  subheading: { 
    fontSize: 13, 
    color: '#D1D5DB', 
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  input: { flex: 1, marginLeft: 12, color: '#FFF', fontSize: 15 },
  submitBtn: {
    backgroundColor: '#D4A843',
    width: '100%',
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  submitBtnText: { color: '#145A32', fontSize: 16, fontWeight: '900', marginRight: 40 },
  arrowCircle: {
    position: 'absolute',
    right: 8,
    width: 38,
    height: 38,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
