# Classroom AI — AI 教室

3D 教室里 10 个 AI 角色（1 老师 + 9 学生），全部由本地大语言模型驱动。
没有固定剧情——踢翻椅子、在黑板乱涂、扔东西，每个人会根据性格做出不同反应。

## 快速开始

```powershell
# 1. 安装依赖（已装过可跳过）
pip install -r requirements.txt
pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu

# 2. 确认模型路径（.env 已配好）
# 默认: D:/projects/models/qwen2.5-3b-instruct-q4_k_m.gguf

# 3. 启动
python backend/main.py
```

浏览器打开 **http://127.0.0.1:8000**

## VS Code 打开

```powershell
cd D:\projects\classroom-ai
code .
```

按 **F5** 即可启动后端（已配好 launch.json）。

## 操作

| 键 | 作用 |
|---|---|
| W A S D | 移动 |
| 鼠标 | 转视角（点画面锁定） |
| E | 与准星指向的物体/NPC 交互 |
| 鼠标左键拖拽 | 抓/扔物体（椅子等） |
| T / Enter | 与准星指向的 NPC 对话（galgame 对话框） |
| Esc | 释放鼠标 / 退出对话 |
| M | 静音切换 |

## 10 个角色

| ID | 名字 | 性格 |
|---|---|---|
| teacher_wang | 王老师 | 严肃班主任 |
| li_ming | 李明 | 话痨学生 |
| zhang_xue | 张雪 | 班长 |
| chen_hao | 陈浩 | 体育委员 |
| lin_qing | 林青 | 安静学霸 |
| wang_fang | 王芳 | 温柔文艺委员 |
| zhao_lei | 赵磊 | 调皮鬼 |
| sun_jie | 孙杰 | 数学课代表 |
| zhou_min | 周敏 | 八卦女生 |
| wu_peng | 吴鹏 | 沉默忧郁 |

改性格：编辑 `backend/personas.py`。

## 项目结构

```
classroom-ai/
├── .vscode/              # VS Code 配置
│   ├── launch.json       # F5 启动
│   └── settings.json
├── backend/
│   ├── main.py           # FastAPI + 本地 LLM
│   └── personas.py      # 10 个角色人设
├── frontend/
│   ├── index.html
│   ├── assets/
│   │   └── characters/   # 旧角色资产（当前版本未使用）
│   ├── css/style.css
│   └── js/
│       ├── main.js       # 主循环 + 交互逻辑
│       ├── scene.js       # 教室建模
│       ├── physics.js   # cannon-es 物理
│       ├── player.js     # 第一人称控制
│       ├── npc.js        # 10 个三维 NPC（身体 + 立体五官 + 表情）
│       ├── visual-tour.js # 多位置全景画面巡检
│       ├── dialogue.js    # Galgame 对话框
│       └── audio.js      # 合成钢琴 BGM + 音效
├── .gitignore
├── requirements.txt
└── .env                  # 本地配置（不进 git）
```

## 画面巡检

启动服务后打开 `/?visualTour=1`，相机会沿中央和右侧过道移动，
在两个位置环视，并显示采样画面中的暗帧数。`/?chairCheck=1`
会对准一把椅子，可按 E 验证倾倒、落地及老师的回应。
正常游玩请打开根路径 `/`。

## 技术栈

- 前端: Three.js + cannon-es（物理）
- 后端: FastAPI + llama-cpp-python（本地推理）
- 模型: Qwen2.5-3B-Instruct GGUF（Q4_K_M 量化）
- 无需 GPU（CPU 可跑，有 GPU 自动加速）
