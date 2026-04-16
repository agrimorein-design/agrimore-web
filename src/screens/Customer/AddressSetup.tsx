import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform, ActivityIndicator, Alert, KeyboardAvoidingView, Dimensions } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from '../../components/MapWrapper';

const MAPS_KEY = 'AIzaSyCKL5RYJ39x93yz1Km59KwpYybRod3IOeg';

const buildMapHtml = (lat: number, lng: number, mapType: string) => `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body, html { width:100%; height:100%; overflow:hidden; }
  #map { position:absolute; top:0; left:0; width:100%; height:100%; }



  #layer-toggle {
    position:absolute; top:14px; right:14px;
    background:#fff; border-radius:22px; padding:4px;
    display:flex; box-shadow:0 2px 12px rgba(0,0,0,0.18); z-index:10;
  }
  .layer-btn {
    padding:7px 16px; border-radius:18px; font-size:12px;
    font-weight:700; cursor:pointer; border:none; background:transparent; color:#6B7280;
    transition:all 0.2s;
  }
  .layer-btn.active { background:#145A32; color:#D4A843; }

  #gps-btn {
    position:absolute; bottom:70px; right:14px;
    width:46px; height:46px; background:#fff; border-radius:50%;
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 4px 14px rgba(0,0,0,0.2); cursor:pointer; z-index:10; border:none;
    transition:transform 0.15s;
  }
  #gps-btn:active { transform:scale(0.92); }
  #gps-btn svg { width:22px; height:22px; stroke:#145A32; stroke-width:2; fill:none; }

  #loader {
    position:absolute; inset:0; background:#F3F4F6;
    display:flex; align-items:center; justify-content:center;
    z-index:999; transition:opacity 0.4s;
  }
  #loader.hidden { opacity:0; pointer-events:none; }
  .spinner {
    width:40px; height:40px; border:4px solid #E5E7EB;
    border-top-color:#145A32; border-radius:50%;
    animation:spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform:rotate(360deg); } }
</style>
</head>
<body>
  <div id="loader"><div class="spinner"></div></div>
  <div id="map"></div>

  <div id="layer-toggle">
    <button class="layer-btn active" id="btn-road" onclick="setLayer('roadmap')">Map</button>
    <button class="layer-btn" id="btn-sat" onclick="setLayer('satellite')">Satellite</button>
  </div>

  <button id="gps-btn" onclick="gotoMyLocation()" title="My Location">
    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="9" stroke-dasharray="2 2"/></svg>
  </button>

  <script>
    let map, geocoder, debounceTimer, marker;

    function initMap() {
      geocoder = new google.maps.Geocoder();
      map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: ${lat}, lng: ${lng} },
        zoom: 17,
        mapTypeId: '${mapType}',
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        gestureHandling: 'greedy'
      });

      marker = new google.maps.Marker({
        position: { lat: ${lat}, lng: ${lng} },
        map: map,
        draggable: true,
        animation: google.maps.Animation.DROP
      });

      google.maps.event.addListenerOnce(map, 'tilesloaded', () => {
        const l = document.getElementById('loader');
        if(l) l.classList.add('hidden');
      });

      marker.addListener('dragend', () => {
        const c = marker.getPosition();
        onMove(c.lat(), c.lng());
      });

      onMove(${lat}, ${lng});
    }

    function onMove(lat, lng) {
      window.parent.postMessage({ type:'map_move', lat, lng }, '*');
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => geocodeAndReport(lat, lng), 700);
    }

    function geocodeAndReport(lat, lng) {
      geocoder.geocode({ location: {lat, lng} }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const r = results[0];
          const getC = t => (r.address_components.find(c => c.types.includes(t)) || {}).long_name || '';
          window.parent.postMessage({
            type: 'address_update', lat, lng,
            formatted: r.formatted_address,
            street: getC('route') || getC('sublocality') || getC('locality'),
            city:   getC('locality') || getC('sublocality'),
            district: getC('administrative_area_level_3') || getC('administrative_area_level_2'),
            state:  getC('administrative_area_level_1'),
            pincode: getC('postal_code'),
            house: getC('street_number') || getC('premise')
          }, '*');
        }
      });
    }

    function setLayer(type) {
      map.setMapTypeId(type);
      document.getElementById('btn-road').className = 'layer-btn' + (type==='roadmap'?' active':'');
      document.getElementById('btn-sat').className  = 'layer-btn' + (type==='satellite'?' active':'');
    }

    function gotoMyLocation() {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(pos => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        map.panTo(c); map.setZoom(17);
        marker.setPosition(c);
        onMove(c.lat, c.lng);
      });
    }

    window.addEventListener('message', e => {
      if (e.data && e.data.type === 'fly_to') {
        const c = { lat: e.data.lat, lng: e.data.lng };
        map.panTo(c);
        map.setZoom(17);
        marker.setPosition(c);
        onMove(c.lat, c.lng);
      }
    });
  </script>
  <script async defer src="https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&callback=initMap"></script>
</body>
</html>`;

