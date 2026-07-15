const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, to, data } = req.body || {};

    let subject;
    let html;

    if (type === 'gift_pending') {
      subject = 'Your Dogstar gift card order is pending review';
      html = `
        <div style="font-family: Arial, sans-serif; background:#000; color:#fff; padding:24px;">
          <h1 style="color:#e63946;">DOGSTAR</h1>
          <h2>Your order is pending review</h2>
          <p>Thanks for your order for <strong>${data.eventName}</strong>.</p>
          <p>Total requested: <strong>$${data.totalAmount}</strong></p>
          <p>Our team is verifying your gift card details now. You'll receive another email once it's approved or rejected.</p>
          <p style="color:#999; font-size:12px;">Order ID: ${data.orderId}</p>
        </div>
      `;
    } else if (type === 'gift_approved') {
      subject = 'Your Dogstar gift card order has been approved!';
      html = `
        <div style="font-family: Arial, sans-serif; background:#000; color:#fff; padding:24px;">
          <h1 style="color:#e63946;">DOGSTAR</h1>
          <h2 style="color:#4caf50;">Your order has been approved!</h2>
          <p>Great news - your gift card order for <strong>${data.eventName}</strong> has been verified and approved.</p>
          <p>Total: <strong>$${data.totalAmount}</strong></p>
          <p>We look forward to seeing you at the show!</p>
          <p style="color:#999; font-size:12px;">Order ID: ${data.orderId}</p>
        </div>
      `;
    } else if (type === 'gift_rejected') {
      subject = 'Update on your Dogstar gift card order';
      html = `
        <div style="font-family: Arial, sans-serif; background:#000; color:#fff; padding:24px;">
          <h1 style="color:#e63946;">DOGSTAR</h1>
          <h2>Your order was not approved</h2>
          <p>Unfortunately, we were unable to verify your gift card order for <strong>${data.eventName}</strong> (Total: $${data.totalAmount}).</p>
          <p>This can happen if the gift card details couldn't be confirmed as valid. If you believe this is a mistake, please reach out through the contact page.</p>
          <p style="color:#999; font-size:12px;">Order ID: ${data.orderId}</p>
        </div>
      `;
    } else {
      return res.status(400).json({ error: 'Unknown email type' });
    }

    const { error } = await resend.emails.send({
      from: 'Dogstar <orders@officialdogstar.com>',
      to,
      subject,
      html
    });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('send-email error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
