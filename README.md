# Radar de vagas — site no GitHub

Todo dia por volta das 8h17 (horário de Brasília), para estar pronto às 9h, o GitHub busca vagas de SDR, BDR e Pré-vendas, pede a avaliação ao Gemini e publica o resultado em um site. Nada é enviado nem candidatado: você revisa e você se candidata.

## Como colocar no ar (uma vez só)

1. **Criar o repositório.** No GitHub, clique em "New repository", dê o nome `radar-vagas`, marque **Public** e crie.
2. **Enviar os arquivos.** Envie para o repositório todo o conteúdo desta pasta, incluindo a pasta `.github`.
3. **Criar a chave do Gemini.** Entre em https://aistudio.google.com/apikey com sua conta Google, clique em "Create API key" e copie a chave.
4. **Guardar os dois segredos.** No repositório: Settings → Secrets and variables → Actions → "New repository secret". Crie dois:
   - `GEMINI_API_KEY`: cole a chave do passo 3.
   - `CURRICULO_JSON`: cole o conteúdo inteiro do arquivo `curriculo_para_segredo.json` (ele não faz parte do repositório).
5. **Ligar o site.** Settings → Pages → em "Source", escolha **GitHub Actions**.
6. **Rodar a primeira vez.** Aba Actions → "Radar de vagas" → "Run workflow". Em alguns minutos o endereço do site aparece na própria execução e em Settings → Pages.

## Como saber se está funcionando
- Abra o site: o topo mostra a data e a hora da rodada. Se a rodada falhar, aparece um aviso vermelho em vez de dados antigos.
- Aba Actions: cada dia tem uma execução. Verde = funcionou; vermelha = falhou (clique para ler o registro).

## O que fica público e o que não fica
- **Público (qualquer pessoa com o link):** as vagas, as notas e os textos de candidatura, que citam sua trajetória profissional. O site pede aos buscadores que não o indexem, mas isso não é uma trava.
- **Não vai para o site nem para o repositório:** seu nome, telefone, e-mail e o currículo completo. O currículo fica no segredo `CURRICULO_JSON`, sem telefone e e-mail.
- **Vai para o Google (Gemini):** o currículo sem nome, telefone e e-mail, e o texto de cada vaga. No nível gratuito, o Google pode usar esse conteúdo para melhorar os produtos dele.

## Ajustes
- Horário: `.github/workflows/radar.yml`, linha `cron` (está em UTC: 11:17 = 8h17 de Brasília).
- Filtros, termos de busca e quadros de vagas: `config.json`.
- Atualizar o currículo: edite o segredo `CURRICULO_JSON`.
- `publicarCurriculos: true` em `config.json` passa a gerar um .docx por vaga, público, com seu nome e sem telefone e e-mail.

## Limites conhecidos
- O GitHub desativa execuções agendadas depois de 60 dias sem alteração no repositório; ele avisa por e-mail e basta reativar.
- As fontes de vagas podem recusar acessos vindos do GitHub. A tabela "Fontes consultadas" do site mostra quais responderam.
- A Gupy mostra cerca de 12 vagas por termo: a cobertura é parcial.
- No máximo 12 vagas por dia são avaliadas, para caber no nível gratuito do Gemini.

## Assistente de candidatura (login com Supabase)
O site tem um assistente por vaga (responder perguntas de formulário, ajustar a candidatura, roteiro de vídeo, conversa livre). Ele só funciona depois de ligar um projeto do Supabase:
1. Crie um projeto em supabase.com.
2. Em Authentication, crie o seu usuário (e-mail e senha) e desative o cadastro de novos usuários.
3. Em Edge Functions, crie a função `assistente` com o código de `supabase/functions/assistente/index.ts`.
4. Nos segredos das Edge Functions, crie `GEMINI_API_KEY`, `CURRICULO_JSON` e `EMAIL_PERMITIDO` (o e-mail do passo 2).
5. Em `config.json`, preencha `supabase.url` e `supabase.chavePublica` (a chave pública do projeto; nunca a chave secreta).
A chave do Gemini e o currículo ficam só nos segredos do Supabase; o navegador nunca os recebe.
