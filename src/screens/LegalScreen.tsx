import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, View } from 'react-native';

import { AppText, Card, Screen } from '../components';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/theme';

/**
 * The privacy notice and the terms, in one screen keyed by which one was asked
 * for.
 *
 * **These describe what the app actually does** — the data it collects, why it
 * has it, and the rules of ordering as this platform implements them — rather
 * than boilerplate copied from another company. They are written to be read.
 *
 * **This is the summary; `infrastructure/legal/` is the document.** The full
 * privacy notice and terms — the ones a store listing links to and a regulator
 * reads — are the published HTML pages, which carry the controller's identity,
 * the legal basis for each purpose, the retention table, the transfer
 * disclosure and the complaint route. This screen is the readable version of
 * the same facts, and it says so on the page.
 *
 * They are maintained by hand, so **a change to one is a change to both, in the
 * same commit.** A summary that contradicts the document it summarises is worse
 * than no summary: the customer read this one, and the regulator will read the
 * other.
 *
 * They are **not a substitute for the restaurant's own legal review.** A
 * customer-facing policy is the restaurant's legal document, not the app's, so
 * each page says plainly that it is the working version and names the review as
 * outstanding. Do not remove that line without a lawyer's copy to replace the
 * text with.
 */
const LAST_UPDATED = '6 September 2026';

interface Section {
  heading: string;
  body: string[];
}

const PRIVACY: Section[] = [
  {
    heading: 'What we hold, and why',
    body: [
      'Your mobile number, because it is how you sign in and how the branch reaches you about an order.',
      'Your name, if you give one, so the branch and the driver know who the order is for.',
      'The addresses you save, including the map pin, because the delivery fee is worked out from the distance between the branch and that pin, and the driver navigates to it.',
      'Your orders: what you ordered, from which branch, what it cost and how it was paid. This is the restaurant’s record of a sale.',
    ],
  },
  {
    heading: 'What we do not hold',
    body: [
      'Card details. Payments are taken on the payment provider’s own page — card numbers never reach this app or the restaurant’s systems.',
      'Your location in the background. The app asks for your location only while you are choosing a delivery address, and only if you allow it.',
    ],
  },
  {
    heading: 'Where it is kept',
    body: [
      'Your data is held on Google Cloud servers, and some of our providers process it outside Saudi Arabia. Where personal data leaves the Kingdom, the Personal Data Protection Law requires an appropriate basis for the transfer.',
      'The full privacy notice names the country, the providers and the basis relied on. Ask us for it at any time.',
    ],
  },
  {
    heading: 'Who else sees it',
    body: [
      'The branch preparing your order, and the driver delivering it. A driver is given the address and the name on the order — never your phone number.',
      'The payment provider, for the payment itself.',
      'Nobody else. Your details are not sold, and are not shared for advertising.',
    ],
  },
  {
    heading: 'How long we keep it',
    body: [
      'Order and payment records are kept as the restaurant’s business records, as required for tax and accounting. They are kept even after an account is deleted — with the name and phone number removed from them.',
      'Your profile and saved addresses are kept until you remove them, or until you delete your account.',
    ],
  },
  {
    heading: 'Your rights',
    body: [
      'You can ask what we hold about you, ask for a copy of it, ask us to correct anything wrong, and ask us to destroy data we no longer need. We answer within 30 days, and we do not charge for it.',
      'That last right does not cover records we are required by law to keep, such as sales and VAT records — see “How long we keep it” above.',
      'If you are not satisfied with how we have handled your data, you can complain to the Saudi Data and Artificial Intelligence Authority (SDAIA), which supervises the Personal Data Protection Law.',
    ],
  },
  {
    heading: 'Your choices',
    body: [
      'You can edit your name, and add or remove saved addresses, from Account at any time.',
      'You can delete your account from Account → Delete my account. That erases your name, your email, and every saved address, releases your phone number so it can be used again, and signs you out on every device. Past orders remain as the restaurant’s sales and tax records, with your name and number removed from them.',
      'To ask for a copy of your data, contact the branch — the numbers are under Help & support.',
    ],
  },
];

const TERMS: Section[] = [
  {
    heading: 'Ordering',
    body: [
      'An order is placed when you confirm it in the app. The branch may still decline it — if the kitchen is at capacity, or an item has just sold out — and will tell you why.',
      'Prices, VAT, delivery fees and any discount are worked out by our servers and shown in full at checkout before you pay. The total you approve is the total charged.',
      'Menu availability is per branch. An item shown as unavailable cannot be ordered from that branch, even if another branch has it.',
    ],
  },
  {
    heading: 'Delivery and pickup',
    body: [
      'Delivery is made by the restaurant’s own team from the branch nearest your address. Delivery orders have a minimum basket value and a maximum distance, both shown at checkout when they apply.',
      'For pickup you choose the branch, and collect at the counter.',
      'Preparation and delivery times shown in the app are estimates, not guarantees.',
    ],
  },
  {
    heading: 'Payment and refunds',
    body: [
      'Card payments are taken by our payment provider. Cash on delivery is available only where a branch offers it.',
      'An order can be cancelled from the app until the kitchen starts preparing it. After that, speak to the branch.',
      'Refunds are issued by the branch back to the original payment method. We start a refund straight away; how long it takes to appear is up to your bank.',
    ],
  },
  {
    heading: 'Offers and coupons',
    body: [
      'A coupon code applies only if its conditions are met — a minimum spend, an end date, and sometimes a limit of one use per customer. Checkout tells you when a code does not apply, and prices your basket without it.',
      'Offers can be withdrawn or changed at any time. A code that has already been applied to a placed order is not affected.',
    ],
  },
  {
    heading: 'Your account',
    body: [
      'Keep your phone secure: anyone who can receive your verification code can sign in as you.',
      'You can delete your account at any time from Account → Delete my account. Past orders remain as the restaurant’s sales and tax records, with your name and number removed from them — see the privacy policy.',
      'Accounts are for personal use. The restaurant may close an account used for fraud or abuse of staff or drivers.',
    ],
  },
];

export function LegalScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Legal'>): React.JSX.Element {
  const theme = useTheme();
  const isPrivacy = route.params.document === 'privacy';
  const sections = isPrivacy ? PRIVACY : TERMS;

  return (
    <Screen
      title={isPrivacy ? 'Privacy policy' : 'Terms of service'}
      subtitle={`Last updated ${LAST_UPDATED}`}
      onBack={() => navigation.goBack()}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
        <Card>
          <AppText variant="bodySmall" color="textMuted" style={{ lineHeight: 20 }}>
            {isPrivacy
              ? 'This explains what the Bait Al Hana app collects and why, in plain language.'
              : 'These are the rules of ordering through the Bait Al Hana app.'}{' '}
            This is a plain-language summary of the full document, which the restaurant publishes
            separately. Both are drafts pending the restaurant’s own legal review before launch.
          </AppText>
        </Card>

        {sections.map((section) => (
          <View key={section.heading}>
            <AppText variant="h3" style={{ fontSize: 16, marginBottom: 8, marginLeft: 4 }}>
              {section.heading}
            </AppText>
            <Card>
              {section.body.map((paragraph, i) => (
                <View key={paragraph} style={{ flexDirection: 'row', gap: 8, marginTop: i === 0 ? 0 : 10 }}>
                  <View
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: theme.colors.primary,
                      marginTop: 8,
                    }}
                  />
                  <AppText variant="bodySmall" color="textMuted" style={{ flex: 1, lineHeight: 20 }}>
                    {paragraph}
                  </AppText>
                </View>
              ))}
            </Card>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}
