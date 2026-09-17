import { Resend } from 'resend';
import { supabaseAdmin } from './supabase/admin';
// import nodemailer from 'nodemailer'; // Nodemailer requires 'net' which is sometimes problematic on Edge runtime depending on NextJS config. We'll stick to Resend.

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Jumuiya Chess <info@jumuiyachess.org>';
const resend = RESEND_API_KEY && RESEND_API_KEY !== 're_mock' ? new Resend(RESEND_API_KEY) : null;

async function getOrgEmail() {
  try {
    const { data } = await supabaseAdmin.from('site_settings').select('org_email').single();
    if (data && data.org_email) return data.org_email;
  } catch (err) { }
  return 'info@jumuiyachess.org';
}

async function getAdminEmails() {
  const orgEmail = await getOrgEmail();
  const emails = [
    process.env.ADMIN_NOTIFICATION_EMAIL || orgEmail,
    process.env.BACKUP_ADMIN_EMAIL
  ];
  return Array.from(new Set(emails.filter(e => Boolean(e))));
}

export const sendRegistrationConfirmation = async (
  email: string,
  details: { playerName: string; tournamentName: string; amount: number; category: string; ticketNumber: string }
): Promise<void> => {
  const subject = `Registration Confirmed: ${details.tournamentName}`;
  const ticketUrl = `https://jumuiyachess.org/tickets/${details.ticketNumber}`;
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 8px; color: #111827; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #6B4A34; margin: 0; font-size: 28px;">Jumuiya Chess</h1>
        <p style="color: #4b5563; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Official Event Ticket</p>
      </div>
      
      <p style="font-size: 16px;">Hello <strong>${details.playerName}</strong>,</p>
      <p style="font-size: 16px; line-height: 1.5;">Your registration for <strong>${details.tournamentName}</strong> has been successfully received and confirmed!</p>
      
      <div style="background-color: #FAF7F2; padding: 20px; border-radius: 8px; margin: 30px 0; border: 1px solid #e5e7eb;">
        <p style="margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; color: #6B4A34; font-weight: bold;">Ticket Information</p>
        <table style="width: 100%; font-size: 14px;">
          <tr>
            <td style="padding: 4px 0; color: #4b5563;">Player Name:</td>
            <td style="padding: 4px 0; font-weight: bold; text-align: right;">${details.playerName}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #4b5563;">Category:</td>
            <td style="padding: 4px 0; font-weight: bold; text-align: right;">${details.category}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #4b5563;">Ticket Number:</td>
            <td style="padding: 4px 0; font-weight: bold; text-align: right; font-family: monospace; font-size: 16px;">${details.ticketNumber}</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin: 40px 0;">
        <a href="${ticketUrl}" style="background-color: #232320; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
          Download Your PDF Ticket
        </a>
        <p style="font-size: 12px; color: #6b7280; margin-top: 15px;">Please download and present this ticket at the venue.</p>
      </div>
      
      <p style="font-size: 14px; line-height: 1.5;">We look forward to seeing you at the tournament!</p>
      
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
      <p style="font-size: 12px; color: #9ca3af; text-align: center;">This is an automated email from Jumuiya Chess.</p>
    </div>
  `;

  if (resend) {
    try {
      await resend.emails.send({
        from: RESEND_FROM_EMAIL,
        to: email,
        subject,
        html,
      });
      console.log(`[Resend] Registration confirmation email sent to ${email}`);
      return;
    } catch (error) {
      console.error('[Resend Error] Failed to send registration email:', error);
    }
  }

  console.log(`[EMAIL MOCK] Registration confirmation to ${email}:\nSubject: ${subject}`);
};

export const sendBulkRegistrationConfirmation = async (
  email: string,
  details: {
    schoolName: string;
    patronName: string;
    tournamentName: string;
    totalAmount: number;
    studentsCount: number;
    checkoutRequestId: string;
    mpesaReceipt?: string;
    students: { name: string; category: string; ticketNumber: string }[];
  }
): Promise<void> => {
  const subject = `Bulk Registration Confirmed: ${details.schoolName} - ${details.tournamentName}`;
  const rosterUrl = `https://jumuiyachess.org/tickets/batch/${details.checkoutRequestId}`;

  const studentRowsHtml = details.students.map((s, idx) => `
    <tr>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">${idx + 1}</td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; font-weight: 600; font-size: 13px;">${s.name}</td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">${s.category}</td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-size: 13px; font-weight: bold; color: #6B4A34;">${s.ticketNumber}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: sans-serif; max-width: 650px; margin: auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 8px; color: #111827; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="color: #6B4A34; margin: 0; font-size: 26px;">Jumuiya Chess</h1>
        <p style="color: #4b5563; font-size: 13px; text-transform: uppercase; letter-spacing: 2px;">Official School & Group Registration Pass</p>
      </div>

      <p style="font-size: 16px;">Hello <strong>${details.patronName}</strong> (${details.schoolName}),</p>
      <p style="font-size: 15px; line-height: 1.5;">Your bulk registration for <strong>${details.tournamentName}</strong> has been successfully confirmed!</p>

      <div style="background-color: #FAF7F2; padding: 18px; border-radius: 8px; margin: 25px 0; border: 1px solid #e5e7eb;">
        <p style="margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; color: #6B4A34; font-weight: bold;">Group Order Summary</p>
        <table style="width: 100%; font-size: 14px;">
          <tr>
            <td style="padding: 4px 0; color: #4b5563;">School / Academy:</td>
            <td style="padding: 4px 0; font-weight: bold; text-align: right;">${details.schoolName}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #4b5563;">Total Students:</td>
            <td style="padding: 4px 0; font-weight: bold; text-align: right;">${details.studentsCount}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #4b5563;">Total Paid:</td>
            <td style="padding: 4px 0; font-weight: bold; text-align: right;">KES ${details.totalAmount.toLocaleString()}</td>
          </tr>
          ${details.mpesaReceipt ? `
          <tr>
            <td style="padding: 4px 0; color: #4b5563;">M-Pesa Receipt:</td>
            <td style="padding: 4px 0; font-weight: bold; text-align: right; font-family: monospace;">${details.mpesaReceipt}</td>
          </tr>` : ''}
        </table>
      </div>

      <h3 style="font-size: 15px; margin: 25px 0 10px 0; color: #232320;">Registered Student Roster</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
        <thead>
          <tr style="background-color: #f3f4f6; text-align: left;">
            <th style="padding: 8px 10px; font-size: 12px; color: #4b5563;">#</th>
            <th style="padding: 8px 10px; font-size: 12px; color: #4b5563;">Player Name</th>
            <th style="padding: 8px 10px; font-size: 12px; color: #4b5563;">Category</th>
            <th style="padding: 8px 10px; font-size: 12px; color: #4b5563;">Ticket Code</th>
          </tr>
        </thead>
        <tbody>
          ${studentRowsHtml}
        </tbody>
      </table>

      <div style="text-align: center; margin: 35px 0;">
        <a href="${rosterUrl}" style="background-color: #232320; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block;">
          Download Printable Group Roster
        </a>
      </div>

      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
      <p style="font-size: 12px; color: #9ca3af; text-align: center;">This is an automated confirmation from Jumuiya Chess.</p>
    </div>
  `;

  if (resend) {
    try {
      await resend.emails.send({
        from: RESEND_FROM_EMAIL,
        to: email,
        subject,
        html,
      });
      console.log(`[Resend] Bulk registration confirmation sent to ${email}`);
      return;
    } catch (error) {
      console.error('[Resend Error] Failed to send bulk registration email:', error);
    }
  }

  console.log(`[EMAIL MOCK] Bulk registration confirmation to ${email}:\nSubject: ${subject}`);
};

export const notifyAdminOfRegistration = async (
  details: { 
    playerName: string; 
    tournamentName: string; 
    amount: number; 
    ticketNumber: string;
    category?: string;
    gender?: string;
    fideId?: string;
    phone?: string;
    mpesaReceipt?: string;
    age?: number;
  }
): Promise<void> => {
  const recipients = await getAdminEmails();

  const subject = `INTERNAL ALERT: New Registration - ${details.tournamentName}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 8px; color: #111827; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #6B4A34; padding-bottom: 20px;">
        <h1 style="color: #6B4A34; margin: 0; font-size: 24px;">Jumuiya Chess Administration</h1>
        <p style="color: #ef4444; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-top: 8px;">Internal Administrative Alert</p>
      </div>
      
      <p style="font-size: 15px; line-height: 1.5; color: #374151;">
        <strong>Executive Summary:</strong> A new player, <strong>${details.playerName}</strong>, has successfully registered and paid for the <strong>${details.tournamentName}</strong> tournament.
      </p>
      
      <div style="background-color: #FAF7F2; border-radius: 6px; margin: 25px 0; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background-color: #6B4A34; color: white; padding: 12px 15px; font-weight: bold; font-size: 14px; text-transform: uppercase;">Player Demographics</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; color: #4b5563; width: 40%;">Full Name</td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #111827;">${details.playerName}</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">Category</td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #111827;">${details.category || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">Gender / Age</td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #111827;">${details.gender || 'N/A'} ${details.age ? `(Age: ${details.age})` : ''}</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">FIDE ID</td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #111827;">${details.fideId || 'None'}</td>
          </tr>
          <tr>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">Contact Phone</td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #111827;">${details.phone || 'N/A'}</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #FAF7F2; border-radius: 6px; margin: 25px 0; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background-color: #6B4A34; color: white; padding: 12px 15px; font-weight: bold; font-size: 14px; text-transform: uppercase;">Financial & Logistics</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; color: #4b5563; width: 40%;">Amount Paid</td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #059669;">KES ${details.amount.toLocaleString()}</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">M-Pesa Receipt</td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #111827; font-family: monospace;">${details.mpesaReceipt || 'Pending'}</td>
          </tr>
          <tr>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">Ticket Number</td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #111827; font-family: monospace;">${details.ticketNumber}</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; text-align: center; margin-top: 30px;">
        <p style="margin: 0; font-size: 12px; color: #6b7280;">System Timestamp: ${new Date().toISOString()}</p>
      </div>
    </div>
  `;

  if (resend) {
    try {
      await resend.emails.send({ from: RESEND_FROM_EMAIL, to: recipients, subject, html });
      return;
    } catch (error) {
      console.error('[Resend Error] Failed to notify admin of registration:', error);
    }
  }
  console.log(`[EMAIL MOCK] Admin notified of registration: ${details.ticketNumber} to ${recipients.join(', ')}`);
};

export const sendContactNotification = async (
  senderName: string,
  senderEmail: string,
  message: string
): Promise<void> => {
  const subject = `INTERNAL ALERT: New Contact Inquiry from ${senderName}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 8px; color: #111827; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #6B4A34; padding-bottom: 20px;">
        <h1 style="color: #6B4A34; margin: 0; font-size: 24px;">Jumuiya Chess Administration</h1>
        <p style="color: #ef4444; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-top: 8px;">Support Ticket Alert</p>
      </div>
      
      <p style="font-size: 15px; line-height: 1.5; color: #374151;">
        <strong>Executive Summary:</strong> A new contact inquiry has been submitted by <strong>${senderName}</strong> via the storefront.
      </p>
      
      <div style="background-color: #FAF7F2; border-radius: 6px; margin: 25px 0; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background-color: #6B4A34; color: white; padding: 12px 15px; font-weight: bold; font-size: 14px; text-transform: uppercase;">Sender Details</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; color: #4b5563; width: 30%;">Name</td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #111827;">${senderName}</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">Email Address</td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #0284c7;"><a href="mailto:${senderEmail}">${senderEmail}</a></td>
          </tr>
        </table>
      </div>

      <div style="margin: 25px 0;">
        <h3 style="color: #6B4A34; font-size: 14px; text-transform: uppercase; margin-bottom: 10px;">Inquiry Message:</h3>
        <div style="background-color: #f9fafb; padding: 20px; border-left: 4px solid #6B4A34; border-radius: 0 6px 6px 0; font-size: 15px; line-height: 1.6; color: #1f2937; white-space: pre-wrap;">${message}</div>
      </div>

      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; text-align: center; margin-top: 30px;">
        <p style="margin: 0; font-size: 12px; color: #6b7280;">System Timestamp: ${new Date().toISOString()}</p>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #6b7280;">Reply directly to this email to respond to the sender.</p>
      </div>
    </div>
  `;

  const recipients = await getAdminEmails();

  if (resend) {
    try {
      await resend.emails.send({
        from: RESEND_FROM_EMAIL,
        reply_to: senderEmail,
        to: recipients,
        subject,
        html,
      });
      console.log(`[Resend Email] Contact notification sent to admin inboxes: ${recipients.join(', ')}`);
      return;
    } catch (error) {
      console.error('[Resend Error] Failed sending contact notification email:', error);
    }
  }

  console.log(`[EMAIL MOCK] Notification for admin (${recipients.join(', ')}):\nSender: ${senderName} (${senderEmail})\nSubject: ${subject}\nMessage: ${message}`);
};

export const sendDonationReceipt = async (
  email: string,
  details: { donorName: string; amount: number; receipt: string }
): Promise<void> => {
  const subject = `Thank You for Your Donation! Receipt: ${details.receipt}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 8px; color: #111827;">
      <h1 style="color: #6B4A34; margin-top: 0;">Jumuiya Chess</h1>
      <p style="color: #4b5563; font-size: 14px;">Official Donation Receipt</p>
      
      <p>Hello <strong>${details.donorName || 'Awesome Supporter'}</strong>,</p>
      <p>Thank you so much for your generous donation! Your contribution directly supports our mission to empower communities through chess.</p>
      
      <table style="width: 100%; margin: 30px 0; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Description</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-200">
            <td style="padding: 10px; border-bottom: 1px solid #eee;">General Donation (M-Pesa STK)</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">KES ${details.amount.toLocaleString()}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td style="padding: 10px; text-align: right; font-weight: bold;">Total Contribution</td>
            <td style="padding: 10px; text-align: right; font-weight: bold; color: #6B4A34;">KES ${details.amount.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>

      <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; font-size: 14px;">
        <p style="margin: 0 0 5px 0;"><strong>Donation Reference:</strong> ${details.receipt}</p>
        <p style="margin: 0;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      </div>

      <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
      <p style="font-size: 12px; color: #9ca3af; text-align: center;">
        This is an automated receipt from Jumuiya Chess. If you have any questions, please contact us at ${await getOrgEmail()}.
      </p>
    </div>
  `;

  if (resend) {
    try {
      await resend.emails.send({
        from: RESEND_FROM_EMAIL,
        to: email,
        subject,
        html,
      });
      console.log(`[Resend] Donation receipt sent to ${email}`);
      return;
    } catch (error) {
      console.error('[Resend Error] Failed to send donation receipt:', error);
    }
  }
  console.log(`[EMAIL MOCK] Donation receipt to ${email}`);
};

export const notifyAdminOfDonation = async (
  details: { donorName: string; amount: number; receipt: string; message: string }
): Promise<void> => {
  const recipients = await getAdminEmails();

  const subject = `INTERNAL ALERT: New Donation Received - KES ${details.amount.toLocaleString()}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 8px; color: #111827; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #6B4A34; padding-bottom: 20px;">
        <h1 style="color: #6B4A34; margin: 0; font-size: 24px;">Jumuiya Chess Administration</h1>
        <p style="color: #ef4444; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-top: 8px;">Finance & Donation Alert</p>
      </div>
      
      <p style="font-size: 15px; line-height: 1.5; color: #374151;">
        <strong>Executive Summary:</strong> A new donation of <strong>KES ${details.amount.toLocaleString()}</strong> has been successfully received from <strong>${details.donorName || 'an anonymous supporter'}</strong>.
      </p>
      
      <div style="background-color: #FAF7F2; border-radius: 6px; margin: 25px 0; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background-color: #6B4A34; color: white; padding: 12px 15px; font-weight: bold; font-size: 14px; text-transform: uppercase;">Transaction Details</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; color: #4b5563; width: 40%;">Donor Name</td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #111827;">${details.donorName || 'Anonymous'}</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">Donation Amount</td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #059669;">KES ${details.amount.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">M-Pesa Reference</td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #111827; font-family: monospace;">${details.receipt}</td>
          </tr>
        </table>
      </div>

      ${details.message ? `
      <div style="margin: 25px 0;">
        <h3 style="color: #6B4A34; font-size: 14px; text-transform: uppercase; margin-bottom: 10px;">Accompanying Message:</h3>
        <div style="background-color: #f9fafb; padding: 20px; border-left: 4px solid #6B4A34; border-radius: 0 6px 6px 0; font-size: 15px; line-height: 1.6; color: #1f2937; font-style: italic;">"${details.message}"</div>
      </div>
      ` : ''}

      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; text-align: center; margin-top: 30px;">
        <p style="margin: 0; font-size: 12px; color: #6b7280;">System Timestamp: ${new Date().toISOString()}</p>
      </div>
    </div>
  `;

  if (resend) {
    try {
      await resend.emails.send({
        from: RESEND_FROM_EMAIL,
        to: recipients,
        subject,
        html,
      });
      return;
    } catch (error) {
      console.error('[Resend Error] Failed to notify admin of donation:', error);
    }
  }
  console.log(`[EMAIL MOCK] Admin notified of donation: ${details.receipt} to ${recipients.join(', ')}`);
};

export const sendOrderReceipt = async (
  email: string,
  details: { customerName: string; amount: number; receipt: string; items: any[], address: string }
): Promise<void> => {
  const subject = `Order Confirmed: ${details.receipt}`;
  
  const itemsHtml = details.items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">KES ${item.price.toLocaleString()}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 8px; color: #111827;">
      <h1 style="color: #6B4A34; margin-top: 0;">Jumuiya Chess</h1>
      <p style="color: #4b5563; font-size: 14px;">Official Store Receipt</p>
      
      <p>Hello <strong>${details.customerName}</strong>,</p>
      <p>Thank you for shopping with us! Your order has been confirmed and is being processed.</p>
      
      <table style="width: 100%; margin: 30px 0; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Item</th>
            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qty</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding: 10px; text-align: right; font-weight: bold;">Total Paid</td>
            <td style="padding: 10px; text-align: right; font-weight: bold; color: #6B4A34;">KES ${details.amount.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>

      <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; font-size: 14px;">
        <p style="margin: 0 0 5px 0;"><strong>Order Reference:</strong> ${details.receipt}</p>
        <p style="margin: 0;"><strong>Shipping To:</strong> ${details.address}</p>
      </div>

      <p style="font-size: 14px; margin-top: 30px;">
        You will receive another email as soon as your order has been shipped. 
      </p>

      <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
      <p style="font-size: 12px; color: #9ca3af; text-align: center;">
        This is an automated receipt from Jumuiya Chess. If you have any questions, please contact us at ${await getOrgEmail()}.
      </p>
    </div>
  `;

  if (resend) {
    try {
      await resend.emails.send({ from: RESEND_FROM_EMAIL, to: email, subject, html });
      console.log(`[Resend] Order receipt sent to ${email}`);
      return;
    } catch (error) {
      console.error('[Resend Error] Failed to send order receipt:', error);
    }
  }
  console.log(`[EMAIL MOCK] Order receipt to ${email}`);
};

export const notifyAdminOfOrder = async (
  details: { customerName: string; amount: number; receipt: string; items: any[], address: string, email: string, phone: string }
): Promise<void> => {
  const recipients = await getAdminEmails();

  const subject = `INTERNAL ALERT: New Store Order - KES ${details.amount.toLocaleString()}`;
  
  const itemsHtml = details.items.map(item => `
    <tr>
      <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; color: #111827;">${item.name}</td>
      <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; color: #4b5563; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; color: #111827; text-align: right;">KES ${(item.price * item.quantity).toLocaleString()}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 8px; color: #111827; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #6B4A34; padding-bottom: 20px;">
        <h1 style="color: #6B4A34; margin: 0; font-size: 24px;">Jumuiya Chess Administration</h1>
        <p style="color: #ef4444; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-top: 8px;">Logistics & Fulfillment Alert</p>
      </div>
      
      <p style="font-size: 15px; line-height: 1.5; color: #374151;">
        <strong>Executive Summary:</strong> A new store order totaling <strong>KES ${details.amount.toLocaleString()}</strong> has been successfully paid for by <strong>${details.customerName}</strong>.
      </p>
      
      <div style="background-color: #FAF7F2; border-radius: 6px; margin: 25px 0; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background-color: #6B4A34; color: white; padding: 12px 15px; font-weight: bold; font-size: 14px; text-transform: uppercase;">Customer & Shipping Details</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; color: #4b5563; width: 35%;">Customer Name</td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #111827;">${details.customerName}</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">Contact Phone</td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #111827;">${details.phone}</td>
          </tr>
          <tr>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">Email Address</td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #0284c7;"><a href="mailto:${details.email}">${details.email}</a></td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">Shipping Address</td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #111827;">${details.address}</td>
          </tr>
          <tr>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">M-Pesa Receipt</td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #111827; font-family: monospace;">${details.receipt}</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #FAF7F2; border-radius: 6px; margin: 25px 0; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background-color: #6B4A34; color: white; padding: 12px 15px; font-weight: bold; font-size: 14px; text-transform: uppercase;">Order Manifest</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 12px 15px; text-align: left; border-bottom: 1px solid #e5e7eb; color: #4b5563;">Item</th>
              <th style="padding: 12px 15px; text-align: center; border-bottom: 1px solid #e5e7eb; color: #4b5563;">Qty</th>
              <th style="padding: 12px 15px; text-align: right; border-bottom: 1px solid #e5e7eb; color: #4b5563;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr style="background-color: #f9fafb;">
              <td colspan="2" style="padding: 12px 15px; text-align: right; font-weight: bold; color: #4b5563; border-top: 2px solid #e5e7eb;">Total Paid</td>
              <td style="padding: 12px 15px; text-align: right; font-weight: bold; color: #059669; border-top: 2px solid #e5e7eb;">KES ${details.amount.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; text-align: center; margin-top: 30px;">
        <p style="margin: 0; font-size: 12px; color: #6b7280;">System Timestamp: ${new Date().toISOString()}</p>
      </div>
    </div>
  `;

  if (resend) {
    try {
      await resend.emails.send({ from: RESEND_FROM_EMAIL, to: recipients, subject, html });
      return;
    } catch (error) {
      console.error('[Resend Error] Failed to notify admin of order:', error);
    }
  }
  console.log(`[EMAIL MOCK] Admin notified of order: ${details.receipt} to ${recipients.join(', ')}`);
};

export const sendDeliveryStatusUpdate = async (
  email: string,
  details: { customerName: string; receipt: string; status: string; deliveryNotes?: string }
): Promise<void> => {
  let statusTitle = 'Update on Your Order';
  let statusMessage = `There is an update regarding your Jumuiya Chess order <strong>(${details.receipt})</strong>.`;

  switch(details.status) {
    case 'processing':
      statusTitle = 'Your Order is Being Processed';
      statusMessage = `Great news! We are currently processing your order <strong>(${details.receipt})</strong>.`;
      break;
    case 'shipped':
      statusTitle = 'Your Order Has Shipped!';
      statusMessage = `Your order <strong>(${details.receipt})</strong> has been marked as shipped and is currently on its way to you.`;
      break;
    case 'delivered':
      statusTitle = 'Your Order Has Been Delivered!';
      statusMessage = `Your order <strong>(${details.receipt})</strong> has been successfully delivered. We hope you enjoy it!`;
      break;
  }

  const subject = `${statusTitle} (${details.receipt})`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 8px; color: #111827;">
      <h1 style="color: #6B4A34; margin-top: 0;">Jumuiya Chess</h1>
      <p style="color: #4b5563; font-size: 14px;">Logistics Update</p>
      
      <p>Hello <strong>${details.customerName}</strong>,</p>
      <p>${statusMessage}</p>
      
      ${details.deliveryNotes ? `
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; font-size: 14px; margin-top: 20px; border-left: 4px solid #6B4A34;">
          <p style="margin: 0 0 5px 0; color: #6B4A34;"><strong>Tracking / Delivery Notes:</strong></p>
          <p style="margin: 0; color: #4b5563;">${details.deliveryNotes}</p>
        </div>
      ` : ''}
      
      <p style="font-size: 14px; margin-top: 30px;">
        If you have any questions about this update, feel free to reply directly to this email.
      </p>

      <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
      <p style="font-size: 12px; color: #9ca3af; text-align: center;">
        This is an automated notification from Jumuiya Chess.
      </p>
    </div>
  `;

  if (resend) {
    try {
      await resend.emails.send({ from: RESEND_FROM_EMAIL, to: email, subject, html });
      console.log(`[Resend] Delivery update sent to ${email}`);
      return;
    } catch (error) {
      console.error('[Resend Error] Failed to send delivery update:', error);
    }
  }
  console.log(`[EMAIL MOCK] Delivery update to ${email} - Status: ${details.status}`);
};
