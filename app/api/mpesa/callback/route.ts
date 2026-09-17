import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendRegistrationConfirmation, sendBulkRegistrationConfirmation, notifyAdminOfRegistration, sendDonationReceipt, notifyAdminOfDonation, sendOrderReceipt, notifyAdminOfOrder } from '@/lib/email';

// POST /api/mpesa/callback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { Body } = body;
    if (!Body || !Body.stkCallback) {
      return NextResponse.json({ error: 'Invalid callback body structure' }, { status: 400 });
    }

    const { CheckoutRequestID, ResultCode, CallbackMetadata } = Body.stkCallback;

    let mpesaReceipt = '';
    if (ResultCode === 0 && CallbackMetadata && CallbackMetadata.Item) {
      const receiptItem = CallbackMetadata.Item.find((item: any) => item.Name === 'MpesaReceiptNumber');
      if (receiptItem) {
        mpesaReceipt = receiptItem.Value;
      }
    } else if (ResultCode === 1032) {
      console.log(`[M-PESA] Transaction ${CheckoutRequestID} was cancelled by the user.`);
    }

    const paymentStatus = ResultCode === 0 ? 'completed' : 'failed';

    // Query all registrations matching this CheckoutRequestID (supports both single & batch)
    const { data: registrations } = await supabaseAdmin
      .from('registrations')
      .select('*, tournaments(name)')
      .eq('checkout_request_id', CheckoutRequestID);

    if (registrations && registrations.length > 0) {
      // 1. Strict Idempotency Check
      const alreadyCompleted = registrations.some(r => r.payment_status === 'completed');
      if (alreadyCompleted) {
        console.log(`[M-PESA] Registration(s) for ${CheckoutRequestID} already processed. Ignoring duplicate callback.`);
        return NextResponse.json({ success: true, message: 'Already processed' });
      }

      // 2. Single Individual Registration Flow
      if (registrations.length === 1) {
        const registration = registrations[0];
        let ticketNumber = null;
        if (ResultCode === 0) {
          ticketNumber = `JUM-TKT-${registration.id.substring(0, 6).toUpperCase()}`;
        }

        await supabaseAdmin.from('registrations').update({ 
          payment_status: paymentStatus, 
          mpesa_receipt: mpesaReceipt,
          ticket_number: ticketNumber 
        }).eq('id', registration.id);

        if (ResultCode === 0 && ticketNumber) {
          if (registration.email) {
            await sendRegistrationConfirmation(registration.email, {
              playerName: registration.player_name,
              tournamentName: registration.tournaments?.name || 'Tournament',
              amount: parseFloat(registration.amount),
              category: registration.category,
              ticketNumber: ticketNumber
            });
          }
          await notifyAdminOfRegistration({
            playerName: registration.player_name,
            tournamentName: registration.tournaments?.name || 'Tournament',
            amount: parseFloat(registration.amount),
            ticketNumber: ticketNumber,
            category: registration.category,
            gender: registration.gender,
            fideId: registration.fide_id,
            phone: registration.phone_number,
            age: registration.date_of_birth ? new Date().getFullYear() - new Date(registration.date_of_birth).getFullYear() : undefined,
            mpesaReceipt: mpesaReceipt
          });
        }
        return NextResponse.json({ success: true, type: 'registration' });
      }

      // 3. Multi-Student Batch Registration Flow
      if (ResultCode === 0) {
        const studentConfirmations: { name: string; category: string; ticketNumber: string }[] = [];
        let totalBatchAmount = 0;

        for (const reg of registrations) {
          const ticketNumber = `JUM-TKT-${reg.id.substring(0, 6).toUpperCase()}`;
          totalBatchAmount += parseFloat(reg.amount) || 0;
          studentConfirmations.push({
            name: reg.player_name,
            category: reg.category,
            ticketNumber,
          });

          await supabaseAdmin.from('registrations').update({
            payment_status: 'completed',
            mpesa_receipt: mpesaReceipt,
            ticket_number: ticketNumber,
          }).eq('id', reg.id);
        }

        const coordinatorEmail = registrations[0].email;
        const schoolName = registrations[0].school || 'School Group';
        const patronName = registrations[0].accompanying_person || 'Coordinator';
        const tournamentName = registrations[0].tournaments?.name || 'Tournament';

        if (coordinatorEmail) {
          await sendBulkRegistrationConfirmation(coordinatorEmail, {
            schoolName,
            patronName,
            tournamentName,
            totalAmount: totalBatchAmount,
            studentsCount: registrations.length,
            checkoutRequestId: CheckoutRequestID,
            mpesaReceipt,
            students: studentConfirmations,
          }).catch(err => console.error('[Email Error] Batch confirmation:', err));
        }

        await notifyAdminOfRegistration({
          playerName: `${patronName} (${schoolName} - ${registrations.length} students)`,
          tournamentName,
          amount: totalBatchAmount,
          ticketNumber: `BATCH-${registrations.length}-TIX`,
          category: 'School Bulk Entry',
          phone: registrations[0].phone_number,
          mpesaReceipt,
        }).catch(err => console.error('[Admin Email Error] Bulk registration:', err));

        return NextResponse.json({ success: true, type: 'bulk_registration', count: registrations.length });
      } else {
        const regIds = registrations.map(r => r.id);
        await supabaseAdmin.from('registrations').update({
          payment_status: 'failed',
        }).in('id', regIds);

        return NextResponse.json({ success: true, type: 'bulk_registration_failed' });
      }
    }

    const { data: order } = await supabaseAdmin.from('shop_orders').select('*').eq('checkout_request_id', CheckoutRequestID).single();
    if (order) {
      if (order.payment_status === 'completed') {
        console.log(`[M-PESA] Shop order ${order.id} is already marked as completed. Ignoring duplicate callback.`);
        return NextResponse.json({ success: true, message: 'Already processed' });
      }

      await supabaseAdmin.from('shop_orders').update({ payment_status: paymentStatus, mpesa_receipt: mpesaReceipt }).eq('id', order.id);

      if (ResultCode === 0) {
        if (order.email) {
          await sendOrderReceipt(order.email, {
            customerName: order.customer_name,
            amount: parseFloat(order.amount),
            receipt: mpesaReceipt,
            items: order.items || [],
            address: order.shipping_address
          });
        }
        await notifyAdminOfOrder({
          customerName: order.customer_name,
          email: order.email || '',
          phone: order.phone_number,
          amount: parseFloat(order.amount),
          receipt: mpesaReceipt,
          items: order.items || [],
          address: `${order.shipping_address}, ${order.city}`
        });
      }

      return NextResponse.json({ success: true, type: 'order' });
    }
    const { data: donation } = await supabaseAdmin.from('donations').select('*').eq('checkout_request_id', CheckoutRequestID).single();
    if (donation) {
      if (donation.payment_status === 'completed') {
        console.log(`[M-PESA] Donation ${donation.id} is already marked as completed.`);
        return NextResponse.json({ success: true, message: 'Already processed' });
      }

      await supabaseAdmin.from('donations').update({ payment_status: paymentStatus, mpesa_receipt: mpesaReceipt }).eq('id', donation.id);

      if (ResultCode === 0) {
        if (donation.email) {
          await sendDonationReceipt(donation.email, {
            donorName: donation.donor_name || 'Supporter',
            amount: parseFloat(donation.amount),
            receipt: mpesaReceipt
          });
        }
        await notifyAdminOfDonation({
          donorName: donation.donor_name || 'Anonymous',
          amount: parseFloat(donation.amount),
          receipt: mpesaReceipt,
          message: donation.donor_message || ''
        });
      }
      return NextResponse.json({ success: true, type: 'donation' });
    }

    return NextResponse.json({ success: false, message: 'No matching transaction record found' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
