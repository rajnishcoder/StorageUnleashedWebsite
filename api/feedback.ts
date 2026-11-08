import type { VercelRequest, VercelResponse } from '@vercel/node';

interface FeedbackPayload {
  type: 'bug' | 'feature' | 'general';
  title?: string;
  message: string;
  email?: string;
  systemInfo?: {
    appVersion?: string;
    platform?: string;
    arch?: string;
    userAgent?: string;
  };
  source?: 'desktop-app' | 'website';
  _honeypot?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS for Electron desktop app and web requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const payload: FeedbackPayload = req.body || {};

    // 1. Silent bot spam check via honeypot
    if (payload._honeypot) {
      return res.status(200).json({ success: true, message: 'Feedback received.' });
    }

    // 2. Validate message
    const message = (payload.message || '').trim();
    if (!message || message.length < 5) {
      return res.status(400).json({ error: 'Please provide a valid feedback message (at least 5 characters).' });
    }

    const type = payload.type || 'general';
    const title = (payload.title || '').trim() || (type === 'bug' ? 'Bug Report' : type === 'feature' ? 'Feature Request' : 'General Feedback');
    const userEmail = (payload.email || '').trim();
    const source = payload.source || 'desktop-app';
    const systemInfo = payload.systemInfo || {};

    // Check for Discord Webhook URL (Priority 1: instant & free)
    const discordWebhookUrl =
      process.env.DISCORD_WEBHOOK_URL ||
      'https://discord.com/api/webhooks/1568897752967024774/MpOtG-zZrs9lt3hjZZBMhNWT3Wk7VNSh7mouOHqlJWxAETDaqdOrOJr6bgXivwpptj2F';
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!discordWebhookUrl && !resendApiKey) {
      console.warn('[Feedback API] Neither DISCORD_WEBHOOK_URL nor RESEND_API_KEY is configured.');
      return res.status(503).json({
        error: 'Feedback endpoint is pending configuration. Please set DISCORD_WEBHOOK_URL in Vercel.'
      });
    }

    let dispatched = false;

    // Dispatch to Discord Webhook
    if (discordWebhookUrl) {
      // Color codes in decimal
      const colorDecimal = type === 'bug' ? 15682628 : type === 'feature' ? 16096779 : 3718648;
      const typeEmoji = type === 'bug' ? '🐛' : type === 'feature' ? '💡' : '💬';

      const fields = [
        {
          name: '👤 Contact Email',
          value: userEmail ? `\`${userEmail}\`` : '*Anonymous (No reply requested)*',
          inline: true
        },
        {
          name: '💻 Source',
          value: `\`${source}\``,
          inline: true
        }
      ];

      if (systemInfo.appVersion) {
        fields.push({
          name: '🏷️ App Version',
          value: `\`v${systemInfo.appVersion}\``,
          inline: true
        });
      }

      if (systemInfo.platform) {
        fields.push({
          name: '🖥️ Platform',
          value: `\`${systemInfo.platform} (${systemInfo.arch || 'unknown'})\``,
          inline: true
        });
      }

      if (systemInfo.userAgent && source === 'website') {
        fields.push({
          name: '🌐 Browser User-Agent',
          value: `\`${systemInfo.userAgent.substring(0, 150)}\``,
          inline: false
        });
      }

      const discordBody = {
        username: 'Storage Unleashed Feedback',
        avatar_url: 'https://www.storageunleashed.com/favicon.ico',
        embeds: [
          {
            title: `${typeEmoji} [${type.toUpperCase()}] ${title}`,
            description: message,
            color: colorDecimal,
            fields,
            footer: {
              text: 'Storage Unleashed • Live Feedback Engine'
            },
            timestamp: new Date().toISOString()
          }
        ]
      };

      const discordRes = await fetch(discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discordBody)
      });

      if (!discordRes.ok) {
        console.error('[Feedback API] Discord webhook dispatch failed:', discordRes.status, await discordRes.text());
      } else {
        dispatched = true;
      }
    }

    // Optional: Also dispatch to Resend if RESEND_API_KEY is configured
    if (resendApiKey) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(resendApiKey);
        const recipientEmail = process.env.FEEDBACK_TO_EMAIL || 'storageunleashed@gmail.com';
        const fromEmail = process.env.FEEDBACK_FROM_EMAIL || 'Storage Unleashed <onboarding@resend.dev>';

        await resend.emails.send({
          from: fromEmail,
          to: [recipientEmail],
          replyTo: userEmail || undefined,
          subject: `[Storage Unleashed] ${type.toUpperCase()}: ${title} (${source})`,
          text: `Type: ${type}\nTitle: ${title}\nUser: ${userEmail || 'Anonymous'}\nSource: ${source}\n\nMessage:\n${message}`
        });
        dispatched = true;
      } catch (resendErr) {
        console.error('[Feedback API] Resend dispatch error:', resendErr);
      }
    }

    if (!dispatched) {
      return res.status(500).json({ error: 'Failed to deliver feedback to notifications destination.' });
    }

    return res.status(200).json({ success: true, message: 'Feedback delivered successfully.' });
  } catch (err: any) {
    console.error('[Feedback API] Server error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
