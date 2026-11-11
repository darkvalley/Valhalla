"""Optional Batch Text preview and logging release regression tests."""
import math
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import batch_text
from batch_text import ValhallaBatchText as Node


class InspectorReleaseTests(unittest.TestCase):
    def test_defaults_and_backwards_compatibility(self):
        optional = Node.INPUT_TYPES()["optional"]
        self.assertEqual(list(optional)[:2], ["TEXT_LIST", "input_order"])
        self.assertFalse(optional["show_preview"][1]["default"])
        self.assertFalse(optional["write_log"][1]["default"])
        self.assertTrue(Node.OUTPUT_NODE)
        self.assertEqual(Node.join_text(show_preview=[False], write_log=[True],
                                        **{"TEXT:0": ["original"]}), ("original",))
        self.assertIsNone(Node.IS_CHANGED(show_preview=False))
        self.assertTrue(math.isnan(Node.IS_CHANGED(show_preview=True)))

    def test_preview_never_truncates_output(self):
        full = "a" * 180 + "🚀" + "z" * 20
        output = Node.join_text(show_preview=[True], max_chars=[100],
                                **{"TEXT:0": [full]})
        self.assertEqual(output["result"], (full,))
        self.assertIn("PREVIEW AFGEKAPT", output["ui"]["text"][0])
        self.assertEqual(output["ui"]["displayed_character_count"], [100])
        self.assertEqual(output["ui"]["character_count"], [201])

    def test_full_logging_append_and_toggle(self):
        with tempfile.TemporaryDirectory() as folder:
            workflow = {"workflow":{"extra":{"valhalla_text_inspector_run":{
                "workflow_name":"Test_Workflow.json","timestamp":"20261111_190000_123"
            }}, "nodes":[{"id":7,"title":"Batch Text"}]}}
            arguments = dict(show_preview=True, write_log=True, log_folder=folder,
                             extra_pnginfo=workflow, unique_id=7)
            first = Node.join_text(**arguments, **{"TEXT:0":"ABC"})
            second = Node.join_text(**arguments, **{"TEXT:0":"DEF"})
            target = Path(first["ui"]["log_path"][0])
            self.assertEqual(target, Path(second["ui"]["log_path"][0]))
            self.assertEqual(target.name, "Test_Workflow_20261111_190000_123.txt")
            self.assertIn("ABC", target.read_text(encoding="utf-8"))
            self.assertIn("DEF", target.read_text(encoding="utf-8"))
            before = target.read_bytes()
            Node.join_text(show_preview=False, write_log=True, log_folder=folder,
                           extra_pnginfo=workflow, **{"TEXT:0":"NOT WRITTEN"})
            self.assertEqual(target.read_bytes(), before)

    def test_workflow_folder_auto_and_nonexistent_path(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "user" / "default" / "workflows"
            subdir = root / "MyProject"
            subdir.mkdir(parents=True)
            (subdir / "wf.json").write_text("{}", encoding="utf-8")
            with patch.object(batch_text, "_workflow_root", return_value=root):
                self.assertEqual(batch_text._effective_folder("NULL", hint="MyProject/wf.json"), subdir)
                self.assertEqual(batch_text._effective_folder("", hint="missing.json"), root)
            invalid = Path(tmp) / "not-created"
            ui = Node.join_text(show_preview=True, write_log=True, log_folder=str(invalid),
                                **{"TEXT:0":"test"})["ui"]
            self.assertFalse(invalid.exists())
            self.assertEqual(ui["log_path"], [""])
            self.assertTrue(ui["log_error"][0])


if __name__ == "__main__":
    unittest.main()
