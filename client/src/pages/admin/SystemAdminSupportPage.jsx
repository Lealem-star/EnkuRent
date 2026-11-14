import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import { fmtDate } from '../../utils/formatters';
import {
  Headphones,
  Plus,
  Search,
  RefreshCw,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  Lock,
} from 'lucide-react';

export const SystemAdminSupportPage = () => {
  const { toast } = useToast();
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Selected Ticket Conversation
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);

  const fetchTickets = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.get(`/support?status=${filter}&search=${encodeURIComponent(search)}`);
      if (res.data?.success) {
        setTickets(res.data.data);
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, search, toast]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleSelectTicket = async (ticket) => {
    setLoadingConversation(true);
    try {
      const res = await api.get(`/support/${ticket.id}`);
      if (res.data?.success) {
        setSelectedTicket(res.data.data);
      }
    } catch (err) {
      toast('Failed to load ticket conversation');
    } finally {
      setLoadingConversation(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicket) return;
    setSubmittingReply(true);
    try {
      const res = await api.post(`/support/${selectedTicket.id}/reply`, {
        message: replyMessage.trim(),
        isInternal,
      });
      if (res.data?.success) {
        setReplyMessage('');
        setIsInternal(false);
        // Refresh conversation
        const refreshed = await api.get(`/support/${selectedTicket.id}`);
        if (refreshed.data?.success) {
          setSelectedTicket(refreshed.data.data);
        }
        fetchTickets();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to send reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      const res = await api.patch(`/support/${ticketId}/status`, { status: newStatus });
      if (res.data?.success) {
        toast(`Ticket status updated to ${newStatus}`);
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket({ ...selectedTicket, status: newStatus });
        }
        fetchTickets();
      }
    } catch (err) {
      toast('Failed to update status');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '19px', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
            Customer Support Desk & Ticket Resolution
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--ink-soft)' }}>
            Handle customer service requests, technical escalations, and landlord inquiries
          </p>
        </div>

        <button
          onClick={() => fetchTickets(true)}
          disabled={refreshing}
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
          <span>{refreshing ? 'Updating...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['ALL', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`btn btn-sm ${filter === st ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px' }}
            >
              {st === 'ALL'
                ? 'All Tickets'
                : st === 'WAITING_FOR_CUSTOMER'
                ? 'Awaiting Customer'
                : st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--ink-soft)' }} />
          <input
            type="text"
            className="input"
            placeholder="Search tickets by # or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '32px', fontSize: '13px', height: '36px' }}
          />
        </div>
      </div>

      {/* Split View: Tickets List vs Active Conversation */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedTicket ? '400px 1fr' : '1fr', gap: '20px' }}>
        {/* Ticket List Table/Cards */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-soft)' }}>
              <RefreshCw className="spin" size={24} style={{ margin: '0 auto 8px', color: 'var(--gold)' }} />
              <div>Loading tickets...</div>
            </div>
          ) : tickets.length === 0 ? (
            <div style={{ padding: '50px 0', textAlign: 'center', color: 'var(--ink-soft)' }}>
              <Headphones size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
              <div style={{ fontWeight: 600 }}>No support tickets found</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {tickets.map((t) => {
                const isSelected = selectedTicket?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTicket(t)}
                    style={{
                      padding: '14px 18px',
                      borderBottom: '1px solid var(--line)',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--paper)' : 'transparent',
                      borderLeft: isSelected ? '4px solid var(--gold)' : '4px solid transparent',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold-hover)', fontFamily: 'var(--font-num)' }}>
                        {t.ticketNumber}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background:
                            t.priority === 'URGENT'
                              ? 'var(--red-soft)'
                              : t.priority === 'HIGH'
                              ? 'var(--amber-soft)'
                              : 'var(--paper)',
                          color:
                            t.priority === 'URGENT'
                              ? 'var(--red)'
                              : t.priority === 'HIGH'
                              ? '#b45309'
                              : 'var(--ink-soft)',
                          border: '1px solid var(--line)',
                        }}
                      >
                        {t.priority}
                      </span>
                    </div>

                    <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--ink)', margin: '4px 0 2px' }}>
                      {t.subject}
                    </div>

                    <div style={{ fontSize: '11.5px', color: 'var(--ink-soft)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>From: {t.user?.companyName || t.user?.name}</span>
                      <span>{fmtDate(t.createdAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Ticket Conversation Panel */}
        {selectedTicket && (
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '650px' }}>
            {/* Header */}
            <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: '14px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-num)', color: 'var(--gold-hover)' }}>
                      {selectedTicket.ticketNumber}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>• {selectedTicket.category}</span>
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)', margin: '4px 0 0' }}>
                    {selectedTicket.subject}
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--ink-soft)', marginTop: '2px' }}>
                    Requested by <strong>{selectedTicket.user?.name}</strong> ({selectedTicket.user?.email} • {selectedTicket.user?.phone || '—'})
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <select
                    className="input"
                    value={selectedTicket.status}
                    onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value)}
                    style={{ fontSize: '12px', height: '32px' }}
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="WAITING_FOR_CUSTOMER">WAITING_FOR_CUSTOMER</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Messages Thread */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                paddingRight: '6px',
                marginBottom: '14px',
              }}
            >
              {loadingConversation ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--ink-soft)' }}>
                  <RefreshCw className="spin" size={20} style={{ margin: '0 auto 6px', color: 'var(--gold)' }} />
                  <div>Loading message history...</div>
                </div>
              ) : (
                selectedTicket.messages?.map((msg) => {
                  const isStaff = msg.sender?.role === 'SUPER_ADMIN';
                  return (
                    <div
                      key={msg.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        background: msg.isInternal
                          ? '#fef3c7'
                          : isStaff
                          ? 'var(--blue-soft)'
                          : 'var(--paper)',
                        border: msg.isInternal ? '1px dashed #f59e0b' : '1px solid var(--line)',
                        alignSelf: isStaff ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                        fontSize: '13px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '11.5px' }}>
                          {msg.sender?.name} {isStaff ? '(Support Admin)' : ''}
                          {msg.isInternal && ' [INTERNAL NOTE]'}
                        </span>
                        <span style={{ fontSize: '10.5px', color: 'var(--ink-soft)' }}>
                          {fmtDate(msg.createdAt)}
                        </span>
                      </div>
                      <div style={{ color: 'var(--ink)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                        {msg.message}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Reply Composer Form */}
            <form onSubmit={handleSendReply} style={{ borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', cursor: 'pointer', color: 'var(--ink-soft)' }}>
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                  />
                  <span>Post as Internal Note (Customer won't see this)</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <textarea
                  rows={2}
                  className="input"
                  placeholder={isInternal ? 'Type internal staff note...' : 'Type message reply to client...'}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  style={{ flex: 1, fontSize: '13px' }}
                />
                <button
                  type="submit"
                  disabled={submittingReply || !replyMessage.trim()}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-end', height: '42px' }}
                >
                  <Send size={15} />
                  <span>{submittingReply ? 'Sending...' : 'Send'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemAdminSupportPage;
