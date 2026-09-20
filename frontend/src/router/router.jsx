import { createBrowserRouter } from "react-router-dom";

import App from "../App.jsx";

import LoginPage from "../pages/LoginPage.jsx";
import SignupPage from "../pages/SignupPage.jsx";
import DobPage from "../pages/DobPage.jsx";
import ConfirmationPage from "../pages/ConfirmationPage.jsx";
import ForgotPasswordPage from "../pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "../pages/ResetPasswordPage.jsx";
import FollowingSetupPage from "../pages/FollowingSetupPage.jsx";
import LogoutPage from "../pages/AboutPage.jsx";

import HomePage from "../pages/HomePage.jsx";
import UserProfilePage from "../pages/UserProfilePage.jsx";
import EditProfilePage from "../pages/EditProfilePage.jsx";
import SelectImagePage from "../pages/SelectImagePage.jsx";
import CropImagePage from "../pages/CropImagePage.jsx";
import CaptionSharePage from "../pages/CaptionSharePage.jsx";
import CreatePostPage from "../pages/CreatePostPage.jsx";
import CommentsOverlay from "../components/CommentsOverlay.jsx";
import ExplorePage from "../pages/ExplorePage.jsx";
import MessagesPage from "../pages/MessagesPage.jsx";
import Chat from "../components/Chat.jsx";
import NotificationsPage from "../pages/NotificationsPage.jsx";
import ReelsPage from "../pages/ReelsPage.jsx";
import UserStoryPage from "../pages/UserStoryPage.jsx";
import StoryPage from "../pages/StoryViewerPage.jsx";
import StoryViewerPage from "../pages/StoryViewerPage.jsx";
import HighlightViewerPage from "../pages/HighlightViewerPage.jsx";
import AboutPage from "../pages/AboutPage.jsx";
import GoogleAuthCallback from "../pages/GoogleAuthCallback.jsx";
import CompleteProfile from "../pages/CompleteProfile.jsx";
import PrivacyPolicy from "../pages/Legal/PrivacyPolicy";
import Terms from "../pages/Legal/Terms";




const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: "/", element: <LoginPage /> },
      { path: "/user/signup", element: <SignupPage /> },
      { path: "/user/dob", element: <DobPage /> },
      { path: "/user/confirm-otp", element: <ConfirmationPage /> },
      { path: "/user/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/user/reset-password", element: <ResetPasswordPage /> },
      { path: "/auth/callback", element: <GoogleAuthCallback /> },
      { path: "/user/complete-profile", element: <CompleteProfile /> },
      { path: "/user/recommendations", element: <FollowingSetupPage /> },


      { path: "/home", element: <HomePage /> },
      { path: "/user/get-profile", element: <UserProfilePage /> },
      { path: "/user/get-profile/:userId", element: <UserProfilePage /> },
      { path: "/user/edit-profile", element: <EditProfilePage /> },

      // { path: "/create/select-image", element: <SelectImagePage /> },
      // { path: "/create/crop-image", element: <CropImagePage /> },
      // { path: "/create/caption-share", element: <CaptionSharePage/> },

      { path: "/create/post", element: <CreatePostPage /> },
      { path: "/comments", element: <CommentsOverlay /> },

      { path: "/explore", element: <ExplorePage /> },
      { path: "/user/messages", element: <MessagesPage /> },
      { path: "/user/messages/:conversationId", element: <MessagesPage /> },

      { path: "/user/notifications", element: <NotificationsPage /> },

      { path: "/reels", element: <ReelsPage /> },

      {path: "/story/create", element: <UserStoryPage /> },
      {path: "/story/view/:userId", element: <StoryViewerPage /> },
      {path: "/highlight/view/:highlightId", element: <HighlightViewerPage/> },

      {path: "/about", element: <AboutPage/> },

      { path: "/privacy-policy", element: <PrivacyPolicy />},
      { path: "/terms", element: <Terms /> },

    ],
  },
]);

export default router;