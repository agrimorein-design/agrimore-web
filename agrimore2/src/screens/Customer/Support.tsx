import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Linking, Alert } from 'react-native';
import { ArrowLeft, MessageCircle, Phone, Mail, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react-native';

const font = {
  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  fontStyle: 'italic' as const,
};

const SUPPORT_PHONE = '+917094826587';
const SUPPORT_DISPLAY = '+91 7094826587';
const SUPPORT_EMAIL = 'agrimorein@gmail.com';

const openLink = (url: string) => {
  Linking.canOpenURL(url).then(supported => {
    if (supported) Linking.openURL(url);
    else Alert.alert('Error', 'Unable to open this link');
  });
};

const FAQS = [
  { q: 'How do I track my order?', a: 'Go to Orders tab and tap on any active order to see the real-time tracking with delivery updates.' },
  { q: 'What is the return policy?', a: 'We offer easy returns within 24 hours of delivery for fresh products. Just contact our support team.' },
  { q: 'How does the wallet work?', a: 'Add money to your Agrimore wallet for instant payments. You also earn cashback on eligible orders!' },
  { q: 'How can I change my delivery address?', a: 'Go to Profile → Addresses to add or update your delivery addresses. You can also change during checkout.' },
  { q: 'Is Cash on Delivery available?', a: 'Yes! We offer COD for all orders. You can pay via cash or UPI when the delivery arrives.' },
];

export default function Support({ navigation }: any) {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const contactMethods = [
    { icon: MessageCircle, label: 'WhatsApp', desc: SUPPORT_DISPLAY, color: '#25D366', bg: '#F0FDF4', onPress: () => openLink(`https://wa.me/${SUPPORT_PHONE.replace('+', '')}?text=Hi%20Agrimore%20Support`) },
    { icon: Phone, label: 'Call Us', desc: SUPPORT_DISPLAY, color: '#16A34A', bg: '#F0FDF4', onPress: () => openLink(`tel:${SUPPORT_PHONE}`) },
    { icon: Mail, label: 'Email', desc: SUPPORT_EMAIL, color: '#D4A843', bg: '#FFFBEB', onPress: () => openLink(`mailto:${SUPPORT_EMAIL}`) },
    { icon: HelpCircle, label: 'FAQ', desc: 'Quick answers', color: '#8B5CF6', bg: '#F5F3FF', onPress: () => {} },
  ];

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <ArrowLeft color="#D4A843" size={22} />
        </TouchableOpacity>
        <Text style={[font, s.headerTitle]}>Help & Support</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Contact Methods 2x2 */}
        <Text style={[font, s.sectionTitle]}>Contact Us</Text>
        <View style={s.contactGrid}>
          {contactMethods.map((method, i) => {
            const Icon = method.icon;
            return (
              <TouchableOpacity key={i} style={s.contactCard} onPress={method.onPress}>
                <View style={[s.contactIcon, { backgroundColor: method.bg }]}>
                  <Icon color={method.color} size={24} />
                </View>
                <Text style={[font, s.contactLabel]}>{method.label}</Text>
                <Text style={[font, s.contactDesc]}>{method.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* FAQ Accordion */}
        <Text style={[font, s.sectionTitle]}>Frequently Asked Questions</Text>
        {FAQS.map((faq, i) => {
          const isExpanded = expandedFaq === i;
          return (
            <TouchableOpacity
              key={i}
              style={[s.faqCard, isExpanded && s.faqCardExpanded]}
              onPress={() => setExpandedFaq(isExpanded ? null : i)}
              activeOpacity={0.7}
            >
              <View style={s.faqHeader}>
                <Text style={[font, s.faqQuestion]}>{faq.q}</Text>
                {isExpanded ? <ChevronUp color="#D4A843" size={20} /> : <ChevronDown color="#9CA3AF" size={20} />}
              </View>
              {isExpanded && (
                <Text style={[font, s.faqAnswer]}>{faq.a}</Text>
              )}
            </TouchableOpacity>
          );
        })}

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
  scroll: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#145A32', marginBottom: 16 },
  contactGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 28 },
  contactCard: {
    width: '48%', backgroundColor: '#FFF', borderRadius: 20, padding: 20, alignItems: 'center',
    marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  contactIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  contactLabel: { fontSize: 14, fontWeight: '900', color: '#1F2937', marginBottom: 4 },
  contactDesc: { fontSize: 11, color: '#9CA3AF', textAlign: 'center' },
  faqCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 18, marginBottom: 10,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  faqCardExpanded: { borderColor: 'rgba(212,168,67,0.3)', backgroundColor: '#FFFBEB' },
  faqHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  faqQuestion: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1F2937', marginRight: 10 },
  faqAnswer: { fontSize: 13, color: '#6B7280', lineHeight: 20, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
});
