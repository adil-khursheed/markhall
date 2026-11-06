/* eslint-disable */
import { HL } from '../kernel'

/**
 * Roll: a framed notice board on a base, with twelve numbered tags hanging from
 * pegs. The tag under the pointer lifts and swings, its neighbours lean away in
 * a stagger, and one empty peg keeps a dashed outline where the next seat is
 * waiting. The slider is the stagger, in ms.
 */
const {
  Cam, clamp, facing, fillet, fit, hull, open, poly, proj, rad, rings, prism, put, solid,
  tdone, tset, tval, tween, disposer, flatDot, mk, place, pointer, reflect, register,
} = HL;

const W = 172, H = 116, BASE = 6, TILT = rad(9), BT = 6, TAGD = 3.2;
const COLS = [32, 68, 104, 140], ROWS = [100, 70, 40];
const TW = 24, TH = 20, EMPTY = 6;
const REST = [-3.2, 2.1, -1.4, 0.8, 2.6, -2.2, 0, 1.5, -1.8, 3, -0.7, 1.2];
const PULL = 13, LEAN = 3.2, LIFT = 7;

const faceY = (v) => 16 - v * Math.tan(TILT);
const board = (u, v, d = 0) => [u, faceY(v) + d, BASE + v];
const back = (u, v, d = 0) => [u, faceY(v) - BT + d, BASE + v];

/** Rotate a point in the board plane about its top peg, positive swinging right. */
function swing(a, b, th) {
  const c = Math.cos(rad(th)), s = Math.sin(rad(th));
  return [a * c - b * s, a * s + b * c];
}

