/* =========================================================
   Array Simulation - script.js
   Sections: 1) State  2) Helpers  3) Rendering  4) Operations
             5) Event listeners  6) Sorting algorithms
   ========================================================= */

/* ---------- 1) STATE ---------- */
const CAPACITY = 12;                  // fixed number of slots in our array
const DEFAULT_ARRAY = [10, 20, 30, 40, 50];
let arr = [...DEFAULT_ARRAY];         // the array being simulated (arr.length = elements in use)
let runId = 0;                        // changes on every run/reset so an old animation can stop

const $ = (id) => document.getElementById(id);   // short helper for getElementById

/* ---------- 2) HELPERS ---------- */

// Show a message. type: "info" | "success" | "warning" | "error"
function setStatus(message, type = "info") {
  const box = $("status");
  const faces = { info: "🤖", success: "🎉", warning: "🤔", error: "🙈" };
  box.className = "status " + type;
  box.innerHTML = "";                       // clear the old message
  const face = document.createElement("span");
  face.className = "face";
  face.textContent = faces[type];
  const text = document.createElement("span");
  text.textContent = message;
  box.append(face, text);
}

// Add one line to the "Steps" list
function log(text) {
  const list = $("steps");
  const li = document.createElement("li");
  li.textContent = text;
  list.appendChild(li);
  list.scrollTop = list.scrollHeight;
}

function clearLog() { $("steps").innerHTML = ""; }

// Put the "Steps appear here" message back
function resetSteps() {
  $("steps").innerHTML = '<li class="placeholder">Steps appear here when you run an operation.</li>';
}

// Wait between animation steps (speed slider: 1 = slow, 10 = fast).
// If Reset was pressed meanwhile (runId changed), stop the animation.
async function pause(id) {
  const delay = 1600 - Number($("speed").value) * 150;
  await new Promise((resolve) => setTimeout(resolve, delay));
  if (id !== runId) throw "cancelled";
}

// Read a whole number from an input box. Returns null (and shows an error) if invalid.
function readInt(inputId, label) {
  const text = $(inputId).value.trim();
  if (!/^-?\d+$/.test(text)) {
    setStatus(`"${label}" must be a whole number.`, "error");
    return null;
  }
  return Number(text);
}

// Turn the operation buttons on/off while an animation runs
let isBusy = false;                               // true while an animation is running
function setBusy(busy) {
  isBusy = busy;
  document.querySelectorAll(".op-btn, .tab").forEach((b) => (b.disabled = busy));
}

// Run an animated operation safely
async function run(operation) {
  const id = ++runId;
  clearLog();
  setBusy(true);
  try {
    await operation(id);
  } catch (e) {
    if (e !== "cancelled") throw e;     // ignore only our own "stop" signal
  } finally {
    if (id === runId) setBusy(false);
  }
}

function isSorted(a) {
  for (let i = 1; i < a.length; i++) if (a[i - 1] > a[i]) return false;
  return true;
}

/* ---------- 3) RENDERING ---------- */

// Draw all slots.
//   marks  = {index: "cssClass"}        colours a box
//   tags   = {index: "text above box"}  small label above a box
//   values = the array to draw (defaults to the main array; sorting passes its own copy)
function render(marks = {}, tags = {}, values = arr) {
  const view = $("arrayView");
  view.innerHTML = "";

  // Memory address of each slot = base + i * size (values come from the Address tab)
  const base = parseInt($("addrBase").value, 10);
  const size = parseInt($("addrSize").value, 10);
  const showAddr = Number.isInteger(base) && Number.isInteger(size) && size > 0;

  for (let i = 0; i < CAPACITY; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";

    const tag = document.createElement("div");
    tag.className = "tag";
    tag.textContent = tags[i] || "";

    const box = document.createElement("div");
    const empty = values[i] === undefined;          // unused slot
    box.className = "box" + (empty ? " empty" : "") + (marks[i] ? " " + marks[i] : "");
    box.textContent = empty ? "" : values[i];
    if (!empty && String(values[i]).length > 3) box.classList.add("small");   // long numbers use a smaller font

    const index = document.createElement("div");
    index.className = "index";
    index.textContent = i;

    const addr = document.createElement("div");
    addr.className = "addr";
    addr.textContent = showAddr ? base + i * size : "";

    cell.append(tag, box, index, addr);
    view.appendChild(cell);
  }
}

// Add a pointer label (L, M, H) above an index; several labels can share one box
function addTag(tags, i, label) {
  tags[i] = tags[i] ? tags[i] + "/" + label : label;
}

// A little confetti burst above the box at position i
function celebrate(i) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const view = $("arrayView");
  const cell = view.children[i];
  if (!cell) return;
  const colors = ["#ff7a3d", "#ffd23f", "#2ec4a6", "#3a86ff", "#ff4d6d", "#6c4bff"];
  for (let n = 0; n < 22; n++) {
    const bit = document.createElement("span");
    bit.className = "confetti";
    bit.style.left = cell.offsetLeft + cell.offsetWidth / 2 + "px";
    bit.style.top = cell.offsetTop + 40 + "px";
    bit.style.background = colors[n % colors.length];
    bit.style.setProperty("--x", (Math.random() - 0.5) * 220 + "px");
    bit.style.setProperty("--y", -30 - Math.random() * 110 + "px");
    view.appendChild(bit);
    setTimeout(() => bit.remove(), 1000);
  }
}

/* ---------- 4) OPERATIONS ---------- */

