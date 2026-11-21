/**
 * Provider-neutral boundary for the marketplace payment integration.
 * Razorpay Route is the initial planned provider, but this prototype must not
 * collect payment details or report successful payment until a trusted server
 * implementation, verified webhooks, and an approved merchant account exist.
 */
export type PaymentProvider = 'razorpay-route' | 'cashfree-easy-split' | 'manual';

export type PaymentReadiness = {
  provider: PaymentProvider;
  configured: boolean;
  live: false;
  reason: string;
};

/** Safe default: checkout is deliberately unavailable until the complete flow is wired. */
export const paymentReadiness: PaymentReadiness = {
  provider: 'razorpay-route',
  configured: false,
  live: false,
  reason: 'Marketplace onboarding, server-side order creation, signed webhook verification, and payment-state persistence are not configured.',
};

/**
 * Replace this boundary with the selected provider adapter only after the
 * order-creation and verified-webhook path is deployed. Never treat a browser
 * redirect or client callback as proof that payment succeeded.
 */
export async function beginPaymentCheckout(_orderId: string): Promise<never> {
  throw new Error(`Checkout is unavailable: ${paymentReadiness.reason}`);
}
