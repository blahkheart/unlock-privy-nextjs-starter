import type { NextApiRequest, NextApiResponse } from "next";
import {
  verifyAndParseWebhook,
  isTestNotification,
  isTransactionNotification,
  isNotificationProcessed,
  markNotificationProcessed,
  createWebhookResponse,
  extractTransactionLogData,
} from "@/lib/stereum-pay/webhooks";
import {
  getPurchaseIntentByIdempotencyKey,
  updatePurchaseIntentStatus,
} from "@/lib/stereum-pay/purchase-intents";
import { purchaseKeyWithRelayer } from "@/lib/unlock/relayer";
import { getLogger } from "@/lib/utils/logger";
import { getAddress, type Address, type Hex } from "viem";

const log = getLogger("stereum-webhook");

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. Get raw body for signature verification
    const rawBody = JSON.stringify(req.body);

    log.debug("Received webhook", {
      headers: {
        "x-signature": req.headers["x-signature"],
        "x-timestamp": req.headers["x-timestamp"],
      },
      body_length: rawBody.length,
    });

    // 2. Verify webhook with correct header names
    const verificationResult = verifyAndParseWebhook(
      rawBody,
      {
        "x-signature": req.headers["x-signature"] as string,
        "x-timestamp": req.headers["x-timestamp"] as string,
      },
      process.env.STEREUM_API_KEY!
    );

    if (!verificationResult.isValid) {
      log.warn("Webhook verification failed", {
        error: verificationResult.error,
      });
      const response = createWebhookResponse(
        false,
        "Webhook verification failed"
      );
      return res.status(response.status).json(response.body);
    }

    const notification = verificationResult.notification!;

    // 3. Check for duplicate processing
    if (isNotificationProcessed(notification.id)) {
      log.debug("Notification already processed", {
        notification_id: notification.id,
      });
      const response = createWebhookResponse(true, "Already processed");
      return res.status(response.status).json(response.body);
    }

    // 4. Handle test notifications
    if (isTestNotification(notification)) {
      log.debug("Received test notification", {
        notification_id: notification.id,
      });
      const response = createWebhookResponse(
        true,
        "Test notification received"
      );
      return res.status(response.status).json(response.body);
    }

    // 5. Handle transaction notifications
    if (isTransactionNotification(notification)) {
      const { transaction } = notification;

      const logData = extractTransactionLogData(notification);
      log.info("Processing transaction notification", logData);

      // Mark as processed to prevent duplicates
      markNotificationProcessed(notification.id);

      // Only process successful payments
      if (transaction.status === "PAGADO") {
        try {
          // Retrieve purchase intent from storage using idempotency key
          const purchaseIntent = getPurchaseIntentByIdempotencyKey(
            transaction.idempotency_key
          );

          if (!purchaseIntent) {
            log.warn("Purchase intent not found for transaction", {
              transaction_id: transaction.id,
              idempotency_key: transaction.idempotency_key,
            });

            const response = createWebhookResponse(
              true,
              "Purchase intent not found"
            );
            return res.status(response.status).json(response.body);
          }

          // Update purchase intent status to 'paid' first
          updatePurchaseIntentStatus(transaction.idempotency_key, "paid");

          // Execute on-chain key purchase using relayer
          log.info("Executing on-chain key purchase", {
            transaction_id: transaction.id,
            lock_address: purchaseIntent.lockAddress,
            recipient: purchaseIntent.recipientAddress,
            chain_id: purchaseIntent.metadata.chainId,
          });

          // Purchase key using relayer service
          const result = await purchaseKeyWithRelayer({
            lockAddress: getAddress(purchaseIntent.lockAddress) as Address,
            recipient: getAddress(purchaseIntent.recipientAddress) as Address,
            chainId: purchaseIntent.metadata.chainId,
            lockPriceWei: BigInt(purchaseIntent.metadata.lockPriceWei),
            keyManager: getAddress(purchaseIntent.recipientAddress) as Address,
            referrer: "0x0000000000000000000000000000000000000000" as Address,
            data: "0x" as Hex,
          });

          if (result.success) {
            log.info("Key purchase successful", {
              transaction_id: transaction.id,
              recipient: purchaseIntent.recipientAddress,
              txHash: result.transactionHash,
              tokenIds: result.tokenIds?.map((id) => id.toString()),
            });

            // Update purchase intent status to 'minted' (STATELESS - in-memory)
            // WITH DATABASE: Replace with database update
            updatePurchaseIntentStatus(
              transaction.idempotency_key,
              "minted",
              result.transactionHash
            );

            // TODO: Send confirmation email to customer
            // await sendConfirmationEmail(purchaseIntent);
          } else {
            log.error("Key purchase failed", {
              transaction_id: transaction.id,
              error: result.error,
            });

            // Update purchase intent status to 'failed' (STATELESS - in-memory)
            // WITH DATABASE: Replace with database update
            updatePurchaseIntentStatus(transaction.idempotency_key, "failed");

            // TODO: Send failure notification
          }
        } catch (purchaseError) {
          log.error("Error processing payment success", {
            transaction_id: transaction.id,
            error: purchaseError,
          });

          // Update purchase intent status to 'failed' on error
          try {
            const purchaseIntent = getPurchaseIntentByIdempotencyKey(
              transaction.idempotency_key
            );
            if (purchaseIntent) {
              updatePurchaseIntentStatus(transaction.idempotency_key, "failed");
            }
          } catch (updateError) {
            log.error("Failed to update purchase intent status", {
              error: updateError,
            });
          }

          // Don't return error - webhook was processed successfully
          // The payment was received, we just failed to mint the key
        }
      } else {
        log.info("Transaction status update", {
          transaction_id: transaction.id,
          status: transaction.status,
          status_description: transaction.status_description,
        });

        // Update purchase intent with new status if needed
        // For non-PAGADO statuses, we might want to update to 'cancelled' or 'expired'
        const purchaseIntent = getPurchaseIntentByIdempotencyKey(
          transaction.idempotency_key
        );

        if (purchaseIntent) {
          if (transaction.status === "CANCELADO") {
            updatePurchaseIntentStatus(
              transaction.idempotency_key,
              "cancelled"
            );
          }
        }
      }
    }

    // Always return 200 for valid webhooks
    const response = createWebhookResponse(
      true,
      "Webhook processed successfully"
    );
    res.status(response.status).json(response.body);
  } catch (error) {
    log.error("Webhook processing failed", { error });
    const response = createWebhookResponse(false, "Internal server error");
    res.status(response.status).json(response.body);
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};
