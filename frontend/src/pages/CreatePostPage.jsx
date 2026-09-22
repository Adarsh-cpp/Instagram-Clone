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

  const [trimmedMedia, setTrimmedMedia] = useState(null);
  const [trimData, setTrimData] = useState({ trimStart: 0, trimDuration: 0 });

  const navigate = useNavigate();

  const handlePost = (caption, location, taggedUsers) => {
    const isVideo = mediaType === "video";
    const token = localStorage.getItem("authToken");

    const buildFormData = () => {
      const formData = new FormData();
      if (isVideo) {
        formData.append("video", trimmedMedia || originalMedia);
        formData.append("trimStart", trimData.trimStart);
        formData.append("trimDuration", trimData.trimDuration);
      } else {
        editedImages.forEach((file, i) => {
          formData.append("images", file, file.name || `slide-${i}.jpg`);
        });
      }
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
        url: isVideo ? `${BASE_URL}/reels/create-reel` : `${BASE_URL}/post/create-post`,
        method: isVideo ? "post" : "put",
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
          setTrimmedMedia={setTrimmedMedia}
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
          video={mediaType === "video" ? trimmedMedia || originalMedia : null}
          trimData={trimData}
          isPreTrimmed={mediaType === "video" && !!trimmedMedia}
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