import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Order } from "./types";

export const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://ytwvhalzdaofstxbfupn.supabase.co";
export const SUPABASE_KEY =
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "sb_publishable_FwadA2hY9PYMGjuD6ZBXDw_EhJsASBJ";

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  if (!clientInstance) {
    try {
      clientInstance = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          persistSession: false,
        },
      });
    } catch (err) {
      console.warn("Failed to initialize Supabase client:", err);
      clientInstance = null;
    }
  }
  return clientInstance;
}

/**
 * Checks if the remote "orders" table is reachable in Supabase.
 */
export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  tableReady: boolean;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { connected: false, tableReady: false, error: "Missing Supabase client" };
  }

  try {
    const { data, error } = await client.from("orders").select("id").limit(1);
    if (error) {
      return { connected: true, tableReady: false, error: error.message };
    }
    return { connected: true, tableReady: true };
  } catch (err: any) {
    return { connected: false, tableReady: false, error: err?.message || String(err) };
  }
}

/**
 * Fetches all orders from Supabase if table is ready.
 */
export async function fetchOrdersFromSupabase(): Promise<Order[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from("orders")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.warn("Supabase orders query note:", error.message);
      return null;
    }

    if (Array.isArray(data)) {
      return data.map((row: any) => {
        // Handle items if stored as JSON or string
        let items = row.items;
        if (typeof items === "string") {
          try {
            items = JSON.parse(items);
          } catch {
            items = [];
          }
        }
        return {
          id: Number(row.id),
          orderCode: String(row.order_code || row.orderCode || `ORD-${row.id}`),
          customerId: String(row.customer_id || row.customerId || ""),
          customerName: String(row.customer_name || row.customerName || ""),
          customerPhone: String(row.customer_phone || row.customerPhone || ""),
          fulfillmentType: "delivery",
          deliveryAddress: String(row.delivery_address || row.deliveryAddress || ""),
          notes: row.notes || null,
          paymentMethod: row.payment_method || row.paymentMethod || "cod",
          paymentWalletPhone: row.payment_wallet_phone || row.paymentWalletPhone || null,
          paymentReceiptImage: row.payment_receipt_image || row.paymentReceiptImage || null,
          status: row.status || "Pending",
          subtotal: Number(row.subtotal || 0),
          deliveryFee: Number(row.delivery_fee ?? row.deliveryFee ?? 25),
          discountAmount: Number(row.discount_amount ?? row.discountAmount ?? 0),
          totalAmount: Number(row.total_amount ?? row.totalAmount ?? 0),
          isPaid: Boolean(row.is_paid ?? row.isPaid),
          isArchived: Boolean(row.is_archived ?? row.isArchived),
          isDeletedFromArchive: Boolean(row.is_deleted_from_archive ?? row.isDeletedFromArchive),
          createdAt: row.created_at || row.createdAt || new Date().toISOString(),
          startedAt: row.started_at || row.startedAt || null,
          finishedAt: row.finished_at || row.finishedAt || null,
          rejectedAt: row.rejected_at || row.rejectedAt || null,
          rejectionReason: row.rejection_reason || row.rejectionReason || null,
          archivedAt: row.archived_at || row.archivedAt || null,
          archivedDeletedAt: row.archived_deleted_at || row.archivedDeletedAt || null,
          items: Array.isArray(items) ? items : [],
        } as Order;
      });
    }

    return null;
  } catch (err) {
    console.warn("fetchOrdersFromSupabase exception:", err);
    return null;
  }
}

/**
 * Saves/upserts an order to Supabase.
 */
export async function syncOrderToSupabase(order: Order): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const payload = {
      id: order.id,
      order_code: order.orderCode,
      customer_id: order.customerId,
      customer_name: order.customerName,
      customer_phone: order.customerPhone,
      fulfillment_type: order.fulfillmentType,
      delivery_address: order.deliveryAddress,
      notes: order.notes,
      payment_method: order.paymentMethod,
      payment_wallet_phone: order.paymentWalletPhone,
      payment_receipt_image: order.paymentReceiptImage,
      status: order.status,
      subtotal: order.subtotal,
      delivery_fee: order.deliveryFee,
      discount_amount: order.discountAmount,
      total_amount: order.totalAmount,
      is_paid: order.isPaid,
      is_archived: order.isArchived,
      is_deleted_from_archive: order.isDeletedFromArchive,
      created_at: order.createdAt,
      started_at: order.startedAt,
      finished_at: order.finishedAt,
      rejected_at: order.rejectedAt,
      rejection_reason: order.rejectionReason,
      archived_at: order.archivedAt,
      archived_deleted_at: order.archivedDeletedAt,
      items: order.items,
    };

    const { error } = await client.from("orders").upsert(payload, { onConflict: "id" });
    if (error) {
      console.warn("syncOrderToSupabase note:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("syncOrderToSupabase exception:", err);
    return false;
  }
}
