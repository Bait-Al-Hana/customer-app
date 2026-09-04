/**
 * The component library's public surface. Screens import from here, so the kit
 * is one reviewable list and internal files can move without churn.
 */

export { AppText } from './AppText';
export type { AppTextProps } from './AppText';
export { Screen, Button, PrimaryButton, IconButton, Card, Divider, TextField } from './ui';
export type { ButtonVariant } from './ui';
export {
  Chip,
  Badge,
  StatusBadge,
  SearchBar,
  SectionHeader,
  PriceRow,
  Rating,
  Rail,
  useToneColors,
} from './primitives';
export { GradientSurface } from './GradientSurface';
export { FoodImage, glyphFor } from './FoodImage';
export { FavoriteButton } from './FavoriteButton';
export { AddButton } from './AddButton';
export { BillSummary } from './BillSummary';
export { SuccessCheck } from './SuccessState';
export {
  FoodCard,
  FoodListItem,
  CategoryCard,
  PromoBanner,
  OrderCard,
  AddressCard,
  PaymentMethodCard,
} from './cards';
export type { FoodCardData, PromoBannerData } from './cards';
