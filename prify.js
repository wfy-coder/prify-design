/* ================= 工具 ================= */
const $ = s => document.querySelector(s) || document.createElement('div');
const $$ = s => [...document.querySelectorAll(s)];
const root = document.documentElement;

/* ================= 启动流程（防闪主题色的第二道保险） =================
   主题属性已在 <head> 内联脚本中于首帧之前写入 <html>，
   这里再用不透明启动画面盖住首屏，直到一切就绪才淡出并触发入场动画。 */
(() => {
  const bar = $('#pageLoader i');
  let p = 0;
  const t = setInterval(() => { p = Math.min(92, p + Math.random() * 22); bar.style.width = p + '%'; }, 120);
  const t0 = performance.now(), BOOT_MIN = 950;
  function finish() {
    clearInterval(t);
    const wait = Math.max(0, BOOT_MIN - (performance.now() - t0));
    setTimeout(() => {
      bar.style.width = '100%';
      $('#boot').classList.add('done');
      document.body.classList.add('ready');
      setTimeout(() => { const b = $('#boot'); b && b.remove(); }, 700);
      /* 加载条 → 滚动进度条 */
      setTimeout(() => {
        const pl = $('#pageLoader');
        bar.style.transition = 'none'; bar.style.width = '0%';
        void bar.offsetWidth; bar.style.transition = '';
        pl.classList.add('prog');
      }, 500);
    }, wait);
  }
  if (document.readyState === 'complete') finish();
  else addEventListener('load', finish);
  setTimeout(finish, 3500); /* 兜底 */
})();

/* ================= 涟漪效果（全局委托） ================= */
document.addEventListener('pointerdown', e => {
  const el = e.target.closest('.rip');
  if (!el || el.disabled) return;
  const r = el.getBoundingClientRect();
  const size = Math.max(r.width, r.height) * 2.2;
  const w = document.createElement('span');
  w.className = 'rw';
  w.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
  el.appendChild(w);
  w.addEventListener('animationend', () => w.remove());
});

/* ================= 点击图标：只重播被点的那个 =================
   symbol 里的 SMIL 被全页 <use> 共享，直接让 SMIL 响应 click 会“点一处、全页同
   图标齐播”。这里在捕获阶段把被点图标的 <use> 就地展开成独立副本，再单独
   beginElement()；展开后保持内联（不还原），重复点击直接重播，且只影响被点过的那个。 */
document.addEventListener('click', e => {
  const t = e.target;
  if (!t || !t.closest) return;
  const svg = t.closest('svg');
  if (!svg) return;
  let use = null;
  for (const c of svg.children) if (c.tagName.toLowerCase() === 'use') { use = c; break; }
  if (use) {
    const href = use.getAttribute('href') || use.getAttribute('xlink:href') || '#';
    const sym = document.getElementById(href.slice(1));
    if (sym) {
      /* 把 symbol 的呈现属性（viewBox/fill/stroke…）补到 svg 上，原 class/id/样式保留 */
      for (const a of sym.attributes)
        if (a.name !== 'id' && !svg.hasAttribute(a.name)) svg.setAttribute(a.name, a.value);
      const frag = document.createDocumentFragment();
      for (const n of sym.childNodes) frag.appendChild(n.cloneNode(true));
      use.replaceWith(frag);
      svg.querySelectorAll('animate,animateTransform').forEach(n => n.setAttribute('begin', 'indefinite'));
    }
  }
  svg.querySelectorAll('animate,animateTransform').forEach(n => { try { n.beginElement(); } catch (_) {} });
}, true);

