import Highlight from "../models/highlight.model.js";
import storyModel from "../models/story.model.js";

// POST /highlight/create  { title, storyIds: [...] }
export const createHighlight = async (req, res) => {
  try {
    const userId = req.user._id;
    const { title, storyIds } = req.body;

    if (!title || !storyIds || storyIds.length === 0) {
      return res.status(400).json({ success: false, message: "Title and at least one story are required" });
    }

    // verify all stories belong to this user and aren't already in another highlight
    const stories = await storyModel.find({ _id: { $in: storyIds } });

    for (const story of stories) {
      if (story.author.toString() !== userId.toString()) {
        return res.status(403).json({ success: false, message: "Cannot use another user's story" });
      }
      if (story.isHighlighted) {
        return res.status(400).json({ success: false, message: "A story can only belong to one highlight" });
      }
    }

    const highlight = await Highlight.create({
      owner: userId,
      title,
      coverImage: stories[0]?.mediaUrl || "",
      stories: storyIds,
    });

    // mark stories as highlighted and $unset expiresAt so the TTL index leaves them alone forever
    await storyModel.updateMany(
      { _id: { $in: storyIds } },
      { $set: { isHighlighted: true, highlight: highlight._id }, $unset: { expiresAt: "" } }
    );

    res.status(201).json({ success: true, highlight });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /highlight/:highlightId/add-story  { storyId }
export const addStoryToHighlight = async (req, res) => {
  try {
    const userId = req.user._id;
    const { highlightId } = req.params;
    const { storyId } = req.body;

    const highlight = await Highlight.findById(highlightId);
    if (!highlight) {
      return res.status(404).json({ success: false, message: "Highlight not found" });
    }
    if (highlight.owner.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const story = await storyModel.findById(storyId);
    if (!story || story.author.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Invalid story" });
    }
    if (story.isHighlighted) {
      return res.status(400).json({ success: false, message: "Story already belongs to a highlight" });
    }

    highlight.stories.push(storyId);
    await highlight.save();

    story.isHighlighted = true;
    story.highlight = highlight._id;
    story.expiresAt = undefined; // stop TTL from deleting it
    await story.save();

    res.status(200).json({ success: true, highlight });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /highlight/user/:userId — all highlights for a profile page
export const getUserHighlights = async (req, res) => {
  try {
    const { userId } = req.params;

    const highlights = await Highlight.find({ owner: userId }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, highlights });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /highlight/:highlightId — full highlight with populated stories (for viewing)
export const getHighlightById = async (req, res) => {
  try {
    const { highlightId } = req.params;

    const highlight = await Highlight.findById(highlightId).populate({
      path: "stories",
      populate: { path: "song.songId", select: "title artist audioUrl" },
    });

    if (!highlight) {
      return res.status(404).json({ success: false, message: "Highlight not found" });
    }

    res.status(200).json({ success: true, highlight });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /highlight/:highlightId — owner-only; stories themselves are NOT deleted,
// just unlinked (they've already lost their expiresAt, so decide below)
export const deleteHighlight = async (req, res) => {
  try {
    const userId = req.user._id;
    const { highlightId } = req.params;

    const highlight = await Highlight.findById(highlightId);
    if (!highlight) {
      return res.status(404).json({ success: false, message: "Highlight not found" });
    }
    if (highlight.owner.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    // unlink stories — they stay in DB but are no longer "highlighted"
    // NOTE: they will NOT auto-expire again unless you explicitly reset expiresAt here.
    // Uncomment the next line if you want them to resume the 24h countdown after removal:
    // await storyModel.updateMany({ _id: { $in: highlight.stories } }, { isHighlighted: false, highlight: null, expiresAt: new Date(Date.now() + 24*60*60*1000) });

    await storyModel.updateMany(
      { _id: { $in: highlight.stories } },
      { isHighlighted: false, highlight: null }
    );

    await Highlight.findByIdAndDelete(highlightId);

    res.status(200).json({ success: true, message: "Highlight deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};