// Underlined words with inline thumbnails; hovering one floats a card of the work beside the pointer.
import { paint } from '../art';
import { PORTRAIT, SITE, workBySlug, type Portrait, type Work } from '../works';
import { gsap, $, $$ } from '../motion';

export function hoverCards(section: HTMLElement): () => void {
  let card = $('.dc-card', section);
  if (!card) {
    card = document.createElement('div');
    card.className = 'dc-card';
    card.innerHTML = '<div class="dc-card-inner"><span class="dc-card-caption"></span></div>';
    section.appendChild(card);
  }
  const box = card;
  const inner = $('.dc-card-inner', box)!;
  const caption = $('.dc-card-caption', box)!;
  let tx = 0, ty = 0, x = 0, y = 0, on = false;
  let active: HTMLElement | null = null;
  const offs: (() => void)[] = [];
  const listen = <K extends keyof HTMLElementEventMap>(el: HTMLElement | Document, type: K, fn: (e: HTMLElementEventMap[K]) => void) => {
    el.addEventListener(type, fn as EventListener);
    offs.push(() => el.removeEventListener(type, fn as EventListener));
  };

  const place = (clientX: number, clientY: number, snap: boolean) => {
    const r = section.getBoundingClientRect();
    const w = box.offsetWidth;
    const left = clientX - r.left;
    const flip = left + 28 + w > r.width - 12;
    tx = flip ? left - 28 - w : left + 28;
    ty = clientY - r.top + 24;
    inner.style.setProperty('--origin', flip ? '100% 0' : '0 0');
    if (snap) { x = tx; y = ty; }
  };

  const show = (word: HTMLElement, work: Work | Portrait, at: { clientX: number; clientY: number }) => {
    active?.classList.remove('is-active');
    active = word;
    word.classList.add('is-active');
    box.classList.toggle('is-portrait', work === PORTRAIT);
    const img = new Image();
    img.className = 'dc-card-art';
    img.alt = work.title;
    img.src = paint(work);
    inner.insertBefore(img, caption);
    requestAnimationFrame(() => requestAnimationFrame(() => img.classList.add('is-current')));
    $$('.dc-card-art', inner).filter((i) => i !== img).forEach((old) => window.setTimeout(() => old.remove(), 600));
    caption.textContent = work === PORTRAIT ? `${work.title}, ${SITE.city}` : `${work.title} — ${work.note}`;
    if (!on) place(at.clientX, at.clientY, true);
    on = true;
    box.classList.add('is-on');
  };
  const hide = () => {
    on = false;
    box.classList.remove('is-on');
    active?.classList.remove('is-active');
    active = null;
  };

  $$('.dc-word', section).forEach((word) => {
    const work = workBySlug(word.dataset.work ?? '');
    if (!work) return;
    $('.dc-thumb', word)!.style.backgroundImage = `url(${paint(work)})`;
    listen(word, 'pointerenter', (e) => { if (e.pointerType === 'mouse') show(word, work, e); });
    listen(word, 'pointerleave', (e) => { if (e.pointerType === 'mouse') hide(); });
    listen(word, 'click', (e) => {
      if ((e as PointerEvent).pointerType === 'mouse') return;
      if (active === word) hide();
      else { const r = word.getBoundingClientRect(); show(word, work, { clientX: r.left, clientY: r.bottom }); }
    });
  });
  listen(section, 'pointermove', (e) => { if (on) place(e.clientX, e.clientY, false); });
  listen(document, 'pointerdown', (e) => { if (on && !(e.target as Element).closest('.dc-word')) hide(); });

  const follow = () => {
    if (!on && !box.classList.contains('is-on')) return;
    x += (tx - x) * 0.18;
    y += (ty - y) * 0.18;
    box.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };
  gsap.ticker.add(follow);

  return () => {
    gsap.ticker.remove(follow);
    offs.forEach((off) => off());
  };
}
