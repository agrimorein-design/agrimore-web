import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity,
  Alert, ActivityIndicator, Platform, StyleSheet, Image, Dimensions
} from 'react-native';
import { signInWithGoogle } from '../../services/auth';

const { width, height } = Dimensions.get('window');

const font = {
  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
};

export default function Login() {
  const [googleLoading, setGoogleLoading] = useState(false);

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

  return (
    <View style={styles.root}>
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

        <Text style={[font, styles.footerText]}>
          By continuing, you agree to our Terms of Service & Privacy Policy.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: height * 0.1,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 13, 16, 0.65)',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: height * 0.05,
    zIndex: 10,
  },
  logo: {
    width: 220,
    height: 220,
    resizeMode: 'contain',
    borderRadius: 110,
    borderWidth: 3,
    borderColor: 'rgba(212, 168, 67, 0.8)',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  card: {
    width: '90%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heading: { 
    fontSize: 28, 
    fontWeight: '900', 
    color: '#FFF', 
    marginBottom: 8,
    textAlign: 'center' 
  },
  subheading: { 
    fontSize: 15, 
    color: '#D1D5DB', 
    marginBottom: 32,
    textAlign: 'center' 
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 20,
  },
  gLogoWrap: {
    backgroundColor: '#FFF',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  googleG: { 
    fontSize: 20, 
    fontWeight: '900', 
    color: '#4285F4' 
  },
  googleBtnText: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#FFF' 
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 18
  }
});
