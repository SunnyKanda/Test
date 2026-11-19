"""One web run: download a stream or video, find the best moments, cut vertical clips.

Called by .github/workflows/clip-desk.yml. All inputs come from environment variables
(never pasted into a shell line), and the source link must be a Twitch, YouTube or Kick address.

env: SOURCE_URL, CLIPS (1-5), LAYOUT (blur|fill|facecam|react), HOOK, MAX_MINUTES (5-120), CAPTIONS (word|bubble|none)
"""
import json, os, re, subprocess, sys
from pathlib import Path
from urllib.parse import urlparse

HERE = Path(__file__).resolve().parent
ALLOWED_HOSTS = {"twitch.tv", "www.twitch.tv", "m.twitch.tv", "clips.twitch.tv",
                 "youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be",
                 "kick.com", "www.kick.com"}


def fail(msg):
    print(f"::error::{msg}")
    sys.exit(1)


def number(name, default, lo, hi):
    raw = (os.environ.get(name) or str(default)).strip()
    if not raw.isdigit() or not lo <= int(raw) <= hi:
        fail(f"{name} must be a whole number from {lo} to {hi}, got {raw!r}")
    return int(raw)


def choice(name, default, options):
    v = (os.environ.get(name) or default).strip()
    if v not in options:
        fail(f"{name} must be one of {', '.join(options)}, got {v!r}")
    return v


def main():
    url = (os.environ.get("SOURCE_URL") or "").strip()
    u = urlparse(url)
    if u.scheme != "https" or (u.hostname or "").lower() not in ALLOWED_HOSTS or any(c.isspace() for c in url):
        fail("SOURCE_URL must be one https link on twitch.tv, youtube.com, youtu.be or kick.com")
    clips = number("CLIPS", 3, 1, 5)
    minutes = number("MAX_MINUTES", 30, 5, 120)
    layout = choice("LAYOUT", "blur", ["blur", "fill", "facecam", "react"])
    captions = choice("CAPTIONS", "word", ["word", "bubble", "none"])
    hook = re.sub(r"[\x00-\x1f]", " ", os.environ.get("HOOK") or "")[:80].strip()

    py = sys.executable
    # argument lists only: nothing goes through a shell
    out = subprocess.run([py, str(HERE / "moments.py"), url, "--top", str(clips + 3), "--max-minutes", str(minutes)],
                         text=True, capture_output=True)
    print(out.stdout); print(out.stderr, file=sys.stderr)
    if out.returncode != 0:
        fail("could not download or analyse the video (YouTube often blocks cloud servers; Twitch links work best)")
    job = Path(re.search(r"job: (.+)", out.stdout).group(1).strip())
    cands = json.loads((job / "candidates.json").read_text(encoding="utf-8"))["candidates"]
    best = sorted(cands, key=lambda c: -c["score"])

    made, notes = [], []
    for c in best:
        if len(made) >= clips:
            break
        cmd = [py, str(HERE / "cut.py"), str(job), "--pick", str(c["n"]), "--layout", layout, "--captions", captions]
        if hook:
            cmd += ["--title", hook] if layout == "react" else ["--hook", hook]
        r = subprocess.run(cmd, text=True, capture_output=True)
        print(r.stdout); print(r.stderr, file=sys.stderr)
        if r.returncode != 0:
            notes.append(f"moment {c['n']} skipped: {(r.stderr or r.stdout).strip().splitlines()[-1][:200]}")
            continue
        mp4 = job / "edits" / f"clip_{c['n']}.mp4"
        chk = subprocess.run([py, str(HERE / "check.py"), str(mp4)], text=True, capture_output=True)
        made.append((c, mp4, chk.stdout.strip()))

    if not made:
        fail("no clip could be made. " + " | ".join(notes))

    dist = Path(os.environ.get("CLIP_DESK_OUT", "out")); dist.mkdir(parents=True, exist_ok=True)
    info = json.loads((job / "info.json").read_text(encoding="utf-8"))
    fmt = lambda t: f"{int(t // 60)}:{int(t % 60):02d}"
    md = [f"## Clips from: {info.get('title', '')}",
          f"Source: {info.get('webpage_url', url)} · channel: {info.get('channel') or info.get('uploader') or '?'}", ""]
    for i, (c, mp4, chk) in enumerate(made, 1):
        name = f"clip_{i}_{fmt(c['start']).replace(':', 'm')}s.mp4"
        mp4.replace(dist / name)
        md += [f"### {i}. `{name}` ({fmt(c['start'])}–{fmt(c['end'])}, {c['end'] - c['start']:.0f}s)",
               f"Why: {', '.join(c['why'])}", f"> {c['text'][:300]}", "", "```", chk, "```", ""]
    md += [f"- {n}" for n in notes]
    md += ["", "Upload these to YouTube Studio with visibility set to **Private**."]
    text = "\n".join(md)
    (dist / "summary.md").write_text(text, encoding="utf-8")
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as f:
            f.write(text + "\n")
    print(text)


if __name__ == "__main__":
    main()
