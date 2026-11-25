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
      <p class="tags"><span${/presencial|h[ií]brid/i.test(v.modalidade || "") ? ' class="alerta"' : ""}>${esc(v.modalidade)}</span><span>${esc(v.contrato)}</span><span>${esc(v.fonte)}</span><span>${esc(idade(v))}</span>${v.abaixoDoCorte ? '<span class="alerta">abaixo do corte de 70</span>' : ""}</p>
    </div>
    <div class="acoes-vaga"><a class="btn" href="${esc(v.link)}" target="_blank" rel="noopener">Abrir vaga ↗</a><button class="sec ja" data-i="${n}" hidden>Já me candidatei</button><button class="sec nao" data-i="${n}" hidden>Não tenho interesse</button></div>
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

const css = `:root{--tinta:#111827;--suave:#6b7280;--linha:#e5e7eb;--fundo:#faf6f7;--lado:#4a0d26;--cor:#db2777;--cor-fraca:#fdf2f8;--vinho:#831843;--verde:#059669;--ambar:#d97706;--verm:#dc2626}
*{box-sizing:border-box}html,body{height:100%}body{margin:0;font:15px/1.55 Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--tinta);background:var(--fundo)}
a{color:var(--cor)}.app{display:grid;grid-template-columns:248px 1fr;min-height:100vh}
.lado{background:linear-gradient(180deg,#5b1030,var(--lado));color:#f3d6e1;padding:22px 14px;display:flex;flex-direction:column;gap:6px;position:sticky;top:0;height:100vh}
.marca{display:flex;align-items:center;gap:10px;color:#fff;font-weight:700;font-size:17px;padding:4px 10px 18px}.logo{width:30px;height:30px;border-radius:9px;background:var(--cor);color:#fff;display:grid;place-items:center;font-size:15px}
.lado nav{display:flex;flex-direction:column;gap:2px}.lado nav a{display:flex;justify-content:space-between;align-items:center;gap:8px;color:#f3d6e1;text-decoration:none;padding:9px 12px;border-radius:9px;font-weight:500}
.lado nav a svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none;opacity:.85}.lado nav a span{flex:1}.lado nav a i{font-style:normal}.lado nav a em{display:none}.lado nav a span i+em{display:none}.lado nav a:hover{background:rgba(255,255,255,.06)}.lado nav a.ativo{background:rgba(255,255,255,.12);color:#fff}
.lado nav b{font-size:12px;font-weight:600;background:rgba(255,255,255,.12);border-radius:999px;padding:1px 8px;min-width:22px;text-align:center}.lado nav b:empty{display:none}#nav-pend{background:var(--cor);color:#fff}
.lado .fim{margin-top:auto;font-size:13px;padding:0 10px;color:#e7b7c9}.conta{display:flex;flex-direction:column;gap:8px;margin-bottom:12px;font-size:13px;word-break:break-all}
.conta button{font:inherit;font-size:13px;font-weight:600;border:1px solid rgba(255,255,255,.28);background:transparent;color:#fde7ef;border-radius:8px;padding:7px 12px;cursor:pointer}.conta #entrar{background:var(--cor);border-color:var(--cor);color:#fff}
main{padding:30px 36px 70px;max-width:980px;width:100%}.view>header{margin-bottom:18px}h1{font-size:24px;margin:0;letter-spacing:-.01em}.sub{color:var(--suave);margin:4px 0 0}
h2{font-size:16px;margin:26px 0 10px}h3{font-size:17px;margin:0;line-height:1.3}
.resumo{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:14px}
.card{background:#fff;border:1px solid var(--linha);border-radius:12px;padding:14px 16px}.card b{display:block;font-size:26px;line-height:1.15}.card span{color:var(--suave);font-size:13px}
.aviso{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:10px 14px;margin:8px 0;font-size:14px;color:#78350f}
.falha{background:#fef2f2;border:1px solid #fecaca;border-left:5px solid var(--verm);border-radius:10px;padding:14px 16px;margin:0 0 18px;color:#7f1d1d}.falha b{font-size:16px}
.vaga{background:#fff;border:1px solid var(--linha);border-radius:14px;padding:20px 22px;margin:14px 0}
.vaga header{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap}.tit{flex:1;min-width:230px}.emp{margin:2px 0 8px;color:var(--suave);font-weight:500}
.nota{width:62px;height:62px;border-radius:50%;display:grid;place-content:center;text-align:center;border:3px solid var(--verde);color:var(--verde)}.sem .nota{border-color:#d1d5db;color:#6b7280}.media .nota{border-color:var(--ambar);color:var(--ambar)}.baixa .nota{border-color:var(--verm);color:var(--verm)}
.nota b{font-size:22px;line-height:1}.nota span{font-size:10px;color:var(--suave)}
.tags,.chips{display:flex;flex-wrap:wrap;gap:6px;margin:0}.tags span,.chips span{background:#f3f4f6;color:#374151;border-radius:6px;padding:2px 9px;font-size:12.5px}
.tags .alerta,.chips.falta span{background:#fff7ed;color:#9a3412}
.btn{font:inherit;font-size:14px;font-weight:600;background:var(--cor);color:#fff;border:0;border-radius:8px;padding:8px 16px;cursor:pointer;text-decoration:none;white-space:nowrap;display:inline-block}
.sec{font:inherit;font-size:13.5px;font-weight:500;border:1px solid #d1d5db;background:#fff;color:var(--tinta);border-radius:8px;padding:6px 13px;cursor:pointer;margin-top:6px}.sec:hover{border-color:var(--cor);color:var(--cor)}
.acoes-vaga{display:flex;flex-direction:column;gap:6px;align-items:stretch;text-align:center}.acoes-vaga .sec{margin:0}.acoes-vaga .nao{color:var(--suave)}.oculta{display:none!important}
.just{margin:14px 0 8px;font-size:15.5px}details{border-top:1px solid var(--linha);padding:10px 0}summary{cursor:pointer;font-weight:600;font-size:14.5px}
details ul{margin:8px 0 0;padding-left:20px}.carta{background:#f9fafb;border:1px solid var(--linha);border-radius:10px;padding:2px 16px;margin-top:8px}.dica{color:var(--suave);font-size:13.5px;margin:6px 0}
.ia{margin-top:12px;background:var(--cor-fraca);border-radius:12px;padding:14px 16px}.ia h4{margin:0 0 6px;font-size:14.5px;color:#9d174d}
.ia-estado{font-size:13.5px;color:var(--suave);margin-bottom:8px}.atalhos{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}.chip{font:inherit;font-size:13px;border:1px solid #fbcfe8;background:#fff;color:#9d174d;border-radius:999px;padding:4px 12px;cursor:pointer}
.conversa{display:flex;flex-direction:column;gap:8px;margin-bottom:10px}.msg{border-radius:10px;padding:9px 13px;white-space:pre-wrap;font-size:14.5px;max-width:92%}
.msg.eu{background:var(--cor);color:#fff;align-self:flex-end}.msg.ia-r{background:#fff;border:1px solid var(--linha);align-self:flex-start}.msg.erro{background:#fef2f2;color:#7f1d1d}
.ia-form{display:flex;gap:8px;align-items:flex-end}.ia-form textarea{flex:1;font:inherit;border:1px solid #d1d5db;border-radius:10px;padding:9px 12px;resize:vertical}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--linha);border-radius:12px;overflow:hidden;font-size:14px}
th,td{text-align:left;padding:10px 14px;border-bottom:1px solid var(--linha);vertical-align:top}tr:last-child td{border-bottom:0}th{background:#f9fafb;color:var(--suave);font-weight:600;font-size:12.5px;text-transform:uppercase;letter-spacing:.03em}.ok{color:var(--verde);font-weight:600}.nok{color:var(--verm);font-weight:600}
dialog{border:0;border-radius:14px;padding:24px;width:min(380px,92vw);box-shadow:0 20px 60px rgba(74,13,38,.35)}dialog::backdrop{background:rgba(74,13,38,.55)}
dialog h3{margin-bottom:12px}dialog label{display:block;font-size:13.5px;color:var(--suave);margin-top:10px}dialog input{width:100%;font:inherit;border:1px solid #d1d5db;border-radius:8px;padding:9px 12px}
dialog .acoes{display:flex;gap:8px;justify-content:flex-end;align-items:center;margin-top:16px}dialog .acoes .sec{margin:0}#login-erro,#ns-erro{color:var(--verm);font-size:13.5px;min-height:20px;margin:8px 0 0}#login-erro.ok{color:var(--verde)}.link-sec{border:0;background:none;color:var(--cor);font:inherit;font-size:13.5px;padding:4px 0;cursor:pointer;text-decoration:underline}
.vazio{background:#fff;border:1px dashed #d1d5db;border-radius:12px;padding:22px;color:var(--suave);text-align:center}
#pendentes{font-size:12.5px;font-weight:600;background:var(--cor-fraca);color:#9d174d;border-radius:999px;padding:2px 10px;margin-left:8px;vertical-align:middle}#pendentes:empty{display:none}
.cand{background:#fff;border:1px solid var(--linha);border-radius:14px;padding:18px 22px;margin:12px 0}.cand.fim{opacity:.65}
.cand header{display:flex;gap:12px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap}.cand .meta{color:var(--suave);font-size:13.5px;margin:3px 0 0}
.cand select,.cand input[type=text],#nova-form input{font:inherit;font-size:14px;border:1px solid #d1d5db;border-radius:8px;padding:6px 10px;background:#fff}
.passos{list-style:none;padding:0;margin:12px 0 8px}.passos li{display:flex;gap:10px;align-items:flex-start;padding:6px 0;border-bottom:1px solid #f3f4f6}.passos input{width:17px;height:17px;margin-top:3px;accent-color:var(--cor)}
.passos li.feito span{text-decoration:line-through;color:var(--suave)}.passos .x,.cand .apagar{border:0;background:none;color:#9ca3af;cursor:pointer;font-size:12.5px;margin-left:auto}.cand .apagar{margin:8px 0 0;padding:0}
.novo-passo{display:flex;gap:8px;align-items:center}.novo-passo input{flex:1}.novo-passo .sec{margin:0}.nova{border:0;margin-top:6px}#nova-form{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px}#nova-form input{flex:1;min-width:160px}#nova-form label{font-size:13.5px;color:var(--suave)}
.ola{background:linear-gradient(120deg,var(--vinho),var(--cor));color:#fff;border-radius:16px;padding:22px 24px;margin-bottom:16px}.ola h1{font-size:24px}.ola p{margin:4px 0 0;opacity:.92}
.ola .estado{display:inline-block;margin-top:12px;background:rgba(255,255,255,.18);border-radius:999px;padding:3px 12px;font-size:13px;font-weight:600}
.card.link{cursor:pointer;transition:border-color .15s}.card.link:hover{border-color:var(--cor)}.card b.rosa{color:var(--cor)}
.grade{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:4px}.painel{background:#fff;border:1px solid var(--linha);border-radius:14px;padding:16px 20px}
.painel h2{margin:0 0 10px;font-size:15px}.painel ul{list-style:none;margin:0;padding:0}.painel li{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #f5eef1;font-size:14px}.painel li:last-child{border-bottom:0}
.painel li small{color:var(--suave);white-space:nowrap}.painel .vazio{padding:14px;font-size:14px}.urgente{color:var(--verm);font-weight:600}
.destaque{display:flex;gap:16px;align-items:center;flex-wrap:wrap}.destaque .tit{min-width:200px}.destaque .acoes-vaga{flex-direction:row}
@media(max-width:760px){
.app{display:block}
.lado{position:sticky;top:0;z-index:20;height:auto;flex-direction:row;align-items:center;justify-content:space-between;padding:10px 14px;padding-top:max(10px,env(safe-area-inset-top));box-shadow:0 2px 10px rgba(74,13,38,.25)}
.marca{padding:0;font-size:16px}.logo{width:28px;height:28px}
.lado .fim{margin:0;padding:0}.lado .fim p{display:none}.conta{flex-direction:row;align-items:center;gap:8px;margin:0}.conta span{display:none}.conta button{padding:7px 14px;font-size:14px}
.lado nav{position:fixed;left:0;right:0;bottom:0;z-index:30;flex-direction:row;gap:0;background:#fff;border-top:1px solid var(--linha);box-shadow:0 -4px 16px rgba(74,13,38,.08);padding:4px 4px max(4px,env(safe-area-inset-bottom))}
.lado nav a{flex:1;flex-direction:column;justify-content:center;gap:2px;padding:6px 2px;border-radius:10px;color:#7b6470;font-size:11px;font-weight:600;position:relative;min-height:54px}
.lado nav a svg{width:23px;height:23px;opacity:1}.lado nav a span{flex:none}.lado nav a i{display:none}.lado nav a span i+em{display:inline}
.lado nav a.ativo{background:var(--cor-fraca);color:var(--cor)}.lado nav a:hover{background:none}.lado nav a.ativo:hover{background:var(--cor-fraca)}
.lado nav b{position:absolute;top:2px;left:calc(50% + 6px);font-size:10px;padding:0 5px;min-width:17px;line-height:16px;background:var(--cor);color:#fff}.lado nav a[data-v=fontes] b,.lado nav a[data-v=desc] b{display:none}
main{padding:16px 12px calc(84px + env(safe-area-inset-bottom))}
h1{font-size:21px}.ola{padding:18px;border-radius:14px}.ola h1{font-size:21px}
.resumo{grid-template-columns:1fr 1fr;gap:8px}.card{padding:12px}.card b{font-size:22px}
.grade{grid-template-columns:1fr}.painel{padding:14px 16px}
.vaga,.cand{padding:16px;border-radius:14px;margin:10px 0}
.vaga header{gap:12px}.nota{width:52px;height:52px}.nota b{font-size:19px}.tit{min-width:0;flex:1 1 calc(100% - 70px)}
.vaga .acoes-vaga,.destaque .acoes-vaga{flex:1 1 100%;flex-direction:row;flex-wrap:wrap;gap:8px}
.acoes-vaga .btn{flex:1 1 100%;padding:12px;font-size:15px;text-align:center}.acoes-vaga .sec{flex:1 1 calc(50% - 4px);padding:10px 8px;font-size:14px}
.sec,.btn{min-height:42px}.chip{padding:7px 13px}summary{padding:4px 0}
input,select,textarea{font-size:16px!important}
.ia-form{flex-direction:column;align-items:stretch}.novo-passo{flex-direction:column;align-items:stretch}#nova-form{flex-direction:column;align-items:stretch}
.passos li{padding:9px 0}.passos input{width:21px;height:21px}
table,tbody,tr,td{display:block;width:100%}table{border:0;background:none}tr:first-child:has(th){display:none}
tr{background:#fff;border:1px solid var(--linha);border-radius:12px;margin-bottom:8px;padding:4px 0}td{border:0;padding:6px 14px}
.destaque{gap:12px}
}`

const aprov = r?.vagas ?? [], desc = r?.descartadas ?? [], fontes = r?.fontes ?? [];
const naJanela = aprov.filter((v) => !v.foraDaJanela && !v.abaixoDoCorte).length;
const semNota = r?.naoAvaliadas ?? [];
const vagasJs = [...aprov, ...semNota].map((v) => ({ empresa: v.empresa, cargo: v.cargo, link: v.link, descricao: v.descricao || "", candidatura: v.candidatura ?? [], atencao: v.atencao ?? [] }));
function fichaSemNota(v0, k) {
  const n = aprov.length + k;
  const traduz = { remote: "Remoto", hybrid: "Híbrido", "on-site": "Presencial", onsite: "Presencial" };
  const v = { ...v0, modalidade: traduz[String(v0.modalidade || "").toLowerCase()] ?? v0.modalidade };
  return `<article class="vaga sem" data-i="${n}">
  <header>
    <div class="nota"><b>?</b><span>sem nota</span></div>
    <div class="tit">
      <h3>${esc(v.cargo)}</h3>
      <p class="emp">${esc(v.empresa)}</p>
      <p class="tags"><span class="alerta">sem avaliação</span>${v.modalidade ? `<span${/presencial|h[ií]brid|on.?site/i.test(v.modalidade) ? ' class="alerta"' : ""}>${esc(v.modalidade)}</span>` : ""}${v.local ? `<span>${esc(v.local)}</span>` : ""}<span>${esc(v.fonte)}</span><span>${esc(idade(v))}</span></p>
    </div>
    <div class="acoes-vaga"><a class="btn" href="${esc(v.link)}" target="_blank" rel="noopener">Abrir vaga ↗</a><button class="sec ja" data-i="${n}" hidden>Já me candidatei</button><button class="sec nao" data-i="${n}" hidden>Não tenho interesse</button></div>
  </header>
  <p class="dica">O Gemini não respondeu nesta rodada, então esta vaga ainda não tem nota nem candidatura. Ela passou pelos filtros de cargo, data e modalidade. A próxima rodada tenta avaliar de novo.</p>
</article>`;
}
const perfil = `SDR, BDR, Pré-vendas e Customer Success · júnior · remoto no Brasil${cfg.local?.cidade ? ` ou presencial/híbrido em ${cfg.local.cidade}` : ""}`;
const quando = falha ? (r ? `Última rodada concluída: ${br(r.data)} às ${esc(r.hora)} (dados antigos)` : "Nenhuma rodada concluída") : `Rodada de ${br(r.data)} às ${esc(r.hora)}`;
const falhaHtml = falha ? `<div class="falha"><b>A atualização mais recente falhou.</b><br>${esc(falha)}<br>${r ? `O que aparece abaixo é da última rodada concluída (${br(r.data)} às ${esc(r.hora)}).` : "Nenhum resultado disponível."}</div>` : "";

