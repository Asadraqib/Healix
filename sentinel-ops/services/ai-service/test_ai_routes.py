import os
import tempfile
import unittest
import uuid
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient
import main
from document_library import DocumentLibrary


class AiRouteTests(unittest.TestCase):
    def test_upload_mode_isolation_reset_and_provider_unavailable(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.dict(os.environ, {'QDRANT_URL': '', 'QDRANT_PATH': directory, 'GROQ_API_KEY': ''}), \
                    patch.object(main, 'library', DocumentLibrary()), \
                    patch.object(main, 'DOCUMENTS', Path(directory) / 'references'):
                with TestClient(main.app) as client:
                    self.assertTrue(client.get('/api/ai/health').json()['documentsReady'])
                    live = client.post('/api/ai/documents', files={'file': ('live.txt', b'Bearing lubrication inspection.', 'text/plain')})
                    self.assertEqual(live.status_code, 200)
                    session = str(uuid.uuid4())
                    params = {'mode': 'SIMULATION', 'sessionId': session}
                    simulated = client.post('/api/ai/documents', params=params, files={'file': ('demo.txt', b'Temporary spindle vibration inspection.', 'text/plain')})
                    self.assertEqual(simulated.status_code, 200)
                    self.assertTrue(simulated.json()['temporary'])
                    self.assertEqual(len(client.get('/api/ai/documents').json()['documents']), 1)
                    self.assertEqual(client.post('/api/ai/documents', files={'file': ('bad.exe', b'bad')}).status_code, 422)
                    self.assertEqual(client.get('/api/ai/documents', params={'mode': 'SIMULATION', 'sessionId': 'invalid'}).status_code, 422)
                    for action in ['chat', 'analyze', 'forecast', 'draft-work-order', 'diagnose']:
                        response = client.post('/api/ai/' + action, json={'machineId': 'test', 'question': 'Explain maintenance'})
                        self.assertEqual(response.status_code, 503)
                        self.assertIn('provider unavailable', response.json()['detail'])
                    client.delete('/api/ai/documents/simulation/' + session)
                    self.assertEqual(client.get('/api/ai/documents', params=params).json()['documents'], [])
                    self.assertEqual(len(client.get('/api/ai/documents').json()['documents']), 1)


if __name__ == '__main__':
    unittest.main()
