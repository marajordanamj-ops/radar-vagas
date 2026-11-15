// Gera um .docx por vaga aprovada (e o currículo-base), lendo curriculo_base.json e dados/rodada.json.
// Formato pensado para ATS: coluna única, sem tabelas nem ícones, títulos de seção padrão.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, LevelFormat, AlignmentType, BorderStyle } from "docx";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ler = (p) => JSON.parse(fs.readFileSync(path.join(raiz, p), "utf8"));
const FONTE = "Arial";

function secao(titulo) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1F3864", space: 2 } },
    children: [new TextRun({ text: titulo.toUpperCase(), font: FONTE, size: 22, bold: true, color: "1F3864" })],
  });
}
const texto = (t, extra = {}) =>
  new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: t, font: FONTE, size: 20 })], ...extra });
const item = (t) =>
  new Paragraph({ numbering: { reference: "itens", level: 0 }, spacing: { after: 40 }, children: [new TextRun({ text: t, font: FONTE, size: 20 })] });

function montar(cv) {
  const f = [];
  f.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: cv.nome.toUpperCase(), font: FONTE, size: 36, bold: true, color: "1F3864" })] }));
  f.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: cv.titulo, font: FONTE, size: 24, bold: true })] }));
  f.push(texto(cv.contato.join(" | "), { spacing: { after: 120 } }));
  f.push(secao("Resumo"), texto(cv.resumo));
  f.push(secao("Competências"), texto(cv.competencias.join(" | ")));
  f.push(secao("Experiência"));
  for (const e of cv.experiencias) {
    f.push(new Paragraph({ spacing: { before: 100, after: 20 }, keepNext: true, children: [new TextRun({ text: e.cargo, font: FONTE, size: 22, bold: true })] }));
    f.push(new Paragraph({ spacing: { after: 60 }, keepNext: true, children: [new TextRun({ text: `${e.empresa} | ${e.periodo}`, font: FONTE, size: 20, color: "444444" })] }));
    f.push(...e.itens.map(item));
  }
  f.push(secao("Formação"), ...cv.formacao.map((t) => texto(t)));
  if (cv.cursos?.length) f.push(secao("Cursos"), ...cv.cursos.map(item));
  if (cv.idiomas?.length) f.push(secao("Idiomas"), ...cv.idiomas.map(item));
  return new Document({
    creator: cv.nome,
    title: `Currículo - ${cv.nome}`,
    styles: {
      default: {
        document: { run: { font: FONTE, size: 20 } },
        heading1: { run: { font: FONTE, size: 22, bold: true }, paragraph: { spacing: { before: 170, after: 80 }, keepNext: true } },
      },
    },
    numbering: { config: [{ reference: "itens", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 220 } } } }] }] },
    sections: [{ properties: { page: { margin: { top: 620, bottom: 620, left: 1100, right: 1100 } } }, children: f }],
  });
}

async function salvar(cv, destino) {
  const abs = path.join(raiz, destino);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, await Packer.toBuffer(montar(cv)));
  console.log("gerado:", destino);
}

const cfg = ler("config.json");
if (!cfg.publicarCurriculos) { console.log("publicarCurriculos=false: nenhum .docx gerado."); process.exit(0); }
const base = process.env.CURRICULO_JSON ? JSON.parse(process.env.CURRICULO_JSON) : ler("curriculo_base.json");
base.contato = [base.contato?.[0] || "", "[telefone]", "[e-mail]"]; // dados de contato nunca vão para o site
const rodadaPath = path.join(raiz, "dados/rodada.json");
if (fs.existsSync(rodadaPath)) {
  for (const v of ler("dados/rodada.json").vagas ?? []) {
    if (!v.curriculo || !v.arquivoCurriculo) continue;
    // A adaptação só troca título, resumo, competências e a ordem dos itens; os fatos vêm do currículo-base.
    await salvar({ ...base, ...v.curriculo }, "site/" + v.arquivoCurriculo);
  }
}
