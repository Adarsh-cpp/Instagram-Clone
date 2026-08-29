// Chat.jsx
import React, { useEffect, useState, useRef } from 'react'
import { Image, Send, Smile, X } from "lucide-react";
import socket from '../socket';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { Link, useParams } from 'react-router-dom';
import MessageBox from './MessageBox';
import { useSocket } from '../context/SocketContext';
import { getTimeAgo } from '../utils/timeAgo';

const MAX_IMAGES = 4;

const Chat = () => {

  const { onlineUsers, lastSeenMap } = useSocket()

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState();
  const [isFriendTyping, setIsFriendTyping] = useState(false);

  // selectedImages: [{ id, file, preview }]
  const [selectedImages, setSelectedImages] = useState([]);
  const fileInputRef = useRef(null);

  const [sendingImage, setSendingImage] = useState(false);

  const isFirstLoad = useRef(true);
  const typingTimeoutRef = useRef(null);
  const containerRef = useRef(null);
  const messageInputRef = useRef(null);

  const { user } = useAuth();
  const { conversationId } = useParams();

  const friend = conversation?.participants.find(
    (participant) => participant?._id !== user?._id
  );

  const isFriendOnline = onlineUsers?.includes(friend?._id);
  const friendLastSeen = lastSeenMap?.[friend?._id] || friend?.lastSeen;

  const activeStatusText = isFriendOnline
    ? "Active now"
    : friendLastSeen
    ? `Active ${getTimeAgo(friendLastSeen)} ago`
    : null;

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = MAX_IMAGES - selectedImages.length;
    if (remainingSlots <= 0) {
      toast.error(`You can only attach up to ${MAX_IMAGES} images`);
      e.target.value = "";
      return;
    }

    const validFiles = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        toast.error("Only image files are allowed");
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is over 10MB`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > remainingSlots) {
      toast.error(`Only ${remainingSlots} more image${remainingSlots === 1 ? "" : "s"} allowed`);
    }

    const toAdd = validFiles.slice(0, remainingSlots).map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
    }));

    setSelectedImages((prev) => [...prev, ...toAdd]);
    e.target.value = ""; // lets you re-pick the same file later if you clear it
  };

  const removeSelectedImage = (id) => {
    setSelectedImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((img) => img.id !== id);
    });
  };

  const clearSelectedImages = () => {
    setSelectedImages((prev) => {
      prev.forEach((img) => URL.revokeObjectURL(img.preview));
      return [];
    });
  };

  // avoid leaking blob URLs on unmount
  useEffect(() => {
    return () => {
      selectedImages.forEach((img) => URL.revokeObjectURL(img.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Shared helper — called on new incoming message, on tab refocus, and
  // right after loading history, so the PATCH call only needs writing once.
  const markConversationSeen = async () => {
    try {
      const token = localStorage.getItem("authToken");
      await axios.patch(
        `http://localhost:4000/message/${conversationId}/mark-seen`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      // silent: marking seen failing shouldn't interrupt the chat
    }
  };

  // reset "first load" flag whenever the conversation changes
  useEffect(() => {
    isFirstLoad.current = true;
  }, [conversationId]);

  // scroll to bottom: instant on first load, smooth after that
  useEffect(() => {
    if (!containerRef.current || messages.length === 0) return;

    if (isFirstLoad.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      isFirstLoad.current = false;
    } else {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  // fetch conversation (for friend details)
  useEffect(() => {
    if (!conversationId) return;

    const getConversation = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const url = `http://localhost:4000/conversation/${conversationId}`;

        const response = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 200) {
          setConversation(response.data.conversation);
        } else {
          toast.error("Error fetching conversation");
        }
      } catch (error) {
        toast.error("Some error occurred");
      }
    };

    getConversation();
  }, [conversationId]);

  // handle the seen feature when new messages arrives
  useEffect(() => {
    const handleNewMessage = (incomingMessage) => {
      if (incomingMessage.conversationId !== conversationId) return;
      setMessages((prev) => [...prev, incomingMessage]);

      const incomingSenderId =
        typeof incomingMessage.senderId === "object"
          ? incomingMessage.senderId._id
          : incomingMessage.senderId;

      if (
        incomingSenderId !== user?._id &&
        document.visibilityState === "visible"
      ) {
        markConversationSeen();
      }
    };

    socket.on("newMessage", handleNewMessage);
    return () => socket.off("newMessage", handleNewMessage);
  }, [conversationId, user?._id]);

  // handle the seen feature during a tab switch
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        markConversationSeen();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [conversationId]);

  // fetch message history, then mark seen
  useEffect(() => {
    if (!conversationId) return;

    const getAllMessages = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const response = await axios.get(
          `http://localhost:4000/message/${conversationId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.status === 200) {
          setMessages(response.data.messages);
          await markConversationSeen();
        }
      } catch (error) {
        toast.error("Something went wrong");
      }
    };

    getAllMessages();
  }, [conversationId]);

  // listen for messagesSeen from the receiver
  useEffect(() => {
    const handleMessagesSeen = ({ conversationId: convId, seenAt }) => {
      if (convId !== conversationId) return;

      setMessages((prev) =>
        prev.map((msg) => {
          const senderId =
            typeof msg.senderId === "object"
              ? msg.senderId._id
              : msg.senderId;

          return senderId === user?._id
            ? { ...msg, seen: true, updatedAt: seenAt }
            : msg;
        })
      );
    };

    socket.on("messagesSeen", handleMessagesSeen);
    return () => socket.off("messagesSeen", handleMessagesSeen);
  }, [conversationId, user?._id]);

  // derive which message gets the "Seen X ago" label
  const lastSeenMessageId = [...messages]
    .reverse()
    .find((msg) => {
      const senderId =
        typeof msg.senderId === "object"
          ? msg.senderId._id
          : msg.senderId;
      return senderId === user?._id && msg.seen === true;
    })?._id;

  // typing indicator: listen
  useEffect(() => {
    const handleTypingEvent = ({ senderId, conversationId: convId }) => {
      if (convId === conversationId && senderId === friend?._id) {
        setIsFriendTyping(true);
      }
    };

    const handleStopTypingEvent = ({ senderId, conversationId: convId }) => {
      if (convId === conversationId && senderId === friend?._id) {
        setIsFriendTyping(false);
      }
    };

    socket.on("typing", handleTypingEvent);
    socket.on("stopTyping", handleStopTypingEvent);

    return () => {
      socket.off("typing", handleTypingEvent);
      socket.off("stopTyping", handleStopTypingEvent);
    };
  }, [conversationId, friend?._id]);

  useEffect(() => {
    return () => clearTimeout(typingTimeoutRef.current);
  }, []);

  const handleTyping = (e) => {
    setMessage(e.target.value);

    socket.emit("typing", {
      senderId: user._id,
      receiverId: friend?._id,
      conversationId,
    });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stopTyping", {
        senderId: user._id,
        receiverId: friend?._id,
        conversationId,
      });
    }, 2000);
  };

  const handleSendMessage = async () => {
    if (!message.trim() && selectedImages.length === 0) return;
    if (sendingImage) return; // guard against double-fires while an upload is in flight

    const isImageSend = selectedImages.length > 0;

    try {
      const token = localStorage.getItem("authToken");
      const url = `http://localhost:4000/message/${conversationId}`;

      clearTimeout(typingTimeoutRef.current);
      socket.emit("stopTyping", { senderId: user._id, receiverId: friend?._id, conversationId });

      let response;

      if (isImageSend) {
        setSendingImage(true);
        const formData = new FormData();
        selectedImages.forEach(({ file }) => formData.append("images", file));
        if (message.trim()) formData.append("message", message.trim());

        response = await axios.post(url, formData, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
        });
      } else {
        response = await axios.post(url, { message }, { headers: { Authorization: `Bearer ${token}` } });
      }

      if (response.status === 201) {
        setMessages((prev) => [...prev, response.data.data]);
        setMessage("");
        clearSelectedImages();
        messageInputRef.current?.focus();
      } else {
        toast.error("Error sending message");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      if (isImageSend) setSendingImage(false);
    }
  };

  return (
    <div className="messageDisplay hidden md:block relative md:w-[65%] lg:w-[70%] h-full bg-[#0c1014]">

      <div className="reciverDetails w-full h-[85px] flex border-b border-gray-600">

        <div className="messageCard w-[70%] lg:w-[50%] h-full flex justify-center items-center cursor-pointer">

          <div className="profilePicSection w-[20%] h-full flex justify-center items-center">
            <div className="profilePic w-[50px] h-[50px] lg:w-[70px] lg:h-[70px] rounded-full overflow-hidden">
              <img src={friend?.profilePic} alt="" className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="messageDetails w-[80%] h-full">
            <div className="fullname w-full h-[50%] flex justify-start items-end text-white text-[15px] lg:text-[18px]">
              <span className="ml-2">{friend?.fullname}</span>
            </div>
            <div className="lastMsg w-full h-[50%] flex justify-start items-start text-[12px] lg:text-[14px]">
              <span className={`ml-2 ${isFriendOnline ? "text-green-500" : "text-[#a2a3a3]"}`}>
                {activeStatusText}
              </span>
            </div>
          </div>

        </div>

        <div className="profileInfoBtnSection flex-1 h-full flex justify-end items-center">
          <div className="btn w-[35px] h-[35px] mr-4 overflow-hidden">
            <img src="/images/info-icon.png" alt="" className="w-full h-full" />
          </div>
        </div>

      </div>

      <div ref={containerRef} className="chatContainer w-full h-[calc(100vh-165px)] transition-all duration-1000 ease-in-out overflow-y-auto">

        <div className="viewProfileSection w-full h-[250px] flex flex-col justify-center items-center">

          <div className="profilePicSection w-full h-[120px] flex justify-center items-center">
            <div className="profilePic w-[80px] h-[80px] lg:w-[100px] lg:h-[100px] rounded-full overflow-hidden">
              <img src={friend?.profilePic} alt="" className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="namesSection w-full h-[60px]">
            <div className="fullname w-full h-[50%] flex justify-center items-center text-white text-[20px] lg:text-[24px]">
              <span>{friend?.fullname}</span>
            </div>
            <div className="username w-full h-[50%] flex justify-center items-center text-[#a2a3a3] text-[14px] lg:text-[18px]">
              <span>{friend?.username}</span>
            </div>
          </div>

          <div className="viewProfileBtn mt-2 w-[150px] h-[40px] flex justify-center items-center">
            <Link to={`/user/get-profile/${friend?._id}`}>
              <button className='w-[100px] sm:w-[150px] h-[40px] bg-[#25292e] hover:bg-[#363c44] cursor-pointer text-white text-[14px] sm:text-[16px] font-bold rounded-xl'>
                View Profile
              </button>
            </Link>
          </div>

        </div>

        <div className="Chat w-full min-h-[calc(100vh-335px)]">
          {messages.map((msg) => (
            <MessageBox
             key={msg._id}
             message={msg}
             showSeen={msg._id === lastSeenMessageId} />
          ))}

          {isFriendTyping && (
            <div className=" w-full h-[30px] px-4 pb-1 my-4 text-[#a2a3a3] text-[18px]">
              Typing...
            </div>
          )}

        </div>

      </div>

      <div className="footer absolute bottom-0 left-0 w-full flex flex-col justify-center px-2 pb-2">

        {selectedImages.length > 0 && (
          <div className="imagePreview w-[98%] mx-auto mb-2 flex items-center gap-4 bg-[#1a1e23] rounded-2xl p-3">

            {/* tilted fanned stack of selected images */}
            <div className="flex items-center pl-3">
              {selectedImages.map((img, idx) => {
                const rotations = [-8, 5, -4, 7]; // fixed tilt per slot, alternating
                return (
                  <div
                    key={img.id}
                    style={{
                      transform: `rotate(${rotations[idx % rotations.length]}deg)`,
                      marginLeft: idx === 0 ? 0 : "-18px",
                      zIndex: idx,
                    }}
                    className="relative w-[56px] h-[56px] shrink-0 rounded-lg overflow-hidden border-2 border-[#1a1e23] shadow-md hover:z-10 hover:scale-105 transition-transform"
                  >
                    <img src={img.preview} alt="" className="w-full h-full object-cover" />

                    {sendingImage && (
                      <div className="absolute inset-0 bg-black/50 flex justify-center items-center">
                        <div className="w-[16px] h-[16px] border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      </div>
                    )}

                    {!sendingImage && (
                      <button
                        onClick={() => removeSelectedImage(img.id)}
                        className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-black/80 rounded-full flex justify-center items-center text-white text-[12px] cursor-pointer hover:bg-black"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <span className="text-[#a2a3a3] text-[13px]">
              {selectedImages.length}/{MAX_IMAGES} selected
            </span>

            <button
              onClick={clearSelectedImages}
              disabled={sendingImage}
              className="ml-auto text-white text-[13px] px-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:text-[#a2a3a3]"
            >
              Clear all
            </button>
          </div>
        )}

        <div className="messageBar w-[98%] mx-auto h-[55px] rounded-3xl flex border border-gray-400 overflow-hidden">

          <div className="emojiSection w-[12%] sm:w-[8%] md:w-[6%] flex justify-center items-center">
            <Smile size={28} className="text-white cursor-pointer" />
          </div>

          <div className="messageInput flex-1 h-full">
            <input
              type="text"
              name="message"
              id="message"
              value={message}
              onChange={handleTyping}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  handleSendMessage();
                }
              }}
              ref={messageInputRef}
              className="w-full h-full outline-none text-white text-[16px] lg:text-[18px] px-4 bg-transparent"
              placeholder="Message..."
            />
          </div>

          <div className="gllerySection w-[15%] sm:w-[12%] md:w-[10%] h-full flex justify-center items-center gap-2">
            <div onClick={handleSendMessage} className="send w-[40%] h-[80%] flex justify-center items-center ">
              <Send size={24} fill='' className="cursor-pointer text-white" />
            </div>
            <div
              onClick={() => selectedImages.length < MAX_IMAGES && fileInputRef.current?.click()}
              className={`gallery w-[30%] h-full flex justify-center items-center ${
                selectedImages.length >= MAX_IMAGES ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <Image size={24} fill='' className="cursor-pointer text-white" />
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              ref={fileInputRef}
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

        </div>

      </div>

    </div>
  )
}

export default Chat