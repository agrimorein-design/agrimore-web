import React, { useEffect } from 'react';
import { BackHandler, Alert, Platform } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

import Splash from '../screens/Customer/Splash';
import Login from '../screens/Auth/Login';
import Register from '../screens/Auth/Register';
import ForgotPassword from '../screens/Auth/ForgotPassword';
import ResetPassword from '../screens/Auth/ResetPassword';
import AddressSetup from '../screens/Customer/AddressSetup';
import CustomerTabs from './CustomerTabs';
import Checkout from '../screens/Customer/Checkout';
import ProductDetails from '../screens/Customer/ProductDetails';

// New Customer Screens
import MobileSetup from '../screens/Customer/MobileSetup';
import SearchScreen from '../screens/Customer/Search';
import OrderTracking from '../screens/Customer/OrderTracking';
import RateOrder from '../screens/Customer/RateOrder';
import Addresses from '../screens/Customer/Addresses';
import Offers from '../screens/Customer/Offers';
import FlashSale from '../screens/Customer/FlashSale';
import WalletScreen from '../screens/Customer/Wallet';
import Wishlist from '../screens/Customer/Wishlist';
import Referral from '../screens/Customer/Referral';
import Notifications from '../screens/Customer/Notifications';
import Language from '../screens/Customer/Language';
import Support from '../screens/Customer/Support';
import Orders from '../screens/Customer/Orders';
import SubscriptionSetup from '../screens/Customer/SubscriptionSetup';
import MySubscriptions from '../screens/Customer/MySubscriptions';
import Rewards from '../screens/Customer/Rewards';

import PrivacyPolicy from '../screens/Customer/PrivacyPolicy';

// Admin
import AdminPanel from '../screens/Admin/AdminPanel';
import AdminMap from '../screens/Admin/AdminMap';
import AdminDeliveryRoute from '../screens/Admin/AdminDeliveryRoute';

// Seller
import SellerPanel from '../screens/Seller/SellerPanel';
import SellerApply from '../screens/Seller/SellerApply';

const Stack = createNativeStackNavigator();

