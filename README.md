# DXT / Berserk Drift X · Reference rebuild

Site pessoal com cinco rotas, reconstruído a partir da referência de faixas diagonais anexada em 9 de outubro de 2026. A versão anterior com painel em colunas e carros em relevo 2.5D foi substituída.

## Executar

Node.js 22. Three.js 0.180.0 e esbuild 0.25.10, versões fixadas.

```sh
npm ci
npm run bundle
npm run dev
# http://localhost:5186
npm test
npm run build
```

Vercel: projeto existente `dxrkths`, raiz `dxrkths`, build `npm run build`, saída `dist`. A função `api/roblox.js` permanece de mesma origem, sem credenciais privadas no cliente.

## Layout e rotas

Hero panorâmico com logo Berserk à esquerda e cena automotiva à direita. Em seguida, faixas diagonais para grupos/jogos, projetos futuros, biografia e contato. Os recortes são CSS responsivo; textos e controles permanecem HTML. No telefone, os cards têm deslize horizontal e scroll-snap, em vez de três miniaturas comprimidas.

Rotas `/`, `/groups`, `/projects`, `/about` e `/contact`; `/berserk` é um alias da entrada. Links e conteúdo editáveis em `src/content.js` e `src/pages/templates.js`.

## Renderização real

`src/scene/car.js` constrói duas malhas volumétricas autorais: carroceria curva, arcos abertos, rodas, freios, cabine, vidros, bancos, retrovisores e aerofólio. **Não são os modelos originais do jogo nem modelos Nissan licenciados.** A inspiração é a concept, não uma alegação de réplica exata dos veículos.

`src/scene/showroom.js` utiliza Three.js/WebGL2, verniz físico, luzes de área, sombras, ambiente PMREM e reflexão planar real. Céu, fumaça e piso usam GLSL procedural. Bloom e ACES completam a imagem. O arraste e as setas movem a câmera. Explore in 3D amplia a cena; Escape fecha; Reset/Home restauram o ângulo inicial.

A logo About usa o GLB original fornecido. A imagem de corrida só é usada como arte dos cards e fallback sem WebGL. O renderer 2.5D e seu mapa de profundidade foram removidos. Nenhum carro de terceiros pesquisado foi incluído.

Hovers HTML usam iluminação radial interpolada em CSS, não são anunciados como WebGL. Câmera e hover usam tempo decorrido real; o passo da animação ambiente é limitado separadamente. A cena dorme quando estável, pausada, fora da tela ou em aba oculta e libera recursos ao trocar de página.

## Avatar e fatos

A função Roblox limita consultas ao usuário 1980621685 e aos grupos 35542723 e 379822883, com timeout, cache e fallback local. As logos, padrões e artes são os arquivos fornecidos. Não são fabricados estatísticas, datas de lançamento, email, trailer ou hobbies pessoais. Projetos futuros são categorias.

## Testes

`npm test` valida geometria, rotas, arquivos, APIs e transições. O build executa a mesma suíte. Para testes de navegador, instale Playwright separadamente e execute `NODE_PATH=/caminho/node_modules DXT_BASE_URL=http://127.0.0.1:5186 node tests/browser.cjs`. `DXT_TEST_OUT` troca a pasta dos relatórios.

As verificações em Chromium/ANGLE SwiftShader e viewports emulados não certificam GPU física, Safari ou telefone real. A fidelidade da composição foi o alvo; modelos autorais não são réplicas exatas da fotografia/concept.

Three.js usa MIT, preservada em `docs/THREE-LICENSE.txt`. Fontes são carregadas por CSS; nenhum arquivo de fonte é redistribuído.

## Reference refinement R3

The active home layout and optical materials now follow the approved diagonal concept. See [REFERENCE-R3.md](docs/REFERENCE-R3.md) for current design decisions, testing and exact file locations. The older R2 screenshots and reports are historical; current captures end in `r3`.

The header and native links remain HTML. Tilted card artwork uses a shared real perspective matrix with GLSL lighting, waves and bloom. `src/scene/car.js` is unchanged; framing and environment were refined instead. The existing API/profile/social links remain the same.
