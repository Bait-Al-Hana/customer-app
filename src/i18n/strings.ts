/**
 * i18n strings and pure helpers — no React, no React Native.
 *
 * This is the single source of translated copy and the pure logic that resolves
 * it, so every rule here (fallback, interpolation, which name to show) is
 * unit-tested in the fast logic suite. The React layer (`LanguageProvider`)
 * only holds the current language and hands these functions it.
 *
 * Scope note: this dictionary covers the app's highest-traffic surfaces (tab
 * bar, Account, and the core browse/cart/checkout actions). Adding a screen's
 * copy is one entry per string here — the framework is complete even where a
 * particular string is not yet translated, because {@link translate} falls back
 * to English and then to the key itself, so a missing entry degrades to
 * readable English rather than a blank or a crash.
 */

/** The languages the app offers. Arabic is right-to-left. */
export type Lang = 'en' | 'ar';

export const LANGS: readonly Lang[] = ['en', 'ar'];

/** True when the language reads right-to-left. */
export function isRtlLang(lang: Lang): boolean {
  return lang === 'ar';
}

/** The storage key for the saved language preference. */
export const LANG_STORAGE_KEY = 'app.language';

/**
 * Resolves a stored value (or anything untrusted) to a supported language.
 * Anything that is not exactly `'ar'` is English — the safe, LTR default.
 */
export function resolveLang(stored: string | null | undefined): Lang {
  return stored === 'ar' ? 'ar' : 'en';
}

/** Each key maps to its copy in both languages. */
type Entry = { en: string; ar: string };

/**
 * The translated copy. Keys are dotted and grouped by area. Both languages are
 * required for every key, so a half-translated entry cannot be added silently.
 */
