
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import axios from "axios"
import IconSidebar from "../components/IconSidebar";
import EditProfilePic from "../components/EditProfilePic";
import ProfilePermissions from "../components/ProfilePermissions";
import HamburgerMenu from "../components/HamburgerMenu";
import MobileFooter from "../components/MobileFooter";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";

const EditProfilePage = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

const navigate = useNavigate()

   const {user, setUser} = useAuth()
   const [bio, setBio] = useState("");
  const [gender, setGender] = useState();

  // Fetch the latest profile directly on mount instead of relying solely on
  // whatever is already sitting in AuthContext. This is what fixes the
  // "blank until refresh" bug: when navigating here from the Profile page
  // via client-side routing, the `user` object in context can still be
  // stale/incomplete (e.g. missing bio/gender) because the context's own
  // fetch hasn't resolved yet. A hard refresh "worked" only because it gave
  // that fetch enough time to finish before you reached this page. Fetching
  // here guarantees fresh data every time, regardless of timing.
  //
  // Note: bio/gender don't need to be set here directly — updating `user`
  // via setUser triggers the [user] effect below, which syncs them.
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("authToken");

        const res = await axios.get("http://localhost:4000/user/profile/get-profile", {
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

  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Kept as a fallback sync: if `user` updates elsewhere in the app while
  // this page is open (e.g. another tab, or a parent re-fetch), local
  // bio/gender stay in sync with it too.
  useEffect(() => {
  if(user){
    setBio(user.bio || "");
    setGender(user.gender || "Prefer not to say");
  }
}, [user]);



  const handleClick = (e) => {
    setGender(e.target.id);
    setIsModalOpen(false);
  };

 const handleMenuOpen = () => {
  setIsMenuOpen((prev) => !prev);
};

  

  const onSubmit = async (data) => {
  try {
    const token = localStorage.getItem("authToken");

    const payload = {
      ...data,
      gender: gender === "custom" ? customGender : gender,
    };

    const res = await axios.put(
      "http://localhost:4000/user/profile/edit-profile",
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (res.status === 200) {

      setUser(res.data.user); 
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
    <div className="editProfilePage w-[100vw] h-[100vh] flex justify-center items-center bg-[#0c1014]">
      <IconSidebar />

      <div className="profileSection w-full md:w-[88%] 2xl:w-[80%] h-full flex justify-center items-center overflow-x-hidden ">
       
       <ProfilePermissions />

        <div className="relative editContainer w-full md:w-[65%] lg:w-[75%] h-full flex flex-col justify-start items-center border border-red  ">

        {/* Navbar for Mobile */}

        <div className="mobileNav w-full h-[50px] flex justify-center items-center md:hidden border border-b-[#2b3036] ">

         <div className="heading w-[50%] h-full px-4 flex justify-start items-center text-[18px] text-white font-bold ">
          Edit Profile
         </div>

        <div className="menuIcon w-[50%] h-full px-4 flex justify-end items-center ">
          <img
            src={isMenuOpen ? "/images/close-icon.png" : "/images/more-icon.png"}
            alt=""
            onClick={handleMenuOpen}
            className="w-[40px] h-[34px] cursor-pointer"
          />
        </div>

        </div>

         {/* Hamburger Menu */}

         {isMenuOpen && <HamburgerMenu /> }

          <div className="heading w-[80%] h-[15%] flex justify-start items-center text-[20px] text-white font-bold">
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
              <div className="heading w-full text-[18px] text-white font-bold mb-2">
                Bio
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
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className={`w-full h-full  text-[16px] resize-none outline-none placeholder-[#A8A8A8] text-[#F5F5F5] rounded-[20px] p-2 ${
                  errors.bio
                    ? "border border-[#FF3040]"
                    : "border border-[#555555]"
                }`}
                placeholder="Write something about yourself..."
              />

              {/* Character Counter */}
              <div className="absolute bottom-[8px] right-[12px] z-10 flex justify-end text-white text-[11px]">
                <span
                  className={`${
                    bio.length > maxLength - 10
                      ? "text-[#FF3040]"
                      : "text-[#A8A8A8]"
                  }`}
                >
                  {bio.length}/{maxLength}
                </span>
              </div>

              {errors.bio && (
                <p className="text-[#FF3040] text-sm mt-1">
                  {errors.bio.message}
                </p>
              )}
            </div>

            {/* --- Edit Gender --- */}
            <div className="editGender w-full h-[30%] mt-4 flex flex-col justify-start items-center rounded-[20px]">
              <div className="heading w-full text-[18px] text-white font-bold mb-2">
                Gender
              </div>

              <input
                {...register("gender")}
                onClick={() => setIsModalOpen(true)}
                className={`w-full h-full  text-[16px] outline-none placeholder-[#A8A8A8] text-[#F5F5F5] rounded-[20px] px-[10px] my-[3px] cursor-pointer hover:bg-[#25282c] ${
                  errors.gender
                    ? "border border-[#FF3040]"
                    : "border border-[#555555]"
                }`}
                value={gender === "custom" ? customGender || "Custom" : gender}
                readOnly
              />
              {errors.gender && (
                <p className="text-[#FF3040] text-sm mt-1">
                  {errors.gender.message}
                </p>
              )}

              {/* --- Gender Modal --- */}
              {isModalOpen && (
                <div
                  className="absolute top-0 left-0 h-[600px] inset-0 flex justify-center items-center bg-[rgba(12,16,20,0.8)] bg-opacity-70 z-10"
                  onClick={() => setIsModalOpen(false)}
                >
                  <div
                    className="modal bg-[#0c1014] w-[90%] sm:w-[350px] rounded-2xl overflow-hidden text-center text-white shadow-lg"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="py-4 border-b border-gray-600 text-[18px] font-semibold">
                      Select Your Gender
                    </div>

           {/* Male */}
<div className="w-full py-3 px-10 hover:bg-[#25282c] flex justify-between items-center cursor-pointer">
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
<div className="w-full py-3 px-10 hover:bg-[#25282c] flex justify-between items-center cursor-pointer">
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
<div className="w-full py-3 px-10 hover:bg-[#25282c] flex justify-between items-center cursor-pointer">
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
  <div className="w-full py-3 px-10 hover:bg-[#25282c] flex justify-between items-center cursor-pointer">
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
      className="w-[80%] h-[60px] px-2 text-[16px] text-white rounded-lg bg-[#0c1014]"
    />
  )}
</div>


                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="block w-full py-3 hover:bg-[#25282c] cursor-pointer"
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
                className="w-[100px] sm:w-[150px] h-[40px] bg-[#4a5df9] hover:bg-[#4150f7] cursor-pointer text-white text-[14px] sm:text-[16px] font-bold rounded-xl"
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