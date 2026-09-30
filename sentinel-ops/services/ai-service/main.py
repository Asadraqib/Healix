import os
from typing import Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel

load_dotenv()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex="http://localhost:.*",
    allow_methods=["*"],
    allow_headers=["*"],
)

groq_client = Groq(api_key=os.environ["GROQ_API_KEY"])
GATEWAY_URL = os.environ.get("GATEWAY_URL", "http://localhost:8080")


class DiagnoseRequest(BaseModel):
    machineId: Optional[str] = None
    question: str


async def fetch_asset(machine_id: str) -> dict:
    async with httpx.AsyncClient(timeout=5) as client:
        resp = await client.get(f"{GATEWAY_URL}/api/assets/{machine_id}")
        resp.raise_for_status()
        return resp.json()


async def fetch_work_orders() -> list:
    async with httpx.AsyncClient(timeout=5) as client:
        resp = await client.get(f"{GATEWAY_URL}/api/work-orders")
        resp.raise_for_status()
        return resp.json()


@app.get("/api/ai/health")
def health():
    return {"status": "UP"}


@app.post("/api/ai/diagnose")
async def diagnose(req: DiagnoseRequest):
    machine_id = req.machineId or "CNC-001"

    try:
        asset = await fetch_asset(machine_id)
    except Exception:
        asset = {"id": machine_id, "note": "live telemetry unavailable"}

    try:
        work_orders = await fetch_work_orders()
        related = [w for w in work_orders if w.get("asset") == machine_id][:3]
    except Exception:
        related = []

    context = (
        f"Machine {machine_id} current telemetry: "
        f"status={asset.get('status')}, health={asset.get('health')}, "
        f"temperature={asset.get('temperature')}, vibration={asset.get('vibration')}, "
        f"load={asset.get('load')}, power={asset.get('power')}.\n"
        f"Related open work orders: {related if related else 'none found'}."
    )

    completion = groq_client.chat.completions.create(
        model="qwen/qwen3.8-27b",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an industrial maintenance assistant for a Siemens-style "
                    "manufacturing plant. Answer using ONLY the telemetry and work-order "
                    "context provided below — never invent numbers or machine states. "
                    "If the context doesn't cover the question, say so plainly. "
                    "Keep answers to 2-4 sentences and recommend a concrete next action."
                ),
            },
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {req.question}"},
        ],
        temperature=0.3,
        max_tokens=300,
    )

    return {
        "answer": completion.choices[0].message.content,
        "machineId": machine_id,
        "sources": ["Live telemetry", "Work order history"],
    }