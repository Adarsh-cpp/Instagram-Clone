// FollowingSuggestionCard.jsx
import React, { useState, useEffect } from 'react'
import axios from "axios"
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';


const FollowingSuggestionCard = ({...props}) => {


  const [isFollowed, setIsFollowed] = useState(false);


  const { user, refreshUser } = useAuth()


  useEffect(() => {
    const followed = user?.following?.some(
      (id) => id.toString() === props.user?._id?.toString()
    );


    setIsFollowed(Boolean(followed));
  }, [user?.following, props.user?._id]);


  const handleFollowToggle = async () => {
    try {
      const token = localStorage.getItem("authToken");


      const response = await axios.post(
        `http://localhost:4000/user/profile/${props.user._id}/follow-toggle`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );


      if (response.data.success) {
        setIsFollowed(response.data.isFollowing);
        await refreshUser();
      }
    } catch (error) {
      console.log(error);
    }
  };


  return (


    <div className="suggestedCard w-[calc(50%-16px)] max-w-[180px] h-auto min-h-[140px] rounded-xl m-2 cursor-pointer bg-[#1a1a1a] hover:bg-[#242424] transition-all duration-200 border border-[#2b3036] hover:border-[#3a3a3a] shadow-sm hover:shadow-md">
      
      {/* Profile Picture Section */}
      <div className="profilePicSection w-full h-[45%] flex justify-center items-center pt-3 pb-2">
        <div className="pic w-[70px] h-[70px] rounded-full overflow-hidden ring-2 ring-[#2b3036] hover:ring-[#0095f6] transition-all duration-200">
          <img 
            src={props.user.profilePic ? props.user.profilePic : "/images/default-profile-pic.jpg"} 
            alt="" 
            className="w-full h-full object-cover" 
          />
        </div>
      </div>
      
      {/* Name Section */}
      <div className="nameSection w-full h-[35%] px-2 pb-2">
        <Link to={`/user/get-profile/${props.user._id}`}>
          <div className="fullname w-full text-center text-[13px] font-semibold text-white truncate hover:text-[#0095f6] transition-colors px-1">
            {props.user.fullname}
          </div>
          <div className="username w-full text-center text-[11px] text-gray-400 truncate hover:text-gray-300 transition-colors px-1">
            @{props.user.username}
          </div>
        </Link>
      </div>


      {/* Follow Button */}
      <div className="followBtn w-full h-[20%] flex justify-center items-center pb-3 px-2">
        <button
          onClick={handleFollowToggle}
          className={`w-full h-[32px] flex justify-center items-center font-semibold text-[12px] rounded-lg cursor-pointer transition-all duration-200 ${
            isFollowed
              ? "bg-transparent border border-[#363636] hover:border-[#4a4a4a] text-white hover:bg-[#2a2a2a]"
              : "bg-[#0095f6] hover:bg-[#1877f2] text-white shadow-sm hover:shadow"
          }`}
        >
          {isFollowed ? "Unfollow" : "Follow"}
        </button>
      </div>


    </div>


  )
}


export default FollowingSuggestionCard