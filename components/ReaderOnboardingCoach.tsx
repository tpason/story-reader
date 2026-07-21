"use client";

import { BookOpen, Hand, Settings2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  READER_ONBOARDING_STEPS,
  markReaderOnboardingComplete,
  shouldShowReaderOnboarding
} from "@/lib/reader-onboarding";

const STEP_ICONS = [Hand, BookOpen, Settings2] as const;

type ReaderOnboardingCoachProps = {
  compact: boolean;
};

export function ReaderOnboardingCoach({ compact }: ReaderOnboardingCoachProps) {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    // Swipe / dock tips are mobile-only — desktop was showing a sunken coach over the page.
    if (compact && shouldShowReaderOnboarding()) {
      setOpen(true);
    }
  }, [compact]);

  if (!open || !compact) return null;

  const step = READER_ONBOARDING_STEPS[stepIndex];
  const StepIcon = STEP_ICONS[stepIndex] ?? BookOpen;
  const isLast = stepIndex >= READER_ONBOARDING_STEPS.length - 1;

  function finish() {
    markReaderOnboardingComplete();
    setOpen(false);
  }

  return (
    <div className="reader-onboarding-coach" role="dialog" aria-modal="true" aria-label="Hướng dẫn đọc">
      <div className="reader-onboarding-coach-card">
        <button type="button" className="reader-onboarding-coach-dismiss" aria-label="Bỏ qua hướng dẫn" onClick={finish}>
          <X size={16} />
        </button>
        <div className="reader-onboarding-coach-icon" aria-hidden="true">
          <StepIcon size={20} />
        </div>
        <p className="reader-onboarding-coach-eyebrow">
          Mẹo đọc {stepIndex + 1}/{READER_ONBOARDING_STEPS.length}
        </p>
        <h2>{step.title}</h2>
        <p>{step.body}</p>
        <div className="reader-onboarding-coach-actions">
          {stepIndex > 0 ? (
            <button type="button" className="reader-onboarding-coach-secondary" onClick={() => setStepIndex((value) => value - 1)}>
              Quay lại
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            className="reader-onboarding-coach-primary"
            onClick={() => {
              if (isLast) finish();
              else setStepIndex((value) => value + 1);
            }}
          >
            {isLast ? "Bắt đầu đọc" : "Tiếp"}
          </button>
        </div>
      </div>
    </div>
  );
}
