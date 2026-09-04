const asyncHandler = require('express-async-handler');
const Cattle = require('../models/Cattle');
const MedicalEvent = require('../models/MedicalEvent');
const User = require('../models/User');
const { canTransitionSale } = require('../utils/saleStateMachine');

// @route POST /api/cattle/:id/sale
// @access Private (Owner FARMER only)
const listCowForSale = asyncHandler(async (req, res) => {
  const { askingPrice, description, contactPhone, location } = req.body;

  const cattle = await Cattle.findById(req.params.id);
  if (!cattle || !cattle.isActive) {
    res.status(404);
    throw new Error('Cattle not found.');
  }

  // Authorization: Only the current owner can list a cow for sale
  if (String(cattle.ownerId) !== String(req.user._id) && req.user.role !== 'ADMIN') {
    res.status(403);
    throw new Error('Only the owner can list this cow for sale.');
  }

  const currentStatus = cattle.sale?.status || 'NOT_FOR_SALE';
  if (!canTransitionSale(currentStatus, 'OPEN_FOR_SALE')) {
    res.status(400);
    throw new Error(`Cannot list cow for sale from current status "${currentStatus}".`);
  }

  cattle.sale = {
    status: 'OPEN_FOR_SALE',
    askingPrice: Number(askingPrice),
    description: description || '',
    listedAt: new Date(),
    contactPhone: contactPhone || req.user.phone || '',
    location: location || {
      address: req.user.defaultLocation?.address || '',
      lat: req.user.defaultLocation?.lat,
      lng: req.user.defaultLocation?.lng,
    },
  };

  await cattle.save();

  res.json({
    success: true,
    message: `${cattle.name} (${cattle.cattleId}) is now listed for sale in the marketplace.`,
    cattle,
  });
});

// @route PATCH /api/cattle/:id/sale
// @access Private (Owner FARMER only)
const updateSaleListing = asyncHandler(async (req, res) => {
  const { status, askingPrice, description, contactPhone, location } = req.body;

  const cattle = await Cattle.findById(req.params.id);
  if (!cattle || !cattle.isActive) {
    res.status(404);
    throw new Error('Cattle not found.');
  }

  // Authorization check
  if (String(cattle.ownerId) !== String(req.user._id) && req.user.role !== 'ADMIN') {
    res.status(403);
    throw new Error('Only the owner can update this sale listing.');
  }

  if (!cattle.sale || cattle.sale.status === 'NOT_FOR_SALE') {
    res.status(400);
    throw new Error('This cow is not currently listed for sale.');
  }

  // If status change requested, enforce state machine transitions
  if (status && status !== cattle.sale.status) {
    if (!canTransitionSale(cattle.sale.status, status)) {
      res.status(400);
      throw new Error(`Cannot transition sale status from "${cattle.sale.status}" to "${status}".`);
    }
    cattle.sale.status = status;
  }

  if (askingPrice !== undefined) cattle.sale.askingPrice = Number(askingPrice);
  if (description !== undefined) cattle.sale.description = description;
  if (contactPhone !== undefined) cattle.sale.contactPhone = contactPhone;
  if (location !== undefined) {
    cattle.sale.location = {
      address: location.address || cattle.sale.location?.address || '',
      lat: location.lat !== undefined ? location.lat : cattle.sale.location?.lat,
      lng: location.lng !== undefined ? location.lng : cattle.sale.location?.lng,
    };
  }

  await cattle.save();

  res.json({
    success: true,
    message: 'Marketplace listing updated successfully.',
    cattle,
  });
});

// @route DELETE /api/cattle/:id/sale
// @access Private (Owner FARMER only)
const removeCowFromSale = asyncHandler(async (req, res) => {
  const cattle = await Cattle.findById(req.params.id);
  if (!cattle || !cattle.isActive) {
    res.status(404);
    throw new Error('Cattle not found.');
  }

  if (String(cattle.ownerId) !== String(req.user._id) && req.user.role !== 'ADMIN') {
    res.status(403);
    throw new Error('Only the owner can remove this listing.');
  }

  const currentStatus = cattle.sale?.status || 'NOT_FOR_SALE';
  if (!canTransitionSale(currentStatus, 'REMOVED_FROM_SALE')) {
    res.status(400);
    throw new Error(`Cannot delist cow from current status "${currentStatus}".`);
  }

  cattle.sale.status = 'NOT_FOR_SALE';
  await cattle.save();

  res.json({
    success: true,
    message: `${cattle.name} has been removed from the marketplace.`,
    cattle,
  });
});

