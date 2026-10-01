export type UserRole = 'farmer' | 'buyer' | 'transporter' | 'admin' | 'finance_admin';

export interface User {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  phoneNumber?: string;
  district: string;
  region: string;
  tradingArea?: string;
  village?: string;
  vehicleType?: string;
  vehicleRegistration?: string;
  vehicleCapacityKg?: number;
  isAvailable?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string;
}

export interface Commodity {
  id: number;
  farmerId: number;
  farmerUid: string;
  farmerName: string;
  commodityName: string;
  category: string;
  quantity: number;
  initialQuantity: number;
  unit: string;
  pricePerUnit: string | number;
  district: string;
  location: string;
  region: string;
  quality: string;
  availabilityDate: string;
  description?: string;
  imageUrl?: string;
  status: 'available' | 'reserved' | 'sold_out' | 'cancelled';
  createdAt?: string;
  updatedAt?: string;
}

export interface Order {
  id: number;
  orderNumber: string;
  buyerId: number;
  buyerUid: string;
  buyerName: string;
  buyerPhone?: string;
  farmerId: number;
  farmerUid: string;
  farmerName: string;
  farmerPhone?: string;
  commodityId: number;
  commodityName: string;
  quantity: number;
  unit: string;
  unitPrice: string | number;
  commoditySubtotal: string | number;
  transportFee: string | number;
  platformCommissionRate: string | number;
  platformCommissionFee: string | number;
  totalAmount: string | number;
  deliveryLocation: string;
  deliveryDistrict: string;
  deliveryDate: string;
  notes?: string;
  status:
    | 'pending'
    | 'accepted'
    | 'declined'
    | 'transport_requested'
    | 'transport_assigned'
    | 'picked_up'
    | 'in_transit'
    | 'delivered'
    | 'completed'
    | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'escrowed' | 'released' | 'refunded';
  cancellationReason?: string;
  cancelledByUid?: string;
  cancelledAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TransportJob {
  id: number;
  orderId?: number;
  orderNumber: string;
  farmerId?: number;
  farmerUid?: string;
  farmerName?: string;
  farmerPhone?: string;
  transporterId?: number;
  transporterUid?: string;
  transporterName?: string;
  transporterPhone?: string;
  commodityName: string;
  quantityKg: number;
  pickupLocation: string;
  pickupDistrict: string;
  destinationLocation: string;
  destinationDistrict: string;
  requiredVehicleType: string;
  preferredDate: string;
  specialRequirements?: string;
  transportFee: string | number;
  paymentStatus?: 'pending_payment' | 'paid_pending_approval' | 'verified_by_finance' | 'refunded';
  paymentRef?: string;
  paymentMethod?: string;
  financeApprovedBy?: string;
  financeApprovedAt?: string;
  financeRecommendationNotes?: string;
  recommendedDriverId?: number;
  recommendedDriverName?: string;
  status:
    | 'requested'
    | 'pending_finance_approval'
    | 'accepted'
    | 'driver_assigned'
    | 'picked_up'
    | 'in_transit'
    | 'delivered'
    | 'completed'
    | 'cancelled';
  currentLocation?: string;
  estimatedArrival?: string;
  acceptedAt?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Transaction {
  id: number;
  transactionId: string;
  orderId: number;
  orderNumber: string;
  farmerId: number;
  farmerName: string;
  buyerId: number;
  buyerName: string;
  commodityName: string;
  grossAmount: string | number;
  platformCommission: string | number;
  transportFee: string | number;
  netFarmerAmount: string | number;
  netTransporterAmount: string | number;
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  paymentMethod?: string;
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RevenueLedgerEntry {
  id: number;
  revenueId: string;
  transactionId: string;
  sourceType: string;
  sourceOrderId?: number;
  sourceOrderNumber: string;
  grossTransactionAmount: string | number;
  commissionRate: string | number;
  commissionAmount: string | number;
  transportFee: string | number;
  farmerEarnings: string | number;
  transporterEarnings: string | number;
  status: string;
  createdSource: string;
  createdAt?: string;
}

export interface NotificationItem {
  id: number;
  userUid: string;
  title: string;
  message: string;
  type: 'order' | 'transport' | 'finance' | 'system';
  relatedOrderId?: number;
  isRead: boolean;
  createdAt?: string;
}

export interface AuditLogItem {
  id: number;
  userUid: string;
  userEmail: string;
  userName: string;
  role: string;
  action: string;
  recordAffected: string;
  previousValue?: string;
  newValue?: string;
  reason?: string;
  createdAt?: string;
}

export interface RevenueMetrics {
  todayRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  totalRevenue: number;
  commodityCommissions: number;
  transportRevenue: number;
  grossMarketplaceVolume: number;
  completedTransactions: number;
  cancelledTransactions: number;
  pendingTransactions: number;
  commissionRate: number;
  ledgerEntriesCount: number;
}

export interface ImpactMetrics {
  farmers: {
    count: number;
    totalSales: number;
    completedTransactions: number;
    estimatedSurplus: number;
    surplusMethodology: string;
  };
  transporters: {
    count: number;
    completedDeliveries: number;
    earnings: number;
    totalJobs: number;
  };
  buyers: {
    count: number;
    totalPurchases: number;
    completedOrders: number;
    estimatedSavings: number;
    savingsMethodology: string;
  };
  summary: {
    totalMarketplaceVolume: number;
    totalBeneficiaries: number;
  };
}

export const MALAWI_DISTRICTS = [
  'Lilongwe',
  'Mchinji',
  'Dedza',
  'Kasungu',
  'Dowa',
  'Ntcheu',
  'Salima',
  'Nkhotakota',
  'Ntchisi',
  'Blantyre',
  'Zomba',
  'Mangochi',
  'Chikwawa',
  'Nsanje',
  'Balaka',
  'Machinga',
  'Mulanje',
  'Thyolo',
  'Chiradzulu',
  'Phalombe',
  'Mwanza',
  'Neno',
  'Mzuzu',
  'Mzimba',
  'Karonga',
  'Rumphi',
  'Nkhatabay',
  'Chitipa',
  'Likoma',
];

export const VEHICLE_TYPES = [
  'Pickup (1-2 Ton)',
  'Light Truck (3-5 Ton)',
  'Medium Truck (5-7 Ton)',
  'Heavy Truck (10-15 Ton)',
  'Articulated Trailer (20-30 Ton)',
  'Motorcycle / Tricycle',
];
