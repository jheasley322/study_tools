/* ============================================================
   study_tools — drag, tap-to-place, and keyboard-to-place
   ------------------------------------------------------------
   The target device is an iPhone in portrait, mobile Safari.
   Nearly every decision below is a workaround for that browser;
   each one is commented with the failure it prevents so a future
   reader knows which lines are load-bearing and which are taste.

   THE HTML5 DRAG AND DROP API IS FORBIDDEN HERE. `dragstart`
   never fires from a finger on iOS Safari, so a drag built on it
   is dead on the only device that matters. Pointer Events only.

   Usage:

     var handle = Drag.attach(rootEl, {
       itemSelector: "[data-drag]",   // draggable things
       zoneSelector: "[data-zone]",   // drop targets
       threshold: 8,                  // px before a tap becomes a drag
       ghost: function (item) {},     // optional; default = styled clone
       onLift:   function (item) {},
       onOver:   function (item, zone) {},          // zone may be null
       onCommit: function (item, zone, method) {},  // "drag"|"tap"|"key"
       onCancel: function (item) {}
     });
     handle.refresh();   // re-scan after the DOM changes
     handle.destroy();

   This module never moves an item into a zone. It reports what
   the player did through `onCommit` and leaves the DOM to the
   game — two games want two different placements from the same
   gesture.

   THREE WAYS TO PLAY, ALL EQUAL:
     drag  — press, move past the threshold, release over a zone
     tap   — tap an item (selection mode), then tap a zone
     key   — Tab to an item, Enter/Space, Tab to a zone, Enter/Space
   The tap and key paths are not extras; they are how the game is
   completable by a player who cannot drag. `onLift`/`onCancel`
   fire for selection exactly as they do for a real drag, so a
   game only has to implement one set of feedback.

   Styling lives in drag.css. In particular `touch-action:none`
   is declared THERE and never here — see drag.css for why.
   ============================================================ */
