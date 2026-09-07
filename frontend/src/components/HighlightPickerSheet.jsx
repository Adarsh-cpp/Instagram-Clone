import React, { useEffect, useState } from "react";
import { Check, Plus } from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "../utils/axiosInstance";
import NewHighlightModal from "./NewHighlightModal";

const HighlightPickerSheet = ({ ownerId, storyId, onClose, onAdded }) => {
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axiosInstance.get(`/highlight/user/${ownerId}`);
        setHighlights(res.data.highlights || []);
      } catch (err) {
        toast.error("Couldn't load highlights");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [ownerId]);

  const handleConfirm = async () => {
    if (!selectedId || saving) return;
    setSaving(true);
    try {
      await axiosInstance.post(`/highlight/${selectedId}/add-story`, { storyId });
      toast.success("Added to highlight");
      onAdded(selectedId);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't add to highlight");
    } finally {
      setSaving(false);
    }
  };

  const handleCreatedFresh = async (highlight) => {
    setShowNewModal(false);
    try {
      await axiosInstance.post(`/highlight/${highlight._id}/add-story`, { storyId });
      toast.success("Added to new highlight");
      onAdded(highlight._id);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't add to highlight");
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-[#161616] w-full max-w-md rounded-t-2xl max-h-[65vh] overflow-y-auto p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="text-white text-sm font-semibold">Add to highlight</div>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1 text-[#4a5df9] text-xs font-semibold"
          >
            <Plus size={14} /> New
          </button>
        </div>

        {loading ? (
          <div className="text-white/60 text-sm py-4">Loading...</div>
        ) : highlights.length === 0 ? (
          <div className="text-white/60 text-sm py-4">
            No highlights yet — tap "New" to create one.
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {highlights.map((h) => (
              <button
                key={h._id}
                onClick={() => setSelectedId(h._id)}
                className="flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-white/5 text-left"
              >
                <div className="w-11 h-11 rounded-full overflow-hidden bg-[#0c1014] border border-white/10 shrink-0">
                  {h.coverImage ? (
                    <img src={h.coverImage} alt="" className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <span className="text-white text-sm flex-1 truncate">{h.title}</span>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedId === h._id ? "bg-[#4a5df9] border-[#4a5df9]" : "border-white/30"
                  }`}
                >
                  {selectedId === h._id && <Check size={12} className="text-white" />}
                </div>
              </button>
            ))}
          </div>
        )}

        {highlights.length > 0 && (
          <button
            onClick={handleConfirm}
            disabled={!selectedId || saving}
            className="w-full mt-4 bg-[#4a5df9] hover:bg-[#4150f7] disabled:opacity-40 text-white text-sm font-bold py-2.5 rounded-xl"
          >
            {saving ? "Adding..." : "Add"}
          </button>
        )}
      </div>

      {showNewModal && (
        <NewHighlightModal onClose={() => setShowNewModal(false)} onCreated={handleCreatedFresh} />
      )}
    </div>
  );
};

export default HighlightPickerSheet;