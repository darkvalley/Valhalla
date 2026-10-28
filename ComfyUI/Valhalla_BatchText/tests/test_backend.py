"""Backend regressions for Valhalla Batch Text. Run: python -m unittest discover -s tests."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from batch_text import ValhallaBatchText as Node, FlexibleTextInputs, resolve_delimiter


class TestBatchText(unittest.TestCase):
    def test_manifest_backward_compatible(self):
        self.assertEqual(Node.CATEGORY, "Valhalla's Calling/Text")
        self.assertEqual(Node.RETURN_TYPES, ("STRING",))
        self.assertTrue(Node.INPUT_IS_LIST)
        inputs = Node.INPUT_TYPES()
        self.assertIn('TEXT_LIST', inputs['optional'])
        self.assertIn('input_order', inputs['optional'])
        self.assertTrue(isinstance(inputs['optional'], FlexibleTextInputs))
        self.assertIn('TEXT:999', inputs['optional'])

    def test_explicit_order_wins_over_numbering(self):
        v = Node.join_text(delimiter='Comma (, )', TEXT_LIST=['list-A', 'list-B'],
                           input_order='["TEXT:2","TEXT_LIST","TEXT:0"]',
                           **{'TEXT:0':'zero', 'TEXT:2':'two'})
        self.assertEqual(v, ('two, list-A, list-B, zero',))

    def test_missing_fields_added_safely(self):
        self.assertEqual(Node.join_text(delimiter='Pipe (|)',
                            input_order='["TEXT:999","TEXT:3","TEXT:3"]',
                            **{'TEXT:3':'C', 'TEXT:2':'B'}), ('C|B',))

    def test_native_list_and_multiline_are_distinct(self):
        self.assertEqual(Node.join_text(delimiter='LF (\\n)', TEXT_LIST=['A','B'],
                            **{'TEXT:0':'X\nY'}), ('A\nB\nX\nY',))

    def test_custom_and_legacy_delimiters(self):
        self.assertEqual(resolve_delimiter('Lege regel (\\n\\n)'), '\n\n')
        self.assertEqual(resolve_delimiter('CRLF (\\r\\n)'), '\r\n')
        self.assertEqual(resolve_delimiter('Custom', r'\n#\t'), '\n#\t')
        self.assertEqual(Node.join_text(delimiter='Custom', custom_delimiter=r'\\n',
                            **{'TEXT:0':'A','TEXT:1':'B'}), (r'A\nB',))

    def test_invalid_order_fallback(self):
        self.assertEqual(Node.join_text(delimiter='Space ( )', input_order='oops',
                            TEXT_LIST=['L'], **{'TEXT:1':'B','TEXT:0':'A'}), ('L A B',))

    def test_non_string_rejected(self):
        with self.assertRaises(TypeError):
            Node.join_text(TEXT_LIST=['ok',17])


if __name__ == '__main__':
    unittest.main()
