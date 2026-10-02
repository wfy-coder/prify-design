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

/* ================= 系统强调色：色数学与令牌生成（纯函数，无 DOM，可单独抽取跑单测） ==========
   按钮触发流程的第二步：拿到 AccentColor 的 RGB 后，把它当主色，套用紫罗兰的 19 个令牌
   模板换算到 OKLCH —— 只替换色相，明度/色度沿用模板，次要色与第三色保持相对色偏移 ——
   再做色域裁剪、浅色 primary 白字对比度回压，最后拼成浅色 + 深色两套整套令牌。
   测试用的起止标记：SYSPAL_BEGIN / SYSPAL_END。 */
const SYSPAL_BEGIN = 1;
const SYS_TOK_L = {
  primary: '#6750A4', 'primary-container': '#EADDFF', 'on-primary-container': '#21005D',
  secondary: '#625B71', 'secondary-container': '#E8DEF8', 'on-secondary-container': '#1D192B',
  tertiary: '#7D5260', 'tertiary-container': '#FFD8E4', 'on-tertiary-container': '#31111D'
};
const SYS_TOK_D = {
  primary: '#D0BCFF', 'on-primary': '#381E72', 'primary-container': '#4F378B',
  'on-primary-container': '#EADDFF', secondary: '#CCC2DC', 'secondary-container': '#4A4458',
  'on-secondary-container': '#E8DEF8', tertiary: '#EFB8C8', 'tertiary-container': '#633B48',
  'on-tertiary-container': '#FFD8E4'
};
const _s2l = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
const _l2s = c => c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
const _clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
function _hex2rgb(h) {
  h = String(h).replace('#', '');
  if (h.length === 3) h = h.replace(/(.)/g, '$1$1');
  return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16) / 255);
}
function _rgb2hex(r, g, b) {
  const q = n => Math.max(0, Math.min(255, Math.round(n * 255))).toString(16).padStart(2, '0');
  return '#' + q(r) + q(g) + q(b);
}
/* linear sRGB -> LMS 与 LMS -> linear sRGB（与配色脚本同一组系数） */
const _S2L = [[0.4122214708, 0.5363325363, 0.0514459929],
              [0.2119034982, 0.6806995451, 0.1073969566],
              [0.0883024619, 0.2817188376, 0.6299787005]];
const _L2S = [[4.0767416621, -3.3077115913, 0.2309699292],
              [-1.2684380046, 2.6097574011, -0.3413193965],
              [-0.0041960863, -0.7034186147, 1.7076147010]];
