import songModel from "../models/song.model.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

const uploadBufferToCloudinary = (buffer, resourceType, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// GET /song/list — songs available to attach to a story
export const listSongs = async (req, res) => {
  try {
    const songs = await songModel.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, songs });
  } catch (error) {
    console.error("listSongs error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /song/:songId — single song lookup, useful when validating a story's
// song.startTime against the track's real duration
export const getSong = async (req, res) => {
  try {
    const { songId } = req.params;
    const song = await songModel.findById(songId);
    if (!song) {
      return res.status(404).json({ success: false, message: "Song not found" });
    }
    res.status(200).json({ success: true, song });
  } catch (error) {
    console.error("getSong error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /song/create — seed a track (audio file required, thumbnail optional)
// Expects multer to have populated req.files.audio[0] and req.files.thumbnail?.[0]
export const createSong = async (req, res) => {
  try {
    const { title, artist, duration, genre } = req.body;

    const audioFile = req.files?.audio?.[0];
    if (!audioFile) {
      return res.status(400).json({ success: false, message: "Audio file is required" });
    }
    if (!duration) {
      return res.status(400).json({ success: false, message: "Track duration (seconds) is required" });
    }

    const audioUpload = await uploadBufferToCloudinary(audioFile.buffer, "video", "songs"); // Cloudinary treats audio as resource_type "video"

    let thumbnailUrl = "";
    const thumbnailFile = req.files?.thumbnail?.[0];
    if (thumbnailFile) {
      const thumbUpload = await uploadBufferToCloudinary(thumbnailFile.buffer, "image", "songs/thumbnails");
      thumbnailUrl = thumbUpload.secure_url;
    }

    const song = await songModel.create({
      title,
      artist: artist || "Unknown",
      audioUrl: audioUpload.secure_url,
      audioPublicId: audioUpload.public_id,
      duration: Number(duration),
      thumbnail: thumbnailUrl,
      genre: genre || "General",
    });

    res.status(201).json({ success: true, song });
  } catch (error) {
    console.error("createSong error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /song/:songId
export const deleteSong = async (req, res) => {
  try {
    const { songId } = req.params;
    const song = await songModel.findById(songId);
    if (!song) {
      return res.status(404).json({ success: false, message: "Song not found" });
    }

    await cloudinary.uploader.destroy(song.audioPublicId, { resource_type: "video" });
    await songModel.findByIdAndDelete(songId);

    res.status(200).json({ success: true, message: "Song deleted" });
  } catch (error) {
    console.error("deleteSong error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
