import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, Platform, StyleSheet, ScrollView, Image
} from 'react-native';
import { Lock, Eye, EyeOff, Hash, ArrowLeft } from 'lucide-react-native';
import { confirmPasswordReset } from 'firebase/auth';
import { auth } from '../../firebase/config';

const font = {
  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
};

export default function ResetPassword({ navigation }: any) {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!code || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      // confirmPasswordReset uses the oobCode from the email link
      // But since we are letting the user enter it, we pass the manually entered code here.
      // (This requires the user to copy-paste the URL parameter code from the email)
      await confirmPasswordReset(auth, code, password);
      Alert.alert('Success', 'Your password has been updated!');
      navigation.navigate('Login'); // Next Page
    } catch (e: any) {
       Alert.alert('Reset Failed', e.message + '\nNote: The reset code is the "oobCode" found in the link sent to your email.');
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
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Login')}>
        <ArrowLeft color="#FFF" size={24} />
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={[font, styles.heading]}>Reset Password</Text>
        <Text style={[font, styles.subheading]}>Enter the reset code sent to your email and your new password.</Text>

        {/* Reset Code */}
        <View style={styles.inputRow}>
          <Hash color="#9CA3AF" size={20} />
          <TextInput
            placeholder="Reset Code (from email link)"
            placeholderTextColor="#9CA3AF"
            style={[font, styles.input]}
            value={code}
            onChangeText={setCode}
            autoCapitalize="none"
          />
        </View>

        {/* New Password */}
        <View style={styles.inputRow}>
          <Lock color="#9CA3AF" size={20} />
          <TextInput
            placeholder="New Password"
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

        {/* Confirm Password */}
        <View style={styles.inputRow}>
          <Lock color="#9CA3AF" size={20} />
          <TextInput
            placeholder="Confirm Password"
            placeholderTextColor="#9CA3AF"
            style={[font, styles.input]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPwd}
          />
          <TouchableOpacity onPress={() => setShowConfirmPwd(!showConfirmPwd)}>
            {showConfirmPwd ? <EyeOff color="#9CA3AF" size={20} /> : <Eye color="#9CA3AF" size={20} />}
          </TouchableOpacity>
        </View>

        {/* Submit Btn */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleResetPassword} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#145A32" />
          ) : (
             <Text style={[font, styles.submitBtnText]}>Reset Password</Text>
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
    marginBottom: 16,
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
    marginTop: 10,
  },
  submitBtnText: { color: '#145A32', fontSize: 16, fontWeight: '900' },
});
