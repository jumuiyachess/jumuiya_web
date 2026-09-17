'use client';

import { useState, useEffect, useRef } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { 
  Loader2, 
  ArrowLeft, 
  User, 
  Users, 
  Trophy, 
  ShieldCheck, 
  CheckCircle2, 
  Download, 
  UploadCloud, 
  Trash2, 
  Plus, 
  FileSpreadsheet, 
  AlertCircle,
  FileCheck
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { 
  BulkStudent, 
  parseStudentSpreadsheet, 
  downloadExcelTemplate, 
  downloadCsvTemplate, 
  calculateBulkTotal, 
  validateStudent, 
  calculateAge 
} from '@/lib/bulkRegistration';

export default function RegisterTournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Mode Selection: 'individual' vs 'bulk'
  const [activeTab, setActiveTab] = useState<'individual' | 'bulk'>('individual');

  // --- Individual Form State ---
  const [surname, setSurname] = useState('');
  const [otherNames, setOtherNames] = useState('');
  const [gender, setGender] = useState('');
  const [country, setCountry] = useState('Kenya');
  const [dob, setDob] = useState('');
  const [school, setSchool] = useState('');
  const [category, setCategory] = useState('');
  const [fideId, setFideId] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [accompanyingPerson, setAccompanyingPerson] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);

  // --- Bulk (School / Group) Form State ---
  const [schoolName, setSchoolName] = useState('');
  const [patronName, setPatronName] = useState('');
  const [coordinatorEmail, setCoordinatorEmail] = useState('');
  const [coordinatorPhone, setCoordinatorPhone] = useState('');
  const [bulkConsent, setBulkConsent] = useState(false);
  const [bulkStudents, setBulkStudents] = useState<BulkStudent[]>([]);
  const [pageSize, setPageSize] = useState<number | 'all'>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Submission & Payment State ---
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'pending' | 'success' | 'error';
    text: string;
    receipt?: string;
    resultDesc?: string;
    ticketId?: string;
  } | null>(null);

  useEffect(() => {
    async function fetchTournament() {
      try {
        const res = await apiRequest<any>(`/tournaments/${id}`);
        if (res.success && res.data) {
          setTournament(res.data);
          const nameLower = (res.data.name || '').toLowerCase();
          const slugLower = (res.data.slug || '').toLowerCase();
          if (nameLower.includes('mashariki') || slugLower.includes('mashariki')) {
            window.location.href = 'https://forms.gle/pTNQTupnMBVUSENH7';
          }
        }
      } catch (error) {
        console.error('Error fetching tournament:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchTournament();
  }, [id]);

  // Payment Status Polling (Supports both Individual and Batch)
  const checkPaymentStatus = async (reqId: string) => {
    try {
      const res = await apiRequest(`/mpesa/status/${reqId}?_t=${Date.now()}`, { cache: 'no-store' }) as {
        success: boolean;
        paymentStatus?: 'pending' | 'completed' | 'failed';
        mpesaReceipt?: string;
        resultDesc?: string;
        registration?: any;
        isBatch?: boolean;
        studentsCount?: number;
      };

      if (res && res.success) {
        if (res.paymentStatus === 'completed') {
          const isBatch = res.isBatch || activeTab === 'bulk';
          setStatusMessage({
            type: 'success',
            text: isBatch 
              ? 'Payment confirmed! Redirecting to your School Roster & Tickets...' 
              : 'Payment received! Redirecting to your ticket... A copy has also been sent to your email.',
            receipt: res.mpesaReceipt || 'M-PESA CONFIRMED',
            ticketId: res.registration?.ticket_number || res.registration?.id
          });
          
          setTimeout(() => {
            if (isBatch) {
              router.push(`/tickets/batch/${reqId}`);
            } else {
              const tId = res.registration?.ticket_number || res.registration?.id || reqId.slice(-6);
              router.push(`/tickets/${tId}`);
            }
          }, 2500);
        } else if (res.paymentStatus === 'failed') {
          setStatusMessage({
            type: 'error',
            text: `Transaction Failed / Cancelled: "${res.resultDesc || 'Request cancelled by user or invalid PIN'}"`
          });
        }
      }
    } catch (err) {
      console.error('[Polling Error]:', err);
    }
  };

  useEffect(() => {
    if (!checkoutRequestId || statusMessage?.type !== 'pending') return;

    let pollCount = 0;
    const maxPolls = 72; // 3 mins max

    const intervalId = setInterval(async () => {
      pollCount++;
      await checkPaymentStatus(checkoutRequestId);

      if (pollCount >= maxPolls) {
        clearInterval(intervalId);
        setStatusMessage((prev) => {
          if (prev?.type === 'pending') {
            return {
              type: 'error',
              text: 'M-Pesa prompt timed out. Please check your network and try again.',
            };
          }
          return prev;
        });
      }
    }, 2500);

    return () => clearInterval(intervalId);
  }, [checkoutRequestId, statusMessage?.type]);

  // Handle Individual Submission
  const handleIndividualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournament) return;

    setFormSubmitting(true);
    setStatusMessage(null);

    const calculatedAge = dob ? calculateAge(dob) : 0;

    const body = {
      tournamentId: tournament.id,
      surname,
      otherNames,
      email,
      gender,
      country,
      dob,
      age: calculatedAge,
      school,
      category,
      fideId,
      phoneNumber,
      accompanyingPerson,
      consentGiven,
      amount: currentIndividualFee,
    };

    const res = await apiRequest('/mpesa/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }) as { success: boolean; checkoutRequestId?: string; error?: string; ticketNumber?: string; registrationId?: string };

    setFormSubmitting(false);

    if (res.success) {
      if (currentIndividualFee === 0) {
        setStatusMessage({
          type: 'success',
          text: 'Registration successful! Redirecting to your ticket...',
          receipt: 'FREE-ENTRY',
        });
        setTimeout(() => {
          router.push(`/tickets/${res.ticketNumber || res.registrationId}`);
        }, 2000);
      } else {
        setCheckoutRequestId(res.checkoutRequestId || null);
        setStatusMessage({
          type: 'pending',
          text: 'STK Push prompt sent to your phone! Please enter your M-Pesa PIN on your phone to complete payment.',
        });
      }
    } else {
      setStatusMessage({
        type: 'error',
        text: res.error || 'Failed to initiate M-Pesa transaction. Please check your details and try again.',
      });
    }
  };

  // --- Bulk Management Helpers ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingFile(true);
    setUploadError('');
    setUploadedFileName(file.name);

    const result = await parseStudentSpreadsheet(file, tournament?.categories || []);
    setIsParsingFile(false);

    if (result.success) {
      setBulkStudents(result.students);
    } else {
      setUploadError(result.error || 'Failed to parse spreadsheet file.');
    }
  };

  const addManualStudent = () => {
    const categories = tournament?.categories || [];
    const defaultCat = categories.length > 0 ? categories[0] : 'Open Section (FIDE Rated)';
    const newStudent: BulkStudent = {
      id: `manual-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      firstName: '',
      lastName: '',
      gender: 'Male',
      dob: '',
      age: 0,
      category: defaultCat,
      fideId: '00',
      errors: ['First Name is required', 'Last Name is required', 'Date of Birth is required (YYYY-MM-DD)'],
    };

    setBulkStudents(prev => [...prev, newStudent]);
  };

  const updateStudentField = (id: string, field: keyof BulkStudent, value: any) => {
    setBulkStudents(prev => {
      const updated = prev.map(s => {
        if (s.id !== id) return s;
        const updatedStudent = { ...s, [field]: value };
        if (field === 'dob') {
          updatedStudent.age = calculateAge(value);
        }
        return updatedStudent;
      });

      return updated.map(s => ({
        ...s,
        errors: validateStudent(s, tournament?.categories || [], updated),
      }));
    });
  };

  const removeStudent = (id: string) => {
    setBulkStudents(prev => {
      const filtered = prev.filter(s => s.id !== id);
      return filtered.map(s => ({
        ...s,
        errors: validateStudent(s, tournament?.categories || [], filtered),
      }));
    });
  };

  // Handle Bulk Submission
  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournament || bulkStudents.length === 0) return;

    // Client-side block if errors exist
    const hasRowErrors = bulkStudents.some(s => s.errors && s.errors.length > 0);
    if (hasRowErrors) {
      setStatusMessage({
        type: 'error',
        text: 'Please correct the highlighted errors in your student table before proceeding.',
      });
      return;
    }

    setFormSubmitting(true);
    setStatusMessage(null);

    const body = {
      tournamentId: tournament.id,
      schoolName: schoolName.trim(),
      patronName: patronName.trim(),
      email: coordinatorEmail.trim(),
      phoneNumber: coordinatorPhone.trim(),
      consentGiven: bulkConsent,
      students: bulkStudents.map(s => ({
        firstName: s.firstName,
        lastName: s.lastName,
        gender: s.gender,
        dob: s.dob,
        category: s.category,
        fideId: s.fideId,
      })),
    };

    const res = await apiRequest('/mpesa/register-batch', {
      method: 'POST',
      body: JSON.stringify(body),
    }) as {
      success: boolean;
      checkoutRequestId?: string;
      batchId?: string;
      isFree?: boolean;
      error?: string;
    };

    setFormSubmitting(false);

    if (res.success) {
      if (res.isFree) {
        setStatusMessage({
          type: 'success',
          text: 'School registration completed! Redirecting to your group tickets roster...',
          receipt: 'FREE-ENTRY',
        });
        setTimeout(() => {
          router.push(`/tickets/batch/${res.batchId}`);
        }, 2200);
      } else {
        setCheckoutRequestId(res.checkoutRequestId || null);
        setStatusMessage({
          type: 'pending',
          text: `M-Pesa STK prompt sent to ${coordinatorPhone}! Please enter your M-Pesa PIN on your phone to complete payment.`,
        });
      }
    } else {
      setStatusMessage({
        type: 'error',
        text: res.error || 'Failed to initiate bulk registration. Please check the details and try again.',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#6B4A34]" />
      </div>
    );
  }

  if (!tournament) return null;

  // Pricing & Capacity Calculations
  const isPwdDap = category.toLowerCase().includes('pwd') || category.toLowerCase().includes('dap');
  const currentIndividualFee = isPwdDap ? 0 : (Number(tournament.entry_fee) || 0);

  const bulkFinancials = calculateBulkTotal(bulkStudents, Number(tournament.entry_fee) || 0);
  
  // Pagination Calculations
  const totalStudents = bulkStudents.length;
  const effectivePageSize = pageSize === 'all' ? totalStudents : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalStudents / (pageSize === 'all' ? totalStudents || 1 : pageSize)));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * effectivePageSize;
  const endIndex = pageSize === 'all' ? totalStudents : Math.min(startIndex + effectivePageSize, totalStudents);
  const displayedStudents = bulkStudents.slice(startIndex, endIndex);

  const capacity = tournament.max_participants || 100;
  const registered = tournament.registrations_count || 0;
  const isFull = registered >= capacity;

  return (
    <div className="min-h-screen bg-[#FAF7F2] py-6 px-4 flex flex-col justify-center items-center">
      <div className="max-w-3xl w-full space-y-3">
        <Link href={`/tournaments/${id}`} className="inline-flex items-center space-x-1.5 text-[#6B4A34] hover:underline font-bold font-sans text-xs">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Event Details</span>
        </Link>
        
        <div className="bg-white p-5 md:p-7 rounded-2xl shadow-lg border border-[#6B4A34]/10">
          
          {/* Header Title & Fee */}
          <div className="mb-4 border-b border-stone-100 pb-3 flex justify-between items-center">
            <div>
              <h1 className="font-serif text-2xl font-bold text-[#232320]">Event Registration</h1>
              <h2 className="font-sans text-xs font-bold text-[#6B4A34]">{tournament.name}</h2>
            </div>
            <div className="text-right">
              <span className="font-sans text-[10px] text-stone-500 uppercase tracking-widest block">
                {activeTab === 'individual' ? 'Entry Fee' : 'Fee per Student'}
              </span>
              <span className="font-serif text-xl font-bold text-[#6B4A34]">
                {activeTab === 'individual' 
                  ? (currentIndividualFee === 0 ? 'FREE' : `KES ${currentIndividualFee.toLocaleString()}`)
                  : `KES ${(Number(tournament.entry_fee) || 0).toLocaleString()}`}
              </span>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="mb-6 p-1 bg-stone-100/80 rounded-xl flex items-center border border-stone-200/60">
            <button
              type="button"
              onClick={() => {
                setActiveTab('individual');
                setStatusMessage(null);
              }}
              className={`flex-1 py-2.5 px-4 rounded-lg font-sans text-xs font-bold flex items-center justify-center space-x-2 transition-all duration-200 ${
                activeTab === 'individual'
                  ? 'bg-[#232320] text-white shadow-sm'
                  : 'text-stone-600 hover:text-[#232320]'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Individual Player</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('bulk');
                setStatusMessage(null);
              }}
              className={`flex-1 py-2.5 px-4 rounded-lg font-sans text-xs font-bold flex items-center justify-center space-x-2 transition-all duration-200 ${
                activeTab === 'bulk'
                  ? 'bg-[#6B4A34] text-white shadow-sm'
                  : 'text-stone-600 hover:text-[#6B4A34]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>School / Group (Bulk)</span>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FAF7F2]/20 text-white font-mono ml-1">
                Excel / CSV
              </span>
            </button>
          </div>

          {isFull ? (
             <div className="p-6 text-center bg-red-50 border border-red-200 rounded-xl text-red-900">
                <h3 className="text-lg font-bold mb-1">Registration Closed</h3>
                <p className="text-xs">Sorry, this tournament has reached its maximum capacity of {capacity} players.</p>
             </div>
          ) : (
            <>
              {/* Payment / Status Feedback Modal Overlay */}
              {(formSubmitting || statusMessage) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
                  <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center transform transition-all border border-[#6B4A34]/20 flex flex-col items-center">
                    
                    {(!statusMessage || statusMessage.type === 'pending') && (
                      <>
                        <div className="relative w-20 h-20 mx-auto mb-4">
                          <div className="absolute inset-0 border-4 border-[#C8B195]/30 rounded-full"></div>
                          <div className="absolute inset-0 border-4 border-[#6B4A34] rounded-full border-t-transparent animate-spin"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <ShieldCheck className="w-7 h-7 text-[#6B4A34] opacity-80" />
                          </div>
                        </div>
                        <h3 className="font-serif text-xl font-bold text-[#232320] mb-2">
                          {statusMessage?.type === 'pending' ? 'Awaiting M-Pesa' : 'Processing Registration...'}
                        </h3>
                        <p className="font-sans text-[#232320]/70 text-xs leading-relaxed">
                          {statusMessage?.text || 'Securely submitting player details...'}
                        </p>
                      </>
                    )}

                    {statusMessage?.type === 'success' && (
                      <>
                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                        </div>
                        <h3 className="font-serif text-xl font-bold text-[#232320] mb-2">Registration Complete!</h3>
                        <p className="font-sans text-[#232320]/70 text-xs leading-relaxed mb-4">
                          {statusMessage.text}
                        </p>
                        <div className="flex items-center justify-center space-x-2 text-emerald-600 font-bold">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-xs">Redirecting to tickets...</span>
                        </div>
                      </>
                    )}

                    {statusMessage?.type === 'error' && (
                      <>
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <ShieldCheck className="w-10 h-10 text-red-600" />
                        </div>
                        <h3 className="font-serif text-xl font-bold text-[#232320] mb-2">Notice</h3>
                        <p className="font-sans text-[#232320]/70 text-xs leading-relaxed mb-6">
                          {statusMessage.text}
                        </p>
                        <button
                          type="button"
                          onClick={() => setStatusMessage(null)}
                          className="w-full py-3 bg-[#232320] hover:bg-red-900 text-white font-sans text-xs font-bold rounded-xl transition-colors shadow-md"
                        >
                          Close / Try Again
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 1: INDIVIDUAL REGISTRATION (ORIGINAL UNCHANGED FLOW) */}
              {/* ========================================================= */}
              {activeTab === 'individual' && (
                <form onSubmit={handleIndividualSubmit} className="space-y-3.5">
                  
                  {/* SECTION 1: Player Details */}
                  <div className="space-y-2.5">
                    <div className="flex items-center space-x-2 border-b border-stone-100 pb-1.5">
                      <div className="p-1 bg-[#FAF7F2] rounded"><User className="w-4 h-4 text-[#6B4A34]" /></div>
                      <h4 className="font-serif font-bold text-sm text-[#232320]">1. Player Details</h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-sans text-[10px] font-semibold text-stone-500 mb-1 uppercase">Surname *</label>
                        <input type="text" required value={surname} onChange={(e) => setSurname(e.target.value)} placeholder="e.g. Kimani" className="w-full bg-[#FAF7F2] border border-stone-200 py-1.5 px-3 rounded-lg text-xs text-[#232320] focus:outline-none focus:border-[#6B4A34]" />
                      </div>
                      <div>
                        <label className="block font-sans text-[10px] font-semibold text-stone-500 mb-1 uppercase">Other Names *</label>
                        <input type="text" required value={otherNames} onChange={(e) => setOtherNames(e.target.value)} placeholder="e.g. John Mwangi" className="w-full bg-[#FAF7F2] border border-stone-200 py-1.5 px-3 rounded-lg text-xs text-[#232320] focus:outline-none focus:border-[#6B4A34]" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-sans text-[10px] font-semibold text-stone-500 mb-1 uppercase">Category *</label>
                        <select required value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-[#FAF7F2] border border-stone-200 py-1.5 px-3 rounded-lg text-xs text-[#232320] focus:outline-none focus:border-[#6B4A34]">
                          <option value="">Select Category</option>
                          {tournament.categories?.map((cat: string) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block font-sans text-[10px] font-semibold text-stone-500 mb-1 uppercase">Gender *</label>
                        <select required value={gender} onChange={(e) => setGender(e.target.value)} className="w-full bg-[#FAF7F2] border border-stone-200 py-1.5 px-3 rounded-lg text-xs text-[#232320] focus:outline-none focus:border-[#6B4A34]">
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-sans text-[10px] font-semibold text-stone-500 mb-1 uppercase">Country *</label>
                        <input type="text" required value={country} onChange={(e) => setCountry(e.target.value)} className="w-full bg-[#FAF7F2] border border-stone-200 py-1.5 px-3 rounded-lg text-xs text-[#232320] focus:outline-none focus:border-[#6B4A34]" />
                      </div>
                      <div>
                        <label className="block font-sans text-[10px] font-semibold text-stone-500 mb-1 uppercase">Date of Birth</label>
                        <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full bg-[#FAF7F2] border border-stone-200 py-1.5 px-3 rounded-lg text-xs text-[#232320] focus:outline-none focus:border-[#6B4A34]" />
                      </div>
                      <div>
                        <label className="block font-sans text-[10px] font-semibold text-stone-500 mb-1 uppercase">FIDE ID * (Input 00 if you don't have one)</label>
                        <input type="text" required value={fideId} onChange={(e) => setFideId(e.target.value)} placeholder="00" className="w-full bg-[#FAF7F2] border border-stone-200 py-1.5 px-3 rounded-lg text-xs text-[#232320] focus:outline-none focus:border-[#6B4A34]" />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: Contact & Details */}
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center space-x-2 border-b border-stone-100 pb-1.5">
                      <div className="p-1 bg-[#FAF7F2] rounded"><Trophy className="w-4 h-4 text-[#6B4A34]" /></div>
                      <h4 className="font-serif font-bold text-sm text-[#232320]">2. Contact & Details</h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-sans text-[10px] font-semibold text-stone-500 mb-1 uppercase">Club / School</label>
                        <input type="text" value={school} onChange={(e) => setSchool(e.target.value)} placeholder="Optional" className="w-full bg-[#FAF7F2] border border-stone-200 py-1.5 px-3 rounded-lg text-xs text-[#232320] focus:outline-none focus:border-[#6B4A34]" />
                      </div>
                      <div>
                        <label className="block font-sans text-[10px] font-semibold text-stone-500 mb-1 uppercase">Email Address *</label>
                        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="For ticket delivery" className="w-full bg-[#FAF7F2] border border-stone-200 py-1.5 px-3 rounded-lg text-xs text-[#232320] focus:outline-none focus:border-[#6B4A34]" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-sans text-[10px] font-semibold text-stone-500 mb-1 uppercase">M-Pesa Number *</label>
                        <input type="tel" required value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="07XXXXXXXX" className="w-full bg-[#FAF7F2] border border-stone-200 py-1.5 px-3 rounded-lg text-xs text-[#232320] focus:outline-none focus:border-[#6B4A34]" />
                      </div>
                      <div>
                        <label className="block font-sans text-[10px] font-semibold text-stone-500 mb-1 uppercase">Accompanying Person</label>
                        <input type="text" value={accompanyingPerson} onChange={(e) => setAccompanyingPerson(e.target.value)} placeholder="Parent/Coach Name" className="w-full bg-[#FAF7F2] border border-stone-200 py-1.5 px-3 rounded-lg text-xs text-[#232320] focus:outline-none focus:border-[#6B4A34]" />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: Agreement */}
                  <div className="pt-1">
                    <div className="flex items-start space-x-2.5 bg-[#FAF7F2] p-2.5 rounded-lg border border-[#6B4A34]/20">
                      <input
                        type="checkbox"
                        id="consent"
                        required
                        checked={consentGiven}
                        onChange={(e) => setConsentGiven(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded text-[#6B4A34] focus:ring-[#6B4A34] cursor-pointer"
                      />
                      <label htmlFor="consent" className="text-[11px] text-stone-700 leading-tight cursor-pointer">
                        I confirm the details provided are accurate and agree to the <Link href="/tournaments/rules" target="_blank" className="font-bold text-[#6B4A34] hover:underline">Tournament Rules</Link> and <Link href="/terms" target="_blank" className="font-bold text-[#6B4A34] hover:underline">Terms of Service</Link>.
                      </label>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={formSubmitting}
                      className="w-full py-3 bg-[#232320] text-white font-sans text-xs md:text-sm font-bold rounded-xl shadow-md hover:bg-[#6B4A34] active:scale-[0.99] transition-all duration-300 flex items-center justify-center space-x-2"
                    >
                      <span>{currentIndividualFee === 0 ? 'Complete Free Registration' : `Pay KES ${currentIndividualFee.toLocaleString()} via M-Pesa`}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* ========================================================= */}
              {/* TAB 2: SCHOOL & GROUP REGISTRATION (NEW BULK FLOW)       */}
              {/* ========================================================= */}
              {activeTab === 'bulk' && (
                <form onSubmit={handleBulkSubmit} className="space-y-6">
                  
                  {/* STEP 1: School & Coordinator Details */}
                  <div className="space-y-3 bg-[#FAF7F2]/50 p-4 rounded-xl border border-stone-200/80">
                    <div className="flex items-center space-x-2 border-b border-stone-200 pb-2">
                      <div className="p-1 bg-[#FAF7F2] rounded border border-stone-200">
                        <Trophy className="w-4 h-4 text-[#6B4A34]" />
                      </div>
                      <div>
                        <h3 className="font-serif font-bold text-sm text-[#232320]">1. School & Coordinator Information</h3>
                        <p className="font-sans text-[11px] text-stone-500">Filled once for the entire student roster</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block font-sans text-[10px] font-semibold text-stone-500 mb-1 uppercase">School / Academy Name *</label>
                        <input
                          type="text"
                          required
                          value={schoolName}
                          onChange={(e) => setSchoolName(e.target.value)}
                          placeholder="e.g. St. Andrew's Academy"
                          className="w-full bg-white border border-stone-200 py-2 px-3 rounded-lg text-xs text-[#232320] focus:outline-none focus:border-[#6B4A34]"
                        />
                      </div>
                      <div>
                        <label className="block font-sans text-[10px] font-semibold text-stone-500 mb-1 uppercase">Patron / Coach Name *</label>
                        <input
                          type="text"
                          required
                          value={patronName}
                          onChange={(e) => setPatronName(e.target.value)}
                          placeholder="e.g. Coach Kevin Otieno"
                          className="w-full bg-white border border-stone-200 py-2 px-3 rounded-lg text-xs text-[#232320] focus:outline-none focus:border-[#6B4A34]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-sans text-[10px] font-semibold text-stone-500 mb-1 uppercase">Coordinator Email * (For all tickets & roster)</label>
                        <input
                          type="email"
                          required
                          value={coordinatorEmail}
                          onChange={(e) => setCoordinatorEmail(e.target.value)}
                          placeholder="coach@school.ac.ke"
                          className="w-full bg-white border border-stone-200 py-2 px-3 rounded-lg text-xs text-[#232320] focus:outline-none focus:border-[#6B4A34]"
                        />
                      </div>
                      <div>
                        <label className="block font-sans text-[10px] font-semibold text-stone-500 mb-1 uppercase">M-Pesa Number * (Will receive single charge prompt)</label>
                        <input
                          type="tel"
                          required
                          value={coordinatorPhone}
                          onChange={(e) => setCoordinatorPhone(e.target.value)}
                          placeholder="07XXXXXXXX or 2547XXXXXXXX"
                          className="w-full bg-white border border-stone-200 py-2 px-3 rounded-lg text-xs text-[#232320] focus:outline-none focus:border-[#6B4A34]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* STEP 2: Upload Spreadsheet or Add Manually */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-2">
                      <div className="flex items-center space-x-2">
                        <div className="p-1 bg-[#FAF7F2] rounded"><Users className="w-4 h-4 text-[#6B4A34]" /></div>
                        <h3 className="font-serif font-bold text-sm text-[#232320]">2. Student Roster</h3>
                      </div>

                      {/* Download Template Buttons */}
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => downloadExcelTemplate(tournament.categories, tournament.name)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-[#6B4A34]/30 bg-[#FAF7F2] text-[#6B4A34] hover:bg-[#6B4A34] hover:text-white font-sans text-[11px] font-bold transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Excel Template (.xlsx)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadCsvTemplate(tournament.categories)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 font-sans text-[11px] font-semibold transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>CSV</span>
                        </button>
                      </div>
                    </div>

                    {/* Drag and Drop Zone */}
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-[#6B4A34]/30 hover:border-[#6B4A34] bg-[#FAF7F2]/40 hover:bg-[#FAF7F2] rounded-xl p-6 text-center cursor-pointer transition-all duration-200 group"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />

                      {isParsingFile ? (
                        <div className="flex flex-col items-center justify-center space-y-2 py-2">
                          <Loader2 className="w-7 h-7 text-[#6B4A34] animate-spin" />
                          <p className="font-sans text-xs font-bold text-[#6B4A34]">Reading and validating spreadsheet...</p>
                        </div>
                      ) : uploadedFileName ? (
                        <div className="flex items-center justify-center space-x-3 py-1">
                          <div className="p-2 bg-emerald-100 rounded-lg text-emerald-800">
                            <FileCheck className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <p className="font-sans text-xs font-bold text-[#232320]">{uploadedFileName}</p>
                            <p className="font-sans text-[11px] text-emerald-700 font-medium">
                              {bulkStudents.length} student(s) successfully extracted. Click to replace file.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-1.5 py-1">
                          <div className="p-2.5 rounded-full bg-[#C8B195]/20 text-[#6B4A34] group-hover:scale-110 transition-transform">
                            <UploadCloud className="w-6 h-6" />
                          </div>
                          <p className="font-sans text-xs font-bold text-[#232320]">
                            Drop your filled Excel (.xlsx) or CSV roster here, or <span className="text-[#6B4A34] underline">browse</span>
                          </p>
                          <p className="font-sans text-[10px] text-stone-500">
                            Supports columns: First Name, Last Name, Gender, Date of Birth, Category, FIDE ID
                          </p>
                        </div>
                      )}
                    </div>

                    {uploadError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-800 text-xs">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                        <span>{uploadError}</span>
                      </div>
                    )}

                    {/* Interactive Student Table */}
                    {bulkStudents.length > 0 ? (
                      <div className="space-y-3 pt-2">
                        {/* PWD / DAP Informational Notification */}
                        {bulkStudents.some(s => s.category.toLowerCase().includes('pwd') || s.category.toLowerCase().includes('dap')) && (
                          <div className="p-3 bg-blue-50/90 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-950 shadow-xs">
                            <div className="flex items-center space-x-2.5">
                              <span className="text-base shrink-0">♿</span>
                              <span>
                                <strong className="font-semibold text-blue-900">
                                  {bulkStudents.filter(s => s.category.toLowerCase().includes('pwd') || s.category.toLowerCase().includes('dap')).length} student(s)
                                </strong> registered under <strong className="text-blue-900">PWD / DAP Section</strong>. Their entry is <strong>100% FREE (KES 0)</strong> and will proceed straight to registration without fee or error.
                              </span>
                            </div>
                            <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold tracking-wide shrink-0">
                              FREE ENTRY
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="font-sans text-xs font-bold text-[#232320]">
                            Roster Preview ({bulkStudents.length} Students)
                          </span>
                          <button
                            type="button"
                            onClick={addManualStudent}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#232320] hover:bg-[#6B4A34] text-white font-sans text-xs font-bold transition-colors shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Student</span>
                          </button>
                        </div>

                        <div className={`border border-stone-200 rounded-xl overflow-hidden bg-white shadow-sm ${pageSize === 'all' ? 'max-h-[580px] overflow-y-auto' : ''}`}>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead className="bg-[#FAF7F2] text-[#232320] border-b border-stone-200 font-serif sticky top-0 z-20">
                                <tr>
                                  <th className="py-2.5 px-1.5 font-bold w-9 text-center">#</th>
                                  <th className="py-2.5 px-2 font-bold w-[19%]">First Name *</th>
                                  <th className="py-2.5 px-2 font-bold w-[19%]">Last Name *</th>
                                  <th className="py-2.5 px-1.5 font-bold w-[11%]">Gender *</th>
                                  <th className="py-2.5 px-1.5 font-bold w-[19%]">DOB * (Age)</th>
                                  <th className="py-2.5 px-1.5 font-bold w-[20%]">Category *</th>
                                  <th className="py-2.5 px-1 font-bold w-[8%] text-center" title="Mandatory. Enter 00 if student has no FIDE ID">FIDE *</th>
                                  <th className="py-2.5 px-1 font-bold text-center w-8"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-stone-100 font-sans">
                                {displayedStudents.map((student, pageIdx) => {
                                  const idx = startIndex + pageIdx;
                                  const hasErrors = student.errors && student.errors.length > 0;
                                  return (
                                    <tr 
                                      key={student.id} 
                                      className={`group hover:bg-stone-50 transition-colors ${hasErrors ? 'bg-red-50/40' : ''}`}
                                    >
                                      {/* Number / Hover Delete on the left */}
                                      <td className="py-2 px-1 text-center text-stone-500 font-mono text-[11px] w-9">
                                        <div className="flex items-center justify-center">
                                          <span className="group-hover:hidden">{idx + 1}</span>
                                          <button
                                            type="button"
                                            onClick={() => removeStudent(student.id)}
                                            className="hidden group-hover:flex items-center justify-center w-5 h-5 rounded-full bg-red-100 hover:bg-red-600 text-red-600 hover:text-white transition-all shadow-xs"
                                            title="Delete student"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </td>
                                      
                                      {/* First Name */}
                                      <td className="py-1.5 px-1.5">
                                        <input
                                          type="text"
                                          value={student.firstName}
                                          onChange={(e) => updateStudentField(student.id, 'firstName', e.target.value)}
                                          placeholder="First name"
                                          className="w-full bg-transparent border border-transparent hover:border-stone-200 focus:border-[#6B4A34] focus:bg-white px-1.5 py-1 rounded text-xs text-[#232320]"
                                        />
                                      </td>

                                      {/* Last Name */}
                                      <td className="py-1.5 px-1.5">
                                        <input
                                          type="text"
                                          value={student.lastName}
                                          onChange={(e) => updateStudentField(student.id, 'lastName', e.target.value)}
                                          placeholder="Last name"
                                          className="w-full bg-transparent border border-transparent hover:border-stone-200 focus:border-[#6B4A34] focus:bg-white px-1.5 py-1 rounded text-xs text-[#232320]"
                                        />
                                      </td>

                                      {/* Gender */}
                                      <td className="py-1.5 px-1">
                                        <select
                                          value={student.gender}
                                          onChange={(e) => updateStudentField(student.id, 'gender', e.target.value)}
                                          className="w-full bg-transparent border border-transparent hover:border-stone-200 focus:border-[#6B4A34] focus:bg-white px-1 py-1 rounded text-[11px] text-[#232320]"
                                        >
                                          <option value="Male">Male</option>
                                          <option value="Female">Female</option>
                                        </select>
                                      </td>

                                      {/* DOB & Age */}
                                      <td className="py-1.5 px-1">
                                        <div className="flex items-center space-x-1">
                                          <input
                                            type="date"
                                            value={student.dob}
                                            onChange={(e) => updateStudentField(student.id, 'dob', e.target.value)}
                                            className="w-full bg-transparent border border-transparent hover:border-stone-200 focus:border-[#6B4A34] focus:bg-white px-1 py-1 rounded text-[11px] text-[#232320]"
                                          />
                                          {student.age > 0 && (
                                            <span className="text-[10px] text-stone-500 font-mono shrink-0">
                                              ({student.age}y)
                                            </span>
                                          )}
                                        </div>
                                      </td>

                                      {/* Category */}
                                      <td className="py-1.5 px-1">
                                        <select
                                          value={student.category}
                                          onChange={(e) => updateStudentField(student.id, 'category', e.target.value)}
                                          className="w-full bg-transparent border border-transparent hover:border-stone-200 focus:border-[#6B4A34] focus:bg-white px-1 py-1 rounded text-[11px] text-[#232320] truncate"
                                        >
                                          {student.category && !tournament.categories?.includes(student.category) && (
                                            <option value={student.category}>{student.category}</option>
                                          )}
                                          {tournament.categories?.map((cat: string) => (
                                            <option key={cat} value={cat}>{cat}</option>
                                          ))}
                                        </select>
                                      </td>

                                      {/* FIDE ID */}
                                      <td className="py-1.5 px-1">
                                        <input
                                          type="text"
                                          value={student.fideId}
                                          onChange={(e) => updateStudentField(student.id, 'fideId', e.target.value)}
                                          placeholder="00"
                                          className="w-full bg-transparent border border-transparent hover:border-stone-200 focus:border-[#6B4A34] focus:bg-white px-1 py-1 rounded text-[11px] text-[#232320] font-mono text-center"
                                        />
                                      </td>

                                      {/* Action (Delete Icon) */}
                                      <td className="py-1.5 px-1 text-center w-8">
                                        <button
                                          type="button"
                                          onClick={() => removeStudent(student.id)}
                                          className="p-1 rounded text-stone-300 hover:text-red-600 hover:bg-red-50 transition-colors"
                                          title="Remove student"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Pagination & Batch Toolbar */}
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3 py-2 bg-[#FAF7F2] border-t border-stone-200 text-xs text-stone-600">
                            <div className="flex items-center space-x-2">
                              <span>Show:</span>
                              <select
                                value={pageSize}
                                onChange={(e) => {
                                  const val = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
                                  setPageSize(val);
                                  setCurrentPage(1);
                                }}
                                className="bg-white border border-stone-200 rounded px-2 py-0.5 text-xs text-[#232320] focus:outline-none focus:border-[#6B4A34]"
                              >
                                <option value={5}>5 per page</option>
                                <option value={10}>10 per page</option>
                                <option value={20}>20 per page</option>
                                <option value="all">View All ({totalStudents})</option>
                              </select>
                              <span className="text-stone-300">|</span>
                              <span>Showing {totalStudents === 0 ? 0 : startIndex + 1}–{endIndex} of {totalStudents} students</span>
                            </div>

                            {pageSize !== 'all' && totalPages > 1 && (
                              <div className="flex items-center space-x-1.5">
                                <button
                                  type="button"
                                  disabled={safeCurrentPage <= 1}
                                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                  className="px-2.5 py-1 rounded bg-white border border-stone-200 text-xs font-semibold text-[#232320] hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs"
                                >
                                  Previous
                                </button>
                                <span className="px-2 font-mono text-xs font-bold text-[#6B4A34]">
                                  {safeCurrentPage} / {totalPages}
                                </span>
                                <button
                                  type="button"
                                  disabled={safeCurrentPage >= totalPages}
                                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                  className="px-2.5 py-1 rounded bg-white border border-stone-200 text-xs font-semibold text-[#232320] hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs"
                                >
                                  Next
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Error Summary Banner if any rows are invalid */}
                        {bulkStudents.some(s => s.errors && s.errors.length > 0) && (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-xs text-amber-900">
                            <div className="flex items-center space-x-1.5 font-bold">
                              <AlertCircle className="w-4 h-4 text-amber-600" />
                              <span>Attention: Some rows have missing or invalid data</span>
                            </div>
                            <ul className="list-disc pl-5 text-[11px] text-amber-800 space-y-0.5">
                              {bulkStudents.filter(s => s.errors && s.errors.length > 0).slice(0, 3).map((s, i) => (
                                <li key={i}>
                                  Student #{bulkStudents.indexOf(s) + 1} ({s.firstName || 'Unnamed'} {s.lastName || ''}): {s.errors.join(', ')}
                                </li>
                              ))}
                              {bulkStudents.filter(s => s.errors && s.errors.length > 0).length > 3 && (
                                <li>...and {bulkStudents.filter(s => s.errors && s.errors.length > 0).length - 3} more row(s)</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* If No Students Yet, Show Quick Add Button */
                      <div className="text-center py-4 bg-stone-50 border border-stone-200/60 rounded-xl space-y-2">
                        <p className="font-sans text-xs text-stone-500">
                          Or build your school team directly without uploading a file:
                        </p>
                        <button
                          type="button"
                          onClick={addManualStudent}
                          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#232320] hover:bg-[#6B4A34] text-white font-sans text-xs font-bold transition-all shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add First Student</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* STEP 3: Consolidated Financial Summary */}
                  {bulkStudents.length > 0 && (
                    <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#6B4A34]/20 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-[#6B4A34]/10 pb-2">
                        <span className="font-serif font-bold text-sm text-[#232320]">Group Payment Summary</span>
                        <span className="font-mono text-xs font-bold text-[#6B4A34] uppercase tracking-wider">
                          {bulkStudents.length} Students
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-stone-700 font-sans">
                        <div className="flex justify-between">
                          <span>Standard Entry Fee ({bulkFinancials.payingCount} players × KES {Number(tournament.entry_fee).toLocaleString()}):</span>
                          <span className="font-medium text-[#232320]">KES {bulkFinancials.totalAmount.toLocaleString()}</span>
                        </div>
                        {bulkFinancials.freeCount > 0 && (
                          <div className="flex justify-between text-emerald-700">
                            <span>PWD / DAP Category ({bulkFinancials.freeCount} players):</span>
                            <span className="font-bold">FREE (KES 0)</span>
                          </div>
                        )}
                        <div className="border-t border-stone-200 pt-2 flex justify-between items-center text-sm font-bold text-[#232320]">
                          <span className="font-serif text-base">Consolidated Total:</span>
                          <span className="font-serif text-xl text-[#6B4A34]">
                            KES {bulkFinancials.totalAmount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: Agreement & Action Button */}
                  <div className="space-y-3 pt-1">
                    <div className="flex items-start space-x-2.5 bg-[#FAF7F2] p-2.5 rounded-lg border border-[#6B4A34]/20">
                      <input
                        type="checkbox"
                        id="bulkConsent"
                        required
                        checked={bulkConsent}
                        onChange={(e) => setBulkConsent(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded text-[#6B4A34] focus:ring-[#6B4A34] cursor-pointer"
                      />
                      <label htmlFor="bulkConsent" className="text-[11px] text-stone-700 leading-tight cursor-pointer">
                        As school coordinator, I verify that all {bulkStudents.length} students have parental consent and agree to the <Link href="/tournaments/rules" target="_blank" className="font-bold text-[#6B4A34] hover:underline">Tournament Rules</Link> and <Link href="/terms" target="_blank" className="font-bold text-[#6B4A34] hover:underline">Terms of Service</Link>.
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={formSubmitting || bulkStudents.length === 0}
                      className={`w-full py-3.5 text-white font-sans text-xs md:text-sm font-bold rounded-xl shadow-md transition-all duration-300 flex items-center justify-center space-x-2 ${
                        bulkStudents.length === 0 
                          ? 'bg-stone-400 cursor-not-allowed'
                          : 'bg-[#6B4A34] hover:bg-[#523826] active:scale-[0.99]'
                      }`}
                    >
                      <span>
                        {bulkStudents.length === 0 
                          ? 'Please add or upload students above'
                          : bulkFinancials.totalAmount === 0
                            ? `Complete Free Registration for ${bulkStudents.length} Students`
                            : `Pay KES ${bulkFinancials.totalAmount.toLocaleString()} for ${bulkStudents.length} Students via M-Pesa`}
                      </span>
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
