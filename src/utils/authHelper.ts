import { Alert, Platform } from 'react-native';

export const requireAuth = (user: any, navigation: any, onAuthSuccess?: () => void) => {
  if (!user) {
    if (Platform.OS === 'web') {
      const confirmLogin = window.confirm('Please login to continue');
      if (confirmLogin) {
        navigation.navigate('Login');
      }
    } else {
      Alert.alert(
        'Login Required',
        'Please login to continue',
        [
          { text: 'Cancel', style: 'cancel' },
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