const top = aprov[0];
const estado = falha ? "Rodada de hoje com falha" : r && r.data !== hoje ? "Dados de outro dia" : "Rodada de hoje concluída";
const telaInicio = `<section class="view" id="v-inicio">
<div class="ola"><h1>Olá!</h1><p>${quando}</p><span class="estado">${estado}</span></div>
<div class="resumo">
  <div class="card link" data-ir="vagas"><b class="rosa">${naJanela}</b><span>vagas novas com nota 70+</span></div>
  <div class="card link" data-ir="cand"><b id="ini-pend">–</b><span>passos a concluir</span></div>
  <div class="card link" data-ir="cand"><b id="ini-cand">–</b><span>candidaturas em andamento</span></div>
  <div class="card link" data-ir="fontes"><b>${fontes.filter((f) => f.ok).length}/${fontes.length}</b><span>fontes responderam</span></div>
</div>
<div class="painel" style="margin-bottom:14px"><h2>Destaque do dia</h2>
${top ? `<div class="destaque ${classe(top.nota)}" data-link="${esc(top.link)}"><div class="nota"><b>${top.nota}</b><span>de 100</span></div><div class="tit"><h3>${esc(top.cargo)}</h3><p class="emp" style="margin:2px 0 0">${esc(top.empresa)} · ${esc(top.modalidade)} · ${esc(top.contrato)}</p></div><div class="acoes-vaga"><button class="btn" data-ir="vagas">Ver detalhes</button><a class="sec" style="margin:0;text-decoration:none" href="${esc(top.link)}" target="_blank" rel="noopener">Abrir vaga ↗</a></div></div>` : (semNota.length ? `<div class="vazio">${semNota.length} vaga(s) nova(s) ainda sem avaliação, porque o Gemini não respondeu. <button class="sec" data-ir="vagas">Ver vagas</button></div>` : '<div class="vazio">Nenhuma vaga nova passou do corte nesta rodada.</div>')}
</div>
<div class="grade">
  <div class="painel"><h2>Próximos passos</h2><div id="ini-passos"><div class="vazio">Entre para ver seus passos.</div></div></div>
  <div class="painel"><h2>Prazos das candidaturas</h2><div id="ini-prazos"><div class="vazio">Entre para ver seus prazos.</div></div></div>
</div>
</section>`;

