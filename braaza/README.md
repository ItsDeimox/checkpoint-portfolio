# BRAAZA / Forge

Galeria vertical em WebGL2 e GLSL ES 3.0. Correntes tridimensionais em sentidos opostos, duas fornalhas de obsidiana low-poly, fogo procedural, partículas e cards de vidro iluminado. Sem painéis laterais de texto e sem uma screenshot substituindo o ambiente 3D.

## Rodar

Node.js 22 ou superior. Não há dependências para instalar.

```sh
npm test
npm run build
npm run dev
```

Abra o endereço mostrado pelo servidor. A pasta `dist/` é o resultado estático para hospedagem. O renderer usa HDR quando suportado; o modo leve reduz a resolução e desliga o desfoque de profundidade. Pausar interrompe as animações ambientais, mas mantém a navegação.

## Conteúdo real

Os quatro cards atuais são **estudos procedurais de demonstração**, identificados na própria galeria. Não representam trabalhos do Braaza nem de outros artistas. Nenhum contato ou histórico profissional foi inventado.

Edite `src/content.js` para colocar o material real. Adicione mídias em `assets/images/` ou `assets/video/`. Um item pode usar `kind: 'image'`, `src: 'assets/images/trabalho.webp'` ou `kind: 'video'`, `src: 'assets/video/trabalho.mp4'` e `poster: 'assets/images/capa.webp'`. Preencha título e descrição com os dados do artista. `kind: 'demo'` mantém o estudo procedural. São quatro espaços nesta primeira composição. Use imagens horizontais, de preferência próximas de 2:1. A janela de detalhes preserva a proporção original.

Vídeos são silenciosos na prévia por hover. A reprodução com controles e áudio fica na janela aberta por clique; não há áudio automático na entrada do site. Recomenda-se hospedar mídias no mesmo domínio. Vídeos remotos precisam permitir CORS.

## Interação

Scroll e arraste vertical sobem/descem a galeria. Corrente esquerda sobe e direita desce no avanço. Clique abre o card. Setas e PageUp/PageDown navegam; Home volta ao início; Enter abre o card central; Escape fecha os detalhes. Há suporte a toque, redução de movimento e uma galeria compatível sem WebGL2. A seleção de texto e o drag nativo de imagens são bloqueados apenas no canvas.

## Arquitetura

- `src/core.js`: navegação determinística, amortecimento e fases das correntes.
- `src/geometry.js`: malhas low-poly, elos fechados, anéis e painéis.
- `src/shaders.js`: materiais, fogo, lava, fumaça, partículas e pós-processamento.
- `src/engine.js`: cena, iluminação, raycast, mídia e render targets.
- `src/main.js`: eventos, toque, teclado, diálogos e recuperação de contexto.
- `tests/`: testes de código e roteiro de navegador com Playwright.

Em Linux sem monitor, as verificações de navegador podem ser executadas com `xvfb-run -a python tests/check.py` após instalar Playwright e Chromium. `browser_support.py` carrega os mesmos módulos em URLs Blob para ambientes que bloqueiam navegação local. Isso não substitui o renderizador por mocks. `docs/browser-tests.json` registra os resultados efetivamente verificados.

## Publicação

Projeto Vercel: `braaza`. Root Directory: `braaza` no repositório `ItsDeimox/checkpoint-portfolio`. Build: `npm run build`. Output: `dist`. `build-info.json` identifica o commit e os hashes de todos os módulos publicados. Os demais sites desse repositório não são modificados por este projeto.
