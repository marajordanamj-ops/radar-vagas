// Testa quadros de vagas candidatos e mostra quais respondem e quantas vagas da área têm.
// Não usa o Gemini nem publica nada. Uso: node scripts/testar_fontes.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(fs.readFileSync(path.join(raiz, "config.json"), "utf8"));
const cand = JSON.parse(fs.readFileSync(path.join(raiz, "scripts/fontes_candidatas.json"), "utf8"));
const area = new RegExp(cfg.filtroTitulo, "i"), fora = new RegExp(cfg.excluirTitulo, "i");
const br = /bra[sz]il|remot|são paulo|sao paulo|latam|latin|anywhere|curitiba|belo horizonte|florian|porto alegre|recife|rio de janeiro/i;
const get = async (u) => { const r = await fetch(u, { headers: { "user-agent": "Mozilla/5.0 (radar-vagas; uso pessoal)", accept: "application/json" }, signal: AbortSignal.timeout(25000) }); if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); };
const linhas = [];
async function teste(plat, slug, fn) {
  try { const vagas = await fn(); const daArea = vagas.filter((v) => area.test(v.t) && !fora.test(v.t)); const noBr = daArea.filter((v) => br.test(v.l || ""));
    linhas.push(`${plat.padEnd(10)} ${slug.padEnd(26)} ok  total=${String(vagas.length).padStart(4)} area=${String(daArea.length).padStart(3)} area+BR/remoto=${noBr.length}  ${noBr.slice(0, 3).map((v) => v.t + " [" + v.l + "]").join(" | ")}`); }
  catch (e) { linhas.push(`${plat.padEnd(10)} ${slug.padEnd(26)} --  ${e.message}`); }
}
await Promise.all([
  ...cand.greenhouse.map((s) => teste("greenhouse", s, async () => (await get(`https://boards-api.greenhouse.io/v1/boards/${s}/jobs`)).jobs.map((j) => ({ t: j.title, l: j.location?.name })))),
  ...cand.lever.map((s) => teste("lever", s, async () => (await get(`https://api.lever.co/v0/postings/${s}?mode=json`)).map((j) => ({ t: j.text, l: [j.categories?.location, j.workplaceType].join(" ") })))),
  ...cand.ashby.map((s) => teste("ashby", s, async () => (await get(`https://api.ashbyhq.com/posting-api/job-board/${s}`)).jobs.map((j) => ({ t: j.title, l: [j.location, j.isRemote ? "remote" : ""].join(" ") })))),
  ...cand.remotar.map((s) => teste("remotar", s, async () => (await get(`https://api.remotar.com.br/jobs?search=${encodeURIComponent(s)}`)).data.map((j) => ({ t: j.title, l: "remote " + (j.jobTags || []).map((x) => x.tag?.name).join(" ") })))),
]);
console.log(linhas.sort().join("\n"));
