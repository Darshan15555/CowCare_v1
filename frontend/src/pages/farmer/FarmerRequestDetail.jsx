import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/errorMessage';
import { celebrate } from '../../utils/celebrate';
import { requestApi } from '../../api/requestApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PriorityBadge from '../../components/common/PriorityBadge';
import StatusBadge from '../../components/common/StatusBadge';
import StarRating from '../../components/common/StarRating';
import { STATUS_FLOW, STATUS } from '../../utils/constants';

export default function FarmerRequestDetail() {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [vetRating, setVetRating] = useState(null);
  const [pendingStars, setPendingStars] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  const load = () => {
    requestApi
      .getById(id)
      .then((res) => {
        setRequest(res.data.request);
        const vetId = res.data.request.veterinarianId?._id;
        if (vetId) {
          requestApi.getVetRating(vetId).then((r) => setVetRating(r.data));
        }
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(load, [id]);

  const handleSubmitRating = async () => {
    if (!pendingStars) {
      toast.error('Please select a star rating.');
      return;
    }
    setIsSubmittingRating(true);
    try {
      await requestApi.submitRating(id, { stars: pendingStars, comment: ratingComment });
      toast.success('Thanks for the feedback!');
      celebrate();
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not submit rating.'));
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this veterinary request?')) return;
    setIsCancelling(true);
    try {
      await requestApi.updateStatus(id, { status: 'CANCELLED', cancellationReason: 'Cancelled by farmer.' });
      toast.success('Request cancelled.');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not cancel.'));
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) return <LoadingSpinner label="Loading request..." />;
  if (!request) return <p className="text-sm text-ink-500">Request not found.</p>;

  const canCancel = ['REQUESTED', 'ACCEPTED'].includes(request.status);
  const currentStepIndex = STATUS_FLOW.indexOf(request.status);
  const isTerminalNegative = ['REJECTED', 'CANCELLED'].includes(request.status);

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-xl font-medium text-ink-900">
            {request.cattleId?.name || request.cattleNameSnapshot}
          </h1>
          <p className="font-data text-sm text-ink-500">{request.cattleId?.cattleId || request.cattleIdSnapshot}</p>
        </div>
        <PriorityBadge priority={request.priority} />
      </div>

      {/* Status progress */}
      <div className="rounded-xl border border-mist-200 bg-white p-4 shadow-sm">
        {isTerminalNegative ? (
          <StatusBadge status={request.status} />
        ) : (
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {STATUS_FLOW.map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                    i <= currentStepIndex ? 'bg-pasture-600 text-white' : 'bg-mist-100 text-ink-400'
                  }`}
                >
                  {i + 1}
                </div>
                {i < STATUS_FLOW.length - 1 && (
                  <div className={`h-0.5 w-5 ${i < currentStepIndex ? 'bg-pasture-500' : 'bg-mist-200'}`} />
                )}
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-sm font-medium text-ink-700">
          {STATUS[request.status]?.label || request.status}
        </p>
        {request.rejectionReason && (
          <p className="mt-1 text-xs text-vital-500">Reason: {request.rejectionReason}</p>
        )}
      </div>

      {/* No vets were reachable when this was created */}
      {request.status === 'REQUESTED' && request.notifiedVeterinarianCount === 0 && (
        <div className="flex items-start gap-3 rounded-xl bg-amber-alert-50 p-4">
          <span className="text-lg">⚠️</span>
          <p className="text-sm text-amber-alert-700">
            No veterinarians were on duty when you submitted this. It&apos;s saved and waiting —
            you&apos;ll be notified the moment one comes online and accepts it.
          </p>
        </div>
      )}

      {/* Problem details */}
      <div className="rounded-xl border border-mist-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-ink-900">Problem Reported</h2>
        <p className="text-sm text-ink-600">{request.problemDescription}</p>
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
        <p className="mt-3 text-xs text-ink-400">
          Preferred: {new Date(request.preferredDate).toLocaleDateString()} at {request.preferredTime}
        </p>
        <p className="text-xs text-ink-400">📍 {request.location?.address || 'Location shared'}</p>
      </div>

      {/* Veterinarian info */}
      {request.veterinarianId && (
        <div className="rounded-xl border border-mist-200 bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-ink-900">Veterinarian</h2>
          <p className="text-sm text-ink-700">Dr. {request.veterinarianId.name}</p>
          <p className="text-xs text-ink-500">{request.veterinarianId.specialization}</p>
          {vetRating?.totalRatings > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              <StarRating value={Math.round(vetRating.averageStars)} size={14} />
              <span className="text-xs text-ink-500">
                {vetRating.averageStars} ({vetRating.totalRatings} visit{vetRating.totalRatings === 1 ? '' : 's'})
              </span>
            </div>
          )}
        </div>
      )}

      {/* Post-visit rating */}
      {request.status === 'COMPLETED' &&
        (request.rating?.stars ? (
          <div className="rounded-xl border border-mist-200 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-ink-900">Your Rating</h2>
            <StarRating value={request.rating.stars} />
            {request.rating.comment && <p className="mt-2 text-sm text-ink-600">{request.rating.comment}</p>}
          </div>
        ) : (
          <div className="rounded-xl border border-mist-200 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-ink-900">How was this visit?</h2>
            <StarRating value={pendingStars} onChange={setPendingStars} size={26} />
            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Optional comment about the visit"
              className="input mt-3 min-h-[70px]"
            />
            <button
              onClick={handleSubmitRating}
              disabled={isSubmittingRating}
              className="mt-3 w-full btn-pop py-2.5 text-sm disabled:opacity-60"
            >
              {isSubmittingRating ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        ))}

      {canCancel && (
        <button
          onClick={handleCancel}
          disabled={isCancelling}
          className="w-full rounded-lg border border-vital-300 py-2.5 text-sm font-medium text-vital-600 hover:bg-vital-50 disabled:opacity-60"
        >
          {isCancelling ? 'Cancelling...' : 'Cancel Request'}
        </button>
      )}

      {isTerminalNegative && (
        <Link
          to="/farmer/book"
          className="block w-full rounded-lg bg-pasture-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-pasture-700"
        >
          Book Another Visit
        </Link>
      )}
    </div>
  );
}
