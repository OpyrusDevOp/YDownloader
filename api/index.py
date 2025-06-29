from flask import Flask, send_from_directory, jsonify
import os

app = Flask(__name__)


# Your API routes
@app.route("/api/")
@app.route("/api")
def api_home():
    return jsonify({"message": "API is working!"})


@app.route("/api/health")
def health_check():
    return jsonify({"status": "healthy"})


# Add all your existing API endpoints here with /api prefix
@app.route("/api/your-endpoint")
def your_endpoint():
    return jsonify({"data": "your data"})


# Example: If you had a download endpoint
@app.route("/api/download/<filename>")
def download_file(filename):
    # Adjust path as needed
    downloads_dir = os.path.join(os.path.dirname(__file__), "..", "downloads")
    return send_from_directory(downloads_dir, filename, as_attachment=True)


# Serve React App at root URL
@app.route("/api")
def serve():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/api/downloads/<path:filename>", methods=["GET"])
def download_video(filename):
    """Serve the downloaded video or audio file"""
    filepath = os.path.join(DOWNLOAD_FOLDER, filename)
    if not os.path.exists(filepath):
        return jsonify({"error": "File not found"}), 404

    # Serve the file with proper mimetype based on extension
    mimetype = "audio/mpeg" if filename.endswith(".mp3") else "video/mp4"
    return send_file(
        filepath, as_attachment=True, mimetype=mimetype, download_name=filename
    )


