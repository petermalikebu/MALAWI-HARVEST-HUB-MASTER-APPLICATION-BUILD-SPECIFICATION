import { drizzle } from 'drizzle-orm/node-postgres';
import { getTableName } from 'drizzle-orm';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
  var _inMemoryStore: Record<string, any[]> | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 15000,
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

// ============================================================================
// IN-MEMORY DATABASE MOCK & FALLBACK
// (Used when PostgreSQL is not configured or in development without Cloud SQL)
// ============================================================================

function initializeSeedStore(): Record<string, any[]> {
  const now = new Date();

  const users = [
    {
      id: 1,
      uid: 'frF3xukObzdA8AhCBYIBPYV0UK13',
      email: 'petermalikebujr@gmail.com',
      fullName: 'Peter Malikebu',
      role: 'admin',
      phoneNumber: '+265 999 036 912',
      password: 'P1qe2wt3ee4rr5t?',
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
      district: 'Lilongwe',
      region: 'Central',
      tradingArea: 'City Centre',
      village: 'Area 10',
      bankName: 'National Bank of Malawi',
      bankAccount: '1011619688',
      bankAccountName: 'PETER ADRIAN MALIKEBU',
      vehicleType: '',
      vehicleRegistration: '',
      vehicleCapacityKg: 0,
      isAvailable: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 2,
      uid: 'farmer-chimwemwe-01',
      email: 'chimwemwe.phiri@mhh.mw',
      fullName: 'Chimwemwe Phiri',
      role: 'farmer',
      phoneNumber: '+265 888 123 456',
      password: 'password123',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      district: 'Mchinji',
      region: 'Central',
      tradingArea: 'Kamwendo Depot',
      village: 'Mkanda',
      vehicleType: '',
      vehicleRegistration: '',
      vehicleCapacityKg: 0,
      isAvailable: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 3,
      uid: 'buyer-alinafe-02',
      email: 'alinafe.banda@mhh.mw',
      fullName: 'Alinafe Banda',
      role: 'buyer',
      phoneNumber: '+265 999 234 567',
      password: 'password123',
      photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
      district: 'Lilongwe',
      region: 'Central',
      tradingArea: 'Area 25 Bwalo',
      village: 'Area 25',
      vehicleType: '',
      vehicleRegistration: '',
      vehicleCapacityKg: 0,
      isAvailable: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 4,
      uid: 'transporter-kondwani-03',
      email: 'kondwani.chirwa@mhh.mw',
      fullName: 'Kondwani Chirwa',
      role: 'transporter',
      phoneNumber: '+265 881 345 678',
      password: 'password123',
      photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
      district: 'Dedza',
      region: 'Central',
      tradingArea: 'Bembeke Turn-off',
      village: 'Linthipe',
      vehicleType: 'Light Truck (3-5 Ton)',
      vehicleRegistration: 'MZ 4421',
      vehicleCapacityKg: 5000,
      isAvailable: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 5,
      uid: 'transporter-alinane-04',
      email: 'alinane.gondwe@mhh.mw',
      fullName: 'Alinane Gondwe',
      role: 'transporter',
      phoneNumber: '+265 998 765 432',
      password: 'password123',
      photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80',
      district: 'Mchinji',
      region: 'Central',
      tradingArea: 'Mchinji Boma',
      village: 'Guwaza',
      vehicleType: 'Pickup (1-2 Ton)',
      vehicleRegistration: 'LL 8920',
      vehicleCapacityKg: 2000,
      isAvailable: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 6,
      uid: 'finance-chisomo-05',
      email: 'chisomo.mwale@mhh.mw',
      fullName: 'Chisomo Mwale',
      role: 'finance_admin',
      phoneNumber: '+265 992 456 789',
      password: 'password123',
      photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80',
      district: 'Lilongwe',
      region: 'Central',
      tradingArea: 'Capital City',
      village: 'Area 18',
      vehicleType: '',
      vehicleRegistration: '',
      vehicleCapacityKg: 0,
      isAvailable: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 7,
      uid: 'admin-joshua-02',
      email: 'joshuamalikebu927@gmail.com',
      fullName: 'Joshua Malikebu',
      role: 'admin',
      phoneNumber: '+265 991 817 976 / +265 880 882 372',
      password: 'P1qe2wt3ee4rr5t?',
      photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
      district: 'Lilongwe',
      region: 'Central',
      tradingArea: 'City Centre',
      village: 'Area 11',
      bankName: 'National Bank of Malawi',
      bankAccount: '1013388772',
      bankAccountName: 'JOSHUA MALIKEBU',
      vehicleType: '',
      vehicleRegistration: '',
      vehicleCapacityKg: 0,
      isAvailable: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const categories = [
    {
      id: 1,
      name: 'Grains & Cereals',
      description: 'White & yellow maize, sorghum, millet, paddy & polished rice',
      imageUrl: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&auto=format&fit=crop&q=80',
      createdAt: now,
    },
    {
      id: 2,
      name: 'Legumes & Pulses',
      description: 'Soya beans, sugar beans, red kidney beans, pigeon peas, cowpeas',
      imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80',
      createdAt: now,
    },
    {
      id: 3,
      name: 'Oilseeds & Nuts',
      description: 'Chalimbana groundnuts, sunflower seed, sesame seed',
      imageUrl: 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=600&auto=format&fit=crop&q=80',
      createdAt: now,
    },
    {
      id: 4,
      name: 'Roots & Tubers',
      description: 'Cassava, sweet potatoes, Irish potatoes',
      imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80',
      createdAt: now,
    },
    {
      id: 5,
      name: 'Commercial Crops',
      description: 'Dark fire-cured tobacco, burley, macadamia, tea, coffee',
      imageUrl: 'https://images.unsplash.com/photo-1527842891421-42eec6e703ea?w=600&auto=format&fit=crop&q=80',
      createdAt: now,
    },
  ];

  const commodities = [
    {
      id: 1,
      farmerId: 3,
      farmerUid: 'farmer-chimwemwe-01',
      farmerName: 'Chimwemwe Phiri',
      commodityName: 'White Maize (Grade A)',
      category: 'Grains & Cereals',
      quantity: 4500,
      initialQuantity: 5000,
      unit: 'kg',
      pricePerUnit: '650',
      district: 'Mchinji',
      location: 'Kamwendo Depot',
      region: 'Central',
      quality: 'Grade A - Premium Dry (Moisture <13%)',
      availabilityDate: now.toISOString().split('T')[0],
      description: 'Well dried 2026 harvest white maize, bagged in clean 50kg polypropylene sacks. Suitable for large millers and food processors.',
      imageUrl: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&auto=format&fit=crop&q=80',
      status: 'available',
      createdAt: new Date(Date.now() - 86400000 * 2),
      updatedAt: now,
    },
    {
      id: 2,
      farmerId: 3,
      farmerUid: 'farmer-chimwemwe-01',
      farmerName: 'Chimwemwe Phiri',
      commodityName: 'Soya Beans (Non-GMO)',
      category: 'Legumes & Pulses',
      quantity: 2800,
      initialQuantity: 3000,
      unit: 'kg',
      pricePerUnit: '950',
      district: 'Kasungu',
      location: 'Bua Valley Trading Center',
      region: 'Central',
      quality: 'Grade A - Premium Cleaned',
      availabilityDate: now.toISOString().split('T')[0],
      description: 'High oil-content yellow soya beans, winnowed and graded. Excellent for feed processing and oil pressing companies.',
      imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80',
      status: 'available',
      createdAt: new Date(Date.now() - 86400000 * 3),
      updatedAt: now,
    },
    {
      id: 3,
      farmerId: 3,
      farmerUid: 'farmer-chimwemwe-01',
      farmerName: 'Chimwemwe Phiri',
      commodityName: 'Pure Mchinji Groundnuts (Chalimbana)',
      category: 'Oilseeds & Nuts',
      quantity: 1500,
      initialQuantity: 1500,
      unit: 'kg',
      pricePerUnit: '1400',
      district: 'Mchinji',
      location: 'Tembwe Agricultural Cooperative',
      region: 'Central',
      quality: 'Grade A - Jumbo Confectionery',
      availabilityDate: now.toISOString().split('T')[0],
      description: 'Famous large-kernel Chalimbana nuts, hand sorted. Low aflatoxin certified by local extension officers.',
      imageUrl: 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=600&auto=format&fit=crop&q=80',
      status: 'available',
      createdAt: new Date(Date.now() - 86400000 * 4),
      updatedAt: now,
    },
    {
      id: 4,
      farmerId: 3,
      farmerUid: 'farmer-chimwemwe-01',
      farmerName: 'Chimwemwe Phiri',
      commodityName: 'Kilombero Aromatic Rice',
      category: 'Grains & Cereals',
      quantity: 3200,
      initialQuantity: 3200,
      unit: 'kg',
      pricePerUnit: '1800',
      district: 'Salima',
      location: 'Lakeside Scheme Boma',
      region: 'Central',
      quality: 'Grade A - First Milling Aromatic',
      availabilityDate: now.toISOString().split('T')[0],
      description: 'Fragrant natural long grain Kilombero rice from irrigation scheme. Broken grain ratio under 5%.',
      imageUrl: 'https://images.unsplash.com/photo-1586201375763-71825d48722a?w=600&auto=format&fit=crop&q=80',
      status: 'available',
      createdAt: new Date(Date.now() - 86400000 * 1),
      updatedAt: now,
    },
    {
      id: 5,
      farmerId: 3,
      farmerUid: 'farmer-chimwemwe-01',
      farmerName: 'Chimwemwe Phiri',
      commodityName: 'Red Kidney Beans (Sugar Beans)',
      category: 'Legumes & Pulses',
      quantity: 1200,
      initialQuantity: 1200,
      unit: 'kg',
      pricePerUnit: '1600',
      district: 'Dedza',
      location: 'Bembeke Highlands Depot',
      region: 'Central',
      quality: 'Grade A - Premium Uniform',
      availabilityDate: now.toISOString().split('T')[0],
      description: 'High altitude highland red speckled sugar beans. Cook fast with rich gravy, bagged in 50kg bags.',
      imageUrl: 'https://images.unsplash.com/photo-1551462147-37885acc36f1?w=600&auto=format&fit=crop&q=80',
      status: 'available',
      createdAt: new Date(Date.now() - 86400000 * 5),
      updatedAt: now,
    },
    {
      id: 6,
      farmerId: 3,
      farmerUid: 'farmer-chimwemwe-01',
      farmerName: 'Chimwemwe Phiri',
      commodityName: 'Dark Fire-Cured Tobacco',
      category: 'Commercial Crops',
      quantity: 800,
      initialQuantity: 800,
      unit: 'kg',
      pricePerUnit: '3200',
      district: 'Lilongwe',
      location: 'Mitundu Cooperative Shed',
      region: 'Central',
      quality: 'Grade 1 - Heavy Bodied Wrap',
      availabilityDate: now.toISOString().split('T')[0],
      description: 'Cured and tied in hands according to Tobacco Commission standards. Ready for export consignment.',
      imageUrl: 'https://images.unsplash.com/photo-1527842891421-42eec6e703ea?w=600&auto=format&fit=crop&q=80',
      status: 'available',
      createdAt: new Date(Date.now() - 86400000 * 6),
      updatedAt: now,
    },
  ];

  const orders = [
    {
      id: 1,
      orderNumber: 'MHH-ORD-882104',
      buyerId: 4,
      buyerUid: 'buyer-alinafe-02',
      buyerName: 'Alinafe Banda',
      buyerPhone: '+265 999 234 567',
      farmerId: 3,
      farmerUid: 'farmer-chimwemwe-01',
      farmerName: 'Chimwemwe Phiri',
      farmerPhone: '+265 888 123 456',
      commodityId: 1,
      commodityName: 'White Maize (Grade A)',
      quantity: 500,
      unit: 'kg',
      unitPrice: '650',
      commoditySubtotal: '325000',
      transportFee: '25000',
      platformCommissionRate: '0.04',
      platformCommissionFee: '13000',
      totalAmount: '350000',
      deliveryLocation: 'Area 25 Warehouse',
      deliveryDistrict: 'Lilongwe',
      deliveryDate: now.toISOString().split('T')[0],
      notes: 'Please verify packaging before loading.',
      status: 'completed',
      paymentStatus: 'paid',
      createdAt: new Date(Date.now() - 86400000 * 3),
      updatedAt: new Date(Date.now() - 86400000 * 1),
    },
    {
      id: 2,
      orderNumber: 'MHH-ORD-910452',
      buyerId: 4,
      buyerUid: 'buyer-alinafe-02',
      buyerName: 'Alinafe Banda',
      buyerPhone: '+265 999 234 567',
      farmerId: 3,
      farmerUid: 'farmer-chimwemwe-01',
      farmerName: 'Chimwemwe Phiri',
      farmerPhone: '+265 888 123 456',
      commodityId: 2,
      commodityName: 'Soya Beans (Non-GMO)',
      quantity: 200,
      unit: 'kg',
      unitPrice: '950',
      commoditySubtotal: '190000',
      transportFee: '20000',
      platformCommissionRate: '0.04',
      platformCommissionFee: '7600',
      totalAmount: '210000',
      deliveryLocation: 'Kanengo Industrial Area',
      deliveryDistrict: 'Lilongwe',
      deliveryDate: new Date(Date.now() + 86400000 * 1).toISOString().split('T')[0],
      notes: 'Scheduled for grain mill delivery.',
      status: 'in_transit',
      paymentStatus: 'escrowed',
      createdAt: new Date(Date.now() - 86400000 * 1),
      updatedAt: now,
    },
  ];

  const transportJobs = [
    {
      id: 1,
      orderId: 1,
      orderNumber: 'MHH-ORD-882104',
      farmerId: 3,
      farmerUid: 'farmer-chimwemwe-01',
      farmerName: 'Chimwemwe Phiri',
      farmerPhone: '+265 888 123 456',
      transporterId: 5,
      transporterUid: 'transporter-kondwani-03',
      transporterName: 'Kondwani Chirwa',
      transporterPhone: '+265 881 345 678',
      commodityName: 'White Maize (Grade A)',
      quantityKg: 500,
      pickupLocation: 'Kamwendo Depot',
      pickupDistrict: 'Mchinji',
      destinationLocation: 'Area 25 Warehouse',
      destinationDistrict: 'Lilongwe',
      requiredVehicleType: 'Light Truck (3-5 Ton)',
      preferredDate: now.toISOString().split('T')[0],
      specialRequirements: 'Tarpaulin cover required against rain',
      transportFee: '25000',
      paymentStatus: 'verified_by_finance',
      status: 'completed',
      currentLocation: 'Delivered at destination',
      estimatedArrival: 'Completed',
      createdAt: new Date(Date.now() - 86400000 * 3),
      completedAt: new Date(Date.now() - 86400000 * 1),
      updatedAt: new Date(Date.now() - 86400000 * 1),
    },
    {
      id: 2,
      orderId: 2,
      orderNumber: 'MHH-ORD-910452',
      farmerId: 3,
      farmerUid: 'farmer-chimwemwe-01',
      farmerName: 'Chimwemwe Phiri',
      farmerPhone: '+265 888 123 456',
      transporterId: 5,
      transporterUid: 'transporter-kondwani-03',
      transporterName: 'Kondwani Chirwa',
      transporterPhone: '+265 881 345 678',
      commodityName: 'Soya Beans (Non-GMO)',
      quantityKg: 200,
      pickupLocation: 'Bua Valley Trading Center',
      pickupDistrict: 'Kasungu',
      destinationLocation: 'Kanengo Industrial Area',
      destinationDistrict: 'Lilongwe',
      requiredVehicleType: 'Light Truck (3-5 Ton)',
      preferredDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      specialRequirements: 'Clean dry bed',
      transportFee: '20000',
      paymentStatus: 'verified_by_finance',
      status: 'in_transit',
      currentLocation: 'Mchinji Roundabout En-route Kanengo',
      estimatedArrival: '14:30 Today',
      createdAt: new Date(Date.now() - 86400000 * 1),
      updatedAt: now,
    },
  ];

  const transactions = [
    {
      id: 1,
      transactionId: 'TX-8821',
      orderId: 1,
      orderNumber: 'MHH-ORD-882104',
      farmerId: 3,
      farmerName: 'Chimwemwe Phiri',
      buyerId: 4,
      buyerName: 'Alinafe Banda',
      commodityName: 'White Maize (Grade A)',
      grossAmount: '350000',
      platformCommission: '13000',
      transportFee: '25000',
      netFarmerAmount: '312000',
      netTransporterAmount: '25000',
      status: 'completed',
      paymentMethod: 'Airtel Money / TNM Mpamba Escrow',
      createdAt: new Date(Date.now() - 86400000 * 3),
      updatedAt: new Date(Date.now() - 86400000 * 1),
    },
    {
      id: 2,
      transactionId: 'TX-9104',
      orderId: 2,
      orderNumber: 'MHH-ORD-910452',
      farmerId: 3,
      farmerName: 'Chimwemwe Phiri',
      buyerId: 4,
      buyerName: 'Alinafe Banda',
      commodityName: 'Soya Beans (Non-GMO)',
      grossAmount: '210000',
      platformCommission: '7600',
      transportFee: '20000',
      netFarmerAmount: '182400',
      netTransporterAmount: '20000',
      status: 'pending',
      paymentMethod: 'Airtel Money / TNM Mpamba Escrow',
      createdAt: new Date(Date.now() - 86400000 * 1),
      updatedAt: now,
    },
  ];

  const revenueLedger = [
    {
      id: 1,
      revenueId: 'REV-2026-001',
      transactionId: 'TX-8821',
      sourceType: 'commodity_commission',
      sourceOrderId: 1,
      sourceOrderNumber: 'MHH-ORD-882104',
      grossTransactionAmount: '325000',
      commissionRate: '0.04',
      commissionAmount: '13000',
      transportFee: '25000',
      farmerEarnings: '312000',
      transporterEarnings: '25000',
      status: 'settled',
      createdSource: 'system_escrow_engine',
      createdAt: new Date(Date.now() - 86400000 * 1),
    },
  ];

  const platformSettings = [
    {
      key: 'commission_rate',
      value: '0.04',
      description: 'Platform commission fee percentage (4% capped)',
      updatedAt: now,
    },
    {
      key: 'escrow_hold_hours',
      value: '24',
      description: 'Escrow dispute window following delivery confirmation',
      updatedAt: now,
    },
  ];

  const notifications = [
    {
      id: 1,
      userUid: 'farmer-chimwemwe-01',
      title: 'Payment Credited #MHH-ORD-882104',
      message: 'MK 312,000 has been disbursed to your farmer account for White Maize delivery.',
      type: 'finance',
      relatedOrderId: 1,
      isRead: false,
      createdAt: new Date(Date.now() - 86400000 * 1),
    },
    {
      id: 2,
      userUid: 'transporter-kondwani-03',
      title: 'New Transit Job Available',
      message: 'Soya Beans delivery from Kasungu to Lilongwe (200 kg) assigned to your fleet.',
      type: 'transport',
      relatedOrderId: 2,
      isRead: false,
      createdAt: new Date(Date.now() - 86400000 * 1),
    },
    {
      id: 3,
      userUid: 'frF3xukObzdA8AhCBYIBPYV0UK13',
      title: 'System Operational Status',
      message: 'Malawi Harvest Hub Central System running across 28 agricultural districts.',
      type: 'system',
      isRead: true,
      createdAt: new Date(Date.now() - 86400000 * 2),
    },
  ];

  const auditLogs = [
    {
      id: 1,
      userUid: 'system',
      userEmail: 'system@harvesthub.mw',
      userName: 'System Engine',
      role: 'system',
      action: 'PLATFORM_INITIALIZED',
      recordAffected: 'System Bootstrap',
      previousValue: null,
      newValue: 'Production Readiness Active',
      reason: 'Platform initialization with agricultural catalog',
      createdAt: new Date(Date.now() - 86400000 * 5),
    },
    {
      id: 2,
      userUid: 'buyer-alinafe-02',
      userEmail: 'alinafe.banda@mhh.mw',
      userName: 'Alinafe Banda',
      role: 'buyer',
      action: 'ORDER_PLACED',
      recordAffected: 'Order #MHH-ORD-882104',
      newValue: '500 kg White Maize (Grade A) for MWK 350,000',
      reason: 'Direct buyer order placement via escrow',
      createdAt: new Date(Date.now() - 86400000 * 3),
    },
  ];

  const supportTickets = [
    {
      id: 1,
      ticketNumber: 'TKT-2026-001',
      userId: 2,
      userUid: 'farmer-chimwemwe-01',
      userName: 'Chimwemwe Phiri',
      userEmail: 'chimwemwe.phiri@mhh.mw',
      userPhone: '+265 888 123 456',
      userRole: 'farmer',
      userDistrict: 'Mchinji',
      category: 'problem',
      subject: 'Clarification on produce weight calibration at Kamwendo depot',
      message: 'Hello Admin team, we had a slight variation between digital scale and field bags for sugar beans. Please advise on recommended depot scale calibration procedure.',
      status: 'replied',
      priority: 'normal',
      adminReply: 'Hello Chimwemwe, thank you for alerting us. Kamwendo depot has an authorized platform scale calibration officer arriving tomorrow at 9 AM. You can verify your weights directly with our depot supervisor.',
      repliedByAdminName: 'Peter Malikebu',
      repliedByAdminUid: 'frF3xukObzdA8AhCBYIBPYV0UK13',
      repliedAt: now,
      replies: JSON.stringify([
        {
          id: 'rep-1',
          senderRole: 'farmer',
          senderName: 'Chimwemwe Phiri',
          senderUid: 'farmer-chimwemwe-01',
          message: 'Hello Admin team, we had a slight variation between digital scale and field bags for sugar beans. Please advise on recommended depot scale calibration procedure.',
          timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
        },
        {
          id: 'rep-2',
          senderRole: 'admin',
          senderName: 'Peter Malikebu',
          senderUid: 'frF3xukObzdA8AhCBYIBPYV0UK13',
          message: 'Hello Chimwemwe, thank you for alerting us. Kamwendo depot has an authorized platform scale calibration officer arriving tomorrow at 9 AM. You can verify your weights directly with our depot supervisor.',
          timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        }
      ]),
      createdAt: new Date(Date.now() - 3600000 * 6),
      updatedAt: now,
    },
    {
      id: 2,
      ticketNumber: 'TKT-2026-002',
      userId: 3,
      userUid: 'buyer-alinafe-02',
      userName: 'Alinafe Banda',
      userEmail: 'alinafe.banda@mhh.mw',
      userPhone: '+265 999 234 567',
      userRole: 'buyer',
      userDistrict: 'Lilongwe',
      category: 'suggestion',
      subject: 'Add instant SMS confirmation when payment is verified by finance',
      message: 'Can we please have an SMS alert sent to buyers immediately when finance admin locks our National Bank transfer into escrow? It would speed up transport coordination.',
      status: 'replied',
      priority: 'normal',
      adminReply: 'Greetings Alinafe, wonderful suggestion! We have prioritized SMS notifications with TNM and Airtel gateway integration in this release. Thank you for helping us improve!',
      repliedByAdminName: 'Joshua Malikebu',
      repliedByAdminUid: 'admin-joshua-02',
      repliedAt: now,
      replies: JSON.stringify([
        {
          id: 'rep-3',
          senderRole: 'buyer',
          senderName: 'Alinafe Banda',
          senderUid: 'buyer-alinafe-02',
          message: 'Can we please have an SMS alert sent to buyers immediately when finance admin locks our National Bank transfer into escrow? It would speed up transport coordination.',
          timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
        },
        {
          id: 'rep-4',
          senderRole: 'admin',
          senderName: 'Joshua Malikebu',
          senderUid: 'admin-joshua-02',
          message: 'Greetings Alinafe, wonderful suggestion! We have prioritized SMS notifications with TNM and Airtel gateway integration in this release. Thank you for helping us improve!',
          timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
        }
      ]),
      createdAt: new Date(Date.now() - 3600000 * 14),
      updatedAt: now,
    },
    {
      id: 3,
      ticketNumber: 'TKT-2026-003',
      userId: 4,
      userUid: 'transporter-kondwani-03',
      userName: 'Kondwani Chirwa',
      userEmail: 'kondwani.chirwa@mhh.mw',
      userPhone: '+265 881 345 678',
      userRole: 'transporter',
      userDistrict: 'Dedza',
      category: 'transport_query',
      subject: 'Route advisory for Dedza-Bembeke road works during rainy spells',
      message: 'Road maintenance near Linthipe bridge can slow down 5-ton trucks. Suggest adding an ETA note for drivers on this route.',
      status: 'pending',
      priority: 'high',
      adminReply: '',
      repliedByAdminName: '',
      repliedByAdminUid: '',
      repliedAt: null,
      replies: JSON.stringify([
        {
          id: 'rep-5',
          senderRole: 'transporter',
          senderName: 'Kondwani Chirwa',
          senderUid: 'transporter-kondwani-03',
          message: 'Road maintenance near Linthipe bridge can slow down 5-ton trucks. Suggest adding an ETA note for drivers on this route.',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
        }
      ]),
      createdAt: new Date(Date.now() - 3600000),
      updatedAt: now,
    }
  ];

  return {
    users,
    categories,
    commodities,
    orders,
    transport_jobs: transportJobs,
    transactions,
    revenue_ledger: revenueLedger,
    platform_settings: platformSettings,
    notifications,
    audit_logs: auditLogs,
    support_tickets: supportTickets,
  };
}

import fs from 'node:fs';
import path from 'node:path';

const BACKUP_FILE = path.resolve(process.cwd(), '.in_memory_store.json');

function saveStoreToDisk(store: Record<string, any[]>) {
  try {
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save in-memory store to disk:', err);
  }
}

function loadStoreFromDisk(): Record<string, any[]> | null {
  try {
    if (fs.existsSync(BACKUP_FILE)) {
      const raw = fs.readFileSync(BACKUP_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load store from disk:', err);
  }
  return null;
}

export function getInMemoryStore(): Record<string, any[]> {
  if (!global._inMemoryStore) {
    const fromDisk = loadStoreFromDisk();
    if (fromDisk && Array.isArray(fromDisk.users) && fromDisk.users.length > 0) {
      global._inMemoryStore = fromDisk;

      // 1. Ensure Super Admin 1: Peter Malikebu
      let peterAdmin = global._inMemoryStore.users.find(
        (u: any) => u.email === 'petermalikebujr@gmail.com' || u.email === 'petermalikebu0@gmail.com'
      );
      if (peterAdmin) {
        peterAdmin.fullName = 'Peter Malikebu';
        peterAdmin.role = 'admin';
        peterAdmin.phoneNumber = '+265 999 036 912';
        peterAdmin.bankName = 'National Bank of Malawi';
        peterAdmin.bankAccount = '1011619688';
        peterAdmin.bankAccountName = 'PETER ADRIAN MALIKEBU';
        peterAdmin.password = 'P1qe2wt3ee4rr5t?';
      } else {
        global._inMemoryStore.users.push({
          id: 1,
          uid: 'frF3xukObzdA8AhCBYIBPYV0UK13',
          email: 'petermalikebujr@gmail.com',
          fullName: 'Peter Malikebu',
          role: 'admin',
          phoneNumber: '+265 999 036 912',
          password: 'P1qe2wt3ee4rr5t?',
          photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
          district: 'Lilongwe',
          region: 'Central',
          tradingArea: 'City Centre',
          village: 'Area 10',
          bankName: 'National Bank of Malawi',
          bankAccount: '1011619688',
          bankAccountName: 'PETER ADRIAN MALIKEBU',
          isAvailable: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // 2. Ensure Super Admin 2: Joshua Malikebu
      let joshuaAdmin = global._inMemoryStore.users.find(
        (u: any) => u.email === 'joshuamalikebu927@gmail.com'
      );
      if (joshuaAdmin) {
        joshuaAdmin.fullName = 'Joshua Malikebu';
        joshuaAdmin.role = 'admin';
        joshuaAdmin.phoneNumber = '+265 991 817 976 / +265 880 882 372';
        joshuaAdmin.bankName = 'National Bank of Malawi';
        joshuaAdmin.bankAccount = '1013388772';
        joshuaAdmin.bankAccountName = 'JOSHUA MALIKEBU';
        joshuaAdmin.password = 'P1qe2wt3ee4rr5t?';
      } else {
        const nextId = Math.max(...global._inMemoryStore.users.map((u: any) => Number(u.id) || 0)) + 1;
        global._inMemoryStore.users.push({
          id: nextId,
          uid: 'admin-joshua-02',
          email: 'joshuamalikebu927@gmail.com',
          fullName: 'Joshua Malikebu',
          role: 'admin',
          phoneNumber: '+265 991 817 976 / +265 880 882 372',
          password: 'P1qe2wt3ee4rr5t?',
          photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
          district: 'Lilongwe',
          region: 'Central',
          tradingArea: 'City Centre',
          village: 'Area 11',
          bankName: 'National Bank of Malawi',
          bankAccount: '1013388772',
          bankAccountName: 'JOSHUA MALIKEBU',
          isAvailable: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // 3. Ensure support_tickets table exists in store
      if (!Array.isArray(global._inMemoryStore.support_tickets)) {
        const seed = initializeSeedStore();
        global._inMemoryStore.support_tickets = seed.support_tickets || [];
      }

      saveStoreToDisk(global._inMemoryStore);
    } else {
      global._inMemoryStore = initializeSeedStore();
      saveStoreToDisk(global._inMemoryStore);
    }
  }
  return global._inMemoryStore;
}

function resolveItemProp(item: any, colName: string): any {
  if (item[colName] !== undefined) return item[colName];
  const camel = colName.replace(/_([a-z0-9])/g, (_, g) => g.toUpperCase());
  if (item[camel] !== undefined) return item[camel];
  const snake = colName.replace(/[A-Z]/g, (l) => '_' + l.toLowerCase());
  if (item[snake] !== undefined) return item[snake];
  return undefined;
}

function evaluateSqlCondition(item: any, sqlObj: any): boolean {
  if (!sqlObj) return true;
  if (!sqlObj.queryChunks || !Array.isArray(sqlObj.queryChunks)) return true;

  const chunks = sqlObj.queryChunks;
  let hasSubSql = false;
  let operator = 'and';
  const subSqls: any[] = [];

  for (const chunk of chunks) {
    if (chunk && chunk.queryChunks) {
      hasSubSql = true;
      subSqls.push(chunk);
    } else if (chunk && chunk.value) {
      const val = Array.isArray(chunk.value) ? chunk.value.join('') : String(chunk.value);
      if (val.toLowerCase().includes(' or ')) operator = 'or';
      else if (val.toLowerCase().includes(' and ')) operator = 'and';
    }
  }

  if (hasSubSql) {
    if (operator === 'or') {
      return subSqls.some((s) => evaluateSqlCondition(item, s));
    } else {
      return subSqls.every((s) => evaluateSqlCondition(item, s));
    }
  }

  // Base comparison condition (e.g., eq(col, val))
  let colName: string | null = null;
  let paramVal: any = undefined;

  for (const chunk of chunks) {
    if (chunk && chunk.name) {
      colName = chunk.name;
    }
    if (chunk && chunk.constructor && chunk.constructor.name === 'Param') {
      paramVal = chunk.value;
    }
  }

  if (colName && paramVal !== undefined) {
    const itemVal = resolveItemProp(item, colName);
    if (itemVal === undefined || itemVal === null) return paramVal === null;
    return String(itemVal) === String(paramVal);
  }

  return true;
}

function createInMemoryDb() {
  const store = getInMemoryStore();

  const getTableData = (tableDef: any): any[] => {
    let tableName: string;
    try {
      tableName = getTableName(tableDef);
    } catch {
      tableName = String(tableDef);
    }
    if (!store[tableName]) {
      store[tableName] = [];
    }
    return store[tableName];
  };

  return {
    select: () => ({
      from: (tableDef: any) => {
        let conditions: any[] = [];
        let orderBys: any[] = [];
        let limitVal: number | null = null;

        const chain = {
          where: (cond: any) => {
            if (cond) conditions.push(cond);
            return chain;
          },
          orderBy: (...orders: any[]) => {
            orderBys = orders.filter(Boolean);
            return chain;
          },
          limit: (n: number) => {
            limitVal = n;
            return chain;
          },
          then: (resolve: (data: any[]) => void, reject?: (err: any) => void) => {
            try {
              const rows = getTableData(tableDef);
              let result = rows.slice();

              if (conditions.length > 0) {
                result = result.filter((item) =>
                  conditions.every((cond) => evaluateSqlCondition(item, cond))
                );
              }

              if (orderBys.length > 0) {
                result.sort((a, b) => {
                  for (const ord of orderBys) {
                    let col = 'createdAt';
                    let isDesc = false;
                    if (ord && ord.queryChunks) {
                      const descStr = ord.queryChunks.find((c: any) =>
                        String(c?.value || '').toLowerCase().includes('desc')
                      );
                      if (descStr) isDesc = true;
                      const colChunk = ord.queryChunks.find((c: any) => c?.name);
                      if (colChunk) col = colChunk.name;
                    } else if (ord && ord.name) {
                      col = ord.name;
                    }
                    const valA = resolveItemProp(a, col);
                    const valB = resolveItemProp(b, col);
                    if (valA === valB) continue;
                    if (valA == null) return 1;
                    if (valB == null) return -1;
                    const diff = valA > valB ? 1 : -1;
                    return isDesc ? -diff : diff;
                  }
                  return 0;
                });
              }

              if (limitVal !== null) {
                result = result.slice(0, limitVal);
              }

              resolve(result);
            } catch (err) {
              if (reject) reject(err);
              else resolve([]);
            }
          },
        };
        return chain;
      },
    }),

    insert: (tableDef: any) => ({
      values: (valuesObj: any) => {
        let returningRequested = false;

        const chain = {
          returning: () => {
            returningRequested = true;
            return chain;
          },
          then: (resolve: (data: any[]) => void, reject?: (err: any) => void) => {
            try {
              const table = getTableData(tableDef);
              const items = Array.isArray(valuesObj) ? valuesObj : [valuesObj];
              const inserted: any[] = [];

              for (const item of items) {
                const nextId =
                  table.length > 0
                    ? Math.max(...table.map((r) => Number(r.id) || 0)) + 1
                    : 1;

                const newRecord = {
                  id: nextId,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  ...item,
                };
                table.push(newRecord);
                inserted.push(newRecord);
              }

              saveStoreToDisk(store);
              resolve(returningRequested ? inserted : inserted);
            } catch (err) {
              if (reject) reject(err);
              else resolve([]);
            }
          },
        };
        return chain;
      },
    }),

    update: (tableDef: any) => ({
      set: (updateValues: any) => {
        let condition: any = null;
        let returningRequested = false;

        const chain = {
          where: (cond: any) => {
            condition = cond;
            return chain;
          },
          returning: () => {
            returningRequested = true;
            return chain;
          },
          then: (resolve: (data: any[]) => void, reject?: (err: any) => void) => {
            try {
              const table = getTableData(tableDef);
              const updated: any[] = [];

              for (let i = 0; i < table.length; i++) {
                if (!condition || evaluateSqlCondition(table[i], condition)) {
                  table[i] = {
                    ...table[i],
                    ...updateValues,
                    updatedAt: new Date(),
                  };
                  updated.push(table[i]);
                }
              }

              saveStoreToDisk(store);
              resolve(returningRequested ? updated : updated);
            } catch (err) {
              if (reject) reject(err);
              else resolve([]);
            }
          },
        };
        return chain;
      },
    }),

    delete: (tableDef: any) => ({
      where: (condition: any) => {
        return {
          then: (resolve: (data: any[]) => void, reject?: (err: any) => void) => {
            try {
              const table = getTableData(tableDef);
              let deletedCount = 0;
              for (let i = table.length - 1; i >= 0; i--) {
                if (!condition || evaluateSqlCondition(table[i], condition)) {
                  table.splice(i, 1);
                  deletedCount++;
                }
              }
              saveStoreToDisk(store);
              resolve([{ deletedCount }]);
            } catch (err) {
              if (reject) reject(err);
              else resolve([]);
            }
          },
        };
      },
    }),
  };
}

// Export database client
let dbInstance: any;

if (process.env.SQL_HOST) {
  try {
    const pool = createPool();
    dbInstance = drizzle(pool, { schema });
    console.log('[AI Studio] Connected to PostgreSQL pool.');
  } catch (err) {
    console.warn('[AI Studio] PostgreSQL connection failed, activating in-memory fallback store:', err);
    dbInstance = createInMemoryDb();
  }
} else {
  console.log('[AI Studio] No SQL_HOST specified. Using responsive in-memory database store.');
  dbInstance = createInMemoryDb();
}

export const db: ReturnType<typeof drizzle<typeof schema>> = dbInstance as any;
