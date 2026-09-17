import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { initiateStkPush } from '@/lib/mpesa';
import { sendBulkRegistrationConfirmation } from '@/lib/email';
import { calculateAge } from '@/lib/bulkRegistration';

interface StudentInput {
  firstName: string;
  lastName: string;
  gender: 'Male' | 'Female' | string;
  dob: string;
  category: string;
  fideId?: string;
}

// POST /api/mpesa/register-batch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tournamentId,
      schoolName,
      patronName,
      email,
      phoneNumber,
      consentGiven,
      students,
    } = body;

    // 1. Basic Payload Validation
    if (!tournamentId) {
      return NextResponse.json({ error: 'Tournament ID is required.' }, { status: 400 });
    }
    if (!schoolName || typeof schoolName !== 'string' || schoolName.trim().length < 2) {
      return NextResponse.json({ error: 'School / Academy name is required.' }, { status: 400 });
    }
    if (!patronName || typeof patronName !== 'string' || patronName.trim().length < 2) {
      return NextResponse.json({ error: 'Patron / Coach name is required.' }, { status: 400 });
    }
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid coordinator email address is required.' }, { status: 400 });
    }
    if (!phoneNumber || phoneNumber.trim().length < 9) {
      return NextResponse.json({ error: 'A valid M-Pesa phone number is required.' }, { status: 400 });
    }
    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: 'At least one student must be registered in the batch.' }, { status: 400 });
    }
    if (students.length > 150) {
      return NextResponse.json({ error: 'A single batch can register up to 150 students at once. Please split larger groups.' }, { status: 400 });
    }

    // 2. Strict Server-Side Validation on Each Student
    const sanitizedStudents: {
      firstName: string;
      lastName: string;
      fullName: string;
      gender: string;
      dob: string;
      age: number;
      category: string;
      fideId: string;
      amount: number;
    }[] = [];

    const studentKeySet = new Set<string>();
    const fideIdSet = new Set<string>();

    for (let i = 0; i < students.length; i++) {
      const s = students[i] as StudentInput;
      const rowNum = i + 1;

      const firstName = (s.firstName || '').trim();
      const lastName = (s.lastName || '').trim();
      if (!firstName || firstName.length < 2) {
        return NextResponse.json({ error: `Student #${rowNum}: First Name is required and must be at least 2 characters.` }, { status: 400 });
      }
      if (!lastName || lastName.length < 2) {
        return NextResponse.json({ error: `Student #${rowNum} (${firstName}): Last Name is required and must be at least 2 characters.` }, { status: 400 });
      }

      let gender = (s.gender || '').trim();
      if (gender.toLowerCase().startsWith('m') || gender.toLowerCase() === 'boy') {
        gender = 'Male';
      } else if (gender.toLowerCase().startsWith('f') || gender.toLowerCase() === 'girl') {
        gender = 'Female';
      }
      if (gender !== 'Male' && gender !== 'Female') {
        return NextResponse.json({ error: `Student #${rowNum} (${firstName} ${lastName}): Gender must be Male or Female.` }, { status: 400 });
      }

      const dob = (s.dob || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
        return NextResponse.json({ error: `Student #${rowNum} (${firstName} ${lastName}): Date of Birth must be in YYYY-MM-DD format.` }, { status: 400 });
      }

      const birthDate = new Date(dob);
      const today = new Date();
      if (isNaN(birthDate.getTime()) || birthDate > today || birthDate.getFullYear() < 1920) {
        return NextResponse.json({ error: `Student #${rowNum} (${firstName} ${lastName}): Invalid Date of Birth (${dob}).` }, { status: 400 });
      }

      const age = calculateAge(dob);
      const category = (s.category || '').trim();
      if (!category) {
        return NextResponse.json({ error: `Student #${rowNum} (${firstName} ${lastName}): Category is required.` }, { status: 400 });
      }

      const fideId = (s.fideId || '').trim();

      // Intra-batch duplicate check
      const studentKey = `${firstName.toLowerCase()}|${lastName.toLowerCase()}|${dob}`;
      if (studentKeySet.has(studentKey)) {
        return NextResponse.json({ error: `Duplicate student in uploaded batch: "${firstName} ${lastName}" (DOB: ${dob}) appears more than once.` }, { status: 400 });
      }
      studentKeySet.add(studentKey);

      if (fideId && fideId !== '00' && fideId !== '0') {
        if (fideIdSet.has(fideId)) {
          return NextResponse.json({ error: `Duplicate FIDE ID (${fideId}) found for student "${firstName} ${lastName}" in this batch.` }, { status: 400 });
        }
        fideIdSet.add(fideId);
      }

      sanitizedStudents.push({
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        gender,
        dob,
        age,
        category,
        fideId: fideId || '00',
        amount: 0, // calculated below based on tournament fee
      });
    }

    // 3. Tournament Capacity & Race-Condition Hold
    const { data: tournament, error: tourneyError } = await supabaseAdmin
      .from('tournaments')
      .select('id, name, max_participants, entry_fee, status')
      .eq('id', tournamentId)
      .single();

    if (tourneyError || !tournament) {
      return NextResponse.json({ error: 'Tournament not found.' }, { status: 404 });
    }

    if (tournament.status === 'completed' || tournament.status === 'cancelled') {
      return NextResponse.json({ error: `This tournament is ${tournament.status} and no longer accepts registrations.` }, { status: 400 });
    }

    // 5-minute reservation window for active pending holds
    const holdCutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    // Query active counts (completed + unexpired pending)
    const { data: activeRegs, error: countError } = await supabaseAdmin
      .from('registrations')
      .select('id, player_name, date_of_birth, fide_id, payment_status, created_at')
      .eq('tournament_id', tournamentId)
      .or(`payment_status.eq.completed,and(payment_status.eq.pending,created_at.gte.${holdCutoff})`);

    if (countError) {
      console.error('[Batch Register] Capacity query error:', countError);
      return NextResponse.json({ error: 'Database error validating capacity.' }, { status: 500 });
    }

    const takenSlots = activeRegs ? activeRegs.length : 0;
    const maxCapacity = tournament.max_participants || 200;

    if (takenSlots + sanitizedStudents.length > maxCapacity) {
      const remainingSlots = Math.max(0, maxCapacity - takenSlots);
      return NextResponse.json({
        error: `Capacity exceeded: Tournament has only ${remainingSlots} slot(s) available, but this batch contains ${sanitizedStudents.length} student(s).`,
      }, { status: 400 });
    }

    // 4. Duplicate Check Against Existing Tournament Registrations
    if (activeRegs && activeRegs.length > 0) {
      for (const student of sanitizedStudents) {
        const existing = activeRegs.find(r => {
          const matchName = r.player_name?.trim().toLowerCase() === student.fullName.toLowerCase();
          const matchDob = r.date_of_birth === student.dob;
          const matchFide = student.fideId && student.fideId !== '00' && r.fide_id === student.fideId;
          return (matchName && matchDob) || matchFide;
        });

        if (existing) {
          return NextResponse.json({
            error: `Player "${student.fullName}" (DOB: ${student.dob}) is already registered for this tournament.`,
          }, { status: 400 });
        }
      }
    }

    // 5. Fee Calculation
    const baseFee = parseFloat(tournament.entry_fee) || 0;
    let grandTotal = 0;

    sanitizedStudents.forEach(s => {
      const isPwd = s.category.toLowerCase().includes('pwd') || s.category.toLowerCase().includes('dap');
      s.amount = isPwd ? 0 : baseFee;
      grandTotal += s.amount;
    });

    const isEntireBatchFree = grandTotal === 0;
    const batchId = `BATCH-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // 6. Database Records Insertion
    const recordsToInsert = sanitizedStudents.map(s => {
      const freeTicket = isEntireBatchFree ? `JUM-TKT-FREE-${Math.random().toString(36).substring(2, 8).toUpperCase()}` : null;
      return {
        tournament_id: tournamentId,
        player_name: s.fullName,
        first_name: s.firstName,
        last_name: s.lastName,
        email: email.trim(),
        gender: s.gender,
        country: 'Kenya',
        date_of_birth: s.dob,
        age: s.age,
        school: schoolName.trim(),
        category: s.category,
        fide_id: s.fideId,
        phone_number: phoneNumber.trim(),
        accompanying_person: patronName.trim(),
        consent_given: consentGiven || true,
        amount: s.amount,
        payment_status: isEntireBatchFree ? 'completed' : 'pending',
        ticket_number: freeTicket,
      };
    });

    const { data: insertedRecords, error: insertError } = await supabaseAdmin
      .from('registrations')
      .insert(recordsToInsert)
      .select('id, player_name, category, ticket_number');

    if (insertError || !insertedRecords) {
      console.error('[Batch Register] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to record batch registrations in database.' }, { status: 500 });
    }

    // 7A. If Entire Batch is Free
    if (isEntireBatchFree) {
      sendBulkRegistrationConfirmation(email.trim(), {
        schoolName: schoolName.trim(),
        patronName: patronName.trim(),
        tournamentName: tournament.name,
        totalAmount: 0,
        studentsCount: insertedRecords.length,
        checkoutRequestId: batchId,
        students: insertedRecords.map(r => ({
          name: r.player_name,
          category: r.category,
          ticketNumber: r.ticket_number || '',
        })),
      }).catch(err => console.error('[Email Error] Batch free confirmation:', err));

      return NextResponse.json({
        success: true,
        isFree: true,
        batchId,
        studentsCount: insertedRecords.length,
        totalAmount: 0,
        message: 'Free school registration completed successfully.',
      });
    }

    // 7B. Trigger M-Pesa STK Push for Grand Total
    const insertedIds = insertedRecords.map(r => r.id);

    try {
      const stkResult = await initiateStkPush(
        phoneNumber.trim(),
        grandTotal,
        batchId.substring(0, 12),
        `Bulk: ${tournament.name.substring(0, 10)}`
      );

      // Associate checkout_request_id with all batch records atomically
      const { error: updateError } = await supabaseAdmin
        .from('registrations')
        .update({ checkout_request_id: stkResult.checkoutRequestId })
        .in('id', insertedIds);

      if (updateError) {
        console.error('[Batch Register] Failed to attach checkoutRequestId:', updateError);
      }

      return NextResponse.json({
        success: true,
        checkoutRequestId: stkResult.checkoutRequestId,
        batchId,
        totalAmount: grandTotal,
        studentsCount: insertedRecords.length,
        message: 'M-Pesa STK push initiated successfully.',
      });
    } catch (stkError: any) {
      console.error('[Batch Register] STK push error:', stkError);
      // Mark held slots as failed so they don't block other users
      await supabaseAdmin
        .from('registrations')
        .update({ payment_status: 'failed' })
        .in('id', insertedIds);

      return NextResponse.json({
        success: false,
        error: stkError.message || 'Failed to initiate M-Pesa payment prompt on your phone.',
      }, { status: 400 });
    }
  } catch (err: any) {
    console.error('[Batch Register Exception]:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error.' }, { status: 500 });
  }
}
