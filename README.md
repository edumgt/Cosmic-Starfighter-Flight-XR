# 🚀 스타파이터 콕핏 XR (Cosmic Starfighter Flight XR)

> **WebXR & Three.js 기반의 1인칭 우주선 콕핏 비행 시뮬레이터 & 전투 아케이드**  
> 우주선 조종석에 직접 탑승하여 양손으로 **조종관(Yoke)**을 잡고, 전방으로 연속해서 펼쳐지는 화성 협곡·사이버 메가시티·크리스탈 성운을 질주하며 적 장애물을 파괴하고 에너지 링을 통과하세요.

---

## 🌟 주요 특징 (Key Features)

### 1. 1인칭 조종석 & 양손 조종관 인터랙션 (Cockpit & Dual-Hand Yoke)
- **정교한 콕핏 프레임**: 캐노피 아치, 홀로그래픽 전방 유리창, 사이버 대시보드 콘솔, 좌측 추진 레버(Throttle Lever).
- **조종관(Flight Yoke) 동기화**: 마우스/키보드 또는 XR 컨트롤러/핸드 트래킹 조작에 따라 짐벌 베이스와 손잡이가 실시간으로 기울어지며(Pitch & Roll), 조종관을 잡고 있는 파일럿 사이버 건틀릿 손 모델이 함께 반응합니다.
- **실시간 홀로그래픽 계기판**: 캔버스 텍스처 기반의 대시보드에 현재 비행속도(KM/H), 고도(Altitude), 쉴드, 부스트 게이지 및 인공 수평선 나침반이 실시간으로 렌더링됩니다.

### 2. 비행 궤적 트레일 잔상 & 워프 스피드라인 (Trail Effect System)
- **양 날개 3D 리본 트레일 (`RibbonTrail`)**: 
  - 양 날개 및 플라즈마 캐논 끝단에서 방출되는 절차적 삼각형 스트립(Triangle Strip) 궤적.
  - 급선회나 상하 기동 시 기체의 비행 궤적을 따라 3차원 공간에 휘감기는 리본 잔상이 실시간으로 남습니다.
  - 전용 셰이더를 통해 헤드에서 테일로 갈수록 자연스럽게 투명해지는 알파 페이드아웃 및 폭 테이퍼링을 지원합니다.
- **초공간 워프 스피드라인 (`WarpSpeedLines`)**:
  - 캐노피 주변을 관통하는 130여 개의 광선 스트릭이 비행 속도(`currentSpeed`)에 비례하여 길게 늘어나며 압도적인 속도감을 선사합니다.
- **하이퍼 부스트 모핑**:
  - 일반 순항(시안 블루 `#00f0ff`) ➔ 부스트 가속 시 강렬한 마젠타 핑크(`#ff00aa`)와 화이트 코어로 색상이 변환되며 트레일 폭이 1.6배 확장됩니다.

### 3. 끊임없이 진화하는 3대 동적 행성 지형 (Dynamic Procedural Biomes)
- **화성 붉은 협곡 (Martian Canyon)**: 거대한 협곡 절벽, 황토색 지면, 공중에 떠 있는 붉은 운석과 바위 장애물.
- **사이버 메가시티 (Cyber Megacity)**: 반투명 네온 고층 빌딩 숲과 안테나 격자망, 사이버네틱 아치.
- **크리스탈 성운 (Crystal Nebula)**: 심우주를 유영하는 신비로운 회전 부유 결정체와 네뷸라 안개.
- **에너지 부스트 링 (Energy Rings)**: 지형 곳곳에 배치된 빛나는 도넛형 링을 통과하면 +250점 획득과 함께 부스트가 즉시 100% 충전됩니다.

### 4. 전투 및 아케이드 시스템
- **트윈 플라즈마 캐논 (Twin Plasma Cannons)**: 양 날개 포구에서 발사되는 고속 레이저 볼트로 전방 바위와 구조물을 격추(+100점).
- **충돌 방어막 & 긴급 수리**: 장애물 충돌 시 콕핏 진동 및 스파크 폭발 FX 발생, 쉴드 고갈 시 충돌 판정.
- **절차적 Web Audio 사운드 신시사이저**: 외부 음원 파일 없이 오디오 컨텍스트로 생성되는 엔진 험 사운드, 레이저 발사음, 부스트 폭음, 링 획득 아르페지오, 폭발음 지원.

