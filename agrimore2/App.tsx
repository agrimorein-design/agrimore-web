/// <reference path="./app.d.ts" />
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { LocationProvider } from './src/context/LocationContext';
import MainNavigator from './src/navigation/MainNavigator';
import './src/firebase/makeAdmin';  // attaches makeAdmin() to window
// import './src/firebase/seed';       // attaches seedAgrimoreDB() to window

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LocationProvider>
          <CartProvider>
            <MainNavigator />
            <StatusBar style="auto" />
          </CartProvider>
        </LocationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
