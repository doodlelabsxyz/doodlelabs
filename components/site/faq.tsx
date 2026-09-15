"use client";

import { useState } from "react";
import { Accordion } from "@base-ui/react/accordion";
import { Plus } from "lucide-react";
import { Reveal } from "./reveal";
import { faqs } from "@/lib/site-content";

export function Faq() {
  const [openValue, setOpenValue] = useState<string[]>([]);

  return (
    <section className="faq-section" id="faq">
      <div className="container">
        <Reveal>
          <h2 className="faq-hl">
            Frequently
            <br />
            <em>asked.</em>
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <Accordion.Root value={openValue} onValueChange={(v) => setOpenValue((v as string[]).slice(-1))}>
            {faqs.map((f, i) => (
              <Accordion.Item key={i} value={String(i)} className="faq-item">
                <Accordion.Header>
                  <Accordion.Trigger className="faq-q" data-cursor-hover>
                    {f.q}
                    <span className="faq-icon">
                      <Plus className="size-3.5" />
                    </span>
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Panel className="faq-a">
                  <p className="faq-a-inner">{f.a}</p>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </Reveal>
      </div>
    </section>
  );
}
