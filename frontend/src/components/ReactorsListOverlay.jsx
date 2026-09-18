
import React from "react";
import { createPortal } from "react-dom";
import { X, BadgeCheck } from "lucide-react";

const ReactorsListOverlay = ({ reactions, onClose }) => {
  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[120] flex justify-center items-center bg-black/60 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[340px] max-h-[70vh] overflow-y-auto no-scrollbar bg-[var(--bg-panel)] border border-[var(--border-popup)] rounded-2xl shadow-lg"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-popup)]">
          <span className="text-[15px] font-semibold text-[var(--text-primary)]">
            Reactions
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer text-[var(--text-primary)]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="py-1">
          {reactions.map((r, idx) => {
            const reactor = r.userId;
            const reactorId =
              typeof reactor === "object" ? reactor?._id : reactor;

            return (
              <div
                key={reactorId || idx}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <div className="w-[38px] h-[38px] rounded-full overflow-hidden shrink-0">
                  <img
                    src={
                      typeof reactor === "object" && reactor?.profilePic
                        ? reactor.profilePic
                        : "/images/default-profile-pic.jpg"
                    }
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>

                <span className="flex-1 min-w-0 truncate text-[14px] text-[var(--text-primary)] flex items-center gap-1">
                  {typeof reactor === "object" ? reactor?.fullname : "Someone"}
                  {typeof reactor === "object" && reactor?.role === "admin" && (
                    <BadgeCheck size={14} className="text-sky-400 shrink-0" />
                  )}
                </span>

                <span className="text-[20px] shrink-0">{r.emoji}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ReactorsListOverlay;
