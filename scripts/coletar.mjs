// Coleta vagas dos quadros configurados em config.json e grava dados/brutas.json.
// Só entra o que tem data de publicação confirmada dentro da janela. Cada fonte registra se respondeu.
// Requer Node 18+ (fetch nativo). Não envia nenhum dado pessoal: só faz leituras públicas.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(fs.readFileSync(path.join(raiz, "config.json"), "utf8"));
const agora = Date.now();
const limite = agora - cfg.janelaHoras * 36e5;
const reTit = new RegExp(cfg.filtroTitulo, "i");
const reExc = new RegExp(cfg.excluirTitulo, "i");
const fontes = [], vagas = [], semData = [];
const limpar = (h) => String(h || "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&nbsp;/g, " ")
  .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 7000);

async function baixar(url, tipo = "json") {
  const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (radar-vagas; uso pessoal)", accept: tipo === "json" ? "application/json" : "text/html" }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return tipo === "json" ? r.json() : r.text();
}
const preDescartadas = [];
const reLocal = cfg.local?.filtroTitulo ? new RegExp(cfg.local.filtroTitulo, "i") : reTit;
const ehLocal = (v) => cfg.local?.cidade && new RegExp(cfg.local.cidade.normalize("NFD").replace(/[\u0300-\u036f]/g, ""), "i").test(String(v.local || "").normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
function registrar(v) {
  if (!(v.buscaLocal ? reLocal : reTit).test(v.titulo) || reExc.test(v.titulo)) return false;
  if (!v.motivoPre && v.fonte !== "Gupy" && v.fonte !== "Remotar") {
    const onde = `${v.local || ""} ${v.modalidade || ""}`;
    if (/h[ií]brid|hybrid|presencial|on-?site/i.test(onde) && !/remot/i.test(onde) && !ehLocal(v)) v.motivoPre = "Não é 100% remota (informado pelo quadro da empresa).";
  }
  if (v.motivoPre) {
    const t0 = new Date(v.publicadoEm).getTime();
    if (!Number.isNaN(t0) && t0 >= limite) preDescartadas.push({ empresa: v.empresa, cargo: v.titulo, fonte: v.fonte, data: new Date(t0).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }), link: v.url, motivo: v.motivoPre });
    return false;
  }
  const t = v.publicadoEm ? new Date(v.publicadoEm).getTime() : NaN;
  if (Number.isNaN(t)) { semData.push(v); return false; }
  if (t < limite) return false;
  vagas.push({ ...v, publicadoEm: new Date(t).toISOString(), horasAtras: Math.round((agora - t) / 36e5) });
  return true;
}
async function fonte(nome, url, fn) {
  const f = { nome, url, ok: false, total: 0, naJanela: 0 };
  try { await fn(f); f.ok = true; } catch (e) { f.erro = String(e.cause?.code || e.message || e); }
  fontes.push(f);
  console.log(`${f.ok ? "ok   " : "FALHA"} ${nome} total=${f.total} janela=${f.naJanela}${f.erro ? " erro=" + f.erro : ""}`);
}
function andar(o, achar) {
  if (Array.isArray(o)) o.forEach((x) => andar(x, achar));
  else if (o && typeof o === "object") { if ("publishedDate" in o && (o.name || o.title)) achar(o); Object.values(o).forEach((x) => andar(x, achar)); }
}

