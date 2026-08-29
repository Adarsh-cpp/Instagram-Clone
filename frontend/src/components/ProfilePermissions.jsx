// ProfilePermissions.jsx
import React from 'react'
import ProfileSettingsCard from './ProfileSettingsCard'
import {
  EditProfileIcon,
  SettingsNotificationsIcon,
  AccountPrivacyIcon,
  CloseFriendsIcon,
  BlockedIcon,
  RestrictedAccountsIcon,
  StoryLocationsIcon,
  TagsMentionsIcon,
  CommentsIcon,
} from './Icons'

const ProfilePermissions = () => {
  return (
      <div className="profilePermissions hidden w-[35%] lg:w-[25%] h-full border border-r-[#2b3036] bg-[#0c1014] overflow-y-auto md:block ">
        <div className="heading w-[100%] h-[15%] flex justify-center items-center text-[20px] text-white font-bold">
            Settings
          </div>
        <ProfileSettingsCard icon={<EditProfileIcon />} iconName={"Edit Profile"} />
        <ProfileSettingsCard icon={<SettingsNotificationsIcon />} iconName={"Notifications"} />
        <ProfileSettingsCard icon={<AccountPrivacyIcon />} iconName={"Account Privacy"} />
        <ProfileSettingsCard icon={<CloseFriendsIcon />} iconName={"Close Friends"} />
        <ProfileSettingsCard icon={<BlockedIcon />} iconName={"Blocked"} />
        <ProfileSettingsCard icon={<RestrictedAccountsIcon />} iconName={"Restricted Accounts"} />
        <ProfileSettingsCard icon={<StoryLocationsIcon />} iconName={"Story and Locations"} />
        <ProfileSettingsCard icon={<TagsMentionsIcon />} iconName={"Tags and Mentions"} />
        <ProfileSettingsCard icon={<CommentsIcon />} iconName={"Comments"} />

      </div>
  )
}

export default ProfilePermissions