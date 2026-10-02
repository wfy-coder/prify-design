/* Prify SVG 图标库（47 symbol）—— 内嵌 SMIL 动画
   位于 body 顶部、prify.js 之前，同步注入本文档 —— 120 处 <use href="#i-x"> 与防呆 getElementById 依赖它。

   ── 动画开关（只改这里，不用动下面 46 个 symbol）────────────────────
   AUTOPLAY = true    页面加载瞬间，全部图标同时自动播放一遍
              false   关闭“入场全屏自动播放”，图标自身不播
   ANIM     = true     图标内嵌 SMIL 动画（描边绘制 / 整体动作 / 组合）
              false    完全静态：不注入任何动画（描边隐藏也一并取消）
   ─────────────────────────────────────────────────────────────────
   点击重播不在这里控制：symbol 的 SMIL 被所有 <use> 共享，若用 begin="click"
   会点一处、全页同图标齐播；改由 prify.js 的点击处理把被点的那个 <use>
   就地展开成独立副本再 beginElement()。
   注意：SMIL 动画无法按视口触发，也不受 prefers-reduced-motion 影响；
   若要按视口/循环/悬停触发，或适配“减少动效”，请改用 CSS 动画方案。
   另：i-check 刻意不做描边绘制 —— 复选框 / 下拉“勾选描出”依赖外层继承的 dashoffset，
       符号内再放 dash 动画会覆盖它，故 i-check 只做整图 pop。 */
const AUTOPLAY = true;
const ANIM = true;

/* 只负责入场：AUTOPLAY=true 为错时自动播，否则 indefinite 交给 JS beginElement()。
   不再带 click 事件基（点击重播见 prify.js 的就地展开逻辑）。d 为入场错时秒数 */
const bg = (d = 0) => AUTOPLAY ? (d || 0) + 's' : 'indefinite';
const anim = s => (ANIM ? s : '');

/* 描边绘制：dasharray 也交给 SMIL，ANIM=false 时不残留隐藏状态 */
const draw = (dur = .8, d = 0) => anim(
  `<animate attributeName="stroke-dasharray" values="100;100" dur="${dur}s" begin="${bg(d)}" fill="freeze"/>` +
  `<animate attributeName="stroke-dashoffset" values="100;0" dur="${dur}s" begin="${bg(d)}" fill="freeze" restart="always"/>`);
/* 整体动作 */
const rot = (v, dur = 1, d = 0) => anim(`<animateTransform attributeName="transform" type="rotate" values="${v}" dur="${dur}s" begin="${bg(d)}" fill="freeze" restart="always"/>`);
const mov = (v, dur = 1, d = 0) => anim(`<animateTransform attributeName="transform" type="translate" values="${v}" dur="${dur}s" begin="${bg(d)}" fill="freeze" restart="always"/>`);
const fade = (v, dur = 1, d = 0) => anim(`<animate attributeName="opacity" values="${v}" dur="${dur}s" begin="${bg(d)}" fill="freeze" restart="always"/>`);
const wid = (v, dur = 1, d = 0) => anim(`<animate attributeName="stroke-width" values="${v}" dur="${dur}s" begin="${bg(d)}" fill="freeze" restart="always"/>`);

document.currentScript.insertAdjacentHTML('afterend',
`<svg style="display:none" aria-hidden="true">
  <symbol id="i-logo" viewBox="0 0 24 24"><g>${rot('0 12 12;-3 12 12;3 12 12;0 12 12',.9)}<rect x="3" y="3" width="8.4" height="8.4" rx="2.4" fill="var(--primary)">${fade('0;1',.5,0)}</rect><rect x="12.6" y="3" width="8.4" height="8.4" rx="2.4" fill="var(--tertiary)">${fade('0;1',.5,.08)}</rect><rect x="3" y="12.6" width="8.4" height="8.4" rx="2.4" fill="var(--secondary)">${fade('0;1',.5,.16)}</rect><rect x="12.6" y="12.6" width="8.4" height="8.4" rx="2.4" fill="var(--primary-container)">${fade('0;1',.5,.24)}</rect></g></symbol>
  <symbol id="i-search" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><g>${rot('0 12 12;-12 12 12;10 12 12;-6 12 12;0 12 12',1.1)}<circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4.5 4.5"/></g></symbol>
  <symbol id="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><g>${draw(.9)}${rot('0 12 12;18 12 12;-18 12 12;0 12 12',2.4)}<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></g></symbol>
  <symbol id="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g>${draw(.9)}${rot('0 12 12;-10 12 12;8 12 12;0 12 12',1.6)}<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></g></symbol>
  <symbol id="i-menu" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><g>${draw(.7)}<path d="M3 6h18M3 12h18M3 18h18"/></g></symbol>
  <symbol id="i-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><g>${draw(.5)}<path d="M6 6l12 12M18 6 6 18"/></g></symbol>
  <symbol id="i-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><g>${rot('0 12 12;12 12 12;-8 12 12;0 12 12',.5)}${fade('.35;1',.5)}<path d="m20 6-11 11-5-5"/></g></symbol>
  <symbol id="i-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></symbol>
  <symbol id="i-download" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g>${draw(.8)}${mov('0 0;0 -2.5;0 0',.9)}<path d="M12 3v12m-5-5 5 5 5-5M4 19h16"/></g></symbol>
  <symbol id="i-share" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><g>${wid('2;2.7;2',1.1)}<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></g></symbol>
  <symbol id="i-star" viewBox="0 0 24 24" fill="currentColor"><g>${rot('0 12 12;360 12 12',1.4)}<path d="m12 2 3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"/></g></symbol>
  <symbol id="i-heart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><g>${draw(.8)}${wid('2;3;2;2.6;2',.9)}<path d="M19 14c1.5-1.5 3-3.4 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.1 1.5 4 3 5.5l7 7Z"/></g></symbol>
  <symbol id="i-user" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><g>${draw(.8)}<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></g></symbol>
  <symbol id="i-users" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><g>${draw(.9)}<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.4 3-5.5 6.5-5.5s6.5 2.1 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M17.5 14.7c2.4.6 4 2.3 4 5.3"/></g></symbol>
  <symbol id="i-arrow-r" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g>${mov('0 0;4 0;0 0',.8)}<path d="M5 12h14m-7-7 7 7-7 7"/></g></symbol>
  <symbol id="i-arrow-up" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g>${mov('0 0;0 -3;0 0',.8)}<path d="M12 19V5m-7 7 7-7 7 7"/></g></symbol>
  <symbol id="i-chevron-d" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.75 9.25 11.1 14.7q.9.8 1.8 0L19.25 9.25"/></symbol>
  <symbol id="i-bolt" viewBox="0 0 24 24" fill="currentColor"><g>${fade('1;.3;1;.55;1',1)}<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></g></symbol>
  <symbol id="i-shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><g>${draw(.9)}${wid('2;2.6;2',1.4)}<path d="M12 22s8-3.6 8-10V5l-8-3-8 3v7c0 6.4 8 10 8 10Z"/></g></symbol>
  <symbol id="i-palette" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g>${rot('0 12 12;-10 12 12;8 12 12;-5 12 12;0 12 12',1.4)}<path d="M12 22a10 10 0 1 1 10-10c0 2-1.3 3.5-3.2 3.5H16a2 2 0 0 0-1.4 3.4A2 2 0 0 1 12 22Z"/><circle cx="7.5" cy="10.5" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none"/><circle cx="16.5" cy="10.5" r="1" fill="currentColor" stroke="none"/></g></symbol>
  <symbol id="i-sparkles" viewBox="0 0 24 24" fill="currentColor"><g>${rot('0 12 12;14 12 12;0 12 12',1.2)}${fade('1;.55;1',1.2)}<path d="m9.5 2.5 1.6 4.4L15.5 8.5l-4.4 1.6L9.5 14.5 7.9 10.1 3.5 8.5l4.4-1.6Z"/><path d="m17.5 13 .9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9Z"/></g></symbol>
  <symbol id="i-layers" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><g>${mov('0 0;0 -2.5;0 0',1.1)}<path d="m12 2 9 4.9-9 4.9L3 6.9 12 2Z"/><path d="m3 11.9 9 4.9 9-4.9M3 16.9l9 4.9 9-4.9"/></g></symbol>
  <symbol id="i-code" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g>${mov('0 0;1.5 0;-1.5 0;0 0',1)}<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/></g></symbol>
  <symbol id="i-devices" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><g>${fade('1;.45;1;.7;1',1.2)}<rect x="2" y="4" width="16" height="11" rx="2"/><path d="M10 19h4M8 15.5h4"/><rect x="18.5" y="9" width="3.5" height="11" rx="1"/></g></symbol>
  <symbol id="i-clock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><g>${draw(.8)}<circle cx="12" cy="12" r="9"/><g>${rot('0 12 12;360 12 12',4)}<path d="M12 7v5l3.2 2"/></g></g></symbol>
  <symbol id="i-calendar" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><g>${draw(.9)}${rot('0 12 12;-6 12 12;5 12 12;0 12 12',1.2)}<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></g></symbol>
  <symbol id="i-mail" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g>${draw(.9)}<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7.5 9 6 9-6"/></g></symbol>
  <symbol id="i-location" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><g>${draw(.8)}${mov('0 0;0 -2.5;0 0',1)}<path d="M12 21s-7-5.3-7-11a7 7 0 0 1 14 0c0 5.7-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/></g></symbol>
  <symbol id="i-sliders" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><g>${draw(.9)}<path d="M4 7h16M4 12h16M4 17h16"/><g>${mov('0 0;3 0;0 0',1)}<circle cx="9" cy="7" r="2" fill="var(--surface)"/></g><g>${mov('0 0;-3 0;0 0',1)}<circle cx="15" cy="12" r="2" fill="var(--surface)"/></g><g>${mov('0 0;3 0;0 0',1)}<circle cx="7" cy="17" r="2" fill="var(--surface)"/></g></g></symbol>
  <symbol id="i-home" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g>${draw(.8)}${mov('0 0;0 -1.5;0 0',1)}<path d="M3 10.5 12 3l9 7.5M5.5 9V21h13V9"/></g></symbol>
  <symbol id="i-grid" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><g>${wid('2;2.7;2',1.4)}<rect x="3" y="3" width="7.5" height="7.5" rx="1.8"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.8"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.8"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.8"/></g></symbol>
  <symbol id="i-tag" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><g>${rot('0 12 12;-10 12 12;7 12 12;0 12 12',1.3)}<path d="m20 12.5-7.5 7.5a2 2 0 0 1-2.8 0L3 13.3V5a2 2 0 0 1 2-2h8.3l6.7 6.7a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" stroke="none"/></g></symbol>
  <symbol id="i-help" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><g>${rot('0 12 12;-11 12 12;9 12 12;-5 12 12;0 12 12',1.4)}<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.1 1-1.1 1.8v.3"/><path d="M12 17h.01"/></g></symbol>
  <symbol id="i-globe" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><g>${rot('0 12 12;360 12 12',5)}<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14.5 14.5 0 0 1 0 18M12 3a14.5 14.5 0 0 0 0 18"/></g></symbol>
  <symbol id="i-cpu" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><g>${wid('2;2.7;2',1.3)}<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/></g></symbol>
  <symbol id="i-cloud-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g>${rot('0 12 12;-8 12 12;6 12 12;0 12 12',2)}<circle cx="7" cy="7" r="3"/><path d="M7 1.5v1M1.5 7h1M3 3l.8.8M10.2 3.8 11 3"/><g>${mov('0 0;0 -1.5;0 0',1.6)}<path d="M17.5 20H8.8a4.3 4.3 0 1 1 .8-8.5A6 6 0 0 1 17.5 20Z"/></g></g></symbol>
  <symbol id="i-music" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g>${mov('0 0;0 -2;0 0',.9)}<circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><path d="M9 18V6l12-2v12"/></g></symbol>
  <symbol id="i-image" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g>${fade('1;.5;1',1.4)}<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="m21 15.5-4.5-4.5L6 21.5"/></g></symbol>
  <symbol id="i-folder" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><g>${rot('0 12 12;-7 12 12;5 12 12;0 12 12',1.2)}<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/></g></symbol>
  <symbol id="i-terminal" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g>${fade('1;.45;1;.7;1',1.3)}<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3M13 15h4"/></g></symbol>
  <symbol id="i-pen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g>${draw(.8)}${rot('0 12 12;-9 12 12;7 12 12;-4 12 12;0 12 12',1.3)}<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></g></symbol>
  <symbol id="i-calc" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><g>${fade('1;.5;1;.75;1',1.4)}<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8.5 7.5h7"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 15h.01M12 15h.01M15.5 15h.01M8.5 18h.01M12 18h.01M15.5 18h.01"/></g></symbol>
  <symbol id="i-chart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><g>${draw(.9)}<path d="M5 20v-8M12 20V4M19 20v-5M3 20h18"/></g></symbol>
  <symbol id="i-send" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g>${mov('0 0;4 -1;0 0',1)}<path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z"/></g></symbol>
  <symbol id="i-power" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><g>${wid('2;2.8;2',1.2)}<path d="M12 3v9"/><path d="M18.4 6.6a9 9 0 1 1-12.8 0"/></g></symbol>
  <symbol id="i-bell" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g>${rot('0 12 12;-14 12 12;12 12 12;-8 12 12;5 12 12;0 12 12',1.2)}<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></g></symbol>
  <symbol id="i-trash" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g>${rot('0 12 12;-10 12 12;8 12 12;-5 12 12;0 12 12',1.2)}<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14M10 11v6M14 11v6"/></g></symbol>
</svg>`);
