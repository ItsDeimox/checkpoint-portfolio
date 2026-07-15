# Segurança

## Modelo de confiança

O Checkpoint Portfolio não mantém contas, senhas ou tokens próprios. Operações de clone e push são delegadas ao Git instalado na máquina. A configuração opcional do GitHub Pages usa o GitHub CLI quando ele já está instalado e autenticado.

## Limites implementados

- A interface aceita somente repositórios hospedados em `github.com`.
- Comandos externos são executados sem shell e com argumentos separados.
- O commit automático inclui somente `portfolio/`, `.portfolio-editor.json` e o workflow gerenciado.
- Uma pasta `portfolio/` preexistente não é sobrescrita sem o marcador do aplicativo.
- A prévia local serve arquivos apenas de dentro da pasta gerenciada.
- O renderer do Electron usa isolamento de contexto, sandbox e `nodeIntegration: false`.

## Dados públicos

Tudo dentro de `portfolio/` é considerado conteúdo público e poderá ser publicado pelo GitHub Pages. Não coloque chaves, senhas, tokens ou dados pessoais sensíveis nessa pasta.

## Relato de vulnerabilidade

Não abra uma issue pública com credenciais ou detalhes exploráveis. Entre em contato com o mantenedor do repositório de forma privada e inclua versão, impacto e passos mínimos para reprodução.

