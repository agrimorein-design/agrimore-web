import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Platform, Dimensions, Pressable, Animated } from 'react-native';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { ArrowLeft, ChevronRight, ShoppingCart } from 'lucide-react-native';
import { useCart } from '../../context/CartContext';

const { width } = Dimensions.get('window');
const font = {
  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  fontStyle: 'italic' as const,
};

export default function Category({ route, navigation }: any) {
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { cart, addToCart } = useCart();
  
  // Animation States
  const [flyImage, setFlyImage] = useState<string | null>(null);
  const [flyAnim] = useState(new Animated.ValueXY({ x: 0, y: 0 }));
  const [flyScale] = useState(new Animated.Value(1));
  const [flyOpacity] = useState(new Animated.Value(1));

  useEffect(() => {
    const fetchCats = async () => {
      const snap = await getDocs(collection(db, 'categories'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((c:any) => c.isVisible !== false).sort((a:any, b:any) => (a.priority || 0) - (b.priority || 0));
      setCategories(list);
      
      let initId = list[0]?.id || '';
      if (route?.params?.categoryName) {
        const match = list.find((c: any) => c.name === route.params.categoryName);
        if (match) initId = match.id;
      } else if (route?.params?.categoryId) {
        initId = route.params.categoryId;
      }
      setActiveCategory(initId);
      setLoading(false);
    };
    fetchCats();
  }, [route?.params]);

  useEffect(() => {
    if (activeCategory && categories.length > 0) {
      loadCategoryProducts(activeCategory);
    }
  }, [activeCategory, categories]);

  const loadCategoryProducts = async (catId: string) => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;
    const q = query(collection(db, 'products'), where('categoryName', '==', cat.name), where('status', '==', 'approved'));
    const snap = await getDocs(q);
    setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((p:any) => p.isAvailable !== false));
  };

  const handleAddToCart = (p: any, e: any) => {
    e?.stopPropagation?.();
    if (p.variantsEnabled) {
      navigation.navigate('ProductDetails', { product: p });
      return;
    }
    
    addToCart({
      id: p.id,
      name: p.name,
      price: p.price,
      discountPrice: p.discountPrice,
      image: p.images?.[0] || 'https://via.placeholder.com/150',
      quantity: 1,
      stock: p.stock,
    });

    if (e && e.nativeEvent) {
      const startX = e.nativeEvent.pageX || 150;
      const startY = (e.nativeEvent.pageY || 300) - 40;
      
      setFlyImage(p.images?.[0] || 'https://via.placeholder.com/150');
      flyAnim.setValue({ x: startX, y: startY });
      flyScale.setValue(1);
      flyOpacity.setValue(1);

      Animated.parallel([
        Animated.timing(flyAnim, { toValue: { x: width - 50, y: 60 }, duration: 600, useNativeDriver: false }),
        Animated.timing(flyScale, { toValue: 0.1, duration: 600, useNativeDriver: false }),
        Animated.timing(flyOpacity, { toValue: 0.2, duration: 600, useNativeDriver: false }),
      ]).start(() => setFlyImage(null));
    }
  };

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
            <ArrowLeft color="#D4A843" size={28} />
          </TouchableOpacity>
          <View>
            <Text style={[font, s.headerTitle]}>Menu</Text>
            <Text style={[font, s.headerSub]}>Explore Premium Collections</Text>
          </View>
          <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate('CartTab')}>
            <ShoppingCart color="#D4A843" size={24} />
            {cart.length > 0 && (
              <View style={s.badgeWrap}>
                <Text style={s.badgeNum}>{cart.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Fly Animation Overlay */}
      {flyImage && (
        <Animated.Image
          source={{ uri: flyImage }}
          style={{
            position: 'absolute', zIndex: 9999,
            width: 70, height: 70, borderRadius: 35,
            left: flyAnim.x, top: flyAnim.y,
            transform: [{ scale: flyScale }],
            opacity: flyOpacity,
            shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 10,
          }}
        />
      )}

      <View style={s.content}>
        {/* Sidebar Categories */}
        <ScrollView style={s.sidebar} showsVerticalScrollIndicator={false}>
          {categories.map((c, i) => {
            const isActive = activeCategory === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={[s.sideItem, isActive && s.sideItemActive]}
                onPress={() => setActiveCategory(c.id)}
              >
                <View style={[s.sideIconWrap, isActive && s.sideIconWrapActive]}>
                  {c.imageUrl ? (
                    <Image source={{ uri: c.imageUrl }} style={s.sideIcon} />
                  ) : (
                    <Text style={{ fontSize: 24, textAlign: 'center' }}>{c.emoji}</Text>
                  )}
                </View>
                <Text style={[font, s.sideText, isActive && s.sideTextActive]}>{c.name}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Main Content Grid */}
        <ScrollView style={s.mainView} showsVerticalScrollIndicator={false}>
          {/* Active Category Header */}
          <View style={s.catHeader}>
            <Text style={[font, s.catTitle]}>{categories.find(c => c.id === activeCategory)?.name}</Text>
            <Text style={[font, s.catSub]}>{products.length} Items</Text>
          </View>

          <View style={s.grid}>
            {products.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={[font, s.emptyTitle]}>No items here yet</Text>
                <Text style={[font, s.emptySub]}>Check back later or explore other categories.</Text>
              </View>
            ) : (
              products.map((p, i) => (
                <Pressable key={p.id} style={s.card} onPress={() => navigation.navigate('ProductDetails', { product: p })}>
                  <View style={s.imgWrap}>
                    <Image source={{ uri: p.images?.[0] || 'https://via.placeholder.com/150' }} style={s.img} />
                    <TouchableOpacity style={s.addPlus} onPress={(e) => handleAddToCart(p, e)}>
                      <Text style={s.addPlusText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={[font, s.pName]} numberOfLines={2}>{p.name}</Text>
                  <Text style={[font, s.pUnit]} numberOfLines={1}>{p.variantsEnabled ? 'Options' : p.unit}</Text>
                  <Text style={[font, s.pPrice]}>₹{p.discountPrice || p.price}</Text>
                </Pressable>
              ))
            )}
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    backgroundColor: '#145A32',
    paddingTop: 54,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    shadowColor: '#145A32',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 10,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconBtn: { padding: 4 },
  badgeWrap: { position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#145A32' },
  badgeNum: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  headerTitle: { color: '#D4A843', fontSize: 24, fontWeight: '900', textAlign: 'center' },
  headerSub: { color: '#FFF', fontSize: 12, opacity: 0.8, marginTop: 2, textAlign: 'center' },
  content: { flex: 1, flexDirection: 'row' },
  sidebar: {
    width: 100,
    backgroundColor: '#FFF',
    borderRightWidth: 1,
    borderRightColor: '#F3F4F6',
    flexGrow: 0,
    paddingTop: 16,
  },
  sideItem: { alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8, borderLeftWidth: 4, borderLeftColor: 'transparent' },
  sideItemActive: { backgroundColor: '#F0FDF4', borderLeftColor: '#145A32' },
  sideIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  sideIconWrapActive: { backgroundColor: 'rgba(212,168,67,0.2)' },
  sideIcon: { width: 24, height: 24, resizeMode: 'contain' },
  sideText: { fontSize: 11, textAlign: 'center', color: '#6B7280' },
  sideTextActive: { color: '#145A32', fontWeight: '900' },
  mainView: { flex: 1, padding: 16 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  catTitle: { fontSize: 22, fontWeight: '900', color: '#145A32' },
  catSub: { fontSize: 14, color: '#9CA3AF', marginBottom: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-start' },
  card: {
    width: '31%',
    maxWidth: 160,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 6,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  imgWrap: { width: '100%', aspectRatio: 1, backgroundColor: '#F9FAFB', borderRadius: 8, marginBottom: 8 },
  img: { width: '100%', height: '100%', resizeMode: 'cover', borderRadius: 8 },
  addPlus: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 26,
    height: 26,
    backgroundColor: '#145A32',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  addPlusText: { color: '#D4A843', fontSize: 16, fontWeight: 'bold', marginTop: -2 },
  pName: { fontSize: 10, fontWeight: '900', color: '#1F2937', marginBottom: 2, height: 28, lineHeight: 14 },
  pUnit: { fontSize: 8, color: '#9CA3AF', marginBottom: 4 },
  pPrice: { fontSize: 12, fontWeight: '900', color: '#145A32' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 18, color: '#1F2937', fontWeight: 'bold', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
});
