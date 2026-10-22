// Africa Travel Planner - Toss Design System Logic

let state = {
  meta: {
    title: '아프리카 여행 메모',
    target: '케냐 & 탄자니아',
    period: '2027년 상반기 (미확정)',
    budget: '1인 500만원 선'
  },
  questions: [],
  ideas: [],
  days: [],
  checklist: []
};

let ws = null;
let currentView = 'view-qa';

// ========================================================
// 공통 헬퍼: 자동 높이 조절 텍스트박스 (포커스 유지 보장)
// ========================================================
let lastActiveInputId = null;

function bindAutoResizeTextarea(el, defaultHeight, onSubmit) {
  if (!el) return;

  const resize = () => {
    el.style.height = defaultHeight + 'px';
    if (el.scrollHeight > defaultHeight) {
      el.style.height = el.scrollHeight + 'px';
    }
  };

  el.addEventListener('focus', () => {
    lastActiveInputId = el.id;
  });

  el.addEventListener('input', resize);

  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // 줄바꿈 허용 및 높이 확장
        setTimeout(resize, 0);
        return;
      }
      // Enter 단독: 제출
      e.preventDefault();
      const val = el.value.trim();
      if (!val) return;

      const targetId = el.id;
      onSubmit(val);
      el.value = '';
      el.style.height = defaultHeight + 'px';

      // 엔터 후 계속 같은 텍스트 박스에 포커스 유지
      setTimeout(() => {
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          targetEl.focus();
        }
      }, 50);
    }
  });
}

// 토스 탭 네비게이션
document.querySelectorAll('.toss-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.toss-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.toss-view').forEach(v => v.classList.remove('active'));

    tab.classList.add('active');
    currentView = tab.dataset.view;
    const targetView = document.getElementById(currentView);
    if (targetView) targetView.classList.add('active');
  });
});

// 작성자 관리
const userSelect = document.getElementById('currentUserSelect');
const customUserInput = document.getElementById('customUser');

function getCurrentUser() {
  const sel = userSelect.value;
  if (sel === '나') {
    return customUserInput.value.trim() || '나';
  }
  return sel;
}

userSelect.addEventListener('change', () => {
  if (userSelect.value === '나') {
    customUserInput.style.display = 'inline-block';
    customUserInput.focus();
  } else {
    customUserInput.style.display = 'none';
  }
  localStorage.setItem('toss_user', userSelect.value);
});

customUserInput.addEventListener('input', () => {
  localStorage.setItem('toss_custom_user', customUserInput.value);
});

const savedUser = localStorage.getItem('toss_user');
if (savedUser) {
  userSelect.value = savedUser;
  if (savedUser === '나') {
    customUserInput.style.display = 'inline-block';
    customUserInput.value = localStorage.getItem('toss_custom_user') || '';
  }
}

// WebSocket 연결
function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    updateSyncStatus('저장됨', '#2ed573');
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'INIT_STATE' || msg.type === 'SYNC_STATE') {
        const incoming = msg.state;
        state.meta = incoming.meta || state.meta;
        state.questions = incoming.questions || [];
        state.ideas = incoming.ideas || [];
        state.scrapbook = incoming.scrapbook || null;
        state.scrapboards = incoming.scrapboards || state.scrapboards || null;
        
        if (incoming.itinerary && incoming.itinerary.days) {
          state.days = incoming.itinerary.days;
        } else if (incoming.days) {
          state.days = incoming.days;
        }

        if (Array.isArray(incoming.checklist)) {
          if (incoming.checklist.length > 0 && incoming.checklist[0].category) {
            const flat = [];
            incoming.checklist.forEach(cat => {
              (cat.items || []).forEach(it => {
                flat.push({
                  id: it.id,
                  text: it.text,
                  assignee: it.assignee,
                  done: it.done
                });
              });
            });
            state.checklist = flat;
          } else {
            state.checklist = incoming.checklist;
          }
        }

        renderAll();
        updateSyncStatus('저장됨', '#2ed573');
      } else if (msg.type === 'CLIENTS_COUNT') {
        document.getElementById('clientCount').textContent = `${msg.count}명`;
      }
    } catch (e) {
      console.error('Error handling message', e);
    }
  };

  ws.onclose = () => {
    updateSyncStatus('재연결 중', '#e74c3c');
    setTimeout(initWebSocket, 2000);
  };
}

