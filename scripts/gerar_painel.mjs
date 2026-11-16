// Gera site/index.html a partir de dados/rodada.json.
// Uso: node scripts/gerar_painel.mjs                  -> painel da rodada
//      node scripts/gerar_painel.mjs --falha "motivo" -> painel dizendo que a rodada de hoje falhou
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arq = path.join(raiz, "dados/rodada.json");
const cfg = JSON.parse(fs.readFileSync(path.join(raiz, "config.json"), "utf8"));
const hoje = new Date().toLocaleDateString("sv-SE"); // AAAA-MM-DD no fuso local
const i = process.argv.indexOf("--falha");
const falhaArg = i > -1 ? process.argv[i + 1] || "motivo não informado" : null;

let r = null;
try { r = JSON.parse(fs.readFileSync(arq, "utf8")); } catch { /* sem dados */ }
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const br = (d) => (d ? d.split("-").reverse().join("/") : "—");

let falha = falhaArg;
if (!falha && !r) falha = "Não existe dados/rodada.json: nenhuma rodada foi concluída.";
if (!falha && r.status !== "ok") falha = r.erro || "A rodada terminou com erro.";
if (!falha && r.data !== hoje && !process.argv.includes("--manter-data")) falha = `A rodada de hoje (${br(hoje)}) não rodou ou não terminou.`;

function idade(v) {
  const ref = new Date(`${r.data}T${r.hora || "12:00"}:00`);
  const pub = new Date(v.publicadoEm.length > 10 ? v.publicadoEm : `${v.publicadoEm}T12:00:00`);
  const h = Math.max(0, Math.round((ref - pub) / 36e5));
  return h < 48 ? `há ${h} h` : `há ${Math.round(h / 24)} dias`;
}
const classe = (n) => (n >= 85 ? "alta" : n >= 70 ? "media" : "baixa");

function ficha(v, n) {
  const cv = v.curriculo;
  return `<article class="vaga ${classe(v.nota)}" data-i="${n}">
  <header>
    <div class="nota"><b>${v.nota}</b><span>de 100</span></div>
    <div class="tit">
      <h3>${esc(v.cargo)}</h3>
      <p class="emp">${esc(v.empresa)}</p>
      <p class="tags"><span>${esc(v.modalidade)}</span><span>${esc(v.contrato)}</span><span>${esc(v.fonte)}</span><span>${esc(idade(v))}</span>${v.abaixoDoCorte ? '<span class="alerta">abaixo do corte de 70</span>' : ""}</p>
    </div>
    <div class="acoes-vaga"><a class="btn" href="${esc(v.link)}" target="_blank" rel="noopener">Abrir vaga ↗</a><button class="sec ja" data-i="${n}" hidden>Já me candidatei</button></div>
  </header>
  <p class="just">${esc(v.justificativa)}</p>
  <details open><summary>Pontos de atenção</summary><ul>${(v.atencao ?? []).map((a) => `<li>${esc(a)}</li>`).join("")}</ul></details>
  <details><summary>Candidatura sugerida</summary>
    <div class="carta" id="c-${n}">${(v.candidatura ?? []).map((p) => `<p>${esc(p)}</p>`).join("")}</div>
    <button class="sec copiar" data-alvo="c-${n}">Copiar candidatura</button>
  </details>
  ${cv ? `<details><summary>Para o currículo desta vaga</summary><p><b>Título:</b> ${esc(cv.titulo)}</p><p><b>Resumo:</b> ${esc(cv.resumo)}</p><p class="chips">${(cv.competencias ?? []).map((c) => `<span>${esc(c)}</span>`).join("")}</p></details>` : ""}
  ${(v.palavrasFaltantes ?? []).length ? `<details><summary>Palavras-chave que faltam no seu currículo</summary><p class="dica">Só entram no currículo as que você confirmar que tem.</p><p class="chips falta">${v.palavrasFaltantes.map((p) => `<span>${esc(p)}</span>`).join("")}</p></details>` : ""}
  <section class="ia" data-i="${n}">
    <h4>✨ Assistente de candidatura</h4>
    <div class="ia-estado"></div>
    <div class="ia-uso" hidden>
      <p class="atalhos">
        <button class="chip" data-t="Pergunta do formulário: ">Responder pergunta do formulário</button>
        <button class="chip" data-t="Encurte a candidatura para caber em 1000 caracteres.">Encurtar a candidatura</button>
        <button class="chip" data-t="Reescreva a candidatura em um tom mais direto e confiante, sem perder a franqueza.">Mudar o tom</button>
        <button class="chip" data-t="Escreva um roteiro de vídeo de apresentação de até 2 minutos para esta vaga.">Roteiro de vídeo</button>
      </p>
      <div class="conversa"></div>
      <form class="ia-form"><textarea rows="3" placeholder="Cole a pergunta do formulário ou escreva o que precisa..."></textarea><button class="btn" type="submit">Enviar</button></form>
    </div>
  </section>
</article>`;
}