/* ================= 主题与动态色板 ================= */
const PALETTES = [
  { key: 'violet', name: '紫罗兰', dot: '#6750A4' },
  { key: 'ocean',  name: '海洋',   dot: '#0061A4' },
  { key: 'forest', name: '森林',   dot: '#006E1C' },
  { key: 'sunset', name: '落日',   dot: '#98490B' },
];
function applyTheme(t) { root.dataset.theme = t; localStorage.setItem('prify-theme', t); syncThemeUI(); }
function applyPalette(p) { root.dataset.palette = p; localStorage.setItem('prify-palette', p); syncPaletteUI(); }
function toggleTheme() {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  if (document.startViewTransition) document.startViewTransition(() => applyTheme(next));
  else applyTheme(next);
}
function syncMeta() {
  const c = getComputedStyle(root).getPropertyValue('--surface').trim();
  const m = document.querySelector('meta[name=theme-color]');
  if (m && c) m.setAttribute('content', c);
}
function syncThemeUI() {
  const dark = root.dataset.theme === 'dark';
  $('#themeIcon').innerHTML = `<use href="#i-${dark ? 'sun' : 'moon'}"/>`;
  $('#dockTheme').innerHTML = `<svg class="icon"><use href="#i-${dark ? 'sun' : 'moon'}"/></svg>`;
  $('#footTheme').textContent = `${dark ? '深色' : '浅色'} · ${PALETTES.find(p => p.key === root.dataset.palette).name}`;
  syncMeta();
}
function buildPdots(container) {
  PALETTES.forEach(p => {
    const b = document.createElement('button');
    b.className = 'pdot rip'; b.dataset.p = p.key;
    b.style.setProperty('--c', p.dot);
    b.setAttribute('data-tip', p.name);
    b.setAttribute('aria-label', '切换色板：' + p.name);
    b.onclick = () => { applyPalette(p.key); snackbar(`已切换到「${p.name}」色板，感受 Material You 的动态取色`); };
    container.appendChild(b);
  });
}
buildPdots($('#pdotsFoot')); buildPdots($('#pdotsDrawer'));
function renderPaletteBar() {
  const items = [['Primary','--primary'],['P-Container','--primary-container'],['Secondary','--secondary'],
    ['Tertiary','--tertiary'],['T-Container','--tertiary-container'],['Error','--error'],['Surface','--surface']];
  $('#paletteBar').innerHTML = items.map(([n, v]) => `<span class="swatch"><i style="background:var(${v})"></i>${n}</span>`).join('');
}
function syncPaletteUI() {
  $$('.pdot').forEach(d => d.classList.toggle('active', d.dataset.p === root.dataset.palette));
  syncThemeUI(); renderPaletteBar();
}
/* 初始化（属性已由 head 内联脚本预设，这里只同步 UI，不会产生视觉跳变） */
syncThemeUI(); syncPaletteUI();
$('#themeBtn').onclick = toggleTheme;
$('#dockTheme').onclick = toggleTheme;

/* ================= Snackbar（弹簧入场 + 倒计时进度） ================= */
let sbTimer;
function hideSnackbar(dir) {
  const sb = $('#snackbar');
  if (!sb.classList.contains('show')) return;
  clearTimeout(sbTimer);
  sb.classList.toggle('out-right', dir === 'right');
  sb.classList.add('out');
  const done = e => {
    if (e && e.target !== sb) return;                 /* 忽略子元素（进度条）冒泡 */
    if (!sb.classList.contains('out')) return;
    sb.removeEventListener('animationend', done);
    clearTimeout(sbTimer);
    sb.classList.remove('show', 'out', 'out-right');
  };
  sb.addEventListener('animationend', done);
  sbTimer = setTimeout(done, 420);                     /* 兜底：动画被跳过时也收尾 */
}
function snackbar(text, actionText, cb, dur = 3600) {
  const sb = $('#snackbar'), act = $('#sbAction');
  clearTimeout(sbTimer);
  sb.classList.remove('out', 'out-right');
  sb.style.setProperty('--sb-dur', dur + 'ms');
  $('#sbText').textContent = text;
  act.style.display = actionText ? '' : 'none';
  act.textContent = actionText || '';
  act.onclick = () => { hideSnackbar('right'); cb && cb(); };
  sb.style.transition = 'none';                       /* 抑制重置帧的基态 transition */
  sb.classList.remove('show');
  void sb.offsetWidth;
  sb.style.transition = '';
  sb.classList.add('show');
  sbTimer = setTimeout(hideSnackbar, dur);
}
$('#sbBtn').onclick = () => snackbar('这是一条 Snackbar，带倒计时进度条', '知道了');

/* ================= 移动端抽屉 ================= */
const drawer = $('#drawer'), dScrim = $('#drawerScrim');
function setDrawer(open) { drawer.classList.toggle('open', open); dScrim.classList.toggle('show', open); }
$('#menuBtn').onclick = () => setDrawer(true);
$('#drawerClose').onclick = () => setDrawer(false);
dScrim.onclick = () => setDrawer(false);
$$('#drawer nav a').forEach(a => a.onclick = () => setDrawer(false));

