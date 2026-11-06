/* eslint-disable */
import { HL } from '../kernel'

/**
 * Register: an open mark book on a desk. Each ruled row carries a paper tab
 * hinged at the margin; the pointer runs down the rows and the chosen tab
 * lifts, revealing the mark beneath. The slider is the height of that lift.
 */
const {
  Cam, clamp, facing, fillet, fit, open, poly, proj, rings, prism, put, solid,
  tdone, tset, tval, tween, unproj, disposer, mk, place, pointer, register,
} = HL;

const D = { x0: -132, y0: -88, x1: 142, y1: 102 };
const BOOK = { x0: -98, y0: -60, x1: 98, y1: 60 };
const LEFT = { x0: -94, y0: -54, x1: -4, y1: 54 };
const RIGHT = { x0: 4, y0: -54, x1: 94, y1: 54 };
const N = 8, GAP = 12.4, Y0 = -43.4, FX0 = 14, FX1 = 86, TH = 4.8;
const PAGE_Z = 13, REST_ROW = 3, STAG = 45;
const RY = Array.from({ length: N }, (_, i) => Y0 + i * GAP);

/** A rounded plate standing at z0..z1. */
function slab(parent, P, front, box, z0, z1, r, b) {
  const [o, i] = rings(box.x0, box.y0, box.x1, box.y1, r, b);
  put(solid(parent), prism(P, front, o, i, z0, z1));
}

/** A row tab's flat outline, before it hinges up. */
function tabShape(i) {
  const y0 = RY[i] - TH, y1 = RY[i] + TH;
  return fillet([[FX0, y0], [FX1, y0], [FX1, y1], [FX0, y1]], [0.8, 3, 3, 0.8]);
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let span = value, act = -1, shown = 'rest';

  const C = Cam(45, 0.5, 1.2);
  fit(C, [
    [D.x0, D.y0, 0], [D.x1, D.y1, 0], [D.x1, D.y0, 0], [D.x0, D.y1, 0],
    [FX1, RY[0], PAGE_Z + 26], [FX1, RY[N - 1], PAGE_Z + 26],
  ], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk('g', {}, svg);

  // desk, cover, and the two page blocks
  slab(g, P, front, D, 0, 5, 18, 3);
  slab(g, P, front, BOOK, 5, 9, 5, 1.4);
  slab(g, P, front, LEFT, 9, PAGE_Z, 2.5, 1);
  slab(g, P, front, RIGHT, 9, PAGE_Z, 2.5, 1);
  mk('path', { d: open([P(0, -54, 9.1), P(0, 54, 9.1)]), class: 'nf lo' }, g);

  // left page rows, right page margins
  mk('path', { d: open([P(-12, -48, PAGE_Z + 0.3), P(-12, 48, PAGE_Z + 0.3)]), class: 'nf lo' }, g);
  mk('path', { d: open([P(10, -48, PAGE_Z + 0.3), P(10, 48, PAGE_Z + 0.3)]), class: 'nf lo' }, g);
  for (const y of RY) mk('path', { d: open([P(-86, y, PAGE_Z + 0.3), P(-12, y, PAGE_Z + 0.3)]), class: 'nf lo' }, g);

  // the lines and marks the tabs cover
  const rows = RY.map((y) => mk('path', { d: open([P(FX0, y, PAGE_Z + 0.05), P(FX1, y, PAGE_Z + 0.05)]), class: 'nf lo' }, g));
  const marks = RY.map((y) => mk('circle', { r: 1.2, class: 'dot off' }, g));
  marks.forEach((m, i) => place(m, P(72, RY[i], PAGE_Z + 0.1)));

  // the tabs, far to near, each with a punched dot near its free end
  const tabs = RY.map((y, i) => {
    const grp = mk('g', {}, g);
    const face = mk('path', { class: 'sil' }, grp);
    const dot = mk('circle', { r: 1.15, class: 'dot off' }, grp);
    const lift = tween(liftFor(i, -1));
    face.classList.toggle('hi', i === REST_ROW);
    rows[i].classList.toggle('hi', i === REST_ROW);
    marks[i].setAttribute('class', 'dot ' + (i === REST_ROW ? 'm' : 'off'));
    if (i === REST_ROW) dot.setAttribute('class', 'dot m');
    return { face, dot, shape: tabShape(i), lift, shown: -1, y };
  });

  function restLift(i) {
    return 1.1 + (i % 3) * 0.6;
  }
  function liftFor(i, a) {
    if (a === i) return span;
    if (a < 0 && i === REST_ROW) return Math.max(4, span * 0.35);
    return restLift(i);
  }

  function draw(now) {
    let moving = false;
    const u = (x) => clamp((x - FX0) / (FX1 - FX0), 0, 1);
    tabs.forEach((tb) => {
      if (!tdone(tb.lift, now)) moving = true;
      const l = tval(tb.lift, now);
      if (Math.abs(l - tb.shown) < 0.01) return;
      tb.shown = l;
      tb.face.setAttribute('d', poly(tb.shape.map(([x, y]) => P(x, y, PAGE_Z + 0.2 + u(x) * l))));
      place(tb.dot, P(78, tb.y, PAGE_Z + 0.2 + u(78) * l));
    });
    return moving;
  }

  const B = register(stage, (_dt, now) => draw(now));
  bag.add(B.unregister);

  function apply(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act;
    act = a;
    tabs.forEach((tb, i) => {
      tset(tb.lift, liftFor(i, a), now, Math.abs(i - from) * STAG);
      const lit = a === i || (a < 0 && i === REST_ROW);
      tb.face.classList.toggle('hi', lit);
      rows[i].classList.toggle('hi', lit);
      tb.dot.setAttribute('class', 'dot ' + (lit ? 'm' : 'off'));
      marks[i].setAttribute('class', 'dot ' + (lit ? 'm' : 'off'));
    });
    const text = a < 0 ? 'rest' : `row ${a + 1}`;
    if (text !== shown) { shown = text; read.textContent = text; }
    B.wake();
  }

  function retarget() {
    const now = performance.now();
    tabs.forEach((tb, i) => tset(tb.lift, liftFor(i, act), now, 0));
    B.wake();
  }

  /** The row whose static band holds the point; -1 outside the register. */
  function hit([sx, sy]) {
    const [x, y] = unproj(C, sx, sy, PAGE_Z);
    if (x < 10 || x > 94 || y < RY[0] - GAP / 2 || y > RY[N - 1] + GAP / 2) return -1;
    return clamp(Math.round((y - RY[0]) / GAP), 0, N - 1);
  }

  bag.add(pointer(stage, { move: (p) => apply(hit(p)), leave: () => apply(-1) }));
  bag.add(() => svg.replaceChildren());
  read.textContent = 'rest';

  return {
    set: (v) => { span = v; retarget(); },
    destroy: bag.dispose,
  };
}

export default {
  name: 'register',
  means: 'An open mark book: run the pointer down the rows and a paper tab lifts to show the mark.',
  rules: [1, 2, 4, 5, 8, 10],
  range: [8, 16, 26],
  tour: [[250, 145], [239, 171], [228, 195], null],
  mount,
};
