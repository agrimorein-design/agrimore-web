import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, TouchableOpacity, TextInput, Alert } from 'react-native';
import { db } from '../../firebase/config';
import { collection, onSnapshot, doc, deleteDoc, addDoc, updateDoc, getDocs } from 'firebase/firestore';
import { Plus, X, Tag, Percent, Trash2, CheckCircle, Circle, ChevronDown, Gift } from 'lucide-react-native';

const font = { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' };

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [couponType, setCouponType] = useState('percentage'); // 'percentage' | 'flat' | 'bogo'
  const [buyProductId, setBuyProductId] = useState('');
  const [freeProductId, setFreeProductId] = useState('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showBuyDropdown, setShowBuyDropdown] = useState(false);
  const [showFreeDropdown, setShowFreeDropdown] = useState(false);

  const openForm = (c: any = null) => {
    if (c) {
      setEditId(c.id);
      setCode(c.code);
      setCouponType(c.type || 'percentage');
      setDiscount(c.discount?.toString() || '');
      setMinOrder(c.minOrder?.toString() || '');
      setMaxDiscount(c.maxDiscount?.toString() || '');
      setBuyProductId(c.buyProductId || '');
      setFreeProductId(c.freeProductId || '');
    } else {
      setEditId(null);
      setCode(''); setDiscount(''); setMinOrder(''); setMaxDiscount('');
      setCouponType('percentage'); setBuyProductId(''); setFreeProductId('');
    }
    setAdding(true);
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'coupons'), (snap) => {
      setCoupons(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    getDocs(collection(db, 'products')).then(snap => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, []);

  const handleSave = async () => {
    if (!code) { Alert.alert('Error', 'Code required'); return; }
    if (couponType === 'percentage' || couponType === 'flat') {
      if (!discount) { Alert.alert('Error', 'Discount amount required'); return; }
    }
    if (couponType === 'bogo') {
      if (!buyProductId || !freeProductId) { Alert.alert('Error', 'Buy & Free products required for BOGO'); return; }
    }
    
    setSaving(true);
    try {
      const payload: any = {
        code: code.toUpperCase(),
        type: couponType,
        minOrder: parseFloat(minOrder) || 0,
        isActive: true,
        updatedAt: new Date()
      };
      
      if (couponType === 'percentage') {
        payload.discount = parseFloat(discount) || 0;
        payload.maxDiscount = parseFloat(maxDiscount) || 0;
      } else if (couponType === 'flat') {
        payload.discount = parseFloat(discount) || 0;
      } else if (couponType === 'bogo') {
        payload.buyProductId = buyProductId;
        payload.freeProductId = freeProductId;
      }

      if (editId) {
        await updateDoc(doc(db, 'coupons', editId), payload);
      } else {
        payload.usageCount = 0;
        payload.createdAt = new Date();
        await addDoc(collection(db, 'coupons'), payload);
      }
      
      setCode(''); setDiscount(''); setMinOrder(''); setMaxDiscount('');
      setCouponType('percentage'); setBuyProductId(''); setFreeProductId('');
      setAdding(false);
    } catch (e: any) { Alert.alert('Error', e.message); }
    setSaving(false);
  };

  const handleExpire = async (id: string) => {
    await updateDoc(doc(db, 'coupons', id), { isActive: false });
  };

  const handleDelete = async (id: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this coupon permanently from the database?')) {
        try {
          await deleteDoc(doc(db, 'coupons', id));
          Platform.OS === 'web' ? window.alert('✅ Coupon deleted from Backend') : Alert.alert('Notice', '✅ Coupon deleted from Backend');
        } catch (e: any) {
          Platform.OS === 'web' ? window.alert('❌ Error: ' + e.message) : Alert.alert('Notice', '❌ Error: ' + e.message);
        }
      }
    } else {
      Alert.alert('Delete', 'Remove this coupon?', [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
             try {
               await deleteDoc(doc(db, 'coupons', id));
               Alert.alert('Success', '✅ Coupon deleted from Backend');
             } catch (e: any) {
               Alert.alert('Error', '❌ Error: ' + e.message);
             }
          } 
        }
      ]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    const msg = `Are you sure you want to delete ${selectedIds.length} coupons?`;
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) {
        Promise.all(selectedIds.map(id => deleteDoc(doc(db, 'coupons', id))))
          .then(() => { setSelectedIds([]); setIsSelectMode(false); Platform.OS === 'web' ? window.alert('Coupons deleted successfully') : Alert.alert('Notice', 'Coupons deleted successfully'); })
          .catch(e => Platform.OS === 'web' ? window.alert('Error: ' + e.message) : Alert.alert('Notice', 'Error: ' + e.message));
      }
    } else {
      Alert.alert('Bulk Delete', msg, [
        { text: 'Cancel' },
        { 
          text: 'Delete All', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await Promise.all(selectedIds.map(id => deleteDoc(doc(db, 'coupons', id))));
              setSelectedIds([]);
              setIsSelectMode(false);
              Alert.alert('Success', 'Coupons deleted successfully');
            } catch(e:any) { Alert.alert('Error', e.message); }
          }
        }
      ]);
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(x => x !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedIds([]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === coupons.length && coupons.length > 0) setSelectedIds([]);
    else setSelectedIds(coupons.map(c => c.id));
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#3B82F6" /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View><Text style={[font, s.hTitle]}>Coupons</Text><Text style={[font, s.hSub]}>{coupons.length} total</Text></View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {isSelectMode && selectedIds.length > 0 && (
            <TouchableOpacity style={s.bulkDelBtn} onPress={handleBulkDelete}>
              <Trash2 color="#FFF" size={16} />
              <Text style={{ color: '#FFF', fontWeight: 'bold', marginLeft: 6, fontSize: 12 }}>Delete ({selectedIds.length})</Text>
            </TouchableOpacity>
          )}
          {!adding && !isSelectMode && (
            <TouchableOpacity style={s.addBtn} onPress={() => openForm()}>
              <Plus color="#FFF" size={16} />
              <Text style={[font,{color:'#FFF',fontWeight:'bold',marginLeft:4,fontSize:13}]}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isSelectMode && (
        <View style={s.selectAllRow}>
          <TouchableOpacity style={s.selAllBtn} onPress={toggleSelectAll}>
            {selectedIds.length === coupons.length && coupons.length > 0 ? <CheckCircle color="#3B82F6" size={20} /> : <Circle color="#9CA3AF" size={20} />}
            <Text style={[font, { marginLeft: 8, fontSize: 14, color: selectedIds.length === coupons.length && coupons.length > 0 ? '#3B82F6' : '#6B7280', fontWeight: '700' }]}>
              Select All
            </Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={[font, { fontSize: 12, color: '#9CA3AF' }]}>{selectedIds.length} selected</Text>
            <TouchableOpacity onPress={exitSelectMode} style={{ padding: 4 }}><X color="#9CA3AF" size={20} /></TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {adding && (
          <View style={s.formCard}>
            <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:16}}>
              <Text style={[font,{fontSize:18,fontWeight:'800',color:'#111827'}]}>{editId ? 'Edit Coupon' : 'New Coupon'}</Text>
              <TouchableOpacity onPress={() => setAdding(false)}><X color="#6B7280" size={22} /></TouchableOpacity>
            </View>
            <Text style={[font,s.label]}>Coupon Type</Text>
            <TouchableOpacity style={s.dropdown} onPress={() => setShowTypeDropdown(!showTypeDropdown)}>
              <Text style={[font, { color: '#111827', fontSize: 14 }]}>{couponType.toUpperCase()}</Text>
              <ChevronDown color="#9CA3AF" size={16} />
            </TouchableOpacity>
            {showTypeDropdown && (
              <View style={s.dropdownList}>
                {['percentage', 'flat', 'bogo'].map(t => (
                  <TouchableOpacity key={t} style={[s.dropdownItem, couponType === t && { backgroundColor: '#EFF6FF' }]}
                    onPress={() => { setCouponType(t); setShowTypeDropdown(false); }}>
                    <Text style={[font, { color: couponType === t ? '#3B82F6' : '#374151', fontSize: 14 }]}>{t.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={[font,s.label]}>Coupon Code</Text>
            <TextInput style={[font,s.input]} value={code} onChangeText={setCode} placeholder="SAVE20" autoCapitalize="characters" />
            
            {couponType === 'bogo' ? (
              <>
                <Text style={[font,s.label]}>Buy Product</Text>
                <TouchableOpacity style={s.dropdown} onPress={() => setShowBuyDropdown(!showBuyDropdown)}>
                  <Text style={[font, { color: buyProductId ? '#111827' : '#9CA3AF', fontSize: 14 }]}>
                    {products.find(p => p.id === buyProductId)?.name || 'Select Product...'}
                  </Text>
                  <ChevronDown color="#9CA3AF" size={16} />
                </TouchableOpacity>
                {showBuyDropdown && (
                  <ScrollView style={[s.dropdownList, { maxHeight: 150 }]}>
                    {products.map(p => (
                      <TouchableOpacity key={p.id} style={s.dropdownItem} onPress={() => { setBuyProductId(p.id); setShowBuyDropdown(false); }}>
                        <Text style={[font, { fontSize: 14 }]}>{p.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                <Text style={[font,s.label]}>Free Product</Text>
                <TouchableOpacity style={s.dropdown} onPress={() => setShowFreeDropdown(!showFreeDropdown)}>
                  <Text style={[font, { color: freeProductId ? '#111827' : '#9CA3AF', fontSize: 14 }]}>
                    {products.find(p => p.id === freeProductId)?.name || 'Select Product...'}
                  </Text>
                  <ChevronDown color="#9CA3AF" size={16} />
                </TouchableOpacity>
                {showFreeDropdown && (
                  <ScrollView style={[s.dropdownList, { maxHeight: 150 }]}>
                    {products.map(p => (
                      <TouchableOpacity key={p.id} style={s.dropdownItem} onPress={() => { setFreeProductId(p.id); setShowFreeDropdown(false); }}>
                        <Text style={[font, { fontSize: 14 }]}>{p.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </>
            ) : (
              <View style={{flexDirection:'row',gap:10}}>
                <View style={{flex:1}}>
                  <Text style={[font,s.label]}>{couponType === 'flat' ? 'Flat Discount ₹' : 'Discount %'}</Text>
                  <TextInput style={[font,s.input]} value={discount} onChangeText={setDiscount} keyboardType="numeric" placeholder={couponType === 'flat' ? '50' : '20'} />
                </View>
                <View style={{flex:1}}>
                  <Text style={[font,s.label]}>Min Order ₹</Text>
                  <TextInput style={[font,s.input]} value={minOrder} onChangeText={setMinOrder} keyboardType="numeric" placeholder="200" />
                </View>
              </View>
            )}

            {couponType === 'percentage' && (
              <>
                <Text style={[font,s.label]}>Max Discount ₹</Text>
                <TextInput style={[font,s.input]} value={maxDiscount} onChangeText={setMaxDiscount} keyboardType="numeric" placeholder="100" />
              </>
            )}
            <TouchableOpacity style={[s.saveBtn,saving&&{opacity:0.5}]} onPress={handleSave} disabled={saving}>
              {saving?<ActivityIndicator color="#FFF"/>:<Text style={[font,s.saveBtnTxt]}>{editId ? 'Update Coupon' : 'Save Coupon'}</Text>}
            </TouchableOpacity>
          </View>
        )}

        {coupons.map(c => {
          const isSelected = selectedIds.includes(c.id);
          return (
            <View 
              key={c.id} 
              style={[s.card, !c.isActive && { opacity: 0.5 }, isSelected && { borderColor: '#3B82F6', borderWidth: 2 }]}
            >
              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center' }}
                activeOpacity={isSelectMode ? 0.7 : 1}
                onLongPress={() => { if (!isSelectMode){ setIsSelectMode(true); toggleSelect(c.id); } }}
                onPress={() => isSelectMode ? toggleSelect(c.id) : null}
              >
                {isSelectMode && (
                  <View style={{ padding: 12, justifyContent: 'center' }}>
                    {isSelected ? <CheckCircle color="#3B82F6" size={24} /> : <Circle color="#D1D5DB" size={24} />}
                  </View>
                )}
                <View style={[s.cardLeft, isSelectMode && { borderTopLeftRadius: 14, borderBottomLeftRadius: 14 }, c.type === 'bogo' && { backgroundColor: '#8B5CF6' }, c.type === 'flat' && { backgroundColor: '#F59E0B' }]}>
                  {c.type === 'bogo' ? (
                    <View style={s.discBadge}><Gift color="#FFF" size={18} /><Text style={[font,{color:'#FFF',fontWeight:'900',fontSize:15,marginLeft:4}]}>BOGO</Text></View>
                  ) : c.type === 'flat' ? (
                    <View style={s.discBadge}><Text style={[font,{color:'#FFF',fontWeight:'900',fontSize:18,marginLeft:2}]}>₹{c.discount}</Text></View>
                  ) : (
                    <View style={s.discBadge}><Percent color="#FFF" size={14} /><Text style={[font,{color:'#FFF',fontWeight:'900',fontSize:18,marginLeft:4}]}>{c.discount}%</Text></View>
                  )}
                </View>
                <View style={[s.cardCenter, { flex: 1 }]}>
                  <Text style={[font,s.codeText]}>{c.code}</Text>
                  {c.type === 'bogo' ? (
                    <Text style={[font,s.couponMeta]} numberOfLines={2}>
                      Buy {products.find(p=>p.id===c.buyProductId)?.name || 'Item'} get {products.find(p=>p.id===c.freeProductId)?.name || 'Item'}
                    </Text>
                  ) : c.type === 'flat' ? (
                    <Text style={[font,s.couponMeta]}>Min ₹{c.minOrder || 0}</Text>
                  ) : (
                    <Text style={[font,s.couponMeta]}>Min ₹{c.minOrder || 0} • Max ₹{c.maxDiscount || '∞'}</Text>
                  )}
                  <Text style={[font,{fontSize:11,color:'#9CA3AF',marginTop:4}]}>{c.usageCount || 0} uses • {c.isActive ? '🟢 Active' : '🔴 Expired'}</Text>
                </View>
              </TouchableOpacity>

              <View style={s.actionsRow}>
                <TouchableOpacity style={s.editBtn} onPress={() => openForm(c)}>
                  <Text style={[font, { fontSize: 13, fontWeight: 'bold', color: '#3B82F6' }]}>Edit</Text>
                </TouchableOpacity>
                {c.isActive && (
                  <TouchableOpacity style={s.expireBtn} onPress={() => handleExpire(c.id)}>
                    <Text style={[font, { fontSize: 13, fontWeight: 'bold', color: '#F59E0B' }]}>Expire</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.delBtn2} onPress={() => handleDelete(c.id)}>
                  <X color="#EF4444" size={14} />
                  <Text style={[font, { fontSize: 13, fontWeight: 'bold', color: '#EF4444' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#F8FAFC'},
  center:{flex:1,alignItems:'center',justifyContent:'center'},
  header:{paddingTop:50,paddingBottom:16,paddingHorizontal:20,backgroundColor:'#FFF',flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderBottomWidth:1,borderBottomColor:'#F1F5F9'},
  hTitle:{fontSize:24,fontWeight:'800',color:'#111827'},
  hSub:{fontSize:12,color:'#9CA3AF',marginTop:2},
  addBtn:{flexDirection:'row',alignItems:'center',backgroundColor:'#3B82F6',paddingHorizontal:14,paddingVertical:10,borderRadius:12},
  formCard:{backgroundColor:'#FFF',borderRadius:20,padding:20,marginBottom:20,borderWidth:1,borderColor:'#E5E7EB'},
  label:{fontSize:12,fontWeight:'700',color:'#374151',marginBottom:6,marginTop:14},
  input:{backgroundColor:'#F9FAFB',paddingHorizontal:16,paddingVertical:14,borderRadius:12,borderWidth:1,borderColor:'#E5E7EB',fontSize:14,color:'#111827'},
  dropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  dropdownList: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 4, marginBottom: 8 },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  saveBtn:{backgroundColor:'#3B82F6',paddingVertical:16,borderRadius:14,alignItems:'center',marginTop:20},
  saveBtnTxt:{color:'#FFF',fontWeight:'800',fontSize:16},
  card:{backgroundColor:'#FFF',borderRadius:16,marginBottom:16,borderWidth:2,borderColor:'#E5E7EB',borderStyle:'dashed',overflow:'hidden', paddingBottom: 12},
  cardLeft:{backgroundColor:'#3B82F6',paddingHorizontal:16,paddingVertical:20,alignItems:'center',justifyContent:'center', borderBottomRightRadius: 14},
  discBadge:{flexDirection:'row',alignItems:'center'},
  cardCenter:{flex:1,paddingHorizontal:14,paddingVertical:12},
  codeText:{fontSize:18,fontWeight:'900',color:'#111827',letterSpacing:2},
  couponMeta:{fontSize:12,color:'#6B7280',marginTop:4},
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 10, paddingHorizontal: 14, gap: 10 },
  expireBtn:{backgroundColor:'#FFFBEB',paddingHorizontal:14,paddingVertical:8,borderRadius:10,alignItems:'center'},
  editBtn:{backgroundColor:'#EFF6FF',paddingHorizontal:14,paddingVertical:8,borderRadius:10,alignItems:'center'},
  delBtn2:{flexDirection: 'row', backgroundColor:'#FEF2F2',paddingHorizontal: 14, paddingVertical: 8,borderRadius:10,alignItems:'center', gap: 4},
  bulkDelBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EF4444', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  selectAllRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#FAFAFA', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  selAllBtn: { flexDirection: 'row', alignItems: 'center' },
});
