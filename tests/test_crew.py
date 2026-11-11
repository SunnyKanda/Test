"""Run with:  python -m unittest discover tests
Uses built-in fake crew replies, so no API keys or network are needed.
Set TEST_DATABASE_URL to also run the storage test against Postgres."""
import os
import tempfile
import unittest
from datetime import datetime

os.environ["CREW_MOCK"] = "1"

from crew.db import DB  # noqa: E402
from crew.providers import Providers, rank_models  # noqa: E402
from crew.schedule import Scheduler  # noqa: E402
from crew.team import Team  # noqa: E402


def make(url=None):
    db = DB(url, tempfile.mkdtemp())
    providers = Providers(db, "test-secret")
    team = Team(db, providers)
    return db, providers, team


def chat(db):
    return db.q("SELECT sender, kind, text, meta FROM messages ORDER BY created_at")


class Rounds(unittest.IsolatedAsyncioTestCase):
    async def test_everyone_answers_once_and_can_pass(self):
        db, _, team = make()
        team.post("sunny", "hello, where do I start?")
        await team.kick()
        senders = [m["sender"] for m in chat(db)]
        self.assertEqual(senders, ["sunny", "claude", "gpt", "grok"])  # gemini passed

    async def test_topic_picks_who_leads(self):
        db, _, team = make()
        team.post("sunny", "can someone look at my cv")
        await team.kick()
        self.assertEqual(chat(db)[1]["sender"], "gpt")

    async def test_mention_asks_only_that_member(self):
        db, _, team = make()
        team.post("sunny", "@grokbot any ideas?")
        await team.kick()
        self.assertEqual([m["sender"] for m in chat(db)], ["sunny", "grok"])

    async def test_tags_become_todos_and_notes_without_duplicates(self):
        db, _, team = make()
        team.post("sunny", "hello")
        await team.kick()
        tasks = db.q("SELECT title, due, added_by FROM tasks")
        self.assertEqual(len(tasks), 1)  # claude and grok both proposed the same one
        self.assertEqual(tasks[0]["due"], team.today())
        self.assertEqual(db.q("SELECT text FROM memory")[0]["text"], "Wants a job quickly")
        self.assertFalse(any("[[" in m["text"] for m in chat(db)))
        self.assertFalse(any(m["text"].startswith("GPT:") for m in chat(db)))

    async def test_a_failing_member_is_reported_and_the_rest_carry_on(self):
        db, _, team = make()
        os.environ["CREW_MOCK_FAIL"] = "claude"
        try:
            team.post("sunny", "hello")
            await team.kick()
        finally:
            del os.environ["CREW_MOCK_FAIL"]
        rows = chat(db)
        self.assertEqual(rows[1]["kind"], "notice")
        self.assertIn("rejected", rows[1]["text"])
        self.assertIn("gpt", [m["sender"] for m in rows])

    async def test_daily_limit_stops_replies(self):
        db, _, team = make()
        db.set("daily_cap", "1")
        for _ in range(2):
            team.post("sunny", "@claude hello")
            await team.kick()
        self.assertEqual(sum(m["sender"] == "claude" for m in chat(db)), 1)
        self.assertEqual(sum(m["kind"] == "notice" for m in chat(db)), 1)

    async def test_one_reply_mode(self):
        db, _, team = make()
        db.set("reply_mode", "one")
        team.post("sunny", "hello")
        await team.kick()
        self.assertEqual(len(chat(db)), 2)

    async def test_no_keys_explains_what_to_do(self):
        db, providers, team = make()
        providers.mock = False
        team.post("sunny", "hello")
        await team.kick()
        self.assertIn("Settings", chat(db)[-1]["text"])

    async def test_history_always_ends_with_a_user_turn(self):
        db, _, team = make()
        team.post("claude", "morning")
        history = team._history("claude")
        self.assertEqual(history[-1]["role"], "user")
        self.assertEqual(history[0]["role"], "user")


