"""Reorder behavior supplied in Batch Text v1.5.1."""
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from batch_text import ValhallaBatchText


class InputOrderTests(unittest.TestCase):
    def test_saved_order_controls_output(self):
        result = ValhallaBatchText.join_text(
            ["Comma (, )"], [""], TEXT_LIST=["L1", "L2"],
            input_order=[json.dumps(["TEXT:0", "TEXT_LIST", "TEXT:1"])],
            **{"TEXT:0": ["A"], "TEXT:1": ["B"]}
        )
        self.assertEqual(result, ("A, L1, L2, B",))

    def test_list_can_be_last(self):
        self.assertEqual(
            ValhallaBatchText.join_text(
                ["Pipe (|)"], [""], TEXT_LIST=["one", "two"],
                input_order=[json.dumps(["TEXT:1", "TEXT:0", "TEXT_LIST"])],
                **{"TEXT:0": ["X"], "TEXT:1": ["Y"]}
            ), ("Y|X|one|two",)
        )

    def test_legacy_empty_order_uses_old_behavior(self):
        self.assertEqual(
            ValhallaBatchText.join_text(["Comma (,)"], [""], TEXT_LIST=["list"],
                **{"TEXT:1": ["second"], "TEXT:0": ["first"]}),
            ("list,first,second",)
        )

    def test_invalid_and_stale_order_does_not_drop_inputs(self):
        args = {"TEXT:0": ["A"], "TEXT:1": ["B"]}
        for value in ('bad JSON', '7', '["TEXT:1","missing","TEXT:1"]'):
            with self.subTest(value=value):
                result = ValhallaBatchText.join_text(
                    ["Pipe (|)"], [""], input_order=[value], **args)
                self.assertIn(result[0], ("A|B", "B|A"))
                self.assertEqual(len(result[0].split("|")), 2)

    def test_empty_connected_text_remains_in_order(self):
        self.assertEqual(
            ValhallaBatchText.join_text(["Comma (,)"], [""],
                input_order=['["TEXT:1", "TEXT:0"]'],
                **{"TEXT:0": [""], "TEXT:1": ["B"]}),
            ("B,",)
        )

if __name__ == "__main__":
    unittest.main()
