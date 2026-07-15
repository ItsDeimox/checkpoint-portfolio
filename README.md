# Checkpoint Portfolio

Aplicativo desktop local para editar um portfólio estático e publicá-lo pelo GitHub Pages.

## Fluxo

1. A pessoa cola a URL de um repositório dedicado do GitHub.
2. O app clona o repositório usando o Git e as credenciais já protegidas pelo sistema.
3. O conteúdo é salvo em `portfolio/content.json` e as mídias em `portfolio/assets`.
4. Ao publicar, o app cria um commit e envia para o GitHub.
5. O workflow `.github/workflows/portfolio-pages.yml` publica a pasta `portfolio`.

O aplicativo não mantém contas, senhas ou tokens próprios.

## Desenvolvimento

```powershell
npm install
npm start
```

## Gerar instalador para Windows

```powershell
npm run dist
```

O instalador será criado na pasta `dist`.

## Primeira publicação

O GitHub exige que uma pessoa com acesso administrativo habilite o GitHub Pages. Se o GitHub CLI (`gh`) estiver instalado e autenticado, o app faz isso automaticamente. Caso contrário, ele abre `Settings > Pages`; basta selecionar `GitHub Actions` em `Source` uma única vez. Depois disso, cada publicação acontece por commit e push.

## Segurança

- Somente URLs HTTPS de `github.com` são aceitas pela interface.
- Comandos são executados sem shell e com argumentos separados.
- O app adiciona ao commit apenas `portfolio`, o workflow e seu marcador.
- Uma pasta `portfolio` preexistente não é sobrescrita sem o marcador do app.
- Mídias removidas são limpas apenas dentro de `portfolio/assets`.