const _mul = (m, v) => [
  m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
  m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
  m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]
];
function _rgb2lch(hex) {
  const [r, g, b] = _hex2rgb(hex);
  const lms = _mul(_S2L, [_s2l(r), _s2l(g), _s2l(b)]).map(v => Math.cbrt(Math.max(0, v)));
  const [l, m, s] = lms;
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  return { L, C: Math.hypot(A, B), h: (Math.atan2(B, A) * 180 / Math.PI + 360) % 360 };
}
function _lch2rgb(L, C, h) {
  const rad = h * Math.PI / 180, a = C * Math.cos(rad), b = C * Math.sin(rad);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  return _mul(_L2S, [l_ * l_ * l_, m_ * m_ * m_, s_ * s_ * s_]).map(_l2s);
}
const _lch2hex = (L, C, h) => _rgb2hex(..._lch2rgb(L, C, h).map(_clamp01));
const _ok = rgb => rgb.every(v => v >= -1e-4 && v <= 1 + 1e-4);
function _gamutC(L, C, h) {
  if (_ok(_lch2rgb(L, C, h))) return C;
  let lo = 0, hi = C;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (_ok(_lch2rgb(L, mid, h))) lo = mid; else hi = mid; }
  return lo;
}
function _contrast(h1, h2) {
  const lum = h => { const [r, g, b] = _hex2rgb(h).map(_s2l); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  let a = lum(h1), b = lum(h2);
  if (a < b) { const t = a; a = b; b = t; }
  return (a + 0.05) / (b + 0.05);
}
/* 主色：保证白字可读（≥4.5），必要时逐档压暗明度 */
function _fitPrimary(L, C, h) {
  for (let i = 0; i < 60; i++) {
    const L2 = Math.max(0.06, L - i * 0.01), C2 = _gamutC(L2, C, h), hx = _lch2hex(L2, C2, h);
    if (i === 0 || _contrast(hx, '#FFFFFF') >= 4.5) return { L: L2, C: C2, hex: hx };
  }
  return { L, C: _gamutC(L, C, h), hex: _lch2hex(L, _gamutC(L, C, h), h) };
}
/* 生成整套令牌：refs = 模板令牌表，pri = 模板主色的 OKLCH，acc = 系统色的 OKLCH */
function _buildTokens(refs, pri, acc, isDark) {
  const out = {};
  for (const k in refs) {
    const t = _rgb2lch(refs[k]);
    const h = (acc.h + ((t.h - pri.h + 180) % 360 - 180) + 360) % 360;
    let L = t.L, C = _gamutC(t.L, t.C, h);
    if (!isDark && k === 'primary') { const f = _fitPrimary(t.L, t.C, h); L = f.L; C = f.C; out[k] = f.hex; continue; }
    out[k] = _lch2hex(L, C, h);
  }
  const [r, g, b] = _hex2rgb(out.primary).map(v => Math.round(v * 255));
  out['primary-glow'] = `rgba(${r},${g},${b},${isDark ? '.42' : '.38'})`;
  return out;
}
/* 系统色 hex → { light, dark }；色度太低（近黑白灰）返回 null 表示拒绝 */
function sysBuildPalette(hex) {
  const acc = _rgb2lch(hex);
  if (!acc || !isFinite(acc.L) || acc.C < 0.02) return null;
  return {
    light: _buildTokens(SYS_TOK_L, _rgb2lch(SYS_TOK_L.primary), acc, false),
    dark: _buildTokens(SYS_TOK_D, _rgb2lch(SYS_TOK_D.primary), acc, true)
  };
}
function sysCssText(p, key) {
  key = key || 'system';
  const fmt = o => Object.keys(o).map(k => `--${k}:${o[k]}`).join(';');
  return `html[data-palette="${key}"]{${fmt(p.light)}}\nhtml[data-palette="${key}"][data-theme="dark"]{${fmt(p.dark)}}`;
}
/* HSV <-> hex：调色盘的二维取色面（饱和度 × 明度）与色相条用，纯函数可单测 */
function _hsv2hex(h, s, v) {
  h = ((h % 360) + 360) % 360; s = _clamp01(s); v = _clamp01(v);
  const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return _rgb2hex(_clamp01(r + m), _clamp01(g + m), _clamp01(b + m));
}
function _hex2hsv(hex) {
  const rgb = _hex2rgb(hex), max = Math.max(...rgb), min = Math.min(...rgb), d = max - min;
  let h = 0;
  if (d) {
    const [r, g, b] = rgb;
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return { h, s: max ? d / max : 0, v: max };
}
const SYSPAL_END = 1;

/* ================= 主题与动态色板 ================= */
const PALETTES = [
  { key: 'violet', name: '紫罗兰', dot: '#6750A4' },
  { key: 'ocean',  name: '海洋',   dot: '#0061A4' },
  { key: 'forest', name: '森林',   dot: '#006E1C' },
  { key: 'sunset', name: '落日',   dot: '#98490B' },
  { key: 'crimson', name: '绯红', dot: '#9D3C51' },
  { key: 'brick', name: '砖橙', dot: '#A13C2F' },
  { key: 'rose', name: '玫粉', dot: '#993F76' },
  { key: 'magenta', name: '品红', dot: '#7F4597' },
  { key: 'orchid', name: '兰紫', dot: '#895084' },
  { key: 'indigo', name: '靛蓝', dot: '#4A5BB6' },
  { key: 'azure', name: '天蓝', dot: '#006F8E' },
  { key: 'cerulean', name: '湖蓝', dot: '#007B8B' },
  { key: 'teal', name: '青碧', dot: '#006A6A' },
  { key: 'jade', name: '竹青', dot: '#007359' },
  { key: 'lime', name: '青柠', dot: '#577300' },
  { key: 'sprout', name: '嫩芽', dot: '#716E00' },
  { key: 'lemon', name: '柠黄', dot: '#816800' },
  { key: 'gold', name: '鎏金', dot: '#845800' },
  { key: 'sand', name: '暖沙', dot: '#806449' },
  { key: 'neutral', name: '中性灰', dot: '#5B626E' },
];

/* ================= 系统强调色：按钮触发（读取 → 生成 → 注入 → 记住） =================
   带 data-sys-accent 的圆钮（抽屉「动态取色」区 #sysAccentBtn 与页脚色板行各一个；widget / md 页没有，
   $$() 返回空数组不报错）。读不到就什么都不做并提示，读到了就用 sysBuildPalette() 现算整套令牌注入
   <style id="sys-palette">。读到的颜色不再往色板行追加圆点，而是涂在按钮自己身上（paintSwatch + .swatch），
   点任意静态色板圆点会让 data-palette 变走，系统规则自然失效 —— 退出不需要额外代码。 */
const SYS_FIXED_ACCENTS = ['#0078D4', '#007AFF', '#0A84FF', '#0060DF']; /* 部分浏览器不给真值时返回的固定默认蓝 */
function readAccentColor() {
  try {
    const probe = css => {
      const e = document.createElement('i');
      e.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;' + css;
      document.documentElement.appendChild(e);
      const v = getComputedStyle(e).color;
      e.remove();
      return v;
    };
    const val = probe('color:AccentColor'), base = probe('');   /* base = 不设色时的继承值，用来判断关键字是否被支持 */
    if (!val || val === base || !/^rgba?\(/.test(val)) return '';
    const m = val.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return m ? _rgb2hex(+m[1] / 255, +m[2] / 255, +m[3] / 255) : '';
  } catch (e) { return ''; }
}
function isFixedAccent(hex) {
  const a = _hex2rgb(hex).map(v => Math.round(v * 255));
  return SYS_FIXED_ACCENTS.some(f => {
    const b = _hex2rgb(f).map(v => Math.round(v * 255));
    return Math.abs(a[0] - b[0]) <= 3 && Math.abs(a[1] - b[1]) <= 3 && Math.abs(a[2] - b[2]) <= 3;
  });
}
const DYN_NAMES = { system: '系统强调色', custom: '自定义' };   /* 两套动态色板不进 PALETTES，名字单独给 */
function paletteName(key) {
  const p = PALETTES.find(x => x.key === key);
  return p ? p.name : (DYN_NAMES[key] || PALETTES[0].name);
}
function injectDynPalette(key, hex, pal) {
  const p = pal || sysBuildPalette(hex);   /* pal 可选：调色盘拖动时把它一并传进来，省掉重复计算 */
  if (!p) return false;
  const id = key === 'system' ? 'sys-palette' : 'dyn-palette-' + key;   /* system 沿用旧 id，其余每槽一个 style */
  let st = document.getElementById(id);
  if (!st) { st = document.createElement('style'); st.id = id; document.head.appendChild(st); }
  st.textContent = sysCssText(p, key);
  return true;
}
/* 动态色不往色板行加圆点（PALETTES 恒 20 项），颜色直接涂在入口圆钮本身：
   .swatch 让钮底色 = 该色，图标色按对比度在黑白里取高者，保证 30px 上可读；
   data-palette 命中 custom / system 时给对应钮套 .active 选中圈。 */
function paintSwatch(btn, hex) {
  if (!btn) return;
  if (hex) {
    btn.classList.add('swatch');
    btn.style.setProperty('--c', hex);
    btn.style.setProperty('--on-c', _contrast(hex, '#FFFFFF') >= _contrast(hex, '#000000') ? '#FFFFFF' : '#000000');
  } else {
    btn.classList.remove('swatch');
    btn.style.removeProperty('--c');
    btn.style.removeProperty('--on-c');
  }
}
function syncDynSwatches() {
  let custom = '', accent = '';
  try { custom = localStorage.getItem('prify-custom-color') || ''; accent = localStorage.getItem('prify-system-accent') || ''; } catch (e) {}
  const key = root.dataset.palette;
  $$('[data-color-pick]').forEach(b => { paintSwatch(b, custom); b.classList.toggle('active', key === 'custom'); });
  $$('[data-sys-accent]').forEach(b => { paintSwatch(b, accent); b.classList.toggle('active', key === 'system'); });
}
function applySystemAccent(fromBtn) {
  const hex = readAccentColor();
  if (!hex) { if (fromBtn) snackbar('读不到系统强调色，浏览器未提供（保持当前色板）'); return false; }
  if (!sysBuildPalette(hex)) { if (fromBtn) snackbar('系统色过于中性（近黑/白/灰），无法生成色板'); return false; }
  injectDynPalette('system', hex);
  try { localStorage.setItem('prify-system-accent', hex); } catch (e) {}
  applyPalette('system');
  if (fromBtn) snackbar(`读到 ${hex}${isFixedAccent(hex) ? '（可能是浏览器固定默认色）' : ''}，已生成系统色板`);
  return true;
}
/* 打开页面时：读过系统色就直接复用（数据在 localStorage，不重新读系统），否则按需回退 */
try {
  const savedAccent = localStorage.getItem('prify-system-accent');
  const sp = savedAccent && sysBuildPalette(savedAccent);
  if (sp) injectDynPalette('system', savedAccent, sp);
  else if (root.dataset.palette === 'system') root.dataset.palette = 'violet';
} catch (e) {}
$$('[data-sys-accent]').forEach(b => b.onclick = () => applySystemAccent(true));

/* ================= 调色盘：一个基础色 → 整套令牌（SV 取色面 + 色相条 + 实时预览） =================
   带 data-color-pick 的圆钮（抽屉、页脚各一个）打开居中弹窗 #pickerWrap。取色区是一个二维面：
   横轴饱和度、纵轴明度，底色为当前色相；色相另配一条彩虹滑杆。三者用 HSV 合成基础色 hex，
   再复用 sysBuildPalette() 现算整套令牌注入到 custom 槽。拖动只注入 + 切 data-palette 做预览，
   不写 localStorage；取消 / Esc / 点遮罩还原打开前的色板，应用才把颜色和色板落盘。
   应用后色板行不新增圆点：颜色改涂在调色盘入口圆钮自己身上（syncDynSwatches）。
   widget / md 页没有入口，$$() 返回空数组、getElementById 返回 null，这里全部判空不报错。 */
const CUSTOM_KEY = 'custom';
let pickHue = 262, pickSat = 0.7, pickVal = 0.7;   /* HSV 状态：色相 0-360、饱和度 / 明度 0-1 */
let pickPrev = null;                                /* 打开前正在用的色板 key，取消时还原 */
let pickDrag = false;                               /* SV 取色面是否正在拖动 */
const pickEl = id => document.getElementById(id);
const pickClamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
function pickHex() { return _hsv2hex(pickHue, pickSat, pickVal); }
function pickSetFromHex(hex) {
  const c = _hex2hsv(hex);
  if (!c || !isFinite(c.h)) return false;
  pickHue = c.h; pickSat = c.s; pickVal = c.v;
  return true;
}
/* 把当前 HSV 同步到取色界面。continuous = true 是拖动 / 色相条 input 的高频调用：
   只更新弹窗内部（取色面、色相条、hex、色块），完全不碰 data-palette 与页面样式，
   页面零重绘，所以拖动顺滑。松手 / hex / 随机 / 打开等非连续场景才整页换色一次。
   颜色太接近黑 / 白 / 灰（sysBuildPalette 返回 null）时禁用「应用」并提示。 */
function pickSyncUI(continuous) {
  const hex = pickHex(), pal = sysBuildPalette(hex), ok = !!pal;
  if (pickEl('pickSV')) pickEl('pickSV').style.setProperty('--pick-h', pickHue);
  if (pickEl('pickCursor')) {
    pickEl('pickCursor').style.left = (pickSat * 100) + '%';
    pickEl('pickCursor').style.top = ((1 - pickVal) * 100) + '%';
  }
  if (pickEl('pickHue')) pickEl('pickHue').value = pickHue;
  if (pickEl('pickHex') && document.activeElement !== pickEl('pickHex')) pickEl('pickHex').value = hex;
  if (pickEl('pickSwatch')) pickEl('pickSwatch').style.background = hex;
  if (pickEl('pickWarn')) pickEl('pickWarn').style.display = ok ? 'none' : 'block';
  $$('.pick-ok').forEach(b => b.disabled = !ok);
  if (continuous) return;   /* 拖动中：只在弹窗内预览，不重绘页面 */
  if (ok) {
    injectDynPalette(CUSTOM_KEY, hex, pal);   /* 传入已算好的 pal，省掉重复计算 */
    root.dataset.palette = CUSTOM_KEY;
    syncPaletteUI();
    $$('[data-color-pick]').forEach(b => paintSwatch(b, hex));   /* 预览期间入口圆钮跟着变（未落盘，取消会回涂存档色） */
  } else if (root.dataset.palette === CUSTOM_KEY) {
    root.dataset.palette = pickPrev || 'violet';   /* 近灰退回上一套 */
    syncPaletteUI();
  }
}
function pickOpen() {
  setDrawer(false); setStart(false);   /* 收起抽屉 / 开始菜单，避免弹窗盖在上面 */
  pickPrev = root.dataset.palette || 'violet';
  let hex = '';
  try { hex = localStorage.getItem('prify-custom-color') || ''; } catch (e) {}
  if (!hex && pickPrev === 'system') { try { hex = localStorage.getItem('prify-system-accent') || ''; } catch (e) {} }   /* system 不进 PALETTES，单独取 */
  if (!hex) hex = (PALETTES.find(p => p.key === pickPrev) || PALETTES[0]).dot;
  pickSetFromHex(hex);
  pickSyncUI(false);
  if (pickEl('pickerWrap')) pickEl('pickerWrap').classList.add('open');
}
function pickClose(restore) {
  if (restore !== false) {
    /* 还原预览：若本来就在 custom 槽，把样式重注入回存档色（预览把该槽改过了） */
    if (pickPrev === CUSTOM_KEY) { try { const s = localStorage.getItem('prify-custom-color'); if (s) injectDynPalette(CUSTOM_KEY, s); } catch (e) {} }
    if (pickPrev) { root.dataset.palette = pickPrev; syncPaletteUI(); }
  }
  if (pickEl('pickerWrap')) pickEl('pickerWrap').classList.remove('open');
}
function pickApply() {
  const hex = pickHex();
  if (!sysBuildPalette(hex)) return;
  injectDynPalette(CUSTOM_KEY, hex);
  try { localStorage.setItem('prify-custom-color', hex); } catch (e) {}
  applyPalette(CUSTOM_KEY);   /* 内部走 syncPaletteUI → syncDynSwatches，把颜色涂到调色盘圆钮上，不加圆点 */
  snackbar(`已应用自定义色板 ${hex}`);
  pickClose(false);
}
function pickRandom() {
  pickHue = Math.round(Math.random() * 360);
  pickSat = 0.35 + Math.random() * 0.6;
  pickVal = 0.45 + Math.random() * 0.45;
  pickSyncUI(false);
}
/* SV 取色面：按住拖动，横轴 = 饱和度，纵轴 = 明度（顶部 1、底部 0）。
   拖动用 requestAnimationFrame 合并，一帧最多算一次；松手时按最后坐标做一次完整同步。 */
let pickPoint = null, pickRAF = 0;
function pickApplyPoint(continuous) {
  const box = pickEl('pickSV');
  if (!box || !pickPoint) return;
  const r = box.getBoundingClientRect();
  pickSat = pickClamp01((pickPoint.x - r.left) / r.width);
  pickVal = 1 - pickClamp01((pickPoint.y - r.top) / r.height);
  pickSyncUI(continuous);
}
function pickSchedule(x, y) {
  pickPoint = { x, y };
  if (pickRAF) return;
  pickRAF = requestAnimationFrame(() => { pickRAF = 0; pickApplyPoint(true); });
}
if (pickEl('pickSV')) {
  const box = pickEl('pickSV');
  box.addEventListener('pointerdown', e => {
    pickDrag = true;
    try { box.setPointerCapture(e.pointerId); } catch (_) {}
    pickSchedule(e.clientX, e.clientY); e.preventDefault();
  });
  box.addEventListener('pointermove', e => { if (pickDrag) pickSchedule(e.clientX, e.clientY); });
  const pickEnd = e => {
    if (!pickDrag) return;
    pickDrag = false;
    if (pickRAF) { cancelAnimationFrame(pickRAF); pickRAF = 0; }
    if (e && typeof e.clientX === 'number') pickPoint = { x: e.clientX, y: e.clientY };   /* 用松手坐标收尾（可能没有中间 move） */
    pickApplyPoint(false);   /* 冲掉待处理帧，按最后坐标补一次完整同步（页脚色板行、入口圆钮等） */
  };
  box.addEventListener('pointerup', pickEnd);
  box.addEventListener('pointercancel', pickEnd);
}
/* 色相条：原生 range 只换皮，input 高频走轻量、change 收尾完整同步 */
if (pickEl('pickHue')) {
  pickEl('pickHue').addEventListener('input', e => { pickHue = +e.target.value; pickSyncUI(true); });
  pickEl('pickHue').addEventListener('change', () => pickSyncUI(false));
}
/* 打开页面时：存过自定义色就直接注入 custom 槽（不加圆点，颜色由入口圆钮显示），否则按需回退 */
try {
  const savedPick = localStorage.getItem('prify-custom-color');
  const p = savedPick && sysBuildPalette(savedPick);
  if (p) injectDynPalette(CUSTOM_KEY, savedPick, p);
  else if (root.dataset.palette === CUSTOM_KEY) root.dataset.palette = 'violet';
} catch (e) {}
$$('[data-color-pick]').forEach(b => b.onclick = pickOpen);
if (pickEl('pickBtnApply')) pickEl('pickBtnApply').onclick = pickApply;
if (pickEl('pickBtnCancel')) pickEl('pickBtnCancel').onclick = pickClose;
if (pickEl('pickBtnRandom')) pickEl('pickBtnRandom').onclick = pickRandom;
/* hex 输入框：合法 #RRGGBB 就同步，非法就忽略（下次同步会还原显示） */
if (pickEl('pickHex')) {
  const applyHex = () => {
    const v = pickEl('pickHex').value.trim();
    if (/^#?[0-9a-fA-F]{6}$/.test(v)) pickSetFromHex(v[0] === '#' ? v : '#' + v);
    pickSyncUI(false);
  };
  pickEl('pickHex').addEventListener('change', applyHex);
  pickEl('pickHex').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); applyHex(); } });
}
if (pickEl('pickerWrap')) pickEl('pickerWrap').onclick = e => { if (e.target === pickEl('pickerWrap')) pickClose(); };

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
  $('#footTheme').textContent = `${dark ? '深色' : '浅色'} · ${paletteName(root.dataset.palette)}`;
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
function syncPaletteDots() {
  $$('.pdot').forEach(d => d.classList.toggle('active', d.dataset.p === root.dataset.palette));
}
function syncPaletteUI() {
  syncPaletteDots(); syncThemeUI(); renderPaletteBar(); syncDynSwatches();
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
  if (e.key === 'Escape') { setStart(false); setDialog(false); setDrawer(false); pickClose(); }
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
/* #githubBtn 已在 base.html 里做成真实仓库链接（<a target="_blank">），不需要脚本接管 */

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
