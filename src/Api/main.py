import unicodedata
from flask import Flask, request, jsonify, send_file, send_from_directory
import re
from pytubefix import YouTube
from flask_cors import CORS
import ffmpeg
from pydub import AudioSegment
import subprocess
import os
import time
import threading
from datetime import datetime, timedelta

app = Flask(__name__, static_folder="./dist", static_url_path="")
CORS(app)

DOWNLOAD_FOLDER = "./downloads"
os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

FILE_EXPIRATION_MINUTES = 30
CLEANUP_INTERVAL_SECONDS = 300


# Serve React App at root URL
@app.route("/")
def serve():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/downloads/<path:filename>", methods=["GET"])
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


@app.route("/video_info", methods=["GET"])
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


@app.route("/generate_download", methods=["POST"])
def generate_download():
    """Generate a download URL for the selected quality and format"""
    data = request.json
    url = data.get("videoUrl")
    itag = data.get("itag")
    format_type = data.get("format", "video")  # Default to video, can be "audio"

    if not url or not itag:
        return jsonify({"error": "Missing 'url' or 'itag' parameter"}), 400

    try:
        yt = YouTube(url)
        stream = yt.streams.get_by_itag(itag)
        if not stream:
            return jsonify({"error": "Invalid 'itag'"}), 400

        clean_title = sanitize_filename(yt.title)

        if format_type == "audio":
            filename = f"{clean_title}.mp3"
            temp_audio_path = os.path.join(DOWNLOAD_FOLDER, "temp_audio.mp4")

            # Download audio stream
            stream.download(output_path=DOWNLOAD_FOLDER, filename="temp_audio.mp4")

            # Convert to MP3 using pydub with corrected bitrate format
            audio = AudioSegment.from_file(temp_audio_path)
            # Remove 'bps' from bitrate and ensure it's in correct format (e.g., "128k")
            bitrate = stream.abr if stream.abr else "192k"
            if bitrate.endswith("bps"):
                bitrate = bitrate.replace("kbps", "k")

            audio.export(
                os.path.join(DOWNLOAD_FOLDER, filename), format="mp3", bitrate=bitrate
            )

            # Clean up temporary file
            os.remove(temp_audio_path)

        else:  # Video handling
            filename = f"{clean_title}.mp4"
            if stream.includes_audio_track:
                stream.download(output_path=DOWNLOAD_FOLDER, filename=filename)
            else:
                video_path = os.path.join(DOWNLOAD_FOLDER, "video.mp4")
                audio_path = os.path.join(DOWNLOAD_FOLDER, "audio.mp4")

                stream.download(output_path=DOWNLOAD_FOLDER, filename="video.mp4")
                yt.streams.filter(only_audio=True).first().download(
                    output_path=DOWNLOAD_FOLDER, filename="audio.mp4"
                )

                merged_path = os.path.join(DOWNLOAD_FOLDER, filename)
                command = [
                    "ffmpeg",
                    "-i",
                    video_path,
                    "-i",
                    audio_path,
                    "-c:v",
                    "copy",
                    "-c:a",
                    "aac",
                    "-strict",
                    "experimental",
                    merged_path,
                    "-y",
                ]
                subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                os.remove(video_path)
                os.remove(audio_path)

        return jsonify(
            {
                "download_url": f"/downloads/{filename}"
            }  # Changed from full localhost URL
        )
    except Exception as e:
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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