const css = `:root{--tinta:#1c1b2e;--suave:#676480;--linha:#e6e3f3;--fundo:#f6f4fc;--roxo:#6d3fe0;--roxo2:#a03fd6;--rosa:#ef4f9a;--verde:#12a36b;--ambar:#e08a0b;--verm:#d6335a}
*{box-sizing:border-box}body{margin:0;font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--tinta);background:var(--fundo)}
.topo{background:linear-gradient(120deg,var(--roxo),var(--roxo2) 55%,var(--rosa));color:#fff;padding:34px 20px 74px}
.topo>div,main{max-width:900px;margin:0 auto}.topo .linha{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
h1{font-size:30px;margin:0;letter-spacing:-.02em}.topo p{margin:6px 0 0;opacity:.92}.conta{display:flex;gap:10px;align-items:center;font-size:14px}
.conta button{font:inherit;font-size:14px;border:1px solid rgba(255,255,255,.7);background:rgba(255,255,255,.14);color:#fff;border-radius:999px;padding:6px 16px;cursor:pointer}
main{padding:0 20px 70px;margin-top:-48px}
.resumo{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.card{background:#fff;border-radius:16px;padding:16px 18px;box-shadow:0 6px 22px rgba(60,30,140,.10)}.card b{display:block;font-size:30px;line-height:1.1}.card span{color:var(--suave);font-size:14px}
.card:nth-child(1) b{color:var(--verde)}.card:nth-child(2) b{color:var(--ambar)}.card:nth-child(3) b{color:var(--verm)}.card:nth-child(4) b{color:var(--roxo)}
h2{font-size:20px;margin:38px 0 12px}.aviso{background:#fff7e0;border-radius:12px;padding:11px 16px;margin:10px 0;font-size:15px;border-left:5px solid var(--ambar)}
.falha{background:#ffe9ee;border-left:6px solid var(--verm);border-radius:12px;padding:16px 18px;margin:16px 0;color:#7a1230}.falha b{font-size:18px}
.vaga{background:#fff;border-radius:18px;padding:22px 24px;margin:16px 0;box-shadow:0 6px 22px rgba(60,30,140,.08);border-top:6px solid var(--verde)}
.vaga.media{border-top-color:var(--ambar)}.vaga.baixa{border-top-color:var(--verm)}
.vaga header{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap}.tit{flex:1;min-width:230px}h3{font-size:20px;margin:0;line-height:1.25}.emp{margin:2px 0 6px;color:var(--suave);font-weight:600}
.nota{border-radius:16px;padding:10px 12px;text-align:center;color:#fff;min-width:74px;background:var(--verde)}.media .nota{background:var(--ambar)}.baixa .nota{background:var(--verm)}
.nota b{display:block;font-size:30px;line-height:1}.nota span{font-size:11px;opacity:.9}
.tags,.chips{display:flex;flex-wrap:wrap;gap:6px;margin:0}.tags span,.chips span{background:#efeafc;color:#4a2fa8;border-radius:999px;padding:2px 11px;font-size:13px}
.tags .alerta,.chips.falta span{background:#ffe9d2;color:#8a4b00}
.btn{font:inherit;font-size:15px;font-weight:600;background:var(--roxo);color:#fff;border:0;border-radius:999px;padding:9px 18px;cursor:pointer;text-decoration:none;white-space:nowrap}
.sec{font:inherit;font-size:14px;border:1.5px solid var(--roxo);background:#fff;color:var(--roxo);border-radius:999px;padding:5px 14px;cursor:pointer;margin-top:6px}
.just{margin:16px 0 6px;font-size:17px}details{border-top:1px solid var(--linha);padding:10px 0}summary{cursor:pointer;font-weight:600;color:#3a2a80}
details ul{margin:8px 0 0;padding-left:20px}.carta{background:var(--fundo);border-radius:12px;padding:4px 16px;margin-top:8px}.dica{color:var(--suave);font-size:14px;margin:6px 0}
.ia{margin-top:14px;background:linear-gradient(120deg,#f3edff,#fdeef6);border-radius:14px;padding:14px 16px}.ia h4{margin:0 0 8px;font-size:16px;color:#4a2fa8}
.ia-estado{font-size:14px;color:var(--suave)}.atalhos{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}.chip{font:inherit;font-size:13px;border:0;background:#fff;color:#4a2fa8;border-radius:999px;padding:5px 12px;cursor:pointer;box-shadow:0 1px 3px rgba(60,30,140,.15)}
.conversa{display:flex;flex-direction:column;gap:8px;margin-bottom:10px}.msg{border-radius:12px;padding:9px 13px;white-space:pre-wrap;font-size:15px;max-width:92%}
.msg.eu{background:var(--roxo);color:#fff;align-self:flex-end}.msg.ia-r{background:#fff;align-self:flex-start}.msg.erro{background:#ffe9ee;color:#7a1230}
.ia-form{display:flex;gap:8px;align-items:flex-end}.ia-form textarea{flex:1;font:inherit;border:1px solid var(--linha);border-radius:12px;padding:9px 12px;resize:vertical}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:14px;overflow:hidden;font-size:14px;box-shadow:0 6px 22px rgba(60,30,140,.06)}
th,td{text-align:left;padding:9px 12px;border-bottom:1px solid var(--linha);vertical-align:top}th{background:#efeafc;color:#4a2fa8}.ok{color:var(--verde);font-weight:600}.nok{color:var(--verm);font-weight:600}
dialog{border:0;border-radius:18px;padding:24px;width:min(380px,92vw);box-shadow:0 20px 60px rgba(30,10,90,.35)}dialog::backdrop{background:rgba(28,27,46,.5)}
dialog h3{margin-bottom:12px}dialog label{display:block;font-size:14px;color:var(--suave);margin-top:10px}dialog input{width:100%;font:inherit;border:1px solid var(--linha);border-radius:10px;padding:9px 12px}
dialog .acoes{display:flex;gap:8px;justify-content:flex-end;margin-top:16px}#login-erro{color:var(--verm);font-size:14px;min-height:20px;margin:8px 0 0}
.vazio{background:#fff;border-radius:16px;padding:22px;color:var(--suave);text-align:center}
.acoes-vaga{display:flex;flex-direction:column;gap:6px;align-items:stretch;text-align:center}#pendentes{font-size:13px;font-weight:600;background:var(--rosa);color:#fff;border-radius:999px;padding:2px 10px;margin-left:6px;vertical-align:middle}#pendentes:empty{display:none}
.cand{background:#fff;border-radius:18px;padding:18px 22px;margin:12px 0;box-shadow:0 6px 22px rgba(60,30,140,.08);border-left:6px solid var(--roxo)}.cand.fim{border-left-color:#b9b6c9;opacity:.8}
.cand header{display:flex;gap:12px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap}.cand h3{font-size:18px}.cand .meta{color:var(--suave);font-size:14px;margin:2px 0 0}
.cand select,.cand input[type=text],#nova-form input{font:inherit;font-size:14px;border:1px solid var(--linha);border-radius:10px;padding:6px 10px}
.passos{list-style:none;padding:0;margin:12px 0 8px}.passos li{display:flex;gap:10px;align-items:flex-start;padding:5px 0}.passos input{width:18px;height:18px;margin-top:3px;accent-color:var(--roxo)}
.passos li.feito span{text-decoration:line-through;color:var(--suave)}.passos .x,.cand .apagar{border:0;background:none;color:var(--suave);cursor:pointer;font-size:13px;margin-left:auto}
.novo-passo{display:flex;gap:8px}.novo-passo input{flex:1}.nova{border:0}#nova-form{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px}#nova-form input{flex:1;min-width:160px}#nova-form label{font-size:14px;color:var(--suave)}
@media(max-width:600px){td:nth-child(3),th:nth-child(3){display:none}.ia-form{flex-direction:column;align-items:stretch}}`;