/* ================= 开始菜单 ================= */
const startMenu = $('#startMenu'), startBtn = $('#startBtn'), startScrim = $('#startScrim');
function setStart(open) {
  startMenu.classList.toggle('open', open);
  startScrim.classList.toggle('show', open);
  startBtn.setAttribute('aria-expanded', open);
  if (open) { $('#smSearch').value = ''; filterApps(''); setTimeout(() => $('#smSearch').focus(), 150); }
}
startBtn.onclick = () => setStart(!startMenu.classList.contains('open'));
startScrim.onclick = () => setStart(false);
$('#smSearch').addEventListener('input', e => filterApps(e.target.value));
function filterApps(q) {
  q = q.trim().toLowerCase();
  $$('.sm-app').forEach(a => a.style.display = !q || a.dataset.app.toLowerCase().includes(q) ? '' : 'none');
}
$$('.sm-app').forEach(a => a.onclick = () => { setStart(false); snackbar(`已启动「${a.dataset.app}」（演示环境）`); });
$$('.sm-reco-item').forEach(a => a.onclick = () => { setStart(false); snackbar('已在演示沙箱中打开该文件'); });

/* ================= 对话框（可复用内容 + 分层动画） ================= */
const dlg = $('#dialogWrap');
const DLG_DEFAULT = { title: '订阅 Prify 更新', desc: '每周一封，只发干货：新组件、设计走查与动效配方。随时可退订。', icon: '#i-sparkles', ok: '立即订阅' };
let dlgOkHandler = null;
function setDialogContent({ title, desc, icon, ok }) {
  $('#dlgTitle').textContent = title;
  $('#dlgDesc').textContent = desc;
  $('#dlgIcon').innerHTML = `<svg class="icon"><use href="${icon}"/></svg>`;
  $('#dlgOk').textContent = ok;
}
function setDialog(open) {
  dlg.classList.toggle('open', open);
  if (open) setTimeout(() => $('#dlgMail').focus(), 200);
  else { $('#dlgMail').value = ''; $('#dlgTf').classList.remove('invalid'); }
}
$('#dlgBtn').onclick = () => { setDialogContent(DLG_DEFAULT); dlgOkHandler = subscribeFromDialog; setDialog(true); };
$('#dlgCancel').onclick = () => setDialog(false);
dlg.onclick = e => { if (e.target === dlg) setDialog(false); };
function subscribeFromDialog() {
  const v = $('#dlgMail').value;
  const tf = $('#dlgTf');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { tf.classList.remove('invalid'); void tf.offsetWidth; tf.classList.add('invalid'); return; }
  flyIcon($('#dlgOk'));
  setDialog(false); snackbar('订阅成功！欢迎加入 Prify 社区 🎉');
}
$('#dlgOk').onclick = () => (dlgOkHandler || subscribeFromDialog)();

/* ================= 全局快捷键 ================= */
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setStart(true); }
  if (e.key === 'Escape') { setStart(false); setDialog(false); setDrawer(false); }
});

/* ================= Tabs：滑动指示条 ================= */
function moveTabInd() {
  const t = $('.tab.active'), ind = $('#tabInd');
  if (!t) return;
  ind.style.left = t.offsetLeft + 'px';
  ind.style.width = t.offsetWidth + 'px';
}
$$('.tab').forEach(t => t.onclick = () => {
  $$('.tab').forEach(x => x.classList.remove('active'));
  $$('.tabpane').forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  $('#' + t.dataset.pane).classList.add('active');
  moveTabInd();
});
addEventListener('resize', moveTabInd);
requestAnimationFrame(moveTabInd);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveTabInd);

/* ================= Segmented：滑动色块 ================= */
function initSeg(seg) {
  const thumb = seg.querySelector('.seg-thumb'); if (!thumb) return;
  const move = () => {
    const b = seg.querySelector('.seg-btn.selected'); if (!b) return;
    thumb.style.left = b.offsetLeft + 'px';
    thumb.style.width = b.offsetWidth + 'px';
  };
  seg.addEventListener('click', e => {
    const b = e.target.closest('.seg-btn'); if (!b || b.classList.contains('selected')) return;
    seg.querySelectorAll('.seg-btn').forEach(x => x.classList.remove('selected'));
    b.classList.add('selected'); move();
  });
  move(); requestAnimationFrame(move);
  addEventListener('resize', move);
}
$$('.segmented').forEach(initSeg);

/* ================= 手风琴 ================= */
$$('.acc-head').forEach(h => h.onclick = () => h.parentElement.classList.toggle('open'));

