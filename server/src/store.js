import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildSeed } from "./seed.js";
import { audit, uid } from "./ids.js";

export { audit, uid };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(__dirname, "..", "data", "store.json");

let state = null;

export function load() {
  if (state) return state;
  if (fs.existsSync(dataFile)) {
    state = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    return state;
  }
  state = buildSeed();
  persist();
  return state;
}

export function persist() {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  fs.writeFileSync(dataFile, JSON.stringify(state, null, 2));
}

export function resetState() {
  state = buildSeed();
  persist();
  return state;
}

export function findTxn(stateRef, id) {
  return stateRef.transactions.find((t) => t.id === id || t.displayId === id);
}

export function findCustomer(stateRef, id) {
  return stateRef.customers.find((c) => c.id === id);
}