function updateSyncStatus(text, color) {
  const statusEl = document.getElementById('syncStatus');
  const dot = document.querySelector('.live-indicator');
  if (statusEl) statusEl.textContent = text;
  if (dot) dot.style.backgroundColor = color;
}

function syncState() {
  updateSyncStatus('저장 중', '#3182f6');
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'UPDATE_STATE',
      state: {
        meta: state.meta,
        questions: state.questions,
        ideas: state.ideas,
        scrapbook: state.scrapbook,
        scrapboards: state.scrapboards,
        days: state.days,
        checklist: state.checklist
      }
    }));
  }
  renderAll();
  setTimeout(() => {
    updateSyncStatus('저장됨', '#2ed573');
  }, 200);
}

// ----------------------------------------------------
// 1. Meta 바인딩
// ----------------------------------------------------
const metaTitle = document.getElementById('metaTitle');
const metaTarget = document.getElementById('metaTarget');
const metaPeriod = document.getElementById('metaPeriod');
const metaBudget = document.getElementById('metaBudget');

[metaTitle, metaTarget, metaPeriod, metaBudget].forEach(input => {
  input.addEventListener('change', () => {
    state.meta.title = metaTitle.value.trim();
    state.meta.target = metaTarget.value.trim();
    state.meta.period = metaPeriod.value.trim();
    state.meta.budget = metaBudget.value.trim();
    syncState();
  });
});

function renderMeta() {
  if (document.activeElement !== metaTitle) metaTitle.value = state.meta.title || '';
  if (document.activeElement !== metaTarget) metaTarget.value = state.meta.target || '';
  if (document.activeElement !== metaPeriod) metaPeriod.value = state.meta.period || '';
  if (document.activeElement !== metaBudget) metaBudget.value = state.meta.budget || '';
}

// ----------------------------------------------------
// 배지 카운트 업데이트
// ----------------------------------------------------
function updateBadges() {
  const openQ = state.questions.filter(q => q.status !== 'resolved').length;
  document.getElementById('badgeQa').textContent = openQ > 0 ? `${openQ}` : `${state.questions.length}`;
  document.getElementById('badgeIdeas').textContent = state.ideas.length;
  document.getElementById('badgeDays').textContent = `${state.days.length}일`;

  const totalCheck = state.checklist.length;
  const doneCheck = state.checklist.filter(c => c.done).length;
  document.getElementById('badgeCheck').textContent = `${doneCheck}/${totalCheck}`;
}

// ----------------------------------------------------
// 2. 질문과 결정 (Q&A)
// ----------------------------------------------------
const inputNewQuestion = document.getElementById('inputNewQuestion');
bindAutoResizeTextarea(inputNewQuestion, 52, (text) => {
  state.questions.unshift({
    id: 'q-' + Date.now(),
    question: text,
    author: getCurrentUser(),
    status: 'open',
    answers: []
  });
  syncState();
});

function renderQuestions() {
  const container = document.getElementById('qaFeed');
  container.innerHTML = '';

  if (state.questions.length === 0) {
    container.innerHTML = `<div class="toss-empty">등록된 질문이 없습니다. 궁금한 점을 적어보세요.</div>`;
    return;
  }

  state.questions.forEach(q => {
    const row = document.createElement('div');
    const isResolved = q.status === 'resolved';
    row.className = `toss-qa-row ${isResolved ? 'resolved' : ''}`;

    let repliesHtml = '';
    (q.answers || []).forEach(ans => {
      repliesHtml += `
        <div class="toss-reply-item">
          <span class="toss-reply-author">${escapeHtml(ans.author)}</span>
          <span class="toss-reply-text editable-text" title="클릭하여 수정" onclick="startInlineEdit(this, 'answer', '${q.id}', '${ans.id}')">${escapeHtml(ans.text)}</span>
        </div>
      `;
    });

    row.innerHTML = `
      <div class="toss-qa-header">
        <span class="toss-qa-title editable-text" title="클릭하여 수정" onclick="startInlineEdit(this, 'question', '${q.id}')">${escapeHtml(q.question)}</span>
        <div class="toss-qa-ctrls">
          <button class="btn-resolve-text ${isResolved ? 'done' : ''}" onclick="toggleResolveQuestion('${q.id}')">
            ${isResolved ? '해결됨' : '미해결'}
          </button>
          <button class="btn-row-del" onclick="deleteQuestion('${q.id}')">✕</button>
        </div>
      </div>

      ${repliesHtml ? `<div class="toss-replies-stream">${repliesHtml}</div>` : ''}

      <div class="toss-inline-reply">
        <textarea placeholder="답변 남기기 (Shift+Enter: 줄바꿈, Enter: 등록)" rows="1" id="reply-input-${q.id}"></textarea>
      </div>
    `;

    container.appendChild(row);

    // 각 질문의 답변 입력창에 자동 확장 바인딩
    const replyInput = row.querySelector(`#reply-input-${q.id}`);
    bindAutoResizeTextarea(replyInput, 42, (text) => {
      if (!q.answers) q.answers = [];
      q.answers.push({
        id: 'a-' + Date.now(),
        author: getCurrentUser(),
        text: text
      });
      syncState();
    });
  });
}

