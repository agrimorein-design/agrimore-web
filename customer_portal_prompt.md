# Agrimore Customer Application - Master Creation Prompt

This document serves as the master prompt or system instruction set for creating the complete **Customer Portal** of the "Agrimore" application from scratch using React Native (Expo) and Firebase.

You can paste sections of this prompt into any AI assistant to autonomously build or rebuild the application layer by layer.

---

## 🏗 Technology Stack
- **Framework:** React Native with Expo (Managed Workflow)
- **Language:** TypeScript
- **Styling:** React Native `StyleSheet` (Vanilla) with highly premium, modern, and dynamic aesthetics (e.g., glassmorphism, subtle shadows, rounded corners, dynamic micro-animations).
- **Navigation:** `@react-navigation/native` with Bottom Tabs & Native Stack.
- **Backend & Database:** Firebase (Authentication, Firestore Database, Storage).
- **Icons:** `lucide-react-native`

---

## 📂 Project File Structure
Instruct the AI to create the following file architecture for the Customer App:

```text
src/
 ├── context/
 │    ├── AuthContext.tsx    # Firebase Auth state & User document listener
 │    └── CartContext.tsx    # Variant-aware cart state management using AsyncStorage
 ├── firebase/
 │    └── config.ts          # Firebase SDK initialization
 ├── navigation/
 │    └── MainNavigator.tsx  # Stack and Tab navigation configuration
 ├── screens/
 │    └── Customer/
 │         ├── Splash.tsx             # Animated Splash Screen
 │         ├── Home.tsx               # Dashboard with Categories, Flash Sales, Fly-to-Cart Animation, Scratch Reward Popup
 │         ├── Shop.tsx               # All Products listing with Search and Filter
 │         ├── Category.tsx           # Category-specific products listing (Menu)
 │         ├── ProductDetails.tsx     # Product Info, Variants Selection, Image Carousel
 │         ├── Cart.tsx               # Cart Summary and Price Calculations
 │         ├── Checkout.tsx           # Multi-step checkout (Address -> Slot -> Payment)
 │         ├── Orders.tsx             # Order History listing
 │         ├── OrderTracking.tsx      # Real-time UI for order status
 │         ├── Profile.tsx            # Live User Dashboard (Wallet, Orders count, Rewards)
 │         ├── Rewards.tsx            # Gamified Scratch Cards view
 │         ├── Wallet.tsx             # Wallet balance & transaction history
 │         ├── Addresses.tsx          # Manage delivery addresses
 │         └── SubscriptionSetup.tsx  # Setup daily/weekly product subscriptions
```

---

## 💻 Core Feature Prompts

When regenerating specific features, use the following detailed prompt blocks:

### 1. Navigation & State Management
> **Prompt:** "Create a React Navigation setup with a Bottom Tab Navigator for `Home`, `Shop`, `Cart`, and `Profile`. Wrap the application in two Context Providers: `AuthContext` (listening to Firebase `onAuthStateChanged` and fetching the `users` document) and `CartContext`. The `CartContext` MUST handle product variants, meaning if a product has `variantsEnabled`, a unique cart item is identified by `${productId}-${variantLabel}`. It must calculate total quantity, base prices, and discount prices dynamically."

### 2. Home Screen & Fly-to-Cart Animation
> **Prompt:** "Build a premium `Home.tsx` screen. It should feature a custom curved header, a search bar, horizontal scrollable Categories, and a Flash Sale product grid. 
> 
> *Key Interactivity:* Implement an `Animated` API 'Fly-to-Cart' micro-animation. When a user clicks the '+' Add button on a product card, an image duplicate must smoothly fly from the button's coordinates to the Cart Icon in the top right header, scaling down and fading out. Ensure `Pressable` is used to prevent nested touch conflicts.
> 
> *Reward Popup:* Include a `useEffect` listener to `users/{uid}/scratchCards`. If there is an unscratched card, display an automated Popup Modal for 5 seconds."

### 3. Gamified Scratch Rewards (`Rewards.tsx`)
> **Prompt:** "Create a `Rewards.tsx` screen. Fetch documents from `users/{uid}/scratchCards`. It should display cards in two segments: 'Unclaimed' and 'Claimed History'. For Unclaimed cards, implement a scratch-off simulation (using PanResponder or custom overlay). Once 'scratched', play a Reveal animation, update Firestore `isScratched: true`, and automatically trigger a Wallet transaction to credit the user's Agrimore Wallet with the reward amount."

### 4. Product Details with Variants
> **Prompt:** "Build a `ProductDetails.tsx` screen. It must accept a `product` object. Check `product.variantsEnabled`. If true, render a horizontal list of selectable variant pills (e.g., 250g, 500g, 1kg) fetched from `product.variants`. Dynamically dynamically update the active `price` and `discountPrice` based on the selected variant. Include a bold 'Add to Cart' floating action button at the bottom."

### 5. Multi-Step Checkout
> **Prompt:** "Create a `Checkout.tsx` screen with a wizard-like 3-step timeline. 
> - **Step 1:** Select Delivery Address (fetch from `users/{uid}/addresses`).
> - **Step 2:** Select Delivery Time Slot based on predefined constants.
> - **Step 3:** Select Payment Method (Cash on Delivery or Wallet). If Wallet is selected, verify `walletBalance >= cartTotal`. Lock the 'Place Order' button if conditions aren't met. On success, write the order to Firestore `orders` collection and clear the local cart."

### 6. Subscriptions
> **Prompt:** "Build a `SubscriptionSetup.tsx` screen. Allow the user to select Frequency (Daily, Weekly, Monthly), Time Slot, and Start Date. Calculate total estimates and save the recurring subscription mandate into the `subscriptions` Firestore collection natively."

### 7. Profile & Live Stats Dashboard
> **Prompt:** "Build a `Profile.tsx` screen. Display the user's Name, Email, and Role. Below the header, show 3 Live Stat Cards: 'Agrimore Wallet', 'Reward Points', and 'Total Orders'. Use a Firestore `getDocs` query to dynamically calculate the `Total Orders` based on the user's UID. The Wallet and Rewards should fall back to `userData` real-time state. Add navigation list items using `lucide-react-native` icons."

---

## 🎨 Design System & Aesthetics Instruction (Crucial)
Append this to every generation request:
> *"The UI MUST be visually stunning. Avoid generic colors. Use harmonious palettes (e.g., Deep Greens for Agrimore branding, Gold accents for premium elements). Inputs and Cards must have smooth `borderRadius` (16px+), subtle Drop Shadows, and `#F9FAFB` off-white backgrounds. Use `lucide-react-native` for all iconography."*
