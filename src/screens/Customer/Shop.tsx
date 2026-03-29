import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Platform, TextInput, Animated, Dimensions, Pressable } from 'react-native';
import { Search, Filter, ChevronLeft, ShoppingCart } from 'lucide-react-native';
import { db } from '../../firebase/config';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { requireAuth } from '../../utils/authHelper';

const { width, height } = Dimensions.get('window');

const font = {
  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  fontStyle: 'italic' as const,
};

export default function Shop({ navigation }: any) {
  const [products, setProducts] = useState<any[]>([]);
  const { cart, addToCart } = useCart();
  const { user } = useAuth();
  
  // Animation States
  const [flyImage, setFlyImage] = useState<string | null>(null);
  const [flyAnim] = useState(new Animated.ValueXY({ x: 0, y: 0 }));
  const [flyScale] = useState(new Animated.Value(1));
  const [flyOpacity] = useState(new Animated.Value(1));

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'products'), where('status', '==', 'approved')), (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleAddToCart = (p: any, e: any) => {
    e?.stopPropagation?.();
    if (!requireAuth(user, navigation)) return;
    if (p.variantsEnabled) {
      navigation.navigate('ProductDetails', { product: p });
      return;
    }
    addToCart({
      id: p.id, name: p.name, price: p.price, discountPrice: p.discountPrice,
      image: p.images?.[0] || 'https://via.placeholder.com/150', quantity: 1, stock: p.stock,
    });
    
    const startX = e.nativeEvent.pageX || 150;
    const startY = (e.nativeEvent.pageY || 300) - 40;
    
    setFlyImage(p.images?.[0] || 'https://via.placeholder.com/150');
    flyAnim.setValue({ x: startX, y: startY });
    flyScale.setValue(1);
    flyOpacity.setValue(1);

    Animated.parallel([
      Animated.timing(flyAnim, {
        toValue: { x: width - 50, y: 60 },
        duration: 600,
        useNativeDriver: false,
      }),
      Animated.timing(flyScale, {
        toValue: 0.1,
        duration: 600,
        useNativeDriver: false,
      }),
      Animated.timing(flyOpacity, {
        toValue: 0.2,
        duration: 600,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setFlyImage(null);
    });
  };

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
            <ChevronLeft color="#D4A843" size={28} />
          </TouchableOpacity>
          <Text style={[font, s.headerTitle]}>All Products</Text>
          <TouchableOpacity style={s.iconBtn} onPress={() => requireAuth(user, navigation, () => navigation.navigate('CartTab'))}>
            <ShoppingCart color="#D4A843" size={24} />
            {cart.length > 0 && (
              <View style={s.badgeWrap}>
                <Text style={s.badgeNum}>{cart.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={s.searchRow}>
          <View style={s.searchBox}>
            <Search color="#9CA3AF" size={20} />
            <TextInput 
              placeholder="Search premium products..."
              placeholderTextColor="#9CA3AF"
              style={[font, s.searchInput]}
            />
          </View>
          <TouchableOpacity style={s.filterBtn}>
            <Filter color="#145A32" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Micro-Animation Flying Image Overlay */}
      {flyImage && (
        <Animated.Image
          source={{ uri: flyImage }}
          style={{
            position: 'absolute', zIndex: 9999,
            width: 80, height: 80, borderRadius: 40,
            left: flyAnim.x, top: flyAnim.y,
            transform: [{ scale: flyScale }],
            opacity: flyOpacity,
            shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 10,
          }}
        />
      )}

      <ScrollView contentContainerStyle={s.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Results Info */}
        <View style={s.resultsHeader}>
          <Text style={[font, s.resultsText]}>Showing {products.length} products</Text>
          <TouchableOpacity>
            <Text style={[font, s.sortText]}>Sort by: Premium</Text>
          </TouchableOpacity>
        </View>

        {/* Product Grid */}
        <View style={s.grid}>
          {products.map((p, i) => {
            const disc = Math.round(((p.price - p.discountPrice) / p.price) * 100);
            return (
              <Pressable key={i} style={s.card} onPress={() => navigation.navigate('ProductDetails', { product: p })}>
                <View style={s.imgWrap}>
                  <Image source={{ uri: p.images?.[0] || 'https://via.placeholder.com/150' }} style={s.img} />
                  {disc > 0 && (
                    <View style={s.badge}>
                      <Text style={[font, s.badgeText]}>{disc}% OFF</Text>
                    </View>
                  )}
                </View>

                <View style={s.cardInfo}>
                  <Text style={[font, s.cTitle]} numberOfLines={2}>{p.name}</Text>
                  <Text style={[font, s.cSubtitle]}>{p.unit} • Fast Delivery</Text>

                  <View style={s.priceRow}>
                    <View>
                      <Text style={[font, s.cNprice]}>₹{p.discountPrice || p.price}</Text>
                      {p.discountPrice ? <Text style={[font, s.cOprice]}>₹{p.price}</Text> : null}
                    </View>
                    
                    <TouchableOpacity style={s.addBtn} onPress={(e) => handleAddToCart(p, e)}>
                      <Text style={[font, s.addBtnText]}>{p.variantsEnabled ? 'OPTIONS' : 'ADD'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Pressable>
            )
          })}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    backgroundColor: '#145A32',
    paddingTop: 54,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    shadowColor: '#145A32',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 10,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: 1 },
  iconBtn: { padding: 4 },
  badgeWrap: { position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#145A32' },
  badgeNum: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  searchBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212,168,67,0.3)',
  },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 16, color: '#FFF' },
  filterBtn: {
    width: 48,
    height: 48,
    backgroundColor: '#D4A843', // Gold Button
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  scrollBody: { paddingHorizontal: 20, paddingTop: 24 },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  resultsText: { fontSize: 16, color: '#6B7280', fontWeight: 'bold' },
  sortText: { fontSize: 14, color: '#145A32', fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6'
  },
  imgWrap: { width: '100%', aspectRatio: 1, borderRadius: 16, backgroundColor: '#F9FAFB', overflow: 'hidden', marginBottom: 12 },
  img: { width: '100%', height: '100%', resizeMode: 'cover' },
  badge: { position: 'absolute', top: 0, left: 0, backgroundColor: '#D4A843', paddingHorizontal: 8, paddingVertical: 4, borderBottomRightRadius: 12 },
  badgeText: { color: '#145A32', fontSize: 10, fontWeight: '900' },
  cardInfo: { flex: 1 },
  cTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 2, height: 36 },
  cSubtitle: { fontSize: 11, color: '#9CA3AF', marginBottom: 8 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' },
  cNprice: { fontSize: 16, fontWeight: '900', color: '#145A32' },
  cOprice: { fontSize: 11, color: '#9CA3AF', textDecorationLine: 'line-through' },
  addBtn: { backgroundColor: 'rgba(212,168,67,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  addBtnText: { color: '#D4A843', fontSize: 12, fontWeight: '900' },
});
