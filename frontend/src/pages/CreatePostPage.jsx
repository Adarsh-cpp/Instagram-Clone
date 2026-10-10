import { useState } from "react";
import SelectImagePage from "./SelectImagePage";
import CropImagePage from "./CropImagePage";
import TrimVideoPage from "./TrimVideoPage";
import CaptionSharePage from "./CaptionSharePage";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUpload } from "../context/UploadContext";

const BASE_URL = import.meta.env.VITE_SERVER_URL

function CreatePostPage() {
  const [step, setStep] = useState(1);

  const [mediaType, setMediaType] = useState(null);
  const [originalMedia, setOriginalMedia] = useState(null);
  const { user } = useAuth();
  const { startUpload } = useUpload();

  const [editedImages, setEditedImages] = useState([]);
  const [aspectRatio, setAspectRatio] = useState("1:1");

  // Trimming happens server-side (Cloudinary transformation, applied via
  // the signed upload), so this is just the two numbers describing the
  // window — there's no separate "trimmed" File to track.
  const [trimData, setTrimData] = useState({ trimStart: 0, trimDuration: 0 });

  const navigate = useNavigate();

  const handlePost = (caption, location, taggedUsers) => {
    const token = localStorage.getItem("authToken");

    if (mediaType === "video") {
      // UploadContext sends the video straight to Cloudinary and only
      // tells our server the resulting publicId — no multipart body, no
      // server-side size limit, and it shows up in the same upload
      // pill/toast UI as image posts.
      startUpload(
        { type: mediaType, caption },
        {
          type: "directVideo",
          file: originalMedia,
          trimData,
          aspectRatio,
          caption,
          location,
          taggedUsers,
          token,
          baseUrl: BASE_URL,
        }
      );
      setTimeout(() => navigate("/home"), 400);
      return;
    }

    const buildFormData = () => {
      const formData = new FormData();
      editedImages.forEach((file, i) => {
        formData.append("images", file, file.name || `slide-${i}.jpg`);
      });
      formData.append("caption", caption);
      formData.append("ratio", aspectRatio);

      if (location) {
        formData.append("location", JSON.stringify(location));
      }
      if (taggedUsers && taggedUsers.length > 0) {
        formData.append("taggedUsers", JSON.stringify(taggedUsers.map((u) => u._id)));
      }

      return formData;
    };

    startUpload(
      { type: mediaType, caption },
      {
        url: `${BASE_URL}/post/create-post`,
        method: "put",
        buildFormData,
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    setTimeout(() => navigate("/home"), 400);
  };

  return (
    <>
      {step === 1 && (
        <SelectImagePage
          setOriginalMedia={setOriginalMedia}
          setMediaType={setMediaType}
          next={() => setStep(2)}
        />
      )}

      {step === 2 && mediaType === "image" && (
        <CropImagePage
          images={originalMedia}
          setEditedImages={setEditedImages}
          setAspectRatio={setAspectRatio}
          next={() => setStep(3)}
          back={() => setStep(1)}
        />
      )}

      {step === 2 && mediaType === "video" && (
        <TrimVideoPage
          video={originalMedia}
          setTrimData={setTrimData}
          setAspectRatio={setAspectRatio}
          next={() => setStep(3)}
          back={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <CaptionSharePage
          mediaType={mediaType}
          images={editedImages}
          video={mediaType === "video" ? originalMedia : null}
          trimData={trimData}
          aspectRatio={aspectRatio}
          back={() => setStep(2)}
          handlePost={handlePost}
          user={user}
          isLoading={false}
        />
      )}
    </>
  );
}

export default CreatePostPage;
