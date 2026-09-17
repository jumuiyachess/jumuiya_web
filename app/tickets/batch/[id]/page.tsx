'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { 
  Loader2, 
  ArrowLeft, 
  Download, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  MapPin, 
  Trophy, 
  School, 
  User, 
  FileText,
  ExternalLink 
} from 'lucide-react';

interface BatchStudent {
  id: string;
  playerName: string;
  firstName: string;
  lastName: string;
  gender: string;
  dob: string;
  age: number;
  category: string;
  fideId: string;
  ticketNumber: string;
  amount: number;
  paymentStatus: string;
}

interface BatchData {
  batchId: string;
  schoolName: string;
  patronName: string;
  coordinatorEmail: string;
  coordinatorPhone: string;
  mpesaReceipt: string;
  paymentStatus: string;
  createdAt: string;
  tournament: {
    id: string;
    name: string;
    eventDate: string;
    venue: string;
  };
  totalAmount: number;
  studentsCount: number;
  students: BatchStudent[];
}

export default function BatchTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<BatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function fetchBatchData() {
      try {
        const res = await apiRequest<BatchData>(`/registrations/batch/${id}`);
        if (res.success && res.data) {
          setData(res.data);
        } else {
          setError('School group roster not found or invalid.');
        }
      } catch (err: any) {
        setError('Network error loading group roster.');
      } finally {
        setLoading(false);
      }
    }
    fetchBatchData();
  }, [id]);

  const downloadPDF = async () => {
    if (!data) return;
    setDownloading(true);

    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const element = document.getElementById('printable-roster');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const safeSchool = data.schoolName.replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`Jumuiya_Roster_${safeSchool}.pdf`);
    } catch (err) {
      console.error('Error generating roster PDF:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#6B4A34]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-6 space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <h1 className="text-2xl font-serif font-bold text-[#232320]">{error || 'Roster Not Found'}</h1>
        <p className="text-xs text-stone-500 max-w-md text-center">
          We could not locate this group registration reference. If you just completed an M-Pesa transaction, please allow a moment for confirmation.
        </p>
        <Link href="/" className="text-xs font-bold text-[#6B4A34] hover:underline bg-white px-5 py-2.5 rounded-full shadow-sm border border-stone-200">
          Return to Homepage
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] py-8 px-4 flex flex-col items-center print:bg-white print:py-0 print:px-0">
      
      {/* Top Navigation & Actions (Hidden on Print) */}
      <div className="max-w-4xl w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 print:hidden">
        <Link 
          href={`/tournaments/${data.tournament.id}`} 
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#6B4A34] hover:text-[#232320] bg-white px-4 py-2 rounded-full shadow-sm border border-[#6B4A34]/10 w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Tournament</span>
        </Link>

        <div className="flex items-center space-x-3 self-end sm:self-auto">
          <button
            onClick={handlePrint}
            type="button"
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 font-sans text-xs font-bold text-[#232320] transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4 text-[#6B4A34]" />
            <span>Print Pass</span>
          </button>

          <button
            onClick={downloadPDF}
            disabled={downloading}
            type="button"
            className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-[#232320] hover:bg-[#6B4A34] font-sans text-xs font-bold text-white transition-colors disabled:opacity-70 shadow-md"
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{downloading ? 'Generating PDF...' : 'Download Roster (PDF)'}</span>
          </button>
        </div>
      </div>

      {/* Confirmation Notification Banner (Hidden on Print) */}
      <div className="max-w-4xl w-full mb-6 print:hidden">
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm text-emerald-950">Group Registration Confirmed</h3>
              <p className="font-sans text-xs text-emerald-800">
                A master confirmation with all student tickets has been emailed to <strong>{data.coordinatorEmail}</strong>.
              </p>
            </div>
          </div>
          <span className="hidden md:inline-block font-mono text-xs font-bold bg-white text-emerald-800 px-3 py-1 rounded-full border border-emerald-200 shrink-0">
            {data.mpesaReceipt}
          </span>
        </div>
      </div>

      {/* Printable Master Pass Container */}
      <div 
        id="printable-roster" 
        className="max-w-4xl w-full bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-stone-200 space-y-8 print:shadow-none print:border-none print:p-6"
      >
        
        {/* Document Header */}
        <div className="border-b-2 border-[#6B4A34] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold tracking-[0.25em] text-[#6B4A34] uppercase block">
                OFFICIAL ENTRY PASS & ROSTER
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#232320]">
              {data.schoolName}
            </h1>
            <p className="font-sans text-xs text-stone-500">
              Tournament Delegation Roster • Jumuiya Chess Grand Prix
            </p>
          </div>

          <div className="text-left sm:text-right bg-[#FAF7F2] p-4 rounded-2xl border border-stone-200/80 min-w-[200px]">
            <span className="text-[10px] uppercase tracking-wider text-stone-500 font-bold block">
              M-Pesa Confirmation
            </span>
            <span className="font-mono text-base font-bold text-[#6B4A34] block">
              {data.mpesaReceipt}
            </span>
            <span className="text-[11px] text-stone-600 block mt-0.5">
              {data.studentsCount} Students Registered
            </span>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#FAF7F2]/60 p-5 rounded-2xl border border-stone-200/80 text-xs">
          
          {/* Tournament Details */}
          <div className="space-y-2.5">
            <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-[#6B4A34] flex items-center space-x-1.5">
              <Trophy className="w-3.5 h-3.5" />
              <span>Event Details</span>
            </span>
            <div className="space-y-1.5 text-stone-800">
              <div className="font-serif text-base font-bold text-[#232320]">
                {data.tournament.name}
              </div>
              <div className="flex items-center space-x-2 text-stone-600">
                <Calendar className="w-3.5 h-3.5 text-[#6B4A34]" />
                <span>{new Date(data.tournament.eventDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center space-x-2 text-stone-600">
                <MapPin className="w-3.5 h-3.5 text-[#6B4A34]" />
                <span>{data.tournament.venue}</span>
              </div>
            </div>
          </div>

          {/* Delegation & Coordinator */}
          <div className="space-y-2.5 md:border-l md:border-stone-200 md:pl-5">
            <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-[#6B4A34] flex items-center space-x-1.5">
              <School className="w-3.5 h-3.5" />
              <span>School Delegation</span>
            </span>
            <div className="space-y-1 text-stone-700">
              <div className="flex justify-between py-0.5">
                <span className="text-stone-500">Patron / Coach:</span>
                <span className="font-bold text-[#232320]">{data.patronName}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-stone-500">Coordinator Phone:</span>
                <span className="font-mono">{data.coordinatorPhone}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-stone-500">Total Fee Paid:</span>
                <span className="font-bold text-[#6B4A34]">
                  {data.totalAmount === 0 ? 'FREE' : `KES ${data.totalAmount.toLocaleString()}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Registered Students Roster Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold text-[#232320]">
              Official Student Competitors
            </h2>
            <span className="font-sans text-xs text-stone-500">
              Please present this list to the chief arbiter at player check-in
            </span>
          </div>

          <div className="border border-stone-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#FAF7F2] text-[#232320] border-b border-stone-200 font-serif">
                <tr>
                  <th className="py-3 px-3.5 font-bold w-10 text-center">#</th>
                  <th className="py-3 px-3.5 font-bold">Player Name</th>
                  <th className="py-3 px-3.5 font-bold">Gender</th>
                  <th className="py-3 px-3.5 font-bold">Age</th>
                  <th className="py-3 px-3.5 font-bold">Tournament Category</th>
                  <th className="py-3 px-3.5 font-bold">FIDE ID</th>
                  <th className="py-3 px-3.5 font-bold text-right">Ticket Number</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-sans">
                {data.students.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-2.5 px-3.5 text-center text-stone-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3.5 font-bold text-[#232320]">
                      {student.playerName}
                    </td>
                    <td className="py-2.5 px-3.5 text-stone-600">
                      {student.gender}
                    </td>
                    <td className="py-2.5 px-3.5 text-stone-600">
                      {student.age > 0 ? `${student.age} yrs` : '—'}
                    </td>
                    <td className="py-2.5 px-3.5 text-stone-800">
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200/60 font-medium">
                        {student.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-stone-500">
                      {student.fideId && student.fideId !== '00' ? student.fideId : '—'}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono font-bold text-[#6B4A34]">
                      <span className="bg-[#FAF7F2] px-2.5 py-1 rounded border border-[#6B4A34]/20 text-[11px]">
                        {student.ticketNumber}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Verification & Arbiter Stamp Section */}
        <div className="border-t border-stone-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-stone-500">
          <div className="space-y-1 text-center sm:text-left">
            <p className="font-bold text-stone-700">Tournament Arbiter Check-In Instructions:</p>
            <p className="text-[11px] leading-relaxed">
              Verify competitor identity and confirm attendance against the tournament pairing system.
            </p>
          </div>

          <div className="border-2 border-dashed border-stone-300 rounded-xl p-4 w-48 text-center shrink-0">
            <span className="text-[10px] uppercase font-bold text-stone-400 block mb-3">Arbiter Official Stamp</span>
            <div className="h-8"></div>
          </div>
        </div>

        {/* Footer Branding */}
        <div className="text-center pt-2 border-t border-stone-100 text-[11px] text-stone-400">
          Jumuiya Chess Foundation • Empowering youth through chess across East Africa • www.jumuiyachess.org
        </div>
      </div>
    </div>
  );
}
