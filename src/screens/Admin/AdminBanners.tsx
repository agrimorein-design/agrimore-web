import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, TouchableOpacity, TextInput, Alert, Image } from 'react-native';
import { db } from '../../firebase/config';
import { collection, onSnapshot, doc, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { Plus, X, Image as ImgIcon, Trash2, CheckCircle, Circle } from 'lucide-react-native';

const font = { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' };

export default function AdminBanners() {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [bannerType, setBannerType] = useState<'desktop' | 'mobile'>('desktop');

  const openForm = (b: any = null) => {
    if (b) {
      setEditId(b.id);
      setTitle(b.title || '');
      setImageUrl(b.imageUrl || '');
      setBannerType(b.bannerType || 'desktop');
    } else {
      setEditId(null);
      setTitle(''); setImageUrl(''); setBannerType('desktop');
    }
    setAdding(true);
  };

  const handleUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission Denied', 'Need camera roll access.'); return; }
      
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const asset = result.assets[0];
        const reqW = bannerType === 'desktop' ? 1200 : 800;
        const reqH = 400;

        if (asset.width !== reqW || asset.height !== reqH) {
          Alert.alert('Invalid Size', `Please upload banner in ${reqW} × ${reqH} px size only. Selected image is ${asset.width} × ${asset.height} px.`);
          return;
        }

        setUploadingImg(true);
        const imgUri = result.assets[0].uri;
        const blob: any = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.onload = function() { resolve(xhr.response); };
          xhr.onerror = function() { reject(new TypeError('Network request failed')); };
          xhr.responseType = 'blob';
          xhr.open('GET', imgUri, true);
          xhr.send(null);
        });
        
        const storage = getStorage();
        const filename = `banners/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const storageRef = ref(storage, filename);
        
        await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
        const downloadUrl = await getDownloadURL(storageRef);
        setImageUrl(downloadUrl);
      }
    } catch (e: any) { Alert.alert('Upload Error', e.message); }
    finally { setUploadingImg(false); }
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'banners'), (snap) => {
      setBanners(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    if (!imageUrl) { Alert.alert('Error', 'Image URL required'); return; }
    setSaving(true);
    try {
      if (editId) {
        await updateDoc(doc(db, 'banners', editId), { title, imageUrl, bannerType, updatedAt: new Date() });
      } else {
        await addDoc(collection(db, 'banners'), { title, imageUrl, bannerType, isActive: true, createdAt: new Date() });
      }
      setTitle(''); setImageUrl(''); setAdding(false);
    } catch (e: any) { Alert.alert('Error', e.message); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this banner permanently from the database?')) {
        try {
          await deleteDoc(doc(db, 'banners', id));
          window.alert('✅ Real delete from backend successful');
        } catch (e: any) {
          window.alert('❌ Database Error: ' + e.message);
        }
      }
    } else {
      Alert.alert('Delete', 'Remove this banner?', [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'banners', id));
              Alert.alert('Success', '✅ Real delete from backend successful');
            } catch (e: any) {
              Alert.alert('Error', '❌ Database Error: ' + e.message);
            }
          } 
        }
      ]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    const msg = `Are you sure you want to delete ${selectedIds.length} banners?`;
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) {
        Promise.all(selectedIds.map(id => deleteDoc(doc(db, 'banners', id))))
          .then(() => { setSelectedIds([]); setIsSelectMode(false); window.alert('Selected banners deleted successfully'); })
          .catch(e => window.alert('Error: ' + e.message));
      }
    } else {
      Alert.alert('Bulk Delete', msg, [
        { text: 'Cancel' },
        { 
          text: 'Delete All', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await Promise.all(selectedIds.map(id => deleteDoc(doc(db, 'banners', id))));
              setSelectedIds([]);
              setIsSelectMode(false);
              Alert.alert('Success', 'Selected banners deleted successfully');
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
    if (selectedIds.length === banners.length) setSelectedIds([]);
    else setSelectedIds(banners.map(b => b.id));
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#3B82F6" /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View><Text style={[font, s.hTitle]}>Banners</Text><Text style={[font, s.hSub]}>{banners.length} total</Text></View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {isSelectMode && selectedIds.length > 0 && (
            <TouchableOpacity style={s.bulkDelBtn} onPress={handleBulkDelete}>
              <Trash2 color="#FFF" size={16} />
              <Text style={{ color: '#FFF', fontWeight: 'bold', marginLeft: 6, fontSize: 12 }}>Delete ({selectedIds.length})</Text>
            </TouchableOpacity>
          )}
          {!adding && !isSelectMode && (
            <TouchableOpacity style={s.addBtn} onPress={() => openForm(null)}>
              <Plus color="#FFF" size={16} />
              <Text style={[font,{color:'#FFF',fontWeight:'bold',marginLeft:4,fontSize:13}]}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isSelectMode && (
        <View style={s.selectAllRow}>
          <TouchableOpacity style={s.selAllBtn} onPress={toggleSelectAll}>
            {selectedIds.length === banners.length && banners.length > 0 ? <CheckCircle color="#3B82F6" size={20} /> : <Circle color="#9CA3AF" size={20} />}
            <Text style={[font, { marginLeft: 8, fontSize: 14, color: selectedIds.length === banners.length && banners.length > 0 ? '#3B82F6' : '#6B7280', fontWeight: '700' }]}>
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
              <Text style={[font,{fontSize:18,fontWeight:'800',color:'#111827'}]}>{editId ? 'Edit Banner' : 'New Banner'}</Text>
              <TouchableOpacity onPress={() => setAdding(false)}><X color="#6B7280" size={22} /></TouchableOpacity>
            </View>

            <Text style={[font,s.label, {marginTop: 0}]}>Banner Target Device</Text>
            <View style={{flexDirection: 'row', gap: 10, marginBottom: 10}}>
              <TouchableOpacity style={[s.typeBtn, bannerType === 'desktop' && s.typeBtnAct]} onPress={() => setBannerType('desktop')}>
                <Text style={{color: bannerType === 'desktop' ? '#FFF' : '#374151', fontWeight:'bold', fontSize: 13}}>Desktop (1200x400)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.typeBtn, bannerType === 'mobile' && s.typeBtnAct]} onPress={() => setBannerType('mobile')}>
                <Text style={{color: bannerType === 'mobile' ? '#FFF' : '#374151', fontWeight:'bold', fontSize: 13}}>Mobile (800x400)</Text>
              </TouchableOpacity>
            </View>

            <Text style={[font,s.label]}>Title (Optional)</Text>
            <TextInput style={[font,s.input]} value={title} onChangeText={setTitle} placeholder="Banner title..." />
            <Text style={[font,s.label]}>Image URL or Direct Upload</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput style={[font,s.input, {flex: 1}]} value={imageUrl} onChangeText={setImageUrl} placeholder="https://..." />
              <TouchableOpacity style={s.uploadBtn} onPress={handleUpload} disabled={uploadingImg}>
                {uploadingImg ? <ActivityIndicator color="#FFF" size="small"/> : <><ImgIcon color="#FFF" size={16} /><Text style={[font,{color:'#FFF',fontWeight:'800',marginLeft:6,fontSize:12}]}>Upload</Text></>}
              </TouchableOpacity>
            </View>
            {imageUrl ? <Image source={{uri:imageUrl}} style={s.preview} /> : (
              <View style={s.uploadArea}>
                <ImgIcon color="#9CA3AF" size={32} />
                <Text style={[font,{color:'#9CA3AF',marginTop:8,fontSize:13}]}>Paste image URL above</Text>
              </View>
            )}
            <TouchableOpacity style={[s.saveBtn,saving&&{opacity:0.5}]} onPress={handleSave} disabled={saving}>
              {saving?<ActivityIndicator color="#FFF"/>:<Text style={[font,s.saveBtnTxt]}>{editId ? 'Update Banner' : 'Save Banner'}</Text>}
            </TouchableOpacity>
          </View>
        )}

        {banners.map(b => {
          const isSelected = selectedIds.includes(b.id);
          return (
            <View 
              key={b.id} 
              style={[s.card, isSelected && { borderColor: '#3B82F6', borderWidth: 2 }]}
            >
              <TouchableOpacity 
                style={{ flex: 1 }}
                activeOpacity={isSelectMode ? 0.7 : 1}
                onLongPress={() => { if (!isSelectMode){ setIsSelectMode(true); toggleSelect(b.id); } }}
                onPress={() => isSelectMode ? toggleSelect(b.id) : null}
              >
                {b.imageUrl ? <Image source={{uri:b.imageUrl}} style={s.bannerImg}/> : (
                  <View style={[s.bannerImg,{alignItems:'center',justifyContent:'center',backgroundColor:'#F3F4F6'}]}><ImgIcon color="#D1D5DB" size={32}/></View>
                )}
                {/* Overlay Checkbox */}
                {isSelectMode && (
                  <View style={s.floatCheck}>
                    {isSelected ? <CheckCircle fill="#FFF" color="#3B82F6" size={28} /> : <Circle fill="rgba(255,255,255,0.7)" color="#9CA3AF" size={28} />}
                  </View>
                )}
                <View style={s.cardBottom}>
                  <View style={{flex: 1}}>
                    <Text style={[font,s.bTitle]} numberOfLines={1}>{b.title || 'Untitled Banner'}</Text>
                    <Text style={[font,{fontSize:11,color:'#9CA3AF',textTransform:'capitalize',fontWeight:'bold',marginTop:2}]}>{b.bannerType || 'Desktop'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
              
              <View style={[s.actionsRow, { position: 'absolute', bottom: 12, right: 12 }]}>
                <TouchableOpacity style={[s.delBtn, { backgroundColor: '#EFF6FF', marginRight: 6 }]} onPress={() => openForm(b)}>
                  <Text style={[font, { fontSize: 13, color: '#3B82F6', fontWeight: '800', paddingHorizontal: 4 }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.delBtn} onPress={() => handleDelete(b.id)}>
                  <X color="#EF4444" size={16}/>
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
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: '#FFF', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  hTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  hSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  addBtn: { flexDirection:'row',alignItems:'center',backgroundColor:'#3B82F6',paddingHorizontal:14,paddingVertical:10,borderRadius:12 },
  formCard: { backgroundColor:'#FFF',borderRadius:20,padding:20,marginBottom:20,borderWidth:1,borderColor:'#E5E7EB' },
  label: { fontSize:12,fontWeight:'700',color:'#374151',marginBottom:6,marginTop:14 },
  input: { backgroundColor:'#F9FAFB',paddingHorizontal:16,paddingVertical:14,borderRadius:12,borderWidth:1,borderColor:'#E5E7EB',fontSize:14,color:'#111827' },
  preview: { width:'100%',height:160,borderRadius:16,marginTop:14,backgroundColor:'#F3F4F6' },
  uploadArea: { width:'100%',height:140,borderRadius:16,borderWidth:2,borderStyle:'dashed',borderColor:'#D1D5DB',alignItems:'center',justifyContent:'center',marginTop:14 },
  saveBtn: { backgroundColor:'#3B82F6',paddingVertical:16,borderRadius:14,alignItems:'center',marginTop:20 },
  saveBtnTxt: { color:'#FFF',fontWeight:'800',fontSize:16 },
  card: { backgroundColor:'#FFF',borderRadius:20,marginBottom:16,overflow:'hidden',borderWidth:1,borderColor:'#F1F5F9' },
  bannerImg: { width:'100%',height:160,backgroundColor:'#E5E7EB' },
  cardBottom: { flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:14 },
  bTitle: { fontSize:15,fontWeight:'700',color:'#374151',flex:1 },
  delBtn: { padding:8,backgroundColor:'#FEF2F2',borderRadius:8 },
  uploadBtn: { flexDirection:'row',alignItems:'center',backgroundColor:'#10B981',paddingHorizontal:16,borderRadius:12,justifyContent:'center' },
  bulkDelBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EF4444', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  selectAllRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#FAFAFA', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  selAllBtn: { flexDirection: 'row', alignItems: 'center' },
  floatCheck: { position: 'absolute', top: 12, left: 12, zIndex: 10, shadowColor:'#000', shadowOffset: {width:0, height:2}, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
  actionsRow: { flexDirection: 'row', alignItems: 'center' },
  typeBtn: { flex: 1, paddingVertical: 12, backgroundColor: '#F3F4F6', borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  typeBtnAct: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
});