const s = cfg.fontes;
if (cfg.local?.cidade) {
  const enc = encodeURIComponent;
  const url = `https://portal.gupy.io/job-search/state=${enc(cfg.local.estado)}&city%5B%5D=${enc(cfg.local.cidade)}&sortBy=publishedDate`;
  await fonte(`gupy:${cfg.local.cidade} (presencial/híbrido)`, url, async (f) => {
    const html = await baixar(url, "html");
    const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!m) throw new Error("__NEXT_DATA__ não encontrado (a página mudou?)");
    andar(JSON.parse(m[1]), (j) => {
      f.total++;
      if (registrar({ fonte: "Gupy", buscaLocal: true, empresa: j.careerPageName || j.companyName || "?", titulo: j.name || j.title, url: j.jobUrl || j.url, publicadoEm: j.publishedDate,
        local: [j.city, j.state].filter(Boolean).join(" - ") || cfg.local.cidade, modalidade: j.workplaceType || "", tipo: j.type || "" })) f.naJanela++;
    });
  });
}
for (const termo of s.gupy?.termos ?? []) {
  const url = `https://portal.gupy.io/job-search/term=${encodeURIComponent(termo)}${s.gupy.apenasRemoto ? "&workplaceTypes[]=remote" : ""}&sortBy=publishedDate`;
  await fonte(`gupy:${termo}`, url, async (f) => {
    const html = await baixar(url, "html");
    const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!m) throw new Error("__NEXT_DATA__ não encontrado (a página mudou?)");
    andar(JSON.parse(m[1]), (j) => {
      f.total++;
      if (registrar({ fonte: "Gupy", empresa: j.careerPageName || j.companyName || "?", titulo: j.name || j.title, url: j.jobUrl || j.url, publicadoEm: j.publishedDate,
        local: [j.city, j.state, j.country].filter(Boolean).join(" - "), modalidade: j.workplaceType || (j.isRemoteWork ? "remote" : ""), tipo: j.type || "" })) f.naJanela++;
    });
  });
}
for (const b of s.greenhouse ?? []) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${b}/jobs?content=true`;
  await fonte(`greenhouse:${b}`, url, async (f) => {
    for (const j of (await baixar(url)).jobs ?? []) { f.total++;
      if (registrar({ fonte: "Greenhouse", empresa: b, titulo: j.title, url: j.absolute_url, publicadoEm: j.first_published, local: j.location?.name || "", descricao: limpar(j.content) })) f.naJanela++; }
  });
}
for (const [lista, agregador] of [[s.lever ?? [], false], [s.leverAgregadores ?? [], true]]) {
  for (const b of lista) {
    const url = `https://api.lever.co/v0/postings/${b}?mode=json${agregador ? "&location=Brazil" : ""}`;
    await fonte(`lever:${b}`, url, async (f) => {
      for (const j of await baixar(url)) { f.total++;
        if (registrar({ fonte: "Lever", empresa: agregador ? "empresa não identificada" : b, agregador: agregador ? b : undefined, titulo: j.text, url: j.hostedUrl, publicadoEm: j.createdAt,
          local: j.categories?.location || "", modalidade: j.workplaceType || "",
          descricao: limpar([j.descriptionPlain, ...(j.lists || []).map((l) => l.text + " " + l.content), j.additionalPlain].join(" ")) })) f.naJanela++; }
    });
  }
}
for (const termo of s.remotar?.termos ?? []) {
  const url = `https://api.remotar.com.br/jobs?search=${encodeURIComponent(termo)}`;
  await fonte(`remotar:${termo}`, url, async (f) => {
    for (const j of (await baixar(url)).data ?? []) {
      f.total++;
      const tags = (j.jobTags ?? []).map((x) => String(x.tag?.name || ""));
      const tem = (re) => tags.some((t) => re.test(t));
      const motivoPre = tem(/inglês|espanhol/i) ? "Exige outro idioma (etiqueta do Remotar)."
        : tem(/internacional/i) ? "Vaga internacional (etiqueta do Remotar)."
        : (tem(/híbrida|presencial/i) || (j.type && j.type !== "remote")) && !ehLocal({ local: [j.city, j.state].join(" ") }) ? "Não é 100% remota (etiqueta do Remotar)."
        : tem(/sênior|pleno/i) && !tem(/júnior/i) ? "Nível pleno ou sênior (etiqueta do Remotar)." : "";
      if (registrar({ fonte: "Remotar", empresa: j.company?.name || j.companyDisplayName || "empresa não identificada", titulo: j.title, url: j.externalLink || `https://remotar.com.br/job/${j.id}`,
        publicadoEm: j.createdAt, local: [j.city, j.state].filter(Boolean).join(" - ") || "Remoto", modalidade: j.type || "remote", descricao: limpar(j.description), motivoPre })) f.naJanela++;
    }
  });
}
for (const b of s.ashby ?? []) {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${b}`;
  await fonte(`ashby:${b}`, url, async (f) => {
    for (const j of (await baixar(url)).jobs ?? []) { f.total++;
      if (registrar({ fonte: "Ashby", empresa: b, titulo: j.title, url: j.jobUrl, publicadoEm: j.publishedAt, local: j.location || "", modalidade: j.isRemote ? "remote" : "", descricao: limpar(j.descriptionPlain || j.descriptionHtml) })) f.naJanela++; }
  });
}

// remove repetidas (mesma URL, ou mesmo título + empresa)
const vistos = new Set();
const chave = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const ordemFonte = { Gupy: 0, Greenhouse: 1, Lever: 1, Ashby: 1, Remotar: 2 }; // prefere o link direto da empresa
vagas.sort((a, b) => (ordemFonte[a.fonte] ?? 3) - (ordemFonte[b.fonte] ?? 3));
const unicas = vagas.filter((v) => { const k = chave(v.empresa) + "|" + chave(v.titulo); if (vistos.has(k)) return false; vistos.add(k); return true; });
unicas.sort((a, b) => new Date(b.publicadoEm) - new Date(a.publicadoEm));
const vistosPre = new Set(unicas.map((v) => chave(v.empresa) + "|" + chave(v.titulo)));
const preUnicas = preDescartadas.filter((d) => { const k = chave(d.empresa) + "|" + chave(d.cargo); if (vistosPre.has(k)) return false; vistosPre.add(k); return true; });
fs.mkdirSync(path.join(raiz, "dados"), { recursive: true });
fs.writeFileSync(path.join(raiz, "dados/brutas.json"), JSON.stringify({ geradoEm: new Date(agora).toISOString(), janelaHoras: cfg.janelaHoras, fontes, vagas: unicas, semDataConfirmada: semData, preDescartadas: preUnicas }, null, 2));
const okN = fontes.filter((f) => f.ok).length;
console.log(`\n${unicas.length} vaga(s) na janela; ${semData.length} sem data; ${okN}/${fontes.length} fontes responderam.`);
if (okN === 0) { console.error("Nenhuma fonte respondeu."); process.exit(2); }
