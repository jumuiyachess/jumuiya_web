'use client';

import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { Registration, Tournament } from '@/types';
import { Loader2, ShieldCheck, ShieldAlert, Award, Printer, Download, Trash2, Eye, School, User, Mail, Phone, X, Copy } from 'lucide-react';
import { calculateAge } from '@/lib/bulkRegistration';

export default function AdminRegistrations() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<Registration | null>(null);

  const getPlayerAge = (reg: Registration) => {
    if (reg.age && reg.age > 0) return reg.age;
    if (reg.date_of_birth) {
      const computed = calculateAge(reg.date_of_birth);
      if (computed > 0) return computed;
    }
    return '—';
  };

  // Filters State
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modal State
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'confirm' | 'alert' | 'error' | 'success';
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ isOpen: false, type: 'alert', title: '', message: '' });

  const closeModal = () => setModalState(prev => ({ ...prev, isOpen: false }));

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModalState({ isOpen: true, type: 'confirm', title, message, onConfirm });
  };

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'alert' = 'alert') => {
    setModalState({ isOpen: true, type, title, message });
  };

  const loadTournaments = async () => {
    const tourneyRes = await apiRequest<Tournament[]>('/tournaments').catch(() => ({ success: false, data: [] }));
    if (tourneyRes?.success && Array.isArray(tourneyRes.data)) {
      setTournaments(tourneyRes.data);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      let regEndpoint = '/registrations';
      const params = [];
      if (selectedTournamentId) params.push(`tournamentId=${selectedTournamentId}`);
      if (selectedStatus) params.push(`status=${selectedStatus}`);
      if (params.length > 0) regEndpoint += `?${params.join('&')}`;

      const regRes = await apiRequest<Registration[]>(regEndpoint).catch(() => ({ success: false, data: [] }));

      if (regRes?.success && Array.isArray(regRes.data)) {
        setRegistrations(regRes.data);
      } else {
        setRegistrations([]);
      }
    } catch (err) {
      console.error('[Registrations Admin] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTournaments(); }, []);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTournamentId, selectedStatus]);

  const handleClearRoster = async () => {
    const currentTourneyName = selectedTournamentId
      ? tournaments.find((t) => t.id === selectedTournamentId)?.name || 'this tournament'
      : 'ALL tournaments';

    showConfirm(
      'Clear Registrations',
      `⚠️ ARE YOU SURE YOU WANT TO CLEAR ALL REGISTRATIONS FOR ${currentTourneyName.toUpperCase()}?\n\nThis action cannot be undone.`,
      async () => {
        closeModal();
        setLoading(true);
        try {
          let endpoint = '/registrations/clear';
          if (selectedTournamentId) endpoint += `?tournamentId=${selectedTournamentId}`;
          const res = await apiRequest(endpoint, { method: 'DELETE' });
          if (res.success) {
            showAlert('Success', 'Registrations roster cleared successfully!', 'success');
            loadData();
          } else {
            showAlert('Error', res.error || 'Failed to clear roster.', 'error');
          }
        } catch (err) {
          console.error('Clear roster error:', err);
          showAlert('Error', 'Network error while clearing roster.', 'error');
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const toggleCheckIn = async (id: string, currentStatus: string, paymentStatus: string) => {
    if (currentStatus !== 'checked-in' && paymentStatus !== 'completed') {
      showAlert('Check-In Error', 'Cannot check in a registration without a completed payment.', 'error');
      return;
    }
    const newStatus = currentStatus === 'checked-in' ? 'registered' : 'checked-in';
    try {
      const res = await apiRequest(`/admin/registrations/${id}/checkin`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.success) {
        setRegistrations(registrations.map(r => r.id === id ? { ...r, attendance_status: newStatus as any } : r));
      } else {
        showAlert('Check-In Error', res.error || 'Failed to update attendance status.', 'error');
      }
    } catch (err) {
      showAlert('Check-In Error', 'Network error while updating check-in.', 'error');
    }
  };

  const exportCsv = () => {
    const headers = [
      'Player Name',
      'School / Club',
      'Tournament',
      'Category',
      'Age',
      'Date of Birth',
      'Gender',
      'FIDE ID',
      'Country',
      'Patron / Guardian',
      'Phone',
      'Email',
      'Amount (KES)',
      'Status',
      'M-Pesa Receipt',
      'Ticket Number',
      'Attendance',
      'Registered Date'
    ];
    const rows = registrations.map((r) => [
      `"${r.player_name}"`,
      `"${r.school || 'Individual'}"`,
      `"${Array.isArray(r.tournaments) ? r.tournaments[0]?.name : (typeof r.tournaments === 'object' && r.tournaments ? r.tournaments.name : 'Tournament')}"`,
      `"${r.category}"`,
      getPlayerAge(r),
      `"${r.date_of_birth || ''}"`,
      `"${r.gender || ''}"`,
      `"${r.fide_id || '00'}"`,
      `"${r.country || 'Kenya'}"`,
      `"${r.accompanying_person || ''}"`,
      `"${r.phone_number}"`,
      `"${r.email || ''}"`,
      r.amount,
      r.payment_status,
      `"${r.mpesa_receipt || ''}"`,
      `"${r.ticket_number || ''}"`,
      r.attendance_status || 'registered',
      `"${r.created_at ? new Date(r.created_at).toLocaleString() : ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tournament_roster_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center text-[10px] font-bold text-[#6B4A34] bg-[#6B4A34]/10 px-2 py-0.5 rounded border border-[#6B4A34]/20">
            <ShieldCheck className="h-3 w-3 mr-1 text-[#6B4A34]" />
            <span>Completed</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center text-[10px] font-bold text-red-900 bg-red-900/10 px-2 py-0.5 rounded border border-red-900/20">
            <ShieldAlert className="h-3 w-3 mr-1 text-red-900" />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center text-[10px] font-bold text-amber-900 bg-amber-900/10 px-2 py-0.5 rounded border border-amber-900/20">
            <span>Pending</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto print:block">
      {/* Custom UI Modal */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 print:hidden">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl transform transition-all border border-[#6B4A34]/20">
            <h3 className={`font-serif text-xl font-bold mb-3 ${
              modalState.type === 'error' ? 'text-red-900' :
              modalState.type === 'success' ? 'text-emerald-700' :
              'text-[#232320]'
            }`}>
              {modalState.title}
            </h3>
            <p className="font-sans text-sm text-[#232320]/70 mb-8 whitespace-pre-wrap">
              {modalState.message}
            </p>
            <div className="flex justify-end space-x-3">
              {modalState.type === 'confirm' && (
                <button
                  onClick={closeModal}
                  className="px-4 py-2 bg-[#FAF7F2] text-[#232320] text-xs font-bold rounded-lg border border-[#6B4A34]/20 hover:bg-[#6B4A34]/10 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => {
                  if (modalState.type === 'confirm' && modalState.onConfirm) {
                    modalState.onConfirm();
                  } else {
                    closeModal();
                  }
                }}
                className={`px-4 py-2 text-white text-xs font-bold rounded-lg transition-colors ${
                  modalState.type === 'error' || modalState.type === 'confirm'
                    ? 'bg-red-900 hover:bg-red-800'
                    : 'bg-[#232320] hover:bg-[#6B4A34]'
                }`}
              >
                {modalState.type === 'confirm' ? 'Confirm' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE PDF ROSTER CONTAINER (Only visible during print/PDF saving) */}
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          html, body, #__next, main, .print\\:block {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            display: block !important;
            position: static !important;
          }
        }
      `}</style>
      <div id="printable-roster" className="hidden print:block w-full bg-white text-black font-sans">
        {/* Professional Header */}
        <div className="border-b-[3px] border-[#6B4A34] pb-4 mb-6 px-3 flex justify-between items-start break-inside-avoid">
          <div className="flex items-center gap-4">
            <img src="/images/chess_logo.png" alt="Logo" className="w-16 h-16 object-contain" />
            <div>
              <h1 className="font-serif text-3xl font-black text-[#232320]">JUMUIYA CHESS INITIATIVE</h1>
              <p className="font-mono text-[11px] font-bold text-[#6B4A34] uppercase tracking-[0.2em] mt-1">
                Official Event Roster & Check-In Sheet
                {selectedStatus ? <span className="block mt-0.5 text-rose-800">({selectedStatus.toUpperCase()} PAYMENTS ONLY)</span> : ''}
              </p>
            </div>
          </div>
          <div className="text-right flex flex-col justify-between h-full">
            <div>
              <p className="font-bold text-[#232320] text-xl uppercase tracking-tight">
                {selectedTournamentId ? tournaments.find(t => t.id === selectedTournamentId)?.name : 'All Events'}
              </p>
              <p className="text-stone-500 font-mono text-[10px] uppercase mt-0.5">Total Players: {registrations.length}</p>
            </div>
            <p className="text-stone-400 font-mono text-[9px] mt-2">Printed: {new Date().toLocaleString()}</p>
          </div>
        </div>

        {/* Roster Table */}
        <table className="w-full text-left border-collapse text-[10px] font-sans">
          <thead>
            <tr className="bg-[#6B4A34] text-white uppercase tracking-wider text-[9px]">
              <th className="py-2 px-2 font-bold rounded-tl-sm w-7">#</th>
              <th className="py-2 px-2.5 font-bold w-[25%]">Player & School</th>
              <th className="py-2 px-2 font-bold w-[16%]">Category</th>
              <th className="py-2 px-2 font-bold w-[16%]">Age & DOB</th>
              <th className="py-2 px-2 font-bold w-[15%]">FIDE & Origin</th>
              <th className="py-2 px-2 font-bold w-[18%]">Payment & Contact</th>
              <th className="py-2 px-2 font-bold text-center rounded-tr-sm w-10">Check-In</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 border-b border-stone-300">
            {registrations.map((reg, index) => (
              <tr key={reg.id} className="even:bg-stone-50 transition-colors">
                <td className="py-2 px-2 font-mono text-stone-500 text-[10px] align-middle">{index + 1}</td>
                <td className="py-2 px-2.5 align-middle">
                  <span className="block font-bold text-[11px] text-[#232320] uppercase">{reg.player_name}</span>
                  {reg.school && (
                    <span className="block text-[9px] text-[#6B4A34] font-semibold">{reg.school}</span>
                  )}
                  {reg.ticket_number && (
                    <span className="block font-mono text-[8px] text-stone-400 font-normal">TK: {reg.ticket_number}</span>
                  )}
                </td>
                <td className="py-2 px-2 font-bold text-[#6B4A34] align-middle text-[9px] leading-tight">
                  {reg.category}
                </td>
                <td className="py-2 px-2 text-stone-700 align-middle">
                  <span className="block font-semibold">Age: {getPlayerAge(reg)} • {reg.gender || '—'}</span>
                  {reg.date_of_birth && (
                    <span className="block font-mono text-[8px] text-stone-500">DOB: {reg.date_of_birth}</span>
                  )}
                </td>
                <td className="py-2 px-2 font-mono text-stone-700 align-middle">
                  <span className="block font-bold text-[10px]">{reg.fide_id || '00'}</span>
                  <span className="block text-[8px] uppercase font-sans tracking-wider text-stone-500">{reg.country || 'KENYA'}</span>
                  {reg.accompanying_person && (
                    <span className="block text-[8px] text-stone-500 font-sans italic truncate max-w-[100px]" title={reg.accompanying_person}>
                      P: {reg.accompanying_person}
                    </span>
                  )}
                </td>
                <td className="py-2 px-2 align-middle">
                  <span className={`font-bold text-[10px] ${reg.payment_status === 'completed' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {reg.payment_status === 'completed' ? 'PAID' : reg.payment_status.toUpperCase()}
                  </span>
                  <span className="text-stone-600 font-mono text-[9px] ml-1">
                    {reg.amount === 0 ? 'FREE' : `KES ${reg.amount}`}
                  </span>
                  {reg.mpesa_receipt && (
                    <span className="block font-mono text-[8px] text-stone-500">{reg.mpesa_receipt}</span>
                  )}
                  <span className="block font-mono text-[8px] text-stone-500">{reg.phone_number}</span>
                </td>
                <td className="py-2 px-2 text-center align-middle">
                  <div className="w-5 h-5 border-[1.5px] border-[#6B4A34] rounded-sm mx-auto flex items-center justify-center bg-white shadow-inner">
                    {reg.attendance_status === 'checked-in' && <span className="text-[#6B4A34] font-black text-sm block leading-none -mt-0.5">✓</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Professional Footer */}
        <div className="mt-8 text-center text-[10px] text-stone-500 font-sans border-t border-stone-200 pt-4 pb-4 break-inside-avoid">
          <p className="font-bold uppercase tracking-widest text-[#232320] mb-1">End of Official Roster</p>
          <p>Jumuiya Chess Initiative • Printed by Admin Console</p>
        </div>
      </div>

      {/* Main Admin UI Screen */}
      <div className="space-y-6 print:hidden">
        {/* Brown Banner Card */}
        <div className="bg-[#6B4A34] text-white p-6 md:p-8 rounded-2xl shadow-md border border-[#573b29] relative overflow-hidden space-y-2">
          <h1 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-white">
            Event Registrations
          </h1>
          <p className="text-xs md:text-sm text-[#FAF7F2]/90 leading-relaxed font-sans max-w-3xl">
            Monitor tournament player registrations and payments in real-time.
          </p>
        </div>

        {/* Tournament-Isolated Tabs & Actions Toolbar */}
        <div className="bg-white border border-[#6B4A34]/20 p-5 rounded-2xl space-y-4 shadow-sm">
          {/* Tournament Selector Pills */}
          <div className="flex flex-wrap gap-2 items-center pb-3 border-b border-[#6B4A34]/10">
            <span className="text-[10px] font-bold text-[#6B4A34] uppercase tracking-wider mr-2">Filter by Event:</span>
            <button
              onClick={() => setSelectedTournamentId('')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                selectedTournamentId === ''
                  ? 'bg-[#6B4A34] text-white shadow-xs'
                  : 'bg-[#FAF7F2] text-[#232320] border border-[#6B4A34]/20 hover:bg-[#6B4A34]/10'
              }`}
            >
              All Events
            </button>
            {tournaments.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTournamentId(t.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  selectedTournamentId === t.id
                    ? 'bg-[#6B4A34] text-white shadow-xs'
                    : 'bg-[#FAF7F2] text-[#232320] border border-[#6B4A34]/20 hover:bg-[#6B4A34]/10'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex items-center space-x-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-[#FAF7F2] border border-[#6B4A34]/20 p-2 rounded-xl text-xs text-[#232320] font-bold focus:outline-none focus:ring-1 focus:ring-[#6B4A34]"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
              <button
                onClick={() => window.print()}
                className="flex-1 sm:flex-none px-4 py-2 bg-[#FAF7F2] hover:bg-[#6B4A34] hover:text-white text-[#232320] font-sans text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 border border-[#6B4A34]/20 hover:border-[#6B4A34] shadow-sm active:scale-95 group"
              >
                <Printer className="w-3.5 h-3.5 text-[#6B4A34] group-hover:text-white transition-colors" />
                <span>Print Roster (PDF)</span>
              </button>

              <button
                onClick={exportCsv}
                className="flex-1 sm:flex-none px-4 py-2 bg-[#FAF7F2] hover:bg-[#6B4A34] hover:text-white text-[#232320] font-sans text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 border border-[#6B4A34]/20 hover:border-[#6B4A34] shadow-sm active:scale-95 group"
              >
                <Download className="w-3.5 h-3.5 text-[#6B4A34] group-hover:text-white transition-colors" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={handleClearRoster}
                className="flex-1 sm:flex-none px-4 py-2 bg-red-900/10 hover:bg-[#232320] hover:text-white text-red-900 font-sans text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 border border-red-900/20 hover:border-[#232320] shadow-sm active:scale-95 group"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-900 group-hover:text-white transition-colors" />
                <span>Clear Roster</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Table Card */}
        <div className="bg-white border border-[#6B4A34]/20 p-6 rounded-2xl shadow-sm overflow-x-auto">
          <div className="flex items-center justify-between border-b border-[#6B4A34]/10 pb-4 mb-4">
            <h2 className="font-serif text-base font-bold text-[#232320]">
              Event Roster ({registrations.length})
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#6B4A34]" />
            </div>
          ) : registrations.length === 0 ? (
            <div className="text-center py-16 text-[#232320]/50 text-xs font-sans bg-[#FAF7F2] border border-[#6B4A34]/10 rounded-xl">
              No registrations found.
            </div>
          ) : (
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="border-b border-[#6B4A34]/10 text-[#6B4A34] font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-3">Player Name</th>
                  <th className="pb-3">Tournament</th>
                  <th className="pb-3">Age/Gender</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">FIDE / Country</th>
                  <th className="pb-3">Ticket</th>
                  <th className="pb-3">Phone</th>
                  <th className="pb-3">Payment</th>
                  <th className="pb-3 text-center">Attendance</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#6B4A34]/10">
                {registrations.map((reg) => (
                  <tr key={reg.id} className="text-[#232320] hover:bg-[#FAF7F2] transition-colors">
                    <td className="py-3.5">
                      <button
                        onClick={() => setSelectedPlayer(reg)}
                        className="text-left group/name font-bold hover:text-[#6B4A34] transition-colors block max-w-[200px]"
                      >
                        <span className="block text-xs font-bold text-[#232320] group-hover/name:text-[#6B4A34]">{reg.player_name}</span>
                        {reg.school ? (
                          <span className="inline-flex items-center space-x-1 text-[10px] text-stone-500 font-normal mt-0.5" title={reg.school}>
                            <School className="w-3 h-3 text-[#6B4A34]/70 shrink-0" />
                            <span className="truncate max-w-[150px]">{reg.school}</span>
                          </span>
                        ) : (
                          <span className="block text-[10px] text-stone-400 font-normal">Individual</span>
                        )}
                      </button>
                    </td>
                    <td className="py-3.5 text-[#232320]/70">
                      {Array.isArray(reg.tournaments)
                        ? reg.tournaments[0]?.name
                        : (typeof reg.tournaments === 'object' && reg.tournaments !== null ? reg.tournaments.name : 'Tournament')}
                    </td>
                    <td className="py-3.5">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-[#232320]/70">Age: {getPlayerAge(reg)}</span>
                        <span className="text-[10px] text-[#232320]/70">{reg.gender || '—'}</span>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <span className="inline-flex w-fit items-center text-[10px] bg-[#FAF7F2] text-[#6B4A34] px-2 py-0.5 rounded font-bold border border-[#6B4A34]/20">
                        <Award className="h-3 w-3 mr-1 text-[#6B4A34]" />
                        {reg.category}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-mono font-bold">{reg.fide_id || '00'}</span>
                        <span className="text-[10px] text-[#232320]/70">{reg.country || 'Kenya'}</span>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <span className="font-mono text-xs font-bold text-[#6B4A34] bg-[#FAF7F2] px-2 py-1 rounded border border-[#6B4A34]/20">
                        {reg.ticket_number || '—'}
                      </span>
                    </td>
                    <td className="py-3.5 text-[#232320]/70">{reg.phone_number}</td>
                    <td className="py-3.5">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-[#6B4A34]">KES {reg.amount}</span>
                        {getStatusBadge(reg.payment_status)}
                        <span className="font-mono text-[10px] text-[#232320]/70 truncate max-w-[100px]">{reg.mpesa_receipt || '—'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-center">
                      <button 
                        onClick={() => toggleCheckIn(reg.id, reg.attendance_status || 'registered', reg.payment_status)}
                        disabled={reg.payment_status !== 'completed' && reg.attendance_status !== 'checked-in'}
                        title={reg.payment_status !== 'completed' && reg.attendance_status !== 'checked-in' ? "Payment must be completed to check in" : ""}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-colors ${
                          reg.attendance_status === 'checked-in'
                            ? 'bg-green-100 text-green-800 border border-green-300'
                            : reg.payment_status !== 'completed'
                              ? 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed opacity-70'
                              : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-[#6B4A34] hover:text-white'
                        }`}
                      >
                        {reg.attendance_status === 'checked-in' ? 'Checked In ✓' : 'Check In'}
                      </button>
                    </td>
                    <td className="py-3.5 text-[10px] text-[#232320]/50">
                      {reg.created_at ? new Date(reg.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => setSelectedPlayer(reg)}
                          className="inline-flex items-center justify-center p-2 bg-[#FAF7F2] text-[#6B4A34] hover:bg-[#6B4A34] hover:text-white rounded-lg transition-colors border border-[#6B4A34]/20 shadow-xs"
                          title="View Player Dossier"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {reg.ticket_number && (
                          <a 
                            href={`/tickets/${reg.ticket_number}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center p-2 bg-[#FAF7F2] text-stone-600 hover:bg-stone-800 hover:text-white rounded-lg transition-colors border border-stone-200 shadow-xs"
                            title="View/Print Ticket"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* PLAYER DOSSIER FULL DETAILS MODAL */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-2xl w-full overflow-hidden my-8">
            {/* Header */}
            <div className="bg-[#FAF7F2] border-b border-[#6B4A34]/15 p-5 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B4A34] bg-[#6B4A34]/10 px-2 py-0.5 rounded">
                    Player Dossier
                  </span>
                  {selectedPlayer.ticket_number && (
                    <span className="font-mono text-[11px] font-bold text-stone-600">
                      TK: {selectedPlayer.ticket_number}
                    </span>
                  )}
                </div>
                <h3 className="font-serif text-xl font-bold text-[#232320]">{selectedPlayer.player_name}</h3>
              </div>
              <button
                onClick={() => setSelectedPlayer(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-[#232320] hover:bg-stone-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Content */}
            <div className="p-6 space-y-5 text-xs font-sans max-h-[75vh] overflow-y-auto">
              {/* Key Badges */}
              <div className="flex flex-wrap gap-2 items-center justify-between p-3.5 bg-[#FAF7F2]/70 rounded-xl border border-stone-200/70">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-stone-600">Payment:</span>
                  {getStatusBadge(selectedPlayer.payment_status)}
                  <span className="font-mono font-bold text-[#232320]">
                    {selectedPlayer.amount === 0 ? 'FREE (KES 0)' : `KES ${Number(selectedPlayer.amount).toLocaleString()}`}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-stone-600">Attendance:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedPlayer.attendance_status === 'checked-in' ? 'bg-green-100 text-green-800' : 'bg-stone-100 text-stone-600'
                  }`}>
                    {selectedPlayer.attendance_status === 'checked-in' ? 'Checked In ✓' : 'Registered (Not checked in)'}
                  </span>
                </div>
              </div>

              {/* Grid of details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 1: Player & Category */}
                <div className="border border-stone-200 rounded-xl p-4 space-y-2.5 bg-white shadow-xs">
                  <div className="flex items-center space-x-1.5 text-stone-900 font-bold border-b border-stone-100 pb-2">
                    <User className="w-4 h-4 text-[#6B4A34]" />
                    <span>Competitor Profile</span>
                  </div>
                  <div className="space-y-1.5 text-stone-600">
                    <div className="flex justify-between">
                      <span>Category / Section:</span>
                      <span className="font-bold text-[#6B4A34] text-right">{selectedPlayer.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Calculated Age:</span>
                      <span className="font-bold text-[#232320]">{getPlayerAge(selectedPlayer)} years</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Date of Birth:</span>
                      <span className="font-mono font-medium text-[#232320]">{selectedPlayer.date_of_birth || 'Not recorded'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gender:</span>
                      <span className="font-medium text-[#232320]">{selectedPlayer.gender || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>FIDE ID:</span>
                      <span className="font-mono font-bold text-[#232320]">{selectedPlayer.fide_id || '00'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Country:</span>
                      <span className="font-medium text-[#232320]">{selectedPlayer.country || 'Kenya'}</span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Delegation & Safeguarding */}
                <div className="border border-stone-200 rounded-xl p-4 space-y-2.5 bg-white shadow-xs">
                  <div className="flex items-center space-x-1.5 text-stone-900 font-bold border-b border-stone-100 pb-2">
                    <School className="w-4 h-4 text-[#6B4A34]" />
                    <span>Delegation & Guardian</span>
                  </div>
                  <div className="space-y-1.5 text-stone-600">
                    <div className="flex justify-between">
                      <span>School / Club:</span>
                      <span className="font-bold text-[#232320] text-right">{selectedPlayer.school || 'Individual Entry'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Accompanying / Patron:</span>
                      <span className="font-medium text-[#232320] text-right">{selectedPlayer.accompanying_person || 'Direct / Self'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Parental & Rules Consent:</span>
                      <span className="font-bold text-emerald-700">
                        {selectedPlayer.consent_given ? 'Verified ✓' : 'Not recorded'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tournament Event:</span>
                      <span className="font-medium text-[#232320] text-right">
                        {Array.isArray(selectedPlayer.tournaments)
                          ? selectedPlayer.tournaments[0]?.name
                          : (selectedPlayer.tournaments?.name || 'Tournament')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card 3: Contact Coordinates */}
                <div className="border border-stone-200 rounded-xl p-4 space-y-2.5 bg-white shadow-xs">
                  <div className="flex items-center space-x-1.5 text-stone-900 font-bold border-b border-stone-100 pb-2">
                    <Phone className="w-4 h-4 text-[#6B4A34]" />
                    <span>Contact Coordinates</span>
                  </div>
                  <div className="space-y-2 text-stone-600">
                    <div>
                      <span className="text-[10px] text-stone-400 uppercase font-bold block">Phone Number</span>
                      <div className="flex items-center justify-between mt-0.5">
                        <a href={`tel:${selectedPlayer.phone_number}`} className="font-mono font-bold text-[#6B4A34] hover:underline">
                          {selectedPlayer.phone_number}
                        </a>
                        <button 
                          onClick={() => navigator.clipboard.writeText(selectedPlayer.phone_number)}
                          className="p-1 text-stone-400 hover:text-stone-700 rounded"
                          title="Copy Phone"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 uppercase font-bold block">Email Address</span>
                      <div className="flex items-center justify-between mt-0.5">
                        <a href={`mailto:${selectedPlayer.email}`} className="font-mono text-[#232320] hover:underline truncate max-w-[200px]">
                          {selectedPlayer.email || '—'}
                        </a>
                        {selectedPlayer.email && (
                          <button 
                            onClick={() => navigator.clipboard.writeText(selectedPlayer.email || '')}
                            className="p-1 text-stone-400 hover:text-stone-700 rounded"
                            title="Copy Email"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 4: Financial & Audit Trail */}
                <div className="border border-stone-200 rounded-xl p-4 space-y-2.5 bg-white shadow-xs">
                  <div className="flex items-center space-x-1.5 text-stone-900 font-bold border-b border-stone-100 pb-2">
                    <ShieldCheck className="w-4 h-4 text-[#6B4A34]" />
                    <span>Financial Audit Trail</span>
                  </div>
                  <div className="space-y-1.5 text-stone-600">
                    <div className="flex justify-between">
                      <span>M-Pesa Receipt:</span>
                      <span className="font-mono font-bold text-[#232320]">{selectedPlayer.mpesa_receipt || 'None / Free'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Checkout Request ID:</span>
                      <span className="font-mono text-[10px] text-stone-500 truncate max-w-[150px]" title={selectedPlayer.checkout_request_id || ''}>
                        {selectedPlayer.checkout_request_id || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Registration Date:</span>
                      <span className="text-[11px] text-[#232320]">
                        {selectedPlayer.created_at ? new Date(selectedPlayer.created_at).toLocaleString() : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-[#FAF7F2] border-t border-[#6B4A34]/15 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    toggleCheckIn(selectedPlayer.id, selectedPlayer.attendance_status || 'registered', selectedPlayer.payment_status);
                    setSelectedPlayer(prev => prev ? ({
                      ...prev,
                      attendance_status: prev.attendance_status === 'checked-in' ? 'registered' : 'checked-in'
                    }) : null);
                  }}
                  disabled={selectedPlayer.payment_status !== 'completed' && selectedPlayer.attendance_status !== 'checked-in'}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                    selectedPlayer.attendance_status === 'checked-in'
                      ? 'bg-green-100 text-green-900 border border-green-300 hover:bg-green-200'
                      : selectedPlayer.payment_status !== 'completed'
                        ? 'bg-stone-200 text-stone-400 cursor-not-allowed opacity-60'
                        : 'bg-[#6B4A34] text-white hover:bg-[#573b29]'
                  }`}
                >
                  {selectedPlayer.attendance_status === 'checked-in' ? 'Revoke Check-In' : 'Check In Player ✓'}
                </button>

                {selectedPlayer.ticket_number && (
                  <a
                    href={`/tickets/${selectedPlayer.ticket_number}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-bold shadow-xs transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#6B4A34]" />
                    <span>Print Ticket Pass</span>
                  </a>
                )}
              </div>

              <button
                onClick={() => setSelectedPlayer(null)}
                className="px-4 py-1.5 rounded-lg bg-[#232320] hover:bg-stone-800 text-white text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
