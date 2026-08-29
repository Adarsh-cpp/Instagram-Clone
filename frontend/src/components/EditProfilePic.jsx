import React, { useRef, useState, useEffect } from "react";
import axios from 'axios';
import { toast } from "react-toastify";

const EditProfilePic = ({...props}) => {
  const fileInputRef = useRef(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState(props.user);
  const [imgLoading, setImgLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleOpenFileDialog = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (event) => {
    setLoading(true);
    const file = event.target.files[0];
    if (!file) {
      setLoading(false);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setLoading(false);
      toast.warning("Please upload a valid image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLoading(false);
      toast.warning("Image must be less than 2MB.");
      return;
    }

    setIsModalOpen(false);
    try {
      const formData = new FormData();
      formData.append("profilePic", file);
      const token = localStorage.getItem("authToken");
      const res = await axios.put(
        "http://localhost:4000/user/profile/change-dp",
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setUser(res.data.updatedUser);
        toast.success("Profile pic updated successfully");
      } else {
        toast.error(res.data.message || "Some error occurred");
      }
    } catch (error) {
      toast.error("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");

      const res = await axios.delete(
        "http://localhost:4000/user/profile/remove-dp",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data.success) {
        setUser(res.data.updatedUser);
        setLoading(false);
        setIsModalOpen(false);
        toast.success("Profile pic removed successfully")
      } else {
        toast.error(res.data.message);
      }

    } catch (error) {
      console.error(error);
      toast.error("Failed to remove profile picture");
    }
  };

  useEffect(() => {
    setImgLoading(true);
  }, [user?.profilePic]);

  useEffect(() => {
    setUser(props.user);
    if (props.user) {
      setImgLoading(false);
    }
  }, [props.user]);

  return (
    <div className="editPic w-full sm:w-[80%] md:w-full lg:w-[80%] h-[15%] mt-4 flex rounded-[20px] overflow-hidden bg-[#25282c]">
      {/* --- Left Side --- */}
      <div className="picSide w-[70%] sm:w-[65%] lg:w-[50%] h-full flex justify-start items-center px-4  ">
        <div className="profilePic relative w-[80px] h-[80px] sm:w-[90px] sm:h-[90px] rounded-full overflow-hidden">

        {/* //Loader  */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white  ">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 animate-spin p-[3px]">
              <div className="w-full h-full bg-white rounded-full"></div>
              <div className="block w-[20px] h-[20px] absolute top-[20px] bg-white "></div>
              </div>
            </div>
          )}
         
          {imgLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white ">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 animate-spin p-[3px]">
              <div className="w-full h-full bg-white rounded-full"></div>
              </div>
            </div>
          )}

         <img
            src={user?.profilePic || "/images/default-profile-pic.jpg"}
            alt="Profile"
            onLoad={() => setImgLoading(false)}
            onError={() => setImgLoading(false)}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="username px-4 text-white text-[14px] sm:text-[16px] lg:text-[18px] font-bold">
          {user?.username}
        </div>
      </div>

      {/* --- Right Side --- */}
      <div className="btnSide w-[30%] sm:w-[35%] lg:w-[50%] h-full flex justify-end items-center px-4">
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-[130px]  sm:w-[150px] h-[50px] bg-[#4a5df9] hover:bg-[#4150f7] cursor-pointer text-white text-[12px] sm:text-[16px] font-bold rounded-xl"
        >
          Change Photo
        </button>
      </div>

      {/* --- Hidden File Input --- */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* --- Modal Overlay --- */}
      {isModalOpen && (
        <div className="absolute h-[600px] inset-0 flex justify-center items-center bg-[rgba(0,0,0,0.8)]  bg-opacity-70 z-10">
          <div className="modal bg-[#262626] w-[90%] sm:w-[350px] rounded-2xl overflow-hidden text-center text-white shadow-lg">
            <div className="py-4 border-b border-gray-600 text-[18px] font-semibold">
              Change Profile Photo
            </div>
            <button onClick={handleOpenFileDialog} className="block w-full py-3 text-[#0095F6]  hover:text-[#49adf0] font-semibold hover:bg-[#2c2c2c] cursor-pointer ">
              Upload Photo
            </button>
            <button onClick={handleRemovePhoto} className="block w-full py-3 text-[#ED4956] hover:text-[#ec717b] font-semibold hover:bg-[#2c2c2c] cursor-pointer ">
              Remove Current Photo
            </button>
            <button onClick={() => setIsModalOpen(false)} className="block w-full py-3 hover:bg-[#2c2c2c] cursor-pointer ">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditProfilePic;