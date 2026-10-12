// 占位 view：四个游戏的正式界面还没写，先放一个「正在建设中」的页面。
// 主持狗狗 + 提示文字 + 一个「假装过关」按钮（点了走完整的过关流程）。

import { pupSVG } from '../art/pups.js';

export function mount(container, ctx) {
  const pup = ctx.pup || { name: '狗狗' };
  const wrap = document.createElement('div');
  wrap.className = 'placeholder';
  wrap.innerHTML = `
    <div class="placeholder-pup">${pupSVG(pup.id, { size: 150, mood: 'thinking' })}</div>
    <p class="placeholder-text">「${pup.name}」的游戏还在盖房子…</p>
    <button class="btn btn-big" data-testid="btn-fake-complete">假装过关</button>
  `;
  const btn = wrap.querySelector('[data-testid="btn-fake-complete"]');
  btn.addEventListener('click', () => {
    ctx.sfx('tap');
    ctx.complete(); // 走完整过关流程：算星、写进度、弹层
  });

  container.appendChild(wrap);
  ctx.setInstruction(`这里是「${pup.name}」的游戏，还没有建好。可以点下面的按钮假装过关！`);

  return () => {
    wrap.remove();
  };
}
