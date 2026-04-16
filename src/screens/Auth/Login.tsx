import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, Platform, StyleSheet, Image, Dimensions, Modal, ScrollView
} from 'react-native';
import { signInWithGoogle, loginUser } from '../../services/auth';
import { Mail, Lock, Eye, EyeOff, Phone, X } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

const font = {
  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
};

export default function Login({ navigation }: any) {
  const [googleLoading, setGoogleLoading] = useState(false);
  
  // Manual Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      Alert.alert('Google Sign-In Failed', e.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleManualLogin = async () => {
    if (!email || !password) {
      Alert.alert('Validation Error', 'Please enter email and password.');
      return;
    }
    setLoginLoading(true);
    try {
      await loginUser(email, password);
    } catch (e: any) {
      Alert.alert('Login Failed', e.message);
    } finally {
      setLoginLoading(false);
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

      {/* App Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../../../assets/images/logo.jpg')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Login Card */}
      <View style={styles.card}>
        <Text style={[font, styles.heading]}>Welcome to AgriMore</Text>
        <Text style={[font, styles.subheading]}>Fresh groceries delivered to your door</Text>

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

        {/* Password Input */}
        <View style={styles.inputRow}>
          <Lock color="#9CA3AF" size={20} />
          <TextInput
            placeholder="Password"
            placeholderTextColor="#9CA3AF"
            style={[font, styles.input]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPwd}
          />
          <TouchableOpacity onPress={() => setShowPwd(!showPwd)}>
            {showPwd ? <EyeOff color="#9CA3AF" size={20} /> : <Eye color="#9CA3AF" size={20} />}
          </TouchableOpacity>
        </View>

        {/* Forgot Password Link */}
        <TouchableOpacity style={{ alignSelf: 'flex-end', marginBottom: 20 }} onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={[font, { color: '#D4A843', fontSize: 13, fontWeight: '700' }]}>Forgot Password?</Text>
        </TouchableOpacity>

        {/* Manual Login Btn */}
        <TouchableOpacity style={styles.loginBtn} onPress={handleManualLogin} disabled={loginLoading}>
          {loginLoading ? <ActivityIndicator color="#145A32" /> : <Text style={[font, styles.loginBtnText]}>Login</Text>}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.divLine} />
          <Text style={[font, styles.divText]}>OR</Text>
          <View style={styles.divLine} />
        </View>

        {/* Google Login Btn */}
        <TouchableOpacity 
          style={styles.googleBtn} 
          onPress={handleGoogleLogin} 
          disabled={googleLoading}
        >
          {googleLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <View style={styles.gLogoWrap}>
                <Text style={styles.googleG}>G</Text>
              </View>
              <Text style={[font, styles.googleBtnText]}>Sign In with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Register Link */}
        <View style={{ flexDirection: 'row', marginTop: 10 }}>
          <Text style={[font, { color: '#D1D5DB' }]}>New here? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={[font, { color: '#D4A843', fontWeight: 'bold' }]}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: height * 0.05,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 13, 16, 0.75)',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
    zIndex: 10,
  },
  logo: {
    width: 140,
    height: 140,
    resizeMode: 'contain',
    borderRadius: 70,
    borderWidth: 2,
    borderColor: 'rgba(212, 168, 67, 0.8)',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
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
    textAlign: 'center' 
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  input: { flex: 1, marginLeft: 12, color: '#FFF', fontSize: 15 },
  loginBtn: {
    backgroundColor: '#D4A843',
    width: '100%',
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnText: { color: '#145A32', fontSize: 16, fontWeight: '900' },
  divider: { flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: 20 },
  divLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  divText: { color: '#9CA3AF', marginHorizontal: 10, fontSize: 12, fontWeight: '700' },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    height: 54,
    width: '100%',
    marginBottom: 16,
  },
  gLogoWrap: {
    backgroundColor: '#FFF',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  googleG: { fontSize: 18, fontWeight: '900', color: '#4285F4' },
  googleBtnText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalBody: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
  },
  modalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalInput: { flex: 1, marginLeft: 12, color: '#1F2937', fontSize: 15 },
  resetBtn: {
    backgroundColor: '#145A32',
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  }
});
