# Flutter Agrimore Customer Application - Master Creation Prompt

This document serves as the master prompt or system instruction set for creating the complete **Customer Portal** of the "Agrimore" application from scratch using **Flutter** and **Firebase**. The backend and database remain exactly the same as the current system.

You can paste sections of this prompt into any AI assistant to autonomously build or rebuild the application layer by layer in Flutter.

---

## 🏗 Technology Stack
- **Framework:** Flutter (Dart)
- **State Management:** Provider / Riverpod / GetX (Choose one consistently, Provider is recommended for simplicity and scaling)
- **Styling:** Custom Flutter UI with premium widgets, glassmorphism, subtle shadows, rounded corners, and dynamic micro-animations.
- **Backend & Database:** Firebase (Authentication, Firestore Database, Storage) - *Use the existing database architecture.*
- **Icons:** `fluentui_system_icons` or `font_awesome_flutter`
- **Maps:** `google_maps_flutter`, `geolocator`, and `geocoding` for location selection.

---

## 📂 Project File Structure
Instruct the AI to create the following file architecture inside the `lib/` directory:

```text
lib/
 ├── core/
 │    ├── constants.dart         # Colors, theme data, API keys, etc.
 │    ├── utils.dart             # Helper functions (date formatting, validators)
 │    └── firebase_config.dart   # Firebase initialization wrappers
 ├── providers/
 │    ├── auth_provider.dart     # Firebase Auth state & User document listener
 │    ├── location_provider.dart # Manages selected map location and address string
 │    └── cart_provider.dart     # Variant-aware cart state management
 ├── screens/
 │    ├── auth/
 │    │    ├── login_screen.dart       # Mobile number input
 │    │    └── otp_verification.dart   # OTP entry
 │    ├── location/
 │    │    └── map_selection_screen.dart # Map view for pinning location & pulling address data
 │    ├── main/
 │    │    └── main_navigation.dart    # Bottom Navigation Bar handler
 │    ├── home/
 │    │    └── home_screen.dart        # Dashboard with Categories, Flash Sales, UI Animations
 │    ├── shop/
 │    │    ├── shop_screen.dart        # All Products listing (Search/Filter)
 │    │    ├── category_screen.dart    # Category-specific products
 │    │    └── product_details.dart    # Product Info, Variants Selection
 │    ├── cart/
 │    │    └── cart_screen.dart        # Cart Summary and Checkout trigger
 │    ├── checkout/
 │    │    └── checkout_flow.dart      # Multi-step checkout (Address -> Slot -> Payment)
 │    └── profile/
 │         ├── profile_screen.dart     # User Dashboard (Wallet, Orders count, Rewards)
 │         ├── orders_screen.dart      # Order History
 │         ├── order_tracking.dart     # Real-time UI for order status
 │         ├── rewards_screen.dart     # Gamified Scratch Cards view
 │         └── wallet_screen.dart      # Wallet balance & history
 └── widgets/
      ├── custom_button.dart
      ├── product_card.dart
      └── scratch_card_widget.dart
```

---

## 💻 Core Feature Prompts Step-by-Step

When regenerating specific features, use the following detailed prompt blocks in sequential order:

### 1. Authentication Flow (Login & OTP)
> **Prompt:** "Create a modern `LoginScreen` in Flutter. It should have a clean UI asking for the user's mobile number. Upon clicking 'Get OTP', verify the number using Firebase Phone Authentication. Navigate to `OtpVerificationScreen`. After successful OTP verification, check if the user document exists in the existing Firestore `users` collection. If true, navigate to `MapSelectionScreen`."

### 2. Map View & Location Pulling (Crucial Onboarding Step)
> **Prompt:** "Build a `MapSelectionScreen` using `google_maps_flutter`. 
> 1. Request location permissions via `geolocator` and get current coordinates.
> 2. Show a Google Map with a draggable camera/pin centered on the user's location.
> 3. Use the `geocoding` package to perform reverse geocoding to pull the full street address from the selected coordinates.
> 4. Display the extracted address at the bottom of the screen.
> 5. Provide a 'Confirm Location' button. Upon pressing, save this location to `LocationProvider`, update the Firestore `users` document with the default address configuration, and route the user to `MainNavigation` (Home Page)."

### 3. Navigation & State Management
> **Prompt:** "Create a `MainNavigation` scaffold using a Bottom Navigation Bar with 4 tabs: Home, Shop, Cart, and Profile. Implement global state management using `Provider`. The `CartProvider` must handle product variants identically to the existing database logic. If a product has `variantsEnabled`, a unique cart item is identified by `${productId}-${variantLabel}`. Recalculate cart totals dynamically."

### 4. Home Screen & Animations
> **Prompt:** "Build a highly premium `HomeScreen`. Include a custom curved header showing the delivery location pulled from Step 2, a search bar, horizontal scrollable Categories, and a Flash Sale product grid. 
> 
> *Key Interactivity:* Implement a 'Fly-to-Cart' micro-animation. When a user taps the '+' Add to Cart button on a product card, a widget overlay should smoothly fly from the button's coordinates to the Cart Icon in the bottom nav or top header, scaling down and fading out.
> 
> *Reward Popup Check:* On init, check `users/{uid}/scratchCards`. If there is an unscratched card, display an automated dialog modal."

### 5. Product Details with Variants
> **Prompt:** "Build `ProductDetailsScreen`. It receives a `Product` model. If `product.variantsEnabled` is true, render a horizontal `ListView` of variant chips (e.g., 250g, 500g). Wrapping the UI in an animated state updater so that the main `price` and `discountPrice` smoothly transition when a new variant is selected. Include a prominent 'Add to Cart' floating action button."

### 6. Gamified Scratch Rewards
> **Prompt:** "Create a `RewardsScreen`. Fetch documents from `users/{uid}/scratchCards`. Display in tabs: 'Unclaimed' and 'History'. For Unclaimed cards, use the `scratcher` Flutter package to simulate a real scratch-off ticket. Once 70% scratched, reveal the reward, update Firestore `isScratched: true`, and write a wallet transaction to credit the Agrimore Wallet."

### 7. Checkout Flow
> **Prompt:** "Create a `CheckoutFlow` screen handling a 3-step vertical stepper.
> - **Step 1:** Delivery Address (Defaults to the one pulled from Map View, allow changing).
> - **Step 2:** Select Delivery Time Slot based on predefined constants.
> - **Step 3:** Payment Method (COD or Wallet). Verify `walletBalance >= cartTotal`. Lock the 'Place Order' button otherwise. Write to `orders` collection on success."

---

## 🎨 Design System & Aesthetics Instruction (Crucial)
Append this to every generation request:
> *"The Flutter UI MUST be visually stunning and feel native. Do not use standard plain Material UI. Use a harmonious palette (Deep Greens for Agrimore branding, Gold accents for premium elements). Containers must have smooth `BorderRadius.circular(16+)`, `BackdropFilter` for glassmorphism effects where appropriate, subtle `BoxShadow`, and `#F9FAFB` off-white backgrounds. Ensure all interactions have subtle scale or ripple animations using `AnimatedContainer` or `GestureDetector`."*