// @route GET /api/marketplace/cows
// @access Private (FARMER, ADMIN, VETERINARIAN)
const getMarketplaceCattle = asyncHandler(async (req, res) => {
  const { breed, gender, status, healthStatus, minPrice, maxPrice, search, sortBy, ageMin, ageMax, vaccinatedOnly } = req.query;

  const filter = {
    isActive: true,
    'sale.status': 'OPEN_FOR_SALE',
  };

  if (breed && breed !== 'All Breeds' && breed !== 'All') {
    filter.breed = breed;
  }
  if (gender && gender !== 'All' && ['MALE', 'FEMALE'].includes(gender)) {
    filter.gender = gender;
  }
  const resolvedStatus = status || healthStatus;
  if (resolvedStatus && resolvedStatus !== 'All' && resolvedStatus !== 'All Status') {
    filter.status = resolvedStatus;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    filter['sale.askingPrice'] = {};
    if (minPrice !== undefined && minPrice !== '') filter['sale.askingPrice'].$gte = Number(minPrice);
    if (maxPrice !== undefined && maxPrice !== '') filter['sale.askingPrice'].$lte = Number(maxPrice);
    if (Object.keys(filter['sale.askingPrice']).length === 0) {
      delete filter['sale.askingPrice'];
    }
  }

  if (ageMin !== undefined || ageMax !== undefined) {
    filter.estimatedAgeYears = {};
    if (ageMin !== undefined && ageMin !== '') filter.estimatedAgeYears.$gte = Number(ageMin);
    if (ageMax !== undefined && ageMax !== '') filter.estimatedAgeYears.$lte = Number(ageMax);
    if (Object.keys(filter.estimatedAgeYears).length === 0) {
      delete filter.estimatedAgeYears;
    }
  }

  if (search && search.trim()) {
    const s = search.trim();
    filter.$or = [
      { name: { $regex: s, $options: 'i' } },
      { cattleId: { $regex: s, $options: 'i' } },
      { breed: { $regex: s, $options: 'i' } },
      { 'sale.location.address': { $regex: s, $options: 'i' } },
      { 'sale.description': { $regex: s, $options: 'i' } },
    ];
  }

  let sortCriteria = { 'sale.listedAt': -1, createdAt: -1 };
  if (sortBy === 'price_asc') {
    sortCriteria = { 'sale.askingPrice': 1, 'sale.listedAt': -1 };
  } else if (sortBy === 'price_desc') {
    sortCriteria = { 'sale.askingPrice': -1, 'sale.listedAt': -1 };
  } else if (sortBy === 'age_asc') {
    sortCriteria = { estimatedAgeYears: 1 };
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
  const skip = (page - 1) * limit;

  const [cattleDocs, total] = await Promise.all([
    Cattle.find(filter)
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit)
      .populate('ownerId', 'name farmName phone defaultLocation')
      .select('-qrCodeDataUrl')
      .lean(),
    Cattle.countDocuments(filter),
  ]);

  // Enrich with real medical records count, vaccination status, and user favorite status
  const cattleIds = cattleDocs.map((c) => c._id);
  const userFavorites = req.user?.favorites ? req.user.favorites.map((f) => String(f)) : [];

  const [medicalEventCounts, vaccinationEvents] = await Promise.all([
    MedicalEvent.aggregate([
      { $match: { cattleId: { $in: cattleIds } } },
      { $group: { _id: '$cattleId', count: { $sum: 1 } } },
    ]),
    MedicalEvent.aggregate([
      { $match: { cattleId: { $in: cattleIds }, eventType: 'VACCINATION' } },
      { $group: { _id: '$cattleId', count: { $sum: 1 } } },
    ]),
  ]);

  const recordMap = new Map();
  medicalEventCounts.forEach((r) => recordMap.set(String(r._id), r.count));

  const vaccineMap = new Map();
  vaccinationEvents.forEach((v) => vaccineMap.set(String(v._id), v.count));

  let enrichedCattle = cattleDocs.map((cow) => {
    const cowIdStr = String(cow._id);
    const eventCount = recordMap.get(cowIdStr) || 0;
    const vaccineCount = vaccineMap.get(cowIdStr) || 0;

    return {
      ...cow,
      healthRecordsCount: eventCount,
      hasHealthRecords: eventCount > 0,
      isVaccinated: vaccineCount > 0,
      vaccineCount,
      aiSummaryAvailable: true,
      isFavorited: userFavorites.includes(cowIdStr),
      photosCount: cow.photoUrl ? 1 : 0,
    };
  });

  if (vaccinatedOnly === 'true') {
    enrichedCattle = enrichedCattle.filter((c) => c.isVaccinated);
  }

  res.json({
    success: true,
    count: enrichedCattle.length,
    cattle: enrichedCattle,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// @route GET /api/marketplace/stats
// @access Private (FARMER, ADMIN, VETERINARIAN)
const getMarketplaceStats = asyncHandler(async (req, res) => {
  const baseFilter = { isActive: true, 'sale.status': 'OPEN_FOR_SALE' };
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalListings,
    underObservation,
    healthyCows,
    newThisWeek,
    breedAgg,
    allOpenCowIds,
  ] = await Promise.all([
    Cattle.countDocuments(baseFilter),
    Cattle.countDocuments({ ...baseFilter, status: 'UNDER_OBSERVATION' }),
    Cattle.countDocuments({ ...baseFilter, status: 'HEALTHY' }),
    Cattle.countDocuments({ ...baseFilter, 'sale.listedAt': { $gte: sevenDaysAgo } }),
    Cattle.aggregate([
      { $match: baseFilter },
      { $group: { _id: '$breed', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    Cattle.find(baseFilter).select('_id').lean(),
  ]);

  // Count verified listings that have permanent medical events recorded in CowCare
  const openIds = allOpenCowIds.map((c) => c._id);
  const distinctWithMedicalEvents = await MedicalEvent.distinct('cattleId', {
    cattleId: { $in: openIds },
  });

  const verifiedCount = distinctWithMedicalEvents.length;
  const verifiedPercentage = totalListings > 0 ? Math.round((verifiedCount / totalListings) * 100) : 100;

  const popularBreeds = breedAgg.map((b) => ({
    breed: b._id || 'Standard Breed',
    count: b.count,
  }));

  res.json({
    success: true,
    stats: {
      totalListings,
      verifiedListings: verifiedCount,
      verifiedPercentage,
      underObservation,
      healthyCows,
      newThisWeek,
      popularBreeds,
    },
  });
});

// @route POST /api/marketplace/cows/:id/favorite
// @access Private (FARMER, VETERINARIAN, ADMIN)
const toggleFavoriteCow = asyncHandler(async (req, res) => {
  const cattleId = req.params.id;
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found.');
  }

  if (!user.favorites) user.favorites = [];

  const existingIdx = user.favorites.findIndex((id) => String(id) === String(cattleId));
  let isFavorited = false;

  if (existingIdx >= 0) {
    user.favorites.splice(existingIdx, 1);
    isFavorited = false;
  } else {
    user.favorites.push(cattleId);
    isFavorited = true;
  }

  await user.save();

  res.json({
    success: true,
    isFavorited,
    favoritesCount: user.favorites.length,
    message: isFavorited ? 'Saved to favorites' : 'Removed from favorites',
  });
});

// @route GET /api/marketplace/favorites
// @access Private (FARMER, VETERINARIAN, ADMIN)
const getFavoriteCows = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: 'favorites',
    match: { isActive: true, 'sale.status': 'OPEN_FOR_SALE' },
    populate: { path: 'ownerId', select: 'name farmName phone' },
  });

  res.json({
    success: true,
    favorites: user?.favorites || [],
  });
});

// @route GET /api/marketplace/cows/:id
// @access Private (FARMER, ADMIN, VETERINARIAN)
const getMarketplaceCowProfile = asyncHandler(async (req, res) => {
  const cattle = await Cattle.findById(req.params.id)
    .populate('ownerId', 'name farmName phone defaultLocation');

  if (!cattle || !cattle.isActive) {
    res.status(404);
    throw new Error('Cattle record not found.');
  }

  const isOwner = String(cattle.ownerId?._id || cattle.ownerId) === String(req.user._id);
  const isOpenForSale = ['OPEN_FOR_SALE', 'SALE_PENDING'].includes(cattle.sale?.status);

  // Security gate: non-owners can ONLY view cow profile if it is open for sale
  if (!isOwner && !isOpenForSale && req.user.role !== 'ADMIN') {
    res.status(403);
    throw new Error('This cow is not currently open for sale in the marketplace.');
  }

  // Canonical medical timeline
  const timeline = await MedicalEvent.find({ cattleId: cattle._id })
    .sort({ eventDate: -1 })
    .populate('veterinarianId', 'name specialization');

  const user = await User.findById(req.user._id).select('favorites');
  const isFavorited = user?.favorites?.some((f) => String(f) === String(cattle._id)) || false;

  res.json({
    success: true,
    cattle: {
      ...cattle.toObject(),
      isFavorited,
    },
    timeline,
    isOwner,
  });
});

module.exports = {
  listCowForSale,
  updateSaleListing,
  removeCowFromSale,
  getMarketplaceCattle,
  getMarketplaceStats,
  toggleFavoriteCow,
  getFavoriteCows,
  getMarketplaceCowProfile,
};
