// Vercel Serverless Function — Eros Academy / Eros IA
// The Groq API key stays on the server and is never sent to the app.
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-20b";

const tools = [
  {
    type: "function",
    function: {
      name: "set_day_rest",
      description: "Marca ou desmarca uma data específica como dia de folga no Eros Academy.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Data no formato YYYY-MM-DD." },
          rest: { type: "boolean", description: "true para marcar folga; false para remover a folga." }
        },
        required: ["date", "rest"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "set_session_plan",
      description: "Atualiza o título, a descrição e a seleção de exercícios de mobilidade de uma sessão específica em uma data. Só use exercícios que estejam na lista fornecida pelo aplicativo.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Data no formato YYYY-MM-DD." },
          session: { type: "string", enum: ["m", "t", "n"], description: "m=manhã, t=tarde, n=noite." },
          title: { type: "string", description: "Título curto da sessão." },
          description: { type: "string", description: "Resumo curto e neutro da sessão." },
          exercise_names: {
            type: "array",
            items: { type: "string" },
            description: "Nomes exatos de exercícios existentes na lista do aplicativo."
          }
        },
        required: ["date", "session"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_golpe",
      description: "Cadastra somente um nome/número de golpe informado pelo usuário na biblioteca existente. Não crie nem explique instruções de execução.",
      parameters: {
        type: "object",
        properties: {
          num: { type: "integer", minimum: 1 },
          name: { type: "string" },
          description: { type: "string", description: "Somente texto fornecido pelo próprio usuário; não invente descrição técnica." }
        },
        required: ["num", "name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_golpe",
      description: "Atualiza o nome ou uma descrição já fornecida de um item da biblioteca, identificando-o pelo número. Não acrescente instruções técnicas.",
      parameters: {
        type: "object",
        properties: {
          num: { type: "integer", minimum: 1 },
          name: { type: "string" },
          description: { type: "string", description: "Somente texto fornecido pelo usuário." }
        },
        required: ["num"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_golpe",
      description: "Solicita a exclusão de um item da biblioteca pelo número. O aplicativo sempre pedirá confirmação.",
      parameters: {
        type: "object",
        properties: {
          num: { type: "integer", minimum: 1 }
        },
        required: ["num"]
      }
    }
  }
];

function send(res, status, data) {
  res.status(status).json(data);
}

function cleanActions(message) {
  const allowed = new Set(["set_day_rest", "set_session_plan", "add_golpe", "update_golpe", "delete_golpe"]);
  const calls = Array.isArray(message?.tool_calls) ? message.tool_calls : [];
  const actions = [];
  for (const call of calls.slice(0, 3)) {
    const name = call?.function?.name;
    if (!allowed.has(name)) continue;
    try {
      const args = typeof call.function.arguments === "string"
        ? JSON.parse(call.function.arguments)
        : (call.function.arguments || {});
      if (!args || typeof args !== "object" || Array.isArray(args)) continue;
      actions.push({ name, arguments: args });
    } catch (_) {}
  }
  return actions;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return send(res, 405, { error: "Use POST." });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return send(res, 503, { error: "O servidor ainda não recebeu a variável GROQ_API_KEY." });

  const body = req.body || {};
  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  const messages = rawMessages
    .filter(m => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
    .slice(-12)
    .map(m => ({ role: m.role, content: m.content.slice(0, 1600) }));

  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return send(res, 400, { error: "Envie uma mensagem de usuário." });
  }

  const appState = body.appState && typeof body.appState === "object" ? body.appState : {};
  const stateText = JSON.stringify(appState).slice(0, 14000);
  const system = `
Você é o Eros IA, assistente em português brasileiro integrado ao aplicativo Eros Academy.
Sua função principal é conversar e ajudar a organizar os dados do aplicativo.
Data local do usuário: ${String(appState.today || "não informada")}.
Dia da semana: ${String(appState.weekday || "não informado")}.

ESTADO ATUAL DO APLICATIVO (dados locais fornecidos pelo app):
${stateText}

REGRAS:
- Responda em português brasileiro, de forma natural, direta e simpática.
- Você pode consultar mentalmente o estado fornecido para responder sobre treinos, datas, folgas e itens cadastrados.
- Quando o usuário pedir uma alteração, use a função correspondente. Não diga que alterou algo sem solicitar a função.
- Se faltar uma informação essencial, pergunte antes de executar. O aplicativo tem três sessões: manhã (m, 06:00), tarde (t, 13:00) e noite (n, 20:00). Se o usuário pedir para mudar um treino sem indicar qual sessão e não ficar claro que é o dia inteiro, pergunte qual sessão.
- Quando o usuário mencionar apenas um dia da semana, interprete como a próxima ocorrência desse dia a partir da data local informada. Diga a data por extenso ou no formato DD/MM na resposta.
- "Dia de folga" significa marcar a data inteira como descanso; não apague registros antigos.
- Para atualizar uma sessão, use somente os nomes de exercícios que já aparecem em availableExerciseNames no estado. Não invente exercícios novos. Preserve os nomes exatamente.
- A biblioteca Golpes é um catálogo pessoal. Você pode cadastrar, renomear ou excluir apenas números e nomes informados pelo usuário. Para descrições, use exclusivamente texto que o usuário fornecer. NÃO escreva, complete, explique ou sugira instruções de execução de golpes, ataques ou técnicas de luta.
- Ao excluir um item, o app sempre pedirá confirmação ao usuário.
- Se o usuário pedir algo que não possa ser feito por essas funções, explique a limitação e não finja que fez.
- Nunca invente que um vídeo foi importado: vídeos são adicionados manualmente pela tela de edição do golpe.
- Não retorne código, HTML ou comandos de programação.
`;
  try {
    const upstream = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || DEFAULT_MODEL,
        messages: [{ role: "system", content: system }, ...messages],
        tools,
        tool_choice: "auto",
        parallel_tool_calls: false,
        temperature: 0.2,
        max_completion_tokens: 850
      }),
      signal: AbortSignal.timeout(25000)
    });

    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const detail = result?.error?.message || `Groq respondeu ${upstream.status}`;
      return send(res, 502, { error: detail });
    }

    const assistant = result?.choices?.[0]?.message || {};
    const actions = cleanActions(assistant);
    return send(res, 200, {
      reply: typeof assistant.content === "string" ? assistant.content : "",
      actions
    });
  } catch (error) {
    return send(res, 502, { error: "Não foi possível conectar à Groq neste momento." });
  }
}
