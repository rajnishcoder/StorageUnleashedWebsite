import React, { useState } from 'react';
import { Bug, Lightbulb, MessageSquare, Mail, ArrowRight, X, CheckCircle2, AlertCircle, Loader2, Send } from 'lucide-react';
import { track } from '@vercel/analytics';
import './Feedback.css';

const FEEDBACK_CARDS = [
  {
    type: 'bug' as const,
    icon: Bug,
    title: 'Report a Bug',
    desc: 'Found a scanning error, incorrect size calculation, or UI issue? Send us details so we can fix it promptly.',
    color: '#f43f5e',
    btnLabel: 'Report Bug'
  },
  {
    type: 'feature' as const,
    icon: Lightbulb,
    title: 'Request a Feature',
    desc: 'Have an idea for duplicate file detection, cloud drives, or custom cache cleaner rules? We want to hear it!',
    color: '#f59e0b',
    btnLabel: 'Suggest Feature'
  },
  {
    type: 'general' as const,
    icon: MessageSquare,
    title: 'General Feedback',
    desc: 'Share your thoughts, praise, or experience directly with the developer—no sign-in or account needed.',
    color: '#38bdf8',
    btnLabel: 'Send Feedback'
  },
  {
    type: 'email' as const,
    icon: Mail,
    title: 'Direct Email',
    desc: 'Prefer plain email? Reach out directly to storageunleashed@gmail.com for partnerships or inquiries.',
    color: '#10b981',
    btnLabel: 'Email Developer',
    mailto: 'mailto:storageunleashed@gmail.com?subject=[Storage%20Unleashed]%20Inquiry'
  }
];

