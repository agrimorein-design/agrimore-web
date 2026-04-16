

import 'react-native';

declare module 'react-native' {
  interface ViewProps { className?: string; }
  interface TextProps { className?: string; }
  interface ScrollViewProps { className?: string; }
  interface TextInputProps { className?: string; }
  interface TouchableOpacityProps { className?: string; }
  interface ImageProps { className?: string; }
  interface ModalProps { className?: string; }
  interface FlatListProps<ItemT> { className?: string; }
}

// Generic module shims for optional native-only dependencies
declare module 'react-native-maps' {
  const MapView: any;
  export const Marker: any;
  export const Callout: any;
  export default MapView;
}

declare module 'react-native-razorpay' {
  const RazorpayCheckout: any;
  export default RazorpayCheckout;
}

declare module 'lucide-react-native' {
  import { ComponentType } from 'react';
  interface IconProps {
    color?: string;
    size?: number;
    className?: string;
    strokeWidth?: number;
  }
  export const Home: ComponentType<IconProps>;
  export const ShoppingCart: ComponentType<IconProps>;
  export const Clock: ComponentType<IconProps>;
  export const User: ComponentType<IconProps>;
  export const MapPin: ComponentType<IconProps>;
  export const Search: ComponentType<IconProps>;
  export const Minus: ComponentType<IconProps>;
  export const Plus: ComponentType<IconProps>;
  export const Trash2: ComponentType<IconProps>;
  export const Package: ComponentType<IconProps>;
  export const Truck: ComponentType<IconProps>;
  export const CheckCircle: ComponentType<IconProps>;
  export const Moon: ComponentType<IconProps>;
  export const LogOut: ComponentType<IconProps>;
  export const ChevronRight: ComponentType<IconProps>;
  export const ArrowLeft: ComponentType<IconProps>;
  export const Heart: ComponentType<IconProps>;
  export const ShieldCheck: ComponentType<IconProps>;
  export const Navigation: ComponentType<IconProps>;
  export const Edit2: ComponentType<IconProps>;
  export const Users: ComponentType<IconProps>;
  export const Map: ComponentType<IconProps>;
  export const Image: ComponentType<IconProps>;
  export const DollarSign: ComponentType<IconProps>;
}
