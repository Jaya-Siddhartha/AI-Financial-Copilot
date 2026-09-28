import React, { useEffect, useRef, useState } from 'react';
import { Bot, Cpu, LoaderCircle, Send, Square, User, Volume2 } from 'lucide-react';
import { Alert } from '../components/ui/Alert';
import { answer, DECISION_INTENTS, factSheet, intentOf } from '../lib/advisor';
import { aiSupported, askModel, isModelCached, loadModel, MODELS, modelLoaded, numbersGrounded, stopModel } from '../lib/ai';
import { canSpeak, speak } from '../lib/speech';

const CHIPS = ['How much can I spend?', 'Can I afford 5000?', 'Where does my money go?', 'How can I save more?', 'When are my EMIs due?', 'How is my credit health?'];

// Remembered between visits to the tab (the model itself stays loaded in its worker).
let saved = [];

export function AssistantPage({ data, analysis, credit, engineInput }) {
  const [messages, setMessages] = useState(saved);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState({ state: modelLoaded() ? 'ready' : 'off', progress: 0, text: '', error: '' });
  const [cached, setCached] = useState({ smart: false, lite: false });
  const endRef = useRef(null);
  const ctx = { analysis, profile: data.profile, credit, engineInput };

  useEffect(() => {
    saved = messages;
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  useEffect(() => {
    Promise.all([isModelCached('smart'), isModelCached('lite')]).then(([smart, lite]) => setCached({ smart, lite }));
  }, []);

  const turnOn = async (key) => {
    setAi({ state: 'loading', progress: 0, text: 'Starting…', error: '' });
    try {
      await loadModel(key, ({ progress, text }) => setAi((s) => ({ ...s, progress, text })));
      setAi({ state: 'ready', progress: 1, text: '', error: '' });
    } catch (err) {
      setAi({ state: 'off', progress: 0, text: '', error: err.message || 'The offline AI could not start on this device.' });
    }
  };

  const ask = async (question) => {
    const q = question.trim();
    if (!q || busy) return;
    setInput('');
    const calculator = answer(q, ctx);
    const history = messages.map((m) => ({ role: m.role, content: m.text }));
    setMessages((m) => [...m, { role: 'user', text: q }]);
    // Money decisions get the exact calculator answer; the language model only handles open questions.
    if (ai.state !== 'ready' || DECISION_INTENTS.includes(intentOf(q))) {
      setMessages((m) => [...m, { role: 'assistant', text: calculator, by: ai.state === 'ready' ? 'exact' : 'built-in' }]);
      return;
    }
    setBusy(true);
    setMessages((m) => [...m, { role: 'assistant', text: '', by: 'ai' }]);
    try {
      const facts = factSheet(ctx);
      const text = await askModel({
        question: q,
        history,
        facts,
        calculator,
        onToken: (partial) => setMessages((m) => [...m.slice(0, -1), { role: 'assistant', text: partial, by: 'ai' }]),
      });
      // Never show an AI answer with a rupee amount that is not in the user's real numbers.
      const trusted = text && numbersGrounded(text, facts, calculator);
      setMessages((m) => [
        ...m.slice(0, -1),
        trusted ? { role: 'assistant', text, by: 'ai' } : { role: 'assistant', text: calculator, by: 'checked' },
      ]);
    } catch {
      setMessages((m) => [...m.slice(0, -1), { role: 'assistant', text: calculator, by: 'built-in' }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page narrow assistant">
      <div>
        <span className="eyebrow">Ask FinCopilot</span>
        <h1 className="page-title">Your money assistant</h1>
        <p className="page-sub">Ask in plain words. Answers use only your own data.</p>
      </div>

      <section className="card ai-mode">
        <div className="ai-mode-head">
          <span className="icon-circle"><Cpu size={20} /></span>
          <div className="row-main">
            <div className="row-title">{ai.state === 'ready' ? 'Offline AI is on' : 'Built-in assistant'}</div>
            <div className="row-sub" style={{ whiteSpace: 'normal' }}>
              {ai.state === 'ready'
                ? 'An AI model is running on this device. Nothing you ask leaves your phone or computer.'
                : 'Instant answers from your numbers. Turn on the offline AI for free-form chat.'}
            </div>
          </div>
        </div>
        {ai.state === 'loading' && (
          <div style={{ marginTop: 12 }}>
            <div className="progress"><span style={{ width: `${Math.round(ai.progress * 100)}%` }} /></div>
            <p className="muted small" style={{ marginTop: 6 }}>{Math.round(ai.progress * 100)}% · {ai.text.slice(0, 90)}</p>
          </div>
        )}
        {ai.state === 'off' && (
          aiSupported() ? (
            <div className="btn-row" style={{ marginTop: 12 }}>
              {Object.entries(MODELS).map(([key, m]) => (
                <button key={key} type="button" className={`btn ${key === 'smart' ? 'btn-primary' : 'btn-outline'} btn-sm`} onClick={() => turnOn(key)}>
                  {m.label} AI ({cached[key] ? 'downloaded' : m.size})
                </button>
              ))}
            </div>
          ) : (
            <p className="muted small" style={{ marginTop: 10 }}>This browser cannot run the offline AI (it needs WebGPU: recent Chrome or Edge on a computer or newer phone). The built-in assistant works everywhere.</p>
          )
        )}
        {ai.state === 'off' && aiSupported() && (
          <p className="muted small" style={{ marginTop: 8 }}>Downloads once over Wi-Fi, then works offline. "Smart" gives better answers; "Lite" suits older devices.</p>
        )}
        {ai.error && <div style={{ marginTop: 10 }}><Alert tone="amber">{ai.error}</Alert></div>}
      </section>

      <section className="card chat" aria-live="polite">
        {messages.length === 0 && (
          <div className="chat-empty">
            <Bot size={32} className="text-accent" />
            <p>Hi {data.profile.fullName?.split(' ')[0] || 'there'}! Ask me about your spending, EMIs or savings.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            <span className="bubble-icon" aria-hidden="true">{m.role === 'user' ? <User size={16} /> : <Bot size={16} />}</span>
            <div className="bubble-body">
              {m.text || <LoaderCircle size={18} className="spin" />}
              {m.role === 'assistant' && m.text && (
                <div className="bubble-meta">
                  {m.by === 'ai'
                    ? 'Offline AI'
                    : m.by === 'exact'
                      ? 'Exact figures from your data'
                      : m.by === 'checked'
                        ? 'Exact figures (the AI answer was replaced because a number did not match your data)'
                        : 'Built-in'}
                  {canSpeak() && (
                    <button type="button" className="link-btn" onClick={() => speak(m.text)} aria-label="Read this answer aloud">
                      <Volume2 size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </section>

      <div className="chips">
        {CHIPS.map((c) => (
          <button key={c} type="button" className="seg" onClick={() => ask(c)} disabled={busy}>{c}</button>
        ))}
      </div>

      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <input className="input" placeholder="Type a question…" value={input} onChange={(e) => setInput(e.target.value)} maxLength={300} aria-label="Your question" />
        {busy ? (
          <button type="button" className="btn btn-outline" onClick={stopModel} aria-label="Stop"><Square size={18} /></button>
        ) : (
          <button type="submit" className="btn btn-primary" disabled={!input.trim()} aria-label="Send"><Send size={18} /></button>
        )}
      </form>
      <p className="muted small">FinCopilot gives general guidance from your own data. It is not a licensed financial adviser.</p>
    </div>
  );
}
