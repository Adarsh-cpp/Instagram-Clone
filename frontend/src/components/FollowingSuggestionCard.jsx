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

    <div className="suggestedCard w-[180px] h-[250px] rounded-md m-2 cursor-pointer bg-[#121212] hover:bg-[#201f1f] ">
      <div className="profilePicSection w-full h-[56%] flex justify-center items-center ">
        <div className="pic w-[125px] h-[125px] rounded-full overflow-hidden ">
          <img src={props.user.profilePic ? props.user.profilePic : "/images/default-profile-pic.jpg"} alt="" className="w-full h-full object-cover" />
        </div>
      </div>
      <div className="nameSection w-full h-[20%] ">
        <Link to={`/user/get-profile/${props.user._id}`}> <div className="fullname w-full h-[50%] flex justify-center items-start hover:font-semibold ">{props.user.fullname}</div>
          <div className="username w-full h-[50%] flex justify-center items-start hover:font-semibold ">{props.user.username}</div>
        </Link>
      </div>

      <div className="followBtn w-full h-[24%] flex justify-center items-center">
        <button
          onClick={handleFollowToggle}
          className={`w-[80%] h-[70%] flex justify-center items-center font-bold rounded-[8px] cursor-pointer transition-all ${
            isFollowed
              ? "bg-[#363636] hover:bg-[#4a4a4a] text-white"
              : "bg-[#0095f6] hover:bg-[#1877f2] text-white"
          }`}
        >
          {isFollowed ? "Unfollow" : "Follow"}
        </button>
      </div>

    </div>

  )
}

export default FollowingSuggestionCard