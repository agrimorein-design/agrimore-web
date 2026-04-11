import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, TextInput, StyleSheet, Platform, ImageBackground, Animated, Pressable, Dimensions, Modal } from 'react-native';
import { Search, Bell, Heart, Zap, ChevronRight, Gift, Tag, Wallet, ShoppingCart, X } from 'lucide-react-native';
import { db } from '../../firebase/config';
import { collection, onSnapshot, getDocs, limit, query, where, updateDoc, doc, addDoc } from 'firebase/firestore';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { requireAuth } from '../../utils/authHelper';
import ScratchCard from '../../components/ScratchCard';

const { width, height } = Dimensions.get('window');

const font = {
  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  fontStyle: 'italic' as const,
};

const QUICK_ACTIONS = [
  { label: 'Flash Sale', emoji: '⚡', screen: 'FlashSale', color: '#F59E0B' },
  { label: 'Wallet', emoji: '💳', screen: 'Wallet', color: '#8B5CF6' },
  { label: 'Offers', emoji: '🏷️', screen: 'Offers', color: '#3B82F6' },
  { label: 'Refer', emoji: '🎁', screen: 'Referral', color: '#16A34A' },
];

const CATEGORIES_H = [
  { name: 'Fruits', emoji: '🍎' },
  { name: 'Vegetables', emoji: '🥦' },
  { name: 'Dairy', emoji: '🥛' },
  { name: 'Meats', emoji: '🥩' },
  { name: 'Grains', emoji: '🌾' },
  { name: 'Honey', emoji: '🍯' },
];

