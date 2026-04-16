import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Alert, StyleSheet, Platform, Dimensions } from 'react-native';
import { ArrowLeft, Clock, MapPin, ShieldCheck, Heart, Minus, Plus, ShoppingCart, Star, Repeat } from 'lucide-react-native';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, limit, updateDoc, doc, arrayUnion, setDoc, deleteDoc, getDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');
const font = {
  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  fontStyle: 'italic' as const,
};

export default function ProductDetails({ route, navigation }: any) {
  const { product } = route.params;
  const { addToCart } = useCart();
  const { userData } = useAuth();
  const [adding, setAdding] = useState(false);
  const [qty, setQty] = useState(1);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isWishlisted, setIsWishlisted] = useState(false);
  // Variant selection
  const [selectedVariant, setSelectedVariant] = useState<any>(null);

  useEffect(() => {
    // Auto-select first variant if available and enabled
    if (product.variantsEnabled && product.variants && product.variants.length > 0) {
      setSelectedVariant(product.variants[0]);
    } else {
      setSelectedVariant(null);
    }
  }, [product.id, product.variantsEnabled]);

  const handleAddToCart = () => {
    setAdding(true);
    try {
      const activePrice = (product.variantsEnabled && selectedVariant) ? selectedVariant.price : product.price;
      const activeDiscountPrice = (product.variantsEnabled && selectedVariant) ? selectedVariant.discountPrice : product.discountPrice;
      const cartItem = {
        id: product.id,
        name: (product.variantsEnabled && selectedVariant) ? `${product.name} (${selectedVariant.label})` : product.name,
        price: activePrice,
        discountPrice: activeDiscountPrice,
        image: product.images?.[0] || 'https://via.placeholder.com/150',
        quantity: qty,
        stock: product.stock,
        variantLabel: (product.variantsEnabled && selectedVariant) ? selectedVariant.label : null,
      };
      addToCart(cartItem);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setAdding(false);
    }
  };

  useEffect(() => {
    // Save to recently viewed
    const saveView = async () => {
      if (userData?.uid) {
        try {
          await updateDoc(doc(db, 'users', userData.uid), {
            recentlyViewed: arrayUnion(product.id)
          });
        } catch (e) {
          // Ignore failures, field might not exist
        }
      }
    };
    saveView();

    // Fetch SMART recommendations
    const fetchRecs = async () => {
      try {
        const cat = product.categoryName || product.category || 'General';
        const q = query(collection(db, 'products'), where('categoryName', '==', cat), where('status', '==', 'approved'), limit(5));
        const res = await getDocs(q);
        const list = res.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(p => p.id !== product.id);
        setRecommendations(list);
      } catch (e) {
        console.error("Recommendations error", e);
      }
    };
    fetchRecs();

    // Check wishlist status
    const checkWishlist = async () => {
      if (userData?.uid) {
        try {
          const docRef = doc(db, 'users', userData.uid, 'wishlist', product.id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setIsWishlisted(true);
          }
        } catch (e) { console.error('Wishlist check error', e); }
      }
    };
    checkWishlist();
  }, [product.id, userData?.uid]);

  const toggleWishlist = async () => {
    if (!userData?.uid) {
      Alert.alert('Login Required', 'Please login to add to wishlist');
      return;
    }
    try {
      const docRef = doc(db, 'users', userData.uid, 'wishlist', product.id);
      if (isWishlisted) {
        await deleteDoc(docRef);
        setIsWishlisted(false);
      } else {
        await setDoc(docRef, product);
        setIsWishlisted(true);
      }
    } catch (e) {
      console.error('Toggle wishlist error', e);
    }
  };

  const activePrice = (product.variantsEnabled && selectedVariant) ? selectedVariant.price : product.price;
  const activeDiscountPrice = (product.variantsEnabled && selectedVariant) ? selectedVariant.discountPrice : product.discountPrice;
  const disc = activeDiscountPrice ? Math.round(((activePrice - activeDiscountPrice) / activePrice) * 100) : 0;

  return (
    <View style={s.root}>
      {/* Hero Image */}
      <View style={s.heroWrap}>
        <Image
          source={{ uri: product.images?.[0] || 'https://via.placeholder.com/400' }}
          style={s.heroImg}
        />
        <View style={s.heroOverlay} />

        {/* Top Actions */}
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.topBtn}>
            <ArrowLeft color="#1F2937" size={22} />
          </TouchableOpacity>
          <TouchableOpacity style={s.topBtn} onPress={toggleWishlist}>
            <Heart color="#EF4444" size={22} fill={isWishlisted ? "#EF4444" : "none"} />
          </TouchableOpacity>
        </View>

        {/* Discount Badge */}
        {disc > 0 && (
          <View style={s.discBadge}>
            <Text style={[font, s.discText]}>{disc}% OFF</Text>
          </View>
        )}
      </View>

      <ScrollView style={s.body} showsVerticalScrollIndicator={false}>
        {/* Title & Price */}
        <View style={s.titleSection}>
          <Text style={[font, s.productName]}>{product.name}</Text>
          {product.unit && <Text style={[font, { fontSize: 13, color: '#6B7280', marginBottom: 8 }]}>Unit: {product.unit}</Text>}
          <View style={s.priceRow}>
            <Text style={[font, s.mainPrice]}>₹{activeDiscountPrice || activePrice}</Text>
            {activeDiscountPrice && activeDiscountPrice < activePrice && (
              <Text style={[font, s.oldPrice]}>₹{activePrice}</Text>
            )}
          </View>
        </View>

        {/* Variant Selection */}
        {product.variantsEnabled && product.variants && product.variants.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={[font, s.sectionTitle, { fontSize: 16 }]}>📦 Select Size / Pack</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {product.variants.map((v: any, i: number) => {
                const isActive = selectedVariant?.label === v.label;
                return (
                  <TouchableOpacity 
                    key={i} 
                    style={[s.variantPill, isActive && s.variantPillActive]} 
                    onPress={() => setSelectedVariant(v)}
                  >
                    <Text style={[font, s.variantLabel, isActive && { color: '#145A32' }]}>{v.label}</Text>
                    <Text style={[font, s.variantPrice, isActive && { color: '#145A32' }]}>₹{v.discountPrice || v.price}</Text>
                    {v.discountPrice && v.discountPrice < v.price && (
                      <Text style={[font, { fontSize: 10, color: '#9CA3AF', textDecorationLine: 'line-through' }]}>₹{v.price}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Info Chips */}
        <View style={s.chipRow}>
          <View style={s.chip}>
            <Clock color="#D4A843" size={18} />
            <Text style={[font, s.chipText]}>{product.deliveryTime || '30 min'}</Text>
          </View>
          <View style={s.chip}>
            <MapPin color="#3B82F6" size={18} />
            <Text style={[font, s.chipText]}>{product.distanceRange || '1km'}</Text>
          </View>
          <View style={s.chip}>
            <ShieldCheck color="#8B5CF6" size={18} />
            <Text style={[font, s.chipText]}>Verified</Text>
          </View>
        </View>

        {/* Description */}
        <View style={s.descSection}>
          <Text style={[font, s.sectionTitle]}>Product Details</Text>
          <Text style={[font, s.descText]}>
            {product.description || `Farm fresh ${product.name} sourced directly from verified local farmers within your ${product.distanceRange || '1km'} vicinity. We ensure fast delivery to maintain maximum freshness and quality.`}
          </Text>
        </View>

        {/* More Details */}
        <View style={s.detailsBox}>
          <View style={s.detailRow}>
            <Text style={[font, s.detailLabel]}>Category</Text>
            <Text style={[font, s.detailValue]}>{product.category || 'General'}</Text>
          </View>
          <View style={[s.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={[font, s.detailLabel]}>Available Stock</Text>
            <Text style={[font, s.detailValue, product.stock <= 0 && { color: '#EF4444' }]}>
              {product.stock > 0 ? `${product.stock} units` : 'Out of Stock'}
            </Text>
          </View>
        </View>

        {/* Smart Recommendations */}
        {recommendations.length > 0 && (
          <View style={s.recSection}>
            <Text style={[font, s.sectionTitle, { marginTop: 20 }]}>You might also like</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20, paddingVertical: 10 }}>
              {recommendations.map(rec => (
                <TouchableOpacity
                  key={rec.id}
                  style={s.recCard}
                  onPress={() => navigation.push('ProductDetails', { product: rec })}
                >
                  <Image source={{ uri: rec.images?.[0] || 'https://via.placeholder.com/100' }} style={s.recImg} />
                  <Text style={[font, s.recName]} numberOfLines={1}>{rec.name}</Text>
                  <Text style={[font, s.recPrice]}>₹{rec.discountPrice || rec.price}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={s.footer}>
        {/* Qty Selector */}
        <View style={s.qtyWrap}>
          <TouchableOpacity onPress={() => setQty(Math.max(1, qty - 1))} style={s.qtyBtn}>
            <Minus color="#145A32" size={16} />
          </TouchableOpacity>
          <Text style={[font, s.qtyNum]}>{qty}</Text>
          <TouchableOpacity onPress={() => setQty(qty + 1)} style={s.qtyBtn}>
            <Plus color="#145A32" size={16} />
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1, flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            style={[s.subBtn, product.stock <= 0 && { backgroundColor: '#E5E7EB' }]}
            onPress={() => navigation.navigate('SubscriptionSetup', { product, qty, variant: selectedVariant })}
            disabled={product.stock <= 0}
          >
            <Repeat color="#145A32" size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.addBtn, product.stock <= 0 && { backgroundColor: '#E5E7EB' }]}
            onPress={handleAddToCart}
            disabled={adding || product.stock <= 0}
          >
            <ShoppingCart color="#145A32" size={20} />
            <Text style={[font, s.addBtnText]}>
              {adding ? 'Adding...' : product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF' },
  heroWrap: { width: '100%', height: Dimensions.get('window').height * 0.42, position: 'relative' },
  heroImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.05)' },
  topBar: { position: 'absolute', top: 50, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 },
  topBtn: { backgroundColor: 'rgba(255,255,255,0.9)', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  discBadge: { position: 'absolute', bottom: 20, left: 20, backgroundColor: '#D4A843', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, zIndex: 10 },
  discText: { color: '#145A32', fontSize: 13, fontWeight: '900' },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  titleSection: { marginBottom: 20 },
  productName: { fontSize: 28, fontWeight: '900', color: '#1F2937', marginBottom: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end' },
  mainPrice: { fontSize: 32, fontWeight: '900', color: '#145A32' },
  oldPrice: { fontSize: 18, color: '#9CA3AF', textDecorationLine: 'line-through', marginLeft: 12, marginBottom: 4 },
  chipRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F3F4F6', paddingVertical: 16 },
  chip: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 12, color: '#4B5563', fontWeight: 'bold', marginTop: 6 },
  descSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: '#145A32', marginBottom: 10 },
  descText: { fontSize: 15, color: '#6B7280', lineHeight: 24 },
  detailsBox: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F3F4F6' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  detailLabel: { fontSize: 14, color: '#6B7280' },
  detailValue: { fontSize: 14, fontWeight: '900', color: '#1F2937' },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
  },
  qtyWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginRight: 16 },
  qtyBtn: { padding: 12 },
  qtyNum: { fontSize: 16, fontWeight: '900', color: '#145A32', paddingHorizontal: 12 },
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4A843',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#D4A843',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addBtnText: { color: '#145A32', fontSize: 16, fontWeight: '900', marginLeft: 10 },
  recSection: { marginTop: 10 },
  variantPill: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, borderWidth: 2, borderColor: '#E5E7EB', marginRight: 10, alignItems: 'center', minWidth: 80, backgroundColor: '#F9FAFB' },
  variantPillActive: { borderColor: '#145A32', backgroundColor: 'rgba(20,90,50,0.08)' },
  variantLabel: { fontSize: 14, fontWeight: '800', color: '#374151', marginBottom: 2 },
  variantPrice: { fontSize: 15, fontWeight: '900', color: '#374151' },
  recCard: { width: 140, marginRight: 16, backgroundColor: '#FFF', borderRadius: 16, padding: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3, borderWidth: 1, borderColor: '#F3F4F6' },
  recImg: { width: '100%', height: 100, borderRadius: 12, resizeMode: 'cover', marginBottom: 8 },
  recName: { fontSize: 13, fontWeight: '900', color: '#1F2937', marginBottom: 4 },
  recPrice: { fontSize: 14, fontWeight: '900', color: '#145A32' },
  subBtn: { width: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0FDF4', borderRadius: 16, borderWidth: 1.5, borderColor: '#D4A843' }
});
