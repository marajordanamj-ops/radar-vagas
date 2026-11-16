// Gera painel.html a partir de dados/rodada.json.
// Uso: node scripts/gerar_painel.mjs            -> painel da rodada
//      node scripts/gerar_painel.mjs --falha "motivo" -> painel dizendo que a rodada de hoje falhou
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arq = path.join(raiz, "dados/rodada.json");
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
  const t = h < 48 ? `há ${h} h` : `há ${Math.round(h / 24)} dias`;
  return v.horaConfirmada ? t : `${t} (a fonte só informa o dia)`;
}
const classe = (n) => (n >= 85 ? "alta" : n >= 70 ? "media" : "baixa");

function ficha(v) {
  return `<article class="ficha">
  <header>
    <div class="nota ${classe(v.nota)}"><b>${v.nota}</b><span>/100</span></div>
    <div class="tit">
      <h3>${esc(v.cargo)}</h3>
      <p class="emp">${esc(v.empresa)} · ${esc(v.modalidade)} · ${esc(v.contrato)} · ${esc(v.fonte)}</p>
      <p class="meta">Publicada em ${br(v.publicadoEm.slice(0, 10))} · ${esc(idade(v))}${v.foraDaJanela ? ' · <span class="tag fora">fora da janela de 24h</span>' : ""}${v.abaixoDoCorte ? ' · <span class="tag fora">abaixo do corte de 70</span>' : ""}</p>
    </div>
    <a class="btn" href="${esc(v.link)}" target="_blank" rel="noopener">Abrir vaga</a>
  </header>
  <p class="just">${esc(v.justificativa)}</p>
  <h4>Pontos de atenção</h4>
  <ul>${v.atencao.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>
  <h4>Candidatura <button class="copiar" data-alvo="c-${esc(v.id)}">Copiar</button></h4>
  <div class="carta" id="c-${esc(v.id)}">${v.candidatura.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
  <h4>Palavras-chave da vaga que não estão no seu currículo</h4>
  <p class="dica">Diga quais você realmente tem. Só entram no currículo as que você confirmar.</p>
  <ul class="chips">${v.palavrasFaltantes.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
  ${v.curriculo ? `<h4>Para o currículo desta vaga</h4><p class="cv"><b>Título:</b> ${esc(v.curriculo.titulo)}</p><p class="cv"><b>Resumo:</b> ${esc(v.curriculo.resumo)}</p><p class="cv"><b>Competências:</b> ${esc((v.curriculo.competencias || []).join(" | "))}</p>` : ""}
  ${v.arquivoCurriculo && fs.existsSync(path.join(raiz, "site", v.arquivoCurriculo)) ? `<p class="cv"><a href="${esc(v.arquivoCurriculo)}">Baixar currículo adaptado (.docx, sem telefone e e-mail)</a></p>` : ""}
</article>`;
}

const css = `:root{--tinta:#1b2430;--suave:#5b6675;--linha:#e2e6ec;--fundo:#f5f6f8;--azul:#1f3864;--verde:#1d7a4f;--ambar:#a8620b;--verm:#b3261e}
*{box-sizing:border-box}body{margin:0;font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--tinta);background:var(--fundo)}
main{max-width:920px;margin:0 auto;padding:28px 20px 60px}h1{font-size:26px;margin:0 0 4px;color:var(--azul)}h2{font-size:19px;margin:36px 0 12px;color:var(--azul)}
h3{font-size:18px;margin:0}h4{font-size:14px;text-transform:uppercase;letter-spacing:.04em;color:var(--suave);margin:20px 0 6px}
.sub{color:var(--suave);margin:0}.resumo{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:20px 0}
.card{background:#fff;border:1px solid var(--linha);border-radius:10px;padding:14px 16px}.card b{display:block;font-size:26px;color:var(--azul)}.card span{color:var(--suave);font-size:14px}
.aviso{background:#fff8e6;border:1px solid #f0d58a;border-radius:10px;padding:12px 16px;margin:8px 0}.falha{background:#fdecea;border:2px solid var(--verm);border-radius:10px;padding:16px 18px;margin:18px 0;color:#7a1712}
.falha b{font-size:18px}.ficha{background:#fff;border:1px solid var(--linha);border-radius:12px;padding:20px 22px;margin:16px 0}
.ficha header{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap}.tit{flex:1;min-width:240px}.emp,.meta{margin:2px 0;color:var(--suave);font-size:14px}
.nota{border-radius:10px;padding:8px 12px;text-align:center;color:#fff;min-width:68px}.nota b{font-size:26px;line-height:1}.nota span{font-size:12px;opacity:.85}
.alta{background:var(--verde)}.media{background:var(--ambar)}.baixa{background:var(--verm)}
.btn,.copiar{font:inherit;font-size:14px;border-radius:8px;cursor:pointer;text-decoration:none}.btn{background:var(--azul);color:#fff;padding:8px 14px}
.copiar{margin-left:8px;border:1px solid var(--azul);background:#fff;color:var(--azul);padding:2px 10px;text-transform:none;letter-spacing:0}
.just{margin:14px 0 0}.carta{background:var(--fundo);border-radius:8px;padding:6px 16px}.dica{color:var(--suave);font-size:14px;margin:0 0 6px}
.chips{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:6px}.chips li{background:#eef1f6;border-radius:999px;padding:3px 12px;font-size:14px}
.tag{border-radius:999px;padding:1px 9px;font-size:12px}.fora{background:#fde8c8;color:#7a4a05}.cv{font-size:14px;color:var(--suave)}code{background:#eef1f6;padding:1px 6px;border-radius:4px}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--linha);border-radius:10px;overflow:hidden;font-size:14px}
th,td{text-align:left;padding:9px 12px;border-bottom:1px solid var(--linha);vertical-align:top}th{background:#eef1f6;color:var(--suave);font-weight:600}
.ok{color:var(--verde);font-weight:600}.nok{color:var(--verm);font-weight:600}@media(max-width:600px){td:nth-child(3),th:nth-child(3){display:none}}`;

