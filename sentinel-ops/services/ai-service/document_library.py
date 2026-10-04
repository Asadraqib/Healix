"""Qdrant document indexing with persistent LIVE and isolated in-memory simulation stores.
Vectors use deterministic token hashing; this is lexical retrieval, not semantic embeddings.
"""
import hashlib
import io
import math
import os
import re
import threading
import time
import uuid
import zipfile
from pathlib import Path
from xml.etree import ElementTree
from qdrant_client import QdrantClient, models
from pypdf import PdfReader

DIMENSIONS = 512
COLLECTION = 'healix_maintenance_documents_v1'
MAX_BYTES = 10 * 1024 * 1024
STOPWORDS = {'a','an','and','the','of','to','for','is','in','on','with','it','this','that','what','how','please','my','can','be','are'}

def tokens(text):
    return [word for word in re.findall(r'[\w-]{2,}', text.casefold()) if word not in STOPWORDS]

def vector(text):
    values = [0.0] * DIMENSIONS
    for word in tokens(text):
        digest = hashlib.blake2b(word.encode(), digest_size=8).digest()
        index = int.from_bytes(digest[:4], 'little') % DIMENSIONS
        values[index] += 1 if digest[4] & 1 else -1
    length = math.sqrt(sum(value * value for value in values))
    return [value / length for value in values] if length else values