const minhas = `<section id="minhas" hidden>
<h2>Minhas candidaturas <span id="pendentes"></span></h2>
<div id="minhas-lista"></div>
<details class="nova"><summary>+ Adicionar candidatura</summary>
  <form id="nova-form"><input name="empresa" placeholder="Empresa" required><input name="cargo" placeholder="Cargo" required><input name="link" type="url" placeholder="Link da vaga (opcional)"><label>Prazo <input name="prazo" type="date"></label><button class="btn" type="submit">Adicionar</button></form>
</details>
</section>`;
let corpo = "";
if (falha) {
  corpo += `<div class="falha"><b>A rodada de ${br(hoje)} falhou.</b><br>${esc(falha)}<br>Nenhum resultado de hoje está disponível.${r ? ` A última rodada concluída foi em ${br(r.data)} e aparece abaixo só como referência: são dados antigos.` : ""}</div>`;
}
let vagasJs = [];
if (!r) corpo += minhas;
if (r) {
  const aprov = r.vagas ?? [], desc = r.descartadas ?? [], fontes = r.fontes ?? [];
  const naJanela = aprov.filter((v) => !v.foraDaJanela && !v.abaixoDoCorte).length;
  vagasJs = aprov.map((v) => ({ empresa: v.empresa, cargo: v.cargo, link: v.link, descricao: v.descricao || "", candidatura: v.candidatura ?? [], atencao: v.atencao ?? [] }));
  corpo += `<section class="resumo">
  <div class="card"><b>${naJanela}</b><span>vagas novas com nota 70+</span></div>
  <div class="card"><b>${aprov.filter((v) => v.abaixoDoCorte).length}</b><span>abaixo do corte, como referência</span></div>
  <div class="card"><b>${desc.length}</b><span>descartadas</span></div>
  <div class="card"><b>${fontes.filter((f) => f.ok).length}/${fontes.length}</b><span>fontes responderam</span></div>
</section>
${(r.avisos ?? []).map((a) => `<div class="aviso">${esc(a)}</div>`).join("")}
${minhas}
<h2>${falha ? `Última rodada concluída (${br(r.data)}) — dados antigos` : "Vagas para você revisar"}</h2>
${aprov.length ? aprov.map(ficha).join("\n") : '<div class="vazio">Nenhuma vaga passou do corte nesta rodada.</div>'}
<h2>Descartadas e por quê</h2>
${desc.length ? `<table><tr><th>Vaga</th><th>Fonte / data</th><th>Motivo</th></tr>${desc.map((d) => `<tr><td><b>${d.link ? `<a href="${esc(d.link)}" target="_blank" rel="noopener">${esc(d.cargo)}</a>` : esc(d.cargo)}</b><br>${esc(d.empresa)}</td><td>${esc(d.fonte)}<br>${esc(d.data)}</td><td>${esc(d.motivo)}</td></tr>`).join("")}</table>` : '<div class="vazio">Nenhuma vaga descartada.</div>'}
<details style="border:0;margin-top:28px"><summary>Fontes consultadas (${fontes.filter((f) => f.ok).length} de ${fontes.length} responderam)</summary>
<table style="margin-top:10px"><tr><th>Fonte</th><th>Situação</th><th>Detalhe</th></tr>${fontes.map((f) => `<tr><td>${esc(f.nome)}</td><td class="${f.ok ? "ok" : "nok"}">${f.ok ? "Respondeu" : "Não respondeu"}</td><td>${esc(f.detalhe)}</td></tr>`).join("")}</table></details>`;
}

