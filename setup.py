from setuptools import setup, find_packages

with open("requirements.txt") as f:
    requirements = f.read().splitlines()

setup(
    name="yt-downloader",
    version="1.0.0",
    description="A YouTube video and audio downloader with metadata support",
    long_description="""
    YT Downloader is a Flask-based web application that allows users to:
    - Download YouTube videos in various qualities
    - Extract and download audio as MP3 files
    - Add metadata to audio files (title, artist, album, year, cover art)
    - Search for song metadata using MusicBrainz API
    - Merge separate video and audio streams for highest quality downloads
    """,
    author="Opyrus",
    author_email="opyrusdeveloper@gmail.com",
    url="https://github.com/OpyrusDevOp/yt-downloader",
    packages=find_packages(),
    include_package_data=True,
    install_requires=requirements,
    python_requires=">=3.7",
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: End Users/Desktop",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Multimedia :: Video",
        "Topic :: Multimedia :: Sound/Audio",
    ],
    keywords="youtube downloader video audio mp3 metadata",
    entry_points={
        "console_scripts": [
            "yt-downloader=app:app.run",
        ],
    },
    project_urls={
        "Bug Reports": "https://github.com/OpyrusDevOp/yt-downloader/issues",
        "Source": "https://github.com/OpyrusDevOp/yt-downloader",
    },
)
