import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';

const font = {
  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  fontStyle: 'italic' as const,
};

export default function Notifications({ navigation }: any) {
  const { userData } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!userData?.uid) { setLoading(false); return; }
      try {
        const snap = await getDocs(collection(db, 'users', userData.uid, 'notifications'));
        const list: any[] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setNotifications(list);
      } catch (e) {
        console.error('Error fetching notifications:', e);
      }
      setLoading(false);
    };
    fetchNotifications();
  }, [userData]);

  const unreadCount = notifications.filter(n => n.unread).length;

  if (loading) {
    return (
      <View style={s.root}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><ArrowLeft color="#D4A843" size={22} /></TouchableOpacity>
          <Text style={[font, s.headerTitle]}>Notifications</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color="#145A32" /></View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <ArrowLeft color="#D4A843" size={22} />
        </TouchableOpacity>
        <Text style={[font, s.headerTitle]}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={s.unreadBadge}>
            <Text style={[font, s.unreadText]}>{unreadCount}</Text>
          </View>
        )}
        {unreadCount === 0 && <View style={{ width: 38 }} />}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {notifications.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 80 }}>
            <Text style={{ fontSize: 56, marginBottom: 16 }}>🔔</Text>
            <Text style={[font, { fontSize: 20, fontWeight: '900', color: '#1F2937', marginBottom: 8 }]}>No Notifications</Text>
            <Text style={[font, { fontSize: 14, color: '#9CA3AF' }]}>You're all caught up!</Text>
          </View>
        ) : (
          notifications.map((notif) => (
            <View key={notif.id} style={[s.notifCard, notif.unread && s.notifUnread]}>
              <View style={s.emojiWrap}>
                <Text style={s.emoji}>{notif.emoji || '📢'}</Text>
              </View>
              <View style={s.notifContent}>
                <View style={s.notifTop}>
                  <Text style={[font, s.notifTitle]}>{notif.title || 'Notification'}</Text>
                  {notif.unread && <View style={s.unreadDot} />}
                </View>
                <Text style={[font, s.notifBody]}>{notif.body || ''}</Text>
                <Text style={[font, s.notifTime]}>
                  {notif.createdAt?.toDate
                    ? new Date(notif.createdAt.toDate()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                    : notif.time || ''}
                </Text>
              </View>
            </View>
          ))
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
  unreadBadge: {
    backgroundColor: '#EF4444', width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  unreadText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
  scroll: { paddingHorizontal: 20, paddingTop: 20 },
  notifCard: {
    flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 2,
  },
  notifUnread: { backgroundColor: '#FFFBEB', borderColor: 'rgba(212,168,67,0.2)' },
  emojiWrap: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: '#F9FAFB',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  emoji: { fontSize: 22 },
  notifContent: { flex: 1 },
  notifTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  notifTitle: { fontSize: 14, fontWeight: '900', color: '#1F2937', flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D4A843', marginLeft: 8 },
  notifBody: { fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 6 },
  notifTime: { fontSize: 11, color: '#9CA3AF' },
});