export default function MainNavigator() {
  const { user, userData, loading } = useAuth();
  const navigationRef = useNavigationContainerRef();

  // GLOBAL BACK BUTTON LOGIC
  useEffect(() => {
    const handleSystemBack = () => {
      if (!navigationRef.isReady()) return false;
      
      const currentRoute = navigationRef.getCurrentRoute();
      if (!currentRoute) return false;
      
      // Allow default logic for Auth forms / Admin / Seller / Initial setup
      const skipGlobalBack = ['Login', 'AddressSetup', 'AdminPanel', 'SellerPanel', 'Splash'].includes(currentRoute.name);
      if (skipGlobalBack) return false;
      
      // If we are directly on the main Customer HomeTab
      if (currentRoute.name === 'HomeTab') {
        if (Platform.OS === 'web') {
          const confirmExit = window.confirm('Do you want to exit the app?');
          if (confirmExit) {
            window.close();
          } else {
            window.history.pushState(null, '', window.location.href);
          }
        } else {
          Alert.alert(
            'Exit App',
            'Do you want to exit the app?',
            [
              { text: 'Cancel', onPress: () => null, style: 'cancel' },
              { text: 'OK', onPress: () => BackHandler.exitApp() }
            ],
            { cancelable: true }
          );
        }
        return true;
      }

      // If on ANY other nested page -> Force route to HomeTab
      (navigationRef as any).navigate('Customer', { screen: 'HomeTab' });
      
      if (Platform.OS === 'web') {
        window.history.pushState(null, '', window.location.href);
      }
      return true;
    };

    if (Platform.OS === 'web') {
      window.history.pushState(null, '', window.location.href);
      window.onpopstate = () => {
        handleSystemBack();
      };
    }

    const backHandlerSubscription = BackHandler.addEventListener('hardwareBackPress', handleSystemBack);

    return () => {
      backHandlerSubscription.remove();
      if (Platform.OS === 'web') window.onpopstate = null;
    };
  }, [navigationRef]);

  if (loading) {
    return <Splash />;
  }

  const linking = {
    prefixes: ['https://www.agrimore.in', 'agrimore://'],
    config: {
      screens: {
        PrivacyPolicy: 'privacy-policy',
        Customer: '', // Fallback for other routes
      },
    },
  };

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Customer" component={CustomerTabs} />
            <Stack.Screen name="ProductDetails" component={ProductDetails} />
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="Register" component={Register} />
            <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
            <Stack.Screen name="ResetPassword" component={ResetPassword} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
          </>
        ) : userData?.role === 'admin' ? (
          <>
            <Stack.Screen name="AdminPanel" component={AdminPanel} />
            <Stack.Screen name="AdminMap" component={AdminMap} />
            <Stack.Screen name="AdminDeliveryRoute" component={AdminDeliveryRoute} />
            <Stack.Screen name="Customer" component={CustomerTabs} />
            <Stack.Screen name="Orders" component={Orders} />
            <Stack.Screen name="Checkout" component={Checkout} />
            <Stack.Screen name="AddressSetup" component={AddressSetup} />
            <Stack.Screen name="ProductDetails" component={ProductDetails} />
            <Stack.Screen name="SubscriptionSetup" component={SubscriptionSetup} />
            <Stack.Screen name="MySubscriptions" component={MySubscriptions} />
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="OrderTracking" component={OrderTracking} />
            <Stack.Screen name="RateOrder" component={RateOrder} />
            <Stack.Screen name="Addresses" component={Addresses} />
            <Stack.Screen name="Offers" component={Offers} />
            <Stack.Screen name="FlashSale" component={FlashSale} />
            <Stack.Screen name="Wallet" component={WalletScreen} />
            <Stack.Screen name="Wishlist" component={Wishlist} />
            <Stack.Screen name="Referral" component={Referral} />
            <Stack.Screen name="Rewards" component={Rewards} />
            <Stack.Screen name="Notifications" component={Notifications} />
            <Stack.Screen name="Language" component={Language} />
            <Stack.Screen name="Support" component={Support} />
            <Stack.Screen name="SellerApply" component={SellerApply} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
          </>
        ) : userData?.role === 'seller' ? (
          <>
            <Stack.Screen name="SellerPanel" component={SellerPanel} />
            <Stack.Screen name="Customer" component={CustomerTabs} />
            <Stack.Screen name="Orders" component={Orders} />
            <Stack.Screen name="Checkout" component={Checkout} />
            <Stack.Screen name="AddressSetup" component={AddressSetup} />
            <Stack.Screen name="ProductDetails" component={ProductDetails} />
            <Stack.Screen name="SubscriptionSetup" component={SubscriptionSetup} />
            <Stack.Screen name="MySubscriptions" component={MySubscriptions} />
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="OrderTracking" component={OrderTracking} />
            <Stack.Screen name="RateOrder" component={RateOrder} />
            <Stack.Screen name="Addresses" component={Addresses} />
            <Stack.Screen name="Offers" component={Offers} />
            <Stack.Screen name="FlashSale" component={FlashSale} />
            <Stack.Screen name="Wallet" component={WalletScreen} />
            <Stack.Screen name="Wishlist" component={Wishlist} />
            <Stack.Screen name="Referral" component={Referral} />
            <Stack.Screen name="Rewards" component={Rewards} />
            <Stack.Screen name="Notifications" component={Notifications} />
            <Stack.Screen name="Language" component={Language} />
            <Stack.Screen name="Support" component={Support} />
            <Stack.Screen name="SellerApply" component={SellerApply} />
            <Stack.Screen name="AdminPanel" component={AdminPanel} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
          </>
        ) : !userData?.phone ? (
          <Stack.Screen name="MobileSetup" component={MobileSetup} />
        ) : !userData?.defaultAddress ? (
          <Stack.Screen name="AddressSetup" component={AddressSetup} />
        ) : (
          <>
            <Stack.Screen name="Customer" component={CustomerTabs} />
            <Stack.Screen name="Orders" component={Orders} />
            <Stack.Screen name="Checkout" component={Checkout} />
            <Stack.Screen name="AddressSetup" component={AddressSetup} />
            <Stack.Screen name="ProductDetails" component={ProductDetails} />
            <Stack.Screen name="SubscriptionSetup" component={SubscriptionSetup} />
            <Stack.Screen name="MySubscriptions" component={MySubscriptions} />
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="OrderTracking" component={OrderTracking} />
            <Stack.Screen name="RateOrder" component={RateOrder} />
            <Stack.Screen name="Addresses" component={Addresses} />
            <Stack.Screen name="Offers" component={Offers} />
            <Stack.Screen name="FlashSale" component={FlashSale} />
            <Stack.Screen name="Wallet" component={WalletScreen} />
            <Stack.Screen name="Wishlist" component={Wishlist} />
            <Stack.Screen name="Referral" component={Referral} />
            <Stack.Screen name="Rewards" component={Rewards} />
            <Stack.Screen name="Notifications" component={Notifications} />
            <Stack.Screen name="Language" component={Language} />
            <Stack.Screen name="Support" component={Support} />
            <Stack.Screen name="SellerApply" component={SellerApply} />
            <Stack.Screen name="AdminPanel" component={AdminPanel} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
