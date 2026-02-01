const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// === НОВА ФУНКЦІЯ: Підтвердження пошти ===
async function sendVerificationEmail(email, token) {
    if (!email) return;

    // Генеруємо посилання на твій локальний сервер
    const link = `http://localhost:3000/api/auth/verify?token=${token}`;

    const mailOptions = {
        from: '"Airline Services" <noreply.airline@gmail.com>',
        to: email,
        subject: "Verify your email 🔒",
        html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px; text-align: center;">
            <h2 style="color: #2f6bff;">Verify your Account</h2>
            <p>You created an account on Airline Services.</p>
            <p>Please click the button below to activate it:</p>
            <a href="${link}" style="background-color: #2f6bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email</a>
            <p style="margin-top: 20px; font-size: 12px; color: #888;">Or copy this link: ${link}</p>
        </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Verification email sent to ${email}`);
    } catch (error) {
        console.error("Error sending verification email:", error);
    }
}

// === ФУНКЦІЯ КВИТКА (без змін) ===
async function sendTicketEmail(booking, flight) {
    if (!booking.email) return;

    const mailOptions = {
        from: '"Airline Services" <noreply.airline@gmail.com>',
        to: booking.email,
        subject: `Your Ticket #${booking.id} - Confirmed ✅`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <div style="background-color: #2f6bff; padding: 20px; text-align: center; color: white;">
                <h1>Airline Services</h1>
                <p>Booking Confirmed</p>
            </div>
            <div style="padding: 20px;">
                <p>Hello, <strong>${booking.name}</strong>!</p>
                <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0;">
                    <h3>Flight Details</h3>
                    <p><strong>Route:</strong> ${flight.from} → ${flight.to}</p>
                    <p><strong>Date:</strong> ${flight.date}</p>
                    <p><strong>Seats:</strong> ${booking.seats.join(", ")}</p>
                </div>
                <p style="font-weight: bold;">Total Paid: $${booking.totalPrice}</p>
            </div>
        </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Ticket email sent to ${booking.email}`);
    } catch (error) {
        console.error("Error sending ticket email:", error);
    }
}

// Експортуємо нові функції
module.exports = { sendVerificationEmail, sendTicketEmail };