function plate(P, pts, d) {
  return pts.map(([u, v]) => P(u, faceY(v) + d, BASE + v));
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  const C = Cam(45, 0.5, 1.52);
  fit(C, [
    [-8, -16, 0], [W + 8, 26, 0], [W + 8, -16, 0], [-8, 26, 0],
    [0, faceY(H), BASE + H], [W, faceY(H), BASE + H],
    [0, faceY(H) - BT, BASE + H], [W, faceY(H) - BT, BASE + H],
  ], 200, 164);
  const P = proj(C), front = facing(C);

  const g = mk('g', {}, svg);

  // the base, with a front lip that hides the board's foot
  const [br, bi] = rings(-8, -16, W + 8, 26, 9, 2.2);
  reflect(svg, g, P, front, br, 0, 12);
  put(solid(g), prism(P, front, br, bi, 0, BASE));

  // the board: a slab whose front face is a rounded rectangle on a leaning plane
  const outline = fillet([[0, 0], [W, 0], [W, H], [0, H]], [4, 4, 4, 4]);
  const fp = plate(P, outline, 0), bp = plate(P, outline, -BT);
  mk('path', { d: poly(hull(fp.concat(bp))), class: 'sil' }, g);
  mk('path', { d: poly(fp), class: 'nf lo' }, g);

  // inner frame and the two mount screws that hold the sheet
  const inner = fillet([[9, 9], [W - 9, 9], [W - 9, H - 9], [9, H - 9]], [2, 2, 2, 2]);
  mk('path', { d: poly(plate(P, inner, 0)), class: 'nf lo' }, g);
  for (const [u, v] of [[14, 14], [W - 14, 14]]) {
    place(flatDot(g, C, 1.2, 'dot off'), P(u, faceY(v) + 1, BASE + v));
  }

  // the front lip, after the board so it covers the foot
  const [lr, li] = rings(-2, 16, W + 2, 28, 5, 1.4);
  put(solid(g), prism(P, front, lr, li, BASE, BASE + 6));

  // one empty peg: a dashed outline says a seat is waiting
  const ghostGroup = mk('g', {}, g);
  const ghost = mk('path', { class: 'nf dash hi' }, ghostGroup);
  const gShape = fillet([[-TW / 2, 0], [TW / 2, 0], [TW / 2, -TH], [-TW / 2, -TH]], [2.6, 2.6, 2.6, 2.6]);
  const eu = COLS[EMPTY % 4], ev = ROWS[Math.floor(EMPTY / 4)];
  ghost.setAttribute('d', poly(gShape.map(([a, b]) => P(eu + a, faceY(ev + b) + TAGD + 1, BASE + ev + b))));
  const emptyDot = mk('circle', { r: 1.25, class: 'dot' }, g);
  place(emptyDot, P(eu, faceY(ev) + TAGD + 2, BASE + ev));

  // the tags, each with a punched code and a swinging body
  const tags = [];
  for (let i = 0; i < 12; i++) {
    if (i === EMPTY) continue;
    const u0 = COLS[i % 4], v0 = ROWS[Math.floor(i / 4)];
    const grp = mk('g', {}, g);
    const sil = mk('path', { class: 'sil' }, grp);
    const cr = mk('path', { class: 'nf lo' }, grp);
    const hole = mk('circle', { r: 2, class: 'nf lo' }, grp);
    const pin = mk('circle', { r: 0.8, class: 'dot off' }, grp);
    const dots = [0, 1, 2].map(() => mk('circle', { r: 1.05, class: 'dot off' }, grp));
    const hp = P(u0, faceY(v0) + TAGD + 2, BASE + v0);
    hole.setAttribute('cx', String(hp[0])); hole.setAttribute('cy', String(hp[1]));
    pin.setAttribute('cx', String(hp[0])); pin.setAttribute('cy', String(hp[1]));
    tags.push({ i, u0, v0, sil, cr, dots, a: tween(REST[i]), z: tween(0) });
  }

  for (const cd of tags) draw(cd, tval(cd.a, performance.now()), tval(cd.z, performance.now()));

  function draw(cd, th, lift) {
    const shape = fillet([[-TW / 2, 0], [TW / 2, 0], [TW / 2, -TH], [-TW / 2, -TH]], [2.6, 2.6, 2.6, 2.6]);
    const pts = shape.map(([a, b]) => { const [ra, rb] = swing(a, b, th); return [cd.u0 + ra, cd.v0 + rb]; });
    const f = pts.map(([u, v]) => P(u, faceY(v) + TAGD + lift, BASE + v));
    const b = pts.map(([u, v]) => P(u, faceY(v) + TAGD - 2.4 + lift, BASE + v));
    cd.sil.setAttribute('d', poly(hull(f.concat(b))));
    cd.cr.setAttribute('d', poly(f));
    const code = [[-6, -TH * 0.58], [0, -TH * 0.58], [6, -TH * 0.58]];
    code.forEach(([a, bb], k) => {
      const [ra, rb] = swing(a, bb, th);
      const q = P(cd.u0 + ra, faceY(cd.v0 + rb) + TAGD + 2.4 + lift, BASE + cd.v0 + rb);
      place(cd.dots[k], q);
    });
  }

  const B = register(stage, (_dt, now) => {
    let moving = false;
    for (const cd of tags) {
      draw(cd, tval(cd.a, now), tval(cd.z, now));
      if (!tdone(cd.a, now) || !tdone(cd.z, now)) moving = true;
    }
    return moving;
  });
  bag.add(B.unregister);

  // hit centres, measured on the rest pose so they never move
  const centres = tags.map((cd) => {
    const [a, b] = swing(0, -TH / 2, REST[cd.i]);
    return P(cd.u0 + a, faceY(cd.v0 + b) + TAGD, BASE + cd.v0 + b);
  });
  const [ea, eb] = [0, -TH / 2];
  const emptyCentre = P(eu + ea, faceY(ev + eb) + TAGD, BASE + ev + eb);

  let act = -1;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now();
    const from = a >= 0 ? a : act >= 0 ? act : EMPTY;
    act = a;
    tags.forEach((cd, i) => {
      const delay = Math.abs(cd.i - from) * stag;
      const chosen = cd.i === a;
      const th = chosen ? REST[cd.i] + PULL : a >= 0 ? REST[cd.i] + Math.sign(cd.i - a) * LEAN : REST[cd.i];
      tset(cd.a, th, now, delay);
      tset(cd.z, chosen ? LIFT : 0, now, delay);
      cd.sil.classList.toggle('hi', chosen);
      cd.dots.forEach((d, k) => {
        d.classList.toggle('m', chosen && k !== 1);
        d.classList.toggle('off', !chosen);
      });
    });
    ghost.classList.toggle('hi', a === -2 || a < 0);
    ghost.classList.toggle('lo', a >= 0);
    emptyDot.classList.toggle('off', a >= 0);
    read.textContent = a === -2 ? `${String(EMPTY + 1).padStart(2, '0')} open` : a >= 0 ? `seat ${String(a + 1).padStart(2, '0')}` : 'rest';
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => {
      let best = -1, bd = 26 * 26;
      centres.forEach((q, k) => {
        const dx = p[0] - q[0], dy = p[1] - q[1], d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = tags[k].i; }
      });
      const dx = p[0] - emptyCentre[0], dy = p[1] - emptyCentre[1];
      if (dx * dx + dy * dy < 26 * 26) best = -2;
      setActive(best);
    },
    leave: () => setActive(-1),
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

export default {
  name: 'roll',
  means: 'Twelve numbered tags hang on a roll-call board; the one under the pointer swings forward and an empty peg waits.',
  rules: [1, 2, 4, 5, 9, 10],
  range: [18, 38, 64],
  tour: [[132, 120], [228, 132], [236, 196], [156, 206], null],
  mount,
};
