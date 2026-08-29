import React from 'react'

const LogoutPage = () => {
  return (
    <div className='h-[100vh] w-[100vw] bg-[#0c1014] flex justify-center items-center'>
      <form action="http://localhost:4000/auth/logout" method='post'>
      <button className='w-[100px] h-[80px] bg-red-500 text-white font-bold'>Log Out</button>
      </form>
    </div>
  )
}

export default LogoutPage
