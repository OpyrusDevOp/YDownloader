let videoData = null;
let selectedQuality = null;

document.getElementById('download-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const url = document.getElementById('video-url').value;

  // Show loading, hide input
  document.getElementById('input-section').classList.add('hidden');
  document.getElementById('video-info-section').classList.add('hidden');
  document.getElementById('loading-section').classList.remove('hidden');

  try {
    // Make API call to your Flask backend
    const response = await fetch('/api/video-info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: url })
    });

    videoData = await response.json();

    if (videoData.error) {
      alert('Error: ' + videoData.error);
      resetForm();
      return;
    }

    displayVideoInfo(videoData);

  } catch (error) {
    alert('Failed to fetch video information. Please try again.');
    resetForm();
  }
});

function displayVideoInfo(data) {
  // Hide loading, show video info
  document.getElementById('loading-section').classList.add('hidden');
  document.getElementById('video-info-section').classList.remove('hidden');

  // Set basic info
  document.getElementById('video-thumbnail').src = data.thumbnail;
  document.getElementById('video-title').textContent = data.title;
  document.getElementById('video-author').querySelector('span').textContent = data.author;

  // Populate video qualities
  const videoQualitiesDiv = document.getElementById('video-qualities');
  videoQualitiesDiv.innerHTML = '';
  data.video_qualities.forEach((quality, index) => {
    const qualityOption = createQualityOption(quality, 'video', index === 0);
    videoQualitiesDiv.appendChild(qualityOption);
  });

  // Populate audio qualities
  const audioQualitiesDiv = document.getElementById('audio-qualities');
  audioQualitiesDiv.innerHTML = '';
  data.audio_qualities.forEach((quality, index) => {
    const qualityOption = createQualityOption(quality, 'audio', false);
    audioQualitiesDiv.appendChild(qualityOption);
  });

  // Set default selection
  selectedQuality = { type: 'video', quality: data.video_qualities[0] };
}

function createQualityOption(quality, type, isDefault) {
  const div = document.createElement('div');
  div.className = `quality-option p-3 rounded-lg border-2 cursor-pointer transition-all duration-300 ${isDefault ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`;
  div.innerHTML = `
                <div class="flex items-center justify-between">
                    <div>
                        <span class="font-semibold text-gray-800">${quality.resolution || quality.bitrate}</span>
                        <span class="text-sm text-gray-500 ml-2">${quality.format}</span>
                    </div>
                    <span class="text-sm text-gray-500">${quality.filesize || 'Unknown size'}</span>
                </div>
            `;

  div.addEventListener('click', () => {
    // Remove selection from all options
    document.querySelectorAll('.quality-option').forEach(opt => {
      opt.classList.remove('border-indigo-500', 'bg-indigo-50');
      opt.classList.add('border-gray-200');
    });

    // Add selection to clicked option
    div.classList.add('border-indigo-500', 'bg-indigo-50');
    div.classList.remove('border-gray-200');

    selectedQuality = { type, quality };
  });

  return div;
}

document.getElementById('download-btn').addEventListener('click', async () => {
  if (!selectedQuality) {
    alert('Please select a quality');
    return;
  }

  try {
    // Generate download link
    const response = await fetch('/api/generate-download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: document.getElementById('video-url').value,
        quality: selectedQuality
      })
    });

    const downloadData = await response.json();

    if (downloadData.download_url) {
      // Trigger download
      window.location.href = downloadData.download_url;
    } else {
      alert('Failed to generate download link');
    }
  } catch (error) {
    alert('Download failed. Please try again.');
  }
});

document.getElementById('new-download-btn').addEventListener('click', () => {
  resetForm();
});

function resetForm() {
  document.getElementById('input-section').classList.remove('hidden');
  document.getElementById('loading-section').classList.add('hidden');
  document.getElementById('video-info-section').classList.add('hidden');
  document.getElementById('video-url').value = '';
  videoData = null;
  selectedQuality = null;
}
