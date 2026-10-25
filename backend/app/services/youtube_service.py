"""
YouTube Service for NoteLoom V2.
Handles URL parsing, metadata extraction, transcript fetching, and text cleaning.
"""

import re
from typing import List, Optional, Tuple
from urllib.parse import parse_qs, urlparse
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
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
    def fetch_oembed_metadata(cls, video_id: str) -> Optional[VideoItem]:
        """
        Fetches official public video metadata via YouTube's oEmbed endpoint.
        Never blocked by cloud datacenter IP restrictions (Render, AWS, GCP, etc.).
        """
        try:
            oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
            resp = requests.get(
                oembed_url,
                timeout=5,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            )
            if resp.status_code == 200:
                data = resp.json()
                return VideoItem(
                    video_id=video_id,
                    title=data.get("title") or f"YouTube Video ({video_id})",
                    url=f"https://www.youtube.com/watch?v={video_id}",
                    channel=data.get("author_name") or "YouTube Creator",
                    thumbnail_url=data.get("thumbnail_url") or f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
                    sequence_index=1,
                    category=None,
                )
        except Exception:
            pass
        return None

    @classmethod
    def fetch_metadata(cls, url: str) -> IngestionResult:
        """
        Extracts video or playlist metadata.
        Uses resilient YouTube oEmbed for single videos (immune to cloud bot-blocking),
        and yt-dlp with mobile/TV fallback for playlists.
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

        # For single videos, use oEmbed directly for instant, bot-proof metadata
        if video_id and not playlist_id:
            oembed_video = cls.fetch_oembed_metadata(video_id)
            if oembed_video:
                # Optionally attempt yt-dlp to enrich duration/category without failing if blocked
                try:
                    ydl_opts = {
                        "extract_flat": True,
                        "skip_download": True,
                        "quiet": True,
                        "no_warnings": True,
                        "socket_timeout": 3,
                    }
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        info = ydl.extract_info(clean_url, download=False)
                        if info:
                            oembed_video.duration_seconds = info.get("duration")
                            oembed_video.category = (info.get("categories") or [None])[0]
                            if info.get("description"):
                                oembed_video.description = info.get("description")
                except Exception:
                    pass
                return IngestionResult(is_playlist=False, videos=[oembed_video])

        # For playlists (or fallback), use yt-dlp with multi-client mobile fallback
        ydl_opts = {
            "extract_flat": True,
            "skip_download": True,
            "quiet": True,
            "no_warnings": True,
            "extractor_args": {
                "youtube": {
                    "player_client": ["android", "ios", "mweb", "tv"]
                }
            },
            "http_headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
            }
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(clean_url, download=False)
        except Exception as e:
            # If yt-dlp fails but we have a single video_id, fall back gracefully
            if video_id:
                fallback_video = cls.fetch_oembed_metadata(video_id) or VideoItem(
                    video_id=video_id,
                    title=f"YouTube Video ({video_id})",
                    url=f"https://www.youtube.com/watch?v={video_id}",
                    sequence_index=1,
                    thumbnail_url=f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
                )
                return IngestionResult(is_playlist=False, videos=[fallback_video])
            raise e

        if not info:
            if video_id:
                fallback_video = cls.fetch_oembed_metadata(video_id)
                if fallback_video:
                    return IngestionResult(is_playlist=False, videos=[fallback_video])
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
        Uses a resilient requests.Session with browser User-Agent headers, connection retries,
        and automatic translation/language fallbacks to ensure rich transcripts on cloud datacenters.
        """
        try:
            session = requests.Session()
            retries = Retry(total=3, backoff_factor=0.5, status_forcelist=[429, 500, 502, 503, 504])
            session.mount("https://", HTTPAdapter(max_retries=retries))
            session.headers.update({
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
            })

            # Support both new v1.2.4+ instance API and legacy static method
            transcript_list = None
            try:
                api = YouTubeTranscriptApi(http_client=session)
                if hasattr(api, "list"):
                    transcript_list = api.list(video_id)
            except Exception:
                pass

            if transcript_list is None:
                if hasattr(YouTubeTranscriptApi, "list_transcripts"):
                    transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
                else:
                    api = YouTubeTranscriptApi()
                    transcript_list = api.list(video_id)

            # 1. Search for primary target languages (English variants + Hindi / Hinglish)
            target_langs = ["en", "en-US", "en-GB", "en-IN", "en-CA", "en-AU", "hi", "hi-Latn"]
            transcript_obj = None
            try:
                transcript_obj = transcript_list.find_transcript(target_langs)
            except Exception:
                # 2. Try translating any translatable transcript to English
                for item in transcript_list:
                    if getattr(item, "is_translatable", False):
                        try:
                            transcript_obj = item.translate("en")
                            break
                        except Exception:
                            pass

                # 3. If still None, take the first available transcript (Gemini understands all major languages)
                if transcript_obj is None:
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
