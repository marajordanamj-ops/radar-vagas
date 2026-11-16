// Lê dados/brutas.json, abre cada vaga, pede a avaliação ao Gemini e grava dados/rodada.json.
// Requer GEMINI_API_KEY (segredo do repositório) e o currículo em CURRICULO_JSON (segredo) ou curriculo_base.json (local).
// Telefone e e-mail são removidos antes de qualquer envio.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ler = (p) => JSON.parse(fs.readFileSync(path.join(raiz, p), "utf8"));
const cfg = ler("config.json");
const brutas = ler("dados/brutas.json");
const CHAVE = process.env.GEMINI_API_KEY;
const API = "https://generativelanguage.googleapis.com/v1beta";
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

if (!CHAVE) throw new Error("Falta o segredo GEMINI_API_KEY no repositório.");
let cv;
if (process.env.CURRICULO_JSON) cv = JSON.parse(process.env.CURRICULO_JSON);
else if (fs.existsSync(path.join(raiz, "curriculo_base.json"))) cv = ler("curriculo_base.json");
else throw new Error("Falta o segredo CURRICULO_JSON no repositório.");
const { contato, nome, ...cvSemContato } = cv; // nome, telefone e e-mail não saem daqui

const limpar = (h) => String(h || "").replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();

// ---- descrição da vaga (quando a API de origem não trouxe)
async function descricao(v) {
  if (v.descricao && v.descricao.length > 300) return { texto: v.descricao };
  const r = await fetch(v.url, { headers: { "user-agent": "Mozilla/5.0 (radar-vagas; uso pessoal)" }, redirect: "follow", signal: AbortSignal.timeout(30000) });
  if (r.status === 404 || r.status === 410) return { fechada: `página respondeu ${r.status}` };
  if (!r.ok) throw new Error(`HTTP ${r.status} ao abrir a vaga`);
  if (v.fonte === "Gupy" && !/\/jobs?\//.test(new URL(r.url).pathname)) return { fechada: "a página redirecionou para a listagem" };
  const html = await r.text();
  let texto = "";
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (m) {
    try {
      const partes = [];
      (function andar(o) {
        if (typeof o === "string") { if (o.length > 120 && /<|\s/.test(o)) partes.push(limpar(o)); }
        else if (o && typeof o === "object") Object.values(o).forEach(andar);
      })(JSON.parse(m[1]).props ?? {});
      texto = [...new Set(partes)].join("\n");
    } catch { /* cai no texto da página */ }
  }
  if (texto.length < 300) texto = limpar(html);
  return { texto: texto.slice(0, 7000) };
}

// ---- Gemini
let modelos = [];
async function escolherModelos() {
  const preferidos = [].concat(cfg.modeloGemini ?? []).filter((m) => m && m !== "auto");
  const r = await fetch(`${API}/models?pageSize=200`, { headers: { "x-goog-api-key": CHAVE } });
  if (!r.ok) throw new Error(`Gemini: não consegui listar os modelos (HTTP ${r.status}). A chave é válida?`);
  const nomes = ((await r.json()).models ?? [])
    .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
    .map((m) => m.name.replace("models/", ""))
    .filter((n) => /^gemini-[\d.]+-flash/.test(n) && !/image|tts|live|audio|embedding|native/.test(n));
  const versao = (n) => parseFloat(n.match(/^gemini-([\d.]+)/)[1]);
  const peso = (n) => versao(n) * 10 - (/preview|exp/.test(n) ? 1000 : 0) - (/lite/.test(n) ? 1 : 0); // estáveis primeiro
  nomes.sort((a, b) => peso(b) - peso(a));
  if (!nomes.length && !preferidos.length) throw new Error("Gemini: nenhum modelo 'flash' disponível para esta chave.");
  return [...new Set([...preferidos, ...nomes])].slice(0, 4);
}
async function gemini(prompt) {
  let ultimo = "";
  for (const volta of [1, 2]) {
    if (volta === 2) { console.log("  Gemini: nenhum modelo respondeu; nova tentativa em 45 s"); await dormir(process.env.TESTE ? 10 : 45000); }
    for (const modelo of [...modelos]) {
      let r;
      try {
        r = await fetch(`${API}/models/${modelo}:generateContent`, {
          method: "POST", headers: { "x-goog-api-key": CHAVE, "content-type": "application/json" }, signal: AbortSignal.timeout(60000),
          body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0, responseMimeType: "application/json" } }),
        });
      } catch (e) { // demorou demais ou caiu a conexão: passa para o próximo modelo
        ultimo = `${modelo}: ${e.name === "TimeoutError" ? "sem resposta em 60 s" : e.message}`;
        console.log(`  Gemini ${ultimo}; tentando outro modelo`);
        continue;
      }
      if (r.ok) {
        const j = await r.json();
        if (modelo !== modelos[0]) modelos = [modelo, ...modelos.filter((m) => m !== modelo)]; // o que respondeu passa a ser o primeiro
        const t = (j.candidates?.[0]?.content?.parts ?? []).map((p) => p.text || "").join("");
        try { return JSON.parse(t.replace(/^```(json)?|```$/g, "").trim()); } catch { ultimo = `${modelo}: resposta não é JSON`; console.log(`  Gemini ${ultimo}`); continue; }
      }
      ultimo = `${modelo}: HTTP ${r.status}`;
      console.log(`  Gemini ${ultimo}; tentando outro modelo`);
    }
  }
  throw new Error(`Gemini não respondeu (${ultimo}).`);
}

