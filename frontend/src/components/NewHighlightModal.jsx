import React, { useState } from "react";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "../utils/axiosInstance";

const NewHighlightModal = ({ onClose, onCreated }) => {
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Give your highlight a name");
      return;
    }
    setSaving(true);
    try {
      const res = await axiosInstance.post("/highlight/create", {
        title: trimmed,
        storyIds: [],
      });
      toast.success("Highlight created");
      onCreated(res.data.highlight);
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't create highlight");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-[#161616] w-[90%] max-w-sm rounded-2xl p-5 border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-base font-semibold">New highlight</h3>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={20}
          placeholder="Highlight name"
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          className="w-full bg-[#0c1014] border border-white/15 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/40 focus:outline-none focus:border-[#4a5df9]"
        />
        <div className="text-white/30 text-[11px] mt-1 text-right">{title.length}/20</div>

        <button
          onClick={handleCreate}
          disabled={saving}
          className="w-full mt-3 bg-[#4a5df9] hover:bg-[#4150f7] disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl"
        >
          {saving ? "Creating..." : "Create"}
        </button>
      </div>
    </div>
  );
};

export default NewHighlightModal;