/* 4.1 Array address calculation (not animated: it is one formula) */
function calculateAddress() {
  clearLog();
  const base = readInt("addrBase", "Base address");
  const w = readInt("addrSize", "Element size");
  const i = readInt("addrIndex", "Index");
  const lb = readInt("addrLB", "Lower bound");
  if ([base, w, i, lb].includes(null)) return;

  if (base < 0) return setStatus("Base address cannot be negative.", "error");
  if (w <= 0) return setStatus("Element size must be greater than 0.", "error");
  if (i < lb) return setStatus(`Index ${i} is below the lower bound ${lb}.`, "error");

  const offset = (i - lb) * w;
  const address = base + offset;

  log("Formula: Address(A[i]) = Base + (i - LB) x w");
  log(`Put in the values: Address = ${base} + (${i} - ${lb}) x ${w}`);
  log(`Subtract the lower bound: (${i} - ${lb}) = ${i - lb}`);
  log(`Multiply by the size: ${i - lb} x ${w} = ${offset}`);
  log(`Add the base: ${base} + ${offset} = ${address}`);

  const position = i - lb;                     // position inside our simulated array
  if (position < arr.length) {
    render({ [position]: "found" });
    setStatus(`Address of A[${i}] = ${address} (hex 0x${address.toString(16).toUpperCase()})`, "success");
  } else {
    render();
    setStatus(`Address = ${address}, but index ${i} is outside the current array (valid: ${lb} to ${lb + arr.length - 1}).`, "warning");
  }
}

/* 4.2 Insertion: shift elements right, then place the new value */
async function insertElement(id) {
  const value = readInt("insValue", "Value");
  const pos = readInt("insPos", "Position");
  if (value === null || pos === null) return;
  if (value < -999 || value > 9999) return setStatus("Value must be between -999 and 9999 so it fits in a box.", "error");
  if (arr.length >= CAPACITY) return setStatus("The array is full (12 slots). Delete something first.", "error");
  if (pos < 0 || pos > arr.length) return setStatus(`Position must be between 0 and ${arr.length}.`, "error");

  log(`Insert ${value} at index ${pos}. The array has ${arr.length} elements.`);
  arr.length++;                                   // make room: the new last slot is empty
  render();
  await pause(id);

  // Start from the last element and move each one a slot to the right
  for (let i = arr.length - 1; i > pos; i--) {
    arr[i] = arr[i - 1];
    log(`Shift: A[${i - 1}] moves to A[${i}] (value ${arr[i]}).`);
    setStatus(`Shifting elements right... (${arr.length - 1 - i + 1} moved)`, "info");
    render({ [i]: "moving from-left", [i - 1]: "source" });
    await pause(id);
  }

  arr[pos] = value;
  log(`Place ${value} in A[${pos}].`);
  render({ [pos]: "found" });
  celebrate(pos);
  setStatus(`Inserted ${value} at index ${pos}. Elements shifted: ${arr.length - 1 - pos}.`, "success");
}

/* 4.3 Deletion: remove the element, shift the rest left */
async function deleteElement(id) {
  const pos = readInt("delPos", "Position");
  if (pos === null) return;
  if (arr.length === 0) return setStatus("The array is empty, nothing to delete.", "error");
  if (pos < 0 || pos >= arr.length) return setStatus(`Position must be between 0 and ${arr.length - 1}.`, "error");

  const removed = arr[pos];
  log(`Delete A[${pos}] (value ${removed}).`);
  setStatus(`Deleting ${removed}...`, "info");
  render({ [pos]: "removed" });
  await pause(id);

  // Move every element after the deleted one a slot to the left
  for (let i = pos; i < arr.length - 1; i++) {
    arr[i] = arr[i + 1];
    log(`Shift: A[${i + 1}] moves to A[${i}] (value ${arr[i]}).`);
    render({ [i]: "moving from-right", [i + 1]: "source" });
    await pause(id);
  }

  arr.length--;                                   // the last slot is now unused
  log("Reduce the size of the array by 1.");
  render();
  setStatus(`Deleted ${removed} from index ${pos}. New size: ${arr.length}.`, "success");
}

/* 4.4 Linear search: check elements one by one from the start */
async function linearSearch(id) {
  const target = readInt("linTarget", "Value to find");
  if (target === null) return;
  if (arr.length === 0) return setStatus("The array is empty.", "error");

  log(`Looking for ${target}, starting at index 0.`);
  const marks = {};
  for (let i = 0; i < arr.length; i++) {
    marks[i] = "check";
    render(marks);
    setStatus(`Checking index ${i}: is ${arr[i]} equal to ${target}?`, "info");
    await pause(id);

    if (arr[i] === target) {
      marks[i] = "found";
      render(marks);
      log(`A[${i}] = ${arr[i]} matches. Found at index ${i} after ${i + 1} comparison(s).`);
      celebrate(i);
      return setStatus(`Found ${target} at index ${i}.`, "success");
    }
    marks[i] = "miss";
    log(`A[${i}] = ${arr[i]} is not ${target}. Move to the next element.`);
  }
  render(marks);
  log(`Reached the end of the array. ${target} is not present.`);
  setStatus(`${target} was not found (${arr.length} comparisons).`, "warning");
}

/* 4.5 Binary search: needs a sorted array; halve the range each step */
async function binarySearch(id) {
  const target = readInt("binTarget", "Value to find");
  if (target === null) return;
  if (arr.length === 0) return setStatus("The array is empty.", "error");
  if (!isSorted(arr)) {
    return setStatus("Binary search needs a sorted array. Click \"Sort ascending\" first.", "error");
  }

  let low = 0, high = arr.length - 1, step = 1;
  log(`Looking for ${target}. low = ${low}, high = ${high}.`);

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);

    // Build the L / M / H labels and dim the elements outside [low, high]
    const tags = {}, marks = {};
    for (let i = 0; i < arr.length; i++) if (i < low || i > high) marks[i] = "out";
    addTag(tags, low, "L"); addTag(tags, mid, "M"); addTag(tags, high, "H");
    marks[mid] = "check";
    render(marks, tags);

    log(`Step ${step}: low = ${low}, high = ${high}, mid = floor((${low} + ${high}) / 2) = ${mid}. A[${mid}] = ${arr[mid]}.`);
    setStatus(`Step ${step}: compare A[${mid}] = ${arr[mid]} with ${target}.`, "info");
    await pause(id);

    if (arr[mid] === target) {
      marks[mid] = "found";
      render(marks, tags);
      log(`${arr[mid]} equals ${target}. Found at index ${mid}.`);
      celebrate(mid);
      return setStatus(`Found ${target} at index ${mid} in ${step} step(s).`, "success");
    } else if (arr[mid] < target) {
      log(`${arr[mid]} < ${target}, so search the right half: low = ${mid} + 1 = ${mid + 1}.`);
      low = mid + 1;
    } else {
      log(`${arr[mid]} > ${target}, so search the left half: high = ${mid} - 1 = ${mid - 1}.`);
      high = mid - 1;
    }
    step++;
  }

  render();
  log(`low (${low}) is now greater than high (${high}), so the range is empty.`);
  setStatus(`${target} was not found.`, "warning");
}