function toggleResolveQuestion(id) {
  const q = state.questions.find(item => item.id === id);
  if (q) {
    q.status = q.status === 'resolved' ? 'open' : 'resolved';
    syncState();
  }
}

function deleteQuestion(id) {
  state.questions = state.questions.filter(q => q.id !== id);
  syncState();
}

// ----------------------------------------------------
// 3. 가고 싶은 곳: 다중 메모장 (추가/삭제, 2/3 높이 자동확장, 이미지 크기/위치 조절)
// ----------------------------------------------------
let activeImage = null;
let imgToolbar = null;

function getScrapboards() {
  if (Array.isArray(state.scrapboards) && state.scrapboards.length > 0) {
    return state.scrapboards;
  }
  // 구버전 state.scrapbook 호환
  if (state.scrapbook) {
    state.scrapboards = [
      { id: 'sb-1', title: state.scrapbook.col1Title || '사파리 & 국립공원', html: state.scrapbook.col1Html || '' },
      { id: 'sb-2', title: state.scrapbook.col2Title || '휴양지 & 숙소/맛집', html: state.scrapbook.col2Html || '' }
    ];
    return state.scrapboards;
  }
  state.scrapboards = [
    {
      id: 'sb-1',
      title: '사파리 & 국립공원',
      html: '• 마사이마라 3박 4일 지프 사파리 (빅5 관측)\n• 세렝게티 열기구 투어 알아보기\n• 참고 링크: https://en.wikipedia.org/wiki/Maasai_Mara'
    },
    {
      id: 'sb-2',
      title: '휴양지 & 숙소/맛집',
      html: '• 잔지바르 섬 능귀 비치 2박 휴양\n• 더 락(The Rock) 레스토랑 선셋 예약'
    }
  ];
  return state.scrapboards;
}

function addNewScrapCard() {
  const boards = getScrapboards();
  const newNum = boards.length + 1;
  boards.push({
    id: 'sb-' + Date.now(),
    title: `메모장 ${newNum}`,
    html: ''
  });
  syncState();
}

function deleteScrapCard(id) {
  if (state.scrapboards.length <= 1) {
    alert('최소 1개의 메모장은 유지되어야 합니다.');
    return;
  }
  state.scrapboards = state.scrapboards.filter(b => b.id !== id);
  hideImageToolbar();
  syncState();
}