const sup = cfg.supabase ?? {};
const paraJs = (o) => JSON.stringify(o).replace(/</g, "\\u003c");
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Radar de vagas — ${br(falha ? hoje : r.data)}</title><style>${css}</style></head><body>
<div class="topo"><div>
  <div class="linha"><h1>Radar de vagas</h1><div class="conta" id="conta"></div></div>
  <p>${falha ? `Painel gerado em ${br(hoje)}` : `Rodada de ${br(r.data)} às ${esc(r.hora)}`} · SDR, BDR, Pré-vendas e Customer Success · júnior · remoto · Brasil</p>
  <p>Atualizado todo dia antes das 9h. Nada é enviado: você revisa e você se candidata.</p>
</div></div>
<main>
<div id="antigo"></div>
${corpo}
</main>
<dialog id="login"><form method="dialog" id="login-form">
  <h3>Entrar</h3>
  <label>E-mail<input type="email" id="login-email" autocomplete="username" required></label>
  <label>Senha<input type="password" id="login-senha" autocomplete="current-password" required></label>
  <p id="login-erro"></p>
  <div class="acoes"><button type="button" class="sec" id="login-cancelar">Cancelar</button><button class="btn" type="submit">Entrar</button></div>
</form></dialog>
<script type="module">
const RODADA = ${paraJs(falha || !r ? "" : r.data)};
const VAGAS = ${paraJs(vagasJs)};
const SUP = ${paraJs({ url: sup.url || "", chave: sup.chavePublica || "" })};
const $ = (s, p = document) => p.querySelector(s), $$ = (s, p = document) => [...p.querySelectorAll(s)];

