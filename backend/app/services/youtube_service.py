"""
YouTube Service for NoteLoom V2.
Handles URL parsing, metadata extraction, transcript fetching, and text cleaning.
"""

import re
from typing import List, Optional, Tuple
from urllib.parse import parse_qs, urlparse
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
import yt_dlp

from backend.app.schemas import VideoItem, IngestionResult, TranscriptData, TranscriptSnippet


class YouTubeService:
    @staticmethod
    def parse_url(url: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Parses a YouTube URL to extract video_id and playlist_id.
        Returns: (video_id, playlist_id)
        """
        parsed = urlparse(url)
        video_id = None
        playlist_id = None

        if "youtube.com" in parsed.netloc:
            qs = parse_qs(parsed.query)
            if "v" in qs:
                video_id = qs["v"][0]
            if "list" in qs:
                playlist_id = qs["list"][0]
        elif "youtu.be" in parsed.netloc:
            video_id = parsed.path.lstrip("/").split("?")[0]
            qs = parse_qs(parsed.query)
            if "list" in qs:
                playlist_id = qs["list"][0]

        return video_id, playlist_id

    @classmethod
    def fetch_metadata(cls, url: str) -> IngestionResult:
        """
        Extracts video or playlist metadata using yt-dlp (lightweight extract_flat mode).
        Does NOT download any media files.
        """
        clean_url = url.strip()
        parsed = urlparse(clean_url)
        netloc = parsed.netloc.lower()

        # Enforce YouTube-only validation
        if not ("youtube.com" in netloc or "youtu.be" in netloc):
            raise ValueError(
                f"Unsupported URL: '{clean_url}'. NoteLoom V2 only supports YouTube video and playlist URLs (e.g., https://www.youtube.com/watch?v=... or https://youtu.be/...). External streaming or third-party web pages cannot be transcribed."
            )

        video_id, playlist_id = cls.parse_url(clean_url)
        ydl_opts = {
            "extract_flat": True,
            "skip_download": True,
            "quiet": True,
            "no_warnings": True,
            "extractor_args": {
                "youtube": {
                    "player_client": ["android", "web"]
                }
            },
            "http_headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
            }
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(clean_url, download=False)
            if not info:
                raise ValueError(f"Could not retrieve video/playlist info for: {url}")

            category = (info.get("categories") or [None])[0]

            # Check if this is a playlist
            if "entries" in info and info["entries"]:
                entries = list(info["entries"])
                videos: List[VideoItem] = []
                for idx, entry in enumerate(entries, start=1):
                    if not entry:
                        continue
                    v_id = entry.get("id") or entry.get("url")
                    title = entry.get("title") or f"Video {idx}"
                    v_url = f"https://www.youtube.com/watch?v={v_id}"
                    v_cat = (entry.get("categories") or [category])[0]
                    videos.append(
                        VideoItem(
                            video_id=v_id,
                            title=title,
                            url=v_url,
                            duration_seconds=entry.get("duration"),
                            channel=entry.get("uploader") or entry.get("channel"),
                            sequence_index=idx,
                            description=entry.get("description"),
                            thumbnail_url=entry.get("thumbnail"),
                            category=v_cat,
                        )
                    )
                return IngestionResult(
                    is_playlist=True,
                    playlist_id=info.get("id") or playlist_id,
                    playlist_title=info.get("title") or "YouTube Playlist",
                    videos=videos,
                )
            else:
                # Single video
                v_id = info.get("id") or video_id
                title = info.get("title") or "Untitled Video"
                return IngestionResult(
                    is_playlist=False,
                    videos=[
                        VideoItem(
                            video_id=v_id,
                            title=title,
                            url=f"https://www.youtube.com/watch?v={v_id}",
                            duration_seconds=info.get("duration"),
                            channel=info.get("uploader") or info.get("channel"),
                            sequence_index=1,
                            description=info.get("description"),
                            thumbnail_url=info.get("thumbnail"),
                            category=category,
                        )
                    ],
                )

    @classmethod
    def is_likely_non_educational(cls, video: VideoItem) -> Tuple[bool, Optional[str]]:
        """
        Fast heuristic check to detect music videos and entertainment content before calling LLMs.
        Returns: (is_non_educational, reason)
        """
        cat = (video.category or "").lower()
        if cat in ["music", "entertainment", "comedy"]:
            return True, f"Categorized on YouTube as '{video.category}' (Entertainment/Music)"

        # Check channel name against prominent music labels
        ch = (video.channel or "").lower()
        music_channels = [
            "t-series", "zee music", "sony music", "yrf", "saregama",
            "tips official", "speed records", "geet mp3", "white hill music",
            "eros now", "shemaroo"
        ]
        if any(mc in ch for mc in music_channels):
            return True, f"Uploaded by entertainment/music label '{video.channel}'"

        # Check title for song / music keywords
        t = video.title.lower()
        music_patterns = [
            "official music video", "official video song", "full video song",
            "lyrical video", "audio song", "trending version", "remix song",
            "bollywood song", "punjabi song", "hindi song"
        ]
        if any(mp in t for mp in music_patterns):
            return True, f"Video title indicates music or entertainment: '{video.title}'"

        return False, None

    @classmethod
    def fetch_transcript(cls, video_id: str, video_title: str = "") -> TranscriptData:
        """
        Fetches the transcript for a video using youtube-transcript-api.
        Supports both v1.2.4+ (instance API) and legacy versions (class methods).
        Gracefully handles missing, disabled, or failed transcripts.
        """
        try:
            # Support both new v1.2.4+ instance API and legacy static method
            transcript_list = None
            try:
                api = YouTubeTranscriptApi()
                if hasattr(api, "list"):
                    transcript_list = api.list(video_id)
            except Exception:
                pass

            if transcript_list is None:
                if hasattr(YouTubeTranscriptApi, "list_transcripts"):
                    transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
                else:
                    raise RuntimeError("Unable to access transcript list API.")

            # Prefer English, fallback to any available language (e.g. Hindi, Spanish, etc.)
            try:
                transcript_obj = transcript_list.find_transcript(["en", "en-US", "en-GB"])
            except Exception:
                transcript_obj = next(iter(transcript_list))

            snippets_data = transcript_obj.fetch()
            
            # Extract text safely from either dataclass attributes (.text) or dicts (['text'])
            text_parts = []
            for s in snippets_data:
                if hasattr(s, "text"):
                    text_parts.append(s.text)
                elif isinstance(s, dict):
                    text_parts.append(s.get("text", ""))
                else:
                    text_parts.append(str(s))

            raw_text = " ".join(text_parts)
            cleaned_text = cls.clean_transcript_text(raw_text)
            words = len(cleaned_text.split())

            return TranscriptData(
                video_id=video_id,
                video_title=video_title,
                available=True,
                raw_text=raw_text,
                cleaned_text=cleaned_text,
                language=getattr(transcript_obj, "language_code", "en"),
                word_count=words,
                fallback_reason=None,
            )

        except (TranscriptsDisabled, NoTranscriptFound) as e:
            return TranscriptData(
                video_id=video_id,
                video_title=video_title,
                available=False,
                fallback_reason="Captions/transcripts are disabled or not available for this video on YouTube.",
            )
        except Exception as e:
            return TranscriptData(
                video_id=video_id,
                video_title=video_title,
                available=False,
                fallback_reason=f"Could not retrieve transcript: {str(e)}",
            )

    @staticmethod
    def clean_transcript_text(text: str) -> str:
        """
        Sanitizes subtitle text:
        - Removes sound effects markers like [Music], [Applause], (cheering), etc.
        - Strips HTML entities and unescapes characters.
        - Deduplicates repeated phrases from auto-generated subtitles.
        - Normalizes multiple spaces and newlines.
        """
        # Remove sound tags like [Music], [Applause], (laughter)
        cleaned = re.sub(r"\[.*?\]", " ", text)
        cleaned = re.sub(r"\(.*?\)", " ", cleaned)

        # Normalize whitespace
        cleaned = re.sub(r"\s+", " ", cleaned).strip()

        # Deduplicate consecutive repeating sentences/fragments
        words = cleaned.split()
        if not words:
            return ""

        # Simple window deduplication for auto-generated caption stutter
        deduped_words: List[str] = []
        for word in words:
            if not deduped_words or word.lower() != deduped_words[-1].lower():
                deduped_words.append(word)

        return " ".join(deduped_words)

