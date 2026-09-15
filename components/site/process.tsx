import { Reveal } from "./reveal";
import { ProcessDoodles } from "./doodles";
import { processSteps } from "@/lib/site-content";

export function Process() {
  return (
    <section className="process-section">
      <ProcessDoodles />
      <div className="container" style={{ position: "relative", zIndex: 1 }}>
        <Reveal>
          <div className="process-header">
            <h2 className="process-hl">
              How it
              <br />
              <em>works.</em>
            </h2>
            <p className="process-sub">
              Three steps.
              <br />
              No agency runaround.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="process-grid">
            {processSteps.map((s) => (
              <div className="process-step" key={s.n}>
                <div className="process-step-n">{s.n}</div>
                <div className="process-step-title">{s.titleEm ? <em>{s.title}</em> : s.title}</div>
                <p className="process-step-body">{s.body}</p>
                <div className="process-step-tag">{s.tag}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
