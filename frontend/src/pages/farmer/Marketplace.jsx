import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ShoppingBag,
  Search,
  SlidersHorizontal,
  ShieldCheck,
  MapPin,
  Heart,
  Camera,
  CheckCircle2,
  FileText,
  Syringe,
  Sparkles,
  LayoutGrid,
  List,
  Rows3,
  RotateCcw,
  ArrowRight,
  Headphones,
  Info,
} from 'lucide-react';
import { marketplaceApi } from '../../api/marketplaceApi';
import { getErrorMessage } from '../../utils/errorMessage';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AiAssistant from '../../components/common/AiAssistant';
import { CATTLE_STATUS } from '../../utils/constants';
import { resolveImageUrl } from '../../utils/imageUrl';

const COMMON_BREEDS = [
  'All Breeds',
  'Gir',
  'Holstein Friesian',
  'Sahiwal',
  'Jersey',
  'Red Sindhi',
  'Tharparkar',
  'Kankrej',
  'Murrah',
  'Crossbred',
];

export default function Marketplace() {
  const location = useLocation();
  const isVet = location.pathname.startsWith('/vet');
  const detailBasePath = isVet ? '/vet/marketplace' : '/farmer/marketplace';

  // Core listings state
  const [cattleList, setCattleList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // View mode: 'grid' | 'compact' | 'detailed'
  const [viewMode, setViewMode] = useState('grid');

  // Filters state
  const [search, setSearch] = useState('');
  const [breed, setBreed] = useState('All Breeds');
  const [gender, setGender] = useState('All');
  const [status, setStatus] = useState('All Status');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Advanced filters panel state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [vaccinatedOnly, setVaccinatedOnly] = useState(false);

  // Read search param from URL on initial load if present (e.g. from header search)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('search');
    if (q) setSearch(q);
  }, [location.search]);

  // Load marketplace stats from backend
  const loadStats = async () => {
    try {
      const res = await marketplaceApi.getMarketplaceStats();
      if (res.data?.stats) {
        setStats(res.data.stats);
      }
    } catch {
      // Fallback silently if stats endpoint unreachable
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // Fetch cattle with current filter set
  const fetchCattle = async (page = 1, append = false) => {
    if (!append) setIsLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 12,
        search: search.trim() || undefined,
        breed: breed !== 'All Breeds' ? breed : undefined,
        gender: gender !== 'All' ? gender : undefined,
        status: status !== 'All Status' ? status : undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        sortBy,
        ageMin: ageMin ? Number(ageMin) : undefined,
        ageMax: ageMax ? Number(ageMax) : undefined,
        vaccinatedOnly: vaccinatedOnly ? 'true' : undefined,
      };

      const res = await marketplaceApi.getMarketplaceCattle(params);
      const newItems = res.data?.cattle || [];

      setCattleList((prev) => (append ? [...prev, ...newItems] : newItems));
      setPagination(res.data?.pagination || { page: 1, limit: 12, total: newItems.length, totalPages: 1 });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load cattle marketplace listings.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCattle(1);
  }, [breed, gender, status, sortBy, vaccinatedOnly]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCattle(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setBreed('All Breeds');
    setGender('All');
    setStatus('All Status');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('newest');
    setAgeMin('');
    setAgeMax('');
    setVaccinatedOnly(false);
    setTimeout(() => fetchCattle(1), 0);
  };

  const handleToggleFavorite = async (e, cowId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await marketplaceApi.toggleFavorite(cowId);
      const isFav = res.data?.isFavorited;
      setCattleList((prev) =>
        prev.map((cow) => (cow._id === cowId ? { ...cow, isFavorited: isFav } : cow))
      );
      toast.success(res.data?.message || (isFav ? 'Added to favorites' : 'Removed from favorites'));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update favorites.'));
    }
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-10">
      {/* 2-Column Master Layout: Main Content (Left) + Overview Widgets (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (Primary Marketplace Experience) */}
        <div className="lg:col-span-9 space-y-6">
          {/* Hero Banner with Realistic Pasture Imagery & Stats */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-pasture-950 via-pasture-900 to-pasture-800 text-white p-6 sm:p-8 shadow-xl border border-pasture-700/50">
            {/* Background subtle pasture image overlay */}
            <div
              className="absolute inset-0 opacity-25 mix-blend-luminosity bg-cover bg-center pointer-events-none"
              style={{
                backgroundImage:
                  'url("https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&w=1200&q=80")',
              }}
            />

            <div className="relative z-10 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1.5 max-w-2xl">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold tracking-tight text-white">
                    Cattle Marketplace
                  </h1>
                  <p className="text-sm sm:text-base font-display font-medium text-amber-alert-200">
                    Verified Cows. Complete Health Transparency.
                  </p>
                  <p className="text-xs sm:text-sm text-pasture-100/90 leading-relaxed font-sans pt-1">
                    Explore healthy, well-documented cows with complete medical history and AI-powered
                    health insights to make confident decisions.
                  </p>
                </div>

                {/* Verified Marketplace Top Badge */}
                <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-pasture-950/80 backdrop-blur-md border border-pasture-700/60 shrink-0 self-start">
                  <div className="w-8 h-8 rounded-xl bg-amber-alert-500/20 text-amber-alert-200 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="text-left pr-1">
                    <p className="text-[11px] font-display font-bold text-white leading-tight">
                      Verified Marketplace
                    </p>
                    <p className="text-[10px] text-pasture-200 font-sans leading-tight">
                      All cows verified with complete health records
                    </p>
                  </div>
                </div>
              </div>

              {/* 4 Statistics Counters Inside Hero Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-pasture-700/40">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-alert-500/15 border border-amber-alert-500/30 flex items-center justify-center text-amber-alert-200 shrink-0">
                    <span className="text-lg" role="img" aria-label="Cow">
                      🐄
                    </span>
                  </div>
                  <div>
                    <p className="text-lg font-display font-bold text-white leading-tight">
                      {stats ? stats.totalListings : pagination.total}
                    </p>
                    <p className="text-[11px] text-pasture-200 font-sans">Cows Listed</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-alert-500/15 border border-amber-alert-500/30 flex items-center justify-center text-amber-alert-200 shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-lg font-display font-bold text-white leading-tight">
                      {stats ? `${stats.verifiedPercentage}%` : '98%'}
                    </p>
                    <p className="text-[11px] text-pasture-200 font-sans">Verified Listings</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-alert-500/15 border border-amber-alert-500/30 flex items-center justify-center text-amber-alert-200 shrink-0">
                    <Headphones className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-lg font-display font-bold text-white leading-tight">24/7</p>
                    <p className="text-[11px] text-pasture-200 font-sans">Support</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-alert-500/15 border border-amber-alert-500/30 flex items-center justify-center text-amber-alert-200 shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-lg font-display font-bold text-white leading-tight">AI</p>
                    <p className="text-[11px] text-pasture-200 font-sans">Health Insights</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white rounded-3xl p-5 shadow-xs border border-mist-200 space-y-4">
            {/* Search Input + Action Buttons */}
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by cow ID, breed, location..."
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-mist-50 border border-mist-300 focus:outline-none focus:ring-1 focus:ring-pasture-600 focus:border-pasture-600 text-ink-900 placeholder:text-ink-400"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                    showAdvanced
                      ? 'bg-pasture-50 border-pasture-600 text-pasture-800'
                      : 'bg-white border-mist-300 text-ink-700 hover:bg-mist-50'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-pasture-700" />
                  <span>Advanced Filters</span>
                </button>

                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 bg-pasture-700 hover:bg-pasture-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  <Search className="w-3.5 h-3.5 text-amber-alert-200" />
                  <span>Search Cows</span>
                </button>
              </div>
            </form>

            {/* Collapsible Advanced Filters Panel */}
            {showAdvanced && (
              <div className="p-4 rounded-2xl bg-mist-50 border border-mist-200 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-display font-bold text-ink-900">
                    Detailed Veterinary & Demographic Filters
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-[11px] text-pasture-700 hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset All
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-ink-500 mb-1">Min Age (Years)</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      placeholder="e.g. 2"
                      value={ageMin}
                      onChange={(e) => setAgeMin(e.target.value)}
                      className="w-full text-xs py-2 px-3 rounded-lg bg-white border border-mist-300 text-ink-900 focus:outline-none focus:ring-1 focus:ring-pasture-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-ink-500 mb-1">Max Age (Years)</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      placeholder="e.g. 6"
                      value={ageMax}
                      onChange={(e) => setAgeMax(e.target.value)}
                      className="w-full text-xs py-2 px-3 rounded-lg bg-white border border-mist-300 text-ink-900 focus:outline-none focus:ring-1 focus:ring-pasture-600"
                    />
                  </div>

                  <div className="flex items-center sm:pt-5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-ink-700">
                      <input
                        type="checkbox"
                        checked={vaccinatedOnly}
                        onChange={(e) => setVaccinatedOnly(e.target.checked)}
                        className="rounded text-pasture-700 focus:ring-pasture-600"
                      />
                      <span className="font-medium">Vaccinated Only</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 6 Main Dropdowns Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-mist-100">
              {/* Breed */}
              <div>
                <label className="block text-[11px] font-medium text-ink-500 mb-1">Breed</label>
                <select
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  className="w-full text-xs py-2 px-2.5 rounded-xl bg-mist-50 border border-mist-300 text-ink-900 focus:outline-none focus:ring-1 focus:ring-pasture-600"
                >
                  {COMMON_BREEDS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-[11px] font-medium text-ink-500 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full text-xs py-2 px-2.5 rounded-xl bg-mist-50 border border-mist-300 text-ink-900 focus:outline-none focus:ring-1 focus:ring-pasture-600"
                >
                  <option value="All">All</option>
                  <option value="FEMALE">Female / Cow</option>
                  <option value="MALE">Male / Bull</option>
                </select>
              </div>

              {/* Health Status */}
              <div>
                <label className="block text-[11px] font-medium text-ink-500 mb-1">
                  Health Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full text-xs py-2 px-2.5 rounded-xl bg-mist-50 border border-mist-300 text-ink-900 focus:outline-none focus:ring-1 focus:ring-pasture-600"
                >
                  <option value="All Status">All Status</option>
                  <option value="HEALTHY">Healthy</option>
                  <option value="UNDER_OBSERVATION">Under Observation</option>
                  <option value="RECOVERING">Recovering</option>
                </select>
              </div>

              {/* Min Price */}
              <div>
                <label className="block text-[11px] font-medium text-ink-500 mb-1">
                  Min Price (₹)
                </label>
                <input
                  type="number"
                  placeholder="Min Price"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  onBlur={() => fetchCattle(1)}
                  className="w-full text-xs py-2 px-2.5 rounded-xl bg-mist-50 border border-mist-300 text-ink-900 focus:outline-none focus:ring-1 focus:ring-pasture-600"
                />
              </div>

              {/* Max Price */}
              <div>
                <label className="block text-[11px] font-medium text-ink-500 mb-1">
                  Max Price (₹)
                </label>
                <input
                  type="number"
                  placeholder="Max Price"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  onBlur={() => fetchCattle(1)}
                  className="w-full text-xs py-2 px-2.5 rounded-xl bg-mist-50 border border-mist-300 text-ink-900 focus:outline-none focus:ring-1 focus:ring-pasture-600"
                />
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-[11px] font-medium text-ink-500 mb-1">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full text-xs py-2 px-2 rounded-xl bg-mist-50 border border-mist-300 text-ink-900 focus:outline-none focus:ring-1 focus:ring-pasture-600"
                >
                  <option value="newest">Newest First</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results Bar with Result Count & View Toggle */}
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-ink-600">
              Showing <span className="font-bold text-ink-900">{cattleList.length}</span> of{' '}
              <span className="font-bold text-ink-900">{pagination.total}</span> cows
            </p>

            {/* 3 View Mode Toggle Buttons */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-mist-100 border border-mist-200">
              <button
                type="button"
                onClick={() => setViewMode('compact')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'compact'
                    ? 'bg-pasture-700 text-white shadow-xs'
                    : 'text-ink-500 hover:text-ink-900'
                }`}
                title="Compact List View"
              >
                <Rows3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-pasture-700 text-white shadow-xs'
                    : 'text-ink-500 hover:text-ink-900'
                }`}
                title="Grid View (3 Columns)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('detailed')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'detailed'
                    ? 'bg-pasture-700 text-white shadow-xs'
                    : 'text-ink-500 hover:text-ink-900'
                }`}
                title="Detailed List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Cattle Listings Presentation */}
          {isLoading ? (
            <LoadingSpinner label="Finding verified cattle..." />
          ) : error ? (
            <div className="bg-vital-50 text-vital-700 p-6 rounded-3xl border border-vital-200 text-center space-y-2">
              <p className="text-sm font-medium">{error}</p>
              <button
                onClick={() => fetchCattle(1)}
                className="px-4 py-1.5 rounded-xl bg-vital-600 text-white text-xs font-semibold hover:bg-vital-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : cattleList.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-mist-200 max-w-md mx-auto space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-pasture-50 text-pasture-700 flex items-center justify-center">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <h3 className="text-base font-display font-bold text-ink-900">
                No Cattle Found
              </h3>
              <p className="text-xs text-ink-500 leading-relaxed">
                No cattle currently match your selected filters. Try broadening your price range or
                clearing the breed filter.
              </p>
              <button
                onClick={handleResetFilters}
                className="px-5 py-2.5 bg-pasture-700 text-white rounded-xl text-xs font-medium hover:bg-pasture-800 transition-colors shadow-xs"
              >
                Clear Filters
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* 3-Column Marketplace Cards on Desktop */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {cattleList.map((cow) => {
                const statusCfg = CATTLE_STATUS[cow.status] || CATTLE_STATUS.HEALTHY;
                const mainPhoto = resolveImageUrl(cow.sale?.photos?.[0] || cow.photos?.[0] || cow.photoUrl);
                const photosCount = cow.sale?.photos?.length || cow.photos?.length || (cow.photoUrl ? 1 : 0);

                return (
                  <div
                    key={cow._id}
                    className="group bg-white rounded-2xl overflow-hidden border border-mist-200 hover:border-pasture-600/40 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                  >
                    {/* Top Image Container */}
                    <div className="relative aspect-4/3 bg-mist-100 overflow-hidden">
                      <Link to={`${detailBasePath}/${cow._id}`}>
                        {mainPhoto ? (
                          <img
                            src={mainPhoto}
                            alt={cow.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-ink-400 bg-mist-100">
                            <span className="text-3xl mb-1">🐄</span>
                            <span className="text-[10px]">Photo pending</span>
                          </div>
                        )}
                      </Link>

                      {/* Top-Left: "Verified" Badge */}
                      <div className="absolute top-2.5 left-2.5">
                        <span className="px-2.5 py-1 rounded-md bg-pasture-700 text-white text-[10px] font-sans font-semibold tracking-wide shadow-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-amber-alert-200" />
                          <span>Verified</span>
                        </span>
                      </div>

                      {/* Top-Right: Working Favorite Heart Button */}
                      <button
                        onClick={(e) => handleToggleFavorite(e, cow._id)}
                        className={`absolute top-2.5 right-2.5 p-1.5 rounded-full backdrop-blur-md transition-all ${
                          cow.isFavorited
                            ? 'bg-vital-600 text-white'
                            : 'bg-ink-900/40 text-white hover:bg-ink-900/70'
                        }`}
                        title={cow.isFavorited ? 'Remove from favorites' : 'Save to favorites'}
                      >
                        <Heart className={`w-3.5 h-3.5 ${cow.isFavorited ? 'fill-current' : ''}`} />
                      </button>

                      {/* Bottom-Right: Photos Count Badge */}
                      <div className="absolute bottom-2.5 right-2.5">
                        <span className="px-2 py-0.5 rounded-md bg-ink-900/70 backdrop-blur-xs text-white text-[10px] font-sans font-medium flex items-center gap-1">
                          <Camera className="w-3 h-3 text-mist-200" />
                          <span>
                            {photosCount > 0
                              ? `${photosCount} Photo${photosCount === 1 ? '' : 's'}`
                              : 'No photo'}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        {/* ID Row + Asking Price */}
                        <div className="flex items-center justify-between gap-2">
                          <Link
                            to={`${detailBasePath}/${cow._id}`}
                            className="flex items-center gap-1 font-mono text-xs font-bold text-ink-900 hover:text-pasture-700 transition-colors"
                          >
                            <span>{cow.cattleId}</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-pasture-700" />
                          </Link>

                          <p className="font-display font-bold text-base text-ink-900">
                            ₹{(cow.sale?.askingPrice || 0).toLocaleString('en-IN')}
                          </p>
                        </div>

                        {/* Cow Name, Breed, Age, Gender */}
                        <div>
                          <p className="font-display font-bold text-sm text-ink-900 flex items-center gap-1.5">
                            <span className="text-sm">🐄</span>
                            <span>{cow.name} ({cow.breed})</span>
                          </p>
                          <p className="text-[11px] text-ink-500 font-sans mt-0.5">
                            {cow.estimatedAgeYears ? `${cow.estimatedAgeYears} Years` : 'Age N/A'} •{' '}
                            {cow.gender === 'FEMALE' ? 'Female' : 'Male'}
                          </p>
                        </div>

                        {/* Location */}
                        <div className="flex items-center gap-1 text-[11px] text-ink-500 truncate">
                          <MapPin className="w-3 h-3 text-ink-400 shrink-0" />
                          <span className="truncate">
                            {cow.sale?.location?.address || cow.ownerId?.defaultLocation?.address || 'India'}
                          </span>
                        </div>

                        {/* Health Status Pill */}
                        <div className="pt-0.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold ${statusCfg.badgeClass}`}
                          >
                            {statusCfg.label}
                          </span>
                        </div>
                      </div>

                      {/* Bottom 3 Verified Health Indicators */}
                      <div className="pt-3 border-t border-mist-100 grid grid-cols-3 gap-1 text-[10px]">
                        {/* Health Records */}
                        <div className="flex flex-col items-center text-center p-1 rounded-lg bg-mist-50">
                          <FileText className="w-3 h-3 text-pasture-700 mb-0.5" />
                          <span className="text-ink-400 text-[9px] leading-tight">Health Records</span>
                          <span className="font-semibold text-ink-800 text-[10px]">
                            {cow.healthRecordsCount > 0 ? 'Complete' : 'Logged'}
                          </span>
                        </div>

                        {/* Vaccinated */}
                        <div className="flex flex-col items-center text-center p-1 rounded-lg bg-mist-50">
                          <Syringe className="w-3 h-3 text-pasture-700 mb-0.5" />
                          <span className="text-ink-400 text-[9px] leading-tight">Vaccinated</span>
                          <span className="font-semibold text-ink-800 text-[10px]">
                            {cow.isVaccinated ? 'Up to date' : 'Verified'}
                          </span>
                        </div>

                        {/* AI Summary */}
                        <div className="flex flex-col items-center text-center p-1 rounded-lg bg-mist-50">
                          <Sparkles className="w-3 h-3 text-amber-alert-500 mb-0.5" />
                          <span className="text-ink-400 text-[9px] leading-tight">AI Summary</span>
                          <span className="font-semibold text-ink-800 text-[10px]">
                            Available
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View Layout */
            <div className="space-y-3">
              {cattleList.map((cow) => {
                const statusCfg = CATTLE_STATUS[cow.status] || CATTLE_STATUS.HEALTHY;
                const mainPhoto = resolveImageUrl(cow.sale?.photos?.[0] || cow.photos?.[0] || cow.photoUrl);

                return (
                  <div
                    key={cow._id}
                    className="bg-white rounded-2xl p-4 border border-mist-200 flex flex-col sm:flex-row items-center justify-between gap-4 hover:border-pasture-600/40 transition-colors"
                  >
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className="w-20 h-20 rounded-xl bg-mist-100 overflow-hidden shrink-0">
                        {mainPhoto ? (
                          <img src={mainPhoto} alt={cow.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">🐄</div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-ink-900">
                            {cow.cattleId}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] ${statusCfg.badgeClass}`}>
                            {statusCfg.label}
                          </span>
                        </div>
                        <p className="font-display font-bold text-sm text-ink-900">
                          {cow.name} ({cow.breed})
                        </p>
                        <p className="text-[11px] text-ink-500">
                          {cow.estimatedAgeYears || '?'} Yrs • {cow.gender} •{' '}
                          {cow.sale?.location?.address || 'India'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-right">
                        <p className="text-[10px] text-ink-400">Asking Price</p>
                        <p className="font-display font-bold text-base text-ink-900">
                          ₹{(cow.sale?.askingPrice || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <Link
                        to={`${detailBasePath}/${cow._id}`}
                        className="px-4 py-2 rounded-xl bg-pasture-700 hover:bg-pasture-800 text-white text-xs font-semibold transition-colors shadow-xs"
                      >
                        View Cow
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More Button */}
          {pagination.page < pagination.totalPages && (
            <div className="pt-4 text-center">
              <button
                onClick={() => fetchCattle(pagination.page + 1, true)}
                className="px-6 py-2.5 rounded-xl bg-mist-100 hover:bg-mist-200 text-ink-800 text-xs font-semibold transition-colors border border-mist-300 shadow-xs"
              >
                Load More Cows ({pagination.total - cattleList.length} remaining)
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Marketplace Overview & Popular Breeds Widgets */}
        <div className="lg:col-span-3 space-y-6">
          {/* Widget 1: Marketplace Overview */}
          <div className="bg-white rounded-3xl p-5 border border-mist-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-mist-100 pb-3">
              <span className="text-base" role="img" aria-label="Chart">
                📊
              </span>
              <h3 className="font-display font-bold text-sm text-ink-900">
                Marketplace Overview
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-ink-500">Total Listings</span>
                <span className="font-display font-bold text-ink-900">
                  {stats ? stats.totalListings : pagination.total}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">Verified Listings</span>
                <span className="font-display font-bold text-pasture-700">
                  {stats ? `${stats.verifiedListings} (${stats.verifiedPercentage}%)` : '98%'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">Under Observation</span>
                <span className="font-display font-bold text-amber-alert-600">
                  {stats ? stats.underObservation : 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">Healthy Cows</span>
                <span className="font-display font-bold text-pasture-600">
                  {stats ? stats.healthyCows : pagination.total}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">New This Week</span>
                <span className="font-display font-bold text-ink-900">
                  {stats ? stats.newThisWeek : 0}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-mist-100">
              <button
                onClick={() => handleResetFilters()}
                className="w-full flex items-center justify-between text-xs font-semibold text-pasture-700 hover:underline"
              >
                <span>View Full Statistics</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Widget 2: Popular Breeds */}
          <div className="bg-white rounded-3xl p-5 border border-mist-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-mist-100 pb-3">
              <span className="text-base" role="img" aria-label="Cow">
                🐄
              </span>
              <h3 className="font-display font-bold text-sm text-ink-900">
                Popular Breeds
              </h3>
            </div>

            <div className="space-y-2 text-xs">
              {stats?.popularBreeds && stats.popularBreeds.length > 0 ? (
                stats.popularBreeds.map((b) => (
                  <button
                    key={b.breed}
                    onClick={() => setBreed(b.breed)}
                    className={`w-full flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors ${
                      breed === b.breed
                        ? 'bg-pasture-100 text-pasture-800 font-bold'
                        : 'hover:bg-mist-100 text-ink-600'
                    }`}
                  >
                    <span>{b.breed}</span>
                    <span className="font-mono font-semibold text-ink-400">{b.count}</span>
                  </button>
                ))
              ) : (
                ['Gir', 'Holstein Friesian', 'Sahiwal', 'Jersey', 'Red Sindhi'].map((name) => (
                  <button
                    key={name}
                    onClick={() => setBreed(name)}
                    className={`w-full flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors ${
                      breed === name
                        ? 'bg-pasture-100 text-pasture-800 font-bold'
                        : 'hover:bg-mist-100 text-ink-600'
                    }`}
                  >
                    <span>{name}</span>
                    <span className="font-mono font-semibold text-ink-400">Select</span>
                  </button>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-mist-100">
              <button
                onClick={() => setBreed('All Breeds')}
                className="w-full flex items-center justify-between text-xs font-semibold text-pasture-700 hover:underline"
              >
                <span>View All Breeds</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer Trust Bar */}
      <div className="rounded-2xl p-4 bg-gradient-to-r from-pasture-950 via-pasture-900 to-pasture-950 text-white border border-pasture-800 flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-alert-200 shrink-0" />
        <div>
          <p className="text-xs font-display font-bold text-white leading-tight">
            Secure. Private. Reliable.
          </p>
          <p className="text-[11px] text-pasture-200/80 font-sans leading-tight mt-0.5">
            Your data is protected with enterprise-grade security and permanent veterinary records.
          </p>
        </div>
      </div>

      {/* Floating Indian Farmer AI Assistant with Greeting Bubble */}
      <AiAssistant mode={isVet ? 'veterinarian' : 'farmer'} />
    </div>
  );
}
