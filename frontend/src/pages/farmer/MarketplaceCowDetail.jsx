import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft,
  ShieldCheck,
  MapPin,
  Phone,
  Calendar,
  Sparkles,
  Stethoscope,
  Syringe,
  Pill,
  CalendarClock,
  Clock,
  Copy,
  Tag,
  Share2,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Camera,
  Handshake,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { marketplaceApi } from '../../api/marketplaceApi';
import { cattleApi } from '../../api/cattleApi';
import { getErrorMessage } from '../../utils/errorMessage';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import AiAssistant from '../../components/common/AiAssistant';
import { CATTLE_STATUS } from '../../utils/constants';
import { resolveImageUrl } from '../../utils/imageUrl';

const EVENT_ICON = {
  VISIT: Stethoscope,
  VACCINATION: Syringe,
  TREATMENT: Pill,
  FOLLOW_UP: CalendarClock,
};

export default function MarketplaceCowDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isVet = user?.role === 'VETERINARIAN';
  const marketplaceHome = isVet ? '/vet/marketplace' : '/farmer/marketplace';

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  // Edit listing modal state for owner
  const [isEditing, setIsEditing] = useState(false);
  const [editPrice, setEditPrice] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ownership request state for buyer
  const [isRequesting, setIsRequesting] = useState(false);

  // Ownership request respond state for owner
  const [isRespondingTransfer, setIsRespondingTransfer] = useState(false);

  const ownerPendingTransfer = data?.ownerPendingTransfer;

  const handleRespondTransfer = async (transferId, action) => {
    const isAccept = action === 'ACCEPT';
    const buyerName = ownerPendingTransfer?.toOwnerId?.name || 'the buyer';
    const confirmMsg = isAccept
      ? `Accept ownership transfer of ${cattle.name} to ${buyerName}? Ownership will transfer immediately and this listing will be marked as SOLD.`
      : `Decline ownership request from ${buyerName}? This cow will remain open for sale.`;

    if (!window.confirm(confirmMsg)) return;

    setIsRespondingTransfer(true);
    try {
      await cattleApi.respondToTransfer(transferId, action);
      toast.success(isAccept ? 'Transfer accepted! Cattle ownership transferred.' : 'Transfer request declined.');
      loadProfile();
    } catch (err) {
      toast.error(getErrorMessage(err, `Could not ${action.toLowerCase()} transfer.`));
    } finally {
      setIsRespondingTransfer(false);
    }
  };

  const loadProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await marketplaceApi.getMarketplaceCowProfile(id);
      setData(res.data);
      if (res.data.cattle?.sale) {
        setEditPrice(res.data.cattle.sale.askingPrice || '');
        setEditDesc(res.data.cattle.sale.description || '');
        setEditStatus(res.data.cattle.sale.status || 'OPEN_FOR_SALE');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load cattle passport.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [id]);

  const handleCopyId = () => {
    if (data?.cattle?.cattleId) {
      navigator.clipboard.writeText(data.cattle.cattleId);
      toast.success('Permanent Cattle ID copied to clipboard.');
    }
  };

  const handleUpdateListing = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await marketplaceApi.updateSaleListing(data.cattle._id, {
        askingPrice: Number(editPrice),
        description: editDesc,
        status: editStatus,
      });
      toast.success('Sale listing updated successfully.');
      setIsEditing(false);
      loadProfile();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update sale listing.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveListing = async () => {
    if (!window.confirm('Are you sure you want to remove this cow from the marketplace?')) return;
    try {
      await marketplaceApi.removeCowFromSale(data.cattle._id);
      toast.success('Cow has been removed from the marketplace.');
      navigate(marketplaceHome);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to remove listing.'));
    }
  };

  if (isLoading) return <LoadingSpinner label="Loading verified cattle passport..." />;
  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-4">
        <div className="bg-rose-50 text-rose-800 p-6 rounded-2xl border border-rose-200">
          <p className="text-sm font-medium">{error}</p>
        </div>
        <Link
          to={marketplaceHome}
          className="inline-flex items-center gap-2 text-xs font-semibold text-pasture-800 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Marketplace
        </Link>
      </div>
    );
  }

  const { cattle, timeline = [], isOwner, buyerTransfer } = data;
  const statusCfg = CATTLE_STATUS[cattle.status] || CATTLE_STATUS.HEALTHY;
  const vaccinations = timeline.filter((e) => e.eventType === 'VACCINATION');

  const rawPhotos =
    cattle.sale?.photos && cattle.sale.photos.length > 0
      ? cattle.sale.photos
      : cattle.photos && cattle.photos.length > 0
      ? cattle.photos
      : cattle.photoUrl
      ? [cattle.photoUrl]
      : [];

  const allPhotos = rawPhotos.map(resolveImageUrl).filter(Boolean);

  const currentPhoto = allPhotos[activePhotoIdx] || allPhotos[0] || null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to={marketplaceHome}
          className="inline-flex items-center gap-2 text-xs font-semibold text-ink-600 hover:text-pasture-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Marketplace</span>
        </Link>

        {isOwner && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="px-3.5 py-1.5 rounded-lg bg-pasture-700 text-white hover:bg-pasture-800 text-xs font-medium transition-colors shadow-xs"
            >
              Manage Listing
            </button>
            <button
              onClick={handleRemoveListing}
              className="px-3.5 py-1.5 rounded-lg bg-vital-50 hover:bg-vital-100 text-vital-700 border border-vital-200 text-xs font-medium transition-colors"
            >
              Delist Cow
            </button>
          </div>
        )}
      </div>

      {/* Main Passport Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-mist-200 flex flex-col lg:flex-row gap-8">
        {/* Photo & Gallery Container */}
        <div className="w-full lg:w-96 shrink-0 space-y-3">
          {/* Main Photo Card */}
          <div className="relative aspect-4/3 rounded-2xl overflow-hidden bg-mist-100 border border-mist-200 group">
            {currentPhoto ? (
              <img
                src={currentPhoto}
                alt={`${cattle.name} - Photo ${activePhotoIdx + 1}`}
                className="w-full h-full object-cover transition-all duration-300"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-ink-400">
                <ShieldCheck className="w-12 h-12 opacity-30 mb-2" />
                <span className="text-xs">No photos available</span>
              </div>
            )}

            {/* Top Left: Health Status */}
            <div className="absolute top-3 left-3">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-medium shadow-xs ${statusCfg.badgeClass}`}
              >
                {statusCfg.label}
              </span>
            </div>

            {/* Top Right: Photos Counter / Sale Pending */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              {cattle.sale?.status === 'SALE_PENDING' && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-alert-500 text-white uppercase tracking-wider shadow-xs">
                  Sale Pending
                </span>
              )}
              {allPhotos.length > 1 && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-ink-950/75 backdrop-blur-xs text-white shadow-xs">
                  {activePhotoIdx + 1} / {allPhotos.length}
                </span>
              )}
            </div>

            {/* Navigation Arrows if multiple photos */}
            {allPhotos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setActivePhotoIdx((prev) => (prev > 0 ? prev - 1 : allPhotos.length - 1))
                  }
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-ink-900/60 hover:bg-ink-900/85 text-white transition-all shadow-md opacity-80 group-hover:opacity-100"
                  title="Previous photo"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActivePhotoIdx((prev) => (prev < allPhotos.length - 1 ? prev + 1 : 0))
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-ink-900/60 hover:bg-ink-900/85 text-white transition-all shadow-md opacity-80 group-hover:opacity-100"
                  title="Next photo"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Bottom Tag: Photo Slot Description */}
            {allPhotos.length > 0 && (
              <div className="absolute bottom-3 left-3">
                <span className="px-2.5 py-1 rounded-md bg-ink-950/75 backdrop-blur-xs text-white text-[10px] font-bold shadow-xs">
                  {activePhotoIdx === 0
                    ? '1. Front Face View (Primary)'
                    : activePhotoIdx === 1
                    ? '2. Side Profile / Full Body'
                    : `Optional Photo ${activePhotoIdx + 1}`}
                </span>
              </div>
            )}
          </div>

          {/* Interactive Thumbnails Row for Optional & Additional Photos */}
          {allPhotos.length > 1 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-ink-500 font-medium px-0.5">
                <span>All Photos ({allPhotos.length})</span>
                <span className="text-[10px] text-ink-400">Click to preview</span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {allPhotos.map((url, idx) => {
                  const isSelected = activePhotoIdx === idx;
                  const label =
                    idx === 0 ? 'Front Face' : idx === 1 ? 'Side Body' : `Optional ${idx + 1}`;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActivePhotoIdx(idx)}
                      className={`group relative h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                        isSelected
                          ? 'border-pasture-700 ring-2 ring-pasture-700/30 scale-102 shadow-sm'
                          : 'border-mist-200 hover:border-mist-400 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={label} className="w-full h-full object-cover" />
                      <span className="absolute bottom-0 inset-x-0 bg-ink-950/80 text-white text-[8px] font-bold py-0.5 truncate text-center leading-tight">
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cattle Permanent ID Pill */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-mist-50 border border-mist-200">
            <div>
              <p className="text-[10px] text-ink-400 uppercase tracking-wider font-sans">
                Permanent Cattle ID
              </p>
              <p className="font-mono font-bold text-xs text-ink-900">
                {cattle.cattleId}
              </p>
            </div>
            <button
              onClick={handleCopyId}
              className="p-1.5 rounded-lg hover:bg-mist-200 text-ink-500 transition-colors"
              title="Copy ID"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Passport Profile Data */}
        <div className="flex-1 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-mist-100 pb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink-900">
                  {cattle.name}
                </h1>
                <p className="text-xs text-ink-500 mt-1 font-sans">
                  {cattle.breed} • {cattle.gender === 'FEMALE' ? 'Female Cow' : 'Male Bull'} • ~
                  {cattle.estimatedAgeYears || '?'} years old
                </p>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-xs text-ink-400 font-sans">Asking Price</p>
                <p className="text-2xl sm:text-3xl font-display font-bold text-pasture-700">
                  ₹{(cattle.sale?.askingPrice || 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Seller Description */}
            {cattle.sale?.description && (
              <div className="bg-mist-50 p-4 rounded-xl border border-mist-200">
                <h2 className="text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1 font-sans">
                  Seller Notes & Description
                </h2>
                <p className="text-xs sm:text-sm text-ink-600 leading-relaxed font-sans whitespace-pre-line">
                  {cattle.sale.description}
                </p>
              </div>
            )}

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-mist-50 border border-mist-200">
                <p className="text-[10px] text-ink-400 uppercase">Breed</p>
                <p className="text-xs font-semibold text-ink-900 mt-0.5">
                  {cattle.breed}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-mist-50 border border-mist-200">
                <p className="text-[10px] text-ink-400 uppercase">Color</p>
                <p className="text-xs font-semibold text-ink-900 mt-0.5">
                  {cattle.color || 'Standard'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-mist-50 border border-mist-200">
                <p className="text-[10px] text-ink-400 uppercase">Vet Visits</p>
                <p className="text-xs font-semibold text-ink-900 mt-0.5">
                  {timeline.length} on record
                </p>
              </div>
              <div className="p-3 rounded-xl bg-mist-50 border border-mist-200">
                <p className="text-[10px] text-ink-400 uppercase">Vaccinations</p>
                <p className="text-xs font-semibold text-pasture-700 mt-0.5">
                  {vaccinations.length} logged
                </p>
              </div>
            </div>
          </div>

          {/* Seller Contact & Verification Card */}
          <div className="p-4 rounded-2xl bg-pasture-800 text-white border border-pasture-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-alert-500" />
                <span className="text-xs font-display font-bold text-amber-alert-100">
                  Seller Contact & Location
                </span>
              </div>
              <p className="text-xs text-pasture-100">
                Owner: <span className="font-semibold text-white">{cattle.ownerId?.name}</span>{' '}
                {cattle.ownerId?.farmName && `(${cattle.ownerId.farmName})`}
              </p>
              {cattle.sale?.location?.address && (
                <p className="text-[11px] text-pasture-200 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-amber-alert-200 shrink-0" />
                  <span>{cattle.sale.location.address}</span>
                </p>
              )}
            </div>

            {cattle.sale?.contactPhone && (
              <a
                href={`tel:${cattle.sale.contactPhone}`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-alert-500 hover:bg-amber-alert-600 text-white font-semibold text-xs transition-colors shadow-xs shrink-0"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Seller ({cattle.sale.contactPhone})</span>
              </a>
            )}
          </div>

          {/* Owner Pending Ownership Request Card — visible to owner with both Accept & Reject buttons */}
          {isOwner && ownerPendingTransfer && ownerPendingTransfer.status === 'PENDING' && (
            <div className="p-4 sm:p-5 rounded-2xl border-2 border-amber-alert-400 bg-gradient-to-br from-amber-alert-50 via-orange-50 to-amber-alert-100 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-alert-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <Handshake className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-alert-200 text-amber-alert-900 text-[11px] font-bold mb-1">
                      <span className="w-2 h-2 rounded-full bg-amber-alert-600 animate-pulse" />
                      Ownership Request Received
                    </div>
                    <p className="text-sm font-bold text-ink-900">
                      {ownerPendingTransfer.toOwnerId?.name || 'Buyer'} wants to purchase {cattle.name}
                    </p>
                    <p className="text-xs text-ink-600 mt-0.5">
                      Buyer Phone: {ownerPendingTransfer.toOwnerId?.phone ? (
                        <a href={`tel:${ownerPendingTransfer.toOwnerId?.phone}`} className="font-semibold text-pasture-700 underline font-data">
                          {ownerPendingTransfer.toOwnerId?.phone}
                        </a>
                      ) : 'N/A'} · Once you have completed the deal and received payment, confirm transfer below:
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleRespondTransfer(ownerPendingTransfer._id, 'ACCEPT')}
                    disabled={isRespondingTransfer}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-pasture-600 hover:bg-pasture-700 text-white font-semibold text-xs shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    <Check size={16} />
                    <span>{isRespondingTransfer ? 'Processing...' : 'Accept'}</span>
                  </button>
                  <button
                    onClick={() => handleRespondTransfer(ownerPendingTransfer._id, 'REJECT')}
                    disabled={isRespondingTransfer}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-vital-400 bg-white hover:bg-vital-50 text-vital-600 font-semibold text-xs shadow-xs transition-all disabled:opacity-50"
                  >
                    <X size={16} />
                    <span>{isRespondingTransfer ? 'Processing...' : 'Reject'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Request Ownership — visible only to non-owner farmers */}
          {!isOwner && user?.role === 'FARMER' && ['OPEN_FOR_SALE', 'SALE_PENDING'].includes(cattle.sale?.status) && (
            <div className="p-4 rounded-2xl border border-mist-200 bg-gradient-to-r from-amber-alert-50 to-pasture-50">
              {buyerTransfer ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-alert-100 flex items-center justify-center shrink-0">
                    <Handshake className="w-5 h-5 text-amber-alert-700" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ink-900">Ownership Request Sent ✓</p>
                    <p className="text-xs text-ink-500 mt-0.5">
                      Waiting for <span className="font-medium">{cattle.ownerId?.name}</span> to confirm the transfer. You will be notified once accepted.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-pasture-100 flex items-center justify-center shrink-0">
                      <Handshake className="w-5 h-5 text-pasture-700" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink-900">Agreed on a deal?</p>
                      <p className="text-xs text-ink-500 mt-0.5">After calling and finalizing the deal, request ownership transfer here.</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (!window.confirm(`Request ownership of ${cattle.name}? The seller will be notified to confirm.`)) return;
                      setIsRequesting(true);
                      try {
                        await marketplaceApi.requestOwnership(cattle._id);
                        toast.success('Ownership request sent! The seller will confirm the transfer.');
                        loadProfile();
                      } catch (err) {
                        toast.error(getErrorMessage(err, 'Could not send ownership request.'));
                      } finally {
                        setIsRequesting(false);
                      }
                    }}
                    disabled={isRequesting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-pasture-500 to-pasture-700 text-white font-semibold text-xs hover:from-pasture-600 hover:to-pasture-800 transition-all shadow-md disabled:opacity-50 shrink-0"
                  >
                    {isRequesting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Handshake className="w-4 h-4" />
                    )}
                    <span>{isRequesting ? 'Sending...' : 'Request Ownership'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Verified Medical Timeline */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-mist-200 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-mist-100 pb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-pasture-50 text-pasture-800 text-xs font-medium mb-1 border border-pasture-200">
              <ShieldCheck className="w-3.5 h-3.5 text-pasture-700" />
              <span>Immutable Ledger</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-display font-bold text-ink-900">
              Verified Veterinary Medical History
            </h2>
          </div>
          <p className="text-xs text-ink-500">
            {timeline.length} permanent event{timeline.length === 1 ? '' : 's'} recorded by licensed vets
          </p>
        </div>

        {timeline.length === 0 ? (
          <div className="p-8 text-center bg-mist-50 rounded-2xl border border-dashed border-mist-300">
            <p className="text-xs text-ink-500">
              No medical events have been logged for this cow yet.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 border-l-2 border-mist-300 space-y-6">
            {timeline.map((event) => {
              const IconComponent = EVENT_ICON[event.eventType] || Stethoscope;
              const dateStr = new Date(event.eventDate).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });

              return (
                <div key={event._id} className="relative group">
                  {/* Timeline dot */}
                  <div className="absolute -left-[31px] sm:-left-[39px] top-1 w-7 h-7 rounded-full bg-pasture-700 text-white border-2 border-white flex items-center justify-center shadow-xs">
                    <IconComponent className="w-3.5 h-3.5" />
                  </div>

                  {/* Event Box */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-mist-50/80 border border-mist-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-ink-900">
                          {event.eventType.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] text-ink-400">• {dateStr}</span>
                      </div>
                      <p className="text-[11px] text-ink-500 font-sans">
                        Attending Vet: <span className="font-medium text-ink-800">{event.veterinarianId?.name || 'Verified Vet'}</span>
                      </p>
                    </div>

                    {/* Diagnosis / Notes */}
                    {(event.diagnosis || event.clinicalObservations) && (
                      <p className="text-xs text-ink-700 leading-relaxed font-sans">
                        {event.diagnosis || event.clinicalObservations}
                      </p>
                    )}

                    {/* Vitals */}
                    {event.vitals && (
                      <div className="flex flex-wrap gap-2 text-[10px] text-ink-500">
                        {event.vitals.temperatureF && (
                          <span className="px-2 py-0.5 rounded bg-mist-200">
                            Temp: {event.vitals.temperatureF}°F
                          </span>
                        )}
                        {event.vitals.heartRateBpm && (
                          <span className="px-2 py-0.5 rounded bg-mist-200">
                            Heart Rate: {event.vitals.heartRateBpm} bpm
                          </span>
                        )}
                        {event.vitals.respirationRateBpm && (
                          <span className="px-2 py-0.5 rounded bg-mist-200">
                            Resp: {event.vitals.respirationRateBpm} bpm
                          </span>
                        )}
                      </div>
                    )}

                    {/* Treatments / Medicines */}
                    {event.treatment?.length > 0 && (
                      <div className="pt-2 border-t border-mist-200">
                        <p className="text-[10px] font-semibold text-ink-500 uppercase tracking-wider mb-1">
                          Treatments / Vaccines Administered
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {event.treatment.map((t, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-pasture-50 text-pasture-800 text-[11px] border border-pasture-200"
                            >
                              {t.name} {t.dosage ? `(${t.dosage})` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating AI Health Assistant (Dual Mode: Vet vs Farmer) */}
      <AiAssistant
        cattleId={cattle.cattleId}
        cattleName={cattle.name}
        mode={isVet ? 'veterinarian' : 'farmer'}
        initialOpen={false}
      />

      {/* Owner Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-ink-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-mist-200 shadow-2xl space-y-4">
            <h3 className="text-lg font-display font-bold text-ink-900">
              Update Marketplace Listing
            </h3>
            <form onSubmit={handleUpdateListing} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-ink-700 font-medium mb-1">
                  Asking Price (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-mist-50 border border-mist-300 text-ink-900 focus:outline-none focus:ring-1 focus:ring-pasture-600 focus:border-pasture-600"
                />
              </div>

              <div>
                <label className="block text-ink-700 font-medium mb-1">
                  Sale Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-mist-50 border border-mist-300 text-ink-900 focus:outline-none focus:ring-1 focus:ring-pasture-600 focus:border-pasture-600"
                >
                  <option value="OPEN_FOR_SALE">OPEN_FOR_SALE (Active in marketplace)</option>
                  <option value="SALE_PENDING">SALE_PENDING (Buyer agreed/in escrow)</option>
                  <option value="SOLD">SOLD (Completed sale)</option>
                  <option value="REMOVED_FROM_SALE">REMOVED_FROM_SALE (Unlist)</option>
                </select>
              </div>

              <div>
                <label className="block text-ink-700 font-medium mb-1">
                  Seller Notes / Description
                </label>
                <textarea
                  rows="3"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-mist-50 border border-mist-300 text-ink-900 focus:outline-none focus:ring-1 focus:ring-pasture-600 focus:border-pasture-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl bg-mist-100 text-ink-700 hover:bg-mist-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-pasture-700 text-white hover:bg-pasture-800 disabled:opacity-50 transition-colors shadow-xs font-medium"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
