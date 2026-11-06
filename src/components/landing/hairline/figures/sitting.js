/* eslint-disable */
import { HL } from '../kernel'

/**
 * Sitting: a desk with a round clock and one ruled answer paper. The pointer
 * scrubs the sitting left to right; the minute hand travels and the paper's
 * handwriting fills line by line. Past the last quarter the examiner's margin
 * and stamp arrive. The slider is the scrub range, in minutes.
 */
const {
  Cam, clamp, facing, fillet, fit, hull, open, poly, proj, rad, rings, prism, put, solid,
  spring, stepS, unproj, disposer, flatDot, mk, place, pointer, register,
} = HL;

const D = { x0: -60, y0: -50, x1: 240, y1: 100 };
const PAPER = { x0: 18, y0: 10, x1: 168, y1: 78, z: 8 };
const CLOCK = { x: 88, y: -16, z: 72, r: 32, d: 6 };
const REST = 25, MARK = 52;
const LINES = [126, 118, 134, 108, 120, 90, 132, 76];
const YS = [22, 29, 36, 43, 50, 57, 64, 71];
const ROWS = YS.map((y, i) => {
  const start = PAPER.x0 + 10, spans = [];
  let x = start, k = 0;
  while (x < start + LINES[i]) {
    const end = Math.min(x + 11 + ((i * 5 + k * 7) % 11), start + LINES[i]);
    spans.push([x, end]);
    x = end + 3 + ((i + k) % 3);
    k++;
  }
  return { y, spans };
});

