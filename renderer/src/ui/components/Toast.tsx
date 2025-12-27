import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Toast(props: { open: boolean; kind: "success" | "error" | "info"; text: string; onClose: () => void }) {
  useEffect(() => {
    if (!props.open) return;
    const t = setTimeout(props.onClose, 2200);
    return () => clearTimeout(t);
  }, [props.open, props.onClose]);

  const color =
    props.kind === "success"
      ? "from-emerald-500/80 to-emerald-300/60"
      : props.kind === "error"
        ? "from-rose-500/80 to-rose-300/60"
        : "from-sky-500/80 to-sky-300/60";

  return (
    <AnimatePresence>
      {props.open ? (
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          className="pointer-events-none fixed bottom-6 right-6 z-50"
        >
          <div className={`rounded-2xl bg-gradient-to-r ${color} px-5 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.55)]`}>
            <div className="text-sm font-semibold text-white">{props.text}</div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

