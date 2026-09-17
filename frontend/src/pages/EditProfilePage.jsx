import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import axios from "axios"
import IconSidebar from "../components/IconSidebar";
import EditProfilePic from "../components/EditProfilePic";
import MobileFooter from "../components/MobileFooter";
import AiBioAssistant from "../components/AiBioAssistant";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";

const BASE_URL = import.meta.env.VITE_SERVER_URL

const EditProfilePage = () => {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm();

const navigate = useNavigate()

   const {user, setUser} = useAuth()
   const [bio, setBio] = useState("");
  const [gender, setGender] = useState();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("authToken");

        const res = await axios.get(`${BASE_URL}/user/profile/get-profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.data.success) {
          setUser(res.data.user);
        }
      } catch (error) {
        console.error(error);
        toast.error("Could not load profile");
      }
    };

    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prevBio = user?.bio || "Write something about yourself......";
  
  const maxLength = 150;

  const [isModalOpen, setIsModalOpen] = useState(false);
 
  const [customGender, setCustomGender] = useState("");

  useEffect(() => {
  if(user){
    setBio(user.bio || "");
    setGender(user.gender || "Prefer not to say");
    // keep react-hook-form's own copy of `bio` in sync with the loaded
    // profile — see handleBioChange below for why this is needed
    setValue("bio", user.bio || "");
  }
}, [user, setValue]);


  // Single writer for the bio field. The textarea is controlled by local
  // state AND registered with react-hook-form; because the JSX passes its
  // own onChange after {...register("bio")}, RHF's onChange is overwritten
  // and it would otherwise never see the value (submitting `undefined`).
  // Writing both here keeps the counter, the validation and the submitted
  // payload consistent — and lets the AI result flow through the exact
  // same path as typing.
  const handleBioChange = (value) => {
    const next = value ?? "";
    setBio(next);
    setValue("bio", next, { shouldValidate: true, shouldDirty: true });
  };

  const handleClick = (e) => {
    setGender(e.target.id);
    setIsModalOpen(false);
  };

  

  const onSubmit = async (data) => {
  try {
    const token = localStorage.getItem("authToken");

    const payload = {
      ...data,
      gender: gender === "custom" ? customGender : gender,
    };

    const res = await axios.put(
      `${BASE_URL}/user/profile/edit-profile`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (res.status === 200) {

      // the backend responds with `updatedUser`, not `user`
      setUser(res.data.updatedUser || res.data.user);
      navigate("/user/get-profile", {
            state: {
              message: "Profile updated successfully"
            }
          });
    } else {
       toast.error(
      res.data?.message || "Something went wrong"
    );
    }

  } catch (error) {
    console.error(error.response?.data || error.message);
    toast.error("Error updating profile");
  }
};

  return (
    <div className="editProfilePage w-[100vw] h-[100vh] flex justify-center items-center bg-[var(--bg-app)]">
      <IconSidebar />

      <div className="profileSection w-full md:w-[88%] 2xl:w-[80%] h-full flex justify-center items-center overflow-x-hidden ">

        <div className="relative editContainer w-full md:w-[95%] lg:w-[92%] h-full flex flex-col justify-start items-center">

          <div className="heading w-[80%] h-[15%] flex justify-start items-center text-[20px] text-[var(--text-primary)] font-bold">
            Edit Profile
          </div>

          {/* Profile Pic stays outside the form */}
          <EditProfilePic user={user} />

          {/* --- ONE FORM for bio + gender + submit --- */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="w-full sm:w-[80%] md:w-full lg:w-[80%] min-h-[50%] flex flex-col justify-start items-center"
          >
            {/* --- Edit Bio --- */}
            <div className="editBio relative w-full h-[40%] mt-4 flex flex-col justify-start items-center rounded-[20px]">
              <div className="heading w-full flex items-center justify-between gap-2 mb-2">
                <span className="text-[18px] text-[var(--text-primary)] font-bold">
                  Bio
                </span>

                {/* Writes into the same field the user types in — nothing
                    is saved until Submit is pressed. */}
                <AiBioAssistant currentBio={bio} onBio={handleBioChange} />
              </div>

              <textarea
                {...register("bio", {
                  required: "This field is required",
                  maxLength: {
                    value: maxLength,
                    message: "Bio must be less than 150 characters",
                  },
                })}
                value={bio}
                onChange={(e) => handleBioChange(e.target.value)}
                rows={3}
                className={`w-full h-full  text-[16px] resize-none outline-none placeholder-[var(--text-muted)] text-[var(--text-input)] rounded-[20px] p-2 ${
                  errors.bio
                    ? "border border-[var(--color-error)]"
                    : "border border-[var(--border-input)]"
                }`}
                placeholder="Write something about yourself..."
              />

              {/* Character Counter */}
              <div className="absolute bottom-[8px] right-[12px] z-10 flex justify-end text-[var(--text-primary)] text-[11px]">
                <span
                  className={`${
                    bio.length > maxLength - 10
                      ? "text-[var(--color-error)]"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  {bio.length}/{maxLength}
                </span>
              </div>

              {errors.bio && (
                <p className="text-[var(--color-error)] text-sm mt-1">
                  {errors.bio.message}
                </p>
              )}
            </div>

            {/* --- Edit Gender --- */}
            <div className="editGender w-full h-[30%] mt-4 flex flex-col justify-start items-center rounded-[20px]">
              <div className="heading w-full text-[18px] text-[var(--text-primary)] font-bold mb-2">
                Gender
              </div>

              <input
                {...register("gender")}
                onClick={() => setIsModalOpen(true)}
                className={`w-full h-full  text-[16px] outline-none placeholder-[var(--text-muted)] text-[var(--text-input)] rounded-[20px] px-[10px] my-[3px] cursor-pointer hover:bg-[var(--bg-row-hover)] ${
                  errors.gender
                    ? "border border-[var(--color-error)]"
                    : "border border-[var(--border-input)]"
                }`}
                value={gender === "custom" ? customGender || "Custom" : gender}
                readOnly
              />
              {errors.gender && (
                <p className="text-[var(--color-error)] text-sm mt-1">
                  {errors.gender.message}
                </p>
              )}

              {/* --- Gender Modal --- */}
              {isModalOpen && (
                <div
                  className="absolute top-0 left-0 h-[600px] inset-0 flex justify-center items-center bg-[var(--overlay-scrim)] backdrop-blur-[var(--overlay-blur)] z-10"
                  onClick={() => setIsModalOpen(false)}
                >
                  <div
                    className="modal bg-[var(--bg-menu)] w-[90%] sm:w-[350px] rounded-2xl overflow-hidden text-center text-[var(--text-primary)] border border-[var(--border-container)] shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="py-4 border-b border-[var(--border-popup)] text-[18px] font-semibold">
                      Select Your Gender
                    </div>

           {/* Male */}
<div className="w-full py-3 px-10 hover:bg-[var(--bg-row-hover)] flex justify-between items-center cursor-pointer">
  Male
  <input
    type="radio"
    name="gender"
    id="Male"
    onClick={handleClick}
    checked={gender === "Male"}
    readOnly
    className="w-[20px] h-[20px]"
  />
</div>

{/* Female */}
<div className="w-full py-3 px-10 hover:bg-[var(--bg-row-hover)] flex justify-between items-center cursor-pointer">
  Female
  <input
    type="radio"
    name="gender"
    id="Female"
    onClick={handleClick}
    checked={gender === "Female"}
    readOnly
    className="w-[20px] h-[20px]"
  />
</div>

{/* Prefer not to say */}
<div className="w-full py-3 px-10 hover:bg-[var(--bg-row-hover)] flex justify-between items-center cursor-pointer">
  Prefer not to say
  <input
    type="radio"
    name="gender"
    id="Prefer not to say"
    onClick={handleClick}
    checked={gender === "Prefer not to say"}
    readOnly
    className="w-[20px] h-[20px]"
  />
</div>

{/* Custom */}
<div className="w-full">
  <div className="w-full py-3 px-10 hover:bg-[var(--bg-row-hover)] flex justify-between items-center cursor-pointer">
    Custom
    <input
      type="radio"
      name="gender"
      id="custom"
      value="custom"
      checked={gender === "custom"}
      onChange={(e) => setGender(e.target.value)}
      className="w-[20px] h-[20px]"
    />
  </div>

  {gender === "custom" && (
    <input
      type="text"
      name="customGender"
      id="customGender"
      placeholder="Enter custom gender"
      value={customGender}
      onChange={(e) => setCustomGender(e.target.value)}
      className="w-[80%] h-[60px] px-2 text-[16px] text-[var(--text-primary)] rounded-lg bg-[var(--bg-input)]"
    />
  )}
</div>


                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="block w-full py-3 hover:bg-[var(--bg-row-hover)] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* --- Submit Button --- */}
            <div className="submitSection w-full h-[10%] mt-8 flex justify-center items-center">
              <button
                type="submit"
                className="w-[100px] sm:w-[150px] h-[40px] bg-[var(--accent-indigo)] hover:bg-[var(--accent-indigo-hover)] cursor-pointer text-white text-[14px] sm:text-[16px] font-bold rounded-xl"
              >
                Submit
              </button>
            </div>
          </form>

         

        </div>

        <MobileFooter />
        
      </div>
    </div>
  );
};

export default EditProfilePage;