/* ---------- 5) EVENT LISTENERS ---------- */

// Keep the text box in sync after insert/delete/sort
function syncInput() { $("arrayInput").value = arr.join(", "); }

// Set the array from the text box
$("setBtn").addEventListener("click", () => {
  const text = $("arrayInput").value.trim();
  const parts = text === "" ? [] : text.split(/[\s,]+/).filter(Boolean);   // commas or spaces

  if (parts.length > CAPACITY) return setStatus(`Too many elements. The maximum is ${CAPACITY}.`, "error");
  if (!parts.every((p) => /^-?\d+$/.test(p))) {
    return setStatus("Use whole numbers separated by commas, e.g. 5, 12, 20.", "error");
  }
  if (parts.some((p) => Number(p) < -999 || Number(p) > 9999)) {
    return setStatus("Each number must be between -999 and 9999.", "error");
  }
  runId++;                                        // stop any running animation
  stopSort();                                     // and any running sort
  arr = parts.map(Number);
  clearLog();
  render();
  setStatus(`Array set with ${arr.length} element(s).`, "success");
});

// Sort ascending (useful before binary search)
$("sortBtn").addEventListener("click", () => {
  stopSort();
  arr.sort((a, b) => a - b);                      // "a - b" makes it numeric, not alphabetical
  syncInput();
  render();
  setStatus("Array sorted in ascending order.", "success");
});

// Reset everything to the starting state
$("resetBtn").addEventListener("click", () => {
  runId++;                                        // cancels any animation in progress
  stopSort();
  arr = [...DEFAULT_ARRAY];
  syncInput();
  resetSteps();
  setBusy(false);
  render();
  setStatus("Reset. The array is back to its starting values.", "info");
});

// Operation buttons
$("addrBtn").addEventListener("click", calculateAddress);
$("insBtn").addEventListener("click", () => run(insertElement).then(syncInput));
$("delBtn").addEventListener("click", () => run(deleteElement).then(syncInput));
$("linBtn").addEventListener("click", () => run(linearSearch));
$("binBtn").addEventListener("click", () => run(binarySearch));

// Tabs: show only the panel of the chosen operation
function showTab(op) {
  if (isBusy) return;                             // tabs are locked while an animation runs
  stopSort();                                     // leaving (or re-entering) a tab stops any sort
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.op === op));
  document.querySelectorAll(".panel").forEach((p) => p.classList.add("hidden"));
  $("panel-" + op).classList.remove("hidden");
  render();
  if (op === "sorting") showSortHint();
  else setStatus("Ready. Enter the values and run the operation.", "info");
}
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => showTab(tab.dataset.op));
});

// Redraw the addresses when the base address or element size changes
["addrBase", "addrSize"].forEach((id) =>
  $(id).addEventListener("input", () => { if (!isBusy && !sortFrames.length) render(); }));

// Pressing Enter in an input box clicks that panel's button
[["arrayInput", "setBtn"], ["addrBase", "addrBtn"], ["addrSize", "addrBtn"], ["addrIndex", "addrBtn"],
 ["addrLB", "addrBtn"], ["insValue", "insBtn"], ["insPos", "insBtn"], ["delPos", "delBtn"],
 ["linTarget", "linBtn"], ["binTarget", "binBtn"]].forEach(([inputId, buttonId]) =>
  $(inputId).addEventListener("keydown", (e) => { if (e.key === "Enter") $(buttonId).click(); }));

/* =========================================================
   6) SORTING ALGORITHMS
   How it works (the idea, in plain words):
   - Each sort is written as a "builder" function. It sorts a COPY of
     the array and, at every interesting moment, calls snap() to save a
     "frame": a photo of the array + which boxes to colour + a message +
     which line of the algorithm is running.
   - Afterwards the page just plays the saved frames one by one.
     That is why Play, Pause, Next and Back all work smoothly.
   ========================================================= */

// 6.1 Recorder: gives each builder a copy of the array and a snap() function
function recorder(values) {
  const a = [...values];
  const frames = [];
  // line = which pseudocode line is running (-1 = none); msg = what to tell the user
  // marks = {index: "cssClass"}; tags = {index: "label"}; aux = extra picture (temp array / buckets)
  const snap = (line, msg, marks = {}, tags = {}, aux = null) =>
    frames.push({
      arr: [...a],
      line,
      msg,
      marks: { ...marks },
      tags: { ...tags },
      aux: aux ? JSON.parse(JSON.stringify(aux)) : null,   // deep copy so later changes don't leak in
    });
  return { a, frames, snap };
}

// Give boxes from..to the same colour class. Returns the marks object.
function mark(marks, from, to, cls) {
  for (let k = from; k <= to; k++) marks[k] = cls;
  return marks;
}

// 6.2 SELECTION SORT: find the smallest, put it first, repeat
function buildSelection(values) {
  const { a, frames, snap } = recorder(values);
  const n = a.length;
  snap(-1, "Start: the left part will be sorted, the right part is unsorted. For now nothing is sorted.");

  for (let i = 0; i < n - 1; i++) {
    let min = i;
    const done = mark({}, 0, i - 1, "sorted");           // everything left of i is final
    let tags = {};
    addTag(tags, i, "i"); addTag(tags, min, "min");
    snap(1, `Pass ${i + 1}: assume A[${i}] = ${a[i]} is the smallest of the unsorted part.`, { ...done, [i]: "source" }, tags);

    for (let j = i + 1; j < n; j++) {
      tags = {};
      addTag(tags, i, "i"); addTag(tags, min, "min"); addTag(tags, j, "j");
      snap(3, `Compare A[${j}] = ${a[j]} with the smallest so far, ${a[min]}.`, { ...done, [min]: "source", [j]: "check" }, tags);
      if (a[j] < a[min]) {
        min = j;
        tags = {};
        addTag(tags, i, "i"); addTag(tags, min, "min");
        snap(4, `${a[j]} is smaller, so the smallest is now at index ${j}.`, { ...done, [min]: "source" }, tags);
      }
    }

    if (min !== i) {
      [a[i], a[min]] = [a[min], a[i]];
      snap(5, `Swap A[${i}] and A[${min}]. ${a[i]} reaches its final place.`, { ...done, [i]: "moving", [min]: "moving" });
    } else {
      snap(5, `A[${i}] = ${a[i]} is already the smallest, so no swap is needed.`, { ...done, [i]: "sorted" });
    }
  }
  snap(-1, "Sorted! Every element has been placed.", mark({}, 0, n - 1, "sorted"));
  return frames;
}

