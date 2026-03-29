import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing, Platform, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function Splash() {
  // Animation Values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Particles / Glow rings
  const ring1Scale = useRef(new Animated.Value(0.5)).current;
  const ring1Opacity = useRef(new Animated.Value(0)).current;
  
  const ring2Scale = useRef(new Animated.Value(0.5)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;

  // Slide up effect for the main container
  const translateY = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // 1. Initial Enter Animation (Fade in, scale up, slide up)
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    ]).start(() => {
      // 2. Start Continuous Pulse Effect on Logo
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // 3. Start Continuous Glowing Rings Effect
      const createRingAnimation = (scaleRef: Animated.Value, opacityRef: Animated.Value, delay: number) => {
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
              Animated.timing(scaleRef, {
                toValue: 1.5,
                duration: 3000,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.sequence([
                Animated.timing(opacityRef, {
                  toValue: 0.8,
                  duration: 500,
                  useNativeDriver: true,
                }),
                Animated.timing(opacityRef, {
                  toValue: 0,
                  duration: 2500,
                  useNativeDriver: true,
                }),
              ]),
            ]),
            // Reset state for next loop iteration
            Animated.timing(scaleRef, { toValue: 0.5, duration: 0, useNativeDriver: true })
          ])
        ).start();
      };

      createRingAnimation(ring1Scale, ring1Opacity, 0);
      createRingAnimation(ring2Scale, ring2Opacity, 1500); // Staggered by 1.5s
    });
  }, []);

  return (
    <View style={s.root}>
      {/* Subtle Background Gradient / Vignette effect could go here, for now solid premium dark */}
      
      <Animated.View style={[s.container, { 
        opacity: fadeAnim, 
        transform: [{ scale: scaleAnim }, { translateY }] 
      }]}>
        
        {/* Glowing Engine Behind Logo */}
        <Animated.View style={[s.glowRing, { 
          opacity: ring1Opacity, 
          transform: [{ scale: ring1Scale }] 
        }]} />
        
        <Animated.View style={[s.glowRing, { 
          opacity: ring2Opacity, 
          transform: [{ scale: ring2Scale }] 
        }]} />

        {/* The Main Logo */}
        <Animated.Image 
          source={require('../../../assets/app-logo.jpg')}
          style={[s.logo, { transform: [{ scale: pulseAnim }] }]} 
          resizeMode="contain" 
        />
        
        {/* We removed the Extra Text because your new Logo image already has "AgriMore" and the Tagline written beautifully inside it! */}
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { 
    flex: 1, 
    // Match the dark background of your new logo perfectly
    backgroundColor: '#0F1115', 
    alignItems: 'center', 
    justifyContent: 'center', 
    overflow: 'hidden' 
  },
  container: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    position: 'relative' 
  },
  logo: { 
    width: width * 0.75, // Responsive sizing (75% of screen width)
    height: width * 0.75, 
    maxWidth: 400,
    maxHeight: 400,
    zIndex: 10,
    // Add a very subtle drop shadow to make it pop
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 10
  },
  glowRing: {
    position: 'absolute',
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: (width * 0.6) / 2,
    borderWidth: 2,
    borderColor: 'rgba(22, 163, 74, 0.4)', // Vibrant AgriMore Green glow
    backgroundColor: 'rgba(212, 168, 67, 0.05)', // Subtle gold tint
    zIndex: 1,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20
  }
});
