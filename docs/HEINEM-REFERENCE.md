# HEINEM — referência de site em camadas

O projeto [HEINEM](../heinem/README.md) implementa uma referência de artista com cenário em planos, bolha interativa e um CD ligado ao player oficial do SoundCloud. Código e documentação novos usam licença MIT; fotografia, identidade, capas e música mantêm seus direitos próprios.

**Site:** [heinem.vercel.app](https://heinem.vercel.app) · **Baseline publicada documentada:** 1.0.0 · **Revisão de código desta referência:** 1.3.0 · **Pasta de build:** `heinem`

O código e a evidência histórica da baseline permanecem fixados no [commit `b140f9c`](https://github.com/ItsDeimox/checkpoint-portfolio/tree/b140f9c17af9fa1e6d103093dc0b35af01b9d3b6/heinem) e na [validação daquela revisão](https://github.com/ItsDeimox/checkpoint-portfolio/blob/b140f9c17af9fa1e6d103093dc0b35af01b9d3b6/heinem/docs/VALIDATION.md). A seção 1.1 preserva seus próprios resultados históricos. A seção 1.2 identifica as substituições pedidas pelo usuário: texto visual na GPU, camadas alpha reais, terreno contínuo sem dissolução e troca física do CD. A seção 1.3 separa a nova sincronização de scroll, a interação contínua dos CDs, o campo detalhado e a escolha do retrato claro. Nenhum resultado de produção anterior é transferido automaticamente para a versão atual.

## Padrões reutilizáveis

1. **Identidade e proveniência primeiro.** Prefira pixels originais quando a exigência for preservação fotográfica. Uma extração gerada pode servir só de máscara alpha. Quando o usuário escolhe uma variante reconstruída, registre essa escolha e não mantenha a alegação de RGB original da versão anterior. Registre as partes sintetizadas e não prometa exatidão em regiões ocultas.
2. **Planos sobre a posição real do documento.** Use offsets de `transform`, listener de scroll passivo e coordenadas compartilhadas. A interpolação curta da roda mantém `window.scrollY` real e devolve a entrada imediatamente a teclado, toque e controles. Gere cobertura vertical suficiente para a camada próxima revelar o terreno abaixo enquanto sobe. A 1.2 usa o mesmo campo alto nas duas seções; não dissolve o hero, não espelha faixas e não coloca um recorte de grama sob os CDs. Remova do fundo objetos que ganharam uma camada própria.
3. **HTML semântico e texto visual na GPU.** Mantenha título e biografia nativos para acessibilidade e fallback. Rasterize sua apresentação somente após fontes prontas ou resize, junto do risco e da estrela, e faça uma malha WebGL deformar tinta, halos e material nas mesmas coordenadas. A medição da 1.1 mostrou que cachear geometria não eliminava as milhares de alterações de estilo dos glifos; a 1.2 remove esse trabalho por frame. Limite atlas, DPR, área, malha e textura; perda de contexto devolve o HTML visível.
4. **Trabalho invisível deve parar.** Pause quando a seção ou aba estiver oculta. Evite upload de textura por frame e loops de parallax em repouso. Suavize usando tempo decorrido, não um fator fixo por frame.
5. **Auto é uma estimativa.** CPU, memória opcional, ponteiro e economia de dados sugerem o padrão. Não são benchmark da GPU. Uma escolha manual de High continua High; movimento reduzido é uma preferência separada.
6. **CD com estado real e troca interrompível.** Só conecte o provedor depois de uma intenção explícita de reprodução; explorar capas antes disso não inicia rede ou áudio. O rotor separado acompanha PLAY, enquanto hub e alvo de clique mantêm o pivô. A troca recolhe o CD, move as caixas com ele oculto e expõe o novo CD; a última intenção substitui a anterior sem fila. Preserve timeout, tentativa novamente e link da faixa. A 1.2 conserva o transporte oficial fora da composição visual, com atribuição compacta ao lado do volume, e remove o painel inferior. Não re-hospede áudio.
7. **Valide antes de publicar.** Verifique composição, scroll, mobile, controles, falhas externas e fallback. Registre navegador, renderizador, dimensões, SHA e limitações. Não transforme um teste em GPU de software em promessa de FPS em aparelho físico.

## Como repetir

Leia [arquitetura](../heinem/docs/ARCHITECTURE.md), [proveniência](../heinem/docs/asset-provenance.md), [validação](../heinem/docs/VALIDATION.md) e [segurança](../heinem/SECURITY.md). O [README do projeto](../heinem/README.md) contém comandos de desenvolvimento/build/teste e configuração da Vercel.

A implementação consultou `deimoxportfolios/src/ui/modal-material.js`, os controladores de qualidade do DXRKTHS e `braaza/src/render/quality.js`. Reaproveitou princípios de composição e lifecycle, sem importar o pipeline histórico de desempacotamento que pode sobrescrever código expandido. O histórico e as revisões consultadas estão documentados na arquitetura.

As regras gerais também estão registradas em português e inglês no Cortex: [PT](https://github.com/ItsDeimox/Deimox-Cortex/blob/main/Programming/Web3D/Layered-Artist-Sites.md) · [EN](https://github.com/ItsDeimox/Deimox-Cortex/blob/main/EN/Programming/Web3D/Layered-Artist-Sites.md).

## Revisão 1.1 — feedback aprovado e implementação (histórico)

**[ESPECIFICAÇÃO DO USUÁRIO]** Depois da baseline, o usuário aprovou a [concept da seção de CD](https://github.com/ItsDeimox/checkpoint-portfolio/blob/main/heinem/docs/reference/music-approved.webp) e pediu implementação **1:1**. A música continua no mesmo gramado; saem About, Contact e CTA adicionais; entram três jewel cases selecionáveis e um CD central clicável para play/pause, com anterior/próxima nas laterais. A disposição inicial é Show Me Love à esquerda, Memories Of You à frente e MHA 50K Drop à direita. O feedback também pediu pivô correto, refração mais nítida, letras deformando junto da bolha, glow localizado e scroll suave. O pedido de fidelidade é uma condição de aceite, não uma declaração de igualdade pixel a pixel já medida.

### Decisões transferíveis

| Decisão | Mecanismo e fonte local |
| --- | --- |
| Continuidade do cenário | Um gramado decorativo fixo fica sob hero e música. Máscara e `--scene-presence` dissolvem o hero durante a saída; grama alpha cobre a base das capas. A extensão espelhada foi removida. Ver [parallax.ts](../heinem/src/lib/parallax.ts), [style.css](../heinem/src/style.css), [music.css](../heinem/src/music.css) e [escopo aprovado](../heinem/docs/MEADOW-REVISION.md). |
| Membrana compartilhada | [bubble.ts](../heinem/src/graphics/bubble.ts) e [bubble-text.ts](../heinem/src/lib/bubble-text.ts) usam a mesma expressão gaussiana em pixels CSS. O shader faz mapeamento inverso; os glifos recebem deslocamento direto e Jacobiano afim. Fontes/resize atualizam o cache; frames de interação não medem glifos. |
| Óptica mais clara | A borda de 580 × 442 conserva somente um residual perolado de luminância/detalhe; RGB fotográfico de céu/grama não é sobreposto à refração. Mipmaps estáticos permanecem, com amostragem mais nítida e menos névoa. Glow fica no shader local e em `text-shadow`, sem pipeline de bloom HDR. Ver [arquitetura](../heinem/docs/ARCHITECTURE.md). |
| CD com pivô local | `.disc-face` gira `silver-disc.webp` numa caixa quadrada com origem `50% 50%`. Hub e ícone ficam fora do rotor, no mesmo centro; hover muda brilho. `PLAY` confirmado, visibilidade e movimento permitido controlam a rotação. Ver [music.css](../heinem/src/music.css) e [player.ts](../heinem/src/lib/player.ts). |
| Entrada cancelável | [smooth-scroll.ts](../heinem/src/lib/smooth-scroll.ts) escreve no scroll real com resposta exponencial de 125 ms, deltas limitados e `behavior: 'instant'`. RAF só existe durante movimento. Touch, controles, scroll aninhado e gestos de zoom conservam comportamento nativo. Teclas de navegação, **Tab/Shift+Tab**, pointer/touch, âncoras, histórico e scroll externo cancelam o deslocamento pendente. |

O desenho aprovado é uma referência de composição; a página mantém capas, textos, controles e layers independentes. A transição do gramado não promete recuperar a fotografia original fora do enquadramento. A deformação mantém o conteúdo em HTML e a frase original acessível; movimento reduzido e fallback devolvem a apresentação estática. O [main.ts](https://github.com/ItsDeimox/checkpoint-portfolio/blob/main/heinem/src/main.ts) coordena qualidade, scroll, parallax, visibilidade e encerramento, enquanto o material gerencia os glifos.

### Estado de reprodução e casos de regressão

A ordem circular Memories → MHA → Show corresponde aos lados do carrossel. Selecionar uma capa ou anterior/próxima antes do primeiro play não cria iframe nem baixa o SDK. Depois de uma pausa, trocar a faixa não inicia áudio. Intenção de play confirmada ou pendente continua ao navegar; cancelar antes de `READY` impede que a prontidão tardia inicie a reprodução. O contador de geração rejeita callbacks de faixas anteriores. Durante um pedido pendente, o nome acessível do CD anuncia cancelamento. O crédito visível inicial é “HEINEM x Hyru Remix”; Aye Bay permanece nos dados, no título do crédito e nos nomes acessíveis.

O timeout de 12 segundos mantém tentativa novamente, iframe oficial e link da faixa disponíveis após a interação. A rotação só começa após `PLAY`; `PAUSE`, fim da faixa e falha não simulam reprodução. O término conserva pausa e permite replay pelo CD, sem avanço automático inventado. A limitação histórica do teste real de SoundCloud permanece documentada; testes com provedor controlado não comprovam streaming contínuo.

**[TESTE LOCAL]** A revisão focada passou em `npm run typecheck` e em **16 testes de player/scroll**:

```bash
node --test --test-isolation=none tests/player.test.mjs tests/smooth-scroll.test.mjs
```

Os testes cobrem ausência de loop em repouso, movimento reduzido, limites da página, cancelamento por entrada nativa, seleção sem rede, estados pendentes, callbacks antigos e fallback. Um defeito encontrado na revisão foi Tab não cancelar o scroll quando o próximo foco permanecia na viewport; a correção inclui Tab e Shift+Tab e verifica que nenhum frame posterior move a página. Os arquivos são [player.test.mjs](../heinem/tests/player.test.mjs) e [smooth-scroll.test.mjs](../heinem/tests/smooth-scroll.test.mjs).

Essas verificações não substituem o hit-test real do centro do CD sob a sobreposição das capas, a comparação visual, a inspeção mobile, áudio real ou um teste da versão publicada. O resultado consolidado, SHA e deploy da 1.1 devem constar em [VALIDATION.md](../heinem/docs/VALIDATION.md) antes de declarar essa versão verificada em produção. Nenhum FPS em hardware físico ou novo resultado de produção é inferido deste registro.


### Verificação consolidada

Build e TypeScript aprovados com **25/25 testes**; suíte completa com **15/15 testes de navegador**. A checagem de centro do CD passou nos quatro viewports, incluindo 320 px. No fim exato do scroll mobile, a visibilidade agora exige `intersectionRatio > 0.001` com o mesmo threshold, evitando manter trabalho ativo em um contato de área zero. O hover medido não faz leituras de layout nem novos uploads; traces de Playwright ficam desligados somente nesse teste instrumentado para não contar a própria coleta de snapshots. Os resultados completos e os limites permanecem no [relatório 1.1](../heinem/docs/VALIDATION-1.1.md).

**[PUBLICAÇÃO — 23/10/2026 UTC]** O código [`58cb7512d81b48e68a3a022f23155a40d7bd23ae`](https://github.com/ItsDeimox/checkpoint-portfolio/commit/58cb7512d81b48e68a3a022f23155a40d7bd23ae) está publicado em [heinem.vercel.app](https://heinem.vercel.app/#music). O deploy Vercel `dpl_6Vupbk9DGjAyj5MRi5mEGLJvL1rB` confirmou READY, SHA e alias de produção esperados. HTTPS público retornou 200 com TLS normal; HTML/JS/CSS coincidiram byte a byte com o build testado. A suíte completa passou **15/15 testes no endereço público**, incluindo hit-test do centro do CD nos quatro viewports. O navegador descartável usou a exceção documentada para a CA do proxy; o check HTTP independente não usou bypass. O [relatório 1.1](https://github.com/ItsDeimox/checkpoint-portfolio/blob/main/heinem/docs/VALIDATION-1.1.md) preserva comandos, tamanhos, simulação do provedor e a limitação externa de streaming que continua não confirmada.


## Revisão 1.2 — assets separados e interação sem glifos animados

**[FEEDBACK DO USUÁRIO — 22/10/2026, America/Sao_Paulo]** A nova rodada trouxe a fotografia original do artista e apontou travamento sobre as letras. O usuário pediu reação de gelatina com memória local do movimento, texto e risco dentro do shader, camadas independentes com transparência e um gramado que realmente continua até a seção de CDs. A grama próxima deve subir e revelar o mesmo terreno abaixo; o fade, a troca de fundo e o recorte de grama sob as caixas foram rejeitados. A troca musical deve recolher o CD, movimentar as caixas e retirar o próximo, mantendo a composição aprovada. O painel inferior do SoundCloud foi removido.

**[MUDANÇA DE PADRÃO]** As descrições da 1.1 acima permanecem como histórico. O caminho de glifos HTML por frame, o residual de borda extraído, o cenário dissolvido e o painel visível do provedor foram substituídos nesta revisão. O fallback nativo e a semântica HTML continuam preservados.

### Gargalo identificado e solução

A medição da 1.1 em Chromium 134/ANGLE/SwiftShader, 1178 × 659, observou 307 glifos, 459 descendentes na cópia e **4.214 mutações de estilo em 10 desenhos WebGL**, ao longo de aproximadamente 1,05 s com três posições do cursor. O cache geométrico eliminava leituras, mas não as escritas de transformação e sombra. Essa contagem identifica o mecanismo de custo; não é um benchmark de FPS em hardware físico.

A 1.2 mantém o título e a biografia em HTML, com 15 descendentes. O navegador resolve linhas, fonte e kerning; `createBubbleText()` rasteriza a apresentação após fontes prontas ou resize. Tinta, halo estreito e halo largo ocupam os canais R/G/B de um atlas limitado a 1.500.000 pixels e 2048 por aresta. O risco inferior e sua estrela entram no mesmo atlas. Não existem spans por letra, sombras DOM animadas nem uploads da cópia por frame. O texto HTML visual só fica transparente depois de uma textura válida desenhada e reaparece em falha/perda de contexto.

Até seis impulsos guardam posições independentes. A resposta assinada `sin(age * 13.5) * exp(-age * 3.2)` gera oscilação amortecida, com intensidade e deslocamento limitados. O campo espacial roda na malha de vértices, e material, refração e tinta usam as mesmas coordenadas interpoladas. Há uma chamada de desenho, sem cadeia de bloom; os halos pré-filtrados dão glow local em LDR. Perfis limitam malha, framebuffer e DPR. Movimento reduzido e invisibilidade encerram a atividade pertinente.

### Cena contínua e mídia preservada

| Responsabilidade | Implementação da 1.2 |
| --- | --- |
| Céu e vegetação | Assets próprios de céu, árvore esquerda, vegetação distante e intermediária. Alpha real define as silhuetas; regiões escondidas foram reconstruídas e são identificadas como síntese. |
| Artista | RGB da fotografia original fornecida, combinado ao alpha da extração do modelo. Rosto, roupa, pose e telefone não vêm do RGB regenerado. |
| Primeiro plano e música | Um único `field-continuous.webp`, alto, atravessa hero e música. Deslocamento físico revela sua extensão inferior. Não há fade de seção, gramado fixo alternativo, espelhamento ou recorte sob os CDs. |
| Refração | Amostra até quatro planos reais com alpha, ordem e mapeamento correspondente a `object-fit`/posição/transform. Parallax muda uniforms; hover não reenvia imagens. A borda passa a ser procedural. |
| Borboletas | Uma textura transparente, asas separadas por clipping e corpo central. Voo e asas usam elementos diferentes do posicionamento de parallax; visibilidade, Leve e movimento reduzido limitam animação. |

Os assets foram gerados pela ferramenta de imagens nativa, com proveniência e prompts no [registro de camadas](../heinem/docs/LAYER-ASSETS.md). Dimensões e cobertura são medidas no resultado, sem confundir o pedido do prompt com a saída real. O campo tem 1080 × 1456; céu, árvore e vegetações usam 1672 × 941. A nova cena é sintetizada no estilo aprovado, sem alegar decomposição pixel a pixel de regiões antes ocultas.

O scroll continua nativo. Em repouso da interpolação, uma profundidade `d` produz velocidade visual proporcional a `1 - d`; céu `0,64` sobe lentamente, enquanto campo `-0,14` sobe mais rápido que o documento. A extensão vertical cobre todo o caminho até a música. A bolha mobile usa profundidade zero para sair completamente da tela no fim da página; não se força o renderer a dormir enquanto uma parte ainda está visível.

**[REGRESSÃO DE COBERTURA]** Uma revisão independente em 600 × 1600 encontrou 382 px sem campo no fim do scroll: o hero mobile é limitado a 1050 px, enquanto a música ainda ocupa a altura da viewport. `height: 240%` do hero, isoladamente, não cobria essa combinação. O primeiro plano mobile agora usa `height: max(240%, calc(124% + 100svh + 2px))`, considerando a extensão da página e o deslocamento de profundidade. A regressão verifica que o fundo do mesmo plano alcança tanto o fim da seção musical quanto o fim da viewport, com opacidade 1. O aprendizado é dimensionar cobertura a partir da geometria de todo o percurso, incluindo viewports incomumente altas, e não apenas de uma proporção fixa do hero.

### Troca do CD e transporte de áudio

A sequência nominal tem **580 ms**: inserir por 180 ms, trocar capas com o CD oculto por 220 ms e retirar por 180 ms. A capa atual só muda após o recolhimento; o rotor mantém seu pivô. Índice solicitado e índice visível são separados: entradas rápidas substituem o destino, reversão pode cancelar a troca antes da ocultação, e não existe fila crescente. Há um único timeout de transição, com limpeza no encerramento. Teclado resolve a seleção pendente antes de play/pause; movimento reduzido aplica a mudança imediatamente.

O áudio antigo continua durante a inserção e muda no instante da troca de capa. Seleção antes do primeiro play permanece sem SDK/iframe; pausa pendente prevalece sobre `READY` tardio; callbacks de frames substituídos são rejeitados. O disco só gira após PLAY confirmado. O iframe oficial funciona como transporte fora da composição, enquanto controles nativos e um link compacto da faixa ao lado do volume preservam interação e atribuição. Não há painel inferior. Erros mantêm retry e acesso à faixa. Nenhum áudio foi baixado ou re-hospedado, e testes de estados simulados não comprovam streaming contínuo real.

### Evidência e publicação da 1.2

**[FOCO CONFIRMADO]** Controlador: **13/13**; bolha integrada: **2/2**; CD integrado: **4/4**. O hover/relaxamento não fez mutações de cópia, leituras geométricas da aplicação ou novos uploads. Foram observadas posições locais independentes, mudança de sinal, repouso, fallback por perda de contexto e recuperação. O CD permaneceu dentro da caixa ao recolher e retornou ao pivô dentro de 0,6 pixel CSS. Capturas em 1440 × 900 e 390 × 844 verificaram encaixe; fases congeladas não são medidas de desempenho.

Duas distinções de verificação ficam registradas: zero leituras de layout não significa zero custo DOM; e fase `idle` do controlador pode anteceder o último frame do compositor, então a verificação de pivô espera a geometria se estabilizar. O reset global de movimento reduzido usa 0,001 ms, não necessariamente o literal zero. A regressão de scroll mobile exige que a bolha esteja realmente fora da tela antes de medir ausência de draws.

**[VALIDAÇÃO CONSOLIDADA 1.2]** TypeScript e build de produção aprovados, com **30/30 testes unitários/de estado/entrada**: 9 de gráficos, 13 de player e 8 de scroll nativo. A suíte completa existente passou **17/17 testes de navegador** em 53,6 s; depois da revisão independente, a regressão adicional de viewport alta passou **1/1** em 4,6 s. A suíte final contém **18 testes**; esses dois resultados locais não são apresentados como uma execução única dos 18. Os viewports usuais foram 1178 × 659, 1440 × 900, 390 × 844 e 320 × 780, com cobertura adicional em 600 × 1600 e revisão visual em 1672 × 941. O registro completo está em [VALIDATION-1.2.md](../heinem/docs/VALIDATION-1.2.md). A verificação pública desta revisão permanece separada abaixo; os testes de áudio usam eventos simulados e não encerram a limitação de streaming real.

**[PUBLICAÇÃO 1.2]** O código [`502288c32a9b91c49f38e13cc9a537db955dc0bd`](https://github.com/ItsDeimox/checkpoint-portfolio/commit/502288c32a9b91c49f38e13cc9a537db955dc0bd) foi publicado em [heinem.vercel.app](https://heinem.vercel.app). O deploy Vercel `dpl_9CHrNBtfXToMPuDL8bbQh4dCTmNY` confirmou estado READY, o SHA Git exato e o alias de produção esperado. A suíte completa passou **18/18 testes de navegador no endereço público**, em 57,4 s. Todos os **23 arquivos de `dist`** retornaram HTTP 200 e coincidiram byte a byte com o build local testado; essa checagem usou `curl` com TLS normal, sem bypass. O Playwright descartável usou a exceção documentada `PLAYWRIGHT_IGNORE_TLS=1` para a CA do proxy, separadamente da verificação HTTP com TLS normal. Estes resultados verificam a revisão 1.2; a publicação 1.1 acima permanece como histórico. Os testes simulam eventos do provedor e não comprovam streaming contínuo de áudio real nem FPS em GPU física.

Para reaplicar: [bubble.ts](../heinem/src/graphics/bubble.ts), [bubble-text.ts](../heinem/src/lib/bubble-text.ts), [scenery.css](../heinem/src/scenery.css), [parallax.ts](../heinem/src/lib/parallax.ts), [player.ts](../heinem/src/lib/player.ts), [music.css](../heinem/src/music.css) e [validação vigente](../heinem/docs/VALIDATION.md). A arquitetura e a proveniência do projeto detalham limites, restauração de contexto e origem das imagens.


## Revisão 1.3 — scroll sincronizado e interação contínua dos CDs

**[PEDIDO DO USUÁRIO — 22/10/2026, America/Sao_Paulo]** A bolha da 1.2 foi aprovada e permanece preservada. Esta rodada usa o retrato mais claro já gerado, corrige a sensação de atraso do céu, amplia o detalhe do primeiro plano e introduz arraste lateral com inclinação 3D nos CDs. A eventual vegetação extra ao fundo foi adiada.

### O céu não deve ter uma segunda suavização

O documento já era interpolado pela roda em 125 ms; o parallax adicionava outro filtro de 95 ms. Depois de parar em 280 px, o céu ainda mudou sua compensação de 102,57 para 179,15 px: **76,58 px de deriva com a página parada**, medidos em Chromium 134/ANGLE/SwiftShader, 1178 × 659 e High. A compensação correta para `.64` é 179,2 px.

Remover esse filtro resolveu a deriva, mas revelou o primeiro frame do wheel: o `scrollTo` já havia movido o documento enquanto o evento nativo `scroll` ainda não atualizara as camadas. A regressão de cada callback de animação concluído mediu **176 px de diferença máxima** antes da sincronização.

A solução usa somente a posição real do documento. `createSmoothScroll` notifica mudanças efetivas de `scrollY` no mesmo callback; `main.ts` chama `parallax.syncScroll()`, que cancela o RAF pendente e aplica a profundidade antes da pintura. Posições arredondadas idênticas e repouso não repetem trabalho. O listener nativo continua atendendo teclado, toque e scrollbar; fatores, shader, semântica e movimento reduzido são preservados.

**Evidência focada:** **9/9 testes do suavizador** e **2/2 testes de navegador**, estes em 15,7 s. Parada/reversão (280 → 130) e cada escrita do wheel ficam abaixo de **0,1 px CSS** de erro. Isso verifica comportamento, não FPS em GPU física.

### CD ligado ao progresso do gesto

**[IMPLEMENTAÇÃO FINAL]** [`disc-interaction.ts`](../heinem/src/lib/disc-interaction.ts) compartilha uma timeline contínua e reversível entre capas e CD. A troca automática completa dura **520 ms**; as caixas de saída/chegada se movem desde o primeiro frame. Arrastar controla o mesmo progresso, e a conclusão retoma da posição atual com duração proporcional ao trecho restante; cancelar retorna em até 320 ms. O disco se recolhe até **42%**, permanece oculto entre **42% e 58%**, muda de caixa nesse intervalo e emerge com a seguinte. Mesmo um frame automático lento apresenta a transferência oculta. A terceira caixa passa atrás do par, e o rotor mantém rotação e pivô separados. Os timers da 1.2 são históricos.

O conjunto reconhece intenção horizontal após **7 px** de movimento predominantemente lateral e só então captura o ponteiro. Intenção vertical libera o candidato; `touch-action: pan-y` conserva a rolagem nativa. Soltar com **30% de progresso**, ou com deslocamento menor e velocidade recente voltada ao destino, confirma uma faixa vizinha; caso contrário, o conjunto retorna. O clique gerado pelo arraste é consumido, mas ativação por teclado permanece válida. ArrowLeft/ArrowRight navegam nos botões do conjunto. Um índice guarda a intenção mais recente sem fila crescente; reversão antes da confirmação pode cancelar a troca. Explorar capas antes de play continua sem iframe ou áudio, e o rotor depende de PLAY real do provedor.

**[REGRESSÃO DE TOQUE REAL]** O input de toque do Chromium via CDP revelou que a captura implícita de `.jewel-rim` gera um `lostpointercapture` propagado quando o palco assume o gesto. O cancelamento agora exige **`event.target === stage`**, evitando abortar o arraste pela perda do filho. A correção tem teste unitário e checagem de toque real para captura/seleção horizontal e rolagem vertical. PointerEvents sintéticos sozinhos não reproduziam esse ciclo do navegador.

Os botões externos mantêm posição e alvos; `.jewel-shell` e `.disc-tilt` internos recebem tilt 3D limitado e reflexo local, sem substituir o transform do rotor. Limites são medidos ao entrar num alvo em repouso e invalidados após movimento; frames de animação/hover escrevem transforms sem leituras geométricas. O único RAF para ao estabilizar. Movimento reduzido seleciona imediatamente e remove tilt/reflexo animados; mudança de visibilidade conclui a última intenção. Encerramento libera captura, listeners, observadores e RAF. Nenhuma biblioteca de animação, imagem raster de CD, passagem de shader ou carga antecipada de mídia foi acrescentada.

**[FOCO CONFIRMADO]** **16/16 testes do controlador** e TypeScript aprovados; toque real **1/1 em 7,5 s** após a correção; execução final do arquivo de navegador **7/7 em 40,8 s**. As sete verificações cobrem pivô/rotação, seleção silenciosa, troca coordenada com ocultação, movimento reduzido, arraste gradual desktop/mobile e supressão de clique, tilt com alvo estável e intenção horizontal/vertical do toque. A deriva do centro fica dentro de **0,6 px CSS**. Quatorze capturas em 1440 × 900 e 390 × 844 registram ida/volta, ocultação e saída; os dois percursos retornam à faixa 0 em repouso. O [registro 1.3](../heinem/docs/VALIDATION-1.3.md) separa esses resultados funcionais da suíte integrada, publicação, streaming real e desempenho em aparelho físico.

### Campo detalhado sem mudar de cenário

O campo mantém a base `field-continuous.webp` (**1080 × 1456**, **414.856 bytes**) e acrescenta **quatro tiles nativos com sobreposições estáticas**, todos dentro do **mesmo primeiro plano**, sob um único transform. A fonte PNG `exec-1106998d-deb4-4e5a-a83a-8649a10a553a.png` tem os mesmos 1080 × 1456. A tentativa de solicitar uma imagem completa em 2160 × 2912 voltou nesse tamanho original e foi descartada.

Quatro referências de **594 × 801** foram extraídas com Sharp nas posições TL `(0,0)`, TR `(486,0)`, BL `(0,655)` e BR `(486,655)`. A ferramenta nativa de imagens reconstruiu cada uma em **1080 × 1457**, mantendo plantas maiores, enquadramento, cores e bokeh. A codificação direta, sem resize, usa WebP **quality 89 / alphaQuality 100 / effort 6**. O detalhe de plantas é gerado; não se afirma recuperar informação fotográfica ausente.

| Arquivo em `public/assets/layers/` | Dimensões nativas | Bytes |
| --- | --- | ---: |
| `field-detail-tl.webp` | 1080 × 1457 | 382.328 |
| `field-detail-tr.webp` | 1080 × 1457 | 252.824 |
| `field-detail-bl.webp` | 1080 × 1457 | 653.264 |
| `field-detail-br.webp` | 1080 × 1457 | 769.442 |

Os recortes têm **108 px de overlap horizontal e 146 px vertical**. A composição fornece aproximadamente **1964 × 2648 de densidade efetiva**, **3,31×** os pixels únicos da base; não é um arquivo único em 4K. Os quatro tiles somam **2.057.858 bytes (~1,96 MiB)**, **2.472.714 bytes** junto da base, e aproximadamente **24,01 MiB** de memória RGBA adicional antes das alocações do compositor. A base completa permanece por baixo; sua máscara alpha conserva a silhueta, e máscaras estáticas misturam as bordas. Os tiles inferiores não são completamente opacos. Não há fundo substituto, dissolução por scroll ou recorte sob os CDs. O [registro completo do campo 1.3](../heinem/docs/FOREGROUND-DETAIL-1.3.md) preserva prompts exatos, IDs, manifesto, alpha, memória e a tentativa rejeitada.

As URLs começam em `data-field-detail`, sem `src`. O loader só solicita os quatro arquivos com viewport **≥1000 px CSS**, perfil resolvido **Medium/High** e sem `navigator.connection.saveData === true`; aba oculta adia o primeiro carregamento. A apresentação espera `decode()` válido de todos os tiles. Qualquer erro mantém o grupo oculto e a base inteira visível. Mobile, Low e economia de dados usam a base. Mudar para Low após carregar oculta o detalhe sem refetch, sem afirmar que o cache foi liberado. Resize, visibilidade, conexão e qualidade reavaliam a política; o encerramento remove listeners.

Os **3/3 testes focados do campo** passaram: nenhum pedido opcional no mobile/Low, quatro decodificações no desktop High com geometria estável durante scroll e retorno à base quando um tile falha. Esse resultado permanece separado da validação consolidada abaixo. Os sete assets base da cena atual somam **1.782.536 bytes**; com os quatro tiles, **3.840.394 bytes**, excluindo capas, CD, fontes e preview social.

### Retrato claro: registrar a escolha corretamente

O pedido do usuário seleciona a variante mais clara já produzida: `exec-bbc57ac2-ed6d-4111-9d4b-1d0d7080e545.png`, fonte **882 × 1784**, recorte `left=47, top=10, width=802, height=1774`. O novo `public/assets/layers/artist-light.webp` tem **802 × 1774**, **291.154 bytes**, WebP **quality 94 / alphaQuality 100 / effort 6**, sem ampliação. A 1.3 usa o **RGB reconstruído desse candidato**, e não o RGB original usado na 1.2. A seleção atende à preferência visual comunicada; não autoriza afirmar que o rosto é pixel a pixel o original. O recorte original-RGB foi arquivado em `docs/reference/artist-photo-v1.2.webp` (**414 × 920**, **89.976 bytes**) e saiu dos assets públicos. O fluxo anterior e o prompt selecionado permanecem no [registro de camadas](../heinem/docs/LAYER-ASSETS.md).

### Verificação consolidada e publicação

**[RESULTADOS 1.3]** TypeScript e **34/34 testes unitários/de controlador** passaram no build local e na Vercel. A suíte completa passou **26/26 casos no ambiente local em 1,9 min** e **26/26 no endereço público em 1,8 min**, incluindo toque real, arraste reversível, pivô/hover, movimento reduzido, falha de tile, sincronização do céu no mesmo frame e as regressões da bolha aprovada. A revisão visual cobriu 2560 × 1440, 1672 × 941, 390 × 844 e 320 × 780 em cinco posições de scroll por viewport: zero overflow horizontal, erros de página ou recursos com falha nos 20 estados. O build entrega JS de 18,31 kB gzip e CSS de 6,57 kB gzip, sem dependência de animação nova; esses tamanhos não incluem imagens/fontes. O deploy confirmou **READY**, o SHA exato e **heinem.vercel.app**. Todos os **28 arquivos de dist** retornaram HTTP 200 e coincidiram byte a byte com o build testado, por SHA-256 e curl com TLS normal, sem bypass. Somente o Playwright descartável usou a exceção documentada para a CA do proxy. [Evidência completa da 1.3](https://github.com/ItsDeimox/checkpoint-portfolio/blob/main/heinem/docs/VALIDATION-1.3.md).

**[PUBLICAÇÃO 1.3]** Código: [`90ec8f6eab62c09d7f453cf2442c009d93ba9d5c`](https://github.com/ItsDeimox/checkpoint-portfolio/commit/90ec8f6eab62c09d7f453cf2442c009d93ba9d5c). Deploy: `dpl_47ycuswP7gdGRo6skiWrA8ULjeG8` (READY; production).

Os resultados publicados da 1.2 não verificam automaticamente esta revisão. A validação local integrada e a verificação da revisão publicada foram concluídas para a 1.3. Eventos simulados do SoundCloud continuam distintos de streaming contínuo real, e GPU de software continua distinta de medição em aparelho físico. O código da bolha aprovado não foi redesenhado por esta rodada.