// 6.3 BUBBLE SORT: swap neighbours that are in the wrong order; big values "bubble" to the right
function buildBubble(values) {
  const { a, frames, snap } = recorder(values);
  const n = a.length;
  snap(-1, "Start: compare neighbours and swap them if they are in the wrong order.");

  for (let pass = 0; pass < n - 1; pass++) {
    let swapped = false;
    const end = n - 1 - pass;                              // elements after 'end' are already final
    const done = mark({}, end + 1, n - 1, "sorted");
    snap(1, `Pass ${pass + 1}: no swaps so far.`, done);

    for (let j = 0; j < end; j++) {
      snap(3, `Is A[${j}] = ${a[j]} bigger than A[${j + 1}] = ${a[j + 1]}?`,
        { ...done, [j]: "check", [j + 1]: "check" }, { [j]: "j", [j + 1]: "j+1" });
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swapped = true;
        snap(4, `Yes, so swap them. ${a[j + 1]} moves one step right.`, { ...done, [j]: "moving", [j + 1]: "moving" });
      }
    }

    if (!swapped) {
      snap(5, "No swaps happened in this pass, so the array is already sorted. Stop early!", mark({}, 0, n - 1, "sorted"));
      return frames;
    }
    snap(5, `End of pass ${pass + 1}: ${a[end]} is now in its final place.`, mark({}, end, n - 1, "sorted"));
  }
  snap(-1, "Sorted!", mark({}, 0, n - 1, "sorted"));
  return frames;
}

// 6.4 INSERTION SORT: take the next card and slide it into the sorted hand on the left
function buildInsertion(values) {
  const { a, frames, snap } = recorder(values);
  const n = a.length;
  snap(-1, "Start: the first element on its own is a sorted part of size 1.", { 0: "sorted" });

  for (let i = 1; i < n; i++) {
    const key = a[i];
    let j = i - 1;
    const aux = { label: "Key (held in your hand)", values: [key] };
    snap(1, `Pick the key = A[${i}] = ${key}. Slide it into the sorted part on its left.`,
      { ...mark({}, 0, i - 1, "sorted"), [i]: "source" }, { [i]: "key" }, aux);

    while (j >= 0 && a[j] > key) {
      a[j + 1] = a[j];                                     // shift the bigger element right
      snap(4, `A[${j}] = ${a[j + 1]} is bigger than ${key}, so shift it one place right.`,
        { ...mark({}, 0, i, "sorted"), [j + 1]: "moving", [j]: "source" }, { [j]: "j" }, aux);
      j--;
    }
    if (j >= 0) {
      snap(3, `A[${j}] = ${a[j]} is not bigger than ${key}, so stop shifting.`,
        { ...mark({}, 0, i, "sorted"), [j]: "check" }, { [j]: "j" }, aux);
    } else {
      snap(3, "We reached the left end, so the key is the smallest so far.", mark({}, 0, i, "sorted"), {}, aux);
    }
    a[j + 1] = key;
    snap(5, `Place the key ${key} at index ${j + 1}. The sorted part now has ${i + 1} elements.`,
      { ...mark({}, 0, i, "sorted"), [j + 1]: "moving" });
  }
  snap(-1, "Sorted!", mark({}, 0, n - 1, "sorted"));
  return frames;
}

// 6.5 SHELL SORT: insertion sort that starts with big hops (gaps) and shrinks the gap to 1
function buildShell(values) {
  const { a, frames, snap } = recorder(values);
  const n = a.length;
  snap(-1, "Start: we will insertion-sort elements that are far apart first, then closer and closer.");

  for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
    snap(1, `New round with gap = ${gap}: elements ${gap} places apart are sorted among themselves.`);

    for (let i = gap; i < n; i++) {
      const temp = a[i];
      let j = i;
      const aux = { label: `temp (gap = ${gap})`, values: [temp] };
      snap(3, `Take temp = A[${i}] = ${temp}. Compare it with the element ${gap} places to its left.`,
        { [i]: "source" }, { [i]: "i" }, aux);

      while (j >= gap && a[j - gap] > temp) {
        a[j] = a[j - gap];
        snap(5, `A[${j - gap}] = ${a[j]} is bigger than ${temp}: shift it ${gap} places right.`,
          { [j]: "moving", [j - gap]: "source" }, { [j - gap]: "j" }, aux);
        j -= gap;
      }
      if (j >= gap) {
        snap(4, `A[${j - gap}] = ${a[j - gap]} is not bigger than ${temp}, so stop.`,
          { [j - gap]: "check", [j]: "source" }, { [j - gap]: "j" }, aux);
      }
      a[j] = temp;
      snap(6, j === i ? `${temp} is already in the right spot for this gap.` : `Place temp ${temp} at index ${j}.`,
        { [j]: "moving" });
    }
    snap(7, `Round with gap = ${gap} is finished.`);
  }
  snap(-1, "Sorted! The last round (gap = 1) was a normal insertion sort on an almost-sorted array.", mark({}, 0, n - 1, "sorted"));
  return frames;
}

