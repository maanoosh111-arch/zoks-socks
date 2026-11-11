export interface PublicProduct {
  id: string;
  category: string;
  name: string;
  price: number;
  priceFormatted: string;
  description: string;
  image: string;
  extraImages: string[];
  allImages: string[];
}

export interface InternalProduct extends PublicProduct {
  cost?: number | null;
  profit: number | null;
}

export interface CartItem {
  product: PublicProduct;
  quantity: number;
}

export type PaymentMethod =
  | "vodafone_cash"
  | "orange_cash"
  | "etisalat_cash"
  | "instapay"
  | "cod";

export interface OrderItem {
  id?: number;
  orderId?: number;
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  unitProfitSnapshot?: number | null;
  profitSnapshotAvailable?: boolean;
  image?: string;
}

export interface Order {
  id: number;
  orderCode: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  fulfillmentType: "delivery";
  deliveryAddress: string;
  notes?: string | null;
  paymentMethod: PaymentMethod;
  paymentWalletPhone?: string | null;
  paymentReceiptImage?: string | null;
  status: "Pending" | "In Progress" | "Finished" | "Rejected";
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  totalAmount: number;
  isPaid: boolean;
  isArchived: boolean;
  isDeletedFromArchive: boolean;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  archivedAt?: string | null;
  archivedDeletedAt?: string | null;
  items: OrderItem[];
  notification?: {
    status: string;
    message: string;
  } | null;
}

export interface SoldProductItem {
  id: string;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unitProfit: number;
  totalProfit: number;
  mohamedProfit: number;
  abdelrahmanProfit: number;
  ahmedProfit?: number; // legacy alias
  orderCode: string;
  soldAt: string;
}

export interface SalesProfitsData {
  period: "today" | "week" | "month";
  totalRevenue: number;
  totalProfit: number;
  totalDeliveryFees: number;
  totalNetWithDelivery: number;
  mohamedTotalProfit: number;
  abdelrahmanTotalProfit: number;
  ahmedTotalProfit?: number; // legacy alias
  totalOrdersCount: number;
  finishedOrdersCount: number;
  pendingOrdersCount: number;
  inProgressOrdersCount: number;
  rejectedOrdersCount: number;
  totalItemsSold: number;
  profitMarginPercent: number;
  completedOrders: Order[];
  soldProducts: SoldProductItem[];
  baselineResetAt: string | null;
  generatedAt: string;
}

export interface StoreSettings {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  note: string;
  deliveryFee?: number;
  updatedAt: string;
}