function disc(cx, cz, r, y, n = 40) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push([cx + r * Math.cos(a), y, cz + r * Math.sin(a)]);
  }
  return out;
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let span = value, shown = '', active = false;

  const C = Cam(45, 0.5, 1.1);
  fit(C, [
    [D.x0, D.y0, 0], [D.x1, D.y1, 0], [D.x1, D.y0, 0], [D.x0, D.y1, 0],
    [CLOCK.x, CLOCK.y - CLOCK.d, CLOCK.z + CLOCK.r + 6], [CLOCK.x, CLOCK.y, CLOCK.z + CLOCK.r + 6],
  ], 200, 168);
  const P = proj(C), front = facing(C);

  const g = mk('g', {}, svg);

  // the desk pad
  const [dr, di] = rings(D.x0, D.y0, D.x1, D.y1, 15, 2.6);
  put(solid(g), prism(P, front, dr, di, 0, 6));
  const inset = fillet([[D.x0 + 6, D.y0 + 6], [D.x1 - 6, D.y0 + 6], [D.x1 - 6, D.y1 - 6], [D.x0 + 6, D.y1 - 6]], [10, 10, 10, 10]);
  mk('path', { d: poly(inset.map(([x, y]) => P(x, y, 6.2))), class: 'nf lo' }, g);

  // the clock stand and crown, behind the face
  const [sr, si] = rings(CLOCK.x - 12, CLOCK.y - 8, CLOCK.x + 12, CLOCK.y + 8, 4, 1.2);
  put(solid(g), prism(P, front, sr, si, 6, 40));
  const [fr, fi] = rings(CLOCK.x - 19, CLOCK.y - 13, CLOCK.x + 19, CLOCK.y + 13, 6, 1.6);
  put(solid(g), prism(P, front, fr, fi, 6, 12));

  // the clock face: a thin disc facing the viewer
  const face = disc(CLOCK.x, CLOCK.z, CLOCK.r, CLOCK.y);
  const back = disc(CLOCK.x, CLOCK.z, CLOCK.r, CLOCK.y - CLOCK.d);
  const faceP = face.map(([x, y, z]) => P(x, y, z));
  const backP = back.map(([x, y, z]) => P(x, y, z));
  mk('path', { d: poly(hull(faceP.concat(backP))), class: 'sil' }, g);
  const rim = disc(CLOCK.x, CLOCK.z, CLOCK.r - 3.2, CLOCK.y + 0.3);
  mk('path', { d: poly(rim.map(([x, y, z]) => P(x, y, z))), class: 'nf lo' }, g);

  // twelve quiet hour marks, with noon kept a little stronger
  for (let i = 0; i < 12; i++) {
    const a = rad(i * 30 - 90), r = CLOCK.r * 0.77;
    const q = P(CLOCK.x + Math.cos(a) * r, CLOCK.y + 0.5, CLOCK.z + Math.sin(a) * r);
    const dot = mk('circle', { r: 1.05, class: i === 0 ? 'dot m' : 'dot off' }, g);
    place(dot, q);
  }
  const crown = mk('rect', { class: 'nf lo' }, g);
  {
    const a = P(CLOCK.x - 3, CLOCK.y + 1, CLOCK.z + CLOCK.r + 7);
    const b = P(CLOCK.x + 3, CLOCK.y + 1, CLOCK.z + CLOCK.r + 1);
    crown.setAttribute('x', String(Math.min(a[0], b[0])));
    crown.setAttribute('y', String(Math.min(a[1], b[1])));
    crown.setAttribute('width', String(Math.abs(a[0] - b[0]) || 6));
    crown.setAttribute('height', String(Math.abs(a[1] - b[1]) || 6));
    crown.setAttribute('rx', '1.5');
  }

  // the answer paper: a thin sheet with ruled guides and handwriting
  const sheet = fillet([[PAPER.x0, PAPER.y0], [PAPER.x1, PAPER.y0], [PAPER.x1, PAPER.y1], [PAPER.x0, PAPER.y1]], [2.2, 2.2, 2.2, 2.2]);
  const top = sheet.map(([x, y]) => P(x, y, PAPER.z));
  const bot = sheet.map(([x, y]) => P(x, y, PAPER.z - 2));
  mk('path', { d: poly(hull(top.concat(bot))), class: 'sil' }, g);
  mk('path', { d: poly(top), class: 'nf lo' }, g);
  for (const y of YS) mk('path', { d: open([P(PAPER.x0 + 8, y, PAPER.z + 0.4), P(PAPER.x0 + 140, y, PAPER.z + 0.4)]), class: 'nf lo' }, g);

  const writing = ROWS.map((row) => row.spans.map(() => mk('path', { class: 'nf' }, g)));
  const margin = mk('path', { d: open([P(28, 16, PAPER.z + 1), P(28, 72, PAPER.z + 1)]), class: 'nf lo' }, g);
  const stamp = mk('g', {}, g);
  {
    const cx = 146, cy = 16.5, w = 34, h = 9, a = rad(-6), corner = (x, y) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)];
    const rect = [[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2]].map(([x, y]) => corner(x, y));
    mk('path', { d: poly(rect.map(([x, y]) => P(x, y, PAPER.z + 1.2))), class: 'nf' }, stamp);
    mk('path', { d: open([[cx - 9, cy], [cx - 4, cy + 3.4], [cx + 9, cy - 3.8]].map(([x, y]) => corner(x, y)).map(([x, y]) => P(x, y, PAPER.z + 1.4))), class: 'nf' }, stamp);
  }
  margin.setAttribute('display', 'none');
  stamp.setAttribute('display', 'none');

  // a pencil, just off the paper's edge
  const [pr, pi] = rings(182, 82, 232, 89, 3, 1);
  put(solid(g), prism(P, front, pr, pi, 10, 14));
  mk('path', { d: poly([P(182, 82, 14), P(168, 85.5, 12), P(182, 89, 14)]), class: 'nf lo' }, g);
  for (const x of [218, 226]) mk('path', { d: open([P(x, 82, 14.2), P(x, 89, 14.2)]), class: 'nf lo' }, g);

  // the moving time and the writing it leaves
  const T = spring(REST, { k: 60, c: 18, m: 1 });
  let lastMark = false;
  function draw(now) {
    const t = T.x;
    const a = rad(-90 + (t / 60) * 360), len = CLOCK.r * 0.66;
    const cx = CLOCK.x, cz = CLOCK.z;
    const hand = open([
      P(cx - Math.cos(a) * 4, CLOCK.y + 1, cz - Math.sin(a) * 4),
      P(cx + Math.cos(a) * len, CLOCK.y + 1, cz + Math.sin(a) * len),
    ]);
    if (!draw.hand) {
      draw.hand = mk('path', { class: 'hi' }, g);
      draw.hour = mk('path', { class: 'nf' }, g);
      draw.cap = mk('circle', { r: 1.5, class: 'dot' }, g);
      place(draw.cap, P(cx, CLOCK.y + 1.2, cz));
    }
    draw.hand.setAttribute('d', hand);
    const ha = rad(-60), hl = CLOCK.r * 0.4;
    draw.hour.setAttribute('d', open([P(cx, CLOCK.y + 0.8, cz), P(cx + Math.cos(ha) * hl, CLOCK.y + 0.8, cz + Math.sin(ha) * hl)]));

    const start = PAPER.x0 + 10;
    ROWS.forEach((row, i) => {
      const p = clamp((t - i * 6) / 8, 0, 1);
      const reach = start + LINES[i] * p;
      row.spans.forEach(([x0, x1], j) => {
        const path = writing[i][j];
        if (p <= 0.01 || x0 >= reach) { path.setAttribute('d', ''); return; }
        const end = Math.min(x1, reach);
        if (end <= x0) { path.setAttribute('d', ''); return; }
        const pts = [];
        for (let x = x0; x <= end; x += 2.2) {
          const w = Math.sin((x - start) * 0.38 + i * 1.9 + j * 0.7) * 0.85;
          pts.push(P(x, row.y + w, PAPER.z + 0.7));
        }
        const w = Math.sin((end - start) * 0.38 + i * 1.9 + j * 0.7) * 0.85;
        pts.push(P(end, row.y + w, PAPER.z + 0.7));
        path.setAttribute('d', open(pts));
      });
    });

    const marked = t >= MARK;
    if (marked !== lastMark) {
      lastMark = marked;
      if (marked) margin.removeAttribute('display'); else margin.setAttribute('display', 'none');
      if (marked) stamp.removeAttribute('display'); else stamp.setAttribute('display', 'none');
    }
    const text = !active ? 'rest' : marked ? 'marked' : `min ${String(Math.round(t)).padStart(2, '0')}`;
    if (text !== shown) { shown = text; read.textContent = text; }
  }

  const B = register(stage, (dt) => {
    const moving = stepS(T, dt);
    draw(performance.now());
    return moving;
  });
  bag.add(B.unregister);

  bag.add(pointer(stage, {
    move: (p) => {
      const [x] = unproj(C, p[0], p[1], PAPER.z);
      active = true;
      T.t = clamp(REST + (x - PAPER.x0) / (PAPER.x1 - PAPER.x0) * span, 0, 60);
      B.wake();
    },
    leave: () => { active = false; T.t = REST; B.wake(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { span = v; },
    destroy: bag.dispose,
  };
}

export default {
  name: 'sitting',
  means: 'A clock and a ruled answer paper: moving across the desk fills the paper and turns the hand toward the mark.',
  rules: [1, 3, 4, 5, 7, 8, 10],
  range: [24, 40, 58],
  tour: [[130, 236], [238, 206], [282, 168], [214, 138], null],
  mount,
};
