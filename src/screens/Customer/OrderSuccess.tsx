import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated, BackHandler } from 'react-native';
import { CheckCircle, Truck, Package, ArrowRight, ChevronRight, Share2 } from 'lucide-react-native';

const font = {
  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  fontStyle: 'italic' as const,
};

export default function OrderSuccess({ navigation, route }: any) {
  const { orderId } = route.params || { orderId: 'UNKNOWN' };
  
  const scaleValue = new Animated.Value(0);
  const opacityValue = new Animated.Value(0);

  useEffect(() => {
    // Premium entry animation
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 1.1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleValue, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(opacityValue, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Disable system back button to prevent going back to checkout
    const backAction = () => {
      navigation.reset({ index: 0, routes: [{ name: 'Customer' }] });
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  return (
    <View style={s.root}>
      <View style={s.backgroundWrap}>
        <View style={s.circle1} />
        <View style={s.circle2} />
      </View>

      <View style={s.content}>
        <Animated.View style={[s.iconWrap, { transform: [{ scale: scaleValue }] }]}>
          <View style={s.iconInner}>
            <CheckCircle color="#D4A843" size={60} strokeWidth={2.5} />
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: opacityValue, alignItems: 'center' }}>
          <Text style={[font, s.title]}>Order Placed!</Text>
          <Text style={[font, s.subtitle]}>Your organic goodness is on its way.</Text>

          <View style={s.orderCard}>
            <View style={s.orderHeader}>
              <Package color="#145A32" size={18} />
              <Text style={[font, s.orderIdLabel]}>ORDER ID</Text>
            </View>
            <Text style={[font, s.orderId]}>#{orderId.toUpperCase()}</Text>
          </View>
        </Animated.View>
      </View>

      <Animated.View style={[s.footer, { opacity: opacityValue }]}>
        <TouchableOpacity 
          style={s.trackBtn}
          onPress={() => navigation.navigate('OrderTracking', { orderId })}
          activeOpacity={0.8}
        >
          <Truck color="#FFF" size={20} />
          <Text style={[font, s.trackBtnText]}>Track My Order</Text>
          <ArrowRight color="#FFF" size={20} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={s.homeBtn}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Customer' }] })}
          activeOpacity={0.8}
        >
          <Text style={[font, s.homeBtnText]}>Continue Shopping</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB', justifyContent: 'center' },
  backgroundWrap: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  circle1: { position: 'absolute', top: -100, left: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(20,90,50,0.05)' },
  circle2: { position: 'absolute', bottom: -50, right: -100, width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(212,168,67,0.08)' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  iconWrap: {
    width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(212,168,67,0.15)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 30,
  },
  iconInner: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: '#145A32',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#145A32', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  title: { fontSize: 32, fontWeight: '900', color: '#145A32', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 40, lineHeight: 24 },
  orderCard: {
    backgroundColor: '#FFF', borderRadius: 20, paddingVertical: 20, paddingHorizontal: 30,
    alignItems: 'center', width: '100%',
    borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 5,
  },
  orderHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  orderIdLabel: { fontSize: 13, fontWeight: '700', color: '#6B7280', marginLeft: 8, letterSpacing: 1 },
  orderId: { fontSize: 20, fontWeight: '900', color: '#1F2937', letterSpacing: 2 },
  footer: { paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, width: '100%' },
  trackBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    backgroundColor: '#D4A843', paddingVertical: 18, borderRadius: 16, marginBottom: 16,
    shadowColor: '#D4A843', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  trackBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  homeBtn: {
    paddingVertical: 18, borderRadius: 16, alignItems: 'center',
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB',
  },
  homeBtnText: { color: '#145A32', fontSize: 16, fontWeight: 'bold' },
});
