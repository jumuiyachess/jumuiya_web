import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// GET /api/mpesa/status/:checkoutRequestId
export async function GET(request: NextRequest, { params }: { params: Promise<{ checkoutRequestId: string }> }) {
  try {
    const checkoutRequestId = (await params).checkoutRequestId;
    
    if (!checkoutRequestId) {
      return NextResponse.json({ error: 'Checkout request ID is required' }, { status: 400 });
    }

    const { data: registrations } = await supabaseAdmin
      .from('registrations')
      .select('*, tournaments(name)')
      .eq('checkout_request_id', checkoutRequestId);

    if (registrations && registrations.length > 0) {
      if (registrations.length === 1) {
        const registration = registrations[0];
        return NextResponse.json({
          success: true,
          type: 'registration',
          isBatch: false,
          paymentStatus: registration.payment_status,
          mpesaReceipt: registration.mpesa_receipt,
          registration: {
            playerName: registration.player_name,
            category: registration.category,
            fideId: registration.fide_id || '00',
            tournamentName: registration.tournaments?.name || 'Tournament',
            amount: registration.amount,
            id: registration.id,
            ticket_number: registration.ticket_number
          }
        });
      }

      // Batch registration response
      const totalAmount = registrations.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
      return NextResponse.json({
        success: true,
        type: 'registration',
        isBatch: true,
        paymentStatus: registrations[0].payment_status,
        mpesaReceipt: registrations[0].mpesa_receipt,
        schoolName: registrations[0].school,
        patronName: registrations[0].accompanying_person,
        tournamentName: registrations[0].tournaments?.name || 'Tournament',
        totalAmount,
        studentsCount: registrations.length,
        students: registrations.map(r => ({
          id: r.id,
          playerName: r.player_name,
          category: r.category,
          fideId: r.fide_id || '00',
          ticketNumber: r.ticket_number
        }))
      });
    }

    const { data: order } = await supabaseAdmin
      .from('shop_orders')
      .select('*')
      .eq('checkout_request_id', checkoutRequestId)
      .maybeSingle();

    if (order) {
      return NextResponse.json({
        success: true,
        type: 'order',
        paymentStatus: order.payment_status,
        mpesaReceipt: order.mpesa_receipt,
        order
      });
    }

    return NextResponse.json({ success: true, paymentStatus: 'pending' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
