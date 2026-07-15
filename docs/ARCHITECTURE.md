# Arquitetura

## Componentes

### Processo principal

`main.js` controla acesso ao sistema de arquivos, Git, janelas e prévia HTTP local. Nenhum comando recebido da interface é concatenado em uma string de shell.

### Ponte segura

`preload.js` expõe uma API pequena para o renderer por meio de IPC:

- conectar repositório;
- salvar conteúdo;
- importar mídia;
- abrir prévia;
- publicar;
- abrir GitHub;
- configurar Pages.

### Editor

`editor.html` e `editor.js` implementam o aplicativo local. Alterações são persistidas em `portfolio/content.json`; mídias são copiadas para `portfolio/assets/`.

### Vitrine

`index.html`, `site.js`, `styles.css` e `content.json` formam o template estático. Na primeira conexão, esses arquivos são copiados para `portfolio/` dentro do repositório escolhido.

## Fluxo de publicação

1. O app valida a URL e clona o repositório para o diretório privado de dados do Electron.
2. O template e `.github/workflows/portfolio-pages.yml` são criados quando ainda não existem.
3. O editor salva mudanças localmente.
4. `Publicar` executa `git add` apenas nos caminhos gerenciados, cria um commit e faz push da branch atual.
5. O GitHub Actions envia `portfolio/` como artefato e o GitHub Pages realiza o deploy.

## Estrutura criada no repositório do usuário

```text
portfolio/
  assets/
  content.json
  index.html
  site.js
  styles.css
.github/workflows/portfolio-pages.yml
.portfolio-editor.json
```