// 6.6 QUICK SORT: pick a pivot, put smaller values on its left and bigger on its right, repeat on both sides
function buildQuick(values) {
  const { a, frames, snap } = recorder(values);
  const n = a.length;
  const finished = new Set();                              // indexes that are in their final place

  // colours for a range [low..high]: outside the range is dimmed, finished elements are green
  const base = (low, high) => {
    const m = {};
    for (let k = 0; k < n; k++) m[k] = finished.has(k) ? "sorted" : (k < low || k > high ? "out" : "");
    return m;
  };

  function partition(low, high) {
    const pivot = a[high];
    let i = low - 1;                                       // i marks the end of the "smaller than pivot" zone
    snap(6, `Partition A[${low}..${high}]: use the last element, ${pivot}, as the pivot.`,
      { ...base(low, high), [high]: "pivot" }, { [high]: "P" });

    for (let j = low; j < high; j++) {
      let tags = {};
      addTag(tags, high, "P"); if (i >= low) addTag(tags, i, "i"); addTag(tags, j, "j");
      snap(8, `Is A[${j}] = ${a[j]} smaller than the pivot ${pivot}?`,
        { ...base(low, high), [high]: "pivot", [j]: "check" }, tags);

      if (a[j] < pivot) {
        i++;
        tags = {};
        addTag(tags, high, "P"); addTag(tags, i, "i"); addTag(tags, j, "j");
        if (i !== j) {
          [a[i], a[j]] = [a[j], a[i]];
          snap(9, `Yes: move i to ${i} and swap A[${i}] with A[${j}].`,
            { ...base(low, high), [high]: "pivot", [i]: "moving", [j]: "moving" }, tags);
        } else {
          snap(9, `Yes: it is already next to the smaller values (i = ${i}), so no swap is needed.`,
            { ...base(low, high), [high]: "pivot", [i]: "moving" }, tags);
        }
      }
    }

    [a[i + 1], a[high]] = [a[high], a[i + 1]];             // put the pivot between the two zones
    finished.add(i + 1);
    snap(10, `Put the pivot ${pivot} at index ${i + 1}: smaller values are on its left, bigger on its right. It is final!`,
      { ...base(low, high), [i + 1]: "pivot" });
    return i + 1;
  }

  function quick(low, high) {
    if (low > high) return;
    if (low === high) {
      finished.add(low);
      snap(1, `A[${low}..${high}] has only one element (${a[low]}), so it is already in place.`, base(low, high));
      return;
    }
    const p = partition(low, high);
    quick(low, p - 1);
    quick(p + 1, high);
  }

  snap(-1, "Start: choose a pivot, split the array around it, then sort each side the same way.");
  quick(0, n - 1);
  snap(-1, "Sorted!", mark({}, 0, n - 1, "sorted"));
  return frames;
}

// 6.7 MERGE SORT: split in halves, sort each half, then merge the two sorted halves
function buildMerge(values) {
  const { a, frames, snap } = recorder(values);
  const n = a.length;

  // dim everything outside [lo..hi]
  const inRange = (lo, hi) => {
    const m = {};
    for (let k = 0; k < n; k++) if (k < lo || k > hi) m[k] = "out";
    return m;
  };

  function merge(lo, mid, hi) {
    const temp = [];
    let i = lo, j = mid + 1;
    const aux = () => ({ label: `Temp: merged so far (${temp.length} of ${hi - lo + 1})`, values: temp });

    while (i <= mid && j <= hi) {
      const m = inRange(lo, hi);
      const tags = {};
      addTag(tags, i, "i"); addTag(tags, j, "j");
      const takeLeft = a[i] <= a[j];                       // on a tie take the left one: keeps the sort stable
      const chosen = takeLeft ? i : j;
      const other = takeLeft ? j : i;
      m[other] = "check"; m[chosen] = "moving";
      temp.push(a[chosen]);
      snap(8, `Compare ${a[i]} (left) with ${a[j]} (right). ${a[chosen]} is ${a[i] === a[j] ? "equal, so we take the left one" : "smaller"}: copy it to temp.`, m, tags, aux());
      if (takeLeft) i++; else j++;
    }
    while (i <= mid) {
      const m = inRange(lo, hi); m[i] = "moving";
      temp.push(a[i]);
      snap(9, `The right half is empty, so copy the leftover ${a[i]} from the left half.`, m, { [i]: "i" }, aux());
      i++;
    }
    while (j <= hi) {
      const m = inRange(lo, hi); m[j] = "moving";
      temp.push(a[j]);
      snap(9, `The left half is empty, so copy the leftover ${a[j]} from the right half.`, m, { [j]: "j" }, aux());
      j++;
    }
    for (let k = 0; k < temp.length; k++) a[lo + k] = temp[k];
    snap(10, `Copy temp back into A[${lo}..${hi}]. This part is now sorted.`,
      { ...inRange(lo, hi), ...mark({}, lo, hi, "sorted") }, {}, aux());
  }

  function sort(lo, hi) {
    if (lo >= hi) return;
    const mid = Math.floor((lo + hi) / 2);
    const m = inRange(lo, hi);
    mark(m, lo, mid, "check");                             // left half = blue
    mark(m, mid + 1, hi, "source");                        // right half = amber
    const tags = {};
    addTag(tags, lo, "lo"); addTag(tags, mid, "mid"); addTag(tags, hi, "hi");
    snap(2, `Split A[${lo}..${hi}] at mid = ${mid}: left half A[${lo}..${mid}] (blue), right half A[${mid + 1}..${hi}] (amber).`, m, tags);
    sort(lo, mid);
    sort(mid + 1, hi);
    merge(lo, mid, hi);
  }

  snap(-1, "Start: keep splitting the array in halves until each piece has one element, then merge the pieces back in order.");
  sort(0, n - 1);
  snap(-1, "Sorted!", mark({}, 0, n - 1, "sorted"));
  return frames;
}

