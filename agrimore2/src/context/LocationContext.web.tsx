import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setCurrentLocation({
              latitude,
              longitude,
              address: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`,
            });
            setErrorMsg(null);
          },
          (error) => {
            setErrorMsg(error.message || 'Error fetching location');
          }
        );
      } else {
        setErrorMsg('Geolocation not supported in this browser');
      }
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
