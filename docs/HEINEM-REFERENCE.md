# HEINEM — referência de site em camadas

O projeto [HEINEM](../heinem/README.md) implementa uma referência de artista com cenário em planos, bolha interativa e um CD ligado ao player oficial do SoundCloud. Código e documentação novos usam licença MIT; fotografia, identidade, capas e música mantêm seus direitos próprios.

**Site:** [heinem.vercel.app](https://heinem.vercel.app) · **Baseline publicada documentada:** 1.0.0 · **Revisão de código desta referência:** 1.1.0 · **Pasta de build:** `heinem`

O código e a evidência histórica da baseline permanecem fixados no [commit `b140f9c`](https://github.com/ItsDeimox/checkpoint-portfolio/tree/b140f9c17af9fa1e6d103093dc0b35af01b9d3b6/heinem) e na [validação daquela revisão](https://github.com/ItsDeimox/checkpoint-portfolio/blob/b140f9c17af9fa1e6d103093dc0b35af01b9d3b6/heinem/docs/VALIDATION.md). A seção 1.1 abaixo descreve implementação local e testes focados; não transfere os resultados de produção da baseline para a nova composição.

## Padrões reutilizáveis

1. **Identidade primeiro.** Preserve os pixels originais do rosto. Uma extração gerada pode servir só de máscara alpha; não precisa substituir a fotografia. Registre as partes reconstruídas e não prometa exatidão em regiões que estavam ocultas.
2. **Planos sobre a posição real do documento.** Use offsets pequenos de `transform`, listener de scroll passivo e coordenadas compartilhadas. Uma interpolação curta da roda precisa manter `window.scrollY` real e devolver a entrada imediatamente a teclado, toque e controles. Cubra ou dissolva o limite da camada rápida; não exponha uma extensão espelhada. Remova do fundo objetos que ganharam uma camada própria.
3. **Texto em HTML, shader localizado.** Canvas contém somente material decorativo. Os glifos HTML podem acompanhar o campo da membrana sem rasterizar a biografia, mantendo a frase acessível e geometria cacheada. A bolha ocupa uma fração da tela, possui alternativa CSS e perfis que limitam DPR, área e detalhe, com tratamento de perda de contexto.
4. **Trabalho invisível deve parar.** Pause quando a seção ou aba estiver oculta. Evite upload de textura por frame e loops de parallax em repouso. Suavize usando tempo decorrido, não um fator fixo por frame.
5. **Auto é uma estimativa.** CPU, memória opcional, ponteiro e economia de dados sugerem o padrão. Não são benchmark da GPU. Uma escolha manual de High continua High; movimento reduzido é uma preferência separada.
6. **CD com estado real.** Só conecte o provedor depois de uma intenção explícita de reprodução; explorar as capas antes disso não inicia rede ou áudio. O rotor separado acompanha o evento PLAY, enquanto hub e alvo de clique mantêm o pivô. Preserve timeout, tentativa novamente, player oficial visível após a interação e link da faixa. Não re-hospede áudio.
7. **Valide antes de publicar.** Verifique composição, scroll, mobile, controles, falhas externas e fallback. Registre navegador, renderizador, dimensões, SHA e limitações. Não transforme um teste em GPU de software em promessa de FPS em aparelho físico.

## Como repetir

Leia [arquitetura](../heinem/docs/ARCHITECTURE.md), [proveniência](../heinem/docs/asset-provenance.md), [validação](../heinem/docs/VALIDATION.md) e [segurança](../heinem/SECURITY.md). O [README do projeto](../heinem/README.md) contém comandos de desenvolvimento/build/teste e configuração da Vercel.

A implementação consultou `deimoxportfolios/src/ui/modal-material.js`, os controladores de qualidade do DXRKTHS e `braaza/src/render/quality.js`. Reaproveitou princípios de composição e lifecycle, sem importar o pipeline histórico de desempacotamento que pode sobrescrever código expandido. O histórico e as revisões consultadas estão documentados na arquitetura.

As regras gerais também estão registradas em português e inglês no Cortex: [PT](https://github.com/ItsDeimox/Deimox-Cortex/blob/main/Programming/Web3D/Layered-Artist-Sites.md) · [EN](https://github.com/ItsDeimox/Deimox-Cortex/blob/main/EN/Programming/Web3D/Layered-Artist-Sites.md).

## Revisão 1.1 — feedback aprovado e implementação

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
