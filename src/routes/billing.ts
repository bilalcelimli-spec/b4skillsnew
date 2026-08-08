/**
 * src/routes/billing.ts
 *
 * Billing / payment routes extracted from server.ts for maintainability.
 */
import express from "express";

export function createBillingRouter(
  checkRole: (roles: string[]) => express.RequestHandler,
) {
  const router = express.Router();

  // POST /api/payments/checkout
  router.post("/payments/checkout", async (req, res) => {
    const { userId, organizationId, credits } = req.body;
    try {
      const { PaymentService } = await import("../lib/payments/payment-service.js");
      const url = await PaymentService.createCheckoutSession(userId, organizationId, credits);
      res.json({ url });
    } catch (err) {
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // POST /api/payments/webhook — raw body required for Stripe signature verification
  router.post(
    "/payments/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      try {
        const { PaymentService } = await import("../lib/payments/payment-service.js");
        const event = JSON.parse(req.body.toString());
        await PaymentService.handleWebhook(event);
        res.json({ received: true });
      } catch (err) {
        res.status(400).send(`Webhook Error: ${(err as Error).message}`);
      }
    },
  );

  return router;
}
