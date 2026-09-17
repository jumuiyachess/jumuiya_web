import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { initiateStkPush } from '@/lib/mpesa';
import { sendRegistrationConfirmation } from '@/lib/email';

// POST /api/mpesa/register
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      tournamentId, 
      playerName, 
      surname,
      otherNames,
      email, 
      gender,
      country,
      dob,
      age, 
      school, 
      category, 
      fideId,
      phoneNumber, 
      accompanyingPerson,
      consentGiven,
      amount 
    } = body;

    let parsedAge = age !== undefined && age !== null ? parseInt(age.toString(), 10) : 0;
    if ((!parsedAge || isNaN(parsedAge) || parsedAge === 0) && dob) {
      const birthDate = new Date(dob);
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        let computed = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          computed--;
        }
        parsedAge = computed >= 0 ? computed : 0;
      }
    }
    const parsedAmount = amount !== undefined && amount !== null ? parseFloat(amount.toString()) : 0;
    
    // First, let's establish first_name and last_name
    const first_name = surname || playerName?.split(' ')[0] || '';
    const last_name = otherNames || (playerName ? playerName.substring(first_name.length).trim() : '');
    const full_player_name = playerName || `${first_name} ${last_name}`.trim();

    if (!tournamentId || !full_player_name || !category || !phoneNumber) {
      return NextResponse.json({ error: 'Missing required registration details' }, { status: 400 });
    }

    // Capacity Check
    const { data: tournament, error: tourneyError } = await supabaseAdmin
      .from('tournaments')
      .select('name, max_participants')
      .eq('id', tournamentId)
      .single();

    if (tourneyError || !tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const { count, error: countError } = await supabaseAdmin
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId)
      .in('payment_status', ['completed', 'pending']);

    if (!countError && tournament.max_participants && (count || 0) >= tournament.max_participants) {
      return NextResponse.json({ error: 'Sorry, this tournament has reached its maximum capacity.' }, { status: 400 });
    }

    const isFree = parsedAmount === 0;

    const { data: registration, error: regError } = await supabaseAdmin
      .from('registrations')
      .insert([{
        tournament_id: tournamentId,
        player_name: full_player_name,
        first_name: first_name,
        last_name: last_name,
        email,
        gender,
        country: country || 'Kenya',
        date_of_birth: dob || null,
        fide_id: fideId,
        age: parsedAge,
        school,
        category,
        phone_number: phoneNumber,
        accompanying_person: accompanyingPerson,
        consent_given: consentGiven || false,
        amount: parsedAmount,
        payment_status: isFree ? 'completed' : 'pending',
        ticket_number: isFree ? `JUM-TKT-FREE-${Math.random().toString(36).substring(2, 6).toUpperCase()}` : null
      }])
      .select()
      .single();

    if (regError) throw regError;

    const tournamentName = tournament.name;

    if (isFree) {
      if (email) {
        sendRegistrationConfirmation(email, {
          playerName: full_player_name,
          tournamentName,
          amount: 0,
          category,
          ticketNumber: registration.ticket_number
        }).catch((err) => console.error('Email error:', err));
      }
      return NextResponse.json({ 
        success: true, 
        message: 'Free registration completed successfully.',
        ticketNumber: registration.ticket_number,
        registrationId: registration.id
      });
    }

    try {
      const stkResult = await initiateStkPush(
        phoneNumber,
        parsedAmount,
        `REG-${registration.id.substring(0, 5)}`,
        `Reg: ${tournamentName.substring(0, 15)}`
      );

      await supabaseAdmin
        .from('registrations')
        .update({ checkout_request_id: stkResult.checkoutRequestId })
        .eq('id', registration.id);

      return NextResponse.json({
        success: true,
        message: 'STK push initiated successfully.',
        checkoutRequestId: stkResult.checkoutRequestId,
        registrationId: registration.id
      });
    } catch (stkError: any) {
      await supabaseAdmin.from('registrations').update({ payment_status: 'failed' }).eq('id', registration.id);
      return NextResponse.json({ success: false, error: stkError.message }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
