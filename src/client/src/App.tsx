import { useState } from 'react'
import './App.css'
import { Download, Loader2 } from 'lucide-react'
import axios from "axios";


function App() {
  const [videoUrl, setVideoUrl] = useState('')
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [loadingDownload, setLoadingDownload] = useState<number | null>(null);

  const fetchVideoInfo = async () => {
    setIsLoadingInfo(true);
    try {
      const response = await axios.get(`/video_info`, {
        params: { videoUrl },
      });
      setVideoInfo(response.data);
      setDownloadUrl(""); // Reset previous download link
    } catch (error) {
      console.error("Error fetching video info:", error);
      alert("Invalid YouTube URL!");
    } finally {
      setIsLoadingInfo(false);
    }
  };

  const generateDownloadLink = async (itag: number) => {
    setLoadingDownload(itag);
    try {
      const response = await axios.post(`/generate_download`, {
        videoUrl,
        itag,
      });
      setDownloadUrl(response.data.download_url);
    } catch (error) {
      console.error("Error generating download link:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Server error details:", error.response.data);
      }
    } finally {
      setLoadingDownload(null);
    }
  };
  return (
    <div className='min-h-screen min-w-screen'>
      <div className='flex flex-col items-center w-full'>
        <h1 className='text-lg'>Youtube Downloader</h1>
        <div className="flex flex-grow min-w-1/4 items-center rounded-md bg-white pl-3 outline-1 -outline-offset-1 outline-gray-300 has-[input:focus-within]:outline-2 has-[input:focus-within]:-outline-offset-2 has-[input:focus-within]:outline-indigo-600">
          <input
            id="price"
            name="price"
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v="
            className="block min-w-6/7 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
          /> <button
            onClick={fetchVideoInfo}
            disabled={isLoadingInfo}
            className="mr-2"
          >
            {isLoadingInfo ? (
              <Loader2 className="animate-spin size-5 text-gray-500" />
            ) : (
              <Download className='size-5 text-gray-500 hover:text-gray-900' />
            )}
          </button>        </div>


        {videoInfo && (
          <div className="mt-4 p-4 bg-white shadow rounded min-w-3/5 flex flex-row gap-10">
            <div>
              <h2 className="text-lg font-bold">{videoInfo.title}</h2>
              <img src={videoInfo.thumbnail} alt="Thumbnail" className="w-full mt-2" />
              <p className="text-sm text-gray-600">Author: {videoInfo.author}</p>
              <p className="text-sm text-gray-600">Views: {videoInfo.views.toLocaleString()}</p>
            </div>

            <div>
              <h3 className="text-md font-bold mt-4">Available Qualities</h3>
              <ul className="inline-grid grid-cols-2 gap-4 ">
                {videoInfo.streams.video.map((stream: any) => (
                  <li key={stream.itag}>
                    <button
                      onClick={() => generateDownloadLink(stream.itag)}
                      className="bg-green-500 text-white px-3 py-1 rounded w-full"
                    >
                      {loadingDownload === stream.itag ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="animate-spin size-4" />
                          <span>Processing...</span>
                        </div>
                      ) : (
                        `${stream.resolution} (${stream.mime_type})`
                      )}                    </button>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        )}

        {downloadUrl && (
          <div className="mt-4">
            <a href={downloadUrl} className="bg-red-500 text-white px-4 py-2 rounded">
              Download Video
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
