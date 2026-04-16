import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl, StyleSheet, Platform, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { db } from '../../firebase/config';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Package, Truck, CheckCircle, Clock, ChefHat, Navigation, Star, RefreshCw, ArrowLeft } from 'lucide-react-native';

const font = {
  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  fontStyle: 'italic' as const,
};

export default function Orders({ navigation }: any) {
  const { userData } = useAuth();
  const { addToCart } = useCart();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!userData) return;
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', userData.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const ordersData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(ordersData);
      setLoading(false);
      setRefreshing(false);
    });
    return () => unsub();
  }, [userData]);

  const onRefresh = () => {
    setRefreshing(true);
    // onSnapshot handles it, but we can trigger it
  };

  const handleReorder = (order: any) => {
    if (order.products && order.products.length > 0) {
      order.products.forEach((p: any) => {
        addToCart({
          id: p.id,
          name: p.name,
          price: p.price,
          discountPrice: p.discountPrice,
          image: p.image || '',
          quantity: p.quantity || 1,
          stock: p.stock || 10,
        });
      });
      Alert.alert('Added to Cart', 'All items from this order have been added to your cart!');
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'placed': return { color: '#3B82F6', bg: '#EFF6FF', label: 'Order Placed', Icon: Package };
      case 'accepted': return { color: '#8B5CF6', bg: '#F5F3FF', label: 'Accepted', Icon: CheckCircle };
      case 'preparing': return { color: '#F59E0B', bg: '#FFFBEB', label: 'Preparing', Icon: ChefHat };
      case 'out for delivery': return { color: '#2563EB', bg: '#DBEAFE', label: 'Out for Delivery', Icon: Truck };
      case 'delivered': return { color: '#16A34A', bg: '#F0FDF4', label: 'Delivered', Icon: CheckCircle };
      default: return { color: '#6B7280', bg: '#F3F4F6', label: status, Icon: Clock };
    }
  };

  if (loading) {
    return (
      <View style={s.loadingRoot}>
        <ActivityIndicator size="large" color="#145A32" />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
            <ArrowLeft color="#D4A843" size={28} />
          </TouchableOpacity>
          <View>
            <Text style={[font, s.headerTitle]}>My Orders</Text>
            <Text style={[font, s.headerSub]}>{orders.length} Total</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#145A32']} />}
      >
        {orders.length === 0 ? (
          <View style={s.emptyWrap}>
            <Package size={64} color="#D1D5DB" />
            <Text style={[font, s.emptyTitle]}>No Orders Yet</Text>
            <Text style={[font, s.emptySub]}>Place an order to see its status here.</Text>
          </View>
        ) : (
          orders.map((order) => {
            const info = getStatusInfo(order.status);
            const StatusIcon = info.Icon;
            const isDelivered = order.status === 'delivered';
            const isOutForDelivery = order.status === 'out for delivery';
            const productEmojis = (order.products || []).slice(0, 4).map((_: any, i: number) =>
              ['🍎', '🥦', '🥛', '🌾'][i % 4]
            ).join(' ');

            return (
              <View key={order.id} style={s.orderCard}>
                <View style={s.orderHeader}>
                  <View>
                    <Text style={[font, s.orderId]}>#{order.id.substring(0, 8).toUpperCase()}</Text>
                    <Text style={[font, s.orderDate]}>
                      {new Date(order.createdAt?.toDate?.() || Date.now()).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </Text>
                  </View>
                  <View style={[s.statusPill, { backgroundColor: info.bg }]}>
                    <Text style={[font, s.statusText, { color: info.color }]}>{info.label}</Text>
                  </View>
                </View>

                {/* Product emojis + items info */}
                <View style={s.orderBody}>
                  <View style={s.emojiRow}>
                    <Text style={{ fontSize: 20 }}>{productEmojis}</Text>
                  </View>
                  <View>
                    <Text style={[font, s.itemCount]}>{order.products?.length || 0} Items</Text>
                    <Text style={[font, s.orderTotal]}>₹{parseFloat(order.totalAmount || 0).toFixed(2)}</Text>
                  </View>
                </View>

                {/* Status bar */}
                <View style={s.statusBar}>
                  <StatusIcon color={info.color} size={16} />
                  <Text style={[font, s.statusBarText]}>
                    {isDelivered ? 'Delivered successfully ✅' : isOutForDelivery ? 'Your order is on its way! 🚚' : 'Your order is being processed'}
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={s.actionRow}>
                  {isOutForDelivery && (
                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: '#EFF6FF' }]}
                      onPress={() => navigation.navigate('OrderTracking', { order })}
                    >
                      <Navigation color="#3B82F6" size={14} />
                      <Text style={[font, s.actionText, { color: '#3B82F6' }]}>Track</Text>
                    </TouchableOpacity>
                  )}
                  {isDelivered && (
                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: '#FFFBEB' }]}
                      onPress={() => navigation.navigate('RateOrder', { order })}
                    >
                      <Star color="#D4A843" size={14} />
                      <Text style={[font, s.actionText, { color: '#D4A843' }]}>Rate</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: '#F0FDF4' }]}
                    onPress={() => handleReorder(order)}
                  >
                    <RefreshCw color="#16A34A" size={14} />
                    <Text style={[font, s.actionText, { color: '#16A34A' }]}>Reorder</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' },
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
  headerTitle: { color: '#D4A843', fontSize: 32, fontWeight: '900' },
  headerSub: { color: '#FFF', fontSize: 14, opacity: 0.8, marginTop: 4 },
  scroll: { paddingHorizontal: 20, paddingTop: 20 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: '#1F2937', marginTop: 16 },
  emptySub: { fontSize: 14, color: '#9CA3AF', marginTop: 8 },
  orderCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 12 },
  orderId: { fontSize: 12, fontWeight: '900', color: '#6B7280', letterSpacing: 1 },
  orderDate: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '900' },
  orderBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  emojiRow: { flexDirection: 'row' },
  itemCount: { fontSize: 14, fontWeight: '700', color: '#1F2937', textAlign: 'right' },
  orderTotal: { fontSize: 20, fontWeight: '900', color: '#145A32', textAlign: 'right' },
  statusBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB',
    padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 12,
  },
  statusBarText: { marginLeft: 10, fontSize: 13, color: '#4B5563', fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 12,
  },
  actionText: { fontSize: 12, fontWeight: '900', marginLeft: 6 },
});
