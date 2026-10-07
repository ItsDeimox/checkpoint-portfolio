# BRAAZA / Cinematic 2.0

Galeria WebGL2 com templo vulcânico tridimensional, correntes instanciadas, vidro espesso com mídia interna, reflexão planar do piso, probes do ambiente, sombras PCF, luzes GGX, atmosfera, fogo e óptica HDR.

## Executar

Node 22, sem dependências JavaScript de runtime:

```sh
npm run dev
npm test
npm run build
```

O servidor local usa `http://127.0.0.1:5191`. A Vercel publica `dist`. O build restaura o pequeno asset WebP a partir dos fragmentos de transporte em `tools/packed-vista`, verifica seu SHA-256 e gera um manifesto recursivo em `dist/build-info.json`. O navegador recebe o WebP original, não os fragmentos.

## Verificar

Instalar Python Playwright, Chromium e Xvfb no ambiente Linux de teste. Com uma sessão gráfica já aberta, omitir `xvfb-run -a`:

```sh
npm test
xvfb-run -a python tests/browser-cinematic.py
xvfb-run -a python tests/lifecycle.py
xvfb-run -a python tests/capture.py
```

A suite usa os módulos e shaders reais, com transporte por Blob URLs quando o navegador bloqueia navegação de rede. `BRAAZA_TEST_URL=http://127.0.0.1:5191/` seleciona o carregamento HTTP direto em um navegador que o permita. `BRAAZA_CHROMIUM` seleciona o executável nas suites principais.

Os antigos entrypoints Python encaminham à suite consolidada, sem contar suas reexecuções como testes adicionais. Os 21 testes Node originais continuam presentes; há 20 novos testes Node. Veja `docs/RELEASE-2.0.md`.

`?debug` habilita `window.__BRAAZA__`. `?debug&reference` congela a entrada em tempo procedural 3 para comparação. `?no-webgl` abre o modo compatível. `src/content.js` continua sendo a fonte dos quatro projetos; nenhum trabalho de terceiros foi adicionado.
