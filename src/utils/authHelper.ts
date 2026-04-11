import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const requireAuth = (user: any, navigation: any, onAuthSuccess?: () => void, redirectScreen?: string) => {
  if (!user) {
    if (redirectScreen) {
      AsyncStorage.setItem('redirectAfterLogin', redirectScreen).catch(() => {});
    }
    if (Platform.OS === 'web') {
      const confirmLogin = window.confirm('Please login to continue');
      if (confirmLogin) {
        navigation.navigate('Login');
      } else if (redirectScreen) {
        AsyncStorage.removeItem('redirectAfterLogin').catch(() => {});
      }
    } else {
      Alert.alert(
        'Login Required',
        'Please login to continue',
        [
          { 
            text: 'Cancel', 
            style: 'cancel', 
            onPress: () => {
              if (redirectScreen) AsyncStorage.removeItem('redirectAfterLogin').catch(() => {});
            } 
          },
          { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]
      );
    }
    return false;
  }
  if (onAuthSuccess) {
    onAuthSuccess();
  }
  return true;
};
