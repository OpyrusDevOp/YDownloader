from flask import Flask, request
from pytubefix import YouTube
from werkzeug.exceptions import BadRequest

app = Flask(__name__)


@app.route("/")
def hello_world():
    return "<p>Hello, World!</p>"


@app.route("/videoinfo")
def get_video_info():
    url = request.args.get("url")
    if not url:
        return BadRequest("No video url Provided")

    vid = YouTube(url)

    return f"Title : {vid.title} | Author : {vid.author}"
