const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// 초기 기본 데이터 구조
const defaultData = {
  meta: {
    title: '아프리카 여행 기획',
    target: '케냐 & 탄자니아 (사파리 + 휴양)',
    period: '2027년 상반기 예정 (미확정)',
    budget: '1인 450만~550만원 선'
  },
  ideas: [
    {
      id: 'idea-1',
      author: '준호',
      title: '마사이마라 국립공원 사파리 투어',
      content: '빅5(사자, 표범, 코끼리, 코뿔소, 버팔로) 관측. 3박 4일 지프 투어 알아보기.',
      link: 'https://en.wikipedia.org/wiki/Maasai_Mara',
      likes: 2,
      createdAt: '2026-10-15'
    },
    {
      id: 'idea-2',
      author: '민지',
      title: '잔지바르 섬 능귀 비치 휴양',
      content: '사파리 후 인도양 에메랄드 바다에서 2~3일 휴식 & 스노클링.',
      link: '',
      likes: 1,
      createdAt: '2026-10-15'
    }
  ],
  questions: [
    {
      id: 'q-1',
      author: '동현',
      question: '황열병 예방접종은 언제까지 맞아야 하나요?',
      status: 'resolved',
      resolvedAction: '체크리스트 등록됨: 황열병 백신 접종 (출발 10일 전 완료)',
      answers: [
        {
          id: 'a-1',
          author: '민지',
          text: '국립중앙의료원 공지 기준 입국 최소 10일 전에 맞아야 옐로카드가 유효합니다.',
          createdAt: '2026-10-15'
        }
      ],
      createdAt: '2026-10-15'
    },
    {
      id: 'q-2',
      author: '준호',
      question: '달러 환전 시 주의할 점이 있나요?',
      status: 'open',
      resolvedAction: null,
      answers: [
        {
          id: 'a-2',
          author: '동현',
          text: '2013년 이후 발행된 빳빳한 신권만 받습니다. 훼손된 지폐는 현지 환전소나 투어사에서 거절당합니다.',
          createdAt: '2026-10-15'
        }
      ],
      createdAt: '2026-10-15'
    }
  ],
  itinerary: {
    unassigned: [
      { id: 'item-u1', title: '빅토리아 폭포 헬기 투어', memo: '짐바브웨 경유 여부에 따라 결정' },
      { id: 'item-u2', title: '세렝게티 열기구 일출 투어', memo: '인당 약 500달러 추가 비용 확인 필요' }
    ],
    days: [
      {
        day: 1,
        title: '나이로비 입국 & 가이드 미팅',
        items: [
          { id: 'item-101', text: '나이로비 조모 케냐타 국제공항 도착' },
          { id: 'item-102', text: '현지 유심 개통 및 사파리 투어사 픽업 차량 탑승' },
          { id: 'item-103', text: '나이로비 시내 호텔 체크인 & 휴식' }
        ]
      },
      {
        day: 2,
        title: '마사이마라 이동 & 첫 게임드라이브',
        items: [
          { id: 'item-201', text: '전용 4x4 사파리 차량으로 마사이마라 이동 (약 5~6시간)' },
          { id: 'item-202', text: '롯지 체크인 및 점심 식사' },
          { id: 'item-203', text: '오후 사파리 게임드라이브 (일몰 감상)' }
        ]
      },
      {
        day: 3,
        title: '마사이마라 종일 사파리 투어',
        items: [
          { id: 'item-301', text: '초원 도시락 지참 후 종일 게임드라이브' },
          { id: 'item-302', text: '마라 강 누우 떼 도강 지점 관측' }
        ]
      }
    ]
  },
  checklist: [
    {
      category: '의료 및 안전',
      items: [
        { id: 'chk-1', text: '황열병 백신 접종 및 옐로카드 발급 (출발 10일 전 필수)', assignee: '전원', done: false },
        { id: 'chk-2', text: '말라리아 예방약(말라론) 처방 및 복용 일정 확인', assignee: '전원', done: false },
        { id: 'chk-3', text: '상비약 준비 (지사제, 소화제, 모기기피제 Deet 고함량)', assignee: '민지', done: false }
      ]
    },
    {
      category: '서류 및 행정',
      items: [
        { id: 'chk-4', text: '여권 유효기간 6개월 이상 확인 및 사본 준비', assignee: '전원', done: true },
        { id: 'chk-5', text: '케냐 전자여행허가(eTA) 신청', assignee: '준호', done: false },
        { id: 'chk-6', text: '해외여행자보험 가입 (의료 이송 특약 포함)', assignee: '동현', done: false }
      ]
    },
    {
      category: '환전 및 결제',
      items: [
        { id: 'chk-7', text: '미국 달러(USD) 2013년 이후 신권 100달러 위주 환전', assignee: '동현', done: false },
        { id: 'chk-8', text: '팁용 1달러/5달러 소액권 40장 준비', assignee: '전원', done: false }
      ]
    },
    {
      category: '사파리 장비 및 소지품',
      items: [
        { id: 'chk-9', text: '사파리용 고배율 쌍안경 (8x42 또는 10x42)', assignee: '준호', done: false },
        { id: 'chk-10', text: '먼지 차단용 버프 / 마스크 / 챙 넓은 모자', assignee: '전원', done: false },
        { id: 'chk-11', text: '멀티 어댑터 (케냐: G타입 영국의 3핀 플러그)', assignee: '민지', done: false }
      ]
    }
  ]
};

// 파일에서 데이터 불러오기
let state = defaultData;
if (fs.existsSync(DATA_FILE)) {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    state = JSON.parse(raw);
  } catch (e) {
    console.error('Error loading data.json, using defaultData', e);
  }
} else {
  fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
}

// 자동 저장 디바운스
let saveTimeout = null;
function saveState() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    fs.writeFile(DATA_FILE, JSON.stringify(state, null, 2), (err) => {
      if (err) console.error('Failed to save data.json', err);
    });
  }, 200);
}

// 정적 파일 서빙 MIME 타입
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';

  const filePath = path.join(PUBLIC_DIR, reqPath);

  // API 엔드포인트: 상태 다운로드
  if (reqPath === '/api/state' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(state));
    return;
  }

  // 정적 파일 처리
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

// WebSocket 서버 설정
const wss = new WebSocket.Server({ server });
let clientCounter = 0;

function broadcast(msg, senderWs = null) {
  const payload = JSON.stringify(msg);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client !== senderWs) {
      client.send(payload);
    }
  });
}

function broadcastAll(msg) {
  const payload = JSON.stringify(msg);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

wss.on('connection', (ws) => {
  clientCounter++;
  const clientId = 'user-' + clientCounter;

  // 접속자 수 업데이트
  broadcastAll({
    type: 'CLIENTS_COUNT',
    count: wss.clients.size
  });

  // 초기 상태 전송
  ws.send(JSON.stringify({
    type: 'INIT_STATE',
    state: state,
    clientId: clientId
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'UPDATE_STATE') {
        state = data.state;
        saveState();
        broadcast({
          type: 'SYNC_STATE',
          state: state,
          senderId: clientId
        }, ws);
      } else if (data.type === 'CURSOR_ACTIVITY') {
        broadcast({
          type: 'REMOTE_CURSOR',
          user: data.user,
          activeField: data.activeField
        }, ws);
      }
    } catch (e) {
      console.error('Invalid message format', e);
    }
  });

  ws.on('close', () => {
    broadcastAll({
      type: 'CLIENTS_COUNT',
      count: wss.clients.size
    });
  });
});

server.listen(PORT, () => {
  console.log(`Africa Travel Planner server running at http://localhost:${PORT}`);
});
