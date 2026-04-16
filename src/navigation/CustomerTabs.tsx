import React from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home as HomeIcon, Store, LayoutGrid, ShoppingCart, User } from 'lucide-react-native';

import Home from '../screens/Customer/Home';
import Cart from '../screens/Customer/Cart';
import Orders from '../screens/Customer/Orders';
import Profile from '../screens/Customer/Profile';
import Shop from '../screens/Customer/Shop';
import Category from '../screens/Customer/Category';

const Tab = createBottomTabNavigator();

import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function CustomerTabs({ navigation }: any) {
  const { cart } = useCart();
  const { user } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#D4A843', // Gold
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: {
          fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
          fontStyle: 'italic',
          fontSize: 11,
          fontWeight: '900',
          marginTop: -4,
          marginBottom: 6,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={Home}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={size} />,
        }}
      />

      <Tab.Screen
        name="Shop"
        component={Shop}
        options={{
          tabBarLabel: 'Shop',
          tabBarIcon: ({ color, size }) => <Store color={color} size={size} />,
        }}
      />

      <Tab.Screen
        name="Category"
        component={Category}
        options={{
          tabBarLabel: 'Menu',
          tabBarIcon: ({ focused }) => (
            <View style={{
              width: 48, height: 48, borderRadius: 24,
              backgroundColor: '#D4A843', justifyContent: 'center', alignItems: 'center',
              marginTop: -8, borderWidth: 3, borderColor: '#FFF',
              shadowColor: '#D4A843', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4
            }}>
              <LayoutGrid color={focused ? '#145A32' : '#FFFFFF'} size={24} />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="CartTab"
        component={Cart}
        listeners={{
          tabPress: e => {
            if (!user) {
              e.preventDefault();
              navigation.navigate('Login');
            }
          },
        }}
        options={{
          tabBarLabel: 'Cart',
          tabBarIcon: ({ color, size }) => <ShoppingCart color={color} size={size} />,
          tabBarBadge: cart.length > 0 ? cart.length : undefined,
          tabBarBadgeStyle: { backgroundColor: '#E11D48', color: '#FFF', fontSize: 10, fontWeight: 'bold' },
          tabBarStyle: { display: 'none' },
        }}
      />

      <Tab.Screen
        name="Profile"
        component={Profile}
        listeners={{
          tabPress: e => {
            if (!user) {
              e.preventDefault();
              navigation.navigate('Login');
            }
          },
        }}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopColor: 'transparent',
    height: 70,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
    paddingHorizontal: 10,
  },
  floatingButtonWrap: {
    top: -24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D4A843',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  floatingButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D4A843', // Gold
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  }
});
