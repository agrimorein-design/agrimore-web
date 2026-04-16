# Agrimore App – Full API Keys + Features Report

## Overview
Agrimore is a React Native application built with Expo, targeting Android, iOS, and Web platforms. It serves as an e-commerce platform focused on agricultural products, featuring multi-role support (Admin, Customer, Seller) with Firebase backend, payment integration via Razorpay, and location-based services.

## API Keys and Configurations

### Firebase Configuration
Located in `src/firebase/config.ts`:
- **API Key**: AIzaSyDrQIYzWcC1RAaS474r_a9I9caY3cCVTSc
- **Auth Domain**: agrimore-66a4e.firebaseapp.com
- **Database URL**: https://agrimore-66a4e-default-rtdb.firebaseio.com
- **Project ID**: agrimore-66a4e
- **Storage Bucket**: agrimore-66a4e.firebasestorage.app
- **Messaging Sender ID**: 1082819024270
- **App ID**: 1:1082819024270:web:fa2a015928e81bf1e640df
- **Measurement ID**: G-73B1F06XC3

### Google Services (Android)
Located in `android/app/google-services.json`:
- **Project Number**: 1082819024270
- **Firebase URL**: https://agrimore-66a4e-default-rtdb.firebaseio.com
- **Project ID**: agrimore-66a4e
- **Storage Bucket**: agrimore-66a4e.firebasestorage.app
- **Mobile SDK App ID**: 1:1082819024270:android:fee25001e34206e9e640df
- **Package Name**: com.agrimore.app
- **OAuth Client ID**: 1082819024270-0rmfnpcfjbmd12mq3h4qbffp67jri89a.apps.googleusercontent.com
- **API Key**: AIzaSyDlbhaEl3Hz60iYVL7qtSBPx3Clx6SV7gg

### Other Integrations
- **Razorpay**: Integrated for payments (react-native-razorpay)
- **Expo Location**: For location services
- **React Native Maps**: For map functionalities
- **Firebase Storage**: For media uploads
- **AsyncStorage**: For local data persistence

## Key Features

### Multi-Role Architecture
- **Admin Panel**: Comprehensive management interface
- **Customer Portal**: Shopping and order management
- **Seller Dashboard**: Product and order management

### Admin Features
- **Dashboard**: Overview of app metrics
- **User Management**: Admin, Sellers, Customers
- **Product Management**: Categories, Products, Banners
- **Order Management**: View and manage orders
- **Delivery Route Management**: Route planning and optimization
- **Coupons and Subscriptions**: Discount management
- **Reports and Analytics**: Business insights
- **Wallet Management**: Financial transactions
- **Settings**: App configuration

### Customer Features
- **Authentication**: Login, Register, Forgot Password, Onboarding
- **Product Browsing**: Categories, Search, Cart
- **Address Management**: Setup and manage delivery addresses
- **Orders**: Place, track, and manage orders
- **Location Services**: Map-based address selection
- **Language Support**: Multi-language interface
- **Scratch Card**: Reward system

### Seller Features
- **Product Management**: Add and manage products
- **Order Fulfillment**: Handle customer orders
- **Dashboard**: Sales and performance metrics

### Core Services
- **Authentication Service**: Firebase Auth integration
- **Media Service**: Image/document handling with Firebase Storage
- **Payment Service**: Razorpay integration
- **Order Service**: Order processing and management
- **Settings Service**: App configuration

### Utilities
- **Auth Helper**: Authentication utilities
- **Distance Calculator**: Location-based calculations

### Technical Stack
- **Framework**: React Native with Expo
- **Backend**: Firebase (Firestore, Auth, Storage, Realtime Database)
- **Styling**: Tailwind CSS via NativeWind
- **Navigation**: React Navigation
- **Maps**: React Native Maps
- **Payments**: Razorpay
- **State Management**: React Context API
- **Data Persistence**: AsyncStorage

### Platform Support
- Android
- iOS
- Web

This report provides a comprehensive overview of the Agrimore app's API keys and feature set as of April 13, 2026.