(function (global) {
  "use strict";

  var noop = function () {};

  /* Space and Enter both activate. "Spacebar" is the old Edge/IE
     spelling of " " and costs nothing to keep. */
  var ACTIVATE = { "Enter": 1, " ": 1, "Spacebar": 1 };

  /* A keystroke that lands in a real form control belongs to that
     control, not to us. */
  var FORM = /^(INPUT|TEXTAREA|SELECT)$/;

  function toArray(list) {
    var out = [], i;
    for (i = 0; i < list.length; i++) out.push(list[i]);
    return out;
  }

  function matches(el, sel) {
    return el.nodeType === 1 && el.matches ? el.matches(sel) : false;
  }

  /**
   * Walk up from `node` to `root` and report the first thing we
   * recognise. An item nested inside a zone therefore wins over
   * that zone: tapping a tile that has already been placed should
   * pick the tile up, not re-drop onto the tray it sits in.
   */
  function hit(node, root, itemSel, zoneSel) {
    var n = node;
    while (n && n.nodeType === 1) {
      if (matches(n, itemSel)) return { kind: "item", el: n };
      if (matches(n, zoneSel)) return { kind: "zone", el: n };
      if (n === root) break;
      n = n.parentNode;
    }
    return null;
  }

  function attach(rootEl, opts) {
    if (!rootEl || rootEl.nodeType !== 1) {
      throw new TypeError("Drag.attach: rootEl must be an element");
    }
    opts = opts || {};

    var itemSel = opts.itemSelector || "[data-drag]";
    var zoneSel = opts.zoneSelector || "[data-zone]";
    var threshold = typeof opts.threshold === "number" ? opts.threshold : 8;
    var makeGhost = typeof opts.ghost === "function" ? opts.ghost : null;
    var onLift = opts.onLift || noop;
    var onOver = opts.onOver || noop;
    var onCommit = opts.onCommit || noop;
    var onCancel = opts.onCancel || noop;

    /* At most one pointer session at a time — a second finger is
       ignored, so at most one ghost can ever exist. That single
       fact is what makes "no orphan ghost" provable. */
    var drag = null;

    var selected = null;   // item held in tap/keyboard selection mode
    var zones = [];        // scanned by refresh()
    var owned = [];        // elements we stamped attributes on
    var marks = [];        // what we stamped, parallel to `owned` by index
    var eating = false;    // a synthetic click is pending execution
    var eatTimer = 0;
    var dead = false;

    /* ---------- attribute stewardship ----------
       We add tabindex/role/aria and, when the caller uses its own
       selector, the data-drag / data-zone attributes that drag.css
       hangs off. Everything added is recorded so destroy() can put
       the DOM back exactly as it found it. */
    function stamp(el, isItem) {
      if (owned.indexOf(el) !== -1) return;
      var mark = { tab: false, role: false, attr: false, item: isItem };

      if (!el.hasAttribute("tabindex")) {
        el.setAttribute("tabindex", "0");   // keyboard players need a tab stop
        mark.tab = true;
      }
      if (isItem) {
        /* drag.css keys off the ATTRIBUTE, not off itemSelector, so a
           game using a custom selector still gets touch-action. This
           runs at scan time, never inside pointerdown. Authors should
           still put data-drag in the markup: an attribute added after
           first paint is one frame late. */
        if (!el.hasAttribute("data-drag")) { el.setAttribute("data-drag", ""); mark.attr = true; }
        if (!el.hasAttribute("role")) { el.setAttribute("role", "button"); mark.role = true; }
        el.setAttribute("aria-grabbed", "false");
      } else {
        if (!el.hasAttribute("data-zone")) { el.setAttribute("data-zone", ""); mark.attr = true; }
      }
      owned.push(el);
      marks.push(mark);
    }

    function unstamp() {
      var i, el, mark;
      for (i = 0; i < owned.length; i++) {
        el = owned[i];
        mark = marks[i];
        if (mark.tab) el.removeAttribute("tabindex");
        if (mark.role) el.removeAttribute("role");
        if (mark.attr) el.removeAttribute(mark.item ? "data-drag" : "data-zone");
        if (mark.item) el.removeAttribute("aria-grabbed");
        el.classList.remove("drag-selected", "drag-source");
        el.classList.remove("drag-live", "drag-over");
      }
      owned = [];
      marks = [];
    }

    /**
     * Forget every element that has left the document.
     *
     * This is not housekeeping, it is required. Cascade spawns falling
     * tiles for the length of a run; without this, every tile the game
     * throws away stays pinned in `owned` forever. That is a detached-
     * node leak that grows all run on a phone, and it makes stamp()'s
     * indexOf scan a list that only ever gets longer — O(n²) in tiles
     * spawned, so frame time decays exactly when the ramp is steepest.
     *
     * A pruned element is deliberately NOT unstamped: it is already
     * detached, restoring attributes on it achieves nothing, and
     * holding it long enough to touch it is the leak we are fixing.
     *
     * `owned` and `marks` are parallel by index, so both are compacted
     * in the same pass with the same write cursor and can never drift.
     * Compacting in place rather than building new arrays matters: this
     * runs on every refresh, and a game that refreshes per spawn would
     * otherwise hand the collector two fresh arrays per frame.
     */
    function prune() {
      var w = 0, i;
      for (i = 0; i < owned.length; i++) {
        if (owned[i].isConnected) {
          owned[w] = owned[i];
          marks[w] = marks[i];
          w++;
        }
      }
      owned.length = w;
      marks.length = w;
    }

    function refresh() {
      if (dead) return;
      /* Prune BEFORE stamping. A pooled node that the game detached and
         later re-inserted is dropped here and re-stamped below, so a
         recycled tile comes back with its aria state initialised
         instead of being silently skipped as already-known. */
      prune();
      var items = toArray(rootEl.querySelectorAll(itemSel));
      zones = toArray(rootEl.querySelectorAll(zoneSel));
      var i;
      for (i = 0; i < items.length; i++) stamp(items[i], true);
      for (i = 0; i < zones.length; i++) stamp(zones[i], false);
      /* A selected item can be re-rendered out of existence between
         the tap and the drop. Drop the reference rather than commit
         onto a detached node. */
      if (selected && !rootEl.contains(selected)) clearSelection(false);
      /* Zones live now may not be the zones live a moment ago. */
      if (selected) markZones(true);
    }

    /* ---------- selection mode (tap and keyboard) ---------- */
    function markZones(on) {
      for (var i = 0; i < zones.length; i++) {
        zones[i].classList[on ? "add" : "remove"]("drag-live");
      }
    }

    function clearSelection(fire) {
      if (!selected) return;
      var it = selected;
      selected = null;
      it.classList.remove("drag-selected");
      it.setAttribute("aria-grabbed", "false");
      markZones(false);
      if (fire) onCancel(it);
    }

    function select(item) {
      if (selected === item) { clearSelection(true); return; }  // tap again to put it down
      clearSelection(true);
      selected = item;
      item.classList.add("drag-selected");
      item.setAttribute("aria-grabbed", "true");
      markZones(true);
      onLift(item);
    }

    function commit(item, zone, method) {
      clearSelection(false);                       // silent: this is a commit, not a cancel
      item.classList.remove("drag-selected", "drag-source");
      item.setAttribute("aria-grabbed", "false");
      zone.classList.remove("drag-over");
      onCommit(item, zone, method);
    }

    /* ---------- the ghost ---------- */
    function reduceMotion() {
      /* Read per lift, not once at attach: the player can change the
         setting with the page still open. */
      return !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }

    function buildGhost(d) {
      var rect = d.item.getBoundingClientRect();
      var g = makeGhost ? makeGhost(d.item) : d.item.cloneNode(true);

      /* A clone carries the original's ids. Two nodes with one id is
         a broken document and confuses assistive tech, so strip them
         and hide the whole ghost from the accessibility tree — the
         real item is still there and still the thing being moved. */
      if (g.removeAttribute) g.removeAttribute("id");
      var withIds = g.querySelectorAll ? g.querySelectorAll("[id]") : [];
      for (var i = 0; i < withIds.length; i++) withIds[i].removeAttribute("id");
      g.setAttribute("aria-hidden", "true");
      g.removeAttribute("tabindex");

      g.classList.add("drag-ghost");
      /* Geometry has to come from JS because it comes from a
         measurement. Appearance lives in drag.css. */
      g.style.position = "fixed";
      g.style.left = "0";
      g.style.top = "0";
      g.style.margin = "0";
      g.style.boxSizing = "border-box";
      g.style.width = rect.width + "px";
      g.style.height = rect.height + "px";
      /* Also declared in drag.css. Repeated inline on purpose: if this
         one property is missing, elementFromPoint returns the ghost
         itself, no zone is ever found, and every drop silently fails.
         It is too important to depend on a stylesheet having loaded. */
      g.style.pointerEvents = "none";
      /* No transition on transform — the ghost must track the finger
         exactly, and an eased transform reads as lag. */
      g.style.transition = "none";

      /* The lift scale is motion, so reduced motion drops it. The
         fade-in is a CSS animation, muted the same way in drag.css. */
      d.scale = reduceMotion() ? "" : " scale(1.04)";
      d.gx = d.x0 - rect.left;   // grab point inside the item
      d.gy = d.y0 - rect.top;

      /* Assign before appending: from this instant teardown() can
         find and remove it no matter what happens next. */
      d.ghost = g;
      document.body.appendChild(g);
      /* Appended to <body>, not to rootEl: position:fixed is relative
         to the nearest transformed ancestor, and any app that animates
         a wrapper with transform would otherwise drag the ghost into
         the wrong coordinate space. */
      place(d, d.x0, d.y0);
    }

    function place(d, x, y) {
      d.ghost.style.transform = "translate(" + (x - d.gx) + "px," + (y - d.gy) + "px)" + d.scale;
    }

    /**
     * The zone under the given viewport point. Uses elementFromPoint
     * rather than e.target because pointer capture retargets every
     * move and up event to rootEl — e.target is useless mid-drag.
     */
    function zoneAt(x, y) {
      var el = document.elementFromPoint(x, y);
      if (!el) return null;
      if (!rootEl.contains(el)) return null;
      var h = hit(el, rootEl, itemSel, zoneSel);
      return h && h.kind === "zone" ? h.el : null;
    }

    function setOver(d, zone) {
      if (d.zone === zone) return;
      if (d.zone) d.zone.classList.remove("drag-over");
      d.zone = zone;
      if (zone) zone.classList.add("drag-over");
      onOver(d.item, zone);
    }

    /* ---------- the one and only teardown ----------
       pointerup, pointercancel, lostpointercapture and destroy() all
       come through here, and all of them come through here BEFORE any
       caller callback runs. There is deliberately no other code path
       that removes a ghost, because a path that forgets leaves an
       orphan ghost pinned over the game with no way to dismiss it. */
    function teardown() {
      var d = drag;
      if (!d) return null;
      /* Cleared first: releasePointerCapture fires lostpointercapture
         synchronously, and that handler re-enters here. */
      drag = null;

      if (d.ghost && d.ghost.parentNode) d.ghost.parentNode.removeChild(d.ghost);
      d.ghost = null;
      if (d.zone) d.zone.classList.remove("drag-over");
      d.item.classList.remove("drag-source");
      d.item.setAttribute("aria-grabbed", "false");
      try {
        /* Throws if the pointer is already gone — which is exactly the
           pointercancel case, so it must never be fatal. */
        if (rootEl.hasPointerCapture && rootEl.hasPointerCapture(d.id)) {
          rootEl.releasePointerCapture(d.id);
        }
      } catch (e) { /* pointer already released by the browser */ }
      return d;
    }

    /* ---------- the click that follows a drag ----------
       Lifting a finger after a drag still produces a synthetic click
       on whatever is under it. Left alone, dropping a tile onto a zone
       instantly "taps" that zone as well. Swallow exactly one click,
       in the capture phase so nothing downstream sees it. The timer
       matters: if no click ever arrives (iOS suppresses it after some
       gestures) the listener would otherwise sit there and eat the
       player's next real tap. */
    function eatClick(e) {
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      e.preventDefault();
      stopEating();
    }

    function startEating() {
      if (eating) return;
      eating = true;
      document.addEventListener("click", eatClick, true);
      eatTimer = global.setTimeout(stopEating, 400);
    }

    function stopEating() {
      if (!eating) return;
      eating = false;
      global.clearTimeout(eatTimer);
      eatTimer = 0;
      document.removeEventListener("click", eatClick, true);
    }

    /* ---------- pointer handlers ---------- */
    function onDown(e) {
      if (dead || drag) return;                       // one session, one ghost
      if (e.isPrimary === false) return;              // second finger: not ours
      if (e.pointerType === "mouse" && e.button !== 0) return;

      var h = hit(e.target, rootEl, itemSel, zoneSel);
      if (!h || h.kind !== "item") return;

      drag = {
        id: e.pointerId,
        item: h.el,
        ghost: null,
        zone: null,
        lifted: false,
        x0: e.clientX,
        y0: e.clientY,
        gx: 0, gy: 0,
        scale: ""
      };

      try {
        /* Capture on rootEl, which no game ever re-parents. Capturing
           on the tile itself is the classic bug: the moment the game
           moves that tile into a zone the capture is lost mid-gesture
           and the drag dies halfway across the screen. */
        rootEl.setPointerCapture(e.pointerId);
      } catch (err) { /* capture unavailable; bubbling still reaches us */ }

      /* No preventDefault here. Scrolling is stopped by
         touch-action:none in drag.css — by pointerdown the browser
         has already decided whether this gesture scrolls. */
    }

    function onMove(e) {
      var d = drag;
      if (!d || e.pointerId !== d.id) return;

      if (!d.lifted) {
        var dx = e.clientX - d.x0, dy = e.clientY - d.y0;
        /* Squared distance: no sqrt, same answer. Under the threshold
           this is still a tap and the player may just be a bit shaky. */
        if (dx * dx + dy * dy < threshold * threshold) return;
        d.lifted = true;
        /* A drag supersedes any pending tap selection. Same item:
           clear it silently, we are about to lift it again anyway. */
        if (selected === d.item) clearSelection(false);
        else clearSelection(true);
        d.item.classList.add("drag-source");
        d.item.setAttribute("aria-grabbed", "true");
        buildGhost(d);
        onLift(d.item);
      }

      place(d, e.clientX, e.clientY);
      setOver(d, zoneAt(e.clientX, e.clientY));
    }

    function onUp(e) {
      var d = drag;
      if (!d || e.pointerId !== d.id) return;

      /* Read the drop target while the ghost is still up — it is
         pointer-events:none, so it is invisible to hit testing. */
      var zone = d.lifted ? zoneAt(e.clientX, e.clientY) : null;
      var lifted = d.lifted;
      var item = d.item;

      teardown();

      if (lifted) {
        startEating();
        if (zone) commit(item, zone, "drag");
        else onCancel(item);
      } else {
        select(item);   // under the threshold: this was a tap
      }
    }

    /**
     * iOS fires pointercancel for things that have nothing to do with
     * the game: a notification banner, an edge swipe, the app being
     * backgrounded. It is not an edge case, it is a Tuesday. Same
     * teardown as pointerup, no exceptions — the only difference is
     * that a cancelled drag never commits.
     */
    function onCancelEvent(e) {
      var d = drag;
      if (!d || e.pointerId !== d.id) return;
      var lifted = d.lifted;
      var item = d.item;

      teardown();

      if (lifted) {
        startEating();   // some cancels are still followed by a click
        onCancel(item);
      }
    }

    /* Last line of defence: capture can be lost without a pointerup
       or a pointercancel ever arriving (an element removed from the
       DOM mid-drag does it). Without this the ghost outlives the
       gesture. */
    function onLostCapture(e) {
      var d = drag;
      if (!d || e.pointerId !== d.id) return;
      var lifted = d.lifted;
      var item = d.item;
      teardown();
      if (lifted) onCancel(item);
    }

    /* ---------- tap to place ----------
       Item taps are handled in pointerup above, where the movement
       threshold is known. This handles the other half: a tap on a
       zone while an item is selected. Using click rather than
       pointerup means the browser's own tap arbitration applies, and
       the post-drag click is already swallowed before it gets here. */
    function onClick(e) {
      if (dead) return;
      var h = hit(e.target, rootEl, itemSel, zoneSel);
      if (!h || h.kind !== "zone") return;
      if (!selected) return;
      commit(selected, h.el, "tap");
    }

    /* ---------- keyboard to place ---------- */
    function onKey(e) {
      if (dead) return;
      if (!ACTIVATE[e.key]) return;
      if (e.target && FORM.test(e.target.tagName)) return;
      if (e.target && e.target.isContentEditable) return;

      var h = hit(e.target, rootEl, itemSel, zoneSel);
      if (!h) return;

      if (h.kind === "item") {
        e.preventDefault();   // Space would scroll the page
        select(h.el);
        return;
      }
      if (!selected) return;  // a zone with nothing in hand does nothing
      e.preventDefault();
      commit(selected, h.el, "key");
    }

    rootEl.addEventListener("pointerdown", onDown);
    rootEl.addEventListener("pointermove", onMove);
    rootEl.addEventListener("pointerup", onUp);
    rootEl.addEventListener("pointercancel", onCancelEvent);
    rootEl.addEventListener("lostpointercapture", onLostCapture);
    rootEl.addEventListener("click", onClick);
    rootEl.addEventListener("keydown", onKey);

    refresh();

    return {
      refresh: refresh,

      destroy: function () {
        if (dead) return;
        dead = true;
        teardown();          // any live ghost dies with the handle
        clearSelection(false);
        stopEating();
        rootEl.removeEventListener("pointerdown", onDown);
        rootEl.removeEventListener("pointermove", onMove);
        rootEl.removeEventListener("pointerup", onUp);
        rootEl.removeEventListener("pointercancel", onCancelEvent);
        rootEl.removeEventListener("lostpointercapture", onLostCapture);
        rootEl.removeEventListener("click", onClick);
        rootEl.removeEventListener("keydown", onKey);
        unstamp();
        zones = [];
      }
    };
  }

  global.Drag = { attach: attach };

  /* Browser global is the shipping path; the export exists only so
     node can require this file for tests. */
  if (typeof module !== "undefined" && module.exports) module.exports = global.Drag;
})(typeof window !== "undefined" ? window : globalThis);