// aviso quando a página aberta é de um dia anterior
(function () {
  if (!RODADA) return;
  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  if (hoje === RODADA) return;
  const f = (d) => d.split("-").reverse().join("/");
  $("#antigo").innerHTML = '<div class="falha"><b>A rodada de hoje (' + f(hoje) + ') ainda não aconteceu.</b><br>O que aparece abaixo é da rodada de ' + f(RODADA) + ': são dados antigos. A rodada automática começa por volta das 8h15 e pode atrasar; se passar das 10h, veja a aba Actions do repositório.</div>';
})();

// copiar
function copiar(texto, botao) {
  const ok = () => { const t = botao.textContent; botao.textContent = "Copiado ✓"; setTimeout(() => (botao.textContent = t), 1500); };
  const antigo = () => { const a = document.createElement("textarea"); a.value = texto; document.body.appendChild(a); a.select(); document.execCommand("copy"); a.remove(); ok(); };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(texto).then(ok, antigo); else antigo();
}
document.addEventListener("click", (e) => {
  const b = e.target.closest(".copiar"); if (!b) return;
  const alvo = b.dataset.alvo ? document.getElementById(b.dataset.alvo) : b.previousElementSibling;
  const ps = $$("p", alvo); copiar(ps.length ? ps.map((p) => p.textContent).join("\\n\\n") : alvo.textContent, b);
});