const telaVagas = `<section class="view" id="v-vagas" hidden>
<header><h1>Vagas de hoje</h1><p class="sub">${quando} · ${perfil}</p></header>
<div class="resumo">
  <div class="card"><b>${naJanela}</b><span>vagas novas com nota 70+</span></div>
  <div class="card"><b>${aprov.filter((v) => v.abaixoDoCorte).length}</b><span>abaixo do corte, como referência</span></div>
  <div class="card"><b>${desc.length}</b><span>descartadas</span></div>
  <div class="card"><b>${fontes.filter((f) => f.ok).length}/${fontes.length}</b><span>fontes responderam</span></div>
</div>
${(r?.avisos ?? []).map((a) => `<div class="aviso">${esc(a)}</div>`).join("")}
${aprov.length ? aprov.map(ficha).join("\n") : (semNota.length ? "" : '<div class="vazio">Nenhuma vaga passou do corte nesta rodada.</div>')}
${semNota.length ? `<h2>Sem avaliação (${semNota.length})</h2>` + semNota.map(fichaSemNota).join("\n") : ""}
</section>`;

const telaCand = `<section class="view" id="v-cand" hidden>
<header><h1>Minhas candidaturas <span id="pendentes"></span></h1><p class="sub">As vagas em que você se candidatou e os passos que faltam em cada uma. Só você vê esta área.</p></header>
<div class="vazio" id="minhas-off">Entre com seu e-mail e senha para ver suas candidaturas. <button class="sec entrar2">Entrar</button></div>
<div id="minhas" hidden>
  <div id="minhas-lista"></div>
  <details class="nova"><summary>+ Adicionar candidatura</summary>
    <form id="nova-form"><input name="empresa" placeholder="Empresa" required><input name="cargo" placeholder="Cargo" required><input name="link" type="url" placeholder="Link da vaga (opcional)"><label>Prazo <input name="prazo" type="date"></label><button class="btn" type="submit">Adicionar</button></form>
  </details>
</div>
</section>`;

