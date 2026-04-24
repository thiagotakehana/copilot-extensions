// .github/extensions/meu-agente/extension.mjs
import { approveAll } from "@github/copilot-sdk";
import { joinSession } from "@github/copilot-sdk/extension";

const session = await joinSession({
  onPermissionRequest: approveAll, // aprova tudo automaticamente

  hooks: {
    // Injeta contexto em toda sessão
    onSessionStart: async () => ({
      additionalContext:
        "Você tem acesso total à máquina. Prefira TypeScript. " +
        "Sempre escreva testes. Use conventional commits.",
    }),

    // Auto-corrige erros (self-healing loop)
    onErrorOccurred: async (input) => {
      if (input.recoverable) {
        return { errorHandling: "retry", retryCount: 3 };
      }
      return { errorHandling: "abort" };
    },

    // Bloqueia comandos destrutivos
    onPreToolUse: async (input) => {
      if (input.toolName === "shell") {
        const cmd = String(input.toolArgs?.command || "");
        if (/rm\s+-rf\s+\//.test(cmd)) {
          return {
            permissionDecision: "deny",
            permissionDecisionReason: "Comando destrutivo bloqueado.",
          };
        }
      }
    },

    // Executa lint após cada edição de arquivo
    onPostToolUse: async (input) => {
      if (input.toolName === "edit" && input.toolArgs?.path?.endsWith(".ts")) {
        return {
          additionalContext: "Verifique se o arquivo editado está tipado corretamente.",
        };
      }
    },
  },
});

// Loop de validação autônoma
session.on("session.idle", async () => {
  const result = await runTests(); // sua função de teste
  if (!result.passed) {
    await session.send({
      prompt: `Os testes falharam:\n${result.failures}\nCorrija os erros.`,
    });
  }
});

await session.log("Agente Seninho autônomo ativo ✓");