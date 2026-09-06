import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Copy,
  Stethoscope,
  Syringe,
  Pill,
  CalendarClock,
  Siren,
  ArrowRightLeft,
  ShoppingBag,
  Tag,
  Sparkles,
  Camera,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
} from 'lucide-react';
import { getErrorMessage } from '../../utils/errorMessage';
import { cattleApi } from '../../api/cattleApi';
import { marketplaceApi } from '../../api/marketplaceApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AiAssistant from '../../components/common/AiAssistant';
import { CATTLE_STATUS } from '../../utils/constants';

const EVENT_ICON = {
  VISIT: Stethoscope,
  VACCINATION: Syringe,
  TREATMENT: Pill,
  FOLLOW_UP: CalendarClock,
};

const EVENT_ICON_BG = {
  VISIT: 'bg-serum-600',
  VACCINATION: 'bg-pasture-600',
  TREATMENT: 'bg-hide-600',
  FOLLOW_UP: 'bg-amber-alert-600',
};

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'vaccinations', label: 'Vaccinations' },
  { key: 'cases', label: 'Active Cases' },
  { key: 'sale', label: 'Marketplace / Sell' },
  { key: 'qr', label: 'QR Code' },
];

export default function CattleProfile() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [transferPhone, setTransferPhone] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  // Marketplace sale form state
  const [salePrice, setSalePrice] = useState('');
  const [saleDesc, setSaleDesc] = useState('');
  const [saleContactPhone, setSaleContactPhone] = useState('');
  const [saleStatus, setSaleStatus] = useState('OPEN_FOR_SALE');
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);

  // Multi-photo state for marketplace listing:
  // Slot 1: Front Face (Mandatory)
  const [frontFacePhoto, setFrontFacePhoto] = useState(null);
  const [frontFacePreview, setFrontFacePreview] = useState('');
  // Slot 2: Side Profile / Full Body (Mandatory)
  const [sidePhoto, setSidePhoto] = useState(null);
  const [sidePreview, setSidePreview] = useState('');
  // Slot 3+: Additional Optional Photos
  const [additionalPhotos, setAdditionalPhotos] = useState([]);

  const load = () => {
    cattleApi
      .getProfile(id)
      .then((res) => {
        setData(res.data);
        if (res.data?.cattle?.sale) {
          setSalePrice(res.data.cattle.sale.askingPrice || '');
          setSaleDesc(res.data.cattle.sale.description || '');
          setSaleContactPhone(res.data.cattle.sale.contactPhone || '');
          setSaleStatus(res.data.cattle.sale.status || 'OPEN_FOR_SALE');

          const photos =
            res.data.cattle.sale.photos ||
            (res.data.cattle.photoUrl ? [res.data.cattle.photoUrl] : []);

          if (photos.length > 0) {
            setFrontFacePreview(photos[0]);
          }
          if (photos.length > 1) {
            setSidePreview(photos[1]);
          }
          if (photos.length > 2) {
            setAdditionalPhotos(
              photos.slice(2).map((url) => ({ file: null, preview: url, isExisting: true }))
            );
          }
        } else if (res.data?.cattle?.photoUrl) {
          setFrontFacePreview(res.data.cattle.photoUrl);
        }
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(load, [id]);

  if (isLoading) return <LoadingSpinner label="Loading cattle profile..." />;
  if (!data) return <p className="text-sm text-ink-500">Cattle not found.</p>;

  const { cattle, timeline, activeCases } = data;
  const statusConfig = CATTLE_STATUS[cattle.status] || CATTLE_STATUS.HEALTHY;

  const vaccinations = timeline.filter((e) => e.eventType === 'VACCINATION');

  const handleInitiateTransfer = async () => {
    if (!transferPhone.trim()) {
      toast.error('Enter the new owner\'s phone number.');
      return;
    }
    setIsTransferring(true);
    try {
      await cattleApi.initiateTransfer(cattle._id, transferPhone.trim());
      toast.success('Transfer request sent. They need to accept it before ownership changes.');
      setShowTransferForm(false);
      setTransferPhone('');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not start the transfer.'));
    } finally {
      setIsTransferring(false);
    }
  };

  const copyId = () => {
    navigator.clipboard.writeText(cattle.cattleId);
    toast.success('Cattle ID copied.');
  };

  return (
    <div className="space-y-5">
      {/* Health passport header */}
      <div className="relative overflow-hidden rounded-2xl border border-mist-200 bg-white shadow-sm">
        {/* Rotated status stamp */}
        <div className="pointer-events-none absolute right-4 top-4 z-10 flex h-16 w-16 -rotate-[14deg] items-center justify-center rounded-full border-2 border-dashed border-white/40 text-center text-[9px] font-bold uppercase leading-tight tracking-wider text-white/80">
          {statusConfig.label}
        </div>

        <div className="flex flex-col gap-4 bg-gradient-to-br from-pasture-700 via-pasture-600 to-pasture-500 p-5 text-white sm:flex-row sm:items-end">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-white/50 bg-white/10">
            {cattle.photoUrl ? (
              <img src={cattle.photoUrl} alt={cattle.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-4xl">🐄</span>
            )}
          </div>
          <div className="flex-1 pr-14">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-pasture-100/80">
              Digital Cattle Health Passport
            </p>
            <h1 className="font-display text-2xl font-semibold leading-tight">{cattle.name}</h1>
            <p className="mt-0.5 text-sm text-pasture-50/90">
              {cattle.breed || 'Breed not recorded'} · Owner {cattle.ownerId?.name}
            </p>
          </div>
        </div>

        {/* Perforated seam */}
        <div className="relative h-0 border-t-2 border-dashed border-mist-200">
          <span className="absolute -left-2 -top-2 h-4 w-4 rounded-full bg-mist-50" />
          <span className="absolute -right-2 -top-2 h-4 w-4 rounded-full bg-mist-50" />
        </div>

        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={copyId}
              className="flex items-center gap-2 rounded-lg bg-mist-100 px-3 py-2 font-data text-sm font-medium text-ink-800 hover:bg-mist-200"
              title="Copy permanent cattle ID"
            >
              {cattle.cattleId} <Copy size={13} />
            </button>
            <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusConfig.badgeClass}`}>
              {statusConfig.label}
            </span>
          </div>

          <div className="flex gap-6 text-sm text-ink-600">
            <p>
              Gender <span className="ml-1 font-medium capitalize text-ink-800">{cattle.gender?.toLowerCase()}</span>
            </p>
            {cattle.estimatedAgeYears && (
              <p>
                Age <span className="ml-1 font-medium text-ink-800">{cattle.estimatedAgeYears} yrs</span>
              </p>
            )}
            {cattle.color && (
              <p>
                Color <span className="ml-1 font-medium text-ink-800">{cattle.color}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-mist-200 bg-white p-1 shadow-sm">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-pasture-600 text-white'
                : 'text-ink-600 hover:bg-mist-50'
            }`}
          >
            {tab.label}
            {tab.key === 'cases' && activeCases?.length > 0 && (
              <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-vital-500 text-[10px] font-bold text-white">
                {activeCases.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Quick summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-mist-200 bg-white p-3 text-center shadow-sm">
              <p className="font-display text-lg font-semibold text-pasture-700">{timeline.length}</p>
              <p className="text-xs text-ink-500">Medical Events</p>
            </div>
            <div className="rounded-xl border border-mist-200 bg-white p-3 text-center shadow-sm">
              <p className="font-display text-lg font-semibold text-serum-700">{vaccinations.length}</p>
              <p className="text-xs text-ink-500">Vaccinations</p>
            </div>
            <div className="rounded-xl border border-mist-200 bg-white p-3 text-center shadow-sm">
              <p className="font-display text-lg font-semibold text-amber-alert-700">{activeCases?.length || 0}</p>
              <p className="text-xs text-ink-500">Active Cases</p>
            </div>
          </div>

          {/* Transfer ownership */}
          <div className="rounded-xl border border-mist-200 bg-white p-4 shadow-sm">
            {!showTransferForm ? (
              <button
                onClick={() => setShowTransferForm(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-mist-300 py-2.5 text-sm font-medium text-ink-600 hover:bg-mist-50"
              >
                <ArrowRightLeft size={16} /> Transfer Ownership
              </button>
            ) : (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-ink-900">Transfer {cattle.name} to another farmer</h2>
                <p className="text-xs text-ink-500">
                  The new owner must already have a CowCare account and will need to accept before
                  ownership changes. The full health history moves with the cow.
                </p>
                <input
                  type="tel"
                  value={transferPhone}
                  onChange={(e) => setTransferPhone(e.target.value)}
                  placeholder="New owner's phone number"
                  className="input font-data"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowTransferForm(false)}
                    className="flex-1 rounded-lg border border-mist-300 py-2 text-sm font-medium text-ink-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInitiateTransfer}
                    disabled={isTransferring}
                    className="flex-1 btn-pop py-2 text-sm disabled:opacity-60"
                  >
                    {isTransferring ? 'Sending...' : 'Send Request'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Recent timeline preview */}
          {timeline.length > 0 && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-base font-semibold text-ink-900">Recent Events</h2>
                <button onClick={() => setActiveTab('timeline')} className="text-sm font-medium text-pasture-700 hover:underline">
                  View all
                </button>
              </div>
              <div className="space-y-2">
                {timeline.slice(0, 3).map((event) => (
                  <TimelineEventCard key={event._id} event={event} compact />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {activeTab === 'timeline' && (
        <section>
          <h2 className="mb-3 text-base font-semibold text-ink-900">Health Timeline</h2>
          {timeline.length === 0 ? (
            <EmptyState text="No medical events recorded yet." />
          ) : (
            <ol className="relative space-y-6 border-l-2 border-pasture-100 pl-5">
              {timeline.map((event) => (
                <TimelineEvent key={event._id} event={event} />
              ))}
            </ol>
          )}
        </section>
      )}

      {activeTab === 'vaccinations' && (
        <section>
          <h2 className="mb-3 text-base font-semibold text-ink-900">Vaccinations</h2>
          {vaccinations.length === 0 ? (
            <EmptyState text="No vaccinations recorded yet." />
          ) : (
            <div className="space-y-3">
              {vaccinations.map((event) => (
                <div key={event._id} className="rounded-xl border border-pasture-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Syringe size={16} className="text-pasture-600" />
                      <p className="text-sm font-medium text-ink-900">{event.vaccination?.vaccineName}</p>
                    </div>
                    <p className="font-data text-xs text-ink-400">
                      {new Date(event.eventDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  {event.vaccination?.nextDueDate && (
                    <p className="mt-2 text-xs font-medium text-amber-alert-600">
                      Next due: {new Date(event.vaccination.nextDueDate).toLocaleDateString()}
                    </p>
                  )}
                  {event.veterinarianId?.name && (
                    <p className="mt-1 text-xs text-ink-400">Dr. {event.veterinarianId.name}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'cases' && (
        <section>
          <h2 className="mb-3 text-base font-semibold text-ink-900">Active Cases</h2>
          {!activeCases?.length ? (
            <EmptyState text="No active veterinary cases." />
          ) : (
            <div className="space-y-2">
              {activeCases.map((c) => (
                <Link
                  key={c._id}
                  to={`/farmer/requests/${c._id}`}
                  className="block rounded-xl border border-amber-alert-200 bg-amber-alert-50 p-4 text-sm text-amber-alert-800 hover:bg-amber-alert-100"
                >
                  <p className="font-medium">{c.problemDescription}</p>
                  <p className="mt-1 text-xs">Status: <span className="font-semibold">{c.status.replace('_', ' ')}</span></p>
                  <p className="mt-0.5 text-xs text-amber-alert-600">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'qr' && (
        <section className="flex flex-col items-center gap-4">
          <h2 className="text-base font-semibold text-ink-900">QR Code</h2>
          {cattle.qrCodeDataUrl ? (
            <>
              <div className="rounded-2xl border border-mist-200 bg-white p-6 shadow-sm">
                <img src={cattle.qrCodeDataUrl} alt="Cattle QR" className="h-48 w-48" />
              </div>
              <p className="font-data text-sm font-medium text-ink-700">{cattle.cattleId}</p>
              <p className="max-w-sm text-center text-xs text-ink-400">
                Scan resolves to this ID only — never raw medical data. Authorized veterinarians can
                then look up the cattle&apos;s full health profile through the app.
              </p>
            </>
          ) : (
            <EmptyState text="QR code not available." />
          )}
        </section>
      )}

      {/* Tab: Marketplace / Sell Management */}
      {activeTab === 'sale' && (
        <section aria-labelledby="sale-heading" className="space-y-6">
          <div className="rounded-2xl border border-mist-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-mist-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-pasture-700" />
                  <h2 id="sale-heading" className="font-display text-lg font-bold text-ink-900">
                    Livestock Marketplace Listing
                  </h2>
                </div>
                <p className="text-xs text-ink-500 mt-1">
                  List this cow on the CowCare Cattle Marketplace. Verified medical timeline and vaccines are securely showcased to prospective buyers.
                </p>
              </div>

              {['OPEN_FOR_SALE', 'SALE_PENDING'].includes(cattle.sale?.status) && (
                <Link
                  to={`/farmer/marketplace/${cattle._id}`}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-pasture-50 text-pasture-800 text-xs font-semibold hover:bg-pasture-100 transition-colors border border-pasture-600/20"
                >
                  <span>View Public Listing</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-alert-600" />
                </Link>
              )}
            </div>

            {/* Current Listing Status */}
            <div className="mt-5 space-y-6">
              <div className="p-4 rounded-xl bg-mist-50 border border-mist-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                    Current Marketplace Status
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-display font-bold text-base text-ink-900">
                      {cattle.sale?.status || 'NOT_FOR_SALE'}
                    </span>
                    {cattle.sale?.status === 'OPEN_FOR_SALE' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-pasture-100 text-pasture-800">
                        Active in Marketplace
                      </span>
                    )}
                    {cattle.sale?.status === 'SALE_PENDING' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-alert-100 text-amber-alert-800">
                        Sale Pending
                      </span>
                    )}
                    {cattle.sale?.status === 'SOLD' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-mist-200 text-ink-800">
                        Sold
                      </span>
                    )}
                  </div>
                </div>

                {cattle.sale?.askingPrice > 0 && (
                  <div className="text-left sm:text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                      Listed Price
                    </p>
                    <p className="font-display font-bold text-xl text-pasture-700 mt-0.5">
                      ₹{cattle.sale.askingPrice.toLocaleString('en-IN')}
                    </p>
                  </div>
                )}
              </div>

              {/* Form to list or update sale */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!salePrice || Number(salePrice) <= 0) {
                    toast.error('Please enter a valid asking price.');
                    return;
                  }

                  // When opening for sale or updating active sale, enforce at least 2 photos
                  const isOpeningForSale =
                    (!cattle.sale?.status ||
                      cattle.sale.status === 'NOT_FOR_SALE' ||
                      cattle.sale.status === 'REMOVED_FROM_SALE' ||
                      saleStatus === 'OPEN_FOR_SALE');

                  const hasFront = Boolean(frontFacePhoto || frontFacePreview);
                  const hasSide = Boolean(sidePhoto || sidePreview);

                  if (isOpeningForSale && (!hasFront || !hasSide)) {
                    toast.error(
                      'At least 2 photos are required to list for sale:\n1. Front face photo (Required)\n2. Side profile / full body photo (Required)'
                    );
                    return;
                  }

                  setIsSubmittingSale(true);
                  try {
                    const formData = new FormData();
                    formData.append('askingPrice', salePrice);
                    formData.append('description', saleDesc);
                    formData.append('contactPhone', saleContactPhone);
                    if (saleStatus) {
                      formData.append('status', saleStatus);
                    }

                    // Collect existing photos to retain
                    const retainedExisting = [];
                    if (!frontFacePhoto && frontFacePreview && frontFacePreview.startsWith('/')) {
                      retainedExisting.push(frontFacePreview);
                    }
                    if (!sidePhoto && sidePreview && sidePreview.startsWith('/')) {
                      retainedExisting.push(sidePreview);
                    }
                    additionalPhotos.forEach((item) => {
                      if (!item.file && item.preview && item.preview.startsWith('/')) {
                        retainedExisting.push(item.preview);
                      }
                    });

                    if (retainedExisting.length > 0) {
                      formData.append('existingPhotos', JSON.stringify(retainedExisting));
                    }

                    // Append new files in sequence: Slot 1 (Front), Slot 2 (Side), Slot 3+ (Additional)
                    if (frontFacePhoto) {
                      formData.append('photos', frontFacePhoto);
                    }
                    if (sidePhoto) {
                      formData.append('photos', sidePhoto);
                    }
                    additionalPhotos.forEach((item) => {
                      if (item.file) {
                        formData.append('photos', item.file);
                      }
                    });

                    if (
                      cattle.sale?.status &&
                      cattle.sale.status !== 'NOT_FOR_SALE' &&
                      cattle.sale.status !== 'REMOVED_FROM_SALE'
                    ) {
                      await marketplaceApi.updateSaleListing(cattle._id, formData);
                      toast.success('Marketplace listing updated.');
                    } else {
                      await marketplaceApi.listCowForSale(cattle._id, formData);
                      toast.success('Cow listed for sale in the marketplace with photos!');
                    }
                    load();
                  } catch (err) {
                    toast.error(getErrorMessage(err, 'Failed to save sale listing.'));
                  } finally {
                    setIsSubmittingSale(false);
                  }
                }}
                className="space-y-5 text-xs"
              >
                {/* Photo Upload Section: 2 Required (Front Face + Side View) + Optional Additional */}
                <div className="rounded-2xl border border-mist-200 bg-mist-50/60 p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-mist-200 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-pasture-700" />
                        <h3 className="font-display font-bold text-sm text-ink-900">
                          Cattle Photos <span className="text-vital-600">*</span>
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-pasture-100 text-pasture-800">
                          Min. 2 Photos Required
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-500 mt-0.5">
                        First photo must be a clear front face view. Second photo must be a full-body side view. Add more optional photos to show udder, markings, or pedigree.
                      </p>
                    </div>
                  </div>

                  {/* Photo Slots Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {/* Slot 1: Front Face View (Mandatory) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-ink-800 flex items-center gap-1">
                          <span>1. Front Face View</span>
                          <span className="text-vital-600 font-bold">*</span>
                        </span>
                        {frontFacePreview && (
                          <span className="text-[10px] text-pasture-700 font-bold flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> Ready
                          </span>
                        )}
                      </div>

                      <div className="relative aspect-4/3 rounded-xl border-2 border-dashed border-mist-300 bg-white hover:border-pasture-600 transition-colors overflow-hidden flex flex-col items-center justify-center text-center p-3 group">
                        {frontFacePreview ? (
                          <>
                            <img
                              src={frontFacePreview}
                              alt="Front Face View"
                              className="w-full h-full object-cover rounded-lg"
                            />
                            <div className="absolute inset-0 bg-ink-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                              <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-white text-ink-900 font-semibold text-[11px] shadow-sm hover:bg-mist-100">
                                Replace Photo
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setFrontFacePhoto(file);
                                      setFrontFacePreview(URL.createObjectURL(file));
                                    }
                                  }}
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  setFrontFacePhoto(null);
                                  setFrontFacePreview('');
                                }}
                                className="px-3 py-1 rounded-lg bg-vital-600 text-white font-medium text-[10px] hover:bg-vital-700"
                              >
                                Remove
                              </button>
                            </div>
                            <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-ink-900/75 text-white text-[9px] font-bold">
                              Front Face (Main)
                            </span>
                          </>
                        ) : (
                          <label className="w-full h-full cursor-pointer flex flex-col items-center justify-center gap-1.5">
                            <div className="w-9 h-9 rounded-full bg-pasture-50 text-pasture-700 flex items-center justify-center">
                              <Camera className="w-5 h-5" />
                            </div>
                            <span className="font-semibold text-ink-800 text-xs">
                              Upload Front Face
                            </span>
                            <span className="text-[10px] text-ink-400">
                              Clear face & horns shot
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setFrontFacePhoto(file);
                                  setFrontFacePreview(URL.createObjectURL(file));
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Slot 2: Side Profile / Full Body (Mandatory) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-ink-800 flex items-center gap-1">
                          <span>2. Side Profile / Full Body</span>
                          <span className="text-vital-600 font-bold">*</span>
                        </span>
                        {sidePreview && (
                          <span className="text-[10px] text-pasture-700 font-bold flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> Ready
                          </span>
                        )}
                      </div>

                      <div className="relative aspect-4/3 rounded-xl border-2 border-dashed border-mist-300 bg-white hover:border-pasture-600 transition-colors overflow-hidden flex flex-col items-center justify-center text-center p-3 group">
                        {sidePreview ? (
                          <>
                            <img
                              src={sidePreview}
                              alt="Side Profile View"
                              className="w-full h-full object-cover rounded-lg"
                            />
                            <div className="absolute inset-0 bg-ink-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                              <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-white text-ink-900 font-semibold text-[11px] shadow-sm hover:bg-mist-100">
                                Replace Photo
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setSidePhoto(file);
                                      setSidePreview(URL.createObjectURL(file));
                                    }
                                  }}
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  setSidePhoto(null);
                                  setSidePreview('');
                                }}
                                className="px-3 py-1 rounded-lg bg-vital-600 text-white font-medium text-[10px] hover:bg-vital-700"
                              >
                                Remove
                              </button>
                            </div>
                            <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-ink-900/75 text-white text-[9px] font-bold">
                              Side View
                            </span>
                          </>
                        ) : (
                          <label className="w-full h-full cursor-pointer flex flex-col items-center justify-center gap-1.5">
                            <div className="w-9 h-9 rounded-full bg-pasture-50 text-pasture-700 flex items-center justify-center">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                            <span className="font-semibold text-ink-800 text-xs">
                              Upload Side Profile
                            </span>
                            <span className="text-[10px] text-ink-400">
                              Full length body view
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setSidePhoto(file);
                                  setSidePreview(URL.createObjectURL(file));
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Slot 3+: Additional Optional Photos */}
                    {additionalPhotos.map((item, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-ink-600">
                            Optional Photo {idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setAdditionalPhotos((prev) => prev.filter((_, i) => i !== idx));
                            }}
                            className="text-vital-600 hover:text-vital-800 text-[11px] flex items-center gap-0.5"
                            title="Remove photo"
                          >
                            <Trash2 className="w-3 h-3" /> Remove
                          </button>
                        </div>
                        <div className="relative aspect-4/3 rounded-xl border border-mist-200 bg-white overflow-hidden">
                          <img
                            src={item.preview}
                            alt={`Optional Photo ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    ))}

                    {/* Add More Optional Photos Button */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-medium text-ink-500">
                        Add More (Optional)
                      </span>
                      <label className="aspect-4/3 rounded-xl border-2 border-dashed border-mist-300 bg-white hover:border-pasture-600 transition-colors flex flex-col items-center justify-center text-center p-3 cursor-pointer group">
                        <div className="w-9 h-9 rounded-full bg-mist-100 group-hover:bg-pasture-50 text-ink-500 group-hover:text-pasture-700 flex items-center justify-center transition-colors">
                          <Plus className="w-5 h-5" />
                        </div>
                        <span className="font-semibold text-ink-700 text-xs mt-1 group-hover:text-pasture-800">
                          Add Optional Photo
                        </span>
                        <span className="text-[10px] text-ink-400">
                          Rear view, udder, markings...
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setAdditionalPhotos((prev) => [
                                ...prev,
                                { file, preview: URL.createObjectURL(file), isExisting: false },
                              ]);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-ink-700 font-medium mb-1">
                      Asking Price (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                      placeholder="e.g. 50000"
                      className="w-full px-3 py-2.5 rounded-xl bg-white border border-mist-300 text-ink-900 focus:outline-none focus:ring-1 focus:ring-pasture-600 focus:border-pasture-600"
                    />
                  </div>

                  <div>
                    <label className="block text-ink-700 font-medium mb-1">
                      Contact Phone for Buyers
                    </label>
                    <input
                      type="tel"
                      value={saleContactPhone}
                      onChange={(e) => setSaleContactPhone(e.target.value)}
                      placeholder="e.g. +91 9876543210"
                      className="w-full px-3 py-2.5 rounded-xl bg-white border border-mist-300 text-ink-900 focus:outline-none focus:ring-1 focus:ring-pasture-600 focus:border-pasture-600"
                    />
                  </div>
                </div>

                {cattle.sale?.status && cattle.sale.status !== 'NOT_FOR_SALE' && cattle.sale.status !== 'REMOVED_FROM_SALE' && (
                  <div>
                    <label className="block text-ink-700 font-medium mb-1">
                      Sale State
                    </label>
                    <select
                      value={saleStatus}
                      onChange={(e) => setSaleStatus(e.target.value)}
                      className="w-full sm:w-1/2 px-3 py-2 rounded-xl bg-white border border-mist-300 text-ink-900 focus:outline-none focus:ring-1 focus:ring-pasture-600 focus:border-pasture-600"
                    >
                      <option value="OPEN_FOR_SALE">OPEN_FOR_SALE (Open for buyer inquiries)</option>
                      <option value="SALE_PENDING">SALE_PENDING (Agreement reached)</option>
                      <option value="SOLD">SOLD (Completed transaction)</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-ink-700 font-medium mb-1">
                    Cattle Notes & Description for Buyers
                  </label>
                  <textarea
                    rows="3"
                    value={saleDesc}
                    onChange={(e) => setSaleDesc(e.target.value)}
                    placeholder="Mention daily milk yield, lactation cycle, temperament, breeding history..."
                    className="w-full px-3 py-2 rounded-xl bg-white border border-mist-300 text-ink-900 focus:outline-none focus:ring-1 focus:ring-pasture-600 focus:border-pasture-600"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingSale}
                    className="px-5 py-2.5 rounded-xl bg-pasture-700 hover:bg-pasture-800 text-white font-medium shadow-xs disabled:opacity-50 transition-colors"
                  >
                    {isSubmittingSale
                      ? 'Saving...'
                      : ['OPEN_FOR_SALE', 'SALE_PENDING'].includes(cattle.sale?.status)
                      ? 'Update Sale Details'
                      : 'List Cow For Sale'}
                  </button>

                  {['OPEN_FOR_SALE', 'SALE_PENDING'].includes(cattle.sale?.status) && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm('Remove this cow from the marketplace?')) return;
                        try {
                          await marketplaceApi.removeCowFromSale(cattle._id);
                          toast.success('Listing removed from marketplace.');
                          load();
                        } catch (err) {
                          toast.error(getErrorMessage(err, 'Failed to remove listing.'));
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200 transition-colors"
                    >
                      Remove from Marketplace
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </section>
      )}

      {/* Floating AI Health Assistant (Grounded Mode: Farmer) */}
      <AiAssistant
        cattleId={cattle.cattleId}
        cattleName={cattle.name}
        mode="farmer"
        initialOpen={false}
      />
    </div>
  );
}

/** Full timeline event — used in the Timeline tab */
function TimelineEvent({ event }) {
  const Icon = EVENT_ICON[event.eventType] || Stethoscope;
  return (
    <li className="relative">
      <span className={`absolute -left-[27px] flex h-6 w-6 items-center justify-center rounded-full text-white ${EVENT_ICON_BG[event.eventType] || 'bg-ink-500'}`}>
        <Icon size={13} />
      </span>
      <div className="rounded-xl border border-mist-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-pasture-700">
            {event.eventType.replace('_', ' ')}
          </p>
          <p className="font-data text-xs text-ink-400">
            {new Date(event.eventDate).toLocaleDateString(undefined, {
              day: '2-digit', month: 'short', year: 'numeric',
            })}
          </p>
        </div>

        <div className="space-y-2.5">
          {/* Farmer-reported problem */}
          {event.farmerReportedSymptoms && (
            <div className="border-l-2 border-mist-300 pl-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                Farmer reported
              </p>
              <p className="text-sm text-ink-600">{event.farmerReportedSymptoms}</p>
            </div>
          )}

          {/* Examination details */}
          {(event.examination?.observedSymptoms || event.examination?.physicalFindings) && (
            <div className="border-l-2 border-mist-400 pl-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                🩺 Examination
              </p>
              {event.examination.observedSymptoms && (
                <p className="text-sm text-ink-600"><span className="font-medium">Observed:</span> {event.examination.observedSymptoms}</p>
              )}
              {event.examination.physicalFindings && (
                <p className="text-sm text-ink-600"><span className="font-medium">Findings:</span> {event.examination.physicalFindings}</p>
              )}
              {event.examination.notes && (
                <p className="text-sm text-ink-500">{event.examination.notes}</p>
              )}
            </div>
          )}

          {/* Vitals */}
          {(event.examination?.vitals?.temperatureC || event.examination?.vitals?.heartRateBpm || event.examination?.vitals?.respirationRate) && (
            <div className="flex flex-wrap gap-3 rounded-lg bg-mist-50 p-2 font-data text-xs text-ink-600">
              {event.examination.vitals.temperatureC && (
                <span>🌡️ {event.examination.vitals.temperatureC}°C</span>
              )}
              {event.examination.vitals.heartRateBpm && (
                <span>❤️ {event.examination.vitals.heartRateBpm} bpm</span>
              )}
              {event.examination.vitals.respirationRate && (
                <span>🫁 {event.examination.vitals.respirationRate} /min</span>
              )}
            </div>
          )}

          {/* Clinical assessment */}
          {event.clinicalAssessment && (
            <div className="border-l-2 border-serum-500 pl-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-serum-700">
                Clinical decision
              </p>
              <p className="text-sm text-ink-700">{event.clinicalAssessment}</p>
            </div>
          )}

          {/* Treatment */}
          {event.treatment?.performed && (
            <div className="border-l-2 border-hide-500 pl-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-hide-700">
                💊 Treatment given
              </p>
              <p className="text-sm text-ink-700">{event.treatment.performed}</p>
            </div>
          )}

          {/* Individual medicines */}
          {event.treatment?.medicines?.length > 0 && (
            <div className="space-y-1.5 rounded-lg bg-serum-50/50 p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-serum-700">Medicines prescribed</p>
              {event.treatment.medicines.map((med, i) => (
                <div key={i} className="text-xs text-ink-600">
                  <span className="font-medium text-ink-800">Rx {String(i + 1).padStart(2, '0')}: {med.name}</span>
                  {med.dosage && <span> · {med.dosage}</span>}
                  {med.frequency && <span> · {med.frequency}</span>}
                  {med.duration && <span> · {med.duration}</span>}
                  {med.route && <span> · {med.route}</span>}
                  {med.instructions && <p className="mt-0.5 text-ink-500">{med.instructions}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Vaccination */}
          {event.vaccination?.vaccineName && (
            <div className="border-l-2 border-pasture-500 pl-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-pasture-700">
                💉 Vaccine
              </p>
              <p className="text-sm text-ink-700">{event.vaccination.vaccineName}</p>
              {event.vaccination.nextDueDate && (
                <p className="text-xs font-medium text-amber-alert-600">
                  Next due: {new Date(event.vaccination.nextDueDate).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </div>

        {event.veterinarianId?.name && (
          <p className="mt-3 text-xs text-ink-400">Dr. {event.veterinarianId.name}{event.veterinarianId.specialization ? ` · ${event.veterinarianId.specialization}` : ''}</p>
        )}
        {event.treatment?.followUpDate && (
          <p className="mt-1 text-xs font-medium text-amber-alert-600">
            📅 Follow-up: {new Date(event.treatment.followUpDate).toLocaleDateString()}
          </p>
        )}
      </div>
    </li>
  );
}

/** Compact timeline card — used in Overview tab preview */
function TimelineEventCard({ event }) {
  const Icon = EVENT_ICON[event.eventType] || Stethoscope;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-mist-200 bg-white p-3 shadow-sm">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${EVENT_ICON_BG[event.eventType] || 'bg-ink-500'}`}>
        <Icon size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-pasture-700">
            {event.eventType.replace('_', ' ')}
          </p>
          <p className="font-data text-xs text-ink-400">
            {new Date(event.eventDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
          </p>
        </div>
        {event.clinicalAssessment && (
          <p className="mt-0.5 line-clamp-1 text-sm text-ink-600">{event.clinicalAssessment}</p>
        )}
        {event.vaccination?.vaccineName && (
          <p className="mt-0.5 text-sm text-ink-600">{event.vaccination.vaccineName}</p>
        )}
        {event.veterinarianId?.name && (
          <p className="text-xs text-ink-400">Dr. {event.veterinarianId.name}</p>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-xl border border-dashed border-mist-300 bg-white p-6 text-center text-sm text-ink-500">
      {text}
    </div>
  );
}