/* ================= 图表 ================= */
const CHART = {
  d: { labels: ['8点','10点','12点','14点','16点','18点','20点','22点','0点','2点','4点','6点'], bars: [22,48,66,58,74,52,38,26,14,18,10,16] },
  w: { labels: ['周一','周二','周三','周四','周五','周六','周日','均值','峰值','低谷','环比','同比'], bars: [42,55,61,49,72,86,64,58,86,42,12,28] },
  m: { labels: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'], bars: [18,26,39,52,47,63,58,71,66,78,74,88] },
};
const LINE_MAIN = [4.2, 5.1, 4.8, 6.4, 7.2, 6.8, 8.1, 9.0, 8.6, 9.8, 10.5, 11.2];
const LINE_PREV = [3.1, 3.4, 3.9, 4.2, 4.0, 5.1, 5.6, 5.4, 6.3, 6.8, 7.0, 7.6];
let barDelayTimer;
function renderBars(key) {
  const d = CHART[key];
  const max = Math.max(...d.bars);
  $('#bars').innerHTML = d.bars.map(v => `<div class="bar" data-v="${v}"><b>${v}k</b></div>`).join('');
  $('#barLabels').innerHTML = d.labels.map(l => `<span>${l}</span>`).join('');
  clearTimeout(barDelayTimer);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    $$('#bars .bar').forEach((b, i) => {
      b.style.transitionDelay = (i * 45) + 'ms';               /* 交错生长 */
      b.style.height = (d.bars[i] / max * 100) + '%';
    });
    barDelayTimer = setTimeout(() => $$('#bars .bar').forEach(b => b.style.transitionDelay = ''), 1600);
  }));
}
const LC_DUR = 1.4, LC_DELAY = .15;                  /* 与 .lc-line 动画的时长/延迟保持一致 */
function lcTimeAt(p) {                                /* 反算 --ease cubic-bezier(.2,0,0,1)：该曲线 y=3t²-2t³，x=.6t(1-t)²+t³ */
  const ey = t => 3 * t * t - 2 * t * t * t, ex = t => .6 * t * (1 - t) * (1 - t) + t * t * t;
  let lo = 0, hi = 1;
  for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (ey(m) < p) lo = m; else hi = m; }
  return ex((lo + hi) / 2);
}
function renderLine() {
  const n = LINE_MAIN.length, W = 600, H = 220, pad = 12;
  const x = i => pad + i * (W - pad * 2) / (n - 1);
  const y = v => H - pad - (v / 12) * (H - pad * 2);
  $('#lcMain').setAttribute('points', LINE_MAIN.map((v, i) => `${x(i)},${y(v)}`).join(' '));
  $('#lcPrev').setAttribute('points', LINE_PREV.map((v, i) => `${x(i)},${y(v)}`).join(' '));
  $('#lcArea').setAttribute('d', `M${x(0)},${y(LINE_MAIN[0])} L` + LINE_MAIN.map((v, i) => `${x(i)},${y(v)}`).join(' L') + ` L${x(n - 1)},${H} L${x(0)},${H} Z`);
  $('#lcDots').innerHTML = LINE_MAIN.map((v, i) =>
    `<span class="lc-dot" style="left:${(x(i) / W * 100).toFixed(3)}%;top:${(y(v) / H * 100).toFixed(3)}%;animation-delay:${(LC_DELAY + LC_DUR * lcTimeAt(i / (n - 1))).toFixed(2)}s" title="第 ${i + 1} 周：${v} 万"></span>`).join('');
}
$('#chartSeg').addEventListener('click', e => {
  const b = e.target.closest('.seg-btn');
  if (b) renderBars(b.dataset.key);
});
renderLine();
/* 图表滚到视口才播（面板 .reveal 阈值太浅：折线在面板深处，面板刚露头时它还在屏外） */
const lineWrap = $('.line-chart-wrap');
if ('IntersectionObserver' in window) {
  const chartIO = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      if (en.target === lineWrap) en.target.classList.add('chart-in');
      else renderBars('d');
      chartIO.unobserve(en.target);
    });
  }, { threshold: .3 });
  chartIO.observe(lineWrap); chartIO.observe($('#bars'));
} else {
  lineWrap.classList.add('chart-in');
  renderBars('d');
}

/* ================= 特性筛选 ================= */
$$('#featChips .chip').forEach(c => c.onclick = () => {
  $$('#featChips .chip').forEach(x => x.classList.remove('selected'));
  c.classList.add('selected');
  const f = c.dataset.f;
  $$('#featGrid .feat-card').forEach(card => {
    const show = f === 'all' || card.dataset.cat === f;
    card.classList.toggle('hide', !show);
    if (show) { card.style.animation = 'none'; void card.offsetWidth; card.style.animation = 'popIn .45s var(--ease-emph)'; }
  });
});

/* ================= 滑块联动 ================= */
const radiusSlider = $('#radiusSlider');
radiusSlider.addEventListener('input', e => {
  const v = e.target.value;
  e.target.style.setProperty('--p', v + '%');
  $('#radiusOut').textContent = v + '%';
  $('#dlBar').style.width = v + '%';
  $('#dlPct').textContent = v + '%';
});
radiusSlider.dispatchEvent(new Event('input'));

