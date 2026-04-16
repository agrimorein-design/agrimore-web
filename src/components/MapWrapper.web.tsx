import React from 'react';
import { View } from 'react-native';

const MapView = ({ children, ...props }: any) => <View {...props}>{children}</View>;
const Marker = ({ children, ...props }: any) => <View {...props}>{children}</View>;
const Polyline = ({ children, ...props }: any) => <View {...props}>{children}</View>;
const Circle = ({ children, ...props }: any) => <View {...props}>{children}</View>;

const PROVIDER_GOOGLE = null;

export { Marker, Polyline, Circle, PROVIDER_GOOGLE };
export default MapView;
