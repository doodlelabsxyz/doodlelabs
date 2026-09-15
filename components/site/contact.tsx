"use client";

import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Reveal } from "./reveal";
import { WHATSAPP_NUMBER } from "@/lib/site-content";

const SERVICE_OPTIONS = ["Graphic Posts", "Reels", "Brand Identity", "Google My Business", "Local Strategy"];

export function Contact() {
  const [name, setName] = useState("");
  const [biz, setBiz] = useState("");
  const [msg, setMsg] = useState("");
  const [checked, setChecked] = useState<string[]>([]);
  const [sent, setSent] = useState(false);

  function toggle(service: string) {
    setChecked((c) => (c.includes(service) ? c.filter((s) => s !== service) : [...c, service]));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const svcs = checked.length ? checked.join(", ") : "your services";
    const text = `Hi DoodleLabs! I'm ${name || "there"} from ${biz || "my business"}. Interested in: ${svcs}. ${msg}`.trim();
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, "_blank");
    setSent(true);
  }

  return (
    <section className="contact-section" id="contact">
      <div className="container">
        <div className="contact-grid">
          <Reveal>
            <div>
              <h2 className="contact-hl">
                Let&apos;s make
                <br />
                <em>something.</em>
              </h2>
              <p className="contact-sub">
                Fill in the brief form and we&apos;ll respond on WhatsApp within a few hours. No pitches, no sales calls.
              </p>
              <div className="contact-alts">
                <a href="mailto:hello@doodlelabs.in">
                  <button className="btn btn-ghost-w" data-cursor-hover>
                    Email us ↗
                  </button>
                </a>
                <a href={`https://wa.me/${WHATSAPP_NUMBER}`}>
                  <button className="btn btn-primary" data-cursor-hover>
                    WhatsApp ↗
                  </button>
                </a>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div>
              <AnimatePresence mode="wait">
                {!sent ? (
                  <motion.form
                    key="form"
                    className="intake-form"
                    onSubmit={onSubmit}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="intake-row">
                      <div className="intake-field">
                        <label className="intake-field-label" htmlFor="f-name">
                          Your name
                        </label>
                        <input
                          className="intake-input"
                          type="text"
                          id="f-name"
                          placeholder="Rohit Sharma"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="intake-field">
                        <label className="intake-field-label" htmlFor="f-biz">
                          Business name
                        </label>
                        <input
                          className="intake-input"
                          type="text"
                          id="f-biz"
                          placeholder="Café Kalyani"
                          value={biz}
                          onChange={(e) => setBiz(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="intake-field">
                      <label className="intake-field-label">I&apos;m interested in</label>
                      <div className="intake-checks">
                        {SERVICE_OPTIONS.map((s) => (
                          <label className="intake-check-label" key={s} data-cursor-hover>
                            <input type="checkbox" value={s} checked={checked.includes(s)} onChange={() => toggle(s)} />
                            {s}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="intake-field">
                      <label className="intake-field-label" htmlFor="f-msg">
                        About your business
                      </label>
                      <textarea
                        className="intake-input"
                        id="f-msg"
                        placeholder="Two sentences about what you do and who you serve…"
                        value={msg}
                        onChange={(e) => setMsg(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }} data-cursor-hover>
                      Send on WhatsApp ↗
                    </button>
                  </motion.form>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    style={{ display: "flex", flexDirection: "column", gap: 12 }}
                  >
                    <div className="form-success-hl">Opening WhatsApp…</div>
                    <p className="form-success-sub">
                      A chat with hello@doodlelabs.in is pre-filled with your info. We reply within a few hours.
                    </p>
                    <button className="btn btn-ghost-w" style={{ marginTop: 8, alignSelf: "flex-start" }} onClick={() => setSent(false)} data-cursor-hover>
                      Send another ↗
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