let corpo = "";
if (falha) {
  corpo += `<div class="falha"><b>A rodada de ${br(hoje)} falhou.</b><br>${esc(falha)}<br>Nenhum resultado de hoje está disponível.${r ? ` A última rodada concluída foi em ${br(r.data)} e aparece abaixo só como referência: são dados antigos.` : ""}</div>`;
}
if (r) {
  const aprov = r.vagas ?? [], desc = r.descartadas ?? [], fontes = r.fontes ?? [];
  const naJanela = aprov.filter((v) => !v.foraDaJanela && !v.abaixoDoCorte).length;
  corpo += `${falha ? `<h2>Última rodada concluída (${br(r.data)}) — dados antigos</h2>` : ""}
<section class="resumo">
  <div class="card"><b>${naJanela}</b><span>vagas nas últimas 24h com nota 70+</span></div>
  <div class="card"><b>${aprov.filter((v) => v.abaixoDoCorte).length}</b><span>abaixo do corte, mostradas como referência</span></div>
  <div class="card"><b>${desc.length}</b><span>descartadas</span></div>
  <div class="card"><b>${fontes.filter((f) => f.ok).length}/${fontes.length}</b><span>fontes que responderam</span></div>
</section>
${(r.avisos ?? []).map((a) => `<div class="aviso">${esc(a)}</div>`).join("")}
<h2>Vagas para você revisar</h2>
${aprov.length ? aprov.map(ficha).join("\n") : '<p class="sub">Nenhuma vaga passou do corte nesta rodada.</p>'}
<h2>Fontes consultadas</h2>
<table><tr><th>Fonte</th><th>Situação</th><th>Detalhe</th></tr>${fontes.map((f) => `<tr><td>${esc(f.nome)}</td><td class="${f.ok ? "ok" : "nok"}">${f.ok ? "Respondeu" : "Não respondeu / não consultada"}</td><td>${esc(f.detalhe)}</td></tr>`).join("")}</table>
<h2>Descartadas e por quê</h2>
<table><tr><th>Vaga</th><th>Fonte / data</th><th>Motivo</th></tr>${desc.map((d) => `<tr><td><b>${esc(d.cargo)}</b><br>${esc(d.empresa)}</td><td>${esc(d.fonte)}<br>${esc(d.data)}</td><td>${esc(d.motivo)}</td></tr>`).join("")}</table>`;
}

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Radar de vagas — ${br(falha ? hoje : r.data)}</title><style>${css}</style></head><body><main>
<h1>Radar de vagas</h1>
<p class="sub">${falha ? `Painel gerado em ${br(hoje)}` : `Rodada de ${br(r.data)} às ${esc(r.hora)}`} · SDR, BDR e Pré-vendas · júnior · remoto · Brasil. Atualizado todo dia antes das 9h. Nada é enviado: você revisa e você se candidata.</p>
${corpo}
</main><script>
(function(){ // aviso quando a página aberta é de um dia anterior (a rodada de hoje ainda não aconteceu)
  var rodada=${JSON.stringify(falha || !r ? "" : r.data)}; if(!rodada) return;
  var hoje=new Date().toLocaleDateString("sv-SE",{timeZone:"America/Sao_Paulo"});
  if(hoje===rodada) return;
  var f=function(d){return d.split("-").reverse().join("/")};
  var d=document.createElement("div"); d.className="falha";
  d.innerHTML="<b>A rodada de hoje ("+f(hoje)+") ainda não aconteceu.</b><br>O que aparece abaixo é da rodada de "+f(rodada)+": são dados antigos. A rodada automática começa por volta das 8h15 e pode atrasar; se passar das 10h, veja a aba Actions do repositório.";
  var m=document.querySelector("main"); m.insertBefore(d,m.children[2]||null);
})();
document.querySelectorAll(".copiar").forEach(function(b){b.addEventListener("click",function(){
  var t=Array.from(document.getElementById(b.dataset.alvo).querySelectorAll("p")).map(function(p){return p.textContent}).join("\\n\\n");
  function ok(){b.textContent="Copiado";setTimeout(function(){b.textContent="Copiar"},1500)}
  function antigo(){var a=document.createElement("textarea");a.value=t;document.body.appendChild(a);a.select();document.execCommand("copy");a.remove();ok()}
  if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(t).then(ok,antigo)}else{antigo()}
})});
</script></body></html>`;
fs.mkdirSync(path.join(raiz, "site"), { recursive: true });
fs.writeFileSync(path.join(raiz, "site/index.html"), html);
console.log("site/index.html gerado" + (falha ? " (com aviso de falha)" : ""));