const instrucoes = `Você avalia vagas para uma candidata brasileira. Responda SOMENTE com JSON válido, em português do Brasil.

PERFIL: cargos ${cfg.perfil.cargos.join(", ")}; nível ${cfg.perfil.senioridade}; modalidade ${cfg.perfil.modalidade}; país ${cfg.perfil.pais}; salário mínimo R$ ${cfg.perfil.salarioMinimo}; sem idiomas além do português.

CURRÍCULO (única fonte de fatos sobre a candidata):
${JSON.stringify(cvSemContato)}

REGRA DE OURO: use SOMENTE fatos do currículo acima. Não invente experiência, ferramenta, número nem nível de domínio. Se faltar requisito, diga com franqueza.

Devolva este JSON:
{
 "descartar": true|false,            // true se: estágio, fora do Brasil, não é remota, exige idioma que ela não tem, ou não é vaga de pré-vendas/SDR/BDR. Salário: descarte só se a remuneração total informada (fixo + variável máxima) ficar abaixo do mínimo; se só o fixo ficar abaixo, NÃO descarte e registre isso em atencao
 "motivoDescarte": "frase curta ou vazio",
 "nota": 0-100,                      // aderência honesta ao currículo, considerando nível júnior e formação em Enfermagem
 "justificativa": "uma linha",
 "contrato": "CLT|PJ|não informado",
 "modalidade": "Remoto|Híbrido|Presencial|não informado",
 "atencao": ["3 a 6 pontos de atenção concretos: salário, requisitos que faltam, senioridade, prazos"],
 "candidatura": ["2 a 3 parágrafos em primeira pessoa, específicos para a empresa: por que eu, por que esta empresa, e o que me falta, com franqueza"],
 "palavrasFaltantes": ["palavras-chave da vaga que NÃO estão no currículo"],
 "curriculo": {"titulo": "título da vaga", "resumo": "resumo de 4 a 6 linhas com termos da vaga só quando forem verdade no currículo, siglas por extenso na primeira vez", "competencias": ["8 a 14 itens, primeiro o que a vaga mais pede, só o que consta no currículo"]}
}`;

modelos = await escolherModelos();
console.log("modelos Gemini:", modelos.join(", "));

const hoje = new Date();
const rodada = {
  data: hoje.toLocaleDateString("sv-SE"), hora: hoje.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), status: "ok", avisos: [],
  fontes: brutas.fontes.map((f) => ({ nome: f.nome, ok: f.ok, detalhe: f.ok ? `Respondeu. ${f.total} vaga(s) lidas, ${f.naJanela} na janela de ${brutas.janelaHoras}h.` : `Não respondeu: ${f.erro}` })),
  vagas: [], descartadas: [],
};
for (const v of brutas.semDataConfirmada ?? []) rodada.descartadas.push({ empresa: v.empresa, cargo: v.titulo, fonte: v.fonte, data: "não confirmada", motivo: "Data de publicação não confirmada." });

