import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as Location from 'expo-location';

export interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

interface LocationContextType {
  currentLocation: LocationData | null;
  errorMsg: string | null;
  setLocationManually: (lat: number, lng: number, address: string) => void;
  requestLocation: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType>({
  currentLocation: null,
  errorMsg: null,
  setLocationManually: () => {},
  requestLocation: async () => {},
});

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const addressArray = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      let addressStr = 'Unknown address';
      if (addressArray && addressArray.length > 0) {
        const addr = addressArray[0];
        addressStr = `${addr.name || ''} ${addr.street || ''}, ${addr.city || ''}, ${addr.region || ''}`.trim().replace(/^,|,$/g, '').trim();
      }

      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: addressStr,
      });
      setErrorMsg(null);
    } catch (e: any) {
      setErrorMsg(e.message || 'Error fetching location');
    }
  };

  const setLocationManually = (lat: number, lng: number, address: string) => {
    setCurrentLocation({ latitude: lat, longitude: lng, address });
  };

  useEffect(() => {
    requestLocation();
  }, []);

  return (
    <LocationContext.Provider value={{ currentLocation, errorMsg, setLocationManually, requestLocation }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => useContext(LocationContext);
