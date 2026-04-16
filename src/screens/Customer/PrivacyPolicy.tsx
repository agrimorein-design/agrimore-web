import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';

export default function PrivacyPolicy() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Effective Date: {new Date().toLocaleDateString()}</Text>

        <Text style={styles.heading}>1. Introduction</Text>
        <Text style={styles.paragraph}>
          Welcome to Agrimore. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you about how we look after your personal data when you use our Android Application and Website (https://www.agrimore.in) and tell you about your privacy rights.
        </Text>

        <Text style={styles.heading}>2. The Data We Collect About You</Text>
        <Text style={styles.paragraph}>
          When you use our Application or Website to purchase products, register an account, or contact us, we may collect the following data:{'\n'}
          • <Text style={styles.bold}>Identity Data:</Text> First name, last name.{'\n'}
          • <Text style={styles.bold}>Contact Data:</Text> Delivery address, email address, and telephone numbers.{'\n'}
          • <Text style={styles.bold}>Financial Data:</Text> Payment card details (securely processed by our payment gateway providers).{'\n'}
          • <Text style={styles.bold}>Transaction Data:</Text> Details about payments to and from you and other details of products you have purchased from us.
        </Text>

        <Text style={styles.heading}>3. How We Use Your Data</Text>
        <Text style={styles.paragraph}>
          We will only use your personal data for the following purposes:{'\n'}
          • To register you as a new customer.{'\n'}
          • To process and deliver your order, manage payments, and collect money owed to us.{'\n'}
          • To manage our relationship with you.{'\n'}
          • To enable securely sign-in using third-party services like Google Authentication.
        </Text>

        <Text style={styles.heading}>4. WebView and App Permissions</Text>
        <Text style={styles.paragraph}>
          Our Android Application acts as a WebView to access our website (https://www.agrimore.in). The app requires the "Internet" permission to load this content. We do not access your device's camera, microphone, or gallery unless explicitly allowed and required for a specific feature.
        </Text>

        <Text style={styles.heading}>5. Data Security</Text>
        <Text style={styles.paragraph}>
          We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way, altered, or disclosed. User data (like passwords) are securely handled and encrypted via Firebase.
        </Text>

        <Text style={styles.heading}>6. Data Retention and Deletion</Text>
        <Text style={styles.paragraph}>
          We will only retain your personal data for as long as reasonably necessary to fulfill the purposes we collected it for. If you wish to delete your account and associated data, you can contact us directly or use the account deletion option within the app/website.
        </Text>

        <Text style={styles.heading}>7. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have any questions about this privacy policy or our privacy practices, please contact us at:{'\n'}
          • <Text style={styles.bold}>Email:</Text> agrimorein@gmail.com{'\n'}
          • <Text style={styles.bold}>Phone:</Text> +91 7094826586{'\n'}
          • <Text style={styles.bold}>Website:</Text> https://www.agrimore.in
        </Text>

        <View style={{height: 40}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  content: {
    padding: 20,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  heading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0D9488',
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    color: '#333',
    marginBottom: 16,
  },
  bold: {
    fontWeight: 'bold',
    color: '#000',
  }
});
