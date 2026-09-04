import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/errorMessage';
import { celebrate } from '../../utils/celebrate';
import { Navigation, History, PlusCircle, Trash2, FlaskConical } from 'lucide-react';
import { requestApi } from '../../api/requestApi';
import { medicalApi } from '../../api/medicalApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PriorityBadge from '../../components/common/PriorityBadge';
import StatusBadge from '../../components/common/StatusBadge';
import AiAssistant from '../../components/common/AiAssistant';

const NEXT_STATUS_ACTION = {
  ON_THE_WAY: { next: 'ARRIVED', label: 'Mark Arrived' },
  ARRIVED: { next: 'IN_PROGRESS', label: 'Start Examination' },
};

const emptyMedicine = () => ({ name: '', dosage: '', frequency: '', duration: '', route: '', instructions: '' });

export default function VetRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Autosave the clinical form to localStorage as the vet types - this is
  // often a long form filled out standing in a field, and losing it to an
  // accidental reload or navigation would mean re-doing a real exam's notes
  // from memory. Only text fields are drafted (not photos, which can't be
  // serialized) - that's the part that's actually tedious to retype.
  const draftKey = `cowcare-draft-visit-${id}`;
  const loadDraft = () => {
    try {
      const raw = localStorage.getItem(draftKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const savedDraft = loadDraft();

  // Clinical workflow form state (only relevant once IN_PROGRESS)
  const [clinicalForm, setClinicalForm] = useState(
    savedDraft?.clinicalForm || {
      observedSymptoms: '',
      physicalFindings: '',
      temperatureC: '',
      heartRateBpm: '',
      respirationRate: '',
      examinationNotes: '',
      clinicalAssessment: '',
      treatmentPerformed: '',
      followUpDate: '',
      additionalNotes: '',
    }
  );
  const [medicines, setMedicines] = useState(savedDraft?.medicines || [emptyMedicine()]);
  const [examPhotos, setExamPhotos] = useState([]);
  const [isCompleting, setIsCompleting] = useState(false);

  // Persist on every change so a reload/accidental navigation doesn't lose
  // the vet's work-in-progress notes.
  useEffect(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify({ clinicalForm, medicines }));
    } catch {
      // localStorage unavailable (private browsing, quota) - draft
      // protection is a nice-to-have, not worth failing the page over.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicalForm, medicines]);

  useEffect(() => {
    if (savedDraft) {
      toast('Restored your unsaved exam notes from before.', { icon: '📝' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = () => {
    requestApi
      .getById(id)
      .then((res) => setRequest(res.data.request))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, [id]);

  const handleTransition = async (nextStatus, extra = {}) => {
    setIsActing(true);
    try {
      await requestApi.updateStatus(id, { status: nextStatus, ...extra });
      toast.success(`Status updated to ${nextStatus.replace('_', ' ')}.`);
      load();
      setShowRejectForm(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update status.'));
      if (err.response?.status === 409) {
        load(); // someone else already acted on this request — show the real state
      }
    } finally {
      setIsActing(false);
    }
  };

  const openNavigationAndDepart = async () => {
    const { lat, lng } = request.location || {};
    if (!lat || !lng) {
      toast.error('No location coordinates available for this request.');
      return;
    }
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    // Starting navigation IS the "on the way" moment — no reason to make
    // the vet tap a second button to say what they just did.
    await handleTransition('ON_THE_WAY');
  };

  const updateMedicine = (index, field, value) => {
    setMedicines((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  };

  const handleCompleteVisit = async (e) => {
    e.preventDefault();
    if (!clinicalForm.clinicalAssessment || !clinicalForm.treatmentPerformed) {
      toast.error('Clinical assessment and treatment performed are required.');
      return;
    }
    setIsCompleting(true);
    try {
      const formData = new FormData();
      formData.append('observedSymptoms', clinicalForm.observedSymptoms);
      formData.append('physicalFindings', clinicalForm.physicalFindings);
      formData.append(
        'vitals',
        JSON.stringify({
          temperatureC: clinicalForm.temperatureC || undefined,
          heartRateBpm: clinicalForm.heartRateBpm || undefined,
          respirationRate: clinicalForm.respirationRate || undefined,
        })
      );
      formData.append('examinationNotes', clinicalForm.examinationNotes);
      formData.append('clinicalAssessment', clinicalForm.clinicalAssessment);
      formData.append('treatmentPerformed', clinicalForm.treatmentPerformed);
      formData.append('medicines', JSON.stringify(medicines.filter((m) => m.name.trim())));
      formData.append('followUpDate', clinicalForm.followUpDate);
      formData.append('additionalNotes', clinicalForm.additionalNotes);
      examPhotos.forEach((file) => formData.append('examPhotos', file));

      await medicalApi.completeVisit(id, formData);
      toast.success('Visit completed and recorded to the health timeline.');
      celebrate();
      localStorage.removeItem(draftKey);
      navigate('/vet');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not complete the visit.'));
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoading) return <LoadingSpinner label="Loading request..." />;
  if (!request) return <p className="text-sm text-ink-500">Request not found.</p>;

  const action = NEXT_STATUS_ACTION[request.status];
  const cattleObjectId = request.cattleId?._id || request.cattleId;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-xl font-medium text-ink-900">
            {request.cattleId?.name || request.cattleNameSnapshot}
          </h1>
          <p className="font-data text-sm text-ink-500">{request.cattleId?.cattleId || request.cattleIdSnapshot}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <PriorityBadge priority={request.priority} />
          <StatusBadge status={request.status} />
        </div>
      </div>

      {request.escalatedAt && request.status === 'REQUESTED' && (
        <div className="flex items-center gap-2 rounded-lg bg-vital-50 p-3 text-sm font-medium text-vital-700">
          ⚠️ This emergency has been waiting a while and was re-escalated — please respond if you can.
        </div>
      )}

      {/* Farmer-reported info (read-only, kept visually separate) */}
      <div className="rounded-xl border-l-4 border-mist-300 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Farmer-Reported Problem</h2>
        <p className="text-sm text-ink-700">{request.problemDescription}</p>
        {request.voiceNoteUrl && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-serum-50 p-2.5">
            <span className="text-base">🎙️</span>
            <audio controls src={request.voiceNoteUrl} className="h-9 flex-1" />
          </div>
        )}
        {request.attachments?.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {request.attachments.map((url) => (
              <img key={url} src={url} alt="attachment" className="h-20 w-20 rounded-lg object-cover" />
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-ink-400">Farmer: {request.farmerId?.name} · {request.farmerId?.phone}</p>
        <p className="text-xs text-ink-400">
          Preferred: {new Date(request.preferredDate).toLocaleDateString()} at {request.preferredTime}
        </p>
        <p className="text-xs text-ink-400">📍 {request.location?.address || 'See map'}</p>
      </div>

      <Link
        to={cattleObjectId ? `/vet/cattle/${cattleObjectId}?requestId=${request._id}` : '#'}
        className="flex items-center justify-center gap-2 rounded-xl border border-mist-300 py-3 text-sm font-semibold text-ink-700 hover:bg-mist-100 transition-colors shadow-xs"
      >
        <History size={17} /> View Complete Cattle Medical History
      </Link>

      {/* Action buttons based on current status */}
      {request.status === 'REQUESTED' && (
        <div className="space-y-3 pt-1">
          <button
            onClick={() => handleTransition('ACCEPTED')}
            disabled={isActing}
            className="w-full py-3.5 px-4 rounded-xl bg-pasture-700 hover:bg-pasture-800 text-white font-bold text-sm shadow-md transition-all hover:scale-101 disabled:opacity-60"
          >
            Accept Patient Request
          </button>
          {!showRejectForm ? (
            <button
              onClick={() => setShowRejectForm(true)}
              className="w-full rounded-xl border border-vital-300 py-2.5 text-sm font-semibold text-vital-600 hover:bg-vital-50 transition-colors"
            >
              Decline / Reject Case
            </button>
          ) : (
            <div className="space-y-3 rounded-2xl border border-vital-200 bg-vital-50 p-4">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Clinical reason for declining this request..."
                className="w-full p-3 rounded-xl border border-vital-300 text-xs bg-white text-ink-800 focus:outline-none focus:ring-1 focus:ring-vital-500"
                rows={3}
              />
              <button
                onClick={() => handleTransition('REJECTED', { rejectionReason })}
                disabled={isActing}
                className="w-full rounded-xl bg-vital-600 py-2.5 text-sm font-bold text-white hover:bg-vital-700 shadow-xs disabled:opacity-60"
              >
                Confirm Decline
              </button>
            </div>
          )}
        </div>
      )}

      {request.status === 'ACCEPTED' && (
        <div className="space-y-3 pt-1">
          <button
            onClick={openNavigationAndDepart}
            disabled={isActing}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-serum-700 hover:bg-serum-800 py-3.5 text-sm font-bold text-white shadow-md hover:scale-101 transition-all disabled:opacity-60"
          >
            <Navigation size={18} /> Open Navigation & Depart (On The Way)
          </button>
          <button
            onClick={() => handleTransition('ON_THE_WAY')}
            disabled={isActing}
            className="w-full py-2 text-center text-xs font-semibold text-ink-500 hover:text-ink-800 disabled:opacity-60"
          >
            Already en route — Mark as On The Way
          </button>
        </div>
      )}

      {action && (
        <button
          onClick={() => handleTransition(action.next)}
          disabled={isActing}
          className="w-full py-3.5 px-4 rounded-xl bg-pasture-700 hover:bg-pasture-800 text-white font-bold text-sm shadow-md transition-all hover:scale-101 disabled:opacity-60"
        >
          {isActing ? 'Updating status...' : action.label}
        </button>
      )}

      {/* Clinical workflow - only during active examination */}
      {request.status === 'IN_PROGRESS' && (
        <form onSubmit={handleCompleteVisit} className="space-y-4 rounded-xl border border-mist-200 bg-white p-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900"><span className="h-3 w-1 rounded-full bg-mist-300" />Current Examination</h2>
          <FormField label="Observed symptoms">
            <textarea
              value={clinicalForm.observedSymptoms}
              onChange={(e) => setClinicalForm({ ...clinicalForm, observedSymptoms: e.target.value })}
              className="input"
            />
          </FormField>
          <FormField label="Physical findings">
            <textarea
              value={clinicalForm.physicalFindings}
              onChange={(e) => setClinicalForm({ ...clinicalForm, physicalFindings: e.target.value })}
              className="input"
            />
          </FormField>
          <div className="grid grid-cols-3 gap-2">
            <FormField label="Temp (°C)">
              <input
                type="number"
                step="0.1"
                value={clinicalForm.temperatureC}
                onChange={(e) => setClinicalForm({ ...clinicalForm, temperatureC: e.target.value })}
                className="input"
              />
            </FormField>
            <FormField label="Heart rate (bpm)">
              <input
                type="number"
                value={clinicalForm.heartRateBpm}
                onChange={(e) => setClinicalForm({ ...clinicalForm, heartRateBpm: e.target.value })}
                className="input"
              />
            </FormField>
            <FormField label="Resp. rate">
              <input
                type="number"
                value={clinicalForm.respirationRate}
                onChange={(e) => setClinicalForm({ ...clinicalForm, respirationRate: e.target.value })}
                className="input"
              />
            </FormField>
          </div>
          <FormField label="Examination notes">
            <textarea
              value={clinicalForm.examinationNotes}
              onChange={(e) => setClinicalForm({ ...clinicalForm, examinationNotes: e.target.value })}
              className="input"
            />
          </FormField>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-mist-300 p-3 text-sm text-ink-500">
            Attach examination photos
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setExamPhotos(Array.from(e.target.files || []).slice(0, 5))}
              className="hidden"
            />
          </label>

          <hr className="border-mist-100" />

          <h2 className="flex items-center gap-2 text-sm font-semibold text-serum-700"><span className="h-3 w-1 rounded-full bg-serum-500" />Clinical Assessment</h2>
          <FormField label="Diagnosis / clinical decision" required>
            <textarea
              required
              value={clinicalForm.clinicalAssessment}
              onChange={(e) => setClinicalForm({ ...clinicalForm, clinicalAssessment: e.target.value })}
              className="input"
            />
          </FormField>

          <hr className="border-mist-100" />

          <h2 className="flex items-center gap-2 text-sm font-semibold text-hide-700"><span className="h-3 w-1 rounded-full bg-hide-500" />Treatment</h2>
          <FormField label="Treatment performed" required>
            <textarea
              required
              value={clinicalForm.treatmentPerformed}
              onChange={(e) => setClinicalForm({ ...clinicalForm, treatmentPerformed: e.target.value })}
              className="input"
            />
          </FormField>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-medium text-ink-700">
                <FlaskConical size={15} className="text-serum-600" /> Medicines
              </span>
              <button
                type="button"
                onClick={() => setMedicines([...medicines, emptyMedicine()])}
                className="flex items-center gap-1 text-xs font-medium text-pasture-700"
              >
                <PlusCircle size={14} /> Add medicine
              </button>
            </div>
            {medicines.map((med, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-serum-100 bg-serum-50/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-data text-xs font-medium text-serum-700">Rx {String(i + 1).padStart(2, '0')}</span>
                  {medicines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setMedicines(medicines.filter((_, idx) => idx !== i))}
                      className="rounded p-1.5 text-vital-500 hover:bg-vital-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <input
                  placeholder="Name"
                  value={med.name}
                  onChange={(e) => updateMedicine(i, 'name', e.target.value)}
                  className="input bg-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="Dosage"
                    value={med.dosage}
                    onChange={(e) => updateMedicine(i, 'dosage', e.target.value)}
                    className="input bg-white font-data"
                  />
                  <input
                    placeholder="Frequency"
                    value={med.frequency}
                    onChange={(e) => updateMedicine(i, 'frequency', e.target.value)}
                    className="input bg-white font-data"
                  />
                  <input
                    placeholder="Duration"
                    value={med.duration}
                    onChange={(e) => updateMedicine(i, 'duration', e.target.value)}
                    className="input bg-white font-data"
                  />
                  <input
                    placeholder="Route"
                    value={med.route}
                    onChange={(e) => updateMedicine(i, 'route', e.target.value)}
                    className="input bg-white"
                  />
                </div>
                <input
                  placeholder="Instructions"
                  value={med.instructions}
                  onChange={(e) => updateMedicine(i, 'instructions', e.target.value)}
                  className="input"
                />
              </div>
            ))}
          </div>

          <FormField label="Follow-up date">
            <input
              type="date"
              value={clinicalForm.followUpDate}
              onChange={(e) => setClinicalForm({ ...clinicalForm, followUpDate: e.target.value })}
              className="input"
            />
          </FormField>
          <FormField label="Additional notes">
            <textarea
              value={clinicalForm.additionalNotes}
              onChange={(e) => setClinicalForm({ ...clinicalForm, additionalNotes: e.target.value })}
              className="input"
            />
          </FormField>

          <button
            type="submit"
            disabled={isCompleting}
            className="w-full py-3.5 px-4 rounded-xl bg-pasture-700 hover:bg-pasture-800 text-white font-bold text-sm shadow-md transition-all hover:scale-101 disabled:opacity-60"
          >
            {isCompleting ? 'Saving Clinical Exam & Vitals...' : 'Complete Visit & Save to Health Timeline'}
          </button>
        </form>
      )}

      {/* Clinical AI Co-Pilot with Cattle Context */}
      <AiAssistant
        mode="veterinarian"
        cattleId={cattleObjectId}
        cattleName={request.cattleId?.name || request.cattleNameSnapshot}
        requestId={id}
      />
    </div>
  );
}

function FormField({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink-700">
        {label} {required && <span className="text-vital-500">*</span>}
      </span>
      {children}
    </label>
  );
}
