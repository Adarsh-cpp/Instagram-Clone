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
      return res
        .status(404)
        .json({ success: false, message: "Song not found" });
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
      return res
        .status(400)
        .json({ success: false, message: "Audio file is required" });
    }

    if (!duration) {
      return res.status(400).json({
        success: false,
        message: "Track duration (seconds) is required",
      });
    }

    const audioUpload = await uploadBufferToCloudinary(
      audioFile.buffer,
      "video",
      "songs"
    );

    let thumbnailUrl = "";
    const thumbnailFile = req.files?.thumbnail?.[0];

    if (thumbnailFile) {
      const thumbUpload = await uploadBufferToCloudinary(
        thumbnailFile.buffer,
        "image",
        "songs/thumbnails"
      );
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

export const importJamendoTracks = async (req, res) => {
  try {
    const clientId = process.env.JAMENDO_CLIENT_ID;

    if (!clientId) {
      return res.status(500).json({
        success: false,
        message: "JAMENDO_CLIENT_ID is not set in the environment",
      });
    }

    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const tags = req.query.tags || "";
    const order = req.query.order || "popularity_total";

    const params = new URLSearchParams({
      client_id: clientId,
      format: "json",
      limit: String(limit),
      include: "musicinfo",
      audioformat: "mp32",
      // Exclude tracks whose license forbids commercial use.
      ccnc: "false",
      // Exclude tracks whose license requires share-alike.
      ccsa: "false",
      boost: order,
    });

    if (tags) params.set("tags", tags);

    const jamendoRes = await fetch(
      `https://api.jamendo.com/v3.0/tracks/?${params.toString()}`
    );

    if (!jamendoRes.ok) {
      const text = await jamendoRes.text();
      throw new Error(
        `Jamendo API error (${jamendoRes.status}): ${text}`
      );
    }

    const data = await jamendoRes.json();
    const tracks = data?.results || [];

    if (tracks.length === 0) {
      return res.status(200).json({
        success: true,
        imported: 0,
        skipped: 0,
        songs: [],
      });
    }

    const imported = [];
    let skipped = 0;

    for (const track of tracks) {
      const already = await songModel.findOne({ jamendoId: track.id });

      if (already) {
        skipped += 1;
        continue;
      }

      if (!track.audio) {
        skipped += 1;
        continue;
      }

      const song = await songModel.create({
        title: track.name,
        artist: track.artist_name || "Unknown",
        audioUrl: track.audio,
        audioPublicId: `jamendo:${track.id}`,
        duration: track.duration || 30,
        thumbnail: track.image || "",
        genre: track.musicinfo?.tags?.genres?.[0] || "General",
        source: "jamendo",
        jamendoId: track.id,
        licenseUrl: track.license_ccurl || "",
      });

      imported.push(song);
    }

    res.status(201).json({
      success: true,
      imported: imported.length,
      skipped,
      songs: imported,
    });
  } catch (error) {
    console.error("importJamendoTracks error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /song/:songId
export const deleteSong = async (req, res) => {
  try {
    const { songId } = req.params;
    const song = await songModel.findById(songId);

    if (!song) {
      return res
        .status(404)
        .json({ success: false, message: "Song not found" });
    }

    // Jamendo-sourced tracks are hosted externally — there's no Cloudinary
    // asset of ours to clean up for them.
    if (song.source !== "jamendo") {
      await cloudinary.uploader.destroy(song.audioPublicId, {
        resource_type: "video",
      });
    }

    await songModel.findByIdAndDelete(songId);

    res.status(200).json({ success: true, message: "Song deleted" });
  } catch (error) {
    console.error("deleteSong error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
