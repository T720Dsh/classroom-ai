"""
Classroom AI — 后端
- POST /chat       玩家对某个 NPC 说话
- POST /event      场景事件（玩家做了某事），让 NPC 自动反应
- GET  /           静态文件（前端）
"""

import os
import json
import uuid
from pathlib import Path
from typing import Dict, List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from personas import PERSONAS, EVENT_ROUTER_PROMPT

# ---------- 配置 ----------
ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.deepseek.com/v1")
LLM_API_KEY = os.getenv("LLM_API_KEY", "").strip()
LLM_MODEL = os.getenv("LLM_MODEL", "deepseek-chat")
PORT = int(os.getenv("PORT", "8000"))

# 本地模型（llama-cpp-python）
LOCAL_MODEL_PATH = os.getenv("LOCAL_MODEL_PATH", "").strip()

# 决定运行模式
if LOCAL_MODEL_PATH and Path(LOCAL_MODEL_PATH).exists():
    RUN_MODE = "local"
elif LLM_API_KEY:
    RUN_MODE = "openai"
else:
    RUN_MODE = "mock"

print(f"[classroom-ai] 运行模式: {RUN_MODE}")

# 本地模型懒加载
_local_llm = None
def get_local_llm():
    global _local_llm
    if _local_llm is None:
        from llama_cpp import Llama
        _local_llm = Llama(
            model_path=LOCAL_MODEL_PATH,
            n_ctx=4096,
            n_threads=8,
            n_gpu_layers=-1,   # 有 GPU 就全卸
            verbose=False,
        )
    return _local_llm

# OpenAI client 懒加载
_client = None
def get_client():
    global _client
    if RUN_MODE != "openai":
        return None
    if _client is None:
        from openai import OpenAI
        _client = OpenAI(base_url=LLM_BASE_URL, api_key=LLM_API_KEY)
    return _client


# ---------- 对话记忆（内存） ----------
# session_id -> { npc_id -> [ {"role","content"}, ... ] }
SESSIONS: Dict[str, Dict[str, List[dict]]] = {}
HISTORY_LIMIT = 20  # 每个 NPC 保留最近 N 条

def get_history(session_id: str, npc_id: str) -> List[dict]:
    SESSIONS.setdefault(session_id, {})
    return SESSIONS[session_id].setdefault(npc_id, [])

def push_history(session_id: str, npc_id: str, role: str, content: str):
    hist = get_history(session_id, npc_id)
    hist.append({"role": role, "content": content})
    # 只保留最近 HISTORY_LIMIT 条（不含 system）
    if len(hist) > HISTORY_LIMIT:
        del hist[: len(hist) - HISTORY_LIMIT]


# ---------- Mock 回复（没配 API key 时用） ----------
MOCK_LINES = {
    "teacher_wang": [
        "这位同学，你是哪个班的？怎么跑到我们教室来了？",
        "在我的课堂上不要乱跑，站好。",
        "有什么问题下课再说，现在保持安静。",
        "嗯……这个问题嘛，上课认真听就会了。",
    ],
    "li_ming": [
        "我去，你谁啊？新来的？",
        "卧槽你小心点，老王可严了，别在他面前搞事。",
        "嘿嘿，我跟你说，这门课挂科率超高的……",
        "你刚才那一脚帅啊，但估计要被骂了。",
    ],
    "zhang_xue": [
        "同学你好，请问你找哪位？",
        "教室是学习的地方，不要吵。",
        "有问题可以问我，我是班长张雪。",
    ],
    "chen_hao": [
        "哟！新来的？要不要一起打球？",
        "走，下课篮球场见！",
        "别怂，跟哥走。",
    ],
    "lin_qing": [
        "……（推了推眼镜）嗯？",
        "没什么事我继续看书了。",
    ],
    "wang_fang": [
        "你好呀，有什么事吗？",
        "别紧张，我们班挺好的。",
    ],
    "zhao_lei": [
        "嘿哥们，新来的？想不想搞点事？",
        "哎你再去把那黑板擦了，哈哈。",
        "老王不在，怕个毛。",
    ],
    "sun_jie": [
        "啊？你好……我刚在看数学书。",
        "这道题其实用拉格朗日中值定理就能解……",
    ],
    "zhou_min": [
        "哇，你这件衣服好好看，哪买的？",
        "哎你们听说了吗，下周要考试了。",
    ],
    "wu_peng": [
        "……（看了你一眼，没说话）",
        "随便吧。",
    ],
}
_mock_idx = {k: 0 for k in MOCK_LINES}

def mock_reply(npc_id: str) -> str:
    lines = MOCK_LINES.get(npc_id, ["……"])
    i = _mock_idx[npc_id]
    _mock_idx[npc_id] = (i + 1) % len(lines)
    return lines[i]