---

## 🎮 조작 방법 (Controls)

| 동작 | PC 키보드 & 마우스 | WebXR (Galaxy XR / Meta Quest / AURA) |
| :--- | :--- | :--- |
| **선회 (Roll / 뱅킹)** | 마우스 좌우 이동 / `A`, `D` / `←`, `→` | 컨트롤러/핸드를 잡고 좌우로 회전 기울이기 |
| **상하 (Pitch / 피치)** | 마우스 상하 이동 / `W`, `S` / `↑`, `↓` | 컨트롤러/핸드를 앞뒤로 밀거나 당기기 |
| **플라즈마 캐논 발사** | 마우스 좌클릭 또는 `Space` 키 | 컨트롤러 인덱스 트리거(Trigger) 당기기 |
| **순간 하이퍼 부스트** | 키보드 `[1]` 키 | 가속 버튼 또는 링 통과 |
| **쉴드 긴급 수리** | 키보드 `[2]` 키 | 쉴드 버튼 터치 |
| **순항 / 가속 토글** | 키보드 `[3]` 키 또는 `Shift` 키 | 콕핏 대시보드 버튼 터치 |

---

## 🛠️ 기술 스택 (Tech Stack)

- **Engine & Graphics**: [Three.js](https://threejs.org/) (v0.186.0)
- **Spatial XR Framework**: [XR Blocks](https://github.com/google/xrblocks) (v0.24.0)
- **Language**: TypeScript (ES2024 / Bundler)
- **Build Tool**: Vite (v8)
- **Audio**: Web Audio API Procedural Synthesizer (Zero External Audio Assets)
- **UI & HUD**: XR Blocks Spatial UI (`UICard`, `UIButton`, `UIPanel`) + Responsive Tailwind/CSS DOM Overlay

---

## 📂 프로젝트 구조 (Project Structure)

```
├── /index.html                 # 메인 HTML 엔트리 및 조종석 2D HUD / 튜토리얼 모달
├── /package.json               # 프로젝트 의존성 설정
├── /tsconfig.json              # TypeScript 컴파일러 설정
├── /metadata.json              # AI Studio 앱렛 메타데이터
├── /src/
│   ├── index.ts                # 메인 게임 루프, 조향 제어, 충돌 및 상태 관리
│   ├── index.css               # HUD 스타일링, 글래스모피즘, 반응형 레이아웃
│   ├── audio/
│   │   └── SoundSynthesizer.ts # 절차적 Web Audio 신시사이저 (엔진, 레이저, 부스트 등)
│   ├── effects/
│   │   └── FlightTrailSystem.ts# 비행 궤적 리본 잔상 및 워프 스피드라인 시스템
│   ├── game/
│   │   └── TerrainManager.ts   # 동적 스트리밍 행성 지형 (협곡, 메가시티, 성운) & 링
│   ├── models/
│   │   ├── CockpitModel.ts     # 1인칭 조종석, 조종관, 파일럿 건틀릿 손, HUD 캔버스
│   │   └── ProceduralAssets.ts # 장애물, 바위, 파티클 풀(FX Pool)
│   └── ui/
│       └── SpatialUI.ts        # 3D 공간 UI 카드 (시작, 게임오버, 상태판)
└── /README.md                  # 프로젝트 안내서
```

---

## 🚀 로컬 실행 방법 (Getting Started)

1. **의존성 설치**:
   ```bash
   npm install
   ```

2. **개발 서버 실행**:
   ```bash
   npm run dev
   ```
   브라우저에서 `http://localhost:3000` 접속 후 데스크톱 시뮬레이터 또는 XR 기기로 진입합니다.

3. **프로덕션 빌드**:
   ```bash
   npm run build
   ```