function renderScrapbook() {
  const container = document.getElementById('scrapbookContainer');
  if (!container) return;

  const boards = getScrapboards();
  document.getElementById('badgeIdeas').textContent = `${boards.length}개`;

  // 이미 렌더링되어 있다면 DOM을 파괴하지 않고 포커스를 유지한 채 업데이트
  const existingCards = container.querySelectorAll('.scrap-card');
  const isSameStructure = existingCards.length === boards.length &&
    Array.from(existingCards).every((card, idx) => {
      const editor = card.querySelector('.scrap-col-editor');
      return editor && editor.id === `editor-${boards[idx].id}`;
    });

  if (isSameStructure) {
    boards.forEach(board => {
      const editorEl = document.getElementById(`editor-${board.id}`);
      if (editorEl) {
        const titleInput = editorEl.closest('.scrap-card').querySelector('.scrap-col-title');
        if (titleInput && document.activeElement !== titleInput) {
          titleInput.value = board.title || '';
        }
        // 현재 내가 작성/편집 중인 에디터는 덮어쓰지 않음
        if (document.activeElement !== editorEl && !editorEl.contains(document.activeElement)) {
          if (editorEl.innerHTML !== (board.html || '')) {
            editorEl.innerHTML = board.html || '';
          }
        }
      }
    });
    return;
  }

  // 카드 추가/삭제 등 구조가 변경되었을 때만 재생성
  container.innerHTML = '';

  boards.forEach(board => {
    const card = document.createElement('div');
    card.className = 'scrap-card';

    card.innerHTML = `
      <div class="scrap-card-head">
        <input type="text" class="scrap-col-title" value="${escapeHtml(board.title || '')}" placeholder="메모장 제목 입력" onchange="updateScrapTitle('${board.id}', this.value)" />
        <button class="btn-card-del" title="메모장 삭제" onclick="deleteScrapCard('${board.id}')">✕</button>
      </div>
      <div class="scrap-col-editor" id="editor-${board.id}" contenteditable="true" data-placeholder="자유롭게 메모를 적거나 이미지를 붙여넣으세요">${board.html || ''}</div>
    `;

    container.appendChild(card);

    const editorEl = card.querySelector(`#editor-${board.id}`);
    setupScrapEditor(editorEl, board.id);
  });
}

function updateScrapTitle(id, newTitle) {
  const b = state.scrapboards.find(item => item.id === id);
  if (b) {
    b.title = newTitle.trim();
    syncState();
  }
}

function setupScrapEditor(editorEl, boardId) {
  if (!editorEl) return;

  // Enter 키 입력 시 어떤 제출 동작 없이 순수 줄바꿈만 수행
  editorEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.stopPropagation();
      // 일반 Enter 키로 자연스러운 줄바꿈 처리
    }
  });

  // 클립보드 이미지 붙여넣기 (Ctrl+V)
  editorEl.addEventListener('paste', (e) => {
    const items = (e.clipboardData || window.clipboardData).items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        const reader = new FileReader();
        reader.onload = function(evt) {
          const img = new Image();
          img.onload = function() {
            const canvas = document.createElement('canvas');
            let w = img.width;
            let h = img.height;
            const maxW = 1000;
            if (w > maxW) {
              h = Math.round((h * maxW) / w);
              w = maxW;
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

            document.execCommand('insertImage', false, dataUrl);
            saveScrapCardContent(boardId, editorEl.innerHTML);
          };
          img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
        return;
      }
    }
  });

  // 텍스트/내용 변경 감지
  editorEl.addEventListener('input', () => {
    saveScrapCardContent(boardId, editorEl.innerHTML);
  });

  // 이미지 클릭 시 크기/위치 조절 툴바 띄우기
  editorEl.addEventListener('click', (e) => {
    if (e.target && e.target.tagName === 'IMG') {
      showImageToolbar(e.target, boardId, editorEl);
    } else {
      hideImageToolbar();
    }
  });
}

let scrapSaveTimeout = null;
function saveScrapCardContent(boardId, html) {
  clearTimeout(scrapSaveTimeout);
  scrapSaveTimeout = setTimeout(() => {
    const b = state.scrapboards.find(item => item.id === boardId);
    if (b) {
      b.html = html;
      syncState();
    }
  }, 250);
}

// ----------------------------------------------------
// 이미지 크기 및 위치 조절 툴바
// ----------------------------------------------------
function showImageToolbar(img, boardId, editorEl) {
  hideImageToolbar();
  activeImage = img;
  img.classList.add('selected-img');
  img.setAttribute('draggable', 'true');

  const rect = img.getBoundingClientRect();
  imgToolbar = document.createElement('div');
  imgToolbar.className = 'img-float-toolbar';
  imgToolbar.innerHTML = `
    <span>크기:</span>
    <button onclick="setImageWidth('33%')">작게</button>
    <button onclick="setImageWidth('60%')">중간</button>
    <button onclick="setImageWidth('100%')">크게</button>
    <span class="tb-sep"></span>
    <span>위치:</span>
    <button onclick="setImageAlign('align-left')">왼쪽</button>
    <button onclick="setImageAlign('align-center')">가운데</button>
    <button onclick="setImageAlign('align-right')">오른쪽</button>
    <span class="tb-sep"></span>
    <button style="color:#ff6b6b;" onclick="removeActiveImage('${boardId}')">삭제</button>
  `;

  document.body.appendChild(imgToolbar);

  const top = window.scrollY + rect.top - 44;
  const left = window.scrollX + Math.max(10, rect.left);
  imgToolbar.style.top = `${top}px`;
  imgToolbar.style.left = `${left}px`;
}

