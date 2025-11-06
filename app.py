from typing import Any
from flask import Flask, render_template, request
from flask.json import jsonify
from pytubefix import YouTube
from werkzeug.exceptions import BadRequest
from dataclasses import dataclass


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
    return ""
