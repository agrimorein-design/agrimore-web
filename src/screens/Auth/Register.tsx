import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, Platform, StyleSheet, ScrollView, Image
} from 'react-native';
import { registerUser } from '../../services/auth';
import { Mail, Lock, Eye, EyeOff, User, Phone, ArrowRight } from 'lucide-react-native';

const font = {
  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  fontStyle: 'italic' as const,
};

export default function Register({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) { 
      Alert.alert('Error', 'Please fill all fields'); 
      return; 
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await registerUser(email, password, '', '');
      Alert.alert('Success', 'Account created successfully!');
    } catch (e: any) {
      Alert.alert('Registration Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.root} showsVerticalScrollIndicator={false}>
      {/* Premium Header Banner */}
      <View style={styles.banner}>
        <View style={styles.darkOverlay} />
        <Image 
          source={require('../../../assets/images/logo.jpg')}
          style={styles.logoImage}
        />
        <Text style={[font, styles.tagline]}>Join Premium Groceries</Text>
      </View>

      {/* Card */}
      <View style={styles.card}>
        <Text style={[font, styles.heading]}>Create Account</Text>
        <Text style={[font, styles.subheading]}>Sign up for exclusive deliveries</Text>

        {/* Email */}
        <View style={styles.inputRow}>
          <Mail color="#D4A843" size={20} />
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

        {/* Password */}
        <View style={styles.inputRow}>
          <Lock color="#D4A843" size={20} />
          <TextInput
            placeholder="Password"
            placeholderTextColor="#9CA3AF"
            style={[font, styles.input]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPwd}
          />
          <TouchableOpacity onPress={() => setShowPwd(!showPwd)}>
            {showPwd ? <EyeOff color="#9CA3AF" size={20} /> : <Eye color="#D4A843" size={20} />}
          </TouchableOpacity>
        </View>

        {/* Confirm Password */}
        <View style={[styles.inputRow, { marginBottom: 30 }]}>
          <Lock color="#D4A843" size={20} />
          <TextInput
            placeholder="Confirm Password"
            placeholderTextColor="#9CA3AF"
            style={[font, styles.input]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPwd}
          />
          <TouchableOpacity onPress={() => setShowConfirmPwd(!showConfirmPwd)}>
            {showConfirmPwd ? <EyeOff color="#9CA3AF" size={20} /> : <Eye color="#D4A843" size={20} />}
          </TouchableOpacity>
        </View>

        {/* Register Button */}
        <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#145A32" />
          ) : (
            <>
              <Text style={[font, styles.registerBtnText]}>Sign Up</Text>
              <View style={styles.arrowCircle}>
                <ArrowRight color="#145A32" size={20} />
              </View>
            </>
          )}
        </TouchableOpacity>

        {/* Login Link */}
        <View style={styles.linkRow}>
          <Text style={[font, styles.linkText]}>Already a member? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={[font, styles.linkAction]}>Login</Text>
          </TouchableOpacity>
        </View>
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
  logoImage: {
    width: 200,
    height: 60,
    resizeMode: 'contain',
    zIndex: 1,
  },
  tagline: {
    fontSize: 16,
    color: '#FFF',
    marginTop: 8,
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
  heading: { fontSize: 32, fontWeight: '900', color: '#145A32', marginBottom: 4 },
  subheading: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  input: { flex: 1, marginLeft: 12, color: '#1F2937', fontSize: 16 },
  registerBtn: {
    backgroundColor: '#D4A843', // Gold button
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#D4A843',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 24,
  },
  registerBtnText: { color: '#145A32', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
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
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  linkText: { color: '#6B7280', fontSize: 16 },
  linkAction: { color: '#145A32', fontSize: 16, fontWeight: '900', borderBottomWidth: 1, borderBottomColor: '#145A32' },
});