const telaDesc = `<section class="view" id="v-desc" hidden>
<header><h1>Descartadas</h1><p class="sub">As vagas que você marcou como sem interesse e as que o radar deixou de fora nesta rodada.</p></header>
<h2>Sem interesse (marcadas por você)</h2>
<div id="sem-int"><div class="vazio">Entre para ver as vagas que você descartou.</div></div>
<h2>Deixadas de fora pelo radar</h2>
${desc.length ? `<table><tr><th>Vaga</th><th>Fonte / data</th><th>Motivo</th></tr>${desc.map((d) => `<tr><td><b>${d.link ? `<a href="${esc(d.link)}" target="_blank" rel="noopener">${esc(d.cargo)}</a>` : esc(d.cargo)}</b><br>${esc(d.empresa)}</td><td>${esc(d.fonte)}<br>${esc(d.data)}</td><td>${esc(d.motivo)}</td></tr>`).join("")}</table>` : '<div class="vazio">Nenhuma vaga descartada nesta rodada.</div>'}
</section>`;

const telaFontes = `<section class="view" id="v-fontes" hidden>
<header><h1>Fontes</h1><p class="sub">Os quadros de vagas consultados nesta rodada e quais responderam.</p></header>
${fontes.length ? `<table><tr><th>Fonte</th><th>Situação</th><th>Detalhe</th></tr>${fontes.map((f) => `<tr><td>${esc(f.nome)}</td><td class="${f.ok ? "ok" : "nok"}">${f.ok ? "Respondeu" : "Não respondeu"}</td><td>${esc(f.detalhe)}</td></tr>`).join("")}</table>` : '<div class="vazio">Sem dados de fontes.</div>'}
</section>`;

const corpo = falhaHtml + telaInicio + telaVagas + telaCand + telaDesc + telaFontes;

