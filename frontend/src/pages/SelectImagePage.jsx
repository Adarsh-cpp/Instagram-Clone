import React, { useRef } from 'react'
import { toast } from 'react-toastify'
import { ImagePlus } from 'lucide-react'

const MAX_IMAGES = 5

const SelectImagePage = ({ setOriginalMedia, setMediaType, next }) => {
  const fileInputRef = useRef(null)

  const handleSelectMedia = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if (files.length === 1 && files[0].type.startsWith('video/')) {
      setMediaType('video')
      setOriginalMedia(files[0])
      next()
      e.target.value = ''
      return
    }

    let images = files.filter((f) => f.type.startsWith('image/'))

    if (images.length === 0) {
      toast.error('Please select a photo, or a single video for a reel')
      e.target.value = ''
      return
    }

    if (files.length !== images.length) {
      toast.info('Videos were removed — carousels support photos only')
    }

    if (images.length > MAX_IMAGES) {
      toast.info(`You can select up to ${MAX_IMAGES} photos`)
      images = images.slice(0, MAX_IMAGES)
    }

    setMediaType('image')
    setOriginalMedia(images)
    next()
    e.target.value = ''
  }

  return (
    <div className="w-[100vw] h-[100vh] flex justify-center items-center bg-[var(--bg-app)]">
      <div className="selectContainerOverlay w-full h-full flex justify-center items-center bg-[rgba(0,0,0,0)] px-4">
        <div className="selectContainer w-full max-w-[500px] md:w-[70%] lg:w-[50%] xl:w-[30%] h-[70%] rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-container)] shadow-xl overflow-hidden">
          <div className="heading w-full h-[40px] text-[var(--text-primary)] text-[16px] sm:text-[18px] font-semibold flex justify-center items-center bg-[var(--bg-app)] border-b border-[var(--border-soft)]">
            Create new post
          </div>

          <div className="bottom w-full h-[calc(100%-40px)] flex flex-col justify-center px-4">
            <div className="icon w-full h-[120px] flex justify-center items-center">
              <ImagePlus
                size={72}
                strokeWidth={1.25}
                color="var(--text-muted)"
                className="sm:w-[90px] sm:h-[90px]"
              />
            </div>

            <div className="text w-full min-h-[30px] flex justify-center items-center text-[var(--text-primary)] text-[16px] sm:text-[20px] text-center px-2">
              Drag photos and videos here
            </div>

            <div className="button w-full h-[50px] mt-4 flex justify-center items-center">
              <div
                onClick={() => fileInputRef.current.click()}
                className="btn w-[180px] sm:w-[200px] h-[40px] flex justify-center items-center bg-[var(--accent-indigo)] hover:bg-[var(--accent-indigo-hover)] text-white font-semibold rounded-md cursor-pointer text-sm sm:text-base"
              >
                Select from Computer
              </div>

              <input
                type="file"
                multiple
                accept="image/*,video/mp4,video/quicktime,video/webm"
                ref={fileInputRef}
                onChange={handleSelectMedia}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SelectImagePage