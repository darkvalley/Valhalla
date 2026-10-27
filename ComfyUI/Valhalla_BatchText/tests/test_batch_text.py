import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from batch_text import (
    FlexibleTextInputs,
    ValhallaBatchText,
    resolve_delimiter,
    decode_custom_delimiter,
    DELIMITERS,
    CUSTOM_OPTION,
)


class BatchTextTests(unittest.TestCase):
    def test_native_list_schema_and_input_flag(self):
        self.assertTrue(ValhallaBatchText.INPUT_IS_LIST)
        optional = ValhallaBatchText.INPUT_TYPES()["optional"]
        self.assertIn("TEXT_LIST", optional)
        self.assertEqual(optional["TEXT_LIST"][0], "STRING")
        self.assertTrue(optional["TEXT_LIST"][1]["forceInput"])

    def test_comfy_native_list_plus_dynamic_inputs_order(self):
        output = ValhallaBatchText.join_text(
            ["LF (\\n)"], ["unused"],
            TEXT_LIST=["first", "second"],
            **{"TEXT:2": ["fourth"], "TEXT:0": ["third"]},
        )
        self.assertEqual(output, ("first\nsecond\nthird\nfourth",))

    def test_list_and_single_string_are_distinct(self):
        joined_list = ValhallaBatchText.join_text(
            ["Comma (,)"], [""], TEXT_LIST=["A", "B"]
        )
        single_multiline = ValhallaBatchText.join_text(
            ["Comma (,)"], [""], TEXT_LIST=["A\nB"]
        )
        self.assertEqual(joined_list, ("A,B",))
        self.assertEqual(single_multiline, ("A\nB",))

    def test_python_array_nested_one_level_and_mixed(self):
        self.assertEqual(
            ValhallaBatchText.join_text(
                ["Pipe (|)"], [""], TEXT_LIST=[["A", "B"]],
                **{"TEXT:0": ["C"], "TEXT:1": ["D", "E"]}
            ),
            ("A|B|C|D|E",),
        )

    def test_reject_bad_list_items(self):
        with self.assertRaises(TypeError):
            ValhallaBatchText.join_text(["Comma (,)"], [""], TEXT_LIST=["A", 23])
        with self.assertRaises(TypeError):
            ValhallaBatchText.join_text(["Comma (,)"], [""], **{"TEXT:0": ["A", None]})

    def test_optional_list_unconnected_and_no_duplication(self):
        self.assertEqual(
            ValhallaBatchText.join_text(["LF (\\n)"], [""], **{"TEXT:0": ["A\nB"]}),
            ("A\nB",),
        )
        self.assertEqual(
            ValhallaBatchText.join_text(["LF (\\n)"], [""], TEXT_LIST=["A\nB"], **{"TEXT:0": ["A\nB"]}),
            ("A\nB\nA\nB",),
        )

    def test_schema_combo_and_custom(self):
        required = ValhallaBatchText.INPUT_TYPES()["required"]
        self.assertEqual(required["delimiter"][0][0], "None (direct)")
        self.assertIn(CUSTOM_OPTION, required["delimiter"][0])
        self.assertEqual(required["custom_delimiter"][0], "STRING")
        self.assertTrue(required["custom_delimiter"][1]["multiline"])

    def test_every_preset(self):
        for mode, expected in DELIMITERS.items():
            with self.subTest(mode=mode):
                self.assertEqual(resolve_delimiter(mode), expected)
                self.assertEqual(
                    ValhallaBatchText.join_text(mode, "", **{"TEXT:0": "A", "TEXT:1": "B"}),
                    (f"A{expected}B",),
                )

    def test_dutch_dropdown_legacy_values(self):
        legacy_pairs = {
            "Geen (direct)": "None (direct)",
            "Spatie ( )": "Space ( )",
            "Komma (, )": "Comma (, )",
            "Komma (,)": "Comma (,)",
            "Puntkomma (; )": "Semicolon (; )",
            "Puntkomma (;)": "Semicolon (;)",
            "Dubbele punt (: )": "Colon (: )",
            "Dubbele punt (:)": "Colon (:)",
            "Lege regel (\\n\\n)": "Blank line (\\n\\n)",
        }
        for old, new in legacy_pairs.items():
            with self.subTest(old=old):
                self.assertEqual(resolve_delimiter(old), resolve_delimiter(new))
        self.assertEqual(resolve_delimiter("Custom (eigen tekst)", r"\n"), "\n")

    def test_schema_ui_english(self):
        schema = ValhallaBatchText.INPUT_TYPES()
        labels = schema["required"]["delimiter"][0]
        self.assertEqual(labels[0], "None (direct)")
        self.assertIn("Blank line (\\n\\n)", labels)
        self.assertIn("Custom", labels)
        self.assertNotIn("Geen (direct)", labels)
        self.assertEqual(len(labels), 16)

    def test_custom_literal(self):
        self.assertEqual(ValhallaBatchText.join_text(CUSTOM_OPTION, " ✨ ", **{"TEXT:0": "a", "TEXT:1": "b"}), ("a ✨ b",))
        self.assertEqual(ValhallaBatchText.join_text(CUSTOM_OPTION, "", **{"TEXT:0": "a", "TEXT:1": "b"}), ("ab",))

    def test_custom_control_chars(self):
        self.assertEqual(decode_custom_delimiter(r"\r\n"), "\r\n")
        self.assertEqual(decode_custom_delimiter(r"\t"), "\t")
        self.assertEqual(decode_custom_delimiter(r"\n"), "\n")
        self.assertEqual(decode_custom_delimiter(r"\\n"), r"\n")
        self.assertEqual(decode_custom_delimiter("\n"), "\n")
        self.assertEqual(decode_custom_delimiter(r"\q"), r"\q")
        self.assertEqual(decode_custom_delimiter("🎄"), "🎄")

    def test_order_and_empty_connected(self):
        self.assertEqual(
            ValhallaBatchText.join_text("Pipe (|)", "", **{"TEXT:10": "C", "TEXT:2": "", "TEXT:0": "A"}),
            ("A||C",),
        )

    def test_v11_literal_raw_api(self):
        self.assertEqual(resolve_delimiter("~~"), "~~")
        self.assertEqual(ValhallaBatchText.join_text("~~", **{"TEXT:0": "A", "TEXT:1": "B"}), ("A~~B",))
        self.assertEqual(ValhallaBatchText.join_text("", **{"TEXT:0": "A", "TEXT:1": "B"}), ("AB",))

    def test_no_text(self):
        self.assertEqual(ValhallaBatchText.join_text("CRLF (\\r\\n)"), ("",))

    def test_many_inputs(self):
        values = {f"TEXT:{i}": str(i) for i in range(1005)}
        output = ValhallaBatchText.join_text("LF (\\n)", "", **values)[0]
        self.assertEqual(len(output.split("\n")), 1005)
        self.assertTrue(output.endswith("1004"))

    def test_reject_wrong_types(self):
        with self.assertRaises(TypeError):
            ValhallaBatchText.join_text("Comma (,)" , "", **{"TEXT:0": 12})
        with self.assertRaises(TypeError):
            ValhallaBatchText.join_text(CUSTOM_OPTION, 42, **{"TEXT:0": "x"})

    def test_flexible_inputs(self):
        optional = ValhallaBatchText.INPUT_TYPES()["optional"]
        self.assertIsInstance(optional, FlexibleTextInputs)
        self.assertIn("TEXT:0", optional)
        self.assertIn("TEXT:99999999", optional)
        self.assertNotIn("OTHER:0", optional)
        self.assertEqual(optional["TEXT:20"][0], "STRING")
        self.assertEqual(optional.get("TEXT:7")[0], "STRING")


if __name__ == "__main__":
    unittest.main()
