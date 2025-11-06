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
const metadataSection = document.getElementById('metadataSection');
const metaTitle = document.getElementById('metaTitle');
const metaArtist = document.getElementById('metaArtist');
const metaAlbum = document.getElementById('metaAlbum');
const metaYear = document.getElementById('metaYear');
const includeThumbnail = document.getElementById('includeThumbnail');
const customCoverUrl = document.getElementById('customCoverUrl');
const searchMetadataBtn = document.getElementById('searchMetadataBtn');
const searchModal = document.getElementById('searchModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const metadataSearchInput = document.getElementById('metadataSearchInput');
const executeSearchBtn = document.getElementById('executeSearchBtn');
const searchLoading = document.getElementById('searchLoading');
const searchResults = document.getElementById('searchResults');
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

  // Pre-fill metadata fields with video info
  metaTitle.value = info.title;
  metaArtist.value = info.author;
  metaAlbum.value = '';
  metaYear.value = new Date().getFullYear();

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
    metadataSection.classList.add('hidden');
  } else {
    audioFormatBtn.classList.add('bg-red-600', 'border-red-500');
    audioFormatBtn.classList.remove('bg-gray-700');
    videoFormatBtn.classList.remove('bg-red-600', 'border-red-500');
    videoFormatBtn.classList.add('bg-gray-700');
    metadataSection.classList.remove('hidden');
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

// Collect metadata from form
function collectMetadata() {
  if (selectedFormat !== 'audio') {
    return null;
  }

  const metadata = {
    title: metaTitle.value.trim() || currentVideoInfo.title,
    artist: metaArtist.value.trim() || currentVideoInfo.author,
    album: metaAlbum.value.trim() || '',
    year: metaYear.value || new Date().getFullYear()
  };

  // Use custom cover URL if available, otherwise use video thumbnail if checked
  if (customCoverUrl.value) {
    metadata.thumbnail_url = customCoverUrl.value;
  } else if (includeThumbnail.checked) {
    metadata.thumbnail_url = currentVideoInfo.thumbnail_url;
  }

  return metadata;
}

// Open metadata search modal
function openSearchModal() {
  searchModal.classList.remove('hidden');
  // Pre-fill with video title
  metadataSearchInput.value = currentVideoInfo.title;
  metadataSearchInput.focus();
}

// Close metadata search modal
function closeSearchModal() {
  searchModal.classList.add('hidden');
  searchResults.innerHTML = '<p class="text-gray-400 text-center py-8">Enter a search query to find metadata</p>';
}

// Search for metadata using MusicBrainz
async function searchMetadata() {
  const query = metadataSearchInput.value.trim();

  if (!query) {
    showError('Please enter a search query');
    return;
  }

  searchLoading.classList.remove('hidden');
  searchResults.innerHTML = '';

  try {
    const response = await fetch(`/search_metadata?query=${encodeURIComponent(query)}`);

    if (!response.ok) {
      throw new Error('Failed to search metadata');
    }

    const data = await response.json();
    displaySearchResults(data.results);

  } catch (error) {
    searchResults.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-exclamation-circle text-red-500 text-3xl mb-3"></i>
                <p class="text-gray-400">${error.message}</p>
            </div>
        `;
  } finally {
    searchLoading.classList.add('hidden');
  }
}

// Display search results
function displaySearchResults(results) {
  if (!results || results.length === 0) {
    searchResults.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-search text-gray-600 text-3xl mb-3"></i>
                <p class="text-gray-400">No results found. Try a different search query.</p>
            </div>
        `;
    return;
  }

  searchResults.innerHTML = '';

  results.forEach(result => {
    const resultCard = document.createElement('div');
    resultCard.className = 'bg-gray-700 hover:bg-gray-600 rounded-lg p-3 cursor-pointer transition-all duration-200 flex gap-3 items-start';

    resultCard.innerHTML = `
            <div class="w-16 h-16 bg-gray-800 rounded flex-shrink-0 overflow-hidden">
                ${result.cover_url
        ? `<img src="${result.cover_url}" alt="Album cover" class="w-full h-full object-cover">`
        : `<div class="w-full h-full flex items-center justify-center"><i class="fas fa-music text-gray-600"></i></div>`
      }
            </div>
            <div class="flex-1 min-w-0">
                <div class="font-semibold text-white truncate">${result.title}</div>
                <div class="text-sm text-gray-400 truncate">${result.artist}</div>
                <div class="text-xs text-gray-500 truncate">${result.album} ${result.year !== 'Unknown' ? `(${result.year})` : ''}</div>
            </div>
            <div class="flex-shrink-0">
                <i class="fas fa-chevron-right text-gray-500"></i>
            </div>
        `;

    resultCard.addEventListener('click', () => selectMetadata(result));
    searchResults.appendChild(resultCard);
  });
}

// Select metadata from search results
function selectMetadata(result) {
  metaTitle.value = result.title;
  metaArtist.value = result.artist;
  metaAlbum.value = result.album !== 'Unknown Album' ? result.album : '';
  metaYear.value = result.year !== 'Unknown' ? result.year : new Date().getFullYear();

  // Store custom cover URL if available
  if (result.cover_url) {
    customCoverUrl.value = result.cover_url;
    includeThumbnail.checked = true;
  }

  closeSearchModal();
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
    const requestBody = {
      videoUrl: currentVideoInfo.url,
      itag: selectedItag,
      format: selectedFormat
    };

    // Add metadata if downloading audio
    if (selectedFormat === 'audio') {
      requestBody.metadata = collectMetadata();
    }

    const response = await fetch('/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Download failed');
    }

    const data = await response.json();

    // Show metadata status if available
    let statusMessage = 'Download started successfully!';
    if (data.metadata_status) {
      if (data.metadata_status.success) {
        statusMessage += ' Metadata added successfully.';
      } else if (data.metadata_status.message !== 'No metadata applied') {
        statusMessage += ` Note: ${data.metadata_status.message}`;
      }
    }

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
                <span>${statusMessage}</span>
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
    }, 5000);

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

// Metadata search event listeners
searchMetadataBtn.addEventListener('click', openSearchModal);
closeModalBtn.addEventListener('click', closeSearchModal);
executeSearchBtn.addEventListener('click', searchMetadata);

metadataSearchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    searchMetadata();
  }
});

// Close modal when clicking outside
searchModal.addEventListener('click', (e) => {
  if (e.target === searchModal) {
    closeSearchModal();
  }
});