// login e assistente
let sb = null, sessao = null;
const conversas = VAGAS.map(() => []);
function pintar() {
  const conta = $("#conta");
  if (!sb) conta.innerHTML = "";
  else if (sessao) { conta.innerHTML = '<span></span><button id="sair">Sair</button>'; $("span", conta).textContent = sessao.user.email; }
  else conta.innerHTML = '<button id="entrar">Entrar</button>';
  for (const s of $$(".ia")) {
    const estado = $(".ia-estado", s), uso = $(".ia-uso", s);
    if (!sb) { estado.textContent = "O assistente ainda não foi ligado neste site."; uso.hidden = true; }
    else if (!sessao) { estado.innerHTML = 'Entre com seu e-mail e senha para usar o assistente. <button class="sec entrar2">Entrar</button>'; uso.hidden = true; }
    else { estado.textContent = "Respostas escritas só com os fatos do seu currículo. Confira antes de enviar."; uso.hidden = false; }
  }
}
function msg(s, classe, texto) {
  const d = document.createElement("div"); d.className = "msg " + classe; d.textContent = texto; $(".conversa", s).appendChild(d);
  if (classe === "ia-r") { const b = document.createElement("button"); b.className = "sec copiar"; b.textContent = "Copiar"; b.style.alignSelf = "flex-start"; $(".conversa", s).appendChild(b); }
  return d;
}
async function perguntar(s, texto) {
  const i = Number(s.dataset.i), conv = conversas[i];
  conv.push({ papel: "user", texto }); msg(s, "eu", texto);
  const espera = msg(s, "ia-r", "Escrevendo..."); espera.nextSibling.hidden = true;
  try {
    const r = await fetch(SUP.url + "/functions/v1/assistente", { method: "POST",
      headers: { authorization: "Bearer " + sessao.access_token, apikey: SUP.chave, "content-type": "application/json" },
      body: JSON.stringify({ vaga: VAGAS[i], mensagens: conv.slice(-16) }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.erro || "erro " + r.status);
    conv.push({ papel: "model", texto: j.texto }); espera.textContent = j.texto; espera.nextSibling.hidden = false;
  } catch (e) { conv.pop(); espera.className = "msg erro"; espera.textContent = "Não consegui responder: " + e.message; }
}
document.addEventListener("click", async (e) => {
  if (e.target.id === "entrar" || e.target.classList.contains("entrar2")) { $("#login-erro").textContent = ""; $("#login").showModal(); }
  if (e.target.id === "login-cancelar") $("#login").close();
  if (e.target.id === "sair") await sb.auth.signOut();
  const c = e.target.closest(".chip"); if (c) { const t = $("textarea", c.closest(".ia")); t.value = c.dataset.t; t.focus(); }
});
$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { error } = await sb.auth.signInWithPassword({ email: $("#login-email").value.trim(), password: $("#login-senha").value });
  if (error) $("#login-erro").textContent = "E-mail ou senha incorretos."; else { $("#login-senha").value = ""; $("#login").close(); }
});
document.addEventListener("submit", (e) => {
  const f = e.target.closest(".ia-form"); if (!f) return; e.preventDefault();
  const t = $("textarea", f), texto = t.value.trim(); if (!texto || !sessao) return; t.value = ""; perguntar(f.closest(".ia"), texto);
});

