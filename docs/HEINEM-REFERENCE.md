# HEINEM — referência de site em camadas

O projeto [HEINEM](../heinem/README.md) implementa uma referência de artista com cenário em planos, bolha interativa e um CD ligado ao player oficial do SoundCloud. Código e documentação novos usam licença MIT; fotografia, identidade, capas e música mantêm seus direitos próprios.

**Site:** [heinem.vercel.app](https://heinem.vercel.app) · **Versão:** 1.0.0 · **Pasta de build:** `heinem`

## Padrões reutilizáveis

1. **Identidade primeiro.** Preserve os pixels originais do rosto. Uma extração gerada pode servir só de máscara alpha; não precisa substituir a fotografia. Registre as partes reconstruídas e não prometa exatidão em regiões que estavam ocultas.
2. **Planos sobre scroll nativo.** Use offsets pequenos de `transform`, eventos passivos e coordenadas compartilhadas. Dê área extra à camada da frente para não expor seu limite ao subir. Remova do fundo objetos que ganharam uma camada própria.
3. **Texto em HTML, shader localizado.** Canvas contém somente material decorativo. A bolha ocupa uma fração da tela, recebe refração e deformação local e possui alternativa CSS. Os perfis limitam DPR, área e detalhe, com tratamento de perda de contexto.
4. **Trabalho invisível deve parar.** Pause quando a seção ou aba estiver oculta. Evite upload de textura por frame e loops de parallax em repouso. Suavize usando tempo decorrido, não um fator fixo por frame.
5. **Auto é uma estimativa.** CPU, memória opcional, ponteiro e economia de dados sugerem o padrão. Não são benchmark da GPU. Uma escolha manual de High continua High; movimento reduzido é uma preferência separada.
6. **CD com estado real.** Só conecte o provedor depois da interação. A animação acompanha o evento PLAY, não o clique. Preserve timeout, tentativa novamente, player oficial visível e link da faixa. Não re-hospede áudio.
7. **Valide antes de publicar.** Verifique composição, scroll, mobile, controles, falhas externas e fallback. Registre navegador, renderizador, dimensões, SHA e limitações. Não transforme um teste em GPU de software em promessa de FPS em aparelho físico.

## Como repetir

Leia [arquitetura](../heinem/docs/ARCHITECTURE.md), [proveniência](../heinem/docs/asset-provenance.md), [validação](../heinem/docs/VALIDATION.md) e [segurança](../heinem/SECURITY.md). O [README do projeto](../heinem/README.md) contém comandos de desenvolvimento/build/teste e configuração da Vercel.

A implementação consultou `deimoxportfolios/src/ui/modal-material.js`, os controladores de qualidade do DXRKTHS e `braaza/src/render/quality.js`. Reaproveitou princípios de composição e lifecycle, sem importar o pipeline histórico de desempacotamento que pode sobrescrever código expandido. O histórico e as revisões consultadas estão documentados na arquitetura.

As regras gerais também estão registradas em português e inglês no Cortex: [PT](https://github.com/ItsDeimox/Deimox-Cortex/blob/main/Programming/Web3D/Layered-Artist-Sites.md) · [EN](https://github.com/ItsDeimox/Deimox-Cortex/blob/main/EN/Programming/Web3D/Layered-Artist-Sites.md).
