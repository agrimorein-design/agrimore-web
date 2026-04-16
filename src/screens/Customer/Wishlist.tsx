import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { ArrowLeft, Heart } from 'lucide-react-native';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where, doc, deleteDoc, setDoc } from 'firebase/firestore';

const font = {
  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  fontStyle: 'italic' as const,
};

export default function Wishlist({ navigation }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { userData } = useAuth();

  useEffect(() => {
    fetchWishlist();
  }, [userData]);

  const fetchWishlist = async () => {
    if (!userData?.uid) { setLoading(false); return; }
    try {
      const snap = await getDocs(collection(db, 'users', userData.uid, 'wishlist'));
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('Error fetching wishlist:', e);
    }
    setLoading(false);
  };

  const removeItem = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    if (userData?.uid) {
      try { await deleteDoc(doc(db, 'users', userData.uid, 'wishlist', id)); } catch (e) { console.error(e); }
    }
  };

  const handleAddToCart = (item: any) => {
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      discountPrice: item.discountPrice,
      image: item.images?.[0] || item.image || '',
      quantity: 1,
      stock: item.stock || 10,
    });
  };

  if (loading) {
    return (
      <View style={s.root}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><ArrowLeft color="#D4A843" size={22} /></TouchableOpacity>
          <Text style={[font, s.headerTitle]}>Wishlist</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color="#145A32" /></View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><ArrowLeft color="#D4A843" size={22} /></TouchableOpacity>
        <Text style={[font, s.headerTitle]}>Wishlist</Text>
        <Text style={[font, s.headerCount]}>{items.length} items</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {items.length === 0 ? (
          <View style={s.emptyWrap}>
            <Text style={s.emptyEmoji}>💔</Text>
            <Text style={[font, s.emptyTitle]}>Wishlist is Empty</Text>
            <Text style={[font, s.emptySub]}>Start saving your favorite products!</Text>
          </View>
        ) : (
          <View style={s.grid}>
            {items.map((item) => {
              const disc = item.discountPrice ? Math.round(((item.price - item.discountPrice) / item.price) * 100) : 0;
              const emoji = item.category === 'Fruits' ? '🍎' : item.category === 'Vegetables' ? '🥦' : item.category === 'Dairy' ? '🥛' : item.category === 'Meats' ? '🥩' : item.category === 'Grains' ? '🌾' : '🍯';
              return (
                <View key={item.id} style={s.card}>
                  <TouchableOpacity style={s.heartBtn} onPress={() => removeItem(item.id)}>
                    <Heart color="#EF4444" size={18} fill="#EF4444" />
                  </TouchableOpacity>

                  <View style={s.emojiWrap}>
                    {item.images?.[0] ? (
                      <Image source={{ uri: item.images[0] }} style={{ width: '100%', height: '100%', borderRadius: 16 }} />
                    ) : (
                      <Text style={s.emoji}>{emoji}</Text>
                    )}
                  </View>

                  {disc > 0 && (
                    <View style={s.discBadge}>
                      <Text style={[font, s.discText]}>{disc}% OFF</Text>
                    </View>
                  )}

                  <Text style={[font, s.itemName]} numberOfLines={2}>{item.name}</Text>
                  <Text style={[font, s.itemUnit]}>{item.unit || ''}</Text>

                  <View style={s.priceRow}>
                    <Text style={[font, s.itemPrice]}>₹{item.discountPrice || item.price}</Text>
                    {item.discountPrice && <Text style={[font, s.itemOldPrice]}>₹{item.price}</Text>}
                  </View>

                  <TouchableOpacity style={s.addBtn} onPress={() => handleAddToCart(item)}>
                    <Text style={[font, s.addBtnText]}>Add to Cart</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    backgroundColor: '#145A32',
    paddingTop: 54, paddingBottom: 20, paddingHorizontal: 16,
    borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#145A32', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
  },
  backBtn: { padding: 8 },
  headerTitle: { color: '#D4A843', fontSize: 24, fontWeight: '900' },
  headerCount: { color: '#FFF', fontSize: 13, opacity: 0.8 },
  scroll: { paddingHorizontal: 16, paddingTop: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: {
    width: '48%', backgroundColor: '#FFF', borderRadius: 20, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
    position: 'relative',
  },
  heartBtn: {
    position: 'absolute', top: 12, right: 12, zIndex: 10,
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center',
  },
  emojiWrap: {
    width: '100%', aspectRatio: 1, borderRadius: 16, backgroundColor: '#F9FAFB',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10, overflow: 'hidden',
  },
  emoji: { fontSize: 52 },
  discBadge: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: '#D4A843', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  discText: { color: '#145A32', fontSize: 10, fontWeight: '900' },
  itemName: { fontSize: 13, fontWeight: '700', color: '#1F2937', marginBottom: 2, height: 34 },
  itemUnit: { fontSize: 11, color: '#9CA3AF', marginBottom: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  itemPrice: { fontSize: 16, fontWeight: '900', color: '#145A32' },
  itemOldPrice: { fontSize: 11, color: '#9CA3AF', textDecorationLine: 'line-through', marginLeft: 6 },
  addBtn: {
    backgroundColor: 'rgba(20,90,50,0.1)', paddingVertical: 8, borderRadius: 10, alignItems: 'center',
  },
  addBtnText: { color: '#145A32', fontSize: 12, fontWeight: '900' },
  emptyWrap: { alignItems: 'center', marginTop: 80 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: '#1F2937', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#9CA3AF' },
});