export default function Home({ navigation }: any) {
  const [freshProducts, setFreshProducts] = useState<any[]>([]);
  const [bestSellingProducts, setBestSellingProducts] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [homeCategories, setHomeCategories] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [addedId, setAddedId] = useState<string | null>(null);
  const { addToCart, cart, cartTotal } = useCart();
  const { userData } = useAuth();
  
  // Animation States
  const [flyImage, setFlyImage] = useState<string | null>(null);
  const [flyAnim] = useState(new Animated.ValueXY({ x: 0, y: 0 }));
  const [flyScale] = useState(new Animated.Value(1));
  const [flyOpacity] = useState(new Animated.Value(1));

  const [unscratchedCard, setUnscratchedCard] = useState<any>(null);
  const [scratching, setScratching] = useState(false);
  const [scratched, setScratched] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);

  // Auto Slider State
  const bannerScrollRef = React.useRef<ScrollView>(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [displayBanners, setDisplayBanners] = useState<any[]>([]);

  useEffect(() => {
    // Filter banners based on device width
    const targetType = width < 768 ? 'mobile' : 'desktop';
    const filtered = banners.filter((b) => !b.bannerType || b.bannerType === targetType);
    setDisplayBanners(filtered.length > 0 ? filtered : banners); // fallback to all if empty
  }, [banners]);

  useEffect(() => {
    if (displayBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex(prev => {
        const next = (prev + 1) % displayBanners.length;
        bannerScrollRef.current?.scrollTo({ x: next * (width - 40), animated: true });
        return next;
      });
    }, 4000); // 4 seconds interval
    return () => clearInterval(interval);
  }, [displayBanners, width]);

  // Auto-hide scratch popup after 5s if not touched
  useEffect(() => {
    let timer: any;
    if (unscratchedCard && !scratched && !claiming && !claimSuccess) {
      timer = setTimeout(() => {
        setUnscratchedCard(null);
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [unscratchedCard, scratched, claiming, claimSuccess]);

  useEffect(() => {
    if (!userData?.uid) return;
    const unsub = onSnapshot(
      query(collection(db, 'users', userData.uid, 'scratchCards'), where('isScratched', '==', false), limit(1)),
      (snap) => {
        if (!snap.empty) {
          setUnscratchedCard({ id: snap.docs[0].id, ...snap.docs[0].data() });
        } else {
          setUnscratchedCard(null);
        }
      }
    );
    return () => unsub();
  }, [userData?.uid]);

  useEffect(() => {
    let isMounted = true;
    
    const unsubProducts = onSnapshot(query(collection(db, 'products'), where('status', '==', 'approved'), limit(50)), (snap) => {
      if(isMounted) {
        const allDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const fresh = [...allDocs].sort((a: any, b: any) => {
           const tA = a.createdAt?.seconds || 0;
           const tB = b.createdAt?.seconds || 0;
           return tB - tA;
        }).slice(0, 9);

        const bestSelling = [...allDocs].sort((a: any, b: any) => {
           return (b.soldCount || 0) - (a.soldCount || 0);
        }).slice(0, 9);
        
        setFreshProducts(fresh);
        setBestSellingProducts(bestSelling);
        setLoadingProducts(false);
      }
    });

    const unsubBanners = onSnapshot(query(collection(db, 'banners'), limit(3)), (snap) => {
      if(isMounted) {
        setBanners(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    });

    const unsubCats = onSnapshot(collection(db, 'categories'), (snap) => {
      if(isMounted) {
        const cats = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        const filteredCats = cats.filter(c => c.isVisible && c.showOnHome).sort((a:any, b:any) => (a.priority || 0) - (b.priority || 0));
        setHomeCategories(filteredCats);
      }
    });

    return () => {
      isMounted = false;
      unsubProducts();
      unsubBanners();
      unsubCats();
    };
  }, []);

  const handleAddToCart = (p: any, e?: any) => {
    addToCart({
      id: p.id,
      name: p.name,
      price: p.price,
      discountPrice: p.discountPrice,
      image: p.images?.[0] || '',
      quantity: 1,
      stock: p.stock,
    });
    setAddedId(p.id);
    setTimeout(() => setAddedId(null), 1500);

    // Fly animation logic
    if (e && e.nativeEvent) {
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
      ]).start(() => setFlyImage(null));
    }
  };

  const handleScratch = () => {
    setScratched(true);
  };

  const handleClaimReward = async () => {
    if (claiming || !unscratchedCard || !userData?.uid) return;
    setClaiming(true);
    const cardId = unscratchedCard.id;
    const amt = unscratchedCard.amount;

    try {
      await updateDoc(doc(db, 'users', userData.uid, 'scratchCards', cardId), { isScratched: true });
      const newBal = (userData.walletBalance || 0) + amt;
      await updateDoc(doc(db, 'users', userData.uid), { walletBalance: newBal });
      await addDoc(collection(db, 'users', userData.uid, 'transactions'), {
        type: 'credit', title: 'Delivery Reward 🎁', amount: amt, createdAt: new Date()
      });
      setClaimSuccess(true);
      setTimeout(() => {
        setClaimSuccess(false);
        setUnscratchedCard(null);
        setScratched(false);
      }, 2500);
    } catch(e) { console.error(e); }
    setClaiming(false);
  };

  // Reusable Component for Animating Cart Adds
  const ProductCard = ({ p, isFeatured = false }: any) => {
    const disc = p.discountPrice ? Math.round(((p.price - p.discountPrice) / p.price) * 100) : 0;
    const isAdded = addedId === p.id;
    const isLowStock = p.stock > 0 && p.stock <= 5;
    
    // Button Scale Animation
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePress = (e: any) => {
      e?.stopPropagation?.();
      if (p.variantsEnabled) {
        navigation.navigate('ProductDetails', { product: p });
        return;
      }
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.85, duration: 100, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true })
      ]).start();
      handleAddToCart(p, e);
    };

    const rating = p.averageRating ? parseFloat(p.averageRating).toFixed(1) : '4.5';
    const reviews = p.reviewCount || Math.floor(Math.random() * 50) + 10;

    return (
      <Pressable 
        style={s.gridCard} 
        onPress={() => navigation.navigate('ProductDetails', { product: p })}
      >
        <View style={s.imgWrap}>
          <Image source={{ uri: p.images?.[0] || 'https://via.placeholder.com/150' }} style={s.img} />
          {disc > 0 && (
            <View style={[s.badge, { paddingHorizontal: 4, paddingVertical: 2 }]}>
              <Text style={[font, s.badgeText, { fontSize: 8 }]}>{disc}% OFF</Text>
            </View>
          )}
        </View>

        <View style={s.cardInfo}>
          <Text style={[font, s.cTitle]} numberOfLines={1}>{p.name}</Text>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
             <Text style={{ fontSize: 9 }}>⭐</Text>
             <Text style={[font, { fontSize: 9, color: '#4B5563', marginLeft: 2, fontWeight: '700' }]}>{rating} <Text style={{fontWeight: '400', color: '#9CA3AF'}}>({reviews})</Text></Text>
          </View>

          <View style={s.priceRow}>
            <View>
              <Text style={[font, s.cNprice]}>
                ₹{p.discountPrice || p.price}
              </Text>
              {p.discountPrice && (
                <Text style={[font, s.cOprice]}>
                  ₹{p.price}
                </Text>
              )}
            </View>
            <TouchableOpacity style={s.addBtn} onPress={(e) => handlePress(e)}>
              <Text style={[font, s.addBtnText]}>{p.variantsEnabled ? 'OPTS' : 'ADD'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    );
  };

  // Skeleton placeholder
  const SkeletonCard = () => (
    <View style={s.gridCard}>
      <View style={[s.imgWrap, { backgroundColor: '#E5E7EB' }]} />
      <View style={{ height: 10, backgroundColor: '#E5E7EB', borderRadius: 4, marginBottom: 4, width: '90%' }} />
      <View style={{ height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, width: '40%' }} />
    </View>
  );

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View style={s.locationRow}>
            <Text style={[font, s.greeting]}>Hello, {userData?.name?.split(' ')[0] || 'Guest'} 👋</Text>
            <Text style={[font, s.locationText]} numberOfLines={1}>📍 {userData?.defaultAddress?.substring(0, 30) || 'Set location'}...</Text>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate('Notifications')}>
              <Bell color="#FFF" size={20} />
              <View style={s.notifDot} />
            </TouchableOpacity>
            <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate('CartTab')}>
              <ShoppingCart color="#FFF" size={20} />
              {cart.length > 0 && (
                <View style={s.headerBadge}>
                  <Text style={s.headerBadgeTxt}>{cart.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar → navigates to Search screen */}
        <TouchableOpacity style={s.searchBox} onPress={() => navigation.navigate('Search')} activeOpacity={0.8}>
          <Search color="#9CA3AF" size={20} />
          <Text style={[font, s.searchPlaceholder]}>Search fresh groceries...</Text>
        </TouchableOpacity>
      </View>

      {/* Micro-Animation Flying Image Overlay */}
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

      <ScrollView contentContainerStyle={s.scrollBody} showsVerticalScrollIndicator={false}>

        {/* Promo Banners (Auto Slider) */}
        {displayBanners.length > 0 && (
          <View style={s.bannerWrap}>
            <ScrollView 
              ref={bannerScrollRef}
              horizontal 
              pagingEnabled
              showsHorizontalScrollIndicator={false} 
              style={s.bannerScroll}
              onScroll={(e) => {
                const x = e.nativeEvent.contentOffset.x;
                setCurrentBannerIndex(Math.round(x / (width - 40)));
              }}
              scrollEventThrottle={16}
            >
              {displayBanners.map(b => (
                <View key={b.id} style={{ width: width - 40 }}>
                  <ImageBackground source={{ uri: b.imageUrl }} style={s.bannerImg} imageStyle={{ borderRadius: 20 }}>
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 20 }]} />
                    <View style={s.bannerContent}>
                      <Text style={[font, s.bannerTitle]}>{b.title}</Text>
                      <TouchableOpacity style={s.bannerBtn} onPress={() => {
                        if (b.linkType === 'category') navigation.navigate('Category', { categoryName: b.linkValue });
                      }}>
                        <Text style={[font, s.bannerBtnText]}>Shop Now</Text>
                      </TouchableOpacity>
                    </View>
                  </ImageBackground>
                </View>
              ))}
            </ScrollView>
            <View style={s.dotRow}>
              {displayBanners.map((_, i) => (
                <View key={i} style={[s.dot, currentBannerIndex === i && s.dotActive]} />
              ))}
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={s.quickRow}>
          {QUICK_ACTIONS.map((a, i) => (
            <TouchableOpacity 
              key={i} 
              style={s.quickCard} 
              onPress={() => requireAuth(userData, navigation, () => navigation.navigate(a.screen), a.screen)}
            >
              <View style={[s.quickIcon, { backgroundColor: `${a.color}15` }]}>
                <Text style={{ fontSize: 22 }}>{a.emoji}</Text>
              </View>
              <Text style={[font, s.quickLabel]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Horizontal Categories */}
        {homeCategories.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll}>
            {homeCategories.map((c) => (
              <TouchableOpacity key={c.id} style={s.catHChip} onPress={() => navigation.navigate('Category', { categoryId: c.id, categoryName: c.name })}>
                {c.imageUrl ? (
                  <Image source={{ uri: c.imageUrl }} style={{ width: 40, height: 40, borderRadius: 20, marginBottom: 8 }} />
                ) : (
                  <Text style={s.catHEmoji}>{c.emoji}</Text>
                )}
                <Text style={[font, s.catHName]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Fresh Products / Packets Header */}
        <View style={s.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={[font, s.sectionTitle]}>Fresh Products / Packets 🌿</Text>
            {userData?.role === 'admin' && (
              <TouchableOpacity onPress={async () => {
                await addDoc(collection(db, 'users', userData.uid, 'scratchCards'), {
                  amount: Math.floor(Math.random() * 40) + 10,
                  isScratched: false,
                  orderId: 'demo_'+Date.now(),
                  createdAt: new Date()
                });
              }} style={{ backgroundColor: '#F59E0B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                <Text style={{color:'#FFF', fontSize: 10, fontWeight: 'bold'}}>Demo Scratch</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Fresh Products 3x3 Grid */}
        <View style={s.gridContainer}>
          {loadingProducts ? (
            Array(9).fill(0).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            freshProducts.map((p) => (
              <ProductCard key={p.id} p={p} isFeatured={false} />
            ))
          )}
        </View>

        {/* Best Selling Products Header */}
        <View style={[s.sectionHeader, { marginTop: 10 }]}>
          <Text style={[font, s.sectionTitle]}>Best Selling Products ⭐️</Text>
        </View>

        {/* Best Selling 3x3 Grid */}
        <View style={s.gridContainer}>
          {loadingProducts ? (
            Array(9).fill(0).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            bestSellingProducts.map((p) => (
              <ProductCard key={p.id} p={p} isFeatured={true} />
            ))
          )}
        </View>

        {/* See All Products Button */}
        <TouchableOpacity style={s.seeAllBtn} onPress={() => navigation.navigate('Shop')}>
          <Text style={[font, s.seeAllBtnText]}>See All Products</Text>
          <ChevronRight color="#FFF" size={18} />
        </TouchableOpacity>

      </ScrollView>

      {/* Floating Cart Summary Overlay */}
      {cart && cart.length > 0 && (
        <View style={s.floatingCartWrap}>
          <View style={s.floatingCartBox}>
            <View style={s.fcInfo}>
              <Text style={[font, s.fcItems]}>{cart.length} ITEM{cart.length > 1 ? 'S' : ''}</Text>
              <Text style={[font, s.fcToPrice]}>₹{cartTotal}</Text>
            </View>
            <TouchableOpacity style={s.fcBtn} onPress={() => navigation.navigate('Checkout')} activeOpacity={0.8}>
              <Text style={[font, s.fcBtnText]}>View Cart</Text>
              <ShoppingCart color="#145A32" size={16} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* FULL SCREEN REWARD SCRATCH MODAL */}
      {unscratchedCard && (
        <Modal visible={true} transparent animationType="fade">
          <View style={s.scratchOverlay}>
            <View style={s.scratchModalBox}>  
              <TouchableOpacity style={s.skipModalBtn} onPress={() => setUnscratchedCard(null)}>
                 <X color="#9CA3AF" size={20} />
                 <Text style={[font, { color: '#6B7280', fontSize: 13, marginLeft: 4 }]}>Skip</Text>
              </TouchableOpacity>

              {claimSuccess ? (
                <View style={{ alignItems: 'center', padding: 20 }}>
                  <Text style={{ fontSize: 60, marginBottom: 10 }}>🎊</Text>
                  <Text style={[font, { fontSize: 24, fontWeight: '900', color: '#111827', textAlign: 'center' }]}>
                    🎉 You won ₹{unscratchedCard.amount}!
                  </Text>
                  <Text style={[font, { fontSize: 14, color: '#16A34A', fontWeight: 'bold', marginTop: 10, textAlign: 'center' }]}>
                    ✔️ Added to Wallet safely
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={[font, s.scCongrats]}>🎁 Lucky Reward!</Text>
                  <Text style={[font, s.scSub]}>Scratch to reveal your prize</Text>

                  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                    <ScratchCard amount={unscratchedCard.amount} onScratched={handleScratch} />
                  </View>

                  {scratched && (
                    <TouchableOpacity style={s.scClaimBtn} onPress={handleClaimReward} disabled={claiming}>
                      <Text style={[font, { color: '#FFF', fontSize: 16, fontWeight: '900' }]}>
                        {claiming ? 'Claiming...' : 'Collect Reward'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    backgroundColor: '#145A32',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    paddingTop: 54,
    paddingBottom: 20,
    paddingHorizontal: 20,
    shadowColor: '#145A32',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 10,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  locationRow: { flex: 1 },
  greeting: { color: '#D4A843', fontSize: 20, fontWeight: '900', marginBottom: 4 },
  locationText: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  headerActions: { flexDirection: 'row' },
  iconBtn: {
    width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center', marginLeft: 10, position: 'relative',
  },
  headerBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', height: 16, width: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#145A32' },
  headerBadgeTxt: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  notifDot: {
    position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#145A32',
  },
  searchBox: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchPlaceholder: { marginLeft: 12, fontSize: 15, color: '#9CA3AF' },
  scrollBody: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 100 },
  bannerWrap: { marginBottom: 24 },
  bannerScroll: { },
  bannerImg: { width: '100%', height: 160, justifyContent: 'center', padding: 24 },
  bannerContent: { zIndex: 1 },
  bannerTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', marginBottom: 10, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  bannerBtn: { backgroundColor: '#D4A843', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, alignSelf: 'flex-start' },
  bannerBtnText: { color: '#145A32', fontWeight: '900', fontSize: 13 },
  dotRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 10, gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D1D5DB' },
  dotActive: { width: 14, backgroundColor: '#145A32' },
  // Quick Actions
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  quickCard: {
    flex: 1, alignItems: 'center', marginHorizontal: 4,
    backgroundColor: '#FFF', borderRadius: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 2,
  },
  quickIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  quickLabel: { fontSize: 11, fontWeight: '700', color: '#4B5563' },
  // Horizontal Categories
  catScroll: { marginBottom: 24 },
  catHChip: {
    alignItems: 'center', marginRight: 14, backgroundColor: '#FFF', borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  catHEmoji: { fontSize: 28, marginBottom: 4 },
  catHName: { fontSize: 11, fontWeight: '700', color: '#4B5563' },
  // Section
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: '#145A32' },
  seeAll: { color: '#D4A843', fontSize: 13, fontWeight: '700', marginRight: 2 },
  // Grid / Cards
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 10, marginBottom: 20 },
  gridCard: {
    width: Platform.OS === 'web' ? 140 : '31%',
    maxWidth: 160,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 6,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  imgWrap: { width: '100%', aspectRatio: 1, borderRadius: 8, backgroundColor: '#F9FAFB', overflow: 'hidden', marginBottom: 6 },
  img: { width: '100%', height: '100%', resizeMode: 'cover' },
  badge: { position: 'absolute', top: 0, left: 0, backgroundColor: '#D4A843', paddingHorizontal: 4, paddingVertical: 2, borderBottomRightRadius: 8 },
  badgeText: { color: '#145A32', fontSize: 8, fontWeight: '900' },
  cardInfo: { flex: 1, paddingBottom: 2 },
  cTitle: { fontSize: 10, fontWeight: '800', color: '#1F2937', marginBottom: 4 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' },
  cNprice: { fontSize: 13, fontWeight: '900', color: '#145A32' },
  cOprice: { fontSize: 9, color: '#9CA3AF', textDecorationLine: 'line-through' },
  addBtn: { backgroundColor: 'rgba(212,168,67,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  addBtnText: { color: '#D4A843', fontSize: 10, fontWeight: '900' },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#145A32', paddingVertical: 14, borderRadius: 14, marginTop: 4, marginBottom: 24 },
  seeAllBtnText: { color: '#FFF', fontWeight: '900', fontSize: 15, marginRight: 6 },
  
  // Floating Cart
  floatingCartWrap: { position: 'absolute', bottom: 16, left: 16, right: 16, zIndex: 100 },
  floatingCartBox: { backgroundColor: '#145A32', borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 20, paddingRight: 8, paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 12 },
  fcInfo: { flexDirection: 'column' },
  fcItems: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  fcToPrice: { color: '#D4A843', fontSize: 18, fontWeight: '900' },
  fcBtn: { backgroundColor: '#D4A843', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, gap: 8 },
  fcBtnText: { color: '#145A32', fontWeight: '900', fontSize: 14 },
  
  // Scratch Card
  scratchOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  scratchModalBox: { backgroundColor: '#FFF', borderRadius: 32, padding: 24, width: '100%', maxWidth: 360, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 15 },
  skipModalBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, marginBottom: 10 },
  scCongrats: { fontSize: 24, fontWeight: '900', color: '#111827', marginBottom: 4, textAlign: 'center' },
  scSub: { fontSize: 14, color: '#6B7280', fontWeight: 'bold', textAlign: 'center', marginBottom: 24 },
  scClaimBtn: { marginTop: 24, width: '100%', alignItems: 'center', backgroundColor: '#145A32', paddingVertical: 16, borderRadius: 16, shadowColor: '#145A32', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
});