@app.route("/api/video_info", methods=["GET"])
def video_info():
    """Fetch video details and available quality options"""
    url = request.args.get("videoUrl")
    if not url:
        return jsonify({"error": "Missing 'url' parameter"}), 400

    try:
        yt = YouTube(url)

        # Fetch all available video and audio streams
        video_streams = [
            {
                "itag": stream.itag,
                "resolution": stream.resolution,
                "mime_type": stream.mime_type,
                "type": "video",
            }
            for stream in yt.streams.filter(file_extension="mp4", only_video=True)
        ]

        audio_streams = [
            {
                "itag": stream.itag,
                "mime_type": stream.mime_type,
                "abr": stream.abr,
                "type": "audio",
            }
            for stream in yt.streams.filter(only_audio=True)
        ]

        progressive_streams = [
            {
                "itag": stream.itag,
                "resolution": stream.resolution,
                "mime_type": stream.mime_type,
                "type": "progressive",
            }
            for stream in yt.streams.filter(progressive=True, file_extension="mp4")
        ]

        return jsonify(
            {
                "title": yt.title,
                "author": yt.author,
                "length": yt.length,
                "views": yt.views,
                "thumbnail": yt.thumbnail_url,
                "streams": {
                    "progressive": progressive_streams,
                    "video": video_streams,
                    "audio": audio_streams,
                },
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def sanitize_filename(title):
    """Sanitize the filename by removing special characters and normalizing text"""
    title = unicodedata.normalize("NFKD", title)  # Normalize Unicode characters
    title = re.sub(
        r"[^\w\s-]", "", title
    )  # Remove special characters except spaces and hyphens
    title = re.sub(r"[\s]+", "_", title)  # Replace spaces with underscores
    return title.strip("_")  # Remove leading/trailing underscores


@app.route("/api/search_metadata", methods=["GET"])
def search_metadata():
    """Search for song metadata using MusicBrainz API"""
    query = request.args.get("query")
    if not query:
        return jsonify({"error": "Missing query parameter"}), 400

    try:
        headers = {"User-Agent": USER_AGENT}
        params = {"query": query, "fmt": "json", "limit": 10}
        response = requests.get(
            f"{METADATA_API_BASE_URL}/recording", params=params, headers=headers
        )
        response.raise_for_status()
        data = response.json()

        results = []
        for recording in data.get("recordings", []):
            # Extract artist information
            artist = recording.get("artist-credit", [{}])[0].get(
                "name", "Unknown Artist"
            )

            # Extract album information from release groups
            album = "Unknown Album"
            year = None
            if "releases" in recording and recording["releases"]:
                album = recording["releases"][0].get("title", "Unknown Album")
                date = recording["releases"][0].get("date")
                if date:
                    year = date[
                        :4
                    ]  # Extract year from date (e.g., "1975-11-21" -> "1975")

            # Fetch cover art from Cover Art Archive if available
            cover_url = None
            if "releases" in recording and recording["releases"]:
                release_id = recording["releases"][0].get("id")
                if release_id:
                    try:
                        cover_response = requests.get(
                            f"https://coverartarchive.org/release/{release_id}/front-500",
                            headers=headers,
                        )
                        if cover_response.status_code == 200:
                            cover_url = f"https://coverartarchive.org/release/{release_id}/front-500"
                    except:
                        pass  # Skip cover art if request fails

            results.append(
                {
                    "id": recording.get("id", ""),
                    "title": recording.get("title", query.title()),
                    "artist": artist,
                    "album": album,
                    "year": year or "Unknown",
                    "cover_url": cover_url,
                }
            )

        return jsonify({"results": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def add_metadata_to_mp3(filepath, metadata):
    """Add metadata to an MP3 file"""
    try:
        # Initialize ID3 tags
        audio = ID3()

        # Add title
        if metadata.get("title"):
            audio.add(TIT2(encoding=3, text=metadata["title"]))

        # Add artist
        if metadata.get("artist"):
            audio.add(TPE1(encoding=3, text=metadata["artist"]))

        # Add album
        if metadata.get("album"):
            audio.add(TALB(encoding=3, text=metadata["album"]))

        # Add year
        if metadata.get("year"):
            audio.add(TDRC(encoding=3, text=metadata["year"]))

        # Add cover art if available
        if metadata.get("cover_url"):
            try:
                cover_response = requests.get(metadata["cover_url"])
                if cover_response.status_code == 200:
                    audio.add(
                        APIC(
                            encoding=3,
                            mime="image/jpeg",
                            type=3,  # 3 is for cover image
                            desc="Cover",
                            data=cover_response.content,
                        )
                    )
            except Exception as e:
                print(f"Failed to add cover: {str(e)}")

        # Save metadata to file
        audio.save(filepath)
        return True, "Metadata added successfully"
    except Exception as e:
        print(f"Failed to add metadata: {str(e)}")
        return False, f"Failed to add metadata: {str(e)}"


@app.route("/api/generate_download", methods=["POST"])
def generate_download():
    """Generate a download URL for the selected quality and format"""
    data = request.json
    url = data.get("videoUrl")
    itag = data.get("itag")
    format_type = data.get("format", "video")  # Default to video, can be "audio"
    metadata = data.get("metadata")  # Optional metadata for audio files

    if not url or not itag:
        return jsonify({"error": "Missing 'url' or 'itag' parameter"}), 400

    try:
        yt = YouTube(url)
        stream = yt.streams.get_by_itag(itag)
        if not stream:
            return jsonify({"error": "Invalid 'itag'"}), 400

        clean_title = sanitize_filename(yt.title)
        metadata_status = {"success": False, "message": "No metadata applied"}

        if format_type == "audio":
            if metadata:
                # Use the track title from metadata if available
                filename = f"{sanitize_filename(metadata['title'])} - {sanitize_filename(metadata['artist'])}.mp3"
            else:
                filename = f"{clean_title}.mp3"

            temp_audio_path = os.path.join(DOWNLOAD_FOLDER, "temp_audio.mp4")
            mp3_file_path = os.path.join(DOWNLOAD_FOLDER, filename)

            # Download audio stream
            stream.download(output_path=DOWNLOAD_FOLDER, filename="temp_audio.mp4")

            # Convert to MP3
            video = AudioFileClip(temp_audio_path)
            video.write_audiofile(mp3_file_path)
            video.close()

            # Add metadata if available
            if metadata:
                success, message = add_metadata_to_mp3(mp3_file_path, metadata)
                metadata_status = {"success": success, "message": message}

            # Clean up temporary file
            os.remove(temp_audio_path)

        else:  # Video handling
            filename = f"{clean_title}.mp4"

            if stream.includes_audio_track:
                # Progressive stream already has audio, just download directly
                stream.download(output_path=DOWNLOAD_FOLDER, filename=filename)
            else:
                # Need to merge video and audio streams
                video_path = os.path.join(DOWNLOAD_FOLDER, "temp_video.mp4")
                audio_path = os.path.join(DOWNLOAD_FOLDER, "temp_audio.mp4")
                final_path = os.path.join(DOWNLOAD_FOLDER, filename)

                # Download video and audio streams
                stream.download(output_path=DOWNLOAD_FOLDER, filename="temp_video.mp4")
                audio_stream = yt.streams.filter(only_audio=True).first()
                if not audio_stream:
                    return jsonify({"error": "No audio stream available"}), 500
                audio_stream.download(
                    output_path=DOWNLOAD_FOLDER, filename="temp_audio.mp4"
                )

                # Use MoviePy to merge video and audio
                try:
                    video_clip = VideoFileClip(video_path)
                    audio_clip = AudioFileClip(audio_path)

                    # Set audio for the video clip
                    final_clip = video_clip.with_audio(audio_clip)

                    # Write the final video with both video and audio
                    final_clip.write_videofile(
                        final_path,
                        codec="libx264",  # Popular video codec
                        audio_codec="aac",  # AAC audio codec for good compatibility
                        temp_audiofile=os.path.join(DOWNLOAD_FOLDER, "temp_audio.m4a"),
                        remove_temp=True,  # Remove temporary audio file
                        logger=None,  # Disable logging for cleaner output
                    )

                    # Close clips to free resources
                    video_clip.close()
                    audio_clip.close()
                    final_clip.close()

                    # Clean up temporary files
                    if os.path.exists(video_path):
                        os.remove(video_path)
                    if os.path.exists(audio_path):
                        os.remove(audio_path)

                except Exception as e:
                    print(e)
                    return jsonify({"error": f"Video merging error: {str(e)}"}), 500

        return jsonify(
            {
                "download_url": f"/downloads/{filename}",
                "metadata_status": metadata_status,
            }
        )
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500


def cleanup_old_files():
    """Continuously checks for and deletes old files."""
    while True:
        try:
            now = datetime.now()
            for filename in os.listdir(DOWNLOAD_FOLDER):
                file_path = os.path.join(DOWNLOAD_FOLDER, filename)
                if os.path.isfile(file_path):
                    file_creation_time = datetime.fromtimestamp(
                        os.path.getctime(file_path)
                    )
                    if now - file_creation_time > timedelta(
                        minutes=FILE_EXPIRATION_MINUTES
                    ):
                        os.remove(file_path)
                        print(f"Deleted {filename} (expired)")
        except Exception as e:
            print(f"Cleanup error: {e}")

        time.sleep(CLEANUP_INTERVAL_SECONDS)  # Wait before running again


cleanup_thread = threading.Thread(target=cleanup_old_files, daemon=True)
cleanup_thread.start()


# This is required for Vercel
if __name__ == "__main__":
    app.run()

