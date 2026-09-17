import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// GET /api/registrations/batch/[id]
// Fetches all registrations associated with a batch checkoutRequestId, batch reference, or registration id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Batch ID is required' }, { status: 400 });
    }

    // Query registrations where checkout_request_id matches id, or single id matches
    let { data: registrations, error } = await supabaseAdmin
      .from('registrations')
      .select('*, tournaments(id, name, event_date, venue, entry_fee)')
      .or(`checkout_request_id.eq.${id},id.eq.${id}`)
      .order('created_at', { ascending: true });

    // Fallback: If not found and id starts with JUM-TKT-
    if ((!registrations || registrations.length === 0) && id.startsWith('JUM-TKT-')) {
      const singleRes = await supabaseAdmin
        .from('registrations')
        .select('*, tournaments(id, name, event_date, venue, entry_fee)')
        .eq('ticket_number', id)
        .maybeSingle();

      if (singleRes.data) {
        // If single registration found, also check if it shares checkout_request_id with others
        if (singleRes.data.checkout_request_id) {
          const batchRes = await supabaseAdmin
            .from('registrations')
            .select('*, tournaments(id, name, event_date, venue, entry_fee)')
            .eq('checkout_request_id', singleRes.data.checkout_request_id)
            .order('created_at', { ascending: true });

          registrations = batchRes.data || [singleRes.data];
        } else {
          registrations = [singleRes.data];
        }
      }
    }

    if (error || !registrations || registrations.length === 0) {
      return NextResponse.json({ success: false, error: 'Batch registration not found' }, { status: 404 });
    }

    const first = registrations[0];
    const tournament = first.tournaments || {
      id: first.tournament_id,
      name: 'Chess Tournament',
      event_date: '',
      venue: 'TBD',
      entry_fee: 0,
    };

    const totalAmount = registrations.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

    const students = registrations.map(r => ({
      id: r.id,
      playerName: r.player_name,
      firstName: r.first_name || r.player_name?.split(' ')[0] || '',
      lastName: r.last_name || r.player_name?.split(' ').slice(1).join(' ') || '',
      gender: r.gender || 'N/A',
      dob: r.date_of_birth || '',
      age: r.age || 0,
      category: r.category,
      fideId: r.fide_id || '00',
      ticketNumber: r.ticket_number || `JUM-TKT-${r.id.substring(0, 6).toUpperCase()}`,
      amount: parseFloat(r.amount) || 0,
      paymentStatus: r.payment_status,
    }));

    return NextResponse.json({
      success: true,
      data: {
        batchId: id,
        schoolName: first.school || 'School / Club',
        patronName: first.accompanying_person || 'Coordinator',
        coordinatorEmail: first.email || '',
        coordinatorPhone: first.phone_number || '',
        mpesaReceipt: first.mpesa_receipt || 'M-PESA CONFIRMED',
        paymentStatus: first.payment_status || 'completed',
        createdAt: first.created_at,
        tournament: {
          id: tournament.id,
          name: tournament.name,
          eventDate: tournament.event_date,
          venue: tournament.venue,
        },
        totalAmount,
        studentsCount: registrations.length,
        students,
      },
    });
  } catch (err: any) {
    console.error('[Batch Registrations GET Error]:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}
