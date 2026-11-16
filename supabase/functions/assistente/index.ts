// Função do Supabase (Edge Function) que atende o "Assistente de candidatura" do site.
// Só responde a quem está logado com o e-mail permitido. A chave do Gemini e o currículo
// ficam nos segredos da função e nunca vão para o navegador.
// Segredos necessários: GEMINI_API_KEY, CURRICULO_JSON, EMAIL_PERMITIDO.

const API = "https://generativelanguage.googleapis.com/v1beta";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, "content-type": "application/json" } });

let modelosCache: string[] | null = null;
async function modelos(chave: string): Promise<string[]> {
  if (modelosCache) return modelosCache;
  const r = await fetch(`${API}/models?pageSize=200`, { headers: { "x-goog-api-key": chave } });
  if (!r.ok) throw new Error(`Gemini: não consegui listar os modelos (HTTP ${r.status}).`);
  const nomes: string[] = ((await r.json()).models ?? [])
    .filter((m: any) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
    .map((m: any) => String(m.name).replace("models/", ""))
    .filter((n: string) => /^gemini-[\d.]+-flash/.test(n) && !/image|tts|live|audio|embedding|native|preview|exp/.test(n));
  const versao = (n: string) => parseFloat(n.match(/^gemini-([\d.]+)/)![1]);
  nomes.sort((a, b) => versao(b) * 10 - (/lite/.test(b) ? 1 : 0) - (versao(a) * 10 - (/lite/.test(a) ? 1 : 0)));
  if (!nomes.length) throw new Error("Gemini: nenhum modelo disponível para esta chave.");
  modelosCache = nomes.slice(0, 4);
  return modelosCache;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ erro: "Use POST." }, 405);
  try {
    // 1. quem está chamando?
    const auth = req.headers.get("authorization") ?? "";
    const apikey = req.headers.get("apikey") ?? "";
    const u = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/user`, { headers: { authorization: auth, apikey } });
    if (!u.ok) return json({ erro: "Faça login para usar o assistente." }, 401);
    const email = String((await u.json()).email ?? "").toLowerCase();
    const permitido = String(Deno.env.get("EMAIL_PERMITIDO") ?? "").toLowerCase().trim();
    if (!permitido || email !== permitido) return json({ erro: "Esta conta não tem acesso ao assistente." }, 403);

    // 2. dados
    const chave = Deno.env.get("GEMINI_API_KEY");
    const cvTexto = Deno.env.get("CURRICULO_JSON");
    if (!chave || !cvTexto) return json({ erro: "Faltam os segredos GEMINI_API_KEY ou CURRICULO_JSON na função." }, 500);
    const { contato: _c, ...cv } = JSON.parse(cvTexto); // telefone e e-mail não vão para o Gemini
    const { vaga = {}, mensagens = [] } = await req.json();
    const corta = (s: unknown, n: number) => String(s ?? "").slice(0, n);
    const conversa = (Array.isArray(mensagens) ? mensagens : []).slice(-16)
      .map((m: any) => ({ role: m.papel === "model" ? "model" : "user", parts: [{ text: corta(m.texto, 6000) }] }));
    if (!conversa.length || conversa[conversa.length - 1].role !== "user") return json({ erro: "Mensagem vazia." }, 400);

    const sistema = `Você é o assistente de candidatura de uma profissional brasileira de pré-vendas. Ajude-a a se candidatar à vaga abaixo: responder perguntas de formulário, ajustar a carta de candidatura, escrever roteiro de vídeo e tirar dúvidas sobre a vaga.

REGRAS
- Use SOMENTE fatos do currículo abaixo e do que ela disser nesta conversa. Não invente experiência, ferramenta, número, meta nem nível de domínio.
- Se a resposta depender de um fato que não está no currículo (por exemplo, pretensão salarial, modelo de trabalho, motivo pessoal), diga isso e deixe o trecho entre colchetes para ela preencher.
- Seja franca sobre o que falta para a vaga; não esconda nem exagere.
- Escreva em português do Brasil, em primeira pessoa quando o texto for para ela enviar, sem floreio.
- Respeite limites de caracteres quando ela informar e diga quantos caracteres o texto tem.
- Responda em texto simples, sem markdown.
- Nunca peça nem escreva telefone, e-mail, documentos ou senhas.

CURRÍCULO (única fonte de fatos)
${JSON.stringify(cv)}

VAGA
Empresa: ${corta(vaga.empresa, 200)}
Cargo: ${corta(vaga.cargo, 200)}
Pontos de atenção já levantados: ${corta((vaga.atencao ?? []).join(" | "), 2000)}
Candidatura sugerida: ${corta((vaga.candidatura ?? []).join("\n"), 4000)}
Descrição da vaga: ${corta(vaga.descricao, 7000)}`;

    // 3. Gemini, com troca de modelo se um não responder
    let ultimo = "";
    for (const modelo of await modelos(chave)) {
      try {
        const r = await fetch(`${API}/models/${modelo}:generateContent`, {
          method: "POST",
          headers: { "x-goog-api-key": chave, "content-type": "application/json" },
          signal: AbortSignal.timeout(45000),
          body: JSON.stringify({ systemInstruction: { parts: [{ text: sistema }] }, contents: conversa, generationConfig: { temperature: 0.4 } }),
        });
        if (!r.ok) { ultimo = `${modelo}: HTTP ${r.status}`; continue; }
        const j = await r.json();
        const texto = (j.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? "").join("").trim();
        if (texto) return json({ texto, modelo });
        ultimo = `${modelo}: resposta vazia`;
      } catch (e) {
        ultimo = `${modelo}: ${(e as Error).name === "TimeoutError" ? "sem resposta em 45 s" : (e as Error).message}`;
      }
    }
    return json({ erro: `O Gemini não respondeu (${ultimo}). Tente de novo em instantes.` }, 502);
  } catch (e) {
    return json({ erro: (e as Error).message }, 500);
  }
});