def extract(filename, data):
    if not data or len(data) > MAX_BYTES:
        raise ValueError('Choose a nonempty document of at most 10 MB.')
    suffix = Path(filename).suffix.lower()
    try:
        if suffix in ['.txt', '.md']:
            text = data.decode('utf-8-sig')
        elif suffix == '.pdf':
            reader = PdfReader(io.BytesIO(data))
            if reader.is_encrypted:
                raise ValueError('Encrypted PDFs are not supported.')
            if len(reader.pages) > 250:
                raise ValueError('PDFs must contain at most 250 pages.')
            text = '\n'.join(page.extract_text() or '' for page in reader.pages)
        elif suffix == '.docx':
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                info = archive.getinfo('word/document.xml')
                if info.file_size > 20 * 1024 * 1024:
                    raise ValueError('The extracted document is too large.')
                xml = ElementTree.fromstring(archive.read(info))
                text = '\n'.join(''.join(p.itertext()) for p in xml.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'))
        else:
            raise ValueError('Supported formats: PDF, DOCX, TXT, and Markdown.')
    except (UnicodeError, zipfile.BadZipFile, KeyError, ElementTree.ParseError) as error:
        raise ValueError('The document could not be read. Export a valid UTF-8 text, PDF, or DOCX file.') from error
    text = text.replace('\x00', '').strip()
    if not text:
        raise ValueError('No readable text was found. Scanned PDFs require OCR before upload.')
    if len(text) > 2_000_000:
        raise ValueError('The document contains too much text. Split it into smaller files.')
    return text

class DocumentIndex:
    def __init__(self, client):
        self.client = client
        if not client.collection_exists(COLLECTION):
            client.create_collection(COLLECTION, vectors_config=models.VectorParams(size=DIMENSIONS, distance=models.Distance.COSINE))
        self.lock = threading.RLock()

    def add(self, filename, data):
        text = extract(filename, data)
        name = Path(filename.replace('\\', '/')).name[:180]
        document_id = str(uuid.uuid5(uuid.NAMESPACE_URL, name + ':' + hashlib.sha256(data).hexdigest()))
        points = []
        timestamp = time.time()
        for number, offset in enumerate(range(0, len(text), 1050), 1):
            chunk = text[offset:offset + 1200]
            if not chunk.strip():
                continue
            points.append(models.PointStruct(id=str(uuid.uuid5(uuid.UUID(document_id), str(number))), vector=vector(chunk), payload={'document_id': document_id, 'filename': name, 'chunk': number, 'text': chunk, 'uploaded_at': timestamp, 'bytes': len(data)}))
        with self.lock:
            if len(self.list()) >= 200 and not any(item['id'] == document_id for item in self.list()):
                raise ValueError('The library is limited to 200 documents. Remove unused documents before uploading.')
            for offset in range(0, len(points), 100):
                self.client.upsert(COLLECTION, points=points[offset:offset+100], wait=True)
        return {'id': document_id, 'filename': name, 'chunks': len(points), 'bytes': len(data)}

    def list(self):
        documents = {}
        offset = None
        with self.lock:
            while True:
                points, offset = self.client.scroll(COLLECTION, limit=256, offset=offset, with_vectors=False)
                for point in points:
                    p = point.payload
                    entry = documents.setdefault(p['document_id'], {'id': p['document_id'], 'filename': p['filename'], 'uploadedAt': p['uploaded_at'], 'bytes': p['bytes'], 'chunks': 0})
                    entry['chunks'] += 1
                if offset is None:
                    break
        return sorted(documents.values(), key=lambda item: item['uploadedAt'], reverse=True)

    def retrieve(self, question, limit=4):
        query_terms = set(tokens(question))
        if not query_terms:
            return []
        with self.lock:
            result = self.client.query_points(COLLECTION, query=vector(question), limit=12, with_payload=True).points
        matches = [p for p in result if p.score > .04 and query_terms.intersection(tokens(p.payload['text']))]
        return [{'source': f"{p.payload['filename']} · chunk {p.payload['chunk']}", 'documentId': p.payload['document_id'], 'text': p.payload['text'], 'score': p.score} for p in matches[:limit]]

    def delete(self, document_id):
        uuid.UUID(document_id)
        with self.lock:
            self.client.delete(COLLECTION, points_selector=models.FilterSelector(filter=models.Filter(must=[models.FieldCondition(key='document_id', match=models.MatchValue(value=document_id))])), wait=True)

class DocumentLibrary:
    def __init__(self):
        self.live = None
        self.simulations = {}
        self.error = None

    def initialize(self, reference_path):
        self.reference_path = reference_path
        client = None
        try:
            url = os.getenv('QDRANT_URL', '').strip()
            client = QdrantClient(url=url, api_key=os.getenv('QDRANT_API_KEY') or None, timeout=15) if url else QdrantClient(path=(os.getenv('QDRANT_PATH') or str(Path(__file__).parents[2] / '.runtime' / 'qdrant')), force_disable_check_same_thread=True)
            self.live = DocumentIndex(client)
            for file in reference_path.glob('*.md'):
                self.live.add(file.name, file.read_bytes())
            self.error = None
        except Exception as error:
            if client is not None:
                client.close()
            self.error = type(error).__name__
            self.live = None

    def index(self, mode='LIVE', session_id=None):
        if mode == 'LIVE':
            if not self.live and hasattr(self, 'reference_path'):
                self.initialize(self.reference_path)
            if not self.live:
                raise RuntimeError('Document library is unavailable. Check Qdrant configuration and backend logs.')
            return self.live
        if mode != 'SIMULATION' or not session_id:
            raise ValueError('A simulation session is required for temporary documents.')
        uuid.UUID(session_id)
        now = time.time()
        for key, (index, seen) in list(self.simulations.items()):
            if now - seen > 3600:
                index.client.close()
                self.simulations.pop(key, None)
        if session_id not in self.simulations:
            if len(self.simulations) >= 30:
                raise RuntimeError('Too many active simulation libraries. Retry later.')
            self.simulations[session_id] = (DocumentIndex(QdrantClient(':memory:')), now)
        index, _ = self.simulations[session_id]
        self.simulations[session_id] = (index, now)
        return index

    def reset_simulation(self, session_id):
        entry = self.simulations.pop(session_id, None)
        if entry:
            entry[0].client.close()

    def close(self):
        if self.live:
            self.live.client.close()
        for index, _ in self.simulations.values():
            index.client.close()
        self.simulations.clear()