// 6.8 RADIX SORT (LSD): sort by the last digit, then the tens digit, then hundreds... using 10 buckets
function buildRadix(values) {
  const { a, frames, snap } = recorder(values);
  const n = a.length;
  const max = Math.max(...a);
  const names = ["ones", "tens", "hundreds", "thousands"];
  snap(-1, `Start: the biggest number is ${max}, so we need ${String(max).length} pass(es): one for each digit.`);

  for (let place = 1, pass = 0; Math.floor(max / place) > 0; place *= 10, pass++) {
    const name = names[pass];
    const buckets = Array.from({ length: 10 }, () => []);
    const label = `Buckets for the ${name} digit`;
    snap(1, `Pass ${pass + 1}: look only at the ${name} digit of each number.`, {}, {}, { label, buckets });

    // Step 1: drop every number into the bucket that matches its digit (left to right)
    for (let k = 0; k < n; k++) {
      const d = Math.floor(a[k] / place) % 10;
      buckets[d].push(a[k]);
      snap(2, `${a[k]}: the ${name} digit is ${d}, so it goes into bucket ${d}.`,
        { [k]: "check" }, { [k]: "digit " + d }, { label, buckets, active: d });
    }

    // Step 2: read the buckets 0..9 in order and write the numbers back into the array
    let pos = 0;
    for (let b = 0; b < 10; b++) {
      if (!buckets[b].length) continue;
      const start = pos;
      for (const v of buckets[b]) a[pos++] = v;
      snap(3, `Read bucket ${b} from the front: ${buckets[b].join(", ")} go back into the array.`,
        mark({}, start, pos - 1, "moving"), {}, { label, buckets, active: b });
    }
    snap(3, `Pass ${pass + 1} done: the array is now sorted by the ${name} digit.`, {}, {}, { label, buckets, active: -1 });
  }
  snap(-1, "Sorted! After the last digit pass, everything is in order.", mark({}, 0, n - 1, "sorted"));
  return frames;
}

// 6.9 The text shown for each sort: idea, analogy, steps, complexity and the algorithm.
// "code" lines are pseudocode. The 4 leading spaces = one level of indentation.
// The line numbers used in the builders above (snap(line, ...)) match the positions in these lists.
const SORTS = {
  selection: {
    name: "Selection sort",
    build: buildSelection,
    idea: "Repeatedly find the smallest value in the unsorted part and swap it into the next free place at the front.",
    analogy: "Like lining up classmates by height: scan the whole line, pull out the shortest student and send them to the front, then repeat for everyone left.",
    how: [
      "Think of the array as two parts: sorted (left, empty at first) and unsorted (right).",
      "Scan the unsorted part to find its smallest element.",
      "Swap that element with the first unsorted element.",
      "The sorted part grows by one. Repeat until only one element is left.",
    ],
    best: "O(n²)", avg: "O(n²)", worst: "O(n²)", space: "O(1)", stable: "No",
    note: "It makes at most n − 1 swaps, which helps when writing to memory is expensive. But it always does about n²/2 comparisons, even if the array is already sorted.",
    code: [
      "for i = 0 to n-2",
      "    min = i",
      "    for j = i+1 to n-1",
      "        if A[j] < A[min]",
      "            min = j",
      "    swap A[i] and A[min]",
    ],
  },

  bubble: {
    name: "Bubble sort",
    build: buildBubble,
    idea: "Compare neighbours and swap them when they are in the wrong order. After each pass the biggest unsorted value has bubbled to the right end.",
    analogy: "Like bubbles in a fizzy drink: the biggest bubbles rise to the top first.",
    how: [
      "Compare A[0] with A[1] and swap them if the left one is bigger.",
      "Move one step right and repeat until the end of the unsorted part.",
      "The largest value is now in its final place at the right end.",
      "Repeat with a shorter range. Stop as soon as a whole pass makes no swap.",
    ],
    best: "O(n)", avg: "O(n²)", worst: "O(n²)", space: "O(1)", stable: "Yes",
    note: "Easy to understand but slow on big arrays. The “no swaps” check makes it fast (O(n)) on data that is already sorted or nearly sorted.",
    code: [
      "repeat",
      "    swapped = false",
      "    for j = 0 to (last unsorted index) - 1",
      "        if A[j] > A[j+1]",
      "            swap A[j] and A[j+1]; swapped = true",
      "until swapped is false",
    ],
  },

  insertion: {
    name: "Insertion sort",
    build: buildInsertion,
    idea: "Take the next element (the key) and slide it left into its correct place inside the part that is already sorted.",
    analogy: "Like sorting playing cards in your hand: pick up a new card and slot it between the right two cards.",
    how: [
      "The first element on its own counts as a sorted part.",
      "Pick the next element as the key.",
      "Shift every bigger sorted element one place to the right.",
      "Drop the key into the gap. Repeat until the last element is placed.",
    ],
    best: "O(n)", avg: "O(n²)", worst: "O(n²)", space: "O(1)", stable: "Yes",
    note: "Excellent for small or nearly sorted arrays. Many real sorting libraries use it for tiny pieces inside faster sorts.",
    code: [
      "for i = 1 to n-1",
      "    key = A[i]",
      "    j = i - 1",
      "    while j >= 0 and A[j] > key",
      "        A[j+1] = A[j]; j = j - 1",
      "    A[j+1] = key",
    ],
  },

  quick: {
    name: "Quick sort",
    build: buildQuick,
    idea: "Pick a pivot and partition the array: smaller values go to its left, bigger values to its right. The pivot is then in its final place. Sort each side the same way.",
    analogy: "Like choosing a captain, asking everyone shorter to stand on the left and everyone taller on the right, then repeating inside each group.",
    how: [
      "Choose a pivot (here: the last element of the range).",
      "Scan with j. Whenever A[j] is smaller than the pivot, move it into the “smaller” zone with a swap.",
      "Swap the pivot into the gap between the two zones. It is now final.",
      "Recursively quick-sort the left part and the right part.",
    ],
    best: "O(n log n)", avg: "O(n log n)", worst: "O(n²)", space: "O(log n)", stable: "No",
    note: "Usually the fastest comparison sort in practice. A bad pivot (like the last element of an already sorted array) causes the O(n²) worst case; random or median-of-three pivots avoid it. The extra space is the recursion stack.",
    code: [
      "quickSort(A, low, high)",
      "    if low < high",
      "        p = partition(A, low, high)",
      "        quickSort(A, low, p-1)",
      "        quickSort(A, p+1, high)",
      "partition(A, low, high)",
      "    pivot = A[high]; i = low - 1",
      "    for j = low to high-1",
      "        if A[j] < pivot",
      "            i = i + 1; swap A[i] and A[j]",
      "    swap A[i+1] and A[high]; return i+1",
    ],
  },

  merge: {
    name: "Merge sort",
    build: buildMerge,
    idea: "Split the array into halves until single elements remain, then merge pairs of sorted halves into bigger sorted halves.",
    analogy: "Like two sorted piles of exam papers: look at the top paper of each pile and always take the one with the lower roll number.",
    how: [
      "Split the array in the middle.",
      "Sort the left half and the right half (recursively).",
      "Merge: compare the front elements of both halves and copy the smaller one into a temp array.",
      "Copy the temp array back. Repeat while merging bigger and bigger pieces.",
    ],
    best: "O(n log n)", avg: "O(n log n)", worst: "O(n log n)", space: "O(n)", stable: "Yes",
    note: "Always O(n log n) and stable, which is why it is used for linked lists and very large files. The price is the extra temp array.",
    code: [
      "mergeSort(A, lo, hi)",
      "    if lo >= hi: return",
      "    mid = (lo + hi) / 2",
      "    mergeSort(A, lo, mid)",
      "    mergeSort(A, mid+1, hi)",
      "    merge(A, lo, mid, hi)",
      "merge(A, lo, mid, hi)",
      "    i = lo; j = mid+1; temp = []",
      "    while i <= mid and j <= hi: put the smaller of A[i], A[j] into temp",
      "    copy the leftovers of either half into temp",
      "    copy temp back into A[lo..hi]",
    ],
  },

  shell: {
    name: "Shell sort",
    build: buildShell,
    idea: "An improved insertion sort. It first sorts elements that are far apart (a big gap), then shrinks the gap until it reaches 1.",
    analogy: "Like tidying a bookshelf: first fix the books that are very far out of place with big moves, then fine-tune the neighbours.",
    how: [
      "Start with gap = n / 2.",
      "Insertion-sort all elements that are gap places apart.",
      "Halve the gap and repeat.",
      "When gap = 1 it is a normal insertion sort, but the array is almost sorted by then, so it is quick.",
    ],
    best: "O(n log n)", avg: "depends on gaps", worst: "O(n²)", space: "O(1)", stable: "No",
    note: "It moves elements long distances early on, so it beats plain insertion sort on medium-sized arrays. Its speed depends on the gap sequence; the simple n/2, n/4, … sequence used here has an O(n²) worst case.",
    code: [
      "gap = n / 2",
      "while gap > 0",
      "    for i = gap to n-1",
      "        temp = A[i]; j = i",
      "        while j >= gap and A[j-gap] > temp",
      "            A[j] = A[j-gap]; j = j - gap",
      "        A[j] = temp",
      "    gap = gap / 2",
    ],
  },

  radix: {
    name: "Radix sort",
    build: buildRadix,
    idea: "Sort numbers digit by digit, from the last digit to the first, using 10 buckets (0 to 9) each time. It never compares two numbers with each other.",
    analogy: "Like a post office sorting letters by PIN code: first by the last digit, then the next one, and so on, until the PIN codes are in order.",
    how: [
      "Find the biggest number to know how many digits (d) to process.",
      "Pass 1: put every number in the bucket of its ones digit, then read buckets 0 to 9 back in order.",
      "Pass 2: do the same with the tens digit (then hundreds, and so on).",
      "Reading each bucket from the front keeps the earlier order, so after d passes the array is sorted.",
    ],
    best: "O(d·(n+k))", avg: "O(d·(n+k))", worst: "O(d·(n+k))", space: "O(n+k)", stable: "Yes",
    note: "d = number of digits, k = 10 buckets. Very fast when numbers have few digits. Here it works on non-negative whole numbers (negative numbers need extra handling).",
    code: [
      "find the biggest number: it has d digits",
      "for each digit place (ones, tens, ...)",
      "    put every number into bucket[its digit]",
      "    read buckets 0..9 in order back into A",
      "after d passes A is sorted",
    ],
  },
};