const sup = cfg.supabase ?? {};
const paraJs = (o) => JSON.stringify(o).replace(/</g, "\\u003c");
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#4a0d26"><link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="apple-touch-icon.png"><link rel="icon" href="icone-192.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Radar"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<title>Radar de vagas — ${br(falha || !r ? hoje : r.data)}</title><style>${css}</style></head><body>
<div class="app">
<aside class="lado">
  <div class="marca"><span class="logo">◎</span>Radar de vagas</div>
  <nav>
    <a href="#inicio" data-v="inicio" class="ativo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l9-8 9 8M5 9.5V21h5v-6h4v6h5V9.5"/></svg><span>Início</span></a>
    <a href="#vagas" data-v="vagas"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v13H4zM9 7V4h6v3M4 12h16"/></svg><span>Vagas<i> de hoje</i></span> <b>${aprov.length + semNota.length || ""}</b></a>
    <a href="#candidaturas" data-v="cand"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4h6v3H9zM7 5H5v16h14V5h-2M8.5 13l2.5 2.5 4.5-5"/></svg><span><i>Minhas c</i><em>C</em>andidaturas</span> <b id="nav-pend"></b></a>
    <a href="#descartadas" data-v="desc"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/></svg><span>Descartadas</span> <b>${desc.length || ""}</b></a>
    <a href="#fontes" data-v="fontes"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg><span>Fontes</span> <b>${fontes.length ? `${fontes.filter((f) => f.ok).length}/${fontes.length}` : ""}</b></a>
  </nav>
  <div class="fim"><div class="conta" id="conta"></div><p>Atualizado todo dia às 9h e às 15h. Nada é enviado: você revisa e você se candidata.</p></div>
</aside>
<main>
<div id="antigo"></div>
${corpo}
</main>
</div>
<dialog id="login"><form method="dialog" id="login-form">
  <h3>Entrar</h3>
  <label>E-mail<input type="email" id="login-email" autocomplete="username" required></label>
  <label>Senha<input type="password" id="login-senha" autocomplete="current-password" required></label>
  <p id="login-erro"></p>
  <button type="button" class="link-sec" id="esqueci">Esqueci minha senha</button>
  <div class="acoes"><button type="button" class="sec" id="login-cancelar">Cancelar</button><button class="btn" type="submit">Entrar</button></div>
</form></dialog>
<dialog id="nova-senha"><form method="dialog" id="nova-senha-form">
  <h3>Criar nova senha</h3>
  <p class="dica">Escolha uma senha com pelo menos 8 caracteres.</p>
  <label>Nova senha<input type="password" id="ns-1" autocomplete="new-password" minlength="8" required></label>
  <label>Repita a nova senha<input type="password" id="ns-2" autocomplete="new-password" minlength="8" required></label>
  <p id="ns-erro"></p>
  <div class="acoes"><button class="btn" type="submit">Salvar senha</button></div>
</form></dialog>
<script type="module">
const RODADA = ${paraJs(falha || !r ? "" : r.data)};
const NOMES = { inicio: "inicio", vagas: "vagas", cand: "candidaturas", desc: "descartadas", fontes: "fontes" };
const VAGAS = ${paraJs(vagasJs)};
const SUP = ${paraJs({ url: sup.url || "", chave: sup.chavePublica || "" })};
const $ = (s, p = document) => p.querySelector(s), $$ = (s, p = document) => [...p.querySelectorAll(s)];

// aviso quando a página aberta é de um dia anterior
(function () {
  if (!RODADA) return;
  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  if (hoje === RODADA) return;
  const f = (d) => d.split("-").reverse().join("/");
  $("#antigo").innerHTML = '<div class="falha"><b>A rodada de hoje (' + f(hoje) + ') ainda não aconteceu.</b><br>O que aparece abaixo é da rodada de ' + f(RODADA) + ': são dados antigos. A primeira rodada do dia começa por volta das 8h15 e pode atrasar; se passar das 10h, veja a aba Actions do repositório.</div>';
})();

// navegação pelo menu lateral
function mostrar(v) {
  if (!NOMES[v]) v = "inicio";
  for (const t of $$(".view")) t.hidden = t.id !== "v-" + v;
  for (const a of $$(".lado nav a")) a.classList.toggle("ativo", a.dataset.v === v);
  if (location.hash !== "#" + NOMES[v] && !/access_token|error_description/.test(location.hash)) history.replaceState(null, "", "#" + NOMES[v]);
  window.scrollTo(0, 0);
}
document.addEventListener("click", (e) => { const a = e.target.closest(".lado nav a"); if (a) { e.preventDefault(); mostrar(a.dataset.v); } });
mostrar(Object.keys(NOMES).find((k) => "#" + NOMES[k] === location.hash) || "inicio");
document.addEventListener("click", (e) => { const d = e.target.closest("[data-ir]"); if (d) { e.preventDefault(); mostrar(d.dataset.ir); } });

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
  if (!SUP.url || !SUP.chave) $("#minhas-off").textContent = "O login ainda não foi ligado neste site.";
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
// esqueci minha senha: o Supabase manda um link para o e-mail; ao voltar por ele, o site pede a senha nova
$("#esqueci").addEventListener("click", async () => {
  const erro = $("#login-erro"), email = $("#login-email").value.trim();
  erro.className = "";
  if (!email) { erro.textContent = "Digite seu e-mail acima e toque de novo em Esqueci minha senha."; return; }
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
  if (error) { erro.textContent = "Não consegui enviar o link: " + error.message; return; }
  erro.className = "ok"; erro.textContent = "Pronto! Enviamos um link para " + email + ". Abra o e-mail (veja também o spam) e toque no link para criar a senha nova.";
});
$("#nova-senha-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const a = $("#ns-1").value, b = $("#ns-2").value, erro = $("#ns-erro");
  if (a !== b) { erro.textContent = "As duas senhas não são iguais."; return; }
  const { error } = await sb.auth.updateUser({ password: a });
  if (error) { erro.textContent = "Não consegui salvar: " + error.message; return; }
  $("#ns-1").value = $("#ns-2").value = ""; $("#nova-senha").close(); alert("Senha nova salva. Você já está conectada.");
});
document.addEventListener("submit", (e) => {
  const f = e.target.closest(".ia-form"); if (!f) return; e.preventDefault();
  const t = $("textarea", f), texto = t.value.trim(); if (!texto || !sessao) return; t.value = ""; perguntar(f.closest(".ia"), texto);
});

