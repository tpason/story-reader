"use client";

import {
  FloatingPortal,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole
} from "@floating-ui/react";
import { cloneElement, isValidElement, useState, type ReactElement, type ReactNode } from "react";

type FloatingTooltipProps = {
  children: ReactElement;
  label: ReactNode;
  disabled?: boolean;
};

export function FloatingTooltip({ children, disabled = false, label }: FloatingTooltipProps) {
  const [open, setOpen] = useState(false);
  const { context, floatingStyles, refs } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: "bottom",
    middleware: [offset(8), flip(), shift({ padding: 10 })]
  });
  const hover = useHover(context, { enabled: !disabled, move: false });
  const focus = useFocus(context, { enabled: !disabled });
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });
  const { getFloatingProps, getReferenceProps } = useInteractions([hover, focus, dismiss, role]);

  if (!isValidElement(children)) return children;

  return (
    <>
      {cloneElement(children, getReferenceProps({ ref: refs.setReference }))}
      {open && !disabled ? (
        <FloatingPortal>
          <div className="floating-tooltip" ref={refs.setFloating} style={floatingStyles} {...getFloatingProps()}>
            {label}
          </div>
        </FloatingPortal>
      ) : null}
    </>
  );
}
