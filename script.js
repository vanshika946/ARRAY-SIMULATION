/* =========================================================
   Array Simulation - script.js
   Sections: 1) State  2) Helpers  3) Rendering  4) Operations
             5) Event listeners
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

// Draw all slots. marks = {index: "cssClass"}, tags = {index: "text above box"}
function render(marks = {}, tags = {}) {
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
    const empty = arr[i] === undefined;             // unused slot
    box.className = "box" + (empty ? " empty" : "") + (marks[i] ? " " + marks[i] : "");
    box.textContent = empty ? "" : arr[i];

    const index = document.createElement("div");
    index.className = "index";
    index.textContent = i;

    if (!empty && String(arr[i]).length > 3) box.classList.add("small");   // long numbers use a smaller font

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

// Set the array from the text box
$("setBtn").addEventListener("click", () => {
  const text = $("arrayInput").value.trim();
  const parts = text === "" ? [] : text.split(/[\s,]+/).filter(Boolean);   // commas or spaces

  if (parts.length > CAPACITY) return setStatus(`Too many elements. The maximum is ${CAPACITY}.`, "error");
  if (!parts.every((p) => /^-?\d+$/.test(p))) {
    return setStatus("Use whole numbers separated by commas, e.g. 5, 12, 20.", "error");
  }
  runId++;                                        // stop any running animation
  if (parts.some((p) => Number(p) < -999 || Number(p) > 9999)) {
    return setStatus("Each number must be between -999 and 9999.", "error");
  }
  arr = parts.map(Number);
  clearLog();
  render();
  setStatus(`Array set with ${arr.length} element(s).`, "success");
});

// Sort ascending (useful before binary search)
$("sortBtn").addEventListener("click", () => {
  arr.sort((a, b) => a - b);                      // "a - b" makes it numeric, not alphabetical
  $("arrayInput").value = arr.join(", ");
  render();
  setStatus("Array sorted in ascending order.", "success");
});

// Reset everything to the starting state
$("resetBtn").addEventListener("click", () => {
  runId++;                                        // cancels any animation in progress
  arr = [...DEFAULT_ARRAY];
  $("arrayInput").value = DEFAULT_ARRAY.join(", ");
  $("steps").innerHTML = '<li class="placeholder">Steps appear here when you run an operation.</li>';
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

// Keep the text box in sync after insert/delete
function syncInput() { $("arrayInput").value = arr.join(", "); }

// Tabs: show only the panel of the chosen operation
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.add("hidden"));
    tab.classList.add("active");
    $("panel-" + tab.dataset.op).classList.remove("hidden");
    render();
    setStatus("Ready. Enter the values and run the operation.", "info");
  });
});

// Redraw the addresses when the base address or element size changes
["addrBase", "addrSize"].forEach((id) =>
  $(id).addEventListener("input", () => { if (!isBusy) render(); }));

// Pressing Enter in an input box clicks that panel's button
[["arrayInput", "setBtn"], ["addrBase", "addrBtn"], ["addrSize", "addrBtn"], ["addrIndex", "addrBtn"],
 ["addrLB", "addrBtn"], ["insValue", "insBtn"], ["insPos", "insBtn"], ["delPos", "delBtn"],
 ["linTarget", "linBtn"], ["binTarget", "binBtn"]].forEach(([inputId, buttonId]) =>
  $(inputId).addEventListener("keydown", (e) => { if (e.key === "Enter") $(buttonId).click(); }));

// Draw the array when the page loads
render();
setStatus("Ready. Pick an operation below.", "info");