/* ---------- 6.10 Playback engine ---------- */
let sortKind = "selection";     // which sort is selected
let sortFrames = [];            // the recorded frames for the current run (empty = not started)
let sortPos = -1;               // index of the frame being shown
let sortTimer = null;           // timer id used by Play
let sortPlaying = false;        // true while Play is running

// Delay between frames (uses the same speed slider as the other operations)
function sortDelay() { return 1000 - Number($("speed").value) * 90; }

// Show the extra picture (temp array or buckets) under the main array
function renderAux(aux) {
  const box = $("auxView");
  box.innerHTML = "";
  if (!aux) { box.classList.add("hidden"); return; }
  box.classList.remove("hidden");

  const title = document.createElement("div");
  title.className = "aux-title";
  title.textContent = aux.label;
  box.appendChild(title);

  if (aux.buckets) {                                   // radix sort: 10 buckets
    const grid = document.createElement("div");
    grid.className = "buckets";
    aux.buckets.forEach((items, b) => {
      const col = document.createElement("div");
      col.className = "bucket" + (b === aux.active ? " active" : "");
      const head = document.createElement("div");
      head.className = "bucket-head";
      head.textContent = b;
      col.appendChild(head);
      items.forEach((v) => {
        const chip = document.createElement("div");
        chip.className = "chip";
        chip.textContent = v;
        col.appendChild(chip);
      });
      grid.appendChild(col);
    });
    box.appendChild(grid);
  } else {                                             // temp array / key
    const row = document.createElement("div");
    row.className = "aux-row";
    aux.values.forEach((v) => {
      const b = document.createElement("div");
      b.className = "box mini";
      b.textContent = v;
      row.appendChild(b);
    });
    if (!aux.values.length) row.textContent = "(empty)";
    box.appendChild(row);
  }
}

// Turn the Play / Back / Next buttons on or off to match the current state
function updateControls() {
  const has = sortFrames.length > 0;
  const atEnd = has && sortPos >= sortFrames.length - 1;
  $("sortPlay").textContent = sortPlaying ? "Pause" : (atEnd ? "Replay" : "Play");
  $("sortBack").disabled = !has || sortPos <= 0;
  $("sortNext").disabled = atEnd;
  $("sortRestart").disabled = !has;
  if (!has) $("sortCounter").textContent = "Not started";
}