/* ================= Hero 时钟与任务 ================= */
function tickClock() {
  const now = new Date();
  const p = n => String(n).padStart(2, '0');
  $('#heroClock').textContent = `${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`;
  $('#heroDate').textContent = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日 · ${'日一二三四五六'[now.getDay()]}曜日`;
}
tickClock(); setInterval(tickClock, 1000);
const TASKS = ['审阅「落日」色板对比度报告', '给 Switch 组件补 ARIA 属性', '回复社区 issue #1284', '录制 v5.3 发布视频', '整理 Figma 令牌命名'];
$('#miniTasks').innerHTML = TASKS.map((t, i) =>
  `<label class="m3-check task-item${i === 0 ? ' done' : ''}"><input type="checkbox"${i === 0 ? ' checked' : ''}><span class="cb"><svg><use href="#i-check"/></svg></span><span>${t}</span></label>`).join('');
function syncTaskCount() { $('#taskCount').textContent = `${$$('#miniTasks input:checked').length}/${TASKS.length} 已完成`; }
$$('#miniTasks input').forEach(i => i.addEventListener('change', () => { i.closest('.task-item').classList.toggle('done', i.checked); syncTaskCount(); }));
syncTaskCount();

/* ================= 打字机 ================= */
(() => {
  const words = ['一套令牌', '128 个组件', '14 个平台', '每一枚像素', '你的下一款产品'];
  const el = $('#typeWord');
  let wi = 0, ci = 0, del = false;
  (function type() {
    const w = words[wi];
    el.textContent = w.slice(0, ci);
    if (!del && ci < w.length) { ci++; setTimeout(type, 110); }
    else if (!del) { del = true; setTimeout(type, 1600); }
    else if (ci > 0) { ci--; setTimeout(type, 45); }
    else { del = false; wi = (wi + 1) % words.length; setTimeout(type, 300); }
  })();
})();

/* ================= 滚动显现 / 计数 / 环形进度 ================= */
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      en.target.querySelectorAll('[data-count]').forEach(el => {
        if (el._counted) return; el._counted = true;
        const target = parseFloat(el.dataset.count), dec = +(el.dataset.decimals || 0), suf = el.dataset.suffix || '';
        const t0 = performance.now(), dur = 1600;
        (function step(t) {
          const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
          el.textContent = (target * e).toFixed(dec) + suf;
          if (k < 1) requestAnimationFrame(step);
        })(t0);
      });
      en.target.querySelectorAll('[data-ring]').forEach(c => { c.style.strokeDashoffset = 289 * (1 - +c.dataset.ring / 100); });
      io.unobserve(en.target);
    });
  }, { threshold: 0.15 });
  $$('.reveal,.stagger').forEach(el => io.observe(el));
} else { $$('.reveal,.stagger').forEach(e => e.classList.add('in')); }

/* ================= 导航高亮 ================= */
if ('IntersectionObserver' in window) {
  const navIO = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const id = '#' + en.target.id;
      $$('#navLinks a, #drawer nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === id));
    });
  }, { rootMargin: '-38% 0px -55% 0px' });
  ['components','features','stats','timeline','pricing','team','faq'].forEach(id => navIO.observe($('#' + id)));
}

/* ================= 通用 scroll-spy =================
   navIO 只监听上面 7 个固定 id；模板页（base.html）的 表单/反馈/导航 等
   分区 id 不在其中，点这些链接高亮不会跟随 → 这里补盯「非固定 id」的锚点。
   只含固定 id 的页面（如 md.html 生成的目录锚点）目标集为空，此块自然跳过。 */
const SPY_IDS = ['components','features','stats','timeline','pricing','team','faq'];
const spyTargets = [];
$$('#navLinks a[href^="#"], #drawer nav a[href^="#"]').forEach(a => {
  const id = a.getAttribute('href').slice(1);
  if (SPY_IDS.includes(id)) return;
  const el = document.getElementById(id);
  if (el && !spyTargets.includes(el)) spyTargets.push(el);
});
if (spyTargets.length && 'IntersectionObserver' in window) {
  const spyIO = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const id = '#' + en.target.id;
      $$('#navLinks a, #drawer nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === id));
    });
  }, { rootMargin: '-38% 0px -55% 0px' });
  spyTargets.forEach(el => spyIO.observe(el));
}

/* ================= 滚动：进度条 / 顶栏 / FAB ================= */
const fab = $('#fab');
addEventListener('scroll', () => {
  const y = scrollY;
  $('#topbar').classList.toggle('scrolled', y > 8);
  fab.classList.toggle('show', y > 560);
  const pl = $('#pageLoader');
  if (pl.classList.contains('prog')) {
    const h = document.documentElement.scrollHeight - innerHeight;
    pl.querySelector('i').style.width = (h > 0 ? y / h * 100 : 0) + '%';
  }
}, { passive: true });
const goTop = () => scrollTo({ top: 0, behavior: 'smooth' });
fab.onclick = goTop;
$('#dockHome').onclick = goTop;
$('#dockGrid').onclick = () => $('#components').scrollIntoView({ behavior: 'smooth' });
$('#ctaStart').onclick = () => setStart(true);
$('#ctaDocs').onclick = () => snackbar('文档即将上线，先逛逛组件库吧');

/* ================= Hero：鼠标视差 + 3D 倾斜（rAF 平滑插值） ================= */
if (matchMedia('(pointer:fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const hero = $('#hero'), card = $('#heroWin');
  let tx = 0, ty = 0, mx = 0, my = 0;              /* 背景视差 */
  let trx = 0, try_ = 0, rx = 0, ry = 0;           /* 卡片倾斜 */
  let running = false;
  const settled = (a, b) => Math.abs(a - b) < .001;
  function tick() {
    mx += (tx - mx) * .07; my += (ty - my) * .07;
    rx += (trx - rx) * .1; ry += (try_ - ry) * .1;
    hero.style.setProperty('--mx', mx.toFixed(4));
    hero.style.setProperty('--my', my.toFixed(4));
    card.style.transform = `perspective(1100px) rotateY(${(ry * 7).toFixed(2)}deg) rotateX(${(-rx * 7).toFixed(2)}deg)`;
    /* 插值收敛即停表，不再空转主线程；下次指针移动再唤醒 */
    if (settled(mx, tx) && settled(my, ty) && settled(rx, trx) && settled(ry, try_)) { running = false; return; }
    requestAnimationFrame(tick);
  }
  const wake = () => { if (!running) { running = true; requestAnimationFrame(tick); } };
  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    tx = (e.clientX - r.left) / r.width - .5;
    ty = (e.clientY - r.top) / r.height - .5;
    const c = card.getBoundingClientRect();
    try_ = (e.clientX - c.left) / c.width - .5;
    trx = (e.clientY - c.top) / c.height - .5;
    wake();
  });
  hero.addEventListener('pointerleave', () => { tx = ty = trx = try_ = 0; wake(); });
}

/* ================= 分享 ================= */
async function share() {
  const url = location.href;
  if (navigator.share) { try { await navigator.share({ title: 'Prify Design', url }); } catch (e) {} }
  else { try { await navigator.clipboard.writeText(url); snackbar('链接已复制到剪贴板'); } catch (e) { snackbar('复制失败，请手动复制地址栏'); } }
}
$('#shareBtn').onclick = share;
$('#dockShare').onclick = share;
$('#githubBtn').onclick = () => snackbar('演示环境：GitHub 仓库为虚构链接');

/* ================= 按钮行为（含图标动画） ================= */
function flyIcon(btn) { btn.classList.remove('fly'); void btn.offsetWidth; btn.classList.add('fly'); }
let liked = false;
$('#likeBtn').onclick = e => {
  liked = !liked;
  e.currentTarget.classList.toggle('liked', liked);
  snackbar(liked ? '已收藏 Prify ❤' : '已取消收藏');
};
$('#dlBtn').onclick = e => {
  const b = e.currentTarget, old = b.innerHTML;
  b.disabled = true;
  b.innerHTML = '<span class="spinner"></span>下载中…';
  setTimeout(() => { b.disabled = false; b.innerHTML = old; snackbar('prify-sdk-5.3.zip 下载完成（2.4MB）'); }, 1600);
};
$('#dangerBtn').onclick = () => snackbar('演示环境已拦截该危险操作', '撤销', () => snackbar('已撤销'));
$('#formSubmit').onclick = e => {
  if (!teamInput.value) {
    teamSel.classList.remove('invalid'); void teamSel.offsetWidth;
    teamSel.classList.add('invalid'); teamField.focus();
    snackbar('请先选择所属团队'); return;
  }
  const b = e.currentTarget, old = b.innerHTML;
  b.disabled = true; b.innerHTML = '<span class="spinner"></span>保存中…';
  setTimeout(() => { b.disabled = false; b.innerHTML = old; flyIcon(b); snackbar(`设置已保存到本地 · 团队：${teamInput.value}`); }, 1400);
};
$('#formSearch').addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.value.trim()) { snackbar(`正在搜索「${e.target.value.trim()}」…`); e.target.value = ''; }
});
$$('.chip-cloud .chip').forEach(c => c.onclick = () => c.classList.toggle('selected'));

/* ================= 下拉选择（M3 暴露式 × Fluent 玻璃） ================= */
const TEAM_OPTS = [
  { v: '产品设计', i: '#i-layers' }, { v: '前端开发', i: '#i-code' },
  { v: '视觉设计', i: '#i-palette' }, { v: '后端开发', i: '#i-cpu' },
  { v: '外包协作' }, { v: '校园招募' }, { v: '新人小组' },
  { v: '数据分析', i: '#i-chart' }, { v: '市场运营', i: '#i-globe' },
  { v: '用户研究', i: '#i-users' }, { v: '移动开发', i: '#i-devices' },
  { v: '测试质量', i: '#i-shield' }, { v: '交互设计', i: '#i-pen' },
  { v: '项目管理', i: '#i-calendar' }, { v: '客户支持', i: '#i-help' },
  { v: '增长黑客', i: '#i-bolt' }, { v: '内容策划', i: '#i-image' },
  { v: '品牌营销', i: '#i-sparkles' }, { v: '商务拓展', i: '#i-tag' },
  { v: '人力资源', i: '#i-user' }, { v: '财务法务', i: '#i-calc' },
  { v: '系统运维', i: '#i-terminal' }, { v: '其他', i: '#i-grid' },
];
const teamSel = $('#teamSel'), teamField = $('#teamField'), teamValue = $('#teamValue'), teamInput = $('#teamInput'), teamIc = $('#teamIc');
const teamMenu = document.createElement('div');
teamMenu.className = 'sel-menu';
teamMenu.id = 'teamList';
teamMenu.setAttribute('role', 'listbox');
teamMenu.setAttribute('aria-labelledby', 'teamLabel');
teamMenu.hidden = true;
teamMenu.innerHTML = TEAM_OPTS.map((o, i) => {
  const hasIc = o.i && document.getElementById(o.i.slice(1));   /* 防呆：id 写错 / symbol 不存在 → 不渲染 */
  return `<div class="sel-opt rip" role="option" id="teamOpt${i}" data-v="${o.v}" aria-selected="false" style="animation-delay:${Math.min(i, 7) * 30}ms">${hasIc ? `<svg class="icon ic"><use href="${o.i}"/></svg>` : ''}<span>${o.v}</span><span class="tick"><svg><use href="#i-check"/></svg></span></div>`;
}).join('');
document.body.appendChild(teamMenu);

let teamOpen = false, teamActive = -1, teamCloseTimer = 0, teamRAF = 0;
const teamOpts = () => $$('#teamList .sel-opt');

function placeTeamMenu() {
  const r = teamField.getBoundingClientRect();
  const w = Math.max(r.width, 180), mh = teamMenu.offsetHeight;
  const up = r.bottom + 8 + mh > innerHeight && r.top - 8 - mh > 0;
  teamMenu.style.width = w + 'px';
  teamMenu.style.left = Math.min(Math.max(8, r.left), innerWidth - w - 8) + 'px';
  teamMenu.dataset.dir = up ? 'up' : 'down';
  teamMenu.style.top = up ? 'auto' : (r.bottom + 6) + 'px';
  teamMenu.style.bottom = up ? (innerHeight - r.top + 6) + 'px' : 'auto';
}
function scrollOptIntoView(o) {           /* 只滚动菜单自身，不带动页面 */
  const top = o.offsetTop, bot = top + o.offsetHeight;
  if (top < teamMenu.scrollTop) teamMenu.scrollTop = top;
  else if (bot > teamMenu.scrollTop + teamMenu.clientHeight) teamMenu.scrollTop = bot - teamMenu.clientHeight;
}
function setTeamActive(i, scroll = true) {
  const opts = teamOpts();
  teamActive = i;
  opts.forEach((o, j) => o.classList.toggle('active', j === i));
  const cur = opts[i];
  if (!cur) return;
  teamField.setAttribute('aria-activedescendant', cur.id);
  if (scroll) scrollOptIntoView(cur);
}
function setTeam(open) {
  if (open === teamOpen) return;
  teamOpen = open;
  teamField.setAttribute('aria-expanded', open);
  if (open) {
    clearTimeout(teamCloseTimer);
    teamMenu.hidden = false;
    placeTeamMenu();
    const opts = teamOpts();
    setTeamActive(Math.max(0, opts.findIndex(o => o.getAttribute('aria-selected') === 'true')), false);
    const sel = opts.find(o => o.getAttribute('aria-selected') === 'true');
    if (sel) requestAnimationFrame(() => scrollOptIntoView(sel));
    requestAnimationFrame(() => requestAnimationFrame(() => teamMenu.classList.add('open')));
  } else {
    teamMenu.classList.remove('open');
    teamField.removeAttribute('aria-activedescendant');
    teamCloseTimer = setTimeout(() => { teamMenu.hidden = true; }, 220);
  }
}
function pickTeam(o) {
  teamInput.value = o.dataset.v;
  teamValue.textContent = o.dataset.v;
  const ic = o.querySelector('.ic');
  teamIc.innerHTML = ic ? ic.outerHTML : '';        /* 字段同步显示选中项图标；无图标则清空 */
  teamSel.classList.add('has-value');
  teamSel.classList.remove('invalid');
  teamOpts().forEach(x => x.setAttribute('aria-selected', x === o ? 'true' : 'false'));
  setTeam(false);
  teamField.focus({ preventScroll: true });
}
teamField.addEventListener('click', () => setTeam(!teamOpen));
teamMenu.addEventListener('pointerdown', e => e.preventDefault());
teamMenu.addEventListener('click', e => {
  const o = e.target.closest('.sel-opt');
  if (o) pickTeam(o);
});
teamMenu.addEventListener('pointermove', e => {
  const o = e.target.closest('.sel-opt');
  if (o) setTeamActive(teamOpts().indexOf(o), false);
});
document.addEventListener('pointerdown', e => {
  if (teamOpen && !teamMenu.contains(e.target) && !teamField.contains(e.target)) setTeam(false);
});
teamField.addEventListener('keydown', e => {
  const k = e.key;
  if (!teamOpen) {
    if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'Enter' || k === ' ') { e.preventDefault(); setTeam(true); }
    return;
  }
  const opts = teamOpts(), n = opts.length;
  if (k === 'ArrowDown') { e.preventDefault(); setTeamActive((teamActive + 1) % n); }
  else if (k === 'ArrowUp') { e.preventDefault(); setTeamActive((teamActive - 1 + n) % n); }
  else if (k === 'Home') { e.preventDefault(); setTeamActive(0); }
  else if (k === 'End') { e.preventDefault(); setTeamActive(n - 1); }
  else if (k === 'Enter' || k === ' ') { e.preventDefault(); if (opts[teamActive]) pickTeam(opts[teamActive]); }
  else if (k === 'Escape') { e.preventDefault(); setTeam(false); }
  else if (k === 'Tab') setTeam(false);
  else if (k.length === 1 && k.trim()) {
    const start = teamActive < 0 ? 0 : teamActive + 1;
    for (let d = 0; d < n; d++) {
      const j = (start + d) % n;
      if (opts[j].dataset.v.startsWith(k)) { setTeamActive(j); break; }
    }
  }
});
const onTeamViewport = () => {
  if (!teamOpen) return;
  cancelAnimationFrame(teamRAF);
  teamRAF = requestAnimationFrame(placeTeamMenu);
};
addEventListener('scroll', onTeamViewport, { passive: true, capture: true });
addEventListener('resize', onTeamViewport);

/* ================= 定价切换 ================= */
$('#billingSw').addEventListener('change', e => {
  $('#proPrice').textContent = e.target.checked ? '31' : '39';
  snackbar(e.target.checked ? '已切换为年付：¥31/月（省 20%）' : '已切换为月付：¥39/月');
});
$$('[data-plan]').forEach(b => b.onclick = () =>
  b.dataset.plan === '企业版' ? snackbar('已收到咨询请求，我们将在 1 个工作日内联系你') : snackbar(`已选择${b.dataset.plan}，演示环境不产生真实订单`));

/* ================= CTA 表单 ================= */
$('#ctaForm').addEventListener('submit', e => {
  e.preventDefault();
  const input = $('#ctaMail');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
    input.classList.remove('invalid'); void input.offsetWidth;
    input.classList.add('invalid'); input.focus();
    snackbar('请输入有效的邮箱地址'); return;
  }
  input.classList.remove('invalid'); input.value = '';
  flyIcon($('#ctaSubmit'));
  snackbar('订阅成功！每周一封，不见不散 ✉️');
});

/* ================= 电源按钮彩蛋 ================= */
$('#powerBtn').onclick = () => {
  setStart(false);
  setDialogContent({
    title: '退出 Prify 演示？',
    desc: '你的浏览进度将保存在本地，下次访问继续。',
    icon: '#i-power',
    ok: '退出'
  });
  dlgOkHandler = () => { setDialog(false); snackbar('已"关机"…开玩笑的，继续逛吧 😄'); dlgOkHandler = null; };
  setDialog(true);
};