class CheckIns(unittest.IsolatedAsyncioTestCase):
    async def test_due_window_and_once_a_day(self):
        db, _, team = make()
        sched = Scheduler(db, team)
        wed = lambda h, m=0: datetime(2026, 11, 11, h, m, tzinfo=team.tz())  # noqa: E731
        self.assertEqual(sched.due(wed(7, 59)), [])
        self.assertEqual(sched.due(wed(8, 0)), ["morning"])
        self.assertEqual(sched.due(wed(12, 30)), [])           # too late for the morning plan
        self.assertEqual(sched.due(wed(20, 5)), ["evening"])   # Wednesday: no weekly review
        sunday = datetime(2026, 11, 15, 18, 30, tzinfo=team.tz())
        self.assertIn("weekly", sched.due(sunday))
        team.now = lambda: wed(8, 1)
        self.assertEqual(await sched.tick(), ["morning"])
        self.assertEqual(await sched.tick(), [])
        self.assertEqual([m["sender"] for m in chat(db)], ["claude"])

    async def test_nudge_only_when_nothing_is_ticked_off(self):
        db, _, team = make()
        sched = Scheduler(db, team)
        team.now = lambda: datetime(2026, 11, 11, 14, 31, tzinfo=team.tz())
        db.insert("tasks", {"title": "a", "due": "2026-11-11"})
        db.insert("tasks", {"title": "b", "due": "2026-11-11", "done": 1, "done_day": "2026-11-11"})
        self.assertEqual(await sched.tick(), [])

    async def test_switching_check_ins_off(self):
        db, _, team = make()
        db.set("checkins", "0")
        self.assertEqual(Scheduler(db, team).due(datetime(2026, 11, 11, 8, 0, tzinfo=team.tz())), [])


class Storage(unittest.TestCase):
    def test_keys_are_encrypted_and_survive_only_with_the_same_secret(self):
        db, providers, _ = make()
        providers.set_key("grok", "xai-secret-123")
        self.assertNotIn("xai-secret-123", db.get("key_grok"))
        self.assertEqual(providers.key("grok"), "xai-secret-123")
        self.assertEqual(Providers(db, "another-secret").key("grok"), "")

    def test_model_ranking_prefers_everyday_chat_models(self):
        gpt = rank_models("gpt", [("gpt-5-pro", 9), ("gpt-image-2", 8), ("gpt-5.6-terra", 7), ("gpt-5-2025-08-07", 6), ("text-embedding-3", 5)])
        self.assertEqual(gpt[0], "gpt-5.6-terra")
        self.assertNotIn("gpt-image-2", gpt)
        gemini = rank_models("gemini", [("gemini-3.1-pro-preview", 0), ("gemini-3.5-flash", 0), ("gemini-3.1-flash-lite", 0), ("gemini-flash-latest", 0), ("gemini-embedding-001", 0)])
        self.assertEqual(gemini[:2], ["gemini-flash-latest", "gemini-3.5-flash"])
        grok = rank_models("grok", [("grok-4.6", 20), ("grok-imagine-image", 30), ("grok-4-0709", 10)])
        self.assertEqual(grok, ["grok-4.6", "grok-4-0709"])

    @unittest.skipUnless(os.environ.get("TEST_DATABASE_URL"), "no Postgres to test against")
    def test_postgres(self):
        db, _, team = make(os.environ["TEST_DATABASE_URL"])
        db.set("name", "Sam")
        db.set("name", "Sunny")
        self.assertEqual(db.get("name"), "Sunny")
        row = db.insert("tasks", {"title": "x", "due": team.today()})
        db.update("tasks", row["id"], {"done": 1, "done_day": team.today()})
        self.assertEqual(db.q("SELECT done FROM tasks WHERE id=?", (row["id"],))[0]["done"], 1)
        team._count("claude"); team._count("claude")
        self.assertEqual(team.usage_today()["claude"], 2)
        self.assertIn("Finished today: x", team.snapshot())
        db.delete("tasks", row["id"])


if __name__ == "__main__":
    unittest.main()
