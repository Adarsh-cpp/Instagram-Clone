// MessagesPage.jsx
import React, { useEffect, useState } from 'react'
import MessageCard from '../components/MessageCard'
import Chat from '../components/Chat'
import axios from 'axios'
import { useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const MessagesPage = () => {

  const [conversations, setConversations] = useState([])
  const { conversationId } = useParams()
  const { user } = useAuth()

  useEffect(() => {
  const getAllConversations = async () => {
    try {
      const url = "http://localhost:4000/conversation/get-all-conversations"
      const token = localStorage.getItem("authToken")

      const response = await axios.get(url,{
        headers:{
          Authorization: `Bearer ${token}`
        }}
      )

      if(response.status === 200){
        setConversations(response.data.conversations)
      }
      else
        console.log("error fetching conversations")

    } catch (error) {
      console.log(error.message)
    }
  }
  getAllConversations()
  }, [])
  

  return (
    <div className="messagePage w-screen h-screen flex bg-[#0c1014] overflow-hidden">

      <div className="messagesList w-full md:w-[35%] lg:w-[30%] h-full border-r border-[#2C2C2C] bg-[#0c1014] ">

        <div className="upperPart w-full h-[20%]">

          <div className="accName w-full h-[40%] text-white text-[18px] sm:text-[20px] font-semibold px-4 sm:px-8 flex justify-start items-center">
            {user?.username}
          </div>

          <div className="searchSection w-full h-[60%] flex justify-center items-center border-b border-gray-700">

            <div className="searchbar w-[90%] h-[60%] flex justify-center items-center bg-[#25292e] rounded-3xl overflow-hidden">

              <div className="searchIcon w-[15%] sm:w-[10%] h-full flex justify-center items-center">
                <img
                  src="/images/search-icon-1.png"
                  alt="search"
                  className="w-5 h-5 sm:w-7 sm:h-7"
                />
              </div>

              <div className="searchText flex-1 h-full flex justify-center items-center">
                <input
                  type="text"
                  name="search"
                  id="search"
                  className="w-full h-full outline-none text-white px-4 bg-transparent"
                  placeholder="Search"
                />
              </div>

            </div>

          </div>

        </div>

        <div className="bottomPart w-full h-[75%]  overflow-y-auto">

       {
          conversations.map((conversation) => (
            <MessageCard
              key={conversation._id}
              conversation={conversation}
            />
          ))
        }
        </div>

      </div>

      {conversationId ? (
        <Chat conversationId={conversationId} />
      ) : (
        <div className="messageDisplay hidden md:flex md:flex-col relative md:w-[65%] lg:w-[70%] h-full bg-[#0c1014] text-white text-[20px]  justify-center items-center ">
          <div className="messageIcon w-full h-[120px] flex justify-center items-center ">
            <img src="/images/dm-icon.png" alt="" className="h-full" />
          </div>
          <div className="text w-full h-[60px] ">
            <div className="upperText w-full h-[50%] flex justify-center items-center text-white text-[24px] ">
              <span>Your messages</span>
            </div>
            <div className="lowerText w-full h-[50%] flex justify-center items-end text-[#A8A8A8] text-[18px] ">
              <span>Send private photos and messages to a friend or group.</span>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default MessagesPage