export const Feedback: React.FC = () => {
  const [activeModalType, setActiveModalType] = useState<'bug' | 'feature' | 'general' | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleCardClick = (card: typeof FEEDBACK_CARDS[0]) => {
    try {
      track('Feedback_Card_Click', { title: card.title });
    } catch {
      // ignore
    }

    if (card.type === 'email' && card.mailto) {
      window.location.href = card.mailto;
      return;
    }

    setActiveModalType(card.type as 'bug' | 'feature' | 'general');
    setStatus('idle');
    setErrorMessage('');
    setTitle('');
    setMessage('');
    setEmail('');
  };

  const closeModal = () => {
    setActiveModalType(null);
    setStatus('idle');
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || message.trim().length < 5) {
      setErrorMessage('Please enter a feedback message with at least 5 characters.');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      const payload = {
        type: activeModalType || 'general',
        title: title.trim() || undefined,
        message: message.trim(),
        email: email.trim() || undefined,
        source: 'website',
        _honeypot: honeypot,
        systemInfo: {
          userAgent: navigator.userAgent
        }
      };

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${response.status}`);
      }

      setStatus('success');
      setTitle('');
      setMessage('');
      setEmail('');
      try {
        track('Feedback_Submitted', { type: activeModalType });
      } catch {
        // ignore
      }
    } catch (err: any) {
      console.error('[Feedback] Submission error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Could not send feedback. Please check your connection or email storageunleashed@gmail.com.');
    }
  };

  return (
    <section className="feedback-section" id="feedback">
      <div className="container">
        <div className="section-header">
          <div className="section-tag">Direct Feedback</div>
          <h2 className="section-title">Support, Feedback & Bug Reports</h2>
          <p className="section-desc">
            Help shape the future of Storage Unleashed. No sign-in or GitHub account required—your input goes straight to the creator.
          </p>
        </div>

        <div className="feedback-grid">
          {FEEDBACK_CARDS.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className="feedback-card glass-card clickable-card"
                onClick={() => handleCardClick(card)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardClick(card);
                  }
                }}
              >
                <div
                  className="feedback-icon-wrap"
                  style={{
                    backgroundColor: `${card.color}15`,
                    borderColor: `${card.color}35`,
                    color: card.color
                  }}
                >
                  <Icon size={22} />
                </div>
                <h3 className="feedback-card-title">{card.title}</h3>
                <p className="feedback-card-desc">{card.desc}</p>
                <div className="feedback-card-action" style={{ color: card.color }}>
                  <span>{card.btnLabel}</span>
                  <ArrowRight size={14} className="action-arrow" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Email Direct Callout Banner */}
        <div className="email-callout-banner glass-card">
          <div className="callout-left">
            <div className="callout-mail-icon">
              <Mail size={26} />
            </div>
            <div className="callout-text">
              <div className="callout-title">storageunleashed@gmail.com</div>
              <div className="callout-desc">
                Direct developer email • Quick response • Bug reports & commercial inquiries welcome
              </div>
            </div>
          </div>
          <a
            href="mailto:storageunleashed@gmail.com?subject=[Storage%20Unleashed]%20Inquiry"
            className="btn-primary btn-callout"
          >
            <span>Compose Email</span>
            <ArrowRight size={15} />
          </a>
        </div>
      </div>

      {/* Interactive Web Feedback Modal */}
      {activeModalType && (
        <div className="web-feedback-modal-overlay" onClick={closeModal}>
          <div className="web-feedback-modal-card glass-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="web-feedback-close-btn"
              onClick={closeModal}
              aria-label="Close"
            >
              <X size={16} />
            </button>

            {status === 'success' ? (
              <div className="web-feedback-success-state">
                <div className="web-feedback-success-icon">
                  <CheckCircle2 size={44} color="#10b981" />
                </div>
                <h3 className="web-feedback-state-title">Thank You!</h3>
                <p className="web-feedback-state-desc">
                  Your message has been sent directly to the Storage Unleashed team.
                  {email && ' We will reply directly to your email address soon.'}
                </p>
                <button
                  type="button"
                  className="btn-primary web-feedback-btn-done"
                  onClick={closeModal}
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="web-feedback-header">
                  <h3 className="web-feedback-title">
                    {activeModalType === 'bug'
                      ? 'Report a Bug'
                      : activeModalType === 'feature'
                      ? 'Suggest a Feature'
                      : 'Send Feedback'}
                  </h3>
                  <p className="web-feedback-subtitle">
                    Sent straight to storageunleashed@gmail.com — no account needed.
                  </p>
                </div>

                {status === 'error' && (
                  <div className="web-feedback-alert error">
                    <AlertCircle size={16} />
                    <div className="web-feedback-alert-text">
                      {errorMessage}
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="web-feedback-form">
                  {/* Honeypot anti-spam */}
                  <input
                    type="text"
                    name="_honeypot"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    style={{ display: 'none' }}
                    tabIndex={-1}
                    autoComplete="off"
                  />

                  <div className="web-feedback-field">
                    <label className="web-feedback-label">
                      Summary / Subject
                    </label>
                    <input
                      type="text"
                      className="web-feedback-input"
                      placeholder={
                        activeModalType === 'bug'
                          ? 'e.g. Scan stops unexpectedly on macOS'
                          : activeModalType === 'feature'
                          ? 'e.g. Add dark mode treemap color schemes'
                          : 'e.g. Feedback on recent performance'
                      }
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={120}
                    />
                  </div>

                  <div className="web-feedback-field">
                    <label className="web-feedback-label">
                      Details <span className="req">*</span>
                    </label>
                    <textarea
                      className="web-feedback-textarea"
                      rows={4}
                      placeholder={
                        activeModalType === 'bug'
                          ? 'Describe what happened and any steps to recreate the issue...'
                          : 'Describe your idea or suggestion in detail...'
                      }
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                    />
                  </div>

                  <div className="web-feedback-field">
                    <label className="web-feedback-label">
                      Your Email <span className="opt">(Optional, if you would like a reply)</span>
                    </label>
                    <input
                      type="email"
                      className="web-feedback-input"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="web-feedback-actions">
                    <button
                      type="button"
                      className="web-feedback-btn-cancel"
                      onClick={closeModal}
                      disabled={status === 'submitting'}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary web-feedback-btn-submit"
                      disabled={status === 'submitting' || !message.trim()}
                    >
                      {status === 'submitting' ? (
                        <>
                          <Loader2 size={15} className="spin-icon" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send size={15} />
                          <span>Send Directly</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
