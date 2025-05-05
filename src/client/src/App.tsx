import { useState } from 'react'
import './App.css'
import { Download, Loader2, Music, Search, Check, X } from 'lucide-react'
import axios from "axios";

function App() {
  const [videoUrl, setVideoUrl] = useState('')
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [loadingDownload, setLoadingDownload] = useState<string | null>('null');
  const [showMetadataSearch, setShowMetadataSearch] = useState(false);
  const [metadataQuery, setMetadataQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [metadataStatus, setMetadataStatus] = useState<any>(null);

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

  const generateDownloadLink = async (itag: string, format = 'video') => {
    setLoadingDownload(itag);
    try {
      const response = await axios.post(`/generate_download`, {
        videoUrl,
        itag,
        format,
        metadata: selectedTrack
      });
      setDownloadUrl(response.data.download_url);
      setMetadataStatus(response.data.metadata_status);
    } catch (error) {
      console.error("Error generating download link:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Server error details:", error.response.data);
      }
    } finally {
      setLoadingDownload(null);
    }
  };

  const searchMetadata = async () => {
    if (!metadataQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await axios.get(`/search_metadata`, {
        params: { query: metadataQuery }
      });
      setSearchResults(response.data.results);
    } catch (error) {
      console.error("Error searching metadata:", error);
      alert("Failed to search for track metadata");
    } finally {
      setIsSearching(false);
    }
  };

  const toggleMetadataSearch = () => {
    setShowMetadataSearch(!showMetadataSearch);
    if (!showMetadataSearch) {
      setSearchResults([]);
      setSelectedTrack(null);
      setMetadataQuery("");
    }
  };

  const selectTrack = (track: any) => {
    setSelectedTrack(track);
    setShowMetadataSearch(false);
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
          /> 
          <button
            onClick={fetchVideoInfo}
            disabled={isLoadingInfo}
            className="mr-2"
          >
            {isLoadingInfo ? (
              <Loader2 className="animate-spin size-5 text-gray-500" />
            ) : (
              <Download className='size-5 text-gray-500 hover:text-gray-900' />
            )}
          </button>
        </div>

        {videoInfo && (
          <div className="mt-4 p-4 bg-white shadow rounded min-w-3/5 flex flex-row gap-10">
            <div>
              <h2 className="text-lg font-bold">{videoInfo.title}</h2>
              <img src={videoInfo.thumbnail} alt="Thumbnail" className="w-full mt-2" />
              <p className="text-sm text-gray-600">Author: {videoInfo.author}</p>
              <p className="text-sm text-gray-600">Views: {videoInfo.views.toLocaleString()}</p>
            </div>

            <div className="flex flex-col gap-6">
              <div>
                <h3 className="text-md font-bold">Video Qualities</h3>
                <ul className="inline-grid grid-cols-2 gap-4">
                  {videoInfo.streams.video.map((stream: any) => (
                    <li key={stream.itag}>
                      <button
                        onClick={() => generateDownloadLink(stream.itag, 'video')}
                        className="bg-green-500 text-white px-3 py-1 rounded w-full"
                      >
                        {loadingDownload === stream.itag ? (
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="animate-spin size-4" />
                            <span>Processing...</span>
                          </div>
                        ) : (
                          `${stream.resolution} (${stream.mime_type})`
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-md font-bold mb-2">Audio Qualities</h3>
                
                {/* Metadata section */}
                <div className="mb-3 flex items-center">
                  <button 
                    onClick={toggleMetadataSearch}
                    className={`flex items-center gap-1 text-sm px-2 py-1 rounded ${showMetadataSearch ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700'}`}
                  >
                    <Music size={16} />
                    {selectedTrack ? 'Edit Metadata' : 'Add Metadata'}
                  </button>
                  
                  {selectedTrack && (
                    <div className="ml-2 text-sm bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1">
                      <Check size={14} />
                      <span>{selectedTrack.title} - {selectedTrack.artist}</span>
                      <button 
                        onClick={() => setSelectedTrack(null)} 
                        className="ml-1 text-red-500 hover:text-red-700"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
                
                {showMetadataSearch && (
                  <div className="bg-gray-100 p-3 rounded mb-3">
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={metadataQuery}
                        onChange={(e) => setMetadataQuery(e.target.value)}
                        placeholder="Search for song metadata..."
                        className="flex-grow px-2 py-1 rounded border border-gray-300"
                        onKeyDown={(e) => e.key === 'Enter' && searchMetadata()}
                      />
                      <button
                        onClick={searchMetadata}
                        disabled={isSearching}
                        className="bg-blue-500 text-white px-3 py-1 rounded flex items-center gap-1"
                      >
                        {isSearching ? <Loader2 className="animate-spin size-4" /> : <Search size={16} />}
                        Search
                      </button>
                    </div>
                    
                    {searchResults.length > 0 && (
                      <div className="max-h-40 overflow-y-auto">
                        <ul className="divide-y divide-gray-200">
                          {searchResults.map((track: any) => (
                            <li 
                              key={track.id}
                              className="py-2 px-1 hover:bg-gray-200 cursor-pointer"
                              onClick={() => selectTrack(track)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{track.title}</p>
                                  <p className="text-sm text-gray-600">{track.artist} • {track.album}</p>
                                </div>
                                {track.year && <span className="text-xs text-gray-500">{track.year}</span>}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                
                <ul className="inline-grid grid-cols-2 gap-4">
                  {videoInfo.streams.audio.map((stream: any) => (
                    <li key={stream.itag}>
                      <button
                        onClick={() => generateDownloadLink(stream.itag, 'audio')}
                        className="bg-blue-500 text-white px-3 py-1 rounded w-full"
                      >
                        {loadingDownload === stream.itag ? (
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="animate-spin size-4" />
                            <span>Processing...</span>
                          </div>
                        ) : (
                          `${stream.abr} MP3`
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {downloadUrl && (
          <div className="mt-4">
            {metadataStatus && (
              <div className={`mb-2 px-4 py-2 rounded ${metadataStatus.success ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                <p>{metadataStatus.message}</p>
              </div>
            )}
            <a href={downloadUrl} className="bg-red-500 text-white px-4 py-2 rounded inline-flex items-center gap-2">
              <Download size={18} />
              Download {downloadUrl.endsWith('.mp3') ? 'Audio' : 'Video'}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

export default App