# ---------- LLM 调用 ----------
def _local_generate(messages: list, max_tokens: int = 120, temperature: float = 0.9) -> str:
    llm = get_local_llm()
    # llama-cpp-python 的 create_chat_completion 接受 messages
    resp = llm.create_chat_completion(
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return resp["choices"][0]["message"]["content"].strip()

def llm_chat(system_prompt: str, history: List[dict], user_text: str) -> str:
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_text})
    try:
        if RUN_MODE == "local":
            return _local_generate(messages, max_tokens=120)
        elif RUN_MODE == "openai":
            client = get_client()
            resp = client.chat.completions.create(
                model=LLM_MODEL, messages=messages, temperature=0.9, max_tokens=120,
            )
            return resp.choices[0].message.content.strip()
        else:
            return mock_reply(_id_from_system(system_prompt))
    except Exception as e:
        return f"[LLM 调用失败: {e}]"

def _id_from_system(system_prompt: str) -> str:
    for nid, p in PERSONAS.items():
        if p["name"] in system_prompt:
            return nid
    return "li_ming"

def llm_event_react(event_desc: str) -> dict:
    """让导演 LLM 决定谁反应、说什么。"""
    try:
        if RUN_MODE in ("local", "openai"):
            messages = [
                {"role": "system", "content": EVENT_ROUTER_PROMPT},
                {"role": "user", "content": f"发生的事：{event_desc}"},
            ]
            if RUN_MODE == "local":
                raw = _local_generate(messages, max_tokens=150, temperature=0.8)
            else:
                client = get_client()
                resp = client.chat.completions.create(
                    model=LLM_MODEL, messages=messages, temperature=0.8, max_tokens=150,
                    response_format={"type": "json_object"},
                )
                raw = resp.choices[0].message.content.strip()
            # 提取 JSON（模型可能加了 markdown 代码块）
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            data = json.loads(raw)
            rid = data.get("responder", "li_ming")
            if rid not in PERSONAS:
                rid = "li_ming"
            return {"responder": rid, "line": data.get("line", "……")}
        else:
            # mock
            import random
            if any(k in event_desc for k in ["踢", "摔", "吵", "乱", "砸", "推", "门", "黑板"]):
                rid = "teacher_wang"
            else:
                rid = random.choice(["li_ming", "zhao_lei", "zhou_min", "chen_hao", "wang_fang"])
            return {"responder": rid, "line": mock_reply(rid)}
    except Exception as e:
        return {"responder": "li_ming", "line": f"[事件反应失败: {e}]"}


# ---------- API ----------
app = FastAPI(title="Classroom AI")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatReq(BaseModel):
    session_id: Optional[str] = None
    npc: str
    text: str

class EventReq(BaseModel):
    session_id: Optional[str] = None
    event: str


@app.post("/api/chat")
def chat(req: ChatReq):
    sid = req.session_id or uuid.uuid4().hex[:12]
    persona = PERSONAS.get(req.npc)
    if not persona:
        return JSONResponse({"error": f"unknown npc: {req.npc}"}, status_code=400)
    hist = get_history(sid, req.npc)
    reply = llm_chat(persona["system_prompt"], hist, req.text)
    push_history(sid, req.npc, "user", req.text)
    push_history(sid, req.npc, "assistant", reply)
    return {"session_id": sid, "npc": req.npc, "name": persona["name"], "reply": reply}


@app.post("/api/event")
def event_react(req: EventReq):
    sid = req.session_id or uuid.uuid4().hex[:12]
    result = llm_event_react(req.event)
    rid = result["responder"]
    persona = PERSONAS.get(rid)
    push_history(sid, rid, "user", f"[场景事件] {req.event}")
    push_history(sid, rid, "assistant", result["line"])
    return {
        "session_id": sid,
        "responder": rid,
        "name": persona["name"] if persona else rid,
        "line": result["line"],
    }


@app.get("/api/state")
def state():
    return {
        "llm_mode": RUN_MODE,
        "model": LLM_MODEL if RUN_MODE == "openai" else (LOCAL_MODEL_PATH or None),
    }


# ---------- 静态前端 ----------
FRONTEND = ROOT / "frontend"
if FRONTEND.exists():
    app.mount("/static", StaticFiles(directory=FRONTEND), name="static")

    @app.get("/")
    def index():
        return FileResponse(FRONTEND / "index.html")


if __name__ == "__main__":
    import uvicorn
    print(f"[classroom-ai] 运行模式: {RUN_MODE}")
    uvicorn.run(app, host="127.0.0.1", port=PORT)
