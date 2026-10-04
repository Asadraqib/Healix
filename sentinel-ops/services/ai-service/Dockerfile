FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
    && groupadd --gid 10001 app && useradd --uid 10001 --gid app --no-create-home app
COPY --chown=app:app main.py document_library.py ./
COPY --chown=app:app documents/ ./documents/
USER app
EXPOSE 8083
HEALTHCHECK --interval=20s --timeout=5s --start-period=20s --retries=5 \
    CMD python -c "import json,urllib.request; health=json.load(urllib.request.urlopen('http://localhost:8083/api/ai/health', timeout=4)); assert health['documentsReady']"
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8083"]