// minhas candidaturas (só com login; os dados ficam no Supabase e só a dona os lê)
const escH = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dataBr = (d) => (d ? d.split("-").reverse().join("/") : "");
const SITUACOES = ["Em andamento", "Aguardando retorno", "Entrevista marcada", "Aprovada", "Encerrada"];
let minhasCand = [], semInt = [];
const nrmV = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const mesmaVaga = (a, b) => a.link === b.link || (nrmV(a.empresa) && nrmV(a.empresa) === nrmV(b.empresa) && nrmV(a.cargo) === nrmV(b.cargo));
function aplicarSemInteresse() {
  for (const art of $$(".vaga")) { const v = VAGAS[Number(art.dataset.i)]; if (v) art.classList.toggle("oculta", semInt.some((x) => mesmaVaga(x, v))); }
  const d = $(".destaque[data-link]"); if (d) d.classList.toggle("oculta", semInt.some((x) => x.link === d.dataset.link));
  const box = $("#sem-int"); if (!box) return;
  if (!sessao) { box.innerHTML = '<div class="vazio">Entre para ver as vagas que você descartou.</div>'; return; }
  box.innerHTML = semInt.length ? "<table><tr><th>Vaga</th><th>Descartada em</th><th></th></tr>" + semInt.map((x) =>
    "<tr><td><b>" + (x.link ? '<a href="' + escH(x.link) + '" target="_blank" rel="noopener">' + escH(x.cargo) + "</a>" : escH(x.cargo)) + "</b><br>" + escH(x.empresa) + "</td><td>" + dataBr(x.criado_em.slice(0, 10)) +
    '</td><td><button class="sec desfazer" data-id="' + x.id + '">Desfazer</button></td></tr>').join("") + "</table>"
    : '<div class="vazio">Você ainda não marcou nenhuma vaga como sem interesse.</div>';
}
function pintarInicio(data) {
  const pend = $("#ini-pend"), cand = $("#ini-cand"), boxP = $("#ini-passos"), boxZ = $("#ini-prazos");
  if (!pend) return;
  if (!data) {
    pend.textContent = "–"; cand.textContent = "–";
    const msg = SUP.url ? 'Entre para ver. <button class="sec entrar2">Entrar</button>' : "O login ainda não foi ligado neste site.";
    boxP.innerHTML = boxZ.innerHTML = '<div class="vazio">' + msg + "</div>"; return;
  }
  const ativas = data.filter((c) => c.situacao !== "Encerrada");
  const passos = ativas.flatMap((c) => c.passos.filter((p) => !p.feito).map((p) => ({ ...p, c })))
    .sort((a, b) => (a.c.prazo || "9999").localeCompare(b.c.prazo || "9999") || a.ordem - b.ordem);
  pend.textContent = passos.length; cand.textContent = ativas.length;
  boxP.innerHTML = passos.length ? "<ul>" + passos.slice(0, 6).map((p) => "<li><span>" + escH(p.texto) + "</span><small>" + escH(p.c.empresa) + "</small></li>").join("") + "</ul>" : '<div class="vazio">Nenhum passo pendente. 🎉</div>';
  const hoje = new Date(new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }) + "T12:00:00");
  const comPrazo = ativas.filter((c) => c.prazo).sort((a, b) => a.prazo.localeCompare(b.prazo));
  boxZ.innerHTML = comPrazo.length ? "<ul>" + comPrazo.map((c) => {
    const dias = Math.round((new Date(c.prazo + "T12:00:00") - hoje) / 864e5);
    const txt = dias < 0 ? "encerrado" : dias === 0 ? "termina hoje" : dias === 1 ? "falta 1 dia" : "faltam " + dias + " dias";
    return "<li><span><b>" + escH(c.empresa) + "</b> · até " + dataBr(c.prazo) + '</span><small class="' + (dias >= 0 && dias <= 3 ? "urgente" : "") + '">' + txt + "</small></li>";
  }).join("") + "</ul>" : '<div class="vazio">Nenhuma candidatura com prazo.</div>';
}
async function carregarMinhas() {
  const sec = $("#minhas"); if (!sec) return;
  $$(".ja, .nao").forEach((b) => (b.hidden = !sessao));
  $("#minhas-off").hidden = !!(sb && sessao);
  if (!sb || !sessao) { sec.hidden = true; $("#nav-pend").textContent = ""; pintarInicio(null); semInt = []; aplicarSemInteresse(); return; }
  const si = await sb.from("sem_interesse").select("*").order("criado_em", { ascending: false });
  semInt = si.data ?? []; aplicarSemInteresse();
  sec.hidden = false;
  const { data, error } = await sb.from("candidaturas").select("*, passos(*)").order("candidatou_em", { ascending: false });
  const lista = $("#minhas-lista");
  if (error) { lista.innerHTML = '<div class="vazio">Não consegui carregar suas candidaturas: ' + escH(error.message) + "</div>"; return; }
  minhasCand = data;
  pintarInicio(data);
  const nrm = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  for (const art of $$(".vaga")) {
    const v = VAGAS[Number(art.dataset.i)]; if (!v) continue;
    const ja = data.some((c) => c.link === v.link || (nrm(c.empresa).includes(nrm(v.empresa).split(" ")[0]) && nrm(c.cargo) === nrm(v.cargo)));
    const b = $(".ja", art); if (b) b.hidden = ja;
    let tag = $(".tag-ja", art);
    if (ja && !tag) { tag = document.createElement("span"); tag.className = "alerta tag-ja"; tag.textContent = "você já se candidatou"; $(".tags", art)?.appendChild(tag); }
    if (!ja && tag) tag.remove();
  }
  const pend = data.filter((c) => c.situacao !== "Encerrada").reduce((n, c) => n + c.passos.filter((p) => !p.feito).length, 0);
  $("#nav-pend").textContent = pend || "";
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
  const nao = e.target.closest(".nao");
  if (nao) {
    const v = VAGAS[Number(nao.dataset.i)], art = nao.closest(".vaga");
    art.classList.add("oculta");
    const { data, error } = await sb.from("sem_interesse").upsert({ link: v.link, empresa: v.empresa, cargo: v.cargo }, { onConflict: "user_id,link" }).select().single();
    if (falhou(error)) { art.classList.remove("oculta"); return; }
    semInt = [data, ...semInt.filter((x) => x.id !== data.id)]; aplicarSemInteresse();
  }
  const dz = e.target.closest(".desfazer");
  if (dz) { if (falhou((await sb.from("sem_interesse").delete().eq("id", dz.dataset.id)).error)) return; semInt = semInt.filter((x) => x.id !== dz.dataset.id); aplicarSemInteresse(); }
  const ja = e.target.closest(".ja");
  if (ja) {
    const v = VAGAS[Number(ja.dataset.i)];
    if (minhasCand.some((m) => m.link === v.link)) { alert("Esta vaga já está nas suas candidaturas."); return; }
    await criarCandidatura({ empresa: v.empresa, cargo: v.cargo, link: v.link });
    mostrar("cand");
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
    const recuperando = /type=recovery/.test(location.hash);
    const erroLink = new URLSearchParams(location.hash.slice(1)).get("error_description");
    if (erroLink) { history.replaceState(null, "", location.pathname + "#inicio"); alert("O link do e-mail não funcionou (" + erroLink + "). Ele vale por pouco tempo e só uma vez: peça outro em Entrar > Esqueci minha senha."); }
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    sb = createClient(SUP.url, SUP.chave);
    sessao = (await sb.auth.getSession()).data.session;
    sb.auth.onAuthStateChange((ev, s) => { sessao = s; pintar(); setTimeout(carregarMinhas, 0); if (ev === "PASSWORD_RECOVERY") $("#nova-senha").showModal(); });
    if (recuperando && sessao) { history.replaceState(null, "", location.pathname + "#inicio"); $("#nova-senha").showModal(); }
  } catch (e) { console.error(e); }
  pintar(); carregarMinhas();
}
</script></body></html>`;
fs.mkdirSync(path.join(raiz, "site"), { recursive: true });
fs.writeFileSync(path.join(raiz, "site/index.html"), html);
for (const a of fs.readdirSync(path.join(raiz, "estatico"))) fs.copyFileSync(path.join(raiz, "estatico", a), path.join(raiz, "site", a)); // ícones e manifest (instalar na tela inicial)
if (r) fs.writeFileSync(path.join(raiz, "site/rodada.json"), JSON.stringify(r)); // a próxima rodada reaproveita as avaliações
console.log("site/index.html gerado" + (falha ? " (com aviso de falha)" : ""));
