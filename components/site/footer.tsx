import { FooterDoodles } from "./doodles";
import { WHATSAPP_NUMBER } from "@/lib/site-content";

export function Footer() {
  return (
    <footer className="site-footer">
      <FooterDoodles />
      <div className="foot-grid container" style={{ position: "relative", zIndex: 1 }}>
        <div>
          <div style={{ fontFamily: "var(--font-logo)", fontSize: 36, color: "#fff", lineHeight: 1 }}>
            Doodle<span style={{ color: "var(--purple-200)" }}>LABS</span>
          </div>
          <p className="foot-tagline" style={{ marginTop: 16 }}>
            A small creative studio in Pune. We make local brands look unmissable.
          </p>
        </div>
        <div>
          <div className="foot-col-label">Pages</div>
          <div className="foot-links">
            <a href="#work">Work</a>
            <a href="#services">Services</a>
            <a href="#faq">Studio</a>
            <a href="#contact">Contact</a>
          </div>
        </div>
        <div>
          <div className="foot-col-label">Services</div>
          <div className="foot-links">
            <a href="#services">Social Video</a>
            <a href="#services">Post Design</a>
            <a href="#services">Google My Business</a>
            <a href="#services">Content Mgmt</a>
            <a href="#services">Local Strategy</a>
          </div>
        </div>
        <div>
          <div className="foot-col-label">Say hi</div>
          <div className="foot-links">
            <a href="mailto:hello@doodlelabs.in">hello@doodlelabs.in</a>
            <a href={`https://wa.me/${WHATSAPP_NUMBER}`}>WhatsApp ↗</a>
            <a href="#">Instagram</a>
            <a href="#">LinkedIn</a>
          </div>
        </div>
      </div>
      <div className="foot-bottom container" style={{ position: "relative", zIndex: 1 }}>
        <span>© 2026 Doodle Labs · Pune, IN</span>
        <span>Est. 2022 · Design as a Service</span>
      </div>
      <div className="foot-wordmark container">
        DOODLE
        <br />
        <em>LABS</em>
      </div>
    </footer>
  );
}
