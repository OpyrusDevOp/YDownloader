// DOM Elements
const videoUrlInput = document.getElementById('videoUrl');
const fetchBtn = document.getElementById('fetchBtn');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const videoInfoSection = document.getElementById('videoInfoSection');
const thumbnail = document.getElementById('thumbnail');
const videoTitle = document.getElementById('videoTitle');
const videoAuthor = document.getElementById('videoAuthor');
const videoDuration = document.getElementById('videoDuration');
const videoFormatBtn = document.getElementById('videoFormatBtn');
const audioFormatBtn = document.getElementById('audioFormatBtn');
const qualityOptions = document.getElementById('qualityOptions');
const downloadBtn = document.getElementById('downloadBtn');
const downloadProgress = document.getElementById('downloadProgress');

// State
let currentVideoInfo = null;
let selectedFormat = 'video';
let selectedItag = null;

// Format time in seconds to MM:SS or HH:MM:SS
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Show error message
function showError(message) {
  errorText.textContent = message;
  errorMessage.classList.remove('hidden');
  setTimeout(() => {
    errorMessage.classList.add('hidden');
  }, 5000);
}

// Hide error message
function hideError() {
  errorMessage.classList.add('hidden');
}

// Fetch video information
async function fetchVideoInfo() {
  const url = videoUrlInput.value.trim();

  if (!url) {
    showError('Please enter a YouTube URL');
    return;
  }

  // Hide previous results and errors
  hideError();
  videoInfoSection.classList.add('hidden');
  loadingSpinner.classList.remove('hidden');
  fetchBtn.disabled = true;

  try {
    const response = await fetch(`/videoinfo?url=${encodeURIComponent(url)}`);

    if (!response.ok) {
      throw new Error('Failed to fetch video information');
    }

    const data = await response.json();
    currentVideoInfo = data;

    // Display video info
    displayVideoInfo(data);

  } catch (error) {
    showError(error.message || 'An error occurred while fetching video information');
  } finally {
    loadingSpinner.classList.add('hidden');
    fetchBtn.disabled = false;
  }
}

// Display video information
function displayVideoInfo(info) {
  thumbnail.src = info.thumbnail_url;
  videoTitle.textContent = info.title;
  videoAuthor.textContent = info.author;
  videoDuration.textContent = formatDuration(info.time);

  videoInfoSection.classList.remove('hidden');

  // Set default format to video
  selectFormat('video');
}

// Select format (video or audio)
function selectFormat(format) {
  selectedFormat = format;
  selectedItag = null;
  downloadBtn.disabled = true;

  // Update button styles
  if (format === 'video') {
    videoFormatBtn.classList.add('bg-red-600', 'border-red-500');
    videoFormatBtn.classList.remove('bg-gray-700');
    audioFormatBtn.classList.remove('bg-red-600', 'border-red-500');
    audioFormatBtn.classList.add('bg-gray-700');
  } else {
    audioFormatBtn.classList.add('bg-red-600', 'border-red-500');
    audioFormatBtn.classList.remove('bg-gray-700');
    videoFormatBtn.classList.remove('bg-red-600', 'border-red-500');
    videoFormatBtn.classList.add('bg-gray-700');
  }

  // Display quality options
  displayQualityOptions(format);
}

// Display quality options based on format
function displayQualityOptions(format) {
  qualityOptions.innerHTML = '';

  const streams = format === 'video' ? currentVideoInfo.streams.video : currentVideoInfo.streams.audio;

  if (streams.length === 0) {
    qualityOptions.innerHTML = '<p class="text-gray-400 col-span-2">No streams available</p>';
    return;
  }

  streams.forEach(stream => {
    const option = document.createElement('button');
    option.className = 'bg-gray-700 hover:bg-gray-600 border-2 border-transparent hover:border-red-500 p-4 rounded-lg text-left transition-all duration-200';

    if (format === 'video') {
      option.innerHTML = `
                <div class="font-semibold">${stream.resolution}</div>
                <div class="text-sm text-gray-400">${stream.mime_type}</div>
            `;
    } else {
      option.innerHTML = `
                <div class="font-semibold">${stream.abr || 'Audio'}</div>
                <div class="text-sm text-gray-400">${stream.mime_type}</div>
            `;
    }

    option.addEventListener('click', () => selectQuality(stream.itag, option));
    qualityOptions.appendChild(option);
  });
}

// Select quality option
function selectQuality(itag, element) {
  selectedItag = itag;
  downloadBtn.disabled = false;

  // Update selected state
  qualityOptions.querySelectorAll('button').forEach(btn => {
    btn.classList.remove('border-red-500', 'bg-gray-600');
    btn.classList.add('border-transparent', 'bg-gray-700');
  });

  element.classList.add('border-red-500', 'bg-gray-600');
  element.classList.remove('border-transparent');
}

// Download video/audio
async function downloadMedia() {
  if (!selectedItag) {
    showError('Please select a quality option');
    return;
  }

  downloadBtn.disabled = true;
  downloadProgress.classList.remove('hidden');
  hideError();

  try {
    const response = await fetch('/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoUrl: currentVideoInfo.url,
        itag: selectedItag,
        format: selectedFormat
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Download failed');
    }

    const data = await response.json();

    // Trigger download
    const link = document.createElement('a');
    link.href = data.download_url;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show success message
    downloadProgress.innerHTML = `
            <div class="bg-green-900/50 border border-green-500 rounded-lg p-4">
                <i class="fas fa-check-circle mr-2 text-green-500"></i>
                <span>Download started successfully!</span>
            </div>
        `;

    setTimeout(() => {
      downloadProgress.classList.add('hidden');
      downloadProgress.innerHTML = `
                <div class="bg-gray-700 rounded-lg p-4">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-medium">Processing...</span>
                        <i class="fas fa-spinner fa-spin text-red-500"></i>
                    </div>
                    <p class="text-xs text-gray-400">Please wait while we prepare your download</p>
                </div>
            `;
    }, 3000);

  } catch (error) {
    showError(error.message || 'An error occurred during download');
    downloadProgress.classList.add('hidden');
  } finally {
    downloadBtn.disabled = false;
  }
}

// Event Listeners
fetchBtn.addEventListener('click', fetchVideoInfo);

videoUrlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    fetchVideoInfo();
  }
});

videoFormatBtn.addEventListener('click', () => selectFormat('video'));
audioFormatBtn.addEventListener('click', () => selectFormat('audio'));
downloadBtn.addEventListener('click', downloadMedia);
