import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, TextInput, StyleSheet, Platform, Keyboard } from 'react-native';
import { Search as SearchIcon, X, Clock, TrendingUp, ArrowLeft } from 'lucide-react-native';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useCart } from '../../context/CartContext';

const font = {
  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  fontStyle: 'italic' as const,
};

const POPULAR_CATEGORIES = [
  { name: 'Organic Fruits', emoji: '🍎' },
  { name: 'Fresh Vegetables', emoji: '🥦' },
  { name: 'Dairy & Eggs', emoji: '🥛' },
  { name: 'Premium Meats', emoji: '🥩' },
  { name: 'Grains & Rice', emoji: '🌾' },
  { name: 'Natural Honey', emoji: '🍯' },
];

export default function SearchScreen({ navigation }: any) {
  const inputRef = useRef<TextInput>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>(['Tomatoes', 'Organic Milk', 'Bananas', 'Chicken Breast']);
  const { addToCart } = useCart();

  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(query(collection(db, 'products'), where('status', '==', 'approved')));
      setAllProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    load();
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      setFiltered(allProducts.filter(p =>
        p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)
      ));
    } else {
      setFiltered([]);
    }
  }, [searchQuery, allProducts]);

  const handleAdd = (p: any) => {
    addToCart({
      id: p.id,
      name: p.name,
      price: p.price,
      discountPrice: p.discountPrice,
      image: p.images?.[0] || '',
      quantity: 1,
      stock: p.stock,
    });
  };

  return (
    <View style={s.root}>
      {/* Search Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <ArrowLeft color="#D4A843" size={22} />
        </TouchableOpacity>
        <View style={s.searchBox}>
          <SearchIcon color="#9CA3AF" size={20} />
          <TextInput
            ref={inputRef}
            placeholder="Search fresh groceries..."
            placeholderTextColor="#9CA3AF"
            style={[font, s.searchInput]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X color="#9CA3AF" size={18} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scrollBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {searchQuery.length === 0 ? (
          <>
            {/* Recent Searches */}
            <Text style={[font, s.sectionTitle]}>Recent Searches</Text>
            <View style={s.recentList}>
              {recentSearches.map((r, i) => (
                <TouchableOpacity key={i} style={s.recentItem} onPress={() => setSearchQuery(r)}>
                  <Clock color="#9CA3AF" size={16} />
                  <Text style={[font, s.recentText]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Popular Categories */}
            <Text style={[font, s.sectionTitle]}>Popular Categories</Text>
            <View style={s.catGrid}>
              {POPULAR_CATEGORIES.map((c, i) => (
                <TouchableOpacity key={i} style={s.catCard} onPress={() => setSearchQuery(c.name)}>
                  <Text style={s.catEmoji}>{c.emoji}</Text>
                  <Text style={[font, s.catName]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Trending */}
            <View style={s.trendingHeader}>
              <TrendingUp color="#D4A843" size={20} />
              <Text style={[font, s.trendingTitle]}>Trending Now</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {allProducts.slice(0, 5).map((p, i) => (
                <TouchableOpacity key={i} style={s.trendCard} onPress={() => navigation.navigate('ProductDetails', { product: p })}>
                  <Image source={{ uri: p.images?.[0] || 'https://via.placeholder.com/100' }} style={s.trendImg} />
                  <Text style={[font, s.trendName]} numberOfLines={1}>{p.name}</Text>
                  <Text style={[font, s.trendPrice]}>₹{p.discountPrice || p.price}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        ) : (
          <>
            <Text style={[font, s.resultCount]}>{filtered.length} result{filtered.length !== 1 ? 's' : ''} found</Text>
            {filtered.map((p, i) => {
              const disc = p.discountPrice ? Math.round(((p.price - p.discountPrice) / p.price) * 100) : 0;
              return (
                <TouchableOpacity key={i} style={s.resultCard} onPress={() => navigation.navigate('ProductDetails', { product: p })}>
                  <Image source={{ uri: p.images?.[0] || 'https://via.placeholder.com/100' }} style={s.resultImg} />
                  <View style={s.resultInfo}>
                    <Text style={[font, s.resultName]} numberOfLines={1}>{p.name}</Text>
                    <Text style={[font, s.resultUnit]}>{p.unit} • {p.category}</Text>
                    <View style={s.resultPriceRow}>
                      <Text style={[font, s.resultPrice]}>₹{p.discountPrice || p.price}</Text>
                      {disc > 0 && <Text style={[font, s.resultOldPrice]}>₹{p.price}</Text>}
                      {disc > 0 && (
                        <View style={s.discBadge}>
                          <Text style={[font, s.discText]}>{disc}% OFF</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity style={s.addBtn} onPress={() => handleAdd(p)}>
                    <Text style={[font, s.addBtnText]}>ADD</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
            {filtered.length === 0 && (
              <View style={s.noResult}>
                <Text style={s.noResultEmoji}>🔍</Text>
                <Text style={[font, s.noResultTitle]}>No products found</Text>
                <Text style={[font, s.noResultSub]}>Try a different search term</Text>
              </View>
            )}
          </>
        )}
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
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#145A32',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  backBtn: { padding: 8, marginRight: 8 },
  searchBox: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 16, color: '#1F2937' },
  scrollBody: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#145A32', marginBottom: 16 },
  recentList: { marginBottom: 28 },
  recentItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  recentText: { marginLeft: 12, fontSize: 15, color: '#4B5563' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 28 },
  catCard: {
    width: '31%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  catEmoji: { fontSize: 32, marginBottom: 8 },
  catName: { fontSize: 11, color: '#4B5563', textAlign: 'center', fontWeight: '700' },
  trendingHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  trendingTitle: { fontSize: 18, fontWeight: '900', color: '#145A32', marginLeft: 8 },
  trendCard: {
    width: 130,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 10,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  trendImg: { width: '100%', height: 100, borderRadius: 12, backgroundColor: '#F3F4F6', marginBottom: 8 },
  trendName: { fontSize: 12, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  trendPrice: { fontSize: 14, fontWeight: '900', color: '#145A32' },
  resultCount: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  resultCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  resultImg: { width: 72, height: 72, borderRadius: 14, backgroundColor: '#F3F4F6', marginRight: 14 },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 2 },
  resultUnit: { fontSize: 12, color: '#9CA3AF', marginBottom: 6 },
  resultPriceRow: { flexDirection: 'row', alignItems: 'center' },
  resultPrice: { fontSize: 16, fontWeight: '900', color: '#145A32' },
  resultOldPrice: { fontSize: 12, color: '#9CA3AF', textDecorationLine: 'line-through', marginLeft: 8 },
  discBadge: { backgroundColor: '#D4A843', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8 },
  discText: { color: '#145A32', fontSize: 10, fontWeight: '900' },
  addBtn: { backgroundColor: 'rgba(20,90,50,0.1)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginLeft: 8 },
  addBtnText: { color: '#145A32', fontSize: 12, fontWeight: '900' },
  noResult: { alignItems: 'center', marginTop: 60 },
  noResultEmoji: { fontSize: 48, marginBottom: 16 },
  noResultTitle: { fontSize: 20, fontWeight: '900', color: '#1F2937', marginBottom: 8 },
  noResultSub: { fontSize: 14, color: '#9CA3AF' },
});
