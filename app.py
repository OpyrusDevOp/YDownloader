import os
import unicodedata
import re
from typing import Any
from flask import Flask, render_template, request, send_file
from flask.json import jsonify
from pytubefix import YouTube
from werkzeug.exceptions import BadRequest
from dataclasses import dataclass
from moviepy import AudioFileClip, VideoFileClip


@dataclass
class StreamInfo:
    video: list[dict[str, Any]]
    audio: list[dict[str, Any]]


@dataclass
class VideoInfo:
    title: str
    author: str
    url: str
    thumbnail_url: str
    time: int
    streams: StreamInfo


app = Flask(__name__)

DOWNLOAD_FOLDER = "./downloads"
os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)


def sanitize_filename(title):
    """Sanitize the filename by removing special characters and normalizing text"""
    title = unicodedata.normalize("NFKD", title)  # Normalize Unicode characters
    title = re.sub(
        r"[^\w\s-]", "", title
    )  # Remove special characters except spaces and hyphens
    title = re.sub(r"[\s]+", "_", title)  # Replace spaces with underscores
    return title.strip("_")  # Remove leading/trailing underscores


@app.route("/")
def hello_world():
    return render_template("index.html")


@app.route("/videoinfo")
def get_video_info():
    url = request.args.get("url")
    if not url:
        return BadRequest("No video url Provided")

    yt = YouTube(url)
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

    streams = StreamInfo(video_streams, audio_streams)

    response = VideoInfo(
        yt.title, yt.author, yt.watch_url, yt.thumbnail_url, yt.length, streams
    )

    return jsonify(response)


@app.route("/generate", methods=["POST"])
def generate_download():
    """Generate a download URL for the selected quality and format"""
    data = request.json

    if not data:
        return "Missing Body data", 400

    url = data.get("videoUrl")
    itag = data.get("itag")
    format_type = data.get("format", "video")  # Default to video, can be "audio"
    # metadata = data.get("metadata")  # Optional metadata for audio files

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
            # if metadata:
            #     # Use the track title from metadata if available
            #     filename = f"{sanitize_filename(metadata['title'])} - {sanitize_filename(metadata['artist'])}.mp3"
            # else:
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
            # if metadata:
            #     success, message = add_metadata_to_mp3(mp3_file_path, metadata)
            #     metadata_status = {"success": success, "message": message}

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