// Show one saved frame: the array, the extra picture, the highlighted code line and the messages
function showFrame(i) {
  sortPos = i;
  const f = sortFrames[i];
  const last = i === sortFrames.length - 1;

  render(f.marks, f.tags, f.arr);
  renderAux(f.aux);
  document.querySelectorAll("#sortCode li").forEach((li, k) => li.classList.toggle("active", k === f.line));
  setStatus(f.msg, last ? "success" : "info");

  // the Steps list shows every message up to this frame
  const list = $("steps");
  list.innerHTML = "";
  for (let k = 0; k <= i; k++) {
    const li = document.createElement("li");
    li.textContent = sortFrames[k].msg;
    list.appendChild(li);
  }
  list.scrollTop = list.scrollHeight;

  $("sortCounter").textContent = `Step ${i + 1} of ${sortFrames.length}`;
  if (last) {
    sortPlaying = false;
    clearTimeout(sortTimer);
    celebrate(f.arr.length - 1);
  }
  updateControls();
}

// Record the frames the first time the user presses Play or Next
function ensureFrames() {
  if (sortFrames.length) return true;
  if (arr.length < 2) {
    setStatus("Add at least 2 numbers to the array first.", "error");
    return false;
  }
  if (sortKind === "radix" && arr.some((v) => v < 0)) {
    setStatus("Radix sort here works on non-negative numbers. Remove the negative values or pick another sort.", "error");
    return false;
  }
  sortFrames = SORTS[sortKind].build(arr);              // sorts a COPY, so the real array is not changed
  sortPos = -1;
  return true;
}

// Play: show the next frame every few hundred milliseconds
function tick() {
  clearTimeout(sortTimer);
  if (!sortPlaying) return;
  sortTimer = setTimeout(() => {
    if (!sortPlaying) return;
    showFrame(sortPos + 1);
    if (sortPlaying) tick();
  }, sortDelay());
}
function playSort() {
  if (!ensureFrames()) return;
  if (sortPos < 0 || sortPos >= sortFrames.length - 1) showFrame(0);   // first play or replay
  sortPlaying = true;
  updateControls();
  tick();
}
function pauseSort() {
  sortPlaying = false;
  clearTimeout(sortTimer);
  updateControls();
}
function stepSort(dir) {                                // dir = +1 (Next) or -1 (Back)
  if (!ensureFrames()) return;
  pauseSort();
  const next = Math.min(Math.max(sortPos + dir, 0), sortFrames.length - 1);
  showFrame(next);
}

// Stop everything and forget the recorded frames (used when the array or tab changes)
function stopSort() {
  clearTimeout(sortTimer);
  const had = sortFrames.length > 0;
  sortPlaying = false;
  sortFrames = [];
  sortPos = -1;
  renderAux(null);
  document.querySelectorAll("#sortCode li.active").forEach((li) => li.classList.remove("active"));
  if (had) resetSteps();
  updateControls();
}

/* ---------- 6.11 Choosing a sort (the links) ---------- */

// Fill the explanation, complexity table and algorithm for the chosen sort
function selectSort(kind) {
  sortKind = kind;
  stopSort();
  const s = SORTS[kind];

  document.querySelectorAll(".sort-links a").forEach((a) => {
    if (a.dataset.sort === kind) a.setAttribute("aria-current", "true");
    else a.removeAttribute("aria-current");
  });

  $("sortName").textContent = s.name;
  $("sortIdea").textContent = s.idea;
  $("sortAnalogy").textContent = s.analogy;
  $("sortNote").textContent = s.note;
  $("cxBest").textContent = s.best;
  $("cxAvg").textContent = s.avg;
  $("cxWorst").textContent = s.worst;
  $("cxSpace").textContent = s.space;
  $("cxStable").textContent = s.stable;

  const how = $("sortHow");
  how.innerHTML = "";
  s.how.forEach((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    how.appendChild(li);
  });

  const code = $("sortCode");
  code.innerHTML = "";
  s.code.forEach((line) => {
    const li = document.createElement("li");
    const c = document.createElement("code");
    const indent = line.length - line.trimStart().length;
    c.style.marginLeft = indent * 0.5 + "em";           // show indentation
    c.textContent = line.trimStart();
    li.appendChild(c);
    code.appendChild(li);
  });

  render();
  setStatus(`${s.name}: press Play to watch it, or Next to go one step at a time.`, "info");
}

// When the Sorting tab opens: show the chosen sort and warn if the array is already sorted
function showSortHint() {
  selectSort(sortKind);
  if (arr.length >= 2 && isSorted(arr)) {
    setStatus("Your array is already sorted, so there is little to see. Click \"Random array\" for a better demo.", "warning");
  }
}

// The links change the address (#sort-quick, ...) so a sort can be shared or bookmarked
document.querySelectorAll(".sort-links a").forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    try { history.replaceState(null, "", "#sort-" + a.dataset.sort); } catch (err) { /* ignore on restricted pages */ }
    selectSort(a.dataset.sort);
  });
});

// Open the right sort when the page loads with an address like index.html#sort-merge
function openFromHash() {
  const m = /^#sort-(\w+)$/.exec(location.hash);
  if (!m || !SORTS[m[1]] || isBusy) return;
  sortKind = m[1];
  showTab("sorting");
}
window.addEventListener("hashchange", openFromHash);

/* ---------- 6.12 Sorting buttons ---------- */
$("sortPlay").addEventListener("click", () => (sortPlaying ? pauseSort() : playSort()));
$("sortNext").addEventListener("click", () => stepSort(1));
$("sortBack").addEventListener("click", () => stepSort(-1));
$("sortRestart").addEventListener("click", () => {      // go back to the unsorted array
  stopSort();
  render();
  setStatus("Back at the start. Press Play or Next.", "info");
});
$("sortRandom").addEventListener("click", () => {       // 8 different random numbers from 5 to 99
  stopSort();
  const pool = new Set();
  while (pool.size < 8) pool.add(5 + Math.floor(Math.random() * 95));
  arr = [...pool];
  syncInput();
  resetSteps();
  render();
  setStatus("New random array. Press Play to sort it.", "info");
});

/* ---------- Start-up: draw the array when the page loads ---------- */
render();
setStatus("Ready. Pick an operation below.", "info");
updateControls();
openFromHash();