function hideImageToolbar() {
  if (imgToolbar) {
    imgToolbar.remove();
    imgToolbar = null;
  }
  if (activeImage) {
    activeImage.classList.remove('selected-img');
    activeImage = null;
  }
}

function setImageWidth(widthStr) {
  if (activeImage) {
    activeImage.style.width = widthStr;
    hideImageToolbar();
    saveAllScrapEditors();
  }
}

function setImageAlign(alignClass) {
  if (activeImage) {
    activeImage.classList.remove('align-left', 'align-center', 'align-right');
    activeImage.classList.add(alignClass);
    hideImageToolbar();
    saveAllScrapEditors();
  }
}

function removeActiveImage(boardId) {
  if (activeImage) {
    const parentEditor = activeImage.closest('.scrap-col-editor');
    activeImage.remove();
    hideImageToolbar();
    if (parentEditor) {
      saveScrapCardContent(boardId, parentEditor.innerHTML);
    }
  }
}

function saveAllScrapEditors() {
  const boards = getScrapboards();
  boards.forEach(b => {
    const editor = document.getElementById(`editor-${b.id}`);
    if (editor) {
      b.html = editor.innerHTML;
    }
  });
  syncState();
}

window.addEventListener('scroll', () => {
  if (imgToolbar) hideImageToolbar();
});


// ----------------------------------------------------
// 4. 일정 계획 (Days)
// ----------------------------------------------------
function renderDays() {
  const container = document.getElementById('daysContainer');
  container.innerHTML = '';

  if (state.days.length === 0) {
    container.innerHTML = `<div class="toss-empty">등록된 일차가 없습니다. '+ Day 추가'를 눌러 시작하세요.</div>`;
    return;
  }

  state.days.forEach(d => {
    const group = document.createElement('div');
    group.className = 'toss-day-group';

    let itemsHtml = '';
    (d.items || []).forEach(it => {
      itemsHtml += `
        <div class="toss-day-entry">
          <span class="toss-entry-dot">•</span>
          <span class="toss-entry-text editable-text" title="클릭하여 수정" onclick="startInlineEdit(this, 'dayItem', ${d.day}, '${it.id}')">${escapeHtml(it.text)}</span>
          <button class="btn-row-del" onclick="deleteDayItem(${d.day}, '${it.id}')">✕</button>
        </div>
      `;
    });

    group.innerHTML = `
      <div class="toss-day-title-row">
        <span class="toss-day-badge">Day ${d.day}</span>
        <input type="text" class="toss-day-title-input" value="${escapeHtml(d.title || '')}" placeholder="일차 주제 입력" onchange="updateDayTitle(${d.day}, this.value)" />
        <button class="btn-row-del" onclick="deleteDay(${d.day})">Day 삭제</button>
      </div>

      <div class="toss-day-entries">
        ${itemsHtml}
      </div>

      <div>
        <textarea class="toss-day-subinput" rows="1" placeholder="새 일정 입력 (Shift+Enter: 줄바꿈, Enter: 등록)" id="day-input-${d.day}"></textarea>
      </div>
    `;

    container.appendChild(group);

    // 일정 세부 입력창에 자동 확장 바인딩
    const dayInput = group.querySelector(`#day-input-${d.day}`);
    bindAutoResizeTextarea(dayInput, 42, (text) => {
      if (!d.items) d.items = [];
      d.items.push({
        id: 'di-' + Date.now(),
        text: text
      });
      syncState();
    });
  });
}

function addDayBlock() {
  const nextNum = state.days.length + 1;
  state.days.push({
    day: nextNum,
    title: `Day ${nextNum} 일정`,
    items: []
  });
  syncState();
}

function updateDayTitle(dayNum, title) {
  const d = state.days.find(item => item.day === dayNum);
  if (d) {
    d.title = title.trim();
    syncState();
  }
}

