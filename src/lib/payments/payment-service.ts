import Stripe from "stripe";
import { prisma } from "../prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-01-27.acacia" as any,
});

export const PaymentService = {
  /**
   * Create a Stripe Checkout Session for buying credits
   */
  async createCheckoutSession(userId: string, organizationId: string | null, credits: number) {
    const amount = credits * 1000; // $10.00 per credit for example

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${credits} b4skills Test Credits`,
              description: "Credits for adaptive English proficiency assessments.",
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/payment/cancel`,
      metadata: {
        userId,
        organizationId: organizationId || "",
        credits: credits.toString(),
      },
    });

    // Create a pending transaction
    await (prisma as any).paymentTransaction.create({
      data: {
        userId,
        organizationId,
        amount,
        status: "PENDING",
        stripeSessionId: session.id,
        creditsAdded: credits,
      },
    });

    return session.url;
  },

  /**
   * Handle Stripe Webhook
   */
  async handleWebhook(event: Stripe.Event) {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const stripeSessionId = session.id;

      const transaction = await (prisma as any).paymentTransaction.findUnique({
        where: { stripeSessionId },
      });

      if (transaction && transaction.status === "PENDING") {
        await prisma.$transaction(async (tx: any) => {
          // Update transaction
          await tx.paymentTransaction.update({
            where: { id: transaction.id },
            data: { status: "COMPLETED" },
          });

          // Add credits to license
          if (transaction.organizationId) {
            const license = await tx.license.findFirst({
              where: { organizationId: transaction.organizationId },
            });

            if (license) {
              await tx.license.update({
                where: { id: license.id },
                data: { credits: { increment: transaction.creditsAdded } },
              });
            } else {
              await tx.license.create({
                data: {
                  organizationId: transaction.organizationId,
                  type: "ENTERPRISE",
                  credits: transaction.creditsAdded,
                },
              });
            }
          }
        });
      }
    }
  },
};
