"use client";

import { useState } from "react";
import { Accordion } from "@base-ui/react/accordion";
import { Reveal } from "./reveal";
import { services } from "@/lib/site-content";

export function Services() {
  const [openValue, setOpenValue] = useState<string[]>([]);

  return (
    <section className="services-section" id="services">
      <Reveal>
        <p className="sec-eyebrow">What we make — click any service to expand</p>
      </Reveal>
      <Reveal delay={0.1}>
        <Accordion.Root value={openValue} onValueChange={(v) => setOpenValue((v as string[]).slice(-1))}>
          {services.map((s) => (
            <Accordion.Item key={s.id} value={s.id} className="svc-row" data-cursor-hover>
              <Accordion.Header>
                <Accordion.Trigger className="svc-row-head">
                  <span className="svc-n">{s.n}</span>
                  <span className="svc-name">{s.name}</span>
                  <span className="svc-scope">{s.scope}</span>
                  <span className="svc-chevron">↓</span>
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel className="svc-expand">
                <div className="svc-expand-inner">
                  <div className="svc-expand-col">
                    <div className="svc-expand-label">What&apos;s included</div>
                    {s.included.map((item) => (
                      <span className="svc-expand-item" key={item}>
                        {item}
                      </span>
                    ))}
                  </div>
                  <div className="svc-expand-col">
                    <div className="svc-expand-label">Turnaround</div>
                    {s.turnaround.map((item) => (
                      <span className="svc-expand-item" key={item}>
                        {item}
                      </span>
                    ))}
                  </div>
                  <div className="svc-expand-col">
                    <div className="svc-expand-label">Best for</div>
                    <span className="svc-expand-item">{s.bestFor}</span>
                    <a className="svc-expand-link" href="#contact">
                      Full service details ↗
                    </a>
                  </div>
                </div>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </Reveal>
    </section>
  );
}
