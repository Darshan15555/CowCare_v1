const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const { isVetOnDutyNow } = require('../utils/vetAvailability');
const { getVetRatingSummaryForVet } = require('./requestController');

function vetCard(vet, rating, favoriteVetIds) {
  return {
    _id: vet._id,
    name: vet.name,
    avatarUrl: vet.avatarUrl,
    specialization: vet.specialization,
    yearsOfExperience: vet.yearsOfExperience,
    serviceAreaRadiusKm: vet.serviceAreaRadiusKm,
    weeklySchedule: vet.weeklySchedule || [],
    onDuty: isVetOnDutyNow(vet),
    averageStars: rating.averageStars,
    totalRatings: rating.totalRatings,
    isFavorite: favoriteVetIds.some((id) => String(id) === String(vet._id)),
  };
}

const listVets = asyncHandler(async (req, res) => {
  const filter = { role: 'VETERINARIAN', isActive: true };
  if (req.query.specialization) filter.specialization = new RegExp(req.query.specialization, 'i');
  const vets = await User.find(filter).select('name avatarUrl specialization yearsOfExperience serviceAreaRadiusKm isAvailable weeklySchedule');
  const filtered = req.query.onDutyOnly === 'true' ? vets.filter(isVetOnDutyNow) : vets;
  const cards = await Promise.all(filtered.map(async (vet) => vetCard(vet, await getVetRatingSummaryForVet(vet._id), req.user.favoriteVetIds || [])));
  res.json({ success: true, vets: cards });
});

const getFavoriteVets = asyncHandler(async (req, res) => {
  const farmer = await User.findById(req.user._id).populate({
    path: 'favoriteVetIds',
    match: { role: 'VETERINARIAN', isActive: true },
    select: 'name avatarUrl specialization yearsOfExperience serviceAreaRadiusKm isAvailable weeklySchedule',
  });
  const vets = (farmer.favoriteVetIds || []).filter(Boolean);
  const favoriteVetIds = farmer.favoriteVetIds.map((vet) => vet._id);
  const cards = await Promise.all(vets.map(async (vet) => vetCard(vet, await getVetRatingSummaryForVet(vet._id), favoriteVetIds)));
  res.json({ success: true, vets: cards });
});

const favoriteVet = asyncHandler(async (req, res) => {
  const vet = await User.findOne({ _id: req.params.vetId, role: 'VETERINARIAN', isActive: true });
  if (!vet) { res.status(404); throw new Error('Veterinarian not found.'); }
  await User.findByIdAndUpdate(req.user._id, { $addToSet: { favoriteVetIds: vet._id } });
  res.json({ success: true, isFavorite: true });
});

const unfavoriteVet = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $pull: { favoriteVetIds: req.params.vetId } });
  res.json({ success: true, isFavorite: false });
});

module.exports = { listVets, getFavoriteVets, favoriteVet, unfavoriteVet };