const WebPickerIframe = ({ mapRegion, mapType, iframeRef, onLoad }: any) => {
  if (Platform.OS !== 'web') return null;
  const initCoord = React.useRef({ lat: mapRegion.latitude, lng: mapRegion.longitude }).current;
  const html = React.useMemo(() => buildMapHtml(initCoord.lat, initCoord.lng, mapType), [initCoord, mapType]);
  return React.createElement('iframe', {
    ref: iframeRef,
    srcDoc: html,
    style: { width: '100%', height: '100%', border: 'none' },
    onLoad: onLoad,
  });
};
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { doc, getDoc, updateDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import { ArrowLeft, Home, Building2, MapPin, User, Phone, Navigation, Map, ShieldCheck, Check, Layers, Crosshair } from 'lucide-react-native';

const { height, width } = Dimensions.get('window');

const font = {
  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  fontStyle: 'italic' as const,
};

const DEFAULT_COORD = { latitude: 9.8398, longitude: 77.3888 }; // Chinnamanur

export default function AddressSetup({ navigation }: any) {
  const { user, userData, refreshUserData } = useAuth();
  
  const [mapRegion, setMapRegion] = useState({
    latitude: DEFAULT_COORD.latitude,
    longitude: DEFAULT_COORD.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [markerPin, setMarkerPin] = useState(DEFAULT_COORD);
  const [mapType, setMapType] = useState<'roadmap'|'satellite'>('roadmap');
  const [mapReady, setMapReady] = useState(false);
  const iframeRef = React.useRef<any>(null);
  const mapRef = React.useRef<any>(null);

  // Form State
  const [addressType, setAddressType] = useState('Home');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(user?.phoneNumber || userData?.phone || '');
  const [house, setHouse] = useState('');
  const [street, setStreet] = useState('');
  const [landmark, setLandmark] = useState('');
  const [pincode, setPincode] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [isDefault, setIsDefault] = useState(true);

  // Workflow State
  const [step, setStep] = useState<'map' | 'form'>('map');

  const [loading, setLoading] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);

  const fetchInitialLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setMapLoading(false);
        await performReverseGeocode(DEFAULT_COORD.latitude, DEFAULT_COORD.longitude);
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      const newCoords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      const newRegion = { ...newCoords, latitudeDelta: 0.01, longitudeDelta: 0.01 };
      setMapRegion(newRegion);
      setMarkerPin(newCoords);
      if (Platform.OS !== 'web' && mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      } else if (Platform.OS === 'web' && iframeRef.current) {
        iframeRef.current.contentWindow?.postMessage({ type: 'fly_to', lat: newCoords.latitude, lng: newCoords.longitude }, '*');
      }
      await performReverseGeocode(newCoords.latitude, newCoords.longitude);
    } catch (err) {
      console.log('Location error', err);
      // Ensure logic falls back
      if (Platform.OS === 'web' && iframeRef.current) {
        iframeRef.current.contentWindow?.postMessage({ type: 'fly_to', lat: DEFAULT_COORD.latitude, lng: DEFAULT_COORD.longitude }, '*');
      }
      await performReverseGeocode(DEFAULT_COORD.latitude, DEFAULT_COORD.longitude);
    } finally {
      setMapLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialLocation();
  }, []);

  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant location permissions in your settings.');
        setIsLocating(false);
        return;
      }
      
      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const newCoords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      const newRegion = { ...newCoords, latitudeDelta: 0.01, longitudeDelta: 0.01 };
      setMapRegion(newRegion);
      setMarkerPin(newCoords);
      if (Platform.OS !== 'web' && mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      } else if (Platform.OS === 'web' && iframeRef.current) {
        iframeRef.current.contentWindow?.postMessage({ type: 'fly_to', lat: newCoords.latitude, lng: newCoords.longitude }, '*');
      }
      await performReverseGeocode(newCoords.latitude, newCoords.longitude);
    } catch (err) {
      Alert.alert('Turn on GPS', 'We could not detect your location safely. Please ensure your GPS is enabled.');
    } finally {
      setIsLocating(false);
    }
  };

  const performReverseGeocode = async (latitude: number, longitude: number) => {
    try {
      if (Platform.OS === 'web') {
        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=AIzaSyCKL5RYJ39x93yz1Km59KwpYybRod3IOeg`);
        const data = await res.json();
        if (data.status === 'OK' && data.results && data.results.length > 0) {
          const comps = data.results[0].address_components;
          const getComp = (type: string) => comps.find((c: any) => c.types.includes(type))?.long_name || '';
          
          const houseStr = getComp('street_number') || getComp('premise') || '';
          let streetStr = getComp('route') || '';
          if (!streetStr) {
            const firstPart = data.results[0].formatted_address.split(',')[0];
            streetStr = firstPart !== houseStr ? firstPart : '';
          }
          
          const areaStr = getComp('locality') || getComp('sublocality') || getComp('neighborhood') || '';
          const distStr = getComp('administrative_area_level_3') || getComp('administrative_area_level_2') || '';
          const stateStr = getComp('administrative_area_level_1') || 'Tamil Nadu';
          const pinStr = getComp('postal_code') || '';

          setHouse(houseStr);
          setStreet(streetStr);
          setCity(areaStr); // Area / Taluk
          setDistrict(distStr);
          setState(stateStr);
          setPincode(pinStr);
        }
      } else {
        const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo.length > 0) {
          const data = geo[0];
          setHouse(data.streetNumber || '');
          setStreet(data.street || data.name || '');
          setCity(data.city || data.subregion || ''); // Area / Taluk
          setDistrict(data.subregion || data.region || '');
          setState(data.region || 'Tamil Nadu');
          setCountry(data.country || 'India');
          setPincode(data.postalCode || '');
        }
      }
    } catch (e) { console.log('Geocoding error', e); }
  };

  const handleRegionChangeComplete = async (region: any) => {
    // We only rely on Marker dragging directly now since map pin is an independent marker!
    // We update mapRegion silently so "initialRegion" is mostly in sync.
    setMapRegion(region);
  };

  const handleMarkerDragEndNative = async (e: any) => {
    const coords = e.nativeEvent.coordinate;
    setMarkerPin(coords);
    await performReverseGeocode(coords.latitude, coords.longitude);
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleWebMessage = async (event: any) => {
        if (!event.data) return;
        if (event.data.type === 'map_move') {
          const region = { latitude: event.data.lat, longitude: event.data.lng };
          setMarkerPin(region);
          setMapRegion(prev => ({ ...prev, ...region }));
        }
        // address_update carries geocoded fields — fill form directly
        if (event.data.type === 'address_update') {
          const region = { latitude: event.data.lat, longitude: event.data.lng };
          setMarkerPin(region);
          setMapRegion(prev => ({ ...prev, ...region }));
          if (event.data.house)   setHouse(event.data.house);
          if (event.data.street)  setStreet(event.data.street);
          if (event.data.city)    setCity(event.data.city);
          if (event.data.district) setDistrict(event.data.district);
          if (event.data.state)   setState(event.data.state);
          if (event.data.pincode) setPincode(event.data.pincode);
        }
      };
      window.addEventListener('message', handleWebMessage);
      return () => window.removeEventListener('message', handleWebMessage);
    }
  }, []);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleSaveAddress = async () => {
    if (!name || !phone || !house || !street || !pincode || !city) {
      showAlert('Missing Info', 'Please fill all required fields carefully.');
      return;
    }
    
    // DELIVERY RESTRICTION - Chinnamanur only
    if (city.trim().toLowerCase() !== 'chinnamanur') {
      showAlert('Delivery Area Restricted', 'Sorry, we currently only deliver to locations within Chinnamanur.');
      return; // Block save
    }

    if (pincode.trim().length !== 6) {
      showAlert('Invalid Pincode', 'Pincode must be exactly 6 digits.');
      return;
    }

    if (!user) {
      showAlert('Session Expired', 'Please login again to save your address');
      return;
    }
    setLoading(true);

    try {
      const fullAddressString = `${house}, ${street}, ${landmark ? landmark + ', ' : ''}${city}, ${district}, ${state}, ${country} - ${pincode}`;
      
      const newAddress = {
        id: Date.now().toString(),
        type: addressType,
        label: addressType,
        name,
        phone,
        house,
        street,
        landmark,
        city,
        district,
        state,
        country,
        pincode,
        address: fullAddressString,
        location: { lat: markerPin.latitude, lng: markerPin.longitude },
        isDefault
      };

      const userDocRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userDocRef);
      
      let existingAddresses = [];
      if (snap.exists()) {
        const data = snap.data();
        existingAddresses = data.addresses || [];
      }

      if (isDefault) {
        existingAddresses = existingAddresses.map((a: any) => ({ ...a, isDefault: false }));
      } else if (existingAddresses.length === 0) {
        newAddress.isDefault = true;
      }

      const updatedAddresses = [...existingAddresses, newAddress];
      const defaultAdd = updatedAddresses.find(a => a.isDefault)?.address || newAddress.address;
      const defaultLoc = updatedAddresses.find(a => a.isDefault)?.location || newAddress.location;

      await setDoc(userDocRef, {
        addresses: updatedAddresses,
        defaultAddress: defaultAdd,
        location: defaultLoc,
      }, { merge: true });

      // Save to a direct collection for explicit requirements: (user_id, name, ... latitude, longitude)
      await addDoc(collection(db, 'users', user.uid, 'addresses'), newAddress);

      await refreshUserData();
      showAlert('Success', 'Address saved successfully');
      
      try {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.replace('Customer');
        }
      } catch(navErr) {
        // Navigation may fail if navigator unmounted due to Context change
      }

    } catch (err: any) {
      showAlert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Dynamic Map Section - Fullscreen if step === 'map', top half if 'form' */}
      <View style={[s.mapContainer, step === 'map' && s.mapContainerFull]}>
        {mapLoading ? (
          <View style={s.mapFallback}>
            <ActivityIndicator color="#145A32" size="large" />
            <Text style={[font, { color: '#145A32', marginTop: 12 }]}>Finding you...</Text>
          </View>
        ) : Platform.OS === 'web' ? (
          <WebPickerIframe mapRegion={mapRegion} mapType={mapType} iframeRef={iframeRef} onLoad={() => setMapReady(true)} />
        ) : (
          <MapView
            ref={mapRef}
            style={s.map}
            provider={PROVIDER_GOOGLE}
            mapType={mapType === 'satellite' ? 'satellite' : 'standard'}
            initialRegion={mapRegion}
            onRegionChangeComplete={handleRegionChangeComplete}
            showsUserLocation={true}
            zoomEnabled={true}
            zoomControlEnabled={true}
          >
            <Marker 
              coordinate={markerPin} 
              draggable 
              onDragEnd={handleMarkerDragEndNative}
              pinColor="#145A32"
            />
          </MapView>
        )}
        
        {/* Map Header Overlay */}
        <View style={s.mapHeader}>
          {step === 'form' ? (
            <TouchableOpacity style={s.backBtn} onPress={() => setStep('map')}>
              <ArrowLeft color="#1F2937" size={24} />
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: width - 40 }}>
              <TouchableOpacity style={s.backBtn} onPress={() => navigation.canGoBack() && navigation.goBack()}>
                <ArrowLeft color="#1F2937" size={24} />
              </TouchableOpacity>

              {/* Layer Toggle Component */}
              <View style={s.layerToggleWrap}>
                <TouchableOpacity 
                  style={[s.layerBtn, mapType === 'roadmap' && s.layerBtnAct]} 
                  onPress={() => setMapType('roadmap')}>
                  <Text style={[font, s.layerTxt, mapType === 'roadmap' && s.layerTxtAct]}>Normal</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[s.layerBtn, mapType === 'satellite' && s.layerBtnAct]} 
                  onPress={() => setMapType('satellite')}>
                  <Text style={[font, s.layerTxt, mapType === 'satellite' && s.layerTxtAct]}>Satellite</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Overlay Current Location Fab */}
        {step === 'map' && !mapLoading && (
          <TouchableOpacity 
            style={s.currentLocBtn} 
            onPress={handleUseCurrentLocation}
            disabled={isLocating}
          >
            {isLocating ? (
              <ActivityIndicator color="#145A32" size="small" />
            ) : (
              <Crosshair color="#145A32" size={24} />
            )}
            {isLocating && <Text style={[font, s.isLocatingText]}>Fetching location...</Text>}
          </TouchableOpacity>
        )}



        {/* Step 1: Map Confirmation Button */}
        {step === 'map' && !mapLoading && (
          <View style={s.mapConfirmFooter}>
            <View style={s.mapLocInfoBox}>
              <Text style={[font, { fontSize: 13, color: '#6B7280', marginBottom: 2 }]}>Delivery Location</Text>
              <Text style={[font, { fontSize: 18, fontWeight: '800', color: '#111827' }]} numberOfLines={1}>{street || city || 'Locating...'}</Text>
              <Text style={[font, { fontSize: 12, color: '#9CA3AF', marginTop: 2 }]} numberOfLines={1}>{district}, {state} - {pincode}</Text>
            </View>
            <TouchableOpacity style={s.mapConfirmBtn} onPress={() => setStep('form')}>
              <Text style={[font, s.mapConfirmBtnText]}>Confirm Location</Text>
              <Navigation color="#D4A843" size={18} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Step 2: Bottom Sheet Form (Only visible if step === 'form') */}
      {step === 'form' && (
        <View style={s.bottomSheet}>
          <View style={s.sheetHandle} />
          <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[font, s.sheetTitle]}>Customer Details</Text>

            {/* Type Toggle */}
            <View style={s.typeWrap}>
              {['Home', 'Office', 'Other'].map(type => {
                const isActive = addressType === type;
                let Icon = MapPin;
                if (type === 'Home') Icon = Home;
                if (type === 'Office') Icon = Building2;
                
                return (
                  <TouchableOpacity 
                    key={type} 
                    style={[s.typeBtn, isActive && s.typeBtnActive]}
                    onPress={() => setAddressType(type)}
                  >
                    <Icon color={isActive ? '#145A32' : '#9CA3AF'} size={18} />
                    <Text style={[font, s.typeBtnText, isActive && s.typeBtnTextActive]}>{type}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Form Fields */}
            <View style={s.formGrid}>
              <View style={s.inputRow}>
                <View style={s.inputIcon}><User color="#9CA3AF" size={20}/></View>
                <TextInput style={[font, s.input]} placeholder="Contact Name" placeholderTextColor="#9CA3AF" value={name} onChangeText={setName} />
              </View>

              <View style={s.inputRow}>
                <View style={s.inputIcon}><Phone color="#9CA3AF" size={20}/></View>
                <TextInput style={[font, s.input]} placeholder="Mobile Number (Compulsory)" placeholderTextColor="#9CA3AF" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={10} />
              </View>

              <View style={s.inputRow}>
                <TextInput style={[font, s.input, { paddingLeft: 16 }]} placeholder="Door / House / Flat No." placeholderTextColor="#9CA3AF" value={house} onChangeText={setHouse} />
              </View>

              <View style={s.inputRow}>
                <TextInput style={[font, s.input, { paddingLeft: 16 }]} placeholder="Street Name / Road" placeholderTextColor="#9CA3AF" value={street} onChangeText={setStreet} />
              </View>

              <View style={s.inputRow}>
                <TextInput style={[font, s.input, { paddingLeft: 16 }]} placeholder="Landmark (Optional)" placeholderTextColor="#9CA3AF" value={landmark} onChangeText={setLandmark} />
              </View>

              <View style={s.rowSplit}>
                <View style={[s.inputRow, { flex: 1, marginRight: 10 }]}>
                  <TextInput style={[font, s.input, { paddingLeft: 16 }]} placeholder="Area / Taluk" placeholderTextColor="#9CA3AF" value={city} onChangeText={setCity} />
                </View>
                <View style={[s.inputRow, { flex: 1 }]}>
                  <TextInput style={[font, s.input, { paddingLeft: 16 }]} placeholder="Pincode" placeholderTextColor="#9CA3AF" value={pincode} onChangeText={setPincode} keyboardType="numeric" maxLength={6} />
                </View>
              </View>

              <View style={s.rowSplit}>
                <View style={[s.inputRow, { flex: 1, marginRight: 10, backgroundColor: '#F3F4F6' }]}>
                  <TextInput style={[font, s.input, { paddingLeft: 16, color: '#6B7280' }]} value={district} editable={false} />
                </View>
                <View style={[s.inputRow, { flex: 1, backgroundColor: '#F3F4F6' }]}>
                  <TextInput style={[font, s.input, { paddingLeft: 16, color: '#6B7280' }]} value={state} editable={false} />
                </View>
              </View>
            </View>

            {/* Options */}
            <TouchableOpacity style={s.checkRow} onPress={() => setIsDefault(!isDefault)} activeOpacity={0.8}>
              <View style={[s.checkbox, isDefault && s.checkboxActive]}>
                {isDefault && <Check color="#FFF" size={14} />}
              </View>
              <Text style={[font, s.checkText]}>Save as Primary Address</Text>
            </TouchableOpacity>

            {/* Submit */}
            <TouchableOpacity style={s.submitBtn} onPress={handleSaveAddress} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={[font, s.submitBtnText]}>Save Details & Continue</Text>}
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF' },
  mapContainer: { height: height * 0.45, width: '100%', position: 'relative', backgroundColor: '#F3F4F6' },
  mapContainerFull: { height: height, flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  mapFallback: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5E7EB' },
  mapFallbackText: { color: '#6B7280', fontSize: 16, marginTop: 12, fontWeight: 'bold' },
  mapHeader: { position: 'absolute', top: 50, left: 20, zIndex: 10 },
  backBtn: { backgroundColor: '#FFF', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  centerPinWrap: { position: 'absolute', top: '50%', left: '50%', transform: [{translateX: -16}, {translateY: -48}], alignItems: 'center', justifyContent: 'flex-start', zIndex: 5 },
  centerPinHead: { width: 32, height: 32, backgroundColor: '#145A32', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  centerPinDot: { width: 8, height: 8, backgroundColor: '#FFF', borderRadius: 4 },
  centerPinStalk: { width: 4, height: 16, backgroundColor: '#145A32', borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  
  layerToggleWrap: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 20, padding: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
  layerBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  layerBtnAct: { backgroundColor: '#145A32' },
  layerTxt: { fontSize: 12, fontWeight: '800', color: '#6B7280' },
  layerTxtAct: { color: '#D4A843' },

  currentLocBtn: { 
    position: 'absolute', bottom: 156, right: 20, backgroundColor: '#FFF', 
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8, zIndex: 10
  },
  isLocatingText: { position: 'absolute', right: 56, backgroundColor: '#145A32', color: '#D4A843', overflow: 'hidden', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, fontSize: 12, fontWeight: 'bold' },

  // Footer overlay for full screen map
  mapConfirmFooter: { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: '#FFF', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 15, zIndex: 10 },
  mapLocInfoBox: { marginBottom: 20 },
  mapConfirmBtn: { flexDirection: 'row', backgroundColor: '#145A32', paddingVertical: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 10 },
  mapConfirmBtnText: { color: '#D4A843', fontSize: 18, fontWeight: '900', letterSpacing: 1 },

  bottomSheet: {
    flex: 1,
    backgroundColor: '#FFF',
    marginTop: -30,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
    paddingTop: 12,
  },
  sheetHandle: { width: 50, height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  scrollContent: { paddingHorizontal: 24 },
  sheetTitle: { fontSize: 24, fontWeight: '900', color: '#145A32', marginBottom: 20 },
  typeWrap: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginHorizontal: 4, borderRadius: 12, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
  typeBtnActive: { backgroundColor: 'rgba(20,90,50,0.1)', borderColor: '#145A32' },
  typeBtnText: { fontSize: 14, fontWeight: 'bold', color: '#6B7280', marginLeft: 8 },
  typeBtnTextActive: { color: '#145A32' },
  formGrid: { marginBottom: 20 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 16, marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB', height: 56 },
  inputIcon: { width: 56, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#E5E7EB' },
  input: { flex: 1, fontSize: 16, color: '#1F2937' },
  rowSplit: { flexDirection: 'row', justifyContent: 'space-between' },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 28, paddingHorizontal: 4 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  checkboxActive: { backgroundColor: '#145A32', borderColor: '#145A32' },
  checkText: { fontSize: 15, color: '#4B5563', fontWeight: 'bold' },
  submitBtn: { backgroundColor: '#145A32', paddingVertical: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#145A32', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  submitBtnText: { color: '#D4A843', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
});
