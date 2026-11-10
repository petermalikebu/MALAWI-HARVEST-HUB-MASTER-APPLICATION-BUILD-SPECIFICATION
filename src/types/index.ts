export type UserRole = 'farmer' | 'buyer' | 'transporter' | 'admin' | 'finance_admin' | 'agent';

export interface User {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  phoneNumber?: string;
  password?: string;
  photoUrl?: string;
  district: string;
  region: string;
  tradingArea?: string;
  village?: string;
  assignedDistrict?: string; // For Agent: the specific district they operate in
  agentCode?: string; // e.g. AGT-ZOM-01
  agentStatus?: 'active' | 'suspended' | 'pending_verification';
  agentIncentiveRate?: number; // e.g. 0.01 (1%)
  status?: 'active' | 'suspended' | 'under_review';
  suspensionReason?: string;
  suspendedAt?: string;
  suspendedBy?: string;
  assessmentNotes?: string;
  vehicleType?: string;
  vehicleRegistration?: string;
  plateNumber?: string;
  licenseType?: string;
  yearsExperience?: string;
  vehicleCapacityKg?: number;
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;
  isAvailable?: boolean;
  currentRoute?: string;
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
  // Agent-Assisted Farmer Fields
  isAgentAssisted?: boolean;
  agentUid?: string;
  agentName?: string;
  agentDistrict?: string;
  offlineFarmerId?: string; // e.g. MBW-ZOM-2026-0001
  farmerPhone?: string; // Phone of keypad farmer for SMS
  traditionalAuthority?: string;
  village?: string;
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
  paymentMethod?: string;
  paymentRef?: string;
  financeApprovedAt?: string;
  financeApprovedBy?: string;
  farmerConfirmedAt?: string;
  farmerConfirmedBy?: string;
  disbursedAt?: string;
  disbursedBy?: string;
  disbursedRef?: string;
  status:
    | 'pending'
    | 'pending_payment_verification'
    | 'accepted'
    | 'declined'
    | 'transport_requested'
    | 'transport_assigned'
    | 'picked_up'
    | 'in_transit'
    | 'delivered'
    | 'completed'
    | 'cancelled';
  paymentStatus:
    | 'pending'
    | 'escrow_pending_finance_approval'
    | 'escrow_held'
    | 'paid'
    | 'escrowed'
    | 'released'
    | 'disbursed_to_farmer'
    | 'refund_required'
    | 'refunded';
  cancellationReason?: string;
  cancelledByUid?: string;
  cancelledAt?: string;
  refundedAt?: string;
  refundedBy?: string;
  refundRef?: string;
  refundAmount?: string | number;
  refundNotes?: string;
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
  buyerId?: number;
  buyerUid?: string;
  buyerName?: string;
  buyerPhone?: string;
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
  distanceKm?: number;
  transportFee: string | number;
  quotedPrice?: string | number;
  pricePerKm?: string | number;
  quoteNotes?: string;
  priceStatus?: 'pending_quote' | 'quoted' | 'confirmed_by_admin' | 'confirmed_by_farmer' | 'agreed' | 'rejected';
  farmerConfirmedPrice?: boolean;
  adminConfirmedPrice?: boolean;
  paymentStatus?: 'pending_payment' | 'paid_pending_approval' | 'verified_by_finance' | 'refunded';
  paymentRef?: string;
  paymentMethod?: string;
  financeApprovedBy?: string;
  financeApprovedAt?: string;
  financeRecommendationNotes?: string;
  recommendedDriverId?: number;
  recommendedDriverName?: string;
  platformCommissionRate?: string | number;
  platformCommissionFee?: string | number;
  netTransporterAmount?: string | number;
  disbursedToTransporterAt?: string;
  disbursedToTransporterRef?: string;
  disbursedToTransporterBy?: string;
  status:
    | 'quote_requested'
    | 'quote_submitted'
    | 'price_agreed'
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
  readAt?: string;
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

export const NORTHERN_DISTRICTS = [
  'Chitipa',
  'Karonga',
  'Likoma',
  'Mzimba',
  'Mzuzu',
  'Nkhata Bay',
  'Rumphi',
] as const;

export const CENTRAL_DISTRICTS = [
  'Dedza',
  'Dowa',
  'Kasungu',
  'Lilongwe',
  'Mchinji',
  'Nkhotakota',
  'Ntcheu',
  'Ntchisi',
  'Salima',
] as const;

export const SOUTHERN_DISTRICTS = [
  'Balaka',
  'Blantyre',
  'Chikwawa',
  'Chiradzulu',
  'Machinga',
  'Mangochi',
  'Mulanje',
  'Mwanza',
  'Neno',
  'Nsanje',
  'Phalombe',
  'Thyolo',
  'Zomba',
] as const;

export const MALAWI_DISTRICTS_BY_REGION = {
  Northern: NORTHERN_DISTRICTS,
  Central: CENTRAL_DISTRICTS,
  Southern: SOUTHERN_DISTRICTS,
} as const;

export const MALAWI_REGIONS = ['Northern', 'Central', 'Southern'] as const;
export type MalawiRegion = (typeof MALAWI_REGIONS)[number];

export const MALAWI_DISTRICTS = [
  // Northern Region
  'Chitipa',
  'Karonga',
  'Likoma',
  'Mzimba',
  'Mzuzu',
  'Nkhata Bay',
  'Rumphi',
  // Central Region
  'Dedza',
  'Dowa',
  'Kasungu',
  'Lilongwe',
  'Mchinji',
  'Nkhotakota',
  'Ntcheu',
  'Ntchisi',
  'Salima',
  // Southern Region
  'Balaka',
  'Blantyre',
  'Chikwawa',
  'Chiradzulu',
  'Machinga',
  'Mangochi',
  'Mulanje',
  'Mwanza',
  'Neno',
  'Nsanje',
  'Phalombe',
  'Thyolo',
  'Zomba',
];

export function getDistrictRegion(district?: string): 'Central' | 'Southern' | 'Northern' {
  if (!district) return 'Central';
  const d = district.trim().toLowerCase();
  
  const northern = ['chitipa', 'karonga', 'likoma', 'mzimba', 'mzuzu', 'nkhatabay', 'nkhata bay', 'rumphi'];
  if (northern.some((n) => d === n || d.includes(n))) return 'Northern';

  const southern = [
    'balaka', 'blantyre', 'chikwawa', 'chiradzulu', 'machinga', 'mangochi',
    'mulanje', 'mwanza', 'neno', 'nsanje', 'phalombe', 'thyolo', 'zomba'
  ];
  if (southern.some((s) => d === s || d.includes(s))) return 'Southern';

  return 'Central';
}

export function getRegionColorClass(region: string): string {
  switch (region) {
    case 'Northern':
      return 'bg-sky-100 text-sky-800 border-sky-200';
    case 'Southern':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Central':
    default:
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  }
}

export const VEHICLE_TYPES = [
  'Pickup (1-2 Ton)',
  'Light Truck (3-5 Ton)',
  'Medium Truck (5-7 Ton)',
  'Heavy Truck (10-15 Ton)',
  'Articulated Trailer (20-30 Ton)',
  'Motorcycle / Tricycle',
];

export interface SupportTicketReply {
  id: string;
  senderRole: 'user' | 'admin' | 'farmer' | 'buyer' | 'transporter';
  senderName: string;
  senderUid: string;
  message: string;
  timestamp: string;
}

export interface SupportTicket {
  id: number;
  ticketNumber: string;
  userId?: number;
  userUid: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  userRole: UserRole;
  userDistrict?: string;
  category: 'problem' | 'suggestion' | 'payment_query' | 'transport_query' | 'commodity_query' | 'other';
  subject: string;
  message: string;
  status: 'pending' | 'in_progress' | 'replied' | 'resolved';
  priority: 'normal' | 'high' | 'urgent';
  adminReply?: string;
  repliedByAdminName?: string;
  repliedByAdminUid?: string;
  repliedAt?: string;
  replies?: SupportTicketReply[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PasswordResetRequest {
  id: number;
  requestId: string;
  userId?: number;
  userUid: string;
  userEmail: string;
  userPhone?: string;
  userName: string;
  userRole: UserRole;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  adminNote?: string;
  approvedByAdminName?: string;
  approvedByAdminUid?: string;
  approvedAt?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MarketPrice {
  id: number;
  commodityName: string;
  category: string;
  district: string;
  marketLocation: string; // e.g. "Mitundu Market", "Limbe Market", "Mzuzu Main Market", "All Markets"
  region: 'Central' | 'Southern' | 'Northern';
  priceMin: number | string; // prevailing minimum market price (MWK)
  priceMax: number | string; // prevailing maximum market price (MWK)
  priceAvg: number | string; // standard recommended benchmark price (MWK)
  unit: string; // "kg" | "50kg bag" | "Ton"
  notes?: string;
  updatedByAdminName?: string;
  updatedByAdminUid?: string;
  effectiveDate: string; // ISO date string or YYYY-MM-DD
  createdAt?: string;
  updatedAt?: string;
}

export const COMMODITY_UNITS = ['kg', '50kg bag', 'Ton'] as const;

export interface AgriConsultation {
  id: number;
  consultationNumber: string;
  farmerUid: string;
  farmerName: string;
  farmerPhone?: string;
  district: string;
  epa?: string;
  cropOrTopic: string;
  question: string;
  imageUrl?: string;
  urgency: 'normal' | 'high' | 'critical';
  status: 'pending_expert_review' | 'under_review' | 'answered';
  aiInitialSummary?: string;
  expertName?: string;
  expertTitle?: string;
  expertResponse?: string;
  answeredAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AgriChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  imageUrl?: string;
  chichewaSummary?: string;
  recommendedActions?: string[];
  qualityAndGradingTip?: string;
  warningOrDisclaimer?: string;
  suggestedFollowUps?: string[];
  canEscalateToExpert?: boolean;
  timestamp: string;
}

// ----------------------------------------------------
// DISTRICT-BASED AGRICULTURAL AGENT NETWORK TYPES
// ----------------------------------------------------

export interface OfflineFarmer {
  id: number;
  farmerId: string; // Unique Mbewalink Farmer ID: e.g. MBW-ZOM-2026-0001
  fullName: string;
  phoneNumber: string; // For automated SMS notifications
  altPhoneNumber?: string;
  district: string;
  traditionalAuthority: string; // T/A (e.g. T/A Malemia, T/A Mwambo)
  village: string;
  preferredLanguage: 'ch' | 'en';
  registeredByAgentUid: string;
  registeredByAgentName: string;
  registeredByAgentPhone?: string;
  consentConfirmed: boolean;
  verificationPin: string; // 4-digit code e.g. "4829"
  totalProduceListed?: number;
  totalOrdersCompleted?: number;
  totalEarningsMwk?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SmsNotification {
  id: number;
  smsId: string; // SMS-2026-0001
  recipientPhone: string;
  recipientName: string;
  recipientType: 'offline_farmer' | 'agent' | 'all';
  district: string;
  messageText: string;
  messageLanguage: 'ch' | 'en';
  eventType:
    | 'farmer_registered'
    | 'produce_listed'
    | 'order_received'
    | 'order_paid'
    | 'transporter_assigned'
    | 'delivery_confirmed'
    | 'payment_released'
    | 'broadcast_announcement'
    | 'verification_code';
  relatedRecordNumber?: string;
  verificationCode?: string;
  deliveryStatus: 'sent' | 'delivered' | 'failed' | 'pending';
  failureReason?: string;
  carrierNetwork?: 'TNM' | 'Airtel' | 'Other';
  sentAt: string;
}

export interface SmsBroadcast {
  id: number;
  broadcastId: string;
  title: string;
  targetDistrict: string; // 'All Districts' or specific district name
  targetAudience: 'all_farmers' | 'offline_farmers' | 'agents' | 'all';
  messageText: string;
  language: 'ch' | 'en';
  sentByAdminUid: string;
  sentByAdminName: string;
  recipientCount: number;
  status: 'completed' | 'queued';
  createdAt: string;
}

export interface AgentDistrictWorkspace {
  district: string;
  region: string;
  totalAgents: number;
  agents: Array<{
    uid: string;
    fullName: string;
    phoneNumber?: string;
    email: string;
    status: 'active' | 'suspended';
    joinedAt: string;
    registeredFarmersCount: number;
    activeListingsCount: number;
    completedOrdersCount: number;
  }>;
  totalOfflineFarmers: number;
  totalActiveListings: number;
  totalSalesVolumeMwk: number;
  pendingOrdersCount: number;
}

export type MessageParticipantRole = 'buyer' | 'transporter' | 'farmer' | 'admin' | 'agent' | 'finance_admin';
export type DirectMessageRelationship =
  | 'buyer_transporter'
  | 'farmer_buyer'
  | 'farmer_transporter'
  | 'farmer_agent'
  | 'agent_buyer'
  | 'agent_transporter'
  | 'peer_to_peer'
  | 'general';

export interface DirectMessage {
  id: number;
  messageId: string;
  orderId?: number;
  orderNumber?: string;
  senderUid: string;
  senderName: string;
  senderRole: MessageParticipantRole;
  recipientUid: string;
  recipientName: string;
  recipientRole: MessageParticipantRole;
  relationship: DirectMessageRelationship;
  messageText: string;
  createdAt: string;
  isRead: boolean;
  flaggedForReview?: boolean;
  flagReason?: string;
}

export interface ChatConversation {
  peerUid: string;
  peerName: string;
  peerRole: MessageParticipantRole;
  peerPhone?: string;
  peerEmail?: string;
  peerDistrict?: string;
  peerPhotoUrl?: string;
  lastMessage: DirectMessage;
  unreadCount: number;
  totalMessages: number;
  relationship?: DirectMessageRelationship;
  orderId?: number;
  orderNumber?: string;
}

export interface DirectMessageThread {
  threadId: string;
  orderId?: number;
  orderNumber?: string;
  commodityName?: string;
  relationship: DirectMessageRelationship;
  participant1: {
    uid: string;
    name: string;
    role: MessageParticipantRole;
  };
  participant2: {
    uid: string;
    name: string;
    role: MessageParticipantRole;
  };
  lastMessage: DirectMessage;
  totalMessages: number;
  unreadCount: number;
  flaggedCount: number;
  updatedAt: string;
}

export interface UserActivityReview {
  user: User;
  stats: {
    commoditiesCount: number;
    activeCommoditiesCount: number;
    totalCommoditiesValueMwk: number;
    ordersAsBuyerCount: number;
    ordersAsFarmerCount: number;
    totalOrdersValueMwk: number;
    completedOrdersCount: number;
    cancelledOrdersCount: number;
    transportJobsCount: number;
    directMessagesCount: number;
    smsReceivedCount: number;
    auditLogsCount: number;
    flagsCount: number;
  };
  commodities: Commodity[];
  orders: Order[];
  transportJobs: any[];
  directMessages: DirectMessage[];
  smsNotifications: SmsNotification[];
  auditLogs: AuditLogItem[];
  riskAssessment: {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    suspiciousFlags: string[];
    recommendation: 'pardon' | 'warn' | 'suspend' | 'remove';
  };
}