export const STRINGS = {
  // Bottom tab bar
  'tab.home': { en: 'Home', ar: 'الرئيسية' },
  'tab.search': { en: 'Search', ar: 'البحث' },
  'tab.orders': { en: 'Orders', ar: 'الطلبات' },
  'tab.offers': { en: 'Offers', ar: 'العروض' },
  'tab.account': { en: 'Account', ar: 'الحساب' },

  // Common actions
  'common.add': { en: 'Add', ar: 'إضافة' },
  'common.viewCart': { en: 'View cart', ar: 'عرض السلة' },
  'common.checkout': { en: 'Checkout', ar: 'إتمام الطلب' },
  'common.placeOrder': { en: 'Place order', ar: 'تأكيد الطلب' },
  'common.track': { en: 'Track', ar: 'تتبّع' },
  'common.view': { en: 'View', ar: 'عرض' },
  'common.reorder': { en: 'Reorder', ar: 'إعادة الطلب' },
  'common.retry': { en: 'Retry', ar: 'إعادة المحاولة' },
  'common.search': { en: 'Search', ar: 'بحث' },

  // Account
  'account.title': { en: 'Account', ar: 'الحساب' },
  'account.welcome': { en: 'Welcome back', ar: 'مرحباً بعودتك' },
  'account.section.activity': { en: 'Orders & activity', ar: 'الطلبات والنشاط' },
  'account.section.preferences': { en: 'Preferences', ar: 'التفضيلات' },
  'account.section.support': { en: 'Support & legal', ar: 'الدعم والمعلومات القانونية' },
  'account.row.myOrders': { en: 'My orders', ar: 'طلباتي' },
  'account.row.notifications': { en: 'Notifications', ar: 'الإشعارات' },
  'account.row.favorites': { en: 'Favorites', ar: 'المفضلة' },
  'account.row.rewards': { en: 'Rewards', ar: 'المكافآت' },
  'account.row.offers': { en: 'Offers & coupons', ar: 'العروض والكوبونات' },
  'account.row.addresses': { en: 'Saved addresses', ar: 'العناوين المحفوظة' },
  'account.row.payments': { en: 'Payment methods', ar: 'طرق الدفع' },
  'account.row.notificationSettings': { en: 'Notification settings', ar: 'إعدادات الإشعارات' },
  'account.row.help': { en: 'Help & support', ar: 'المساعدة والدعم' },
  'account.row.privacy': { en: 'Privacy policy', ar: 'سياسة الخصوصية' },
  'account.row.terms': { en: 'Terms of service', ar: 'شروط الاستخدام' },
  'account.row.deleteAccount': { en: 'Delete my account', ar: 'حذف حسابي' },
  'account.logout': { en: 'Log out', ar: 'تسجيل الخروج' },
  'account.cartItems': {
    en: 'You have {count} item(s) in your cart',
    ar: 'لديك {count} عنصر في سلتك',
  },

  // Language
  'language.title': { en: 'Language', ar: 'اللغة' },
  'language.english': { en: 'English', ar: 'English' },
  'language.arabic': { en: 'العربية', ar: 'العربية' },
  'language.restartNote': {
    en: 'Text and prices switch now. The full right-to-left layout finishes applying after you restart the app.',
    ar: 'يتغيّر النص والأسعار الآن. يكتمل تطبيق التخطيط من اليمين إلى اليسار بالكامل بعد إعادة تشغيل التطبيق.',
  },

  // Menu / Search / Orders
  'menu.searchPlaceholder': { en: 'Search the menu', ar: 'ابحث في القائمة' },
  'menu.categoryAll': { en: 'All', ar: 'الكل' },

  // Product detail
  'product.chooseSize': { en: 'Choose size', ar: 'اختر الحجم' },
  'product.requiredPick1': { en: 'Required · pick 1', ar: 'مطلوب · اختر ١' },
  'product.optionalPick1': { en: 'Optional · pick 1', ar: 'اختياري · اختر ١' },
  'product.requiredUpTo': { en: 'Required · up to {n}', ar: 'مطلوب · حتى {n}' },
  'product.optionalUpTo': { en: 'Optional · up to {n}', ar: 'اختياري · حتى {n}' },
  'product.free': { en: 'Free', ar: 'مجاناً' },
  'product.specialInstructions': { en: 'Special instructions', ar: 'تعليمات خاصة' },
  'product.instructionsPlaceholder': { en: 'e.g. no onions, extra spicy…', ar: 'مثال: بدون بصل، حار إضافي…' },
  'product.addToCart': { en: 'Add to cart · {price}', ar: 'أضف إلى السلة · {price}' },
  'product.selectOption': { en: 'Select {name}', ar: 'اختر {name}' },
  'product.options': { en: 'options', ar: 'الخيارات' },
  'orders.title': { en: 'My orders', ar: 'طلباتي' },
  'orders.tab.active': { en: 'Active', ar: 'الحالية' },
  'orders.tab.past': { en: 'Past', ar: 'السابقة' },
} as const satisfies Record<string, Entry>;

/** Every valid string key. A typo is a type error, not a silent English string. */
export type StringKey = keyof typeof STRINGS;

/**
 * Translates a key into the given language, interpolating `{name}` tokens.
 *
 * Fallback order: requested language → English → the key itself. So a key with
 * no Arabic yet reads in English (never blank), and an unknown key reads as its
 * own name (visible in testing, never a crash).
 */
export function translate(
  lang: Lang,
  key: StringKey,
  vars?: Record<string, string | number>,
): string {
  const entry = STRINGS[key] as Entry | undefined;
  const template = entry ? (entry[lang] ?? entry.en) : key;
  if (!vars) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

/**
 * Picks the right display name for a backend-provided value that carries an
 * English name and an optional Arabic one (`name` / `nameAr`).
 *
 * In Arabic it prefers `nameAr` and falls back to the English name when the
 * backend has none for that row — showing *something real* always beats a gap.
 * In English it uses the English name. A null English name falls back to the
 * Arabic one rather than rendering empty.
 */
export function localizedName(
  lang: Lang,
  name: string | null | undefined,
  nameAr: string | null | undefined,
): string {
  if (lang === 'ar') {
    return (nameAr || name || '').toString();
  }
  return (name || nameAr || '').toString();
}
