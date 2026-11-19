# Clip desk (web version)

Turns a Twitch, YouTube or Kick stream/video into captioned 1080x1920 vertical clips.
It runs on GitHub's servers, never on your computer. Adapted from
[Bodila51/gtavi-claudecode](https://github.com/Bodila51/gtavi-claudecode) (MIT, see `LICENSE`),
copied at commit `dd95d39`. It does **not** follow that repo's updates.

## Run it

1. On GitHub open **Actions → Clip desk (make vertical clips) → Run workflow**.
2. Paste a link, pick how many clips (1–5), the layout and an optional hook, then **Run workflow**.
3. When it finishes (about 10–25 min), open the run, read the summary, and download **clips** at the bottom.
   Downloads are deleted after 3 days.
4. Upload them in YouTube Studio with visibility **Private**.

Layouts: `blur` (game in the middle, blurred fill), `fill` (cropped full screen),
`facecam` / `react` (streamer's webcam on top, game below; skips moments with no webcam).

## What changed from the original, for safety

- **No automatic updates.** The code lives in this repo. Every Python package is pinned to an exact version
  with a checksum (`requirements.txt`, installed with `--require-hashes`), so a changed or swapped package is refused.
  To update, edit `requirements.in` and regenerate the lockfile on purpose.
- **No downloads of code or models from the original author.** The face-detection model is stored in `models/`
  and checked against its SHA-256 before use. The only thing fetched at run time is OpenAI's Whisper "small"
  speech model from the official `Systran/faster-whisper-small` Hugging Face repo.
- **yt-dlp locked down:** `--ignore-config --no-exec --no-batch-file --no-playlist`, 6 GB max.
- **Input checks:** only one `https` link on twitch.tv / youtube.com / youtu.be / kick.com is accepted,
  numbers and choices are range-checked, and nothing you type is ever put into a shell command.
- **Least privilege:** the workflow can only read this repo, runs only when you press the button,
  and has no access to any of your accounts or secrets.
- **Removed:** the Claude Code plugin/skills (they told an AI agent to install software on your machine),
  `winget`/`brew`/`sudo` install steps, Reddit/Twitch-API scrapers, live recording, translation and text-to-speech.

## Limits

- YouTube often blocks downloads from cloud servers ("Sign in to confirm you're not a bot"). Twitch VODs and clips are the reliable source.
- Only the first `max_minutes` of a video are analysed (default 30) to stay within the free GitHub minutes.
- Clips of other people's streams are their copyrighted content. Keep uploads Private unless you have the creator's permission or are in their clipping campaign.
