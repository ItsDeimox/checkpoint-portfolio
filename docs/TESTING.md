# Relatório de testes

Data: 15 de julho de 2026

## Ambiente

- Windows 11
- Node.js 24.14.0
- Electron 37.10.3
- electron-builder 26.15.3
- Repositório remoto: `ItsDeimox/checkpoint-portfolio`

## Verificações aprovadas

### Validação estática

- `main.js`, `preload.js`, `editor.js` e `site.js` passaram em `node --check`.
- `npm audit` retornou zero vulnerabilidades conhecidas.
- O workflow `Validar aplicativo` passou no GitHub Actions.

### Inicialização

- O aplicativo iniciou em modo de desenvolvimento.
- O executável empacotado iniciou corretamente.
- O arquivo `app.asar` contém todos os arquivos esperados do editor e da vitrine.

### Teste integrado com GitHub

Um teste automatizado abriu o Electron e executou o fluxo real contra o GitHub:

1. Conectou a `https://github.com/ItsDeimox/checkpoint-portfolio`.
2. Clonou o repositório usando Git e Git Credential Manager.
3. Criou a estrutura gerenciada dentro da cópia local.
4. Alterou o perfil e confirmou o autosave em `content.json`.
5. Adicionou um projeto e confirmou sua presença no editor.
6. Abriu a prévia local em uma segunda janela.
7. Confirmou que nome e projeto apareciam na vitrine renderizada.
8. Criou o commit automático `9691793`.
9. Enviou o commit para uma branch temporária no GitHub.
10. Confirmou que os SHAs local e remoto eram idênticos.
11. Removeu a branch remota temporária e restaurou a cópia local para `main`.

## Limitações do teste automatizado

- O seletor nativo de imagens, GIFs e vídeos precisa de uma rodada manual com arquivos reais.
- A ativação real do GitHub Pages não foi alterada durante o teste; a presença do GitHub CLI foi simulada para evitar mudanças na publicação oficial.
- O instalador NSIS foi gerado, mas o assistente completo de instalação e desinstalação ainda precisa de uma rodada manual.
- O executável ainda não possui certificado próprio de assinatura de código nem ícone definitivo.

## Resultado

O fluxo principal de edição, prévia, commit e push foi aprovado. Os itens restantes são validações de integração nativa e acabamento de distribuição, não bloqueios do fluxo principal.
