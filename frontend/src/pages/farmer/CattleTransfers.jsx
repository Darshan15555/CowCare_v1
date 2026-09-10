import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowRightLeft, Check, X, Ban, Clock, History, AlertCircle, Phone, Sparkles } from 'lucide-react';
import { cattleApi } from '../../api/cattleApi';
import { getErrorMessage } from '../../utils/errorMessage';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const STATUS_LABEL = {
  PENDING: { label: 'Pending', className: 'bg-amber-alert-100 text-amber-alert-800 border border-amber-alert-300' },
  ACCEPTED: { label: 'Accepted', className: 'bg-pasture-100 text-pasture-800 border border-pasture-300' },
  REJECTED: { label: 'Declined', className: 'bg-vital-100 text-vital-800 border border-vital-300' },
  CANCELLED: { label: 'Cancelled', className: 'bg-mist-200 text-ink-600 border border-mist-300' },
};

export default function CattleTransfers() {
  const { user } = useAuth();
  const { socket, latestNotification } = useSocket();
  const [transfers, setTransfers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history'

  const load = () => {
    cattleApi
      .getMyTransfers()
      .then((res) => setTransfers(res.data.transfers || []))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  // Real-time synchronization via Socket.IO
  useEffect(() => {
    if (!socket) return;
    const handleSync = () => {
      load();
    };
    socket.on('transfer_update', handleSync);
    return () => {
      socket.off('transfer_update', handleSync);
    };
  }, [socket]);

  // Also reload if a notification arrives
  useEffect(() => {
    if (latestNotification) {
      load();
    }
  }, [latestNotification]);

  const handleRespond = async (transferId, action) => {
    setActingId(transferId);
    try {
      await cattleApi.respondToTransfer(transferId, action);
      const verb = { ACCEPT: 'accepted! Cow ownership transferred', REJECT: 'declined', CANCEL: 'cancelled' }[action];
      toast.success(`Transfer ${verb}.`);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update the transfer.'));
    } finally {
      setActingId(null);
    }
  };

  if (isLoading) return <LoadingSpinner label="Loading transfers..." />;

  // Helper: Is this transfer a buyer request?
  const isBuyerTransfer = (t) => {
    return t.requestType === 'BUYER_REQUEST' || (t.initiatedBy && String(t.initiatedBy._id || t.initiatedBy) === String(t.toOwnerId?._id));
  };

  // Helper: Does the current logged-in user need to take action (Accept / Reject)?
  const isActionNeededByMe = (t) => {
    if (t.status !== 'PENDING') return false;
    const isBuyerReq = isBuyerTransfer(t);
    // For buyer request, the seller (fromOwnerId) must decide (Accept / Reject)
    if (isBuyerReq) {
      return String(t.fromOwnerId?._id || t.fromOwnerId) === String(user._id);
    }
    // For direct transfer, the recipient (toOwnerId) must decide
    return String(t.toOwnerId?._id || t.toOwnerId) === String(user._id);
  };

  // Helper: Did the current user initiate this request and is waiting for the other party?
  const isWaitingForOther = (t) => {
    if (t.status !== 'PENDING') return false;
    return !isActionNeededByMe(t);
  };

  const actionNeededTransfers = transfers.filter(isActionNeededByMe);
  const waitingTransfers = transfers.filter(isWaitingForOther);
  const activeCount = actionNeededTransfers.length + waitingTransfers.length;
  const historyTransfers = transfers.filter((t) => t.status !== 'PENDING');

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-mist-200">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Cattle Ownership Transfers</h1>
          <p className="text-xs text-ink-500 mt-0.5">
            Manage incoming purchase deals, transfer cattle to buyers, and track request status.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-mist-100 p-1 rounded-xl border border-mist-200 shrink-0">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'active'
                ? 'bg-white text-ink-900 shadow-xs'
                : 'text-ink-500 hover:text-ink-900'
            }`}
          >
            <Clock size={14} />
            <span>Active Deals</span>
            {activeCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-pasture-600 text-white text-[10px]">
                {activeCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-white text-ink-900 shadow-xs'
                : 'text-ink-500 hover:text-ink-900'
            }`}
          >
            <History size={14} />
            <span>Past History</span>
            <span className="text-ink-400 text-[10px]">({historyTransfers.length})</span>
          </button>
        </div>
      </div>

      {/* ── ACTIVE TAB ── */}
      {activeTab === 'active' && (
        <div className="space-y-6">
          {/* Section 1: Action Required (Decision needed from this user) */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-amber-alert-500 animate-pulse" />
              <h2 className="text-sm font-bold text-ink-900 uppercase tracking-wide">
                Action Required ({actionNeededTransfers.length})
              </h2>
            </div>

            {actionNeededTransfers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-mist-300 bg-white p-6 text-center text-xs text-ink-400">
                No transfer requests requiring your decision right now.
              </div>
            ) : (
              <div className="space-y-4">
                {actionNeededTransfers.map((t) => {
                  const isBuyerReq = isBuyerTransfer(t);
                  const requester = isBuyerReq ? t.toOwnerId : t.fromOwnerId;

                  return (
                    <div
                      key={t._id}
                      className="rounded-2xl border-2 border-pasture-500 bg-gradient-to-br from-pasture-50/60 via-white to-amber-alert-50/40 p-5 shadow-sm space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-alert-100 text-amber-alert-900 text-xs font-bold">
                            <Sparkles size={13} className="text-amber-alert-700" />
                            <span>{isBuyerReq ? 'Buyer Ownership Request' : 'Direct Cow Transfer'}</span>
                          </div>

                          <p className="text-base font-bold text-ink-900 pt-1">
                            {t.cattleNameSnapshot} · <span className="font-data text-xs text-ink-500 font-normal">{t.cattleIdSnapshot}</span>
                          </p>

                          <p className="text-xs text-ink-600">
                            {isBuyerReq ? (
                              <>
                                <span className="font-semibold text-ink-900">{requester?.name || 'Buyer'}</span> wants to take ownership of this cow after your offline deal.
                              </>
                            ) : (
                              <>
                                <span className="font-semibold text-ink-900">{requester?.name || 'Farmer'}</span> wants to transfer this cow to you.
                              </>
                            )}
                          </p>

                          {requester?.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-pasture-800 pt-1">
                              <Phone size={13} />
                              <span>Phone:</span>
                              <a href={`tel:${requester.phone}`} className="font-bold underline font-data">
                                {requester.phone}
                              </a>
                            </div>
                          )}
                        </div>

                        <StatusPill status={t.status} />
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 border-t border-mist-200 flex flex-col sm:flex-row gap-2.5">
                        <button
                          onClick={() => {
                            const confirmMsg = isBuyerReq
                              ? `Accept ownership request from ${requester?.name || 'buyer'}?\n\n${t.cattleNameSnapshot} will immediately transfer to their account and the listing will be marked SOLD.`
                              : `Accept transfer of ${t.cattleNameSnapshot}?\n\nYou will become the official owner.`;
                            if (window.confirm(confirmMsg)) {
                              handleRespond(t._id, 'ACCEPT');
                            }
                          }}
                          disabled={actingId === t._id}
                          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-pasture-600 hover:bg-pasture-700 py-3 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60"
                        >
                          <Check size={18} />
                          <span>{actingId === t._id ? 'Processing...' : 'Accept & Transfer Cow'}</span>
                        </button>

                        <button
                          onClick={() => {
                            const confirmMsg = isBuyerReq
                              ? `Decline ownership request from ${requester?.name || 'buyer'}?\n\nThe cow will remain open for sale to other buyers.`
                              : `Decline transfer of ${t.cattleNameSnapshot}?`;
                            if (window.confirm(confirmMsg)) {
                              handleRespond(t._id, 'REJECT');
                            }
                          }}
                          disabled={actingId === t._id}
                          className="sm:w-36 inline-flex items-center justify-center gap-2 rounded-xl border border-vital-300 bg-white hover:bg-vital-50 py-3 text-sm font-bold text-vital-600 shadow-xs transition-all disabled:opacity-60"
                        >
                          <X size={18} />
                          <span>Decline</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Section 2: Waiting for Other Party */}
          <section className="space-y-3 pt-4">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-mist-400" />
              <h2 className="text-sm font-bold text-ink-900 uppercase tracking-wide">
                Waiting for Other Farmer ({waitingTransfers.length})
              </h2>
            </div>

            {waitingTransfers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-mist-300 bg-white p-6 text-center text-xs text-ink-400">
                You have no pending outgoing requests.
              </div>
            ) : (
              <div className="space-y-3">
                {waitingTransfers.map((t) => {
                  const isBuyerReq = isBuyerTransfer(t);
                  const targetParty = isBuyerReq ? t.fromOwnerId : t.toOwnerId;

                  return (
                    <div
                      key={t._id}
                      className="rounded-2xl border border-mist-200 bg-white p-4 shadow-xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-bold text-ink-900">
                              {t.cattleNameSnapshot} · <span className="font-data text-xs text-ink-500 font-normal">{t.cattleIdSnapshot}</span>
                            </p>
                            <span className="rounded-full bg-mist-100 px-2.5 py-0.5 text-[11px] font-bold text-ink-600">
                              {isBuyerReq ? 'Your Ownership Request' : 'Direct Transfer Sent'}
                            </span>
                          </div>

                          <p className="text-xs text-ink-500">
                            {isBuyerReq ? (
                              <>
                                Waiting for seller <span className="font-semibold text-ink-800">{targetParty?.name || 'Seller'}</span> to accept.
                                {targetParty?.phone && <> Phone: <span className="font-data font-semibold">{targetParty.phone}</span></>}
                              </>
                            ) : (
                              <>
                                Sent to <span className="font-semibold text-ink-800">{targetParty?.name || 'Farmer'}</span>.
                                {targetParty?.phone && <> Phone: <span className="font-data font-semibold">{targetParty.phone}</span></>}
                              </>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <StatusPill status={t.status} />
                          <button
                            onClick={() => {
                              if (window.confirm('Cancel this transfer request?')) {
                                handleRespond(t._id, 'CANCEL');
                              }
                            }}
                            disabled={actingId === t._id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-mist-300 hover:bg-mist-100 text-ink-600 text-xs font-semibold disabled:opacity-60 transition-colors"
                          >
                            <Ban size={14} />
                            <span>Cancel Request</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {activeTab === 'history' && (
        <section className="space-y-3">
          {historyTransfers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-mist-300 bg-white p-8 text-center text-xs text-ink-400">
              <ArrowRightLeft className="mx-auto mb-2 text-mist-300" size={24} />
              No past transfer history yet.
            </div>
          ) : (
            <div className="space-y-3">
              {historyTransfers.map((t) => {
                const isBuyerReq = isBuyerTransfer(t);
                const isFromMe = String(t.fromOwnerId?._id || t.fromOwnerId) === String(user._id);
                const otherParty = isFromMe ? t.toOwnerId : t.fromOwnerId;

                return (
                  <div key={t._id} className="rounded-xl border border-mist-200 bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-bold text-ink-900">
                            {t.cattleNameSnapshot} · <span className="font-data text-xs text-ink-500 font-normal">{t.cattleIdSnapshot}</span>
                          </p>
                          <span className="text-[10px] text-ink-400">
                            {new Date(t.updatedAt || t.createdAt).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-ink-500">
                          {isFromMe ? `Transferred/Sent to: ${otherParty?.name || 'Farmer'}` : `Received from: ${otherParty?.name || 'Farmer'}`}
                          {otherParty?.phone && ` (${otherParty.phone})`}
                        </p>
                      </div>
                      <StatusPill status={t.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const config = STATUS_LABEL[status] || STATUS_LABEL.PENDING;
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${config.className}`}>
      {config.label}
    </span>
  );
}

