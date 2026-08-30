const en = {
  // App
  appName: 'Bait Al Hana',

  // Auth
  phoneTitle: 'Sign in',
  phoneLabel: 'Phone number',
  phonePlaceholder: '+966 5XX XXX XXXX',
  phoneSend: 'Send code',
  otpTitle: 'Enter code',
  otpLabel: 'Verification code',
  otpVerify: 'Verify',
  otpResend: 'Resend code',
  signOut: 'Sign out',

  // Branches
  branchesTitle: 'Bait Al Hana',
  closedNow: 'Closed now',
  delivery: 'Delivery',
  minOrder: 'Min',
  noBranches: 'No branches yet',
  noBranchesMsg: 'Please check back soon.',
  branchLoadError: "Couldn't load branches",

  // Menu
  menuEmpty: 'Menu is empty',
  menuEmptyMsg: 'This branch has nothing available right now.',
  menuLoadError: "Couldn't load the menu",
  addToCart: 'Add',
  viewCart: 'View cart',
  items: 'items',
  item: 'item',
  selectVariant: 'Choose an option',
  selectAddons: 'Add extras',
  required: 'Required',
  optional: 'Optional',
  calories: 'cal',
  prepTime: 'min',
  allergens: 'Allergens',
  ingredients: 'Ingredients',

  // Cart
  cartTitle: 'Cart',
  cartEmpty: 'Your cart is empty',
  cartEmptyMsg: 'Add items from the menu to get started.',
  checkout: 'Checkout',
  clearCart: 'Clear',
  estimatedTotal: 'Estimated total',

  // Checkout
  checkoutTitle: 'Checkout',
  pickup: 'Pickup',
  deliveryType: 'Delivery',
  deliverTo: 'Deliver to',
  noAddress: 'No saved address yet.',
  addAddress: '+ Add a new address',
  orderTotal: 'Order total',
  subtotal: 'Subtotal',
  discount: 'Discount',
  deliveryFee: 'Delivery',
  vatIncl: 'VAT (incl.)',
  total: 'Total',
  paymentMethod: 'Payment method',
  change: 'Change',
  placeOrder: 'Place order',
  addDeliveryAddress: 'Add a delivery address',
  priceError: "Couldn't price your order",
  placeError: 'Could not place the order. Try again.',
  paymentNote: 'Payment is confirmed by our server — never by this screen alone.',
  couponCode: 'Coupon code',
  couponPlaceholder: 'Enter code',
  applyCoupon: 'Apply',
  removeCoupon: 'Remove',
  couponApplied: 'Coupon applied',
  couponInvalid: 'Invalid coupon code',

  // Payment methods
  methodCard: 'Card',
  methodMada: 'mada',
  methodApplePay: 'Apple Pay',
  methodCod: 'Cash on delivery',

  // Addresses
  addressTitle: 'Add address',
  addressLabel: 'Label',
  addressLine1: 'Street address',
  addressLine2: 'Apt, floor (optional)',
  addressCity: 'City',
  addressDistrict: 'District (optional)',
  addressPostal: 'Postal code (optional)',
  addressNotes: 'Delivery notes (optional)',
  addressSave: 'Save address',

  // Orders
  ordersTitle: 'My orders',
  ordersEmpty: 'No orders yet',
  ordersEmptyMsg: "Your orders will appear here once you've placed one.",
  ordersLoadError: "Couldn't load your orders",
  orderNumber: 'Order',
  cancel: 'Cancel',
  cancelOrder: 'Cancel order',
  cancelReason: 'Reason (optional)',
  cancelConfirm: 'Yes, cancel',

  // Order tracking
  trackingTitle: 'Order tracking',
  trackingLoadError: "Couldn't load tracking info",
  driverAssigned: 'Driver assigned',
  estimatedArrival: 'Estimated arrival',

  // Payment processing
  paymentTitle: 'Payment',
  paymentProcessing: 'Processing your payment...',
  paymentWaiting: 'Waiting for confirmation',
  paymentSuccess: 'Payment confirmed',
  paymentFailed: 'Payment failed',
  paymentRetry: 'Try again',

  // Profile
  profileTitle: 'Profile',
  profileName: 'Full name',
  profilePhone: 'Phone',
  profileEmail: 'Email',
  profileSave: 'Save',
  profileSaved: 'Profile saved',
  myAddresses: 'My addresses',
  deleteAddress: 'Delete',

  // Loyalty
  loyaltyTitle: 'Loyalty',
  loyaltyPoints: 'points',
  loyaltyBalance: 'Your balance',
  loyaltyHistory: 'History',
  loyaltyEmpty: 'No points yet',
  loyaltyEmptyMsg: 'Earn points with every delivered order.',
  loyaltyEarn: 'Earn',
  loyaltyRedeem: 'Redeem',
  loyaltyReverse: 'Reversed',
  loyaltyAdjust: 'Adjustment',

  // Favourites
  favouritesTitle: 'Favourites',
  favouritesEmpty: 'No favourites yet',
  favouritesEmptyMsg: 'Tap the heart on items you love.',
  addFavourite: 'Add to favourites',
  removeFavourite: 'Remove from favourites',

  // Common
  retry: 'Retry',
  loading: 'Loading...',
  save: 'Save',
  done: 'Done',
  ok: 'OK',
  error: 'Error',
  noConnection: 'No connection',
  noConnectionMsg: 'Check your network and try again.',

  // Pricing breakdown
  serviceFee: 'Service fee',
  packagingFee: 'Packaging fee',
  platformFee: 'Platform fee',
  otherCharges: 'Other charges',
} as const;

export type TranslationKey = keyof typeof en;
export type Translations = Record<TranslationKey, string>;
export default en;
