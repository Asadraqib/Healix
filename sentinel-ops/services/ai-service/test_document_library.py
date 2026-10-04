import os
import tempfile
import unittest
import uuid
from pathlib import Path
from unittest.mock import patch
from document_library import DocumentLibrary, extract


class DocumentLibraryTests(unittest.TestCase):
    def test_live_persistence_simulation_isolation_and_source_references(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.dict(os.environ, {'QDRANT_URL': '', 'QDRANT_PATH': directory}):
                library = DocumentLibrary()
                library.initialize(Path(directory) / 'missing-references')
                document = library.index().add('bearing.txt', b'Bearing vibration inspection requires checking lubrication and alignment.')
                matches = library.index().retrieve('bearing vibration lubrication')
                self.assertTrue(matches)
                self.assertEqual(matches[0]['documentId'], document['id'])
                self.assertIn('bearing.txt', matches[0]['source'])
                session = str(uuid.uuid4())
                library.index('SIMULATION', session).add('temporary.txt', b'Temporary simulation spindle instructions.')
                self.assertEqual(len(library.index().list()), 1)
                library.reset_simulation(session)
                self.assertEqual(library.index('SIMULATION', session).list(), [])
                library.close()
                restored = DocumentLibrary()
                restored.initialize(Path(directory) / 'missing-references')
                self.assertEqual(restored.index().list()[0]['id'], document['id'])
                restored.index().delete(document['id'])
                self.assertEqual(restored.index().list(), [])
                restored.close()

    def test_rejects_unreadable_and_unsupported_files(self):
        for name, data in [('empty.txt', b''), ('file.exe', b'content'), ('bad.docx', b'invalid zip'), ('bad.txt', b'\xff')]:
            with self.subTest(name=name):
                with self.assertRaises(ValueError):
                    extract(name, data)


if __name__ == '__main__':
    unittest.main()