function deleteDayItem(dayNum, itemId) {
  const d = state.days.find(item => item.day === dayNum);
  if (d) {
    d.items = d.items.filter(i => i.id !== itemId);
    syncState();
  }
}

function deleteDay(dayNum) {
  state.days = state.days.filter(d => d.day !== dayNum);
  state.days.forEach((d, idx) => {
    d.day = idx + 1;
  });
  syncState();
}

// ----------------------------------------------------
// 5. 필수 준비물
// ----------------------------------------------------
const inputNewCheckItem = document.getElementById('inputNewCheckItem');
bindAutoResizeTextarea(inputNewCheckItem, 52, (text) => {
  state.checklist.push({
    id: 'chk-' + Date.now(),
    text: text,
    assignee: getCurrentUser(),
    done: false
  });
  syncState();
});

function renderChecklist() {
  const container = document.getElementById('checklistFeed');
  container.innerHTML = '';

  if (state.checklist.length === 0) {
    container.innerHTML = `<div class="toss-empty">등록된 준비물이 없습니다.</div>`;
    return;
  }

  state.checklist.forEach(chk => {
    const row = document.createElement('div');
    row.className = `toss-check-row ${chk.done ? 'done' : ''}`;

    row.innerHTML = `
      <input type="checkbox" ${chk.done ? 'checked' : ''} onchange="toggleCheckItem('${chk.id}')" />
      <span class="toss-check-text editable-text" title="클릭하여 수정" onclick="startInlineEdit(this, 'checklist', '${chk.id}')">${escapeHtml(chk.text)}</span>
      <span class="toss-assignee">${escapeHtml(chk.assignee || '전원')}</span>
      <button class="btn-row-del" onclick="deleteCheckItem('${chk.id}')">✕</button>
    `;

    container.appendChild(row);
  });
}

function toggleCheckItem(id) {
  const item = state.checklist.find(i => i.id === id);
  if (item) {
    item.done = !item.done;
    syncState();
  }
}

function deleteCheckItem(id) {
  state.checklist = state.checklist.filter(i => i.id !== id);
  syncState();
}

// ----------------------------------------------------
// 6. 클릭 인라인 수정 (그대로 있는 상태에서 바로 수정)
// ----------------------------------------------------
function startInlineEdit(element, type, idOrDay, subId) {
  if (element.isContentEditable) return;

  const originalText = element.innerText.trim();
  element.contentEditable = "true";
  element.focus();

  // 커서를 글자 맨 끝으로 이동
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  let isSaved = false;
  const finishEdit = () => {
    if (isSaved) return;
    isSaved = true;
    element.contentEditable = "false";

    const newText = element.innerText.trim();
    if (!newText) {
      element.innerText = originalText;
      return;
    }

    if (type === 'question') {
      const q = state.questions.find(item => item.id === idOrDay);
      if (q) q.question = newText;
    } else if (type === 'answer') {
      const q = state.questions.find(item => item.id === idOrDay);
      if (q) {
        const a = q.answers.find(ans => ans.id === subId);
        if (a) a.text = newText;
      }
    } else if (type === 'idea') {
      const it = state.ideas.find(item => item.id === idOrDay);
      if (it) it.text = newText;
    } else if (type === 'dayItem') {
      const d = state.days.find(item => item.day === idOrDay);
      if (d) {
        const it = d.items.find(i => i.id === subId);
        if (it) it.text = newText;
      }
    } else if (type === 'checklist') {
      const c = state.checklist.find(item => item.id === idOrDay);
      if (c) c.text = newText;
    }

    syncState();
  };

  element.onblur = finishEdit;
  element.onkeydown = (e) => {
    if (e.key === 'Enter') {
      // 모든 인라인 수정에서 Shift+Enter는 줄바꿈 허용!
      if (e.shiftKey) {
        return;
      }
      // Enter 단독은 저장
      e.preventDefault();
      element.blur();
    } else if (e.key === 'Escape') {
      isSaved = true;
      element.contentEditable = "false";
      element.innerText = originalText;
    }
  };
}

// ----------------------------------------------------
// 공통 렌더링
// ----------------------------------------------------
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderAll() {
  renderMeta();
  renderQuestions();
  renderScrapbook();
  renderDays();
  renderChecklist();
  updateBadges();
}

initWebSocket();