// minhas candidaturas (só com login; os dados ficam no Supabase e só a dona os lê)
const escH = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dataBr = (d) => (d ? d.split("-").reverse().join("/") : "");
const SITUACOES = ["Em andamento", "Aguardando retorno", "Entrevista marcada", "Aprovada", "Encerrada"];
let minhasCand = [];
async function carregarMinhas() {
  const sec = $("#minhas"); if (!sec) return;
  $$(".ja").forEach((b) => (b.hidden = !sessao));
  if (!sb || !sessao) { sec.hidden = true; return; }
  sec.hidden = false;
  const { data, error } = await sb.from("candidaturas").select("*, passos(*)").order("candidatou_em", { ascending: false });
  const lista = $("#minhas-lista");
  if (error) { lista.innerHTML = '<div class="vazio">Não consegui carregar suas candidaturas: ' + escH(error.message) + "</div>"; return; }
  minhasCand = data;
  const pend = data.filter((c) => c.situacao !== "Encerrada").reduce((n, c) => n + c.passos.filter((p) => !p.feito).length, 0);
  $("#pendentes").textContent = pend ? pend + (pend === 1 ? " passo a concluir" : " passos a concluir") : "";
  lista.innerHTML = data.length ? data.map((c) => {
    const passos = [...c.passos].sort((a, b) => a.ordem - b.ordem || a.criado_em.localeCompare(b.criado_em));
    const prox = passos.find((p) => !p.feito);
    return '<article class="cand' + (c.situacao === "Encerrada" ? " fim" : "") + '" data-id="' + c.id + '"><header><div><h3>' + escH(c.cargo) + '</h3><p class="meta"><b>' + escH(c.empresa) + "</b>" +
      (c.candidatou_em ? " · candidatura em " + dataBr(c.candidatou_em) : "") + (c.prazo ? " · inscrições até " + dataBr(c.prazo) : "") + (c.link ? ' · <a href="' + escH(c.link) + '" target="_blank" rel="noopener">abrir vaga ↗</a>' : "") + "</p>" +
      (c.obs ? '<p class="meta">' + escH(c.obs) + "</p>" : "") + (prox && c.situacao !== "Encerrada" ? '<p class="meta"><b>Próximo passo:</b> ' + escH(prox.texto) + "</p>" : "") + "</div>" +
      '<select class="situacao">' + SITUACOES.map((x) => "<option" + (x === c.situacao ? " selected" : "") + ">" + x + "</option>").join("") + "</select></header>" +
      '<ul class="passos">' + passos.map((p) => '<li class="' + (p.feito ? "feito" : "") + '" data-p="' + p.id + '"><input type="checkbox"' + (p.feito ? " checked" : "") + "><span>" + escH(p.texto) + '</span><button class="x" title="Remover passo">remover</button></li>').join("") + "</ul>" +
      '<form class="novo-passo"><input type="text" placeholder="Novo passo (ex.: enviar documentos)" required><button class="sec" type="submit">Adicionar passo</button></form>' +
      '<button class="apagar">Excluir candidatura</button></article>';
  }).join("") : '<div class="vazio">Nenhuma candidatura registrada ainda. Use "Já me candidatei" em uma vaga ou adicione abaixo.</div>';
}
const falhou = (error) => { if (error) alert("Não consegui salvar: " + error.message); return !!error; };
document.addEventListener("change", async (e) => {
  const c = e.target.closest(".cand"); if (!c || !sb) return;
  if (e.target.matches(".passos input")) falhou((await sb.from("passos").update({ feito: e.target.checked }).eq("id", e.target.closest("li").dataset.p)).error);
  else if (e.target.matches(".situacao")) falhou((await sb.from("candidaturas").update({ situacao: e.target.value }).eq("id", c.dataset.id)).error);
  else return;
  carregarMinhas();
});
document.addEventListener("click", async (e) => {
  if (!sb || !sessao) return;
  const c = e.target.closest(".cand");
  if (c && e.target.matches(".x")) { falhou((await sb.from("passos").delete().eq("id", e.target.closest("li").dataset.p)).error); carregarMinhas(); }
  if (c && e.target.matches(".apagar") && confirm("Excluir esta candidatura e os passos dela?")) { falhou((await sb.from("candidaturas").delete().eq("id", c.dataset.id)).error); carregarMinhas(); }
  const ja = e.target.closest(".ja");
  if (ja) {
    const v = VAGAS[Number(ja.dataset.i)];
    if (minhasCand.some((m) => m.link === v.link)) { alert("Esta vaga já está nas suas candidaturas."); return; }
    await criarCandidatura({ empresa: v.empresa, cargo: v.cargo, link: v.link });
    $("#minhas").scrollIntoView({ behavior: "smooth" });
  }
});
async function criarCandidatura(c) {
  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const { data, error } = await sb.from("candidaturas").insert({ empresa: c.empresa, cargo: c.cargo, link: c.link || null, prazo: c.prazo || null, candidatou_em: hoje }).select().single();
  if (falhou(error)) return;
  falhou((await sb.from("passos").insert([{ candidatura_id: data.id, texto: "Preencher o formulário e enviar o currículo", feito: true, ordem: 1 }, { candidatura_id: data.id, texto: "Acompanhar o retorno da empresa", ordem: 2 }])).error);
  carregarMinhas();
}
document.addEventListener("submit", async (e) => {
  if (!sb || !sessao) return;
  const np = e.target.closest(".novo-passo");
  if (np) { e.preventDefault(); const c = np.closest(".cand"), i = $("input", np), m = minhasCand.find((x) => x.id === c.dataset.id);
    falhou((await sb.from("passos").insert({ candidatura_id: c.dataset.id, texto: i.value.trim(), ordem: Math.max(0, ...(m?.passos ?? []).map((p) => p.ordem)) + 1 })).error); carregarMinhas(); }
  if (e.target.id === "nova-form") { e.preventDefault(); const f = new FormData(e.target); await criarCandidatura(Object.fromEntries(f)); e.target.reset(); }
});

pintar();
if (SUP.url && SUP.chave) {
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    sb = createClient(SUP.url, SUP.chave);
    sessao = (await sb.auth.getSession()).data.session;
    sb.auth.onAuthStateChange((_e, s) => { sessao = s; pintar(); setTimeout(carregarMinhas, 0); });
  } catch (e) { console.error(e); }
  pintar(); carregarMinhas();
}
</script></body></html>`;
fs.mkdirSync(path.join(raiz, "site"), { recursive: true });
fs.writeFileSync(path.join(raiz, "site/index.html"), html);
console.log("site/index.html gerado" + (falha ? " (com aviso de falha)" : ""));
