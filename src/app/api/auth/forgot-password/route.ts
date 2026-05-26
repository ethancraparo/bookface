import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import crypto from 'crypto';
import { rateLimit } from '@/lib/rate-limit';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
    // Silent rate limit — always return ok to avoid leaking whether the email exists
    if (!rateLimit(`forgot:${ip}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json({ ok: true });
    }

    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    // Always return success — never reveal whether the email exists
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return NextResponse.json({ ok: true });
    }

    // Generate a secure token, valid for 1 hour
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { email },
      data: { resetToken: token, resetTokenExpiry: expiry },
    });

    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;

    await resend.emails.send({
      from: 'bookface <onboarding@resend.dev>',
      to: email,
      subject: 'Reset your bookface password',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; background: #090909; color: #f5f5f7;">
          <h1 style="font-size: 28px; font-weight: 800; margin: 0 0 8px;">book<span style="color: #30d158;">face</span></h1>
          <p style="color: #98989f; margin: 0 0 32px; font-size: 14px;">Random video chat for vibe coders</p>

          <p style="font-size: 16px; margin: 0 0 8px;">Hey 👋</p>
          <p style="font-size: 15px; color: #98989f; margin: 0 0 32px; line-height: 1.6;">
            Someone requested a password reset for your bookface account. Click the button below to set a new password. This link expires in <strong style="color: #f5f5f7;">1 hour</strong>.
          </p>

          <a href="${resetUrl}" style="display: inline-block; background: #30d158; color: white; font-weight: 700; font-size: 15px; padding: 14px 28px; border-radius: 14px; text-decoration: none; margin-bottom: 32px;">
            Reset password →
          </a>

          <p style="font-size: 13px; color: #48484a; margin: 0; line-height: 1.6;">
            If you didn't request this, you can safely ignore this email — your password won't change.<br><br>
            Or copy this link: <a href="${resetUrl}" style="color: #30d158; word-break: break-all;">${resetUrl}</a>
          </p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[forgot-password]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