const fila = brutas.vagas.slice(0, cfg.maxVagasPorDia);
if (brutas.vagas.length > fila.length) rodada.avisos.push(`Havia ${brutas.vagas.length} vagas na janela; avaliei as ${fila.length} primeiras para respeitar o limite gratuito do Gemini.`);
if (!brutas.vagas.length) rodada.avisos.push(`Nenhuma vaga com data confirmada nas últimas ${brutas.janelaHoras} horas nas fontes consultadas.`);
const fmt = (iso) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const avaliadas = [];
let erros = 0, geminiFora = false;
for (const [i, v] of fila.entries()) {
  const basico = { empresa: v.empresa, cargo: v.titulo, fonte: v.fonte, data: fmt(v.publicadoEm), link: v.url };
  if (geminiFora) { erros++; rodada.descartadas.push({ ...basico, naoAvaliada: true, motivo: "Não foi avaliada: o Gemini não estava respondendo nesta rodada. Abra a vaga e veja você mesma." }); continue; }
  try {
    const d = await descricao(v);
    if (d.fechada) { rodada.descartadas.push({ ...basico, motivo: `Vaga fechada: ${d.fechada}.` }); continue; }
    if (i) await dormir(7000); // limite de requisições por minuto do nível gratuito
    const a = await gemini(`${instrucoes}\n\nVAGA\nEmpresa: ${v.empresa}\nCargo: ${v.titulo}\nLocal: ${v.local || "não informado"} | Modalidade informada: ${v.modalidade || "não informada"}\nDescrição:\n${d.texto}`);
    if (a.descartar) { rodada.descartadas.push({ ...basico, motivo: a.motivoDescarte || "Descartada na avaliação." }); continue; }
    const id = `v${i + 1}`;
    avaliadas.push({
      id, empresa: v.empresa, cargo: v.titulo, link: v.url, fonte: v.fonte, publicadoEm: v.publicadoEm, horaConfirmada: true, foraDaJanela: false,
      contrato: a.contrato || "não informado", modalidade: a.modalidade || "não informado", nota: Math.max(0, Math.min(100, Math.round(Number(a.nota) || 0))),
      justificativa: a.justificativa || "", atencao: a.atencao ?? [], candidatura: a.candidatura ?? [], palavrasFaltantes: a.palavrasFaltantes ?? [],
      curriculo: a.curriculo, arquivoCurriculo: `curriculos/curriculo_${id}.docx`,
      descricao: String(d.texto || "").slice(0, 6000),
    });
    console.log(`avaliada: ${v.empresa} - ${v.titulo} -> ${a.nota}`);
  } catch (e) {
    erros++;
    if (/^Gemini não respondeu/.test(e.message)) geminiFora = true; // não insiste nas próximas vagas
    rodada.descartadas.push({ ...basico, naoAvaliada: true, motivo: `Não foi avaliada: ${e.message} Abra a vaga e veja você mesma.` });
    console.log(`ERRO em ${v.empresa} - ${v.titulo}: ${e.message}`);
  }
}
if (erros) rodada.avisos.push(`${erros} vaga(s) nova(s) não foram avaliadas porque o Gemini não respondeu. Elas estão na lista de descartadas, com o link, para você abrir.`);

avaliadas.sort((a, b) => b.nota - a.nota);
const aprovadas = avaliadas.filter((v) => v.nota >= cfg.notaMinima);
if (aprovadas.length) {
  rodada.vagas = aprovadas;
  for (const v of avaliadas.filter((x) => x.nota < cfg.notaMinima)) rodada.descartadas.push({ empresa: v.empresa, cargo: v.cargo, fonte: v.fonte, data: fmt(v.publicadoEm), motivo: `Nota ${v.nota}, abaixo do corte de ${cfg.notaMinima}. ${v.justificativa}` });
} else if (avaliadas.length) {
  rodada.vagas = avaliadas.slice(0, 3).map((v) => ({ ...v, abaixoDoCorte: true }));
  rodada.avisos.push(`Nenhuma vaga chegou a ${cfg.notaMinima}. Abaixo estão as ${rodada.vagas.length} mais próximas, com a nota.`);
}
const semResposta = brutas.fontes.filter((f) => !f.ok).length;
if (semResposta) rodada.avisos.push(`${semResposta} de ${brutas.fontes.length} fontes não responderam hoje (detalhes na tabela de fontes).`);
rodada.avisos.push("Os textos e as notas desta página foram gerados por inteligência artificial (Gemini). Confira cada candidatura antes de enviar.");
fs.writeFileSync(path.join(raiz, "dados/rodada.json"), JSON.stringify(rodada, null, 2));
console.log(`rodada gravada: ${rodada.vagas.length} vaga(s) no painel, ${rodada.descartadas.length} descartada(s).`);
