import Highlight from "../models/highlight.model.js";
import storyModel from "../models/story.model.js";

// POST /highlight/create  { title, storyIds?: [...] }
// storyIds is now optional — lets the "+" button on the profile page create
// an empty, named highlight that stories get added to later via
// addStoryToHighlight.
export const createHighlight = async (req, res) => {
  try {
    const userId = req.user._id;
    const { title, storyIds } = req.body;
    const ids = Array.isArray(storyIds) ? storyIds : [];

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    let stories = [];
    if (ids.length > 0) {
      stories = await storyModel.find({ _id: { $in: ids } });

      for (const story of stories) {
        if (story.author.toString() !== userId.toString()) {
          return res.status(403).json({ success: false, message: "Cannot use another user's story" });
        }
        if (story.isHighlighted) {
          return res.status(400).json({ success: false, message: "A story can only belong to one highlight" });
        }
      }
    }

    const highlight = await Highlight.create({
      owner: userId,
      title: title.trim(),
      coverImage: stories[0]?.mediaUrl || "",
      stories: ids,
    });

    if (ids.length > 0) {
      // Mark stories as highlighted. We deliberately do NOT touch expiresAt
      // here — it keeps counting down normally so the story still shows up
      // in the active 24h feed for however long it naturally has left.
      // The model's partial TTL index (isHighlighted: false) is what stops
      // Mongo from actually deleting the document once expiresAt passes, so
      // the story simply stops appearing as "active" but stays saved here.
      await storyModel.updateMany(
        { _id: { $in: ids } },
        { $set: { isHighlighted: true, highlight: highlight._id } }
      );
    }

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

    // if this highlight has no cover yet (created empty via the "+" flow,
    // or this is simply its first story), use this story's media as the cover
    if (!highlight.coverImage) {
      highlight.coverImage = story.mediaUrl;
    }

    highlight.stories.push(storyId);
    await highlight.save();

    // Same as createHighlight — leave expiresAt exactly as it is. It'll
    // naturally stop showing in the active feed at its real 24h mark, and
    // the partial TTL index (isHighlighted: false) keeps Mongo from
    // deleting the document while it's still highlighted.
    story.isHighlighted = true;
    story.highlight = highlight._id;
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

// DELETE /highlight/:highlightId — owner-only; stories themselves are NOT
// deleted here, just unlinked. Their expiresAt is left completely alone —
// if it's already in the past (the common case for anything that's been
// sitting in a highlight a while), the partial TTL index will pick it up
// and clean it up on its own once isHighlighted flips to false, with no
// artificial "add 24h back" step and no risk of it reappearing in feeds.
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

// DELETE /highlight/:highlightId/story/:storyId — owner-only. Removes ONE
// story from a highlight. Same rule as deleteHighlight: expiresAt is never
// touched here. This is the fix for the "3-day-old story reappears as
// active" bug — that was caused by resetting expiresAt to now + 24h on
// removal. Now the story just resumes being governed by whatever expiresAt
// it already had (almost always already in the past for anything that had
// been sitting in a highlight), so it never reappears, and the partial TTL
// index lets Mongo actually delete it soon after since isHighlighted is
// now false.
export const removeStoryFromHighlight = async (req, res) => {
  try {
    const userId = req.user._id;
    const { highlightId, storyId } = req.params;

    const highlight = await Highlight.findById(highlightId);
    if (!highlight) {
      return res.status(404).json({ success: false, message: "Highlight not found" });
    }
    if (highlight.owner.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const idx = highlight.stories.findIndex((s) => s.toString() === storyId);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: "Story not found in this highlight" });
    }

    highlight.stories.splice(idx, 1);

    const story = await storyModel.findById(storyId);
    if (story) {
      story.isHighlighted = false;
      story.highlight = null;
      await story.save();
    }

    // last story removed → delete the now-empty highlight entirely
    if (highlight.stories.length === 0) {
      await Highlight.findByIdAndDelete(highlightId);
      return res.status(200).json({
        success: true,
        deleted: true,
        message: "Highlight deleted (no stories left)",
      });
    }

    // if the removed story was the cover image, fall back to the new first story
    if (story && highlight.coverImage === story.mediaUrl) {
      const newCoverStory = await storyModel.findById(highlight.stories[0]);
      highlight.coverImage = newCoverStory?.mediaUrl || "";
    }

    await highlight.save();

    res.status(200).json({ success: true, deleted: false, highlight });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
