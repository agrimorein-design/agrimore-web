import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Platform } from 'react-native';
import { ArrowLeft, Zap } from 'lucide-react-native';
import { db } from '../../firebase/config';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { useCart } from '../../context/CartContext';

const font = {
  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  fontStyle: 'italic' as const,
};

export default function FlashSale({ navigation }: any) {
  const [products, setProducts] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState({ h: 2, m: 45, s: 30 });
  const { addToCart } = useCart();
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(query(collection(db, 'products'), where('status', '==', 'approved'), limit(8)));
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    load();

    // Countdown timer
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        let { h, m, s } = prev;
        s--;
        if (s < 0) { s = 59; m--; }
        if (m < 0) { m = 59; h--; }
        if (h < 0) { h = 0; m = 0; s = 0; }
        return { h, m, s };
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, []);

  const pad = (n: number) => n.toString().padStart(2, '0');

  const handleAdd = (p: any) => {
    addToCart({
      id: p.id, name: p.name, price: p.price,
      discountPrice: p.discountPrice, image: p.images?.[0] || '',
      quantity: 1, stock: p.stock,
    });
  };

  return (
    <View style={s.root}>
      {/* Amber Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <ArrowLeft color="#FFF" size={22} />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Zap color="#FFF" size={22} fill="#FFF" />
            <Text style={[font, s.headerTitle]}>Flash Sale</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>

        {/* Countdown */}
        <View style={s.countdownRow}>
          <Text style={[font, s.endsIn]}>Ends in</Text>
          <View style={s.timerRow}>
            <View style={s.timerBox}>
              <Text style={[font, s.timerNum]}>{pad(timeLeft.h)}</Text>
              <Text style={[font, s.timerLabel]}>HRS</Text>
            </View>
            <Text style={s.timerColon}>:</Text>
            <View style={s.timerBox}>
              <Text style={[font, s.timerNum]}>{pad(timeLeft.m)}</Text>
              <Text style={[font, s.timerLabel]}>MIN</Text>
            </View>
            <Text style={s.timerColon}>:</Text>
            <View style={s.timerBox}>
              <Text style={[font, s.timerNum]}>{pad(timeLeft.s)}</Text>
              <Text style={[font, s.timerLabel]}>SEC</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.grid}>
          {products.map((p, i) => {
            const flashDiscount = Math.min(50, Math.round(((p.price - (p.discountPrice || p.price * 0.7)) / p.price) * 100));
            const flashPrice = Math.round(p.price * (1 - flashDiscount / 100));
            return (
              <TouchableOpacity key={i} style={s.card} onPress={() => navigation.navigate('ProductDetails', { product: p })}>
                <View style={s.imgWrap}>
                  <Image source={{ uri: p.images?.[0] || 'https://via.placeholder.com/150' }} style={s.img} />
                  <View style={s.flashBadge}>
                    <Zap color="#FFF" size={10} fill="#FFF" />
                    <Text style={[font, s.flashBadgeText]}>{flashDiscount}%</Text>
                  </View>
                </View>
                <Text style={[font, s.pName]} numberOfLines={1}>{p.name}</Text>
                <View style={s.priceRow}>
                  <Text style={[font, s.flashPrice]}>₹{flashPrice}</Text>
                  <Text style={[font, s.oldPrice]}>₹{p.price}</Text>
                </View>
                <TouchableOpacity style={s.addBtn} onPress={() => handleAdd(p)}>
                  <Text style={[font, s.addBtnText]}>ADD</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    backgroundColor: '#F59E0B',
    paddingTop: 54, paddingBottom: 20, paddingHorizontal: 16,
    borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
    shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backBtn: { padding: 8 },
  headerCenter: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: '900', marginLeft: 8 },
  countdownRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  endsIn: { color: '#FFF', fontSize: 14, fontWeight: '700', marginRight: 14, opacity: 0.9 },
  timerRow: { flexDirection: 'row', alignItems: 'center' },
  timerBox: {
    backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8,
    alignItems: 'center', minWidth: 56,
  },
  timerNum: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  timerLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '700', marginTop: 2 },
  timerColon: { color: '#FFF', fontSize: 22, fontWeight: '900', marginHorizontal: 6 },
  scroll: { paddingHorizontal: 16, paddingTop: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: {
    width: '48%', backgroundColor: '#FFF', borderRadius: 20, padding: 10, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
    borderWidth: 1, borderColor: '#FEF3C7',
  },
  imgWrap: { width: '100%', aspectRatio: 1, borderRadius: 16, backgroundColor: '#FFFBEB', overflow: 'hidden', marginBottom: 10 },
  img: { width: '100%', height: '100%', resizeMode: 'cover' },
  flashBadge: {
    position: 'absolute', top: 8, left: 8, backgroundColor: '#EF4444',
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  flashBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '900', marginLeft: 2 },
  pName: { fontSize: 13, fontWeight: '700', color: '#1F2937', marginBottom: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  flashPrice: { fontSize: 16, fontWeight: '900', color: '#EF4444' },
  oldPrice: { fontSize: 12, color: '#9CA3AF', textDecorationLine: 'line-through', marginLeft: 8 },
  addBtn: {
    backgroundColor: '#F59E0B', paddingVertical: 8, borderRadius: 10, alignItems: 'center',
  },
  addBtnText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
});
